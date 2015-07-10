'use strict';

var assert = require('assert'),
    _ = require('lodash'),
    events = require('events');

function Builder() {
    assert(false, 'mixin; do not use in isolation');
}

Builder.prototype.disableTracing = function disableTracing() {
    if (this._tracingEnabled) {
        console.error('===== builder tracing disabled');
        this._tracingEnabled = false;
    }
    return this;
};
Builder.prototype.disableTracing.pure = true;
Builder.prototype.disableTracing.spam = true;

Builder.prototype.enableTracing = function enableTracing() {
    if (!this._tracingEnabled) {
        console.error('===== builder tracing enabled');
        this._tracingEnabled = true;
    }

    if (this._tracingSetUp) {
        return this;
    } else {
        this._tracingSetUp = true;
    }

    var _this = this,
        lastCache = cache(_this.clip, 'clip');

    trap(this)
        .on('call', beforeCall)
        .on('called', afterCall);

    return this; // ----- closures only beyond this point

    function beforeCall(info) {
        if (!_this._tracingEnabled) {
            return;
        }

        detectChanges();
        if (!info.fn.spam) {
            console.error(indented(info.fname, info.localstack.length));
        }
    }

    function afterCall(info) {
        if (!_this._tracingEnabled) {
            return;
        }

        if (!info.fn.pure) {
            detectChanges();
        }

        if (info.err) {
            var msg = info.fname + ' ! ' + info.err.toString();
            console.error(indented(msg, info.localstack.length));
        } else if (!info.fn.pure) {
            console.error(indented('/' + info.fname, info.localstack.length));
        }
    }

    function detectChanges() {
        var nextCache = cache(_this.clip, 'clip'),
            keys = _.uniq(_.flatten([
                _.keys(lastCache),
                _.keys(nextCache)
            ])),
            lastAlertKey = '';

        function alert(key, status) {
            if (lastAlertKey === '' || key.slice(0, lastAlertKey.length) !== lastAlertKey) {
                lastAlertKey = key;
                console.error(status + ' ' + key);
            }
        }

        keys.sort();
        for (var idx in keys) {
            var key = keys[idx];
            if (_.has(lastCache, key)) {
                if (_.has(nextCache, key)) {
                    if (nextCache[key] !== lastCache[key]) {
                        alert(key, 'M');
                    }
                } else {
                    alert(key, 'R');
                }
            } else {
                alert(key, 'A');
            }

        }

        lastCache = nextCache;
    }
};
Builder.prototype.enableTracing.pure = true;
Builder.prototype.enableTracing.spam = true;

function walk(ob, fn, kpath) {
    kpath = kpath || 'top';

    fn(ob, kpath);

    if (ob instanceof Array) {
        for (var index in ob) {
            walk(ob[index], fn, kpath + '[' + index + ']');
        }
    } else if (ob instanceof Object) {
        for (var key in ob) {
            walk(ob[key], fn, kpath + '.' + key);
        }
    }
}

function cache(ob, kpath) {
    var result = {};

    function capture(value, kpath) {
        result[kpath] = value;
    }

    walk(ob, capture, kpath);
    return result;
}

function trap(ob) {
    var emitter = new events.EventEmitter(),
        stack = [];

    // go back to the prototype because many functions
    // have already been wrapped by _.bindAll
    _.forEach(_.functions(ob), function (fname) {
        var fn = ob[fname];
        if (fn.__bindData__) {
            fn = fn.__bindData__[0]; // undo _.bind
        }
        ob[fname] = wrap(fn, fname);
    });

    function wrap(fn, fname) {
        return function wrapped() {
            var info = {
                fn: fn,
                fname: fname,
                localstack: stack,
                arguments: arguments
            };

            emitter.emit('call', info);
            stack.push(fname);

            try {
                info.result = fn.apply(ob, arguments);
            } catch (err) {
                info.err = err;
            }

            stack.pop();
            emitter.emit('called', info);

            if (info.err) {
                throw info.err;
            } else {
                return info.result;
            }
        };
    }

    return emitter;
}

function indented(name, by) {
    if (!by || by <= 0) {
        return '===== ' + name;
    } else {
        var result = '-----';

        for (var idx = 0; idx < by; idx++) {
            result = result + '  ';
        }

        return result + ' ' + name;
    }
}

module.exports = Builder;
