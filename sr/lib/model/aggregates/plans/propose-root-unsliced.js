'use strict';

var assert = require('assert'),
    util = require('util'),
    _ = require('lodash'),
    AggregateProposer = require('./propose-abstract'),
    dump = require('../../../dump');

dump(); // make linter happy

// TODO: add policy control for best device

function UnslicedRootAggregateProposer(hagi, deviceGroups, aggregates) {
    assert(this instanceof UnslicedRootAggregateProposer);
    this.name = 'unsliced_root';
    AggregateProposer.call(this, hagi, deviceGroups, aggregates);
}

util.inherits(UnslicedRootAggregateProposer, AggregateProposer);

UnslicedRootAggregateProposer.prototype.propose = function propose() {
    assert(this instanceof UnslicedRootAggregateProposer);

    if (!this.isFAS) {
        return;
    }

    if (this._sawSlices()) {
        return;
    }

    var unsatisfiedControllers = this.controllersWithoutRoot;

    if (!unsatisfiedControllers.length) {
        return;
    }

    // Skip this block to apply policy for fast:slow split rather than
    // putting both the aggregates on the same device spec.
    var deviceGroups = _.sortBy(this.deviceGroups, rankDriveTypeForRootAggregate);
    for (var idx = 0; idx < deviceGroups.length; idx++) {
        var deviceGroup = deviceGroups[idx],
            minReq = this.whatif(unsatisfiedControllers, 'RAID_DP', deviceGroup);
        if (minReq) {
            var make = _.partial(this.makeNewRootAggregateFrom, deviceGroup, minReq);
            return {
                mode: 'all',
                aggregates: _.map(unsatisfiedControllers, make, this)
            };
        }
    }

    // TODO: if there aren't many of a group left AND we only have one
    // unsatisfied controller, also try a root aggregate using all but
    // one of the devices. It won't be a *dedicated* root aggregate,
    // but that's how best practice embedded-only configs look in 8.2.

    return {
        mode: 'any',
        aggregates: _.filter(_.map(this.deviceGroups, makeNewRootAggregateForFirstUnsatisified, this))
    };

    // ---- closures only beyond this point

    function rankDriveTypeForRootAggregate(driveGroup) {
        // SSDs are last
        // Intervene here to apply policy to root selection
        return driveGroup.spec.rpm;
    }

    function makeNewRootAggregateForFirstUnsatisified(deviceGroup) {
        // jshint -W040
        assert(this instanceof UnslicedRootAggregateProposer);
        var requiredDeviceCount = this.hagi.lookup.minimalRootAggregateDriveCount(deviceGroup.spec, 'RAID_DP'),
            controller = unsatisfiedControllers[0];
        return this.makeNewRootAggregateFrom(deviceGroup, requiredDeviceCount, controller);
    }
};

UnslicedRootAggregateProposer.prototype.whatif = function whatif(controllers, raidType, deviceGroup) {
    assert(this instanceof UnslicedRootAggregateProposer);
    var spec = deviceGroup.spec,
        minReq = this.hagi.lookup.minimalRootAggregateDriveCount(spec, raidType),
        getLiveCount = _.bind(this.liveDevicesForSpecAndController, this, spec),
        liveCountsPer = _.map(controllers, getLiveCount),
        sparesPer = _.map(liveCountsPer, sparesIncludingMinReq, this),
        newDriveCount = 0;

    for (var idx = 0; idx < controllers.length; idx++) {
        newDriveCount += minReq;
        newDriveCount += sparesPer[idx];
        // NOT liveCountsPer: it's newDriveCount, not totalDriveCount
    }

    if (newDriveCount > deviceGroup.devices.length) {
        return 0;
    } else {
        return minReq;
    }

    function sparesIncludingMinReq(count) {
        // jshint -W040
        assert(this instanceof UnslicedRootAggregateProposer);
        return this.sparesFor(minReq, count);
    }
};

UnslicedRootAggregateProposer.prototype.makeNewRootAggregateFrom = function MNRAF(deviceGroup, requiredDeviceCount, controller) {
    assert(this instanceof UnslicedRootAggregateProposer);
    assert(_.isPlainObject(deviceGroup));
    assert(_.isNumber(requiredDeviceCount));
    assert(_.isPlainObject(controller));

    // don't worry about spares: we either already dealt with that, or
    // will deal with that while making data aggregates by trying maxPossible-1,
    // or we're very short on drives as otherwise we'd not have hit the 'any'
    // option.

    if (deviceGroup.devices.length < requiredDeviceCount) {
        return;
    }

    var controllerId = controller._id, // other will get root aggr on next pass
        props = {
            strategy: this.name,
            name: this.getNonConflictingAggregateName(controllerId, 'root'),
            is_root_aggregate: true,
        };

    return this.componentBuilder.makeAggregate(controllerId, deviceGroup, requiredDeviceCount, props);
};

UnslicedRootAggregateProposer.prototype._sawSlices = function _sawSlices() {
    return _(this.hagi.controllers)
            .map('_assigned_storage')
            .filter()
            .flatten()
            .any();
};

module.exports = UnslicedRootAggregateProposer;
