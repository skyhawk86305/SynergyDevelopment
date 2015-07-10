'use strict';

var assert = require('assert'),
    _ = require('lodash');

/**
 * Adapt an async function with one non-callback argument into an async
 * function taking two non-callback arguments -- the first one the scope --
 * that *might not* call back.
 *
 * Usage situation: if you want to only ever have one in-the-air request
 * and at most one waiting, for a given scope e.g. object being modified.
 *
 * Tip: curry or partial the scope argument to get the original API back
 * (except for the callback guarantee).
 */

function debounce(asyncFunction) {
    var scopeToStatusMap = { };

    function getScopeStatus(scope) {
        if (_.has(scopeToStatusMap, scope)) {
            return scopeToStatusMap[scope];
        } else {
            var scopeStatus = scopeToStatusMap[scope] = [];
            return scopeStatus;
        }
    }

    function debounced(scope, arg, callback) { // same API, but with scope
        assert.equal(arguments.length, 3, 'debounced: expected 3 arguments');
        assert.equal(typeof callback, 'function');
        assert.equal(typeof scope, 'string');

        var scopeStatus = getScopeStatus(scope);

        function ourCallback() {
            // Must callback before next request in case callback alters pending request
            // Must callback before shifting queue in case callback generates a new request
            // console.error('=== debounced: calling back for', scopeStatus[0][0], 'with', arguments);
            // jshint -W040
            scopeStatus[0][1].apply(this, arguments);

            scopeStatus.shift();

            if (scopeStatus[0]) {
                var next_arg = scopeStatus[0][0];
                // console.error('=== debounced: calling late for', next_arg);
                // setImmediate(asyncFunction, next_arg, ourCallback);
                asyncFunction(next_arg, ourCallback);
            }
        }

        if (scopeStatus.length) { // something is already in the air
            if (scopeStatus.length > 1) {
                // Always callback, if the request is skipped, report it as an error
                var skipped = scopeStatus.pop();
                // console.error('=== debounced: skipped', skipped[0]);
                // jshint -W040
                skipped[1].apply(this, [new Error('Skipped')]);
            }
        } else { // idle
            // console.error('=== debounced: calling for', arg);
            // setImmediate(asyncFunction, arg, ourCallback);
            asyncFunction(arg, ourCallback);
        }

        scopeStatus.push([ arg, callback ]);
    }

    return debounced;
}

module.exports = debounce;
