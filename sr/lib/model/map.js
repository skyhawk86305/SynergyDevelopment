'use strict';

var assert = require('assert'),
    _ = require('lodash'),
    Guard = require('./guard'),
    Inspector = require('./inspect');

// jshint latedef: false
// so we can read from the top down

// TODO: ensure Synergy can round-trip installations
// TODO: add API for PROJECT_ADD_CLUSTER(installation)

// what do we have?
// .installations
// .installations[0].hagroups[0]... // omits those in clusters
// .installations[0].clusters[0].hagroups[0]...
// always at least one installation
// not guaranteed to always have an hagroup or a cluster
// clusters not guaranteed to have hagroups
//
// "installation": a group of related systems

function ModelMap(prodinfo, clip) {
    assert(typeof prodinfo === 'object', 'prodinfo not object');
    assert(_.isPlainObject(clip), 'clip');

    this._prodinfo = prodinfo;
    _.bindAll(this);

    var installations = this.installations = [{ // hardcoded singleton
        _id: '_PLACEHOLDER',
        _type: 'installation',
        hagroups: [],
        clusters: [],
    }];

    // jshint camelcase: false
    _.forEach(clip.synergy_model.hagroups, this._moveToInstallation);
    _.forEach(this.installations, this._moveClusteredToClusters);

    var inspector = new Inspector(installations, prodinfo);
    this.inspect = inspector.inspect;
    this.find = inspector.find;
}

ModelMap.prototype._moveToInstallation = function _moveToInstallation(hagroup) {
    var installation = this.installations[0];

    installation.hagroups.push(hagroup);
};

ModelMap.prototype._moveClusteredToClusters = function _moveClusteredToClusters(installation) {
    // jshint camelcase: false

    var cmap = {}, // map IDs to cluster objects
        unclustered = [];

    function moveToCluster(hagroup) {
        if (hagroup.is_clustered || hagroup.cluster) {
            assert(_.isPlainObject(hagroup.cluster));

            var cluster = getOrCreate(cmap, hagroup.cluster._id, {
                    _id: hagroup.cluster._id,
                    _type: 'cluster',
                    name: hagroup.cluster.name,
                    hagroups: []
                });
            cluster.hagroups.push(hagroup);
        } else {
            unclustered.push(hagroup);
        }
    }

    _.forEach(installation.hagroups, moveToCluster);

    _.forEach(cmap, function (c) { installation.clusters.push(c); });
    installation.hagroups = unclustered;
};

function getOrCreate(map, key, def) {
    if (_.has(map, key)) {
        return map[key];
    } else {
        return (map[key] = _.clone(def));
    }
}

ModelMap.prototype.guard = function guard(addingTo, options) {
    return new Guard(this, addingTo, options);
};

ModelMap.prototype.resolveSelection = function resolveSelection(selector) {
    if (!selector || (_.isPlainObject(selector) && _.isEmpty(selector))) {
        return [];
    }

    assert(_.isPlainObject(selector), 'resolveSelection: selector object');
    assert(selector.installation, 'resolveSelection: selector installation');

    var installs = this._where(this.installations, selector.installation);
    return this.installations.length ? this._searchInstallations(installs, selector) : [];
};

ModelMap.prototype.rehydrate = function rehydrate() {
    _.forEach(this.installations, function rehydrateInstallation(installation) {
        this._rehydrateClustered(installation.clusters);
        this._rehydrateNonClustered(installation.hagroups);
    }, this);
};

ModelMap.prototype._rehydrateClustered = function _rehydrateClustered(clusters) {
    _.forEach(clusters, function rehydrateCluster(cluster) {
         _.forEach(cluster.hagroups, this._rehydrateAggregateMetaInfo);
    }, this);
};

ModelMap.prototype._rehydrateNonClustered = function _rehydrateNonClustered(hagroups) {
    _.forEach(hagroups, this._rehydrateAggregateMetaInfo);
};

ModelMap.prototype._rehydrateAggregateMetaInfo = function _rehydrateAggregateMetaInfo(hagroup) {
    var hagi = this.inspect(hagroup),
        availableDevices = hagi.allDevices(),
        deviceAndSpecMap = this._createDeviceAndSpecMapping(availableDevices),
        _this = this;

    _.forEach(hagroup.controllers, fixRaidGroupsInController);

    function fixRaidGroupsInController(controller) {
        // TODO: fix guard until no more ejection code necessary

        _.forEach(controller.storage_pools, _.partial(fixStoragePool, controller));
        controller.storage_pools =  _this._withoutEjected(controller.storage_pools);
        // ... and even that's not enough, because we still have cached device info

        _.forEach(controller.aggregates, _.partial(fixAggregate, controller));
        controller.aggregates = _this._withoutOrphanedAggregates(controller.aggregates);
    }

    function fixStoragePool(controller, pool) {
        _this._populateDeviceSpecsForRaidGroup(hagroup, pool, deviceAndSpecMap);
    }

    function fixAggregate(controller, aggregate) {
        aggregate._controller = controller._id;
        _.forEach(aggregate._raid_groups, function(raidGroup) {
            _this._populateDeviceSpecsForRaidGroup(hagroup, raidGroup, deviceAndSpecMap);
        });

        aggregate._raid_groups = _this._withoutEjected(aggregate._raid_groups);
    }
};

