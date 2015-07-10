'use strict';

var assert = require('assert'),
    _ = require('lodash');

// jshint camelcase: false

function getGBtag(cap) {
    assert(typeof cap === 'number');
    if (cap % 1000 === 0) {
        return Math.round(cap/1000) + 'TB';
    } else {
        return Math.round(cap) + 'GB';
    }
}

function getRPMtag(rpm) {
    if (Math.round(rpm * 10) % 10 === 0) {
        return rpm + 'K';
    } else if (rpm < 10) {
        return rpm.toPrecision(2) + 'K';
    } else {
        return rpm.toPrecision(3) + 'K';
    }
}

function autotag(query) {
    var all = query(),
        seen = {};

    function mark(key) {
        seen[key] = true;
    }

    function nox(value) {
        return value;
    }

    function pluck(key, xform) {
        _(all)
            .pluck(key)
            .filter()
            .map(xform || nox)
            .forEach(mark);
    }

    pluck('version');
    pluck('mode');
    pluck('model');
    pluck('config');
    pluck('type');
    pluck('rpm', _.memoize(getRPMtag));
    pluck('rawgb', _.memoize(getGBtag));

    return Object.keys(seen);
}

module.exports = autotag;
