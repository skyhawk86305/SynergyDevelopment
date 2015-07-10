'use strict';

var assert = require('assert'),
    _ = require('lodash');

var MAX_ROOT_SLICE_DEVICES = 48;

function Builder() {
    assert(false, 'mixin; do not use in isolation');
}

Builder.prototype._applyADPAndAddAggregates = function _applyADPAndAddAggregates(hagroup) {
    var map = this._makeNewMap(),
        hagi = map.inspect(hagroup);

    stripAutomaticStoragePools(hagi);
    stripAutomaticAggregates(hagi);
    stripAssignedStorage(hagi);
    makeAssignmentsForADP(hagi);

    // Rehydrate the map here, TODO: Extract this call in develop to account for turning off ADP/Aggregates which is broken right now
    map.rehydrate();

    // repair manual aggregates
    // build automatic aggregates, (includes making assignments)
    
    this._buildAggregates(hagroup);
    // this.assignFlashPoolWhereAvailable(hagroup);
};

function stripAutomaticAggregates(hagi) {
    _.forEach(hagi.hagroup.controllers, function (controller) {
        controller.aggregates = _.where(controller.aggregates, {
            _manual: true
        });
    });
}

function stripAutomaticStoragePools(hagi) {
    _.forEach(hagi.hagroup.controllers, function (controller) {
        controller.storage_pools = _.where(controller.storage_pools, {
            _manual: true
        });
    });
}

var BLOCKS_PER_MiB = 1024 / 4,                   // 4kB per block
    BLOCKS_PER_GiB = 1024 * BLOCKS_PER_MiB,
    GB_PER_GiB = 1.073741824,
    BLOCKS_PER_GB = BLOCKS_PER_GiB / GB_PER_GiB, // because rsgb is in GB
    DRIVE_LABEL_BLOCKS = 20.5 * BLOCKS_PER_MiB,
    SLICE_PAD_BLOCKS = 8 * BLOCKS_PER_MiB;

function makeAssignmentsForADP(hagi) {
    var policies = hagi.hagroup._policies || {},
        adp = policies.ADP || {};

    if(adp.prohibitedByUser) {
        return;
    }

    var adpSpec = getADPDriveSpec(hagi);

    if (!adpSpec) {
        return;
    }

    var limits = hagi.limits,
        devices = _(adpSpec.shelves)
            .map('_x_bom')
            .map('drive_spec_members')
            .flatten()
            .first(MAX_ROOT_SLICE_DEVICES)
            .value();

    if (!adpDevicesWithinSpec(devices)) {
        return;
    }

    var driveCount = devices.length,
        blocksPerDrive = adpSpec.driveSpec.rsgb * BLOCKS_PER_GB,
        rootSliceBlocksTotal = limits.aggr.root_aggr_size_mib * BLOCKS_PER_MiB,
        rootSliceCounts = getRootSliceCounts(driveCount),
        dataCount = rootSliceCounts.data,
        unalignedRootSliceBlocks = Math.floor(rootSliceBlocksTotal / dataCount) + DRIVE_LABEL_BLOCKS + SLICE_PAD_BLOCKS,
        rootSliceBlocks = alignBlockCount(unalignedRootSliceBlocks) - SLICE_PAD_BLOCKS,
        // DRIVE_LABEL_BLOCKS - 2*SLICE_PAD_BLOCKS => 36.5GiB constant from Skip sheet K column
        dataSliceBlocks = alignBlockCount(blocksPerDrive - rootSliceBlocks - DRIVE_LABEL_BLOCKS - 2*SLICE_PAD_BLOCKS),
        rootDevices = _.map(devices, _.partial(makeSliceId, 2)), // Root partition 2
        dataDevices = _.map(devices, _.partial(makeSliceId, 1)); // Data partition 1

    // TODO: match ONTAP's odd/even strategy

    _.forEach(hagi.hagroup.controllers, function assignRootSlices(controller) {
        assign(controller, 'P2', rootSliceBlocks, rootDevices, rootSliceCounts.total);
    });

    if (driveCount === 12) {
        // active-passive
        assign(hagi.hagroup.controllers[0], 'P1', dataSliceBlocks, dataDevices, null);
    } else {
        // active-active
        _.forEach(hagi.hagroup.controllers, function assignDataSlices(controller) {
            assign(controller, 'P1', dataSliceBlocks, dataDevices, rootSliceCounts.total);
        });
    }

    // fill controller._assigned_storage accordingly
    // aggregate building will perform additional storage assignment

    function makeSliceId(sliceNumber, deviceId) {
        return deviceId + 'P' + sliceNumber;
    }
}

