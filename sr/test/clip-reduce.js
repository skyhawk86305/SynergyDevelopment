'use strict';

var lab = require('lab'),
    reduceDetail = require('../lib/clip/reduce'),
    testData = require('./data');

var SWB_CLIP = '7fc2694e-v4-2014-06-16.tclip';

lab.experiment('clip/reduce', function() {
    lab.experiment('without hagroups at the top level', function() {
        lab.test('does not attempt to set synergy_model', function (done) {
            var clip = reduceDetail({});
            lab.expect(clip).to.not.have.property('synergy_model');
            done();
        });
    });

    lab.experiment('with a SWB/SWS clip', function() {
        var raw,
            reduced;

        function processClip(clip) {
            raw = clip;
            try {
                reduced = reduceDetail(clip);
            } catch (err) {
                console.error(err.stack);
            }
        }

        lab.before(testData[SWB_CLIP](processClip));

        lab.test('returns a reduced clip', function (done) {
            lab.expect(reduced).to.be.a('object');
            done();
        });

        lab.test('moved hagroups to synergy_model.hagroups', function (done) {
            // verify the test's expectations about the original clip
            lab.expect(raw).to.have.property('hagroups')
                           .that.is.an.instanceof(Array);
            lab.expect(raw).to.not.have.property('synergy_model');

            // and now, about the result:
            lab.expect(reduced).to.have.property('synergy_model')
                               .that.is.an('object')
                               .with.property('hagroups')
                               .that.is.an.instanceof(Array);
            done();
        });

        lab.test('preserved hagroups[0]._x_bom', function (done) {
            lab.expect(reduced).to.have.property('synergy_model')
                               .that.is.an('object')
                               .with.property('hagroups')
                               .with.property(0)
                               .with.property('_x_bom')
                               .that.is.an('object');
            done();
        });
    });
});
