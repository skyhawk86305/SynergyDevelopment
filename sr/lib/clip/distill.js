'use strict';

var assert = require('assert'),
    _ = require('lodash'),
    CountingBag = require('../counting-bag'),
    ObjectWalker = require('../object-walker');

function tagDrivesFromShelfBom(add, _shelf) {
    var _driveSpecs = _shelf.maybe('_x_bom.drive_specs');
    if (_driveSpecs.exists) {
        for (var idx in _driveSpecs.value) {
            var _driveSpec = _driveSpecs.get(idx),
                tag = {
                    _type: 'drive',
                    model: _driveSpec.get('model').value,
                    rawgb: _driveSpec.has('rawgb') ? _driveSpec.get('rawgb').value : 0,
                    type: _driveSpec.get('type').value,
                    rpm: _driveSpec.get('rpm').value,
                },
                quantity = _driveSpec.has('quantity') ? _driveSpec.get('quantity').value : 0;
            add(tag, quantity);
        }
    }
}

function tagShelf(add, _shelf) {
    if(_shelf.has('model')) {
        add({
            _type: 'shelf',
            model: _shelf.get('model').value
        });
    }

    tagDrivesFromShelfBom(add, _shelf);
}

function tagShelves(add, _shelves) {
    if (_shelves.exists) {
        for (var idx in _shelves.value) {
            tagShelf(add, _shelves.get(idx));
        }
    }
}

function tagHaGroups(add, hagroups) {
    var nodeCount,
        nodeModel,
        nodeMode,
        nodeVersion;

    function mustMatchIfBothPresent(base, path1, path2) {
        assert(ObjectWalker.isWrapped(base));
        var m1 = base.maybe(path1),
            m2 = base.maybe(path2);
        if (m1.exists && m2.exists) {
            assert(m1.value === m2.value, [
                m1.path,
                'must match',
                m2.path,
                'if both are present']);
        }
    }

    for (var idx in hagroups) {
        var _hagroup = new ObjectWalker(
                hagroups[idx],
                [ 'synergy_model','hagroups', idx ]);
        _hagroup.assert(_.isPlainObject, 'expected object');

        nodeCount = null;
        nodeModel = null;
        nodeMode = null;
        nodeVersion = undefined;

        if (_hagroup.has('_model')) {
            add({
                _type: 'config',
                config: _hagroup.value._model
            });
        }

        if (_hagroup.has('model')) {
            nodeModel = _hagroup.get('model').value;
        }

        if (_hagroup.has('is_clustered')) {
            nodeMode = _hagroup.get('is_clustered').value ? 'c-mode': '7-mode';
        }

        if (_hagroup.has('controllers') && _hagroup.value.controllers && _hagroup.value.controllers.length) {
            nodeCount = _hagroup.value.controllers.length;
        }

        if (_hagroup.has('version')) {
            nodeVersion = _hagroup.get('version').value;
        }

        if (_hagroup.has('_x_bom') && !_.isEmpty(_hagroup.value._x_bom) && _hagroup.value._x_bom.system) {
            mustMatchIfBothPresent(_hagroup, 'model', '_x_bom.system.system_model');
            mustMatchIfBothPresent(_hagroup, 'system_is_clustered', '_x_bom.system.is_clustered');
        }

        assert(nodeCount !== null, _hagroup.path + ': could not determine node count');
        assert(nodeModel !== null, _hagroup.path + ': could not determine node model');
        assert(nodeMode !== null, _hagroup.path + ': could not determine node mode');

        add({
            _type: 'node',
            model: nodeModel,
            version: nodeVersion,
            mode: nodeMode
        }, nodeCount);

        tagShelves(add, _hagroup.maybe('shelves'));
    }
}

function sum(_sum, num) {
    return _sum + num;
}

function distill(clip) {
    assert(clip);

    assert(!('hagroups' in clip), 'repair');

    var bag = new CountingBag(),
        add = bag.add.bind(bag);

    if (clip.synergy_model) {
        if (clip.synergy_model.hagroups) {
            tagHaGroups(add, clip.synergy_model.hagroups);
        }
    }

    var dump = bag.dump();

    function query(atts) {
        if (atts) {
            var matches = _.where(dump, atts),
                count = _.reduce(_.pluck(matches, '_count'), sum);

            return {
                matches: matches,
                _count: count,
            };
        } else {
            return dump;
        }
    }

    return query;
}

module.exports = distill;
