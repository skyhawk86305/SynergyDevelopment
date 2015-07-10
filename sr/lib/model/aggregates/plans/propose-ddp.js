'use strict';

var assert = require('assert'),
    util = require('util'),
    _ = require('lodash'),
    AggregateProposer = require('./propose-abstract'),
    dump = require('../../../dump');

dump(); // make linter happy

function ESeriesDrivePoolProposer(hagi, deviceGroups, aggregates) {
    assert(this instanceof ESeriesDrivePoolProposer);
    this.name = 'ddp';
    AggregateProposer.call(this, hagi, deviceGroups, aggregates);
}

util.inherits(ESeriesDrivePoolProposer, AggregateProposer);

ESeriesDrivePoolProposer.prototype.propose = function propose() {
    assert(this instanceof ESeriesDrivePoolProposer);

    var lookup = this.hagi.lookup,
        policies = this.hagi.hagroup._policies || {},
        results = [];

    if (this.isFAS) {
        return;
    }

    if (policies.Aggregates && policies.Aggregates.manual) {
        return; // User does not want us to build
    }

    var defaultProps = lookup.defaultAggrProps(),
    aggrType = defaultProps.block_type,
    raidType = defaultProps.raid_type;

    while (this.deviceGroups.length) {
        var deviceGroup = this.deviceGroups.shift(),
            deviceCount = deviceGroup.devices.length,
            minSize = lookup.minAggrDeviceCount(raidType);

        if (deviceCount < minSize) {
            continue;
        }

        _.forEach(this.controllerIds, trySizes, this);
    }

    function trySizes(controllerId) {
        // jshint -W040
        assert(this instanceof ESeriesDrivePoolProposer);
        var maxSize = lookup.maxAggrDataDeviceCount(deviceGroup.spec, deviceCount, aggrType, raidType),
            sizeOptions = getSizesToTry(deviceCount, maxSize);

        _.forEach(sizeOptions, makeAggregate, this);

        function makeAggregate(aggrSize) {
            var devicesBefore = _.clone(deviceGroup.devices),
                props = {
                    strategy: this.name,
                    name: this.getNonConflictingAggregateName(controllerId, 'data'),
                    is_root_aggregate: false,
                },
                aggr = this.componentBuilder.makeAggregate(controllerId, deviceGroup, aggrSize, props);

            deviceGroup.devices = devicesBefore;
            results.push(aggr);
        }
    }

    return {
        mode: 'any',
        aggregates: results
    };
};

function getSizesToTry(deviceCount, maxSize) {
    if (deviceCount > 2*maxSize) {
        return [ maxSize ]; // TODO: add well rounded
    } else if (deviceCount > maxSize) {
        return [ maxSize, Math.floor(maxSize/2) ]; // here too
    } else {
        return [ deviceCount ];
    }
}

module.exports = ESeriesDrivePoolProposer;
