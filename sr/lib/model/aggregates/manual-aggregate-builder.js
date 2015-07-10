'use strict';

var _ = require('lodash'),
    assert = require('assert'),
    uuid = require('uuid'),
    util = require('util'),
    ComponentBuilder = require('./component-builder'),
    RaidTypes = require('./raid-types');

/*
    ManualAggregatePlanner(hagi, currentAggregate)
*/
function ManualAggregateBuilder(hagi, currentAggregate, requestedRaidSize) {
    assert(hagi, 'Must provide a hagroup inspector');

    this._hagi = hagi;
    this._raidTypes = new RaidTypes();
    this.name = 'manual';
    this._requestedRaidSize = requestedRaidSize; // What the user requested, what we were able to actually do different (Note: aggr doesn't manage raid size)
    this._componentBuilder = new ComponentBuilder(this._hagi);
    this.aggregate = currentAggregate || this._makeAggregateBoilerplate();
    this._setRaidSizeIfMissing();
}

/*
    Guard:
        Can we make this HW change (Remove / change shelf and manual aggr satisfy itself)
        ** Need to include ability to provide version
*/

ManualAggregateBuilder.prototype.bestPracticeRaidSize = function bestPracticeRaidSize(spec, raidType, count) {
    return this._hagi.lookup.lowestOverheadRaidSize(spec, raidType, count);
};

ManualAggregateBuilder.prototype.bestPracticeDDPReserve = function bestPracticeDDPReserve(count) {
    return this._hagi.lookup.reserveRecommendationForDDP(count);
};

ManualAggregateBuilder.prototype.setRaidType = function setRaidType(newRaidType, forCache) {
    assert(_.contains(this.availableRaidTypes(), newRaidType), 'Cannot assign raid type, it is not available on system');

    if (forCache) {
        this.aggregate.cache_raid_type = newRaidType;
    }
    else {
        this.aggregate.raid_type = newRaidType;
    }

    this._respondToMutation();
};

ManualAggregateBuilder.prototype.setBlockType = function setBlockType(newBlockType) {
    assert(_.contains(this.availableBlockTypes(), newBlockType), 'Cannot assign aggregate block type, it is not available on this system');

    this.aggregate.block_type = newBlockType;
    this._respondToMutation();
};

ManualAggregateBuilder.prototype.setDeviceAndCount = function setDeviceAndCount(spec, count) {
    assert(!this._isDeviceGroup(spec), 'You should not be passing a device group in, only spec and count');

    if (!this._requestedRaidSize) {
        this._requestedRaidSize = this.bestPracticeRaidSize(spec, this.aggregate.raid_type, count);
    }

    // Device Group Here
    var deviceGroup = this._deviceGroupForSpec(spec);

    assert(deviceGroup.devices.length >= count, 'Attempted to set spec with insufficient number of devices');
    this._rebuildRaidGroups(false, deviceGroup, count);
};

ManualAggregateBuilder.prototype.setRaidSize = function setRaidSize(newRaidSize) {
    this._requestedRaidSize = newRaidSize;
    this._respondToMutation();
};

ManualAggregateBuilder.prototype.setDDPReserve = function setDDPReserve(newDdpReserve) {
    this.aggregate._ddpreserve = newDdpReserve;
    this._respondToMutation();
};

ManualAggregateBuilder.prototype.setController = function setController(newController) {
    this.aggregate._controller = newController._id;
};

ManualAggregateBuilder.prototype.setName = function setName(newName) {
    this.aggregate.name = newName;
};

ManualAggregateBuilder.prototype.setSnapReserve = function setSnapReserve(newSnapReserveProportion) {
    /*
        TODO MAYBE: Enforce 0-1 (percentage)
    */

    this.aggregate._snapreserve_proportion = newSnapReserveProportion;
};

ManualAggregateBuilder.prototype.availableDeviceGroupsForAggregate = function availableDeviceGroupsForAggregate() {
    return this._availableAggrDeviceGroups();
};

