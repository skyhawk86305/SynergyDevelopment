'use strict';

var assert = require('assert'),
    _ = require('lodash'),
    modelUtil = require('../util'),
    lcprop = require('../../lcprop'),
    deviceInfo = require('../../clip/device-info'),
    addQueryAPI = require('../../add-query-api'),
    Lookup = require('./lookup');

function HagroupInspector(init) {
    init(this); // this.inspect, this.info, this.cluster, this.hagroup, ...

    var info = this.info,
        hagroup = this.hagroup;

    assert.notEqual(info, undefined, 'a4bc15c3');
    assert.notEqual(hagroup, undefined, '4b3aa363');

    lcprop(this, 'config', function getConfig() {
        return info.getConfig(hagroup);
    });

    lcprop(this, 'configGroup', function getConfigGroup() {
        return info.determineConfigGroup(hagroup);
    });

    lcprop(this, 'productLine', function getProductLine() {
        var group = this.configGroup,
            parent = group.parent;

        return parent ? parent.id : group.id;
    });

    lcprop(this, 'limits', function getLimits() {
        return this.config.matrix.getLimitsForVersion(hagroup.version);
    });

    lcprop(this, 'isESeries', function isEseries() {
        if (!this.config || !this.config.platformModel) {
            return false;
        }

        return this.config.platformModel.toUpperCase().indexOf('E') === 0;
    });

    lcprop(this, 'isFlashRay', function isFlashRay() {
        if (!this.config.platformModel) {
            return false;
        }

        return this.config.platformModel.toUpperCase().indexOf('RAY') === 0;
    });

    lcprop(this, 'versionNumber', function extractVersionNumber() {
        var fullVersion = this.hagroup.version,
            indexOfSeperator = this.hagroup.version.indexOf(' '),
            versionNumber = (indexOfSeperator) ? fullVersion : fullVersion.substring(0, indexOfSeperator);

        return versionNumber;
    });

    lcprop(this, 'embeddedShelf', _.partial(findEmbeddedShelf, hagroup));

    lcprop(this, 'controllers', this._get_controllers);
    lcprop(this, 'aggregates', this._get_aggregates);

    /*
    lcprop(this, 'deviceInfo', function () {
        return deviceInfo.from.hagroup(hagroup);
    }); */
    lcprop(this, 'deviceInfo', this._get_deviceInfo);

    lcprop(this, 'fpStatusByDriveModel', function () {
        var matrix = this.config.matrix,
            result = {},
            version = _.last(this.config.matrix.versions);

        _.forEach(hagroup.shelves, function (shelf) {
            _.forEach(shelf._x_bom.drive_specs, function (spec) {
                result[spec.model] = matrix.checkVersionShelfDrive(
                    version,
                    shelf.model,
                    spec.model
                ).fp_support_drive;
            });
        });

        return result;
    });

    lcprop(this, 'lookup', function () {
        return new Lookup(this);
    });
}

var AGGR_FILTERS = {
        manual: { _manual: true }
    },
    CONTROLLER_FILTERS = {
        // none yet
    };

HagroupInspector.prototype._get_controllers = function controllers() {
    return addQueryAPI(this.hagroup.controllers, CONTROLLER_FILTERS);
};

HagroupInspector.prototype._get_deviceInfo = function() {
    return deviceInfo.from.hagroup(this.hagroup);
};

HagroupInspector.prototype._get_aggregates = function aggregates() {
    var arrays = this.controllers.map('aggregates').filter();
    return addQueryAPI(_.flatten(arrays), AGGR_FILTERS);
};

HagroupInspector.prototype.latestDeviceInfo = function() {
    return this._get_deviceInfo();
};

HagroupInspector.prototype.availableDevices = function availableDevices() {
    return this.transformDriveInfoSequence(this.latestDeviceInfo().where.unused); // where.unused.and.unlocked
};

HagroupInspector.prototype.availablePhysicalDevices = function availablePhysicalDevices() {
    return this.transformDriveInfoSequence(this.latestDeviceInfo().where.physical.and.unused);
};

HagroupInspector.prototype.availableStoragePoolDevices = function availableStoragePoolDevices() {
    return this.transformDriveInfoSequence(this.latestDeviceInfo().where.storagepool.and.unused);
};

// Show everything, even things that are already consumed
HagroupInspector.prototype.allDevices = function allDevices() {
    return this.transformDriveInfoSequence(this.latestDeviceInfo());
};

// Show everything, just do NOT provide any virtual devices
HagroupInspector.prototype.allPhysicalDevices = function allPhysicalDevices() {
    return this.transformDriveInfoSequence(this.latestDeviceInfo().where.physical);
};

