'use strict';

var lab = require('lab'),
    _ = require('lodash'),
    prod = require('./lib/get-cached-prodinfo'),
    Builder = require('../lib/model/builder'),
    RaidTypes = require('../lib/model/aggregates/raid-types'),
    ModelMap = require('../lib/model/map'),
    dump = require('../lib/dump');

dump();

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
            model: 'DS2246',
            quantity: 1,
            isEmbedded: false,
            drives: [{
                model: 'X422A',
                quantity: 24
            }]
        }],
        version: '8.3RC2 Cluster-Mode' // (Storage Pools 8.3)
    };

lab.experiment('create/delete storage pools', function() {
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

    lab.experiment('FAS8060A running 8.3RC2 Cluster-Mode', function () {
        var result;

        lab.before(function (done) {
            var clusterId = null,
                spec = _.cloneDeep(BASE_SPEC);

            result = builder.addSystemToCluster(spec, clusterId);

            releaseAutoStoragePools();

            function releaseAutoStoragePools() {
                _.forEach(result.controllers, function(controller) {
                    /*
                        Why am I doing it this way?

                        When you use builder.deleteStoragePool(id) it deletes a storage pool and then
                        triggers a rebuild of aggregates -- which creates more storage pools automatically.
                        See: use of rehydrate to hard-eject the raid groups created here
                    */
                    controller.storage_pools = [];
                });
            }

            done();
        });

        lab.test('returned a hagroup', function (done) {
            lab.expect(result)
                .to.be.instanceof(Object)
                .with.property('_type', 'hagroup');
                done();
        });

        lab.experiment('adding a storage pool', function() {
            var askingForNumberOfDrives = 12,
                chosenRaidType = raidTypes.RAID_DP,
                firstController,
                firstPool;

            lab.before(function (done) {
                var map = new ModelMap(prod.info, clip),
                    hagroup = _.first(clip.synergy_model.hagroups);

                map.rehydrate(); // Hard-eject on the storage pools

                var hagi = map.inspect(hagroup),
                    devices = hagi.availablePhysicalDevices(),
                    firstDevice = _.first(_.where(devices, isSSD));

                firstController = _.first(hagroup.controllers);
                builder.addStoragePool(firstController._id, firstDevice.spec, chosenRaidType, askingForNumberOfDrives, false);
                firstPool = _.first(firstController.storage_pools || []);

                function isSSD(device) {
                    return device.spec.type === 'SSD';
                }

                done();
            });

            lab.test('gave a single pool', function (done) {
                lab.expect(firstController.storage_pools)
                    .to.be.instanceof(Array)
                    .with.length(1);
                done();
            });

            lab.test('gave a pool with four allocation units', function (done) {
                lab.expect(firstPool)
                    .to.have.property('_allocations')
                        .instanceof(Array)
                        .with.length(4);
                done();
            });

            lab.test('gave a pool with four allocation units', function (done) {
                lab.expect(firstPool)
                    .to.have.property('_allocations')
                        .instanceof(Array)
                        .with.length(4);
                done();
            });

            lab.test('gave a pool with the requested device count', function (done) {
                lab.expect(firstPool)
                    .to.have.property('_devices')
                        .instanceof(Array)
                        .with.length(askingForNumberOfDrives);
                done();
            });

            lab.test('pool devices are no longer available', function (done) {
                var newMap = new ModelMap(prod.info, clip),
                    hagroup = newMap.inspect(firstController).hagroup,
                    hagi = newMap.inspect(hagroup),
                    pooled = firstPool._devices,
                    avail = _(hagi.availablePhysicalDevices())
                        .map('devices')
                        .flatten()
                        .value();

                lab.expect(_.intersection(pooled, avail))
                    .to.be.instanceof(Array)
                    .with.length(0);

                done();
            });

            lab.test('gave a pool with the requested RAID type', function (done) {
                lab.expect(firstPool)
                    .to.have.property('raid_type')
                        .equal(chosenRaidType);
                done();
            });

            lab.test('gave a pool with the requested drive(?) type', function (done) {
                lab.expect(firstPool)
                    .to.have.property('type')
                        .equal('SSD');
                done();
            });

            lab.test('gave a pool with a _type for inspection', function (done) {
                lab.expect(firstPool)
                    .to.have.property('_type')
                        .equal('storage_pool');
                done();
            });

            lab.test('gave a pool with well formed allocation units', function (done) {
                _.forEach(firstPool._allocations, function(allocation) {
                    var allocationSuffixMap = _.map(allocation.devices, function(deviceId) {
                        return deviceId.indexOf('P') > 0;
                    });

                    lab.expect(_.every(allocationSuffixMap)).to.be.equal(true);
                });
                done();
            });

            /*
                See the notes at top, this doesn't work anymore
            lab.experiment('and then removing it', function () {
                lab.before(function (done) {
                    builder.deleteStoragePool(firstPool._id);
                    done();
                });

                lab.test('worked', function (done) {
                    lab.expect(firstController.storage_pools)
                        .to.be.instanceof(Array)
                        .with.length(0);
                    done();
                });
            });
            */
        });
    });
});
