'use strict';

var lab = require('lab'),
    getClientCache = require('../lib/client-cache');

lab.experiment('the client cache function', function() {
    lab.test('calls back without error on Node', function(done) {
        getClientCache(function (err, engine) {
            lab.expect(err).to.eql(null);
            lab.expect(engine).to.be.instanceof(Object);
            done();
        });
    });
});

lab.experiment('the default client cache', function() {
    var cache;

    lab.beforeEach(function (done) {
        cache = undefined;
        getClientCache(function (err, engine) {
            cache = engine;
            done(err);
        });
    });

    lab.test('can be fetched on Node', function(done) {
        lab.expect(cache).to.be.instanceof(Object);
        done();
    });

    lab.test('is a NullCache', function(done) {
        lab.expect(cache.constructor.name).to.eql('NullCache');
        done();
    });

    lab.experiment('get', function() {
        lab.test('calls back with undefined', function(done) {
            cache.get('key', function (err, value) {
                lab.expect(err).to.eql(null);
                lab.expect(value).to.eql(undefined);
                done();
            });
        });

        lab.experiment('with an injected crashing _get', function () {
            lab.test('calls back with undefined', function (done) {
                cache._get = function () {
                    throw new Error('I crashed!');
                };

                cache.get('not present', function (err, value) {
                    lab.expect(err).to.eql(null);
                    lab.expect(value).to.eql(undefined);
                    done();
                });
            });
        });

        lab.experiment('with an injected failing _get', function () {
            lab.test('calls back with undefined', function (done) {
                cache._get = function (key, callback) {
                    callback(new Error('I failed!'));
                };

                cache.get('not present', function (err, value) {
                    lab.expect(err).to.eql(null);
                    lab.expect(value).to.eql(undefined);
                    done();
                });
            });
        });
    });

    lab.experiment('set', function() {
        lab.test('calls back without error', function(done) {
            cache.set('key', 'value', function (err) {
                lab.expect(err).to.eql(null);
                done();
            });
        });

        lab.test('does not affect later get of same key', function(done) {
            cache.set('key', 'value', function () {
                cache.get('key', function (err, value) {
                    lab.expect(err).to.eql(null);
                    lab.expect(value).to.eql(undefined);
                    done();
                });
            });
        });

        lab.experiment('with an injected crashing _set', function () {
            lab.test('calls back; later get works', function (done) {
                cache._set = function () {
                    throw new Error('I crashed!');
                };

                cache.set('key', 'value', function (err) {
                    lab.expect(err).to.eql(null);
                    cache.get('key', function (err, value) {
                        lab.expect(err).to.eql(null);
                        lab.expect(value).to.eql(undefined);
                        done();
                    });
                });
            });
        });

        lab.experiment('with an injected failing _set', function () {
            lab.test('calls back; later get works', function (done) {
                cache._set = function (key, value, callback) {
                    callback(new Error('I failed!'));
                };

                cache.set('key', 'value', function (err) {
                    lab.expect(err).to.eql(null);
                    cache.get('key', function (err, value) {
                        lab.expect(err).to.eql(null);
                        lab.expect(value).to.eql(undefined);
                        done();
                    });
                });
            });
        });
    });

    lab.experiment('remove', function() {
        lab.test('calls back without error', function(done) {
            cache.remove('key', function (err) {
                lab.expect(err).to.eql(null);
                done();
            });
        });

        lab.test('does not affect later set of same key', function(done) {
            cache.remove('key', function () {
                cache.set('key', 'value', function (err, value) {
                    lab.expect(err).to.eql(null);
                    lab.expect(value).to.eql(undefined);
                    done();
                });
            });
        });

        lab.experiment('with an injected crashing _remove', function () {
            lab.test('calls back; later set works', function (done) {
                cache._remove = function () {
                    throw new Error('I crashed!');
                };

                cache.remove('key', function (err) {
                    lab.expect(err).to.eql(null);
                    cache.set('key', 'value', function (err, value) {
                        lab.expect(err).to.eql(null);
                        lab.expect(value).to.eql(undefined);
                        done();
                    });
                });
            });
        });

        lab.experiment('with an injected failing _remove', function () {
            lab.test('calls back; later set works', function (done) {
                cache._remove = function (key, callback) {
                    callback(new Error('I failed!'));
                };

                cache.remove('key', function (err) {
                    lab.expect(err).to.eql(null);
                    cache.set('key', 'value', function (err, value) {
                        lab.expect(err).to.eql(null);
                        lab.expect(value).to.eql(undefined);
                        done();
                    });
                });
            });
        });
    });
});

lab.experiment('if local storage is available', function () {
    var storage = {},
        getItem = function (key) {
            return storage[key];
        },
        setItem = function (key, value) {
            storage[key] = value;
        },
        removeItem = function (key) {
            delete storage[key];
        };

    lab.beforeEach(function (done) {
        global.window = {
            localStorage: {
                setItem: setItem,
                getItem: getItem,
                removeItem: removeItem
            }
        };
        done();
    });

    lab.afterEach(function (done) {
        delete global.window;
        done();
    });

    lab.test('the cache is a working LocalStorageCache', function(done) {
        getClientCache(function (err, engine) {
            lab.expect(err).to.eql(null);
            lab.expect(engine).to.be.instanceof(Object);
            lab.expect(engine.constructor.name).to.eql('LocalStorageCache');
            engine.get('key', function (err, value) {
                lab.expect(err).to.eql(null);
                lab.expect(value).to.eql(undefined);
                engine.set('key', 'value', function (err) {
                    lab.expect(err).to.eql(null);
                    engine.get('key', function (err, value) {
                        lab.expect(err).to.eql(null);
                        lab.expect(value).to.eql('value');
                        engine.remove('key', function (err) {
                            lab.expect(err).to.eql(null);
                            engine.get('key', function (err, value) {
                                lab.expect(err).to.eql(null);
                                lab.expect(value).to.eql(undefined);
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    lab.experiment('but removeItem crashes', function () {
        lab.test('the cache is a NullCache', function (done) {
            global.window.localStorage.removeItem = function () {
                throw new Error('I crashed!');
            };

            getClientCache(function (err, engine) {
                lab.expect(engine.constructor.name).to.eql('NullCache');
                done();
            });
        });
    });

    lab.experiment('but setItem crashes', function () {
        lab.test('the cache is a NullCache', function (done) {
            global.window.localStorage.setItem = function () {
                throw new Error('I crashed!');
            };

            getClientCache(function (err, engine) {
                lab.expect(engine.constructor.name).to.eql('NullCache');
                done();
            });
        });
    });

    lab.experiment('but getItem crashes', function () {
        lab.test('the cache is a NullCache', function (done) {
            global.window.localStorage.getItem = function () {
                throw new Error('I crashed!');
            };

            getClientCache(function (err, engine) {
                lab.expect(engine.constructor.name).to.eql('NullCache');
                done();
            });
        });
    });

    lab.experiment('but getItem does not return what was set', function () {
        lab.test('the cache is a NullCache', function (done) {
            global.window.localStorage.getItem = function () {
                return 'This is not what you set!';
            };

            getClientCache(function (err, engine) {
                lab.expect(engine.constructor.name).to.eql('NullCache');
                done();
            });
        });
    });
});
