'use strict';

var _ = require('lodash'),
    assert = require('assert');

function _xform(spec, path, ob, index) {
    if (arguments.length === 2) {
        return _.partial(_xform, spec, path);
    }

    if (ob === undefined) {
        return ob;
    }

    if (arguments.length > 3) {
        path = path + '[' + index + ']';
    }

    var result = {};
    for (var k in spec) {
        var kpath = path + '.' + k,
            kspec = spec[k],
            v = ob[k];

        // entirely absent
        if (!_.has(ob, k) && typeof kspec === 'boolean') {
            // do nothing

        // true: v => v
        } else if (kspec === true) {
            if (!_.has(ob, k)) {
                // nothing to preserve; do nothing
            }
            if (v === null || v === undefined) {
                result[k] = v;
            } else {
                assert(!(v instanceof Array), kpath + ': array needs spec');
                assert.notEqual(typeof v, 'object', kpath + ': object needs spec');
                result[k] = v;
            }

        // false: v => nothing
        } else if (kspec === false) {
            // do nothing

        // fn: v => fn(v, kpath)
        } else if (typeof kspec === 'function') {
            result[k] = kspec(v, kpath);

        // [ fn ]: [ a, b ] => [ fn(a), fn(b) ]
        } else if (kspec instanceof Array) {
            assert(kspec.length === 1, kpath + ': array specs must have one member');
            var memberSpec = kspec[0];

            if (v === undefined || k === null) {
                result[k] = v;
            } else {
                assert(v instanceof Array, kpath + ': value not an array');
                if (_.isPlainObject(memberSpec)) {
                    result[k] = _.map(v, _xform(memberSpec, kpath));
                } else if (typeof memberSpec === 'function') {
                    result[k] = _.map(v, memberSpec);
                } else {
                    assert(false, kpath + ': invalid array spec');
                }
            }

        // { ... }: v => xform({ ... }, v)
        } else if (_.isPlainObject(kspec)) {
            result[k] = _xform(kspec, kpath, v);

        } else { // die
            try {
                console.error('invalid spec:', kspec);
            } catch (err) {
                // ignore
            }
            assert(false, kpath + ': invalid spec');
        }
    }
    return result;
}

function xform(spec, ob, path) {
    if (arguments.length === 1) {
        return _.partial(xform, spec);
    }

    if (arguments.length === 2 && typeof ob === 'string') {
        return _.partial(_xform, spec, path);
    }

    return _xform(spec, path || 'top', ob);
}

function setdefault(defaultValue, expectedType) {
    if (typeof defaultValue === 'function') {
        assert.notEqual(
            expectedType,
            undefined,
            'need expectedType for function defaults');
        return fromFunction;
    } else {
        expectedType = expectedType || typeof defaultValue;
        // not sure why you're getting default type mismatch?
        // maybe you used a partial of _default in your xform
        // spec without calling it, so the first arguments are
        // value and kpath...
        assert.equal(typeof defaultValue, expectedType, 'default type mismatch');
        return fromValue;
    }

    function fromValue(value, kpath) {
        if (value === undefined) {
            return defaultValue;
        } else {
            return checked(value, kpath, expectedType);
        }
    }

    function fromFunction(value, kpath) {
        if (value === undefined) {
            return checked(defaultValue(), kpath, expectedType, ' from default function');
        } else {
            return checked(value, kpath, expectedType);
        }
    }

    function checked(value, kpath, expectedType, from) {
        from = from || '';

        if (typeof expectedType === 'function') {
            try {
                return expectedType(value, kpath);
            } catch (err) {
                if (err.message && err.message.indexOf(kpath) === 0) {
                    throw err;
                } else {
                    var msg = err.message || err.toString(),
                        err2 = new Error(kpath + ': ' + msg + from);
                    err2.original = err;
                    throw err2;
                }
            }
        } else {
            assert.equal(
                typeof value,
                expectedType,
                kpath + ': type mismatch' + from);
            return value;
        }
    }
}

function constant(defaultValue) {
    var repr = JSON.stringify(defaultValue);

    return function _constant(value, kpath) {
        if (value === undefined) {
            return defaultValue;
        } else {
            assert.equal(value, defaultValue, kpath + ' !== ' + repr);
            return value;
        }
    };
}

xform.setdefault = setdefault;
xform.constant = constant;
module.exports = xform;
