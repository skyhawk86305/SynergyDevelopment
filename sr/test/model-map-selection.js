'use strict';

var lab = require('lab'),
    _ = require('lodash'),
    ModelMap = require('../lib/model/map');

function makeTestClip() {
    var CREF1 = { _id: 'ins1c1' },
        CREF2 = { _id: 'ins1c2' },
        hagroups = [
            {
                _id: 'ins1ha1',
                shelves: [{ _id: 'ins1ha2s1' }]
            },
            {
                _id: 'ins1ha2',
                controllers: [{ _id: 'ins1ha2c1' }]
            },
            {
                _id: 'ins1ha3',
                shelves: [{
                    _id: 'ins1ha3s1',
                    _x_bom: { drive_specs: [{ model: 'D' }] }
                }]
            },
            {
                _id: 'ins1c1ha1',
                _model: 'modelA',
                cluster: CREF1,
                shelves: [{
                    _id: 'ins1c1ha1s1',
                    model: 'shelfA',
                    _x_bom: { drive_specs: [{ model: 'A', quantity: 1 }, { model: 'B', quantity: 1 }] }
                }, {
                    _id: 'ins1ch1ha1s2',
                    model: 'shelfA',
                    _x_bom: { drive_specs: [{ model: 'A', quantity: 1 }, { model: 'B', quantity: 2 }] }
                }]
            },
            {
                _id: 'ins1c1ha2',
                _model: 'modelA',
                cluster: CREF1,
            },
            {
                _id: 'ins1c1ha3',
                _model: 'modelB',
                cluster: CREF1,
                controllers: [{ _id: 'ins1c1ha3c1', aggregates: [{ _id: 'ins1c1ha3c1a1' }] }]
            },
            {
                 _id: 'ins1c2ha1',
                cluster: CREF2,
            },
            {
                _id: 'ins1c2ha2',
                cluster: CREF2,
                shelves: [{
                    _id: 'ins1c2ha2s1',
                    _x_bom: { drive_specs: [{ model: 'D' }] }
                }]
            }
        ];
    return {
        synergy_model: {
            hagroups: hagroups
        }
    };
}

