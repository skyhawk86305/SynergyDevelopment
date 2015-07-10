'use strict';

var assert = require('assert'),
    _ = require('lodash');

function Spec(map, guardOption) {
    this._map = map;
    this._guardOption = guardOption;
    this.build = _.bind(this.build, this);
}

Spec.prototype.build = function build(addingTo, replacing, options) {
    assert.equal(typeof addingTo, 'object', 'addingTo object');
    assert.equal(_.isEmpty(addingTo), false, 'bad addingTo selector');
    assert(replacing === undefined || typeof replacing === 'object', 'bad replacing selector');
    assert(options === undefined || _.isPlainObject(options), 'bad options');

    // Refuse to build if we cannot resolve conflicts
    assert.equal(_.isEmpty(this._guardOption.conflicts), true, 'cannot resolve conflicts');

    // TODO: Just dump old guard code here for now - needs refactored
    return this._handleCreatingBuildSpecsFor(addingTo, replacing, this._guardOption, options);
};

Spec.prototype._addCurrentInstallationToSelector = function(selector) {
    if (!selector.installation) {
        selector = _.extend(selector, { installation: this._map.installations[0] });
    }
};

Spec.prototype._resolveSystemSelectorUsingMap = function(selector) {
    if (!selector) {
        return null;
    }

    var scaledSelector = _.omit(selector, 'shelf', 'drive');

    return this._resolveSelectorUsingMap(scaledSelector);
};

Spec.prototype._resolveSelectorUsingMap = function(selector) {
    if (!selector) {
        return null;
    }

    this._addCurrentInstallationToSelector(selector);
    var resolvedSelector = this._map.resolveSelection(selector);

    if (resolvedSelector) {
        return resolvedSelector;
    }
    else {
        return null;
    }
};

Spec.prototype._handleCreatingBuildSpecsFor = function(addingTo, replacing, selectedOption, options) {
    var resolvedAddingTo = this._resolveSystemSelectorUsingMap(addingTo),
        resolvedReplacing = this._resolveSelectorUsingMap(replacing),
        isAddingToExisting = !this._isSelectorConfigGroup(addingTo),
        version = this._determineVersionWithSelection(selectedOption),
        limits = this._determineLimitsWithSelection(selectedOption),
        specs = [];

    options = options || {};

    if (isAddingToExisting) {
        var systems = this._selectionToArrayOfSystems(resolvedAddingTo);

        specs = this._createSpecsForSystemGroup(systems, resolvedReplacing, selectedOption, version, limits, options);
    }
    else {
        // New standalone system
        var newSystem = this._createBaseBuildSpecFor(selectedOption, version, limits),
            defaultShelf = this._defaultShelfOptionForConfig(selectedOption, version, limits);

        if (defaultShelf) {
            newSystem.shelves.push(defaultShelf);
        }

        specs.push(newSystem);
    }

    return specs;
};

Spec.prototype._isSelectorConfigGroup = function(selector) {
    return selector && selector.title && selector.id;
};

Spec.prototype._createSpecsForSystemGroup = function(hagroups, replacing, selectedOption, version, limits, options) {
    /*
        Concept: Copy and replace HW with selected option (replacing)
                 OR
                 Copy and add new HW with selected option (replacing == null)
    */
    var _this = this,
        specs = [],
        filteredHagroups = _.without(hagroups, replacing);

    _.forEach(filteredHagroups, function(hagroup) {
        var spec = _this._createBuildSpecForHagroup(hagroup, replacing, selectedOption, version, limits, options);

        specs.push(spec);
    });

    // Check if we need to add a system
    if (selectedOption.configModel) {
        var howManyNewSystems = (replacing) ? replacing.length : 1; // If we are replacing systems, add same number -- else 1
        var existingSpecs = _.cloneDeep(specs);
        specs = []; // New system...

        for (var i = 0; i < howManyNewSystems; i++) {
            var newSystem = this._createBaseBuildSpecFor(selectedOption, version, limits),
                defaultShelf = this._defaultShelfOptionForConfig(selectedOption, version, limits);

            if (defaultShelf) {
                newSystem.shelves.push(defaultShelf);
            }

            if (replacing) {
                var oldExternalShelves = _.where(existingSpecs[i].shelves, { isEmbedded: false });
                newSystem.shelves.push.apply(newSystem.shelves, oldExternalShelves);
                newSystem.existingId = this._determineExistingId(newSystem, replacing[i]);
            }

            specs.push(newSystem);
        }
    }

    return specs;
};

