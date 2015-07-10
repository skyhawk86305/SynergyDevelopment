'use strict';

var assert = require('assert'),
    xform = require('../xform'),
    repairClip = require('./repair'),
    uuid = require('uuid'),
    Constants = require('../constants'),
    _ = require('lodash');

// jshint camelcase: false

// Before adding properties, please carefully cross-check with the
// management API. As this file will become a de-facto description of a
// correct Synergy model, feel free to include fields we don't yet need.
// Mark such fields with a spec of 'false'.

// If adding a prop for which the value will be an object, you MUST
// provide an object to define its spec so we know what it'll look like.

function arrayOf(_type) {
    return function checker(value, kpath) {
        assert(_.isArray(value), kpath + ': not array; was ' + typeof value);

        if (typeof _type === 'string') {
            _.forEach(value, function checkEntry(entry) {
                assert.equal(typeof entry, _type, kpath + ': not array of ' + _type);
            });
            return value;
        } else if (typeof _type === 'function') {
            return _.map(value, function (member, index) {
                return _type(member, kpath + '[' + index + ']');
            });
        } else {
            assert(false, kpath + ': invalid arrayOf argument');
        }
    };
}

function slice(value, kpath) {
    if (typeof value === 'string' && value.match(/^P[0-9]+$/)) {
        return value;
    } else {
        throw new Error(kpath + ': not slice: ' + value);
    }
}

// SHOUTING_STANDS_OUT

var REMOVED = false,
    DEFAULT = xform.setdefault,
    CONST = xform.constant,
    UUID = DEFAULT(uuid, checkUUID);

function OPTIONAL_UUID(value, kpath) {
    if (!value) { // includes null, which we've been leaving behind
        return undefined;
    } else {
        return checkUUID(value, kpath);
    }
}

function checkUUID(value, kpath) {
    try {
        uuid.parse(value);
        return value;
    } catch (err) {
        throw new Error(kpath + ': invalid UUID: ' + value);
    }
}

function FIXBOOL(value, kpath) {
    if (typeof value === 'number') {
        return !!value;
    }

    if (_.has(FIXBOOL, value)) {
        return FIXBOOL[value];
    } else {
        throw new Error(kpath + ': can\'t fix to bool: ' + value);
    }
}

_.merge(FIXBOOL, {
    undefined: false,
    null: false,
    yes: true,
    no: false,
    true: true,
    false: false,
});

