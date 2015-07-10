'use strict';

var async = require('async'),
    constants = require('../constants'),
    reduceClip = require('../clip/reduce'),
    includeClip = require('../clip/filter'),
    _ = require('lodash');

function listClips(request, reply) {
    var user = request.auth.credentials.user,
        token = request.auth.artifacts.token;
    request.server.methods.listClips(user, token, reply);
}

function getClip(request, reply) {
    var user = request.auth.credentials.user,
        token = request.auth.artifacts.token,
        uuid = request.params.uuid,
        version = request.params.version;

    if (version) {
        version = Number(version);
    }

    request.server.methods.getClip(user, token, uuid, version, reply);
}

function newClip(request, reply) {
    var user = request.auth.credentials.user,
        token = request.auth.artifacts.token,
        payload = request.payload;

    request.server.methods.adjustClip(user, token, null, null, payload, reply);
}

function adjustClip(request, reply) {
    var user = request.auth.credentials.user,
        token = request.auth.artifacts.token,
        uuid = request.params.uuid,
        version = request.params.version,
        payload = request.payload;

    if (version) {
        version = Number(version);
    }

    request.server.methods.adjustClip(user, token, uuid, version, payload, reply);
}

function register(server, options, next) {
    server.route({
        path: constants.PROJECT_LIST_PATH,
        method: 'GET',
        config: {
            auth: 'known',
            pre: [
                { method: listClips, assign: 'clips' }
            ],
        },
        handler: function (request, reply) {
            var user = request.auth.credentials.user,
                token = request.auth.artifacts.token;

            function fixInfo(clip, callback) {
                var u = clip._uuid,
                    v = clip._version;
                request.server.methods.infoClip(user, token, u, v, callback);
            }

            function filterFixed(err, clips) {
                var latestClips = filterParents(clips),
                    filteredClips = filterArchived(latestClips);

                withFixed(err, filteredClips);
            }

            function filterParents(clips) {
                var clipsWithParents = _.filter(clips, function hasParent(clip) {
                        return (clip && clip._x_original_uuid) ? true : false;
                    }),
                    parentIds = _.map(clipsWithParents, function parentUuid(clip) {
                        return clip._x_original_uuid;
                    }),
                    uniqueParentIds = _.uniq(parentIds);

                var filteredClips = _.filter(clips, function latestVersion(clip) {
                        var hasParent = _.some(uniqueParentIds, function isParent(uuid){
                                return uuid === clip._uuid;
                            });

                        return !hasParent;
                    });

                return filteredClips;
            }

            function filterArchived(clips) {
                var filteredClips = _.filter(clips, function archived(clip) {
                        return (clip && clip._x_archived) ? false : true;
                    });

                return filteredClips;
            }

            function withFixed(err, clips) {
                if (err) {
                    reply(err);
                } else {
                    reply(clips)
                        .code(200)
                        .type('application/json');
                }
            }

            var index = _.filter(request.pre.clips.clip, includeClip);
            async.mapLimit(
                index,
                constants.PROJECT_INFO_CONCURRENCY,
                fixInfo,
                filterFixed);
        }
    });

    server.route({
        path: constants.PROJECT_LOAD_PATH + '/{uuid}/{version?}',
        method: 'GET',
        config: {
            auth: 'known',
            pre: [
                { method: getClip, assign: 'clip' }
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

    server.route({
        path: constants.PROJECT_ADJUST_PATH,
        method: 'POST',
        config: {
            auth: 'known',
            pre: [
                { method: newClip, assign: 'clip' }
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

    server.route({
        path: constants.PROJECT_ADJUST_PATH + '/{uuid}/{version?}',
        method: 'POST',
        config: {
            auth: 'known',
            pre: [
                { method: adjustClip, assign: 'clip' }
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
module.exports.name = 'portfolio';
