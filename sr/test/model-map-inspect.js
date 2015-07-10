'use strict';

var lab = require('lab'),
    reduce = require('../lib/clip/reduce'),
    ModelMap = require('../lib/model/map'),
    HagroupInspector = require('../lib/model/inspect/hagroup'),
    ControllerInspector = require('../lib/model/inspect/controller'),
    Config = require('../lib/prodinfo/config'),
    prod = require('./lib/get-cached-prodinfo'),
    testData = require('./data'),
    _ = require('lodash');

// jshint camelcase: false

var SWB_CLIP = '7fc2694e-v4-2014-06-16.tclip';

lab.experiment('the map', function() {
    var map;

    function processClip(clip) {
        map = new ModelMap(prod.info, reduce(clip));
    }

    lab.before(prod);
    lab.before(testData[SWB_CLIP](processClip));

    lab.experiment('inspect({ _id: X, _type: \'hagroup\' })', function () {
        var ref,
            hagroup,
            inspector;

        lab.before(function prepInspector(done) {
            hagroup = map.installations[0].clusters[0].hagroups[0];
            ref = _.pick(hagroup, '_id', '_type');
            inspector = map.inspect(hagroup);
            done();
        });

        lab.test('is an HaGroupInspector', function(done) {
            lab.expect(inspector).to.be.instanceof(HagroupInspector);
            done();
        });

        lab.test('gives a Config as .config', function(done) {
            lab.expect(inspector.config).to.be.instanceof(Config);
            done();
        });

        lab.test('gives itself as .hagroup', function(done) {
            lab.expect(inspector.hagroup).is.equal(hagroup);
            done();
        });

        lab.test('inspecting again gives same inspector', function(done) {
            lab.expect(map.inspect(hagroup)).is.equal(inspector);
            done();
        });

        lab.test('can find aggregates with .aggregates.where', function (done) {
            lab.expect(inspector.aggregates.where({ name: 'auto_aggr0' }))
                .to.be.instanceof(Array)
                .with.length(2);
            done();
        });

        lab.test('can find aggregates with .aggregates.where.manual', function (done) {
            lab.expect(inspector.aggregates.where.manual)
                .to.be.instanceof(Array);
            done();
        });
    });

    lab.experiment('inspect({ _id: X, _type: \'controller\' })', function () {
        var ref,
            controller,
            inspector;

        lab.before(function prepInspector(done) {
            var hagroup = map.installations[0].clusters[0].hagroups[0];
            controller = hagroup.controllers[0];
            ref = _.pick(controller, '_id', '_type');
            inspector = map.inspect(ref);
            done();
        });

        lab.test('is a ControllerInspector', function(done) {
            lab.expect(inspector).to.be.instanceof(ControllerInspector);
            done();
        });

        lab.test('has more .controller than we provided', function(done) {
            var more = _.omit(inspector.controller, _.keys(ref));
            lab.expect(_.keys(more).length).to.be.above(0);
            done();
        });

        lab.test('has .hagroup', function(done) {
            lab.expect(_.keys(inspector.hagroup).length).to.be.above(0);
            done();
        });

        lab.test('gives itself as .controller', function(done) {
            lab.expect(inspector.controller).is.equal(controller);
            done();
        });

        lab.test('inspecting again gives same inspector', function(done) {
            lab.expect(map.inspect(controller)).is.equal(inspector);
            done();
        });
    });

    lab.experiment('inspect.controller(_id)', function () {
        var controller,
            inspector;

        lab.before(function prepInspector(done) {
            var hagroup = map.installations[0].clusters[0].hagroups[0];
            controller = hagroup.controllers[0];
            inspector = map.inspect.controller(controller._id);
            done();
        });

        lab.test('is a ControllerInspector', function(done) {
            lab.expect(inspector).to.be.instanceof(ControllerInspector);
            done();
        });

        lab.test('.controller points back OK', function(done) {
            lab.expect(inspector.controller).to.be.equal(controller);
            done();
        });
    });

    lab.experiment('find.controller(_id)', function () {
        var controller,
            found;

        lab.before(function prepInspector(done) {
            var hagroup = map.installations[0].clusters[0].hagroups[0];
            controller = hagroup.controllers[0];
            found = map.find.controller(controller._id);
            done();
        });

        lab.test('returns our controller', function(done) {
            lab.expect(found).to.be.equal(controller);
            done();
        });
    });
});
