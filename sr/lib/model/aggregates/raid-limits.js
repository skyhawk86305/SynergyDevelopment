'use strict';

var _ = require('lodash'),
    assert = require('assert'),
    Unit = require('../../units'),
    RaidTypes = require('./raid-types');

function RaidLimits() {
    this._raidTypes = new RaidTypes();
}

/*
    Yields Object of shape:
    {
        defaultSize: <int>,
        lowestSize: <int>,
        highestSize: <int>,
        maximumSize: <int>
    }
*/
RaidLimits.prototype.findLimits = function(hagi, selectedRaidType, deviceSpecs, numberOfDevices) {
    assert(hagi, 'must provide hagroup inspector to find raid limits');
    assert(hagi.hagroup, 'must provide hagroup for inspector to find raid limits');
    assert(hagi.hagroup.version, 'hagroup must have a version');
    assert(selectedRaidType, 'must provide a selected raid type to find limits');
    assert(deviceSpecs, 'must provide device specs to find limits for');

    var osVersion = hagi.versionNumber,
        devicesToFindLimitsFor = _.isArray(deviceSpecs) ? deviceSpecs : [deviceSpecs];

    if (hagi.isESeries) {
        return this._findLimitsForESeries(selectedRaidType, devicesToFindLimitsFor, numberOfDevices);
    }
    else {
        return this._findLimitsForFAS(selectedRaidType, devicesToFindLimitsFor, osVersion);
    }
};

// See: findLimits, need to reimplement policy object for E-Series
RaidLimits.prototype._findLimitsForESeries = function(selectedRaidType, deviceSpecs, numberOfDevices) {
    var raidLimitResult = {},
        _this = this;

    _.forEach(deviceSpecs, function(device) {
        var raidLimitsForDevice = null,
            deviceQuantity = device.quantity || numberOfDevices,
            effectiveDeviceQuantity;

        switch (selectedRaidType) {
            case _this._raidTypes.RAID_1:
                raidLimitsForDevice = _this._packageResult(2, 2, 2, 2);
                break;
            case _this._raidTypes.RAID_5:
            case _this._raidTypes.RAID_6:
                raidLimitsForDevice = _this._packageResult(30, 30, 30, 30);
                break;
            case _this._raidTypes.DDP:
                effectiveDeviceQuantity = deviceQuantity || 11; // 11 is the min size for DDP
                raidLimitsForDevice = _this._packageResult(effectiveDeviceQuantity, effectiveDeviceQuantity, effectiveDeviceQuantity, effectiveDeviceQuantity);
                break;
            case _this._raidTypes.RAID_0:
                effectiveDeviceQuantity = deviceQuantity || 2; // 2 is the min size for RAID_0
                raidLimitsForDevice = _this._packageResult(effectiveDeviceQuantity, effectiveDeviceQuantity, effectiveDeviceQuantity, effectiveDeviceQuantity);
                break;
            case _this._raidTypes.RAID_3:
                effectiveDeviceQuantity = deviceQuantity || 3; // 3 is the min size for RAID_3
                raidLimitsForDevice = _this._packageResult(effectiveDeviceQuantity, effectiveDeviceQuantity, effectiveDeviceQuantity, effectiveDeviceQuantity);
                break;
            case _this._raidTypes.RAID_10:
                effectiveDeviceQuantity = deviceQuantity || 4; // 4 is the min size for RAID_3
                raidLimitsForDevice = _this._packageResult(effectiveDeviceQuantity, effectiveDeviceQuantity, effectiveDeviceQuantity, effectiveDeviceQuantity);
                break;
            default:
                throw new Error('Raid Type ' + selectedRaidType + ' is unsupported on ESeries system.');
        }

        _this._applyUpdatedValueToDeviceLimits(raidLimitResult, 'defaultSize', raidLimitsForDevice.defaultSize, false);
        _this._applyUpdatedValueToDeviceLimits(raidLimitResult, 'lowestSize', raidLimitsForDevice.lowestSize, false);
        _this._applyUpdatedValueToDeviceLimits(raidLimitResult, 'highestSize', raidLimitsForDevice.defaultSize, true);
        _this._applyUpdatedValueToDeviceLimits(raidLimitResult, 'maximumSize', raidLimitsForDevice.defaultSize, true);
    });

    return raidLimitResult;
};

