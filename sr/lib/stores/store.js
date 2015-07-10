'use strict';

var assert = require('assert'),
    events = require('events'),
    SecurityGuard; // defined below

var CHANGE_EVENT_NAME = 'change';

function shifted(args) {
    var result = [];
    for (var idx = 1; idx < args.length; idx ++) {
        result.push(args[idx]);
    }
    return result;
}

/**
 * Flux-style store.
 * Doesn't bother being a singleton. Instead: create only one.
 * Doesn't bother proxying EventEmitter. Use `store.on('change', fn)`.
 * Could be used at EITHER END; handle persistence and comms separately!
 */

function Store(prefix) {
    assert(this instanceof Store, 'use new');
    assert(typeof(prefix) === 'string' && prefix.match(/[A-Z]+/));

    // We preserve the guard so we don't create more than one.
    // We set it null here so we can detect a subclass failing to call
    // our constructor.
    this._guard = null;

    this._prefix = prefix;
    this._emitter = new events.EventEmitter();
    this.name = prefix.toLowerCase();
}

/**
 * Let subscribers know we changed via: `this.changed();`
 */

Store.prototype.changed = function changed() {
    this._clearCaches();
    this._emitter.emit(CHANGE_EVENT_NAME);
};

/**
 * Subscribe to change notifications.
 */

Store.prototype.watch = function watch(fn) {
    this._emitter.on(CHANGE_EVENT_NAME, fn);
};

/**
 * Unsubscribe from change notifications.
 */

Store.prototype.unwatch = function unwatch(fn) {
    this._emitter.removeListener(CHANGE_EVENT_NAME, fn);
};

/**
 * Get the state to be rendered. MUST be over-ridden by the sublass.
 */

Store.prototype.getState = function getState() {
    throw new Error('subclass forgot to override getState');
};

/**
 * Clean the caches. Virtual. Called by changed().
 */

Store.prototype._clearCaches = function _clearCaches() {
    // noop
};

/**
 * Get the security guard, which presents our public API only:
 *
 * - `store.on('change', function () { var state = store.getState(); });`
 * - `store.act('EVENT_NAME', arg1, arg2, argN)`
 */

Store.prototype.getGuard = function getGuard() {
    assert(this._guard !== undefined, 'Store constructor not called');

    if (this._guard === null) {
        this._guard = new SecurityGuard(this);
    }

    return this._guard;
};

/**
 * Act on an event.
 *
 * - If `id` does not match our prefix, returns `false`.
 * - If `id` matches our prefix but no method is found, crashes.
 * - If `id` matches our prefix and a method is found:
 *   - If the argument length does not match, crashes.
 *   - Else, calls it and returns `true`.
 */

Store.prototype.act = function act(id) {
    // The identifier MUST be a string:
    assert(typeof(id) === 'string', 'need action ID');

    // Actions not matching our prefix will be ignored, returning false:
    if (id.indexOf(this._prefix + '_') < 0) {
        return false;
    }

    // Find our action method:
    var method = this[id];
    assert(typeof(method) === 'function', 'invalid action: ' + id);

    // The arguments length MUST match the method's argument length.
    // Modifying an event? Don't. Add a new one. That preserves our
    // ability to replay old event lists.
    assert(arguments.length === ( method.length + 1 ), 'invalid arg count');

    // Having survived the checks:
    method.apply(this, shifted(arguments));

    // Return true if we survived.
    return true;
};

/**
 * Prevents improper interaction with a Store by exposing only its public API.
 */

SecurityGuard = function SecurityGuard(store) {
    assert(this instanceof SecurityGuard, 'use new');
    assert(store instanceof Store, 'need Store to guard');

    this.act = store.act.bind(store);
    this.getState = store.getState.bind(store);
    this.watch = store.watch.bind(store);
    this.unwatch = store.unwatch.bind(store);
    this.name = store.name;
};

SecurityGuard.prototype.getGuard = function getGuard() {
    return this;
};

module.exports = Store;
