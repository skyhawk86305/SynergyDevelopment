'use strict';

var assert = require('assert'),
    _ = require('lodash');

/**
 * Counts unique items put into it.
 */

function CountingBag() {
    assert(this instanceof CountingBag);
    this._contents = {};
    this._counts = {};
}

CountingBag.prototype._makeStableClone = function (item) {
    var keys = _(item).keys().sort().value();
    return _.pick(item, keys);
};

CountingBag.prototype.add = function (item, count) {
    if (count === undefined) {
        count = 1;
    }

    assert(_.isPlainObject(item));
    assert(_.isNumber(count));
    assert(arguments.length <= 2);
    assert(!('_count' in item), '\'_count\' key is reserved');
    assert(_.keys(item).length, 'zero-size objects are pointless');

    var clone = this._makeStableClone(item),
        key = JSON.stringify(clone);
    if (key in this._counts) {
        this._counts[key] += count;
    } else {
        this._counts[key] = count;
        this._contents[key] = clone;
    }
};

CountingBag.prototype.dump = function () {
    assert(arguments.length === 0);

    var results = [];

    for (var key in this._counts) {
        var count = this._counts[key],
            item = this._contents[key];
        item._count = count; // does not affect later add or dump
        results.push(item);
    }

    return results;
};

module.exports = CountingBag;
