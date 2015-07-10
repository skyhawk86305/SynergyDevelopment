'use strict';
/*jshint unused:false */

var assert = require('assert'),
    _ = require('lodash'),
    RaidLimits = require('./raid-limits'),
    RaidTypes = require('./raid-types'),
    Unit = require('../../units'),
    AggregateTypes = require('./aggregate-types'),
    AggregateReporter = require('./aggregateReporter');

function AggregateLimitFinder(hagi) {
    assert(hagi, 'Must provide a hagroup inspector to find limits');
    this._hagi = hagi;
    this._limits = hagi.limits;
    this._raidTypes = new RaidTypes();
    this._raidLimits = new RaidLimits();
}

/*
    NOTE: Allow override of raid-size for situations like manual aggregates. If missing, find best rs.
*/

AggregateLimitFinder.prototype.maxDataDevices = function maxDataDevices(spec, count, aggrType, raidType, raidSize) {
    var effectiveRaidSize = (raidSize) ? raidSize : this._determineEstimatedRaidSize(spec, count, raidType),
        limit = this._aggrLimitTBUnit(aggrType);

    return this._deviceLimit(spec, count, limit, aggrType, raidType, effectiveRaidSize);
};

AggregateLimitFinder.prototype.maxCacheDevices = function maxCacheDevices(spec, count, aggrType, raidType, raidSize) {
    var effectiveRaidSize = (raidSize) ? raidSize : this._determineEstimatedRaidSize(spec, count, raidType),
        limit = this._aggrCacheLimitTBUnit();

    return this._deviceLimit(spec, count, limit, aggrType, raidType, effectiveRaidSize);
};

AggregateLimitFinder.prototype._deviceLimit = function _deviceLimit(spec, count, limit, aggregateType, raidType, raidSize) {
    if (raidType === this._raidTypes.RAID_5 || raidType === this._raidTypes.RAID_6) {
        return Math.min(count, 30);
    }

    if (raidType === this._raidTypes.DDP) {
        return count;
    }

    var dataDrivesPerRg = this._numberOfEstimatedDataDrivesPerRg(raidType, raidSize),
        numberOfRaidGroups = Math.floor(count / raidSize) + 1,
        typeOfAggregateLimitTb = this._aggrLimitTBUnit(aggregateType);

    if (limit) {
        var perRaidGroupCapacityInGb = this._estimatedCapacityFASPerRaidGroupInGB(spec, dataDrivesPerRg),
            howManyRaidGroups = Math.min(Math.floor(typeOfAggregateLimitTb.value_gb / perRaidGroupCapacityInGb), numberOfRaidGroups);

        return Math.min(count, howManyRaidGroups * raidSize);
    }
    else {
        return count;
    }
};

AggregateLimitFinder.prototype._determineEstimatedRaidSize = function _determineEstimatedRaidSize(spec, count, raidType) {
    return this._hagi.lookup.lowestOverheadRaidSize(spec, raidType, count);
};

AggregateLimitFinder.prototype._aggrLimitTBUnit = function _aggrLimitTBUnit(aggrType) {
    var limits = this._limits,
        tbSize = (aggrType === AggregateTypes.AGGR_32_BIT) ? limits.aggr.size_32_tb : limits.aggr.size_64_tb;

    return new Unit(tbSize, 'TB');
};

AggregateLimitFinder.prototype._aggrCacheLimitTBUnit = function _aggrCacheLimitTBUnit() {
    var currentCacheCapacity = this._currentSystemCacheCapacity(),
        platformCacheLimit = new Unit(this._limits.cache_with_flash, 'TB'),
        delta = platformCacheLimit.subtract(currentCacheCapacity).value;

    console.log('platform capacity: ', platformCacheLimit.value);
    console.log('current capacity: ', currentCacheCapacity.value);
    console.log('delta: ', delta);

    if (delta < 0) {
        delta = 0;
    }

    return new Unit(delta, 'TB');
};

AggregateLimitFinder.prototype._currentSystemCacheCapacity = function _currentSystemCacheCapacity() {
    var aggregateReporter = new AggregateReporter(this._hagi),
        versionNumber = this._hagi.versionNumber,
        controllers = _.map(this._hagi.hagroup, 'controllers'),
        aggregates = _.map(controllers, 'aggregates'),
        capacities = _.map(aggregates, cacheCapacityForAggr),
        total = _.reduce(capacities, function(sum, n) {
            return sum + n;
        }) || 0;

    return new Unit(total, 'GB').to('TB');

    function cacheCapacityForAggr(aggregate) {
        var report = aggregateReporter.createAggregateReport(aggregate, versionNumber);
        return report.cacheCapacity;
    }
};

AggregateLimitFinder.prototype._numberOfEstimatedDataDrivesPerRg = function _numberOfEstimatedDataDrivesPerRg(raidType, estimatedRaidSize) {
    return this._raidTypes.driveRolesForRaidType(raidType, estimatedRaidSize).data;
};

AggregateLimitFinder.prototype._estimatedCapacityFASPerRaidGroupInGB = function _estimatedCapacityFASPerRaidGroupInGB(deviceSpec, dataDeviceCount) {
    var waflModifier = 0.9,
        fixedOverhead = new Unit(20.5, 'MiB'),
        diskCapacity = new Unit(deviceSpec.rsgb, 'GB'),
        perDriveCapacityUnit = new Unit(diskCapacity.subtract(fixedOverhead).value_gb * waflModifier);

    return perDriveCapacityUnit.value_gb * dataDeviceCount;
};

module.exports = AggregateLimitFinder;
