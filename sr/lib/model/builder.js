'use strict';

var assert = require('assert'),
    _ = require('lodash'),
    uuid = require('uuid'),
    planAggregates = require('./aggregates/planner'),
    BuildADP = require('./build/adp'),
    BuildStoragePools = require('./build/storage-pools'),
    BuildFlashPoolAssignments = require('./build/flash-pool-assignment'),
    TraceBuilds = require('./build/trace'),
    ModelMap = require('./map'),
    modelUtil = require('./util'),
    Constants = require('../constants'),
    Unit = require('../units');

function Builder(productInfo, clip) {
    assert(typeof productInfo === 'object', 'productInfo not object');
    assert(_.isPlainObject(clip), 'clip');

    this._productInfo = productInfo;
    this.clip = clip;

    _.bindAll(this);
}

// mixins
_.assign(Builder.prototype, BuildADP.prototype);
_.assign(Builder.prototype, BuildStoragePools.prototype);
_.assign(Builder.prototype, BuildFlashPoolAssignments.prototype);
_.assign(Builder.prototype, TraceBuilds.prototype);

Builder.prototype.addSystem = function addSystem(spec) {
    assert(_.isPlainObject(spec), 'addSystem: spec object');

    var hagroup = this.buildSystem(spec);

    hagroup._policies = {
        spare_allocation: {
            enforce: Constants.POLICIES.SPARES.DEFAULT
        },
        version: {
            pin: true
        }
    };

    this.clip.synergy_model.hagroups.push(hagroup);
    this._applyADPAndAddAggregates(hagroup);

    return hagroup;
};

Builder.prototype.addSystemToCluster = function addSystemToCluster(spec, clusterId) {
    assert(_.isPlainObject(spec), 'addSystemToCluster: spec object');

    var isClustered = true,
        isPinnedVersion = true,
        hagroup = this.buildSystem(spec, isClustered),
        maxClusterName = this._getMaxAutoNamedCluster(),
        clusterName = maxClusterName > 0 ? 'cluster' + (maxClusterName + 1) : 'cluster1';

    _.forEach(this.clip.synergy_model.hagroups, function findClusterName(hagroup) {
        if (!_.isEmpty(hagroup.cluster) && (hagroup.cluster._id === clusterId)) {
            clusterName = hagroup.cluster.name || clusterName;

            if (hagroup._policies && hagroup._policies.version) {
                isPinnedVersion = hagroup._policies.version.pin;
            }
        }
    });

    hagroup.cluster = { // partial ref; _type not necessary
        _id: clusterId || uuid(),
        name: clusterName
    };

    hagroup._policies = {
        spare_allocation: {
            enforce: Constants.POLICIES.SPARES.DEFAULT
        },
        version: {
            pin: isPinnedVersion
        }
    };

    this.clip.synergy_model.hagroups.push(hagroup);
    this.setClusterVersion(hagroup.cluster._id, hagroup.version);
    this._applyADPAndAddAggregates(hagroup);

    return hagroup;
};

Builder.prototype.changeSystems = function changeSystems(specs) {
    assert(Array.isArray(specs), 'specs array');

    _.forEach(specs, function replace(spec) {
        var hagroup = this._getSystemByIdFromClip(spec.existingId);

        hagroup.model = spec.platformModel;
        hagroup._model = spec.configModel;
        hagroup.version = spec.version;
        hagroup.shelves = _.isEmpty(spec.shelves) ? [] : this.buildShelves(hagroup, spec.shelves);

        // Remove a controller HA->Standalone, or add a controller Standalone->HA
        if (spec.controllerCount < hagroup.controllers.length) {
            hagroup.controllers.splice(hagroup.controllers.length - 1,1);
        } else if (spec.controllerCount > hagroup.controllers.length) {
            var maxAutonamed = this._getMaxAutoNamedSystemCount(this.clip.synergy_model.hagroups),
                controller = this.buildControllers(1, maxAutonamed + 1, 'netapp');

            hagroup.controllers.push(controller[0]);
        }

        if (!_.isEmpty(hagroup.cluster) && hagroup.cluster._id) {
            this.setClusterVersion(hagroup.cluster._id, hagroup.version);
        }

        if (!hagroup.model) {
            var config = this._productInfo.getConfig(hagroup) || {},
                platformModel = config.platformModel;

            hagroup.model = platformModel;
        }

        this._applyADPAndAddAggregates(hagroup);
    }, this);
};

