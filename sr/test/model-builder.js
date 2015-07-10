'use strict';

var lab = require('lab'),
    _ = require('lodash'),
    prod = require('./lib/get-cached-prodinfo'),
    reduceClip = require('../lib/clip/reduce'),
    Builder = require('../lib/model/builder');

function makeNewClip() {
    var clip = {
        synergy_model: {
            hagroups: []
        }
    };
    return reduceClip(clip);
}

lab.experiment('model/builder', function() {
    var builder, clip;

    lab.before(prod);
    lab.before(function (done) {
        clip = makeNewClip();
        builder = new Builder(prod.info, clip);
        done();
    });

    lab.experiment('addSystem', function() {
        lab.test('is a function', function (done) {
            lab.expect(builder.addSystem).to.be.a('function');
            lab.expect(builder.addSystemToCluster).to.be.a('function');
            done();
        });

        lab.test('7-mode Embedded FAS2220A / 1 DS2126 / 12 X575A', function (done) {
            var spec = {
                    existingId: undefined,
                    platformModel: 'FAS2220',
                    configModel: 'FAS2220A',
                    controllerCount: 2,
                    isESeries: false,
                    isFlashRay: false,
                    shelves: [{
                        model: 'DS2126',
                        quantity: 1,
                        isEmbedded: true,
                        drives: [{
                            model: 'X575A',
                            quantity: 12
                        }]
                    }],
                    version: '8.1.2 7-Mode'
                },
                result = builder.addSystem(spec),
                hagroup = _.find(clip.synergy_model.hagroups, { _id: result._id });

            lab.expect(hagroup).to.be.instanceof(Object);
            lab.expect(hagroup).to.have.property('_id', result._id);
            lab.expect(hagroup).to.have.property('_model', 'FAS2220A');
            lab.expect(hagroup).to.have.property('is_clustered', false);
            lab.expect(hagroup).to.have.property('model', 'FAS2220');
            lab.expect(hagroup).to.have.property('controllers').
                to.be.instanceof(Array).with.length(2);
            lab.expect(hagroup.controllers[0]).to.have.property('name', 'netapp1');
            lab.expect(hagroup.controllers[0]).to.have.property('aggregates').
                to.be.instanceof(Array);
            lab.expect(hagroup.controllers[1]).to.have.property('name', 'netapp2');
            lab.expect(hagroup.controllers[1]).to.have.property('aggregates').
                to.be.instanceof(Array);
            lab.expect(hagroup).to.have.property('shelves').
                to.be.instanceof(Array).with.length(1);
            lab.expect(hagroup.shelves[0]).to.have.property('model', 'DS2126');
            lab.expect(hagroup.shelves[0]).to.have.property('_isembedded', true);
            lab.expect(hagroup.shelves[0]).to.have.property('shelf_number', 1);

            // Updated test for new BOM (shelf), We need to consolidate doing this
            lab.expect(hagroup.shelves[0]).to.have.property('_x_bom');

            var shelfBom = hagroup.shelves[0]._x_bom,
                expectedNumberOfDriveSpecs = 1;

            lab.expect(shelfBom).to.have.property('drive_specs').
                to.be.instanceof(Array).with.length(expectedNumberOfDriveSpecs);
            lab.expect(shelfBom).to.have.property('drive_spec_members').
                to.be.instanceof(Array).with.length(expectedNumberOfDriveSpecs);

            var driveInShelf = shelfBom.drive_specs[0],
                driveInShelfMembers = shelfBom.drive_spec_members[0],
                expectedNumberOfDrive = 12,
                expectedDriveModel = 'X575A',
                expectedDriveType = 'SSD';

            lab.expect(driveInShelf).to.have.property('model', expectedDriveModel);
            lab.expect(driveInShelf).to.have.property('rawgb');
            lab.expect(driveInShelf).to.have.property('rsgb');
            lab.expect(driveInShelf).to.have.property('rpm');
            lab.expect(driveInShelf).to.have.property('type', expectedDriveType);
            lab.expect(driveInShelf).to.have.property('encrypted');
            lab.expect(driveInShelf).to.have.property('fp_support');
            lab.expect(driveInShelfMembers).to.be.instanceof(Array).
                with.length(expectedNumberOfDrive);

            lab.expect(hagroup).to.have.property('version', spec.version);

            done();
        });

        lab.test('7-mode FAS8080E EX / 1 DS4486 / 48 X480A', function (done) {
            var spec = {
                    existingId: undefined,
                    platformModel: 'FAS8080 EX',
                    configModel: 'FAS8080E EX',
                    controllerCount: 1,
                    isESeries: false,
                    isFlashRay: false,
                    shelves: [{
                        model: 'DS4486',
                        quantity: 1,
                        isEmbedded: false,
                        drives: [{
                            model: 'X480A',
                            quantity: 48
                        }]
                    }],
                    version: '8.2.2 7-Mode'
                },
                result = builder.addSystem(spec),
                hagroup = _.find(clip.synergy_model.hagroups, { _id: result._id });

            lab.expect(hagroup).to.be.instanceof(Object);
            lab.expect(hagroup).to.have.property('_id', result._id);
            lab.expect(hagroup).to.have.property('_model', 'FAS8080E EX');
            lab.expect(hagroup).to.have.property('is_clustered', false);
            lab.expect(hagroup).to.have.property('model', 'FAS8080 EX');
            lab.expect(hagroup).to.have.property('controllers').
                to.be.instanceof(Array).with.length(1);
            lab.expect(hagroup.controllers[0]).to.have.property('name', 'netapp3');
            lab.expect(hagroup.controllers[0]).to.have.property('aggregates').
                to.be.instanceof(Array);
            lab.expect(hagroup).to.have.property('shelves').
                to.be.instanceof(Array).with.length(1);
            lab.expect(hagroup.shelves[0]).to.have.property('model', 'DS4486');
            lab.expect(hagroup.shelves[0]).to.have.property('_isembedded', false);
            lab.expect(hagroup.shelves[0]).to.have.property('shelf_number', 1);


            // Updated test for new BOM (shelf), We need to consolidate doing this
            lab.expect(hagroup.shelves[0]).to.have.property('_x_bom');

            var shelfBom = hagroup.shelves[0]._x_bom,
                expectedNumberOfDriveSpecs = 1;

            lab.expect(shelfBom).to.have.property('drive_specs').
                to.be.instanceof(Array).with.length(expectedNumberOfDriveSpecs);
            lab.expect(shelfBom).to.have.property('drive_spec_members').
                to.be.instanceof(Array).with.length(expectedNumberOfDriveSpecs);

            var driveInShelf = shelfBom.drive_specs[0],
                driveInShelfMembers = shelfBom.drive_spec_members[0],
                expectedNumberOfDrive = 48,
                expectedDriveModel = 'X480A',
                expectedDriveType = 'MSATA';

            lab.expect(driveInShelf).to.have.property('model', expectedDriveModel);
            lab.expect(driveInShelf).to.have.property('rawgb');
            lab.expect(driveInShelf).to.have.property('rsgb');
            lab.expect(driveInShelf).to.have.property('rpm');
            lab.expect(driveInShelf).to.have.property('type', expectedDriveType);
            lab.expect(driveInShelf).to.have.property('encrypted');
            lab.expect(driveInShelf).to.have.property('fp_support');
            lab.expect(driveInShelfMembers).to.be.instanceof(Array).
                with.length(expectedNumberOfDrive);

            lab.expect(hagroup).to.have.property('version', spec.version);

            done();
        });

        lab.test('c-mode FAS6250 / 1 DS4486 / 48 X480A', function (done) {
            var spec = {
                    existingId: undefined,
                    platformModel: 'FAS6250',
                    configModel: 'FAS6250',
                    controllerCount: 1,
                    isESeries: false,
                    isFlashRay: false,
                    shelves: [{
                        model: 'DS4486',
                        quantity: 1,
                        isEmbedded: false,
                        drives: [{
                            model: 'X480A',
                            quantity: 48
                        }]
                    }],
                    version: '8.2.2 Cluster-Mode'
                },
                result = builder.addSystemToCluster(spec),
                hagroup = _.find(clip.synergy_model.hagroups, { _id: result._id });

            lab.expect(hagroup).to.be.instanceof(Object);
            lab.expect(hagroup).to.have.property('_id', result._id);
            lab.expect(hagroup).to.have.property('_model', 'FAS6250');
            lab.expect(hagroup).to.have.property('is_clustered', true);
            lab.expect(hagroup).to.have.property('model', 'FAS6250');
            lab.expect(hagroup).to.have.property('controllers').
                to.be.instanceof(Array).with.length(1);
            lab.expect(hagroup.controllers[0]).to.have.property('name', 'netapp4');
            lab.expect(hagroup.controllers[0]).to.have.property('aggregates').
                to.be.instanceof(Array);
            lab.expect(hagroup).to.have.property('shelves').
                to.be.instanceof(Array).with.length(1);
            lab.expect(hagroup.shelves[0]).to.have.property('model', 'DS4486');
            lab.expect(hagroup.shelves[0]).to.have.property('_isembedded', false);
            lab.expect(hagroup.shelves[0]).to.have.property('shelf_number', 1);

            // Updated test for new BOM (shelf), We need to consolidate doing this
            lab.expect(hagroup.shelves[0]).to.have.property('_x_bom');

            var shelfBom = hagroup.shelves[0]._x_bom,
                expectedNumberOfDriveSpecs = 1;

            lab.expect(shelfBom).to.have.property('drive_specs').
                to.be.instanceof(Array).with.length(expectedNumberOfDriveSpecs);
            lab.expect(shelfBom).to.have.property('drive_spec_members').
                to.be.instanceof(Array).with.length(expectedNumberOfDriveSpecs);

            var driveInShelf = shelfBom.drive_specs[0],
                driveInShelfMembers = shelfBom.drive_spec_members[0],
                expectedNumberOfDrive = 48,
                expectedDriveModel = 'X480A',
                expectedDriveType = 'MSATA';

            lab.expect(driveInShelf).to.have.property('model', expectedDriveModel);
            lab.expect(driveInShelf).to.have.property('rawgb');
            lab.expect(driveInShelf).to.have.property('rsgb');
            lab.expect(driveInShelf).to.have.property('rpm');
            lab.expect(driveInShelf).to.have.property('type', expectedDriveType);
            lab.expect(driveInShelf).to.have.property('encrypted');
            lab.expect(driveInShelf).to.have.property('fp_support');
            lab.expect(driveInShelfMembers).to.be.instanceof(Array).
                with.length(expectedNumberOfDrive);

            lab.expect(hagroup).to.have.property('version', spec.version);

            done();
        });
    });

    lab.experiment('changeSystems', function() {
        lab.test('is a function', function (done) {
            lab.expect(builder.changeSystems).to.be.a('function');
            done();
        });

        lab.test('c-mode FAS8080AE EX / 1 DS4246 / 4 X575A / 20 X477A', function (done) {
            var hagroup = _.find(clip.synergy_model.hagroups, { _model: 'FAS6250' }),
                oldId = hagroup._id,
                specs = [{
                    existingId: hagroup._id,
                    platformModel: 'FAS8080 EX',
                    configModel: 'FAS8080AE EX',
                    controllerCount: 2,
                    isESeries: false,
                    isFlashRay: false,
                    shelves: [{
                        model: 'DS4246',
                        quantity: 1,
                        isEmbedded: false,
                        drives: [{
                            model: 'X575A',
                            quantity: 4
                        }, {
                            model: 'X477A',
                            quantity: 20
                        }]
                    }],
                    version: '8.2.2 Cluster-Mode'
                }];

            builder.changeSystems(specs);

            lab.expect(hagroup).to.be.instanceof(Object);
            lab.expect(hagroup).to.have.property('_id', oldId);
            lab.expect(hagroup).to.have.property('_model', 'FAS8080AE EX');
            lab.expect(hagroup).to.have.property('is_clustered', true);
            lab.expect(hagroup).to.have.property('model', 'FAS8080 EX');
            lab.expect(hagroup).to.have.property('controllers').
                to.be.instanceof(Array).with.length(2);
            lab.expect(hagroup.controllers[0]).to.have.property('name', 'netapp4');
            lab.expect(hagroup.controllers[0]).to.have.property('aggregates').
                to.be.instanceof(Array);
            lab.expect(hagroup.controllers[1]).to.have.property('name', 'netapp5');
            lab.expect(hagroup.controllers[1]).to.have.property('aggregates').
                to.be.instanceof(Array);
            lab.expect(hagroup).to.have.property('shelves').
                to.be.instanceof(Array).with.length(1);
            lab.expect(hagroup.shelves[0]).to.have.property('model', 'DS4246');
            lab.expect(hagroup.shelves[0]).to.have.property('_isembedded', false);
            lab.expect(hagroup.shelves[0]).to.have.property('shelf_number', 1);
            lab.expect(hagroup.shelves[0]).to.have.property('_x_bom').
                to.have.property('drive_specs').with.length(2);
            lab.expect(hagroup.shelves[0]).to.have.property('_x_bom').
                to.have.property('drive_spec_members').with.length(2);
            lab.expect(hagroup.shelves[0]._x_bom.drive_specs[0]).to.have.property('model', 'X575A');
            lab.expect(hagroup.shelves[0]._x_bom.drive_spec_members[0]).
                to.be.instanceof(Array).with.length(4);
            lab.expect(hagroup.shelves[0]._x_bom.drive_specs[0]).to.have.property('type', 'SSD');
            lab.expect(hagroup.shelves[0]._x_bom.drive_specs[1]).to.have.property('model', 'X477A');
            lab.expect(hagroup.shelves[0]._x_bom.drive_spec_members[1]).
                to.be.instanceof(Array).with.length(20);
            lab.expect(hagroup.shelves[0]._x_bom.drive_specs[1]).to.have.property('type', 'NL-SAS');

            lab.expect(hagroup).to.have.property('version', specs[0].version);

            done();
        });

    lab.test('c-mode Embedded FAS2220 / DS2126 (12 X575A) / DS4246 (24 X575A)', function (done) {
            var hagroup = _.find(clip.synergy_model.hagroups, { _model: 'FAS8080AE EX' }),
                oldId = hagroup._id,
                specs = [{
                    existingId: hagroup._id,
                    platformModel: 'FAS2220',
                    configModel: 'FAS2220',
                    controllerCount: 1,
                    isESeries: false,
                    isFlashRay: false,
                    shelves: [{
                        model: 'DS2126',
                        quantity: 1,
                        isEmbedded: true,
                        drives: [{
                            model: 'X575A',
                            quantity: 12
                        }]
                    }, {
                        model: 'DS4246',
                        quantity: 1,
                        isEmbedded: false,
                        drives: [{
                            model: 'X575A',
                            quantity: 24
                        }]
                    }],
                    version: '8.2 Cluster-Mode'
                }];

            builder.changeSystems(specs);

            lab.expect(hagroup).to.be.instanceof(Object);
            lab.expect(hagroup).to.have.property('_id', oldId);
            lab.expect(hagroup).to.have.property('_model', 'FAS2220');
            lab.expect(hagroup).to.have.property('is_clustered', true);
            lab.expect(hagroup).to.have.property('model', 'FAS2220');
            lab.expect(hagroup).to.have.property('controllers').
                to.be.instanceof(Array).with.length(1);
            lab.expect(hagroup.controllers[0]).to.have.property('name', 'netapp4');
            lab.expect(hagroup.controllers[0]).to.have.property('aggregates').
                to.be.instanceof(Array);
            lab.expect(hagroup).to.have.property('shelves').
                to.be.instanceof(Array).with.length(2);
            lab.expect(hagroup.shelves[0]).to.have.property('model', 'DS2126');
            lab.expect(hagroup.shelves[0]).to.have.property('_isembedded', true);
            lab.expect(hagroup.shelves[0]).to.have.property('shelf_number', 1);
            lab.expect(hagroup.shelves[0]).to.have.property('_x_bom').
                to.have.property('drive_specs').with.length(1);
            lab.expect(hagroup.shelves[0]).to.have.property('_x_bom').
                to.have.property('drive_spec_members').with.length(1);
            lab.expect(hagroup.shelves[0]._x_bom.drive_specs[0]).to.have.property('model', 'X575A');
            lab.expect(hagroup.shelves[0]._x_bom.drive_spec_members[0]).
                to.be.instanceof(Array).with.length(12);
            lab.expect(hagroup.shelves[0]._x_bom.drive_specs[0]).to.have.property('type', 'SSD');

            lab.expect(hagroup.shelves[1]).to.have.property('model', 'DS4246');
            lab.expect(hagroup.shelves[1]).to.have.property('_isembedded', false);
            lab.expect(hagroup.shelves[1]).to.have.property('shelf_number', 2);
            lab.expect(hagroup.shelves[1]).to.have.property('_x_bom').
                to.have.property('drive_specs').with.length(1);
            lab.expect(hagroup.shelves[1]).to.have.property('_x_bom').
                to.have.property('drive_spec_members').with.length(1);
            lab.expect(hagroup.shelves[1]._x_bom.drive_specs[0]).to.have.property('model', 'X575A');
            lab.expect(hagroup.shelves[1]._x_bom.drive_spec_members[0]).
                to.be.instanceof(Array).with.length(24);
            lab.expect(hagroup.shelves[1]._x_bom.drive_specs[0]).to.have.property('type', 'SSD');

            lab.expect(hagroup).to.have.property('version', specs[0].version);

            done();
        });
    });

    lab.experiment('nameSystem', function() {
        lab.test('is a function', function (done) {
            lab.expect(builder.nameSystem).to.be.a('function');
            done();
        });

        lab.test('netapp1, netapp2', function (done) {
            var hagroup = _.find(clip.synergy_model.hagroups, { _model: 'FAS2220A' }),
                id = hagroup._id;

            builder.nameSystem(id, 'controller1', 'controller2');

            lab.expect(hagroup.controllers[0].name).to.eql('controller1');
            lab.expect(hagroup.controllers[1].name).to.eql('controller2');
            done();
        });
    });

    lab.experiment('nameCluster', function() {
        lab.test('is a function', function (done) {
            lab.expect(builder.nameCluster).to.be.a('function');
            done();
        });

        lab.test('netapp4', function (done) {
            var hagroup = _.find(clip.synergy_model.hagroups, { _model: 'FAS2220' }),
                id = hagroup.cluster._id;

            builder.nameCluster(id, 'clusterName');

            lab.expect(hagroup.cluster.name).to.eql('clusterName');
            done();
        });
    });

    lab.experiment('deleteShelf', function() {
        lab.test('is a function', function (done) {
            lab.expect(builder.deleteShelf).to.be.a('function');
            lab.expect(builder.deleteAllShelves).to.be.a('function');
            done();
        });

        lab.test('from non-cluster hagroup', function (done) {
            var hagroup = _.find(clip.synergy_model.hagroups, { _model: 'FAS8080E EX' }),
                oldId = hagroup._id,
                oldShelf = hagroup.shelves[0];

            builder.deleteAllShelves(oldId, oldShelf);

            lab.expect(hagroup.shelves).to.be.instanceof(Array).with.length(0);
            done();
        });

        lab.test('from cluster hagroup', function (done) {
            var hagroup = _.find(clip.synergy_model.hagroups, { _model: 'FAS2220' }),
                oldId = hagroup._id,
                oldShelf = hagroup.shelves[1];

            builder.deleteShelf(oldId, oldShelf);

            lab.expect(hagroup.shelves).to.be.instanceof(Array).with.length(1);
            lab.expect(hagroup.shelves[0]).to.have.property('model', 'DS2126');
            lab.expect(hagroup.shelves[0]).to.have.property('_isembedded', true);
            done();
        });
    });

    lab.experiment('removeSystem', function() {
        lab.test('is a function', function (done) {
            lab.expect(builder.removeSystem).to.be.a('function');
            done();
        });

        lab.test('from non-cluster hagroup', function (done) {
            var oldSystem = _.find(clip.synergy_model.hagroups, { _model: 'FAS8080E EX' }),
                oldId = oldSystem._id;

            builder.removeSystem(oldId);

            var hagroup = _.find(clip.synergy_model.hagroups, { _model: 'FAS8080E EX' });

            lab.expect(hagroup).to.be.eql(undefined);
            done();
        });

        lab.test('from cluster hagroup', function (done) {
            var oldSystem = _.find(clip.synergy_model.hagroups, { _model: 'FAS2220' }),
                oldId = oldSystem._id;

            builder.removeSystem(oldId);

            var hagroup = _.find(clip.synergy_model.hagroups, { _model: 'FAS2220' });

            lab.expect(hagroup).to.be.eql(undefined);
            done();
        });
    });

    lab.experiment('setSystemPolicy', function() {
        lab.test('is a function', function (done) {
            lab.expect(builder.setSystemPolicy).to.be.a('function');
            done();
        });

        lab.test('prohibit ADP', function (done) {
            var hagroup = _.find(clip.synergy_model.hagroups, { _model: 'FAS2220A' }),
                id = hagroup._id;

            builder.setSystemPolicy(id, 'ADP', { prohibitedByUser: true });

            lab.expect(hagroup._policies).to.be.instanceof(Object).
                with.property('ADP').with.property('prohibitedByUser', true);

            builder.setSystemPolicy(id, 'ADP', { prohibitedByUser: false });

            lab.expect(hagroup._policies).to.be.instanceof(Object).
                with.property('ADP').with.property('prohibitedByUser', false);

            done();
        });
    });
});