/* May be causing issues */
HagroupInspector.prototype.unlockedPhysicalDevices = function unlockedPhysicalDevices() {
    return this.transformDriveInfoSequence(this.latestDeviceInfo().where.physical.and.unlocked);
};

HagroupInspector.prototype.transformDriveInfoSequence = function transformDriveInfoSequence(results) {
    var lastSpec = null,
        lastFp = null,
        specsByFp = {},
        devicesByFp = {};

    for (var idx in results) {
        var info = results[idx],
            spec = info.spec,
            fp = fingerprint(spec);
        if (!_.has(specsByFp, fp)) {
            spec.fp_support = this.fpStatusByDriveModel[spec.model];
            specsByFp[fp] = spec;
            devicesByFp[fp] = [];
        }
        devicesByFp[fp].push(info.id);
    }

    var result = [];

    for (var key in specsByFp) {
        result.push({
            spec: specsByFp[key],
            devices: devicesByFp[key],
        });
    }

    return result;

    function fingerprint(spec) {
        if (spec === lastSpec) {
            return lastFp;
        } else {
            lastSpec = spec;
            lastFp = spec.model;
            if (spec.slice) {
                lastFp = lastFp + '/' + spec.slice + '=' + spec.rsgb;
            }
            return lastFp;
        }
    }
};

HagroupInspector.prototype.storagePools = function storagePools() {
    var pools = _.flatten(_.map(this.hagroup.controllers, function(controller) {
        if (controller.storage_pools) {
            return controller.storage_pools;
        }

        return [];
    }));

    return pools;
};

HagroupInspector.prototype.nodeSummary = function nodeSummary(ejecting) {
    if (this.hagroup.is_clustered) {
        return this.inspect(this.cluster).nodeSummary(ejecting);
    } else {
        var count = 0, nasLimit, sanLimit;
        var isEjectingHagroup = _.some(ejecting, { _type: 'hagroup', _id: this.hagroup._id });

        if (!isEjectingHagroup) {
            var nasNodes = this.limits.nas_nodes,
                sanNodes = this.limits.san_nodes;

            count += this.hagroup.controllers.length || 0;
            nasLimit = (nasLimit === undefined) ? nasNodes : Math.min(nasLimit, nasNodes);
            sanLimit = (sanLimit === undefined) ? sanNodes : Math.min(sanLimit, sanNodes);
        }

        return {
            quantity: count,
            limits: {
                nas: nasLimit || undefined,
                san: sanLimit || undefined
            }
        };
    }
};

HagroupInspector.prototype.shelfDriveSummary = function shelfDriveSummary(ejecting) {
    var capacity = 0,
        counts = {},
        shelves = this._remainingShelves(ejecting);

    _.forEach(shelves, function countByType(shelf) {
        var specs = shelf._x_bom ? shelf._x_bom.drive_specs || [] : [],
            members = shelf._x_bom ? shelf._x_bom.drive_spec_members || [] : [];

        _.forEach(specs, function count(spec, index) {
            var quantity = members[index].length;

            capacity += (spec.rawgb || 0) * quantity;
            counts[spec.type] = (counts[spec.type] || 0) + quantity;
        });
    });

    var driveTotal = _.reduce(counts, function sum(driveTotal, count) {
            return driveTotal + count;
        }, 0);

    /* jshint -W069 */
    return {
        capacity: capacity,
        shelf: {
            total: shelves.length,
            external: (_.where(shelves, { _isembedded: false })).length
        },
        drive: {
            total: driveTotal,
            fc: counts['FC'] || 0,
            sas: (counts['SAS'] || 0) + (counts['NL-SAS'] || 0),
            sata: (counts['SATA'] || 0) + (counts['MSATA'] || 0),
            ssd: counts['SSD'] || 0
        }
    };
};

HagroupInspector.prototype.versionRange = function versionRange(ejecting) {
    if (this.hagroup.is_clustered) {
        return this.inspect(this.cluster).versionRange(ejecting);
    } else {
        var shelfRange = this.shelfVersionRange(ejecting),
            isEjectingHagroup = _.some(ejecting, { _type: 'hagroup', _id: this.hagroup._id });

        if (isEjectingHagroup) {
            return shelfRange ? shelfRange : undefined;
        } else {
            var versions = this.config.matrix.versions;

            return shelfRange ? _.intersection(versions, shelfRange) : versions;
        }
    }
};

