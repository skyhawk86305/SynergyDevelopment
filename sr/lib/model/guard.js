'use strict';

var assert = require('assert'),
    _ = require('lodash'),
    AggregateReporter = require('./aggregates/aggregateReporter.js'),
    Spec = require('./spec'),
    modelUtil = require('./util'),
    lcprop = require('../lcprop'),
    Policies = require('../policies'),
    Unit = require('../units.js');

function Guard(map, addingTo, options) {
    assert.equal(typeof map, 'object', 'map object');
    assert.equal(typeof addingTo, 'object', 'addingTo object');
    assert.equal(_.isEmpty(addingTo), false, 'bad addingTo selector');
    assert(options === undefined || _.isPlainObject(options), 'bad options');

    this._map = map;
    this._addingTo = addingTo;
    this._addingToHagroups = addingTo.id ? [] : this._getHagroups(map.resolveSelection(addingTo));
    this._impactedHagroups = this._getImpactedHagroups(addingTo);
    this._options = options || {};
    this._proposals = [];

    _.bindAll(this);
}

Guard.prototype.addingSystem = function addingSystem(replacing) {
    assert(replacing === undefined || typeof replacing === 'object', 'bad replacing selector');

    var resolvedReplacing = this._resolveReplacing(replacing),
        replacingHagroups = this._getHagroups(resolvedReplacing);

    var hagroups = this._addingToHagroups.concat(replacingHagroups),
        configGroups = this._addingTo.id ? [this._addingTo] : this._getUniqueConfigGroups(hagroups),
        configGroup = _.first(configGroups);

    // We cannot offer any configs without a config group to query.
    // We do not support mixing different config groups in the same cluster.
    assert(configGroups.length, 'no config group');
    assert.equal(configGroups.length, 1, 'multiple config groups');

    var inspector = this._addingTo.id ? null : this._map.inspect(_.first(hagroups)),
        nodeSummary = inspector ? inspector.nodeSummary(resolvedReplacing) : {},
        versionLimits = inspector ? inspector.versionRange(resolvedReplacing) : undefined;

    this._buildSystemOptions(configGroup, versionLimits);

    this._applyAggregateLimits(resolvedReplacing);
    this._applyConfigLimits(configGroup);
    this._applyClusterLimits(nodeSummary, versionLimits);
    this._applyHagroupLimits(resolvedReplacing);
    this._applyHardwareLimits(replacingHagroups);

    return this._proposals;
};

Guard.prototype.deletingSystem = function deletingSystem(replacing) {
    assert(typeof replacing === 'object', 'bad replacing selector');

    var resolvedReplacing = this._resolveReplacing(replacing),
        replacingHagroups = this._getHagroups(resolvedReplacing);

    assert(replacingHagroups.length, 'no hagroup');

    var map = this._map,
        addingToHagroups = this._addingToHagroups,
        ejecting = _.reduce(replacingHagroups, getEjecting, replacingHagroups),
        hagroups = remainingHagroups(ejecting),
        versionLimits = commonVersionLimits(hagroups);

    function getEjecting(ejecting, system) {
        return ejecting.concat(system.shelves);
    }

    function remainingHagroups(ejecting) {
        var hagroups = _.where(ejecting, { _type: 'hagroup' });

        return _.filter(addingToHagroups, isNotReplacing);

        function isNotReplacing(hagroup) {
            return !_.some(hagroups, { _id: hagroup._id });
        }
    }

    function commonVersionLimits(hagroups) {
        return _.reduce(hagroups, intersection, undefined);

        function intersection(range, hagroup) {
            var inspector = map.inspect(hagroup),
                systemRange = inspector.versionRange(ejecting);

            return range ? _.intersection(range, systemRange) : systemRange;
        }
    }

    this._buildVersionOptions(versionLimits);
    this._applyVersionChangeLimits(hagroups);

    var wrapped = _(this._proposals).sortBy('newVersion'),
        pinned = this._options.version,
        proposal;

    if (pinned) {
        proposal = wrapped.where({ newVersion: pinned }).last();
    } else {
        var enabled = wrapped.where(function isEnabled(config) {
                return _.isEmpty(config.conflicts);
            });

        proposal = enabled.isEmpty() ? wrapped.last() : enabled.last();
    }

    return [proposal];
};

