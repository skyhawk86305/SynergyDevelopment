'use strict';

var _ = require('lodash'),
    assert = require('assert');

var TYPE = 0,
    DEFAULT = 1,
    FIX = 2;

function enforce(spec, ob) {
    assert(_.isPlainObject(ob), 'bad object');
    assert(_.isPlainObject(spec), 'bad spec');

    var extras = _.omit(ob, _.keys(spec)),
        result = {};

    assert(_.keys(extras).length === 0, 'bad key(s): ' + _.keys(extras).join(', '));

    _.forEach(spec, copyOrSetDefault);
    return result;

    function copyOrSetDefault(spec, key) {
        if (typeof spec === 'string' || typeof spec === 'function') {
            spec = [ spec ];
        }

        assert(_.isArray(spec), 'bad spec for ' + key + ': ' + spec);
        assert(spec.length >= 1 && spec.length <= 3, 'bad spec length for ' + key);

        var value;

        if (_.has(ob, key)) {
            value = ob[key];
        } else {
            assert(_.has(spec, DEFAULT), 'no default for ' + key);
            value = spec[DEFAULT];
        }

        if (_.has(spec, TYPE)) {
            if (typeof spec[TYPE] === 'function') {
                assert(value instanceof spec[TYPE], 'bad class for ' + key);
            } else {
                assert.equal(typeof spec[TYPE], 'string', 'bad spec type for ' + key);
                assert.equal(typeof value, spec[TYPE], 'invalid type for ' + key);
            }
        }

        if (_.has(spec, FIX)) {
            result[key] = spec[FIX](value);
        } else {
            result[key] = value;
        }
    }
}

module.exports = enforce;
