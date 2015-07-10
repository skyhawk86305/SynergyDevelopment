'use strict';

var assert = require('assert'),
    util = require('util'),
    _ = require('lodash'),
    AggregateProposer = require('./propose-abstract'),
    dump = require('../../../dump');

dump(); // make linter happy

function DataAggregateProposer(hagi, deviceGroups, aggregates) {
    assert(this instanceof DataAggregateProposer);
    this.name = 'data';
    AggregateProposer.call(this, hagi, deviceGroups, aggregates);
}

util.inherits(DataAggregateProposer, AggregateProposer);

DataAggregateProposer.prototype.propose = function propose() {
    assert(this instanceof DataAggregateProposer);
    var lookup = this.hagi.lookup,
        policies = this.hagi.hagroup._policies || {};

    if (!this.isFAS) {
        return;
    }

    if (this.controllersWithoutRoot.length) {
        return;
    }

    if (policies.Aggregates && policies.Aggregates.manual) {
        return; // User does not want us to build
    }

    var defaultProps = lookup.defaultAggrProps(),
        aggrType = defaultProps.block_type,
        raidType = defaultProps.raid_type,
        minSize = lookup.minAggrDeviceCount(raidType);

    var deviceGroups = _.cloneDeep(this.deviceGroups),
        deviceGroup,
        minRequired;

    while (true) {
        // take next group
        if (!(deviceGroup = deviceGroups.shift())) {
            return;
        }

        if (deviceGroup.devices.length < minSize) {
            // can't form a raid group, even without considering spares
            continue;
        }

        minRequired = 0;
        _.forEach(this.controllerIds, raiseMinRequiredForSparesAndMinReq, this);

        if (deviceGroup.devices.length < minRequired) {
            // can't form a raid group while taking spares
            continue;
        }

        // we have enough drives!
        break;
    }

    function raiseMinRequiredForSparesAndMinReq(id, idx) {
        // jshint -W040
        assert(this instanceof DataAggregateProposer);
        // TODO: try placing the minSize on each controller separately,
        // as we might avoid crossing the magic 300 or 1200 count there
        // and avoid taking one extra spare.
        var live = this.liveDevicesForSpecAndController(deviceGroup.spec, id),
            isFirst = idx === 0,
            extrasForThisController = isFirst ? minSize : 0,
            consider = live + extrasForThisController;
        minRequired += this.sparesFor(consider) + extrasForThisController;
    }

    var controllerIds = this.controllerIds,
        deviceCount = deviceGroup.devices.length,
        spec = deviceGroup.spec,
        maxSize = lookup.maxAggrDataDeviceCount(spec, deviceCount, aggrType, raidType),
        rgSizeAtMax = lookup.lowestOverheadRaidSize(spec, raidType, maxSize),
        overflow = maxSize % rgSizeAtMax,
        maxRound = maxSize - overflow;

    var priorDevices = _.clone(deviceGroup.devices);

    function restoreDevices() {
        deviceGroup.devices = _.clone(priorDevices);
    }

    var attempt = _.bind(this.attempt, this, deviceGroup, raidType);

    // Intervene here for policy-selected alternatives to 50:50 split,
    // e.g. fast:slow split.

    var attempt0 = attempt(maxRound);
    if (attempt0.length === controllerIds.length) {
        return {
            mode: 'all',
            aggregates: attempt0
        };
    } else {
        restoreDevices();
    }

    if (deviceCount < 24) {
        // Try not splitting.
        var unsplit = attempt(deviceCount);
        if (unsplit.length) {
            return {
                mode: 'all',
                aggregates: unsplit
            };
        } else {
            restoreDevices();
        }
    }

    // Try splitting.
    return {
        mode: 'all',
        aggregates: attempt(Math.ceil(deviceCount / controllerIds.length))
    };

    // TODO: handle the potential for an unsliced device to act as a spare
    // for a sliced device.
};

DataAggregateProposer.prototype.attempt = function attempt(deviceGroup, raidType, count) {
    assert(this instanceof DataAggregateProposer);
    assert(_.isPlainObject(deviceGroup));
    assert(_.isString(raidType));
    assert(_.isNumber(count));

    var liveForController = _.bind(this.liveDevicesForSpecAndController, this, deviceGroup.spec),
        liveCounts = _.map(this.controllerIds, liveForController);

    if (liveCounts.length === 2 && liveCounts[0] === liveCounts[1]) {
        // wind back both carefully
        var bothSpares = 2 * this.sparesFor(liveCounts[0], count),
            bothExcess = deviceGroup.devices.length - (count * 2 + bothSpares),
            excess = Math.floor(bothExcess / 2);
        if (excess < 0 && WINDBACK_LIMIT + excess < 0) {
            count = count + excess;
        }
    }

    var minCount = this.hagi.lookup.minAggrDeviceCount(raidType),
        ids = this.controllerIds,
        count0 = this.windBackForSpares(deviceGroup, ids[0], count),
        aggrs = [];

    if (count0 >= minCount) {
        aggrs.push(this.makeDataAggregate(ids[0], deviceGroup, count0));

        var count1 = ids.length === 1 ? 0 : this.windBackForSpares(deviceGroup, ids[1], count);

        if (count1 >= minCount) {
            aggrs.push(this.makeDataAggregate(ids[1], deviceGroup, count1));
        }
    }

    return aggrs;
};

var WINDBACK_LIMIT = 8; // max expected spares per controller per spec

DataAggregateProposer.prototype.windBackForSpares = function windBackForSpares(deviceGroup, controllerId, count) {
    assert(this instanceof DataAggregateProposer);
    assert(_.isPlainObject(deviceGroup));
    assert(_.isString(controllerId));
    assert(_.isNumber(count));

    var live = this.liveDevicesForSpecAndController(deviceGroup.spec, controllerId),
        spares = this.sparesFor(live, count),
        excess = deviceGroup.devices.length - (count + spares);

    if (excess >= 0) {
        return count;
    } else if (WINDBACK_LIMIT + excess < 0) {
        return 0; // refuse to wind back this far
    } else {
        return count + excess; // TODO: look for edge cases around 300
                                // where this leaves us with an extra
                                // spare.
    }
};

DataAggregateProposer.prototype.makeDataAggregate = function makeDataAggregate(controllerId, deviceGroup, aggrSize) {
    // jshint -W040
    assert(this instanceof DataAggregateProposer);
    assert.equal(typeof controllerId, 'string');
    assert(_.isPlainObject(deviceGroup));
    assert.equal(typeof aggrSize, 'number');
    assert(aggrSize > 0);

    var props = {
            strategy: this.name,
            name: this.getNonConflictingAggregateName(controllerId, 'data'),
            is_root_aggregate: false,
        },
        aggr = this.componentBuilder.makeAggregate(controllerId, deviceGroup, aggrSize, props);
    return aggr;
};

module.exports = DataAggregateProposer;