RaidLimits.prototype._findLimitsForFAS = function(selectedRaidType, deviceSpecs, osVersion) {
    var raidLimitResult = {},
        _this = this;

    /*
        We have to account for multiple drive types in a raid group (hetereogenous)
        We want the minimum spec
    */
    _.forEach(deviceSpecs, function(device) {
        var raidLimitsForDevice = null;

        switch (selectedRaidType) {
            case _this._raidTypes.RAID_0:
                raidLimitsForDevice = _this._FASRaid0Limits(device);
                break;
            case _this._raidTypes.RAID_4:
                raidLimitsForDevice = _this._FASRaid4Limits(device);
                break;
            case _this._raidTypes.RAID_DP:
                raidLimitsForDevice = _this._FASRaidDPLimits(osVersion, device);
                break;
            default:
                throw new Error('Raid Type ' + selectedRaidType + ' is unsupported on FAS system.');
        }

        _this._applyUpdatedValueToDeviceLimits(raidLimitResult, 'defaultSize', raidLimitsForDevice.defaultSize, false);
        _this._applyUpdatedValueToDeviceLimits(raidLimitResult, 'lowestSize', raidLimitsForDevice.lowestSize, false);
        _this._applyUpdatedValueToDeviceLimits(raidLimitResult, 'highestSize', raidLimitsForDevice.highestSize, true);
        _this._applyUpdatedValueToDeviceLimits(raidLimitResult, 'maximumSize', raidLimitsForDevice.maximumSize, true);
    });

    return raidLimitResult;
};

RaidLimits.prototype._applyUpdatedValueToDeviceLimits = function(container, key, newValue, useMin) {
    var existingValue = container[key];

    if (!existingValue) {
        existingValue = newValue;
    }

    container[key] = (useMin) ? Math.min(existingValue, newValue) : Math.max(existingValue, newValue);
};

RaidLimits.prototype._FASRaid0Limits = function(deviceSpec) {
    assert(this._fixDriveType(deviceSpec.type) === 'LUN', 'You must use a LUN for FAS Raid 0.');

    return this._packageResult(8, 8, 14, 14);
};

RaidLimits.prototype._FASRaid4Limits = function(deviceSpec) {
    assert(deviceSpec, 'You must provide a drive to determine raid 4 limits for FAS');
    assert(deviceSpec.type, 'You must provide a drive type to determine raid 4 limits for FAS');

    var driveType = this._fixDriveType(deviceSpec.type);

    switch (driveType) {
        case 'FC_SAS':
        case 'SSD':
            return this._packageResult(8, 8, 8, 14);
        case 'SATA':
        case 'NL_SAS':
        case 'MSATA':
            return this._packageResult(7, 7, 7, 7);
        default:
            throw new Error('Unknown drive type ' + driveType + ' for FAS raid 4 limits.');
    }
};

RaidLimits.prototype._FASRaidDPLimits = function(osVersion, deviceSpec) {
    assert(deviceSpec, 'You must provide a drive to determine raid DP limits for FAS');
    assert(deviceSpec.type, 'You must provide a device type to determine raid DP limits for FAS');
    assert(deviceSpec.rsgb, 'You must provide capacity for device to determine raid DP limits for FAS');

    var driveType = this._fixDriveType(deviceSpec.type);

    switch (driveType) {
        case 'FC_SAS':
            return this._packageResult(16, 12, 20, 28);
        case 'SATA':
        case 'NL_SAS':
        case 'MSATA':
            return this._FASRaidDPLimitsForCapacityDrives(osVersion, deviceSpec.rsgb);
        case 'SSD':
            return this._packageResult(23, 20, 28, 28);
        default:
            throw new Error('Unknown drive type ' + driveType + ' for FAS raid DP limits.');
    }
};

