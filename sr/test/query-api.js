'use strict';

var lab = require('lab'),
    _ = require('lodash'),
    addQueryAPI = require('../lib/add-query-api');

lab.experiment('sequences with an added query API', function () {
    var filters = {
            propped: function (item) {
                return _.has(item, 'prop');
            },
            prop1: {
                prop: 1
            },
        },
        rawSequence = [{ prop: 1 }],
        sequence = addQueryAPI(rawSequence, filters);

    lab.test('are the same array as they were before', function (done) {
        lab.expect(sequence).to.equal(rawSequence);
        done();
    });

    lab.experiment('.where', function () {
        lab.test('is a hidden function own property', function (done) {
            lab.expect(typeof sequence.where).to.equal('function');
            var d = Object.getOwnPropertyDescriptor(sequence, 'where');
            lab.expect(d).to.not.equal(undefined, 'doesn\'t exist!?');
            lab.expect(d.enumerable).to.equal(false, 'not hidden');
            done();
        });

        lab.test('has visible prop with get, !set for each filter', function (done) {
            _.forEach(filters, function (fn, name) {
                var d = Object.getOwnPropertyDescriptor(sequence.where, name);
                lab.expect(d).to.not.equal(undefined, name + ' doesn\'t exist');
                lab.expect(d.enumerable).to.equal(true, 'not visible');
                lab.expect(typeof d.set).to.equal('undefined', 'has setter');
                lab.expect(typeof d.get).to.equal('function', 'lacks getter');
            });
            done();
        });

        lab.experiment('filter prop result', function () {
            lab.test('equals what you\'d get from _.where(seq, filter)', function (done) {
                var hardWay = _.where(sequence, filters.propped),
                    easyWay = sequence.where.propped;
                lab.expect(easyWay).eql(hardWay);
                done();
            });

            lab.test('... even if filter is an object', function (done) {
                var hardWay = _.where(sequence, filters.prop1),
                    easyWay = sequence.where.prop1;
                lab.expect(easyWay).eql(hardWay);
                done();
            });

            lab.test('has a hidden .where function own property', function (done) {
                var d = Object.getOwnPropertyDescriptor(sequence.where.propped, 'where');
                lab.expect(d).to.not.equal(undefined, 'doesn\'t exist!?');
                lab.expect(d.enumerable).to.equal(false, 'not hidden');
                done();
            });

            lab.test('has a hidden .and function own property', function (done) {
                var d = Object.getOwnPropertyDescriptor(sequence.where.propped, 'and');
                lab.expect(d).to.not.equal(undefined, 'doesn\'t exist!?');
                lab.expect(d.enumerable).to.equal(false, 'not hidden');
                done();
            });

            lab.test('... and so on', function (done) {
                var result = sequence.where.propped.and.propped.and.propped;
                lab.expect(result).eql(sequence.where.propped);
                done();
            });
        });
    });

    lab.experiment('.groupBy', function () {
        lab.test('is a hidden function own property', function (done) {
            lab.expect(typeof sequence.groupBy).to.equal('function');
            var d = Object.getOwnPropertyDescriptor(sequence, 'groupBy');
            lab.expect(d).to.not.equal(undefined, 'doesn\'t exist!?');
            lab.expect(d.enumerable).to.equal(false, 'not hidden');
            done();
        });

        lab.experiment('with result', function () {
            var hardWay = _.groupBy(sequence, 'prop'),
                easyWay = sequence.groupBy('prop');

            lab.test('equals what you\'d get from _.groupBy(seq, what)', function (done) {
                lab.expect(easyWay).eql(hardWay);
                done();
            });

            lab.test('does not have a hidden .where, because terminal', function (done) {
                var d = Object.getOwnPropertyDescriptor(easyWay, 'where');
                lab.expect(d).to.equal(undefined);
                done();
            });
        });
    });

    lab.experiment('.concat', function () {
        lab.test('is a hidden function own property', function (done) {
            lab.expect(typeof sequence.concat).to.equal('function');
            var d = Object.getOwnPropertyDescriptor(sequence, 'concat');
            lab.expect(d).to.not.equal(undefined, 'doesn\'t exist!?');
            lab.expect(d.enumerable).to.equal(false, 'not hidden');
            done();
        });

        lab.experiment('with result', function () {
            var tail = [{ prop: 2 }],
                hardWay = sequence.concat(tail),
                easyWay = rawSequence.concat(tail);

            lab.test('equals what you\'d get from seq.concat(what) otherwise', function (done) {
                lab.expect(easyWay).eql(hardWay);
                done();
            });

            lab.test('has the chainable .where API', function (done) {
                var result = easyWay.where.propped.and.propped.and.propped;
                lab.expect(result).eql(hardWay);
                done();
            });
        });
    });
});

lab.experiment('addQueryAPI extra quick checks:', function () {
    lab.test('no filters', function (done) {
        var seq = addQueryAPI([ { x: 1 }, { x: 2 }]);
        lab.expect(typeof seq.where).equals('function');
        lab.expect(seq.where({ x:1 })).to.eql([{ x:1 }]);
        done();
    });

    lab.experiment('map', function () {
        var seq = addQueryAPI([ 1, 2 ], { noop: _.noop });

        lab.test('is a function prop', function (done) {
            lab.expect(typeof seq.map).equals('function');
            done();
        });

        lab.test('works like _.map(seq, ...)', function (done) {
            lab.expect(seq.map(increment))
                .to.eql(_.map(seq, increment));
            done();
        });

        lab.test('results have .where', function (done) {
            lab.expect(typeof seq.map(increment).where).to.equal('function');
            done();
        });

        lab.test('... without the original\'s filters', function (done) {
            lab.expect(typeof seq.where.noop).to.equal('object', 'original lacks filters!?');
            lab.expect(typeof seq.map(increment).where.noop).to.equal('undefined');
            done();
        });

        lab.test('... and we can addQueryAPI if we like', function (done) {
            var results = addQueryAPI(seq.map(increment), { noop2: _.noop });
            lab.expect(typeof results.where.noop2).to.equal('object', 'new API not present');
            lab.expect(typeof results.where.noop).to.equal('undefined', 'old API not absent');
            done();
        });

        function increment(n) {
            return n + 1;
        }
    });

    lab.experiment('filter', function () {
        var seq = addQueryAPI([ 1, 2 ], { noop: _.noop });

        lab.test('is a function prop', function (done) {
            lab.expect(typeof seq.filter).equals('function');
            done();
        });

        lab.test('works like _.filter(seq, ...)', function (done) {
            lab.expect(seq.filter(even))
                .to.eql(_.filter(seq, even));
            done();
        });

        lab.test('results have .where', function (done) {
            lab.expect(typeof seq.filter(even).where).to.equal('function');
            done();
        });

        lab.test('... with the original\'s filters', function (done) {
            lab.expect(typeof seq.where.noop).to.equal('object', 'original lacks filters!?');
            lab.expect(typeof seq.filter(even).where.noop).to.equal('object');
            done();
        });

        function even(n) {
            return n % 2 === 0;
        }
    });

    lab.test('filter', function (done) {
        var seq = addQueryAPI([ null, null ]);
        lab.expect(typeof seq.filter).equals('function');
        lab.expect(seq.filter()).to.eql([]);
        done();
    });
});
