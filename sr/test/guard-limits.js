'use strict';

var lab = require('lab'),
    _ = require('lodash'),
    testSpecs = require('./data/limit-test-specs'),
    buildTo = require('./lib/quick-build'),
    dump = require('../lib/dump');

dump(); // keep linter happy

var specs = {
        nonNse: testSpecs.CLUSTER.NON_NSE,
        homogeneous: testSpecs.CLUSTER.HOMOGENEOUS,
        singleHaPair: testSpecs.CLUSTER.SINGLE_HA_PAIR,
        heterogeneous: testSpecs.CLUSTER.HETEROGENEOUS,
        singleNode: testSpecs.CLUSTER.SINGLE_NODE,
        hardwareShelf: testSpecs.CLUSTER.HARDWARE_SHELF,
        maxCapacity: testSpecs.MAX_CAPACITY,
        maxSata: testSpecs.MAX_SATA,
        maxSsdNse: testSpecs.MAX_SSD_NSE,
        maxSas: testSpecs.MAX_SAS,
        maxFcExternal: testSpecs.MAX_FC_EXTERNAL,
        maxDrives: testSpecs.MAX_DRIVES,
        eSeriesNse: testSpecs.E_NSE,
        efSeriesNonNse: testSpecs.EF_NON_NSE
    };

