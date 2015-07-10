'use strict';

var lab = require('lab'),
    _ = require('lodash'),
    prod = require('./lib/get-cached-prodinfo'),
    Builder = require('../lib/model/builder'),
    ModelMap = require('../lib/model/map.js'),
    ManualAggrBuilder = require('../lib/model/aggregates/manual-aggregate-builder'),
    RaidTypes = require('../lib/model/aggregates/raid-types'),
    dump = require('../lib/dump');

dump();

var BASE_SPEC = {
        configModel: 'FAS8060A',
        shelves: [{
            model: 'DS4246',
            quantity: 3,
            isEmbedded: false,
            drives: [{
                model: 'X477A',
                quantity: 24
            }]
        }],
        version: '8.2.3 Cluster-Mode' // This is the physical drive test, so we are 8.2 (not 8.3 w/ StoragePools)
    };

function aggregatesFromHagroup(hagroup) {
    return _.flatten(_.map(hagroup.controllers, function(controller) {
        return controller.aggregates;
    }));
}

function manualAggregatesFromHagroup(hagroup) {
    return _.where(aggregatesFromHagroup(hagroup), { _manual: true });
}

/*
function aggregateFromHagroup(hagroup, id) {
    return _.where(aggregatesFromHagroup(hagroup), { _id: id });
}
*/

lab.experiment('create and mutates manual aggregates', function() {
    var builder,
        clip,
        raidTypes;

    lab.before(prod);
    lab.before(function (done) {
        clip = {
            synergy_model: {
                hagroups: []
            }
        };

        builder = new Builder(prod.info, clip);
        raidTypes = new RaidTypes();

        done();
    });

    lab.experiment('adding FAS8060A running 8.2.3 Cluster-Mode', function () {
        var result,
            aggrBuilder;

        lab.before(function (done) {
            var clusterId = null,
                spec = _.cloneDeep(BASE_SPEC);

            result = builder.addSystemToCluster(spec, clusterId);

            var map = new ModelMap(prod.info, clip),
                hagi = map.inspect(result);

            aggrBuilder = new ManualAggrBuilder(hagi);
            done();
        });

        lab.test('returned a hagroup', function (done) {
            lab.expect(result)
                .to.be.instanceof(Object)
                .with.property('_type', 'hagroup');
                done();
        });

        lab.test('aggregate builder created', function (done) {
            lab.expect(aggrBuilder)
                .to.be.instanceof(Object);
                done();
        });

        lab.test('aggregate builder manual aggregate on deck', function (done) {
            lab.expect(aggrBuilder.aggregate)
                .to.be.instanceof(Object);
                done();
        });

        lab.test('system has no manual aggregates', function (done) {
            var aggregates = aggregatesFromHagroup(result);

            lab.expect(_.every(aggregates, { _manual: false })).to.be.equal(true);
            done();
        });

        lab.test('attach manual aggr to controller', function(done) {
            builder.addManualAggregate(result._id, [aggrBuilder.aggregate]);

            var manualAggregates = manualAggregatesFromHagroup(result);

            lab.expect(manualAggregates.length).to.be.equal(1);
            done();
        });

        lab.test('obtain consumption data for aggregate', function(done) {
            var currentDevices = aggrBuilder._currentAggrDevices();

            lab.expect(currentDevices.length).to.be.equal(66);
            done();
        });

        lab.test('is RaidDP', function(done) {
            lab.expect(aggrBuilder.aggregate.raid_type).to.be.equal(raidTypes.RAID_DP);
            done();
        });

        lab.test('change to Raid 4', function(done) {
            aggrBuilder.setRaidType(raidTypes.RAID_4, false);

            builder.addManualAggregate(result._id, [aggrBuilder.aggregate]);

            var manualAggregates = manualAggregatesFromHagroup(result);

            lab.expect(manualAggregates.length).to.be.equal(1);
            done();
        });

        lab.test('is Raid4', function(done) {
            lab.expect(aggrBuilder.aggregate.raid_type).to.be.equal(raidTypes.RAID_4);
            done();
        });

        lab.test('addManualAggregate abuse does not create multiple aggrs', function(done) {
            builder.addManualAggregate(result._id, [aggrBuilder.aggregate]);
            builder.addManualAggregate(result._id, [aggrBuilder.aggregate]);
            builder.addManualAggregate(result._id, [aggrBuilder.aggregate]);
            builder.addManualAggregate(result._id, [aggrBuilder.aggregate]);

            var manualAggregates = manualAggregatesFromHagroup(result);

            lab.expect(manualAggregates.length).to.be.equal(1);
            done();
        });

        lab.test('simple resize', function(done) {
            var existingDeviceGroups = aggrBuilder.availableDeviceGroupsForAggregate(),
                deviceGroup = _.first(existingDeviceGroups),
                newSize = 60;

            aggrBuilder.setDeviceAndCount(deviceGroup.spec, newSize);

            var currentDevices = aggrBuilder._currentAggrDevices();
            lab.expect(currentDevices.length).to.be.equal(newSize);
            done();
        });

        lab.test('gets device count limits', function(done) {
            var limits = aggrBuilder.deviceLimits();

            lab.expect(_.isPlainObject(limits)).to.be.equal(true);
            lab.expect(_.isPlainObject(limits.spec)).to.be.equal(true);
            lab.expect(limits.min).to.be.int;
            lab.expect(limits.max).to.be.int;
            lab.expect(limits.min).to.be.equal(raidTypes.minRaidSize(aggrBuilder.aggregate.raid_type));

            done();
        });

        lab.test('change to Raid DP', function(done) {
            aggrBuilder.setRaidType(raidTypes.RAID_DP, false);

            builder.addManualAggregate(result._id, [aggrBuilder.aggregate]);

            var manualAggregates = manualAggregatesFromHagroup(result);

            lab.expect(manualAggregates.length).to.be.equal(1);
            done();
        });

        lab.test('is RaidDP', function(done) {
            lab.expect(aggrBuilder.aggregate.raid_type).to.be.equal(raidTypes.RAID_DP);
            done();
        });

        lab.test('get raid size limits', function(done) {
            var limits = aggrBuilder.raidSizeLimits();

            lab.expect(_.isPlainObject(limits)).to.be.equal(true);
            lab.expect(_.isPlainObject(limits.spec)).to.be.equal(true);
            lab.expect(limits.min).to.be.int;
            lab.expect(limits.max).to.be.int;
            lab.expect(limits.min).to.be.equal(raidTypes.minRaidSize(aggrBuilder.aggregate.raid_type));

            done();
        });

        lab.test('survives builder recreation', function(done) {
            var previousRaidSize = aggrBuilder.currentRaidSize(),
                currentAggregate = aggrBuilder.aggregate,
                map = new ModelMap(prod.info, clip),
                hagi = map.inspect(result);

            aggrBuilder = new ManualAggrBuilder(hagi, currentAggregate);

            var newRaidSize = aggrBuilder.currentRaidSize();

            lab.expect(newRaidSize).to.be.int;
            lab.expect(aggrBuilder.currentRaidSize()).to.be.equal(previousRaidSize);
            done();
        });

        lab.test('name change', function(done) {
            var newName = 'happy_aggregate';

            aggrBuilder.setName(newName);

            lab.expect(aggrBuilder.aggregate.name).to.be.equal(newName);
            done();
        });

        lab.test('device summary', function(done) {
            var deviceSummary = aggrBuilder.deviceSummary();

            lab.expect(deviceSummary.data.count).to.be.equal(60);
            done();
        });
    });
});
