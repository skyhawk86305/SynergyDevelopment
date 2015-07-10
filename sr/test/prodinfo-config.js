'use strict';

var lab = require('lab'),
    prod = require('./lib/get-cached-prodinfo'),
    CompatibilityMatrix = require('../lib/prodinfo/matrix'),
    CONFIG_GROUPS = require('../lib/constants').CONFIG_GROUPS,
    util = require('util'),
    _ = require('lodash');

// Different shape for this test: we're producing tests according to
// the data. Not being able to get the data will show as problems in
// broader tests.

// Getting the data is asynchronous, so we hard-wire the array of test
// candidates and then ensure all the enabled families and sub-families
// get tested.

var TESTS = [
        [ CONFIG_GROUPS.FAS, CONFIG_GROUPS.FAS_CMODE_NORMAL ],
        [ CONFIG_GROUPS.FAS, CONFIG_GROUPS.FAS_7MODE_NORMAL ],
        // [ CONFIG_GROUPS.FAS, CONFIG_GROUPS.FAS_7MODE_MC ],
        [ CONFIG_GROUPS.E, CONFIG_GROUPS.E_NORMAL ],
        [ CONFIG_GROUPS.E, CONFIG_GROUPS.EF_NORMAL ]
    ];

function forEachLineTuple(lines, fn) {
    _.forEach(lines, function (group) {
        var id = group.id;

        if (!group.enabled) {
            return;
        }

        if (group.subGroups.length === 0) {
            fn(id, '');
            return;
        }

        _.forEach(group.subGroups, function (subGroup) {
            if (!subGroup.enabled) {
                return;
            }

            fn(id, subGroup.id);
        });
    });
}

lab.experiment('ProductInfo lines', function() {

    var groups = null;

    lab.before(prod);
    lab.before(function (done) {
        groups = prod.info.getConfigGroups();
        done();
    });

    lab.test('will all be tested', function (done) {
        lab.expect(groups)
            .to.be.instanceof(Array)
            .with.length.above(0);

        forEachLineTuple(groups, function (id, subid) {
            var matches = _.where(TESTS, function (tup) {
                return tup.length === 2 && tup[0] === id && tup[1] === subid;
            });
            lab.expect(matches).to.have.length(1);
        });

        done();
    });

    _.forEach(TESTS, function (tup) {
        var fid = tup[0],
            sid = tup[1],
            fmt = 'getConfigGroup(\'%s\', \'%s\')',
            desc = util.format(fmt, fid, sid),
            group = null;

        lab.before(function (done) {
            group = prod.info.getConfigGroup(fid, sid);
            done();
        });

        lab.experiment(desc, function () {
            var floor = (fid === 'FAS' && sid === 'c-mode') ? 50 : 10;

            // Account for E / EF series differences
            floor = (floor === 10 && sid === 'ef-series') ? 2 : floor;

            lab.test('getConfigs returns at least ' + floor + ' configs', function (done) {
                lab.expect(group.getConfigs())
                    .to.be.instanceof(Array)
                    .with.length.above(floor);
                done();
            });

            lab.test('... with configModel', function (done) {
                _.forEach(group.getConfigs(), function (config) {
                    lab.expect(config.configModel)
                        .to.be.a('string')
                        .with.length.above(0);
                });
                done();
            });

            function getFailingModels(passedFn) {
                function failed(config) {
                    return !passedFn(config);
                }

                var failures = _.where(group.getConfigs(), failed),
                    failureModels = _.map(failures, 'configModel');

                return failureModels.join(', ');
            }

            function testModels(desc, passedFn) {
                lab.test(desc, function (done) {
                    var fails = getFailingModels(passedFn);
                    lab.expect(fails).to.equal('');
                    done();
                });
            }

            testModels('... with configDesc', function (config) {
                return typeof config.configDesc === 'string';
            });

            testModels('... with isSellable', function (config) {
                return typeof config.isSellable === 'boolean';
            });

            testModels('... with stats', function (config) {
                return typeof config.stats === 'object';
            });

            testModels('... with matrix', function (config) {
                return config.matrix instanceof CompatibilityMatrix;
            });

            testModels('... with isHA', function (config) {
                return typeof config.isHA === 'boolean';
            });

            testModels('... with controllerCount', function (config) {
                return typeof config.controllerCount === 'number';
            });

            testModels('... with isEmbedded', function (config) {
                return typeof config.isEmbedded === 'boolean';
            });
        });
    });
});
