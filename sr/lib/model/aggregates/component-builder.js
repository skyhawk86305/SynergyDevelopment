'use strict';

var assert = require('assert'),
    _ = require('lodash'),
    uuid = require('uuid'),
    dump = require('../../dump'),
    mutil = require('../util');

dump(); // make linter happy

function ComponentBuilder(hagi) {
    this._hagi = hagi;
    this._specById = this._get_specById();
}

ComponentBuilder.prototype.makeAggregate = function makeAggregate(controllerId, deviceGroup, deviceCount, props) {
    assert(this instanceof ComponentBuilder);
    assert.equal(typeof controllerId, 'string');
    assert.equal(typeof deviceGroup, 'object');
    assert.equal(typeof deviceCount, 'number');
    assert(!props || _.isPlainObject(props));
    assert(deviceCount <= deviceGroup.devices.length);

    var defaultProps = this._hagi.lookup.defaultAggrProps(deviceCount);

    var aggr = _.merge({}, defaultProps, {
            _manual: false,
            _controller: controllerId,
            name: 'aggr' + uuid().slice(0, 8),
        }, props || {});

    if (!aggr._raid_groups) {
        aggr._raid_groups = this.makeRaidGroups(deviceGroup, deviceCount, aggr) || [];
    }

    return aggr;
};

ComponentBuilder.prototype.makeRaidGroups = function makeRaidGroups(deviceGroup, deviceCount, aggr, raidSize) {
    assert(this instanceof ComponentBuilder);
    assert(_.isPlainObject(deviceGroup));
    assert(_.isNumber(deviceCount));
    assert(_.isPlainObject(aggr));
    assert(deviceCount <= deviceGroup.devices.length);
    var callerRaidSize = (raidSize) ? raidSize : this._defaultRaidSize(deviceGroup, deviceCount, aggr.raid_type),
        raidCount = Math.ceil(deviceCount / callerRaidSize),
        deficiencies = (raidCount * callerRaidSize) - deviceCount,
        soFar = 0,
        groups = [],
        devices = deviceGroup.devices,
        group,
        lastSpec,
        lastSpecEntry;

    while (deficiencies > raidCount) {
        // TR3838 July 2014: "NetApp recommends that the aggregate not be
        // deficient more than the number of drives equal to one less than
        // the number of RAID groups (otherwise you would just pick the
        // next-lowest RAID group size)."
        callerRaidSize -= 1;
        deficiencies -= raidCount;
    }

    while(soFar < deviceCount) {
        var effRaidSize = (groups.length >= deficiencies) ? callerRaidSize : callerRaidSize - 1,
            thisSize = _.min([ effRaidSize, deviceCount - soFar ]),
            theseDevices = devices.splice(0, thisSize);

        group = {
            _id: uuid(),
            _type: 'raidgroup',
            name: 'rg' + groups.length,
            _devices: [],
            __deviceSpecs: [],
            cache: false,
            plex_number: 0
        };

        lastSpec = null;
        lastSpecEntry = null;
       _.forEach(theseDevices, pushDevice, this);

        groups.push(group);
        soFar += group._devices.length;
    }

    return groups;

    function pushDevice(id) {
        // jshint -W040
        assert(this instanceof ComponentBuilder);
        group._devices.push(id);
        var spec = this._specById[id];
        if (spec === lastSpec || _.isEqual(spec, lastSpec)) {
            lastSpecEntry.count ++;
        } else {
            lastSpec = spec;
            lastSpecEntry = {
                spec: spec,
                count: 1,
            };
            group.__deviceSpecs.push(lastSpecEntry);
        }
    }
};

ComponentBuilder.prototype._defaultRaidSize = function _defaultRaidSize(deviceGroup, count, raidType) {
    var raidSpec = _.merge({}, deviceGroup.spec, {
            type: mutil.rpmToEffectiveDriveType(deviceGroup.spec.rpm),
            _type_faked: true,
        }),
        raidSize = this._hagi.lookup.lowestOverheadRaidSize(
            raidSpec,
            raidType,
            count
        );

    return raidSize;
};

/*
    No immediate way around this
*/
ComponentBuilder.prototype._get_specById = function GSBI() {
    assert(this instanceof ComponentBuilder);
    var result = {};
    _.forEach(this._hagi.deviceInfo, function (info) {
        result[info.id] = info.spec;
    });
    return result;
};

module.exports = ComponentBuilder;
