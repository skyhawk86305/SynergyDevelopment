'use strict';

var assert = require('assert'),
    _ = require('lodash');

module.exports = function includeClip(envelope) {
    assert(envelope instanceof Object || !(envelope instanceof Array));
    var requireOneOf = [ 'hagroups', 'synergy_model'],
        present = _.intersection(envelope._keys, requireOneOf),
        betaClip = (envelope._timestamp || 0) < 1419397200000; // 24 Dec 2014 05:00:00 GMT
    return !!present.length && !betaClip;
};
