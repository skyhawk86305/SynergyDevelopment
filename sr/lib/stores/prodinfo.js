'use strict';

var assert = require('assert'),
    async = require('async'),
    lzString = require('lz-string'),
    util = require('util'),
    Store = require('./store'),
    getClientCache = require('../client-cache'),
    constants = require('../constants'),
    ProductInfo = require('../prodinfo');

var TAG = 'prod-info';

function ProductInfoStoreBackEnd(options) {
    assert(this instanceof ProductInfoStoreBackEnd, 'use new');
    assert.equal(typeof (this.log = options.log), 'function', 'options.log');
    assert.equal(typeof (this.xhr = options.xhr), 'function', 'options.xhr');
}

ProductInfoStoreBackEnd.prototype.getRawProdInfo = function getRawProdInfo(callback) {
    var log = this.log,
        xhr = this.xhr;

    return async.auto({
        cache: [ getCacheEngine ],
        cached: [ 'cache', getCachedResult ],
        served: [ 'cached', getServedResult ],
        winner: [ 'cached', 'served', pickWinner ],
        recached: [ 'cache', 'served', updateCache ],
    }, function (err, results) {
        if (err) {
            log([ TAG, TAG + '-fatal' ], err);
            return callback(err);
        } else {
            return callback(null, results.winner);
        }
    });

    // ----- hoisted functions only past here:

    function getCacheEngine(callback /*, results */) {
        return getClientCache(withCacheEngine);

        function withCacheEngine(err, engine) {
            log([ TAG, 'client-cache' ], { available: !!!err });
            callback(null, err ? null : engine);
        }
    }

    function getCachedResult(callback, results) {
        if (!results.cache) {
            return setImmediate(callback, null, null);
        }

        log([ TAG, 'client-cache-get' ], 'loading...');
        return results.cache.get('synergy.prodinfo', withCacheContents);

        function withCacheContents(err, result) {
            if (err) {
                log([ 'client-cache-pre-miss' ], err);
                return callback(null, null);
            } else {
                log([ 'client-cache-pre-hit' ], 'loaded');
                return callback(null, result);
            }
        }
    }

    function getServedResult(callback, results) {
        var hasCache = results.cache && results.cached,
            previous = hasCache ? results.cached.digest : '',
            path = constants.PLATFORM_OPTIONS_GET_PATH;

        if (previous) {
            path = path + '/' + previous;
        }

        log([ 'client-fetch' ], { previous: previous });
        return xhr('GET', path, {}, function (err, res) {
            log([ 'client-fetch', 'response' ], {
                err: err,
                body: typeof res
            });
            if (err) {
                return callback(err);
            }

            var result;
            if (typeof res.body === 'string') {
                try {
                    result = JSON.parse(res.body);
                } catch (parseErr) {
                    return callback(parseErr);
                }
                return callback(null, result);
            } else if (typeof res.body === 'object') {
                return callback(null, res.body);
            } else {
                return callback(new Error('server response'));
            }
        });
    }

    function pickWinner(callback, results) {
        var isPreHit = results.cached && typeof results.cached === 'object',
            isHit = isPreHit && !results.served.options,
            tag = 'client-cache-' + (isHit ? 'hit' : 'miss'),
            winner = isHit ? results.cached.options : results.served.options;

        log([ TAG, tag ], {
            length: winner.length,
            // starting: winner.slice(0, 32)
        });
        callback(null, winner);
    }

    function updateCache(callback, results) {
        if (!results.cache || !results.served.options) {
            return setImmediate(callback, null, null);
        }

        log([ TAG, 'client-cache-set' ], 'saving new product info...');
        results.cache.set('synergy.prodinfo', results.served, callback);
    }
};

function ProductInfoStore(options) {
    assert(this instanceof ProductInfoStore, 'use new');
    assert.equal(typeof options, 'object', 'options object');
    assert.equal(typeof options.xhr, 'function', 'options.xhr');
    assert.equal(typeof options.log, 'function', 'options.log');

    Store.call(this, 'PRODUCTINFO');

    this.backEnd = options.backEnd || new ProductInfoStoreBackEnd(options);

    this.log = options.log;
    this.fetching = false;
    this.fetched = false;
    this.err = null;
    this.platformConfigData = null;
}

util.inherits(ProductInfoStore, Store);

ProductInfoStore.prototype.getState = function getState() {
    return {
        productInfo: this._productInfo,
        fetching: this.fetching,
        fetched: this.fetched,
        err: this.err,
    };
};

ProductInfoStore.prototype.PRODUCTINFO_FETCH = function fetchConfig() {
    var _this = this,
        log = this.log;

    if (_this.fetching) {
        console.error('already fetching');
        return;
    }

    // We will need a better distinction between the server is 'fetching' and 'you should block the page'
    _this.fetching = _this.fetched ? false : true;
    _this.err = null;
    _this.changed();

    _this.backEnd.getRawProdInfo(function onFetch(err, result) {
        var previous = Date.now();

        function timing() {
            var now = Date.now(),
                elapsed = now - previous;
            previous = now;
            return {
                elapsed: elapsed
            };
        }

        if (err) {
            _this.err = err;
        } else {
            try {
                log([ TAG, TAG + '-extract'], 'extracting...');
                var extracted = lzString.decompressFromBase64(result);
                log([ TAG, TAG + '-parse'], timing());
                var parsed = JSON.parse(extracted);
                log([ TAG, TAG + '-inhale'], timing());
                _this._productInfo = new ProductInfo(parsed);
                _this._productInfo.inhale(wrap);
            } catch (cookErr1) {
                wrap(cookErr1);
            }
        }

        function wrap(err) {
            if (err) {
                log([ TAG, TAG + '-fatal' ], err);
                _this.err = err;
            } else {
                log([ TAG, TAG + '-ready'], timing());
                _this.fetched = true;
            }
            _this.fetching = false;
            _this.changed();
        }
    });
};

module.exports = ProductInfoStore;
