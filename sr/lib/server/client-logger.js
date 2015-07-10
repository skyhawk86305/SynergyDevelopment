'use strict';

var assert = require('assert'),
    lru = require('lru-cache'),
    crypto = require('crypto'),
    useragent = require('useragent'),
    _ = require('lodash');

var TAGS = [ 'sr', 'clientlog' ],
    SESSION_CACHE_SIZE = 20000,
    AGENT_CACHE_SIZE = 20000,         // ~one per user
    AGENT_CACHE_AGE = 1000 * 60 * 15, // log every 15min
    SECOND_SKEW_REPORT = 10,          // second skew log at log drop #10
    SUBSEQUENT_SKEW_REPORT = 100;     // then #100, #200, and so on

function register(server, options, next) {
    var sessions = lru({ max: SESSION_CACHE_SIZE }),
        agents = lru({ max: AGENT_CACHE_SIZE, maxAge: AGENT_CACHE_AGE });

    server.route({
        path: '/log',
        method: 'POST',
        config: {
            auth: 'known'
        },
        handler: handler
    });

    return next();

    function handler(request, reply) {
        var drop = request.payload,
            entries = drop.entries,
            sessionId = drop.sessionId,
            clientNow = drop.now,
            userId = request.auth.credentials.user;

        var skewMean = fixOffsets(sessionId, clientNow, entries, request.headers);
        writeEntries(userId, sessionId, clientNow, entries);

        reply({
            success: true,
            processed: entries.length,
            skew: skewMean,
        });
    }

    function writeEntries(userId, sessionId, clientNow, entries) {
        assert(_.isString(userId));
        assert(_.isString(sessionId));
        assert(_.isNumber(clientNow));
        assert(_.isArray(entries));

        _.forEach(entries, writeEntry);

        function writeEntry(entry) {
            assert(_.isPlainObject(entry), 'malformed entry');
            assert(_.isArray(entry.tags), 'malformed entry.tags');

            var tags = _.uniq(_.flatten([ TAGS, entry.tags ]));
            delete entry.tags;

            entry['@timestamp'] = entry.timestamp || Date.now();
            delete entry.timestamp;

            entry['@user_id'] = userId;
            entry.session = sessionId;
            server.log(tags, entry);
        }
    }

    // Is this big enough to warrant its own module, object, or both?

    function fixOffsets(sessionId, clientNow, entries, headers) {
        assert(_.isString(sessionId));
        assert(_.isNumber(clientNow));
        assert(_.isArray(entries));
        assert(_.isObject(headers));

        clientNow = new Date(clientNow);

        var now = new Date(),
            skew = now.getTime() - clientNow.getTime(),
            info = sessions.get(sessionId),
            reporting = false;

        if (info) {
            // update average
            info.skewCount += 1;
            info.skewTotal += skew;

            // determine whether we're reporting or not
            if (info.nextReport === info.skewCount) {
                reporting = true;
                if (info.nextReport === SECOND_SKEW_REPORT) {
                    info.nextReport = SUBSEQUENT_SKEW_REPORT;
                } else {
                    info.nextReport += SUBSEQUENT_SKEW_REPORT;
                }
            }
        } else {
            // initialize average
            info = {
                skewCount: 1,
                skewTotal: skew,
                nextReport: SECOND_SKEW_REPORT
            };
            _.merge(info, getAgentInfo(headers));
            // force reporting
            reporting = true;
        }

        // Intervene here and above to discard outliers, e.g. lost 30s
        // to VPN key exchange or going through a tunnel on the train.

        info.skewMean = info.skewTotal / info.skewCount;
        sessions.set(sessionId, info); // update LRU cache

        // Log at post 1, SECOND_SKEW_REPORT, SUBSEQUENT_SKEW_REPORT,
        // SUBSEQUENT_SKEW_REPORT*2, SUBSEQUENT_SKEW_REPORT*3 etc.

        if (reporting) {
            var tags = TAGS.concat([ 'clock-offset' ]),
                blob = {
                    session: sessionId,
                    // server: now.toJSON(),
                    // client: clientNow.toJSON(),
                    skew: + skew.toFixed(0),
                    skewMean: + info.skewMean.toFixed(0),
                    skewMean_h: + (info.skewMean / (1000 * 3600)).toFixed(4),
                };

            server.log(tags, blob);
        }

        // Adjust the entries.

        _.forEach(entries, function adjustEntry(entry) {
            // correct timestamps
            if (entry.timestamp) {
                entry.timestamp = + (entry.timestamp + info.skewMean).toFixed(0);
            }
            // Denormalize short _agent if there's an error or elapsed
            // time figure, sparing us having to look it up vs session.
            if (entry.err || entry.elapsed) {
                entry.agent = info.agent;
                entry._agent = info._agent;
            }
        });

        // Return the skew so we can return it to the client.

        return info.skewMean;
    }

    function getAgentInfo(headers) {
        assert(_.isObject(headers));

        var agentFull = headers['user-agent'],
            agent = useragent.parse(agentFull).toAgent(),
            // agent hash lets us investiage by specific version/OS/etc
            // without having to log the entire string
            _agent = crypto.createHash('md5')
                              .update(agentFull)
                              .digest('hex')
                              .slice(0, 8),
            entry = agents.get(agentFull);

        if (!entry) {
            var tags = TAGS.concat([ 'user-agent-info' ]);
            entry = {
                agent: agent,
                agentFull: agentFull,
                _agent: _agent,
            };
            server.log(tags, entry);
            agents.set(agentFull, entry);
        }

        return entry;
    }
}

module.exports.register = register;
