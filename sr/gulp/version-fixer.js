'use strict';

var path = require('path'),
    btt = require('browserify-transform-tools'),
    hgcmd = require('hgcmd'),
    util = require('util');

function makeVersionFixer(home) {
    var versionTarget = path.join(home, 'version'),
        versionTargetJS = versionTarget + '.js',
        inlined = null,
        mrtOptions = {
            evaluateArguments: true
        };

    return btt.makeRequireTransform(inlineVersion.name, mrtOptions, inlineVersion);

    function inlineVersion(args, opts, callback) {
        if (args[0][0] !== '.') {
            return callback(); // can't be path to version.js
        }

        var target = path.resolve(path.join(path.dirname(opts.file), args[0]));

        if (!(target === versionTarget || target === versionTargetJS)) {
            return callback();
        }

        if (inlined !== null) {
            return callback(null, inlined);
        }

        hgcmd.parents(home, function (err, parents) {
            if (inlined) {
                // short-cut if we got asked twice
                return callback(null, inlined);
            }

            var _version;

            if (err) {
                _version = require(versionTarget);
                console.log('Can\'t inline updated version:', err.toString());
                console.log('Inlining static version file:', '\n' + pretty(_version));
            } else {
                _version = {
                    branch: parents[0].branch,
                    revision: parents[0].node,
                    dirty: 'unknown',
                    datetime:  new Date().toUTCString()
                };
                if (parents.length > 1) {
                    _version.merged_with = {
                        branch: parents[1].branch,
                        revision: parents[1].node,
                    };
                }
                console.log('Inlining dynamic version file:', '\n' + pretty(_version));
            }

            inlined = JSON.stringify(_version);
            return callback(null, inlined);
        });
    }
}

function pretty(ob, stream) {
    stream = stream || process.stdout;
    return util.inspect(ob, { depth: null, colors: stream.isTTY });
}

module.exports = makeVersionFixer;
