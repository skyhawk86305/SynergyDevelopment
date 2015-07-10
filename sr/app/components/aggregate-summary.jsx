'use strict';

var React = require('react'),
    RaidTypes = require('../../lib/model/aggregates/raid-types'),
	Unit = require('../../lib/units.js');

var AggregateSummary = React.createClass({
    propTypes: {
        report: React.PropTypes.object.isRequired,
        limits: React.PropTypes.object.isRequired,
        base10YieldsPreference: React.PropTypes.string.isRequired,
        raidType: React.PropTypes.string.isRequired,
        isESeries: React.PropTypes.bool.isRequired,
    },

    render: function() {
        var scaleModifier = 200;
        if (this.props.isESeries) {
            return (
                <StorageContainerSummary
                    report={ this.props.report }
                    limits={ this.props.limits }
                    base10YieldsPreference={ this.props.base10YieldsPreference }
                    raidType={ this.props.raid_type } />
            );
        }

        return (
            <div className="aggregate-editor-extended-options aggregate-editor-summary">
                <div className="row-list-item-option-header">
                    Aggregate Summary
                </div>
                <CapacitySummaryChartWithSnapReserve
                    report={ this.props.report }
                    limits={ this.props.limits }
                    scaleModifier={ scaleModifier }
                    base10YieldsPreference={ this.props.base10YieldsPreference }/>
                <DriveCountsSummaryChartWithParity
                    driveRoleSummary={ this.props.report.summary.driveRoleSummary }
                    limits={ this.props.limits }
                    scaleModifier={ scaleModifier } />
            </div>
        );
    }
});

var StorageContainerSummary = React.createClass({
    propTypes: {
        report: React.PropTypes.object.isRequired,
        limits: React.PropTypes.object.isRequired,
        base10YieldsPreference: React.PropTypes.string.isRequired,
        raidType: React.PropTypes.string.isRequired,
    },

    render: function () {
        var aggregateDisplayLanguage = this.props.raidType === 'DDP' || this.props.raidType === new RaidTypes().DDP ? 'DDP' : 'Volume Group',
            scaleModifier = 200,
            driveCountSummaryDisplay;

        if (aggregateDisplayLanguage === 'DDP') {
            driveCountSummaryDisplay = (
                <DriveCountsSummaryChartWithReserve
                    driveRoleSummary={ this.props.report.summary.driveRoleSummary }
                    limits={ this.props.limits }
                    scaleModifier={ scaleModifier } />
            );
        } else {
            driveCountSummaryDisplay = (
                <DriveCountsSummaryChartWithParity
                    driveRoleSummary={ this.props.report.summary.driveRoleSummary }
                    limits={ this.props.limits }
                    scaleModifier={ scaleModifier }
                    showTotalToMaxRatio={ true } />
            );
        }

        return (
            <div className="aggregate-editor-extended-options aggregate-editor-summary">
                <div className="row-list-item-option-header">
                    Storage Container Summary
                </div>
                <CapacitySummaryChartForESeries
                    report={ this.props.report }
                    limits = { this.props.limits }
                    scaleModifier={ scaleModifier }
                    base10YieldsPreference={ this.props.base10YieldsPreference }
                    aggregateDisplayLanguage={ aggregateDisplayLanguage } />
                { driveCountSummaryDisplay }
            </div>
        );
    }
});

