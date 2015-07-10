// PASTE OVER
'use strict';

var nipple = require('nipple'),
    _ = require('lodash');

var AUTOTAG = [ 'report' ];

// TODO: dumping default values in until we have UI for them
var defaultDocumentParameters = {
    SelectedLanguage:'English',
        documentMembers:[
          {ID:5,Name:'RDS_Title_Page',Type:'Doc',ModuleID:1},
          {ID:2,Name:'DocumentInformation',Type:'Doc',ModuleID:1},
          {ID:3,Name:'ExecutiveSummary',Type:'Doc',ModuleID:1},
          {ID:2,Name:'HardwareSummary',Type:'Doc',ModuleID:2},
          {ID:4,Name:'StorageSummary',Type:'Doc',ModuleID:2},
          {ID:3,Name:'NetworkConnectivity',Type:'Doc',ModuleID:2},
          {ID:2,Name:'SnapMirror',Type:'Doc',ModuleID:3},
          {ID:3,Name:'SnapVault',Type:'Doc',ModuleID:3},
          {ID:1,Name:'SAN',Type:'Doc',ModuleID:8},
          {ID:1,Name:'AdditionalResources',Type:'Doc',ModuleID:2},
          {ID:6,Name:'References',Type:'Doc',ModuleID:1},
          {ID:4,Name:'RDS_Last_Page',Type:'Doc',ModuleID:1}],
        Project:{GUID:'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',Name:'unnamed',CustomerName:'',Author:'',SynergyVersion:'6.0.0.0'},
    ScenarioMetaData:{GUID:'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',Name:'unknown-meta'},
    EnvironmentalCalculator:{lineVoltage:220,resultType:'Worst Case',resultUnit:'English'}
};


function register(server, options, next) {
    registerWord(server, options);
    registerVisio(server, options);
    next();
}

function registerWord(server, options) {
    registerApplication(server, options, {
                pathPrefix : 'qadr',
                timeout : 1000 * 60, // 60s
                IdKey: 'documentId', // TODO: standardize SWS returned IdKey
                contentType : 'application/ms-word',
                fileExtension : '.doc',
                uri : options.qadr.server + options.qadr.path
            });
}

function registerVisio(server, options) {
    registerApplication(server, options, {
                pathPrefix : 'qadv',
                timeout : 1000 * 60 * 5, // 5mins
                IdKey : 'diagramId', // TODO: standardize SWS returned IdKey
                contentType : 'application/x-visio', // 'application/vnd.visio'
                fileExtension : '.vdx',
                uri : options.qadv.server + options.qadv.path
            });
}

function registerApplication(server, options, applicationOptions) {
    server.route({
        path: '/' + applicationOptions.pathPrefix + '/{uuid}/{version?}',
        method: 'GET', // TODO: permit POST of report options
        config: {
            auth: 'known'
        },
        handler: function (request, reply) {
            // first few lines are an exact copy from portfolio.js
            // TODO: extract somehow or admit defeat and remove TODO

            var user = request.auth.credentials.user,
                token = request.auth.artifacts.token,
                uuid = request.params.uuid,
                version = request.params.version;

            if (version) {
                version = Number(version);
            }

            log({});

            // jshint latedef: false
            // ... so we can read the logic from the top down

            request.server.methods.getClip(user, token, uuid, version, withClipResponse);

            function withClipResponse(err, clip) {
                if (err) {
                    log({ err: err, during: 'get-clip' });
                    return reply(err);
                }

                var augmentedClip = _.cloneDeep(clip);
                _.merge(augmentedClip.clip, {'documentParameters': defaultDocumentParameters});
                _.merge(augmentedClip.clip.documentParameters.Project, {
                        GUID: uuid,
                        Name: augmentedClip.clip._x_project_name,
                        Author: augmentedClip.clip._user_id });

                var method = 'POST',
                    uri = applicationOptions.uri,
                    body = JSON.stringify({ json: augmentedClip }),
                    opts = {
                        payload: body,
                        timeout: applicationOptions.timeout
                    };

                nipple.request(method, uri, opts, withDocumentLocationResponse);
            }

            function withDocumentLocationResponse(err, response) {
                if (err) {
                    log({ err: err, during: 'post-clip' });
                    return reply(err);
                }

                nipple.read(response, withDocumentLocationPayload);
            }

            function withDocumentLocationPayload(err, body) {
                if (err) {
                    log({ err: err, during: 'read-response' });
                    return reply(err);
                }

                var details,
                    opts = {
                        timeout: 1000 * 60 // 60s
                    };

                try {
                    details = JSON.parse(body);
                } catch (parseErr) {
                    log({ err: parseErr, during: 'parse-response' });
                    return reply(parseErr);
                }

                var uri = applicationOptions.uri + '?guid=' + details[applicationOptions.IdKey];
                log([ 'stream' ], { uri: uri });
                nipple.request('GET', uri, opts, withDocumentResponse);
            }

            function withDocumentResponse(err, response) {
                if (err) {
                    log([ 'stream' ], { err: err, during: 'stream-document' });
                    return reply(err);
                }

                var filename = uuid.slice(0, 8) + applicationOptions.fileExtension;

                reply(response)
                    .header('Content-Disposition', 'attachment; filename=' + filename)
                    .header('Content-Type', applicationOptions.contentType);
            }

            function log(tags, data) {
                if (arguments.length === 1) {
                    data = tags;
                    tags = AUTOTAG;
                } else {
                    tags = _.uniq(AUTOTAG.concat(tags));
                }

                data = _.defaults({
                    uuid: uuid,
                    version: version
                }, data);

                if (data.err instanceof Error) {
                    tags.push('error');
                }

                request.log(tags, data);
            }
        }
    });
}

module.exports.register = register;
module.exports.name = 'report';