ModelMap.prototype._withoutOrphanedAggregates = function _withoutOrphanedAggregates(aggregates) {
    return _.where(aggregates, function(aggregate) {
        var shouldWeKeepThisAggregate = (aggregate._raid_groups && aggregate._raid_groups.length > 0);

        if (!shouldWeKeepThisAggregate) {
            console.warn('aggregate ' + aggregate.name + ' could no longer be satisfied, so we are ejecting it.');
        }

        return shouldWeKeepThisAggregate;
    });
};

ModelMap.prototype._withoutEjected = function _withoutEjected(seq) {
    return _.where(seq, function(hasDevices) {
        return !hasDevices.__eject;
    });
};

ModelMap.prototype._populateDeviceSpecsForRaidGroup = function PDSFRG(hagroup, hasDevices, deviceAndSpecMap) {
    var specToDevice = {};

    // Update DeviceIds if we can
    var hasDevicesIsSatisfied = _.every(hasDevices._devices, function(deviceId) {
            return _.has(deviceAndSpecMap, deviceId);
        }),
        deviceSpecsAreOkay = hasDevices.__deviceSpecs && _.every(hasDevices.__deviceSpecs, function(deviceSpec) {
            return deviceSpec.spec && deviceSpec.count;
        }),
        needsUpdatedDeviceSpecs = !deviceSpecsAreOkay;

    if (!hasDevicesIsSatisfied) {
        this._updateDeviceIdsAfterRebuild(hagroup, hasDevices);
    }

    if (needsUpdatedDeviceSpecs) {
        _.forEach(hasDevices._devices, function(deviceId) {
            var specHashForDevice = deviceAndSpecMap[deviceId];

            if (_.has(specToDevice, specHashForDevice)) {
                specToDevice[specHashForDevice].push(deviceId);
            }
            else {
                specToDevice[specHashForDevice] = [deviceId];
            }
        });

        hasDevices.__deviceSpecs = _.map(_.keys(specToDevice), function(specHash) {
            return {
                spec: deviceAndSpecMap.specs[specHash],
                count: specToDevice[specHash].length
            };
        });
    }
};

ModelMap.prototype._updateDeviceIdsAfterRebuild = function UDIIRGAR(hagroup, hasDevices) {
    var hagi = this.inspect(hagroup),
        availableDevices = hagi.availableDevices(),
        specMap = this._createDeviceAndSpecMapping(availableDevices), // Free Device, DeviceId key, hash as spec
        hashes = _.uniq(_.map(_.keys(specMap), function(deviceId) {
            return specMap[deviceId];
        })),
        _this = this;

    if (availableDevices.length > 0 && hashes.length > 0 && hasDevices.__deviceSpecs) {
        var hasDevicesNeedsDevices = _.map(hasDevices.__deviceSpecs, function(deviceSpec) {
            return {
                count: deviceSpec.count,
                hash: _this._createDeviceSpecHash(deviceSpec.spec)
            };
        });


        _.forEach(hasDevicesNeedsDevices, function(rgDeviceSpec) {
            var matchingDeviceIds = _.where(_.keys(specMap), function(deviceId) {
                return specMap[deviceId] === rgDeviceSpec.hash;
            });

            if (matchingDeviceIds.length >= rgDeviceSpec.count) {
                var newDeviceIds = matchingDeviceIds.splice(0, rgDeviceSpec.count);

                hasDevices._devices = newDeviceIds;
                consumeDeviceIds(newDeviceIds);
            }
            else {
                console.warn('Cannot update raid group deviceIds, as there are no longer enough devices to satisfiy it. Ejecting the Rg.: ', hasDevices);
                hasDevices.__eject = true;
            }
        });
    }
    else {
        console.warn('Could not rehydrate rg, likely invalid number of drives / devices different. Ejecting the Rg: ', hasDevices);
        hasDevices.__eject = true;
    }

    function consumeDeviceIds(deviceIds) {
        _.forEach(deviceIds, deleteSpecMapProp);
    }

    function deleteSpecMapProp(propName) {
        delete specMap[propName];
    }
};

ModelMap.prototype._createDeviceAndSpecMapping = function _createDeviceAndSpecMapping(availableDevices) {
    var _this = this,
        deviceSpecMap = {
            specs: {}
        };

    _.forEach(availableDevices, function(device) {
        var specHash = _this._createDeviceSpecHash(device.spec);

        deviceSpecMap.specs[specHash] = device.spec;

        _.forEach(device.devices, function(deviceId) {
            deviceSpecMap[deviceId] = specHash;
        });
    });

    return deviceSpecMap;
};

