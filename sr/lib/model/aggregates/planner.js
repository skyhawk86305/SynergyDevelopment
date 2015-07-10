'use strict';

var assert = require('assert'),
    _ = require('lodash'),
    dump = require('../../dump'),
    SlicedRootAggregateProposer = require('./plans/propose-root-sliced'),
    UnlicedRootAggregateProposer = require('./plans/propose-root-unsliced'),
    DataAggregateProposer = require('./plans/propose-data'),
    ESeriesDrivePoolProposer = require('./plans/propose-ddp'),
    AggregateReporter = require('./aggregateReporter'),
    mutil = require('../util');

dump(); // make linter happy

var PROPOSERS = [
        SlicedRootAggregateProposer,
        UnlicedRootAggregateProposer,
        DataAggregateProposer,
        ESeriesDrivePoolProposer
    ];

function AggregatePlanner(hagi) {
    assert(this instanceof AggregatePlanner);
    assert(hagi);

    this.hagi = hagi;

    this.proposers = _.clone(PROPOSERS);
}

/**
 * Return new planned aggregates for the hagroup named in hagi.
 */

AggregatePlanner.prototype.bestPlan = function bestPlan() {
    assert(this instanceof AggregatePlanner);

    var hagi = this.hagi;

    var deviceGroups = availableDevicesGroupedByUtility(hagi),
        preserved = hagi.aggregates.where.manual,
        attempts = this.makeAttempts(deviceGroups, preserved),
        sortedAttempts = _.sortBy(attempts, this.scoreAttempt, this),
        winner = _.last(sortedAttempts),
        newAggregates = winner ? winner.slice(preserved.length) : [];

    return newAggregates;
};

AggregatePlanner.prototype.scoreAttempt = function scoreAttempt(attempt) {
    assert(this instanceof AggregatePlanner);
    var aggrByController = _.groupBy(attempt, '_controller'),
        yieldsByController = _.mapValues(aggrByController, this._estimateAggrsDataYield, this),
        yields = _.values(yieldsByController),
        // intervene here to add penalty factor for lopsided yield
        aggrCountPenaltyFactor = 1 - 0.02 * attempt.length;

    return sum(yields) * aggrCountPenaltyFactor;
};

AggregatePlanner.prototype._estimateAggrsDataYield = function _estimateAggrsDataYield(aggrs) {
    return sum(_.map(aggrs, this._estimateAggrDataYield, this));
};

AggregatePlanner.prototype._estimateAggrDataYield = function _estimateAggrDataYield(aggr) {
    assert(this instanceof AggregatePlanner);
    var report = new AggregateReporter(this.hagi).createAggregateReport(aggr).summary,
        usableGiB = report.usableCapacity, // unit?
        minRootMiB = this.hagi.limits.aggr.root_aggr_size_mib,
        minRootGiB = minRootMiB / 1024;

    if (aggr.is_root_aggregate) {

        // If the aggregate is homogeonous and has the same drive count as
        // the minimum required, we treat the aggregate as a dedicated root
        // and don't give it credit for any data yield even if due to drive
        // rounding it has significantly greater capacity than required.
        //
        // Otherwise, we treat the aggregate as a non-dedicated root and
        // give it credit for any data capacity over the minimum required.

        var firstSpec = aggr._raid_groups[0].__deviceSpecs[0].spec,
            minCount = this.hagi.lookup.minimalRootAggregateDriveCount(firstSpec, aggr.raid_type),
            isDedicated = aggr._raid_groups.length === 1 &&
                          aggr._raid_groups[0].__deviceSpecs.length === 1 &&
                          aggr._raid_groups[0]._devices.length === minCount;

        if (isDedicated || this.hagi.configGroup.id === 'c-mode') {
            return 0;
        } else if (usableGiB > 0) {
            console.error('TODO: remove non-dedicated root compensation code');
            return usableGiB;
        } else {
            assert(report.rootCapacity > 0); // how can these both be 0?
            return report.rootCapacity - minRootGiB; // TODO: ensure unit not mismatched
        }
    } else {
        return usableGiB;
    }
};

/**
 * Make a proposer. Performed fresh each round of makeAttempts.
 */

AggregatePlanner.prototype.makeProposers = function makeProposers(deviceGroups, aggregates) {
    assert(this instanceof AggregatePlanner);
    assert(_.isArray(deviceGroups));
    assert(_.isArray(aggregates));

    deviceGroups = _.clone(deviceGroups);
    aggregates = _.clone(aggregates);

    return _.map(PROPOSERS, create, this);

    function create(Proposer) {
        // jshint -W040
        assert(this instanceof AggregatePlanner);
        return new Proposer(this.hagi, deviceGroups, aggregates);
    }
};

/**
 * Make many attempts to consume deviceGroups and extend aggregates.
 * Returns an array of possibilities, each one of which is an array of
 * aggregates starting with the original aggregates to assist scoring.
 */

