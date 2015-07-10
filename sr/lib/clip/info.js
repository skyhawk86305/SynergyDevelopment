'use strict';

var constants = require('../constants'),
    repair = require('./repair'),
    distill = require('./distill'),
    describe = require('./describe'),
    autotag = require('./autotag'),
    constants = require('../constants'),
    _ = require('lodash');

function isPayload(key) {
    return !key.match(/^_/);
}

function isWanted(key) {
    return !(isPayload(key) || _.contains(constants.UNWANTED_METADATA, key));
}

function filterValues(ob, fn) {
    var result = {};
    _.forOwn(ob, function (value, key) {
        if (fn(key)) {
            result[key] = value;
        }
    });
    return result;
}

var _isWanted = _.memoize(isWanted); // cache results

function metadata(clip) {
    return filterValues(clip, _isWanted);
}

function info(clip) {
    // jshint camelcase: false
    var query = distill(repair(clip)),
        desc = describe(query),
        tags = autotag(query),
        envelope = metadata(clip);
    envelope._x_autotags = tags;
    envelope._x_autodesc = desc;
    return envelope;
}

module.exports = info;
