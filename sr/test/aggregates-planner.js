'use strict';

var lab = require('lab'),
    _ = require('lodash'),
    util = require('util'),
    prod = require('./lib/get-cached-prodinfo'),
    CONFIG_GROUPS = require('../lib/constants').CONFIG_GROUPS,
    Builder = require('../lib/model/builder'),
    ModelMap = require('../lib/model/map.js'),
    planAggregates = require('../lib/model/aggregates/planner'),
    findSystemStorageCombinations = require('./lib/find-combo-system-storage'),
    reprSSC = findSystemStorageCombinations.repr,
    specFromSSC = findSystemStorageCombinations.prop2spec,
    dump = require('../lib/dump'),
    buildTo = require('./lib/quick-build'),
    TESTS = require('./lib/find-combo-config-version'),
    assert = require('assert'),
    mutil = require('../lib/model/util');

dump(); // make linter happy

// Controls for how exhaustive the tests are.
var ENCRYPTION_DISTINCT = false,  // are encrypted drives different?
    FP_SUPPORT_DISTINCT = true,   // are FP drives different?
    SMALL_DRIVE_COVERAGE = false, // take small drives as well as largest?
    MAX_ENTRY_COUNT = 2;          // max shapes of shelf per test

// thin the herd
// TODO: expand coverage
TESTS = [{
    group: CONFIG_GROUPS.FAS,
    subGroup: CONFIG_GROUPS.FAS_CMODE_NORMAL,
    models: [
        'FAS2552HA',
        'FAS2552',
        'FAS6220A',
    ],
    versions: [ '8.3RC2 Cluster-Mode' ],
}, {
    group: CONFIG_GROUPS.E,
    subGroup: CONFIG_GROUPS.E_NORMAL,
    models: ['E5660 Duplex 24GB'],
    versions: ['8.20 SANtricity']
}];

var captured = {};

function capture(key, value) {
    captured[key] = value;
    return value;
}

var X417A_900GB_SAS_DS2246_FDE_NOSLICE_NOFP = 'X417A',
    X423A_900GB_SAS_DS2246_FP_SLICE = 'X423A',
    X439A_1600GB_SSD_DS2246_FP_SLICE = 'X439A',
    X438A_400GB_SSD_DS2246_FP = 'X438A',
    X575A_400GB_SSD_DS4246_FP = 'X575A',
    X477A_4TB_NLSAS_DS4246_FP = 'X477A',
    X316A_6TB_NLSAS_DS4246_FP = 'X316A';