Builder.prototype.removeSystem = function removeSystem(systemId) {
    assert(typeof systemId === 'string');

    var index = _.findIndex(this.clip.synergy_model.hagroups, { _id: systemId });

    if (index > -1) {
        this.clip.synergy_model.hagroups.splice(index, 1);
    }
};

Builder.prototype.deleteShelf = function deleteShelf(systemId, shelf) {
    assert(typeof systemId === 'string', 'systemId string');
    assert(typeof shelf === 'object', 'unspecified shelf');

    var targetHaGroup = this._getSystemByIdFromClip(systemId),
        shelfIndex = _.findIndex(targetHaGroup.shelves, function(i) {
            var isEmbeddedMatch = (i._isembedded === shelf._isembedded) ? true : false;
            return isEmbeddedMatch && modelUtil.shelfDriveComboEquals(i, shelf);
        });

    if (shelfIndex > -1) {
        targetHaGroup.shelves.splice(shelfIndex, 1);
        this._applyADPAndAddAggregates(targetHaGroup);
    }
};

Builder.prototype.deleteAllShelves = function deleteAllShelves(systemId, shelf) {
    assert(typeof systemId === 'string', 'unspecified systemId string');
    assert(typeof shelf === 'object', 'unspecified shelf');

    var targetHaGroup = this._getSystemByIdFromClip(systemId);

    _.remove(targetHaGroup.shelves, function(s){
        var isEmbeddedMatch = (s._isembedded === shelf._isembedded) ? true : false;
        return isEmbeddedMatch && modelUtil.shelfDriveComboEquals(s, shelf);
    });

    this._applyADPAndAddAggregates(targetHaGroup);
};

Builder.prototype.buildAutoAggregates = function rebuildAutoAggregates(systemId) {
    assert(typeof systemId === 'string', 'unspecified systemId string');

    var system = this._getSystemByIdFromClip(systemId);
    this._buildAggregates(system, false, false);  // TODO: Don't hardcode these
};

Builder.prototype.rebuildAutoAggregates = function rebuildAutoAggregates(systemId, deleteOptions) {
    assert(typeof systemId === 'string', 'unspecified systemId string');

    this.deleteAutoAggregates(systemId, deleteOptions);
    this.buildAutoAggregates(systemId);
};

Builder.prototype.deleteAggregate = function deleteAggregate(systemId, aggregate) {
    assert(typeof systemId === 'string', 'unspecified systemId string');
    assert(typeof aggregate === 'object', 'unspecified aggregate');

    var i = this._makeNewMap().inspect(aggregate); // crash if aggregate already deleted
    assert.equal(i.hagroup._id, systemId, 'd90aafb1'); // args don't match

    _(i.hagroup.controllers)
        .map('storage_pools').flatten()
        .map('_allocations').flatten()
        .where({ aggr_id: aggregate._id })
        .forEach(deallocateFlashPoolSlice);

    var idx = _.findIndex(i.controller.aggregates, { _id: aggregate._id });
    i.controller.aggregates.splice(idx, 1);
};

function deallocateFlashPoolSlice(alloc) {
    delete alloc.aggr_id;
}

Builder.prototype.deleteAllAggregates = function deleteAllAggregates(systemId) {
    assert(typeof systemId === 'string', 'unspecified systemId string');

    var system = this._getSystemByIdFromClip(systemId);
    system.controllers.forEach(function clearControllerAggregates(c) { c.aggregates = []; });
};

Builder.prototype.deleteAutoAggregates = function deleteAutoAggregates(systemId, deleteOptions) {
    deleteOptions = deleteOptions || {};
    deleteOptions.except = deleteOptions.except || allAutoMustDie;
    assert.equal(typeof systemId, 'string', '32a48274');
    assert.equal(typeof deleteOptions.except, 'function', '2332948b');

    var system = this._getSystemByIdFromClip(systemId);
    system.controllers.forEach(function clearControllerAutoAggregates(c) {
        c.aggregates = _.filter(c.aggregates, shouldSurvive);
    });

    function shouldSurvive(aggregate) {
        var result = aggregate._manual || deleteOptions.except(aggregate);
        return result;
    }

    function allAutoMustDie(/* aggregate */) {
        return false;
    }
};

