'use strict';

var assert = require('assert'),
    async = require('async'),
    nipple = require('nipple'),
    info = require('../clip/info'),
    reduceClip = require('../clip/reduce'),
    ms = require('../ms'),
    _ = require('lodash');

var DEFAULT_REQUEST_TIMEOUT = ms.seconds(10), // Some TCLIP models take a while to load/parse
    GET_INDEX_LIFESPAN = ms.minutes(1),
    GET_DOCUMENT_LIFESPAN = 100,
    GET_FAILURE_LIFESPAN = 1,
    GET_VERSIONED_DOCUMENT_LIFESPAN = ms.hours(24);

function TCLIP(server, options) {
    assert(this instanceof TCLIP, 'use new');
    assert(this.server = server);
    assert(this.options = options);
    assert(this.options.tclip);
    assert(this.base = this.options.tclip.server);
    assert(this.base[this.base.length - 1] !== '/');
    assert(this.base.indexOf('https://') === 0);
    this._log = this._log.bind(this);
}

function measure(span, from) {
    if (from) {
        return measure(span) - measure(from);
    } else {
        return span[0] + span[1]/1e9;
    }
}

var AUTOTAG = [ 'sr', 'tclip' ];

TCLIP.prototype._log = function log(tags, data) {
    if (arguments.length === 1) {
        data = tags;
        tags = AUTOTAG;
    } else {
        tags = _.uniq(AUTOTAG.concat(tags));
    }

    assert(tags instanceof Array);
    assert(data instanceof Object);
    this.server.log(tags, data);
};

TCLIP.prototype.req = function req(user, token, method, path, payload, callback) {
    var begin = process.hrtime(),
        endPrep,
        endReq,
        endRead,
        endParse,
        log = this._log;

    payload = payload ? JSON.stringify(payload) : undefined;

    var options = {
            payload: payload,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            rejectUnauthorized: !this.options.tclip.insecure,
            agent: null,
            timeout: this.options.timeout || DEFAULT_REQUEST_TIMEOUT,
        },
        uri = this.options.tclip.server + path;

    if (payload) {
        options.headers['Content-Length'] = payload.length;
    }

    function fail(err) {
        log([ 'error' ], {
            user: user,
            token: token.slice(0, 8),
            method: method,
            path: path,
            uri: uri,
            rejectUnauthorized: options.rejectUnauthorized,
            err: err.message,
            stack: err.stack,
        });

        setImmediate(callback, err);
    }

    function withResult(err, res) {
        endReq = process.hrtime(begin);

        function tryParse(body) {
            var parsed;

            try {
                parsed = JSON.parse(body);
            } catch (err) {
                console.error('UNPARSEABLE BODY:\n', body.toString('utf8'));
                return fail(err);
            }

            endParse = process.hrtime(begin);

            var times = {
                prep: measure(endPrep),
                request: measure(endReq, endPrep),
                read: measure(endRead, endReq),
                parse: measure(endParse, endRead)
            };
            log([ 'success' ], {
                user: user,
                token: token.slice(0, 8),
                method: method,
                path: path,
                times: times
            });

            setImmediate(callback, null, {
                statusCode: res.statusCode,
                clip: parsed
            });
        }

        function withBody(err, body) {
            endRead = process.hrtime(begin);
            return err ? fail(err) : tryParse(body);
        }

        return err ? fail(err) : nipple.read(res, withBody);
    }

    endPrep = process.hrtime(begin);
    nipple.request(method, uri, options, withResult);
};

TCLIP.prototype.clipPath = function clipPath(uuid, version, newbase) {
    var parts = [ '' ],
        docSpecified = uuid || version;

    if (docSpecified) {
        parts.push('d');
    } else {
        parts.push(newbase || 'd');
    }

    if (uuid) {
        parts.push(uuid);
    }

    if (version) {
        parts.push(version);
    }

    return parts.join('/');
};

function getTTL(uuid, version) {
    if (uuid && version) {
        return GET_VERSIONED_DOCUMENT_LIFESPAN;
    } else if (uuid) {
        return GET_DOCUMENT_LIFESPAN;
    } else {
        return GET_INDEX_LIFESPAN;
    }
}

function assertCommonArguments(user, token, uuid, version, callback) {
    assert(typeof(user) === 'string');
    assert(typeof(token) === 'string');
    assert(!uuid || typeof(uuid) === 'string');
    assert(!version || typeof(version) === 'number');
    assert(!version || uuid, 'need uuid if version specified');
    assert(typeof(callback) === 'function');
}

TCLIP.prototype.get = function get(user, token, uuid, version, callback) {
    assertCommonArguments(user, token, uuid, version, callback);

    this._log([ 'get', 'trace' ], {
        user: user,
        token: token.slice(0, 8),
        uuid: uuid,
        version: version,
    });

    function callBackWithTTL(err, result) {
        if (err) {
            setImmediate(callback, err);
        } else {
            setImmediate(callback, err, result, getTTL(uuid, version));
        }
    }

    this.req(user, token, 'GET', this.clipPath(uuid, version), null, callBackWithTTL);
};

