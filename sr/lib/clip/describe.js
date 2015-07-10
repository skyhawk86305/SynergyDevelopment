'use strict';

var assert = require('assert'),
    _ = require('lodash');

function classifyDrive(drive) {
    assert(typeof drive.rpm === 'number');
    if (drive.rpm >= 50) {
        return 'SSD';
    } else if (drive.rpm < 9) {
        return 'capacity';
    } else {
        return 'performance';
    }
}

function byClassification(drives) {
    return _.reduce(drives, function (result, drive) {
        var _class = classifyDrive(drive),
            rawtb = (drive.rawgb * drive._count) / 1000;

        result.count[_class] = (result.count[_class] || 0) + drive._count;
        result.rawtb[_class] = (result.rawtb[_class] || 0) + rawtb;
        return result;
    }, { rawtb: {}, count: {}});
}

function describe(query) {
    assert(typeof query === 'function');

    function countBy(qatts, att) {
        return _.reduce(query(qatts).matches, function (result, value) {
            result[value[att]] = (result[value[att]] || 0) + value._count;
            return result;
        }, {});
    }

    function uniques(qatts, att) {
        return _.uniq(_.keys(countBy(qatts, att)));
    }

    return {
        nodes: countBy({ _type: 'node' }, 'model'),
        shelves: countBy({ _type: 'shelf' }, 'model'),
        versions: uniques({ _type: 'node' }, 'version'),
        modes: uniques({ _type: 'node' }, 'mode'),
        drives: byClassification(query({ _type: 'drive' }).matches)
    };
}

module.exports = describe;
