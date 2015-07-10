'use strict';

var  describe = require('./describe'),
    distill = require('./distill'),
    repair = require('./repair'),
    assert = require('assert'),
    _ = require('lodash');

function _wrapSystems(systems) {
	var hagroups = [],
            fake = {
                synergy_model: {
                    hagroups: hagroups
                }
            };

        _.forEach(systems, function addSystem(system) {
            hagroups.push(system);
        });

     return fake;
}

function distillSystems(systems) {
	var fake = _wrapSystems(systems);
	return distill(repair(fake));
}

function distillSystem(system) {
	assert(system instanceof Object);
	return distillSystems([system]);
}

function describeSystems(systems) {
	assert(systems instanceof Array);
    return describe(distillSystems(systems));
}

function describeSystem(system) {
	assert(system instanceof Object);
	return describeSystems([system]);
}

function classifyDrive(drive) {
    assert(typeof (drive.rpm || drive.driveSpeed) === 'number', drive );
    var driveRpm = drive.rpm || drive.driveSpeed;
    if (driveRpm >= 50) {
        return 'SSD';
    } else if (driveRpm < 9) {
        return 'capacity';
    } else {
        return 'performance';
    }
}

function getDriveDescriptionsFromXboms(systems) {
    var driveDescriptions = {count: {SSD: 0, capacity: 0, performance: 0}, rawtb: {SSD: 0, capacity: 0, performance: 0}};
    _(systems).flatten('shelves').flatten('_x_bom').flatten('drive_specs').forEach(function(d) {
        if(d) {
            var classification = classifyDrive(d);

            driveDescriptions.count[classification] += typeof d.quantity === 'number' ? d.quantity : parseInt(d.quantity); // TODO: _x_bom.quantity should be an int
            driveDescriptions.rawtb[classification] += d.rawgb / 1000.0;
        }
    });

    return driveDescriptions;
}

module.exports = {
    describeSystems: describeSystems,
    describeSystem: describeSystem,
    distillSystem: distillSystem,
    classifyDrive:classifyDrive,
    getDriveDescriptionsFromXboms:getDriveDescriptionsFromXboms,
};
