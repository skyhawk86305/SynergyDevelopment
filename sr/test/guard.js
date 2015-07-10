'use strict';

var lab = require('lab'),
    _ = require('lodash'),
    testData = require('./data'),
    prod = require('./lib/get-cached-prodinfo'),
    reduce = require('../lib/clip/reduce'),
    Guard = require('../lib/model/guard'),
    ModelMap = require('../lib/model/map');

lab.experiment('model/guard', function() {
    var clip, guard, map;

    function attempt(addingTo, replacing, options) {
        try {
            guard = map.guard(addingTo, options);
            guard.addingSystem(replacing);
        } catch (err) {
            return err;
        }
    }

    lab.before(prod);
    lab.before(testData['limit-tests'](function (_clip) {
        clip = reduce(_clip);
        map = new ModelMap(prod.info, clip);
        map.installations[0].id = 'installation1';
    }));

    lab.test('is a function', function (done) {
        lab.expect(Guard).to.be.a('function');
        done();
    });

    lab.test('asserts common arguments', function (done) {
        var selector = {
                installation: { id: 'installation1' },
                cluster: { _id: '1bd84920-89a9-4cb8-84b1-5158d4784d89' }
            };

        lab.expect(attempt()).to.have.property('message', 'addingTo object');
        lab.expect(attempt(1)).to.have.property('message', 'addingTo object');
        lab.expect(attempt({})).to.have.property('message', 'bad addingTo selector');
        lab.expect(attempt(selector, 1)).to.have.property('message', 'bad replacing selector');
        lab.expect(attempt(selector, selector, 1)).to.have.property('message', 'bad options');

        done();
    });

    lab.experiment('addingSystem', function() {
        lab.test('is a function', function (done) {
            lab.expect(guard.addingSystem).to.be.a('function');
            done();
        });

        lab.test('asserts selector scope', function (done) {
            var tooNarrow = {
                    installation: { id: 'installation1' }
                };

            lab.expect(attempt(tooNarrow)).to.have.property('message', 'no config group');
            done();
        });

        lab.test('for adding to an installation', function (done) {
            var group = prod.info.getConfigGroup('FAS', 'c-mode'),
                guard = map.guard(group),
                options = guard.addingSystem();

            lab.expect(options).to.be.instanceof(Array).with.length.above(0);
            lab.expect(options[0]).to.have.property('isSellable');
            lab.expect(options[0]).to.have.property('newVersion');
            done();
        });

        lab.test('for adding to a cluster', function (done) {
            var selector = {
                    installation: { id: 'installation1' },
                    cluster: { _id: '1bd84920-89a9-4cb8-84b1-5158d4784d89' }
                },
                guard = map.guard(selector),
                options = guard.addingSystem();

            lab.expect(options).to.be.instanceof(Array).with.length.above(0);
            lab.expect(options[0]).to.have.property('isHA', true);
            lab.expect(options[0]).to.have.property('groupId', 'c-mode');
            done();
        });

        lab.test('for changing a non-cluster hagroup', function (done) {
            var addingTo = {
                    installation: { id: 'installation1' }
                },
                replacing = {
                    installation: { id: 'installation1' },
                    hagroup: { _id: 'f093d2f9-dfee-4755-ba2d-3db27448fd8a' }
                },
                guard = map.guard(addingTo),
                options = guard.addingSystem(replacing);

            lab.expect(options).to.be.instanceof(Array).with.length.above(0);
            lab.expect(options[0]).to.have.property('isHA', false);
            lab.expect(options[0]).to.have.property('groupId', '7-mode');
            done();
        });

        lab.test('for changing the only hagroup in a cluster', function (done) {
            var addingTo = {
                    installation: { id: 'installation1' },
                    cluster: { _id: '17bbeb4b-193e-46c2-acda-856273a47d6c' }
                },
                replacing = {
                    installation: { id: 'installation1' },
                    cluster: { _id: '17bbeb4b-193e-46c2-acda-856273a47d6c' },
                    hagroup: { _id: '2f38b787-5f9d-4b1d-8a4e-7c2dca2a1088' }
                },
                guard = map.guard(addingTo),
                options = guard.addingSystem(replacing);

            lab.expect(options).to.be.instanceof(Array).with.length.above(0);
            lab.expect(options[0]).to.have.property('isHA', true);
            lab.expect(options[0]).to.have.property('groupId', 'c-mode');
            done();
        });

        lab.test('for changing one hagroup (of multiple) in a cluster', function (done) {
            var addingTo = {
                    installation: { id: 'installation1' },
                    cluster: { _id: 'c2175e09-a0e5-4112-b9b2-cb277c9c71db' }
                },
                replacing = {
                    installation: { id: 'installation1' },
                    cluster: { _id: 'c2175e09-a0e5-4112-b9b2-cb277c9c71db' },
                    hagroup: { _id: '1debdf07-c75d-40f0-a7c6-e3dec07f73ba' }
                },
                guard = map.guard(addingTo),
                options = guard.addingSystem(replacing);

            lab.expect(options).to.be.instanceof(Array).with.length.above(0);
            lab.expect(options[0]).to.have.property('isHA', true);
            lab.expect(options[0]).to.have.property('groupId', 'c-mode');
            done();
        });
    });

    lab.experiment('addingShelf', function() {
        lab.test('is a function', function (done) {
            lab.expect(guard.addingShelf).to.be.a('function');
            done();
        });

        lab.test('asserts selector scope', function (done) {
            function attempt(addingTo) {
                try {
                    guard = map.guard(addingTo);
                    guard.addingShelf();
                } catch (err) {
                    return err;
                }
            }

            var tooNarrow = {
                    installation: { id: 'installation1' }
                };

            lab.expect(attempt(tooNarrow)).to.have.property('message', 'no hagroup');
            done();
        });

        lab.test('for adding to a non-cluster hagroup', function (done) {
            var selector = {
                    installation: { id: 'installation1' },
                    hagroup: { _id: 'f093d2f9-dfee-4755-ba2d-3db27448fd8a' }
                },
                guard = map.guard(selector),
                options = guard.addingShelf();

            lab.expect(options).to.be.instanceof(Array).with.length.above(0);
            done();
        });

        lab.test('for adding to a cluster hagroup', function (done) {
            var selector = {
                    installation: { id: 'installation1' },
                    cluster: { _id: '17bbeb4b-193e-46c2-acda-856273a47d6c' },
                    hagroup: { _id: '2f38b787-5f9d-4b1d-8a4e-7c2dca2a1088' }
                },
                guard = map.guard(selector),
                options = guard.addingShelf();

            lab.expect(options).to.be.instanceof(Array).with.length.above(0);
            done();
        });

        // This is the function the UI currently expects, but its dangerous.
        // We should either reject multiple hagroups, or only give options safe to use with both.
        lab.test('for adding to multiple cluster hagroups', function (done) {
            var selector = {
                    installation: { id: 'installation1' },
                    cluster: { _id: 'c2175e09-a0e5-4112-b9b2-cb277c9c71db' },
                    hagroup: { _model: 'FAS2220A' }
                },
                guard = map.guard(selector),
                options = guard.addingShelf();

            lab.expect(options).to.be.instanceof(Array).with.length.above(0);
            done();
        });

        lab.test('for changing a non-cluster hagroup shelf', function (done) {
            var addingTo = {
                    installation: { id: 'installation1' },
                    hagroup: { _id: 'f093d2f9-dfee-4755-ba2d-3db27448fd8a' }
                },
                replacing = {
                    installation: { id: 'installation1' },
                    hagroup: { _id: 'f093d2f9-dfee-4755-ba2d-3db27448fd8a' },
                    shelf: { _id: '5be8d37e-8e86-44d3-879d-7162e4ba0d97' }
                },
                guard = map.guard(addingTo),
                options = guard.addingShelf(replacing);

            lab.expect(options).to.be.instanceof(Array).with.length.above(0);
            done();
        });

        lab.test('for changing a cluster hagroup shelf', function (done) {
            var addingTo = {
                    installation: { id: 'installation1' },
                    cluster: { _id: 'c2175e09-a0e5-4112-b9b2-cb277c9c71db' },
                    hagroup: { _id: '9480d9a7-3d4c-49de-b04c-d1ededdbc7cb' }
                },
                replacing = {
                    installation: { id: 'installation1' },
                    cluster: { _id: 'c2175e09-a0e5-4112-b9b2-cb277c9c71db' },
                    hagroup: { _id: '9480d9a7-3d4c-49de-b04c-d1ededdbc7cb' },
                    shelf: { _id: '50c66c54-15f9-46da-8fa1-7eb34bfc5452' }
                },
                guard = map.guard(addingTo),
                options = guard.addingShelf(replacing);

            lab.expect(options).to.be.instanceof(Array).with.length.above(0);
            done();
        });

        lab.test('for changing multiple hagroup shelves', function (done) {
            var addingTo = {
                    installation: { id: 'installation1' },
                    hagroup: { _id: 'fdabc0b4-5fac-4345-861d-0d4f6978de6d' }
                },
                replacing = {
                    installation: { id: 'installation1' },
                    hagroup: { _id: 'fdabc0b4-5fac-4345-861d-0d4f6978de6d' },
                    shelf: { model: 'DS4246' }
                },
                guard = map.guard(addingTo),
                options = guard.addingShelf(replacing);

            lab.expect(options).to.be.instanceof(Array).with.length.above(0);
            done();
        });

        lab.test('for changing a group of shelves', function (done) {
            var addingTo = {
                    installation: { id: 'installation1' },
                    hagroup: { _id: '6d0de75b-e017-4e90-a019-142465b5ace5' }
                },
                replacing = {
                    installation: { id: 'installation1' },
                    hagroup: { _id: '6d0de75b-e017-4e90-a019-142465b5ace5' },
                    shelf: {
                        model: 'DS4246',
                        _isembedded: false,
                        _x_bom: {
                            drive_specs: [
                                { model: 'X575A', quantity: 4 },
                                { model: 'X477A', quantity: 20 }
                            ]
                        }
                    }
                },
                guard = map.guard(addingTo),
                options = guard.addingShelf(replacing);

            lab.expect(options).to.be.instanceof(Array).with.length.above(0);
            done();
        });

        lab.test('includes mixed shelves from presets (external)', function (done) {
            var selector = {
                    installation: { id: 'installation1' },
                    cluster: { _id: '9a15e027-917a-4548-89de-4c58bf768732' },
                    hagroup: { _id: '036e18da-e85f-4e3a-8992-52982eca00b4' }
                },
                guard = map.guard(selector),
                options = guard.addingShelf(),
                mixed = _.where(options, function (shelf) {
                    return !shelf.isEmbedded && (shelf.drives.length > 1);
                });

            lab.expect(mixed).to.be.instanceof(Array).with.length.above(0);
            done();
        });

        lab.test('includes mixed shelves from presets (embedded)', function (done) {
            var addingTo = {
                    installation: { id: 'installation1' },
                    cluster: { _id: '9a15e027-917a-4548-89de-4c58bf768732' },
                    hagroup: { _id: '036e18da-e85f-4e3a-8992-52982eca00b4' }
                },
                replacing = {
                    installation: { id: 'installation1' },
                    cluster: { _id: '9a15e027-917a-4548-89de-4c58bf768732' },
                    hagroup: { _id: '036e18da-e85f-4e3a-8992-52982eca00b4' },
                    shelf: { _id: 'dfb5b53f-d561-4362-ae0a-7a62d4f2fce1' }
                },
                guard = map.guard(addingTo),
                options = guard.addingShelf(replacing),
                mixed = _.where(options, function (shelf) {
                    return shelf.isEmbedded && (shelf.drives.length > 1);
                });

            lab.expect(mixed).to.be.instanceof(Array).with.length.above(0);
            done();
        });
    });

    lab.experiment('policies', function() {
        lab.test('is a function', function (done) {
            lab.expect(guard.policies).to.be.a('function');
            done();
        });

        lab.test('for adding to a non-cluster hagroup', function (done) {
            var selector = {
                    installation: { id: 'installation1' },
                    hagroup: { _id: 'f093d2f9-dfee-4755-ba2d-3db27448fd8a' }
                },
                guard = map.guard(selector),
                options = guard.policies();

            lab.expect(options).to.be.instanceof(Array).with.length.above(0);
            done();
        });
    });

    lab.experiment('changingVersion', function() {
        lab.test('is a function', function (done) {
            lab.expect(guard.changingVersion).to.be.a('function');
            done();
        });

        // lab.test('for changing a non-cluster hagroup', function (done) {
        // });

        lab.test('for changing the only hagroup in a cluster', function (done) {
            var addingTo = {
                    installation: { id: 'installation1' },
                    cluster: { _id: '17bbeb4b-193e-46c2-acda-856273a47d6c' }
                },
                replacing = {
                    installation: { id: 'installation1' },
                    cluster: { _id: '17bbeb4b-193e-46c2-acda-856273a47d6c' },
                    hagroup: { _id: '2f38b787-5f9d-4b1d-8a4e-7c2dca2a1088' }
                },
                guard = map.guard(addingTo),
                options = guard.changingVersion(replacing);

            lab.expect(options).to.be.instanceof(Array).with.length.above(0);
            lab.expect(options[0]).to.have.property('newVersion');
            done();
        });

        lab.test('for changing one hagroup (of multiple) in a cluster', function (done) {
            var addingTo = {
                    installation: { id: 'installation1' },
                    cluster: { _id: 'c2175e09-a0e5-4112-b9b2-cb277c9c71db' }
                },
                replacing = {
                    installation: { id: 'installation1' },
                    cluster: { _id: 'c2175e09-a0e5-4112-b9b2-cb277c9c71db' },
                    hagroup: { _id: '1debdf07-c75d-40f0-a7c6-e3dec07f73ba' }
                },
                guard = map.guard(addingTo),
                options = guard.changingVersion(replacing);

            lab.expect(options).to.be.instanceof(Array).with.length.above(0);
            lab.expect(options[0]).to.have.property('newVersion');
            done();
        });
    });

    lab.experiment('limits', function() {
        // Only configs from an enabled ConfigGroup are allowed
        lab.experiment('enabled', function() {
            lab.test('for an enabled config group (FAS c-mode)', function (done) {
                var group = prod.info.getConfigGroup('FAS', 'c-mode'),
                    guard = map.guard(group),
                    options = guard.addingSystem(),
                    enabled = _.where(options, { isEnabled: true });

                lab.expect(enabled).to.be.instanceof(Array).with.length.above(0);
                done();
            });

            lab.test('for an enabled config group (FAS 7-mode)', function (done) {
                var group = prod.info.getConfigGroup('FAS', '7-mode'),
                    guard = map.guard(group),
                    options = guard.addingSystem(),
                    enabled = _.where(options, { isEnabled: true });

                lab.expect(enabled).to.be.instanceof(Array).with.length.above(0);
                done();
            });

            lab.test('for a disabled config group (FAS 7mc)', function (done) {
                var group = prod.info.getConfigGroup('FAS', '7mc'),
                    guard = map.guard(group),
                    options = guard.addingSystem(),
                    enabled = _.where(options, { isEnabled: true });

                lab.expect(enabled).to.be.instanceof(Array).with.length(0);
                done();
            });
        });

        // No mixing product lines in the same project
        lab.experiment('productLine', function() {
            lab.test('E (e-series)', function (done) {
                var group = prod.info.getConfigGroup('E', 'e-series'),
                    guard = map.guard(group),
                    options = guard.addingSystem(),
                    enabled = _.where(options, { isEnabled: true });

                lab.expect(enabled).to.be.instanceof(Array).with.length(0);
                done();
            });

            lab.test('E (ef-series)', function (done) {
                var group = prod.info.getConfigGroup('E', 'ef-series'),
                    guard = map.guard(group),
                    options = guard.addingSystem(),
                    enabled = _.where(options, { isEnabled: true });

                lab.expect(enabled).to.be.instanceof(Array).with.length(0);
                done();
            });
        });

        // Embedded shelves are only an option when replacing another embedded shelf
        lab.experiment('embedded', function() {
            lab.test('for adding to a hagroup', function (done) {
                var selector = {
                        installation: { id: 'installation1' },
                        cluster: { _id: '9a15e027-917a-4548-89de-4c58bf768732' },
                        hagroup: { _id: '036e18da-e85f-4e3a-8992-52982eca00b4' }
                    },
                    guard = map.guard(selector),
                    options = guard.addingShelf(),
                    embedded = _.where(options, { isEnabled: true, isEmbedded: true }),
                    external = _.where(options, { isEnabled: true, isEmbedded: false });

                lab.expect(embedded).to.be.instanceof(Array).with.length(0);
                lab.expect(external).to.be.instanceof(Array).with.length.above(0);
                done();
            });

            lab.test('for changing an embedded shelf', function (done) {
                var addingTo = {
                        installation: { id: 'installation1' },
                        cluster: { _id: '9a15e027-917a-4548-89de-4c58bf768732' },
                        hagroup: { _id: '036e18da-e85f-4e3a-8992-52982eca00b4' }
                    },
                    replacing = {
                        installation: { id: 'installation1' },
                        cluster: { _id: '9a15e027-917a-4548-89de-4c58bf768732' },
                        hagroup: { _id: '036e18da-e85f-4e3a-8992-52982eca00b4' },
                        shelf: { _id: 'dfb5b53f-d561-4362-ae0a-7a62d4f2fce1' }
                    },
                    guard = map.guard(addingTo),
                    options = guard.addingShelf(replacing),
                    embedded = _.where(options, { isEnabled: true, isEmbedded: true }),
                    external = _.where(options, { isEnabled: true, isEmbedded: false });

                lab.expect(external).to.be.instanceof(Array).with.length(0);
                lab.expect(embedded).to.be.instanceof(Array).with.length.above(0);
                done();
            });

            lab.test('for changing an external shelf', function (done) {
                var addingTo = {
                        installation: { id: 'installation1' },
                        cluster: { _id: '9a15e027-917a-4548-89de-4c58bf768732' },
                        hagroup: { _id: '036e18da-e85f-4e3a-8992-52982eca00b4' }
                    },
                    replacing = {
                        installation: { id: 'installation1' },
                        cluster: { _id: '9a15e027-917a-4548-89de-4c58bf768732' },
                        hagroup: { _id: '036e18da-e85f-4e3a-8992-52982eca00b4' },
                        shelf: { _id: '638e8117-d983-428b-bfd1-d128863b615c' }
                    },
                    guard = map.guard(addingTo),
                    options = guard.addingShelf(replacing),
                    embedded = _.where(options, { isEnabled: true, isEmbedded: true }),
                    external = _.where(options, { isEnabled: true, isEmbedded: false });

                lab.expect(embedded).to.be.instanceof(Array).with.length(0);
                lab.expect(external).to.be.instanceof(Array).with.length.above(0);
                done();
            });
        });

        // The number of drives cannot exceed the platform limit for that drive type
        // The total number of drives cannot exceed the platform limit for total drive count
        lab.experiment('drive', function() {
            lab.test('for changing a shelf', function (done) {
                var addingTo = {
                        installation: { id: 'installation1' },
                        hagroup: { _id: 'fdabc0b4-5fac-4345-861d-0d4f6978de6d' }
                    },
                    replacing = {
                        installation: { id: 'installation1' },
                        hagroup: { _id: 'fdabc0b4-5fac-4345-861d-0d4f6978de6d' },
                        shelf: { _id: 'b0fb11ed-7070-4b74-8b67-772b22e6ba69' }
                    },
                    guard = map.guard(addingTo),
                    options = guard.addingShelf(replacing),
                    enabled = _.where(options, { isEnabled: true });

                lab.expect(enabled).to.be.instanceof(Array).with.length.above(0);
                done();
            });

            lab.test('for changing multiple shelves', function (done) {
                var addingTo = {
                        installation: { id: 'installation1' },
                        hagroup: { _id: 'fdabc0b4-5fac-4345-861d-0d4f6978de6d' }
                    },
                    replacing = {
                        installation: { id: 'installation1' },
                        hagroup: { _id: 'fdabc0b4-5fac-4345-861d-0d4f6978de6d' },
                        shelf: { model: 'DS4246' }
                    },
                    guard = map.guard(addingTo),
                    options = guard.addingShelf(replacing),
                    enabled = _.where(options, { isEnabled: true });

                lab.expect(enabled).to.be.instanceof(Array).with.length.above(0);
                done();
            });

            lab.test('for adding to a hagroup (at total limit) ', function (done) {
                var selector = {
                        installation: { id: 'installation1' },
                        hagroup: { _id: '6d0de75b-e017-4e90-a019-142465b5ace5' }
                    },
                    guard = map.guard(selector),
                    options = guard.addingShelf(),
                    enabled = _.where(options, { isEnabled: true }),
                    total = _.where(options, function total(option) {
                        return _.some(option.conflicts, { attribute: 'drive.total' });
                    });

                lab.expect(enabled).to.be.instanceof(Array).with.length(0);
                lab.expect(total).to.be.instanceof(Array).with.length.above(0);
                done();
            });

            lab.test('for adding to a hagroup (at fc limit) ', function (done) {
                var selector = {
                        installation: { id: 'installation1' },
                        hagroup: { _id: '877f619e-55c6-4654-9ff6-87b7b1c66614' }
                    },
                    guard = map.guard(selector),
                    options = guard.addingShelf(),
                    enabled = _.where(options, { isEnabled: true }),
                    fc = _.where(options, function fc(option) {
                        return _.some(option.conflicts, { attribute: 'drive.fc' });
                    });

                lab.expect(enabled).to.be.instanceof(Array).with.length(0);
                lab.expect(fc).to.be.instanceof(Array).with.length.above(0);
                done();
            });

            lab.test('for adding to a hagroup (at sas limit) ', function (done) {
                var selector = {
                        installation: { id: 'installation1' },
                        hagroup: { _id: '8ffd0bd4-1dd2-448e-a318-abb86524d477' }
                    },
                    guard = map.guard(selector),
                    options = guard.addingShelf(),
                    sas = _.where(options, function sas(option) {
                        return _.some(option.conflicts, { attribute: 'drive.sas' });
                    });

                lab.expect(sas).to.be.instanceof(Array).with.length.above(0);
                done();
            });

            lab.test('for adding to a hagroup (at sata limit) ', function (done) {
                var selector = {
                        installation: { id: 'installation1' },
                        hagroup: { _id: '74938980-0f8b-4253-91a5-3769dcd6d26e' }
                    },
                    guard = map.guard(selector),
                    options = guard.addingShelf(),
                    sata = _.where(options, function sata(option) {
                        return _.some(option.conflicts, { attribute: 'drive.sata' });
                    });

                lab.expect(sata).to.be.instanceof(Array).with.length.above(0);
                done();
            });

            lab.test('for adding to a hagroup (at ssd limit) ', function (done) {
                var selector = {
                        installation: { id: 'installation1' },
                        hagroup: { _id: '812c45ba-0feb-44ee-8a0e-8cde322d2645' }
                    },
                    guard = map.guard(selector),
                    options = guard.addingShelf(),
                    ssd = _.where(options, function ssd(option) {
                        return _.some(option.conflicts, { attribute: 'drive.ssd' });
                    });

                lab.expect(ssd).to.be.instanceof(Array).with.length.above(0);
                done();
            });
        });

        lab.experiment('capacity_gb', function() {
            lab.test('for adding to a hagroup', function (done) {
                var selector = {
                        installation: { id: 'installation1' },
                        hagroup: { _id: 'fdabc0b4-5fac-4345-861d-0d4f6978de6d' }
                    },
                    guard = map.guard(selector),
                    options = guard.addingShelf(),
                    enabled = _.where(options, { isEnabled: true }),
                    capacity = _.where(options, function capacity(option) {
                        return _.some(option.conflicts, { attribute: 'capacity_gb' });
                    });

                lab.expect(enabled).to.be.instanceof(Array).with.length(0);
                lab.expect(capacity).to.be.instanceof(Array).with.length.above(0);
                done();
            });
        });

        lab.experiment('ext_shelves', function() {
            lab.test('for adding to a hagroup', function (done) {
                var selector = {
                        installation: { id: 'installation1' },
                        hagroup: { _id: '877f619e-55c6-4654-9ff6-87b7b1c66614' }
                    },
                    guard = map.guard(selector),
                    options = guard.addingShelf(),
                    enabled = _.where(options, { isEnabled: true }),
                    ext = _.where(options, function ext(option) {
                        return _.some(option.conflicts, { attribute: 'ext_shelves' });
                    });

                lab.expect(enabled).to.be.instanceof(Array).with.length(0);
                lab.expect(ext).to.be.instanceof(Array).with.length.above(0);
                done();
            });
        });

        lab.experiment('hardware.shelf', function() {
            lab.test('for changing a hagroup', function (done) {
                var addingTo = {
                        installation: { id: 'installation1' },
                        cluster: { _id: '274aa530-9973-434a-95cf-aceb4a86915b' }
                    },
                    replacing = {
                        installation: { id: 'installation1' },
                        cluster: { _id: '274aa530-9973-434a-95cf-aceb4a86915b' },
                        hagroup: { _id: '99d6ec42-e383-4926-ac42-647b978edb34' }
                    },
                    guard = map.guard(addingTo),
                    options = guard.addingSystem(replacing),
                    enabled = _.where(options, { isEnabled: true }),
                    ext = _.where(options, function ext(option) {
                        return _.some(option.conflicts, { attribute: 'hardware.shelf' });
                    });

                lab.expect(enabled).to.be.instanceof(Array).with.length.above(0);
                lab.expect(ext).to.be.instanceof(Array).with.length.above(0);
                done();
            });
        });
    });
});

// console.log(_(options).where({ isEnabled: false }).first());
// console.error(require('util').inspect(capacity[0], { depth: null }));

// Add to cluster where existing system limits newest version
// When replacing the hagroup holding everyone in a cluster back we should up the version
