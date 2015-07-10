'use strict';

var assert = require('assert'),
    constants = require('../constants'),
    _ = require('lodash'),
    ConfigGroup = require('./config-group'),
    async = require('async');

var CONFIG_GROUPS = constants.CONFIG_GROUPS;

/**
 * Product information API
 * Provides data via search API
 * Does NOT provide compatibility filtering
 */

function ProductInfo(rawConfigData) {
    assert(this instanceof ProductInfo, 'use new');
    assert(typeof rawConfigData === 'object', 'rcd ' + typeof rawConfigData);
    this._initConfigGroups();
    this._rawConfigData = rawConfigData;
    this._inhaled = false;
}

/**
 * Get list of product lines. Each might have sub-lines. Those won't:
 * the depth limit is 2. Used for initial system configuration.
 */

ProductInfo.prototype.getConfigGroups = function getConfigGroups() {
    assert(this._inhaled);
    return this._configGroups;
};

/**
 * Get product line by ID and sub-line ID. Might not get used via public
 * API -- how would you get to it? Used for testing, though.
 */

ProductInfo.prototype.getConfigGroup = function getConfigGroup(id, subid) {
    assert(this._inhaled);
    var matches =  _.where(this._configGroups, { id: id });
    assert.equal(matches.length, 1, 'subgroup lookup ' + id);
    var group = matches[0];

    if (subid) {
        return group.getSubGroup(subid);
    } else {
        return group;
    }
};

ProductInfo.prototype._initConfigGroups = function _initConfigGroups() {
    this._configGroups = _.map([{
        id: CONFIG_GROUPS.FAS,
        title: 'Fabric-Attached Storage',
        subtitle: 'Data ONTAP',
        img: '../media/img/FAS8020_front_view.png',
        enabled: true,

        subGroups: [{
            id: CONFIG_GROUPS.FAS_CMODE_NORMAL,
            title: 'Clustered Data ONTAP',
            enabled: true
        }, {
            id: CONFIG_GROUPS.FAS_7MODE_NORMAL,
            title: '7-Mode',
            enabled: true
        }, {
            id: CONFIG_GROUPS.FAS_7MODE_MC,
            title: 'MetroCluster',
            enabled: false
        }, {
            id: CONFIG_GROUPS.FAS_CMODE_MCC,
            title: 'Clustered Metro Cluster',
            enabled: false
        }, {
            id: CONFIG_GROUPS.FAS_VSERIES,
            title: 'V Series',
            enabled: false
        }]
    }, {
        id: CONFIG_GROUPS.E,
        title: 'E-Series',
        subtitle: 'SANtricity',
        img: '../media/img/E2660_front_view.png',
        enabled: true,
        subGroups: [{
            id: CONFIG_GROUPS.E_NORMAL,
            title: 'E-Series',
            enabled: true
        }, {
            id: CONFIG_GROUPS.EF_NORMAL,
            title: 'EF-Series',
            enabled: true
        }],
    }], ConfigGroup);
};

/**
 * Determines line and sub-line for existing system.
 */
ProductInfo.prototype.determineConfigGroup = function determineConfigGroup(hagroup) {
    assert(this._inhaled);
    assert(hagroup, 'Cannot determine config group without hagroup');

    var availableGroups = _.where(this._configGroups, function(group) {
        var haGroupModelName = hagroup._model || hagroup.model;

        // V-Series is FAS
        if (group.id === CONFIG_GROUPS.FAS && haGroupModelName && haGroupModelName.toUpperCase().indexOf(CONFIG_GROUPS.FAS_VSERIES) === 0) {
            return true;
        }

        return haGroupModelName && haGroupModelName.toUpperCase().indexOf(group.id) === 0; // Removing this so we always get options back '&& group.enabled'
    });

    if (availableGroups.length > 0) {
        if (availableGroups.length > 1) {
            // Determine the most relevant match
            availableGroups = _.sortBy(availableGroups, function(availableGroup) {
                return availableGroup.id.length * -1;
            });
        }

        var group = _.first(availableGroups);

        if (group.subGroups.length > 0) {
            var subgroup = null;

            // We have sub-groups too
            if (group.id === CONFIG_GROUPS.FAS) {
                if (hagroup.is_clustered && hagroup.is_metrocluster) {
                    subgroup = CONFIG_GROUPS.FAS_CMODE_MCC;
                }
                else if (hagroup.is_clustered) {
                    subgroup = CONFIG_GROUPS.FAS_CMODE_NORMAL;
                }
                else if (hagroup.is_metrocluster) {
                    subgroup = CONFIG_GROUPS.FAS_7MODE_MC;
                }
                else {
                    subgroup = CONFIG_GROUPS.FAS_7MODE_NORMAL;
                }
            }

            if (group.id === CONFIG_GROUPS.E) {
                var model = hagroup.model || hagroup._model;

                if (model.indexOf('EF') === 0) {
                    subgroup = CONFIG_GROUPS.EF_NORMAL;
                }
                else {
                    subgroup = CONFIG_GROUPS.E_NORMAL;
                }
            }

            return this.getConfigGroup(group.id, subgroup);
        }

        return this.getConfigGroup(group.id);
    }

    return [];
};

