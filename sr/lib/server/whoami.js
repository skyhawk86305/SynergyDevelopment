'use strict';

function register(server, options, next) {
    server.route({
        path: '/whoami',
        method: 'GET',
        config: {
            auth: 'known'
        },
        handler: function (request, reply) {
            server.log(['sr', 'auth', 'whoami'], {
                user: request.auth.credentials.user
            });
            reply(request.auth.credentials);
        }
    });
    next();
}

module.exports.register = register;
module.exports.name = 'whoami';