Guard.prototype.addingShelf = function addingShelf(replacing) {
    assert(replacing === undefined || typeof replacing === 'object', 'bad replacing selector');
    assert(this._addingToHagroups.length, 'no hagroup');

    // This is dangerous!
    // Refuse multiple hagroups or consider options for all of them - do not just grab the first.
    var hagroup = _.first(this._addingToHagroups),
        inspector = this._map.inspect(hagroup);

    var resolvedReplacing = this._resolveReplacing(replacing),
        nodeSummary = inspector.nodeSummary(resolvedReplacing),
        versionLimits = inspector.versionRange(resolvedReplacing);

    this._buildShelfOptions(inspector, versionLimits, resolvedReplacing.length);

    this._applyAggregateLimits(resolvedReplacing);
    this._applyClusterLimits(nodeSummary, versionLimits);
    this._applyHagroupLimits(resolvedReplacing);
    this._applyEmbeddedLimits(resolvedReplacing);

    return this._proposals;
};

Guard.prototype.deletingShelf = function deletingShelf(replacing) {
    assert(typeof replacing === 'object', 'bad replacing selector');
    assert(this._addingToHagroups.length, 'no hagroup');

    var resolvedReplacing = this._resolveReplacing(replacing),
        replacingHagroups = this._getHagroups(resolvedReplacing),
        hagroups = this._addingToHagroups.concat(replacingHagroups);

    var hagroup = _.first(hagroups),
        inspector = this._map.inspect(hagroup),
        ejectingShelves = _.where(resolvedReplacing, { _type: 'shelf', _isembedded: false }),
        versionLimits = inspector.versionRange(ejectingShelves);

    this._buildVersionOptions(versionLimits);
    this._applyVersionChangeLimits(hagroups);

    var wrapped = _(this._proposals).sortBy('newVersion'),
        pinned = this._options.version,
        proposal;

    if (pinned) {
        proposal = wrapped.where({ newVersion: pinned }).last();
    } else {
        var enabled = wrapped.where(function isEnabled(config) {
                return _.isEmpty(config.conflicts);
            });

        proposal = enabled.isEmpty() ? wrapped.last() : enabled.last();
    }

    var map = this._map,
        shelves = _.where(resolvedReplacing, { _type: 'shelf' }),
        usedByManual = _.some(shelves, isUsedByManual);

    function isUsedByManual(shelf) {
        return map.inspect(shelf).isUsedByManualAggregate();
    }

    if (usedByManual) {
        this._disable(proposal, 'aggr.manual', true, false);
    }

    return [proposal];
};

Guard.prototype.policies = function policies() {
    assert(this._addingToHagroups.length, 'no hagroup');

    // Guard will prevent mixing product lines, so this is safe.
    var hagroup = _.first(this._addingToHagroups),
        inspector = this._map.inspect(hagroup);

    this._buildPolicyOptions();
    this._applyPolicyLimits(inspector.productLine);

    return this._proposals;
};

Guard.prototype.changingVersion = function changingVersion(replacing) {
    assert(typeof replacing === 'object', 'bad replacing selector');

    var resolvedReplacing = this._resolveReplacing(replacing),
        replacingHagroups = this._getHagroups(resolvedReplacing),
        hagroups = this._addingToHagroups.concat(replacingHagroups);

    assert(hagroups.length, 'no hagroup');

    var hagroup = _.first(hagroups),
        inspector = this._map.inspect(hagroup),
        versionLimits = inspector.versionRange();

    this._buildVersionOptions(versionLimits);
    this._applyVersionChangeLimits(hagroups);

    return _.sortBy(this._proposals, 'newVersion');
};

