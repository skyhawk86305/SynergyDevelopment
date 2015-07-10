'use strict';

var assert = require('assert'),
    _ = require('lodash'),
    util = require('util'),
    Store = require('./store'),
    reduceClip = require('../clip/reduce'),
    constants = require('../constants'),
    debounce = require('../debounce'),
    Builder = require('../model/builder'),
    ModelMap = require('../model/map'),
    RequestQueue = require('../request-queue');

function ProjectStoreBackEnd() {
    assert(this instanceof ProjectStoreBackEnd, 'use new');
    this.baseURL = '';
}

ProjectStoreBackEnd.prototype.load = function load(uuid, version, callback) {
    var base = constants.PROJECT_LOAD_PATH,
        parts = _.filter([ base, uuid, version ]), // discards undefined
        url = this.baseURL + parts.join('/'),
        options = {};

    this.debouncedRead(url, { method: 'GET', basePath: url, options: options }, callback);
};

function ProjectStore(options) {
    assert(this instanceof ProjectStore, 'use new');
    assert(_.isPlainObject(options));
    assert(options.productInfo);
    assert(typeof options.xhr === 'function', 'need options.xhr');

    Store.call(this, 'PROJECT');

    this.backEnd = options.backEnd || new ProjectStoreBackEnd();
    this.productInfoStore = options.productInfo;

    this.requestQueue = new RequestQueue(options.xhr);
    this.backEnd.debouncedRead = debounce(_.bind(this.requestQueue.pushToReadQueue, this.requestQueue));
    this.debouncedWrite = debounce(_.bind(this.requestQueue.pushToWriteQueue, this.requestQueue));

    this._unload(); // sets properties
}

util.inherits(ProjectStore, Store);

ProjectStore.prototype.getState = function getState() {
    return {
        uuid: this.clip ? this.clip._uuid || '' : '',
        name: this.clip ? this.clip._x_project_name || '' : '',
        map: this.map.bind(this),
        actions: this.actions,
        err: this.err,
        fetching: this.fetching,
        fetched: this.fetched,
        queueStatus: this.requestQueue.queueStatus()
    };
};

/**
 * Get a mapped summary of the raw clip. Cached; reset on change.
 */
ProjectStore.prototype.map = function map() {
    if (this.clip) {
        if (!this._modelMap) {
            var productInfo = this.productInfoStore.getState().productInfo;

            this._modelMap = new ModelMap(productInfo, this.clip);
            this._builder = new Builder(productInfo, this.clip);
        }
        return this._modelMap;
    } else {
        return null;
    }
};

ProjectStore.prototype._unload = function _unload() {
    this.clip = null;
    this.actions = null;
    this.err = null;
    this.fetched = false;
    this.fetching = false;
};

ProjectStore.prototype._clearCaches = function _clearCaches() {
    delete this._modelMap;
};

ProjectStore.prototype._save = function _save() {
    var clipToSave = reduceClip(this.clip);

    var basePath = constants.PROJECT_REPLACE_PATH,
        options = { payload: clipToSave },
        _this = this;

    this.debouncedWrite(this.clip._uuid, { method: 'POST', basePath: basePath, options: options }, function(err, result) {
        if(!err && result) {
            _this.clip._uuid = result._uuid || _this.clip._uuid;
            _this.clip._version = result._version || _this.clip._version;
            _this.clip._timestamp = (result._timestamp && result._timestamp > _this.clip._timestamp) ? result._timestamp : _this.clip._timestamp;
            _this.changed();
        }
    });

    this.changed();
};

ProjectStore.prototype.PROJECT_UNLOAD = function unload(uuid) {
    if (this.clip && (this.clip._uuid === uuid)) {
        this._unload();
        this.changed();
    }
};

ProjectStore.prototype.PROJECT_LOAD = function load(uuid, version) {
    var _this = this;

    if (_this.fetching) {
        console.error('already fetching');
        return;
    }

    _this._unload();
    _this.fetching = true;
    _this.changed();

    this.backEnd.load(uuid, version, function onLoad(err, clip) {
        if (err) {
            _this.err = err;
        } else {
            _this.clip = clip;
            _this.fetched = true;
        }

        _this.fetching = false;
        _this.changed();
    });
};

ProjectStore.prototype.PROJECT_ADD_STANDALONE = function addStandalone(spec, callback) {
    var hagroup = this._builder.addSystem(spec);

    this._save();
    callback(null, hagroup);
};

ProjectStore.prototype.PROJECT_ADD_CLUSTER = function addCluster(spec, callback) {
    var hagroup = this._builder.addSystemToCluster(spec);

    this._save();
    callback(null, hagroup);
};

ProjectStore.prototype.PROJECT_EXPAND_CLUSTER = function expandCluster(clusterId, spec) {
    this._builder.addSystemToCluster(spec, clusterId);
    this._save();
};

