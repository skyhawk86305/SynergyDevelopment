'use strict';

var constants = require('../constants'),
    reduceClip = require('../clip/reduce');

function replaceClip(request, reply) {
    var user = request.auth.credentials.user,
        token = request.auth.artifacts.token,
        uuid = request.params.uuid,
        version = request.params.version,
        payload = request.payload;

    if (version) {
        version = Number(version);
    }

    request.server.methods.putClip(user, token, uuid, version, payload, reply);
}

function register(server, options, next) {
    server.route({
        path: constants.PROJECT_REPLACE_PATH + '/{uuid}/{version?}',
        method: 'POST',
        config: {
            auth: 'known',
            pre: [
                { method: replaceClip, assign: 'clip' }
            ],
        },
        handler: function (request, reply) {
            reply(
                reduceClip(
                    request.pre.clip.clip))
                .code(200)
                .type('application/json');
        }
    });

    next();
}

module.exports.register = register;
module.exports.name = 'project';
