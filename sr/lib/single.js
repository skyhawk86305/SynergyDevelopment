'use strict';

var assert = require('assert'),
    _ = require('lodash');

function single(arr, constraint) {
    assert.equal(_.isArray(arr), true, 'single: not array');

    if (constraint) {
        return single(_.where(arr, constraint));
    } else {
        assert.equal(arr.length, 1, 'single: ' + arr.length + ' !== 1');
        return arr[0];
    }
}

module.exports = single;