lab.experiment(capture('group', CONFIG_GROUPS.FAS), function () {
    lab.experiment(capture('subGroup', CONFIG_GROUPS.FAS_CMODE_NORMAL), function () {
        lab.experiment(capture('version', '8.3RC2 Cluster-Mode'), function () {
            lab.experiment('FAS2552HA, DS2246, 24*X417A (FDE SAS)', function () {
                var spec = {
                        configModel: 'FAS2552HA',
                        version: captured.version, // it'll be different in before
                        shelves: [ {
                            model: 'DS2246',
                            quantity: 1,
                            isEmbedded: true,
                            drives: [ {
                                model: X417A_900GB_SAS_DS2246_FDE_NOSLICE_NOFP,
                                quantity: 24
                            } ]
                        } ],
                    },
                    build = buildTo(spec);

                lab.before(build);

                lab.test('built OK', build.ok);

                lab.test('filled OK', function (done) {
                    checkFillLevels(build.hagi);
                    done();
                });
                // TODO: check no slicing
            });

            lab.experiment('FAS2552HA, DS2246, 24*X439A (SSD)', function () {
                var spec = {
                        configModel: 'FAS2552HA',
                        version: captured.version, // it'll be different in before
                        shelves: [ {
                            model: 'DS2246',
                            isEmbedded: true,
                            quantity: 1,
                            drives: [ {
                                model: X439A_1600GB_SSD_DS2246_FP_SLICE,
                                quantity: 24
                            } ]
                        } ],
                    },
                    build = buildTo(spec);

                lab.before(build);

                lab.test('built OK', build.ok);

                lab.test('filled OK', function (done) {
                    checkFillLevels(build.hagi);
                    done();
                });
            });

            lab.experiment('FAS2552HA, DS2246, 24*X423A (SAS)', function () {
                var spec = {
                        configModel: 'FAS2552HA',
                        version: captured.version, // it'll be different in before
                        shelves: [ {
                            model: 'DS2246',
                            isEmbedded: true,
                            quantity: 1,
                            drives: [ {
                                model: X423A_900GB_SAS_DS2246_FP_SLICE,
                                quantity: 24
                            } ]
                        } ],
                    },
                    build = buildTo(spec);

                lab.before(build);

                lab.test('built OK', build.ok);

                lab.test('filled OK', function (done) {
                    checkFillLevels(build.hagi);
                    done();
                });
            });

            lab.experiment('FAS2552HA, DS2246, 24*900GB NOFP, 12*300GB SSD', function () {
                var spec = {
                        configModel: 'FAS2552HA',
                        version: '8.3RC2 Cluster-Mode',
                        shelves: [ {
                            model: 'DS2246',
                            isEmbedded: true,
                            quantity: 1,
                            drives: [ {
                                model: X417A_900GB_SAS_DS2246_FDE_NOSLICE_NOFP,
                                quantity: 24
                            } ]
                        }, {
                            model: 'DS2246',
                            isEmbedded: false,
                            quantity: 3,
                            drives: [ {
                                model: X438A_400GB_SSD_DS2246_FP,
                                quantity: 4
                            } ]
                        } ]
                    },
                    build = buildTo(spec);

                lab.before(build);

                lab.test('built OK', build.ok);

                lab.test('filled OK', function (done) {
                    summarize(build.hagi.aggregates);
                    checkFillLevels(build.hagi);
                    done();
                });

                lab.test('no root/data slicing present', function (done) {
                    var slices = _(build.hagi.controllers)
                        .flatten('_assigned_storage')
                        .value();
                    lab.expect(slices).to.eql([]);
                    done();
                });

                lab.test('chose 900GB SAS over 400GB SSD for root', function (done) {
                    var types = _(build.hagi.aggregates)
                        .where({ is_root_aggregate: true })
                        .flatten('_raid_groups')
                        .flatten('__deviceSpecs')
                        .map('spec')
                        .map('type')
                        .uniq()
                        .value();
                    lab.expect(types).to.eql([ 'SAS' ]);
                    done();
                });
            });

            lab.experiment('FAS8060A, DS4246, 8*X575A, 40*X477A, 192*X316A', function () {
                var spec = {
                        configModel: 'FAS8060A',
                        version: '8.3RC2 Cluster-Mode',
                        shelves: [ {
                            model: 'DS4246',
                            quantity: 2,
                            isEmbedded: false,
                            drives: [ {
                                model: X575A_400GB_SSD_DS4246_FP,
                                quantity: 4
                            }, {
                                model: X477A_4TB_NLSAS_DS4246_FP,
                                quantity: 20
                            } ]
                        }, {
                            model: 'DS4246',
                            quantity: 8,
                            isEmbedded: false,
                            drives: [ {
                                model: X316A_6TB_NLSAS_DS4246_FP,
                                quantity: 24
                            } ]
                        } ],
                    },
                    build = buildTo(spec);

                lab.before(build);

                lab.test('built OK', build.ok);

                lab.test('filled OK', function (done) {
                    summarize(build.hagi.aggregates);
                    checkFillLevels(build.hagi);
                    done();
                });

                lab.test('chose 4TB NL-SAS over 6TB NL-SAS and 400GB SSD', function (done) {
                    var specs = _(build.hagi.aggregates)
                        .where({ is_root_aggregate: true })
                        .flatten('_raid_groups')
                        .flatten('__deviceSpecs')
                        .map('spec')
                        .map(getShortSpec)
                        .uniq(JSON.stringify)
                        .value();
                    lab.expect(specs).to.eql([{
                        model: 'X477A',
                        rawgb: 4000,
                        type: 'NL-SAS',
                    }]);
                    done();

                    function getShortSpec(spec) {
                        return _.pick(spec, 'model', 'rawgb', 'type');
                    }
                });

            });
        });
    });
});

