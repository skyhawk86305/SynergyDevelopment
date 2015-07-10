'use strict';

var lab = require('lab'),
    _ = require('lodash'),
    debounce = require('../lib/debounce');

lab.experiment('debounce', function() {
    lab.test('is a function', function (done) {
        lab.expect(debounce).to.be.a('function');
        done();
    });

    lab.experiment('when called with a function', function () {
        lab.test('returns a 3-arity function', function (done) {
            lab.expect(debounce(_.noop)).to.be.a('function')
                .with.property('length').eql(3);
            done();
        });
    });

    lab.experiment('for an instant async method', function () {
        var debounced;

        function dummy(arg, callback) {
            lab.expect(arg).to.eql(23);
            setImmediate(callback, null);
        }

        lab.before(function (done) {
            debounced = debounce(dummy);
            done();
        });

        lab.test('crashes if called with 2-arity', function (done) {
            function attempt() {
                debounced(23, _.noop);
            }

            lab.expect(attempt).to.throw('debounced: expected 3 arguments');
            done();
        });

        lab.test('passes through and calls back', function (done) {
            debounced('scope', 23, function theCallback(err) {
                lab.expect(err).to.eql(null);
                done();
            });
        });
    });

    lab.experiment('for a slow async method', function () {
        var debounced,
            active,
            maxActive;

        function dummy(arg, callback) {
            function later() {
                active = active - 1;
                if (arg) {
                    callback(null);
                } else {
                    callback(new Error('Request Fail'));
                }
            }

            active = active + 1;
            if (active > maxActive) {
                maxActive = active;
            }

            setTimeout(later, 10);
        }

        lab.beforeEach(function (done) {
            debounced = debounce(dummy);
            active = 0;
            maxActive = 0;
            done();
        });

        lab.test('three calls in three scopes', function (done) {
            var firstOk = false,
                secondOk = false;

            debounced('scope1', 23, function (err) {
                lab.expect(err).to.eql(null);
                firstOk = true;
            });

            debounced('scope2', 24, function (err) {
                lab.expect(err).to.eql(null);
                secondOk = true;
            });

            debounced('scope3', 25, function (err) {
                lab.expect(err).to.eql(null);
                lab.expect(maxActive).to.eql(3, 'three calls were not concurrent');
                lab.expect(firstOk).to.eql(true, 'first call not made');
                lab.expect(secondOk).to.eql(true, 'second call not made');
                done();
            });
        });

        lab.test('three calls in one scope', function (done) {
            var firstOk = false,
                secondOk = false;

            debounced('scope1', 23, function (err) {
                lab.expect(err).to.eql(null);
                firstOk = true;
            });

            debounced('scope1', 24, function (err) {
                lab.expect(err.message).to.eql('Skipped');
                secondOk = true;
            });

            debounced('scope1', 25, function (err) {
                lab.expect(err).to.eql(null);

                lab.expect(firstOk).to.eql(true, 'first call not made');
                lab.expect(secondOk).to.eql(true, 'second call not skipped');
                done();
            });
        });

        lab.experiment('if a request succeeds while another is waiting', function() {
            lab.test('callback is called before next request', function (done) {
                var firstOk = false,
                    secondOk = false;

                debounced('scope1', 23, function (err) {
                    lab.expect(err).to.eql(null);
                    firstOk = true;

                    debounced('scope1', 25, function (err) {
                        lab.expect(err).to.eql(null);

                        lab.expect(firstOk).to.eql(true, 'first call not made');
                        lab.expect(secondOk).to.eql(true, 'second call not skipped');
                        done();
                    });

                });

                debounced('scope1', 24, function (err) {
                    lab.expect(err.message).to.eql('Skipped');
                    secondOk = true;
                });
            });
        });

        lab.experiment('if a request fails while none is waiting', function() {
            lab.test('call back with the error', function (done) {
                debounced('scope1', undefined, function (err) {
                    lab.expect(err.message).to.eql('Request Fail');
                    done();
                });
            });
        });

        lab.experiment('if a request fails while another is waiting', function() {
            lab.test('TODO: no callback; next request tried', function (done) {
                var firstOk = false;

                debounced('scope1', undefined, function (err) {
                    lab.expect(err.message).to.eql('Request Fail');
                    firstOk = true;
                });

                debounced('scope1', 23, function (err) {
                    lab.expect(err).to.eql(null);
                    lab.expect(firstOk).to.eql(true, 'first call not made');
                    done();
                });
            });
        });
    });
});