/**
 * Fetch the config for an existing system.
 */

ProductInfo.prototype.getConfig = function getConfig(hagroup) {
    assert(this._inhaled);
    var group = this.determineConfigGroup(hagroup);
    return group.getConfig(hagroup._model);
};

ProductInfo.prototype.inhale = function inhale(callback) {
    assert(!this._inhaled);

    var rawConfigData = this._rawConfigData,
        rawTasks = [
            this._inhaleLimits,
            this._inhaleReleases,
            this._inhaleShelves,
            this._inhaleDrives,
            this._inhaleShelfPresets,
            this._inhaleCards,
            this._inhalePlatforms
        ],
        tasks = _.map(rawTasks, cookTask, this);

    async.series(tasks, afterInhalation.bind(this));

    function afterInhalation(err) {
        // jshint -W040
        assert(this instanceof ProductInfo);

        if (!err) {
            this._inhaled = true;
        }
        return callback(err);
    }

    function cookTask(fn) {
        // jshint -W040
        assert(this instanceof ProductInfo);

        if (fn.length === 2) {
            return fn.bind(this, rawConfigData); // assume takes rawData, callback
        }

        var _task = _.bind(task, this);
        return _.bind(setImmediate, this, _task);

        function task(_callback) {
            assert(this instanceof ProductInfo);
            try {
                fn.call(this, rawConfigData);
                setImmediate(_callback, null);
            } catch (err) {
                console.error(err.stack);
                setImmediate(_callback, err);
            }
        }
    }
};

ProductInfo.prototype._inhaleLimits = function _inhaleLimits(rawConfigData) {
    assert.notEqual(rawConfigData.limits, undefined);
    this._limits = rawConfigData.limits;
};

ProductInfo.prototype._inhaleReleases = function _inhaleReleases(rawConfigData) {
    var families = this._inhaleReleaseFamilies(rawConfigData),
        seen = {};

    function cookAndLinkRelease(rawRelease) {
        var longVersion = rawRelease.version;

        assert.equal(_.has(seen, longVersion), false, 'dup version ' + longVersion);

        var release = {
            family: families[rawRelease.family], // -> our family object
            version: longVersion,
            sys_version: getShortVersion(longVersion),
            cMode: rawRelease.clustered,
            status: rawRelease.release_status,
        };

        release.family.releases.push(release);
        return release;
    }

    this._releases = _.map(rawConfigData.os_releases, cookAndLinkRelease);
};

function getShortVersion(longVersion) {
    assert.equal(typeof longVersion, 'string');
    var segments = longVersion.split(' ');
    return segments[0];
}

ProductInfo.prototype._inhaleReleaseFamilies = function _inhaleReleaseFamilies(rawConfigData) {
    function cookFamily(rawFamily) {
        var family = {
            name: rawFamily.name,
            releases: [] // -> all releases in this family
        };

        return family;
    }

    return (
        this._families = _.map(rawConfigData.os_families, cookFamily)
    );
};

ProductInfo.prototype._inhaleShelves = function _inhaleShelves(rawConfigData) {
    this._shelves = rawConfigData.shelves;
};

