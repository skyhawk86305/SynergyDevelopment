'use strict';

var LogStore = require('../lib/stores/logger.js'),
    lab = require('lab'),
    _ = require('lodash');

lab.describe('the log store', function() {
    var logger;

    lab.beforeEach(function(done) {
        logger = new LogStore();
        done();
    });

    function getEntries() {
        return logger.getState().entries;
    }

    function logAndCheckBasics(tags, original) {
        logger.log(tags, original);

        // check entries array
        var entries = getEntries();
        lab.expect(entries).to.be.instanceof(Array);
        lab.expect(entries.length).to.equal(1);

        // check this one entry
        var entry = entries[0];
        lab.expect(entry.tags).to.eql(tags, 'tags mismatch');
        lab.expect(entry.timestamp - Date.now()).to.be.below(10, 'timestamp out of range');
        lab.expect(_.partial(JSON.stringify, entry)).to.not.throw();

        return entry;
    }

    lab.test('accepts .log(tags, \"message\")', function(done) {
        var tags = [ 'test' ],
            message = 'message';

        var entry = logAndCheckBasics(tags, message);
        lab.expect(entry.message).to.eql(message);
        done();
    });

    lab.test('accepts .log(tags, err)', function(done) {
        var tags = [ 'test' ],
            err = new Error('message');

        var entry = logAndCheckBasics(tags, err);
        lab.expect(entry.err).to.equal(err.toString()); // errors can't be stringified
        lab.expect(entry.message).to.equal(err.message);
        lab.expect(entry.stack).to.eql(err.stack);
        done();
    });

    lab.test('accepts .log(tags, object)', function(done) {
        var tags = [ 'test' ],
            original = {
                detail: 23
            };

        var entry = logAndCheckBasics(tags, original);
        lab.expect(entry.detail).to.eql(original.detail);
        done();
    });

    lab.test('advertises a change upon logging', function(done) {
        logger.watch(onChange);
        logger.log(['ate'], 'food');

        function onChange() {
            done();
        }
    });

    lab.test('entries can be serialised to JSON', function(done) {
        logger.log(['ate'], 'food');
        lab.expect(_.partial(JSON.stringify, getEntries()))
           .to.not.throw();
        done();
    });

    lab.test('entry timestamps are integers for easy parsing', function(done) {
        logger.log(['ate'], 'food');
        lab.expect(typeof getEntries()[0].timestamp).to.eql('number');
        done();
    });

    lab.test('should prevent memory overflow by limiting log entries', function(done) {
        for (var i = 0; i < logger.options.entryLimit + 1; i++) {
            logger.log(['ate'], 'food');
        }

        lab.expect(logger.getState().entries.length).to.eql(logger.options.entryLimit);
        lab.expect(logger.getState().confirmed).to.eql(0);
        lab.expect(logger.getState().overflowed).to.eql(1);
        done();
    });

    lab.experiment('when asked to drain', function () {
        lab.test('calls postFunction with drop object and a callback function', function (done) {
            logger.log(['ate'], 'food');
            logger.drain(function postFunction(drop, callback) {
                lab.expect(drop.entries).to.be.instanceof(Array).with.length.same(1);
                lab.expect(drop.sessionId).to.be.a('string');
                lab.expect(drop.now).to.be.a('number');
                lab.expect(callback).to.be.a('function').with.length.same(1);
                done();
            });
        });

        lab.experiment('and we call back with success', function () {
            lab.test('the next drain gets no entries but entries were preserved', function (done) {
                logger.log(['ate'], 'food');
                logger.drain(function postFunction(drop, callback) {
                    lab.expect(drop.entries).to.be.instanceof(Array).with.length.same(1);
                    lab.expect(callback).to.be.a('function').with.length.same(1);
                    callback(null);
                    setImmediate(function () {
                        logger.drain(function postFunction2(drop) {
                            lab.expect(drop.entries).to.be.instanceof(Array).with.length.same(0);
                            lab.expect(logger.getState().entries).to.be.instanceof(Array).with.length.same(1);
                            done();
                        });
                    });
                });
            });
        });
    });
});