// lab.experiment(capture('group', CONFIG_GROUPS.E), function () {
//     lab.before(prod);

//     lab.experiment(capture('subGroup', CONFIG_GROUPS.E_NORMAL), function () {
//         lab.experiment(capture('version', '8.20 SANtricity'), function () {

//         });
//     });
// });

if (!module.parent) {
    // Exhaustively test ONLY if this module is run directly as a script:
    lab.experiment('exhaustive planning', testExhaustively);
}

function testExhaustively() {
    lab.before(prod);

    _.forEach(TESTS, function (test) {
        var groupDesc = util.format('of %s %s', test.subGroup, test.group);
        lab.experiment(groupDesc, function () {
            _.forEach(test.versions, function (version) {
                lab.experiment('running ' + version + ':', function () {
                    _.forEach(test.models, function (model) {
                        declareExperiment(test, model, version);
                    });
                });
            });
        });
    });

    function declareExperiment(test, model, version) {
        var config;

        lab.before(function (done) {
            var group = prod.info.getConfigGroup(test.group, test.subGroup);
            config = group.getConfig(model);
            done();
        });

        lab.experiment(model, function testModelRunningSpecificVersion() {
            var propositions;

            lab.test('is still sellable', function (done) {
                lab.expect(config.isSellable).to.equal(true,
                    'need to update list of interesing hardware');
                done();
            });

            lab.test('can find release', function (done) {
                lab.expect(_.contains(config.matrix.versions, version)).to.equal(true);
                done();
            });

            lab.test('can find interesting shelf experiments', function (done) {
                var fsscOptions = {
                        encryptedDrivesAreDistinct: ENCRYPTION_DISTINCT,
                        flashPoolDrivesAreDistinct: FP_SUPPORT_DISTINCT,
                        includeSmallestDrive: SMALL_DRIVE_COVERAGE,
                        maxShelfCombos: MAX_ENTRY_COUNT,
                    };

                propositions = findSystemStorageCombinations(config, version, fsscOptions);
                return done();
            });

            lab.test('can build those', function (done) {
                _.forEach(propositions, function (proposition) {
                    console.error('#####', model, 'with', reprSSC(proposition));
                    var spec = specFromSSC(config, version, proposition),
                        clip = { synergy_model: { hagroups: [] } },
                        builder = new Builder(prod.info, clip),
                        result,
                        sawSlices = false,
                        begin = process.hrtime();

                    dump(spec);

                    try {
                        if (test.subGroup === CONFIG_GROUPS.FAS_CMODE_NORMAL) {
                            var clusterId = null;
                            result = builder.addSystemToCluster(spec, clusterId);
                        } else {
                            result = builder.addSystem(spec);
                        }
                    } catch (err) {
                        console.error('failed in builder', err.stack); // err.stack for spam
                        return;
                    }

                    var span = process.hrtime(begin),
                        buildTime = span[0] * 1e3 + span[1]/1e6;

                    _.forEach(result.controllers, function wipe(controller) {
                        sawSlices = sawSlices || (controller._assigned_storage || []).length;
                    });

                    var map = new ModelMap(prod.info, clip),
                        hagi = map.inspect(result);

                    var aggregates = planAggregates(hagi);

                    console.error('build ms', buildTime.toPrecision(5));
                    console.error(hagi.deviceInfo.where.physical.length + ' drives ->');
                    summarize(aggregates);

                    if (sawSlices) {
                        var roots = hagi.aggregates.where({ is_root_aggregate: true });
                        lab.expect(_.all(roots, isSliced)).to.be.ok();
                    }

                    checkFillLevels(hagi);
                });

                done();
            });

            function isSliced(aggr) {
                return aggr._raid_groups[0].__deviceSpecs[0].spec.slice !== undefined;
            }
        });
    }
}

