'use strict';

var assert = require('assert'),
    _ = require('lodash'),
    lcprop = require('../../../lcprop'),
    dump = require('../../../dump'),
    ComponentBuilder = require('../component-builder');

dump(); // make linter happy

function AggregateProposer(hagi, deviceGroups, aggregates) {
    assert(this instanceof AggregateProposer);
    assert(hagi);
    assert(_.isArray(deviceGroups));
    assert(_.isArray(aggregates));

    this.hagi = hagi;
    this.deviceGroups = deviceGroups;
    this.aggregates = aggregates;

    // ensure concrete classes provide vital properties
    assert.equal(typeof this.propose, 'function');
    assert.equal(typeof this.name, 'string');

    // add read-only cached lazy props
    lcprop(this, 'controllerIds', this._get_controllerIds);
    lcprop(this, 'controllersWithoutRoot', this._get_controllersWithoutRoot);
    lcprop(this, 'isFAS', this._get_isFAS);
    lcprop(this, 'knownAggregatesInHagroupIncludingProposed', this._get_knownAggregatesInHagroupIncludingProposed);
    lcprop(this, 'rootSliceCountForSystem', this._get_rootSliceCountForSystem);
    lcprop(this, 'specById', this._get_specById);

    this.componentBuilder = new ComponentBuilder(hagi);
}

/**
 * Find a non-conflicting name for a new aggregate on the controller, using
 * the controller name and suffix as a basis. Required here because we're
 * taking into account real aggregates on other HA groups in the cluster,
 * but the proposed aggregates on this HA group.
 */

AggregateProposer.prototype.getNonConflictingAggregateName = function ANIT(controller, suffix) {
    // long assertion block; sorry
    suffix = suffix || 'aggr';
    assert.equal(typeof suffix, 'string');
    controller = this.findControllerDespiteAmbiguousReference(controller);

    var controllerName = controller.name || controller._id.slice(0, 8),
        cleanPrefix = controllerName.toLowerCase().replace(/[^a-z0-9_]+/g, '_'),
        startingWith = cleanPrefix + '_' + suffix,
        names = _.map(this.knownAggregatesInHagroupIncludingProposed, 'name'),
        map = _.zipObject(names),
        isTaken = _.partial(_.has, map),
        idx;

    if (!isTaken(startingWith)) {
        return startingWith;
    }

    for (idx = 0; isTaken(startingWith + idx); idx++) {
        // idx++ above already took care of it
    }

    return startingWith + idx;
};

/**
 * Resolve an ambiguous controller reference into a controller object.
 * Public because it might be useful.
 */

AggregateProposer.prototype.findControllerDespiteAmbiguousReference = function FCDAR(controller) {
    assert(this instanceof AggregateProposer);
    if (typeof controller === 'string') {
        return this.hagi.find.controller(controller);
    } else {
        assert(_.isPlainObject(controller));
        assert.equal(typeof controller._id, 'string');
        return this.hagi.find.controller(controller._id);
    }
};

/**
 * Return a value indicating whether, according to the proposed aggregates,
 * the referenced controller has a root aggregate.
 */

AggregateProposer.prototype.isMissingRootAggregateFor = function MRAF(controller) {
    assert(this instanceof AggregateProposer);
    controller = this.findControllerDespiteAmbiguousReference(controller);
    return !_.some(this.aggregates, {
        _controller: controller._id,
        is_root_aggregate: true
    });
};

/**
 * Count the drives matching spec from all the aggregates on a controller.
 */

 AggregateProposer.prototype.liveDevicesForSpecAndController = function liveDevicesForSpecAndController(spec, controller) {
    assert(this instanceof AggregateProposer);
    assert(_.isPlainObject(spec));
    controller = this.findControllerDespiteAmbiguousReference(controller);
    assert(_.isPlainObject(controller));

    var count = 0;

    _(this.aggregates)
        .where({ _controller: controller._id })
        .map('_raid_groups').flatten()
        .map('_devices').flatten()
        .map(getSpecById, this)
        .where(spec)
        .forEach(increment);

    return count;

    function getSpecById(id) {
        // jshint -W040
        assert(this instanceof AggregateProposer);
        return this.specById[id];
    }

    function increment() {
        count += 1;
    }
};

