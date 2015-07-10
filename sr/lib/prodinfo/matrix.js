'use strict';

var _ = require('lodash'),
    util = require('util'),
    assert = require('assert');

function CompatibilityMatrix(configModel) {
    assert(this instanceof CompatibilityMatrix, 'use new');
    this.configModel = configModel;
    this._ = {
        // trying a new pattern for envy protection:
        // if you see '._.', you know it's envy.
        // also: short names because obfuscation
        rbi:  {},  // releases by index... kinda
        rik:  [],  // release index keys
        sv:   {},  // releases by sys_version (short)
        t: {       // table extract
            d: {},    // drive
            dR: {},   // drive indexes by model
            rsd: {},  // rsd[[ri,si,di].join(' ')] => true if compat
            r: {},    // release (actual raw)
            s: {},    // shelf
            sR: {},   // shelf indexes by model
        },
        v:    {},  // releases by version (long)
    };

    Object.defineProperty(this, 'versions', { get: function getVersions() {
        this.finalize();
        return _.keys(this._.v);
    }});

    this.hardwareOptions = {};

    this.checkVersionShelfDrive = _.memoize(_.bind(this.checkVersionShelfDrive, this), function (v, s, d) {
        return [v, s, d].join('\0');
    });

    this._showEnvStatChecks = false;
    this._envStatChecks = {configModel: configModel};
}

// query functions:

/**
 * Get the full display name for a given version.
 */

CompatibilityMatrix.prototype.getFullNameForVersion = function getFullNameForVersion(version) {
    assert(_.has(this._.v, version), util.format('unknown version %s; need %s for %s',
        version,
        _.keys(this._.v).join(', '),
        this.configModel
    ));

    this.finalize();

    var sysVersion = this._.v[version].sys_version,
        familyName = this._.v[version].family.name;

    return sysVersion + ' ' + familyName;
};

/**
 * Determine whether a given long version is compatible with this config.
 */

CompatibilityMatrix.prototype.isCompatibleWithVersion = function isCompatibleWithVersion(version) {
    this.finalize();
    return _.has(this._.v, version);
};

/**
 * Get the limits for this combination of config and version.
 * ENVY WARNING: dereferencing into hardware is unlikely to be healthy.
 */

CompatibilityMatrix.prototype.getLimitsForVersion = function getLimitsForVersion(version) {
    assert(_.has(this._.v, version), util.format('unknown version %s; need %s for %s',
        version,
        _.keys(this._.v).join(', '),
        this.configModel
    ));

    this.finalize();
    var index = this._.v[version]._index;
    return this._.rbi[index].limits;
};

/**
 * Check for version/shelf/drive compatibility, including slice details.
 */

CompatibilityMatrix.prototype.checkVersionShelfDrive = function checkVersionShelfDrive(version, shelfModel, driveModel) {
    this.finalize();

    var incompatibility = {
            compatible: false,
            fp_slicing: false,
            fp_support_drive: false,
            root_slicing: false,
        },
        tables = this._.t,
        shelfIndex = tables.sR[shelfModel],
        driveIndex = tables.dR[driveModel];

    if (!_.has(this._.v, version) || shelfIndex === undefined || driveIndex === undefined) {
        return incompatibility;
    }

    var release = this._.v[version],
        releaseIndex = release._index,
        limits = this._.rbi[release._index].limits,
        spec = this._mkRSDspec(releaseIndex, shelfIndex, driveIndex);

    if (!_.has(tables.rsd, spec)) {
        return incompatibility;
    }

    return {
        compatible: true,
        drive: tables.d[driveIndex],
        fp_slicing: canSliceAccordingTo(limits.fp_slicing),
        fp_support_drive: canSliceAccordingTo(limits.fp_support_drive),
        root_slicing: canSliceAccordingTo(limits.root_slicing),
    };

    function canSliceAccordingTo(table) {
        var blocks = _.where(table, { shelf: shelfIndex });

        if (blocks.length) {
            assert(blocks.length === 1);
            return _.contains(blocks[0].drives, driveIndex);
        } else {
            return false;
        }
    }
};

