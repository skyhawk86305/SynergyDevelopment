'use strict';

var lab = require('lab'),
    info = require('../lib/clip/info'),
    constants = require('../lib/constants'),
    testData = require('./data'),
    _ = require('lodash');

var SWB_CLIP = '7fc2694e-v4-2014-06-16.tclip';

lab.experiment('clip/info', function() {
    lab.experiment('with SWB/SWS clip 7fc2694e v4', function() {
        var clip,
            result;

        function processClip(_clip) {
            clip = _clip;
            result = info(clip);
            // console.error(require('util').inspect(result, {
            //     colors: process.stderr.isTTY,
            //     depth: null
            // }));
        }

        lab.before(testData[SWB_CLIP](processClip));

        lab.test('has wanted metadata', function (done) {
            // jshint camelcase: false
            lab.expect(result).to.have.property('_uuid', clip._uuid);
            lab.expect(result).to.have.property('_version', clip._version);
            lab.expect(result).to.have.property('_user_id', clip._user_id);
            lab.expect(result).to.have.property('_timestamp', clip.__timestamp);
            done();
        });

        lab.test('has no unwanted metadata', function (done) {
            _.forEach(constants.UNWANTED_METADATA, function (key) {
                lab.expect(result).to.not.have.property(key);
            });
            done();
        });

        lab.test('has _x_autodesc with nodes', function (done) {
            lab.expect(result)
               .to.have.property('_x_autodesc')
               .with.property('nodes');
            done();
        });

        lab.test('has _x_autotags containing FAS3220A', function (done) {
            lab.expect(result)
               .to.have.property('_x_autotags')
               .contain('FAS3220A');
            done();
        });
    });
});
