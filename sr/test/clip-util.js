'use strict';

var lab = require('lab'),
    clipUtil = require('../lib/clip/util');

// jshint camelcase: false

lab.experiment('clip/util', function() {
    lab.experiment('with hagroup._x_bom.shelves.* lacking details', function () {
        var systems = [{
                drives: [{
                    disk_model: 'X448A',
                    rpm: 50,
                    disk_type: 'SSD',
                }],
                _x_bom: {
                    system:{
                        system_model: 'FAS8060',
                        _model: 'FAS8060A',
                        configuration: 'High Availability',
                        version: '8.2.1RC2',
                        is_clustered: true,
                        names: '11eb88f6/f211d4f4'},
                    shelves: [{
                        shelf_model: 'DS4246',
                        shelf_type: 'DS4246',
                        drive1rawgb: 1,
                        drive1count: 24,
                        drive1model: 'X448A'
                    }]
                    //
                },
                model: 'FAS8060',
                is_clustered: true,

                shelves: [{
                    model: 'DS4246',
                    _x_bom: [{
                        quantity: 24,
                        model: 'X448A',
                        diskType: 'SSD'
                        // some information still missing, as happens in
                        // some clips
                    }]
                }],

                controllers:[{
                    _id: '11eb88f6-6a89-49a0-9d03-9f29d192f6dd',
                    aggregates:[{
                        name: '_auto_aggr0',
                    }, {
                        name: '_auto_aggr1',
                    }],
                },{
                    _id: 'f211d4f4-1f09-4330-9103-305fa07e0f73',
                    aggregates:[{
                        name: '_auto_aggr1',
                    },{
                        name: '_auto_aggr0',
                    }],
                }],
            }];

        lab.test('still there', function (done) {
            lab.expect(systems[0]).to.have.property('drives')
                            .with.property(0)
                            .with.property('disk_model');
            done();
        });

        lab.test('still there2', function (done) {
            lab.expect(systems[0]).to.have.property('_x_bom')
                            .with.property('shelves')
                            .with.property(0)
                            .with.property('drive1model');
            done();
        });

        lab.test('clipUtil.describeSystems', function (done) {
            var desc = clipUtil.describeSystems(systems);
            lab.expect(desc).to.have.property('drives')
                .with.property('count')
                .with.property('SSD');
            lab.expect(desc).to.have.property('drives')
                .with.property('rawtb')
                .with.property('SSD');
            // console.log('desc ', desc);
            done();
        });

        lab.test('clipUtil.distillSystem', function (done) {
            var desc = clipUtil.distillSystem(systems[0]);
            lab.expect(desc);
            // console.log('desc ', desc());
            done();
        });
    });

    lab.experiment('with old property names in shelf objects', function () {
        var systems = [{
                        shelves: [{
                            // taken from 7fc2694e-v4-2014-06-16.tclip
                            shelf_model: 'DS4246',
                            shelf_type: 'DS4246',
                            serial_no: 'X', // was null, but we need value
                        }],
                    }];

        lab.test('still there', function (done) {
            lab.expect(systems[0]).to.have.property('shelves');
            //lab.expect(shelf).to.have.property('model', 'DS4246');
            done();
        });
    });
});
