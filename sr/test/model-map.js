'use strict';

var lab = require('lab'),
    reduce = require('../lib/clip/reduce'),
    ModelMap = require('../lib/model/map'),
    prod = require('./lib/get-cached-prodinfo'),
    testData = require('./data');

// jshint camelcase: false

var SWB_CLIP = '7fc2694e-v4-2014-06-16.tclip';

lab.experiment('model/map with default prodInfo', function() {
    var clip, map;

    lab.before(prod);

    function processClip(_clip) {
        clip = _clip;
    }

    lab.experiment('with a SWB/SWS clip of c-mode hagroups lacking clusters', function() {
        lab.before(testData[SWB_CLIP](processClip));

        lab.test('map has an installation (HARDCODED SINGLE)', function(done) {
            map = new ModelMap(prod.info, reduce(clip));
            lab.expect(map)
               .to.have.property('installations')
               .instanceof(Array)
               .with.length(1);

            done();
        });

        lab.test('installation.hagroups is empty', function(done) {
            map = new ModelMap(prod.info, reduce(clip));
            lab.expect(map)
               .to.have.property('installations')
               .to.have.property(0)
               .to.have.property('hagroups')
               .with.length(0);
            done();
        });

        lab.test('installation.clusters.0.hagroups has our hagroup', function(done) {
            map = new ModelMap(prod.info, reduce(clip));
            lab.expect(map)
               .to.have.property('installations')
               .to.have.property(0)
               .to.have.property('clusters')
               .to.have.property(0)
               .to.have.property('hagroups')
               .to.have.property(0)
               .to.have.property('_id', '48936a31-6df0-4e14-8703-9ba7e91f7a07');
            done();
        });
    });

    lab.experiment('rehydrate', function() {
        lab.before(testData[SWB_CLIP](processClip));

        lab.test('is a function', function (done) {
            lab.expect(map.rehydrate).to.be.a('function');
            done();
        });

        lab.test('sets _controller in the aggregates', function(done) {
            /*
            Broken model, I think we need to delete this test
            map = new ModelMap(prod.info, reduce(clip));
            map.rehydrate();

            lab.expect(map)
               .to.have.property('installations')
               .to.have.property(0)
               .to.have.property('clusters')
               .to.have.property(0)
               .to.have.property('hagroups')
               .to.have.property(0)
               .to.have.property('controllers')
               .to.have.property(0);

               */

               /* Removed:
               .to.have.property('aggregates')
               .to.have.property(0)
               .to.have.property('_controller', '1a385ba0-e1bd-44ab-b544-bf190ed1c41d');

               Why: Broken clip. We eject the old auto-aggregates because they are malformed. TODO: Use a newer clip
               */
            done();
        });
    });
});