ProjectStore.prototype.PROJECT_CHANGE_SYSTEMS = function changeSystems(specs) {
    this._builder.changeSystems(specs);
    this._save();
};

ProjectStore.prototype.PROJECT_REMOVE_SYSTEM = function removeStandalone(systemId) {
    this._builder.removeSystem(systemId);
    this._save();
};

ProjectStore.prototype.PROJECT_NAME_CLUSTER = function nameCluster(clusterId, name) {
    this._builder.nameCluster(clusterId, name);
    this._save();
};

ProjectStore.prototype.PROJECT_NAME_CONTROLLERS = function nameControllers(systemId, name1, name2) {
    this._builder.nameSystem(systemId, name1, name2);
    this._save();
};

ProjectStore.prototype.PROJECT_DELETE_SHELF = function deleteShelf(systemId, shelf) {
    this._builder.deleteShelf(systemId, shelf);
    this._save();
};

ProjectStore.prototype.PROJECT_DELETE_SHELVES = function deleteShelves(systemId, shelf) {
    this._builder.deleteAllShelves(systemId, shelf);
    this._save();
};

ProjectStore.prototype.PROJECT_REBUILD_AUTO_AGGREGATES = function rebuildAutoAggregates(systemId) {
    this._builder.rebuildAutoAggregates(systemId);
    this._save();
};

ProjectStore.prototype.PROJECT_ADD_MANUAL_AGGREGATE = function addManualAggregate(systemId, newAggregate, callbackWithNewAggregate) {
    this._builder.addManualAggregate(systemId, newAggregate);
    callbackWithNewAggregate(newAggregate);
    this._save();
};

ProjectStore.prototype.PROJECT_DELETE_AGGREGATE = function deleteAggregate(systemId, aggregate) {
    this._builder.deleteAggregate(systemId, aggregate);
    this._save();
};

ProjectStore.prototype.PROJECT_DELETE_ALL_AGGREGATES = function deleteAllAggregates(systemId) {
    this._builder.deleteAllAggregates(systemId);
    this._save();
};

ProjectStore.prototype.PROJECT_SET_SYSTEM_POLICY = function setSystemPolicy(systemId, scope, policy) {
    this._builder.setSystemPolicy(systemId, scope, policy);
    this._save();
};

ProjectStore.prototype.PROJECT_SET_CLUSTER_POLICY = function setClusterPolicy(clusterId, scope, policy) {
    this._builder.setClusterPolicy(clusterId, scope, policy);
    this._save();
};

ProjectStore.prototype.PROJECT_FP_ADD_POOL = function addFP(controllerID, deviceSpec, raidType, deviceCount) {
    this._builder.addStoragePool(controllerID, deviceSpec, raidType, deviceCount, true);
    this._save();
};

ProjectStore.prototype.PROJECT_FP_RESIZE_POOL = function claimAU(storagePoolID, newDeviceCount) {
    this._builder.resizeStoragePool(storagePoolID, newDeviceCount);
    this._save();
};

ProjectStore.prototype.PROJECT_FP_CLAIM = function claimAU(aggrId, raidType, poolID, slice) {
    this._builder.claimAllocationUnit(aggrId, raidType, poolID, slice);
    this._save();
};

ProjectStore.prototype.PROJECT_FP_RELEASE = function claimAU(aggrId, poolID, slice) {
    this._builder.releaseAllocationUnit(aggrId, poolID, slice);
    this._save();
};

ProjectStore.prototype.PROJECT_FP_DEL_POOL = function addFP(storagePoolID) {
    this._builder.deleteStoragePool(storagePoolID);
    this._save();
};

ProjectStore.prototype.PROJECT_FP_ADD_AGGR_RG = function addFP(aggrId, raidType, deviceSpec, deviceCount) {
    this._builder.addFlashPoolRaidGroupToAggregate(aggrId, raidType, deviceSpec, deviceCount);
    this._save();
};

ProjectStore.prototype.PROJECT_FP_DEL_AGGR_RG = function removeFPRG(raidId) {
    this._builder.deleteFlashPoolRaidGroupFromAggregate(raidId);
    this._save();
};

// Guard.changingVersion will tell you if the change invalidates any limits.
ProjectStore.prototype.PROJECT_SET_CLUSTER_VERSION = function setClusterVersion(clusterId, version) {
    this._builder.setClusterVersion(clusterId, version);
    this._save();
};

// Guard.changingVersion will tell you if the change invalidates any limits.
ProjectStore.prototype.PROJECT_SET_SYSTEM_VERSION = function setSystemVersion(systemId, version) {
    this._builder.setSystemVersion(systemId, version);
    this._save();
};

module.exports = ProjectStore;
