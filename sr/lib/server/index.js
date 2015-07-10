'use strict';

/**
 * Too Clever By Half Dept.: automatically call all modules in this
 * directory exporting a 3-arity function 'register', except index.js.
 */

var auto = require('hapi-auto-register');

module.exports.register = function register(server, options, next) {
    auto(__dirname, server, options, next);
};