ProductInfo.prototype._inhaleDrives = function _inhaleDrives(rawConfigData) {
    this._drives = _.map(rawConfigData.drives, function fixDrive(drive) {
        switch (drive.fp_support) {
            case 'yes':
                drive.fp_support = true;
                break;
            case 'no':
                drive.fp_support = false;
                break;
            default:
                break;
        }
        return drive;
    });
};

ProductInfo.prototype._inhaleCards = function _inhaleCards(rawConfigData) {
    this._cards = rawConfigData.cards;
};

ProductInfo.prototype._inhaleShelfPresets = function _inhaleShelfPresets(rawConfigData) {
    assert(this._shelves, 'Please inhale shelves first');
    assert(this._drives, 'Please inhale drives first');

    var _this = this;

    this._shelfPresets = _.map(rawConfigData.presets, function(shelfPreset) {
        var shelfDrives = [];

        _.forEach([shelfPreset.primary, shelfPreset.secondary], function(shelfDrive) {
            if (shelfDrive) {
                shelfDrives.push({
                    quantity: shelfDrive.quantity,
                    drive: _this._drives[shelfDrive.drive]
                });
            }
        });

        return {
            ref: shelfPreset,
            shelf: _this._shelves[shelfPreset.shelf],
            drives: shelfDrives
        };
    });
};

ProductInfo.prototype._inhalePlatforms = function _inhalePlatforms(rawConfigData, callback) {
    assert(this instanceof ProductInfo);
    assert(rawConfigData);

    this._systemConfigs = {};

    var rawPlatforms = rawConfigData.platforms,
        inhalePlatform = _.bind(this._inhalePlatform, this),
        callbacklater = this.delay(callback);

    async.eachSeries(rawPlatforms, inhalePlatform, callbacklater);
};

ProductInfo.prototype._inhalePlatform = function _inhalePlatform(rawPlatform, callback) {
    // raw.platforms.0
    assert(this instanceof ProductInfo);
    assert.equal(typeof rawPlatform, 'object');
    assert.equal(typeof callback, 'function');

    var groupID = this._getPrimaryConfigGroupIDGivenEpicFamily(rawPlatform.family),
        primaryConfigGroup = _(this._configGroups).where({ id: groupID }).first(),
        inhaleModelIntoPrimaryConfigGroup = _.bind(this._inhaleModel, this, primaryConfigGroup),
        callbacklater = this.delay(callback);

    async.eachSeries(rawPlatform.models, inhaleModelIntoPrimaryConfigGroup, callbacklater);
};

ProductInfo.prototype._inhaleModel = function _inhaleModel(configGroup, rawModel, callback) {
    // raw.platforms.0.models.0
    assert(this instanceof ProductInfo);
    assert.equal(typeof configGroup, 'object');
    assert.equal(typeof rawModel, 'object');
    assert.equal(typeof callback, 'function');

    assert(configGroup instanceof ConfigGroup);
    assert(_.isPlainObject(rawModel));

    var controllerModel = rawModel.platform,
        inhaleSystem = _.bind(this._inhaleSystem, this, configGroup, controllerModel),
        callbacklater = this.delay(callback);

    async.eachSeries(rawModel.systems, this.asyncify(inhaleSystem), callbacklater);
};

ProductInfo.prototype._inhaleSystem = function _inhaleSystem(configGroup, controllerModel, rawSystem) {
    // raw.platforms.0.models.0.systems.0

    assert(configGroup instanceof ConfigGroup);
    assert(typeof controllerModel === 'string');

    var _this = this,
        hardwareTables = {
            cards: this._cards,
            drives: this._drives,
            shelfPresets: this._shelfPresets,
            shelves: this._shelves,
        };

    _.forEach(rawSystem.os_limits, function (limitBlock) {
        var limits = _this._limits[limitBlock.limits],
            firstRelease = _this._releases[limitBlock.os[0]], // OK because consistent isCmode
            isCmode = firstRelease.cMode,
            subGroupID = _this._getSubGroupGivenEpicData(configGroup, rawSystem, isCmode),
            subGroup = configGroup.getSubGroup(subGroupID),
            config = subGroup.inhaleRawSystem(rawSystem, controllerModel);

        // now fill in systemConfig.uniqueLimits with objects
        // pointing to both the distinct limits and the full
        // release object responsible for them
        _.forEach(limitBlock.os, function (releaseIndex) {
            var release = _.extend(_this._releases[releaseIndex], { _index: releaseIndex }); // May be able to remove this
            config.matrix.inhaleRelease(release, limits);
        });

        config.matrix.inhaleHardware(rawSystem.hardware, hardwareTables, config.stats);

        if (config.isEmbedded) {
            if (!config.stats.power.power_spec) {
                config.stats.power.power_spec = {}; // TODO stats for no internal drive selected
            }

            if (!config.stats.weight.weight_g) {
                config.stats.weight.weight_g = 0; // TODO stats for no internal drive selected
            }
        }
    });
};

