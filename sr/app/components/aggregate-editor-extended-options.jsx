'use strict';

var _ = require('lodash'),
	React = require('react'),
	OptionRow = require('./common/option-row'),
	AggregateSummary = require('./aggregate-summary'),
	FlashPoolEditor = require('./flash-pool'),
	Unit = require('../../lib/units.js'),
	usual = require('../usual-props');

var AggregateEditorExtendedOptions = React.createClass({
	propTypes: _.merge({
		extendedOption: React.PropTypes.string,
        aggregateBuilder: React.PropTypes.object.isRequired,
        selected: React.PropTypes.object,
        updateModel: React.PropTypes.func,
        hagi: React.PropTypes.object.isRequired,
        hagroups: React.PropTypes.array.isRequired,
        readOnly: React.PropTypes.bool.isRequired,
        displayType: React.PropTypes.string,
        setExtendedOption: React.PropTypes.func.isRequired,
        report: React.PropTypes.object.isRequired,
        userPreferences: React.PropTypes.object.isRequired,
        close: React.PropTypes.func.isRequired,
    }, usual.isRequired),

    render: function() {
    	var extendedOptionDisplay;

    	switch (this.props.extendedOption) {
    		case 'driveSelector':
    			extendedOptionDisplay = (
					<DriveSelector
						aggregateBuilder={ this.props.aggregateBuilder }
						displayType={ this.props.displayType }
						updateModel={ this.props.updateModel }
                        close={ this.props.close } />
				);
    		break;
    		case 'flashPoolEditor':
    			extendedOptionDisplay = (
    				<div className="aggregate-editor-extended-options">
						<FlashPoolEditor
	                        aggregate={ this.props.aggregateBuilder.aggregate }
	                        hagi={ this.props.hagi }
	                        { ... _.pick(this.props, 'fire', 'log') } />
                    </div>
				);
    		break;
    		case 'raidSelector':
    			extendedOptionDisplay = (
					<RaidSelector
						aggregateBuilder={ this.props.aggregateBuilder }
						updateModel={ this.props.updateModel }
                        close={ this.props.close } />
				);
    		break;
    		default:
	    		var base10YieldsPreference = this.props.userPreferences.useBase10Yields ? 'TB' : 'TiB',
	    			aggregate = this.props.aggregateBuilder.aggregate,
	    			systemLimits = this.props.aggregateBuilder.systemLimits();

	    		extendedOptionDisplay = (
	    			<AggregateSummary
                        report={ this.props.report }
                        limits={ systemLimits }
                        base10YieldsPreference={ base10YieldsPreference }
                        raidType={ aggregate.raid_type }
                        isESeries={ this.props.hagi.isESeries } />
    			);
			break;
    	}

    	return extendedOptionDisplay;
	}
});

var DriveSelector = React.createClass({
	propTypes: {
        aggregateBuilder: React.PropTypes.object.isRequired,
        displayType: React.PropTypes.string.isRequired,
        updateModel: React.PropTypes.func.isRequired,
        close: React.PropTypes.func.isRequired,
    },

	render: function() {
		var props = this.props,
			_this = this,
			aggregateDeviceSummary = props.aggregateBuilder.deviceSummary(),
            dataSpec = aggregateDeviceSummary.data.spec,
			currentDriveSpec = this.getDriveSpecDisplay(dataSpec),
			drives = props.aggregateBuilder.availableDeviceGroupsForAggregate();

		var availableDrives = _(drives).map(function(drive) {
			var selectDriveSpec = _.partial(_this.selectDriveForAggregate, drive.spec, drive.count),
				driveSpec = _this.getDriveSpecDisplay(drive.spec, drive.count);

            return (
            	<OptionRow
            		action={ selectDriveSpec }
                    readOnly={ false }
                    optionName={ driveSpec }
                    optionValue={ driveSpec === currentDriveSpec }
            		type="radio" />
            );
		});

		return (
			<div className="aggregate-editor-extended-options">
                <div className="row-list-item-option-header">
                    Select { this.props.displayType } Disk
                </div>
                { availableDrives }
            </div>
		);
	},

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

    getVirtualDeviceSize: function(driveSpec) {
    	return new Unit(driveSpec.rsgb, 'GB').to('GiB').makeHappyFriendly();
    },

    selectDriveForAggregate: function(event) {
    	console.log('event', event);
    	this.props.close();
    }
});

var RaidSelector = React.createClass({
	propTypes: {
        aggregateBuilder: React.PropTypes.object.isRequired,
        updateModel: React.PropTypes.func.isRequired,
        close: React.PropTypes.func.isRequired,
    },

	render: function() {
		var props = this.props,
			_this = this,
			currentRaidType = props.aggregateBuilder.aggregate.raid_type,
			raidTypes = props.aggregateBuilder.availableRaidTypes();

		var availableRaidTypes = _(raidTypes).map(function(raidType) {
			var selectRaidType = _.partial(_this.selectRaidTypeForAggregate, raidType);

            return (
            	<OptionRow
            		action={ selectRaidType }
                    readOnly={ false }
                    optionName={ raidType.replace('_', ' ') }
                    optionValue={ raidType === currentRaidType }
            		type="radio" />
            );
		});

		return (
			<div className="aggregate-editor-extended-options">
                <div className="row-list-item-option-header">
                    Select RAID Type
                </div>
                { availableRaidTypes }
            </div>
		);
	},

	selectRaidTypeForAggregate: function(raidType) {
		this.props.aggregateBuilder.setRaidType(raidType);
		this.props.updateModel();
        this.props.close();
	}
});

module.exports = AggregateEditorExtendedOptions;
