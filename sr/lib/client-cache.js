'use strict';

var assert = require('assert'),
    util = require('util'),
    _ = require('lodash');

/**
 * Abstract client cache with an asynchronous interface so we can use
 * async back-ends such as IndexedDB.
 */

function ClientCache() {
    assert(this instanceof ClientCache, 'use new');
    assert(typeof this._init === 'function', 'define _init');
    assert(typeof this._get === 'function', 'define _get');
    assert(typeof this._set === 'function', 'define _set');
    this.poisoned = {};
}

/**
 * Initialise the client cache. MUST call back with either an error
 * as the first argument (failed), or a falsey first argument and either
 * true (OK and ready) or false (not supported) as the second.
 */

ClientCache.prototype.init = function init(callback) {
    assert(typeof callback === 'function');
    var name = this.constructor.name;

    function onCompletion(err, supported) {
        if (err) {
            try {
                assert(err instanceof Error);
                assert(arguments.length === 1);
            } catch (err2) {
                console.error('cache:', name, '_init mis-reports errors');
            }
            console.error('cannot initialise', name, err);
            callback(err);
            return;
        } else {
            try {
                assert(typeof supported === 'boolean');
            } catch (err3) {
                console.error('cache:', name, '_init mis-reports success');
            }
            callback(null, !!supported);
        }
    }

    try {
        this._init(onCompletion);
    } catch (err4) {
        callback(err4);
    }
};

/**
 * Get a value from the cache. Wraps backing _get method. Logs crashes and
 * failures, calling back as if the value is absent in both cases. If the
 * most recent set for a key failed, calls back as if the key is absent.
 */

ClientCache.prototype.get = function get(key, callback) {
    assert(typeof key === 'string');
    assert(typeof callback === 'function');

    var value;

    function onValue(err, value) {
        if (err) {
            console.error('cache: error getting', key, err);
            value = undefined;
        }
        callback(null, value);
        callback = _.noop;
    }

    if (this.poisoned[key]) {
        callback(null, undefined);
        return;
    }

    try {
        value = this._get(key, onValue);
    } catch (err) {
        console.error('cache: crash getting', key, err);
        callback(null, undefined);
    }
};

/**
 * Set a value in the cache. Wraps backing _set method. Logs crashes and
 * failures, calling back as if the operation succeeded but poisoning the
 * key so that subsequent gets fail silently until a later set succeeds.
 */

ClientCache.prototype.set = function set(key, value, callback) {
    assert(typeof key === 'string');
    assert(typeof callback === 'function');
    var poisoned = this.poisoned;

    function onCompletion(err) {
        if (err) {
            console.error('cache: error setting', key, err);
            poisoned[key] = true;
        } else {
            delete poisoned[key];
        }

        callback(null);
        callback = _.noop;
    }

    try {
        this._set(key, value, onCompletion);
    } catch (err) {
        console.error('cache: crash setting', key, err);
        poisoned[key] = true;
        callback(null);
    }
};

/**
 * Remove a value from the cache. Wraps backing _remove method. Logs crashes and
 * failures, calling back as if the operation succeeded but poisoning the
 * key so that subsequent gets fail silently until a later set or remove succeeds.
 */

ClientCache.prototype.remove = function remove(key, callback) {
    assert(typeof key === 'string');
    assert(typeof callback === 'function');
    var poisoned = this.poisoned;

    function onCompletion(err) {
        if (err) {
            console.error('cache: error removing', key, err);
            poisoned[key] = true;
        } else {
            delete poisoned[key];
        }

        callback(null);
        callback = _.noop;
    }

    try {
        this._remove(key, onCompletion);
    } catch (err) {
        console.error('cache: crash removing', key, err);
        poisoned[key] = true;
        callback(null);
    }
};

/**
 * A do-nothing fallback cache.
 */

function NullCache() {
    assert(this instanceof NullCache, 'use new');
    ClientCache.call(this);
    this.ok = true;
}

util.inherits(NullCache, ClientCache);

NullCache.prototype._init = function _init(callback) {
    callback(null, true);
};

NullCache.prototype._get = function _get(key, callback) {
    callback(null, undefined);
};

NullCache.prototype._set = function _set(key, value, callback) {
    callback(null);
};

NullCache.prototype._remove = function _remove(key, callback) {
    callback(null);
};

/**
 * A cache based on HTML5 Local Storage.
 */

function LocalStorageCache() {
    assert(this instanceof LocalStorageCache, 'use new');
    ClientCache.call(this);
}

util.inherits(LocalStorageCache, ClientCache);

LocalStorageCache.prototype._init = function _init(callback) {
    var sentinel = (new Date()).toString(),
        match = false;

    try {
        this.storage = window.localStorage;
        this.storage.setItem(sentinel, sentinel);
        match = (this.storage.getItem(sentinel) === sentinel) ? true : false;
        this.storage.removeItem(sentinel);
    } catch (err) {
        // an inability to resolve window.localStorage => not supported
        // an inability to access get/set item methods => not supported
        callback(null, false);
        return;
    }

    if (match) {
        // works OK => ready
        callback(null, true); // ok
    } else {
        // failing to give values back accurately => error
        callback(new Error('sentinel mismatch'));
    }
};

LocalStorageCache.prototype._get = function _get(key, callback) {
    var repr = this.storage.getItem(key),
        value = (repr === undefined) ? undefined : JSON.parse(repr);
    callback(null, value);
};

LocalStorageCache.prototype._set = function _set(key, value, callback) {
    this.storage.setItem(key, (value === undefined) ? undefined : JSON.stringify(value));
    callback(null);
};

LocalStorageCache.prototype._remove = function _remove(key, callback) {
    this.storage.removeItem(key);
    callback(null);
};

var ENGINES = [ LocalStorageCache, NullCache ];

/**
 * Get a working client cache, even if it does nothing.
 */

function getClientCache(callback) {
    assert(typeof callback === 'function');

    var remaining = _.clone(ENGINES),
        engine,
        Engine;

    function onInit(err, ok) {
        if (err) {
            return tryNext();
        }

        if (ok) {
            callback(null, engine);
        } else {
            tryNext();
        }
    }

    function tryNext() {
        Engine = _.first(remaining);
        assert(typeof Engine === 'function');
        remaining = _.rest(remaining);
        engine = new Engine();
        engine.init(onInit);
    }

    tryNext();
}

module.exports = getClientCache;
