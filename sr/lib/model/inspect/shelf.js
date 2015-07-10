'use strict';

var _ = require('lodash'),
    assert = require('assert'),
    util = require('../util');

function ShelfInspector(init) {
    init(this); // this.inspect, this.info, this.cluster, this.hagroup, ...
}

ShelfInspector.prototype.isUsedByManualAggregate = function isUsedByManualAggregate() {
    var prefix = '!' + this.shelf._id.slice(0, 8) + '.',
        result = _.some(this.hagroup.controllers, haveManualAggregatesUsingShelf);

    function haveManualAggregatesUsingShelf(controller) {
        return _.some(controller.aggregates, isManualAggregateUsingShelf);
    }

    function isManualAggregateUsingShelf(aggregate) {
        return aggregate._manual && _.some(aggregate._raid_groups, isRaidGroupUsingShelf);
    }

    function isRaidGroupUsingShelf(raidGroup) {
        return _.some(raidGroup._devices, isDeviceFromShelf);
    }

    function isDeviceFromShelf(device) {
        return device.indexOf(prefix) === 0;
    }

    return result;
};

ShelfInspector.prototype.config = function config(fallback) {
    var hagi = this.inspect(this.hagroup),
        shelfConfigs = hagi.getShelfConfigs();

    return fallback ? util.chooseClosestShelfConfig(this.shelf, shelfConfigs) : util.chooseMatchingShelfConfig(this.shelf, shelfConfigs);
};

ShelfInspector.prototype.devices = function devices() {
    /*
        Concept:

        1) Look in shelf._x_bom and yield the devices contained within

        Result:
        [
            {
                spec: {..}
                devices: [<string>]
            }
        ]
    */
    var devicesForShelf = [];

    if (this.shelf._x_bom) {
        var shelfBom = this.shelf._x_bom;

        if (!shelfBom.drive_specs || !shelfBom.drive_spec_members) {
            console.warn('SHELF IS MALFORMED -- CANNOT INSPECT'); // Guard Unit Tests have malformed map
            console.warn(shelfBom);
            return devicesForShelf;
        }

        assert(_.isArray(shelfBom.drive_specs), 'Shelf bom drive specs must be an array');
        assert(_.isArray(shelfBom.drive_spec_members), 'Shelf bom drive spec members must be an array');
        assert(shelfBom.drive_specs.length === shelfBom.drive_spec_members.length, 'Shelf bom drive spec and members array must be the same length');

        for (var i = 0; i < shelfBom.drive_specs.length; i++) {
            var shelfDriveSpec = shelfBom.drive_specs[i];

            devicesForShelf.push({
                spec: _.omit(shelfDriveSpec, 'model'), // Per Garth, don't use model to compare
                devices: shelfBom.drive_spec_members[i]
            });
        }
    }

    return devicesForShelf;
};

module.exports = ShelfInspector;
