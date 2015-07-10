'use strict';

var assert = require('assert'),
    lzString = require('lz-string'),
    nipple = require('nipple'),
    constants = require('../constants'),
    crypto = require('crypto'),
    dedup = require('../prodinfo/dedup'),
    ms = require('../ms');

// jshint camelcase: false

var DEFAULT_REQUEST_TIMEOUT = ms.seconds(120),
    DEFAULT_PLATFORM_OPTIONS_LIFESPAN = ms.minutes(30);

function PlatformOptions(server, options) {
    assert(this instanceof PlatformOptions, 'use new');
    assert(this.server = server);
    assert(this.options = options);
    assert(this.options.platform_options);
    assert(this.base = this.options.platform_options.server);
    assert(this.base[this.base.length - 1] !== '/');
    assert(this.path = this.options.platform_options.path);
    assert(this.path[0] === '/');
}

function measure(span, from) {
    if (from) {
        return measure(span) - measure(from);
    } else {
        return span[0] + span[1]/1e9;
    }
}

PlatformOptions.prototype.getConfiguredCacheTimeMs = function getConfiguredCacheTimeMs() {
    if (this.options.platform_options.cache_ttl_min) {
        return ms.minutes(this.options.platform_options.cache_ttl_min);
    }
    else {
        return DEFAULT_PLATFORM_OPTIONS_LIFESPAN;
    }
};

PlatformOptions.prototype.req = function req(path, callback) {
    var begin = process.hrtime(),
        endPrep,
        endReq,
        endParse,
        endDeDupAndReEncode,
        log = this.server.log.bind(this.server);

    var options = {
            agent: null,
            timeout: DEFAULT_REQUEST_TIMEOUT,
        },
        uri = this.base + path;

    function fail(err, code, data) {
        log([ 'sr', 'PlatformOptions', 'error' ], {
            method: 'GET',
            uri: uri,
            code: code ? code : 0,
            data: data ? data : '',
            err: err.message,
            stack: err.stack,
        });

        setImmediate(callback, err);
    }

    function withResult(err, res, payload) {
        endReq = process.hrtime(begin);

        if (err) {
            if (res) {
                fail(err, res.statusCode, payload);
            }
            else {
                fail(err);
            }
        }

        function parseAndReturn(payload) {
            var parsed;

            try {
                parsed = JSON.parse(payload);
            }
            catch (err) {
                console.error('PlatformOptions UNPARSABLE BODY:\n', payload.toString('utf8'));
                fail(err);
            }

            endParse = process.hrtime(begin);

            dedup(parsed);
            var deduplicated = JSON.stringify(parsed);

            endDeDupAndReEncode = process.hrtime(begin);

            var times = {
                prep: measure(endPrep),
                request: measure(endReq, endPrep),
                parse: measure(endParse, endReq),
                dedup: measure(endDeDupAndReEncode, endParse),
            };
            log([ 'sr', 'PlatformOptions', 'success' ], {
                method: 'GET',
                uri: uri,
                times: times
            });

            var compressed = lzString.compressToBase64(deduplicated),
                digest = crypto.createHash('sha1').update(compressed).digest('hex');

            setImmediate(callback, null, {
                statusCode: res.statusCode,
                options: compressed,
                digest: digest,
                LICENSE: 'Reverse engineering prohibited. Please see EULA.',
            });
        }

        parseAndReturn(payload);
    }

    endPrep = process.hrtime(begin);
    nipple.get(uri, options, withResult);
};

PlatformOptions.prototype.fetch = function fetch(callback) {
    this.server.log([ 'sr', 'PlatformOptions', 'fetch', 'trace' ], {
        base: this.base,
        optionsPath: this.path
    });

    this.req(this.path, callback);
};

PlatformOptions.register = function register(server, options, next) {
    var platformOptions = new PlatformOptions(server, options);
    var methodOptions = {
        cache: {
            expiresIn: platformOptions.getConfiguredCacheTimeMs()
        }
    };

    server.method('getPlatformOptions', platformOptions.fetch.bind(platformOptions), methodOptions);

    server.route({
        method: 'GET',
        path: constants.PLATFORM_OPTIONS_GET_PATH + '/{digest?}',
        config: {
            auth: 'known'
        },
        handler: function(request, reply) {
            server.methods.getPlatformOptions(function(err, result) {
                if (err) {
                    reply(err).code(500);
                }

                if (result.digest === request.params.digest) {
                    request.log([ 'PlatformOptions' ], 'hit');
                    result.options = null;
                } else {
                    request.log([ 'PlatformOptions' ], 'miss');
                }

                reply(result);
            });
        }
    });

    next();
};

module.exports = PlatformOptions;
