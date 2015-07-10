'use strict';

var React = require('react'),
    Repeat = require('./repeat'),
    FAGlyph = require('./faglyph'),
    CapacityTooltip = require('./capacity-tooltip'),
    Unit = require('../../lib/units.js'),
    _ = require('lodash'),
    AggregateReporter = require('../../lib/model/aggregates/aggregateReporter'),
    cnst = require('./constants'),
    usual = require('../usual-props');

var AggregateDevice = React.createClass({
    propTypes: {
        aggregateDevice: React.PropTypes.object.isRequired
    },

    render: function() {
        var aggregateDevice = this.props.aggregateDevice;
        /*
            isVirtualDevice: keySummary.isVirtual,
            virtualDeviceType: keySummary.virtualPartitionType,
            physicalRawCapacityGB: keySummary.rawgb,
            rightSizedCapacityGB: keySummary.rsgb,
            count: keySummary.count
        */

        var faglyph = 'hdd-o',
            driveSpeed = aggregateDevice.rpm.toString(),
            rawPhysicalCapacity = new Unit(aggregateDevice.physicalRawCapacityGB, 'GB').makeHappyFriendly(null, null, '%d%s');

        if (aggregateDevice.isVirtualDevice) {
            rawPhysicalCapacity = new Unit(aggregateDevice.rightSizedCapacityGB, 'GB').to('GiB').makeHappyFriendly();
            faglyph = 'pie-chart';
        }

        return (
            <div className="count-icon-grouping hide-contracted no-overflow">
                <span className="count">{ aggregateDevice.count }</span>
                <span className={ "icon drive-speed-" + driveSpeed.replace(".","p") }>
                    <FAGlyph name={ faglyph } />
                </span>
                <span className="item">
                    { rawPhysicalCapacity }
                </span>
            </div>
        );
    }
});

