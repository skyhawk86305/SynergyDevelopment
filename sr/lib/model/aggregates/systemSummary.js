'use strict';

var _ = require('lodash'),
    assert = require('assert'),
    AggregateReporter = require('./aggregateReporter.js');

function SystemSummary(map, hagroups) {
    assert(hagroups instanceof Array, '87f630a2');
    assert(_.has(map, 'inspect'), 'e6f2781c');
    this._selectedHaGroups = hagroups;
    this.inspect = map.inspect;
}

SystemSummary.prototype.createSystemSummary = function() {
    var _this = this,
        summary = {
            total: 0,
            rawCapacity: 0.0,
            usableCapacity: 0.0,
            spareCount: 0,
            driveRoleSummary: {
                physical: {
                    total: 0,
                    data: 0,
                    parity: 0,
                    dparity: 0,
                    cache: 0,
                    root: 0,
                    spare: 0
                },
                virtual: {
                    total: 0,
                    data: 0,
                    parity: 0,
                    dparity: 0,
                    cache: 0,
                    root: 0,
                    spare: 0
                }
            },
            performanceSummary: {
                total: 0,
                rawCapacity: 0.0,
                usableCapacity: 0.0,
                driveCapacitySummaryByType: []
            },
            capacitySummary: {
                total: 0,
                rawCapacity: 0.0,
                usableCapacity: 0.0,
                driveCapacitySummaryByType: []
            },
            ssdSummary: {
                total: 0,
                rawCapacity: 0.0,
                usableCapacity: 0.0,
                driveCapacitySummaryByType: []
            }
        };

    _.forEach(_this._selectedHaGroups, function(hagroup) {
        var hagi = _this.inspect(hagroup),
            physicalDevices = hagi.allPhysicalDevices(),
            physicalSpares = hagi.deviceInfo.where.spare.and.physical,
            virtualSpares = hagi.deviceInfo.where.spare.and.virtual;

        _this._populateSystemSummaryWithPhysicalDevices(hagi, summary, physicalDevices);
        summary.driveRoleSummary.physical.spare += physicalSpares.length;
        summary.driveRoleSummary.physical.total += physicalSpares.length;
        summary.driveRoleSummary.virtual.spare += virtualSpares.length;
        summary.driveRoleSummary.virtual.total += virtualSpares.length;

        _.forEach(hagroup.controllers, function(controller) {
            _.forEach(controller.aggregates, function(aggregate) {
                _this._updateSystemSummaryUsingGivenAggregate(hagi, summary, aggregate);
            });
        });
    });

    return summary;
};

SystemSummary.prototype._populateSystemSummaryWithPhysicalDevices = function(hagi, summary, physicalDevices) {
    var _this = this;

    _.forEach(physicalDevices, function(device) {
        var howManyOfTheseDevices = device.devices.length,
            totalRawCapacityForDevice = howManyOfTheseDevices * device.spec.rawgb;

        // Update Master Totals
        summary.total += howManyOfTheseDevices;
        summary.rawCapacity += totalRawCapacityForDevice;

        // Update Device Class Totals
        var physicalDeviceType = device.spec.type,
            isDeviceSSD = (physicalDeviceType === 'SSD'),
            isDevicePerformance = hagi.lookup.isDeviceTypePerformance(physicalDeviceType);

        if (isDeviceSSD) {
            _this._updateDeviceClassRawSummary(summary.ssdSummary, device.spec, howManyOfTheseDevices, totalRawCapacityForDevice);
        }
        else if (isDevicePerformance) {
            _this._updateDeviceClassRawSummary(summary.performanceSummary, device.spec, howManyOfTheseDevices, totalRawCapacityForDevice);
        }
        else {
            _this._updateDeviceClassRawSummary(summary.capacitySummary, device.spec, howManyOfTheseDevices, totalRawCapacityForDevice);
        }
    });
};

SystemSummary.prototype._updateDeviceClassRawSummary = function(deviceClassSummary, deviceSpec, deviceCount, deviceTotalRawCapacityContribution) {
    deviceClassSummary.total += deviceCount;
    deviceClassSummary.rawCapacity += deviceTotalRawCapacityContribution;

    // rawgb, count, type
    var existingDeviceSummary = _.where(deviceClassSummary.driveCapacitySummaryByType, function(summaryByType) {
        return summaryByType.rawgb === deviceSpec.rawgb && summaryByType.type === deviceSpec.type;
    });

    if (existingDeviceSummary.length > 0) {
        var existingIndex = _.indexOf(deviceClassSummary.driveCapacitySummaryByType, _.first(existingDeviceSummary));

        deviceClassSummary.driveCapacitySummaryByType[existingIndex].count += deviceCount;
    }
    else {
        // New
        deviceClassSummary.driveCapacitySummaryByType.push({
            rawgb: deviceSpec.rawgb,
            count: deviceCount,
            type: deviceSpec.type
        });
    }
};


SystemSummary.prototype._updateSystemSummaryUsingGivenAggregate = function(hagi, summary, aggregate) {
    var aggregateReporter = new AggregateReporter(hagi),
        aggregateReport = aggregateReporter.createAggregateReport(aggregate),
        aggregateSummary = aggregateReport.summary,
        _this = this;

    // NOTE: We are only update _usable_ capacities
    if (!aggregateSummary.isRootAggregate) {
        // Update Master Total
        summary.usableCapacity += aggregateSummary.usableCapacity;

        _.forEach(_.keys(aggregateSummary.driveRoleSummary.physical), function(driveRole) {
            summary.driveRoleSummary.physical[driveRole] += _this._nullToZero(aggregateSummary.driveRoleSummary.physical[driveRole]);
        });
        _.forEach(_.keys(aggregateSummary.driveRoleSummary.virtual), function(driveRole) {
            summary.driveRoleSummary.virtual[driveRole] += _this._nullToZero(aggregateSummary.driveRoleSummary.virtual[driveRole]);
        });

        _.forEach(_.keys(aggregateSummary.usableCapacityByType), function(aggrDeviceType) {
            // Update Device Class Totals
            var isDeviceSSD = (aggrDeviceType === 'SSD'),
                isDevicePerformance = hagi.lookup.isDeviceTypePerformance(aggrDeviceType),
                usableCapacityForType = aggregateSummary.usableCapacityByType[aggrDeviceType];

            if (isDeviceSSD) {
                summary.ssdSummary.usableCapacity += usableCapacityForType;
            }
            else if (isDevicePerformance) {
                summary.performanceSummary.usableCapacity += usableCapacityForType;
            }
            else {
                summary.capacitySummary.usableCapacity += usableCapacityForType;
            }
        });
    } else {
        summary.driveRoleSummary.physical.root += _this._nullToZero(aggregateSummary.driveRoleSummary.physical.total);
        summary.driveRoleSummary.physical.total += _this._nullToZero(aggregateSummary.driveRoleSummary.physical.total);
        summary.driveRoleSummary.virtual.root += _this._nullToZero(aggregateSummary.driveRoleSummary.virtual.total);
        summary.driveRoleSummary.virtual.total += _this._nullToZero(aggregateSummary.driveRoleSummary.virtual.total);
    }
};

SystemSummary.prototype._nullToZero = function(val) {
    if (val === undefined || val === null) {
        return 0.0;
    }
    else {
        return val;
    }
};

module.exports = SystemSummary;