function whine() {
    if (!module.parent) {
        console.error.apply(console, arguments);
    }
}

function checkFillLevels(hagi, deviceGroups) {
    deviceGroups = deviceGroups || getDeviceGroups(hagi);
    return _.filter(_.map(deviceGroups, checkFill));

    function checkFill(deviceGroup) {
        var byUsed = _.groupBy(deviceGroup.devices, used),
            _all = deviceGroup.devices,
            _used = (byUsed[true] || []),
            _unused = (byUsed[false] || []);

        assert.equal(_all.length, _used.length + _unused.length);

        if (_unused.length === 0) {
            // why no spares?
            if (hagi.isESeries) {
                // DDP
            } else if (_.all(deviceGroup.devices, sliced)) {
                // phew!
                // the slices will come up as a group of their own
            } else if (deviceGroup.spec.slice === 'P2') {
                whine('TODO: check whether ADP would like spares or not');
            } else if (_.all(deviceGroup.devices, { why: 'fpsp' })) {
                whine('TODO: fix bug where storage pools don\'t get spares');
            } else if (_.all(_.map(deviceGroup.devices, 'spec'), { type: 'SSD' })) {
                whine('TODO: fix bug where we don\'t take spares for old style FP SSDs');
                whine('repair raid group info in consumers so we can tell if this is FP or data');
            } else {
                whine({ deviceGroup: deviceGroup });
                throw new Error('group unexpectedly full');
            }
        }

        if (_unused.length / _all.length > 0.5) {
            var usedByAggrIds = _(deviceGroup.devices)
                    .filter(used)
                    .flatten('consumers')
                    .where({ _type: 'aggregate' })
                    .map('_id')
                    .value();
            dump({
                spec: deviceGroup.spec,
                used: _.map(_used, 'id'),
                unused: _.map(_unused, 'id'),
                usedByAggrIds: _.uniq(usedByAggrIds),
                allAggregates: hagi.aggregates
            });
            throw new Error('group at least half used');
        }
    }

    function used(info) {
        return info.consumers.length > 0;
    }

    function sliced(info) {
        return _.any(info.consumers, { _type: 'slice' });
    }
}

function getDeviceGroups(hagi) {
    var byOntapSelection = _.groupBy(hagi.deviceInfo, mutil.minimalSpecKey);
    return _.map(byOntapSelection, unzip);

    function unzip(devices, key) {
        return {
            spec: JSON.parse(key),
            devices: devices
        };
    }
}

function summarize(aggregates) {
    if (!module.parent) {
        _.forEach(aggregates, printAggr);
    }

    function printAggr(aggr) {
        console.error(reprAggr(aggr));
    }
}

function reprAggr(aggr) {
    var devices = _(aggr._raid_groups)
            .map('__deviceSpecs').flatten()
            .groupBy(descSpec)
            .mapValues(countSpecs)
            .map(repr)
            .value();
    return [ aggr.name, 'with', devices.join(', ') ].join(' ');

    function descSpec(deviceSpec) {
        if (deviceSpec.spec.slice) {
            return deviceSpec.spec.rsgb.toPrecision(5) + 'GB ' + deviceSpec.spec.slice;
        } else {
            return deviceSpec.spec.rawgb + 'GB @' + deviceSpec.spec.rpm + 'K';
        }
    }

    function countSpecs(deviceSpecs) {
        var tot = 0;
        _.forEach(deviceSpecs, function (deviceSpec) {
            tot += deviceSpec.count;
        });
        return tot;
    }

    function repr(count, desc) {
        return count + '*' + desc;
    }
}