ManualAggregateBuilder.prototype.deviceSummary = function deviceSummary() {
    var dataDeviceGroups = this._currentAggrDeviceGroups(false),
        cacheDeviceGroups = this._currentAggrDeviceGroups(true),
        dataDeviceGroup = safeSpecAndCount(dataDeviceGroups),
        cacheDeviceGroup = safeSpecAndCount(cacheDeviceGroups),
        summary = {
            data: dataDeviceGroup,
            cache: cacheDeviceGroup
        };

    function safeSpecAndCount(groups) {
        if (!groups || groups.length === 0) {
            return {
                spec: null,
                count: 0
            };
        }

        var group = _.first(groups);

        return {
            spec: group.spec,
            count: group.devices.length
        };
    }

    return summary;
};

ManualAggregateBuilder.prototype.availableRaidTypes = function availableRaidTypes() {
    return this._hagi.lookup.possibleRaidTypes;
};

ManualAggregateBuilder.prototype.availableBlockTypes = function availableBlockTypes() {
    return this._hagi.lookup.possibleAggrTypes;
};

ManualAggregateBuilder.prototype.availableControllers = function availableControllers() {
    return this._hagi.controllers;
};

ManualAggregateBuilder.prototype.containerLanguage = function containerLanguage() {
    return (this._hagi.isESeries) ? 'Volume Group' : 'Aggregate';
};

ManualAggregateBuilder.prototype.systemLimits = function systemLimits() {
    return this._hagi.limits;
};

ManualAggregateBuilder.prototype.currentRaidSize = function currentRaidSize() {
    return this._actualRaidSize();
};

ManualAggregateBuilder.prototype.requestedRaidSize = function requestedRaidSize() {
    return this._requestedRaidSize;
};

ManualAggregateBuilder.prototype.deviceLimits = function deviceLimits(forCache) {
    var activeDevice = this._activeDeviceForAggregate(forCache),
        lookup = this._hagi.lookup,
        limits = {
            spec: {},
            min: 0,
            max: 0
        };

    if (activeDevice) {
        var raidType = this._currentRaidType(forCache),
            aggrType = this.aggregate.block_type,
            deviceSpec = activeDevice.spec,
            activeCount = this._deviceGroupForSpec(deviceSpec).devices.length,
            minForRaidType = this._absoluteMinRaidSize(raidType),
            maxToLimit = lookup.maxAggrDataDeviceCount(deviceSpec, activeCount, aggrType, raidType);

        limits.spec = deviceSpec;
        limits.min = minForRaidType;
        limits.max = maxToLimit;
    }

    return limits;
};

ManualAggregateBuilder.prototype.raidSizeLimits = function raidSizeLimits(forCache) {
    var activeDevice = this._activeDeviceForAggregate(forCache),
        limits = {
            spec: {},
            min: 0,
            max: 0
        };

    if (activeDevice) {
        var lookup = this._hagi.lookup,
            raidType = this._currentRaidType(forCache),
            deviceSpec = activeDevice.spec,
            activeCount = this._deviceGroupForSpec(deviceSpec).devices.length,
            raidLimits = lookup.raidLimits(deviceSpec, raidType),
            hardMinimum = this._absoluteMinRaidSize(raidType);

        limits.spec = deviceSpec;
        limits.min = hardMinimum;
        limits.max = Math.min(activeCount, raidLimits.maximumSize);
    }

    return limits;
};

ManualAggregateBuilder.prototype._setRaidSizeIfMissing = function _setRaidSizeIfMissing() {
    if (this.aggregate && !this._requestedRaidSize) {
        if (this.aggregate._raid_groups) {
            this._requestedRaidSize = this._actualRaidSize();
        }
    }
};

ManualAggregateBuilder.prototype._actualRaidSize = function _actualRaidSize() {
    if (this.aggregate && this.aggregate._raid_groups) {
        return _.max(_.map(this.aggregate._raid_groups, deviceCountInRaidGroup));
    }

    function deviceCountInRaidGroup(raidGroup) {
        return raidGroup._devices.length;
    }
};

ManualAggregateBuilder.prototype._currentRaidType = function _currentRaidType(forCache) {
    return (forCache) ? this.aggregate.cache_raid_type : this.aggregate.raid_type;
};

ManualAggregateBuilder.prototype._activeDeviceForAggregate = function _activeDeviceForAggregate(forCache) {
    var currentAggregateDeviceGroups = this._currentAggrDeviceGroups(forCache),
        activeDevice = null;

    if (currentAggregateDeviceGroups && currentAggregateDeviceGroups.length > 0) {
        var sortedDeviceGroups = _.sortBy(currentAggregateDeviceGroups, sortByCapacity);

        activeDevice = _.first(sortedDeviceGroups);
    }

    function sortByCapacity(deviceGroup) {
        return deviceGroup.spec.rsgb;
    }

    return activeDevice;
};

