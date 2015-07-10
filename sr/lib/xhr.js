'use strict';

var assert = require('assert');

/* global XMLHttpRequest */

function xhr(method, url, options, callback) {
    assert.equal(typeof method, 'string');
    assert.equal(typeof url, 'string');
    assert.equal(typeof options, 'object');
    assert.equal(typeof callback, 'function');

    var headers = options.headers || {},
        req = new XMLHttpRequest(),
        typ,
        payload = options.payload;

    req.open(method, url, true);

    for (var key in options.headers) {
        req.setRequestHeader(key, headers[key]);
        if (key.toLowerCase() === 'content-type') {
            typ = headers[key];
        }
    }

    if (payload) {
        if (method.toLowerCase() !== 'post') {
            console.error('xhr: payload set on non-POST');
        }

        if (typeof payload === 'object') {
            payload = JSON.stringify(payload);
            if (typ) {
                console.error('xhr: content-type set for object POST');
            } else {
                typ = 'application/json';
                req.setRequestHeader('content-type', typ);
            }
        } else {
            if (!typ) {
                console.error('xhr: content-type not set for POST');
            }
        }
    } else {
        if (method.toLowerCase() === 'post') {
            console.error('xhr: payload absent on POST');
        }
    }

    req.ontimeout = function ontimeout() {
        callback(new Error('request timed out'));
    };

    req.onreadystatechange = function onreadystatechange() {
        if (req.readyState !== 4) {
            // 0: UNSENT
            // 1: OPENED
            // 2: HEADERS_RECEIVED
            // 3: LOADING
            // 4: DONE
            return;
        }

        callback(null, {
            statusCode: req.status,
            body: req.responseText,
            bodyType: req.responseType,
            headers: req.getAllResponseHeaders(),
        });
    };

    // readyState is apparently not set yet
    // State before send should be 1?
    if (method === 'POST' || method === 'PUT') {
        // assert(req.readyState === 4, 'readyState=', req.readyState);
        req.send(payload || '');
    } else {
        req.send();
    }
}

module.exports = xhr;
