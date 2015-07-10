'use strict';

var _ = require('lodash');

var PROPFUNCS = [
        devices
    ];

function AggregateInspector(init) {
    init(this); // this.inspect, this.info, this.cluster, this.hagroup, ...

    for (var idx in PROPFUNCS) {
        var fn = PROPFUNCS[idx];
        Object.defineProperty(this, fn.name, { get: _.bind(fn, this) });
    }
}

function devices() {
    // jshint -W040
    return _(this.aggregate._raid_groups || [])
        .map('_devices')
        .flatten()
        .value();
}

module.exports = AggregateInspector;
