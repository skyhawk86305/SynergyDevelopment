'use strict';

var LogApiHost = require('../lib/log-api.js'),
    lab = require('lab'),
    _ = require('lodash');

lab.experiment('log API', function() {
    var log,
        entries,
        _console,
        tags = [ 'log', 'test' ],
        tagrep = tags.join(', ');

    function logfn(tags, entry) {
        entries.push({ tags: tags, entry: entry });
    }

    lab.beforeEach(function(done) {
        entries = [];

        _console = {
            lines: {
                debug: [],
                info: [],
                warn: [],
                error: [],
            }
        };

        _.forEach(_console.lines, function (results, level) {
            _console[level] = function () {
                results.push(_.toArray(arguments));
            };
        });

        log = (new LogApiHost(logfn, { console: _console })).log;
        done();
    });

    lab.experiment('log(tags, { ... })', function () {
        var ob = { a: 1, b: 2 };

        lab.test('calls the upstream logger', function (done) {
            log(tags, ob);
            lab.expect(entries).to.have.length(1);
            lab.expect(entries[0].tags).to.eql(tags);
            lab.expect(entries[0].entry).to.eql(ob);
            done();
        });

        lab.test('calls console.debug', function (done) {
            log(tags, ob);
            lab.expect(_console.lines.debug).to.have.length(1);
            lab.expect(_console.lines.debug[0][0]).to.eql(tagrep);
            lab.expect(_console.lines.debug[0][1]).to.eql(ob);
            done();
        });

        lab.experiment('with \'warn\' in tags', function () {
            lab.test('calls console.warn instead', function (done) {
                log([ 'warn' ], ob);
                lab.expect(_console.lines.warn).to.have.length(1);
                lab.expect(_console.lines.warn[0][0]).to.eql('warn');
                lab.expect(_console.lines.warn[0][1]).to.eql(ob);
                lab.expect(_console.lines.debug).to.have.length(0);
                done();
            });
        });

        lab.experiment('with \'error\' in tags', function () {
            lab.test('calls console.error instead', function (done) {
                log([ 'error' ], ob);
                lab.expect(_console.lines.error).to.have.length(1);
                lab.expect(_console.lines.error[0][0]).to.eql('error');
                lab.expect(_console.lines.error[0][1]).to.eql(ob);
                lab.expect(_console.lines.debug).to.have.length(0);
                done();
            });
        });

        lab.experiment('with \'err\' in entry object', function () {
            lab.test('calls console.error instead', function (done) {
                var err = new Error('x');
                log(tags, err);
                lab.expect(_console.lines.error).to.have.length(1);
                lab.expect(_console.lines.error[0][0]).to.eql(tagrep);
                lab.expect(_console.lines.error[0][1]).to.eql(err);
                lab.expect(_console.lines.debug).to.have.length(0);
                done();
            });
        });
    });

    lab.experiment('log(tags, \'message\')', function () {
        lab.test('calls the upstream logger', function (done) {
            log(tags, 'message');
            lab.expect(entries).to.have.length(1);
            done();
        });
    });

    lab.experiment('log(tags, err)', function () {
        lab.test('calls the upstream logger', function (done) {
            log(tags, new Error('error test'));
            lab.expect(entries).to.have.length(1);
            done();
        });
    });

    lab.experiment('log.debug(...)', function () {
        lab.beforeEach(function (done) {
            log.debug('debug', 23);
            done();
        });

        lab.test('passes arguments to console.debug', function (done) {
            lab.expect(_console.lines.debug).to.have.length(1);
            lab.expect(_console.lines.debug[0][0]).to.equal('debug');
            lab.expect(_console.lines.debug[0][1]).to.equal(23);
            done();
        });

        lab.test('does NOT call the upstream logger', function (done) {
            lab.expect(entries).to.have.length(0);
            done();
        });

        lab.test('issues warning about log.debug first time', function (done) {
            lab.expect(_console.lines.warn).to.have.length(1);
            lab.expect(_console.lines.warn[0][0]).to.match(/^log.debug/);
            done();
        });

        lab.test('does not issue warning about log.debug second time', function (done) {
            log.debug('debug', 24);
            lab.expect(_console.lines.warn).to.have.length(1);
            done();
        });
    });

    lab.experiment('log.info(...)', function () {
        lab.beforeEach(function (done) {
            log.info('info', 23);
            done();
        });

        lab.test('passes arguments to console.info', function (done) {
            lab.expect(_console.lines.info).to.have.length(1);
            lab.expect(_console.lines.info[0][0]).to.equal('info');
            lab.expect(_console.lines.info[0][1]).to.equal(23);
            done();
        });

        lab.test('does NOT call the upstream logger', function (done) {
            lab.expect(entries).to.have.length(0);
            done();
        });

        lab.test('issues warning about log.info first time', function (done) {
            lab.expect(_console.lines.warn).to.have.length(1);
            lab.expect(_console.lines.warn[0][0]).to.match(/^log.info/);
            done();
        });

        lab.test('does not issue warning about log.info second time', function (done) {
            log.info('info', 24);
            lab.expect(_console.lines.warn).to.have.length(1);
            done();
        });
    });

    lab.experiment('log.warn(...)', function () {
        lab.beforeEach(function (done) {
            log.warn('warn', 23);
            done();
        });

        lab.test('passes arguments to console.warn', function (done) {
            lab.expect(_console.lines.warn).to.have.length(2);
            lab.expect(_console.lines.warn[1][0]).to.equal('warn');
            lab.expect(_console.lines.warn[1][1]).to.equal(23);
            done();
        });

        lab.test('does NOT call the upstream logger', function (done) {
            lab.expect(entries).to.have.length(0);
            done();
        });

        lab.test('issues warning about log.warn first time', function (done) {
            lab.expect(_console.lines.warn).to.have.length(2);
            lab.expect(_console.lines.warn[0][0]).to.match(/^log.warn/);
            done();
        });

        lab.test('does not issue warning about log.warn second time', function (done) {
            log.warn('warn', 24);
            lab.expect(_console.lines.warn).to.have.length(3);
            done();
        });
    });

    lab.experiment('log.error(...)', function () {
        lab.beforeEach(function (done) {
            log.error('error', 23);
            done();
        });

        lab.test('passes arguments to console.error', function (done) {
            lab.expect(_console.lines.error).to.have.length(1);
            lab.expect(_console.lines.error[0][0]).to.equal('error');
            lab.expect(_console.lines.error[0][1]).to.equal(23);
            done();
        });

        lab.test('does NOT call the upstream logger', function (done) {
            lab.expect(entries).to.have.length(0);
            done();
        });

        lab.test('issues warning about log.error first time', function (done) {
            lab.expect(_console.lines.warn).to.have.length(1);
            lab.expect(_console.lines.warn[0][0]).to.match(/^log.error/);
            done();
        });

        lab.test('does not issue warning about log.error second time', function (done) {
            log.error('error', 24);
            lab.expect(_console.lines.warn).to.have.length(1);
            done();
        });
    });
});