// TODO: Clean this up, I am confused just looking at it -- Mark
Spec.prototype._createBuildSpecForHagroup = function(hagroup, replacing, selectedOption, version, limits /*, options */) {
    var existingId = this._determineExistingId(hagroup, replacing),
        detail = this._determineCompleteDetailForBuildSpec(hagroup, selectedOption),
        spec = this._createBaseBuildSpecFor(detail.config, version, limits);

    _.extend(spec, {
        shelves: this._getShelfSummaryFromExistingSystem(hagroup, replacing),
        existingId: existingId
    });

    if (detail.isShelfOption) {
        var newShelfSpec = this._shelfOptionToBuildSpec(selectedOption);

        if (newShelfSpec) {
            spec.shelves.push(newShelfSpec);
        }
        else {
            console.warn('_createBuildSpecForHagroup -> Unable to get the new shelf spec');
        }
    }
    else if (detail.isDriveOption) {
        console.warn('_createBuildSpecForHagroup -> Update Drive in Shelf TODO');
    }
    else if (detail.isSystemOption) {
        // New system, add default shelf
        var defaultShelf = this._defaultShelfOptionForConfig(detail.config, version, limits);

        if (defaultShelf) {
            spec.shelves.push(defaultShelf);
        }
    }
    else {
        console.warn('_createBuildSpecForHagroup -> Unknown option');
    }

    return spec;
};

Spec.prototype._determineExistingId = function(hagroup, replacing) {
    if (replacing && !_.isArray(replacing)) {
        return (replacing._model) ? replacing._id : null;
    }
    else {
        return (hagroup._model) ? hagroup._id : null;
    }
};

Spec.prototype._determineCompleteDetailForBuildSpec = function(resolvedSystemAddingTo, selectedOption) {
    var optionWrapper = {
        isSystemOption: false,
        isShelfOption: false,
        isDriveOption: false,
        noOption: (selectedOption) ? false : true,
        option: selectedOption,
        config: null
    };

    if (selectedOption.shelf) {
        optionWrapper.isShelfOption = true;
        optionWrapper.config = this._determineConfigFromSystemSelection(resolvedSystemAddingTo);
    }
    else if (selectedOption.drives) {
        optionWrapper.isDriveOption = true;
        optionWrapper.config = this._determineConfigFromSystemSelection(resolvedSystemAddingTo);
    }
    else if (selectedOption.configModel) {
        optionWrapper.isSystemOption = true;
        optionWrapper.config = selectedOption;
    }

    return optionWrapper;
};

Spec.prototype._defaultShelfOptionForConfig = function(config /*, version, limits */) {
    // TODO: Consider version and limits when picking a default shelf

    // If embedded, select a sellable shelf (with sellable drives) (prefer HDD over SSD).
    // If not embedded, no default shelf.
    // if (config.isEmbedded) {
    //     var embeddedShelves = config.matrix.hardwareOptions.embeddedShelves,
    //         sellableEmbeddedShelves = _.where(embeddedShelves, function sellable(shelfOption) {
    //             var isShelfSellable = shelfOption.shelf.sellable,
    //                 areDrivesSellable = _.every(shelfOption.drives, function checkEoa(driveOption) {
    //                     return driveOption.drive.sellable;
    //                 });

    //             return isShelfSellable && areDrivesSellable;
    //         });

    //     if(_.isEmpty(sellableEmbeddedShelves)) {
    //         var sortedEmbeddedShelves = _.sortBy(embeddedShelves, function enabled(shelfOption) {
    //             return !shelfOption.shelf.sellable;
    //         });

    //         return this._shelfOptionToBuildSpec(_.first(sortedEmbeddedShelves));
    //     } else {
    //         return this._shelfOptionToBuildSpec(_.first(sellableEmbeddedShelves));
    //     }
    // }

    var shelf = config.newEmbeddedShelf;

    return _.isEmpty(shelf) ? null : this._shelfOptionToBuildSpec(shelf);
};

Spec.prototype._determineVersionWithSelection = function(selectedOption) {
    return selectedOption.newVersion;
};

Spec.prototype._determineLimitsWithSelection = function(selectedOption) {
    return selectedOption.newLimits;
};

