'use strict';

var assert = require('assert'),
    uuid = require('uuid'),
    repairShelves = require('./shelves'),
    Constants = require('../../constants'),
    _ = require('lodash');

// jshint camelcase: false

function correctLegacyModelPosition(clip) {
    assert(clip);

    if (!clip.hagroups) {
        return;
    }

    assert(!clip.synergy_model, 'clip has both hagroups AND synergy_model');

    clip.synergy_model = {
        hagroups: clip.hagroups
    };

    delete clip.hagroups;
}

function repairIsClusteredType(ob) {
    if (typeof ob.is_clustered === 'string') {
        ob.is_clustered = ob.is_clustered === 'true';
    }
}

function repairIsClustered(ob) {
    if (ob._x_bom && ob._x_bom.system) {
        repairIsClusteredType(ob._x_bom.system);

        if (ob.is_clustered === null || ob.is_clustered === undefined) {
            ob.is_clustered = ob._x_bom.system.is_clustered;
        }
    } else {
        if (ob.is_clustered === null || ob.is_clustered === undefined) {
            ob.is_clustered = false;
        }
    }

    repairIsClusteredType(ob);
}

function repairClusterMembership(hagroup) {
    if (hagroup.is_clustered && !_.has(hagroup, 'cluster')) {
        hagroup.cluster = { _id: uuid() };
    }
}

function defaultOrAssertSame(target, tkey, source, skey) {
    if (tkey in target) {
        assert.equal(
            target[tkey],
            source[skey],
            skey + ' mismatch');
    } else {
        target[tkey] = source[skey];
    }
}

function updateBomDriveDetail(hagroup) {
    if (!(hagroup.drives && hagroup._x_bom && hagroup._x_bom.shelves)) {
        return;
    }

    var detailsByModel = {};

    function inhale(drive) {
        var model = drive.model;
        if (model && !(model in detailsByModel)) {
            detailsByModel[model] = {
                rpm: drive.rpm,
                type: drive.type
            };
        }
    }

    function exhale(shelfgroup) {
        if (shelfgroup.drive1model) {
            var details1 = detailsByModel[shelfgroup.drive1model];
            defaultOrAssertSame(shelfgroup, 'drive1rpm', details1, 'rpm');
            defaultOrAssertSame(shelfgroup, 'drive1type', details1, 'type');
        }

        if (shelfgroup.drive2model) {
            var details2 = detailsByModel[shelfgroup.drive2model];
            defaultOrAssertSame(shelfgroup, 'drive2rpm', details2, 'rpm');
            defaultOrAssertSame(shelfgroup, 'drive2type', details2, 'type');
        }
    }

    assert(hagroup.drives instanceof Array);
    assert(hagroup._x_bom.shelves instanceof Array);
    _.forEach(hagroup.drives, inhale);
    _.forEach(hagroup._x_bom.shelves, exhale);
}

function renameProp(ob, key1, key2) {
    if (_.has(ob, key1)) {
        var what = 'renaming ' + key1 + ' to ' + key2;
        assert.equal(_.hasOwnProperty(ob, key2), false, 'clash ' + what);
        ob[key2] = ob[key1];
        delete ob[key1];
    }
}

function renameShelfProperties(hagroup) {
    if (!hagroup.shelves) {
        return;
    }

    _.forEach(hagroup.shelves, function fixShelfProperties(shelf) {
        renameProp(shelf, 'shelf_model', 'model');
        renameProp(shelf, 'serial_no', 'serial_number');

        delete shelf.shelf_type;
    });
}

function renameShelfXbomProperties(hagroup) {
    if (!hagroup.shelves) {
        return;
    }

    _.forEach(hagroup.shelves, function fixShelfProperties(shelf) {
        shelf._type = 'shelf';

        var drive_specs = _.isEmpty(shelf._x_bom) ? [] : shelf._x_bom.drive_specs;

        _.forEach(drive_specs, function fixShelfProperties(xbom) {
            renameProp(xbom, 'driveType', 'type');
            renameProp(xbom, 'marketingCapacity', 'rawgb');
            renameProp(xbom, 'rightSizedCapacity', 'rsgb');
            renameProp(xbom, 'speed', 'rpm');
        });
    });
}

function renameDriveProperties(hagroup) {
    if (!hagroup.drives) {
        return;
    }

    _.forEach(hagroup.drives, function fixDriveProperties(drive) {
        renameProp(drive, 'disk_model', 'model');
        renameProp(drive, 'disk_type', 'type');
    });
}

function repairController(controller) {
    controller._type = 'controller';

    if (controller.aggregates === null) {
        delete controller.aggregates;
    }

    if (controller.volumes === null) {
        delete controller.volumes;
    }
}

function repairControllerName(hagroup) {
    if (!hagroup.controllers || !hagroup._x_bom || !hagroup._x_bom.system || !hagroup._x_bom.system.names) {
        return;
    }

    var controllerNamesfromXbom = hagroup._x_bom.system.names.split('/');

    _.forEach(hagroup.controllers, function setName(controller, index) {
        if (!controller.name && controllerNamesfromXbom[index]) {
            controller.name = controllerNamesfromXbom[index];
        }
    });
}

function repairVersion(hagroup) {
    if (hagroup.version || !hagroup._x_bom || !hagroup._x_bom.system || !hagroup._x_bom.system.version) {
        return;
    }

    hagroup.version = hagroup._x_bom.system.version;
}

function repairVersionNumber(hagroup) {
    if (typeof hagroup.version !== 'string') {
        return;
    }

    var parts = hagroup.version.split(' ');

    parts[0] = parts[0].toUpperCase();
    hagroup.version = parts.join(' ');
}

function repairPolicies(hagroup) {
    hagroup._policies = hagroup._policies || {};

    _.defaults(hagroup._policies, {
        version: {
            pin: true
        },
        spare_allocation: {
            enforce: Constants.POLICIES.SPARES.DEFAULT
        }
    });
}

function repairHaGroup(hagroup) {
    hagroup._type = 'hagroup';

    repairIsClustered(hagroup);
    repairClusterMembership(hagroup);

    if (_.has(hagroup, 'system_model')) {
        hagroup.model = hagroup.system_model;
        delete hagroup.system_model;
    }

    renameDriveProperties(hagroup);
    updateBomDriveDetail(hagroup);
    renameShelfProperties(hagroup);
    renameShelfXbomProperties(hagroup);
    repairShelves.repairShelvesXboms(hagroup);

    if (hagroup.controllers) {
        _.forEach(hagroup.controllers, repairController);
    }

    repairControllerName(hagroup);
    repairVersion(hagroup);
    repairVersionNumber(hagroup);
    repairPolicies(hagroup);
}

function repairCluster(cluster) {
    cluster._type = 'cluster';
}

function repair(clip) {
    clip = _.cloneDeep(clip);

    correctLegacyModelPosition(clip);
    if (!(clip.synergy_model && clip.synergy_model.hagroups)) {
        return clip;
    }

    _.each(clip.synergy_model.hagroups, repairHaGroup);
    _.each(clip.synergy_model.clusters || [], repairCluster);

    return clip;
}

repair.shelves = repairShelves;
module.exports = repair;
