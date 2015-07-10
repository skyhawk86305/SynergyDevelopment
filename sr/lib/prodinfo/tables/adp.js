'use strict';

var assert = require('assert');

var SLICE_12_DRIVE_HA = [
        null, null, null, null, null, null, null, null, // 0..7
        [ 2, 2, 0, 2, 2, 0 ],
        [ 2, 2, 0, 2, 2, 1 ],
        [ 2, 2, 1, 2, 2, 1 ],
        [ 3, 2, 0, 3, 2, 1 ],
        [ 3, 2, 1, 3, 2, 1 ],
    ];

assert.equal(SLICE_12_DRIVE_HA[0], null);
assert.equal(SLICE_12_DRIVE_HA[7], null);
assert.notEqual(SLICE_12_DRIVE_HA[8], null);
assert.equal(SLICE_12_DRIVE_HA.length, 12 + 1);

var SLICE_12_DRIVE_STANDALONE = [
        null, null, null, null, // 0..3
        [ 2, 2, 0 ],
        [ 2, 2, 1 ],
        [ 3, 2, 1 ],
        [ 3, 2, 2 ],
        [ 3, 2, 3 ],
        [ 3, 2, 4 ],
        [ 3, 2, 5 ],
        [ 3, 2, 6 ],
        [ 3, 2, 7 ],
    ];

assert.equal(SLICE_12_DRIVE_STANDALONE[0], null);
assert.equal(SLICE_12_DRIVE_STANDALONE[3], null);
assert.notEqual(SLICE_12_DRIVE_STANDALONE[4], null);
assert.equal(SLICE_12_DRIVE_STANDALONE.length, 12 + 1);

// TODO: migrate following to somewhere ADP slicer can see it
var SLICE_24_DRIVE_HA = [
        null, null, null, null, null, null, null, null, // 0-7
        [ 2, 2, 0, 2, 2, 0 ],
        [ 2, 2, 0, 2, 2, 1 ],
        [ 2, 2, 1, 2, 2, 1 ],
        [ 3, 2, 0, 3, 2, 1 ],
        [ 3, 2, 1, 3, 2, 1 ],
        [ 4, 2, 0, 4, 2, 1 ],
        [ 4, 2, 1, 4, 2, 1 ],
        [ 5, 2, 0, 5, 2, 1 ],
        [ 5, 2, 1, 5, 2, 1 ],
        [ 6, 2, 0, 6, 2, 1 ],
        [ 6, 2, 1, 6, 2, 1 ],
        [ 7, 2, 0, 7, 2, 1 ],
        [ 7, 2, 1, 7, 2, 1 ],
        [ 8, 2, 0, 8, 2, 1 ],
        [ 8, 2, 1, 8, 2, 1 ],
        [ 8, 2, 1, 8, 2, 2 ],
        [ 8, 2, 2, 8, 2, 2 ],
    ];

// make sure we got the right number of nulls
assert.equal(SLICE_24_DRIVE_HA[0], null);
assert.equal(SLICE_24_DRIVE_HA[7], null);
assert.notEqual(SLICE_24_DRIVE_HA[8], null);
assert.equal(SLICE_24_DRIVE_HA.length, 24 + 1);

var SLICE_24_DRIVE_STANDALONE = [
        null, null, null, null, // 0..3
        [ 2, 2, 0 ],
        [ 2, 2, 1 ],
        [ 3, 2, 1 ],
        [ 4, 2, 1 ],
        [ 5, 2, 1 ],
        [ 6, 2, 1 ],
        [ 7, 2, 1 ],
        [ 8, 2, 1 ],
        [ 8, 2, 2 ],
        [ 8, 2, 3 ],
        [ 8, 2, 4 ],
        [ 8, 2, 5 ],
        [ 8, 2, 6 ],
        [ 8, 2, 7 ],
        [ 8, 2, 8 ],
        [ 8, 2, 9 ],
        [ 8, 2, 10 ],
        [ 8, 2, 11 ],
        [ 8, 2, 12 ],
        [ 8, 2, 13 ],
        [ 8, 2, 14 ],
    ];

assert.equal(SLICE_24_DRIVE_STANDALONE[0], null);
assert.equal(SLICE_24_DRIVE_STANDALONE[3], null);
assert.notEqual(SLICE_24_DRIVE_STANDALONE[4], null);
assert.equal(SLICE_24_DRIVE_STANDALONE.length, 24 + 1);

var byShelfSlotCount = {
        12: [ null, SLICE_12_DRIVE_STANDALONE, SLICE_12_DRIVE_HA ],
        24: [ null, SLICE_24_DRIVE_STANDALONE, SLICE_24_DRIVE_HA ],
    };

function getEmbeddedRootSliceBreakdown(controllerCount, shelfSlotCount, driveCount) {
    var byControllerCount = byShelfSlotCount[shelfSlotCount];
    if (!byControllerCount) {
        return null;
    }

    var byDriveCount = byControllerCount[controllerCount];
    if (!byDriveCount) {
        return null;
    }

    var tup = byDriveCount[driveCount];
    if (!tup) {
        return null;
    }

    var result = [{
            data: tup[0],
            parity: tup[1],
            spare: tup[2],
        }, {
            data: tup[3] || 0,
            parity: tup[4] || 0,
            spare: tup[5] || 0,
        }];

    result[0].partner = tot(1);
    result[1].partner = tot(0);
    result[0].total = result[1].total = result[0].partner + result[1].partner;

    assert.equal(result[0].total, driveCount);
    return result;

    function tot(idx) {
        var sub = result[idx];
        return sub.data + sub.parity + sub.spare;
    }
}

module.exports = getEmbeddedRootSliceBreakdown;
