'use strict';
/* jshint unused:false */

var _ = require('lodash'),
    util = require('util'),
    assert = require('assert'),
    Unit = require('../../units'),
    RaidTypes = require('./raid-types');

function AggregateReporter(owningHagi) {
    assert(owningHagi, 'Must provide the hagroup inspector which owns the aggregates to report on.');

    this.hagi = owningHagi;
    this.aggregates = {};
}

AggregateReporter.prototype.createAggregateReport = function createAggregateReport(aggregate, versionNumber) {
    assert(aggregate, 'Cannot create a report without an aggregate');

    this._addAggregateForComputing(aggregate);

    var aggregateId = aggregate._id,
        summary = this._buildSummary(aggregateId, versionNumber),
        report = this._packageAggregateReport(aggregateId, summary);

    this._removeAggregateBecauseDone(aggregateId);

    return report;
};

AggregateReporter.prototype._addAggregateForComputing = function(aggregate) {
    this.aggregates[aggregate._id] = aggregate;
};

AggregateReporter.prototype._removeAggregateBecauseDone = function(aggregateId) {
    delete this.aggregates[aggregateId];
};

AggregateReporter.prototype._packageAggregateReport = function _packageAggregateReport(aggregateId, summary) {
    return {
        aggregateId: aggregateId,
        summary: summary
    };
};

AggregateReporter.prototype._buildSummary = function _buildSummary(aggregateId, versionNumber) {
    var _this = this,
        aggregate = this.aggregates[aggregateId],
        aggregateCapacitySummary = {
            isRootAggregate: aggregate.is_root_aggregate,
            containsVirtualDevices: false,
            rootCapacity: 0.0,
            usableCapacity: 0.0,
            cacheCapacity: 0.0,
            snapReserveCapacity: 0.0,
            totalCapacity: 0.0,
            driveRoleSummary: {
                total: 0,
                data: 0,
                parity: 0,
                dparity: 0,
                reserve: 0,
                cache: 0,
                cacheData: 0,
                physical: {
                    total: 0,
                    data: 0,
                    parity: 0,
                    dparity: 0,
                    reserve: 0,
                    cache: 0
                },
                virtual: {
                    total: 0,
                    data: 0,
                    parity: 0,
                    dparity: 0,
                    reserve: 0,
                    cache: 0
                }
            },
            usableCapacityByType: {},
            driveSpecSummary: {}
        };

    _.forEach(aggregate._raid_groups, function (raidGroup) {
        if (raidGroup.__deviceSpecs) {
            _this._addRaidGroupSummaryToAggregateCapacitySummary(aggregateCapacitySummary, aggregateId, raidGroup, versionNumber);
        }
        else {
            console.warn('Cannot compute capacity for raid group for aggrId ' + aggregateId + ', missing __deviceSpecs');
        }
    });

    return aggregateCapacitySummary;
};

