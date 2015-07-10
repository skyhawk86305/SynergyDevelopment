'use strict';

var assert = require('assert');


function _isNumeric(num) {
    return !isNaN(num);
}

function DisplayedNumber(number, compress) {
    assert(this instanceof DisplayedNumber);
    this.number = number || 0;
    this.compress = compress || false;
}

DisplayedNumber.prototype.show = function show(){
    var compress = this.compress,
        number = this.number,
        result = 0;


    if (!compress) {
        // Do not compress the number.
        result = number;
    } else if (_isNumeric(number)) {

        if (number > 1000) {
            // Add appropriate units
            result = parseInt(number / 1000) + 'K';
        } else if (number >= 0 && number < 1000) {
            // No changes if number is less than 1000
            result = number;
        }

    }

    return result.toString();
};



module.exports = DisplayedNumber;
