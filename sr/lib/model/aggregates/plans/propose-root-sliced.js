'use strict';

var assert = require('assert'),
    util = require('util'),
    _ = require('lodash'),
    AggregateProposer = require('./propose-abstract'),
    dump = require('../../../dump');

dump(); // make linter happy

function SlicedRootAggregateProposer(hagi, deviceGroups, aggregates) {
    assert(this instanceof SlicedRootAggregateProposer);
    this.name = 'sliced_root';
    AggregateProposer.call(this, hagi, deviceGroups, aggregates);
}

util.inherits(SlicedRootAggregateProposer, AggregateProposer);

SlicedRootAggregateProposer.prototype.propose = function propose() {
    assert(this instanceof SlicedRootAggregateProposer);

    if (!this.isFAS) {
        return;
    }

    // naturally proposes no root aggregates if there are no controllers lacking one

    var deviceGroupsToSatisfyNeedyController = this.hagi.controllers
            .filter(this.isMissingRootAggregateFor, this) // needy controllers
            .map(rootSlicesDeviceGroupsFor, this)  // an array of device groups each
            .filter('length')                      // only the non-empty ones
            .map(0);                               // only the first

    return {
        mode: 'all',
        aggregates: _.map(deviceGroupsToSatisfyNeedyController, makeNewRootAggregateFrom, this)
    };

    // ---- closures only beyond this point

    function makeNewRootAggregateFrom(rootDeviceGroup) {
        // jshint -W040
        assert(this instanceof SlicedRootAggregateProposer);
        var controllerId = rootDeviceGroup.spec._for_controller;
        var props = {
                strategy: this.name,
                name: this.getNonConflictingAggregateName(controllerId, 'root'),
                is_root_aggregate: true,
            },
            deviceCount = rootDeviceGroup.devices.length,
            OVERRIDES = {
                1: {
                    6: 5,
                    12: 10,
                },
                2: {
                    6: 5,
                    12: 10,
                }
            };

        deviceCount = OVERRIDES[this.controllerIds.length][deviceCount] || deviceCount;

        // TODO: Ensure ADP controller slicing is being applied properly.
        //       Then, use the following code as a start on figuring out
        //       the appropriate device count.
        //
        // var embeddedShelf = context.hagi.embeddedShelf,
        //     breakdown = getEmbeddedRootSliceBreakdown(
        //         context.controllerIds.length,
        //         embeddedShelf.model === 'DS4486' ? 48 : embeddedShelf.bay_count,
        //         context.allRootSLiceCount)[controllerIndex];

        return this.componentBuilder.makeAggregate(controllerId, rootDeviceGroup, deviceCount, props);
    }

    function rootSlicesDeviceGroupsFor(controller) {
        // jshint -W040
        assert(this instanceof SlicedRootAggregateProposer);
        return _.filter(this.deviceGroups, matchesController);
        function matchesController(group) {
            return group.spec.slice === 'P2' &&
                   group.spec._for_controller === controller._id;
        }
    }
};

module.exports = SlicedRootAggregateProposer;
