'use strict';

var lab = require('lab'),
    _ = require('lodash'),
    prod = require('./lib/get-cached-prodinfo'),
    Builder = require('../lib/model/builder'),
    ModelMap = require('../lib/model/map.js');

var FP_SPEC = {
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
        version: '8.3RC2 Cluster-Mode' // This is the storage pool test, so we are 8.3 (not 8.2 w/ physical)
    },
    ADP_SPEC = {
        configModel: 'FAS2552HA',
        shelves: [{
            model: 'DS2246',
            quantity: 1,
            isEmbedded: true,
            drives: [{
                model: 'X423A',
                quantity: 24
            }]
        }],
        version: '8.3RC1 Cluster-Mode'
    };

lab.experiment('device-info', function() {
    var builder,
        hagroup,
        map,
        hagi;

    function reset(spec) {
        return function _reset(done) {
            var clusterId = null,
                clip = {
                    synergy_model: {
                        hagroups: []
                    }
                };
            builder = new Builder(prod.info, clip);
            hagroup = builder.addSystemToCluster(spec, clusterId);
            map = new ModelMap(prod.info, clip),
            hagi = map.inspect(hagroup);
            done();
        };
    }

    lab.before(prod);

    lab.experiment('for FAS2552 with root_slice mix', function () {
        var DRIVE_COUNT = 24;

        lab.before(reset(ADP_SPEC));

        lab.test('returns a long array', function (done) {
            lab.expect(hagi.deviceInfo)
                .to.be.instanceof(Array)
                .of.length.above(DRIVE_COUNT);
            // if (process.stderr.isTTY) {
            //     console.error(require('util').inspect(hagi.deviceInfo, { depth: null, colors: true }));
            // }
            done();
        });

        lab.test('we can see the where filter', function (done) {
            lab.expect(typeof hagi.deviceInfo.where)
                .to.equal('function');
            done();
        });


        lab.test('we can find the physical drives', function (done) {
            lab.expect(hagi.deviceInfo.where.physical)
                .to.be.instanceof(Array)
                .of.length(DRIVE_COUNT);
            done();
        });

        lab.test('we can find the root/data slices', function (done) {
            lab.expect(hagi.deviceInfo.where.virtual)
                .to.be.instanceof(Array)
                .of.length(DRIVE_COUNT * 2);
            done();
        });

        lab.test('P2 slices have spec._for_controller', function (done) {
            var devices = hagi.deviceInfo.where.virtual.where(isP2);

            _.forEach(devices, function (d) {
                lab.expect(typeof d.spec._for_controller).to.equal('string');
            });
            done();

            function isP2(info) {
                return info.spec.slice === 'P2';
            }
        });

        lab.test('we can find a spare', function (done) {
            lab.expect(hagi.deviceInfo.where.spare)
                .to.be.instanceof(Array)
                .of.length.above(0);
            done();
        });

        lab.test('we can find a virtual spare', function (done) {
            lab.expect(hagi.deviceInfo.where.virtual.and.spare)
                .to.be.instanceof(Array)
                .of.length.above(0);
            done();
        });
    });

    lab.experiment('for FAS8060A with fp_slice mix', function () {
        var DRIVE_COUNT = 48;

        lab.before(reset(FP_SPEC));

        lab.test('returns a long array', function (done) {
            lab.expect(hagi.deviceInfo)
                .to.be.instanceof(Array)
                .with.length.above(DRIVE_COUNT);
            // if (process.stderr.isTTY) {
            //     console.error(require('util').inspect(hagi.deviceInfo, { depth: null, colors: true }));
            // }
            done();
        });

        lab.test('we can find the physical drives', function (done) {
            lab.expect(hagi.deviceInfo.where.physical)
                .to.be.instanceof(Array)
                .of.length(DRIVE_COUNT);
            done();
        });

        lab.test('we can find the fp slices', function (done) {
            var pools = hagi.storagePools(),
                poolDevices = _.flatten(_.map(pools, '_devices'));

            lab.expect(hagi.deviceInfo.where.virtual)
                .to.be.instanceof(Array)
                .of.length(poolDevices.length * 4);
            done();
        });

        lab.test('we can find unused physical devices', function (done) {
            // console.log('physical: ', hagi.deviceInfo.where.physical.and.unused);
            /*
            lab.expect(hagi.deviceInfo.where.physical.and.unused)
                .to.be.instanceof(Array)
                .with.length.above(0);
                */
            done();
        });

        lab.test('we can find unlocked used physical devices, because no manual', function (done) {
            lab.expect(hagi.deviceInfo.where.physical.and.used.and.unlocked)
                .to.be.instanceof(Array)
                .with.length.above(43); // saw 44 because 4 spares
            done();
        });

        lab.test('we can find devices using .where(object)', function (done) {
            var constraint = { hagroup: hagi.hagroup._id };
            lab.expect(hagi.deviceInfo.where(constraint))
                .to.be.instanceof(Array)
                .with.length.above(DRIVE_COUNT);
           done();
        });

        lab.test('we can find devices using .where(function)', function (done) {
            function constraint(ob) {
                return ob.hagroup === hagi.hagroup._id;
            }
            lab.expect(hagi.deviceInfo.where(constraint))
                .to.be.instanceof(Array)
                .with.length.above(DRIVE_COUNT);
           done();
        });
    });
});
