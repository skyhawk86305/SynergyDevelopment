'use strict';

var assert = require('assert'),
    _ = require('lodash'),
    util = require('util'),
    uuid = require('uuid'),
    Unit = require('../../units');

var MAX_SLICE_WIDTH_DEVICES = 28,
    MIN_SLICE_WIDTH_DEVICES = 2,
    SLICES_PER_DRIVE = 4,
    STORAGE_POOL = 'storage_pool',
    SLICE_EXTRACT = /^(.*)(P[0-9]+)$/;

function Builder() {
    assert(false, 'mixin; do not use in isolation');
}

Builder.prototype.addStoragePool = function addStoragePool(controllerId, deviceSpec, raidType, deviceCount, isManual) {
    assert(deviceCount <= MAX_SLICE_WIDTH_DEVICES, 'Cannot create storage pool with this many devices');
    assert(deviceCount >= MIN_SLICE_WIDTH_DEVICES, 'Cannot create storage pool with this few devices');
    assert(deviceSpec.type === 'SSD', 'You cannot create a storage pool with non-ssd devices');

    var hagroup = this._findSystemByControllerId(controllerId),
        controller = this._findController(hagroup, controllerId),
        newStoragePool = this._buildStoragePool(hagroup, controller, deviceSpec, raidType, deviceCount, isManual);

    if (!controller.storage_pools) {
        controller.storage_pools = [];
    }

    controller.storage_pools.push(newStoragePool);

    // Auto doesn't need to do this
    if (isManual) {
        this.rebuildAutoAggregates(hagroup._id, { except: spinningDriveAggregates });
    }

    return newStoragePool._id;
};

Builder.prototype.claimAllocationUnit = function claimAllocationUnit(aggrID, raidType, poolID, slice) {
    var map = this._makeNewMap(),
        pool = map.find.storage_pool(poolID),
        au = _.first(_.where(pool._allocations, { slice: slice })),
        spec = au.__deviceSpecs[0].spec,
        devices = au.devices;
    var raidID = this.addFlashPoolRaidGroupToAggregate(aggrID, raidType, spec, devices.length);
    au.aggr_id = aggrID;
    return raidID;
};

Builder.prototype.releaseAllocationUnit = function releaseAllocationUnit(aggrID, poolID, slice) {
    var map = this._makeNewMap(),
        pool = map.find.storage_pool(poolID),
        aggr = map.find.aggregate(aggrID),
        au = _.first(_.where(pool._allocations, {
            slice: slice,
            aggr_id: aggrID
        }));

    assert.notEqual(au, undefined, '94afc5d3'); // allocation not found or not owned

    var rg =_.first(_.filter(aggr._raid_groups, function containsAUMembers(rg) {
            // note inconsistency between _allocations[n].devices
            //                        and _raid_groups[n]._devices
            return _.intersection(rg._devices, au.devices).length > 0;
        }));

    this.deleteFlashPoolRaidGroupFromAggregate(rg._id);
    delete au.aggr_id;
};

Builder.prototype.deleteStoragePool = function deleteStoragePool(storagePoolId) {
    var map = this._makeNewMap(),
        i = map.inspect.storage_pool(storagePoolId),
        pool = i.storage_pool,
        controller = i.controller,
        hagroup = i.hagroup,
        _this = this;

    _.forEach(pool._allocations, function pleaseReleaseMeLetMeGo(allocation) {
        if (allocation.aggr_id) {
            _this.releaseAllocationUnit(allocation.aggr_id, pool._id, allocation.slice);
        }
    });

    controller.storage_pools = _.where(controller.storage_pools, function(storagePool) {
        return storagePool._id !== storagePoolId;
    });

    this.rebuildAutoAggregates(hagroup._id, { except: spinningDriveAggregates });
};


