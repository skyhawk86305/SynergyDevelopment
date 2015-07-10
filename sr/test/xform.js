'use strict';

var lab = require('lab'),
    xform = require('../lib/xform');

lab.experiment('xform', function() {
    lab.test('include', function (done) {
        var victim = { included: 1 },
            spec = { included: true },
            result = xform(spec, victim);
        lab.expect(result).to.have.property('included', 1);
        done();
    });

    lab.test('ignore', function (done) {
        var victim = { ignored: 1 },
            spec = { },
            result = xform(spec, victim);
        lab.expect(result).to.not.have.property('ignored');
        done();
    });

    lab.test('pass through function', function (done) {
        function conspiracy() {
            return 23;
        }

        var victim = { included: 1 },
            spec = { included: conspiracy },
            result = xform(spec, victim);
        lab.expect(result).to.have.property('included', 23);
        done();
    });

    lab.test('include sub-object', function (done) {
        var victim = {
                parent: {
                    child: 1
                }
            },
            spec = {
                parent: {
                    child: true
                }
            },
            result = xform(spec, victim);
        lab.expect(result).to.have.property('parent')
                          .with.property('child', 1);
        done();
    });

    lab.test('include sub-object but value undefined', function (done) {
        var victim = {
                parent: undefined
            },
            spec = {
                parent: {
                    child: true
                }
            },
            result = xform(spec, victim);
        lab.expect(result).to.deep.equal({ parent: undefined });
        done();
    });


    lab.test('include sub-array with object', function (done) {
        var victim = {
                parent: {
                    children: [
                        { id: 1 },
                        { id: 2 },
                    ]
                }
            },
            spec = {
                parent: {
                    children: [{
                        id: true
                    }]
                }
            },
            result = xform(spec, victim);

        lab.expect(result).to.have.property('parent')
                          .with.property('children')
                          .with.property(1)
                          .with.property('id', 2);
        done();
    });

    lab.test('include sub-array with function', function (done) {
        function replaceWithAlien(child) {
            return {
                id: child.id,
                isAlien: true
            };
        }

        var victim = {
                parent: {
                    children: [
                        { id: 1 },
                        { id: 2 },
                    ]
                }
            },
            spec = {
                parent: {
                    children: [ replaceWithAlien ]
                }
            },
            result = xform(spec, victim);

        lab.expect(result).to.have.property('parent')
                          .with.property('children')
                          .with.property(1)
                          .with.property('isAlien', true);
        done();
    });

    lab.test('include sub-array but value undefined', function (done) {
        var victim = {
                parent: {
                    children: undefined
                }
            },
            spec = {
                parent: {
                    children: [{
                        id: true
                    }]
                }
            },
            result = xform(spec, victim);

        lab.expect(result).to.have.property('parent')
                          .deep.equal({ children: undefined });
        done();
    });

    lab.test('catches non-true value spec', function (done) {
        function attempt() {
            xform({ v: 1 }, { v: false });
        }

        lab.expect(attempt).to.throw('top.v: invalid spec');
        done();
    });

    lab.test('can use custom top name while catching non-true value spec', function (done) {
        function attempt() {
            xform({ v: 1 }, { v: false }, 'test');
        }

        lab.expect(attempt).to.throw('test.v: invalid spec');
        done();
    });

    lab.test('catches 0-length array spec', function (done) {
        function attempt() {
            xform({ v: ['a'] }, { v: [] });
        }

        lab.expect(attempt).to.throw('top.v: invalid array spec');
        done();
    });

    lab.test('catches 2-length array spec', function (done) {
        function attempt() {
            xform({ v: ['a'] }, { v: [ attempt, attempt ] });
        }

        lab.expect(attempt).to.throw('top.v: invalid array spec');
        done();
    });

    lab.test('catches non-object, non-function array spec', function (done) {
        function attempt() {
            xform({ v: ['a'] }, { v: [ 'attempt' ] });
        }

        lab.expect(attempt).to.throw('top.v: invalid array spec');
        done();
    });

    lab.test('ignores keys if spec value is false', function (done) {
        var victim = { x: 1 },
            spec = { x: false },
            result = xform(spec, victim);
        lab.expect(result).to.not.have.property('x');
        done();
    });

   lab.test('catches use of \'true\' spec for object', function (done) {
        function attempt() {
            var victim = { v: { isObject: true } },
                spec = { v: true };
            xform(spec, victim);
        }
        lab.expect(attempt).to.throw('top.v: object needs spec');
        done();
    });

    lab.test('catches use of \'true\' spec for array', function (done) {
        function attempt() {
            var victim = { v: [{ isObjectInArray: true }] },
                spec = { v: true };
            xform(spec, victim);
        }
        lab.expect(attempt).to.throw('top.v: array needs spec');
        done();
    });

    lab.test('reports correct path after catching spec problem in array', function (done) {
        function attempt() {
            var victim = {
                    arrayKey: [{
                        valueKey: {
                            problem: 'object structure undocumented'
                        }
                    }]
                },
                spec = {
                    arrayKey: [{
                        valueKey: true,
                    }],
                };
            xform(spec, victim);
        }
        lab.expect(attempt).to.throw('top.arrayKey[0].valueKey: object needs spec');
        done();
    });

    lab.test('copes with null values', function (done) {
        var victim = { v: null},
            spec = { v: true },
            result = xform(spec, victim);
        lab.expect(result).to.eql({ v: null });
        done();
    });

    lab.experiment('with partial arguments', function () {
        var victim = {
                willSurvive: true,
                willBeIgnored: true,
            },
            spec = {
                willSurvive: true,
                willBeIgnored: false,
            },
            expected = {
                willSurvive: true,
            };

        lab.test('xform(spec) => function(ob, path) => result', function (done) {
            var result = xform(spec)(victim, 'top');
            lab.expect(result).to.eql(expected);
            done();
        });

        lab.test('xform(spec, ob) => result', function (done) {
            var result = xform(spec, victim);
            lab.expect(result).to.eql(expected);
            done();
        });

        lab.test('xform(spec, path) => function(ob) => result', function (done) {
            var result = xform(spec, 'top')(victim);
            lab.expect(result).to.eql(expected);
            done();
        });
    });
});