ManualAggregateBuilder.prototype._transform = function _transform(devices) {
    return this._hagi.transformDriveInfoSequence(devices);
};

ManualAggregateBuilder.prototype._availableAggrDeviceGroups = function _availableAggrDeviceGroups() {
    var unusedDevices = this._unusedAggrDevices(),
        currentDevices = this._currentAggrDevices();

    return this._transform(unusedDevices.concat(currentDevices));
};

ManualAggregateBuilder.prototype._currentAggrDeviceGroups = function _currentAggrDeviceGroups(forCache) {
    return this._transform(this._currentAggrDevices(forCache));
};

ManualAggregateBuilder.prototype._unusedAggrDevices = function _unusedAggrDevices() {
    return this._hagi.latestDeviceInfo().where.unlocked.and.notroot;
};

ManualAggregateBuilder.prototype._currentAggrDevices = function _currentAggrDevices(forCache) {
    var _this = this,
        allDevices = this._hagi.latestDeviceInfo(),
        ownedByAggregate = _.where(allDevices, forAggregate);

    return this._filterCacheDevices(ownedByAggregate, forCache);

    function forAggregate(device) {
        return _.any(device.consumers, containsId);

        function containsId(consumer) {
            return _this.aggregate && consumer._id === _this.aggregate._id;
        }
    }
};

/*
    Will return only devices that are either for cache or not, after being given a device chain
*/
ManualAggregateBuilder.prototype._filterCacheDevices = function _filterCacheDevices(devices, forCache) {
    var roleMap = {},
        _this = this;

    buildRoleMap();
    forCache = !!forCache;

    return _.where(devices, filterForCache);

    function filterForCache(device) {
        return _.has(roleMap, device.id) && roleMap[device.id] === forCache;
    }

    function buildRoleMap() {
        if (!_this.aggregate) {
            return;
        }

        _.forEach(_this.aggregate._raid_groups, mapRaidGroup);

        function mapRaidGroup(rg) {
            _.forEach(rg._devices, addDeviceToMap);

            function addDeviceToMap(deviceId) {
                roleMap[deviceId] = rg.cache;
            }
        }
    }
};

ManualAggregateBuilder.prototype._absoluteMinRaidSize = function _absoluteMinRaidSize(raidType) {
    return this._raidTypes.minRaidSize(raidType);
};

ManualAggregateBuilder.prototype._makeAggregateBoilerplate = function makeBoilerplate() {
    var lookup = this._hagi.lookup,
        defaultProps = lookup.defaultAggrProps();

    var newAggregate = _.merge({}, defaultProps, {
        _strategy: this.name,
        _manual: true,
        _controller: this._defaultController()._id,
        name: this._defaultName()
    });

    newAggregate._raid_groups = this._makeDefaultRaidGroups(newAggregate);

    return newAggregate._raid_groups.length ? newAggregate : null;
};

ManualAggregateBuilder.prototype._makeDefaultRaidGroups = function _makeDefaultRaidGroups(forAggr) {
    var _this = this,
        defaultDeviceGroup = this._defaultRaidGroupDeviceGroup();

    if (!defaultDeviceGroup) {
        return [];
    }

    var raidType = defaultRaidType(defaultDeviceGroup);

    if (!raidType) {
        return [];
    }

    forAggr.raid_type = raidType;

    var lookup = this._hagi.lookup,
        aggrType = forAggr.block_type,
        spec = defaultDeviceGroup.spec,
        totalDefaultDevices = defaultDeviceGroup.devices.length,
        deviceCount = lookup.maxAggrDataDeviceCount(spec, totalDefaultDevices, aggrType, raidType);

    if (deviceCount < this._absoluteMinRaidSize(raidType)) {
        return [];
    }

    this._requestedRaidSize = this.bestPracticeRaidSize(spec, raidType, deviceCount);

    return this._componentBuilder.makeRaidGroups(defaultDeviceGroup, deviceCount, forAggr, this._requestedRaidSize);

    function defaultRaidType(deviceGroup) {
        var hagi = _this._hagi,
            prefferedRaidType = (hagi.isESeries) ? _this._raidTypes.DDP : _this._raidTypes.RAID_DP,
            systemRaidTypes = _(hagi.lookup.possibleRaidTypes)
                                .where(enoughDevicesForType)
                                .sortBy(rank)
                                .value();

        function enoughDevicesForType(type) {
            return deviceGroup.devices.length >= _this._absoluteMinRaidSize(type);
        }

        function rank(type) {
            return type === prefferedRaidType ? 0 : 1;
        }

        return _.first(systemRaidTypes);
    }
};

