// 'use strict';

// var lab = require('lab'),
//     Builder = require('../lib/model/builder'),
//     testData = require('./data'),
//     PlatformConfig = require('../lib/prodinfo/platform-config');

// function makeEmptyClip() {
//     return {
//         synergy_model: {
//             hagroups: [ ]
//         }
//     };
// }

// lab.experiment('create (but don\'t add) a new default system:', function() {
//     var clip, builder, config, added;

//     lab.before(testData.config(function (pcd) {
//         config = new PlatformConfig(pcd);
//     }));

//     function initThenAdd(model) {
//         clip = makeEmptyClip();
//         builder = new Builder(config, clip);
//         return (added = builder.buildNewDefaultSystem(model));
//     }

//     function addTestsForSuccessfulBasicAddition(model) {
//         lab.test('returned a ' + model, function(done) {
//             lab.expect(added).to.have.property('_model', model);
//             done();
//         });

//         // TODO: check structure
//     }

//     function addExperimentFor(model) {
//         lab.experiment(model, function() {
//             lab.before(function (done) {
//                 initThenAdd(model);
//                 done();
//             });

//             addTestsForSuccessfulBasicAddition(model);
//         });
//     }

//     addExperimentFor('FAS2220');
//     addExperimentFor('FAS8060A');
//     addExperimentFor('FAS8080AE EX');
// });
