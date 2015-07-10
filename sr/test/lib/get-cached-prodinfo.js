'use strict';
/*jshint unused:false */

var testData = require('../data'),
    ProductInfo = require('../../lib/prodinfo'),
    dedup = require('../../lib/prodinfo/dedup'),
    assert = require('assert'),
    _ = require('lodash');

var DEFAULT_INTERVAL = 1000/60; // 60fps

function LumpyTickTracker(interval) {
    if (interval === undefined) {
        this.interval = DEFAULT_INTERVAL;
    } else {
        assert.equal(typeof interval, 'number');
        assert(interval >= 0);
        this.interval = interval;
    }

    try {
        /* make performance R/O global; doesn't work as // comment */
        /* global performance: false */
        assert.equal(typeof performance.now(), 'number');
        this.now = performance.now.bind(performance);
    } catch (err) {
        // fall back to the prototype
    }
    this._tick = this._tick.bind(this);
    this._tock = this._tock.bind(this);
}

LumpyTickTracker.prototype.now = function hrnow() {
    var now = process.hrtime();
    return now[0] + now[1]/1e9;
};

LumpyTickTracker.prototype.stop = function(callback) {
    this._stop = callback || true;
    return this;
};

LumpyTickTracker.prototype.start = function() {
    this._ticks = [];
    this._stop = false;
    this._last = this.now();
    setImmediate(this._tock);
    return this;
};

LumpyTickTracker.prototype._tick = function(now) {
    this._last = now || this.now();
    setImmediate(this._tock);
};

LumpyTickTracker.prototype._tock = function() {
    var now = this.now();

    if (this._last) {
        this._ticks.push(now - this._last);
    }

    if (this._stop) {
        if (typeof this._stop === 'function') {
            return this._stop(null, this._ticks);
        } else {
            return;
        }
    }

    if (this.interval === 0) {
        this._tick(now);
    } else {
        this._last = null;
        setTimeout(this._tick, this.interval);
    }
};

function getCachedProdInfo(done) {
    var raw, tracker;

    function withRaw(_raw) {
        dedup(_raw);
        raw = _raw;
    }

    if (getCachedProdInfo.info !== null) {
        return done();
    } else {
        testData.UpdatedPCD(withRaw)(afterRaw);
        return;
    }

    function afterRaw(err) {
        if (err) { return done(err); }

        tracker = new LumpyTickTracker(0).start();
        getCachedProdInfo.info = new ProductInfo(raw);
        getCachedProdInfo.info.inhale(afterInhale);
    }

    function afterInhale(err) {
        if (err) { return done(err); }
        tracker.stop(afterStop);
    }

    function afterStop(err, ticks) {
        if (err) { return done(err); }
        getCachedProdInfo.ticks = ticks;
        done();
    }
}

getCachedProdInfo.info = null;

if (!module.parent) {
    getCachedProdInfo(function () {
        console.error(_.keys(getCachedProdInfo.info));
    });
}

module.exports = getCachedProdInfo;