RaidLimits.prototype._FASRaidDPLimitsForCapacityDrives = function(osVersion, deviceCapacity) {
    if (deviceCapacity >= 6000) {
        return this._packageResult(14, 12, 14, 14);
    }
    else if (_.contains(osVersion, '8.')) {
        return this._packageResult(14, 12, 20, 20);
    }
    else {
        return this._packageResult(14, 12, 16, 16);
    }
};

RaidLimits.prototype._packageResult = function(defaultSize, lowestSize, highestSize, hardMax) {
    return {
        defaultSize: defaultSize,
        lowestSize: lowestSize,
        highestSize: highestSize,
        maximumSize: hardMax
    };
};

RaidLimits.prototype._fixDriveType = function(driveType) {
    if (driveType) {
        /*
            If SAS, FC_SAS is default
            See: DriveRowExtension.cs -> public static DriveType GetDriveClass(this DM.DriveRow driveRow)
        */
        if (driveType.toUpperCase() === 'SAS' || driveType.toUpperCase() === 'FC') {
            return 'FC_SAS';
        }

        return driveType.replace('-', '_').toUpperCase();
    }
};

RaidLimits.prototype.getEffectiveRaidSize = function getEffectiveRaidSize(hagi, selectedRaidType, withDeviceSpecs, numberOfDevicesForAggregate, policies) {
    var effectiveRaidLimits = this.findLimits(hagi, selectedRaidType, withDeviceSpecs, numberOfDevicesForAggregate, policies),
        lastRaidGroupSize = numberOfDevicesForAggregate % effectiveRaidLimits.defaultSize,
        finalRaidSize = effectiveRaidLimits.defaultSize,
        raidTypes = this._raidTypes;

    if (lastRaidGroupSize !== 0) {
        // Handle edgecase (less than maximum size)
        if (numberOfDevicesForAggregate <= effectiveRaidLimits.maximumSize) {
            finalRaidSize = Math.min(effectiveRaidLimits.maximumSize, numberOfDevicesForAggregate);
            return finalRaidSize;
        }

        // We can do better
        var raidSizeRange = _.range(effectiveRaidLimits.lowestSize, effectiveRaidLimits.highestSize + 1), // Lets avoid max except for edge-case
            raidOverheadMap = _.map(raidSizeRange, function(proposedRaidSize) {
                var fullGroups = Math.floor(numberOfDevicesForAggregate / proposedRaidSize),
                    lastGroupSize = numberOfDevicesForAggregate % proposedRaidSize,
                    driveRolesPerRg = raidTypes.driveRolesForRaidType(selectedRaidType, proposedRaidSize),
                    overheadPerRg = (driveRolesPerRg.parity + driveRolesPerRg.dparity),
                    totalRaidGroups = (lastGroupSize === 0) ? fullGroups : fullGroups + 1;

                return {
                    overheadDrives: totalRaidGroups * overheadPerRg,
                    proposedRaidSize: proposedRaidSize
                };
            });

        // We want the lowest number of overhead drives (gives us most capacity)
        var sortedOverheadMap = _.sortBy(raidOverheadMap, 'overheadDrives');

        finalRaidSize = _.first(sortedOverheadMap).proposedRaidSize;
    }

    return finalRaidSize;
};

RaidLimits.prototype.maxTotalDrivesGivenDriveSpecAndAggrMaxUnit = function(maxAggregateCapacityUnit, hagi, selectedRaidType, deviceSpecs, policies) {
    if (selectedRaidType === this._raidTypes.RAID_5 || selectedRaidType === this._raidTypes.RAID_6) {
        return 30;
    }

    var driveSizeUnit = new Unit(deviceSpecs.rsgb, 'GB'),
        maxDataDrivesByAggregateMaxCapacity = Math.floor(maxAggregateCapacityUnit.value_gb / driveSizeUnit.value_gb);

    return this.totalDrivesGivenDataDriveCountAndRaidTypeForEffectiveRaidSize(
        maxDataDrivesByAggregateMaxCapacity,
        hagi,
        selectedRaidType,
        deviceSpecs,
        policies);

};

