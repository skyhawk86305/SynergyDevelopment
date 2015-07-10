'use strict';

var _ = require('lodash'),
    assert = require('assert'),
    Unit = require('../../units.js');

function ControllerInspector(init) {
    init(this); // this.inspect, this.info, this.cluster, this.hagroup, ...
}

// TODO: competition: who can write this the cleanest, most maintainable way?

ControllerInspector.prototype.devicesConsumedByAggregates = function DCBA(excludeAutoNonRoot) {
    var aggrDevices = _(this.controller.aggregates || [])
            .filter(excludeAutoNonRoot ? manualAndAutoRootAggregatesOnly : null)
            .map('_raid_groups').flatten()
            .map(safeGetDevices).flatten()
            .value();
            /*, I do not think we need this anymore
         poolDevices = _(this.controller.storage_pools || [])
            .filter(excludeAutoNonRoot ? manualStoragePoolsOnly : null)
            .map(safeGetDevices).flatten()
            .value(); */

    return aggrDevices; // .concat(poolDevices);
};

function safeGetDevices(deviceHolder) {
    if (deviceHolder === undefined) {
        return []; // likely: aggr lacked _raid_groups
    } else {
        return deviceHolder._devices || [];
    }
}

function manualAndAutoRootAggregatesOnly(aggr) {
    return aggr._manual || aggr.is_root_aggregate;
}
/*
function manualStoragePoolsOnly(pool) {
    return pool._manual;
} */

ControllerInspector.prototype.storagePoolDevices = function storagePoolDevices() {
    /*
        Look in the controller.storage_pools and figure out what slices devices we have.

        Result:
        [
          {
            "storagePoolId": <string>, // Which storage pool it is a part of
            "sliceName": <string>, // Slice name ex. P1, P2, P3, P4
            "rsGBPerDevice": <int>, // Right-sized capacity for slice, based on WAFL blocks (when virtual)
            "isPhysical": <bool>, // Is this a physical component to storage pool
            "spec": <object>, // Physical Device spec for device
            "devices": [<string>] // Array of deviceIds with partition that are a part of this allocation unit
          }
        ]
    */

    var devices = [],
        _this = this;

    if (this.controller.storage_pools) {
        assert(_.isArray(this.controller.storage_pools), 'Controller storage pools must be an array');

        _.forEach(this.controller.storage_pools, function(storagePool) {
            var storagePoolPhysicalSpec = (storagePool.__deviceSpecs) ? _.first(storagePool.__deviceSpecs).spec : undefined;

            devices.push({
                devices: storagePool._devices,
                spec: storagePoolPhysicalSpec,
                storagePoolId: storagePool._id,
                isPhysical: true
            });

            _.forEach(storagePool._allocations, function(allocation) {
                var storagePoolVirtualSpec = (allocation.__deviceSpecs) ? _.first(allocation.__deviceSpecs).spec : undefined,
                    rsgbPerDevice = _this._waflBlocksToGb(allocation.used_blocks);

                devices.push({
                    devices: allocation.devices,
                    spec: storagePoolVirtualSpec,
                    storagePoolId: storagePool._id,
                    isPhysical: false,
                    sliceName: allocation.slice,
                    rsGBPerDevice: rsgbPerDevice
                });
            });
        });
    }

    return devices;
};

ControllerInspector.prototype.assignedStorageSlices = function() {
    /*
        Concept:

        1) Look in _assigned_storage and capture the available slices

        Result:
        [
          {
            "owningControllerId": <string>, // Controller Id
            "sliceName": <string>, // Slice name ex. P1, P2
            "waflBlocks": <int>, // How many 4kb wafl blocks for entire partition
            "totalSizeGb": <decimal>, // Size in GB for entire partition
            "rsgbPerDevice": <decimal>, // Size in GB for each device (useful for aggregate builder, capacity summary, etc)
            "devices": [<string>] // Array of deviceIds with partition that are a part of this slice
          }
        ]
    */

    var controllerStorage = [],
        _this = this;

    if (this.controller._assigned_storage) {
        _.forEach(this.controller._assigned_storage, function(assignedStorage) {
            if (!assignedStorage.slice_details.devices) {
                return; // Nothing here
            }

            var sliceDetails = assignedStorage.slice_details,
                assignedStorageSizeGb = _this._waflBlocksToGb(sliceDetails.used_blocks);

            controllerStorage.push({
                owningControllerId: _this.controller._id,
                sliceName: sliceDetails.slice,
                waflBlocksPerDevice: sliceDetails.used_blocks,
                rsGBPerDevice: assignedStorageSizeGb,
                devices: sliceDetails.devices
            });
        });
    }

    return controllerStorage;
};

ControllerInspector.prototype._waflBlocksToGb = function(waflBlocks) {
    // Per build/adp Wafl block is 4KiB (4096 bytes)
    var waflCapacityUnit = new Unit(4, 'KiB').mult(waflBlocks);

    return waflCapacityUnit.value_gb;
};

module.exports = ControllerInspector;
