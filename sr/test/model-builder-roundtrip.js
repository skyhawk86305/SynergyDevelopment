// 'use strict';

// var lab = require('lab'),
//     _ = require('lodash'),
//     testData = require('./data'),
//     clipInfo = require('../lib/clip/info'),
//     reduceClip = require('../lib/clip/reduce'),
//     Builder = require('../lib/model/builder'),
//     PlatformConfig = require('../lib/prodinfo/platform-config');

// function makeNewClipWith(hagroups) {
//     var clip = {
//         synergy_model: {
//             hagroups: hagroups || []
//         }
//     };
//     return reduceClip(clip);
// }

// function makeNewShelfDriveComboWith(model, drive) {
//     return {
//         model: model,
//         _x_bom: [{
//             model: drive,
//             quantity: 1,
//             rawgb: 1000,
//             rpm: 50,
//             type: 'SSD'
//         }]
//     };
// }

// // calls repair on your behalf
// function simulateSaveAndLoad(clip) {
//     return reduceClip(clip);
// }

// lab.experiment('RoundTrip', function() {
//     var builder, clip, config;

//     lab.before(testData.config(function (pcd) {
//         config = new PlatformConfig(pcd);
//     }));

//     function init(hagroups) {
//         clip = makeNewClipWith(hagroups);
//         builder = new Builder(config, clip);
//     }

//     // The lab eql call will always fail (different objects)
//     // It is used here to give a more helpful error message than 'true === false'
//     function testObjects(o1, o2, done) {
//         if (!_.isEqual(o1, o2)) {
//             lab.expect(o1).to.eql(o2);
//         }
//         done();
//     }

//     function addTestsForRoundTrippingClip() {
//         var builderInfo, roundTripped, roundTrippedInfo;

//         lab.test('survives describe', function(done) {
//             // console.error('===== BUILD CLIP:');
//             // console.error(require('util').inspect(clip, {
//             //     depth: null,
//             //     colors: true,
//             // }));

//             builderInfo = clipInfo(clip);
//             lab.expect(builderInfo).to.be.a('object');
//             done();
//         });

//         lab.test('survives roundtrip', function(done) {
//             roundTripped = simulateSaveAndLoad(clip);

//             // console.error('===== ROUNDTRIP CLIP:');
//             // console.log(require('util').inspect(roundTripped, {
//             //     depth: null,
//             //     colors: true,
//             // }));

//             lab.expect(roundTripped).to.be.a('object');
//             done();
//         });

//         lab.test('survives describe after roundtrip', function(done) {
//             roundTrippedInfo = clipInfo(roundTripped);

//             // console.error('===== ROUNDTRIP INFO:');
//             // console.log(require('util').inspect(roundTrippedInfo, {
//             //     depth: null,
//             //     colors: true,
//             // }));

//             lab.expect(roundTrippedInfo).to.be.a('object');
//             done();
//         });

//         lab.test('has the same clip info after roundtrip', function(done) {
//             // console.error('===== BUILDER INFO:');
//             // console.log(require('util').inspect(builderInfo, {
//             //     depth: null,
//             //     colors: true,
//             // }));

//             testObjects(builderInfo, roundTrippedInfo, done);
//         });

//         lab.test('has the same hagroup after roundtrip', function(done) {
//             testObjects(clip, roundTripped, done);
//         });
//     }

//     function addExperimentFor(title, buildClip, hagroups) {
//         lab.experiment(title, function() {
//             lab.before(function (done) {
//                 init(hagroups);
//                 buildClip();
//                 done();
//             });
//             addTestsForRoundTrippingClip();
//         });
//     }

//     function addControllerExperiment(count, startingCount, namePrefix) {
//         var segments = [],
//             DEFAULT_COUNT = 2,
//             DEFAULT_STARTING_COUNT = 1,
//             DEFAULT_NAME_PREFIX = 'netapp';

//         var hagroups = [{
//             controllers: [{}]
//         }];

//         segments.push(count || DEFAULT_COUNT);
//         segments.push(' nodes - starting with ');
//         segments.push(namePrefix || DEFAULT_NAME_PREFIX);
//         segments.push(startingCount || DEFAULT_STARTING_COUNT);

//         function buildController() {
//             var controllers = builder.buildControllers(count, startingCount, namePrefix);
//             clip.synergy_model.hagroups[0].controllers = controllers;
//         }

//         addExperimentFor(segments.join(''), buildController, hagroups);
//     }

//     function addShelfExperiment(shelfName, withDrive, shelfCount, isEmbeddedShelf) {
//         var segments = [],
//             DEFAULT_SHELF_COUNT = 1;

//         var hagroups = [{
//                 controllers: [{}]
//             }];

//         segments.push(shelfName);
//         segments.push(' with ');
//         segments.push(shelfCount || DEFAULT_SHELF_COUNT);
//         segments.push(isEmbeddedShelf ? ' embedded ' : ' external ');
//         segments.push(withDrive);