AggregateReporter.prototype._addRaidGroupSummaryToAggregateCapacitySummary = function _addRaidGroupSummaryToAggregateCapacitySummary(aggregateCapacitySummary, aggregateId, raidGroup, versionNumber) {
    var _this = this,
        raidTypes = new RaidTypes(),
        raidType = _this._raidTypeFor(aggregateId, raidGroup),
        raidGroupDeviceCount = raidGroup._devices.length,
        ddpReserve = (this.hagi.isESeries) ? _this.aggregates[aggregateId]._ddpreserve : 0,
        driveRoles = this._handleDDPReserveDrivesIfNecessary(raidTypes.driveRolesForRaidType(raidType, raidGroupDeviceCount), raidType, ddpReserve),
        lcdSpec = this._lowestCommonDenominatorDriveSpecForRaidGroup(raidGroup),
        snapReserveProportion = (this.hagi.isESeries) ? 0 : _this.aggregates[aggregateId]._snapreserve_proportion,
        raidGroupYield = _this._getRaidGroupYield(aggregateId, lcdSpec, raidType, driveRoles, raidGroup.cache, versionNumber),
        usableCapacity = _this._getUsableCapacityFromDeviceSpec(raidGroupYield, snapReserveProportion),
        lcdSpecIsVirtual = !!lcdSpec.spec.slice;

    if (raidGroup.cache) {
        if (lcdSpecIsVirtual) {
            aggregateCapacitySummary.driveRoleSummary.virtual.cache += raidGroup._devices.length;
        } else {
            aggregateCapacitySummary.driveRoleSummary.physical.cache += raidGroup._devices.length;
        }
        aggregateCapacitySummary.driveRoleSummary.cacheData += driveRoles.data;
        aggregateCapacitySummary.cacheCapacity += usableCapacity;
    }
    else {
        aggregateCapacitySummary.driveRoleSummary.data += driveRoles.data;
        aggregateCapacitySummary.driveRoleSummary.parity += driveRoles.parity;
        aggregateCapacitySummary.driveRoleSummary.dparity += driveRoles.dparity;
        if (lcdSpecIsVirtual) {
            aggregateCapacitySummary.driveRoleSummary.virtual.data += driveRoles.data;
            aggregateCapacitySummary.driveRoleSummary.virtual.parity += driveRoles.parity;
            aggregateCapacitySummary.driveRoleSummary.virtual.dparity += driveRoles.dparity;
        } else {
            aggregateCapacitySummary.driveRoleSummary.physical.data += driveRoles.data;
            aggregateCapacitySummary.driveRoleSummary.physical.parity += driveRoles.parity;
            aggregateCapacitySummary.driveRoleSummary.physical.dparity += driveRoles.dparity;
        }
        aggregateCapacitySummary.snapReserveCapacity += snapReserveProportion * raidGroupYield;

        if (aggregateCapacitySummary.isRootAggregate) {
            aggregateCapacitySummary.rootCapacity += usableCapacity;
        }
        else {
            aggregateCapacitySummary.usableCapacity += usableCapacity;
        }

        if (!raidGroup.cache) {
            var lcdDriveType = lcdSpec.spec.type;

            if (_.has(aggregateCapacitySummary.usableCapacityByType, lcdDriveType)) {
                aggregateCapacitySummary.usableCapacityByType[lcdDriveType] += usableCapacity;
            }
            else {
                aggregateCapacitySummary.usableCapacityByType[lcdDriveType] = usableCapacity;
            }
        }
    }

    aggregateCapacitySummary.driveRoleSummary.reserve += driveRoles.reserve;
    aggregateCapacitySummary.driveRoleSummary.total += raidGroup._devices.length;

    if (lcdSpecIsVirtual) {
        aggregateCapacitySummary.driveRoleSummary.virtual.reserve += driveRoles.reserve;
        aggregateCapacitySummary.driveRoleSummary.virtual.total += raidGroup._devices.length;
    } else {
        aggregateCapacitySummary.driveRoleSummary.physical.reserve += driveRoles.reserve;
        aggregateCapacitySummary.driveRoleSummary.physical.total += raidGroup._devices.length;
    }
    aggregateCapacitySummary.totalCapacity += raidGroupYield;

    var doesDataSliceExist = this._isPartitionPresentInRaidGroup(raidGroup, 'P1'),
        doesRootSliceExist = this._isPartitionPresentInRaidGroup(raidGroup, 'P2'),
        partitionType = null;

    if (doesRootSliceExist || doesDataSliceExist) {
        partitionType = (doesRootSliceExist) ? 'root' : 'data';
    }

    _.forEach(raidGroup.__deviceSpecs, function(device) {
        var deviceIsVirtual = !!device.spec.slice;

        aggregateCapacitySummary.containsVirtualDevices = aggregateCapacitySummary.containsVirtualDevices || deviceIsVirtual;

        if (!_.has(aggregateCapacitySummary.driveSpecSummary, device.spec.rsgb)) {
            if (device.spec._for_storage_pool) {
                partitionType = 'cache';
            }

            aggregateCapacitySummary.driveSpecSummary[device.spec.rsgb] = {
                isVirtual: deviceIsVirtual,
                virtualPartitionType: partitionType,
                rawgb: device.spec.rawgb,
                rsgb: device.spec.rsgb,
                type: device.spec.type,
                rpm: device.spec.rpm,
                count: device.count
            };
        }
        else {
            aggregateCapacitySummary.driveSpecSummary[device.spec.rsgb].count += device.count;
        }
    });
};

AggregateReporter.prototype._findStoragesPoolWithAggregateId = function _findStoragesPoolWithAggregateId(aggregateId) {
    var allStoragePools = this.hagi.storagePools(),
        storagePoolOwnershipMap = _.map(allStoragePools, function(storagePool) {
            return {
                id: storagePool._id,
                aggrIds: _.without(_.map(storagePool._allocations, function(allocation) {
                    return allocation.aggr_id;
                }), undefined)
            };
        }),
        storagePoolWithAggrMap = _.where(storagePoolOwnershipMap, function(ownership) {
            return _.contains(ownership.aggrIds, aggregateId);
        });

    if (storagePoolWithAggrMap && storagePoolWithAggrMap.length > 0) {
        var ownership = _.first(storagePoolWithAggrMap);

        var result = _.where(allStoragePools, { _id: ownership.id });
        return result;
    } else {
        return [];
    }
};