// inhalation functions:

CompatibilityMatrix.prototype.inhaleRelease = function inhaleRelease(release, limits) {
    this._.v[release.version] = release;
    this._.sv[release.sys_version] = release;
    this._.t.r[release._index] = release;
    this._.rbi[release._index] = {
        release: release,
        limits: limits
    };

    if (this._.rik.indexOf(release._index) === -1) {
        this._.rik.push(release._index);
    }
};

CompatibilityMatrix.prototype.inhaleHardware = function inhaleHardware(systemHardware, hardwareTables, systemStats) {
    this._bindHardware(systemHardware, hardwareTables, systemStats);
};

CompatibilityMatrix.prototype.finalize = function finalize() {
    this._reverseIndexes();
    this._lockDown();
};

CompatibilityMatrix.prototype._reverseIndexes = function _reverseIndexes() {
    var hwt = this._.t;

    // jshint -W016

    _.forEach(hwt.d, function (entry, index) {
        hwt.dR[entry.model] = 0|index;
    });

    _.forEach(hwt.s, function (entry, index) {
        hwt.sR[entry.model] = 0|index;
    });
};

CompatibilityMatrix.prototype._lockDown = function lockdown() {
    this.inhaleRelease = this.inhaleHardware = nope;
    this.finalize = _.noop;

    function nope() {
        assert(false, 'matrix locked after hardware inhalation');
    }
};

CompatibilityMatrix.prototype._bindHardware = function(systemHardware, hardwareTables, systemStats) {
    this._cacheEntries(systemHardware, hardwareTables);

    var options = {
        shelves: this._bindShelves(systemHardware.shelves, systemHardware.drives, hardwareTables, false),
        embeddedShelves: this._bindShelves(systemHardware.embedded_shelves, systemHardware.drives, hardwareTables, true, systemStats),
        shelfPresets: this._bindShelfPresets(systemHardware.presets, systemHardware.embedded_shelves, hardwareTables),
        cards: this._bindCards(systemHardware.cards, hardwareTables)
    };

    this._outputEnvStatChecks();

    this.hardwareOptions = options;
};

CompatibilityMatrix.prototype._cacheEntries = function _cacheEntries(systemHardware, hardwareTables) {
    var _this = this,
        tables = this._.t,
        rsd = tables.rsd;

    _.forEach(systemHardware.shelves, cacheShelfHardwareTableEntry);
    _.forEach(systemHardware.embedded_shelves, cacheShelfHardwareTableEntry);
    _.forEach(systemHardware.drives, cacheDriveHardwareTableEntry);

    function cacheShelfHardwareTableEntry(entry) {
        // { shelf: n, os: [ ... ] }
        var shelfIndex = entry.shelf;
        tables.s[shelfIndex] = hardwareTables.shelves[shelfIndex];
    }

    function cacheDriveHardwareTableEntry(entry) {
        // { drive: n, os: [ ... ], shelves: [ ... ] }
        var driveIndex = entry.drive;
        tables.d[driveIndex] = hardwareTables.drives[driveIndex];

        // TODO: figure out how to do this more efficiently
        // using string addition rather than [].join saved 60%
        // but it still takes 2.5s
        _.forEach(entry.os, function (ri) {
            _.forEach(entry.shelves, function (si) {
                rsd[_this._mkRSDspec(ri, si, driveIndex)] = true;
            });
        });
    }
};

CompatibilityMatrix.prototype._mkRSDspec = function _mkRSDspec(ri, si, di) {
    // jshint -W016
    return ri<<24 | si<<16 | di;
};

