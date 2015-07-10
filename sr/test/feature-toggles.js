'use strict';

var assert = require('assert'),
    toggles = require('../lib/feature-toggles'),
    _ = require('lodash'),
    lab = require('lab');

lab.experiment('feature-toggles', function () {
    lab.test('exports a plain object', function (done) {
        assert(_.isPlainObject(toggles));
        done();
    });

    lab.test('exports a frozen object', function (done) {
        assert(Object.isFrozen(toggles));
        done();
    });

    lab.test('all keys start with FEATURE_', function (done) {
        _.forEach(toggles, function (value, key) {
            assert(key.match(/^FEATURE_/));
        });
        done();
    });

    lab.test('all keys end with _ENABLED', function (done) {
        _.forEach(toggles, function (value, key) {
            assert(key.match(/_ENABLED$/));
        });
        done();
    });

    lab.test('all values are boolean', function (done) {
        _.forEach(toggles, function (value) {
            assert.equal(typeof value, 'boolean');
        });
        done();
    });
});
