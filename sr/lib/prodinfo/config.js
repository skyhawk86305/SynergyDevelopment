'use strict';

var assert = require('assert'),
    CompatibilityMatrix = require('./matrix'),
    _ = require('lodash');

/**
 * Create a Config from a raw system in UpdatedPCD.
 */

function Config(rawSystem, controllerModel) {
    if (!(this instanceof Config)) {
        return new Config(rawSystem);
    }

    assert.equal(typeof rawSystem, 'object', 'rawSystem ' + typeof rawSystem);

    var stats = rawSystem.stats,
        controllerCount = stats.chassis_count * stats.controller_per_chassis;

    _.merge(this, {
        platformModel: controllerModel,
        configModel: rawSystem.name,
        configDesc: rawSystem.config,
        controllerCount: controllerCount,
        isHA: controllerCount > 1,
        isEmbedded: rawSystem.hardware.embedded_shelves.length > 0,
        isSellable: rawSystem.sellable,
        stats: rawSystem.stats,
        matrix: new CompatibilityMatrix(rawSystem.name),
    });
}

module.exports = Config;
