'use strict';

var assert = require('assert'),
    lab = require('lab'),
    distill = require('../lib/clip/distill'),
    repair = require('../lib/clip/repair'),
    testData = require('./data'),
    _ = require('lodash');

var SWB_CLIP = '7fc2694e-v4-2014-06-16.tclip';

lab.experiment('clip/distill', function() {
    lab.experiment('with SWB/SWS clip 7fc2694e/1', function() {

        // ===== SCAFFOLDING; LOOK FOR TESTS BELOW =====

        var clip,
            query,
            desc;

        function find(atts) {
            assert(atts instanceof Object);
            assert(Object.keys(atts).length);
            assert(desc instanceof Array);

            var result = [];
            for (var idx in desc) {
                var item = desc[idx],
                    all = true;
                for (var key in atts) {
                    if (item[key] !== atts[key]) {
                        all = false;
                        break;
                    }
                }
                if (all) {
                    result.push(item);
                }
            }
            return result;
        }

        lab.before(testData[SWB_CLIP](function (_clip) {
            query = distill(repair(clip = _clip));
            desc = query();
            // console.error(require('util').inspect(desc, {
            //     colors: process.stderr.isTTY,
            //     depth: null
            // }));
        }));

        lab.test('returns a function', function (done) {
            lab.expect(query).to.be.a('function');
            done();
        });

        lab.test('... which returns an array', function (done) {
            lab.expect(desc).to.be.instanceof(Array);
            done();
        });

        function sayEquals(value, key) {
            return key + '=' + value;
        }

        function describeCheck(atts) {
            var extras = _.without(
                    _.keys(atts),
                    '_count',
                    '_type'),
                titles = [
                    'reports',
                    atts._count + 'X',
                    atts._type
                ];

            if (extras.length) {
                var kvpairs = _.map(_.pick(atts, extras), sayEquals),
                    extradesc = 'with ' + kvpairs.join(', ');
                titles.push(extradesc);
            }

            return titles.join(' ');
        }

        function check(atts) {
            lab.test(describeCheck(atts), function (done) {
                lab.expect(find(atts))
                   .to.be.instanceof(Array)
                   .with.length(1);
                done();
            });
        }

        // ===== END OF SCAFFOLDING; TESTS START HERE =====

        check({
            _count: 1,
            _type: 'config',
            config: 'FAS3220A',
        });

        check({
            _count: 2,
            _type: 'node',
            model: 'FAS3220',
            version: '8.2',
            mode: 'c-mode',
        });

        check({
            _count: 1,
            _type: 'shelf',
            model: 'DS2246',
        });

        check({
            _count: 24,
            _type: 'drive',
            model: 'X446B',
            type: 'SSD',
            rpm: 50,
            rawgb: 200,
        });

        check({
            _count: 8,
            _type: 'drive',
            model: 'X448A',
            type: 'SSD',
            rpm: 50,
            rawgb: 200,
        });

        check({
            _count: 40,
            _type: 'drive',
            model: 'X477A',
            type: 'NL_SAS',
            rpm: 7.2,
            rawgb: 4000,
        });

        lab.test('gets 3 matches for { _type: \'drive\' }', function (done) {
            lab.expect(query({ _type: 'drive' }))
               .to.be.an('object')
               .with.property('matches')
               .of.instanceof(Array)
               .with.length(3);
            done();
        });

        lab.test('gets 72 _count for { _type: \'drive\' }', function (done) {
            lab.expect(query({ _type: 'drive' }))
               .to.be.an('object')
               .with.property('_count', 72);
            done();
        });

        lab.test('can find 32 SSDs', function (done) {
            lab.expect(query({ _type: 'drive', type: 'SSD' }))
               .to.be.an('object')
               .with.property('_count', 32);
            done();
        });
    });
});
