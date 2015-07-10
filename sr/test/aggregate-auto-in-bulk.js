'use strict';
/*jshint unused:false */

var lab = require('lab'),
    assert = require('assert'),
    single = require('../lib/single'),
    ModelMap = require('../lib/model/map'),
    SystemSummary = require('../lib/model/aggregates/systemSummary'),
    repair = require('../lib/clip/repair'),
    reduce = require('../lib/clip/reduce'),
    enforce = require('../lib/enforce'),
    prod = require('./lib/get-cached-prodinfo'),
    buildTo = require('./lib/quick-build'),
    dump = require('../lib/dump'),
    _ = require('lodash');

dump(); // make linter happy

var MATCH_EMPTY= /^$/;

var X423A_900GB_SAS_FOR_DS2246 = 'X423A',
    X446B_200GB_SSD_FOR_DS2246 = 'X446B',
    X448A_200GB_SSD_FOR_DS4246_NO_AFF_SLICE = 'X448A'; // FP OK

lab.experiment('automatic aggregates', function() {
    var aggrs;

    lab.experiment('with 24-drive FAS2552HA', function () {
        var spec = {
                configModel: 'FAS2552HA',
                version: '8.3RC1 Cluster-Mode',
                shelves: [{
                    model: 'DS2246',
                    quantity: 1,
                    isEmbedded: true,
                    drives: [{
                        model: X423A_900GB_SAS_FOR_DS2246,
                        quantity: 24
                    }]
                }],
            },
            bench,
            expectedAggregates = [[
                rootVirtual(10),
                dataVirtual(10),
            ], [
                rootVirtual(10),
                dataVirtual(10),
            ]];

        lab.before(bench = buildTo(spec));

        testClipReduction(bench);
        testControllerAggregates(bench, expectedAggregates);
    });

    lab.experiment('with 12-drive FAS2552HA', function () {
        var spec = {
                configModel: 'FAS2552HA',
                version: '8.3RC1 Cluster-Mode',
                shelves: [{
                    model: 'DS2246',
                    quantity: 1,
                    isEmbedded: true,
                    drives: [{
                        model: X423A_900GB_SAS_FOR_DS2246,
                        quantity: 12
                    }]
                }],
            },
            bench,
            expectedAggregates = [[
                rootVirtual(5),
                dataVirtual(10),
            ], [
                rootVirtual(5),
            ]];

        lab.before(bench = buildTo(spec));

        testClipReduction(bench);
        testControllerAggregates(bench, expectedAggregates);
    });

    lab.experiment('with 12-drive FAS2552', function () {
        var spec = {
                configModel: 'FAS2552',
                controllerCount: 1,
                version: '8.3RC1 Cluster-Mode',
                shelves: [{
                    model: 'DS2246',
                    quantity: 1,
                    isEmbedded: true,
                    drives: [{
                        model: X423A_900GB_SAS_FOR_DS2246,
                        quantity: 12
                    }]
                }],
            },
            bench,
            expectedAggregates = [[
                rootVirtual(5),
                dataVirtual(10),
            ]];

        lab.before(bench = buildTo(spec));

        testClipReduction(bench);
        testControllerAggregates(bench, expectedAggregates);
    });

    lab.experiment('AFF with internal SSD on FAS2552HA', function () {
        var spec = {
                configModel: 'FAS2552HA',
                // in the UI, we give platformModel and controllerCount
                // and they seem to be used
                // platformModel: 'FAS2552',
                // controllerCount: 2,
                version: '8.3RC2 Cluster-Mode',
                shelves: [{
                    model: 'DS2246',
                    quantity: 1,
                    isEmbedded: true,
                    drives: [{
                        model: X446B_200GB_SSD_FOR_DS2246,
                        quantity: 24
                    }]
                }],
            },
            bench,
            expectedAggregates = [[
                rootVirtual(10),
                dataVirtual(10),
            ], [
                rootVirtual(10),
                dataVirtual(10),
            ]];

        lab.before(bench = buildTo(spec));

        testClipReduction(bench);
        testControllerAggregates(bench, expectedAggregates);
    });

    lab.experiment('AFF with external SSD on FAS8020A', function () {
        var spec = {
                configModel: 'FAS8020A',
                version: '8.3RC1 Cluster-Mode',
                shelves: [{
                    model: 'DS2246',
                    quantity: 1,
                    isEmbedded: false,
                    drives: [{
                        model: X446B_200GB_SSD_FOR_DS2246,
                        quantity: 24
                    }]
                }],
            },
            bench,
            expectedAggregates = [[
                rootVirtual(10),
                dataVirtual(10), // TR3838 beating 8.3 TOI
            ], [
                rootVirtual(10),
                dataVirtual(10), // ... and again
            ]];

        lab.before(bench = buildTo(spec));

        testClipReduction(bench);
        testControllerAggregates(bench, expectedAggregates);

    });

    // lab.experiment('non-AFF because external SSD on FAS2552HA', function () {
    //     var spec = {
    //             configModel: 'FAS2552HA',
    //             // in the UI, we give platformModel and controllerCount
    //             // and they seem to be used
    //             // platformModel: 'FAS2552',
    //             // controllerCount: 2,
    //             version: '8.3RC2 Cluster-Mode',
    //             shelves: [{
    //                 model: 'DS2246',
    //                 quantity: 1,
    //                 isEmbedded: true,
    //                 drives: [{
    //                     model: X446B_200GB_SSD_FOR_DS2246,
    //                     quantity: 24
    //                 }]
    //             }, {
    //                 model: 'DS2246',
    //                 quantity: 1,
    //                 isEmbedded: false,
    //                 drives: [{
    //                     model: X423A_900GB_SAS_FOR_DS2246,
    //                     quantity: 24
    //                 }]
    //             }],
    //         },
    //         expectedAggregates = [[
    //             rootPhysical(3, X423A_900GB_SAS_FOR_DS2246),
    //             dataPhysical(8, X423A_900GB_SAS_FOR_DS2246),
    //         ], [
    //             rootPhysical(3, X423A_900GB_SAS_FOR_DS2246),
    //             dataPhysical(8, X423A_900GB_SAS_FOR_DS2246),
    //         ]];

    //     lab.before(bench.build(spec));
    //     lab.before(buildAggregates);

    //     testClipReduction();
    //     testControllerAggregates(expectedAggregates);
    // });

    lab.experiment('FAS8060A with small unsliceable drives', function () {
        var spec = {
                configModel: 'FAS8060A',
                // in the UI, we give platformModel and controllerCount
                // and they seem to be used
                // platformModel: 'FAS2552',
                // controllerCount: 2,
                version: '8.3RC2 Cluster-Mode',
                shelves: [{
                    model: 'DS4246',
                    quantity: 1,
                    isEmbedded: true,
                    drives: [{
                        model: X448A_200GB_SSD_FOR_DS4246_NO_AFF_SLICE,
                        quantity: 24
                    }]
                }],
            },
            bench,
            expectedAggregates = [[
                rootPhysical(5),
                dataPhysical(5), // TODO: 11
            ], [
                rootPhysical(5),
                dataPhysical(5), // TODO: eliminate
            ]];

        lab.before(bench = buildTo(spec));

        testClipReduction(bench);
        testControllerAggregates(bench, expectedAggregates);
    });

    function testControllerAggregates(bench, controllerSpecs) {
        assert(_.isArray(controllerSpecs));

        lab.test('has ' + controllerSpecs.length + ' controllers', function (done) {
            assert.equal(bench.result.controllers.length, controllerSpecs.length);
            done();
        });

        _.forEach(controllerSpecs, function declareControllerExp(aggrSpecs, controllerIdx) {
            assert(_.isArray(aggrSpecs));
            lab.experiment(describe(controllerIdx, 'controller'), function controllerExp() {
                var controller = null;

                lab.before(function (done) {
                    controller = controllersByAggregateCount(bench)[controllerIdx];
                    done();
                });

                lab.test('exists; _type OK', function (done) {
                    lab.expect(controller)
                        .to.be.instanceof(Object)
                        .with.property('_type', 'controller');
                    done();
                });

                lab.test('has ' + aggrSpecs.length + ' aggregates', function (done) {
                    assert.equal(controller.aggregates.length, aggrSpecs.length);
                    done();
                });

                _.forEach(aggrSpecs, function declareAggrExp(aggrSpec, aggrIdx) {
                    assert(_.isPlainObject(aggrSpec));

                    lab.experiment(describe(aggrIdx, 'aggregate'), function () {
                        var aggr;

                        lab.before(function (done) {
                            aggr = controller.aggregates[aggrIdx];
                            done();
                        });

                        _.forEach(aggrSpec, function(checkFn, title) {
                            lab.test(title, function (done) {
                                lab.expect(aggr)
                                    .to.be.instanceof(Object, 'does not exist')
                                    .with.property('_type', 'aggregate');
                                checkFn(aggr);
                                done();
                            });
                        });
                    });
                });
            });
        });
    }

    function testClipReduction(bench) {
        lab.test('did not break clip reduction', function (done) {
            lab.expect(_.partial(reduce, bench.clip)).to.not.throw();
            done();
        });
    }

    function controllersByAggregateCount(bench) {
        return _.sortBy(bench.result.controllers, function (controller) {
            return Number.MAX_SAFE_INTEGER - controller.aggregates.length;
        });
    }

    function describe(idx, noun) {
        var defaultRank = idx + 1 + 'th',
            rank = [ '1st', '2nd', '3rd' ][ idx ] || defaultRank;

        return rank + ' ' + noun;
    }

    function rootVirtual(n) {
        return aggrCheckFunctions(true, [{
            idmatch: /P2$/,
            count: n,
        }]);
    }

    function dataVirtual(n) {
        return aggrCheckFunctions(false, [{
            idmatch: /P1$/,
            count: n,
        }]);
    }

    function rootPhysical(n, model) {
        return aggrCheckFunctions(true, [{
            model: model,
            count: n,
        }]);
    }

    function dataPhysical(n, model) {
        return aggrCheckFunctions(false, [{
            model: model,
            count: n,
        }]);
    }

    function aggrCheckFunctions(is_root_aggregate, rgSpecs) {
        assert.equal(typeof is_root_aggregate, 'boolean');
        assert.equal(rgSpecs.length, 1, 'TODO: support multiple raid groups');

        var checks = {};

        if (is_root_aggregate) {
            checks['is a root aggregate'] = function (aggr) {
                lab.expect(aggr.is_root_aggregate).to.equal(true);
            };
        } else {
            checks['is a data aggregate'] = function (aggr) {
                lab.expect(aggr.is_root_aggregate).to.equal(false);
            };
        }

        checks['has ' + rgSpecs.length + ' raid group' + (rgSpecs.length === 1 ? '' : 's')] = function (aggr) {
            lab.expect(aggr._raid_groups.length).to.equal(rgSpecs.length);
        };

        _.forEach(rgSpecs, function (rgSpec, rgIdx) {
            var rgDesc = 'rg' + rgIdx;

            assert(rgSpec.model === undefined || typeof rgSpec.model === 'string');
            assert(rgSpec.idmatch === undefined || rgSpec.idmatch instanceof RegExp);
            assert(typeof rgSpec.count === 'number');

            if (rgSpec.model) {
                checks[rgDesc + ' uses only ' + rgSpec.model + ' drives'] = function (aggr) {
                    var models = _(aggr._raid_groups)
                        .map('__deviceSpecs').flatten()
                        .map('spec')
                        .map('model')
                        .unique()
                        .value();
                    lab.expect(models).to.equal([ rgSpec.model ]);
                };
            }

            if (rgSpec.idmatch) {
                checks[rgDesc + ' uses virtual device IDs matching ' + rgSpec.idmatch.toString()] = function (aggr) {
                    var mismatches = _(aggr._raid_groups)
                            .map('_devices').flatten()
                            .filter(doesNotMatch)
                            .value();

                    lab.expect(mismatches.length).to.equal(0,
                        mismatches.length +
                        ' device(s) including ' +
                        mismatches[0] +
                        ' do not match');

                    function doesNotMatch(id) {
                        assert.equal(typeof id, 'string');
                        return !id.match(rgSpec.idmatch);
                    }
                };
            }

            checks[rgDesc + ' has ' + rgSpec.count + ' devices'] = function (aggr) {
                var ids = _(aggr._raid_groups)
                    .map('_devices').flatten()
                    .value();
                lab.expect(ids.length).to.equal(rgSpec.count);
            };
        });

        return checks;
    }

    function physical(find, model, n) {
        assert.equal(typeof find, 'function');
        assert.equal(typeof n, 'number');
        assert.equal(typeof model, 'string');
        return {
            find: find,
            expect: {
                count: n,
                model: model,
            },
        };
    }
});

function expandDeviceSpecs(__deviceSpecs) {
    return _(__deviceSpecs).map(expandDeviceSpec).flatten().value();
}

function expandDeviceSpec(ds) {
    return repeat({
        count: 1,
        spec: ds.spec
    }, ds.count);
}

function repeat(value, count) {
    var result = [];
    for (var idx = 0; idx < count; idx ++) {
        result.push(value);
    }
    return result;
}
