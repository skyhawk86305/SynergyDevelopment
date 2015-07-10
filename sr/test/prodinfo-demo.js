'use strict';

var lab = require('lab'),
    _ = require('lodash'),
    prod = require('./lib/get-cached-prodinfo'),
    ProductInfo = require('../lib/prodinfo'),
    ConfigGroup = require('../lib/prodinfo/config-group'),
    Config = require('../lib/prodinfo/config'),
    CompatibilityMatrix = require('../lib/prodinfo/matrix');

lab.experiment('ProductInfo demos', function() {
    var group = null,
        config = null;

    lab.before(prod);

    lab.test('self-check', function (done) {
        lab.expect(prod.info).to.be.instanceof(ProductInfo);
        done();
    });

    // lab.test('tick was never held for too long', function (done) {
    //     // console.error(JSON.stringify(prod.ticks, null, 2));
    //     lab.expect(_.max(prod.ticks)).to.be.below(0.1);
    //     done();
    // });

    lab.test('find group for fid=\'FAS\', sid=\'c-mode\'', function (done) {
        group = prod.info.getConfigGroup('FAS', 'c-mode');
        lab.expect(group).to.be.instanceof(ConfigGroup);
        done();
    });

    lab.test('can get all by omitting filters', function (done) {
        var configs = group.where();
        lab.expect(configs).to.be.instanceof(Array).with.length.above(5);

        configs = group.where({});
        lab.expect(configs).to.be.instanceof(Array).with.length.above(5);
        done();
    });

    lab.test('can filter by isEmbedded', function (done) {
        var embedded = group.where({ isEmbedded: true });
        lab.expect(embedded).to.be.instanceof(Array).with.length.above(5);
        done();
    });

    lab.test('can filter by isSellable', function (done) {
        var sellable = group.where({ isSellable: true });
        lab.expect(sellable).to.be.instanceof(Array).with.length.above(5);
        done();
    });

    lab.test('can find FAS2552HA', function (done) {
        config = group.getConfig('FAS2552HA');
        lab.expect(config).to.be.instanceof(Config)
            .with.property('configModel')
            .equal('FAS2552HA');
        done();
    });

    lab.test('... with correct controllerCount', function (done) {
        lab.expect(config).to.be.instanceof(Config)
            .with.property('controllerCount')
            .equal(2);
        done();
    });

    lab.test('  ... and correct isEmbedded', function (done) {
        lab.expect(config).to.be.instanceof(Config)
            .with.property('isEmbedded')
            .equal(true);
        done();
    });

    lab.test('... with a compatibility matrix', function (done) {
        lab.expect(config).to.be.instanceof(Config)
            .with.property('matrix')
            .instanceof(CompatibilityMatrix);
        done();
    });

    lab.test('  ... showing at least two releases', function (done) {
        lab.expect(config).to.be.instanceof(Config)
            .with.property('matrix')
            .instanceof(CompatibilityMatrix)
            .with.property('versions')
            .instanceof(Array)
            .with.length.above(1);
        done();
    });

    lab.test('... for which we can get limits', function (done) {
        var lastIndex = config.matrix.versions.length - 1,
            version = config.matrix.versions[lastIndex],
            limits = config.matrix.getLimitsForVersion(version);
        lab.expect(limits).to.be.instanceof(Object);
        // ... whereupon more envy sets in, e.g. limits.fp_slicing
        // for which we need to index into hardware tables by ID.
        // console.error(require('util').inspect(limits, { depth: null }));
        done();
    });

    lab.test('... and check version/shelf/drive compatibility', function (done) {
        var version = '8.3RC2 Cluster-Mode',
            compatInfo = config.matrix.checkVersionShelfDrive(version, 'DS2246', 'X422A');

        lab.expect(_.omit(compatInfo, 'drive')).to.eql({
            compatible: true,
            fp_slicing: false,
            fp_support_drive: true,
            root_slicing: true,
        });

        lab.expect(compatInfo.drive).to.eql({
            model: 'X422A',
            type: 'SAS',
            fp_support: false,
            encrypted: false,
            descr: 'DSK DRV,600GB,10K RPM,6Gb,2.5\",SAS,R5 ',
            sellable: true,
            speed: 10,
            capacity: {
                marketing: 600,
                right_sized: 573440000,
                raw: 573652992
            }
        });

        done();
    });

    lab.test('can find FAS6080HA', function (done) {
        config = group.getConfig('FAS6080HA');
        lab.expect(config).to.be.instanceof(Config)
            .with.property('configModel')
            .equal('FAS6080HA');
        done();
    });

    lab.test('... with at least ten releases', function (done) {
        lab.expect(config).to.be.instanceof(Config)
            .with.property('matrix')
            .instanceof(CompatibilityMatrix)
            .with.property('versions')
            .instanceof(Array)
            .with.length.above(10);
        done();
    });

    lab.test('can find FAS2220', function (done) {
        config = group.getConfig('FAS2220');
        lab.expect(config).to.be.instanceof(Config)
            .with.property('configModel')
            .equal('FAS2220');
        done();
    });

    lab.test('... with correct embedded shelves', function (done) {
        lab.expect(config).to.be.instanceof(Config)
            .with.property('matrix')
            .instanceof(CompatibilityMatrix)
            .with.property('hardwareOptions')
            .instanceof(Object)
            .with.property('embeddedShelves')
            .instanceof(Array)
            .with.length.above(0);

        // DS2126 is the only embedded shelf for a FAS2220
        var external = _.filter(config.matrix.hardwareOptions.embeddedShelves, function(config) {
            return config.shelf.model !== 'DS2126';
        });

        lab.expect(external).to.have.length(0);
        done();
    });

    // lab.test('can find a drive', function (done) {
    //     var drive = prod.info.getDriveByModel('X278A');
    //     lab.expect(drive).to.be.instanceof(Object);
    //     done();
    // });
});
