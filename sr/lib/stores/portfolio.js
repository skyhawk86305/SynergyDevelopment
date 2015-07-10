'use strict';

var assert = require('assert'),
    _ = require('lodash'),
    // lzString = require('lz-string'),
    util = require('util'),
    getUuid = require('uuid'),
    Store = require('./store'),
    getClientCache = require('../client-cache'),
    constants = require('../constants'),
    debounce = require('../debounce'),
    RequestQueue = require('../request-queue');

var PORTFOLIO_NEW_NAME = 'New Project';

function PortfolioStore(options) {
    assert(this instanceof PortfolioStore, 'use new');
    assert(typeof options === 'object', 'need options object');
    assert(typeof options.xhr === 'function', 'need options.xhr');

    Store.call(this, 'PORTFOLIO');

    this.requestQueue = new RequestQueue(options.xhr);
    this.debouncedRead = debounce(_.bind(this.requestQueue.pushToReadQueue, this.requestQueue));
    this.debouncedWrite = debounce(_.bind(this.requestQueue.pushToWriteQueue, this.requestQueue));

    this.cache = undefined;
    this.allProjects = [];
    this.matchingProjects = [];
    this.adjustingProjects = {};
    this.errorProjects = {};
    this.projectMap = {};
    this.projectUuidsBeingEdited = {};
    this.search = '';
    this.fetching = false;
    this.fetched = false;
    this.err = null;

    this.restoreCacheState();
}

util.inherits(PortfolioStore, Store);

PortfolioStore.prototype.getState = function getState() {
    return {
        search: this.search,
        projects: this.matchingProjects, // TODO: clone it to prevent mutation
        fetching: this.fetching,
        fetched: this.fetched,
        projectIdsInEditMode: this.projectUuidsBeingEdited
    };
};

PortfolioStore.prototype.PORTFOLIO_SEARCH = function search(term) {
    this.search = term;
    this.updateMatches();
    this.changed();
};

PortfolioStore.prototype.PORTFOLIO_ADD_NEW = function addNew() {
    var requestId = getUuid(),
        now = new Date().getTime();

    // jshint camelcase: false
    this.PORTFOLIO_ADJUST(requestId, null, null, {
        _type: 'solution',
        _timestamp: now,
        _x_original_timestamp: now,
        _x_project_name: this.search || PORTFOLIO_NEW_NAME,
        synergy_model: {
            hagroups: []
        }
    });
};

PortfolioStore.prototype.PORTFOLIO_SET_NAME = function setName(uuid, version, name) {
    var requestId = uuid || getUuid();

    this.PORTFOLIO_FETCH();
        
    // jshint camelcase: false
    this.PORTFOLIO_ADJUST(requestId, uuid, version, {
        _uuid: requestId,
        _version: version,
        _timestamp: new Date().getTime(),
        _x_project_name: name
    });
};

PortfolioStore.prototype.PORTFOLIO_ARCHIVE = function archive(uuid, version) {
    var requestId = uuid || getUuid();

    this.PORTFOLIO_ADJUST(requestId, uuid, version, {
        _uuid: requestId,
        _version: version,
        _timestamp: new Date().getTime(),
        _x_archived: true
    });

};

PortfolioStore.prototype.PORTFOLIO_ADJUST = function adjust(requestId, uuid, version, adjustments) {
    var _this = this,
        clip,
        oldClip;

    console.log('PORTFOLIO_ADJUST', requestId, uuid, version, adjustments);
    delete _this.errorProjects[requestId]; // clear last error

    _this.adjustingProjects[requestId] = {
        uuid: uuid,
        version: version,
        adjustments: adjustments
    };
    // _this.updateLocalStorageRequests();

    if (_.has(this.projectMap, requestId)) {
        clip = this.projectMap[requestId];
        oldClip = _.clone(clip);
        _.merge(clip, adjustments);
    } else {
        console.log('adjusting unknown clip', requestId, uuid, this.projectMap);
    }

    _this.updateMatches();
    _this.changed();

    this.adjust(requestId, uuid, version, adjustments, function onAdjust(err, result) {
        if (err) {
            _this.errorProjects[requestId] = err;
            _.merge(clip, oldClip);
        } else {
            var existing = _.find(_this.allProjects, function findExisting(obj) {
                return obj._uuid && obj._uuid === requestId;
            });

            if (existing) {
                _.merge(existing, result);
            } else {
                // TCLIP changed the UUID on us
                _this.allProjects = _.filter(_this.allProjects, function oldClip(clip) {
                    return clip._uuid !== requestId;
                });

                _this.allProjects.push(result);
            }

            _this.updateLocalStorageProjects();
            _this.updateProjectsBeingEdited(uuid, result);
        }

        delete _this.adjustingProjects[requestId];
        // _this.updateLocalStorageRequests();

        _this.updateMatches();
        _this.changed();
    });
};

