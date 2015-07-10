'use strict';

var lab = require('lab'),
    repair = require('../lib/clip/repair');

// jshint camelcase: false

lab.experiment('clip/repair', function() {
    lab.experiment('with hagroups at the top level', function () {
        lab.test('moves it to synergy_model.hagroups', function (done) {
            var clip = repair({
                hagroups: []
            });
            console.error(Object.keys(clip));
            lab.expect(clip).to.not.have.property('hagroups');
            lab.expect(clip).to.have.property('synergy_model')
                            .with.property('hagroups');
            done();
        });
    });

    lab.experiment('with hagroup.is_clustered as a string', function () {
        lab.test('\'true\' => true', function (done) {
            var clip = repair({
                synergy_model: {
                    hagroups: [{
                        is_clustered: 'true'
                    }]
                }
            });
            lab.expect(clip).to.have.property('synergy_model')
                            .with.property('hagroups')
                            .with.property(0)
                            .with.property('is_clustered', true);
            done();
        });

        lab.test('\'false\' => false', function (done) {
            var clip = repair({
                synergy_model: {
                    hagroups: [{
                        is_clustered: 'false'
                    }]
                }
            });
            lab.expect(clip).to.have.property('synergy_model')
                            .with.property('hagroups')
                            .with.property(0)
                            .with.property('is_clustered', false);
            done();
        });
    });

    lab.experiment('with hagroup.is_clustered true, but no cluster', function () {
        var clip;

        lab.before(function (done) {
            clip = repair({
                synergy_model: {
                    hagroups: [{
                        is_clustered: true
                    }]
                }
            });
            done();
        });

        lab.test('cluster is set', function (done) {
            lab.expect(clip).to.have.property('synergy_model')
                            .with.property('hagroups')
                            .with.property(0)
                            .with.property('cluster');
            done();
        });

        lab.test('cluster._id is set', function (done) {
            lab.expect(clip).to.have.property('synergy_model')
                            .with.property('hagroups')
                            .with.property(0)
                            .with.property('cluster')
                            .with.property('_id');
            done();
        });
    });

    lab.experiment('with hagroup._x_bom.system.is_clustered as a string', function () {
        lab.test('\'true\' => true', function (done) {
            var clip = repair({
                synergy_model: {
                    hagroups: [{
                        _x_bom: {
                            system: {
                                is_clustered: 'true'
                            }
                        }
                    }]
                }
            });
            lab.expect(clip).to.have.property('synergy_model')
                            .with.property('hagroups')
                            .with.property(0)
                            .with.property('_x_bom')
                            .with.property('system')
                            .with.property('is_clustered', true);
            done();
        });

        lab.test('\'false\' => false', function (done) {
            var clip = repair({
                synergy_model: {
                    hagroups: [{
                        _x_bom: {
                            system: {
                                is_clustered: 'false'
                            }
                        }
                    }]
                }
            });
            lab.expect(clip).to.have.property('synergy_model')
                            .with.property('hagroups')
                            .with.property(0)
                            .with.property('_x_bom')
                            .with.property('system')
                            .with.property('is_clustered', false);
            done();
        });
    });

    lab.experiment('with shelf._x_bom detail lacking rpm', function () {
        var clip = repair({
                synergy_model: {
                    hagroups: [{
                        shelves: [{
                            _x_bom: [{
                                model: 'X448A',
                                count: 24,
                            }],
                        }],
                    }]
                }
            });

        lab.test('fills shelf _x_bom from lookup table', function (done) {
            lab.expect(clip).to.have.property('synergy_model')
                            .with.property('hagroups')
                            .with.property(0)
                            .with.property('shelves')
                            .with.property(0)
                            .with.property('_x_bom')
                            .with.property('drive_specs')
                            .with.property(0)
                            .with.property('rpm', 50);
            done();
        });
    });

    lab.experiment('with hagroup._x_bom.shelves.* lacking details', function () {
        var clip = repair({
                synergy_model: {
                    hagroups: [{
                        drives: [{
                            disk_model: 'X448A',
                            rpm: 50,
                            disk_type: 'SSD',
                        }],
                        _x_bom: {
                            shelves: [{
                                drive1model: 'X448A'
                            }]
                        }
                    }]
                }
            });

        lab.test('fills hagroup _x_bom shelf driveNrpm=50 from drives', function (done) {
            lab.expect(clip).to.have.property('synergy_model')
                            .with.property('hagroups')
                            .with.property(0)
                            .with.property('_x_bom')
                            .with.property('shelves')
                            .with.property(0)
                            .with.property('drive1rpm', 50);
            done();
        });

        lab.test('fills hagroup _x_bom shelf driveNtype from drives', function (done) {
            lab.expect(clip).to.have.property('synergy_model')
                            .with.property('hagroups')
                            .with.property(0)
                            .with.property('_x_bom')
                            .with.property('shelves')
                            .with.property(0)
                            .with.property('drive1type', 'SSD');
            done();
        });
    });


    lab.experiment('creating shelf._x_bom from drive and hagroup._x_bom', function () {
        var clip = repair({
                synergy_model: {
                    hagroups: [{
                        drives: [{
                            // note legacy keys
                            disk_model: 'X448A',
                            rpm: 50,
                            disk_type: 'SSD',
                            shelf: 1,
                        }],
                        shelves: [{
                            shelf_number: 1,
                        }],
                        _x_bom: {
                            shelves: [{
                                drive1model: 'X448A',
                                drive1rawgb: 100,
                            }]
                        }
                    }]
                }
            }),
            shelf = clip.synergy_model.hagroups[0].shelves[0];

        lab.test('fills model=X448A from drives table', function (done) {
            lab.expect(shelf)
                .to.have.property('_x_bom')
                .with.property('drive_specs')
                .with.property(0)
                .with.property('model')
                .equal('X448A');
            done();
        });

        lab.test('fills quantity=1 from drives table', function (done) {
            lab.expect(shelf)
                .to.have.property('_x_bom')
                .with.property('drive_specs')
                .with.property(0)
                .with.property('quantity')
                .equal(1);
            done();
        });


        lab.test('fills rawgb=1 from hagroup._x_bom', function (done) {
            lab.expect(shelf)
                .to.have.property('_x_bom')
                .with.property('drive_specs')
                .with.property(0)
                .with.property('rawgb')
                .equal(100);
            done();
        });

        lab.test('fills rpm=50 from drives table', function (done) {
            lab.expect(shelf)
                .to.have.property('_x_bom')
                .with.property('drive_specs')
                .with.property(0)
                .with.property('rpm')
                .equal(50);
            done();
        });


        lab.test('fills type=SSD from drives table', function (done) {
            lab.expect(shelf)
                .to.have.property('_x_bom')
                .with.property('drive_specs')
                .with.property(0)
                .with.property('type')
                .equal('SSD');
            done();
        });
    });

    lab.experiment('with old property names in shelf objects', function () {
        var clip = repair({
                synergy_model: {
                    hagroups: [{
                        shelves: [{
                            // taken from 7fc2694e-v4-2014-06-16.tclip
                            shelf_model: 'DS4246',
                            shelf_type: 'DS4246',
                            serial_no: 'X', // was null, but we need value
                        }],
                    }]
                }
            }),
            shelf = clip.synergy_model.hagroups[0].shelves[0];

        lab.test('renames shelf_model to model', function (done) {
            lab.expect(shelf).to.not.have.property('shelf_model');
            lab.expect(shelf).to.have.property('model', 'DS4246');
            done();
        });

        lab.test('renames serial_no to serial_number', function (done) {
            lab.expect(shelf).to.not.have.property('serial_no');
            lab.expect(shelf).to.have.property('serial_number', 'X');
            done();
        });

        lab.test('removes shelf_type', function (done) {
            lab.expect(shelf).to.not.have.property('shelf_type');
            done();
        });
    });

    lab.experiment('with controller aggregates or volumes === null', function () {
        var clip = repair({
                synergy_model: {
                    hagroups: [{
                        controllers: [{
                            aggregates: null,
                            volumes: null
                        }]
                    }]
                }
            });

        lab.test('removes controller.aggregates', function (done) {
            lab.expect(clip).to.have.property('synergy_model')
                            .with.property('hagroups')
                            .with.property(0)
                            .with.property('controllers')
                            .with.property(0)
                            .not.with.property('aggregates');
            done();
        });

        lab.test('removes controller.volumes', function (done) {
            lab.expect(clip).to.have.property('synergy_model')
                            .with.property('hagroups')
                            .with.property(0)
                            .with.property('controllers')
                            .with.property(0)
                            .not.with.property('volumes');
            done();
        });
    });
});
