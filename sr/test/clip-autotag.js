'use strict';

var assert = require('assert'),
    lab = require('lab'),
    autotag = require('../lib/clip/autotag'),
    repair = require('../lib/clip/repair'),
    distill = require('../lib/clip/distill'),
    testData = require('./data');

var SWB_CLIP = '7fc2694e-v4-2014-06-16.tclip';

function quote(tag) {
    return '\'' + tag + '\'';
}

lab.experiment('clip/autotag', function() {
    var clip, tags;

    function processClip(_clip) {
        clip = _clip;
        tags = autotag(distill(repair(_clip)));
    }

    lab.experiment('with a SWB/SWS clip', function() {
        lab.before(testData[SWB_CLIP](processClip));

        function checkTag(desc, tag) {
            assert(arguments.length === 2);

            var required = (typeof tag === 'string') ? [tag] : tag,
                reqdesc = required.map(quote).join(', ');

            function theTest(done) {
                for (var idx in required) {
                    lab.expect(tags).to.contain(required[idx]);
                }
                done();
            }

            lab.test('tagged the ' + desc + ': ' + reqdesc, theTest);
        }

        checkTag('model', 'FAS3220');
        checkTag('model-config', 'FAS3220A');
        checkTag('operating mode', 'c-mode');
        checkTag('ONTAP version', '8.2');
        checkTag('shelf models', 'DS4246');
        checkTag('drive models', ['X446B', 'X477A', 'X448A']);
        checkTag('drive types', ['SSD', 'NL_SAS']);
        checkTag('drive capacities', ['200GB', '4TB']);
        checkTag('drive speeds', ['SSD', '7.2K']);

        // TODO: more thorough tests when BOM absent
    });
});
