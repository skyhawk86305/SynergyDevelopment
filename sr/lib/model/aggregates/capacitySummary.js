'use strict';

var Unit = require('../../units.js');

/*
    NOTICE: All capaities will be reported in GB from this library
*/

function CapacitySummary(aggregate, isESeries, isFlashRay) {
    this.aggregate = aggregate;

    // FAS is default system type
    if (isESeries || isFlashRay) {
        this.fas = false;
        this.eseries = isESeries || false;
        this.flashray = isFlashRay || false;
    }
    else {
        this.fas = true;
        this.eseries = false;
        this.flashray = false;
    }
}

/*
    NOTICE:
        This will always return GiB! (RightSizedCapacity)
*/
CapacitySummary.prototype.getCapacitiesFromRaidGroup = function(raidGroup) {
    var rgDisk = {
        marketing: raidGroup.capacity,
        capacity: raidGroup.sliceCapacity || (raidGroup.rsCapacity || raidGroup.capacity),
        model: raidGroup.model
    };

    var rawCapacityPerDisk = new Unit(rgDisk.capacity, 'GB'),
        rawMarketingPerDisk = new Unit(rgDisk.marketing, 'GB');

    var perDiskYield = this._determinePerDataDiskYield(rgDisk),
        rgYield = perDiskYield.mult(raidGroup.counts.data),
        rawYield = rawCapacityPerDisk.mult(raidGroup.counts.total),
        rawMarketing = rawMarketingPerDisk.mult(raidGroup.counts.total),
        snapReserveProp = this.aggregate.snapReserveProportion || 0,
        ddpReserve = this.aggregate.ddpReserve,
        isMirrored = this.aggregate.isSyncMirrored,
        mirrorDivider = (isMirrored) ? 2 : 1,
        gibRgYield = rgYield.to('GiB').value / mirrorDivider,
        usableGib = gibRgYield * (1 - snapReserveProp);

    return {
        rawMarketing: rawMarketing.value_gb,
        raw: rawYield.to('GiB').value,
        usable: usableGib,
        snap: gibRgYield * snapReserveProp,
        ddpReserve: perDiskYield * ddpReserve,
    };
};

CapacitySummary.prototype._determinePerDataDiskYield = function(disk) {
    if (this.eseries) {
        return this._perDiskYieldESeries(disk);
    }
    else {
        return this._perDiskYieldFAS(disk);
    }
};

CapacitySummary.prototype._perDiskYieldFAS = function(disk) {
    var waflModifier = 0.9,
        fixedOverhead = new Unit(20.5, 'MiB'),
        diskCapacity = new Unit(disk.capacity, 'GB');

    return new Unit(diskCapacity.subtract(fixedOverhead).value_gb * waflModifier);
};

CapacitySummary.prototype._perDiskYieldESeries = function(disk) {
    var fixedOverhead = new Unit(512, 'MiB'),
        diskCapacity = new Unit(disk.capacity, 'GB');

    return diskCapacity.subtract(fixedOverhead);
};

module.exports = CapacitySummary;