// TODO: Current mock only has one drive entry so just use the first one for now
// TODO: Indicate dedicated root aggregate in addition to flash pool
var Aggregate = React.createClass({
    propTypes: _.merge({
        aggregate: React.PropTypes.object.isRequired,
        systems: React.PropTypes.array.isRequired,
        select: React.PropTypes.func.isRequired,
        isEditModeManualAggregates: React.PropTypes.bool.isRequired,
        displayCapacityInBase: React.PropTypes.string.isRequired,
        aggregateDisplayLanguage: React.PropTypes.string.isRequired,
        selectDetails: React.PropTypes.object.isRequired,
        userPreferences: React.PropTypes.object.isRequired,
    }, usual.isRequired),

    selectAggregate: function(aggregate, event) {
        event.stopPropagation();
        event.preventDefault();

        var selector = {
                controller: { _id: aggregate._controller },
                aggregate: { _id: aggregate._id },
                'manualAggregates': this.props.isEditModeManualAggregates
            };

        this.props.select(selector, cnst.UI_SELECT_ADD_CHANGE_AGGREGATE);
    },

    deleteAggregate: function(event) {
        event.stopPropagation();
        event.preventDefault();

        ////var selector = { aggregate: { _id: this.aggregate._id } };
        this.props.fire('PROJECT_DELETE_AGGREGATE', this.props.aggregate._systemId, this.props.aggregate);
        this.props.select(); // clear col3
    },

    // TODO: handle more than one deviceSpec[0], reduce evy by adding to AggregateReporter
    _getDeviceCapacity: function() {
        var deviceSpecs = this.props.aggregate._raid_groups[0].__deviceSpecs;

        return (deviceSpecs && deviceSpecs[0].spec) ? deviceSpecs[0].spec.rawgb : 0;
    },

    _getRaidSize: function() {
        return this.props.aggregate._raid_groups[0]._devices.length;
    },

    _getSystemThatOwnsThisAggregate: function(aggregateInQuestion) {
        var systemsToLookIn = this.props.systems;

        if (!(systemsToLookIn instanceof Array)) {
            systemsToLookIn = [systemsToLookIn];
        }

        return _.first(_.where(systemsToLookIn, function(system) {
            var aggregateIds = _.flatten(_.map(system.controllers, function(controller) {
                return _.map(controller.aggregates, function(aggregate) {
                    return aggregate._id;
                });
            }));

            return _.contains(aggregateIds, aggregateInQuestion._id);
        }));
    },

    _isSelected: function() {
        var selectedAggregate = this.props.selectDetails.aggregate;

        if (selectedAggregate) {
            if (selectedAggregate._id === this.props.aggregate._id) {
                return true;
            }
        }

        return false;
    },

    render: function() {
        var aggregateName = this.props.aggregate.name || 'un-named',
            controllerName = this.props.aggregate._controllerName,
            isDedicatedRoot = this.props.aggregate.is_root_aggregate,
            owningSystem = this._getSystemThatOwnsThisAggregate(this.props.aggregate),
            hagi = this.props.map.inspect(owningSystem),
            reporter = new AggregateReporter(hagi),
            aggregateReport = reporter.createAggregateReport(this.props.aggregate),
            aggregateSummary = aggregateReport.summary,
            usableCapacityValue = isDedicatedRoot ? aggregateSummary.rootCapacity : aggregateSummary.usableCapacity,
            usableCapacityUnit = new Unit(usableCapacityValue, 'GiB'),
            usableCapacity = usableCapacityUnit.to(this.props.displayCapacityInBase).friendly(2);

        // TODO: The current aggregate names that are automatically generated need to be shortened due to width.
        // TODO: They are too long at the moment. In the meantime, truncate to 15 characters.
        aggregateName = aggregateName.substring(0,15);

        // TODO: dont need to pass in this.aggregate since here we have a whole ReactClass dedicated to the one aggregate
        var selectAggregate = _.partial(this.selectAggregate, this.props.aggregate),
            aggregateDevices = _.map(_.keys(aggregateSummary.driveSpecSummary), function(key) {
                var keySummary = aggregateSummary.driveSpecSummary[key];

                return {
                    isVirtualDevice: keySummary.isVirtual,
                    virtualDeviceType: keySummary.virtualPartitionType,
                    physicalRawCapacityGB: keySummary.rawgb,
                    rightSizedCapacityGB: keySummary.rsgb,
                    rpm: keySummary.rpm,
                    count: keySummary.count
                };
            });

        var deleteSpanDom = isDedicatedRoot || (!this.props.isEditModeManualAggregates && !this.props.aggregate._manual) ?
            (isDedicatedRoot ? (<span className="badge">root</span>) : (<div/>)) :
            (<span className="fa fa-fw fa-trash" onClick={ this.deleteAggregate }></span>);

        var aggregateCSS = React.addons.classSet({
            'row-list-item': true,
            'selectable': true,
            'selected': this._isSelected(),
        });

        var flashPoolSize,
            displayIsHybrid,
            cacheDevice = _.where(aggregateDevices, { virtualDeviceType: 'cache' });

        if (!_.isEmpty(cacheDevice)) {
            var cacheSize = aggregateSummary.cacheCapacity,
                dispUnit = this.props.userPreferences.useBase10Yields ? 'GB' : 'GiB',
                unit = new Unit(cacheSize, 'GiB'),
                unitRepr = unit.to(dispUnit).friendly(2);

            flashPoolSize = (
                <div>
                    { unitRepr }
                    <CapacityTooltip title={ 'Flash Pool Capacity (' + this.props.aggregateDisplayLanguage + ')' } inputUnit={ unit } />
                </div>
            );

            displayIsHybrid = (
                <div>
                    <div>
                        <br/>
                    </div>
                    <div>
                        <span className={ this.props.aggregate.is_hybrid ? "fa fa-fw fa-flash hide-contracted" : "hide-contracted"}></span>
                    </div>
                </div>
            );
        }

        return (
            <div className={ aggregateCSS } onClick={ selectAggregate } >
                <div className="row-list-cell row-list-cell-aggr-icon">
                    {deleteSpanDom}
                </div>
                <div className="row-list-cell row-list-cell-aggr-name">
                    <span className="emphasize">{ aggregateName }</span>
                </div>
                <div className="row-list-cell row-list-cell-aggr-controller">
                    <span>{ controllerName }</span>
                </div>
                <div className="row-list-cell row-list-cell-aggr-devices">
                    <Repeat seq={ aggregateDevices }
                            prop="aggregateDevice">
                        <AggregateDevice />
                    </Repeat>
                </div>
                <div className="row-list-cell row-list-cell-aggr-size numeric">
                    <div className="hide-contracted no-overflow hover">
                        <div>
                            { usableCapacity }
                            <CapacityTooltip title={ 'Usable Capacity (' + this.props.aggregateDisplayLanguage + ')' } inputUnit={ usableCapacityUnit } />
                        </div>
                        { flashPoolSize }
                    </div>
                </div>
                <div className="row-list-cell hide-contracted">
                    { displayIsHybrid }
                </div>
                <span className="chevron">
                    <span className="fa fa-fw fa-chevron-right"></span>
                </span>
            </div>
        );
    }
});

