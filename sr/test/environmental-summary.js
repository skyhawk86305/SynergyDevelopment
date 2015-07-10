'use strict';
/*jshint unused:false */

var lab = require('lab'),
    Builder = require('../lib/model/builder'),
    ModelMap = require('../lib/model/map.js'),
    EnvironmentalSummary = require('../lib/model/inspect/environmental-summary'),
    repair = require('../lib/clip/repair'),
    prod = require('./lib/get-cached-prodinfo'),
    _ = require('lodash');

lab.experiment('environmental-summary/create', function() {
    var BASE_SPEC = {
        configModel: 'FAS8060A',
        shelves: [{
            model: 'DS4246',
            quantity: 8,
            isEmbedded: false,
            drives: [{
                model: 'X316A',
                quantity: 24
            }]
        }],
        version: '8.3RC2 Cluster-Mode' // This is the storage pool test, so we are 8.3 (not 8.2 w/ physical)
    };

    var MIXED_SHELF_SPEC = {
        configModel: 'FAS8060A',
        shelves: [{
            model: 'DS4246',
            quantity: 2,
            isEmbedded: false,
            drives: [{
                model: 'X575A',
                quantity: 4
            }, {
                model: 'X477A',
                quantity: 20
            }]
        }, {
            model: 'DS4246',
            quantity: 8,
            isEmbedded: false,
            drives: [{
                model: 'X316A',
                quantity: 24
            }]
        }],
        version: '8.3RC2 Cluster-Mode' // This is the storage pool test, so we are 8.3 (not 8.2 w/ physical)
    };

    var EMBEDDED_SPEC = {
        configModel: 'FAS2552HA',
        shelves: [{
            model: 'DS2246',
            quantity: 1,
            isEmbedded: true,
            drives: [{
                model: 'X422A',
                quantity: 24
            }]
        }],
        version: '8.3RC2 Cluster-Mode'
    };

    var builder,
        hagroups,
        hagroup,
        map;

    function reset(spec) {
        return function _reset(done) {
            var clusterId = null,
                clip = {
                    synergy_model: {
                        hagroups: []
                    }
                };
            builder = new Builder(prod.info, clip);
            hagroup = builder.addSystemToCluster(spec, clusterId);
            hagroups = clip.synergy_model.hagroups;
            map = new ModelMap(prod.info, clip);

            done();
        };
    }

    lab.before(prod);

    lab.experiment('easy', function () {
        lab.beforeEach(reset(BASE_SPEC));

        lab.test('create EnvironmentalSummary', function (done) {
            var sum = new EnvironmentalSummary(map, hagroups).create();
            lab.expect(sum).is.not.null();
            done();
        });
    });

    lab.experiment('mixed shelf', function () {
        lab.beforeEach(reset(MIXED_SHELF_SPEC));

        lab.test('create EnvironmentalSummary', function (done) {
            var sum = new EnvironmentalSummary(map, hagroups).create();
            lab.expect(sum).is.not.null();
            done();
        });
    });

    lab.experiment('embedded', function () {
        lab.beforeEach(reset(EMBEDDED_SPEC));

        lab.test('create EnvironmentalSummary', function (done) {
            var sum = new EnvironmentalSummary(map, hagroups).create();
            lab.expect(sum).is.not.null();
            done();
        });
    });
});