TCLIP.prototype.info = function _info(user, token, uuid, version, callback) {
    assertCommonArguments(user, token, uuid, version, callback);
    var log = this._log;

    log([ 'clip-info', 'trace' ], {
        user: user,
        token: token.slice(0, 8),
        uuid: uuid,
        version: version,
    });

    function withClip(err, _result) {
        var result;

        if (err) {
            setImmediate(callback, err);
        } else if (!_result.clip) {
            setImmediate(callback, new Error('TCLIP result lacks clip'));
        } else {
            try {
                result = info(_result.clip);
            } catch (infoErr) {
                log([ 'error', 'clip-info' ], {
                    err: infoErr,
                    uuid: uuid,
                    version: version,
                });
                return setImmediate(callback, null, _result.clip, GET_FAILURE_LIFESPAN);
            }

            setImmediate(callback, err, result, getTTL(uuid, version));
        }
    }

    // We need to query v1 to find out if this was created from another project
    var _this = this;
    async.waterfall([
        function getRequestedVersion(callback) {
            _this.req(user, token, 'GET', _this.clipPath(uuid, version), null, callback);
        },
        function getFirstVersion(requested, callback) {
            if (!requested.clip) {
                callback(new Error('TCLIP result lacks clip'));
            }

            function augmentClip(err, original) {
                // jshint camelcase: false
                requested.clip._x_original_uuid = (original.clip && original.clip._parent) ? original.clip._parent._uuid : undefined;

                if (!requested.clip._x_original_timestamp) {
                    requested.clip._x_original_timestamp = original.clip ? original.clip._timestamp : requested.clip._timestamp;
                }

                callback(err, requested);
            }

            if (uuid === 1) {
                augmentClip(null, requested);
            } else {
                _this.req(user, token, 'GET', _this.clipPath(uuid, 1), null, augmentClip);
            }
        }
    ], function withAugmentedClip(err, result) {
        withClip(err, result);
    });
};

TCLIP.prototype.put = function put(user, token, uuid, version, payload, callback) {
    assert(typeof(user) === 'string');
    assert(typeof(token) === 'string');
    assert(uuid === undefined || typeof(uuid) === 'string');
    assert(version === undefined || typeof(version) === 'number');
    assert(payload instanceof Object || !(payload instanceof Array));

    assert((uuid && version) || (!(uuid || version)),
           'need either both uuid and version or neither');

    assert(typeof(callback) === 'function');

    this._log([ 'put', 'trace' ], {
        user: user,
        token: token.slice(0, 8),
        uuid: uuid,
        version: version,
    });

    this.req(
        user,
        token,
        'POST',
        this.clipPath(uuid, version, 'new'),
        payload,
        callback);
};

TCLIP.prototype.adjust = function adjust(user, token, uuid, version, adjustments, callback) {
    assert(typeof user === 'string');
    assert(typeof token === 'string');
    assert(typeof uuid === 'string' || uuid === null);
    assert(typeof version === 'number' || version === null);
    assert(typeof adjustments === 'object' && !(adjustments instanceof Array));
    assert(typeof callback === 'function');
    assert(!(uuid === null && version !== null));

    this._log([ 'adjust', 'trace' ], {
        user: user,
        token: token.slice(0, 8),
        uuid: uuid,
        version: version,
    });

    var _this = this;

    function withOriginalClip(err, result) {
        if (err) {
            return callback(err);
        }

        try {
            result.clip = reduceClip(result.clip);
            _.merge(result.clip, adjustments);
        } catch (adjErr) {
            return callback(adjErr);
        }

        _this.req(
            user,
            token,
            'POST',
            _this.clipPath(uuid, version, 'new'),
            result.clip,
            callback);
    }

    if (uuid) {
        this.req(user, token, 'GET', this.clipPath(uuid, version), null, withOriginalClip);
    } else {
        withOriginalClip(null, { clip: {} });
    }
};

TCLIP.prototype.listClips = function listClips(user, token, callback) {
    this.get(user, token, null, null, callback);
};

function makeCacheKey(user, token, uuid, version) {
    return [ user, uuid, version ].join('/'); // ignore token
}

TCLIP.register = function register(server, options, next) {
    var clipper = new TCLIP(server, options);
    server.method('listClips', clipper.listClips.bind(clipper), {
        cache: {
            expiresIn: GET_INDEX_LIFESPAN
        }
    });
    server.method('getClip', clipper.get.bind(clipper), {
        cache: {
            expiresIn: GET_VERSIONED_DOCUMENT_LIFESPAN
        },
        generateKey: makeCacheKey
    });
    server.method('infoClip', clipper.info.bind(clipper), {
        cache: {
            expiresIn: GET_VERSIONED_DOCUMENT_LIFESPAN
        },
        generateKey: makeCacheKey
    });
    server.method('putClip', clipper.put.bind(clipper));
    server.method('adjustClip', clipper.adjust.bind(clipper));
    next();
};

module.exports = TCLIP;
