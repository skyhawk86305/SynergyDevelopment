'use strict';

var xform = require('../lib/xform'),
    assert = require('assert'),
    ModelMap = require('../lib/model/map'),
    React = require('react'),
    _ = require('lodash');

// By the time we hit Hardware, we have a few props we tend to pass all the
// way down:
//
// map - a map of the model
// fire - the method by which we dispatch change commands
// log - the method by which we log through to the server
//
// <ChildComponent { ... usual(this.props) } /> will get the usual props
// after exceptions have been thrown for any that are defined but don't
// look right.
//
// propTypes: _.merge({}, usual) to have React check that any usual props
// have the right type. It's not as strict as what'll happen at the next
// use of { ... usual (this.props) }, but you'll find out earlier.
//
// propTypes: _.merge({}, usual.isRequired) to have React check that any
// usual props have the right type AND are present.

// detail: ----------------------------------------------------------------

// SPEC maps from prop keys to xform validator functions wearing optional
// propCheck validators for React:

var SPEC = {
        fire: optional(fn()),
        log: optional(fn()),
        map: optional(instance(ModelMap)),
    };

// usual function calls xform with SPEC:

function usual(props) {
    return xform(SPEC, props, 'props');
}

// usual[key] for use in propTypes:

_.forEach(SPEC, function (checkFn, key) {
    if (checkFn.propCheck) {
        usual[key] = checkFn.propCheck;
    }
});

// usual.isRequired also maps from key to a propType, but with isRequired
// where possible. Object.defineProperty makes it available without it
// appearing in the object's keys, so React won't try to treat isRequired
// itself as a prop:

Object.defineProperty(usual, 'isRequired', {
    get: function getReactValidatorsAsRequired() {
        return _.mapValues(usual, function makeRequired(value) {
            if (typeof value.isRequired === 'function') {
                return value.isRequired;
            } else {
                return value;
            }
        });
    }
});

function optional(validator) {
    return propChecked(checkFn, validator.propCheck);

    function checkFn(value, kpath) {
        if (value === undefined) {
            return undefined;
        } else {
            return validator(value, kpath);
        }
    }
}

function fn(arity) {
    return propChecked(checkFn, React.PropTypes.func);

    function checkFn(value, kpath) {
        assert.equal(typeof value, 'function', kpath + ': not function');
        if (typeof arity === 'number') {
            assert.equal(value.length, arity, kpath + ': need ' + arity + '-arity');
        }
        return value;
    }
}

function instance(Class) {
    return propChecked(checkFn, React.PropTypes.object);

    function checkFn(value, kpath) {
        assert(value instanceof Class, 'function', kpath + ': not ' + Class.name);
        return value;
    }
}

function propChecked(fn, reactPropCheck) {
    if (reactPropCheck) {
        fn.propCheck = reactPropCheck;
    }

    return fn;
}

module.exports = usual;
