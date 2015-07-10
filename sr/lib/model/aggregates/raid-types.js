'use strict';

var _ = require('lodash'),
    assert = require('assert');

function RaidTypes() {
    _.extend(this, {
        RAID_0: 'RAID_0',
        RAID_1: 'RAID_1',
        RAID_3: 'RAID_3',
        RAID_4: 'RAID_4',
        RAID_5: 'RAID_5',
        RAID_6: 'RAID_6',
        RAID_10: 'RAID_10',
        RAID_DP: 'RAID_DP',
        DDP: 'DDP'
    });
}

RaidTypes.prototype.minRaidSize = function minRaidSize(requestedRaidType) {
    requestedRaidType = this._fixOldRaidTypeIfRequired(requestedRaidType);

    switch (requestedRaidType) {
        case this.RAID_0:
        case this.RAID_1:
        case this.RAID_4:
            return 2;
        case this.RAID_2:
        case this.RAID_3:
        case this.RAID_5:
        case this.RAID_DP:
            return 3;
        case this.RAID_6:
        case this.RAID_10:
            return 4;
        case this.DDP:
            return 11;
        default:
            return 1;
    }
};

RaidTypes.prototype.isMirrored = function isMirrored(requestedRaidType) {
    requestedRaidType = this._fixOldRaidTypeIfRequired(requestedRaidType);

    switch (requestedRaidType) {
        case this.RAID_1:
        case this.RAID_10:
            return true;
        default:
            return false;
    }
};

RaidTypes.prototype.firstDriveRoles = function firstDriveRoles(requestedRaidType) {
    requestedRaidType = this._fixOldRaidTypeIfRequired(requestedRaidType);

    return this._raidMaps[requestedRaidType];
};

RaidTypes.prototype.driveRolesForRaidType = function driveRolesForRaidType(requestedRaidType, drivesInRaidGroup) {
    requestedRaidType = this._fixOldRaidTypeIfRequired(requestedRaidType);

    var parityCount = this._howManyOfThisRoleForRaidType(requestedRaidType, 'parity'),
        dparityCount = this._howManyOfThisRoleForRaidType(requestedRaidType, 'dparity'),
        data = drivesInRaidGroup - parityCount - dparityCount;

    return {
        parity: parityCount,
        dparity: dparityCount,
        data: data
    };
};

RaidTypes.prototype._fixOldRaidTypeIfRequired = function _fixOldRaidTypeIfRequired(requestedRaidType) {
    return this._intRaidTypeToString(requestedRaidType);
};

RaidTypes.prototype._intRaidTypeToString = function _intRaidTypeToString(requestedRaidType) {
    if (this._isInt(requestedRaidType)) {
        var typeToIntMap = [
            'RAID_0',
            'RAID_1',
            'RAID_3',
            'RAID_4',
            'RAID_5',
            'RAID_6',
            'RAID_10',
            'RAID_DP',
            'DDP'
        ];

        return typeToIntMap[requestedRaidType];
    }
    else {
        return requestedRaidType;
    }
};

RaidTypes.prototype._isInt = function _isInt(n) {
    return Number(n) === n && n % 1 === 0;
};

RaidTypes.prototype._howManyOfThisRoleForRaidType = function _howManyOfThisRoleForRaidType(requestedRaidType, role) {
    assert(role !== 'data', 'do not use this for data, look for everything else and data is what is left over');
    requestedRaidType = this._fixOldRaidTypeIfRequired(requestedRaidType);

    var rolesForRaidType = _.where(this.firstDriveRoles(requestedRaidType), function(driveRole) {
        return driveRole === role;
    });

    return rolesForRaidType.length;
};

RaidTypes.prototype._raidMaps = {
    RAID_0: ['data'],
    RAID_1: ['data'],
    RAID_3: ['parity', 'data'],
    RAID_4: ['parity', 'data'],
    RAID_5: ['parity', 'data'],
    RAID_6: ['parity', 'dparity', 'data'],
    RAID_10: ['data'],
    RAID_DP: ['parity', 'dparity', 'data'],
    DDP: ['data']
};

RaidTypes.prototype._getDdpReserveRecommendation = function(driveCount) {
    if (driveCount <= 11) {
        return 1;
    } else if (driveCount <= 31) {
        return 2;
    } else if (driveCount <= 63) {
        return 3;
    } else if (driveCount <= 127) {
        return 4;
    } else if (driveCount <= 191) {
        return 6;
    } else if (driveCount <= 255) {
        return 7;
    } else if (driveCount <= 384) {
        return 8;
    } else {
        return Math.min(Math.ceil(driveCount * 0.2), 10);
    }
};

RaidTypes.prototype.getParityCountForRaidType = function(raidType) {
    // TODO do these roles properly coorespondingly mirror drives 'parity' like in _raidMaps?
    // mirroring RaidTypes we need to actually multiply ceil(raidSize * 0.5) mirror/parity
    return this._howManyOfThisRoleForRaidType(raidType, 'parity') +
        this._howManyOfThisRoleForRaidType(raidType, 'dparity');
};

module.exports = RaidTypes;