Builder.prototype.nameSystem = function nameSystem(systemId, name1, name2) {
    assert(typeof systemId === 'string', 'unspecified systemId string');

    var targetHaGroup = this._getSystemByIdFromClip(systemId);

    if (targetHaGroup) {
        if (targetHaGroup.controllers && targetHaGroup.controllers.length) {
            targetHaGroup.controllers[0].name = name1;
        }

        if (targetHaGroup.controllers && targetHaGroup.controllers.length > 1) {
            targetHaGroup.controllers[1].name = name2;
        }
    }
};

Builder.prototype.nameCluster = function nameCluster(clusterId, name) {
    assert(typeof clusterId === 'string', 'unspecified clusterId string');
    assert(typeof name === 'string', 'unspecified name string');

    _.forEach(this.clip.synergy_model.hagroups, function(hagroup) {
        if (hagroup.cluster && hagroup.cluster._id === clusterId) {
            hagroup.cluster.name = name;
        }
    });
};

Builder.prototype.setSystemPolicy = function setSystemPolicy(systemId, scope, policy) {
    assert(typeof systemId === 'string', 'unspecified systemId string');
    assert(typeof scope === 'string', 'unspecified scope string');

    var targetHaGroup = _.find(this.clip.synergy_model.hagroups, { _id: systemId });
    if (targetHaGroup) {
        targetHaGroup._policies = targetHaGroup._policies || {};
        targetHaGroup._policies[scope] = targetHaGroup._policies[scope] || {};

        _.merge(targetHaGroup._policies[scope], policy);
        this._applyADPAndAddAggregates(targetHaGroup);
    }
};

Builder.prototype.setClusterPolicy = function setClusterPolicy(clusterId, scope, policy) {
    assert(typeof clusterId === 'string', 'unspecified clusterId string');
    assert(typeof scope === 'string', 'unspecified scope string');

    _.forEach(this.clip.synergy_model.hagroups, function setPolicy(hagroup) {
        if (!_.isEmpty(hagroup.cluster) && (hagroup.cluster._id === clusterId)) {
            hagroup._policies = hagroup._policies || {};
            hagroup._policies[scope] = hagroup._policies[scope] || {};

            _.merge(hagroup._policies[scope], policy);
            this._applyADPAndAddAggregates(hagroup);
        }
    }, this);
};

Builder.prototype.buildSystem = function buildSystem(spec, isClustered) {
    assert(_.isPlainObject(spec), 'buildSystem: spec object');

    var maxAutonamed = this._getMaxAutoNamedSystemCount(this.clip.synergy_model.hagroups),
        controllers = this.buildControllers(spec.controllerCount, maxAutonamed + 1, 'netapp');

    var hagroup = {
        _id : uuid(),
        _type: 'hagroup',
        _model: spec.configModel,
        _x_bom: undefined,
        is_clustered: isClustered || false,
        model : spec.platformModel,
        sys_version: undefined,
        cluster: undefined,
        controllers : controllers,
        version : spec.version
    };

    if (!hagroup.model) {
        var config = this._productInfo.getConfig(hagroup) || {},
            platformModel = config.platformModel;

        hagroup.model = platformModel;
    }

    hagroup.shelves = _.isEmpty(spec.shelves) ? [] : this.buildShelves(hagroup, spec.shelves);

    this.checkCompatibility(hagroup);

    return hagroup;
};

Builder.prototype.checkCompatibility = function checkCompatibility(hagroup) {
    var config = this._productInfo.getConfig(hagroup),
        isCompatible = config.matrix.isCompatibleWithVersion(hagroup.version);

    assert(isCompatible, 'unknown version ' + hagroup.version);
};

Builder.prototype.determineDriveFlashPoolSupport = function determineDriveFlashPoolSupport(hagroup, shelfModel, driveModel) {
    var config = this._productInfo.getConfig(hagroup),
        matrix = config.matrix,
        shelfCompat = matrix.checkVersionShelfDrive(hagroup.version, shelfModel, driveModel);

    return shelfCompat.fp_support_drive;
};

Builder.prototype.buildControllers = function buildControllers(count, startingCount, namePrefix) {
    count = count || 2;
    startingCount = startingCount && startingCount > -1 ? startingCount : 1;
    namePrefix = namePrefix || 'netapp';

    return _.map(_.range(count), function(i) {
        return {
            _id: uuid(),
            _type: 'controller',
            aggregates: undefined,
            name: namePrefix + (i + startingCount)
        };
    });
};

