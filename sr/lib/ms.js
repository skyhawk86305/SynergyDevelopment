'use strict';

function seconds(n) {return n * 1000; }
function minutes(n) {return seconds(n * 60); }
function hours(n) {return minutes(n * 60); }

module.exports = {
    seconds: seconds,
    minutes: minutes,
    hours: hours,
};
