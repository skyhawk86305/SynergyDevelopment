'use strict';

var assert = require('assert'),
    _ = require('lodash'),
    lcprop = require('./lcprop');

var LODASH_TERMINATORS = [
        'groupBy',
    ],
    LODASH_CHAINERS = {
        // name: shouldWeKeepFilters
        'filter': true,
        'map': false
    },
    ARRAY_CHAINERS = [
        'concat',
    ];

/***
 * Apply a query API to the results.
 *
 * Goodies:
 *
 *     results.where(x) => _.where(seq, x) // with the API still present
 *     results.where(x).and(y) => results.where(x).where(y) // friendly
 *     results.where.filt1 => only those passing filt1
 *     results.where.filt2 => only those passing filt2
 *     results.where.filt1.and.filt2 => only those passing both
 *
 * Because they're arrays, any result set will NOT have where or and visible
 * when you enumerate their keys. If you apply .where or .and, you get a
 * generic filter method with visible keys for each filter.
 */

function addQueryAPI(results, filters, andMode) {
    assert(results instanceof Array, 'b7b22b45.0');
    filters = filters || {};
    assert(typeof filters === 'object' && !_.isArray(filters), 'b7b22b45.1');

    // add the invisible .where function to the array

    Object.defineProperty(results, 'where', {
        get: _.constant(where),
        enumerable: false,
        configurable: true,
    });

    _.forEach(LODASH_TERMINATORS, addLodashTerminator);
    _.forEach(LODASH_CHAINERS, addLodashChainer);
    _.forEach(ARRAY_CHAINERS, addArrayChainer);

    // add the invisible .and function to the array if it's not the first
    // result in the chain

    if (andMode) {
        Object.defineProperty(results, 'and', {
            get: _.constant(where),
            enumerable: false,
            configurable: true,
        });
    }

    // add the visible filter methods to the where/and function
    // also add them invisibly to the result set in case you're feeling terse

    _.forEach(filters, addFilter);

    return results; // ----- closures only below this point

    function addLodashTerminator(name) {
        var fn = _[name];
        assert.equal(typeof fn, 'function', 'b7b22b45.2: ' + name);
        Object.defineProperty(results, name, {
            value: _.partial(fn, results),
            enumerable: false,
            configurable: true,
        });
    }

    function addLodashChainer(keepFilters, name) {
        var fn = _[name],
            newFilters = keepFilters ? filters : {};
        assert.equal(typeof fn, 'function', 'b7b22b45.2: ' + name);
        Object.defineProperty(results, name, {
            value: function () {
                return feedExtraArgumentsAndChainFrom(fn, arguments, newFilters);
            },
            enumerable: false,
            configurable: true,
        });
    }

    function addArrayChainer(name) {
        var fn = Array.prototype[name];
        assert.equal(typeof fn, 'function', 'b7b22b45.3: ' + name);
        Object.defineProperty(results, name, {
            value: function() {
                var result = fn.apply(results, arguments);
                return addQueryAPI(result, filters, false);
            },
            enumerable: false,
            configurable: true,
        });
    }

    function addFilter(filter, name) {
        lcprop(where, name, filtered, true); // visible on where

        function filtered() {
            return addQueryAPI(_.filter(results, filter), filters, true);
        }
    }

    function where(/* args */) {
        return feedExtraArgumentsAndChainFrom(_.where, arguments);
    }

    function feedExtraArgumentsAndChainFrom(fn, _arguments, newFilters) {
        newFilters = newFilters || filters; // {} is truthy, thus kept
        var args = [ results ].concat(_.toArray(_arguments));
        return addQueryAPI(fn.apply(results, args), newFilters, true);
    }
}

module.exports = addQueryAPI;