CompatibilityMatrix.prototype._bindShelfPresets = function(systemShelfPresets, systemEmbeddedShelves, hardwareTables) {
    var _this = this,
        embeddedShelfPool = _.map(systemEmbeddedShelves, function(systemEmbeddedShelf) {
            return systemEmbeddedShelf.shelf;
        }),
        resolvedPresets = [];

    _.forEach(systemShelfPresets, function(systemShelfPreset) {
        var preset = hardwareTables.shelfPresets[systemShelfPreset.preset],
	        isEmbedded = _.contains(embeddedShelfPool, preset.ref.shelf),
            versions = _this._mapRawOsIntoReleaseVersions(systemShelfPreset.os),
            shelf = preset.shelf,
            stats = shelf.stats,
            weight = _(stats.weight).find({preset: systemShelfPreset.preset}),
            weight_g = weight ? weight.weight_g : 0,
            power_spec = _(stats.power).find({preset: systemShelfPreset.preset});

            _this._checkEnvironmentalStats(weight, power_spec, shelf, systemShelfPreset);

        if(!power_spec) {
            power_spec = {};
        }

        if (isEmbedded) {
            var embeddedOption = {
                    shelf: shelf,
                    isEmbedded: true,
                    drives: preset.drives,
                    power_spec: power_spec,
                    weight_g: weight_g,
                    versions: versions
                };

            resolvedPresets.push(embeddedOption);
        }

        if (!shelf.embedded_only) {
            var shelfOption = {
                    shelf: shelf,
                    isEmbedded: false,
                    drives: preset.drives,
                    power_spec: power_spec,
                    weight_g: weight_g,
                    versions: versions
                };

            resolvedPresets.push(shelfOption);
        }
    });

    return resolvedPresets;
};

CompatibilityMatrix.prototype._bindShelves = function(systemShelves, systemDrives, hardwareTables, embedded, systemStats) {
    var _this = this,
        // Only look for drives that work with the shelves we passed in here.
        systemShelfPool = _.map(systemShelves, 'shelf'),
        systemDrivesToUse = _.where(systemDrives, function(systemDrive) {
            return _.any(systemDrive.shelves, function(shelf) {
                return _.contains(systemShelfPool, shelf);
            });
        }),
        denormalizedShelves = [];

    _.forEach(systemDrivesToUse, function(systemDrive) {
        _.forEach(systemDrive.shelves, function(shelfIndex) {
            if (_.contains(systemShelfPool, shelfIndex)) {
                var shelf = hardwareTables.shelves[shelfIndex],
                    stats = shelf.stats,
                    weightStats = embedded ? systemStats.weight.with_internal : stats.weight,
                    weight = _(weightStats).find({drive: systemDrive.drive}),
                    weight_g = weight ? weight.weight_g : 0,
                    powerStats = embedded ? systemStats.power.with_internal : stats.power,
                    power_spec = _(powerStats).find({drive: systemDrive.drive});

                _this._checkEnvironmentalStats(weight, power_spec, shelf, systemDrive);

                if(!power_spec) {
                    power_spec = {};
                }

                var shelfOption = {
                    shelf: shelf,
                    isEmbedded: embedded,
                    drives: [{
                        quantity: stats.drive_slots * stats.drives_per_carrier,
                        drive: hardwareTables.drives[systemDrive.drive]
                    }],
                    power_spec: power_spec,
                    weight_g: weight_g,
                    versions: _this._mapRawOsIntoReleaseVersions(systemDrive.os)
                };

                denormalizedShelves.push(shelfOption);
            }
        });
    });

    return denormalizedShelves;
};

CompatibilityMatrix.prototype._checkEnvironmentalStats = function(weight, power_spec, shelf, indexObject) {
    if(this._showEnvStatChecks) {
        var _this = this;

        var addEnvCheckMessage = function(msg) {
            if(!_this._envStatChecks[msg]){
                _this._envStatChecks[msg] = {};
            }

            if (indexObject.drive) {
                _this._envStatChecks[msg][':drive:'+indexObject.drive+',shelf:'+shelf] = [shelf, indexObject];
            } else if (indexObject.preset) {
                _this._envStatChecks[msg][':preset:'+indexObject.preset+',shelf:'+shelf] = [shelf, indexObject];
            }
        };


        if(weight && power_spec) {
            //console.warn('found env stats for:', indexObject, shelf);
            //addEnvCheckMessage('found');
        }

        if(!weight) {
            //console.warn('could not find weight spec for drive:', indexObject, shelf);
            addEnvCheckMessage('missing-weight');
        }

        if(!power_spec) {
            //console.warn('could not find power_spec for drive:', indexObject, shelf);
            addEnvCheckMessage('missing-power_spec');
        } else {
            if(!power_spec.v_100) {
                //console.warn('could not find power_spec.v_100 for drive:', indexObject, shelf);
                addEnvCheckMessage('missing-power_spec.v_100');
            }
            if(!power_spec.v_200) {
                //console.warn('could not find power_spec.v_200 for drive:', indexObject, shelf);
                addEnvCheckMessage('missing-power_spec.v_200');
            }
        }
    }
};