//         function buildShelf() {
//             var shelves = builder.buildShelves(shelfName, withDrive, shelfCount, isEmbeddedShelf);
//             clip.synergy_model.hagroups[0].shelves = shelves;
//         }

//         addExperimentFor(segments.join(''), buildShelf, hagroups);
//     }

//     function addDefaultSystemExperiment(model) {
//         function buildSystem() {
//             var hagroup = builder.buildNewDefaultSystem(model);
//             clip.synergy_model.hagroups[0] = hagroup;
//         }

//         addExperimentFor(model, buildSystem);
//     }

//     function addAPIExperiment(systemModel, shelfModel, replaceSystemModel, replaceShelfModel) {
//         var cluster_id = '12345',
//             shelfDriveCombo = makeNewShelfDriveComboWith(shelfModel, 'Fake1'),
//             newShelfDriveCombo = makeNewShelfDriveComboWith(replaceShelfModel, 'Fake2');

//         function addSystem() {
//             builder.addSystem(systemModel);
//         }

//         function addSystemToCluster() { // See addSystem
//             builder.addSystem(systemModel, cluster_id);
//         }

//         function removeSystem() {
//             addSystem();
//             builder.removeSystem(systemModel, clip.synergy_model.hagroups[0]._id);
//         }

//         function removeSystemFromCluster() {
//             replaceSystems();
//             builder.removeSystemFromCluster(replaceSystemModel, cluster_id);
//         }

//         function addShelf() {
//             addSystem();
//             builder.addShelf(clip.synergy_model.hagroups[0]._id, shelfDriveCombo);
//         }

//         function deleteShelf() {
//             replaceShelf();
//             builder.deleteShelf(clip.synergy_model.hagroups[0]._id, newShelfDriveCombo);
//         }

//         function nameCluster() {
//             addSystemToCluster();
//             builder.nameCluster(cluster_id, 're-name');
//         }

//         function nameSystem() {
//             addSystem();
//             builder.nameSystem(clip.synergy_model.hagroups[0]._id, 'ns1', 'ns2');
//         }

//         function deleteAllShelvesOfConfig() {
//             addShelf();
//             builder.deleteAllShelvesOfConfig(clip.synergy_model.hagroups[0]._id, shelfDriveCombo);
//         }

//         function replaceShelf() {
//             addShelf();
//             builder.replaceShelf(clip.synergy_model.hagroups[0]._id, shelfDriveCombo, newShelfDriveCombo);
//         }

//         function replaceSystems() {
//             addSystemToCluster();
//             builder.replaceSystems(clip.synergy_model.hagroups, replaceSystemModel);
//         }

//         addExperimentFor('add standalone ' + systemModel, addSystem);
//         addExperimentFor('change ' + systemModel + ' controller names', nameSystem);
//         addExperimentFor('add ' + shelfModel + ' to ' + systemModel, addShelf);
//         addExperimentFor('replace ' + shelfModel + ' with ' + replaceShelfModel, replaceShelf);
//         addExperimentFor('remove ' + replaceShelfModel + ' from ' + systemModel, deleteShelf);
//         addExperimentFor('remove ' + systemModel, removeSystem);

//         addExperimentFor('add ' + systemModel + ' to cluster', addSystemToCluster);
//         addExperimentFor('change ' + systemModel + ' cluster name', nameCluster);
//         addExperimentFor('remove shelves from ' + systemModel + ' cluster', deleteAllShelvesOfConfig);
//         addExperimentFor('replace ' + systemModel + ' with ' + replaceSystemModel, replaceSystems);
//         addExperimentFor('remove ' + replaceSystemModel + ' from cluster', removeSystemFromCluster);
//     }

//     lab.experiment('buildControllers:', function() {
//         addControllerExperiment();
//         addControllerExperiment(3);
//         addControllerExperiment(3, 4);
//         addControllerExperiment(3, 4, 'test');
//     });

//     lab.experiment('buildShelves:', function() {
//         addShelfExperiment('DS4486', 'X480A');
//         addShelfExperiment('DS4486', 'X480A', 2);
//         addShelfExperiment('DS2126', 'X576A', null, true);
//         addShelfExperiment('DS2126', 'X576A', 2, true);
//     });

//     lab.experiment('buildNewDefaultSystem:', function() {
//         addDefaultSystemExperiment('FAS2220');
//         addDefaultSystemExperiment('FAS8060');
//         addDefaultSystemExperiment('FAS8080AE EX');
//     });

//     lab.experiment('API:', function() {
//         addAPIExperiment('FAS2220', 'DS2126', 'FAS2520', 'DS2246');
//         addAPIExperiment('FAS8060', 'DS4243', 'FAS8080AE EX', 'DS4486');
//     });
// });
