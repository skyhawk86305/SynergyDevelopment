/** @jsx React.DOM */

'use strict';


var DisplayedNumber = require('../lib/displayed-number.js'),
    lab = require('lab');

lab.describe('displayed-number', function() {

    lab.test('should return 999 when number is 999', function(done) {

        var displayedNumber = new DisplayedNumber('999', true);
        lab.expect(displayedNumber.show()).to.eql('999');

        done();
    });


    lab.test('should return 9K when number is 9999', function(done) {

        var displayedNumber = new DisplayedNumber('9999', true);
        lab.expect(displayedNumber.show()).to.eql('9K');

        done();
    });

    lab.test('should return 0 when number is -999', function(done) {

        var displayedNumber = new DisplayedNumber('-999', true);
        lab.expect(displayedNumber.show()).to.eql('0');

        done();
    });

    lab.test('should return 9999 when number is 9999 and compress is false', function(done) {

        var displayedNumber = new DisplayedNumber('9999', false);
        lab.expect(displayedNumber.show()).to.eql('9999');

        done();
    });

     lab.test('should return 0 when number or compress properties are missing', function(done) {

        var displayedNumber = new DisplayedNumber();
        lab.expect(displayedNumber.show()).to.eql('0');

        done();
    });


});
