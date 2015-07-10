'use strict';

var assert = require('assert'),
    _ = require('lodash'),
    Config = require('./config');

function ConfigGroup(options, index, value, parent) {
    if (!(this instanceof ConfigGroup)) {
        return new ConfigGroup(options, index, value, parent);
    }

    var makeSubLine = _.partialRight(ConfigGroup, this),
        defaults = {
            enabled: false,
        },
        overrides = {
            parent: parent || null,
            _configs: [],
            _configsByModel: {},
        };

    assert(this instanceof ConfigGroup, 'use new');
    assert.equal(typeof options, 'object', 'options ' + typeof options);
    assert(parent === undefined || parent instanceof ConfigGroup, 'parent');
    assert(!(parent !== undefined && this.subGroups), 'depth limit: 2');

    _.merge(this, defaults, options, overrides);

    if (!this.subGroups) {
        this.subGroups = [];
    } else {
        assert(this.subGroups instanceof Array);
        this.subGroups = _.map(this.subGroups, makeSubLine);
    }
}

ConfigGroup.prototype.inhaleRawSystem = function gcbm(rawSystem, controllerModel) {
    assert(_.isPlainObject(rawSystem), 'rawSystem');

    var configModel = rawSystem.name,
        config;

    if (_.has(this._configsByModel, configModel)) {
        config = this._configsByModel[configModel];
    } else if (rawSystem) {
        this._configsByModel[configModel] = config = new Config(rawSystem, controllerModel);
        this._configs.push(config);
    }

    return config;
};

ConfigGroup.prototype.getConfigByModel = function gcbm(configModel) {
    assert.equal(typeof configModel, 'string', 'configModel ' + typeof configModel);
    assert(_.has(this._configsByModel, configModel), 'unknown configModel ' + configModel);

    return this._configsByModel;
};

ConfigGroup.prototype.getConfigs = function getConfigs() {
    return this._configs;
};

ConfigGroup.prototype.getConfig = function getConfig(configModel) {
    var matches = _.where(this._configs, { configModel : configModel });
    assert.equal(matches.length, 1, 'cannot find ' + configModel);
    return matches[0];
};

ConfigGroup.prototype.getSubGroup = function getSubGroup(id) {
    if (id === '') {
        return this;
    }

    var matches = _.where(this.subGroups, { id: id });
    assert.equal(matches.length, 1, 'subgroup lookup ' + id);
    return matches[0];
};

ConfigGroup.prototype.where = function where(constraint) {
    if (_.isEmpty(constraint)) {
        return _.where(this._configs);
    } else {
        return _.where(this._configs, constraint);
    }
};

module.exports = ConfigGroup;
