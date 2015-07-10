'use strict';

var assert = require('assert'),
    events = require('events'),
    util = require('util'),
    _ = require('lodash');

var CHANGE_EVENT_NAME = 'change';

/**
 * Simple Flux-style dispatcher.
 * Sends events to stores in the order they're declared.
 * No attempt to have stores wait for other stores.
 */

function Dispatcher(stores, log) {
    assert(this instanceof Dispatcher, 'use new');
    assert(stores instanceof Array, 'invalid stores');
    assert.equal(typeof log, 'function', 'log function');

    this._stores = stores;
    this.log = log;

    events.EventEmitter(this);

    var _this = this;
    this._stores.forEach(function listenTo(store) {
        store.watch(function storeChanged() {
            _this.emit(CHANGE_EVENT_NAME, store);
        });
    });
}

util.inherits(Dispatcher, events.EventEmitter);

/**
 * Send the dispatcher a change event to be forwarded to the stores.
 */
Dispatcher.prototype.act = function() {
    var everHandled = false,
        args = arguments,
        actionArguments = _.toArray(arguments),
        action = actionArguments.shift().toLowerCase();

    this.emit('dispatch', {
        action: action,
        args: actionArguments,
    });

    this.log([ 'dispatch', action ], {
        action: action,
        args: actionArguments
    });

    this._stores.forEach(function forwardTo(store) {
        var handled = store.act.apply(store, args);
        everHandled = everHandled || handled;
    });

    if (!everHandled) {
        this.log.error('no store handled event:', args[0]);
    }

    this.emit('dispatched', {
        action: action,
        args: actionArguments,
        handled: everHandled
    });
};

/**
 * Subscribe to change notifications.
 */

Dispatcher.prototype.watch = function watch(fn) {
    this.on(CHANGE_EVENT_NAME, fn);
};

/**
 * Unsubscribe from change notifications.
 */

Dispatcher.prototype.unwatch = function unwatch(fn) {
    this.removeListener(CHANGE_EVENT_NAME, fn);
};

module.exports = Dispatcher;