var AggregateDetails = React.createClass({
    propTypes: _.merge({
        systems: React.PropTypes.array.isRequired,
        aggregateDisplayLanguage: React.PropTypes.string.isRequired,
        select: React.PropTypes.func.isRequired,
        clearSelection: React.PropTypes.func,
        selectDetails: React.PropTypes.object.isRequired,
        userPreferences: React.PropTypes.object.isRequired,
    }, usual.isRequired),

    toggleAggregatesMode: function(event) {
        event.stopPropagation();
        event.preventDefault();
        var props = this.props,
            systems = props.systems instanceof Array ? props.systems : [props.systems];

        var nextEditModeIsManualAggregates = !this.state.isEditModeManualAggregates;
        if (nextEditModeIsManualAggregates) {
            // keep: _(systems).forEach(function (s) { props.fire('PROJECT_DELETE_ALL_AGGREGATES', s._id); });
        } else {
            _(systems).forEach(function (s) { props.fire('PROJECT_REBUILD_AUTO_AGGREGATES', s._id); });
        }

        this.setState({ isEditModeManualAggregates: nextEditModeIsManualAggregates });
    },

    _getAllAggregatesAndDecorate: function(fromSystems) {
        var aggregates = [],
            systems = fromSystems || this.props.systems;

        if (!(systems instanceof Array)) {
            systems = [systems];
        }

        _.forEach(systems, function(system) {
            _.forEach(system.controllers, function(controller) {
                var clonedAggregates = _.cloneDeep(controller.aggregates);

                _.forEach(clonedAggregates, function(aggregate) {
                    aggregate._controllerName = controller.name || 'un-named';
                    aggregate._systemId = system._id;
                });

                aggregates.push(clonedAggregates);
            });
        });

        return _.flatten(aggregates);
    },

    _sortByRootAggregate: function(aggregates) {
        return _.sortBy(aggregates, function(aggregate) {
            return !aggregate.is_root_aggregate;
        });
    },

    addAggregate: function(event) {
        event.stopPropagation();
        event.preventDefault();

        this.props.select({ }, cnst.UI_SELECT_ADD_CHANGE_AGGREGATE);
    },

    render: function () {
        var aggregates = this._sortByRootAggregate(this._getAllAggregatesAndDecorate()),
            aggregateDisplayLanguage = this.props.aggregateDisplayLanguage,
            aggregateLanguage = aggregateDisplayLanguage.toLowerCase(),
            aggregateLanguageCapitalizedSingular = aggregateDisplayLanguage.substring(0, aggregateDisplayLanguage.length - 1),
            aggregateLanguageSingular = aggregateLanguageCapitalizedSingular.toLowerCase(),
            autoAggregates = _.where(aggregates, function(aggregate) { return !aggregate._manual; }),
            manualAggregates = _.where(aggregates, function(aggregate) { return aggregate._manual; });

        var policies = this.props.systems._policies || {},
            aggregatePolicy = policies.Aggregates || {},
            displayCapacityInBase = this.props.userPreferences.useBase10Yields ? 'TB' : 'TiB';

        var manualAggregatesPolicy = aggregatePolicy.manual ? true : false;

        var addAggregateTableRowClasses = "row-list-item selectable new";

        var addNewAggregateDom = manualAggregatesPolicy ?
            (
                <div className={addAggregateTableRowClasses} onClick={ this.addAggregate }>
                    <div className="row-list-cell row-list-cell-aggr-icon">
                    </div>
                    <div className="row-list-cell">
                        Add a new { aggregateLanguageSingular }
                    </div>
                    <span className="chevron">
                        <span className="fa fa-fw fa-plus"></span>
                    </span>
                </div>
            ) :
            (<div/>);

        return(
            <div>
                <div className="row-list-item-grouping">
                    <div className="row-list">
                        <div className="row-list-item row-list-item-aggregate-header">
                            <div className="row-list-cell row-list-cell-aggr-icon">
                            </div>
                            <div className="row-list-cell">
                                <div className="aggregate-type-header no-overflow">
                                    Manually created { aggregateLanguage }
                                </div>
                            </div>
                        </div>
                        {addNewAggregateDom}
                        <Repeat seq={ manualAggregates }
                                prop="aggregate">
                            <Aggregate
                                isEditModeManualAggregates={ manualAggregatesPolicy }
                                systems={ this.props.systems }
                                select={ this.props.select }
                                selectDetails={ this.props.selectDetails }
                                displayCapacityInBase={ displayCapacityInBase }
                                aggregateDisplayLanguage={ aggregateLanguageCapitalizedSingular }
                                userPreferences={ this.props.userPreferences }
                                { ... usual(this.props) } />
                        </Repeat>
                    </div>
                </div>
                <div className="row-list-item-grouping">
                    <div className="row-list">
                        <div className="row-list-item row-list-item-aggregate-header">
                            <div className="row-list-cell row-list-cell-aggr-icon">
                            </div>
                            <div className="row-list-cell">
                                <div className="aggregate-type-header no-overflow">
                                    Automatically created { aggregateLanguage }
                                </div>
                            </div>
                        </div>
                        <Repeat seq={ autoAggregates }
                                prop="aggregate">
                            <Aggregate
                                isEditModeManualAggregates={ manualAggregatesPolicy }
                                systems={ this.props.systems }
                                select={ this.props.select }
                                selectDetails={ this.props.selectDetails }
                                displayCapacityInBase={ displayCapacityInBase }
                                aggregateDisplayLanguage={ aggregateLanguageCapitalizedSingular }
                                userPreferences={ this.props.userPreferences }
                                { ... usual(this.props) } />
                        </Repeat>
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = AggregateDetails;
