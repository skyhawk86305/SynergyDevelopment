'use strict';

var React = require('react'),
    Repeat = require('./repeat'),
    Button = require('./button'),
    ColumnHeader = require('./layout/column-header'),
    ActionLink = require('./layout/action-link'),
    ScrollableRegion = require('./layout/scrollable-region'),
    CapacityTooltip = require('./capacity-tooltip'),
    SystemSummary = require('../../lib/model/aggregates/systemSummary.js'),
    EnvironmentalSummary = require('../../lib/model/inspect/environmental-summary'),
    Unit = require('../../lib/units.js'),
    FAGlyph = require('./faglyph'),
    _ = require('lodash');

var DriveTypeRow = React.createClass({
    propTypes: {
        driveType: React.PropTypes.object.isRequired
    },

    render: function() {
        return (
            <tr>
                <td>
                    <div className="drive-summary-block no-overflow drive-breakdown">
                        <span className="drive-count">{ this.props.driveType.count }</span>
                        <span className="fa fa-fw fa-hdd-o"></span>
                        <span className="drive-label-size">{ new Unit(this.props.driveType.rawgb, 'GB').to('TB').makeHappyFriendly(null, null, '%d%s') }
                            <span className="drive-type">{ this.props.driveType.type }</span>
                        </span>
                    </div>
                </td>
            </tr>
        );
    }
});