var CapacitySummaryChartForESeries = React.createClass({
    render: function() {
        var report = this.props.report,
            limits = this.props.limits,
            base10YieldsPreference = this.props.base10YieldsPreference,
            aggregateDisplayLanguage = this.props.aggregateDisplayLanguage,
            capacity = (report.summary.isRootAggregate) ? (report.summary.rootCapacity) : (report.summary.usableCapacity),
            capacityText = (report.summary.isRootAggregate) ? 'Root Capacity ' : 'Usable Capacity ',
            // totalCapacity = report.summary.snapReserveCapacity + capacity;
            scaleModifier = this.props.scaleModifier,
            maxCapacityUnit = new Unit(limits.capacity_gb, 'GB'),
            maxCapacityGiB = maxCapacityUnit.to('GiB').value,
            reserveScaled = (0 / maxCapacityGiB) * scaleModifier,
            capacityScaled = (capacity / maxCapacityGiB) * scaleModifier,
            usableCapacityUnit = new Unit(capacity, 'GiB');

        return (
            <div className="ae-summary-graph">
                <span className="emphasize">{ aggregateDisplayLanguage } Size</span>
                {/*<span className="pull-right">
                 { new Unit(totalCapacity, 'GiB').to(base10YieldsPreference).friendly(2) }
                 &nbsp;/&nbsp;
                 { maxCapacityUnit.to(base10YieldsPreference).friendly(2) }
                 </span>
                 <br/>*/}
                <svg width={ scaleModifier } height="110">
                    <g>
                        <rect width={ scaleModifier } height="32" y="2" className="ae-summary-bar-container" />
                        <rect width={ reserveScaled } height="32" y="2" className="ae-summary-bar-snap-reserve" />
                        <rect width={ capacityScaled } height="32" x={ reserveScaled } y="2" className="ae-summary-bar-usable-capacity" />
                    </g>
                    <g>
                        <rect width="8" height="8" y="48" className="ae-summary-bar-usable-capacity" />
                        <text x="16" y="56">
                            {capacityText + ' ' + usableCapacityUnit.to(base10YieldsPreference).friendly(2) }
                        </text>
                    </g>
                </svg>
            </div>
        );
    }
});

var CapacitySummaryChartWithSnapReserve = React.createClass({
    render: function() {
        var report = this.props.report,
            limits = this.props.limits,
            base10YieldsPreference = this.props.base10YieldsPreference,
            capacity = (report.summary.isRootAggregate) ? (report.summary.rootCapacity) : (report.summary.usableCapacity),
            capacityText = (report.summary.isRootAggregate) ? 'Root Capacity ' : 'Usable Capacity ',
            totalCapacity = report.summary.snapReserveCapacity + capacity,
            scaleModifier = this.props.scaleModifier,
            snapReserveScaled = (report.summary.snapReserveCapacity / new Unit(limits.aggr.size_64_tb, 'TiB').to('GiB').value) * scaleModifier,
            capacityScaled = (capacity / new Unit(limits.aggr.size_64_tb, 'TiB').to('GiB').value) * scaleModifier,
            usableCapacityUnit = new Unit(capacity, 'GiB'),
            snapReserveCapacityUnit = new Unit(report.summary.snapReserveCapacity, 'GiB');

        return(
            <div className="ae-summary-graph">
                <span className="emphasize">Aggregate Size</span>
                <br/>
                <span className="pull-right">
                        { new Unit(totalCapacity, 'GiB').to(base10YieldsPreference).friendly(2) }
                &nbsp;/&nbsp;
                        { new Unit(limits.aggr.size_64_tb, 'TiB').to(base10YieldsPreference).friendly(2) }
                </span>
                <br/>
                <svg width={ scaleModifier } height="110">
                    <g>
                        <rect width={ scaleModifier } height="32" y="2" className="ae-summary-bar-container" />
                        <rect width={ snapReserveScaled } height="32" y="2" className="ae-summary-bar-snap-reserve" />
                        <rect width={ capacityScaled } height="32" x={ snapReserveScaled } y="2" className="ae-summary-bar-usable-capacity" />
                    </g>
                    <g>
                        <rect width="8" height="8" y="48" className="ae-summary-bar-snap-reserve" />
                        <text x="16" y="56">
                                {'Snap Reserve ' + snapReserveCapacityUnit.to(base10YieldsPreference).friendly(2) }
                        </text>

                        <rect width="8" height="8" y="72" className="ae-summary-bar-usable-capacity" />
                        <text x="16" y="80">
                                {capacityText + ' ' + usableCapacityUnit.to(base10YieldsPreference).friendly(2) }
                        </text>
                    </g>
                </svg>
            </div>
        );
    }
});

