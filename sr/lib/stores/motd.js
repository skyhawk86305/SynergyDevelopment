'use strict';

var assert = require('assert'),
    util = require('util'),
    Store = require('./store'),
    xhr = require('../xhr');

// XMLHttpRequest back end
function MOTDStoreBackEnd() {
    assert(this instanceof MOTDStoreBackEnd, 'use new');
    this.baseURL = '';
}

MOTDStoreBackEnd.prototype.fetch = function fetch(callback) {
    var url = this.baseURL + '/motd',
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

function MOTDStore(options) {
    assert(this instanceof MOTDStore, 'use new');
    assert(!options || options instanceof Object);

    Store.call(this, 'MOTD');

    options = options || {};
    this.backEnd = options.backEnd || new MOTDStoreBackEnd();

    this.content = null;
    this.fetching = false;
    this.fetched = false;
    this.err = null;
}

util.inherits(MOTDStore, Store);

MOTDStore.prototype.getState = function getState() {
    return {
        projects: this.projects, // TODO: clone it to prevent mutation
        fetching: this.fetching,
        fetched: this.fetched,
        err: this.err,
    };
};

MOTDStore.prototype.MOTD_FETCH = function fetch() {
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
            _this.fetched = true;
        }

        _this.fetching = false;
        _this.changed();
    });
};

module.exports = MOTDStore;