var GroupedCapacitySummary = React.createClass({
    propTypes: {
        summary: React.PropTypes.object.isRequired,
        useBase10Yields: React.PropTypes.bool.isRequired,
    },

    render: function() {
        var performanceSummary = this.props.summary.performanceSummary,
            capacitySummary = this.props.summary.capacitySummary,
            ssdSummary = this.props.summary.ssdSummary,
            totalSummary = this.props.summary,
            displayInUnitBase = this.props.useBase10Yields ? 'TB' : 'TiB';

        return (
            <div className="capacity-summary">
                <table>
                    <thead>
                        <tr>
                            <td></td>
                            <th scope="col" className="numeric">Raw</th>
                            <th scope="col" className="numeric">Usable</th>
                        </tr>
                    </thead>
                    <tbody className="last-row">
                        <tr className="drive-class-row">
                            <td>
                                <div className="drive-summary-block no-overflow drive-performance">
                                    <span className="drive-count">{ performanceSummary.total }</span>
                                    <span className="fa fa-fw fa-hdd-o"></span>
                                    <span className="drive-label">Performance HDD</span>
                                </div>
                            </td>
                            <td className="numeric">
                                { new Unit(performanceSummary.rawCapacity, 'GB').to('TB').friendly(2) }
                                <CapacityTooltip title="Raw Capacity (Performance HDD)" inputValue={performanceSummary.rawCapacity} displayUnitsFrom='GB' />
                            </td>
                            <td className="numeric">
                                { new Unit(performanceSummary.usableCapacity, 'GiB').to(displayInUnitBase).friendly(2) }
                                <CapacityTooltip title="Usable Capacity (Performance HDD)" inputValue={performanceSummary.usableCapacity} displayUnitsFrom='GiB' />
                            </td>
                        </tr>
                        <tr className="drive-class-row">
                            <td>
                                <div className="drive-summary-block no-overflow drive-capacity">
                                    <span className="drive-count">{ capacitySummary.total }</span>
                                    <span className="fa fa-fw fa-hdd-o"></span>
                                    <span className="drive-label">Capacity HDD</span>
                                </div>
                            </td>
                            <td className="numeric">
                                { new Unit(capacitySummary.rawCapacity, 'GB').to('TB').friendly(2) }
                                <CapacityTooltip title="Raw Capacity (Capacity HDD)" inputValue={capacitySummary.rawCapacity} displayUnitsFrom= 'GB' />
                            </td>
                            <td className="numeric">
                                { new Unit(capacitySummary.usableCapacity, 'GiB').to(displayInUnitBase).friendly(2) }
                                <CapacityTooltip title="Usable Capacity (Capacity HDD)" inputValue={capacitySummary.usableCapacity} displayUnitsFrom= 'GiB' />
                            </td>
                        </tr>
                        <tr className="drive-class-row">
                            <td>
                                <div className="drive-summary-block no-overflow drive-ssd">
                                    <span className="drive-count">{ ssdSummary.total }</span>
                                    <span className="fa fa-fw fa-hdd-o"></span>
                                    <span className="drive-label">Solid-State Drive</span>
                                </div>
                            </td>
                            <td className="numeric">
                                { new Unit(ssdSummary.rawCapacity, 'GB').to('TB').friendly(2) }
                                <CapacityTooltip title="Raw Capacity (SSD)" inputValue={ssdSummary.rawCapacity} displayUnitsFrom= 'GB' />
                            </td>
                            <td className="numeric">
                                { new Unit(ssdSummary.usableCapacity, 'GiB').to(displayInUnitBase).friendly(2) }
                                <CapacityTooltip title="Usable Capacity (SSD)" inputValue={ssdSummary.usableCapacity} displayUnitsFrom= 'GiB' />
                            </td>
                        </tr>
                    </tbody>
                    <tbody>
                        <tr className="drive-class-row drive-total">
                            <td>
                                <div className="drive-summary-block no-overflow">
                                    <span className="drive-count">{ totalSummary.total }</span>
                                    <span className="fa fa-fw fa-hdd-o"></span>
                                    <span className="drive-label">Total</span>
                                </div>
                            </td>
                            <td className="numeric">
                                { new Unit(totalSummary.rawCapacity, 'GB').to('TB').friendly(2) }
                                <CapacityTooltip title="Raw Capacity (Total)" inputValue={totalSummary.rawCapacity} displayUnitsFrom= 'GB' />
                            </td>
                            <td className="numeric">
                                { new Unit(totalSummary.usableCapacity, 'GiB').to(displayInUnitBase).friendly(2) }
                                <CapacityTooltip title="Usable Capacity (Total)" inputValue={totalSummary.usableCapacity} displayUnitsFrom= 'GiB' />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
});

var ExpandedCapacitySummary = React.createClass({
    propTypes: {
        summary: React.PropTypes.object.isRequired,
        useBase10Yields: React.PropTypes.bool.isRequired,
    },

    render: function() {
        var performanceSummary = this.props.summary.performanceSummary,
            capacitySummary = this.props.summary.capacitySummary,
            ssdSummary = this.props.summary.ssdSummary,
            totalSummary = this.props.summary,
            displayInUnitBase = this.props.useBase10Yields ? 'TB' : 'TiB';

            console.log("Capacity", capacitySummary);

        return (
            <div className="capacity-summary">
                <table>
                    <thead>
                        <tr>
                            <td></td>
                            <th scope="col" className="numeric">Raw</th>
                            <th scope="col" className="numeric">Usable</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="drive-class-row">
                            <th scope="row">
                                <div className="drive-summary-block no-overflow drive-performance">
                                    <span className="drive-count">{ performanceSummary.total }</span>
                                    <span className="fa fa-fw fa-hdd-o"></span>
                                    <span className="drive-label">Performance HDD</span>
                                </div>
                            </th>
                            <td className="numeric">
                                { new Unit(performanceSummary.rawCapacity, 'GB').to('TB').friendly(2) }
                                <CapacityTooltip title="Raw Capacity (Performance HDD)" inputValue={performanceSummary.rawCapacity} displayUnitsFrom= 'GB' />
                            </td>
                            <td className="numeric">
                                { new Unit(performanceSummary.usableCapacity, 'GiB').to(displayInUnitBase).friendly(2) }
                                <CapacityTooltip title="Usable Capacity (Performance HDD)" inputValue={performanceSummary.usableCapacity} displayUnitsFrom= 'GiB' />
                            </td>
                        </tr>
                    </tbody>
                    <Repeat seq={ performanceSummary.driveCapacitySummaryByType }
                        prop="driveType"
                        type="tableRow">
                        <DriveTypeRow />
                    </Repeat>
                    <tbody>
                        <tr className="drive-class-row">
                            <th scope="row">
                                <div className="drive-summary-block drive-capacity">
                                    <span className="drive-count">{ capacitySummary.total }</span>
                                    <span className="fa fa-fw fa-hdd-o"></span>
                                    <span className="drive-label">Capacity HDD</span>
                                </div>
                            </th>
                            <td className="numeric">
                                { new Unit(capacitySummary.rawCapacity, 'GB').to('TB').friendly(2) }
                                <CapacityTooltip title="Raw Capacity (Capacity HDD)" inputValue={capacitySummary.rawCapacity} displayUnitsFrom= 'GB' />
                            </td>
                            <td className="numeric">
                                { new Unit(capacitySummary.usableCapacity, 'GiB').to(displayInUnitBase).friendly(2) }
                                <CapacityTooltip title="Usable Capacity (Capacity HDD)" inputValue={capacitySummary.usableCapacity} displayUnitsFrom= 'GiB' />
                            </td>
                        </tr>
                    </tbody>
                    <Repeat seq={ capacitySummary.driveCapacitySummaryByType }
                        prop="driveType"
                        type="tableRow">
                        <DriveTypeRow />
                    </Repeat>
                    <tbody>
                        <tr className="drive-class-row">
                            <th scope="row">
                                <div className="drive-summary-block no-overflow drive-ssd">
                                    <span className="drive-count">{ ssdSummary.total }</span>
                                    <span className="fa fa-fw fa-hdd-o"></span>
                                    <span className="drive-label">Solid-State Drive</span>
                                </div>
                            </th>
                            <td className="numeric">
                                { new Unit(ssdSummary.rawCapacity, 'GB').to('TB').friendly(2) }
                                <CapacityTooltip title="Raw Capacity (SDD)" inputValue={ssdSummary.rawCapacity} displayUnitsFrom= 'GB' />
                            </td>
                            <td className="numeric">
                                { new Unit(ssdSummary.usableCapacity, 'GiB').to(displayInUnitBase).friendly(2) }
                                <CapacityTooltip title="Usable Capacity (SDD)" inputValue={ssdSummary.usableCapacity} displayUnitsFrom= 'GiB' />
                            </td>
                        </tr>
                    </tbody>
                    <Repeat seq={ ssdSummary.driveCapacitySummaryByType }
                        prop="driveType"
                        type="tableRow"
                        className="last-row">
                        <DriveTypeRow />
                    </Repeat>
                    <tbody>
                        <tr className="drive-class-row drive-total">
                            <th scope="row">
                                <div className="drive-summary-block no-overflow">
                                    <span className="drive-count">{ totalSummary.total }</span>
                                    <span className="fa fa-fw fa-hdd-o"></span>
                                    <span className="drive-label">Total</span>
                                </div>
                            </th>
                            <td className="numeric">
                                { new Unit(totalSummary.rawCapacity, 'GB').to('TB').friendly(2) }
                                <CapacityTooltip title="Raw Capacity (Total)" inputValue={totalSummary.rawCapacity} displayUnitsFrom= 'GB' />
                            </td>
                            <td className="numeric">
                                { new Unit(totalSummary.usableCapacity, 'GiB').to(displayInUnitBase).friendly(2) }
                                <CapacityTooltip title="Usable Capacity (Total)" inputValue={totalSummary.usableCapacity} displayUnitsFrom= 'GiB' />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
});

var CapacitySummary = React.createClass({
    propTypes: {
        grouped: React.PropTypes.bool.isRequired,
        summary: React.PropTypes.object.isRequired,
        useBase10Yields: React.PropTypes.bool.isRequired,
    },
    render: function() {
        if (this.props.grouped) {
            return(
                <GroupedCapacitySummary
                    summary={ this.props.summary }
                    useBase10Yields={ this.props.useBase10Yields } />
            );
        } else {
            return(
                <ExpandedCapacitySummary
                    summary={ this.props.summary }
                    useBase10Yields={ this.props.useBase10Yields }  />
            );
        }
    }
});

var EnvironmentalSummaryView = React.createClass({
    render: function() {
        var hagroups = this.props.hagroups,
            map = this.props.map,
            env = new EnvironmentalSummary(map, hagroups),
            sum = env.create(),
            mainsVoltage = this.props.voltageDisplay,
            powerSpec = sum.power_spec[mainsVoltage];
        // jshint laxbreak: true
        // jsxhint laxbreak: true
        return (
            <div className="environmental-summary">
                <table>
                    <thead>
                        <tr>
                            <td></td>
                            <th scope="col" className="numeric">Typical</th>
                            <th scope="col" className="numeric">Worst Case*</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th scope="row"><span className="fa fa-fw fa-dashboard"></span> Current Draw</th>
                            <td className="numeric">{format(powerSpec.typical.amps, 1)} A</td>
                            <td className="numeric">{format(powerSpec.worst.amps, 1)} A</td>
                        </tr>
                        <tr>
                            <th scope="row"><span className="fa fa-fw fa-bolt"></span> AC Power</th>
                            <td className="numeric">
                                {format(env.powerWattsToVoltAmps(powerSpec.typical.watts))} VA
                                &nbsp;/&nbsp;
                                {format(powerSpec.typical.watts)} W</td>
                            <td className="numeric">
                                {format(env.powerWattsToVoltAmps(powerSpec.worst.watts))}  VA
                                &nbsp;/&nbsp;
                                {format(powerSpec.worst.watts)} W</td>
                        </tr>
                        <tr>
                            <th scope="row"><span className="fa fa-fw fa-fire"></span> BTU / hr</th>
                            <td className="numeric">{format(powerSpec.typical.BTU)}</td>
                            <td className="numeric">{format(powerSpec.worst.BTU)}</td>
                        </tr>
                        <tr>
                            <th scope="row"><span className="fa fa-fw fa-lightbulb-o"></span> kWh / year</th>
                            <td className="numeric">{format(env.powerWattsToKWhPerYear(powerSpec.typical.watts))}</td>
                            <td className="numeric">{format(env.powerWattsToKWhPerYear(powerSpec.worst.watts))}</td>
                        </tr>
                    </tbody>
                    <tbody>
                        <tr>
                            <th scope="row"><span className="fa fa-fw fa-server"></span> Rack Units</th>
                            <td className="numeric">{sum.rack_units} U</td>
                            <td></td>
                        </tr>
                        <tr>
                            <th scope="row"><span className="fa fa-fw fa-plug"></span> Outlets</th>
                            <td className="numeric">{sum.max_psu}</td>
                            <td></td>
                        </tr>
                        <tr>
                            <th scope="row"><span className="fa fa-fw fa-anchor"></span> Weight</th>
                            <td className="numeric">
                                {format(env.weightGtoLbs(sum.weight_g))} lbs
                                &nbsp;/&nbsp;
                                {format(env.weightGtoKg(sum.weight_g))} kg</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
                <p>
                    { sum.completeStatsAvailable
                        ? (<div/>)
                        : ( <div className="headroom">
                                <span className="fa fa-fw fa-warning"></span>
                                Complete environmental data unavailable. Some devices not accounted for.
                            </div>) }
                </p>
                <p className="footnote">
                    *Power consumption with system running on one PSU, high fan speed and power distributed over one power cord.
                    DS4xxx disk shelves are an exception, in that they require two PSUs.
                </p>
            </div>
        );

        function format(decimal, fractionDigits) {
            return decimal.toFixed(fractionDigits || 0).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
        }
    }
});

var DriveSummary = React.createClass({
    propTypes: {
        summary: React.PropTypes.object.isRequired,
    },

    render: function() {
        var driveRoleSummary = this.props.summary.driveRoleSummary;
        console.log('Drive Role Summary', driveRoleSummary);
        return (
            <div className="drive-summary">
                <table>
                    <thead>
                        <tr>
                            <td></td>
                            <th scope="col" className="numeric">Data</th>
                            <th scope="col" className="numeric">Parity</th>
                            <th scope="col" className="numeric">Spare</th>
                            <th scope="col" className="numeric">Root</th>
                            <th scope="col" className="numeric">Cache</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="drive-class-row">
                            <th scope="row">
                                <div className="drive-summary-block no-overflow">
                                    <span className="drive-count">{ driveRoleSummary.physical.total }</span>
                                    <span className="fa fa-fw fa-hdd-o"></span>
                                    <span>Dedicated</span>
                                </div>
                            </th>
                            <td className="numeric">{ driveRoleSummary.physical.data }</td>
                            <td className="numeric">{ driveRoleSummary.physical.parity + driveRoleSummary.physical.dparity }</td>
                            <td className="numeric">{ driveRoleSummary.physical.spare }</td>
                            <td className="numeric">{ driveRoleSummary.physical.root }</td>
                            <td className="numeric">{ driveRoleSummary.physical.cache }</td>
                        </tr>
                        <tr className="drive-class-row">
                            <th scope="row">
                                <div className="drive-summary-block no-overflow">
                                    <span className="drive-count">{ this.props.summary.total - driveRoleSummary.physical.total }</span>
                                    <span className="fa fa-fw fa-hdd-o"></span>
                                    <span>Partitioned</span>
                                </div>
                            </th>
                        </tr>
                        <tr className="drive-class-row">
                            <th scope="row">
                                <div className="drive-summary-block no-overflow">
                                    <span className="drive-count"></span>
                                    <span className="fa fa-fw fa-pie-chart"></span>
                                    <span>Partitions</span>
                                </div>
                            </th>
                            <td className="numeric">{ driveRoleSummary.virtual.data }</td>
                            <td className="numeric">{ driveRoleSummary.virtual.parity + driveRoleSummary.virtual.dparity }</td>
                            <td className="numeric">{ driveRoleSummary.virtual.spare }</td>
                            <td className="numeric">{ driveRoleSummary.virtual.root }</td>
                            <td className="numeric">{ driveRoleSummary.virtual.cache }</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
});

var Reports = React.createClass({
    propTypes: {
        selectedItem: React.PropTypes.any.isRequired,
        fire: React.PropTypes.func.isRequired,
        map: React.PropTypes.object.isRequired,
        installations: React.PropTypes.array.isRequired,
        userPreferences: React.PropTypes.object.isRequired,
        projectId: React.PropTypes.string.isRequired
    },

    _showSolutionView: function() {
        this.props.fire('USER_PREFERENCES_ADJUST', { currentSystemsView: false });
    },

    _showCurrentView: function() {
        this.props.fire('USER_PREFERENCES_ADJUST', { currentSystemsView: true });
    },

    _groupAll: function() {
        this.props.fire('USER_PREFERENCES_ADJUST', { collapseCapacity: true });
    },

    _expandAll: function() {
        this.props.fire('USER_PREFERENCES_ADJUST', { collapseCapacity: false });
    },

    _showUnitBase2: function() {
        this.props.fire('USER_PREFERENCES_ADJUST', { useBase10Yields: false });
    },

    _showUnitBase10: function() {
        this.props.fire('USER_PREFERENCES_ADJUST', { useBase10Yields: true });
    },

    _setMainsVoltageTo_v_100: function() {
        this.props.fire('USER_PREFERENCES_ADJUST', { mainsVoltage: 'v_100' });
    },

    _setMainsVoltageTo_v_200: function() {
        this.props.fire('USER_PREFERENCES_ADJUST', { mainsVoltage: 'v_200' });
    },

    _getHaGroups: function(currentSystemsView, canShowSelected) {
        if (!currentSystemsView || !canShowSelected) {
            var selectedHaPairs = [];

            _.forEach(this.props.installations, function(installation) {
                if (installation.clusters) {
                    _.forEach(installation.clusters, function(cluster) {
                        selectedHaPairs.push(cluster.hagroups);
                    });
                }

                if (installation.hagroups) {
                    selectedHaPairs.push(installation.hagroups);
                }
            });

            selectedHaPairs = _.flatten(selectedHaPairs);

            return selectedHaPairs;
        }

        var selectedItem = this.props.selectedItem,
            clusters = _.where(selectedItem, { _type: 'cluster' }),
            hagroups = _.reduce(clusters, accumulate, _.where(selectedItem, { _type: 'hagroup' }));

        function accumulate(hagroups, cluster) {
            Array.prototype.push.apply(hagroups, cluster.hagroups);
            return hagroups;
        }

        return hagroups;
    },

    render: function() {
        var canShowSelected;

        if (this.props.selectedItem) {
            canShowSelected = true;
        } else {
            canShowSelected = false;
        }

        var grouped = this.props.userPreferences.collapseCapacity || false,
            currentSystemsView = this.props.userPreferences.currentSystemsView || false,
            hagroups = this._getHaGroups(currentSystemsView, canShowSelected),
            summary = new SystemSummary(this.props.map, hagroups).createSystemSummary(),
            firstInstallation = _.first(this.props.installations);

        var useBase10Yields = this.props.userPreferences.useBase10Yields || false,
            mainsVoltage = this.props.userPreferences.mainsVoltage === 'v_200' ? 'v_200' : 'v_100';

        var generateWordBtn;
        if (firstInstallation && (!_.isEmpty(firstInstallation.clusters) || !_.isEmpty(firstInstallation.hagroups))) {
            generateWordBtn = (
                <a href={ '../qadr/' + this.props.projectId }
                    title="generate word document"
                    className="btn btn-default results-subheading-button"
                    alignRight={ true }>
                    <FAGlyph name={ 'file-word-o' } />Word
                </a>
            );
        } else {
            generateWordBtn = (
                <Button
                    title="generate word document"
                    faglyph="file-word-o"
                    alignRight={ true }
                    extraClasses={{
                        'btn-default': true,
                        'no-border': false,
                        'disabled': true,
                        'results-subheading-button': true,
                    }}>
                    Word
                </Button>
            );
        }

        var generateVisioBtn;
        if (firstInstallation && (!_.isEmpty(firstInstallation.clusters) || !_.isEmpty(firstInstallation.hagroups))) {
            generateVisioBtn = (
                <a href={ '../qadv/' + this.props.projectId }
                    title="generate visio diagram"
                    className="btn btn-default results-subheading-button"
                    alignRight={ true }>
                    <FAGlyph name={ 'sitemap' } />Visio
                </a>
            );
        } else {
            generateVisioBtn = (
                <Button
                    title="generate visio diagram"
                    faglyph="file-powerpoint-o"
                    alignRight={ true }
                    extraClasses={{
                        'btn-default': true,
                        'no-border': false,
                        'disabled': true,
                        'results-subheading-button': true,
                    }}>
                    Visio
                </Button>
            );
        }

        return(
            <div>
                <ColumnHeader columnTitle="Results">
                    <ActionLink
                        isToggle={ true }
                        select={ this._showCurrentView }
                        selected={ currentSystemsView && canShowSelected }
                        enabled={ canShowSelected }>
                        Selected Systems
                    </ActionLink>
                    <ActionLink
                        isToggle={ true }
                        select={ this._showSolutionView }
                        selected={ !currentSystemsView || !canShowSelected }
                        enabled={ true }>
                        All Systems
                    </ActionLink>
                </ColumnHeader>
                <ScrollableRegion>
                    <div className="filter-pane">
                        <div className="btn-group">
                            { generateWordBtn }
                            { generateVisioBtn }
                        </div>
                        <div className="btn-group pull-right">
                            <Button
                                onClick={ this._showUnitBase10 }
                                title="toggle base 10"
                                alignRight= { true }
                                extraClasses={{
                                    'results-subheading-button': true,
                                    'btn-default': true,
                                    'no-border': false,
                                    'toggled': useBase10Yields,
                                }}>
                                Base 10
                            </Button>
                            <Button
                                onClick={ this._showUnitBase2 }
                                title="toggle base 2"
                                alignRight= { true }
                                extraClasses={{
                                    'results-subheading-button': true,
                                    'btn-default': true,
                                    'no-border': false,
                                    'toggled': !useBase10Yields,
                                }}>
                                Base 2
                            </Button>
                        </div>
                    </div>
                    <div className="group-type-label">
                        <span>Capacity</span>
                        <span className="pull-right action">
                            <span
                                title={ grouped ? "click to see drive size details" : "click to hide drive size details" }
                                onClick={ grouped ? this._expandAll : this._groupAll }
                                className="expand-collapse-toggle">
                                { grouped ? "Expand" : "Collapse" }
                            </span>
                        </span>
                    </div>
                    <CapacitySummary
                        grouped={ grouped }
                        summary={ summary }
                        useBase10Yields = { useBase10Yields }/>
                    <br/>
                    <div className="group-type-label">
                        <span>Drives</span>
                    </div>
                    <DriveSummary
                        summary={ summary } />
                    <br/>
                    <div className="group-type-label">
                        <span>Environmental</span>
                        <div className="btn-group pull-right results-subheading-button-group">
                            <Button
                                onClick={ this._setMainsVoltageTo_v_100 }
                                title="toggle mains voltage to 110V"
                                alignRight= { true }
                                extraClasses={{
                                    'results-subheading-button': true,
                                    'btn-default': true,
                                    'no-border': false,
                                    'toggled': mainsVoltage !== "v_200",
                                }}>
                                110 V
                            </Button>
                            <Button
                                onClick={ this._setMainsVoltageTo_v_200 }
                                title="toggle mains voltage to 220V"
                                alignRight= { true }
                                extraClasses={{
                                    'results-subheading-button': true,
                                    'btn-default': true,
                                    'no-border': false,
                                    'toggled': mainsVoltage === "v_200",
                                }}>
                                220 V
                            </Button>
                        </div>
                    </div>
                    <EnvironmentalSummaryView
                        hagroups = { hagroups }
                        map = { this.props.map }
                        voltageDisplay={ mainsVoltage } />
                </ScrollableRegion>
            </div>
        );
    }
});

module.exports = Reports;