var SPEC = {
        _x_project_name: true,
        _x_original_timestamp: true,
        _x_archived: true,
        _uuid: true,
        _version: true,
        _timestamp: true,
        _type: true,
        synergy_model: {
            clusters: [{ // audited vs mainN gkidd 2014-07-3
                _id: UUID,
                _type: CONST('cluster'),
                contact: false,
                location: false,
                name: true,
                serial_number: false,
                uuid: false, // theirs, not ours
                rdb_uuid: false,
            }],
            hagroups: [{
                _id: UUID,
                _model: true,
                _type: CONST('hagroup'),
                _x_bom: {
                    system: {
                        _platformIndex: true,
                        _configurationIndex: true,
                        _version: true,
                        _model: true,
                        _family: true,
                        _number: true,
                        _config: true,
                        _dedicated_root_aggregate: true,
                        _spare_allocation_strategy: true,
                        _messages: false
                    },
                    cards: [{
                        count: true,
                        card_model: true,
                        description: true,
                    }],
                    shelves: [{
                        _id: false, // how can we have just one ID?
                        _type: CONST('shelf'),
                        _shelfIndex: true,
                        _drive1Index: true,
                        _drive2Index: true,
                        count: true,
                        model: true,
                        _code: false,
                        drive1count: true,
                        drive1model: true,
                        drive1rawgb: true,
                        drive2count: true,
                        drive2model: true,
                        drive2rawgb: true,
                        _description: true,
                        _messages: false,
                    }]
                },
                _policies: {
                    ADP: {
                        prohibitedByUser: DEFAULT(false)
                    },
                    Aggregates: {
                        manual: DEFAULT(false),
                        ssdsForFlashPool: DEFAULT(true)
                    },
                    storage_pools: {
                        auto_fill: DEFAULT(true)
                    },
                    version: {
                        pin: DEFAULT(true)
                    },
                    spare_allocation: {
                        enforce: DEFAULT(Constants.POLICIES.SPARES.DEFAULT)
                    }
                },
                is_clustered: true, // ONTAPI: system-get-info
                model: true,
                sys_version: true, // in TCLIP docs; absent from built models
                cluster: {
                    _id: UUID,
                    _type: false, // this is a partial ref, NOT the real object
                    name: true,
                },
                controllers: [{
                    _id : true,
                    _type: CONST('controller'),
                    name: true,
                    aggregates: [{
                        _id: UUID,
                        _strategy: false, // internal?
                        _type: CONST('aggregate'),
                        _manual: true,
                        _controller: false, // internal - added back during map creation.
                        name: true,
                        block_type: true,
                        raid_type: true, // Was: raidType
                        cache_raid_type: true, // Was: cacheRaidType
                        is_hybrid: true, // Was: isHybrid (aggr-create, option-name, 'is_flash_pool_caching_enabled' and 'hybrid_enabled') also is_hybrid
                        is_mirrored: true, // Was: isSyncMirrored
                        is_root_aggregate: true, // Was: isDedicatedRoot VERY much doubt this is fron ONTAPI (aggr-create, option-name, 'root')
                        _snapreserve_proportion: true, // Was: snapReserveProportion
                        _ddpreserve: true, // for E-Series with RaidType.DDP
                        _cache_storage_pool_id: REMOVED,
                        _raid_groups: [{
                            // forced because we can't depend on unique aggr names
                            _id: UUID,
                            _type: CONST('raidgroup'),
                            name: true,
                            _devices: arrayOf('string'),
                            __deviceSpecs: false, // to reconstruct after HW change
                            cache: DEFAULT(false), // TODO: check name vs ONTAPI
                            plex_number: true
                        }]
                    }],
                    storage_pools: [{ // audited vs mainN gkidd 2015-01-28
                        // WARNING: these can be used by any aggregate in
                        // the HA group, but are owned by one controller for
                        // spare drive replacement purposes.
                        _id: UUID,
                        _type: CONST('storage_pool'),
                        name: true, // unique across cluster
                        type: DEFAULT('ssd'),
                        _manual: true,
                        _controller: false, // internal - added back during map creation.
                        raid_type: true,
                        _devices: arrayOf('string'), // WHOLE DRIVES
                        __deviceSpecs: false, // to reconstruct after HW change
                        _allocations: [{
                            slice: slice,
                            used_blocks: true,
                            devices: arrayOf('string'),
                            __deviceSpecs: false, // to reconstruct after HW change
                            aggr_id: OPTIONAL_UUID, // undefined if unused
                        }]
                    }],
                    // note: only lists root sliced devices, not
                    // storage pool allocation unit devices
                    _assigned_storage: [{
                        slice_details: {
                            slice: slice,
                            used_blocks: true,
                            devices: arrayOf('string')
                        }
                    }]
                }],
                shelves: [{
                    _id: UUID,
                    _type: CONST('shelf'),
                    _x_bom: {
                        drive_specs: [{
                            model: true,
                            rawgb: true,
                            rsgb: true,
                            rpm: true,
                            type: true,
                            encrypted: true,
                            fp_support: FIXBOOL,
                            quantity: true // TODO: really?
                        }],
                        drive_spec_members: arrayOf(arrayOf('string'))
                    },
                    _description: true,
                    'model': true,
                    'serial_number': true,
                    'bay_count': true,
                    'rack_units': false,
                    'type': true,
                    '_isembedded': true,
                    'channel_name': false,
                    'shelf_number': true,
                    'shelf_rack_number': false,
                    'shelf_rack_position': false
                }],
                version: true
                /* apparently not on new Synergy Mobile -dev models
                drives: [{ // auditing vs devN aggr-disk-info and storage-disk gkidd 2014-10-22
                    // REPAIR DOES NOT YET MOVE ALL THESE FROM THEIR LEGACY KEYS
                    _id: UUID,
                    effective_disk_rpm: false,
                    effective_disk_type: false,
                    is_cache: false,
                    model: true,
                    name: false, // disk name, e.g. 0a.2
                    owner: true, // owning controller
                    physical_size: true, // not yet provided by Synergy 5; bytes; convert?
                    rpm: true, //ok
                    shelf: true, // string!?
                    shelf_bay: true,
                    shelf_uid: false, // esp handy for resolving asup
                    type: true, // ok
                    usable_size: true, // not yet provided by Synergy 5; bytes; convert?
                    // TODO: make possible to get capacity for 3rd party drives
                }]*/
            }]
        }
    };

function reduce(envelope) {
    assert(envelope);
    return xform(SPEC, repairClip(envelope), 'clip');
}

module.exports = reduce;
