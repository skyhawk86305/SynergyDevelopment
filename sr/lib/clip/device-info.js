'use strict';

var assert = require('assert'),
    _ = require('lodash'),
    Unit = require('../units.js'),
    addQueryAPI = require('../add-query-api');

var SLICE_EXTRACT = /^(.*)(P[0-9]+)$/;

var sliceUsedBlocksToRSGB = _.memoize(function sliceUsedBlocksToRSGB(usedBlocks) {
    assert.equal(typeof usedBlocks, 'number', '9c277e6d.t ' + typeof usedBlocks);
    assert(usedBlocks > 0, '9c277e6d.v ' + usedBlocks);
    return new Unit(4, 'KiB').mult(usedBlocks).value_gb;
});

function deviceInfoFromHagroup(hagroup) {
    assert.equal(hagroup._type, 'hagroup', 'c2b35515');

    var infoByDeviceId = {};

    var results = _.flatten([
        deviceInfosFromShelves(),
        deviceInfosFromRootDataSlices(),
        deviceInfosFromStoragePoolSlices()
    ]);

    _.forEach(hagroup.controllers || [], recordConsumptionByControllerAggregates);

    return addQueryAPI(results, DEVICE_FILTERS);

    function recordConsumptionByControllerAggregates(controller) {
        _.forEach(controller.aggregates || [], recordConsumptionByAggregate);

        function recordConsumptionByAggregate(aggregate) {
            var aggrInfo = {
                    _id: aggregate._id,
                    _manual: aggregate._manual,
                    _type: aggregate._type,
                    _root: aggregate.is_root_aggregate,
                    controller: controller._id,
                    name: aggregate.name,
                },
                raidGroups = aggregate._raid_groups || [];

            _.forEach(raidGroups, _.partial(recordConsumptionByRaidGroupLikeObject, aggrInfo));
            _.forEach(raidGroups, recordConsumptionByRaidGroupLikeObject);
        }
    }

    function recordConsumptionByRaidGroupLikeObject(info, rg) {
        // if we're fed info (probably via _.partial), we use that;
        // otherwise we extract info from the raid group
        if (arguments.length === 1) {
            rg = info;
            info = _.pick(rg, '_id', '_type', 'cache', '_manual');
        }

        // now the work:
        _.forEach(rg._devices, function (id) {
            recordConsumption(id, info);
        });
    }

    function recordConsumption(id, consumer) {
        assert.equal(typeof id, 'string', '55da1eb8.1');
        assert.equal(typeof consumer, 'object', '55da1eb8.2');

        var info = infoByDeviceId[id];
        if (!info) {
            return;
        }

        consumer = _.defaults({}, consumer, { direct: true });
        info.consumers.push(consumer);

        if (info.parentId) {
            consumer = _.merge({}, consumer, { direct: false });
            recordConsumption(info.parentId, _.merge({}, consumer, {
                direct: false,
            }));
        }
    }

    function deviceInfosFromShelves() {
        return _(hagroup.shelves)
            .map(deviceInfosFromShelf)
            .flatten()
            .value();
    }

    function deviceInfosFromShelf(shelf) {
        var _x_bom = shelf._x_bom,
            shelfResults = [];

        for (var idx in _x_bom.drive_specs) {

            var spec = _x_bom.drive_specs[idx],
                members = _x_bom.drive_spec_members[idx];
            for (var midx in members) {

                var id = members[midx],
                    info = {
                        id: id,
                        spec: spec, // still includes "quantity"; sorry
                                    // ... but they're singletons, so
                                    // quite memory efficient
                        virtual: false,
                        shelf: shelf._id,
                        hagroup: hagroup._id,
                        consumers: []
                    };

                infoByDeviceId[id] = info;
                shelfResults.push(info);
            }
        }

        return shelfResults;
    }

    function deviceInfosFromRootDataSlices() {
        return _(hagroup.controllers)
            .map(deviceInfosFromRootDataSliceAssignedTo)
            .flatten()
            .value();
    }

    function deviceInfosFromRootDataSliceAssignedTo(controller) {
        return _(controller._assigned_storage || [])
            .map('slice_details')
            .map(deviceInfosFromRootDataSlice)
            .flatten()
            .value();

        function deviceInfosFromRootDataSlice(sliceDetails) {
            return _.map(sliceDetails.devices, deviceInfoFromRootDataSliceMember);

            function deviceInfoFromRootDataSliceMember(id) {
                var slice = sliceDetails.slice,
                    parentId = unslice(id),
                    info = mkInfoForSlice(id, parentId, slice, 'root', sliceDetails.used_blocks, controller._id);

                recordConsumption(parentId, {
                    _type: 'slice',
                    _id: id,
                    slice: slice,
                    sliceType: slice === 'P2' ? 'root' : 'data'
                });

                return info;
            }
        }
    }

    function deviceInfosFromStoragePoolSlices() {
        return _(hagroup.controllers)
            .map(deviceInfosFromStoragePoolSlicesOn)
            .flatten()
            .value();
    }

    function deviceInfosFromStoragePoolSlicesOn(controller) {
        return _(controller.storage_pools || [])
            .map(deviceInfosFromStoragePool)
            .flatten()
            .value();

        function deviceInfosFromStoragePool(pool) {

            recordConsumptionByRaidGroupLikeObject(pool);
            return _(pool._allocations)
                .map(deviceInfosFromAllocation)
                .flatten()
                .value();

            function deviceInfosFromAllocation(allocation) {
                return allocation.devices.map(deviceInfoFromDeviceInAllocation);

                function deviceInfoFromDeviceInAllocation(id) {

                    var slice = allocation.slice,
                        parentId = unslice(id),
                        info = mkInfoForSlice(id, parentId, slice, 'fpsp', allocation.used_blocks);

                    recordConsumption(parentId, {
                        _type: 'slice',
                        _id: id,
                        slice: slice,
                        sliceType: 'fp',
                    });

                    return info;
                }
            }
        }
    }

    function mkInfoForSlice(id, parentId, slice, why, used_blocks, controllerId) {
        assert.equal(typeof id, 'string', '85724289.1');
        assert.equal(typeof parentId, 'string', '85724289.2');
        assert.equal(typeof slice, 'string', '85724289.3');
        assert.equal(typeof why, 'string', '85724289.4');
        assert.equal(typeof used_blocks, 'number', '85724289.5');
        if (controllerId) {
            assert.equal(typeof controllerId, 'string', '85724289.6');
        }

        var parentInfo = infoByDeviceId[parentId],
            partialSpec = _.omit(parentInfo.spec, 'quantity', 'rsgb', 'slice', '_from_parent'),
            spec = _.merge({}, partialSpec, {
                rsgb: sliceUsedBlocksToRSGB(used_blocks),
                slice: slice,
                _from_parent: _.keys(partialSpec),
            }),
            info = {
                id: id,
                spec: spec,
                virtual: true,
                slice: slice,
                why: why,
                parentId: parentId,
                shelf: parentInfo.shelf._id,
                hagroup: hagroup._id,
                consumers: []
            };

        if (controllerId && slice === 'P2') {
            // record slice "ownership" information
            // P2 only because we might split data any number of ways
            spec._for_controller = controllerId;
        }

        infoByDeviceId[id] = info;

        return info;
    }
}

function unslice(deviceId) {
    var match = deviceId.match(SLICE_EXTRACT);
    if (match) {
        return match[1];
    } else {
        return deviceId;
    }
}

var DEVICE_FILTERS = {
        physical: physical,
        virtual: virtual,
        spare: spare,
        used: used,
        unused: unused,
        locked: locked,
        notroot: notroot,
        unlocked: unlocked,
        storagepool: storagepool
    };

function physical(info) {
    return !info.virtual;
}

function virtual(info) {
    return !!info.virtual;
}

function spare(info) {
    return info.consumers.length === 0;
}

function unused(info) {
    return spare(info);
}

function used(info) {
    return info.consumers.length > 0;
}

function notroot(info) {
    return !_.any(info.consumers, { _root: true });
}

function unlocked(info) {
    return !_.any(info.consumers, { _manual: true });
}

function locked(info) {
    return _.any(info.consumers, { _manual: true });
}

function storagepool(info) {
    return !!info.virtual && info.why === 'fpsp';
}

module.exports = {
    from: {
        hagroup: deviceInfoFromHagroup
    },
    filters: DEVICE_FILTERS
};