PortfolioStore.prototype.PORTFOLIO_FETCH = function fetch() {
    var _this = this;

    if (this.fetching) {
        console.error('already fetching');
        return;
    }

    this.fetching = true;
    this.err = null;
    this.changed();

    this.list(function onList(err, index) {
        if (err) {
            _this.err = err;
        } else {
            _this.allProjects = index;
/*
            // Don't lose any local projects that have not been saved yet
            var workingProjects = _.filter(_this.allProjects, function clientProjects(project) {
                return !_.some(index, function serverProjects(clip) {
                    return clip._uuid === project._uuid;
                });
            }) || [];

            _this.allProjects = workingProjects.concat(index);

            // Validate pending adjustments
            var adjustingKeys = _.keys(_this.adjustingProjects) || [];

            _.forEach(adjustingKeys, function(key) {
                if (!_.some(_this.allProjects, function(project) {
                        return key === project._uuid;
                    })) {
                    // Remove any operations for UUID that is no longer valid
                    delete _this.adjustingProjects[key];
                } else if (_.some(_this.allProjects, function(project) {
                        return _this.adjustingProjects[key].version < project._version;
                    })) {
                    // Remove any operations for versions that have already been replaced
                    delete _this.adjustingProjects[key];
                }
            });

            // Restart any outstanding server actions
            _.forOwn(_this.adjustingProjects, function(value, key) {
                console.log('Retry pending adjustment', key, value);
                _this.PORTFOLIO_ADJUST(key, value.uuid, value.version, value.adjustments);
            });
*/
            _this.updateMatches();
            _this.fetched = true;
            _this.updateLocalStorageProjects();
        }

        // TODO: set state variable so UI can enable writes after it is safe to do so

        _this.fetching = false;
        _this.changed();
    });
};

function nameMatch(clip, search) {
    // jshint camelcase: false
    return (clip._x_project_name || '').toLowerCase().indexOf(search) >= 0;
}

function uuidMatch(clip, search) {
    // Do not allow partial search of UUIDs as this will return 'false matches' for other numeric tags.
    // return clip._uuid.toLowerCase().indexOf(search) >= 0;
    return clip._uuid.toLowerCase() === search;
}

function tagMatch(clip, search) {
    // jshint camelcase: false
    var tags = clip._x_autotags || [];
    tags = tags.concat(clip._x_usertags || []);
    for (var idx in tags) {
        if (tags[idx].toLowerCase().indexOf(search) >= 0) {
            return true;
        }
    }
    return false;
}

var CHECKS = [nameMatch, uuidMatch, tagMatch];

PortfolioStore.prototype.updateMatches = function updateMatches() {
    var search = this.search.toLowerCase(),
        _this = this,
        map = this.projectMap = {};

    this.matchingProjects = _.sortBy(_.filter(_.map(this.allProjects, function(clip) {
        // jshint camelcase: false
        map[clip._uuid] = clip; // original, in allProjects
        clip = _.clone(clip);
        clip._X_STATE = {
            adjusting: _.has(_this.adjustingProjects, clip._uuid),
            err: _.has(_this.errorProjects, clip._uuid),
        };

        for (var idx in CHECKS) {
            var check = CHECKS[idx];
            if (check(clip, search)) {
                return clip;
            }
        }

        return null;
    })), '_timestamp').reverse();
};

