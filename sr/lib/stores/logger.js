'use strict';

var assert = require('assert'),
    Store = require('./store'),
    util = require('util'),
    uuid = require('uuid'),
    _ = require('lodash');

var DEFAULT_ENTRY_LIMIT = 500;

function LogStore(options) {
    options = this.options = _.cloneDeep(options || {});
    assert(_.isPlainObject(options));

    Store.call(this, 'LOGS');

    options.entryLimit = options.entryLimit || DEFAULT_ENTRY_LIMIT;

    this._entries = [];
    this._confirmed = 0;
    this._overflowed = 0;
    this._draining = false;
    this._sessionId = uuid();
}

util.inherits(LogStore, Store);

LogStore.prototype.getState = function getState() {
    return {
        entries: this._entries,
        confirmed: this._confirmed,
        overflowed: this._overflowed,
        draining: this._draining,
    };
};

LogStore.prototype.drain = function drain(postFunction) {
    var _this = this,
        unconfirmed = this._entries.slice(this._confirmed),
        drop = {
            entries: unconfirmed,
            sessionId: this._sessionId,
            now: now(),
        };

    if (!_this._draining) {
        _this._draining = true;
        _this.changed();

        postFunction(drop, function callback(err) {
            if (!err) {
                _this._confirmed += unconfirmed.length;
            }

            _this._draining = false;

            if (_this._confirmed < _this._entries.length) {
                _this.drain(postFunction);
            }

            _this.changed();
        });
    }
};

LogStore.prototype.log = function log(tags, entry) {
    assert.equal(arguments.length, 2, 'log: 2-arity');
    assert(_.isArray(tags), 'tags: array of strings');
    assert(_.every(tags, _.isString), 'tags: array of strings');

    entry = expandEntry(tags, entry);

    if (this._entries.length >= this.options.entryLimit) {
        this._entries.shift();
        this._overflowed ++;
        this._confirmed = (this._confirmed - 1) < 0 ? 0 : (this._confirmed - 1);
    }

    this._entries.push(entry);
    this.changed();
};

function expandEntry(tags, entry) {
    if (typeof entry === 'string') {
        return makeEntryFromString(tags, entry);
    } else if (entry instanceof Error) {
        return makeEntryFromError(tags, entry);
    } else if (_.isPlainObject(entry)) {
        return makeEntry(tags, entry);
    } else {
        assert(false, 'invalid log entry ' + typeof entry);
    }
}

function makeEntryFromString(tags, message) {
    return {
        tags: tags,
        timestamp: now(),
        message: message
    };
}

function makeEntryFromError(tags, err) {
    return {
        tags: tags,
        timestamp: now(),
        err: err.toString(),
        message: err.message || err.toString(),
        stack: err.stack
    };
}

function makeEntry(tags, entry) {
    assert(_.isPlainObject(entry), 'invalid entry');
    entry = _.clone(entry); // shallow
    assert(!_.contains(entry, 'timestamp'), 'no cheating: timestamps');
    assert(!_.contains(entry, 'timestamp'), 'no cheating: tags');
    entry.tags = tags;
    entry.timestamp = now();
    return entry;
}

function now() {
    return Date.now();
}

module.exports = LogStore;
