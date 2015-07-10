'use strict';

var  _ = require('lodash'),
    assert = require('assert');

function findDrivesBelongingToShelf(hagroup, shelf) {
    assert(hagroup, 'hagroup is not defined');
    assert(shelf, 'shelf is not defined');
    assert(hagroup.drives, 'hagroup is not an HAGroup');
    assert(shelf.shelf_number || shelf.shelf_number === 0, 'shelf is not a Shelf : ' + shelf);
    var belongings = _.where(hagroup.drives, function(d) { return d.shelf === shelf.shelf_number; });
    return belongings;
}

function driveModels(drives) {
    return _.uniq(_.map(drives, function (d) { return d.disk_model; }));
}

function _normalizeShelfDriveComboDescription(c) {
    var drive_specs = _.isEmpty(c._x_bom) ? [] : c._x_bom.drive_specs;
    return JSON.stringify({ model: c.model, drive_specs: _(drive_specs).sortBy(function (d) { return d.model; }).value() }).replace(/"/g,'');
}

// describeShelf(shelf) moved to lib/prodinfo/platform-config.js since requires pcd.drives table
// parseShelfDescriptionToXbom(d) and fixShelfXbom(s) moved to repair

function _checkDriveEqual(a, b, ignoreQuantity) {
    /*jslint eqeq: true*/
    var isModelEqual = a.model === b.model,
        isQuantityEqual = a.quantity == b.quantity; // because some people have quoted numbers in the json

    return ignoreQuantity ? isModelEqual : isModelEqual && isQuantityEqual;
}

function _checkShelfDriveEquality(a, b, ignoreQuantity) {
    var specA = _.isEmpty(a._x_bom) ? [] : a._x_bom.drive_specs,
        specB = _.isEmpty(b._x_bom) ? [] : b._x_bom.drive_specs;

    if (a.model === b.model && specA.length === specB.length) {
        var sortedAxbom = _.sortBy(specA, function (d) { return d.model; });
        var sortedBxbom = _.sortBy(specB, function (d) { return d.model; });
        for(var i = 0; i < sortedAxbom.length; i++) {
            if(!_checkDriveEqual(sortedAxbom[i], sortedBxbom[i], ignoreQuantity)) {
                return false;
            }
        }

        return true;
    } else {
        return false;
    }
}

function shelfDriveComboEquals(a, b, ignoreQuantity) {
    assert(a._x_bom, a + ' shelfDrive must at least have_x_bom in order to compare');
    assert(b._x_bom, b + ' shelfDrive must at least have_x_bom in order to compare');

    return _checkShelfDriveEquality(a, b, ignoreQuantity);
}

function groupShelves(shelves) {
    return _.groupBy(shelves, function(s) { return _normalizeShelfDriveComboDescription(s); });
}

function chooseMatchingShelfConfig(shelf, shelfConfigs) {
    return _getShelfConfig(shelf, shelfConfigs, false);
}

function chooseClosestShelfConfig(shelf, shelfConfigs) {
    return _getShelfConfig(shelf, shelfConfigs, true);
}

// jshint laxbreak:true
function _getShelfConfig(shelf, shelfConfigs, fallbackWithoutQuantityMatch) {
    var configs = _(shelfConfigs),
        shelfConfig = configs
            .where(function(c){ return isConfigForShelf(c, shelf); })
            .first();

    if (!shelfConfig && fallbackWithoutQuantityMatch) {
        shelfConfig = configs
            .where(function(c){ return isConfigForShelf(c, shelf, true); })
            .first();
    }

    return shelfConfig;
}

function isConfigForShelf(config, shelf, ignoreQuantity) {
    if (config.isEmbedded === shelf._isembedded) {
        var drives = _.map(config.drives, function mockDrive(d) {
            return { model: d.drive.model, quantity: d.quantity };
        });

        var mockShelf = {
            model: config.shelf.model,
            _x_bom: { drive_specs: drives }
        };

        return shelfDriveComboEquals(mockShelf, shelf, ignoreQuantity);
    } else {
        return false;
    }
}

/*
// jshint laxbreak:true
var specsMatch = function(shelfConfig) {
    return shelfConfig.shelf.model === this.shelf.model
        && _(this.shelf._x_bom.drive_specs).all(
            function(drivespec){
                return _(shelfConfig.drives).any(
                    function(d){
                        return d.drive.model === drivespec.model
                            && d.quantity === drivespec.quantity;
                    }
                );
            }
        );
};
*

/**
 * Match devices by the criteria ONTAP cares about.
 *
 * Intervene here to cater for raid.mix.hdd.performance, raid.mix.hdd.capacity,
 * and the similar option re avoiding mixing FC, non FC.
 *
 * Note we're trying to create separate aggregates for encrypted vs non-encrypted.
 */

function minimalSpecKey(info) {
    var spec = _.pick(info.spec, 'rpm', 'rsgb', 'slice', 'encrypted', '_for_controller');
    return JSON.stringify(spec);
}

/**
 * Convert an RPM figure to an effective drive type for RAID size limit
 * determination purposes. TODO: have RaidLimits check rpm rather than
 * drive type if possible.
 */

function rpmToEffectiveDriveType(rpm) {
    switch (rpm) {
        case 50:
            return 'SSD';
        case 15:
        case 10:
            return 'FC_SAS';
        case 7.2:
            return 'SATA';
    }
}

module.exports = {
    findDrivesBelongingToShelf: findDrivesBelongingToShelf,
    driveModels: driveModels,
    shelfDriveComboEquals: shelfDriveComboEquals,
    groupShelves: groupShelves,
    isConfigForShelf: isConfigForShelf,
    minimalSpecKey: minimalSpecKey,
    rpmToEffectiveDriveType: rpmToEffectiveDriveType,
    chooseMatchingShelfConfig: chooseMatchingShelfConfig,
    chooseClosestShelfConfig: chooseClosestShelfConfig
};