var DriveCountsSummaryChartWithParity = React.createClass({
    render: function() {
        var scaleModifier = this.props.scaleModifier,
            maxDrives = this.props.limits.drive.total,
            driveSummary = this.props.driveRoleSummary,
            totalParityDrives = driveSummary.parity + driveSummary.dparity,
            totalDrives = totalParityDrives + driveSummary.data + totalParityDrives,
            parityDrivesScaled = (totalParityDrives / maxDrives) * scaleModifier,
            dataDrivesScaled = (driveSummary.data / maxDrives) * scaleModifier,
            showTotalToMaxRatio = this.props.showTotalToMaxRatio;

        /*var maxDrives = //// TODO: getMaxAggrDrives(new Unit(limits.aggr.size_64_tb, 'TiB').to('GiB').value, report.drivesSpec.size, aggregate.raidsize);
            Math.floor(limits.aggr.size_64_tb); // temp arbitrary limit, removed label
            */

        return (
            <div className="ae-summary-graph">
                <span className="emphasize">Drive Counts</span>
                { showTotalToMaxRatio ? (<span className="pull-right">{ totalDrives } / {maxDrives} Drives</span>) : '' }
                <svg width={ scaleModifier } height="140">
                    <g>
                        <rect width={ scaleModifier } height="32" y="2" className="ae-summary-bar-container" />
                        <rect width={ parityDrivesScaled } height="32" y="2" className="ae-summary-bar-parity-drives" />
                        <rect width={ dataDrivesScaled } height="32" x={ parityDrivesScaled } y="2" className="ae-summary-bar-data-drives" />
                    </g>
                    <g>
                        <rect width="8" height="8" y="48" className="ae-summary-bar-parity-drives" />
                        <text x="16" y="56">{ 'Parity Drives ' + totalParityDrives }</text>
                        <rect width="8" height="8" y="72" className="ae-summary-bar-data-drives" />
                        <text x="16" y="80">{ 'Data Drives ' + (driveSummary.data) }</text>
                    </g>
                </svg>
            </div>
        );
    }
});

var DriveCountsSummaryChartWithReserve = React.createClass({
    render: function() {
        var scaleModifier = this.props.scaleModifier,
            maxDrives = this.props.limits.drive.total,
            driveSummary = this.props.driveRoleSummary,
            totalParityDrives = driveSummary.parity + driveSummary.dparity,
            parityDrivesScaled = (totalParityDrives / maxDrives) * scaleModifier,
            dataDrivesScaled = (driveSummary.data / maxDrives) * scaleModifier,
            totalDrives = totalParityDrives + driveSummary.data + (driveSummary.reserve || 0);

        return(
            <div className="ae-summary-graph">
                <span className="emphasize">Drive Counts</span>
                <span className="pull-right">{ totalDrives } / {maxDrives} Drives</span><br/>
                <svg width={ scaleModifier } height="140">
                    <g>
                        <rect width={ scaleModifier } height="32" y="2" className="ae-summary-bar-container" />
                        <rect width={ parityDrivesScaled } height="32" y="2" className="ae-summary-bar-parity-drives" />
                        <rect width={ dataDrivesScaled } height="32" x={ parityDrivesScaled } y="2" className="ae-summary-bar-data-drives" />
                    </g>
                    <g>
                        <rect width="8" height="8" y="48" className="ae-summary-bar-parity-drives" />
                        <text x="16" y="56">{'Reserve Drives ' + (driveSummary.reserve || 0)}</text>
                        <rect width="8" height="8" y="72" className="ae-summary-bar-data-drives" />
                        <text x="16" y="80">{'Data Drives ' + (driveSummary.data)}</text>
                    </g>
                </svg>
            </div>
        );
    }
});

module.exports = AggregateSummary;