Builder.prototype.resizeStoragePool = function resizeStoragePool(id, newDeviceCount) {
    assert.equal(typeof id, 'string', '190f475a.1');
    assert.equal(typeof newDeviceCount, 'number', '190f475a.2');
    var map = this._makeNewMap();

    var context = map.inspect.storage_pool(id);

    var pool = context.storage_pool,
        oldDeviceCount = pool._devices.length,
        aggregates = _(pool._allocations)
            .map('aggr_id')    // find IDs
            .filter()          // eliminate undefined
            .unique()          // eliminate dups
            .map(map.find.aggregate);

    if (newDeviceCount === oldDeviceCount) {
        return;
    }

    if (newDeviceCount > oldDeviceCount) {
        throw new Error('expansion not yet implemented');
    }

    var _this = this,
        toRemove = pool._devices.slice(newDeviceCount);

    pool._manual = true;
    if (toRemove.length) {
        this._removeDevices(pool, makeSurvivalCheck(toRemove));
    }
    aggregates.forEach(fixAggr);

    return;

    // function findUnusedMatchingDevices(count) {
    //     if (count <= 0) {
    //         return [];
    //     }

    //     return _this._physicalDevicesMatchingSpec(context.hagroup, spec, count);
    // }

    function fixAggr(aggregate) {
        if (toRemove.length) {
            _this.removeDevicesFromAggregate(aggregate, toRemove);
        }
    }
};

function flow() {
    var functions = _.toArray(arguments);

    return function (value) {
        for (var idx in functions) {
            value = functions[idx](value);
        }

        return value;
    };
}

Builder.prototype.removeDevicesFromAggregate = function removeDevicesFromAggregate(aggregate, devices) {
    assert.equal(aggregate._type, 'aggregate', '08f14727.a');
    var _this = this,
        idWillSurviveFn = makeSurvivalCheck(devices);

    return _.forEach(aggregate._raid_groups, function (rg) {
        _this._removeDevices(rg, idWillSurviveFn);
    });
};

function makeSurvivalCheck(devices) {
    if (typeof devices === 'string') {
        return flow(unslice, _.partial(_.isEqual, devices), not);
    } else if (typeof devices === 'function') {
        return flow(devices, not);
    } else if (devices instanceof Array) {
        return flow(unslice, _.partial(_.has, _.zipObject(devices)), not);
    } else {
        assert(false, '08f14727.d');
    }
}

function not(bool) {
    return !bool;
}

Builder.prototype._removeDevices = function removeDevices(hasDevices, idWillSurviveFn) {
    var specs = expandDeviceSpecs(hasDevices.__deviceSpecs);
    assert.equal(specs.length, hasDevices._devices.length, '08f14727.dsmm');

    var tupSurvives = flow(_.first, idWillSurviveFn),
        tups = _.filter(_.zip(hasDevices._devices, specs), tupSurvives);

    hasDevices._devices = _.map(tups, _.first);
    hasDevices.__deviceSpecs = collapseDeviceSpecs(_.map(tups, _.last));
};

function collapseDeviceSpecs(__deviceSpecs) {
    var lastSpec = null,
        count = 0,
        result = [];

    _.forEach(__deviceSpecs, consider);
    changeTo(null);
    return result;

    function consider(ds) {
        if (ds.spec === lastSpec) { // same object!
            count += ds.count;
        } else {
            changeTo(ds);
        }
    }

    function changeTo(ds) {
        if (lastSpec !== null) {
            result.push({
                spec: lastSpec,
                count: count
            });
        }

        if (ds !== null) {
            lastSpec = ds.spec;
            count = ds.count;
        } else {
            lastSpec = null;
            count = 0;
        }
    }
}

function expandDeviceSpecs(__deviceSpecs) {
    return _(__deviceSpecs).map(expandDeviceSpec).flatten().value();
}

function expandDeviceSpec(ds) {
    return repeat({
        count: 1,
        spec: ds.spec
    }, ds.count);
}

function repeat(value, count) {
    var result = [];
    for (var idx = 0; idx < count; idx ++) {
        result.push(value);
    }
    return result;
}

function unslice(deviceId) {
    var match = deviceId.match(SLICE_EXTRACT);
    if (match) {
        return match[1];
    } else {
        return deviceId;
    }
}


function spinningDriveAggregates(aggregate) {
    // TODO: inline this logic into an AggregateInspector once we have
    // the ability to reset their internal tables after model changes.
    return _(aggregate._raid_groups)
            .map('__deviceSpecs')
            .flatten()
            .where('count')
            .map('spec')
            .any(notSSD);
}