AggregateReporter.prototype._handleDDPReserveDrivesIfNecessary = function _handleDDPReserveDrivesIfNecessary(driveRolesFromRaidType, raidType, ddpReserveCount) {
    var raidTypes = new RaidTypes();

    if (this.hagi.isESeries) {
        switch (raidType) {
            case raidTypes.DDP:
                var drivesInVolGroup = driveRolesFromRaidType.data,
                    newReserveDrives = ddpReserveCount === undefined ? raidTypes._getDdpReserveRecommendation(drivesInVolGroup) : ddpReserveCount;

                driveRolesFromRaidType.data -= newReserveDrives;
                driveRolesFromRaidType.reserve = newReserveDrives;
                break;
        }
    }

    return driveRolesFromRaidType;
};

AggregateReporter.prototype._isPartitionPresentInRaidGroup = function(raidGroup, partition) {
    return _.any(raidGroup._devices, function(deviceId) {
        return _.contains(deviceId, partition);
    });
};

AggregateReporter.prototype._lowestCommonDenominatorDriveSpecForRaidGroup = function(raidGroup) {
    /*
        Scenario:
            We have multiple types of drives in raid group, with different capacities. We need the smallest right-sized capacity
            as that is what will actually get used for capacity.
    */

    var sortedDeviceList = _.sortBy(raidGroup.__deviceSpecs, function(device) {
            if (!device.spec) {
                // no risk if console object missing, as we're about to
                // crash anyway
                console.error('bad __deviceSpecs in raid group', raidGroup);
            }
            return device.spec.rsgb;
        });

    return _.first(sortedDeviceList);
};

AggregateReporter.prototype._raidTypeFor = function _raidTypeFor(aggregateId, raidGroup) {
    var _this = this,
        aggregate = _this.aggregates[aggregateId];

    return raidGroup.cache ? aggregate.cache_raid_type : aggregate.raid_type;
};

AggregateReporter.prototype._getRawCapacityFromDeviceSpec = function _getRawCapacityFromDeviceSpec(deviceSpec, driveRoles) {
    var _this = this,
        rawCapacityPerDisk = new Unit(deviceSpec.spec.rawgb, 'GB'),
        rawCapacity = rawCapacityPerDisk.mult(driveRoles.data + driveRoles.parity + driveRoles.dparity);

    return rawCapacity.value_gb;
};

AggregateReporter.prototype._getRaidGroupYield = function _getRaidGroupYield(aggregateId, deviceSpec, raidType, driveRoles, isCache, versionNumber) {
    var _this = this,
        aggregate = _this.aggregates[aggregateId],
        perDiskYield = _this._determinePerDataDiskYield(deviceSpec, isCache),
        mirrorDivider = (aggregate.is_mirrored) ? 2 : 1,
        snapReserve = aggregate._snapreserve_proportion,
        raidGroupYield = (this.hagi.isESeries) ? this._getESeriesVolumeGroupYield(deviceSpec, raidType, driveRoles, versionNumber) :
                                                 perDiskYield.mult(driveRoles.data).to('GiB').value / mirrorDivider;

    return raidGroupYield;
};

AggregateReporter.prototype._getESeriesVolumeGroupYield = function _getESeriesVolumeGroupYield(deviceSpec, raidType, driveRoles, versionNumber) {
    var raidTypes = new RaidTypes();

    if (raidType !== raidTypes.DDP) {
        var perDiskYield = this._perDiskYieldESeries(deviceSpec, versionNumber);
        var totalYield = perDiskYield.mult(driveRoles.data).to('GiB').value;

        return raidTypes.isMirrored(raidType) ? totalYield / 2 : totalYield;
    }

    var diskCapacity = this._perDiskYieldESeries(deviceSpec, versionNumber),
        driveCount = driveRoles.data + driveRoles.reserve,
        reserveCount = driveRoles.reserve;

    var stripeWidth = 10,
        maxStripes = 500000,
        pieceSizeBlocks = 1048576,
        userBlockPerStripe = new Unit(8388608, 'KiB'),
        diskCapBlocks = Math.floor(diskCapacity.value * 1024 * 1024 * 1024 / 512),
        diskCapMinusReserve = diskCapBlocks - (pieceSizeBlocks * 5),
        diskCapExtents = diskCapMinusReserve / pieceSizeBlocks;

    var driveCountErrorCode = this._getESeriesDriveCountErrorCode(driveCount),
        driveCapacityErrorCode = this._getESeriesDDPDiskErrorCode(diskCapExtents),
        percentError = this._getESeriesPercentError(driveCountErrorCode, driveCapacityErrorCode);

    var totalStripesNoError = Math.min((driveCount * diskCapExtents) / stripeWidth, maxStripes);

    var totalStripesWithErrorDecimal = Math.min((driveCount * diskCapExtents / stripeWidth) * ((100 - percentError) / 100), maxStripes),
        totalStripesWithError = Math.floor(totalStripesWithErrorDecimal);

    var reservedSpaceStripes = Math.floor(reserveCount * totalStripesWithError / driveCount),
        userSpaceStripes = totalStripesWithError - reservedSpaceStripes,
        userSpaceBlocks = userBlockPerStripe.mult(userSpaceStripes); // KiB, Unit object

    var spaceAvailableInGiBUnit = new Unit(Math.round((((userSpaceBlocks.value / 2) / 1024) / 1024)), 'GiB');

    return spaceAvailableInGiBUnit.value;
};

