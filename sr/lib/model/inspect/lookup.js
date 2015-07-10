'use strict';

var assert = require('assert'),
    RaidLimits = require('../aggregates/raid-limits'),
    RAID_LIMITS = new RaidLimits(),
    RAID_TYPES = RAID_LIMITS._raidTypes,
    AGGR_TYPES = require('../aggregates/aggregate-types'),
    lcprop = require('../../lcprop'),
    uuid = require('uuid'),
    AggregateLimitFinder = require('../aggregates/aggregateLimitFinder'),
    getExpectedSpares = require('../../prodinfo/tables/spares'),
    mutil = require('../util'),
    _ = require('lodash');

assert(RAID_TYPES); // aah, well, better make our own

/**
 * Provides one-stop-shop API. Not cohesive, but everything's available
 * using the hagi you already have. Provided as hagi.lookup.
 *
 * Many of the arithmetic methods from RAID_LIMITS referred to here should
 * be moved somewhere else, the lookup methods to prodinfo/tables.
 */

function Lookup(hagi) {
    assert(this instanceof Lookup);
    this._hagi = hagi; // try to avoid it unless ext API forces your hand
    this._limits = hagi.limits;
    this._version = hagi.hagroup.version;
    this._versionNumber = hagi.versionNumber;
    this._isFAS = isFAS(hagi);
    this._ALF = new AggregateLimitFinder(hagi);
    lcprop(this, 'possibleRaidTypes', this._get_possibleRaidTypes);
    lcprop(this, 'possibleAggrTypes', this._get_possibleAggrTypes);
    lcprop(this, 'minimumFPDevicesForAggregate', this._get_minFPDevicesFromLimits);
}

Lookup.prototype._perfDeviceTypes = ['SAS', 'FC_SAS', 'SSD', 'FC'];

Lookup.prototype._capacityDeviceTypes = ['MSATA', 'SATA', 'NL_SAS'];

Lookup.prototype.isDeviceTypePerformance = function isDeviceTypePerformance(deviceType) {
    return _.contains(this._perfDeviceTypes, deviceType);
};

Lookup.prototype._get_minFPDevicesFromLimits = function() {
    return this._limits.aggr.min_fp_drives || 0;
};

Lookup.prototype._get_possibleRaidTypes = function () {
    if (this._isFAS) {
        return [
            RAID_TYPES.RAID_DP,
            RAID_TYPES.RAID_4
        ];
    } else {
        return [
            RAID_TYPES.DDP,
            RAID_TYPES.RAID_0,
            RAID_TYPES.RAID_1,
            RAID_TYPES.RAID_3,
            RAID_TYPES.RAID_5,
            RAID_TYPES.RAID_6,
            RAID_TYPES.RAID_10,
        ];
    }
};

Lookup.prototype._get_possibleAggrTypes = function () {
    if (this._isFAS) {
        return [
            AGGR_TYPES.AGGR_64_BIT,
            AGGR_TYPES.AGGR_32_BIT
        ];
    } else {
        return [
            AGGR_TYPES.VOL_GROUP,
        ];
    }
};

Lookup.prototype.minimalRootAggregateDriveCount = function (spec, raidType) {
    spec = reverseEngineerTypeFromRotationSpeedIfRequired(spec);
    return RAID_LIMITS.minDrivesNeededForDedicatedRootAggregate(this._hagi, spec, raidType);
};

Lookup.prototype.raidLimits = function (spec, raidType) {
    spec = reverseEngineerTypeFromRotationSpeedIfRequired(spec);
    return RAID_LIMITS.findLimits(this._hagi, raidType, spec);
};

Lookup.prototype.lowestOverheadRaidSize = function (spec, raidType, deviceCount) {
    spec = reverseEngineerTypeFromRotationSpeedIfRequired(spec);
    return RAID_LIMITS.getEffectiveRaidSize(this._hagi, raidType, spec, deviceCount, this._hagi.hagroup.policies);
};

/**
 * Return the default aggregate props. Provided here for shared use by auto
 * and manual aggregate modules. Best used with _.merge after {} but before
 * the props you're supplying.
 */

Lookup.prototype.defaultAggrProps = function () {
    return {
        _id: uuid(),
        _strategy: undefined,
        _type: 'aggregate',
        _manual: false,
        _controller: undefined,
        name: 'aggr' + uuid().slice(0, 8),
        block_type: this.possibleAggrTypes[0],
        raid_type: this.possibleRaidTypes[0],
        cache_raid_type: this.possibleRaidTypes[0],
        is_hybrid: false,
        is_mirrored: false,
        is_root_aggregate: false,
        _snapreserve_proportion: 0,
        _ddpreserve: 0,
    };
};

Lookup.prototype.reserveRecommendationForDDP = function (deviceCount) {
    return RAID_TYPES._getDdpReserveRecommendation(deviceCount);
};

/*
    Raid size is optional
*/
// OLD: maxAggrDeviceCount
Lookup.prototype.maxAggrDataDeviceCount = function maxAggrDataDeviceCount(spec, count, aggrType, raidType, raidSize) {
    return this._ALF.maxDataDevices(spec, count, aggrType, raidType, raidSize);
};

Lookup.prototype.maxAggrCacheDeviceCount = function maxAggrCacheDeviceCount(spec, count, aggrType, raidType, raidSize) {
    return this._ALF.maxCacheDevices(spec, count, aggrType, raidType, raidSize);
};

Lookup.prototype.maxAggrDeviceCount = function maxAggrDeviceCount(spec, deviceCount, aggrType, raidType, forCache, policies) {
    spec = reverseEngineerTypeFromRotationSpeedIfRequired(spec);
    return this._ALF.maximumDriveCountGiven(spec, deviceCount, aggrType, raidType, forCache, policies);
};

Lookup.prototype.minAggrDeviceCount = function (raidType) {
    return RAID_TYPES.getParityCountForRaidType(raidType) + 1;
};

Lookup.prototype.expectedSpares = function (situation) {
    var isOneShelf = this._hagi.hagroup.shelves.length === 1,
        isEmbeddedShelfOnly = isOneShelf && this._hagi.config.isEmbedded,
        defaults = {
            isEmbeddedShelfOnly: isEmbeddedShelfOnly
        };

    return getExpectedSpares(_.merge({}, defaults, situation));
};

function isFAS(hagi) {
    var configGroup = hagi.configGroup,
        parentGroup = hagi.configGroup.parent || {};

    return configGroup.id === 'FAS' || parentGroup.id === 'FAS';
}

function reverseEngineerTypeFromRotationSpeedIfRequired(spec) {
    return _.merge({}, spec, {
        type: mutil.rpmToEffectiveDriveType(spec.rpm),
        _type_faked: true,
    });
}

module.exports = Lookup;
