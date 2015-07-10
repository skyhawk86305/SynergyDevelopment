'use strict';

var assert = require('assert'),
    _ = require('lodash'),
    dump = require('../../lib/dump');

dump(); // make linter happy

var DEFAULTS = {
        encryptedDrivesAreDistinct: false,
        flashPoolDrivesAreDistinct: true,
        includeSmallestDrive: false,
        includeEOA: false,
    };

function findShelfDriveCombinations(config, version, options) {
    assert(_.isObject(config));
    assert(_.isString(version));
    assert(_.isPlainObject(options = options || {}));

    _.defaults(options, DEFAULTS);

    var firstPass = _(['shelfPresets', 'embeddedShelves', 'shelves'])
        .map(function (key) { return config.matrix.hardwareOptions[key]; })
        .flatten()
        .filter(compatible)
        .value();

    if (!options.includeEOA) {
        firstPass = _.filter(firstPass, sellable);
    }

    var byInterest = _.groupBy(firstPass, interestKey),
        chosen = _.flatten(_.map(_.values(byInterest), takeFirstAndLastByCapacity));

    return _.map(chosen, repr);

    function takeFirstAndLastByCapacity(all) {
        switch (all.length) {
            case 0:
                return [];
            case 1:
                return all[0];
            default:
                all = _.sortBy(all, getMarketing);
                if (options.includeSmallestDrive) {
                    return [ all[0], all[all.length - 1] ];
                } else {
                    return [ all[all.length - 1] ];
                }
        }
    }

    function getMarketing(preset) {
        var marketing = 0;
        _.forEach(preset.drives, function (dp) {
            marketing += dp.quantity * dp.drive.capacity.marketing;
        });
        return marketing;
    }

    function interestKey(preset) {
        var parts = [ preset.shelf.model ];

        _.forEach(preset.drives, function (dp) {
            parts.push(dp.quantity + 'X');
            var drive = dp.drive;
            parts.push(drive.speed + 'kRPM');
            if (options.encryptedDrivesAreDistinct) {
                parts.push(drive.encrypted ? 'ENC' : '!ENC');
            }
            if (options.flashPoolDrivesAreDistinct) {
                parts.push(drive.fp_support ? 'FP' : '!FP');
            }
        });

        return parts.join(' ');
    }

    function sellable(preset) {
        return preset.shelf.sellable &&
               _(preset.drives).map('drive').all('sellable');
    }

    function compatible(preset) {
        return _(preset.drives).map('drive').all(function (drive) {
            return config.matrix.checkVersionShelfDrive(version, preset.shelf.model, drive.model).compatible;
        });
    }

    function repr(preset) {
        var shelfModel = preset.shelf.model,
            driveCountsByModel = _.zipObject(_.map(preset.drives, function (presetDrive) {
                return [ presetDrive.drive.model, presetDrive.quantity ];
            })),
            rawGB = 0;

        for (var driveModel in driveCountsByModel) {
            var compat = config.matrix.checkVersionShelfDrive(version, shelfModel, driveModel),
                rawPer = compat.drive.capacity.marketing;
            rawGB += rawPer * driveCountsByModel[driveModel];
        }

        return {
            shelfModel: preset.shelf.model,
            rawGB: rawGB,
            driveCountsByModel: driveCountsByModel
        };
    }
}

module.exports = findShelfDriveCombinations;