HagroupInspector.prototype.shelfVersionRange = function shelfVersionRange(ejecting) {
    var shelves = this._impactedShelves(ejecting),
        configs = this.getShelfConfigs();

    return _.reduce(shelves || [], function intersection(range, shelf) {
        var config = modelUtil.chooseClosestShelfConfig(shelf, configs),
            versions = config ? _.pluck(config.versions, 'version') : [];

        return range ? _.intersection(range, versions) : versions;
    }, undefined);
};

HagroupInspector.prototype.getShelfConfigs = function getShelfConfigs() {
    var hardware = this.config.matrix.hardwareOptions,
        externalShelves = hardware.shelves,
        embeddedShelves = hardware.embeddedShelves,
        shelfPresets = hardware.shelfPresets,
        result = [];

    Array.prototype.push.apply(result, externalShelves);
    Array.prototype.push.apply(result, embeddedShelves);
    Array.prototype.push.apply(result, shelfPresets);

    return result;
};

HagroupInspector.prototype._impactedShelves = function _impactedShelves(ejecting) {
    var shelves = _.where(ejecting, { _type: 'shelf' });

    return _.filter(this.hagroup.shelves || [], function isNotReplacing(shelf) {
        return !_.some(shelves, { _id: shelf._id });
    });
};

HagroupInspector.prototype._remainingShelves = function _remainingShelves(ejecting) {
    var shelves = _.where(ejecting, { _type: 'shelf' });

    return _.filter(this.hagroup.shelves || [], function isNotReplacing(shelf) {
        return !_.some(shelves, { _id: shelf._id });
    });
};

HagroupInspector.prototype.availableDeviceIdsForSpec = function deviceIdsForSpec(spec) {
    var availableDevices = this.availableDevices(),
        withSpec = _.where(availableDevices, { spec: spec }),
        result = (withSpec.length > 0) ? _.first(withSpec).devices : null;

    return result;
};

HagroupInspector.prototype.findSpecForDeviceId = function findSpecForDeviceId(deviceId) {
    assert(deviceId, 'Must provide deviceId to locate spec');

    var deviceSpec = null,
        owningShelfId = this._getShelfIdForGivenDeviceId(deviceId);

    if (owningShelfId) {
        deviceSpec = this._getDeviceSpecGivenShelfIdAndDeviceId(owningShelfId, deviceId);
    }

    return deviceSpec;
};

HagroupInspector.prototype._getShelfIdForGivenDeviceId = function _getShelfIdForGivenDeviceId(deviceId) {
    assert(deviceId, 'Must provide a deviceId to find shelfId');
    assert(deviceId.length > 8, 'Invalid deviceId');

    var shelfStartsWith = deviceId.slice(1, 9),
        shelvesLike = _.where(this.hagroup.shelves, function(shelf) {
            return shelf._id.indexOf(shelfStartsWith) === 0;
        });

    if (shelvesLike.length) {
        return _.first(shelvesLike)._id;
    }

    return null;
};

HagroupInspector.prototype._getDeviceSpecGivenShelfIdAndDeviceId = function _getDeviceSpecGivenShelfIdAndDeviceId(shelfId, deviceId) {
    assert(shelfId, 'Must provide a shelfId to resolve a device spec');
    assert(deviceId, 'Must provide a deviceId to resolve a device spec');

    var _this = this,
        shelf = _.first(_.where(_this.hagroup.shelves, { _id: shelfId })),
        driveSpecIndexOnShelf = this._findDeviceSpecIndexInShelfGivenDeviceId(shelf, deviceId),
        deviceSpec = shelf._x_bom.drive_specs[driveSpecIndexOnShelf];

    return deviceSpec;
};

/*
    NOTE: We may need to change this to look at controller.allocated_storage also and expand spec to include slice capacity
*/
HagroupInspector.prototype._findDeviceSpecIndexInShelfGivenDeviceId = function _findDeviceSpecIndexInShelfGivenDeviceId(shelf, deviceId) {
    assert(shelf, 'Must provide a shelf to look for spec index');
    assert(shelf._x_bom, 'Shelf is missing _x_bom');
    assert(deviceId, 'Must provide a deviceId to find device spec index');

    var driveSpecMembers = shelf._x_bom.drive_spec_members,
        driveSpecIndex = -1;

    for (var i = 0; i < driveSpecMembers.length; i++) {
        if (_.contains(driveSpecMembers[i], deviceId)) {
            driveSpecIndex = i;
            break;
        }
    }

    return driveSpecIndex;
};

function findEmbeddedShelf(hagroup) {
    var embeddedShelves = _.where(hagroup.shelves || [], { _isembedded: true });
    if (embeddedShelves.length) {
        assert.equal(embeddedShelves.length, 1, '>1 embedded shelf');
        return embeddedShelves[0];
    } else {
        return null;
    }
}

module.exports = HagroupInspector;