ModelMap.prototype._createDeviceSpecHash = function _createDeviceSpecHash(deviceSpec) {
    var keys = _.sortBy(_.keys(_.omit(deviceSpec, 'quantity', '_slice_name' /* old */, 'slice' /* new */, 'model'))),
        hash = _.map(keys, function(key) {
            var valueForKey = deviceSpec[key],
                stringifiedKeyValue = (valueForKey === undefined || valueForKey === null) ? '_' : valueForKey.toString();

            return key + '-' + stringifiedKeyValue.replace('.', '_');
        }).join('-');

    return hash;
};

ModelMap.prototype._searchInstallations = function _searchInstallations(installations, selector) {
    assert.equal(installations.length, 1, 'resolveSelection: installation scope too wide');
    var subSelector = _.omit(selector, 'installation');

    if (subSelector.cluster) {
        var clusters = this._where(installations[0].clusters, subSelector.cluster);
        return _.isEmpty(clusters) ? [] : this._searchClusters(clusters, subSelector);
    } else if (subSelector.hagroup) {
        return this._searchHagroups(installations[0].hagroups, subSelector);
    } else {
        return installations;
    }
};

ModelMap.prototype._searchClusters = function _searchClusters(clusters, selector) {
    var subSelector = _.omit(selector, 'cluster');

    if (subSelector.hagroup) {
        assert.equal(clusters.length, 1, 'resolveSelection: cluster scope too wide');
        return this._searchHagroups(clusters[0].hagroups, subSelector);
    } else {
        return clusters;
    }
};

ModelMap.prototype._searchHagroups = function _searchHagroups(hagroups, selector) {
    var systems = this._where(hagroups, selector.hagroup),
        subSelector = _.omit(selector, 'hagroup');

    return _.isEmpty(subSelector) ? systems : this._searchHardware(systems, subSelector);
};

ModelMap.prototype._searchHardware = function _searchHardware(systems, selector) {
    if (selector.shelf) {
        var shelves = this._searchShelves(systems, selector),
            subSelector = _.omit(selector, 'shelf');

        return _.isEmpty(subSelector) ? shelves : this._searchDrives(shelves, subSelector);
    } else if (selector.controller) {
        var controllers = this._searchControllers(systems, selector),
            subSelect = _.omit(selector, 'controller');

        return _.isEmpty(subSelect) ? controllers : this._searchAggregates(controllers, subSelect);
    } else {
        throw new Error('resolveSelection: unknown hardware selector');
    }
};

ModelMap.prototype._searchControllers = function _searchControllers(systems, selector) {
    var controllers = _.reduce(systems, function filter(controllers, hagroup) {
        return controllers.concat(this._where(hagroup.controllers, selector.controller));
    }, [], this);

    return controllers;
};

// This should probably require a single controller scope
ModelMap.prototype._searchAggregates = function _searchAggregates(controllers, selector) {
    if (selector.aggregate) {
        var aggregates = _.reduce(controllers, function filter(aggregates, controller) {
            return aggregates.concat(this._where(controller.aggregates, selector.aggregate));
        }, [], this);

        return aggregates;
    } else {
        throw new Error('resolveSelection: unknown aggregate selector');
    }
};

ModelMap.prototype._searchShelves = function _searchShelves(systems, selector) {
    var subSelector = _.omit(selector.shelf, '_x_bom'),
        driveSelectors = selector.shelf._x_bom ? selector.shelf._x_bom.drive_specs || [] : [];

    var shelves = _.reduce(systems, function filter(shelves, hagroup) {
        return shelves.concat(this._where(hagroup.shelves, subSelector));
    }, [], this);

    function isMatchingShelf(shelf) {
        return _.every(driveSelectors, _.partial(isMatchingDrive, shelf));
    }

    function isMatchingDrive(shelf, criterion, index) {
        return _.every([shelf._x_bom.drive_specs[index]], criterion);
    }

    return _.filter(shelves, isMatchingShelf);
};

ModelMap.prototype._searchDrives = function _searchDrives(shelves, selector) {
    if (selector.drive) {
        var drives = _.reduce(shelves, function filter(drives, shelf) {
            var drive_specs = _.isEmpty(shelf._x_bom) ? [] : shelf._x_bom.drive_specs;
            return drives.concat(this._where(drive_specs, selector.drive));
        }, [], this);

        return drives;
    } else {
        throw new Error('resolveSelection: unknown drive selector');
    }
};

ModelMap.prototype._where = function _where(collection, constraint) {
    return _.isEmpty(constraint) ? _.where(collection) : _.where(collection, constraint);
};

module.exports = ModelMap;
