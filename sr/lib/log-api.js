'use strict';


var assert = require('assert'),
    _ = require('lodash');

function LogApiHost(logfn, options) {
    assert(typeof logfn === 'function');
    options = this.options = _.clone(options || {});
    var console = (options.console = options.console || getLimitedConsole());

    // bind this.log, manually preserving arity and name
    // calls to this method are forwarded upstream
    this.log = function log(tags, entry) {
        assert.equal(arguments.length, 2, 'log: 2-arity');
        logfn.call(options.bind, tags, entry);
        var tagrep = tags.join(', ');
        if (_.contains(tags, 'error') || entry.err || entry instanceof Error) {
            console.error(tagrep, entry);
        } else if (_.contains(tags, 'warn')) {
            console.warn(tagrep, entry);
        } else {
            console.debug(tagrep, entry);
        }
    };

    // add console-style handlers, which don't get forwarded upstream
    _.forEach([ 'info', 'debug', 'warn', 'error' ], this._addLevelHandler, this);
}

LogApiHost.prototype._addLevelHandler = function _addLevelHandler(level) {
    var warned = false,
        _console = this.options.console;

    this[level] = this.log[level] = logAtLevel;
    return;

    function warnFirst() {
        if (!warned) {
            _console.warn('log.' + level + ' provides local logging ONLY');
            warned = true;
        }
    }

    function logAtLevel() {
        warnFirst();
        _console[level].apply(_console, arguments);
    }
};

function getLimitedConsole() {
    if (global && !_.isEmpty(global.console)) {
        return global.console;
    } else if (window && !_.isEmpty(window.console)) {
        return window.console;
    } else {
        return {
            debug: _.noop,
            info: _.noop,
            warn: _.noop,
            error: _.noop
        };
    }
}

module.exports = LogApiHost;
