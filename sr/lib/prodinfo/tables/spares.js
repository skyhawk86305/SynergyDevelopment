'use strict';

var _ = require('lodash'),
    assert = require('assert'),
    Constants = require('../../constants'),
    enforce = require('../../enforce');

var SITUATION_SPEC = {
        // key: [ type, defaultValue ]
        sparesLevel:         [ 'string', Constants.POLICIES.SPARES.DEFAULT.toLowerCase(), checkSparesLevel ],
        deviceCount:         [ 'number' /*, no default */,  checkDeviceCount ],
        raidCount:           [ 'number', 2,                 /* no check */ ],
        isEmbeddedShelfOnly: [ 'boolean', false,            /* no check */ ],
    },
    LEVELS = {
        minimum:  [ 4, 2, 1, 2, 2 ],
        balanced: [ 6, 4, 2, 2, 2 ],
        maximum:  [ 8, 6, 2, 2, 4 ],
    },
    SPARES = {
        HUGE: 0,
        LARGE: 1,
        ENTRY: 2,
        SINGLE: 3,
        MEDIUM: 4
    };

/**
 * Get the expected spares count given the situation.
 */
function getExpectedSpares(situation) {
    assert(_.isPlainObject(situation));
    situation = enforce(SITUATION_SPEC, situation);

    var counts = LEVELS[situation.sparesLevel];

    if (situation.deviceCount >= 1200) {
        return counts[SPARES.HUGE];
    } else if (situation.deviceCount >= 300) {
        return counts[SPARES.LARGE];
    } else if (situation.isEmbeddedShelfOnly) {
        return counts[SPARES.ENTRY];
    } else if (situation.raidCount < 2) {
        return counts[SPARES.SINGLE];
    } else {
        return counts[SPARES.MEDIUM];
    }
}

function checkSparesLevel(sparesLevel) {
    assert(_.has(LEVELS, sparesLevel), 'invalid spares level: ' + sparesLevel);
    return sparesLevel;
}

function checkDeviceCount(deviceCount) {
    assert(deviceCount > 1);
    return deviceCount;
}

module.exports = getExpectedSpares;
