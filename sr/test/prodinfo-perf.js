'use strict';

var lab = require('lab'),
     _ = require('lodash'),
    prod = require('./lib/get-cached-prodinfo'),
    ProductInfo = require('../lib/prodinfo');

lab.experiment('ProductInfo', function() {
    lab.before(prod);

    lab.test('can finalize all config matrixes', function (done) {
        lab.expect(prod.info).to.be.instanceof(ProductInfo);
        _.forEach(prod.info.getConfigGroups(), finalizeConfigGroup);
        done();

        function finalizeConfigGroup(group) {
            _.forEach(group.subGroups, finalizeConfigGroup);
            _.forEach(group.getConfigs(), finalizeConfig);
        }

        function finalizeConfig(config) {
            config.matrix.finalize();
        }
    });
});