lab.experiment('model/guard', function() {
    // Aggregate limits (aggr)
    lab.experiment('limits', function() {
        // TODO
        aggregates('TODO', test_1, 'hardwareShelf');

        function test_1(bench) {
            forceManual(bench.hagi.cluster.hagroups[0]);

            // var hagroup = { _id: bench.hagi.cluster.hagroups[0]._id },
            //     options = guardAddingShelf(bench, hagroup);

            // Current test system will not fail once auto fp starts building within limits
            // Wait until that work is finished to enable this test so it doesn't break.
        }

        function forceManual(hagroup) {
            _.forEach(hagroup.controllers, forceController);

            function forceController(controller) {
                _.forEach(controller.aggregates, forceAggregate);
            }

            function forceAggregate(aggregate) {
                aggregate._manual = true;
            }
        }

        // TODO: Test conflicts from deleting a shelf used by manual aggregates
    });

    // Drive limits (drive)
    lab.experiment('limits', function() {
        // NSE and non-NSE drives are not allowed to be mixed in the same FAS system
        drives('adding to a FAS hagroup (with NSE drives)', test_1, 'maxSsdNse');
        drives('adding to a FAS cluster hagroup (with non-NSE drives)', test_2, 'nonNse');
        drives('adding to an E-Series hagroup (with NSE drives)', test_3, 'eSeriesNse');
        drives('adding to an EF-Series hagroup (with non-NSE drives)', test_4, 'efSeriesNonNse');

        function test_1(bench) {
            var hagroup = { _id: bench.hagi.hagroup._id },
                options = guardAddingShelf(bench, hagroup);

            expectNseConflicts(options);
        }

        function test_2(bench) {
            var hagroup = { _id: bench.hagi.cluster.hagroups[0]._id },
                options = guardAddingShelf(bench, hagroup);

            expectNseConflicts(options);
        }

        function test_3(bench) {
            var hagroup = { _id: bench.hagi.hagroup._id },
                options = guardAddingShelf(bench, hagroup);

            expectEnabledNse(options);
        }

        function test_4(bench) {
            var hagroup = { _id: bench.hagi.hagroup._id },
                options = guardAddingShelf(bench, hagroup);

            expectEnabledNse(options);
        }
    });

    // Node limits (nas_nodes)
    lab.experiment('limits', function() {
        // The maximum node limit is determined by the platform with the smallest node limit
        nodes('adding to a homogeneous cluster (at maximum limit)', test_1, 'homogeneous');
        nodes('adding to a heterogeneous cluster (at smallest limit)', test_2, 'heterogeneous');
        nodes('changing the (only) hagroup with the smallest limit', test_3, 'heterogeneous');

        // Every node in a cluster containing two or more nodes must be part of an HA pair
        nodes('adding to a single-node cluster', test_4, 'singleNode');
        nodes('adding to a multi-node cluster', test_5, 'singleHaPair');
        nodes('changing a single-node hagroup', test_6, 'singleNode');
        nodes('changing the only multi-node hagroup', test_7, 'singleHaPair');
        nodes('changing one (of multiple) multi-node hagroup', test_8, 'homogeneous');

        function test_1(bench) {
            expectDisabled(guardAddingSystem(bench));
        }

        function test_2(bench) {
            expectDisabled(guardAddingSystem(bench));
        }

        function test_3(bench) {
            var hagroup = { _id: bench.hagi.cluster.hagroups[0]._id };
            expectEnabled(guardAddingSystem(bench, hagroup));
        }

        function test_4(bench) {
            expectDisabled(guardAddingSystem(bench));
        }

        function test_5(bench) {
            expectNodeCount(guardAddingSystem(bench), false, true);
        }

        function test_6(bench) {
            var hagroup = { _id: bench.hagi.cluster.hagroups[0]._id };
            expectNodeCount(guardAddingSystem(bench, hagroup), true, true);
        }

        function test_7(bench) {
            var hagroup = { _id: bench.hagi.cluster.hagroups[0]._id };
            expectNodeCount(guardAddingSystem(bench, hagroup), true, true);
        }

        function test_8(bench) {
            var hagroup = { _id: bench.hagi.cluster.hagroups[0]._id };
            expectNodeCount(guardAddingSystem(bench, hagroup), false, true);
        }
    });

    // Version limits (version)
    lab.experiment('limits', function() {
        // The OS is determined by the most recent version supported by all hardware in the cluster
        versions('adding a hagroup', test_1, 'singleHaPair');
        versions('adding a shelf', test_2, 'hardwareShelf');
        versions('deleteing a shelf not impacting the limits', test_3, 'hardwareShelf');
        versions('deleting the (only) shelf holding the limits down', test_4, 'hardwareShelf');
        versions('deleting a shelf from a non-limiting cluster hagroup', test_5, 'hardwareShelf');
        versions('deleting a group of shelves', test_6, 'maxCapacity');
        versions('deleting a non-limiting cluster hagroup', test_7, 'hardwareShelf');
        versions('deleting the limiting cluster hagroup', test_8, 'hardwareShelf');

        // TODO: The OS can be pinned to a specific version
        // versions('adding a system with a pinned version', test_9, 'nonNse');
        // versions('adding a shelf with a pinned version', test_10, 'nonNse');

        function test_1(bench) {
            forceVersionPolicy(bench.hagi.cluster.hagroups, false);

            var options = guardAddingSystem(bench);

            expectEnabledVersions(options);
            expectVersionConflicts(options);
        }

        function test_2(bench) {
            forceVersionPolicy(bench.hagi.cluster.hagroups, false);

            var hagroup = { _id: bench.hagi.cluster.hagroups[0]._id },
                options = guardAddingShelf(bench, hagroup);

            expectEnabledVersions(options);
            expectVersionConflicts(options);
        }

        function test_3(bench) {
            forceVersionPolicy(bench.hagi.cluster.hagroups, false);

            var hagroup = { _id: bench.hagi.cluster.hagroups[0]._id },
                shelf = { model: 'DS2246' },
                options = guardDeletingShelf(bench, hagroup, shelf);

            expectEnabledVersions(options);
            expectSpecificVersion(options, '8.0.5 Cluster-Mode');
        }

        function test_4(bench) {
            forceVersionPolicy(bench.hagi.cluster.hagroups, false);

            var hagroup = { _id: bench.hagi.cluster.hagroups[0]._id },
                shelf = { model: 'DS14-Mk4-FC' },
                options = guardDeletingShelf(bench, hagroup, shelf);

            expectEnabledVersions(options);
            expectSpecificVersion(options, '8.3RC2 Cluster-Mode');
        }

        function test_5(bench) {
            forceVersionPolicy(bench.hagi.cluster.hagroups, false);

            var hagroup = { _id: bench.hagi.cluster.hagroups[1]._id },
                shelf = { model: 'DS4246' },
                options = guardDeletingShelf(bench, hagroup, shelf);

            expectEnabledVersions(options);
            expectSpecificVersion(options, '8.0.5 Cluster-Mode');
        }

        function test_6(bench) {
            forceVersionPolicy([bench.hagi.hagroup], false);

            var hagroup = { _id: bench.hagi.hagroup._id },
                shelf = { model: 'DS4246' },
                options = guardDeletingShelf(bench, hagroup, shelf);

            expectEnabledVersions(options);
            expectSpecificVersion(options, '8.2.3 7-Mode');
        }

        function test_7(bench) {
            forceVersionPolicy(bench.hagi.cluster.hagroups, false);

            var hagroup = { _id: bench.hagi.cluster.hagroups[1]._id },
                options = guardDeletingSystem(bench, hagroup);

            expectEnabledVersions(options);
            expectSpecificVersion(options, '8.0.5 Cluster-Mode');
        }

        function test_8(bench) {
            forceVersionPolicy(bench.hagi.cluster.hagroups, false);

            var hagroup = { _id: bench.hagi.cluster.hagroups[0]._id },
                options = guardDeletingSystem(bench, hagroup);

            expectEnabledVersions(options);
            expectSpecificVersion(options, '8.3RC2 Cluster-Mode');
        }

        function forceVersionPolicy(hagroups, pin) {
            _.forEach(hagroups, forcePolicy);

            function forcePolicy(hagroup) {
                hagroup._policies.version.pin = pin;
            }
        }
    });

    // Common guard queries
    function guardAddingSystem(bench, hagroupSelection) {
        var selector = buildBaseSelector(bench, hagroupSelection),
            options = buildGuardOptions(bench),
            isReplacing = !_.isEmpty(hagroupSelection),
            guard = bench.map.guard(_.omit(selector, 'hagroup'), options);

        return isReplacing ? guard.addingSystem(selector) : guard.addingSystem();
    }

    function guardAddingShelf(bench, hagroupSelection, shelfSelection) {
        var selector = buildShelfSelector(bench, hagroupSelection, shelfSelection),
            options = buildGuardOptions(bench),
            isReplacing = !_.isEmpty(shelfSelection),
            guard = bench.map.guard(_.omit(selector, 'shelf'), options);

        return isReplacing ? guard.addingShelf(selector) : guard.addingShelf();
    }

    function guardDeletingSystem(bench, hagroupSelection) {
        var selector = buildBaseSelector(bench, hagroupSelection),
            options = buildGuardOptions(bench),
            guard = bench.map.guard(_.omit(selector, 'hagroup'), options);

        return guard.deletingSystem(selector);
    }

    function guardDeletingShelf(bench, hagroupSelection, shelfSelection) {
        var selector = buildShelfSelector(bench, hagroupSelection, shelfSelection),
            options = buildGuardOptions(bench),
            guard = bench.map.guard(_.omit(selector, 'shelf'), options);

        return guard.deletingShelf(selector);
    }

    function buildShelfSelector(bench, hagroupSelection, shelfSelection) {
        var selector = buildBaseSelector(bench, hagroupSelection),
            isReplacing = !_.isEmpty(shelfSelection);

        if (isReplacing) {
            _.assign(selector, {
                shelf: shelfSelection
            });
        }

        return selector;
    }

    function buildBaseSelector(bench, hagroupSelection) {
        var base = { installation: { _id: bench.hagi.installation._id } },
            isCluster = !_.isEmpty(bench.hagi.cluster),
            hasHagroup = !_.isEmpty(hagroupSelection);

        if (isCluster) {
            _.assign(base, {
                cluster: { _id: bench.hagi.cluster._id }
            });
        }

        if (hasHagroup) {
            _.assign(base, {
                hagroup: hagroupSelection
            });
        }

        return base;
    }

    function buildGuardOptions(bench) {
        var policies = bench.result._policies || {},
            versionPolicy = policies.version || {};

        return versionPolicy.pin ? { version: bench.result.version } : {};
    }

    // Common tests for guard options
    function expectDisabled(options) {
        var enabled = _.where(options, { isEnabled: true });

        lab.expect(enabled).to.be.instanceof(Array).with.length(0);
    }

    function expectEnabled(options) {
        var enabled = _.where(options, { isEnabled: true });

        lab.expect(enabled).to.be.instanceof(Array).with.length.above(0);
    }

    function expectEnabledNse(options) {
        var enabled = _.where(options, { isEnabled: true }),
            nse = _.where(options, function hasNseConflict(option) {
                return _.some(option.conflicts, { attribute: 'drive.nse' });
            });

        lab.expect(enabled).to.be.instanceof(Array).with.length.above(0);
        lab.expect(nse).to.be.instanceof(Array).with.length(0);
    }

    function expectNseConflicts(options) {
        var nse = _.where(options, function hasNseConflict(option) {
                return _.some(option.conflicts, { attribute: 'drive.nse' });
            });

        lab.expect(nse).to.be.instanceof(Array).with.length.above(0);
    }

    function expectNodeCount(options, isSingle, isMulti) {
        var singleNode = _.where(options, { isEnabled: true, isHA: false }),
            multiNode = _.where(options, { isEnabled: true, isHA: true });

        if (isSingle) {
            lab.expect(singleNode).to.be.instanceof(Array).with.length.above(0);
        } else {
            lab.expect(singleNode).to.be.instanceof(Array).with.length(0);
        }

        if (isMulti) {
            lab.expect(multiNode).to.be.instanceof(Array).with.length.above(0);
        } else {
            lab.expect(multiNode).to.be.instanceof(Array).with.length(0);
        }
    }

    function expectEnabledVersions(options) {
        var enabled = _.where(options, { isEnabled: true }),
            noVersion = _.where(enabled, { newVersion: '' });

        lab.expect(enabled).to.be.instanceof(Array).with.length.above(0);
        lab.expect(noVersion).to.be.instanceof(Array).with.length(0);
    }

    function expectSpecificVersion(options, version) {
        var v = _.where(options, { newVersion: version });

        lab.expect(v).to.be.instanceof(Array).with.length.above(0);
    }

    function expectVersionConflicts(options) {
        var disabled = _.where(options, { isEnabled: false }),
            noVersion = _.where(disabled, { newVersion: '' }),
            vc = _.where(options, function hasVersionConflict(option) {
                return _.some(option.conflicts, { attribute: 'version' });
            });

        lab.expect(disabled).to.be.instanceof(Array).with.length.above(0);
        lab.expect(noVersion).to.be.instanceof(Array).with.length.above(0);
        lab.expect(vc).to.be.instanceof(Array).with.length(noVersion.length);
    }

    // Create an experiment for each limit type
    function aggregates(title, test, spec) {
        addExperimentFor(specs[spec], 'aggregates', (title), test);
    }

    function drives(title, test, spec) {
        addExperimentFor(specs[spec], 'drive', ('for ' + title), test);
    }

    function nodes(title, test, spec) {
        addExperimentFor(specs[spec], 'nas_nodes', ('for ' + title), test);
    }

    function versions(title, test, spec) {
        addExperimentFor(specs[spec], 'version', ('for ' + title), test);
    }

    function addExperimentFor(buildSpecs, experimentTitle, testTitle, limitTest) {
        lab.experiment(experimentTitle, function() {
            var bench;

            lab.before(bench = buildTo(buildSpecs));

            lab.test(testTitle, function (done) {
                limitTest(bench);
                done();
            });
        });
    }
});

// _.forEach(options, function d(option) { dump(option.conflicts); });