// parse data from the outside world for categorisation

ProductInfo.prototype._getPrimaryConfigGroupIDGivenEpicFamily = function(rawFamily) {
    // ignores after-digit strings because we've got dashes, spaces,
    // and other oddities to deal with that don't matter to this function:
    var match = rawFamily.match(/^([A-Z]+)([0-9\-]+)/);
    assert.notEqual(match, null, 'cannot parse model family: ' + rawFamily);

    switch (match[1]) {

    case 'E':
        return CONFIG_GROUPS.E;

    case 'EF':
        return CONFIG_GROUPS.E;

    case 'FAS':
        return CONFIG_GROUPS.FAS;

    case 'V':
        return CONFIG_GROUPS.FAS;

    }

    assert.fail(
        match[1],
        'E, FAS, or V',
        'unknown model prefix' + match[1] + ' for ' + rawFamily,
        'match');
};


// should we move this to ConfigGroup?

ProductInfo.prototype._getSubGroupGivenEpicData = function(configGroup, rawSystem, isClustered) {
    var isMetro = rawSystem.config.match(/Metro/) !== null,
        isMCC = rawSystem.name.match(/MCC/) !== null,
        isEF = rawSystem.name.match(/EF/) !== null;

    /* MCC (MetroCluster CMode) Rules
        MCC systems run Clustered-Data OnTAP
    */

    switch (configGroup.id) {

    case CONFIG_GROUPS.E:
        if (isEF) {
            return CONFIG_GROUPS.EF_NORMAL;
        }
        else {
            return CONFIG_GROUPS.E_NORMAL;
        }
        break;

    case CONFIG_GROUPS.FAS:
        if (isClustered) {
            if (isMCC) {
                return CONFIG_GROUPS.FAS_CMODE_MCC;
            }
            else if (!isMCC && !isMetro) {
                return CONFIG_GROUPS.FAS_CMODE_NORMAL;
            }
            else {
                assert.equal(isMetro, false, 'c-mode MC unsupported');
            }
        } else {
            if (isMetro) {
                return CONFIG_GROUPS.FAS_7MODE_MC;
            } else {
                return CONFIG_GROUPS.FAS_7MODE_NORMAL;
            }
        }
        break;
    }

    assert.fail(
        configGroup.id,
        'E, EF, or FAS',
        'unknown config group ' + configGroup.id,
        '=');
};

ProductInfo.prototype.getDriveByModel = function(driveModel) {
    assert(this._inhaled);
    return _.find(this._drives, function(d) { return d.model === driveModel; });
};

ProductInfo.prototype.delay = function delay(callback) {
    return function delayed() {
        var args = _.toArray(arguments);
        setImmediate(later, 1);

        function later() {
            // jshint -W040
            callback.apply(this, args);
        }
    };
};

ProductInfo.prototype.asyncify = function asyncify(fn) {
    assert(this instanceof ProductInfo);
    return _.bind(asyncFn, this);

    function asyncFn() {
        // jshint -W040
        var args = _.toArray(arguments),
            callback = args.pop();

        assert(this instanceof ProductInfo);
        assert.equal(typeof callback, 'function');

        try {
            var returnValue = fn.apply(this, args);
            setImmediate(callback, returnValue);
        } catch (err) {
            setImmediate(callback, err);
        }
    }
};

module.exports = ProductInfo;
