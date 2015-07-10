'use strict';

/**
 * Add property to _this which is resolved by getter.
 * getter is called lazily, and the result cached.
 * getter is called bound to _this.
 */

function addLazyCachedProp(_this, name, getter, visible) {
    var tried = false,
        value,
        err;

    function once() {
        if (tried) {
            if (err) {
                throw err;
            } else {
                return value;
            }
        } else {
            tried = true;
            try {
                value = getter.call(_this);
                return value;
            } catch (e) {
                err = e;
                throw err;
            }
        }
    }

    Object.defineProperty(_this, name, {
        get: once,
        enumerable: visible === undefined ? true : visible,
    });
}

module.exports = addLazyCachedProp;
