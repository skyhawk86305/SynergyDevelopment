'use strict';

var lab = require('lab'),
    ObjectWalker = require('../lib/object-walker');

lab.experiment('ObjectWalker', function() {
    lab.experiment('({ x:1 }, \'top\')', function () {
        var initialValue,
            x1;

        lab.before(function(done) {
            initialValue = { x: 1 };
            x1 =  new ObjectWalker(initialValue, 'top');
            done();
        });

        lab.experiment('.value', function () {
            lab.test('is the original object', function (done) {
                lab.expect(x1.value).to.equal(initialValue);
                done();
            });
        });

        lab.experiment('.has', function () {
            lab.test('(\'x\') => true', function (done) {
                lab.expect(x1.has('x')).to.equal(true);
                done();
            });

            lab.test('(\'absent\') => false', function (done) {
                lab.expect(x1.has('absent')).to.equal(false);
                done();
            });
        });

        lab.experiment('.get', function () {
            lab.experiment('(\'x\')', function () {
                var x,
                    err;

                lab.before(function(done) {
                    try {
                        x = x1.get('x');
                    } catch (_err) {
                        err = _err;
                    }
                    done();
                });

                function reThrow() {
                    if (err) {
                        throw err;
                    }
                }

                lab.test('does not throw', function (done) {
                    lab.expect(reThrow).to.not.throw();
                    done();
                });

                lab.test('returns another walker', function (done) {
                    lab.expect(x).to.be.instanceof(ObjectWalker);
                    done();
                });

                lab.test('.exists === true', function (done) {
                    lab.expect(x.exists).to.equal(true);
                    done();
                });

                lab.test('.value === 1', function (done) {
                    lab.expect(x.value).to.equal(1);
                    done();
                });

                lab.test('.path === \'top.x\'', function (done) {
                    lab.expect(x.path).to.equal('top.x');
                    done();
                });

                function getY() {
                    x.get('y');
                }

                lab.test('.get(\'y\') throws with path top.x.y, message', function (done) {
                    lab.expect(getY).to.throw('top.x.y: expected value');
                    done();
                });
            });

            lab.experiment('(\'absent\')', function () {
                function getY() {
                    x1.get('absent');
                }

                lab.test('throws with path top.absent, message', function (done) {
                    lab.expect(getY).to.throw('top.absent: expected value');
                    done();
                });
            });
        });

        lab.experiment('.maybe', function () {
            var result,
                err;

            function reThrow() {
                if (err) {
                    throw err;
                }
            }

            lab.experiment('(\'x\')', function() {
                lab.before(function(done) {
                    result = undefined;
                    try {
                        result = x1.maybe('x');
                    } catch (_err) {
                        err = _err;
                    }
                    done();
                });

                lab.test('does not throw', function (done) {
                    lab.expect(reThrow).to.not.throw();
                    done();
                });

                lab.test('returns another walker', function (done) {
                    lab.expect(result).to.be.instanceof(ObjectWalker);
                    done();
                });

                lab.test('.value === 1', function (done) {
                    lab.expect(result.value).to.equal(1);
                    done();
                });

                lab.test('passes isWrapped', function (done) {
                    lab.expect(ObjectWalker.isWrapped(result)).to.equal(true);                        result.assert(true, 'msg');
                    done();
                });
            });

            lab.experiment('(\'x.y\')', function() {
                lab.before(function(done) {
                    result = undefined;
                    try {
                        result = x1.maybe('x.y');
                    } catch (_err) {
                        err = _err;
                    }
                    done();
                });

                lab.test('does not throw', function (done) {
                    lab.expect(reThrow).to.not.throw();
                    done();
                });

                lab.test('returns an object', function (done) {
                    lab.expect(result).to.be.instanceof(Object);
                    done();
                });

                lab.test('.exists === false', function (done) {
                    lab.expect(result.exists).to.equal(false);
                    done();
                });

                lab.test('.path === \'top.x.y\'', function (done) {
                    lab.expect(result.path).to.equal('top.x.y');
                    done();
                });

                lab.experiment('.maybe(\'z\')', function () {
                    var m2result;

                    lab.before(function(done) {
                        try {
                            m2result = result.maybe('z');
                        } catch (_err) {
                            err = _err;
                        }
                        done();
                    });

                    lab.test('does not throw', function (done) {
                        lab.expect(reThrow).to.not.throw();
                        done();
                    });

                    lab.test('.exists === false', function (done) {
                        lab.expect(m2result.exists).to.equal(false);
                        done();
                    });

                    lab.test('.path === \'top.x.y.z\'', function (done) {
                        lab.expect(m2result.path).to.equal('top.x.y.z');
                        done();
                    });
                });
            });

            lab.experiment('(\'x.y.z\')', function() {
                lab.before(function(done) {
                    result = undefined;
                    try {
                        result = x1.maybe('x.y.z');
                    } catch (_err) {
                        err = _err;
                    }
                    done();
                });

                lab.test('.exists === false', function (done) {
                    lab.expect(result.exists).to.equal(false);
                    done();
                });

                lab.test('.path === \'top.x.y.z\'', function (done) {
                    lab.expect(result.path).to.equal('top.x.y.z');
                    done();
                });
            });

            lab.experiment('(\'absent\')', function() {
                lab.before(function(done) {
                    result = undefined;
                    try {
                        result = x1.maybe('absent');
                    } catch (_err) {
                        err = _err;
                    }
                    done();
                });

                lab.test('does not throw', function (done) {
                    lab.expect(reThrow).to.not.throw();
                    done();
                });

                lab.test('returns an object', function (done) {
                    lab.expect(result).to.be.instanceof(Object);
                    done();
                });

                lab.test('.exists === false', function (done) {
                    lab.expect(result.exists).to.equal(false);
                    done();
                });

                lab.test('.path === \'top.absent\'', function (done) {
                    lab.expect(result.path).to.equal('top.absent');
                    done();
                });

                lab.test('.value throws top.absent: expected value', function (done) {
                    lab.expect(function () {
                        // jshint unused: false
                        var value = result.value;
                    }).to.throw('top.absent: expected value');
                    done();
                });

                lab.test('.get(\'sub\') throws top.absent: expected value', function (done) {
                    lab.expect(function () {
                        result.get('sub');
                    }).to.throw('top.absent: expected value');
                    done();
                });

                lab.test('.has(\'sub\') throws top.absent: expected value', function (done) {
                    lab.expect(function () {
                        result.has('sub');
                    }).to.throw('top.absent: expected value');
                    done();
                });

                lab.test('.assert(true, \'msg\') throws top.absent: expected value', function (done) {
                    lab.expect(function () {
                        result.assert(true, 'msg');
                    }).to.throw('top.absent: expected value');
                    done();
                });

                lab.test('.assertType(\'string\') throws top.absent: expected value', function (done) {
                    lab.expect(function () {
                        result.assert(true, 'msg');
                    }).to.throw('top.absent: expected value');
                    done();
                });

                lab.test('passes isWrapped', function (done) {
                    lab.expect(ObjectWalker.isWrapped(result)).to.equal(true);
                    done();
                });
            });
        });

        lab.experiment('.assert() with bool arg', function () {
            function assertTruth() {
                x1.assert(true, 'FAIL');
            }

            function assertFalse() {
                x1.assert(false, 'FAIL');
            }

            lab.test('true arg => survival', function (done) {
                lab.expect(assertTruth).to.not.throw();
                done();
            });

            lab.test('false arg => throws with path, message', function (done) {
                lab.expect(assertFalse).to.throw('top: FAIL');
                done();
            });
        });

        lab.experiment('.assert() with function arg', function () {
            var assertFnResult,
                assertFnFirstArg;

            function assertFn(value) {
                assertFnFirstArg = value;
                return assertFnResult;
            }

            function assertIt() {
                x1.assert(assertFn, 'FAIL');
            }

            lab.test('fn called with value as arg', function (done) {
                assertFnResult = true;
                assertFnFirstArg = null;
                lab.expect(assertIt).to.not.throw();
                lab.expect(assertFnFirstArg).to.equal(initialValue);
                done();
            });

            lab.test('true result => survival', function (done) {
                assertFnResult = true;
                lab.expect(assertIt).to.not.throw();
                done();
            });

            lab.test('false result => throws with path, message', function (done) {
                assertFnResult = false;
                lab.expect(assertIt).to.throw('top: FAIL');
                done();
            });
        });

        lab.experiment('.assertType()', function () {
            function assertString() {
                x1.assertType('string');
            }

            function assertObject() {
                x1.assertType('object');
            }

            lab.test('match => survival', function (done) {
                lab.expect(assertObject).to.not.throw();
                done();
            });

            lab.test('mismatch => throws with path, message', function (done) {
                lab.expect(assertString).to.throw('top: expected string');
                done();
            });
        });
    });

    lab.experiment('special cases', function () {
        lab.experiment('feeding bad values:', function () {
            lab.test('ObjectWalker(value, null)', function (done) {
                lab.expect(function () {
                    // jshint unused: false
                    var walker = new ObjectWalker({}, null);
                }).to.throw('invalid path');
                done();
            });
        });

        lab.experiment('cache busting with { x: { y: { z: 23 } } }:', function () {
            var initialValue,
                top;

            lab.before(function(done) {
                initialValue = { x: { y: { z: 23 } } };
                top =  new ObjectWalker(initialValue, 'top');
                done();
            });

            lab.test('.get(\'x.y.z\').value === 23', function (done) {
                lab.expect(top.get('x.y.z').value).to.equal(23);
                done();
            });
        });

        lab.experiment('checking for unwrapped values:', function () {
            lab.test('ObjectWalker.isWrapped({x: 1}) === false', function (done) {
                lab.expect(ObjectWalker.isWrapped({x: 1})).to.equal(false);
                done();
            });
        });

        lab.experiment('repeated prop names across arrays', function () {
            var hagroup,
                _shelfBom;

            lab.before(function(done) {
                hagroup = {
                    _x_bom: { sentinel: 1 },
                    shelves: [{
                        _x_bom: [{ sentinel: 2 }]
                    }]
                };

                var _hagroup =  new ObjectWalker(hagroup, 'hagroup'),
                    _shelves = _hagroup.get('shelves'),
                    _shelf = _shelves.get('0'); // MUST be string
                _shelfBom = _shelf.get('_x_bom');
                done();
            });

            lab.test('.get of repeat behaves', function (done) {
                var actual = hagroup.shelves[0]._x_bom;
                lab.expect(_shelfBom.value).to.eql(actual);
                done();
            });
        });
    });
});
