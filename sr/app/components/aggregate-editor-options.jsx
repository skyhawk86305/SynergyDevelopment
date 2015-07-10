'use strict';

var _ = require('lodash'),
	React = require('react'),
    OptionRow = require('./common/option-row'),
    RaidTypes = require('../../lib/model/aggregates/raid-types'),
    Unit = require('../../lib/units.js'),
	usual = require('../usual-props');

var AggregateEditorOptions = React.createClass({
    propTypes: _.merge({
        aggregateBuilder: React.PropTypes.object.isRequired,
        changeRaidSize: React.PropTypes.func,
        requestedRaidSize: React.PropTypes.number,
        selected: React.PropTypes.object,
        updateModel: React.PropTypes.func,
        hagi: React.PropTypes.object.isRequired,
        hagroups: React.PropTypes.array.isRequired,
        readOnly: React.PropTypes.bool.isRequired,
        displayType: React.PropTypes.string,
        setExtendedOption: React.PropTypes.func.isRequired,
        report: React.PropTypes.object.isRequired,
        userPreferences: React.PropTypes.object.isRequired,
    }, usual.isRequired),

    render: function() {
        var props = this.props,
            _this = this,
            hagroup = this.getHagroup(),
            raidTypes = new RaidTypes(),
            aggregateBuilder = props.aggregateBuilder,
            aggregateDeviceSummary = aggregateBuilder.deviceSummary(),
            aggregateDeviceLimits = aggregateBuilder.deviceLimits(),
            aggregateRaidSizeLimits = aggregateBuilder.raidSizeLimits(),
            dataSpec = aggregateDeviceSummary.data.spec,
            aggregate = aggregateBuilder.aggregate,
            currentRaidSize = this.props.requestedRaidSize ? this.props.requestedRaidSize : this.getActualRaidSize(),
            report = props.report;

        var canSelectController = !props.readOnly && !aggregate.is_root_aggregate,
            canEditDevices = !props.readOnly && !(aggregate.is_root_aggregate && report.summary.containsVirtualDevices),
            canEditRaidSize = !props.readOnly && !aggregate.is_root_aggregate;

        function renderFasConfigurationOptions() {
            if (!props.hagi.isESeries) {
                return (
                    <div>
                        <div className="row-list-item-option-header">
                            Flash Pool
                        </div>
                        <OptionRow
                            action={ _this.openFlashPoolEditor }
                            readOnly={ false }
                            optionName={ _this.getFlashPoolDisplayName() }
                            type="extended" />
                        <div className="row-list-item-option-header">
                            Configuration
                        </div>
                        <OptionRow
                            action={ _this.props.changeRaidSize }
                            readOnly={ !canEditRaidSize }
                            optionName="Requested RAID Size"
                            optionValue={ currentRaidSize }
                            maxValue={ aggregateRaidSizeLimits.max }
                            minValue={ aggregateRaidSizeLimits.min }
                            type="spinner" />
                        <OptionRow
                            action={ null }
                            readOnly={ true }
                            optionName="Actual RAID Size"
                            optionValue={ _this.getActualRaidSize() }
                            type="spinner" />
                        <OptionRow
                            action={ _this.setSnapReserveProportion }
                            readOnly={ !canEditDevices }
                            optionName="Snap Reserve %"
                            optionValue={ _this.getAggregateSnapReserveAsPercentage(aggregate) }
                            maxValue={ 50 }
                            minValue={ 0 }
                            hide={ !_this.isManualAggregatePolicyEnabled() }
                            type="spinner" />
                    </div>
                );
            }
        }

    	return (
            <div className="aggregate-editor-options">
                <div className="row-list-item-option-header">
                    { props.displayType } Name
                </div>
                <OptionRow
                    action={ this.setAggregateName }
                    readOnly={ !this.isManualAggregatePolicyEnabled() }
                    optionName={ aggregate.name }
                    type="text" />
                <div className="row-list-item-option-header">
                    Controller
                </div>
                <OptionRow
                    action={ this.setToPrimaryController }
                    readOnly={ !canSelectController }
                    optionName={ hagroup.controllers[0].name }
                    optionValue={ this.isAggregateOnPrimaryController(aggregate) }
                    type="radio" />
                <OptionRow
                    action={ this.setToPartnerController }
                    readOnly={ !canSelectController }
                    optionName={ hagroup.controllers.length > 1 ? hagroup.controllers[1].name : 'n/a' }
                    optionValue={ !this.isAggregateOnPrimaryController(aggregate) }
                    type="radio" />
                <div className="row-list-item-option-header">
                    RAID Type
                </div>
                <OptionRow
                    action={ this.openRaidSelector }
                    readOnly={ !canEditDevices }
                    optionName={ aggregate.raid_type.replace('_', ' ') }
                    type="extended" />
                <div className="row-list-item-option-header">
                    Devices
                </div>
                <OptionRow
                    action={ this.setDriveCount }
                    readOnly={ !canEditDevices }
                    optionName="Count"
                    optionValue={ aggregateDeviceSummary.data.count }
                    maxValue={ aggregateDeviceLimits.max }
                    minValue={ aggregateDeviceLimits.min }
                    type="spinner" />
                <OptionRow
                    action={ this._applyDdpReserve }
                    readOnly={ this.isManualAggregatePolicyEnabled() }
                    optionName="Reserve"
                    optionValue={ report.summary.driveRoleSummary && report.summary.driveRoleSummary.reserve ? report.summary.driveRoleSummary.reserve : 0 }
                    maxValue={ report.summary.driveRoleSummary ? this.getMaxDdpReserveCount(report.summary.driveRoleSummary.total) : 0 }
                    hide={ !(props.hagi.isESeries && aggregate.raid_type === raidTypes.DDP) }
                    type="spinner" />
                <OptionRow
                    action={ this.openDriveSelector }
                    readOnly={ !canEditDevices }
                    optionName={ this.getDriveSpecDisplay(dataSpec) }
                    type="extended" />
                { renderFasConfigurationOptions() }
            </div>
		);
	},

    getAggregateSnapReserveAsPercentage: function(aggregate) {
        return Math.round(aggregate._snapreserve_proportion * 100);
    },

    /*  This and getVirtualDeviceSize are duplicated in aggregate-editor-extended-options.jsx,
        Should probably move them up higher and call them from each component instead. */
    getDriveSpecDisplay: function(driveSpec, count) {
        var countDisplay;

        if (count) {
            countDisplay = '(' + count + ')';
        } else {
            countDisplay = '';
        }

        if (driveSpec) {
            if (driveSpec.slice) {
                return this.getVirtualDeviceSize(driveSpec);
            } else {
                return driveSpec.rawgb + 'GB ' + driveSpec.type + ' ' + countDisplay;
            }
        } else {
            return 'none';
        }
    },

    getBuilder: function() {
        return this.props.aggregateBuilder;
    },

    getFlashPoolDisplayName: function() {
        var capacityGiB = this.props.report.summary.cacheCapacity,
            displayPreference = this.props.userPreferences.useBase10Yields ? 'GB' : 'GiB',
            unit = new Unit(capacityGiB, 'GiB'),
            unitDisplay = unit.to(displayPreference).friendly(2);

        var displayName = capacityGiB ? unitDisplay + ' allocated' : 'None allocated';

        return displayName;
    },

    getHagroup: function() {
        return _.first(this.props.hagroups);
    },

    getMaxDdpReserveCount: function(totalDriveCount) {
        console.log('totalDriveCount', totalDriveCount);
        return 0;
    },

    getActualRaidSize: function() {
        var builder = this.getBuilder();

        return builder.currentRaidSize();
    },

    getRequestedRaidSize: function() {
        var builder = this.getBuilder();

        return builder.requestedRaidSize();
    },

    getVirtualDeviceSize: function(driveSpec) {
        return new Unit(driveSpec.rsgb, 'GB').to('GiB').makeHappyFriendly();
    },

    isAggregateOnPrimaryController: function(aggregate) {
        var hagroup = this.getHagroup();
        return aggregate._controller === hagroup.controllers[0]._id ? true : false;
    },

    isManualAggregatePolicyEnabled: function() {
        var system = _.first(this.props.hagroups),
            policies = system._policies || {},
            aggregatePolicy = policies.Aggregates || {},
            manualAggregatesPolicy = aggregatePolicy.manual ? true : false;

        return manualAggregatesPolicy;
    },

    setAggregateName: function(event) {
        var builder = this.getBuilder();

        builder.setName(event.target.value);
        this.props.updateModel();
    },

    setDriveCount: function(count) {
        var builder = this.getBuilder(),
            deviceSummary = builder.deviceSummary(),
            dataSpec = deviceSummary.data.spec;

        if (dataSpec) {
            builder.setDeviceAndCount(dataSpec, count);
            this.props.updateModel();
        }
    },

    setSnapReserveProportion: function(percentage) {
        var builder = this.getBuilder(),
            proportion = percentage / 100;

        builder.setSnapReserve(proportion);
        this.props.updateModel();
    },

    setToPartnerController: function() {
        var builder = this.getBuilder(),
            hagroup = this.getHagroup(),
            controller = _.last(hagroup.controllers);

        builder.setController(controller);
        this.props.updateModel();
    },

    setToPrimaryController: function() {
        var builder = this.getBuilder(),
            hagroup = this.getHagroup(),
            controller = _.first(hagroup.controllers);

        builder.setController(controller);
        this.props.updateModel();
    },

    openDriveSelector: function(/*event*/) {
        this.props.setExtendedOption('driveSelector');
    },

    openFlashPoolEditor: function(/*event*/) {
        this.props.setExtendedOption('flashPoolEditor');
    },

    openRaidSelector: function(/*event*/) {
        this.props.setExtendedOption('raidSelector');
    }

});

module.exports = AggregateEditorOptions;