Guard.prototype._buildSystemOptions = function _buildSystemOptions(configGroup, versionLimits) {
    this._proposals = _.map(configGroup.where({}), buildProposal, this);

    function buildProposal(config) {
        // jshint -W040
        var map = this._map,
            clonedConfig = _.clone(config),
            versions = clonedConfig.matrix.versions,
            vRange = versionLimits ? _.intersection(versions, versionLimits) : versions;

        var shelf = config.isEmbedded ? this._getDefaultEmbeddedShelf(config, vRange) : {},
            shelfVersions = _.compact(_.pluck(shelf.versions, 'version')),
            version = this._getLatestVersion(versions, versionLimits, shelfVersions) || '',
            limits = version ? clonedConfig.matrix.getLimitsForVersion(version) : {};

        lcprop(clonedConfig, 'buildSpec', function makeBuildMethod() {
            return (new Spec(map, clonedConfig)).build;
        });

        lcprop(clonedConfig, 'isEnabled', function isEnabled() {
            return _.isEmpty(clonedConfig.conflicts);
        });

        return _.assign(clonedConfig, {
            quantity: 1,
            groupId: configGroup.id,
            effects: { node: {}, drive: {}, shelf: {} },
            newVersion: version,
            newLimits: limits,
            newEmbeddedShelf: shelf,
            conflicts: []
        });
    }
};

Guard.prototype._buildShelfOptions = function _buildShelfOptions(inspector, versionLimits, count) {
    var matrix = inspector.config.matrix,
        shelves = inspector.getShelfConfigs(),
        map = this._map;

    this._proposals = _.map(shelves, buildProposal, this);

    function buildProposal(shelf) {
        // jshint -W040
        var clonedShelf = _.clone(shelf),
            versions = _.compact(_.pluck(clonedShelf.versions, 'version')),
            version = this._getLatestVersion(versions, versionLimits) || '',
            limits = version ? matrix.getLimitsForVersion(version) : {};

        lcprop(clonedShelf, 'buildSpec', function makeBuildMethod() {
            return (new Spec(map, clonedShelf)).build;
        });

        lcprop(clonedShelf, 'isEnabled', function isEnabled() {
            return _.isEmpty(clonedShelf.conflicts);
        });

        return _.assign(clonedShelf, {
            quantity: count || 1,
            effects: { node: {}, drive: {}, shelf: {} },
            newVersion: version,
            newLimits: limits,
            conflicts: []
        });
    }
};

Guard.prototype._buildPolicyOptions = function _buildPolicyOptions() {
    this._proposals = _.map(new Policies(), buildProposal);

    function buildProposal(policy) {
        lcprop(policy, 'isEnabled', function isEnabled() {
            return _.isEmpty(policy.conflicts);
        });

        return _.assign(policy, { conflicts: [] });
    }
};

Guard.prototype._buildVersionOptions = function _buildVersionOptions(versions) {
    this._proposals = _.map(versions, buildProposal);

    function buildProposal(version) {
        var option = {
            newVersion: version,
            conflicts: []
        };

        lcprop(option, 'isEnabled', function isEnabled() {
            return _.isEmpty(option.conflicts);
        });

        return option;
    }
};

Guard.prototype._resolveReplacing = function _resolveReplacing(replacing) {
    var resolved = this._map.resolveSelection(replacing),
        replacingHagroups = this._getHagroups(resolved);

    return _.reduce(replacingHagroups, function accumulate(resolved, hagroup) {
        var embedded = _.where(hagroup.shelves, { _type: 'shelf', _isembedded: true });

        Array.prototype.push.apply(resolved, embedded);
        return resolved;
    }, resolved);
};

Guard.prototype._getImpactedHagroups = function _getImpactedHagroups(addingTo) {
    var selector;

    if (_.has(addingTo, 'cluster')) {
        selector = _.pick(addingTo, ['installation', 'cluster']);
    } else if (_.has(addingTo, 'hagroup')) {
        selector = _.pick(addingTo, ['installation', 'hagroup']);
    }

    var selection = _.isEmpty(selector) ? [] : this._map.resolveSelection(selector),
        hagroups = this._getHagroups(selection);

    return hagroups;
};

Guard.prototype._getHagroups = function _getHagroups(selection) {
    var clusters = _.where(selection, { _type: 'cluster' }),
        hagroups = _.reduce(clusters, accumulate, _.where(selection, { _type: 'hagroup' }));

    function accumulate(hagroups, cluster) {
        Array.prototype.push.apply(hagroups, cluster.hagroups);
        return hagroups;
    }

    return hagroups;
};

Guard.prototype._getUniqueConfigGroups = function _getUniqueConfigGroups(hagroups) {
    var configGroups = _.reduce(hagroups, accumulate, [], this);

    function accumulate(configGroups, hagroup) {
        // jshint -W040
        var hagroupInspector = this._map.inspect(hagroup),
            configGroup = hagroupInspector.configGroup,
            isNewConfig = !_.some(configGroups, { id: configGroup.id });

        if (isNewConfig) {
            configGroups.push(configGroup);
        }

        return configGroups;
    }

    return configGroups;
};

