'use strict';

var autoServe = require('./lib/server'),
    versionInfo = require('./version'),
    _ = require('lodash');

var LABEL = 'sr';

function addRoutes(server) {
    // note: server.log might not result in any output until that plugin
    // is registered; we can't work around it because any particular log
    // must be optional
    server.log([ 'sr', 'trace' ], 'adding routes for sr');

    server.route([
        {
            path: '/version',
            method: 'GET',
            config: {
                auth: 'noauth'
            },
            handler: function (request, reply) {
                var age_ms = new Date() - new Date(versionInfo.datetime);
                reply(_.merge({}, versionInfo, {
                    age_hours: 0+(age_ms / (3600 * 1000)).toFixed(2)
                }));
            }
        }
    ]);
}

function register(server, options, next) {
    server = server.select(LABEL);
    server.dependency('hapi-anode');
    server.log([ 'sr', 'launch' ], {
        what: 'registering SR plugin',
        server: {
            info: server.info
        }
    });
    addRoutes(server);
    autoServe.register(server, options, next);
}

require('pkginfo')(module, 'name', 'version');

module.exports.register = register;
module.exports.register.attributes = {
    name: module.exports.name,
    version: module.exports.version
};