Builder.prototype.buildShelves = function buildShelves(hagroup, shelvesSpec, startingCount) {
    assert(shelvesSpec instanceof Array, 'buildShelves: shelvesSpec array');
    assert(!_.isEmpty(shelvesSpec), 'buildShelves: shelvesSpec empty');

    var shelves = [],
        shelfNumber = startingCount || 1;

    _(shelvesSpec).forEach(function buildShelf(spec) {
        var shelfConfig = _.find(this._productInfo._shelves, { model: spec.model });

        if (!shelfConfig) {
            console.log('Warning: could not find shelf configuration for ' + spec.model);
            return;
        }

        for (var idx = 0; idx < (spec.quantity || 1); idx++) {
            var newId = uuid(),
                bom = _.isEmpty(spec.drives) ? undefined : this.buildDrives(hagroup, newId, spec.drives, spec.model);

            shelves.push({
                _id: newId,
                _type: 'shelf',
                _x_bom: bom,
                _description: undefined,
                model: spec.model,
                serial_number: undefined,
                bay_count: shelfConfig.stats.max_drive,
                type: undefined,
                _isembedded: spec.isEmbedded || false,
                shelf_number: shelfNumber++
            });
        }
    }, this);

    return shelves;
};

Builder.prototype.buildDrives = function buildDrives(hagroup, shelfId, withSpecs, withShelfModel) {
    assert(withSpecs instanceof Array, 'buildDrives: withSpecs array');
    assert(!_.isEmpty(withSpecs), 'buildDrives: withSpecs empty');

    var driveContainer = {
            drive_specs: [],
            drive_spec_members: []
        },
        specsAndMembers = this.buildSpecsAndMembers(hagroup, shelfId, withSpecs, withShelfModel);

    _.forEach(specsAndMembers, function(driveSpecWithMembers) {
        driveContainer.drive_specs.push(driveSpecWithMembers[0]);
        driveContainer.drive_spec_members.push(driveSpecWithMembers[1]);
    });

    return driveContainer;
};

Builder.prototype.buildSpecsAndMembers = function buildSpecsAndMembers(hagroup, owningShelfId, driveSpecs, withShelfModel) {
    var buildResults = [],
        currentCarrierSlot = 0,
        _this = this;

    _.forEach(driveSpecs, function(driveSpec) {
        var flashPoolSupport = _this.determineDriveFlashPoolSupport(hagroup, withShelfModel, driveSpec.model),
            driveConfig = _.find(_this._productInfo._drives, { model: driveSpec.model }),
            rsUnit = driveConfig ? new Unit(driveConfig.capacity.right_sized, 'KiB') : {},
            members = [],
            newDriveSpec = {
                model: driveSpec.model,
                rawgb: driveConfig.capacity.marketing,
                rsgb: rsUnit.value_gb,
                rpm: driveConfig.speed,
                type: driveConfig.type,
                encrypted: driveConfig.encrypted,
                fp_support: flashPoolSupport,
                quantity: driveSpec.quantity // TODO: remove after Demo/Release
            };

        _.forEach(_.range(driveSpec.quantity), function() {
            var deviceId = _this._getDeviceIdForDrive(owningShelfId, currentCarrierSlot++);

            members.push(deviceId);
        });

        buildResults.push([newDriveSpec, members]);
    });


    return buildResults;
};

Builder.prototype.setClusterVersion = function setClusterVersion(clusterId, version) {
    _.forEach(this.clip.synergy_model.hagroups, function forceVersion(hagroup) {
        if (!_.isEmpty(hagroup.cluster) && (hagroup.cluster._id === clusterId)) {
            hagroup.version = version;
        }
    });
};

Builder.prototype.setSystemVersion = function setSystemVersion(systemId, version) {
    var targetHaGroup = _.find(this.clip.synergy_model.hagroups, { _id: systemId });

    if (targetHaGroup) {
        targetHaGroup.version = version;
    }
};

// function timed(fn) {
//     var name = fn.name;

//     function end(beginning) {
//         var span = process.hrtime(beginning),
//             ms = span[0] / 1e3 + span[1] / 1e6;
//         console.log('timed:', name, 'took', ms, 'ms');
//     }

//     return function measured() {
//         var beg = process.hrtime(),
//             res;
//         try {
//             res = fn.apply(this, arguments);
//             end(beg);
//             return res;
//         } catch (err) {
//             end(beg);
//             throw err;
//         }
//     };
// }

Builder.prototype._getDeviceIdForDrive = function _getDeviceIdForDrive(owningShelfId, carrierSlot) {
    assert(owningShelfId.length > 8, 'Shelf Id is invalid');
    assert(_.isNumber(carrierSlot), 'Carrier slot must be a number');

    return '!' + owningShelfId.slice(0, 8) + '.' + carrierSlot;
};
Builder.prototype._getDeviceIdForDrive.pure = true;
Builder.prototype._getDeviceIdForDrive.spam = true;