Guard.prototype._getDefaultEmbeddedShelf = function _getDefaultEmbeddedShelf(config, versionRange) {
    var hagroup = _.first(this._addingToHagroups) || {},
        externalShelves = _.where(hagroup.shelves || [], { _isembedded: false }),
        encryptionLimit = isEncrypted();

    var shelfConfigs = getEmbeddedConfigs(config.matrix.hardwareOptions),
        filtered = _.filter(shelfConfigs, matchesEncryption),
        sorted = _.sortBy(filtered, isShelfEoa),
        shelf = _.find(sorted, inVersionRange) || {};

    function getEmbeddedConfigs(hardware) {
        var configs = [];

        Array.prototype.push.apply(configs, hardware.embeddedShelves);
        Array.prototype.push.apply(configs, hardware.shelfPresets);

        return _.where(configs, { isEmbedded: true });
    }

    function isEncrypted() {
        var result;

        if (!_.isEmpty(externalShelves)) {
            result = _.some(externalShelves, hasEncryptedDrive);
        }

        function hasEncryptedDrive(shelf) {
            var specs = shelf._x_bom ? shelf._x_bom.drive_specs || [] : [];

            return _.some(specs, isEncryptedDrive);
        }

        function isEncryptedDrive(drive) {
            return drive.encrypted;
        }

        return result;
    }

    function matchesEncryption(shelfConfig) {
        if (encryptionLimit === undefined) {
            return true;
        } else {
            var areDrivesEncrypted = _.some(shelfConfig.drives, isDriveEncrypted);

            return areDrivesEncrypted === encryptionLimit;
        }
    }

    function isDriveEncrypted(driveConfig) {
        return driveConfig.drive.encrypted;
    }

    function isShelfEoa(shelfConfig) {
        var isShelfSellable = shelfConfig.shelf.sellable,
            areDrivesSellable = _.every(shelfConfig.drives, isDriveSellable);

        return !(isShelfSellable && areDrivesSellable);
    }

    function isDriveSellable(driveConfig) {
        return driveConfig.drive.sellable;
    }

    function inVersionRange(shelf) {
        var versions = _.compact(_.pluck(shelf.versions, 'version')),
            subSet = versionRange ? _.intersection(versions, versionRange) : versions;

        return subSet.length ? true : false;
    }

    return shelf;
};

Guard.prototype._getLatestVersion = function _getLatestVersion(versions, limits, adding) {
    var pinned = this._options.version,
        common = pinned ? _.intersection(versions, [pinned]) : versions,
        wrapped = _(common);

    var combined = _.isEmpty(adding) ? limits : combineLimits(limits, adding);

    function combineLimits(limits, adding) {
        return limits ? _.intersection(limits, adding) : adding;
    }

    return combined ? wrapped.intersection(combined).sort().last() : wrapped.sort().last();
};

Guard.prototype._applyAggregateLimits = function _applyAggregateLimits(ejecting) {
    var map = this._map,
        shelves = _.where(ejecting, { _type: 'shelf' }),
        usedByManual = _.some(shelves, isUsedByManual);

    function isUsedByManual(shelf) {
        return map.inspect(shelf).isUsedByManualAggregate();
    }

    if (usedByManual) {
        _.forEach(this._proposals, function applyLimits(candidate) {
            this._disable(candidate, 'aggr.manual', true, false);
        }, this);
    }
};

Guard.prototype._applyConfigLimits = function _applyConfigLimits(configGroup) {
    var addingLine = configGroup.parent ? configGroup.parent.id : configGroup.id,
        existingLine = this._sampleProductLine();

    if (existingLine && (existingLine !== addingLine)) {
        _.forEach(this._proposals, function applyLimits(candidate) {
            this._disable(candidate, 'productLine', existingLine, addingLine);
        }, this);
    }

    _.forEach(this._proposals, function enforceLimits(candidate) {
        this._enforceConfigLimit(candidate, configGroup);
        this._enforceEmbeddedShelf(candidate);  // TODO: Really does not belong here
    }, this);
};

