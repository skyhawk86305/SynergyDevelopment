'use strict';

var lab = require('lab');

lab.experiment('the module', function() {
    var sr;

    lab.before(function(done) {
        sr = require('../');
        done();
    });

    lab.test('exports a register function', function (done) {
        lab.expect(sr).to.have.property('register');
        lab.expect(sr.register).to.be.a('function');
        done();
    });

    lab.test('exports a version string', function(done) {
        lab.expect(sr).to.have.property('version');
        lab.expect(sr.version).to.be.a('string');
        done();
    });
});
