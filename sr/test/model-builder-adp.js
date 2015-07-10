'use strict';

var lab = require('lab'),
    single = require('../lib/single'),
    _ = require('lodash'),
    prod = require('./lib/get-cached-prodinfo'),
    reduce = require('../lib/clip/reduce'),
    Builder = require('../lib/model/builder');

var BASE_SPEC = {
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

// for 24*X423A, we expect

lab.experiment('model/builder', function() {
    var builder,
        clip;

    lab.before(prod);
    lab.before(function (done) {
        clip = {
            synergy_model: {
                hagroups: []
            }
        };
        builder = new Builder(prod.info, clip);
        // builder.enableTracing();
        done();
    });

    lab.experiment('with embedded half HDD shelf (FAS2552HA from asup)', function () {
        var result;

        lab.before(function (done) {
            var clusterId = null,
                spec = _.cloneDeep(BASE_SPEC);

            // configure similarly to asup_id/2014121322111273
            spec.shelves[0].model = 'DS2246';
            spec.shelves[0].drives[0].model = 'X423A';
            spec.shelves[0].drives[0].quantity = 12;

            result = builder.addSystemToCluster(spec, clusterId);
            // console.error(require('util').inspect(result.controllers[0]._assigned_storage, { depth: null }));
            done();
        });

        lab.test('returned an hagroup', function (done) {
            lab.expect(result)
                .to.be.instanceof(Object)
                .with.property('_type', 'hagroup');
                done();
        });

        lab.test('did not break clip reduction', function (done) {
            lab.expect(_.partial(reduce, clip))
                .to.not.throw();
            done();
        });

        lab.test('P1 slices are bigger than P2 slices', function (done) {
            var assignments = result.controllers[0]._assigned_storage,
                P1 = single(assignments, isSlice('P1')),
                P2 = single(assignments, isSlice('P2'));
            lab.expect(P1.slice_details.used_blocks).to.be.above(P2.slice_details.used_blocks);
            done();
        });

        lab.test('root slice is expected size', function (done) {
            // SYSCONFIG-R Used (MB) was hiding a significant 0.25MiB, so:
            var blksFromSysConfigR_AZCS = 301265408,
                sliceGiB = blksFromSysConfigR_AZCS / 1024 / 1024 / 2;
            testSliceCapacity(result, 'P2', sliceGiB, 6);
            done();
        });

        lab.test('data slice is expected size', function (done) {
            var blksFromSysConfigR_AZCS = 1453795840,
                sliceGiB = blksFromSysConfigR_AZCS / 1024 / 1024 / 2;
            testSliceCapacity(result, 'P1', sliceGiB, 6);
            done();
        });

        lab.test('both controllers got root slices', function (done) {
            var getRootSliceCount = _.partial(getSliceCount, 'P2'),
                sliceCounts = _.map(result.controllers, getRootSliceCount).sort();
            lab.expect(sliceCounts).to.eql([6, 6]);
            done();
        });

        lab.test('one controller got all the data slices', function (done) {
            var getDataSliceCount = _.partial(getSliceCount, 'P1'),
                sliceCounts = _.map(result.controllers, getDataSliceCount).sort();
            lab.expect(sliceCounts).to.eql([0, 12]);
            done();
        });

        function getSliceCount(slice, controller) {
            var dataSlices = _.filter(controller._assigned_storage, isSlice(slice));
            if (dataSlices.length === 0) {
                return 0;
            } else {
                lab.expect(dataSlices.length).to.equal(1, 'expect single block');
                return dataSlices[0]
                    .slice_details
                    .devices
                    .length;
            }
        }
    });

    lab.experiment('with embedded full HDD shelf (FAS2240-2HA from asup)', function () {
        var result;

        lab.before(function (done) {
            var clusterId = null,
                spec = _.cloneDeep(BASE_SPEC);

            // configure similarly to mail from schangjie
            spec.configModel = 'FAS2240-2HA';
            spec.shelves[0].model = 'DS2246';
            spec.shelves[0].drives[0].model = 'X422A';
            spec.shelves[0].drives[0].quantity = 24;

            result = builder.addSystemToCluster(spec, clusterId);
            // console.error(require('util').inspect(result.controllers[0]._assigned_storage, { depth: null }));
            done();
        });

        lab.test('root slice is expected size', function (done) {
            // SYSCONFIG-R Used (MB) was hiding a significant 0.25MiB, so:
            var blksFromSysConfigR_AZCS = 58135040,
                sliceGiB = blksFromSysConfigR_AZCS / 1024 / 1024 / 2;
            testSliceCapacity(result, 'P2', sliceGiB, 6);
            done();
        });

        lab.test('data slice is expected size', function (done) {
            var blksFromSysConfigR_AZCS = 1088670208,
                sliceGiB = blksFromSysConfigR_AZCS / 1024 / 1024 / 2;
            testSliceCapacity(result, 'P1', sliceGiB, 6);
            done();
        });
    });

    lab.experiment('with embedded HDD and matching external HDD', function () {
        var result;

        lab.before(function (done) {
            var clusterId = null,
                spec = _.cloneDeep(BASE_SPEC);

            spec.configModel = 'FAS2240-2HA';
            spec.shelves[0].model = 'DS2246';
            spec.shelves[0].drives[0].model = 'X422A';
            spec.shelves[0].drives[0].quantity = 24;

            // after starting as for test above, add another shelf
            spec.shelves[1] = _.cloneDeep(spec.shelves[0]);
            spec.shelves[1].isEmbedded = false;

            result = builder.addSystemToCluster(spec, clusterId);
            done();
        });

        lab.test('got 48 slices (i.e. only 24 devices were sliced)', function (done) {
            lab.expect(getSliceCount(result)).to.equal(48);
            done();
        });
    });

    lab.experiment('with embedded HDD and non-matching external HDD', function () {
        var result;

        lab.before(function (done) {
            var clusterId = null,
                spec = _.cloneDeep(BASE_SPEC);

            spec.configModel = 'FAS2240-2HA';
            spec.shelves[0].model = 'DS2246';
            spec.shelves[0].drives[0].model = 'X422A'; // 600GB SAS
            spec.shelves[0].drives[0].quantity = 24;

            // after starting as for test above, add another shelf
            spec.shelves[1] = _.cloneDeep(spec.shelves[0]);
            spec.shelves[1].isEmbedded = false;
            spec.shelves[1].drives[0].model = 'X423A'; // 900GB SAS

            result = builder.addSystemToCluster(spec, clusterId);
            done();
        });

        lab.test('got 48 slices (i.e. only 24 devices were sliced)', function (done) {
            lab.expect(getSliceCount(result)).to.equal(48);
            done();
        });
    });

    lab.experiment('with 1X external SSD shelf (AFF FAS6290A)', function () {
        var result;

        lab.before(function (done) {
            var clusterId = null,
                spec = _.cloneDeep(BASE_SPEC);

            spec.configModel = 'FAS6290A';
            spec.shelves[0].model = 'DS2246';
            spec.shelves[0].isEmbedded = false;
            spec.shelves[0].drives[0].model = 'X438A'; // 400GB SSD
            spec.shelves[0].drives[0].quantity = 24;

            result = builder.addSystemToCluster(spec, clusterId);
            // console.error(require('util').inspect(result, { depth: null }));
            done();
        });

        lab.test('root slice is UNCHECKED expected size', function (done) {
            // TODO: check vs external authority
            testSliceCapacity(result, 'P2', 53.8828, 6);
            done();
        });

        lab.test('data slice is UNCHECKED expected size', function (done) {
            // TODO: check vs external authority
            testSliceCapacity(result, 'P1', 318.448, 6);
            done();
        });
    });

    lab.experiment('with 1X external SSD shelf (AFF FAS3250AE)', function () {
        var result;

        lab.before(function (done) {
            var clusterId = null,
                spec = _.cloneDeep(BASE_SPEC);

            spec.configModel = 'FAS3250AE';
            spec.shelves[0].model = 'DS2246';
            spec.shelves[0].isEmbedded = false;
            spec.shelves[0].drives[0].model = 'X446B';
            spec.shelves[0].drives[0].quantity = 24;

            result = builder.addSystemToCluster(spec, clusterId);
            // console.error(require('util').inspect(result, { depth: null }));
            done();
        });

        lab.test('root slice is UNCHECKED expected size', function (done) {
            // TODO: check vs external authority
            testSliceCapacity(result, 'P2', 53.8828, 6);
            done();
        });

        lab.test('data slice is UNCHECKED expected size', function (done) {
            // TODO: check vs external authority
            testSliceCapacity(result, 'P1', 132.148, 6);
            done();
        });
    });

    lab.experiment('with 2X external SSD shelves (AFF FAS8060A)', function () {
        var result;

        lab.before(function (done) {
            var clusterId = null,
                spec = _.cloneDeep(BASE_SPEC);

            // configure similarly to asup_id/2014112510010124
            // ... but with only 48 drives
            // TODO: find a 48-drive candidate
            spec.configModel = 'FAS8060A';
            spec.shelves[0].model = 'DS2246';
            spec.shelves[0].isEmbedded = false;
            spec.shelves[0].quantity = 2;
            spec.shelves[0].drives[0].model = 'X447A';
            spec.shelves[0].drives[0].quantity = 24;

            result = builder.addSystemToCluster(spec, clusterId);
            // console.error(require('util').inspect(result, { depth: null }));
            done();
        });

        lab.test('root slice is expected size', function (done) {
            // SYSCONFIG-R Used (MB) was hiding a significant 0.25MiB, so:
            var blksFromSysConfigR_AZCS = 45225472,
                sliceGiB = blksFromSysConfigR_AZCS / 1024 / 1024 / 2;
            testSliceCapacity(result, 'P2', sliceGiB, 6);
            done();
        });

        lab.test('data slice is expected size', function (done) {
            var blksFromSysConfigR_AZCS = 1517011968,
                sliceGiB = blksFromSysConfigR_AZCS / 1024 / 1024 / 2;
            // dropped precision to 5 due to rounding error on last digit
            testSliceCapacity(result, 'P1', sliceGiB, 5);
            done();
        });

        lab.test('got 96 slices (i.e. all 48 devices were sliced)', function (done) {
            lab.expect(getSliceCount(result)).to.equal(96);
            done();
        });
    });

    lab.experiment('with 3X external SSD shelves (AFF FAS8060A)', function () {
        var result;

        lab.before(function (done) {
            var clusterId = null,
                spec = _.cloneDeep(BASE_SPEC);

            // configure similarly to asup_id/2014112510010124
            // ... but with 72 drives
            spec.configModel = 'FAS8060A';
            spec.shelves[0].model = 'DS2246';
            spec.shelves[0].isEmbedded = false;
            spec.shelves[0].quantity = 3;
            spec.shelves[0].drives[0].model = 'X447A';
            spec.shelves[0].drives[0].quantity = 24;

            result = builder.addSystemToCluster(spec, clusterId);
            done();
        });

        lab.test('got 96 slices (i.e. only first 48 devices were sliced)', function (done) {
            lab.expect(getSliceCount(result)).to.equal(96);
            done();
        });
    });

    lab.experiment('with embedded and external SSD shelf (AFF FAS2552HA)', function () {
        var result;

        lab.before(function (done) {
            var clusterId = null,
                spec = _.cloneDeep(BASE_SPEC);

            spec.shelves[0].model = 'DS2246';
            spec.shelves[0].drives[0].model = 'X438A';
            spec.shelves[0].drives[0].quantity = 24;
            spec.shelves[1] = _.cloneDeep(spec.shelves[0]);
            spec.shelves[1].isEmbedded = false;

            result = builder.addSystemToCluster(spec, clusterId);
            done();
        });

        lab.test('got 96 slices (i.e. 48 devices were sliced)', function (done) {
            lab.expect(getSliceCount(result)).to.equal(96);
            done();
        });
    });
});

function getSliceCount(result) {
    return _(result.controllers)
        .map('_assigned_storage')
        .flatten()
        .map(_getSliceCount)
        .reduce(sum, 0);

    function _getSliceCount(assignmentBlock) {
        if (!assignmentBlock.slice_details.slice) {
            return 0;
        } else {
            return assignmentBlock.slice_details.devices.length;
        }
    }
}

function sum(_sum, num) {
    return _sum + num;
}

function testSliceCapacity(result, slice, expectedGiB, precision) {
    var assignments = result.controllers[0]._assigned_storage,
        assignment = single(assignments, isSlice(slice)),
        blocksPerGiB = 1024 * 256, // 4KiB WAFL blocks
        sliceGiB = assignment.slice_details.used_blocks / blocksPerGiB;

    lab.expect(rounded(sliceGiB)).to.be.equal(rounded(expectedGiB));

    function rounded(n) {
        return Number(n.toPrecision(precision));
    }
}

function isSlice(Pn) {
    return function (assignmentBlock) {
        return assignmentBlock.slice_details.slice === Pn;
    };
}
