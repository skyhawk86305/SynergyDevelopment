#!/usr/bin/env node

'use strict';

var assert = require('assert'),
    path = require('path'),
    fs = require('fs'),
    zlib = require('zlib'),
    through2 = require('through2'),
    util = require('util'),
    _ = require('lodash');

/**
 * As an module: exports a function returning an object mapping filenames
 * from this directory to functions that call back with the text or, if
 * JSON, object. The filenames have the transforming extensions removed:
 * gz, base64, json.
 *
 * As a command line script: list the available files, or dump the named
 * file to stdout.
 */

function concat(fn, options) {
    var text = '';

    function onChunk(chunk, enc, callback) {
        text += chunk;
        callback(null);
    }

    function onEnd(callback) {
        // jshint -W040
        this.push(fn(text));
        callback(null);
    }

    if (options) {
        return through2(options, onChunk, onEnd);
    } else {
        return through2(onChunk, onEnd);
    }
}

function base64() {
    return concat(function(text) {
        return new Buffer(text, 'base64');
    });
}

function gz() {
    return zlib.Unzip();
}

function json() {
    return concat(function(text) {
        return JSON.parse(text);
    }, { objectMode: true });
}

function getFirstObject(callback) {
    var ob;

    function onWrite(chunk, enc, _callback) {
        assert(!ob, '>1 item in object stream');
        ob = chunk;
        _callback(null);
    }

    function onEnd(_callback) {
        setImmediate(callback, null, ob); // for us
        _callback(null); // for through2
    }

    return through2.obj(onWrite, onEnd);
}

var DECODERS = {
    '.base64': base64,
    '.gz': gz,
    '.json': json,
};

function decoders(name) {
    var ext, fn, fns = [];
    while (true) {
        if ((ext = path.extname(name)) === '' || !(fn = DECODERS[ext])) {
            return {
                name: name,
                decoders: fns,
            };
        }

        fns.push(fn);
        name = name.slice(0, name.length - ext.length);
    }
}

function load(name, process, callback) {
    if (arguments.length === 2) {
        return _.partial(load, name, process);
    }

    assert(typeof name === 'string');
    assert(typeof process === 'function' || !process);
    assert(typeof callback === 'function');

    var fns = decoders(name).decoders,
        fn,
        first = fs.createReadStream(path.join(__dirname, name)),
        stream = first;

    first.pause();

    while (fns.length) {
        fn = fns.shift();
        stream = stream.pipe(fn());
    }

    function onResult(err, result) {
        if (err) {
            return callback(err);
        }

        if (!process) {
            return callback(null, result);
        }

        var processed;

        try {
            processed = process(result);
        } catch (err) {
            return callback(err);
        }

        return callback(null, processed);
    }

    if (fn === json) {
        stream.pipe(getFirstObject(onResult));
    } else {
        stream.pipe(concat(function (text) {
            onResult(null, text);
        }));
    }

    first.resume();
}

function ls() {
    function isNotJavaScript(name) {
        return path.extname(name) !== '.js';
    }

    function makeLoader(name) {
        return _.partial(load, name);
    }

    function getShortName(name) {
        return decoders(name).name;
    }

    var rawNames = fs.readdirSync(__dirname),
        names = _.filter(rawNames, isNotJavaScript),
        shortNames = _.map(names, getShortName),
        loaders = _.map(names, makeLoader),
        index = _.zipObject(shortNames, loaders);

    return index;
}

module.exports = ls();

function selftest() {
    var result = decoders('7fc2694e-v4-2014-06-16.json.gz.base64');
    assert(result.name === '7fc2694e-v4-2014-06-16');
    assert(result.decoders.length === 3);
    assert(result.decoders[0].name === 'base64');
    assert(result.decoders[1].name === 'gz');
    assert(result.decoders[2].name === 'json');
}

if (!module.parent) {
    selftest();
    if (process.argv.length === 2) {
        console.log(_.keys(ls()).join('\n'));
    } else if (process.argv.length === 3) {
        ls()[process.argv[2]](null, function (err, result) {
            if (err) {
                // dump errors to stderr
                console.error(err.stack);
            } else {
                if (typeof(result) === 'object') {
                    if (process.stdout.isTTY) {
                        // pretty-print JSON if we're not piped
                        console.log(util.inspect(result, {
                            depth: null,
                            colors: true,
                        }));
                    } else {
                        // stringify JSON if we're piped
                        console.log(JSON.stringify(result));
                    }
                } else {
                    // dump everything else to stdout
                    console.log(result);
                }
            }
        });
    } else {
        console.error('usage: node', process.argv[1], '[filename]');
    }
}