lab.experiment('xform.constant', function() {
    lab.experiment('("value")', function () {
        var closure = xform.constant('value'),
            kpath = 'top.v';

        lab.test('("value", kpath) returns value', function (done) {
            lab.expect(closure('value', kpath)).to.equal('value');
            done();
        });

        lab.test('(undefined) returns value', function (done) {
            lab.expect(closure(undefined, kpath)).to.equal('value');
            done();
        });

        lab.test('("other") throws', function (done) {
            lab.expect(attempt).to.throw('top.v !== "value"');
            done();

            function attempt() {
                closure(23, kpath);
            }
        });
    });

    lab.experiment('when called from xform', function () {
        var spec = {
                type: xform.constant('x')
            },
            example = {
                type: 'x'
            };

        lab.test('missing values are filled in', function (done) {
            var victim = { },
                result = xform(spec, victim);
            lab.expect(result).to.eql(example);
            done();
        });

        lab.test('matching values pass OK', function (done) {
            var result = xform(spec, example);
            lab.expect(result).to.eql(example);
            done();
        });

        lab.test('mismatched values cause exceptions', function (done) {
            var victim = { type: 'not x' };

            lab.expect(attempt).to.throw('top.type !== "x"');
            done();

            function attempt() {
                xform(spec, victim);
            }
        });
    });
});

lab.experiment('xform.setdefault', function() {
    lab.experiment('("value default")', function () {
        var closure = xform.setdefault('value default'),
            kpath = 'top.v';

        lab.test('(undefined, kpath) returns default', function (done) {
            lab.expect(closure(undefined, kpath)).to.equal('value default');
            done();
        });

        lab.test('("non-default value", kpath) returns value', function (done) {
            lab.expect(closure('non-default value', kpath)).to.equal('non-default value');
            done();
        });

        lab.test('(23, kpath) /* type mismatch */ throws', function (done) {
            lab.expect(attempt).to.throw('top.v: type mismatch');
            done();

            function attempt() {
                closure(23, kpath);
            }
        });
    });

    lab.experiment('(functionReturningDefault, typeString)', function () {
        var defaultValue = 23;

        function functionReturningNumber() {
            return defaultValue;
        }

        var closure = xform.setdefault(functionReturningNumber, 'number'),
            kpath = 'top.v';

        lab.test('(undefined, kpath) returns made default', function (done) {
            lab.expect(closure(undefined, kpath)).to.equal(defaultValue);
            done();
        });

        lab.test('(value, kpath) returns value', function (done) {
            lab.expect(closure(123, kpath)).to.equal(123);
            done();
        });

        lab.test('("value of wrong type", kpath) throws', function (done) {
            lab.expect(attempt).to.throw('top.v: type mismatch');
            done();

            function attempt() {
                closure('value of wrong type', kpath);
            }
        });
    });

    lab.experiment('(functionReturningDefault, validator)', function () {
        var defaultValue = 'default',
            closure = xform.setdefault(makeDefault, validate),
            kpath = 'top.v';

        function makeDefault() {
            return defaultValue;
        }

        function validate(value /*, kpath */) {
            // MUST return value if not crashing, else result === undefined
            if (typeof value !== 'string') {
                throw new Error('not string');
            }
            return value;
        }

        lab.test('(undefined, kpath) returns default', function (done) {
            lab.expect(closure(undefined, kpath)).to.equal(defaultValue);
            done();
        });

        lab.test('(okValue, kpath) returns okValue', function (done) {
            lab.expect(closure('ok value', kpath)).to.equal('ok value');
            done();
        });

        lab.test('(notOkValue, kpath) throws with kpath', function (done) {
            lab.expect(attempt).to.throw('top.v: not string');
            done();

            function attempt() {
                closure(23, kpath);
            }
        });

        lab.test('validator can modify [default] value', function (done) {
            var closure = xform.setdefault(makeDefault, changeValue),
                result = closure(undefined, 'top.v');
            lab.expect(result).to.equal(23);
            done();

            function changeValue(value) {
                lab.expect(value).to.equal(defaultValue);
                return 23;
            }
        });

        lab.test('supplies message if validator Errors lack them', function (done) {
            lab.expect(attempt).to.throw('top.v: Error');
            done();

            function attempt() {
                xform.setdefault(makeDefault, dieQuietly)(23, kpath);
            }

            function dieQuietly() {
                throw new Error();
            }
        });

        lab.test('supplies kpath if validator Errors lacks it', function (done) {
            lab.expect(attempt).to.throw('top.v: failed');
            done();

            function attempt() {
                xform.setdefault(makeDefault, dieLoudly)(23, kpath);
            }

            function dieLoudly() {
                throw new Error('failed');
            }
        });

        lab.test('doesn\'t double kpath if validator provides it', function (done) {
            lab.expect(attempt).to.throw('top.v: failed');
            done();

            function attempt() {
                xform.setdefault(makeDefault, dieSpecifically)(23, kpath);
            }

            function dieSpecifically() {
                throw new Error('top.v: failed');
            }
        });
    });
});