ManualAggregateBuilder.prototype._defaultRaidGroupDeviceGroup = function _defaultRaidGroupDeviceGroup() {
    var _this = this,
        availableDevices = this.availableDeviceGroupsForAggregate();

    function deviceCount(item) {
        return item.devices.length;
    }

    function deviceIfADPMeetsMin(/* device */) {
        if (!_this._hagi.isESeries) {
            /*
                TODO: Check for ADP and ensure at least 3 devices (ADP can only use RAID_DP)
            */
        }

        return true;
    }

    if (availableDevices) {
        var sortedDevices = _(availableDevices)
                .where(deviceIfADPMeetsMin)
                .sortBy(deviceCount)
                .reverse()
                .value();

        return (sortedDevices.length) ? _.first(sortedDevices) : null;
    }

    return null;
};

ManualAggregateBuilder.prototype._defaultController = function defaultController() {
    var controllers = this._hagi.controllers;

    assert(controllers, 'hagroup is missing controllers');
    return _.first(controllers);
};

ManualAggregateBuilder.prototype._defaultName = function defaultName() {
    var language = this.containerLanguage();

    return util.format('%s_%s', language, uuid().slice(0, 8));
};

ManualAggregateBuilder.prototype._deviceGroupForSpec = function _deviceGroupForSpec(spec) {
    var deviceGroups = this.availableDeviceGroupsForAggregate();

    if (!deviceGroups || deviceGroups.length === 0) {
        return false;
    }

    var filtered = _(deviceGroups)
            .filter()
            .where(specMatchesSearch)
            .value();

    return (filtered && filtered.length > 0) ? _.first(filtered) : null;

    function specMatchesSearch(deviceGroup) {
        return _.isEqual(deviceGroup.spec, spec);
    }
};

ManualAggregateBuilder.prototype._respondToMutation = function _respondToMutation() {
    // Housekeeping
    this._rebuildRaidGroups();
};

ManualAggregateBuilder.prototype._rebuildRaidGroups = function _rebuildRaidGroups(forCache, withSpecificDeviceGroup, havingCount) {
    forCache = !!forCache;

    if (withSpecificDeviceGroup) {
        if (!(withSpecificDeviceGroup instanceof Array)) {
            withSpecificDeviceGroup = [withSpecificDeviceGroup];
        }
    }

    var _this = this,
        aggregateDataDeviceGroups = withSpecificDeviceGroup || this._currentAggrDeviceGroups(forCache),
        cacheRaidGroups = _.where(this.aggregate._raid_groups, isCacheRg),
        newRaidGroups = _.flatten(_.map(aggregateDataDeviceGroups, buildRaidGroupsForDevice));

    if (cacheRaidGroups.length) {
        newRaidGroups.push.apply(newRaidGroups, cacheRaidGroups);
    }

    function buildRaidGroupsForDevice(deviceGroup) {
        var groupCount = havingCount || deviceGroup.devices.length;
        return _this._componentBuilder.makeRaidGroups(deviceGroup, groupCount, _this.aggregate, _this._requestedRaidSize);
    }

    function isCacheRg(rg) {
        return rg.cache;
    }

    this.aggregate._raid_groups = newRaidGroups;
};

ManualAggregateBuilder.prototype._isDeviceGroup = function _isDeviceGroup(obj) {
    var isObject = _.isPlainObject(obj),
        hasSpec = _.has(obj, 'spec'),
        hasDevices = _.has(obj, 'devices'),
        specIsObject = hasSpec && _.isPlainObject(obj.spec),
        devicesIsArray = hasDevices && (obj.devices instanceof Array);

    return isObject && specIsObject && devicesIsArray;
};

module.exports = ManualAggregateBuilder;
