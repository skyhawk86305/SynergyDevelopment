'use strict';

var lab = require('lab'),
    enforce = require('../lib/enforce');

lab.experiment('spec enforcement ', function () {
    lab.experiment('for object arguments', function () {
        lab.test('type OK', function (done) {
            lab.expect(enforce({
                goodKey: 'number',
            }, {
                goodKey: 2
            })).to.eql({
                goodKey: 2
            });
            done();
        });

        lab.test('type OK; default provided', function (done) {
            lab.expect(enforce({
                goodKey: [ 'number', 23 ],
            }, {
                goodKey: 2
            })).to.eql({
                goodKey: 2
            });
            done();
        });

        lab.test('class OK', function (done) {
            lab.expect(enforce({
                goodKey: Array,
            }, {
                goodKey: []
            })).to.eql({
                goodKey: []
            });
            done();
        });

        lab.test('class OK; default provided', function (done) {
            lab.expect(enforce({
                goodKey: [ Array, [] ]
            }, {
                goodKey: [ 23 ]
            })).to.eql({
                goodKey: [ 23 ]
            });
            done();
        });

        lab.test('key absent; default provided', function (done) {
            lab.expect(enforce({
                goodKey: [ 'number', 23 ],
            }, {
                // key absent
            })).to.eql({
                goodKey: 23
            });
            done();
        });

        lab.test('key absent; default provided; modification/check function', function (done) {
            lab.expect(enforce({
                goodKey: [ 'number', 23, return24 ],
            }, {
                // key absent
            })).to.eql({
                goodKey: 24
            });
            done();

            function return24(value) {
                lab.expect(value).to.eql(23);
                return 24;
            }
        });

        lab.test('type OK; modification/check function', function (done) {
            lab.expect(enforce({
                goodKey: [ 'number', 23, return24 ],
            }, {
                goodKey: 12,
            })).to.eql({
                goodKey: 24
            });

            done();

            function return24(value) {
                lab.expect(value).to.eql(12);
                return 24;
            }
        });

        lab.test('unknown keys', function (done) {
            lab.expect(function () {
                enforce({
                    goodKey: 'number',
                }, {
                    badKey: 2
                });
            }).to.throw('bad key');
            done();
        });

        lab.test('unknown keys', function (done) {
            lab.expect(function () {
                enforce({
                    goodKey: 'number',
                }, {
                    badKey: 2
                });
            }).to.throw('bad key');
            done();
        });
    });

    lab.experiment('self-checking', function () {
        lab.test('overall spec not an object', function (done) {
            lab.expect(function () {
                enforce(null, {});
            }).to.throw('bad spec');
            done();
        });

        lab.test('ob not an object', function (done) {
            lab.expect(function () {
                enforce({}, null);
            }).to.throw('bad object');
            done();
        });

        lab.test('key spec not a string or array', function (done) {
            lab.expect(function () {
                enforce({ key: 1 }, {});
            }).to.throw('bad spec');
            done();
        });

        lab.test('key spec 0-length array', function (done) {
            lab.expect(function () {
                enforce({ key: [] }, {});
            }).to.throw('bad spec');
            done();
        });

        lab.test('key spec 4-length array', function (done) {
            lab.expect(function () {
                enforce({ key: [ 1, 2, 3, 4 ] }, {});
            }).to.throw('bad spec');
            done();
        });
    });
});