function notSSD(spec) {
    return spec.type !== 'SSD';
}

Builder.prototype.addFlashPoolRaidGroupToAggregate = function addFlashPoolRaidGroupToAggregate(aggregateId, raidType, deviceSpec, deviceCount) {
    var ownerAggregate = this._findAggregateById(aggregateId),
        ownerSystem = this._systemThatContainsAggregate(aggregateId),
        newRaidGroupName = this._newUniqueCacheRaidGroupName(ownerAggregate),
        newRaidGroup = this._buildFlashPoolRaidGroup(ownerSystem, newRaidGroupName, deviceSpec, deviceCount);

    _.merge(ownerAggregate, {
        cache_raid_type: raidType,
        is_hybrid: true
    });

    ownerAggregate._raid_groups.push(newRaidGroup);

    return newRaidGroup._id;
};

Builder.prototype.deleteFlashPoolRaidGroupFromAggregate = function deleteFlashPoolRaidGroupFromAggregate(raidGroupId) {
    var owningAggregate = this._findAggregateWithRaidGroup(raidGroupId);

    owningAggregate._raid_groups = _.where(owningAggregate._raid_groups, function(raidGroup) {
        return raidGroup._id !== raidGroupId;
    });

    owningAggregate.is_hybrid = _.where(owningAggregate._raid_groups, { cache: true }).length > 0;
};

Builder.prototype._buildStoragePool = function _buildStoragePool(hagroup, controller, deviceSpec, raidType, deviceCount, isManual) {
    var storagePoolId = uuid(),
        storagePoolName = this._newUniqueStoragePoolName(hagroup),
        blocksPerSlice = this._usedBlocksPerSlice(deviceSpec),
        physicalDevices = this._physicalDevicesMatchingSpec(hagroup, deviceSpec, deviceCount),
        allocations = this._buildAllocationsForNewStoragePool(storagePoolId, blocksPerSlice, deviceSpec, physicalDevices);

    return {
        _id: storagePoolId,
        _type: STORAGE_POOL,
        name: storagePoolName,
        type: deviceSpec.type,
        raid_type: raidType,
        _manual: isManual,
        _devices: physicalDevices,
        __deviceSpecs: [{
            count: physicalDevices.length,
            spec: _.merge(_.clone(deviceSpec), { _for_storage_pool: storagePoolId }),
        }],
        _allocations: allocations
    };
};

Builder.prototype._buildFlashPoolRaidGroup = function _buildFlashPoolRaidGroup(system, raidGroupName, deviceSpec, deviceCount) {

    var map = this._makeNewMap(),
        hagi = map.inspect(system),
        availableDevices = hagi.availablePhysicalDevices().concat(hagi.availableStoragePoolDevices()),
        deviceIds = this._deviceIdsGivenAvailableSpecAndCount(availableDevices, deviceSpec, deviceCount); // Here

    return {
        _id: uuid(),
        _type: 'raidgroup',
        name: raidGroupName,
        _devices: deviceIds,
        __deviceSpecs: [{
            spec: _.omit(deviceSpec, 'quantity'),
            count: deviceCount
        }],
        cache: true,
        plex_number: 1
    };
};

Builder.prototype._newUniqueCacheRaidGroupName = function _newUniqueCacheRaidGroupName(owningAggregate) {
    var nextNumber = this._nextNumberInNamingSequence(owningAggregate._raid_groups);

    return util.format('%s%s', 'rg', nextNumber);
};

Builder.prototype._newUniqueStoragePoolName = function _newUniqueStoragePoolName(owningHagroup) {
    var allStoragePools = _.without(_.flatten(_.map(owningHagroup.controllers, function(controller) {
            return controller.storage_pools;
        })), undefined),
        nextNumber = this._nextNumberInNamingSequence(allStoragePools);

    return util.format('sp%s', nextNumber); // Needs to be unique across hagroup (see: ADP PPT slide 25)
};

