'use strict';

var lab = require('lab'),
    spares = require('../lib/prodinfo/tables/spares');

lab.experiment('spares calculations', function () {
    lab.test('huge @maximum', function (done) {
        lab.expect(spares({
            deviceCount: 2000,
            sparesLevel: 'maximum',
        })).to.eql(8);
        done();
    });

    lab.test('large @balanced', function (done) {
        lab.expect(spares({
            deviceCount: 400,
            sparesLevel: 'balanced',
        })).to.eql(4);
        done();
    });

    lab.test('single shelf embedded @minimum', function (done) {
        lab.expect(spares({
            isEmbeddedShelfOnly: true,
            deviceCount: 12,
            sparesLevel: 'minimum',
        })) .to.eql(1);
        done();
    });

    lab.test('single raid group @maximum', function (done) {
        lab.expect(spares({
            raidCount: 1,
            deviceCount: 48,
            sparesLevel: 'maximum',
        })).to.eql(2);
        done();
    });

    lab.test('usual situation @maximum', function (done) {
        lab.expect(spares({
            deviceCount: 200,
            sparesLevel: 'maximum',
        })).to.eql(4);
        done();
    });

    lab.test('usual situation (policy not set)', function (done) {
        lab.expect(spares({
            deviceCount: 200
        })).to.eql(2);
        done();
    });
});