lab.experiment('model/map resolveSelection', function() {
    var map;

    function attempt(selector) {
        try {
            map.resolveSelection(selector);
        } catch (err) {
            return err;
        }
    }

    lab.beforeEach(function (done) {
        map = new ModelMap({ /* bad info */ }, makeTestClip());
        // mutate map internal to conform
        map.installations[0]._id = map.installations[0].id = 'ins1';
        map.installations.push({
            id: 'ins2',
            _id: 'ins2',
            _type: 'installation',
            hagroups: [],
            clusters: [],
        });
        done();
    });

    lab.test('is a function', function (done) {
        lab.expect(map.resolveSelection).to.be.a('function');
        done();
    });

    lab.test('return empty if selector is empty', function (done) {
        lab.expect(map.resolveSelection()).to.be.instanceof(Array).with.length(0);
        lab.expect(map.resolveSelection(null)).to.be.instanceof(Array).with.length(0);
        lab.expect(map.resolveSelection(undefined)).to.be.instanceof(Array).with.length(0);
        lab.expect(map.resolveSelection({})).to.be.instanceof(Array).with.length(0);
        done();
    });

    lab.test('crashes if selector is not an object', function (done) {
        var result = attempt(1);

        lab.expect(result).to.be.instanceof(Error);
        lab.expect(result.message).to.eql('resolveSelection: selector object');
        done();
    });

    lab.test('crashes if selector is missing installation', function (done) {
        var result = attempt({ where: {} });

        lab.expect(result).to.be.instanceof(Error);
        lab.expect(result.message).to.eql('resolveSelection: selector installation');
        done();
    });

    lab.experiment('installation selection', function() {
        lab.test('returns empty if there are no installtions defined', function (done) {
            map.installations = [];

            var selector = { installation: {} },
                result = map.resolveSelection(selector);

            lab.expect(result).to.be.instanceof(Array).with.length(0);
            done();
        });

        lab.test('crashes if multiple installations match selector', function (done) {
            var result = attempt({ installation: {} });

            lab.expect(result).to.be.instanceof(Error);
            lab.expect(result.message).to.eql('resolveSelection: installation scope too wide');
            done();
        });

        lab.test('can return an installation by id', function (done) {
            var ins1 = map.installations[0],
                selector = { installation: { id: 'ins1' } },
                result = map.resolveSelection(selector);

            lab.expect(result).to.be.instanceof(Array).with.length(1);
            lab.expect(result[0]).to.eql(ins1);
            done();
        });

        lab.test('ignores unknown selectors', function (done) {
            var ins1 = map.installations[0],
                selector = {
                    installation: { id: 'ins1' },
                    productLine: 'fas',
                    productSubLine: undefined
                },
                result = map.resolveSelection(selector);

            lab.expect(result).to.be.instanceof(Array).with.length(1);
            lab.expect(result[0]).to.eql(ins1);
            done();
        });
    });

    lab.experiment('hagroup selection', function() {
        lab.test('returns empty if there are no hagroups defined', function (done) {
            var selector = {
                    installation: { id: 'ins2' },
                    hagroup: {}
                },
                result = map.resolveSelection(selector);

            lab.expect(result).to.be.instanceof(Array).with.length(0);
            done();
        });

        lab.test('can return all non-cluster hagroups', function (done) {
            var ins1ha = map.installations[0].hagroups,
                selector = {
                    installation: { id: 'ins1' },
                    hagroup: {}
                },
                result = map.resolveSelection(selector);

            lab.expect(result).to.be.instanceof(Array).with.length(3);
            lab.expect(result).to.eql(ins1ha);
            done();
        });

        lab.test('can return a non-cluster hagroup by id', function (done) {
            var ins1ha2 = map.installations[0].hagroups[1],
                selector = {
                    installation: { id: 'ins1' },
                    hagroup: { _id: 'ins1ha2' }
                },
                result = map.resolveSelection(selector);

            lab.expect(result).to.be.instanceof(Array).with.length(1);
            lab.expect(result[0]).to.eql(ins1ha2);
            done();
        });
    });

    lab.experiment('cluster selection', function() {
        lab.test('returns empty if there are no clusters defined', function (done) {
            var selector = {
                    installation: { id: 'ins2' },
                    cluster: {}
                },
                result = map.resolveSelection(selector),
                result2 = map.resolveSelection(_.merge(selector, { hagroup: {} }));

            lab.expect(result).to.be.instanceof(Array).with.length(0);
            lab.expect(result2).to.be.instanceof(Array).with.length(0);
            done();
        });

        lab.test('can return all clusters', function (done) {
            var ins1c = map.installations[0].clusters,
                selector = {
                    installation: { id: 'ins1' },
                    cluster: {}
                },
                result = map.resolveSelection(selector);

            lab.expect(result).to.be.instanceof(Array).with.length(2);
            lab.expect(result).to.eql(ins1c);
            done();
        });

        lab.test('can return a cluster by id', function (done) {
            var ins1c1 = map.installations[0].clusters[0],
                selector = {
                    installation: { id: 'ins1' },
                    cluster: { _id: 'ins1c1' }
                },
                result = map.resolveSelection(selector);

            lab.expect(result).to.be.instanceof(Array).with.length(1);
            lab.expect(result[0]).to.eql(ins1c1);
            done();
        });

        lab.test('ignores unknown selectors', function (done) {
            var ins1c1 = map.installations[0].clusters[0],
                selector = {
                    installation: { id: 'ins1' },
                    cluster: { _id: 'ins1c1' },
                    unknown: {}
                },
                result = map.resolveSelection(selector);

            lab.expect(result).to.be.instanceof(Array).with.length(1);
            lab.expect(result[0]).to.eql(ins1c1);
            done();
        });
    });

    lab.experiment('cluster hagroup selection', function() {
        lab.test('can return all hagroups in a cluster', function (done) {
            var ins1c1ha = map.installations[0].clusters[0].hagroups,
                selector = {
                    installation: { id: 'ins1' },
                    cluster: { _id: 'ins1c1' },
                    hagroup: {}
                },
                result = map.resolveSelection(selector);

            lab.expect(result).to.be.instanceof(Array).with.length(3);
            lab.expect(result).to.eql(ins1c1ha);
            done();
        });

        lab.test('crashes if hagroup selector spans clusters', function (done) {
            var selector = {
                    installation: { id: 'ins1' },
                    cluster: {},
                    hagroup: { _id: 'ins1c1ha1' }
                },
                result = attempt(selector);

            lab.expect(result).to.be.instanceof(Error);
            lab.expect(result.message).to.eql('resolveSelection: cluster scope too wide');
            done();
        });

        lab.test('can return a cluster hagroup by id', function (done) {
            var ins1c1ha1 = map.installations[0].clusters[0].hagroups[0],
                selector = {
                    installation: { id: 'ins1' },
                    cluster: { _id: 'ins1c1' },
                    hagroup: { _id: 'ins1c1ha1' }
                },
                result = map.resolveSelection(selector);

            lab.expect(result).to.be.instanceof(Array).with.length(1);
            lab.expect(result[0]).to.eql(ins1c1ha1);
            done();
        });

        lab.test('can return cluster hagroups by model', function (done) {
            var hagroups = map.installations[0].clusters[0].hagroups,
                groupModelA = _.where(hagroups, { _model: 'modelA' }),
                selector = {
                    installation: { id: 'ins1' },
                    cluster: { _id: 'ins1c1' },
                    hagroup: { _model: 'modelA' }
                },
                result = map.resolveSelection(selector);

            lab.expect(result).to.be.instanceof(Array).with.length(2);
            lab.expect(result).to.eql(groupModelA);
            done();
        });
    });

    lab.experiment('hardware selection', function() {
        lab.test('crashes for unimplemented hardware selector', function (done) {
            var selector = {
                    installation: { id: 'ins1' },
                    hagroup: { _id: 'ins1ha1' },
                    unknown: {}
                },
                result = attempt(selector);

            lab.expect(result).to.be.instanceof(Error);
            lab.expect(result.message).to.eql('resolveSelection: unknown hardware selector');
            done();
        });

        lab.test('crashes for unimplemented aggregate selector', function (done) {
            var selector = {
                    installation: { id: 'ins1' },
                    cluster: { _id: 'ins1c1' },
                    hagroup: { _id: 'ins1c1ha3' },
                    controller: { _id: 'ins1c1ha3c1' },
                    unknown: {}
                },
                result = attempt(selector);

            lab.expect(result).to.be.instanceof(Error);
            lab.expect(result.message).to.eql('resolveSelection: unknown aggregate selector');
            done();
        });

        lab.test('crashes for unimplemented drive selector', function (done) {
            var selector = {
                    installation: { id: 'ins1' },
                    hagroup: { _id: 'ins1ha3' },
                    shelf: { _id: 'ins1ha3s1' },
                    unknown: {}
                },
                result = attempt(selector);

            lab.expect(result).to.be.instanceof(Error);
            lab.expect(result.message).to.eql('resolveSelection: unknown drive selector');
            done();
        });

        lab.experiment('non-cluster hagroup', function() {
            lab.experiment('controllers', function() {
                lab.test('returns empty if none match', function (done) {
                    var selector = {
                            installation: { id: 'ins1' },
                            hagroup: { _id: 'ins1ha2' },
                            controller: { no: 'match' }
                        },
                        result = map.resolveSelection(selector);

                    lab.expect(result).to.be.instanceof(Array).with.length(0);
                    done();
                });

                lab.test('can return all', function (done) {
                    var controller = map.installations[0].hagroups[1].controllers[0],
                        selector = {
                            installation: { id: 'ins1' },
                            hagroup: { _id: 'ins1ha2' },
                            controller: {}
                        },
                        result = map.resolveSelection(selector);

                    lab.expect(result).to.be.instanceof(Array).with.length(1);
                    lab.expect(result[0]).to.eql(controller);
                    done();
                });

                lab.test('can return by id', function (done) {
                    var controller = map.installations[0].hagroups[1].controllers[0],
                        selector = {
                            installation: { id: 'ins1' },
                            hagroup: { _id: 'ins1ha2' },
                            controller: { _id: 'ins1ha2c1' }
                        },
                        result = map.resolveSelection(selector);

                    lab.expect(result).to.be.instanceof(Array).with.length(1);
                    lab.expect(result[0]).to.eql(controller);
                    done();
                });
            });

            lab.experiment('shelves', function() {
                lab.test('returns empty if none match', function (done) {
                    var selector = {
                            installation: { id: 'ins1' },
                            hagroup: { _id: 'ins1ha2' },
                            shelf: { no: 'match' }
                        },
                        result = map.resolveSelection(selector);

                    lab.expect(result).to.be.instanceof(Array).with.length(0);
                    done();
                });

                lab.test('can return all', function (done) {
                    var shelf = map.installations[0].hagroups[0].shelves[0],
                        selector = {
                            installation: { id: 'ins1' },
                            hagroup: { _id: 'ins1ha1' },
                            shelf: {}
                        },
                        result = map.resolveSelection(selector);

                    lab.expect(result).to.be.instanceof(Array).with.length(1);
                    lab.expect(result[0]).to.eql(shelf);
                    done();
                });

                lab.test('can return by id', function (done) {
                    var shelf = map.installations[0].hagroups[0].shelves[0],
                        selector = {
                            installation: { id: 'ins1' },
                            hagroup: { _id: 'ins1ha1' },
                            shelf: { _id: 'ins1ha2s1' }
                        },
                        result = map.resolveSelection(selector);

                    lab.expect(result).to.be.instanceof(Array).with.length(1);
                    lab.expect(result[0]).to.eql(shelf);
                    done();
                });
            });

            lab.experiment('drives', function() {
                lab.test('returns empty if none match', function (done) {
                    var selector = {
                            installation: { id: 'ins1' },
                            hagroup: { _id: 'ins1ha3' },
                            shelf: { _id: 'ins1ha3s1' },
                            drive: { no: 'match' }
                        },
                        result = map.resolveSelection(selector);

                    lab.expect(result).to.be.instanceof(Array).with.length(0);
                    done();
                });

                lab.test('can return all drives in a shelf', function (done) {
                    var drive = map.installations[0].hagroups[2].shelves[0]._x_bom.drive_specs[0],
                        selector = {
                            installation: { id: 'ins1' },
                            hagroup: { _id: 'ins1ha3' },
                            shelf: { _id: 'ins1ha3s1' },
                            drive: {}
                        },
                        result = map.resolveSelection(selector);

                    lab.expect(result).to.be.instanceof(Array).with.length(1);
                    lab.expect(result[0]).to.eql(drive);
                    done();
                });

                lab.test('can return a drive from a shelf by id', function (done) {
                    var drive = map.installations[0].hagroups[2].shelves[0]._x_bom.drive_specs[0],
                        selector = {
                            installation: { id: 'ins1' },
                            hagroup: { _id: 'ins1ha3' },
                            shelf: { _id: 'ins1ha3s1' },
                            drive: { model: 'D' }
                        },
                        result = map.resolveSelection(selector);

                    lab.expect(result).to.be.instanceof(Array).with.length(1);
                    lab.expect(result[0]).to.eql(drive);
                    done();
                });
            });
        });

        lab.experiment('cluster hagroup', function() {
            lab.test('can return a controller by id', function (done) {
                var controller = map.installations[0].clusters[0].hagroups[2].controllers[0],
                    selector = {
                        installation: { id: 'ins1' },
                        cluster: { _id: 'ins1c1' },
                        hagroup: { _id: 'ins1c1ha3' },
                        controller: { _id: 'ins1c1ha3c1' }
                    },
                    result = map.resolveSelection(selector);

                lab.expect(result).to.be.instanceof(Array).with.length(1);
                lab.expect(result[0]).to.eql(controller);
                done();
            });

            lab.test('can return an aggregate from a controller by id', function (done) {
                var controller = map.installations[0].clusters[0].hagroups[2].controllers[0],
                    aggregate = controller.aggregates[0],
                    selector = {
                        installation: { id: 'ins1' },
                        cluster: { _id: 'ins1c1' },
                        hagroup: { _id: 'ins1c1ha3' },
                        controller: { _id: 'ins1c1ha3c1' },
                        aggregate: { _id: 'ins1c1ha3c1a1' }
                    },
                    result = map.resolveSelection(selector);

                lab.expect(result).to.be.instanceof(Array).with.length(1);
                lab.expect(result[0]).to.eql(aggregate);
                done();
            });

            lab.test('can return a shelf by id', function (done) {
                var shelf = map.installations[0].clusters[0].hagroups[0].shelves[0],
                    selector = {
                        installation: { id: 'ins1' },
                        cluster: { _id: 'ins1c1' },
                        hagroup: { _id: 'ins1c1ha1' },
                        shelf: { _id: 'ins1c1ha1s1' }
                    },
                    result = map.resolveSelection(selector);

                lab.expect(result).to.be.instanceof(Array).with.length(1);
                lab.expect(result[0]).to.eql(shelf);
                done();
            });

            lab.test('can return a group of shelves by model', function (done) {
                var shelves = map.installations[0].clusters[0].hagroups[0].shelves,
                    selector = {
                        installation: { id: 'ins1' },
                        cluster: { _id: 'ins1c1' },
                        hagroup: { _id: 'ins1c1ha1' },
                        shelf: { model: 'shelfA' }
                    },
                    result = map.resolveSelection(selector);

                lab.expect(result).to.be.instanceof(Array).with.length(2);
                lab.expect(result).to.eql(shelves);
                done();
            });

            lab.test('can return a group of matching shelves', function (done) {
                var selector = {
                        installation: { id: 'ins1' },
                        cluster: { _id: 'ins1c1' },
                        hagroup: { _id: 'ins1c1ha1' },
                        shelf: { model: 'shelfA', _x_bom: {
                            drive_specs: [{ model: 'A', quantity: 1 }, { model: 'B', quantity: 1 }]
                        }}
                    },
                    result = map.resolveSelection(selector);

                lab.expect(result).to.be.instanceof(Array).with.length(1);
                done();
            });

            lab.test('can return a drive from a shelf by id', function (done) {
                var shelf = map.installations[0].clusters[1].hagroups[1].shelves[0],
                    drive = shelf._x_bom.drive_specs[0],
                    selector = {
                        installation: { id: 'ins1' },
                        cluster: { _id: 'ins1c2' },
                        hagroup: { _id: 'ins1c2ha2' },
                        shelf: { _id: 'ins1c2ha2s1' },
                        drive: { model: 'D' }
                    },
                    result = map.resolveSelection(selector);

                lab.expect(result).to.be.instanceof(Array).with.length(1);
                lab.expect(result[0]).to.eql(drive);
                done();
            });
        });
    });
});
