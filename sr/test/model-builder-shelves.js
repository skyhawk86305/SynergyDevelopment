// 'use strict';

// var lab = require('lab'),
//     testData = require('./data'),
//     Builder = require('../lib/model/builder'),
//     PlatformConfig = require('../lib/prodinfo/platform-config');

// function makeEmptyClip() {
//     return {
//         synergy_model: {
//             hagroups: [{
//                 model: 'Test',
//                 controllers: [{
//                     name : 'Test'
//                 }]
//             }]
//         }
//     };
// }

// lab.experiment('buildShelves:', function() {
//     var builder, clip, config, shelves;

//     var DEFAULT_SHELF_COUNT = 1;

//     lab.before(testData.config(function (pcd) {
//         config = new PlatformConfig(pcd);
//     }));

//     function initThenBuild(shelfName, withDrive, shelfCount, isEmbeddedShelf) {
//         clip = makeEmptyClip();
//         builder = new Builder(config, clip);
//         shelves = builder.buildShelves(shelfName, withDrive, shelfCount, isEmbeddedShelf);
//     }

//     function addTestsForSuccessfulShelfBuild(shelfName, withDrive, shelfCount, isEmbeddedShelf) {
//         var testCount = shelfCount || DEFAULT_SHELF_COUNT;

//         lab.test('returned ' + testCount + ' shelves', function(done) {
//             lab.expect(shelves).to.be.an('array');
//             lab.expect(shelves.length).to.eql(testCount);
//             done();
//         });

//         lab.test('shelves have expected values', function(done) {
//             var shelf = config.getShelfByName(shelfName),
//                 drive = config.getDriveByModel(withDrive);

//             for (var i = 0; i < testCount; i++) {
//                 lab.expect(shelves[i]._id).to.be.a('string');
//                 lab.expect(shelves[i]).to.have.property('model', shelfName);
//                 lab.expect(shelves[i]).to.have.property('bay_count', shelf.maxDriveCount);
//                 lab.expect(shelves[i]).to.have.property('shelf_number', i + 1);
//                 lab.expect(shelves[i]).to.have.property('_isembedded', isEmbeddedShelf ? true : false);

//                 lab.expect(shelves[i]._x_bom).to.be.an('array');
//                 lab.expect(shelves[i]._x_bom.length).to.eql(1);
//                 lab.expect(shelves[i]._x_bom[0]).to.have.property('type', drive.driveType);
//                 lab.expect(shelves[i]._x_bom[0]).to.have.property('rawgb', drive.marketingCapacity);
//                 lab.expect(shelves[i]._x_bom[0]).to.have.property('model', withDrive);
//                 lab.expect(shelves[i]._x_bom[0]).to.have.property('quantity', shelf.maxDriveCount);
//                 lab.expect(shelves[i]._x_bom[0]).to.have.property('rpm', drive.driveSpeed);
//             }
//             done();
//         });
//     }

//     function addExperimentFor(shelfName, withDrive, shelfCount, isEmbeddedShelf) {
//         var segments = [];

//         segments.push(shelfName);
//         segments.push(' with ');
//         segments.push(shelfCount || DEFAULT_SHELF_COUNT);
//         segments.push(isEmbeddedShelf ? ' embedded ' : ' external ');
//         segments.push(withDrive);

//         lab.experiment(segments.join(''), function() {
//             lab.before(function (done) {
//                 initThenBuild(shelfName, withDrive, shelfCount, isEmbeddedShelf);
//                 done();
//             });

//             addTestsForSuccessfulShelfBuild(shelfName, withDrive, shelfCount, isEmbeddedShelf);
//         });
//     }

//     addExperimentFor('DS4486', 'X480A');
//     addExperimentFor('DS4486', 'X480A', 2);
//     addExperimentFor('DS2126', 'X576A', null, true);
//     addExperimentFor('DS2126', 'X576A', 2, true);
// });
