'use strict';

var assert = require('assert'),
    _ = require('lodash'),
    util = require('util'),
    Store = require('./store'),
    getClientCache = require('../client-cache');

var DEFAULTS = {
        collapseCapacity: false,
        collapseClusters: false,
        currentSystemsView: false,
        useBase10Yields: false,
        mainsVoltage: 'v_200'
    },
    KEYS = _.keys(DEFAULTS),
    CACHE_KEY = 'synergy.preferences.user';

function UserPreferencesStore(options) {
    assert(this instanceof UserPreferencesStore, 'use new');
    assert.equal(typeof (this.log = options.log), 'function', 'options.log');

    Store.call(this, 'USER_PREFERENCES');

    this.cache = undefined;
    this.prefs = _.clone(DEFAULTS);

    var _this = this;
    getClientCache(function getCache(err, engine) {
        if (err) {
            console.error(err);
        } else {
            _this.cache = engine;
            _this.restoreCacheState();
        }
    });
}

util.inherits(UserPreferencesStore, Store);

UserPreferencesStore.prototype.getState = function getState() {
    var state = _.defaults({}, this.prefs, DEFAULTS);
    return state;
};

UserPreferencesStore.prototype.USER_PREFERENCES_ADJUST = function adjust(adjustments) {
    var unknown = _.keys(_.omit(adjustments, KEYS));
    if (_.keys(unknown).length) {
        this.log.warn('ignoring unknown user preference adjustments', unknown);
    }

    _.merge(this.prefs, _.pick(adjustments, KEYS));
    this.updateLocalStoragePrefs();
    this.changed();
};

UserPreferencesStore.prototype.restoreCacheState = function restoreCacheState() {
    if (this.cache) {
        var _this = this;
        this.log([ 'prefs', 'loading' ], '...');
        this.cache.get(CACHE_KEY, function userPrefs(err, result) {
            if (err) {
                _this.log([ 'prefs', 'load-failed' ], err);
            } else {
                _this.log([ 'prefs', 'loaded' ], { prefs: result });
                _this.prefs = result || {};
            }
        });
    }
};

UserPreferencesStore.prototype.updateLocalStoragePrefs = function updateLocalStoragePrefs() {
    if (this.cache) {
        var _this = this;
        this.log([ 'prefs', 'saving' ], '...');
        this.cache.set(CACHE_KEY, this.prefs, function (err) {
            if (err) {
                _this.log([ 'prefs', 'save-failed' ], err);
            } else {
                _this.log([ 'prefs', 'saved' ], '...');
            }
        });
    }
};

module.exports = UserPreferencesStore;