Guard.prototype._applyClusterLimits = function _applyClusterLimits(summary, versions) {
    _.forEach(this._proposals, function enforceLimits(candidate) {
        this._enforceNodeLimit(candidate, summary);
        this._enforceVersionLimit(candidate, versions);
    }, this);
};

Guard.prototype._applyHagroupLimits = function _applyHagroupLimits(ejecting) {
    _.forEach(this._addingToHagroups, function applyLimits(hagroup) {
        if (!this._map.inspect(hagroup).isESeries) {
            _.forEach(this._proposals, function enforceLimits(candidate) {
                var isEncrypted = this._getEncryptionLimit(candidate, hagroup, ejecting);

                this._enforceEncryptionLimit(candidate, isEncrypted);
            }, this);
        }
    }, this);

    _.forEach(this._impactedHagroups, function applyLimits(hagroup) {
        var hagroupInspector = this._map.inspect(hagroup),
            shelfDriveSummary = hagroupInspector.shelfDriveSummary(ejecting);

        _.forEach(this._proposals, function enforceLimits(candidate) {
            var summary = this._addEmbeddedCounts(shelfDriveSummary, candidate);

            this._enforceAggregateLimit(candidate, hagroupInspector);
            this._enforceCapacityLimit(candidate, summary);
            this._enforceDriveLimit(candidate, summary);
            this._enforceShelfLimit(candidate, summary);
        }, this);
    }, this);
};

Guard.prototype._applyHardwareLimits = function _applyHardwareLimits(hagroups) {
    _.forEach(this._proposals, enforceLimits, this);

    function enforceLimits(candidate) {
        var shelfConfigs = getExternalShelfConfigs(candidate.matrix.hardwareOptions);

        // jshint -W040
        _.forEach(hagroups, _.partial(checkShelves, shelfConfigs, candidate), this);
    }

    function getExternalShelfConfigs(hardware) {
        var configs = [];

        Array.prototype.push.apply(configs, hardware.shelves);
        Array.prototype.push.apply(configs, hardware.shelfPresets);

        return _.where(configs, { isEmbedded: false });
    }

    function checkShelves(shelfConfigs, candidate, hagroup) {
        var shelves = _.where(hagroup.shelves, { _isembedded: false }),
            hasBadShelf = _.some(shelves, function noMatches(shelf) {
                return noMatchingShelfConfig(shelf, shelfConfigs);
            });

        if (hasBadShelf) {
            // jshint -W040
            this._disable(candidate, 'hardware.shelf', true, false);
        }
    }

    function noMatchingShelfConfig (shelf, configs) {
        var shelfConfig = modelUtil.chooseClosestShelfConfig(shelf, configs);

        return shelfConfig ? false : true;
    }
};

Guard.prototype._applyEmbeddedLimits = function _applyEmbeddedLimits(ejecting) {
    _.forEach(this._proposals, enforceLimits, this);

    function enforceLimits(candidate) {
        // jshint -W040
        this._enforceEmbeddedLimit(candidate, ejecting);
    }
};

Guard.prototype._applyPolicyLimits = function _applyPolicyLimits(productLine) {
    _.forEach(this._proposals, enforceLimits, this);

    function enforceLimits(policy) {
        if (!_.contains(policy.productLines, productLine)) {
            // jshint -W040
            this._disable(policy, 'productLine', policy.productLines, productLine);
        }
    }
};

Guard.prototype._applyVersionChangeLimits = function _applyVersionChangeLimits(hagroups) {
    _.forEach(this._proposals, checkImpactedHagroups, this);

    function checkImpactedHagroups(proposal) {
        // jshint -W040
        _.forEach(hagroups, _.partial(assertLimits, proposal), this);
    }

    function assertLimits(proposal, hagroup) {
        // jshint -W040
        var inspector = this._map.inspect(hagroup),
            summary = inspector.shelfDriveSummary(),
            limits = inspector.config.matrix.getLimitsForVersion(proposal.newVersion);

        if (limits.capacity_gb && (summary.capacity > limits.capacity_gb)) {
            this._disable(proposal, 'capacity_gb', limits.capacity_gb, summary.capacity);
        }

        _.forOwn(summary.drive || {}, function enforce(count, type) {
            var limit = limits.drive[type] || 0,
                attribute = 'drive.' + type;

            if (count > limit) {
                this._disable(proposal, attribute, limit, count);
            }
        }, this);

        if (limits.ext_shelves && (summary.shelf.external > limits.ext_shelves)) {
            this._disable(proposal, 'ext_shelves', limits.ext_shelves, summary.shelf.external);
        }

        var reporter = new AggregateReporter(inspector),
            cacheLimit = limits.cache_no_flash || 0,
            totalCacheCapacity = this._getTotalCacheCapacity(inspector, reporter);

        this._enforceFpSize(proposal, totalCacheCapacity, cacheLimit);

        if (limits.aggr) {
            this._enforceAggrSize(proposal, inspector, reporter, limits.aggr);
        }

        if (!inspector.isESeries) {
            this._enforceEncryptionLimit(proposal, this._getEncryptionLimit(proposal, hagroup));
        }
    }
};

