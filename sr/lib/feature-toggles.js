'use strict';

var _ = require('lodash'),
    assert = require('assert'),
    // jshint -W098
    version = require('../version');

/**
 * Maps feature names to values indicating whether or not they are
 * enabled. Feature names MUST begin with `FEATURE_` and end with
 * `_ENABLED` to ensure
 *
 * a) we can easily find all uses of feature toggles, and
 * b) getting a feature name wrong fails safe to disabled
 */

var TOGGLES = {
        // TODO: depend on version; remove -W098 above
        FEATURE_FP_MANUAL_ENABLED: version.branch === 'develop'
    };

// export a version of TOGGLES in which:
// - all keys are checked against FEATURE_*_ENABLED
// - all values are coerced to a boolean value
// - the object is frozen so we can't mutate it by accident

module.exports = _.mapValues(TOGGLES, function boolify(value, key) {
    assert(key.match(/^FEATURE_[A-Z0-9_]+_ENABLED$/), 'bad toggle name');
    return !!value;
});

if (Object.freeze) {
    Object.freeze(module.exports);
}