function assign(controller, slice, sliceBlocks, devices, count) {
    if (!count) {
        count = devices.length;
    }

    controller._assigned_storage.push({
        slice_details: {
            slice: slice,
            used_blocks: sliceBlocks,
            devices: devices.splice(0, count)
        }
    });
}

function alignBlockCount(blockCount) {
    return blockCount - (blockCount % 64);
}

function adpDevicesWithinSpec(devices) {
    var validDeviceCounts = [12, 24, 48];

    return devices && _.contains(validDeviceCounts, devices.length);
}

function getRootSliceCounts(ofDrives) {
    switch (ofDrives) {
        case 12: return { data: 3, parity: 2, spare: 1, total: 6 };
        case 24: return { data: 8, parity: 2, spare: 2, total: 12 };
        case 48: return { data: 20, parity: 2, spare: 2, total: 24 };
        default: assert(false, ofDrives + ' drives not supported');
    }
}

function getADPDriveSpec(hagi) {
    var allShelves = hagi.hagroup.shelves,
        firstShelf = allShelves[0],
        allShelvesAreSSDOnly = _.every(allShelves, isSSDOnly),
        matchesFirstShelf = _.partial(specsMatch, firstShelf),
        allShelvesMatch = _.every(allShelves, matchesFirstShelf),
        isSuspectedAllFlashFAS = allShelvesAreSSDOnly && allShelvesMatch,
        singleSpecEmbedded = _.filter(allShelves, isSingleSpecEmbedded),
        embeddedSpecIsSSD = isEmbeddedSSDOnly(singleSpecEmbedded);

    var candidateShelves = isSuspectedAllFlashFAS ? allShelves : singleSpecEmbedded;

    if (!candidateShelves.length) {
        return null;
    }

    var exampleShelf = candidateShelves[0],
        exampleDrive = exampleShelf._x_bom.drive_specs[0];

    var matrix = hagi.config.matrix,
        compatInfo = matrix.checkVersionShelfDrive(hagi.hagroup.version,
                                                   exampleShelf.model,
                                                   exampleDrive.model);
        
    if (!compatInfo.root_slicing) {
        return null;
    }

    if (!isSuspectedAllFlashFAS && embeddedSpecIsSSD) {
        // Per Changjie, we do not allow non-AFF systems with embedded SSD to be slices
        return null;
    }

    return {
        driveSpec: _.omit(exampleDrive, 'quantity'),
        shelves: candidateShelves,
    };
}

function isEmbeddedSSDOnly(shelf) {
    if (!shelf || shelf.length === 0) {
        return false;
    }

    var embeddedShelf = _.first(shelf);

    if (!embeddedShelf._isembedded) {
        return false;
    }

    return isSSDOnly(embeddedShelf);
}

function isSingleSpecEmbedded(shelf) {
    return isSingleSpec(shelf) && shelf._isembedded;
}

function isSSDOnly(shelf) {
    return shelf &&
           isSingleSpec(shelf) &&
           shelf._x_bom.drive_specs[0].type === 'SSD';
}

function isSingleSpec(shelf) {
    return shelf._x_bom.drive_specs.length === 1;
}

function specsMatch(shelf1, shelf2) {
    // TODO: simplistic; must match model as well as spec
    // WARN: fixing above will require logic changes in getADPDriveSpec
    return shelf1 &&
           shelf2 &&
           _.isEqual(shelf1._x_bom.drive_specs, shelf2._x_bom.drive_specs);
}

function stripAssignedStorage(hagi) {
     _.forEach(hagi.hagroup.controllers, function (controller) {
        controller._assigned_storage = [];
    });
}

module.exports = Builder;
