'use strict';

var assert = require('assert'),
    _ = require('lodash'),
    util = require('util'),
    Store = require('./store'),
    getClientCache = require('../client-cache');

function Hardware() {
    assert(this instanceof Hardware, 'use new');

    Store.call(this, 'HARDWARE');

    this.cache = null;
    this.col2View = null;
    this.col3View = null;
    this.selector = null;
    this.uuid = null;

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

util.inherits(Hardware, Store);

Hardware.prototype.getState = function getState() {
    return {
        uuid: this.uuid,
        selector: this.selector,
        col2View: this.col2View,
        col3View: this.col3View
    };
};

Hardware.prototype.HARDWARE_CLEAR = function clear() {
    this.col2View = null;
    this.col3View = null;
    this.selector = null;
    this.uuid = null;

    this.saveToLocalStorage();
    this.changed();
};

Hardware.prototype.HARDWARE_SELECT = function select(uuid, selector, col2View, col3View) {
    assert(typeof uuid === 'string', 'string uuid');

    this.col2View = col2View || null;
    this.col3View = col3View || null;
    this.selector = selector || null;
    this.uuid = uuid;

    this.saveToLocalStorage();
    this.changed();
};

Hardware.prototype.restoreCacheState = function restoreCacheState() {
    if (this.cache) {
        var _this = this;

        this.cache.get('synergy.hardware.selection', function getSelection(err, result) {
            if (err) {
                console.error(err);
            } else if (_this.isValidSelection(result)) {
                _this.col2View = result.col2View || null;
                _this.col3View = result.col3View || null;
                _this.selector = result.selector || null;
                _this.uuid = result.uuid;
            } else {
                _this.col2View = null;
                _this.col3View = null;
                _this.selector = null;
                _this.uuid = null;
            }
        });
    }
};

Hardware.prototype.saveToLocalStorage = function saveToLocalStorage() {
    if (this.cache) {
        var state = {
                uuid: this.uuid,
                selector: this.selector,
                col2View: this.col2View,
                col3View: this.col3View
            },
            selection = this.isValidSelection(state) ? state : {};

        this.cache.set('synergy.hardware.selection', selection, _.noop);
    }
};

Hardware.prototype.isValidSelection = function isValidSelection(selection) {
    var uuid = _(selection).has('uuid') && selection.uuid,
        selector = _(selection).has('selector'),
        col2View = _(selection).has('col2View');

    return uuid && selector && col2View;
};

module.exports = Hardware;
