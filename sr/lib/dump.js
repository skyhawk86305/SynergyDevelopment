'use strict';

var util = require('util'),
    _ = require('lodash');

function dump(ob) {
    var args = _.toArray(arguments);

    switch (args.length) {
        case 0:
            return; // called just to make jshint happy
        case 1:
            args = args[0];
            break;
        default:
            break;
    }

    var location = new Error().stack.split('\n')[2].replace(/^[ ]+/, '--- ') + '\n';

    try {
        console.error(
            location + util.inspect(args, {
                depth: null,
                colors: process.stderr.isTTY,
                customInspect: false,
            }));
    } catch (err) {
        console.error(location, args);
    }

    return ob;
}

module.exports = dump;
