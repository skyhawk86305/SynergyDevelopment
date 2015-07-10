'use strict';

var assert = require('assert'),
    _ = require('lodash'),
    util = require('util'),
    RaidTypes = require('../aggregates/raid-types'),
    Unit = require('../../units');

var MIN_DISKS_FP = 3,
    MIN_DISK_WIDTH_SP = 2,
    MAX_DISK_WIDTH_SP = 28,
    SLICES_PER_SP = 4;

function Builder() {
    assert(false, 'mixin; do not use in isolation');
}

Builder.prototype.assignFlashPoolWhereAvailable = function assignFlashPoolWhereAvailable(hagroup) {
    var map = this._makeNewMap(),
        hagi = map.inspect(hagroup),
        isFAS = !hagi.isESeries && !hagi.isFlashRay,
        isFullsteamPlus = this._isFullsteamPlus(hagi),
        buildFlashPool = (isFullsteamPlus) ? this._buildStoragePools : this._buildClassicFPRaidGroups,
        availableDevices = hagi.availablePhysicalDevices(),
        availableFPDevices = this._filterDevicesForFlashPool(availableDevices),
        haveAvailableSSDs = availableFPDevices && availableFPDevices.length > 0,
        existingDataAggregates = this._existingDataAggregates(hagroup),
        userWantsFlashPools = this._flashPoolPolicy(hagroup);

    this.MIN_DISKS_FP = hagi.lookup.minimumFPDevicesForAggregate;

    if (isFAS && haveAvailableSSDs && userWantsFlashPools) {
        buildFlashPool(existingDataAggregates, availableFPDevices);
    }
};

Builder.prototype._flashPoolPolicy = function _flashPoolPolicy(hagroup) {
    var defaultValue = true,
        policies = hagroup._policies;

    if (policies && policies.Aggregates) {
        return policies.Aggregates.ssdsForFlashPool;
    }

    return defaultValue;
};

Builder.prototype._buildStoragePools = function _buildStoragePools(dataAggregates, availableFPDevices) {
    var allocations = this._determineFPStoragePoolAllocation(dataAggregates, availableFPDevices),
        fpStoragePoolIds = [],
        _this = this;

    // console.log('storage pool allocation plan: ', _.clone(allocations));
    _.forEach(allocations, function(allocation) {
        /*
        {
            willServeAggregates: howManyAggregatesToServe,
            storagePoolCount: storagePoolCount,
            devicesPerStoragePool: deviceCountPerSP,
            leftovers: leftovers
        }
        */

        // Build and assign storage pools / aggregates for devices
        _.forEach(_.range(1, allocation.storagePoolCount + 1), function() {
            var numberOfAggregates = Math.min(allocation.willServeAggregates.length, SLICES_PER_SP),
                aggregateIds = _.take(allocation.willServeAggregates, numberOfAggregates),
                controller = _this._findControllerWhoOwnsAggregate(_.first(aggregateIds)), // We can use storage pools across HAPair, so we just need A controller
                devicesPerPool = allocation.devicesPerStoragePool,
                effectiveRaidType = _this._raidTypeGivenDeviceConstraints(devicesPerPool);

            var newStoragePoolId = _this.addStoragePool(controller._id, allocation.physicalDeviceSpec, effectiveRaidType, devicesPerPool, false);

            _this._takeSlicesForAggregates(newStoragePoolId, aggregateIds); // allocation.willServeAggregates
            fpStoragePoolIds.push(newStoragePoolId);

            // NOTE: When you have 2 aggregates, spread across 2 storage pools -- this will FAIL if you try to build the next one with no aggrs
            var aggrDelta = _.difference(allocation.willServeAggregates, aggregateIds);

            if (aggrDelta.length > 0) {
                allocation.willServeAggregates = _.difference(allocation.willServeAggregates, aggregateIds);
            }
        });
    });

    return fpStoragePoolIds;
};

