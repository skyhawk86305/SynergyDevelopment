'use strict';

/*

var lab = require('lab'),
    _ = require('lodash'),
    Store = require('../lib/stores/store'),
    ProjectStore = require('../lib/stores/project'),
    ProductInfo = require('../lib/prodinfo'),
    Builder = require('../lib/model/builder'),
    testData = require('./data'),
    EMPTYCLIP = function() { return { 'synergy_model' : { 'hagroups': [] } };},
    productInfo,pcd,
    getProdInfoStoreMock = function getProdInfoStoreMock() {
        return {
            getState : function getState() {
                return {
                    productInfo: productInfo,
                    fetching: false,
                    fetched: true,
                    err: undefined
                };
            }
        };
    };

// jshint camelcase: false

function addPublicAPITests(getStore) {
    var store;

    lab.before(testData.UpdatedPCD(function (cj) {
        pcd = cj;
        productInfo = new ProductInfo(pcd);
        store = getStore();
    }));

    lab.test('has method: getState (0)', function (done) {
        lab.expect(store.getState).to.be.a('function');
        lab.expect(store.getState.length).to.equal(0);
        done();
    });

    lab.test('has method: getGuard (0)', function (done) {
        lab.expect(store.getGuard).to.be.a('function');
        lab.expect(store.getGuard.length).to.equal(0);
        done();
    });

    lab.test('has method: act (1)', function (done) {
        lab.expect(store.act).to.be.a('function');
        lab.expect(store.act.length).to.equal(1);
        done();
    });

    lab.test('has method: watch (1)', function (done) {
        lab.expect(store.watch).to.be.a('function');
        lab.expect(store.watch.length).to.equal(1);
        done();
    });

    lab.test('has method: unwatch (1)', function (done) {
        lab.expect(store.unwatch).to.be.a('function');
        lab.expect(store.unwatch.length).to.equal(1);
        done();
    });
}

lab.experiment('a Store object', function () {
    addPublicAPITests(function() {
        return new Store('DUMMY0');
    });

    lab.experiment('getGuard method returns an object which', function () {
        addPublicAPITests(function() {
            return new Store('DUMMY1').getGuard();
        });
    });
});

function getProjectStore() {
    var prjstr = new ProjectStore({ xhr: _.noop, productInfo : getProdInfoStoreMock() });
    prjstr.clip = EMPTYCLIP();
    prjstr.clip._uuid = 'uuid';
    prjstr.clip._version = 1;
    prjstr._builder = new Builder(new ProductInfo(pcd), prjstr.clip);
    return prjstr;
}

lab.experiment('Events on ProjStore', function () {
    lab.experiment('when you call act(\'PROJECT_*\', ...)', function () {
        lab.test('returns false', function(done) {
            var prjstr = getProjectStore();
            var retval;
            var err;
            try {
                retval = prjstr.act('PROJECT_BUTTER');
            } catch(e) {
                err = e.message;
            }
            lab.expect(retval).to.equal(undefined);
            lab.expect(err.indexOf('invalid action:')).to.equal(0);
            done();
        });

        lab.test('fires a change event, and getState() is OK', function(done) {
            var prjstr = getProjectStore();
            prjstr.watch(function onAddClusterPropertyChange() {
                var state = prjstr.getState();
                lab.expect(state).to.have.property('clip');
                lab.expect(state.clip.synergy_model).to.have.property('hagroups');
                lab.expect(state.clip.synergy_model.hagroups.length).to.equal(1);
                var ha0 = state.clip.synergy_model.hagroups[0];
                lab.expect(ha0).to.have.property('_model');
                lab.expect(ha0._model).to.equal('FAS8060A');
                lab.expect(ha0).to.have.property('controllers');
                lab.expect(ha0).to.have.property('shelves');
                lab.expect(ha0.controllers.length).to.equal(2);
                done();
            });

            prjstr.act('PROJECT_ADD_CLUSTER', 'FAS8060A', _.noop);
        });
    });

    lab.experiment('when you call act(\'PROJECT_EXPAND_CLUSTER\', ...)', function () {
        lab.test('fires a change event, and getState() is OK', function(done) {
            var prjstr = getProjectStore();

            prjstr.act('PROJECT_ADD_CLUSTER', 'FAS8060A', _.noop);
            var clusterid = prjstr.clip.synergy_model.hagroups[0].cluster._id;
            prjstr.watch(function onExpandClusterPropertyChange() {
                var state = prjstr.getState();
                lab.expect(state.clip.synergy_model).to.have.property('hagroups');
                lab.expect(state.clip.synergy_model.hagroups.length).to.equal(2);
                var ha0 = state.clip.synergy_model.hagroups[0];
                lab.expect(ha0).to.have.property('_model');
                lab.expect(_.flatten(state.clip.synergy_model.hagroups, function (h) { return h._model; })).to.contain('FAS8060A');
                lab.expect(_.flatten(state.clip.synergy_model.hagroups, function (h) { return h._model; })).to.contain('FAS2554HA');
                lab.expect(ha0).to.have.property('controllers');
                lab.expect(ha0).to.have.property('shelves');
                lab.expect(ha0.controllers.length).to.equal(2);
                done();
            });
            prjstr.act('PROJECT_EXPAND_CLUSTER', clusterid, 'FAS2554HA', _.noop);
        });
    });

    lab.experiment('when you call act(\'PROJECT_ADD_STANDALONE\', ...)', function () {
        lab.test('returns false', function(done) {
            var prjstr = getProjectStore();
            var retval = prjstr.act('PROJECT_ADD_STANDALONE', 'FAS8080AE EX', _.noop);
            lab.expect(retval).to.equal(true);
            done();
        });

        lab.test('fires a change event, and getState() is OK', function(done) {
            var prjstr = getProjectStore();

            prjstr.watch(function onProjectStorePropertyChange() {
                var state = prjstr.getState();
                lab.expect(state.clip.synergy_model).to.have.property('hagroups');
                lab.expect(state.clip.synergy_model.hagroups.length).to.equal(1);
                var ha0 = state.clip.synergy_model.hagroups[0];
                lab.expect(ha0).to.have.property('_model');
                lab.expect(ha0._model).to.equal('FAS8080AE EX');
                lab.expect(ha0).to.have.property('controllers');
                lab.expect(ha0).to.have.property('shelves');
                lab.expect(ha0.controllers.length).to.equal(2);
                done();
            });
            prjstr.act('PROJECT_ADD_STANDALONE', 'FAS8080AE EX', _.noop);
        });
    });


    lab.experiment('when you call act(\'PROJECT_ADD_CLUSTER\', ...)', function () {
        lab.test('returns true', function(done) {
            var prjstr = getProjectStore(),
                retval = prjstr.act('PROJECT_ADD_CLUSTER', 'FAS8060A', _.noop);

            lab.expect(retval).to.equal(true);
            done();
        });
    });
});

lab.experiment('Fire all platforms known to PlatformConfig through ProjectStore to Builder', function() {
    var pcd, pc;

    lab.before(testData.config(function (cj) {
        pcd = cj;
        pc = new ProductInfo(pcd);
    }));

    lab.experiment('when you call act(\'PROJECT_ADD_STANDALONE\', ...)', function () {
        lab.test('returns false', function(done) {
            var prjstr = getProjectStore(),
                retval = prjstr.act('PROJECT_ADD_STANDALONE', 'FAS8080AE EX', _.noop);

            lab.expect(retval).to.equal(true);
            done();
        });

        lab.test('fires a change event, and getState() is OK', function(done) {
            var prjstr = getProjectStore();

            prjstr.watch(function onProjectStorePropertyChange() {
                var state = prjstr.getState();
                lab.expect(state.clip.synergy_model).to.have.property('hagroups');
                lab.expect(state.clip.synergy_model.hagroups.length).to.equal(countAdded);
                lab.expect(_.flatten(state.clip.synergy_model.hagroups, function (h) { return h._model; })).to.contain(latestPlatformAdded);
                var hag = _.find(state.clip.synergy_model.hagroups, function (h) { return h._model === latestPlatformAdded; });
                //console.log('found ' + latestPlatformAdded + ':', hag._model);
                lab.expect(hag).to.have.property('controllers');
                lab.expect(hag).to.have.property('shelves');
                lab.expect([1, 2]).to.contain(hag.controllers.length);
                if (countAdded === totalPlatforms) {
                    done();
                }
            });

            var latestPlatformAdded;
            var countAdded = 0;
            var platformsToTest = pc.getNonEoaPlatformNames();
            var totalPlatforms = platformsToTest.length;

            _.forEach(platformsToTest, function (p) {
                latestPlatformAdded = p;
                countAdded++;
                //console.log('fire ' + countAdded + ' PROJECT_ADD_STANDALONE', p);
                prjstr.act('PROJECT_ADD_STANDALONE', p, _.noop);
            });

        });
    });
});

*/
