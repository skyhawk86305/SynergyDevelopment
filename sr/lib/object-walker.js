'use strict';

var assert = require('assert');

var AbsentObjectWalker;

/**
 * Wraps an object for walking. Loudly asserts missing members.
 */

function ObjectWalker(value, path) {
    assert(this instanceof ObjectWalker, 'use new');
    assert(path instanceof Array || typeof path === 'string', 'invalid path');

    this._value = value;
    this._cache = {};

    if (path instanceof Array) {
        this._path = path.slice(0);
    } else {
        this._path = path.split('.');
    }

    Object.defineProperties(this, {
        path: {
            get: function () {
                return this._path.join('.');
            }
        },
        value: {
            get: function () {
                return this._value;
            }
        }
    });
}

ObjectWalker.prototype.assert = function (bool, msg) {
    if (typeof bool === 'function') {
        bool = bool(this._value);
    }
    assert(typeof bool === 'boolean');
    assert(typeof msg === 'string');

    assert(bool, this.path + ': ' + msg);
    return this; // support chaining
};

ObjectWalker.prototype.assertType = function (type) {
    this.assert(typeof this.value === type, 'expected ' + type);
    return this; // support chaining
};

ObjectWalker.prototype.get = function (path) {
    var tail = this.maybe(path);
    if (tail.exists) {
        return tail;
    } else {
        assert(false, tail.path + ': expected value');
    }
};

ObjectWalker.prototype.has = function (path) {
    return this.maybe(path).exists;
};

ObjectWalker.prototype.exists = true;

ObjectWalker.prototype.maybe = function (path) {
    assert.equal(typeof path, 'string', 'invalid path');
    return this._maybe(path.split('.'));
};

ObjectWalker.prototype._maybe = function (segs) {
    assert(segs instanceof Array);
    segs = segs.slice();
    var seg = segs.shift();

    if (seg in this._cache) {
        if (segs.length) {
            return this._cache[seg]._maybe(segs);
        } else {
            return this._cache[seg];
        }
    }

    var path = this._path.concat([ seg ]);

    if (this._value.hasOwnProperty(seg)) {
        var next = new ObjectWalker(this._value[seg], path);
        this._cache[seg] = next;

        if (segs.length) {
            return next._maybe(segs);
        } else {
            return next;
        }
    } else {
        var because = path.join('.'),
            missing = path.concat(segs).join('.');
        return new AbsentObjectWalker(missing, because);
    }
};

ObjectWalker.isWrapped = function (ob) {
    return ob instanceof ObjectWalker || ob instanceof AbsentObjectWalker;
};

AbsentObjectWalker = function AbsentObjectWalker(missing, because) {
    assert(this instanceof AbsentObjectWalker, 'use new');

    assert(typeof (this._path = missing) === 'string');
    assert(typeof (this._because = because) === 'string');

    var NO = this.NO.bind(this);

    Object.defineProperties(this, {
        path: {
            get: function () {
                return this._path;
            }
        },
        value: {
            get: function () {
                NO('get');
            }
        },
        exists: {
            value: false,
            writable: false,
        }
    });

    for (var name in ObjectWalker.prototype) {
        if (!(name in AbsentObjectWalker.prototype)) {
            this[name] = this.NO.bind(this, name);
        }
    }
};

AbsentObjectWalker.prototype.exists = false;

AbsentObjectWalker.prototype.maybe = function (path) {
    var newPath = this._path + '.' + path;
    return new AbsentObjectWalker(newPath, this._because);
};

AbsentObjectWalker.prototype.NO = function NO() {
    assert(false, this._because + ': expected value');
};

for (var fn in ObjectWalker.prototype) {
    if (!(fn in AbsentObjectWalker.prototype)) {
        AbsentObjectWalker[fn] = AbsentObjectWalker.NO;
    }
}

module.exports = ObjectWalker;
