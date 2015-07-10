'use strict';

var lab = require('lab'),
    prod = require('./lib/get-cached-prodinfo'),
    ProductInfo = require('../lib/prodinfo');

lab.experiment('ProductInfo', function() {
    lab.before(prod);

    lab.test('instantiates', function (done) {
        lab.expect(prod.info).to.be.instanceof(ProductInfo);
        done();
    });

    lab.experiment('getConfigGroups result array', function () {
        var groups = null;

        lab.before(function (done) {
            groups = prod.info.getConfigGroups();
            done();
        });

        lab.test('has members', function (done) {
            lab.expect(groups).to.be.instanceof(Array)
                                .with.length.above(0);
            done();
        });

        function testGroup(title, fn) {
            lab.test(title, function (done) {
                for (var idx in groups) {
                    fn(groups[idx]);
                }
                done();
            });
       }

        testGroup('groups have .id string', function (group) {
            lab.expect(group)
                .to.have.property('id')
                .to.be.an('string');
        });

        testGroup('groups have .title string', function (group) {
            lab.expect(group)
                .to.have.property('title')
                .to.be.an('string');
        });

        testGroup('groups have .subtitle string', function (group) {
            lab.expect(group)
                .to.have.property('subtitle')
                .to.be.an('string');
        });

        testGroup('groups have .img string', function (group) {
            lab.expect(group)
                .to.have.property('img')
                .to.be.an('string');
        });

        testGroup('groups have .enabled boolean', function (group) {
            lab.expect(group)
                .to.have.property('enabled')
                .to.be.an('boolean');
        });

        lab.experiment('groups\' subGroups arrays (ENVY WARNING)', function () {
            testGroup('are arrays', function (group) {
                lab.expect(group)
                    .to.have.property('subGroups')
                    .to.be.instanceof(Array);
            });

            function testSubGroups(title, fn) {
                lab.test(title, function (done) {
                    for (var fidx in groups) {
                        var group = groups[fidx];
                        for (var sidx in group.subGroups) {
                            fn(group.subGroups[sidx]);
                        }
                    }
                    done();
                });
            }

            testSubGroups('subgroups have .id', function (subgroup) {
                lab.expect(subgroup)
                    .to.have.property('id')
                    .to.be.an('string');
            });

            testSubGroups('subgroups have .title string', function (subgroup) {
                lab.expect(subgroup)
                    .to.have.property('title')
                    .to.be.an('string');
            });

            testSubGroups('subgroups have .enabled boolean', function (subgroup) {
                lab.expect(subgroup)
                    .to.have.property('enabled')
                    .to.be.an('boolean');
            });
        });
    });
});
