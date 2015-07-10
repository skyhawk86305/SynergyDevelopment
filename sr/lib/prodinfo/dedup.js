'use strict';

var _ = require('lodash');

function dedup(raw) { // MODIFY-IN-PLACE
    var unique = [],
        fpdb = {},
        hits = 0,
        misses = 0;

    _.forEach(raw.platforms, dedupPlatform);
    raw.limits = unique;
    return;

    function dedupPlatform(platform) {
        _.forEach(platform.models, dedupModel);
    }

    function dedupModel(model) {
        _.forEach(model.systems, dedupSystem);
    }

    function dedupSystem(system) {
        _.forEach(system.os_limits, dedupOS);
    }

    function dedupOS(os) {
        var fp = JSON.stringify(os.limits),
            limits = fpdb[fp];

        if (limits === undefined) {
            misses++;
            limits = _.cloneDeep(os.limits);
            limits._index = unique.length;
            unique.push(limits);
            fpdb[fp] = limits;
        } else {
            hits++;
        }

        os.limits = limits._index;
    }
}

module.exports = dedup;