// TODO: Envy - Refactor to account for this when building the option!
Guard.prototype._addEmbeddedCounts = function _addEmbeddedCounts(shelfDriveSummary, candidate) {
    var summary = _.cloneDeep(shelfDriveSummary),
        shelf = candidate.newEmbeddedShelf,
        capacity = 0,
        counts = {};

    if (!_.isEmpty(shelf)) {
        _.forEach(shelf.drives, function count(spec) {
            var quantity = spec.quantity,
                type = spec.drive.type,
                size = spec.drive.capacity.marketing || 0;

            capacity += size * quantity;
            counts[type] = (counts[type] || 0) + quantity;
        });

        var driveTotal = _.reduce(counts, function sum(driveTotal, count) {
            return driveTotal + count;
        }, 0);

        /* jshint -W069 */
        summary.capacity += capacity;
        summary.shelf.total++;
        summary.drive.total += driveTotal;
        summary.drive.fc += counts['FC'] || 0;
        summary.drive.sas += (counts['SAS'] || 0) + (counts['NL-SAS'] || 0);
        summary.drive.sata += (counts['SATA'] || 0) + (counts['MSATA'] || 0);
        summary.drive.ssd += counts['SSD'] || 0;
    }

    return summary;
};

Guard.prototype._enforceAggregateLimit = function _enforceAggregateLimit(candidate, inspector) {
    var reporter = new AggregateReporter(inspector),
        limits = candidate.newLimits;

    if (limits) {
        var cacheLimit = limits.cache_no_flash || 0,
            totalCacheCapacity = this._getTotalCacheCapacity(inspector, reporter);

        this._enforceFpSize(candidate, totalCacheCapacity, cacheLimit);

        if (limits.aggr) {
            this._enforceAggrSize(candidate, inspector, reporter, limits.aggr);
        }
    }
};

Guard.prototype._enforceAggrSize = function _enforceAggrSize(proposal, inspector, reporter, limit) {
    var usableLimit = limit.size_64_tb || 0,
        driveMin = limit.min_fp_drives || 0;

    _.forEach(inspector.hagroup.controllers, checkManualAggregateLimits, this);

    function checkManualAggregateLimits(controller) {
        var manual = _.where(controller.aggregates, { _manual: true, is_root_aggregate: false });

        // jshint -W040
        _.forEach(manual, checkLimits, this);
    }

    function checkLimits(aggregate) {
        var aggregateReport = reporter.createAggregateReport(aggregate, inspector.versionNumber),
            summary = aggregateReport.summary;

        var effectiveLimit = new Unit(usableLimit, 'TB'),
            effectiveLimitGB = effectiveLimit.value_gb,
            actualUsableGB = summary.usableCapacity,
            cacheDataDrives = summary.driveRoleSummary.cacheData;

        // jshint -W040
        if (usableLimit && (actualUsableGB > effectiveLimitGB)) {
            this._disable(proposal, 'aggr.size_64_tb', effectiveLimitGB, actualUsableGB);
        }

        if (driveMin && aggregate.is_hybrid && (driveMin > cacheDataDrives)) {
            this._disable(proposal, 'aggr.min_fp_drives', driveMin, cacheDataDrives);
        }
    }
};