Builder.prototype._buildClassicFPRaidGroups = function _buildClassicFPRaidGroups(dataAggregates, availableFPDevices) {
    var allocations = this._determineFPRaidGroupAllocation(dataAggregates, availableFPDevices),
        fpRaidGroupIds = [],
        _this = this;

    _.forEach(allocations, function(allocation) {
        _.forEach(allocation.willServeAggregates, function(aggregateId) {
            var deviceCount = allocation.devicesPerAggregate,
                deviceSpec = allocation.physicalDeviceSpec,
                effectiveRaidType = _this._raidTypeGivenDeviceConstraints(deviceCount);

            if (_.first(allocation.willServeAggregates) === aggregateId) {
                deviceCount += allocation.leftovers; // Give the first whatever leftovers we had
            }

            var newRaidGroupId = _this.addFlashPoolRaidGroupToAggregate(aggregateId, effectiveRaidType, deviceSpec, deviceCount);

            fpRaidGroupIds.push(newRaidGroupId);
        });
    });

    return fpRaidGroupIds;
};

Builder.prototype._raidTypeGivenDeviceConstraints = function _raidTypeGivenDeviceConstraints(deviceCount) {
    var raidTypes = new RaidTypes(),
        preferredRaidType = raidTypes.RAID_DP, // Per Changjie
        prohibitedRaidTypes = [raidTypes.RAID_0, raidTypes.RAID_1]; // Per Changjie

    if (deviceCount < raidTypes.minRaidSize(preferredRaidType)) {
        var raidTypeMinimumsMap = _.map(_.keys(raidTypes), function(raidType) {
                return {
                    raidType: raidType,
                    minimum: raidTypes.minRaidSize(raidType)
                };
            }),
            raidTypesWithConstraint = _.where(raidTypeMinimumsMap, function(raidTypeItem) {
                return raidTypeItem.minimum <= deviceCount && !_.contains(prohibitedRaidTypes, raidTypeItem.raidType);
            });

        assert(raidTypesWithConstraint.length > 0, 'Unable to find any raid type given constraint for ' + deviceCount + ' devices');

        return _.first(_.sortBy(raidTypesWithConstraint)).raidType;
    }

    return preferredRaidType;
};

Builder.prototype._takeSlicesForAggregates = function _takeSlicesForAggregates(storagePoolId, aggregateIds) {
    assert(aggregateIds, 'Must provide aggregates to take storage pool slices for');
    assert(aggregateIds.length <= SLICES_PER_SP, 'Cannot exceed ' + SLICES_PER_SP + ' aggregates being assigned per pool');

    var storagePool = this._findStoragePoolById(storagePoolId),
        newAggrAssignments = {},
        aggrIdsToAssign = this._fullyUtilizeStoragePoolGivenAggregates(aggregateIds),
        _this = this;

    _.forEach(_.range(0, SLICES_PER_SP), function(sliceIndex) {
        var aggrIdToAssign = aggrIdsToAssign[sliceIndex],
            storagePoolRaidType = storagePool.raid_type,
            spRaidWidth = storagePool._allocations[sliceIndex].devices.length,
            spRaidGroupDeviceSpec = _.first(storagePool._allocations[sliceIndex].__deviceSpecs).spec,
            newSpRaidGroup = _this.addFlashPoolRaidGroupToAggregate(aggrIdToAssign, storagePoolRaidType, spRaidGroupDeviceSpec, spRaidWidth);

        if (newSpRaidGroup) {
            storagePool._allocations[sliceIndex].aggr_id = aggrIdToAssign;

            if (!newAggrAssignments[aggrIdToAssign]) {
                newAggrAssignments[aggrIdToAssign] = [];
            }

            newAggrAssignments[aggrIdToAssign].push(newSpRaidGroup);
        }
    });

    return newAggrAssignments;
};

Builder.prototype._deviceSpecFromAllocationUnit = function _deviceSpecFromAllocationUnit(storagePoolId, sliceName, allocationUnit, storagePoolDeviceSpec) {
    var sliceCapacityGb = new Unit(4, 'KiB').mult(allocationUnit.used_blocks).value_gb,
        clonedDeviceSpec = _.clone(storagePoolDeviceSpec);

    clonedDeviceSpec = _.merge(clonedDeviceSpec, {
        rsgb: sliceCapacityGb,
        slice: sliceName,
        _for_storage_pool: storagePoolId
    });

    return clonedDeviceSpec;
};