/**
 * Report the spares required for count plus any extra arguments.
 * If count is 0, assumes this is the first raid group being added.
 */

AggregateProposer.prototype.sparesFor = function sparesFor(count) {
    assert.equal(typeof count, 'number');

    var total = count;
    for (var idx = 1; idx < arguments.length; idx++) {
        assert.equal(typeof arguments[idx], 'number');
        total += arguments[idx];
    }

    var situation = {
            // TODO: look up raidCount in aggrs on this controller:
            sparesLevel: this._getSparesPolicy(),
            deviceCount: total,
            raidCount: count === 0 ? 1 : Number.MAX_VALUE,
            // isEmbeddedShelfOnly supplied by lookup
        };
    return this.hagi.lookup.expectedSpares(situation);
};

AggregateProposer.prototype._getSparesPolicy = function _getSparesPolicy() {
    // jshint laxbreak: true
    return this.hagi.hagroup._policies
        && this.hagi.hagroup._policies.spare_allocation
        && this.hagi.hagroup._policies.spare_allocation.enforce
        && this._getShelvesCount() > 1 // lean to minimum on single shelf
        ? this.hagi.hagroup._policies.spare_allocation.enforce.toLowerCase()
        :'minimum';
};

AggregateProposer.prototype._getShelvesCount = function _getShelvesCount() {
    return _(this.hagi.deviceInfo).groupBy('shelf').keys().value().length;
};

// query APIs, used as getters for cached props

AggregateProposer.prototype._get_controllersWithoutRoot = function FCWR() {
    assert(this instanceof AggregateProposer);
    return _(this.hagi.controllers)
            .filter(this.isMissingRootAggregateFor, this)
            .value();
};

AggregateProposer.prototype._get_knownAggregatesInHagroupIncludingProposed = function GKAIHIP() {
    assert(this instanceof AggregateProposer);
    var result = this.aggregates.slice(0); // clone

    if (!this.hagi.cluster) {
        return result;
    }

    _.forEach(this.hagi.cluster.hagroups, function (other) {
        var otherHagi = this.hagi.inspect(other);
        if (otherHagi.hagroup._id !== this.hagi.hagroup._id) {
            result = result.concat(otherHagi.aggregates);
        }
    }, this);

    return result;
};

AggregateProposer.prototype._get_specById = function GSBI() {
    assert(this instanceof AggregateProposer);
    var result = {};
    _.forEach(this.hagi.deviceInfo, function (info) {
        result[info.id] = info.spec;
    });
    return result;
};

AggregateProposer.prototype._get_infoById = function GIBI() {
    assert(this instanceof AggregateProposer);
    var result = {};
    _.forEach(this.hagi.deviceInfo, function (info) {
        result[info.id] = info;
    });
    return result;
};

AggregateProposer.prototype._get_controllerIds = function GCI() {
    assert(this instanceof AggregateProposer);
    return this.hagi.controllers.map('_id');
};

AggregateProposer.prototype._get_rootSliceCountForSystem = function GRSCFS() {
    assert(this instanceof AggregateProposer);
    return this.hagi.deviceInfo.where(isRootSlice).length;
};

function isRootSlice(info) {
    return info.spec.slice === 'P2' && info.spec._for_controller !== 'undefined';
}

AggregateProposer.prototype._get_isFAS = function isFAS() {
    assert(this instanceof AggregateProposer);

    var configGroup = this.hagi.configGroup,
        parentGroup = this.hagi.configGroup.parent || {};

    return configGroup.id === 'FAS' || parentGroup.id === 'FAS';
};

module.exports = AggregateProposer;