Builder.prototype._getSystemByIdFromClip = function _findSystemId(systemId) {
    return _.find(this.clip.synergy_model.hagroups, { _id: systemId });
};

Builder.prototype._getMaxAutoNamedCluster = function _getMaxAutoNamedCluster() {
    var maxAutonamedCluster = _(this.clip.synergy_model.hagroups)
        .map(function(h){return h.cluster && /^cluster(\d+)$/.exec(h.cluster.name);})
        .where(function(cn){return cn;})
        .map(function(cn){return parseInt(cn[1]);})
        .max().value();

    return maxAutonamedCluster;
};

Builder.prototype._getMaxAutoNamedSystemCount = function _getMaxAutoNamedSystemCount(hagroups) {
    assert(hagroups, '_getMaxAutoNamedSystemCount hagroups list not defined');
    assert(Array.isArray(hagroups), '_getMaxAutoNamedSystemCount hagroups list not an array');

    var maxAutonamedSystemNaming = _(hagroups)
        .map(function(h){return h._x_bom && h._x_bom.system && h._x_bom.system.names;})
        .where(function (n) {return n;}).map(function(n){ return n.split('/'); })
        .flatten()
        .map(function(n){return /^netapp(\d+)$/.exec(n);}).where(function(cn){return cn;})
        .map(function(cn){return parseInt(cn[1]);})
        .max().value();

    var maxAutonamedController = _(hagroups)
        .flatten('controllers')
        .flatten('name')
        .map(function(n){return /^netapp(\d+)$/.exec(n);}).where(function(cn){return cn;})
        .map(function(cn){return parseInt(cn[1]);})
        .max().value();

    return Math.max(maxAutonamedSystemNaming, maxAutonamedController);
};

Builder.prototype._makeNewMap = function _makeNewMap() {
    return new ModelMap(this._productInfo, this.clip);
};

Builder.prototype._isPureEmbeddedSystem = function _isPureEmbeddedSystem(hagroup) {
    var hasOnlyOneShelf = hagroup.shelves && hagroup.shelves.length === 1,
        onlyShelfIsEmbedded = hasOnlyOneShelf && _.first(hagroup.shelves)._isembedded;

    return onlyShelfIsEmbedded;
};

Builder.prototype._buildAggregates = function _buildAggregates(hagroup) {
    var map = this._makeNewMap(),
        plannedAggregates = planAggregates(map.inspect(hagroup));

    if (plannedAggregates && plannedAggregates.length) {
        this.attachAggregatesToControllers(this.clip.synergy_model.hagroups, plannedAggregates);
    }

    this.assignFlashPoolWhereAvailable(hagroup);
};

Builder.prototype.addManualAggregate = function addManualAggregate(systemId, aggregate) {
    if (aggregate) {
        this.deleteAutoAggregates(systemId);
        this.attachAggregatesToControllers(this.clip.synergy_model.hagroups, [aggregate]);
        this.buildAutoAggregates(systemId);
    }

    return aggregate; // TODO: Remove this, look at all callers of addManualAggregate
};

Builder.prototype.attachAggregatesToControllers = function(hagroups, aggregatesToAttach) {
    // Flatten if we need to
    if (aggregatesToAttach && aggregatesToAttach.length > 0) {
        if (aggregatesToAttach[0] instanceof Array) {
            aggregatesToAttach = _.flatten(aggregatesToAttach);
        }
    }

    if (hagroups) {
        _.forEach(hagroups, function(hagroup) {
            var controllers = hagroup.controllers;

            if (controllers) {
                _.forEach(controllers, function(controller) {
                    if (!controller.aggregates) {
                        controller.aggregates = [];
                    }

                    controller.aggregates = withoutAggregatesWeAreAdding(controller.aggregates);

                    controller.aggregates.push(_.where(aggregatesToAttach, function(aggregate) {
                        return aggregate._controller === controller._id;
                    }));

                    controller.aggregates = _.flatten(controller.aggregates);

                    function withoutAggregatesWeAreAdding(aggrs) {
                        return _.where(aggrs, function(aggr) {
                            return !_.contains(_.map(aggregatesToAttach, '_id'), aggr._id);
                        });
                    }
                });
            }
        });
    }
};

module.exports = Builder;