AggregateReporter.prototype._getESeriesPercentError = function _getESeriesPercentError(driveCountErrorCode, driveCapacityErrorCode) {
    var eSeriesErrorCalcCode = util.format('%s-%s', driveCountErrorCode, driveCapacityErrorCode);

    switch (eSeriesErrorCalcCode) {
        case '11-268':
        case '11-553':
            return 4.0;
        case '11-833':
        case '11-926':
        case '11-1112':
            return 3.5;
        case '11-1671':
        case '11-1858':
        case '11-3721':
        case '11-5584':
        case '37-268':
            return 2.0;
        case '37-553':
            return 2.0;
        case '11-7447':
        case '37-833':
        case '37-926':
        case '37-1112':
            return 1.5;
        case '37-1671':
        case '37-1858':
        case '37-3721':
        case '37-5584':
            return 1.0;
        case '37-7447':
            return 0.5;
    }

    return 0;
};

AggregateReporter.prototype._getESeriesDriveCountErrorCode = function _getESeriesDriveCountErrorCode(driveCount) {
    if (driveCount > 10 && driveCount < 36) {
        return 11;
    } else if (driveCount > 36 && driveCount < 64) {
        return 37;
    } else if (driveCount > 63 && driveCount < 66) {
        return 65;
    }

    return 0;
};

AggregateReporter.prototype._getESeriesDDPDiskErrorCode = function _getESeriesDDPDiskErrorCode(diskCapExtents) {
    if (diskCapExtents > 267 && diskCapExtents < 553) {
        return 268;
    } else if (diskCapExtents > 552 && diskCapExtents < 833) {
        return 553;
    } else if (diskCapExtents > 882 && diskCapExtents < 927) {
        return 883;
    } else if (diskCapExtents > 925 && diskCapExtents < 1111) {
        return 926;
    } else if (diskCapExtents > 926 && diskCapExtents < 1672) {
        return 1671;
    } else if (diskCapExtents > 1671 && diskCapExtents < 1859) {
        return 1858;
    } else if (diskCapExtents > 1858 && diskCapExtents < 3722) {
        return 3721;
    } else if (diskCapExtents > 3721 && diskCapExtents < 5585) {
        return 5584;
    } else if (diskCapExtents > 5584 && diskCapExtents < 7448) {
        return 7447;
    }

    return 0;
};

AggregateReporter.prototype._getUsableCapacityFromDeviceSpec = function _getUsableCapacityFromDeviceSpec(raidGroupYield, snapReserve) {
    var usableCapacity = raidGroupYield * (1 - snapReserve);

    return usableCapacity;
};

AggregateReporter.prototype._determinePerDataDiskYield = function _determinePerDataDiskYield(deviceSpec, isCache) {
    if (!this.hagi.isESeries) {
        return this._perDiskYieldFAS(deviceSpec, isCache);
    }
};

AggregateReporter.prototype._perDiskYieldFAS = function _perDiskYieldFAS(deviceSpec, isCache) {
    var waflModifier = (isCache) ? 1 : 0.9, // Account for no WAFL on cache
        fixedOverhead = new Unit(20.5, 'MiB'),
        diskCapacity = new Unit(deviceSpec.rsgb || deviceSpec.spec.rsgb, 'GB');

    return new Unit(diskCapacity.subtract(fixedOverhead).value_gb * waflModifier);
};

// Account for different E-Series raid types
AggregateReporter.prototype._perDiskYieldESeries = function _perDiskYieldESeries(deviceSpec, versionNumber) {
    var num = versionNumber ? versionNumber : this.hagi.versionNumber;

    return this._capacityAfterDACOverheadsESeries(deviceSpec, num);
};

AggregateReporter.prototype._capacityAfterDACOverheadsESeries = function _capacityAfterDACOverheadsESeries(deviceSpec, versionNumber) {
    var isSantricity82 = versionNumber.indexOf('8.2') === 0,
        fixedOverhead = (isSantricity82) ? new Unit(5, 'GiB') : new Unit(0.5, 'GiB'),
        diskCapacity = new Unit(deviceSpec.spec.rsgb, 'GB');

    return diskCapacity.subtract(fixedOverhead).to('GiB');
};

AggregateReporter.prototype._nullToZero = function(val) {
    if (val === undefined || val === null) {
        return 0.0;
    }
    else {
        return val;
    }
};

module.exports = AggregateReporter;