// Keep as many of the the most recent 20 projects cached as we can
// Only store what we need to show the project list entry
PortfolioStore.prototype.updateLocalStorageProjects = function updateLocalStorageProjects() {
    if (this.cache) {

        var filteredClips = _.filter(this.allProjects, function archivedFilter(clip) {
            return (clip && clip._x_archived) ? false : true;
        });

        var projects = _.first(_.sortBy(_.map(filteredClips, function(clip) {
            // jshint camelcase: false
            return {
                _timestamp: clip._timestamp,
                _uuid: clip._uuid,
                _version: clip._version,
                _x_autodesc: clip._x_autodesc,
                _x_autotags: clip._x_autotags,
                _x_usertags: clip._x_usertags,
                _x_project_name: clip._x_project_name,
                _x_original_timestamp: clip._x_original_timestamp
            };
        }), '_timestamp').reverse(), 20);

        for (var idx = 0; idx < 20; idx++) {
            this.cache.remove('synergy.project.' + idx, _.noop);
        }

        _.forEach(projects, function storeProject(project, idx) {
            this.cache.set('synergy.project.' + idx, project, _.noop);
        }, this);
    }
};


PortfolioStore.prototype.updateProjectsBeingEdited = function updateProjectsBeingEdited(uuid, result) {
    var isNewProject = (uuid === null);

    if (isNewProject) {
        this.projectUuidsBeingEdited[result._uuid] = true;
    } else {
        delete this.projectUuidsBeingEdited[uuid];
    }
};

// Keep pending adjustments cached so we can continue processing in a new session
// PortfolioStore.prototype.updateLocalStorageRequests = function updateLocalStorageRequests() {
//     if (this.cache) {
//         var startTime = new Date().getTime();
//         this.cache.set('synergy.project.requests', lzString.compressToBase64(JSON.stringify(this.adjustingProjects)), _.noop);
//         var endTime = new Date().getTime();
//         console.log('Time to store pending requests:', endTime - startTime);
//     }
// };

function pushProjects(err, value, projects) {
    if (err) {
        console.error(err);
    } else if (value) {
        projects.push(value);
    }
}

// Initialize the cache object and pull in any values saved in LocalStorage
PortfolioStore.prototype.restoreCacheState = function restoreCacheState() {
    var _this = this;

    getClientCache(function(err, engine) {
        if (err) {
            console.error(err);
        } else {
            _this.cache = engine;
        }
    });

    if (this.cache) {
        for (var idx = 0; idx < 20; idx++) {
            this.cache.get(
                'synergy.project.' + idx,
                _.partialRight(pushProjects, this.allProjects)
            );
        }

        // try {
        //     this.cache.get('synergy.project.requests', function cacheRequests(err, value) {
        //         if (err) {
        //             console.error(err);
        //         } else if (value) {
        //             _this.adjustingProjects = JSON.parse(lzString.decompressFromBase64(value));
        //         }
        //     });
        // } catch (err) {
        //     console.error('cannot parse pending adjustments in LocalStorage');
        // }

        this.updateMatches();
    }
};

PortfolioStore.prototype.list = function list(callback) {
    var basePath = constants.PROJECT_LIST_PATH,
        options = {};

    this.debouncedRead(basePath, {
        method: 'GET',
        basePath: basePath,
        options: options
    }, callback);
};

PortfolioStore.prototype.adjust = function adjust(requestId, uuid, version, adjustments, callback) {
    assert(typeof requestId === 'string', 'adjust: requestId string');
    assert(typeof uuid === 'string' || uuid === null, 'adjust: uuid string or null');
    assert(typeof version === 'number' || version === null, 'adjust: version number or null');
    assert(typeof adjustments === 'object' && !(adjustments instanceof Array), 'adjust: adjustments object');

    var basePath = constants.PROJECT_ADJUST_PATH,
        options = {
            payload: adjustments
        };

    this.debouncedWrite(requestId, {
        method: 'POST',
        basePath: basePath,
        options: options
    }, callback);
};

module.exports = PortfolioStore;
