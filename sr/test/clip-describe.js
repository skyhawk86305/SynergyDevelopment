'use strict';

var lab = require('lab'),
    _describe = require('../lib/clip/describe'),
    repair = require('../lib/clip/repair'),
    distill = require('../lib/clip/distill'),
    testData = require('./data');

var SWB_CLIP = '0e197319-v1-2014-01-22.tclip';

lab.experiment('clip/describe', function () {
    lab.experiment('with a SWB/SWS clip 0e197319/1', function() {
        var clip,
            description;

        function processClip(_clip) {
            clip = _clip;
            description = _describe(distill(repair(clip)));
            // console.error(require('util').inspect(description, {
            //     colors: process.stderr.isTTY,
            //     depth: null
            // }));
        }

        lab.before(testData[SWB_CLIP](processClip));

        lab.test('counted 2*FAS8060A', function (done) {
            lab.expect(description.nodes)
               .to.deep.equal({ FAS8060: 2 });
            done();
        });

        lab.test('counted 1*DS2246 and 4* S4486', function (done) {
            lab.expect(description.shelves)
               .to.deep.equal({ DS2246: 1, DS4486: 4 });
            done();
        });

        lab.test('got one version: \'8.2.1RC2\'', function (done) {
            lab.expect(description.versions)
               .to.deep.equal([ '8.2.1RC2' ]);
            done();
        });

        lab.test('got one mode: \'c-mode\'', function (done) {
            lab.expect(description.modes)
               .to.deep.equal([ 'c-mode' ]);
            done();
        });

        // TODO: solve problem with old C#-generated models

        // lab.test('counted 24*SSD', function (done) {
        //     lab.expect(description.drives)
        //        .to.have.property('count')
        //        .with.property('SSD', 24);
        //     done();
        // });

        // lab.test('totalled 9.6TB in SSD, though nobody cares', function (done) {
        //     lab.expect(description.drives)
        //        .to.have.property('rawtb')
        //        .with.property('SSD', 9.6);
        //     done();
        // });

        // lab.test('totalled 192TB in capacity drives', function (done) {
        //     lab.expect(description.drives)
        //        .to.have.property('rawtb')
        //        .with.property('capacity', 192);
        //     done();
        // });
    });
});