Spec.prototype._shelfOptionToBuildSpec = function(shelfOption) {
    var shelfBuildSpec = {};

    if (shelfOption.shelf && shelfOption.drives) {
        _.extend(shelfBuildSpec, {
            model: shelfOption.shelf.model,
            isEmbedded: shelfOption.isEmbedded,
            quantity: shelfOption.quantity || 1,
            drives: _.map(shelfOption.drives, function(drive) {
                return {
                    model: drive.drive.model,
                    quantity: drive.quantity
                };
            })
        });
    }
    else {
        console.warn('Poorly formed shelf option');
        return null;
    }

    return shelfBuildSpec;
};

Spec.prototype._getShelfSummaryFromExistingSystem = function(system, without) {
    assert(system, 'Must have a system to get shelf summary from');
    var rawShelves = system.shelves || [];

    if (without) {
        var withoutIdMap = _.map(without, function(withoutShelf) {
            return withoutShelf._id;
        });

        rawShelves = _.where(rawShelves, function(shelf) {
            return !_.contains(withoutIdMap, shelf._id);
        });
    }

    return _.map(rawShelves, function(shelf) {
        var drive_specs = _.isEmpty(shelf._x_bom) ? [] : shelf._x_bom.drive_specs;

        return {
            model: shelf.model,
            quantity: 1,
            isEmbedded: !shelf._isembedded ? false : true,
            drives: _.map(drive_specs, function(shelfBom) {
                return {
                    model: shelfBom.model,
                    quantity: shelfBom.quantity
                };
            })
        };
    });
};

Spec.prototype._createBaseBuildSpecFor = function(config, selectedVersion, versionLimits) {
    if (!config) {
        return {};
    }

    return {
        platformModel: config.platformModel,
        configModel: config.configModel,
        controllerCount: config.controllerCount,
        isESeries: config.isESeries,
        isFlashRay: config.isFlashRay,
        shelves: [],
        version: selectedVersion,
        limits: versionLimits,
        existingId: null
    };
};

Spec.prototype._determineConfigGroupFromSelection = function(selection) {
    assert(selection, 'Must provide a selection to determine config group');

    var systems = this._selectionToArrayOfSystems(selection), // We may be a system already
        groups = this._getUniqueConfigGroups(systems);

    if (groups.length) {
        return _.first(groups);
    }
    else {
        console.warn('Determine Config Group from selection yielded varying group types');
    }

    return null;
};

Spec.prototype._getUniqueConfigGroups = function _getUniqueConfigGroups(hagroups) {
    var configGroups = _.reduce(hagroups, function push(configGroups, hagroup) {
            var hagroupInspector = this._map.inspect(hagroup),
                configGroup = hagroupInspector.configGroup,
                isNewConfig = !_.some(configGroups, { id: configGroup.id });

            if (isNewConfig) {
                configGroups.push(configGroup);
            }

            return configGroups;
        }, [], this);

    return configGroups;
};

Spec.prototype._selectionToArrayOfSystems = function(selection) {
    if (_.isArray(selection)) {
        var haGroupMapping = _.map(selection, function(item) {
            return item.hagroups;
        });

        if (_.every(haGroupMapping)) {
            return _.flatten(haGroupMapping);
        }

        return selection;
    }
    else {
        return selection.hagroups || [selection];
    }
};

Spec.prototype._determineConfigFromSystemSelection = function(systemSelection, optionalConfigGroup) {
    assert(systemSelection, 'Must provide a system selection to determine config');

    var configGroupForSystem = optionalConfigGroup || this._determineConfigGroupFromSelection(systemSelection);

    if (configGroupForSystem && configGroupForSystem.getConfig) {
        var systemModelName = this._getSystemSelectionModel(systemSelection);

        return configGroupForSystem.getConfig(systemModelName);
    }
    else {
        console.warn('Unable to determine config group for system selector');
        console.warn(systemSelection);
    }

    return null;
};

Spec.prototype._getSystemSelectionModel = function(systemSelection) {
    assert(systemSelection, 'Must provide a system selection to determine model');

    var hagroup = null,
        firstSelection = null;

    if (_.isArray(systemSelection)) {
        firstSelection = _.first(systemSelection);
    }
    else {
        firstSelection = systemSelection;
    }

    if (firstSelection.hagroups) {
        hagroup = _.first(firstSelection.hagroups);
    }
    else {
        hagroup = firstSelection;
    }

    return (hagroup) ? (hagroup._model || hagroup.model) : null;
};

module.exports = Spec;