Builder.prototype._fullyUtilizeStoragePoolGivenAggregates = function _fullyUtilizeStoragePoolGivenAggregates(aggregatesToAssign) {
    var leftoverSlices = SLICES_PER_SP - aggregatesToAssign.length;

    if (leftoverSlices > 0) {
        var aggrIndex = 0;

        var extraAllocations = _.map(_.range(0, leftoverSlices), function(leftoverIndex) {
            if (leftoverIndex + 1 > aggregatesToAssign.length) {
                aggrIndex = 0; // Reset
            }

            return aggregatesToAssign[aggrIndex++];
        });

        aggregatesToAssign.push.apply(aggregatesToAssign, extraAllocations);
    }

    return aggregatesToAssign;
};

Builder.prototype._determineFPStoragePoolAllocation = function _determineFPStoragePoolAllocation(dataAggregates, availableFPDevices) {
    var spAllocations = [],
        allAggregateIds = _.map(dataAggregates, '_id'),
        numberOfAggregates = dataAggregates.length,
        numberOfDevices = this._totalNumberOfDevices(availableFPDevices),
        _this = this;

    _.forEach(availableFPDevices, function(device) {
        if (device.devices.length < MIN_DISK_WIDTH_SP) {
            return; // Nothing to do here
        }

        if (!device.spec.fp_support) {
            return;
        }

        var fpAllocationForDevice = _this._devicesPerFPStoragePool(device, numberOfAggregates, numberOfDevices),
            packaged = _this._mergeAndPackageFPAllocationForDevice(device, fpAllocationForDevice, allAggregateIds);

        if (packaged) {
            spAllocations.push(packaged);
        }
    });

    return spAllocations;
};

Builder.prototype._determineFPRaidGroupAllocation = function _determineFPRaidGroupAllocation(dataAggregates, availableFPDevices) {
    var rgAllocations = [],
        allAggregateIds = _.map(dataAggregates, '_id'),
        numberOfAggregates = dataAggregates.length,
        numberOfDevices = this._totalNumberOfDevices(availableFPDevices),
        _this = this;

    _.forEach(availableFPDevices, function(device) {
        var fpAllocationForDevice = _this._devicesPerFPRaidGroupAggregate(device, numberOfAggregates, numberOfDevices),
            packaged = _this._mergeAndPackageFPAllocationForDevice(device, fpAllocationForDevice, allAggregateIds);

        if (packaged) {
            rgAllocations.push(packaged);
        }
    });

    return rgAllocations;
};

Builder.prototype._mergeAndPackageFPAllocationForDevice = function _mergeAndPackageFPAllocationForDevice(device, fpAllocationForDevice, allAggregateIds) {
    if (fpAllocationForDevice && fpAllocationForDevice.willServeAggregates > 0) {
        _.merge(fpAllocationForDevice, {
            willServeAggregates: _.take(allAggregateIds, fpAllocationForDevice.willServeAggregates),
            physicalDeviceSpec: device.spec
        });

        allAggregateIds = _.without(allAggregateIds, fpAllocationForDevice.willServeAggregates);

        return fpAllocationForDevice;
    }

    return null;
};

Builder.prototype._devicesPerFPStoragePool = function _devicesPerFPStoragePool(device, totalAggregates, totalDevices) {
    var deviceCount = device.devices.length,
        proportionOfDevices = deviceCount / totalDevices,
        howManyAggregatesToServe = Math.floor(totalAggregates * proportionOfDevices),
        storagePoolCount = Math.ceil(howManyAggregatesToServe / SLICES_PER_SP),
        deviceCountPerSP = Math.floor(deviceCount / storagePoolCount),
        leftovers = deviceCount - (deviceCountPerSP * storagePoolCount);

    /*
        Ex. 2 aggregates, 8 devices
    */

    // EDGE CASE: We can hand out more disks to storage pools
    if (leftovers % storagePoolCount === 0 && leftovers > 0) {
        deviceCountPerSP += (leftovers / storagePoolCount);
    }

    // EDGE CASE: Per storage pool width too low
    if (deviceCountPerSP < MIN_DISK_WIDTH_SP) {
        while (deviceCountPerSP < MIN_DISK_WIDTH_SP) {
            storagePoolCount--;
            deviceCountPerSP = Math.floor(deviceCountPerSP / storagePoolCount);

            if (storagePoolCount === 0) {
                // No storage pools to build
                deviceCountPerSP = 0;
                break;
            }
        }
    }

    // EDGE CASE: Per storage pool width too wide
    if (deviceCountPerSP > MAX_DISK_WIDTH_SP) {
        while (deviceCountPerSP > MAX_DISK_WIDTH_SP) {
            storagePoolCount++;
            deviceCountPerSP = Math.floor(deviceCountPerSP / storagePoolCount);

            if (deviceCountPerSP === Infinity) {
                // We jumped the shark
                deviceCountPerSP = 0;
                break;
            }
        }
    }

    // EDGE CASE: A single storage pool, with leftovers
    if (storagePoolCount === 1) {
        deviceCountPerSP += leftovers;
        leftovers = 0;
    }

    return {
        willServeAggregates: howManyAggregatesToServe,
        storagePoolCount: storagePoolCount,
        devicesPerStoragePool: deviceCountPerSP,
        leftovers: leftovers
    };
};

