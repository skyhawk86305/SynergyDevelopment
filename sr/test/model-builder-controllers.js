// 'use strict';

// var lab = require('lab'),
//     testData = require('./data'),
//     Builder = require('../lib/model/builder'),
//     PlatformConfig = require('../lib/prodinfo/platform-config');

// function makeEmptyClip() {
//     return {
//         synergy_model: {
//             hagroups: [{
//                 model: 'Test'
//             }]
//         }
//     };
// }

// lab.experiment('buildControllers:', function() {
//     var builder, clip, config, controllers;

//     var DEFAULT_COUNT = 2,
//         DEFAULT_STARTING_COUNT = 1,
//         DEFAULT_NAME_PREFIX = 'netapp';

//     lab.before(testData.config(function (pcd) {
//         config = new PlatformConfig(pcd);
//     }));

//     function initThenBuild(count, startingCount, namePrefix) {
//         clip = makeEmptyClip();
//         builder = new Builder(config, clip);
//         controllers = builder.buildControllers(count, startingCount, namePrefix);
//     }

//     function addTestsForSuccessfulControllerBuild(count, startingCount, namePrefix) {
//         var testCount = count || DEFAULT_COUNT,
//             testStartingCount = startingCount || DEFAULT_STARTING_COUNT,
//             testNamePrefix = namePrefix || DEFAULT_NAME_PREFIX;

//         lab.test('returned ' + testCount + ' controllers', function(done) {
//             lab.expect(controllers).to.be.an('array');
//             lab.expect(controllers.length).to.eql(testCount);
//             done();
//         });

//         lab.test('controllers have expected names and ids', function(done) {
//             for (var i = 0; i < testCount; i++) {
//                 lab.expect(controllers[i]._id).to.be.a('string');
//                 lab.expect(controllers[i]).to.have.property('name', testNamePrefix + (testStartingCount + i));
//             }
//             done();
//         });
//     }

//     function addExperimentFor(count, startingCount, namePrefix) {
//         var segments = [];

//         segments.push(count || DEFAULT_COUNT);
//         segments.push(' nodes - starting with ');
//         segments.push(namePrefix || DEFAULT_NAME_PREFIX);
//         segments.push(startingCount || DEFAULT_STARTING_COUNT);

//         lab.experiment(segments.join(''), function() {
//             lab.before(function (done) {
//                 initThenBuild(count, startingCount, namePrefix);
//                 done();
//             });

//             addTestsForSuccessfulControllerBuild(count, startingCount, namePrefix);
//         });
//     }

//     addExperimentFor();
//     addExperimentFor(3);
//     addExperimentFor(3, 4);
//     addExperimentFor(3, 4, 'test');
// });
