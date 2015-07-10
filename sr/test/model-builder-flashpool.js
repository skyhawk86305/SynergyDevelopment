'use strict';

/*
var lab = require('lab'),
    _ = require('lodash'),
    prod = require('./lib/get-cached-prodinfo'),
    Builder = require('../lib/model/builder'),
    ModelMap = require('../lib/model/map.js'),
    ManualAggregatePlanner = require('../lib/model/aggregates/manual-aggregate-builder'),
    dump = require('../lib/dump');

dump(); // make linter happy

var EMPTY_CLIP = {
        synergy_model: {
            hagroups: []
        }
    },
    BASE_SPEC = {
        configModel: 'FAS8060A',
        shelves: [{
            model: 'DS4246',
            quantity: 2,
            isEmbedded: false,
            drives: [{
                model: 'X448A',
                quantity: 4
            }, {
                model: 'X477A',
                quantity: 20
            }]
        }],
        version: '8.3RC2 Cluster-Mode'
    };

lab.experiment('flashpool', function() {
    var builder,
        clip,
        hagroup,
        map,
        hagi,
        manualAggr,
        pool;

    lab.before(prod);

    var INITIAL_AGGR_SIZE = 5, // caution: set !== INITIAL_POOL_SIZE
        INITIAL_POOL_SIZE = 4; // kill any auto pools quite dead

    lab.before(function (done) {
        clip = _.cloneDeep(EMPTY_CLIP);

        var spec = _.cloneDeep(BASE_SPEC);

        builder = new Builder(prod.info, clip);
        hagroup = builder.addSystemToCluster(spec, null);

        builder.setSystemPolicy(hagroup._id, 'Aggregates', {
            ssdsForFlashPool: true,
            manual: true,
        });

        refreshInspector(); // for map

        var planner = new ManualAggregatePlanner(null, map, [ hagroup ]),
            plan = planner.planAggregatesFor(null),
            capDrives = _.filter(hagi.deviceInfo.where.physical, isModel('X477A')),
            capSpec = _.omit(capDrives[0].spec, 'model');

        plan.setDriveSpecAndCount(capSpec, INITIAL_AGGR_SIZE, hagroup);
        plan.setName('manual');
        plan.setManual(true);
        manualAggr = builder.addManualAggregate(hagroup._id, [ plan.plan ])[0];

        // We're done with the prep. If we want to see what happens next:
        // builder.enableTracing();

        done();
    });

    lab.afterEach(refreshInspector);

    function refreshInspector(done) {
        done = done || _.noop;
        map = new ModelMap(prod.info, clip);
        hagi = map.inspect(hagroup);
        done();
    }

    lab.test('test bench is OK', function (done) {
        lab.expect(hagroup)
            .to.be.instanceof(Object)
            .with.property('_type', 'hagroup');

        lab.expect(manualAggr._raid_groups)
            .to.be.instanceof(Array)
            .with.length(1, 'builder allocated slices to manual aggr');

        // console.error(require('util').inspect(hagroup, { depth: null, colors: true }));
        done();
    });

    lab.test('can add manual pool', function (done) {
        var SSDs = _.filter(hagi.deviceInfo.where.physical, isModel('X448A')),
            ssdSpec = _.omit(SSDs[0].spec, 'model'),
            controller = hagroup.controllers[0];
        var poolId = builder.addStoragePool(controller._id, ssdSpec, 'RAID_DP', INITIAL_POOL_SIZE, true);
        pool = _(controller.storage_pools).where({ _id: poolId }).first();
        lab.expect(pool._devices).to.be.instanceof(Array).with.length(INITIAL_POOL_SIZE);
        done();
    });

    lab.test('can claim an allocation unit', function (done) {
        var initialRaidGroupCount = manualAggr._raid_groups.length;
        builder.claimAllocationUnit(manualAggr._id, 'RAID_DP', pool._id, 'P1');
        lab.expect(pool._allocations[0].aggr_id).to.equal(manualAggr._id);
        lab.expect(manualAggr._raid_groups.length).to.equal(initialRaidGroupCount + 1);
        lab.expect(_.last(manualAggr._raid_groups)._devices.length).to.equal(INITIAL_POOL_SIZE);
        done();
    });

    lab.test('can claim another allocation unit', function (done) {
        var initialRaidGroupCount = manualAggr._raid_groups.length;
        builder.claimAllocationUnit(manualAggr._id, 'RAID_DP', pool._id, 'P2');
        lab.expect(pool._allocations[0].aggr_id).to.equal(manualAggr._id);
        lab.expect(manualAggr._raid_groups.length).to.equal(initialRaidGroupCount + 1);
        lab.expect(_.last(manualAggr._raid_groups)._devices.length).to.equal(INITIAL_POOL_SIZE);
        done();
    });

    lab.test('storage pools can be shrunk', function (done) {
        builder.resizeStoragePool(pool._id, INITIAL_POOL_SIZE - 1);
        lab.expect(pool._devices.length).to.equal(INITIAL_POOL_SIZE - 1);
        lab.expect(pool._devices).to.be.instanceof(Array).with.length(INITIAL_POOL_SIZE - 1);

        var n = manualAggr._raid_groups.length;
        lab.expect(manualAggr._raid_groups[n - 1]._devices.length).to.equal(INITIAL_POOL_SIZE - 1);
        lab.expect(manualAggr._raid_groups[n - 2]._devices.length).to.equal(INITIAL_POOL_SIZE - 1);
        done();
    });

    lab.test('can release an allocation unit', function (done) {
        var n = manualAggr._raid_groups.length;
        builder.releaseAllocationUnit(manualAggr._id, pool._id, 'P1');
        lab.expect(pool._allocations[0].aggr_id).to.equal(undefined);
        lab.expect(manualAggr._raid_groups.length).to.equal(n - 1, 'raid group not removed');
        done();
    });

    lab.test('can delete a manual pool', function (done) {
        var poolId = pool._id,
            controller = hagroup.controllers[0],
            n = manualAggr._raid_groups.length;
        builder.deleteStoragePool(pool._id);
        pool = _(controller.storage_pools).where({ _id: poolId }).first();
        lab.expect(pool).to.equal(undefined, 'pool still exists');
        lab.expect(manualAggr._raid_groups.length).to.equal(n - 1, 'raid groups not removed');
        done();
    });
});

lab.experiment('flashpool edge cases', function () {
    lab.before(prod);

    lab.test('flashpool vs aggregate deletion #1533', function (done) {
        // arrange
        var clip = _.cloneDeep(EMPTY_CLIP),
            spec = _.cloneDeep(BASE_SPEC),
            builder = new Builder(prod.info, clip),
            hagroup = builder.addSystemToCluster(spec, null),
            dataAggregates = _(hagroup.controllers)
                .map('aggregates').flatten()
                .where({ is_root_aggregate: false })
                .value(),
            victim = dataAggregates[0],
            victimAllocations = _(hagroup.controllers)
                .map('storage_pools').flatten()
                .map('_allocations').flatten()
                .where({ aggr_id: victim._id })
                .value();

        // these tests ensuring arrange went well
        lab.expect(victimAllocations)
            .length.above(0, 'victim aggr has no allocations');
        lab.expect(victimAllocations[0].aggr_id)
            .to.equal(victim._id, 'victim aggr allocation not claimed!?');

        // act
        builder.deleteAggregate(hagroup._id, victim);

        // assert
        lab.expect(victimAllocations[0].aggr_id)
            .to.equal(undefined, 'victim aggr allocation still claimed');
        done();
    });
});

function isModel(model) {
    return function matches(info) {
        return info.spec.model === model;
    };
}

*/