CompatibilityMatrix.prototype._outputEnvStatChecks = function() {
    if(this._showEnvStatChecks) {
        //_(this._envStatChecks).keys().forEach(function(k){console.log(k);});
        console.warn(this._envStatChecks);
    }
};

CompatibilityMatrix.prototype._bindCards = function(systemCards, platformCards) {
    var _this = this,
        denormalizedCards = [];

    _.forEach(systemCards, function(systemCard) {
        var cardOption = {
            card: platformCards[systemCard.card],
            assignments: _.map(systemCard.assignments, function(assignment) {
                return {
                    slots: assignment.slots,
                    versions: _this._mapRawOsIntoReleaseVersions(assignment.os)
                };
            }),
            versions: _this._mapRawOsIntoReleaseVersions(systemCard.os)
        };

        denormalizedCards.push(cardOption);
    });

    return denormalizedCards;
};

CompatibilityMatrix.prototype._mapRawOsIntoReleaseVersions = function(rawOsArray) {
    var _this = this;

    if (rawOsArray) {
        return _.without(_.map(rawOsArray, function(osKey) {
            return _this._getReleaseIfInTable(osKey);
        }), -1);
    }

    return [];
};

CompatibilityMatrix.prototype._getReleaseIfInTable = function(key) {
    if (this._.rik.indexOf(key) !== -1) {
        return this._.rbi[key].release;
    }

    return -1;
};

CompatibilityMatrix.prototype._osAgnosticIsEqual = function(obj, objb) {
    var limitKeys = _.without(_.keys(obj), '_os'),
        limitComp = [];

    limitComp = _.map(limitKeys, function(key) {
        if (!_.has(objb, key)) {
            return false;
        }

        return _.isEqual(obj[key], objb[key]);
    });

    return _.all(limitComp);
};

CompatibilityMatrix.prototype._safeArrayConcat = function(array1, array2) {
    var safeArray = [];

    if (array1) {
        safeArray = safeArray.concat(array1);
    }

    if (array2) {
        safeArray = safeArray.concat(array2);
    }

    return safeArray;
};

function measure(fn, name) {
    var tot = 0,
        first = true;

    name = name || fn.name || '(unknown)';

    function end(beginning) {
        var span = process.hrtime(beginning),
            sec = span[0] + span[1] / 1e9;
        tot = tot + sec;
    }

    return function measured() {
        if (first) {
            first = false;
            console.error('MEASURING:', name);
            process.on('exit', function () {
                console.error('MEASURED:', name, tot.toPrecision(5));
            });
        }

        var beg = process.hrtime(),
            res;
        try {
            res = fn.apply(this, arguments);
            end(beg);
            return res;
        } catch (err) {
            end(beg);
            throw err;
        }
    };
}

var FNAMES = [
        'inhaleRelease',
        'inhaleHardware',
        'finalize',
        '_cacheEntries',
        '_updateUniqueLimits',
        '_bindShelves',
        '_bindShelfPresets',
        '_bindCards'
    ];

if (process.env.SR_MEASURE_MATRIX) {
    _.forEach(FNAMES, function (fname) {
        CompatibilityMatrix.prototype[fname] = measure(CompatibilityMatrix.prototype[fname], fname);
    });
}

module.exports = CompatibilityMatrix;