Guard.prototype._enforceFpSize = function _enforceFpSize(proposal, actualCacheGB, limit) {
    var fpLimit = new Unit(limit, 'TB'),
        fpLimitGB = fpLimit.value_gb;

    if (limit && (actualCacheGB > fpLimitGB)) {
        this._disable(proposal, 'cache_no_flash', fpLimitGB, actualCacheGB);
    }
};

Guard.prototype._getTotalCacheCapacity = function _getTotalCacheCapacity(inspector, reporter) {
    var constraints = { _manual: true, is_root_aggregate: false, is_hybrid: true },
        totalCache = _.reduce(inspector.hagroup.controllers, sumController, 0);

    function sumController(totalCache, controller) {
        var fp = _.where(controller.aggregates, constraints);

        return totalCache + _.reduce(fp, sumAggregate, 0);
    }

    function sumAggregate(aggregateCache, fpAggregate) {
        var aggregateReport = reporter.createAggregateReport(fpAggregate, inspector.versionNumber),
            summary = aggregateReport.summary;

        return aggregateCache + summary.cacheCapacity;
    }

    return totalCache;
};

Guard.prototype._sampleProductLine = function _sampleProductLine() {
    var hagroup;

    _.forEach(this._map.installations, searchInstallation);

    function searchInstallation(installation) {
        if (installation.hagroups.length) {
            hagroup = installation.hagroups[0];
        } else if (installation.clusters.length) {
            _.forEach(installation.clusters, searchCluster);
        }
    }

    function searchCluster(cluster) {
        if (cluster.hagroups.length) {
            hagroup = cluster.hagroups[0];
        }
    }

    return hagroup ? this._map.inspect(hagroup).productLine : '';
};

Guard.prototype._getEncryptionLimit = function _getEncryptionLimit(candidate, hagroup, ejecting) {
    if (!_.isEmpty(candidate.newEmbeddedShelf)) {
        return _.some(candidate.newEmbeddedShelf.drives, isEncryptedSpec);
    }

    function isEncryptedSpec(spec) {
        return spec.drive.encrypted;
    }

    var shelves = this._remainingShelves(hagroup, ejecting),
        result;

    if (!_.isEmpty(shelves)) {
        result = _.some(shelves, hasEncryptedDrive);
    }

    function hasEncryptedDrive(shelf) {
        var specs = shelf._x_bom ? shelf._x_bom.drive_specs || [] : [];

        return _.some(specs, isEncryptedDrive);
    }

    function isEncryptedDrive(drive) {
        return drive.encrypted;
    }

    return result;
};

Guard.prototype._remainingShelves = function _remainingShelves(hagroup, ejecting) {
    var shelves = _.where(ejecting, { _type: 'shelf' });

    return _.filter(hagroup.shelves || [], function isNotReplacing(shelf) {
        return !_.some(shelves, { _id: shelf._id });
    });
};

Guard.prototype._enforceConfigLimit = function _enforceConfigLimit(candidate, configGroup) {
    if (!configGroup.enabled) {
        this._disable(candidate, 'enabled', true, false);
    }
};

// TODO: effect count would be off if we supported changing a group of hagroups
Guard.prototype._enforceNodeLimit = function _enforceNodeLimit(candidate, summary) {
    var peerLimit = summary.limits ? summary.limits.nas : undefined,
        candidateLimit = candidate.newLimits.nas_nodes || 0,
        limit = (peerLimit === undefined) ? candidateLimit : Math.min(peerLimit, candidateLimit);

    var peerCount = summary.quantity || 0,
        candidateCount = candidate.controllerCount || 0,
        count = peerCount + candidateCount;

    if (limit && (count > limit)) {
        this._disable(candidate, 'nas_nodes', limit, count);
    } else {
        candidate.effects.node.total = count;
        candidate.effects.node.limit = limit;
    }
};

Guard.prototype._enforceVersionLimit = function _enforceVersionLimit(candidate, limit) {
    var proposal;

    if (_.has(candidate, 'matrix')) {
        proposal = candidate.matrix.versions;
    } else {
        proposal = _.compact(_.pluck(candidate.versions, 'version'));
    }

    if (!candidate.newVersion) {
        this._disable(candidate, 'version', _.sortBy(limit), _.sortBy(proposal));
    } else {
        var v = limit ? _(proposal).intersection(limit).sort().value() : _(proposal).sort().value();

        candidate.effects.versions = v;
    }
};