RaidLimits.prototype.totalDrivesGivenDataDriveCountAndRaidTypeForEffectiveRaidSize = function(dataDriveCount, hagi, selectedRaidType, deviceSpecs, policies) {
    var parity = this.parityDriveCountNeededGivenDataDriveCountAndRaidType(dataDriveCount, hagi, selectedRaidType, deviceSpecs /*, policies */);
    var preTotal = dataDriveCount + parity;
    //TODO: use : var raidSize =
    this.getEffectiveRaidSize(hagi, selectedRaidType, deviceSpecs, preTotal , policies);
    return preTotal;
};

RaidLimits.prototype.parityDriveCountNeededGivenDataDriveCountAndRaidType = function(dataDriveCount, hagi, selectedRaidType, deviceSpecs /*, policies */) {
    var limits = this.findLimits(hagi, selectedRaidType, deviceSpecs),
        raidTypes = new RaidTypes(),
        parity = raidTypes.getParityCountForRaidType(selectedRaidType),
        maxRaidSize = limits.maximumSize;

    return this.parityDriveCountNeededGivenDataDriveCount(dataDriveCount, maxRaidSize, parity);
};

/*RaidLimits.prototype.totalDriveCountGivenMaxAggregateSizeAndMaxRaidSize = function (maxAggrSize, maxRaidSize, parityDrivesPerRaidGroup) {
    var dataDrives = Math.floor(maxAggrSize / maxRaidSize);
    return dataDrives + this.parityDriveCountNeededGivenDataDriveCount(dataDrives, maxRaidSize, parityDrivesPerRaidGroup);
};

RaidLimits.prototype.parityDriveCountNeededGivenDataDriveCountAndRaidType = function (dataDriveCount, raidType) {
    var raidTypes = new RaidTypes(),
        parity = raidTypes.getParityCountForRaidType(raidType),
        maxRaidSize = 0;

    return this.parityDriveCountNeededGivenDataDriveCount(dataDriveCount, maxRaidSize, parity);
};*/

RaidLimits.prototype.parityDriveCountNeededGivenDataDriveCount = function (dataDriveCount, maxRaidSize, parityDrivesPerRaidGroup) {
    return parityDrivesPerRaidGroup * this.raidGroupCountGivenDataDriveCount(dataDriveCount, maxRaidSize, parityDrivesPerRaidGroup);
};

// jshint laxbreak: true
RaidLimits.prototype.raidGroupCountGivenDataDriveCount = function (data, raidSize, parity) {
    return data >= raidSize
        ? Math.floor(data/raidSize)
            + this.raidGroupCountGivenDataDriveCount(
                parity * Math.floor(data/raidSize) + data%raidSize,
                raidSize,
                parity)
        : data + parity <= raidSize
        ? 1
        : 2;
};

RaidLimits.prototype.minDrivesNeededForDedicatedRootAggregate = function (hagi, driveSpec, raidType) {
    // see planBase _getDeviceForRootAggregateAccountingForADPIfAvailable to
    var raidTypes = new RaidTypes(),
        minRootAggrSizeMib = hagi.limits.aggr.root_aggr_size_mib,
        minRootAggrSizeUnit = new Unit(minRootAggrSizeMib, 'MiB'),
        driveUnit = new Unit(driveSpec.rsgb, 'GB'),
        drivesRequired = Math.ceil(minRootAggrSizeUnit.value_gb / driveUnit.value_gb) +
            raidTypes.getParityCountForRaidType(raidType),
        minDrivesForRaidType = raidTypes.minRaidSize(raidType);

    return Math.max(minDrivesForRaidType, drivesRequired);
};

module.exports = RaidLimits;
