'use strict';

var assert = require('assert'),
    util = require('util'),
    Store = require('./store'),
    xhr = require('../xhr');

// XMLHttpRequest back end
function UserSessionStoreBackEnd() {
    assert(this instanceof UserSessionStoreBackEnd, 'use new');
    this.baseURL = '';
}

UserSessionStoreBackEnd.prototype.fetch = function fetch(callback) {
    var url = this.baseURL + '/whoami',
        options = {};

    xhr('GET', url, options, function (err, res) {
        if (err) {
            console.error(err);
            return callback(err);
        }

        if (res.statusCode !== 200) {
            callback(new Error(url + ' -> ' + res.statusCode));
        } else {
            var result;
            try {
                result = JSON.parse(res.body);
            } catch (err) {
                callback(new Error('cannot parse response'));
            }

            callback(null, result);
        }
    });
};

function UserSessionStore(options) {
    assert(this instanceof UserSessionStore, 'use new');
    assert(!options || options instanceof Object);

    Store.call(this, 'USER_SESSION');

    options = options || {};
    this.backEnd = options.backEnd || new UserSessionStoreBackEnd();

    this.content = null;
    this.fetching = false;
    this.fetched = false;
    this.err = null;

    this.firstName = ''; // For QA/Etc in near term
    this.sessionExpirationUTC = 253402232400000;  // Time in milliseconds.
    this.authenticatedServerTimeUTC = new Date().getTime(); // Replace with server time. Using this for now to provide delta of 0.
    this.authenticatedClientTimeUTC = new Date().getTime();

    this.currentClientTimeUTC = new Date().getTime();

    this.timestampDelta = this.authenticatedClientTimeUTC - this.authenticatedServerTimeUTC;
}

util.inherits(UserSessionStore, Store);

UserSessionStore.prototype.getState = function getState() {
    if (this.content) {
        this.firstName = this.content.firstName || this.firstName;
        this.sessionExpirationUTC = this.content.expires;
        this.authenticatedClientTimeUTC = this.content.clientTime;
        this.authenticatedServerTimeUTC = this.content.serverTime;
    }

    this.currentClientTimeUTC = new Date().getTime();
    this.timestampDelta = 0; // Hardcode this for now, since we're not really using server expiration time here, but rather client side.

    return {
        firstName: this.firstName,
        expires: this.sessionExpirationUTC,
        now: (this.currentClientTimeUTC - this.timestampDelta),
        isExpired: this.isExpired()
    };
};

UserSessionStore.prototype.isExpired = function isExpired() {
    return (this.currentClientTimeUTC - this.timestampDelta) > this.sessionExpirationUTC;
};

UserSessionStore.prototype.calculateTimestampDelta = function calculateTimestampDelta(authenticatedClientTimeUTC, authenticatedServerTimeUTC) {
    return (authenticatedClientTimeUTC - authenticatedServerTimeUTC);
};

UserSessionStore.prototype.USER_SESSION_FETCH = function fetch() {
    var _this = this;

    if (this.fetching) {
        console.error('already fetching');
        return;
    }

    this.fetching = true;
    this.err = null;
    this.changed();

    this.backEnd.fetch(function onList(err, content) {
        if (err) {
            _this.err = err;
        } else {
            _this.content = content;
            _this.timestampDelta = _this.calculateTimestampDelta(content.clientTime, content.serverTime);
            _this.fetched = true;
        }

        _this.fetching = false;
        _this.changed();
    });
};

module.exports = UserSessionStore;