Guard.prototype._enforceCapacityLimit = function _enforceCapacityLimit(candidate, summary) {
    var limit = _.isEmpty(candidate.newLimits) ? undefined : candidate.newLimits.capacity_gb;

    var capacity = _.reduce(candidate.drives, function sum(capacity, driveConfig) {
            var marketing = driveConfig.drive.capacity.marketing;

            return capacity + (marketing * driveConfig.quantity * candidate.quantity);
        }, summary.capacity);

    if (limit && (capacity > limit)) {
        this._disable(candidate, 'capacity_gb', limit, capacity);
    } else {
        candidate.effects.capacityGb = capacity;
    }
};

Guard.prototype._enforceDriveLimit = function _enforceDriveLimit(candidate, summary) {
    var limits = _.isEmpty(candidate.newLimits) ? undefined : candidate.newLimits.drive,
        counts = {};

    if (limits) {
        _.forEach(candidate.drives || [], function count(driveConfig) {
            var type = this._normalizeDriveType(driveConfig.drive.type);
            counts[type] = (counts[type] || 0) + (driveConfig.quantity * candidate.quantity);
        }, this);

        var total = _.reduce(counts, function sum(total, count) {
            return total + count;
        }, 0);

        counts.total = total;

        _.forOwn(summary.drive || {}, function enforce(existing, type) {
            var count = (counts[type] || 0) + existing,
                limit = limits[type] || 0,
                attribute = 'drive.' + type;

            if (count > limit) {
                this._disable(candidate, attribute, limit, count);
            } else {
                candidate.effects.drive[type] = count;
            }
        }, this);
    }
};

Guard.prototype._normalizeDriveType = function _normalizeDriveType(type) {
    switch (type) {
        case 'SATA': return 'sata';
        case 'FC': return 'fc';
        case 'SAS': return 'sas';
        case 'SSD': return 'ssd';
        case 'MSATA': return 'sata';
        case 'NL-SAS': return 'sas';
        default: return undefined;
    }
};

Guard.prototype._enforceShelfLimit = function _enforceShelfLimit(candidate, summary) {
    var limit = _.isEmpty(candidate.newLimits) ? undefined : candidate.newLimits.ext_shelves,
        isSystemCandidate = _.has(candidate, 'matrix'),
        newShelves = (isSystemCandidate || candidate.isEmbedded) ? 0 : candidate.quantity,
        count = summary.shelf.external + newShelves;

    if (limit && (count > limit)) {
        this._disable(candidate, 'ext_shelves', limit, count);
    } else {
        var newTotal = (isSystemCandidate && !candidate.isEmbedded) ? count : (count + 1);

        candidate.effects.shelf.total = newTotal;
        candidate.effects.shelf.external = count;
    }
};

Guard.prototype._enforceEncryptionLimit = function _enforceEncryptionLimit(candidate, limit) {
    var encrypted = _.some(candidate.drives, isEncryptedSpec);

    function isEncryptedSpec(spec) {
        return spec.drive.encrypted;
    }

    if ((limit !== undefined) && !_.isEmpty(candidate.drives) && (encrypted !== limit)) {
        this._disable(candidate, 'drive.nse', limit, encrypted);
    }
};

Guard.prototype._enforceEmbeddedLimit = function _enforceEmbeddedLimit(candidate, ejecting) {
    var shelves = _.where(ejecting, { _type: 'shelf' });

    if (_.isEmpty(shelves)) {
        if (candidate.isEmbedded) {
            this._disable(candidate, 'embedded', false, true);
        }
    } else {
        _.forEach(shelves, function checkEmbedded(shelf) {
            if (shelf._isembedded !== candidate.isEmbedded) {
                this._disable(candidate, 'embedded', shelf._isembedded, candidate.isEmbedded);
            }
        }, this);
    }
};

Guard.prototype._enforceEmbeddedShelf = function _enforceEmbeddedShelf(candidate) {
    if (candidate.isEmbedded && _.isEmpty(candidate.newEmbeddedShelf)) {
        this._disable(candidate, 'embeddedShelf', true, false);
    }
};

Guard.prototype._disable = function _disable(candidate, attribute, limit, proposal) {
    candidate.conflicts.push({
        attribute: attribute,
        limit: limit,
        proposal: proposal
    });
};

module.exports = Guard;
