'use strict';

var lab = require('lab'),
    assert = require('assert'),
    util = require('util'),
    Store = require('../lib/stores/store');

function addPublicAPITests(getStore) {
    var store;

    lab.before(function (done) {
        store = getStore();
        done();
    });

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
        return new Store('DUMMY');
    });

    lab.experiment('getGuard method returns an object which', function () {
        addPublicAPITests(function() {
            return new Store('DUMMY').getGuard();
        });
    });
});

function CupboardStore() {
    assert(this instanceof CupboardStore, 'use new');
    Store.call(this, 'CUPBOARD');
    this.foods = [];
}

util.inherits(CupboardStore, Store);

CupboardStore.prototype.getState = function getState() {
    return {
        foods: this.foods
    };
};

CupboardStore.prototype.CUPBOARD_ADD_FOOD = function addFood(name, count) {
    this.foods[name] = (this.foods[name] || 0) + count;
    this.changed();
};

lab.experiment('a Store sublass named CUPBOARD with method CUPBOARD_ADD_FOOD', function () {
    lab.experiment('when you call act(\'CUPBOARD_ADD_FOOD\', ...)', function () {
        lab.test('returns true', function(done) {
            var cupboard = new CupboardStore(),
                retval = cupboard.act('CUPBOARD_ADD_FOOD', 'banana', 23);
            lab.expect(retval).to.equal(true);
            done();
        });

        lab.test('fires a change event, and getState() is OK', function(done) {
            var cupboard = new CupboardStore();
            cupboard.watch(function onCupboardChange() {
                var state = cupboard.getState();
                lab.expect(state).to.have.property('foods');
                lab.expect(state.foods).to.have.property('banana');
                lab.expect(state.foods.banana).to.equal(23);
                done();
            });
            cupboard.act('CUPBOARD_ADD_FOOD', 'banana', 23);
        });
    });

    lab.experiment('when you call act(\'PORTFOLIO_ADD_PROJECT\', ...)', function () {
        lab.test('returns false', function(done) {
            var cupboard = new CupboardStore(),
                retval = cupboard.act('PORTFOLIO_ADD_PROJECT', 'name');
            lab.expect(retval).to.equal(false);
            done();
        });
    });
});
