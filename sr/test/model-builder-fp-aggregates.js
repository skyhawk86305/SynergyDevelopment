'use strict';

/*

var lab = require('lab'),
    _ = require('lodash'),
    prod = require('./lib/get-cached-prodinfo'),
    Builder = require('../lib/model/builder'),
    RaidTypes = require('../lib/model/aggregates/raid-types'),
    ModelMap = require('../lib/model/map');

var BASE_SPEC = {
        configModel: 'FAS8060A',
        shelves: [{
            model: 'DS2246',
            quantity: 1,
            isEmbedded: false,
            drives: [{
                model: 'X447A',
                quantity: 24
            }]
        }, {
            model: 'DS4246',
            quantity: 1,
            isEmbedded: false,
            drives: [{
                model: 'X477A',
                quantity: 24
            }]
        }],
        version: '8.2.3 Cluster-Mode' // (NOT 8.3)
    };

function aggregatesFromHagroup(hagroup) {
    return _.flatten(_.map(hagroup.controllers, function(controller) {
        return controller.aggregates;
    }));
}

function aggregatePlanContainsDoesNotContainSSDs(aggregatePlan) {
    return _.every(_.map(aggregatePlan.raidGroupPlans, function(raidGroupPlan) {
        return _.every(_.map(raidGroupPlan.devices, function(device) {
            return device.spec.type !== 'SSD';
        }));
    }));
}

function cacheRaidGroupsFromAggregate(aggregate) {
    return _.where(aggregate._raid_groups, function(raidGroup) {
        return raidGroup.cache;
    });
}

lab.experiment('create/delete Flash Pool Aggr RaidGroups', function() {
    var builder,
        clip,
        raidTypes = new RaidTypes();

    lab.before(prod);
    lab.before(function (done) {
        clip = {
            synergy_model: {
                hagroups: []
            }
        };
        builder = new Builder(prod.info, clip);

        done();
    });

    lab.experiment('adding FAS8060A running 8.3RC2 Cluster-Mode', function () {
        var result,
            lastCacheRaidGroupCreatedId;

        lab.before(function (done) {
            var clusterId = null,
                spec = _.cloneDeep(BASE_SPEC);

            result = builder.addSystemToCluster(spec, clusterId);

            done();
        });

        lab.test('returned a hagroup', function (done) {
            lab.expect(result)
                .to.be.instanceof(Object)
                .with.property('_type', 'hagroup');
                done();
        });

        lab.test('available devices are all SSDs and FP ready', function(done) {
            var map = new ModelMap(prod.info, clip);

            _.forEach(clip.synergy_model.hagroups, function(hagroup) {
                var hagi = map.inspect(hagroup),
                    availableDevices = hagi.availableDevices();

                var allRemainingDevicesAreFPSSDs = _.every(_.map(availableDevices, function(device) {
                    return device.spec.type === 'SSD' && device.spec.fp_support === true;
                }));

                lab.expect(allRemainingDevicesAreFPSSDs).to.be.equal(true);
            });

            done();
        });

        lab.test('builder can add a FP raid group to aggregate', function(done) {
            var map = new ModelMap(prod.info, clip),
                system = _.first(clip.synergy_model.hagroups),
                hagi = map.inspect(system);

            var availableDevices = hagi.availableDevices(),
                systemAggregates = aggregatesFromHagroup(system),
                systemDataAggregates = _.where(systemAggregates, function(aggregate) {
                    return !aggregate.is_root_aggregate;
                });

            // Lets add a FP (cache) raid group
            var fpAggr = _.first(systemDataAggregates),
                fpAggrId = fpAggr._id,
                fpRaidType = raidTypes.RAID_DP,
                fpDeviceSpec = _.first(availableDevices).spec,
                fpDeviceCount = 12;

            var newCacheRgId = builder.addFlashPoolRaidGroupToAggregate(fpAggrId, fpRaidType, fpDeviceSpec, fpDeviceCount),
                cacheRaidGroups = cacheRaidGroupsFromAggregate(fpAggr);

            lastCacheRaidGroupCreatedId = newCacheRgId;

            lab.expect(newCacheRgId).to.be.not.equal(undefined);
            lab.expect(cacheRaidGroups.length).to.be.equal(1);

            var cacheRaidGroup = _.first(cacheRaidGroups);

            lab.expect(cacheRaidGroup._id).to.be.not.equal(undefined);
            lab.expect(cacheRaidGroup.name).to.be.not.equal(undefined);
            lab.expect(cacheRaidGroup.name.indexOf('rg')).to.be.above(-1);
            lab.expect(cacheRaidGroup._devices.length).to.be.equal(12); // We asked for 12 drives
            lab.expect(cacheRaidGroup.__deviceSpecs).to.be.not.equal(undefined);
            lab.expect(cacheRaidGroup.cache).to.be.equal(true); // We are flash pool
            lab.expect(cacheRaidGroup.plex_number).to.be.equal(1); // No mirroring for FP

            done();
        });

        lab.test('builder can remove a FP raid group from aggregate', function(done) {
            lab.expect(lastCacheRaidGroupCreatedId).to.be.not.equal(undefined);

            builder.deleteFlashPoolRaidGroupFromAggregate(lastCacheRaidGroupCreatedId);

            _.forEach(clip.synergy_model.hagroups, function(hagroup) {
                var aggregates = aggregatesFromHagroup(hagroup),
                    aggregatesWithCache = _.where(aggregates, function(aggregate) {
                        return cacheRaidGroupsFromAggregate(aggregate).length > 0;
                    });

                lab.expect(aggregatesWithCache.length).to.be.equal(0); // Should have none left
            });

            done();
        });
    });
});

*/