Builder.prototype._nextNumberInNamingSequence = function _nextNumberInNamingSequence(collection) {
    var numbers = _.map(collection, function(item) {
            var number = item.name.match(/(\d+)$/);

            return (number) ? number[0] : 0;
        }),
        sortedNumbers = _.sortBy(numbers);

    return (sortedNumbers.length > 0) ? parseInt(_.last(sortedNumbers)) + 1 : 1;
};

Builder.prototype._buildAllocationsForNewStoragePool = function _buildAllocationsForNewStoragePool(storagePoolId, blocksPerSlice, physicalDeviceSpec, physicalDevices) {
    var partitions = _.range(1, SLICES_PER_DRIVE + 1),
        allocations = [],
        _this = this;

    _.forEach(partitions, function(partition) {
        var sliceName = util.format('P%s', partition),
            deviceIds = _.map(physicalDevices, function(deviceId) {
                return util.format('%sP%s', deviceId, partition);
            }),
            newAllocation = {
                slice: sliceName,
                used_blocks: Math.floor(blocksPerSlice),
                devices: deviceIds
            },
            virtualDeviceSpec = _this._deviceSpecFromAllocationUnit(storagePoolId, sliceName, newAllocation, physicalDeviceSpec),
            packagedVirtualDeviceSpec = {
                count: physicalDevices.length,
                spec: virtualDeviceSpec
            };

        _.merge(newAllocation, {
            __deviceSpecs: [packagedVirtualDeviceSpec]
        });

        allocations.push(newAllocation);
    });

    return allocations;
};

Builder.prototype._physicalDevicesMatchingSpec = function _physicalDevicesMatchingSpec(hagroup, deviceSpec, deviceCount) {
    var map = this._makeNewMap(),
        hagi = map.inspect(hagroup),
        unlockedPhysicalDevices = hagi.unlockedPhysicalDevices();

    return this._deviceIdsGivenAvailableSpecAndCount(unlockedPhysicalDevices, deviceSpec, deviceCount);
};

Builder.prototype._deviceIdsGivenAvailableSpecAndCount = function _deviceIdsGivenAvailableSpecAndCount(availableDevices, deviceSpec, deviceCount) {
    var matchingDevices = _(availableDevices)
            .where(deviceMatches)
            .map('devices')
            .flatten()
            .value();

    assert(matchingDevices.length >= deviceCount, 'Unable to find devices of specific spec/quantity to build storage pool/cache raid group');

    return _.sample(matchingDevices, deviceCount);

    function deviceMatches(deviceGroup) {
        return _.isEqual(fixed(deviceSpec), fixed(deviceGroup.spec));
    }

    function fixed(spec) {
        return _.omit(spec, 'quantity', '_for_controller', 'model', '_for_storage_pool', '_from_parent');
    }
};

Builder.prototype._usedBlocksPerSlice = function _usedBlocksPerSlice(deviceSpec) {
    var rsCapacity = new Unit(deviceSpec.rsgb, 'GB'),
        overhead = new Unit(20.5, 'MiB'),
        totalOverhead = overhead.mult(5),
        capacityAfterOverhead = rsCapacity.subtract(totalOverhead),
        perSliceCapacity = capacityAfterOverhead.divide(SLICES_PER_DRIVE),
        perSliceBlocks = perSliceCapacity.to('KiB').value / 4;

    return perSliceBlocks;
};

Builder.prototype._systemThatContainsAggregate = function _systemThatContainsAggregate(aggregateId) {
    var controllerMap = this._mapControllerOwnership('aggregates'),
        mapWithAggregateSearch = _.where(controllerMap, function(controllerItem) {
            return _.contains(controllerItem.ids, aggregateId);
        }),
        aggregateMap = _.first(mapWithAggregateSearch);

    return _.find(this.clip.synergy_model.hagroups, { _id: aggregateMap.hagroupId });
};

Builder.prototype._findSystemByControllerId = function _findSystemByControllerId(controllerId) {
    var systems = _.where(this.clip.synergy_model.hagroups, function(hagroup) {
        return _.contains(_.map(hagroup.controllers, function(controller) {
            return controller._id;
        }), controllerId);
    });

    return _.first(systems);
};