AggregatePlanner.prototype.makeAttempts = function makeAttempts(deviceGroups, aggregates, depth) {
    // Recursive, but only to a depth matching the number of different kinds
    // of devices we were fed.
    assert(this instanceof AggregatePlanner);
    aggregates = aggregates || [];
    depth = depth || 0;
    assert(deviceGroups instanceof Array);
    assert(aggregates instanceof Array);
    assert.equal(typeof depth, 'number');
    assert(_.all(aggregates, _.isPlainObject));

    if (!deviceGroups.length) {
        return [ aggregates ];
    }

    // NEXT: separate out the getting possible plans part from the
    // recursing part. Might work out best if the function(s) providing
    // the plans can return 0+ plans.

    var proposals = _(this.makeProposers(deviceGroups, aggregates))
            .map(propose, this)            // -> array of (array|null)
            .filter()                      // -> array of arrays
            .value();

    assert(_.all(proposals, _.isPlainObject));

    var newTails = [];

    _.forEach(proposals, function pushNewTails(proposal) {
        switch (proposal.mode) {
            case 'all':
                return newTails.push(proposal.aggregates);
            case 'any':
                return _.forEach(proposal.aggregates, function (aggr) {
                    newTails.push([ aggr ]);
                });
            default:
                throw new Error('fan out mode');
        }
    });

    assert(_.all(newTails, _.isArray));

    var results = []; // array of arrays of objects, we hope

    _.forEach(newTails, function (tail) {
        assert(this instanceof AggregatePlanner);
        assert(tail instanceof Array);
        assert(tail.length > 0);
        assert(_.all(tail, _.isPlainObject));

        var proposalsFromTail = _.bind(proposeAgain, this)(tail);

        _.forEach(proposalsFromTail, function (proposal) {
            assert(proposal instanceof Array);
            assert(_.all(proposal, _.isPlainObject));
            results.push(proposal);
        });
    }, this);

    return results;

    // Apply a proposal function to get a list of proposed lists of new
    // aggregates. If no aggregates are proposed, return null so that
    // the filter can easily take it out.
    function propose(proposer) {
        // jshint -W040
        assert(this instanceof AggregatePlanner);
        assert.equal(typeof proposer.propose, 'function');

        var proposal = proposer.propose.call(proposer, deviceGroups, aggregates);

        checkProposal(proposal);
        if (proposal) {
            if (proposal.aggregates.length === 0) {
                return null;
            }
        }
        return proposal;
    }

    function checkProposal(proposal) {
        if (proposal) {
            assert(_.isPlainObject(proposal));
            assert(proposal.mode === 'any' || proposal.mode === 'all');
            assert(proposal.aggregates instanceof Array);
            if (proposal.aggregates.length > 0) {
                assert(_.all(proposal.aggregates, _.isPlainObject));
            }
        }
    }

    function proposeAgain(newAggregates) {
        // jshint -W040
        assert(this instanceof AggregatePlanner);
        var remainingDeviceGroups = filterDeviceGroupsRemovingDevicesUsedBy(deviceGroups, newAggregates),
            allAggregates = aggregates.concat(newAggregates),
            resultsStartingHere = this.makeAttempts(remainingDeviceGroups, allAggregates, depth + 1);

        if (resultsStartingHere.length) {
            return resultsStartingHere; // Continue the merry dance.
        } else {
            return [ allAggregates ];   // That's all, folks.
        }
    }
};

function sum(seq) {
    return _.reduce(seq, function accsum(sum, n) {
        return sum + n;
    });
}

function filterDeviceGroupsRemovingDevicesUsedBy(deviceGroups, aggregates) {
    assert(deviceGroups instanceof Array);
    assert(aggregates instanceof Array);
    var consumedDevices = _(aggregates)
            .map('_raid_groups').flatten()
            .map('_devices').flatten()
            .value(),
        wasConsumed = _.partial(_.has, _.zipObject(consumedDevices)),
        result = filterDeviceGroupsByConstraint(deviceGroups, not(wasConsumed));
    return result;
}

function not(fn) {
    return function () {
        return !fn.apply({}, arguments);
    };
}

function filterDeviceGroupsByConstraint(deviceGroups, constraint) {
    return _.filter(_.map(deviceGroups, adjustDeviceGroup));

    function adjustDeviceGroup(deviceGroup) {
        var newDevices = _.filter(deviceGroup.devices, constraint);
        if (newDevices.length) {
            return {
                spec: deviceGroup.spec,
                devices: newDevices,
            };
        } else {
            return null;
        }
    }
}

function availableDevicesGroupedByUtility(hagi) {
    assert(hagi);

    var unlocked = hagi.deviceInfo.where.unlocked,
        avoidFPSSD = getFPSSDAvoidance(hagi, unlocked);

    var availableBySpecKey = unlocked
            .and(useful)
            .groupBy(mutil.minimalSpecKey);
    return _.map(availableBySpecKey, unpack);

    function useful(info) {
        var spec = info.spec,
            virtual = info.virtual,
            physical = !virtual,
            unSliced = physical && !_.any(info.consumers, { _type: 'slice' }),
            sliceOrUnSliced = virtual || unSliced,
            avoidedSSD = avoidFPSSD && spec.type === 'SSD' && spec.fp_support;

        return sliceOrUnSliced && !avoidedSSD;
    }

    function unpack(infos, key) {
        return {
            spec: JSON.parse(key),
            devices: _.map(infos, 'id')
        };
    }
}

function getFPSSDAvoidance(hagi, infos) {
    var fpParticipants = infos.where.physical.and(fpOK).groupBy(isSSD),
        fpLikely = _.keys(fpParticipants).length > 1; // SSD and non-SSD

    // TODO: fix policies
    var policies = hagi.hagroup._policies || {},
        aggrPolicies = policies.Aggregates || {},
        ssdsForFlashPool = aggrPolicies.ssdsForFlashPool;

    if (ssdsForFlashPool === undefined) {
        ssdsForFlashPool = true;
    }

    return ssdsForFlashPool && fpLikely;

    function isSSD(info) {
        return info.spec.type === 'SSD';
    }

    function fpOK(info) {
        return !!info.spec.fp_support;
    }
}

module.exports = function planAggregates(hagi) {
    var worker = new AggregatePlanner(hagi);
    return worker.bestPlan();
};
