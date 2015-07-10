'use strict';

var lab = require('lab'),
    repair = require('../lib/clip/repair'),
    _ = require('lodash'),
    shelves = [],
    drives = [];

lab.experiment('model/builder ', function() {
    lab.before(function (done) {
        shelves = _.range(1,6).map(function(i) { return { _id : 'deadbeef0' + i, shelf_number : i, shelf_model:'DS1234' }; });
        drives = _(shelves).map(function(s) { return _.range(0,24).map(function(d) { return { model: d < 12 ? 'X111' : 'X999', _id: s._id + '00' + d, shelf: s.shelf_number }; }); }).flatten().value();
        done();
    });

    lab.experiment('util', function() {
        lab.test('assign shelf._x_bom', function(done) {
            repair.shelves.fixShelvesXbomsGivenDrives({shelves : shelves, drives : drives});

            lab.expect(shelves[0])
                .to.have.property('_x_bom')
                .with.property('drive_specs')
                .to.have.property(0)
                .to.have.property('quantity')
                .to.equal(12);

            // console.log(JSON.stringify(shelves,null, 4));
            done();
        });
    });
});
