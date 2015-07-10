'use strict';

var assert = require('assert'),
    encryptedByModel = require('./encrypted-table'),
    fpByModel = require('./fp-table'),
    rpmByModel = require('./rpm-table'),
    rsgbByModel = require('./rsgb-table'),
    uuid = require('uuid'),
    _ = require('lodash');

function _parseShelfDescriptionToXbom(d) {
    var drivesStrings = d.split('with')[1].split('and');
    var drives = _.map(drivesStrings, function(ds) {
        var quantitySplit = ds.trim().split('x ');
        var driveModel = quantitySplit[1].trim().split(' ')[0];
        return { model: driveModel, quantity: quantitySplit[0] };
    });
    return drives;
}

function _fixShelvesMissingXbomFromShelfDescription(s) {
    if (!s._x_bom && s._description) {
        var drive_specs = _parseShelfDescriptionToXbom(s._description);
        s._x_bom = { drive_specs: drive_specs };
    }

    return s;
}

function RawGBCacheFromMainBOM(hagroup) {
    assert(this instanceof RawGBCacheFromMainBOM, 'use new');

    var entries = this;

    if (hagroup._x_bom && hagroup._x_bom.shelves) {
        _.forEach(hagroup._x_bom.shelves, function cacheDriveSizes(shelf) {
            if (shelf.drive1model) {
                entries[shelf.drive1model] = shelf.drive1rawgb;
            }
            if (shelf.drive2model) {
                entries[shelf.drive2model] = shelf.drive2rawgb;
            }
        });
    }
}

function correctBetaXbom(shelf) {
    if (_.isArray(shelf._x_bom)) {
        shelf._x_bom = { drive_specs: shelf._x_bom };
    }

    return shelf;
}

function assignShelfIdIfMissing(shelf) {
    if (!shelf._id) {
        shelf._id = uuid();
    }
}

function populateDriveSpecMembersIfMissing(shelf) {
    function buildMembersForSpecs(owningShelfId, driveSpecs) {
        var buildResults = [],
            currentCarrierSlot = 1;

        _.forEach(driveSpecs, function(driveSpec) {
            var members = [];

            _.forEach(_.range(driveSpec.quantity), function() {
                var deviceId = '!' + owningShelfId.slice(0, 8) + '.' + currentCarrierSlot++;

                members.push(deviceId);
            });

            buildResults.push(members);
        });


        return buildResults;
    }

    if (shelf._x_bom && (!shelf._x_bom.drive_spec_members || shelf._x_bom.drive_spec_members.length === 0)) {
        shelf._x_bom.drive_spec_members = buildMembersForSpecs(shelf._id, shelf._x_bom.drive_specs);
    }
}

function fixShelvesXbomsGivenDrives(hagroup) {
    // do not use _.memoize, else cloned results
    function findShelfByNumber(i) {
        return _.find(hagroup.shelves, { shelf_number: i });
    }

    var capCache = new RawGBCacheFromMainBOM(hagroup),
        reportedShelfProblems = false;

    _.forEach(hagroup.drives, function (d) {
        // if we dont find? omitted because shelf already had good _x_bom?
        var shelf = findShelfByNumber(d.shelf);

        if (!shelf) {
            if (!reportedShelfProblems) {
                reportedShelfProblems = true;
                console.error('WARNING: drive information lacks shelf number');
            }
            return; // in other words continue
        }

        // try more appropriate name first; fall back to observed
        var model = d.model || d.disk_model,
            type = d.type || d.disk_type,
            rawgb = d.rawgb || capCache[model] || 0;

        if (!(shelf._x_bom && shelf._x_bom.drive_specs)) {
            shelf._x_bom = {
                drive_specs: [],
                drive_spec_members: []
            };
        }

        var entry = _.find(shelf._x_bom.drive_specs, { model: model });

        if (entry) {
            entry.quantity++;
        } else {
            entry = {
                quantity: 1,
                model: model,
            };
            shelf._x_bom.drive_specs.push(entry);
        }

        // If the entry doesn't know this drive metadata, copy it in from
        // our cache
        _.defaults(entry, {
            type: type,
            rpm: d.rpm,
            rawgb: rawgb,
        });
    });
}

function repairShelvesXbomByLookup(shelves) {
    _.forEach(shelves, function (shelf) {
        var drive_specs = _.isEmpty(shelf._x_bom) ? [] : shelf._x_bom.drive_specs;

        _.forEach(drive_specs, function (driveSpec) {
            // indexing by undefined is OK, so:
            driveSpec.rpm = driveSpec.rpm || rpmByModel[driveSpec.model];
            driveSpec.rsgb = driveSpec.rsgb || rsgbByModel[driveSpec.model];

            if (driveSpec.fp_support === undefined) {
                driveSpec.fp_support = fpByModel[driveSpec.model];
            }

            if (driveSpec.encrypted === undefined) {
                driveSpec.encrypted = encryptedByModel[driveSpec.model];
            }
        });
    });

}
function repairShelvesXboms(hagroup) {
    if (hagroup.shelves) {
        if (hagroup.drives) {
            fixShelvesXbomsGivenDrives(hagroup);
            _.forEach(hagroup.shelves, assignShelfIdIfMissing);
            _.forEach(hagroup.shelves, populateDriveSpecMembersIfMissing);
        } else {
            _.forEach(hagroup.shelves, _fixShelvesMissingXbomFromShelfDescription);
            _.forEach(hagroup.shelves, correctBetaXbom);
            _.forEach(hagroup.shelves, assignShelfIdIfMissing);
            _.forEach(hagroup.shelves, populateDriveSpecMembersIfMissing);
        }

        repairShelvesXbomByLookup(hagroup.shelves);
    }
}

module.exports = {
    _parseShelfDescriptionToXbom:_parseShelfDescriptionToXbom,
    _fixShelvesMissingXbomFromShelfDescription:_fixShelvesMissingXbomFromShelfDescription,
    repairShelvesXboms:repairShelvesXboms,
    fixShelvesXbomsGivenDrives:fixShelvesXbomsGivenDrives
};
