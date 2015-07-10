'use strict';

var path = require('path');

function register(server, options, next) {
    server.route({
        path: '/releasenotes',
        method: 'GET',
        config: {
            auth: 'known'
        },
        handler: function (request, reply) {
            reply.file(path.join(__dirname, '..', '..', 'dist', 'index.html'));
        }
    });
    next();
}

module.exports.register = register;
module.exports.name = 'releasenotes';
