'use strict';

var assert = require('assert'),
    _ = require('lodash'),
    findShelfDriveCombinations = require('./find-combo-shelf-drive'),
    dump = require('../../lib/dump');

dump(); // make linter happy

var DEFAULTS = {
        maxShelfCombos: 2, // max shapes of shelf per test
    };

function findSystemStorageCombinations(config, version, options) {
    assert(_.isObject(config));
    assert(_.isString(version));
    assert(_.isPlainObject(options = options || {}));

    _.defaults(options, DEFAULTS);

    var tryNext = findShelfDriveCombinations(config, version, options),
        isEmbeddedShelfDrive = makeEmbedChecker(config, version),
        tryFirst = _.filter(tryNext, shouldTryFirst),
        limits = config.matrix.getLimitsForVersion(version);

    return allViablePropositions();

    function shouldTryFirst(combination) {
        if (config.isEmbedded) {
            return isEmbeddedShelfDrive(combination.shelfModel, config.driveCountsByModel);
        } else {
            return true;
        }
    }

    function isArrayOfObject(x) {
        return _.isArray(x) && (x.length === 0 || _.isPlainObject(x[0]));
    }

    function isArrayOfArray(x) {
        return _.isArray(x) && (x.length === 0 || _.isArray(x[0]));
    }

    function allViablePropositions(startingWith) { // return arr of arr
        var result = [ ];
        if (startingWith) {
            result.push(startingWith);
        } else {
            startingWith = [];
        }

        if (startingWith.length >= options.maxShelfCombos) {
            return result;
        }

        var nextShelfOptions = _.filter(getOptionsForNextShelves(startingWith || []));
        assert(isArrayOfObject(nextShelfOptions));

        if (!nextShelfOptions.length) {
            return result;
        }

        _.forEach(nextShelfOptions, processOption);
        return result;

        function processOption(option) {
            var nextStartingWidth = (startingWith || []).concat([option]);
            var tail = allViablePropositions(nextStartingWidth);
            assert(isArrayOfArray(tail));
            result.push.apply(result, tail);
        }
    }

    function getOptionsForNextShelves(startingWith) { // ret arr of ob
        assert(isArrayOfObject(startingWith));
        startingWith = startingWith || [];

        var rawGB = sum(_.map(startingWith, 'rawGB')),
            shelfCount = sum(_.map(startingWith, 'shelfCount')),
            shelfLimit = limits.ext_shelves + ( config.isEmbedded ? 1 : 0 ),
            remainingGB = limits.capacity_gb - rawGB,
            remainingShelfCount = shelfLimit - shelfCount,
            firstEmbedded = config.isEmbedded && startingWith.length === 0,
            combinations = firstEmbedded ? tryFirst : tryNext;

        var result = _.flatten(_.filter(_.map(combinations, makeOptionsFor)));
        return result;

        function makeOptionsFor(combination) { // ret arr of ob
            if (_(startingWith).where({
                shelfModel: combination.shelfModel,
                driveCountsByModel: combination.driveCountsByModel
            }).any()) {
                return null;
            }

            var limits = [ remainingShelfCount, Math.floor(remainingGB / combination.rawGB) ];
            if (firstEmbedded) {
                limits.push(1);
            }

            var maxNewShelfCount = _.min(limits);

            if (maxNewShelfCount < 1) {
                return null;
            } else {
                return _.map(shelfCountsToTry(maxNewShelfCount), function (newShelfCount) { // ret ob
                    return {
                        shelfCount: newShelfCount,
                        shelfModel: combination.shelfModel,
                        rawGB: newShelfCount * combination.rawGB,
                        driveCountsByModel: combination.driveCountsByModel
                    };
                });
            }
        }

        function shelfCountsToTry(max) {
            if (max <= 4) {
                return _.range(1, max + 1);
            } else {
                return _(1)
                    .range(4)
                    .concat([ Math.floor(max * 0.5) ])
                    .concat([ max ])
                    .uniq()
                    .value();
            }
        }
    }
}

function reprProposition(prop) {
    var descs = _.map(prop, reprCombination);
    return descs.join('; ');
}

function reprCombination(combination) {
    return combination.shelfCount + '*' + combination.shelfModel + ' with ' + _.map(combination.driveCountsByModel, reprDriveCount).join(' & ');
}

function reprDriveCount(driveCount, driveModel) {
    return driveCount + '*' + driveModel;
}

function prop2spec(config, version, proposition) {
    var spec = {
            configModel: config.configModel,
            version: version,
            shelves: []
        };

    _.forEach(proposition, function (combination) {
        var shelves = {
                model: combination.shelfModel,
                isEmbedded: config.isEmbedded && spec.shelves.length === 0,
                quantity: combination.shelfCount,
                drives: []
            };
        _.forEach(combination.driveCountsByModel, function (count, model) {
            shelves.drives.push({
                model: model,
                quantity: count
            });
        });
        spec.shelves.push(shelves);
    });

    return spec;
}

function sum(seq) {
    var total = 0;
    for (var idx in seq) {
        total += seq[idx];
    }
    return total;
}

function makeEmbedChecker(config, version) {
    var embeds = _(config.matrix.hardwareOptions.embeddedShelves)
            .map(function makeEmbedShelfMapEntry(ps) {
                var versions = _.map(ps.versions, 'version');
                if (!_.contains(versions, version)) {
                    return null;
                }
                var driveModelMap = _(ps.drives)
                    .map(function makeEmbedDriveMapEntry(pd) {
                        return [ pd.drive.model, true ];
                    })
                    .zipObject()
                    .value();
                return [ ps.shelf.model, driveModelMap ];
            })
            .filter()
            .zipObject()
            .value();

    return checkEmbeddedCompatibility;

    function checkEmbeddedCompatibility(shelfModel, driveModel) {
        switch (typeof driveModel) {
            case 'undefined':
                return _.has(embeds, shelfModel);
            case 'string':
                return _.has(embeds, shelfModel) &&
                       embeds[shelfModel][driveModel];
            case 'object':
                console.error(_.keys(driveModel));
                return _(driveModel).keys()
                    .all(_.partial(checkEmbeddedCompatibility, shelfModel));
            default:
                throw new Error('bad driveModel');
        }
    }
}

module.exports = findSystemStorageCombinations;
module.exports.repr = reprProposition;
module.exports.prop2spec = prop2spec;
