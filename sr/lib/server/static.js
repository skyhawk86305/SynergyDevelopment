'use strict';

var path = require('path');

function register(server, options, next) {
    var staticPath = path.join(__dirname, '..', '..', 'dist');
    server.log([ 'sr', 'launch', 'static-path' ], staticPath);
    server.route({
        path: '/{extras*}',
        method: 'GET',
        config: {
            auth: 'known'
        },
        handler: {
            directory: {
                path: staticPath,
                redirectToSlash: true,
                listing: true,
                index: true,
            }
        }
    });
    next();
}

module.exports.register = register;
module.exports.name = 'static';