Builder.prototype._findControllerWhoOwnsAggregate = function _findControllerWhoOwnsAggregate(aggregateId) {
    var controllerMap = this._mapControllerOwnership('aggregates'),
        owningControllerSearch = _.where(controllerMap, function(controllerItem) {
            return _.contains(controllerItem.ids, aggregateId);
        }),
        owningControllerIndex = _.first(owningControllerSearch),
        owningController = this._findControllerById(owningControllerIndex.controllerId);

    return owningController;
};

Builder.prototype._findStoragePoolById = function _findStoragePoolById(storagePoolId) {
    var owningController = this._findControllerWithStoragePool(storagePoolId);

    return _.first(_.where(owningController.storage_pools, function(pool) {
        return pool._id === storagePoolId;
    }));
};

Builder.prototype._findController = function _findController(hagroup, controllerId) {
    return _.find(hagroup.controllers, { _id: controllerId });
};

Builder.prototype._findControllerById = function _findControllerById(controllerId) {
    var owningSystemSearch = _.where(this.clip.synergy_model.hagroups, function(hagroup) {
            return _.contains(_.map(hagroup.controllers, function(controller) {
                return controller._id;
            }), controllerId);
        }),
        owningSystem = _.first(owningSystemSearch),
        controller = _.find(owningSystem.controllers, { _id: controllerId });

    return controller;
};

Builder.prototype._findControllerWithStoragePool = function _findControllerWithStoragePool(storagePoolId) {
    var controllerMap = this._mapControllerOwnership('storage_pools'),
        owningControllerIndex = _.where(controllerMap, function(controllerItem) {
            return _.contains(controllerItem.ids, storagePoolId);
        }),
        owningController = this._findControllerById(_.first(owningControllerIndex).controllerId);

    return owningController;
};

Builder.prototype._findAggregateById = function _findAggregateById(aggregateId) {
    var controllerMap = this._mapControllerOwnership('aggregates'),
        owningControllerSearch = _.where(controllerMap, function(controllerItem) {
            return _.contains(controllerItem.ids, aggregateId);
        }),
        owningControllerIndex = _.first(owningControllerSearch),
        owningController = this._findControllerById(owningControllerIndex.controllerId),
        aggregate = _.first(_.where(owningController.aggregates, function(aggr) {
            return aggr._id === aggregateId;
        }));

    return aggregate;
};

Builder.prototype._findAggregateWithRaidGroup = function _findAggregateWithRaidGroup(raidGroupId) {
    var _this = this,
        controllerMap = this._mapControllerOwnership('aggregates'),
        aggregateMap = _.flatten(_.map(controllerMap, function(controllerItem) {
            // Yeah, this is scary
            return _.map(controllerItem.ids, function(aggregateId) {
                var aggregate = _this._findAggregateById(aggregateId);

                return {
                    controllerId: controllerItem.controllerId,
                    aggregateId: aggregateId,
                    raidGroupIds: _.map(aggregate._raid_groups, function(raidGroup) {
                        return raidGroup._id;
                    })
                };
            });
        })),
        aggregateSearch = _.where(aggregateMap, function(aggregateItem) {
            return _.contains(aggregateItem.raidGroupIds, raidGroupId);
        }),
        owningAggregateId = _.first(aggregateSearch).aggregateId;

    return this._findAggregateById(owningAggregateId);
};

Builder.prototype._mapControllerOwnership = function _mapControllerOwnership(ownershipOfType) {
    var controllerMap = _.map(this.clip.synergy_model.hagroups, function(hagroup) {
        var controllerIndex = _.map(hagroup.controllers, function(controller) {
            var ownedThingIds = [];

            if (controller[ownershipOfType]) {
                ownedThingIds.push.apply(ownedThingIds, _.map(controller[ownershipOfType], function(ownedThing) {
                    return ownedThing._id;
                }));
            }

            return {
                hagroupId: hagroup._id,
                controllerId: controller._id,
                ids: ownedThingIds
            };
        });

        return controllerIndex;
    });

    return _.flatten(controllerMap);
};

module.exports = Builder;