Builder.prototype._devicesPerFPRaidGroupAggregate = function _devicesPerFPRaidGroupAggregate(device, totalAggregates, totalDevices) {
    var deviceCount = device.devices.length,
        proportionOfDevices = Math.floor(deviceCount / totalDevices),
        howManyAggregatesToServe = Math.floor(totalAggregates * proportionOfDevices),
        perAggregateAllocation = Math.floor(deviceCount / howManyAggregatesToServe),
        leftovers = deviceCount - (perAggregateAllocation * howManyAggregatesToServe);

    if (deviceCount < MIN_DISKS_FP) {
        console.warn(util.format('Cannot allocate %s disks, minimum is %s', deviceCount, MIN_DISKS_FP));
        return null; // Cannot do anything
    }

    // EDGE CASE: We can give 1 more disk to each
    if (leftovers % howManyAggregatesToServe === 0 && leftovers > 0) {
        perAggregateAllocation += (leftovers / howManyAggregatesToServe);
        leftovers = 0;
    }

    // EDGE CASE: per aggr allocation below min, reduce aggrs we can support
    if (perAggregateAllocation < MIN_DISKS_FP) {
        while (perAggregateAllocation < MIN_DISKS_FP) {
            howManyAggregatesToServe--;
            perAggregateAllocation++;
        }
    }

    // EDGE CASE: We are serving 1 aggregate, with leftovers
    if (howManyAggregatesToServe === 1) {
        perAggregateAllocation += leftovers;
        leftovers = 0;
    }

    return {
        willServeAggregates: howManyAggregatesToServe,
        devicesPerAggregate: perAggregateAllocation,
        leftovers: leftovers
    };
};

Builder.prototype._isFullsteamPlus = function _isFullsteamPlus(hagi) {
    var floatVersion = parseFloat(hagi.versionNumber);

    if (floatVersion >= 8.3) {
        return true;
    }
    else {
        return false;
    }
};

Builder.prototype._existingDataAggregates = function _existingDataAggregates(hagroup) {
    var allAggregates = _.flatten(_.map(hagroup.controllers, function(controller) {
        return (controller.aggregates) ? controller.aggregates : [];
    }));

    return _.where(allAggregates, function(aggregate) {
        var aggregateDriveDetail = _.flatten(_.map(aggregate._raid_groups, function(raidGroup) {
                    var allSupportFlashPool = _.every(_.map(raidGroup.__deviceSpecs, function(device) {
                        return device.spec.fp_support;
                    })),
                    uniqueDriveTypes = _.uniq(_.map(raidGroup.__deviceSpecs, function(device) {
                        return device.spec.type;
                    })),
                    areNotJustSSDs = (uniqueDriveTypes.length === 1 && _.first(uniqueDriveTypes) === 'SSD') ? false : true;

                return {
                    supportsFlashPool: allSupportFlashPool,
                    notJustSSDs: areNotJustSSDs
                };
            }));

        return !aggregate._isManual && !aggregate.is_root_aggregate && _.every(aggregateDriveDetail, 'supportsFlashPool') && _.every(aggregateDriveDetail, 'notJustSSDs');
    });
};

Builder.prototype._totalNumberOfDevices = function _totalNumberOfDevices(availableFPDevices) {
    var mappedCounts = _.map(availableFPDevices, function(item) {
        return item.devices.length;
    });

    return _.reduce(mappedCounts, function(count, item) { return count + item; });
};

Builder.prototype._filterDevicesForFlashPool = function _availableDevicesForFlashPool(availableDevices) {
    return _.where(availableDevices, function(device) {
        return device.spec.fp_support && device.spec.type === 'SSD';
    });
};

module.exports = Builder;
