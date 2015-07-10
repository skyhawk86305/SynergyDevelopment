'use strict';

var assert = require('assert'),
    _ = require('lodash');


function GenericInspector(init) {
    init(this);
}

var CONSTRUCTORS = {
        'cluster': require('./cluster'),
        'hagroup': require('./hagroup'),
        'shelf': require('./shelf'),
        'controller': require('./controller'),
        'aggregate': require('./aggregate'),
        'storage_pool': GenericInspector,
        'raidgroup': GenericInspector,
    };

var DESCEND = {
        installation: [ 'clusters', 'hagroups' ],
        cluster: [ 'hagroups' ],
        hagroup: [ 'controllers', 'shelves' ],
        controller: [ 'aggregates', 'storage_pools' ],
        aggregate: [ '_raid_groups' ],
    };

function Inspector(installations, info) {
    assert(_.isArray(installations), '37f76914');
    assert(_.isObject(info), 'cb89b509');

    this._installations = installations;
    this._info = info;
    this._locs = {};

    this.inspect = _.bind(this.inspect, this);
    this.find = _.bind(this.find, this);

    // provide this.find.aggregate(_id) et al
    for (var key in CONSTRUCTORS) {
        this.find[key] = _.bind(Inspector.prototype.find, this, key);
        this.inspect[key] = _.bind(Inspector.prototype.inspect, this, key);
    }
}

/**
 * Inspect a model part, returning an appropriate object (see CONSTRUCTORS)
 * above) given the part's _type. The constructor is called with an init
 * function to inject read-only properties (WARNING: NOT IN _.keys()!):
 *
 * * inspect: the inspect method
 * * info: product info
 * * installation: the installation the object was found in
 * * cluster: the cluster the object was found in (if any)
 * * hagroup: the hagroup the object was found in (if any)
 * * controller: etc
 * * shelf: etc
 *
 * Three ways of calling it:
 *
 * * inspect(modelPartOrThinRef)
 * * inspect(_type, _id)
 * * inspect.controller(_id) // same as inspect('controller', _id)
 */

Inspector.prototype.inspectCluster =
Inspector.prototype.inspectHaGroup =
Inspector.prototype.inspectController =
Inspector.prototype.inspectShelf =
Inspector.prototype.inspect = function inspect(partOrType, _id) {
    var _type;

    if (arguments.length >= 2) {
        assert.equal(typeof partOrType, 'string', 'inspector, missing _type');
        assert.equal(typeof _id, 'string', 'inspector, missing _id');
        _type = partOrType;
    } else {
        assert.equal(_.isPlainObject(partOrType), true, 'inspector, part is not object');
        _id = partOrType._id;
        _type = partOrType._type;
    }

    var context = this._find(_type, _id); // mutable context block!

    if (!context.inspector) {
        context.inspect = this.inspect;
        context.find = this.find;
        context.info = this._info;

        var Constructor = CONSTRUCTORS[_type];
        context.inspector = new Constructor(contextualize);
    }

    return context.inspector;

    function contextualize(ob) {
        _.forEach(context, function (val, key) {
            Object.defineProperty(ob, key, { get: _.constant(val) });
        });
    }
};

/**
 * Find a model part. Returns the part itself, not its inspector.
 *
 * Two ways of calling it:
 *
 * * find(_type, _id)
 * * find.controller(_id) // same as find('controller', _id)
 */

Inspector.prototype.find = function find(_type, _id) {
    var context = this._find(_type, _id);
    return context[_type];
};

Inspector.prototype._find = function find(_type, _id) {
    assert.equal(typeof _type, 'string', 'need _type');
    assert.equal(typeof _id, 'string', 'need _id');
    assert.equal(_.has(CONSTRUCTORS, _type), true, 'invalid _type ' + _type);

    this._indexTo(_type);

    var bucket = this._locs[_type] || {},
        coords = bucket[_id];

    assert.notEqual(coords, undefined, _type + ' not found: ' + _id);
    return coords;
};

Inspector.prototype._indexTo = function _indexTo(_type) {
    var locs = this._locs;

    if (!_.has(locs, _type)) {
        _.forEach(this._installations, indexInstallation);
    }

    function indexInstallation(installation) {
        index({}, installation);
    }

    function index(parentCoords, child) {
        var childType = child._type,
            coords = _.clone(parentCoords);

        coords[childType] = child;
        shove(child, coords);

        if (_.has(DESCEND, childType)) {
            var keys = DESCEND[childType];
            _.forEach(keys, indexDeeper);
        }

        function indexDeeper(key) {
            var grandChildren = child[key];
            _.forEach(grandChildren, _.partial(index, coords));
        }
    }

    function shove(ob, coords) {
        var _type = ob._type,
            _id = ob._id;

        if (!_.has(locs, _type)) {
            locs[_type] = {};
        }

        locs[_type][_id] = coords;
    }
};

module.exports = Inspector;
