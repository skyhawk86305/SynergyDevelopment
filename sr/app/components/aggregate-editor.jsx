'use strict';

var _ = require('lodash'),
	React = require('react'),
	usual = require('../usual-props'),
	ColumnHeader = require('./layout/column-header'),
    ActionLink = require('./layout/action-link'),
    ScrollableRegion = require('./layout/scrollable-region'),
    AggregateEditorOptions = require('./aggregate-editor-options'),
    AggregateEditorExtendedOptions = require('./aggregate-editor-extended-options'),
    AggregateReporter = require('../../lib/model/aggregates/aggregateReporter'),
	ManualAggregateBuilder = require('../../lib/model/aggregates/manual-aggregate-builder');

var AggregateEditor = React.createClass({
    propTypes: _.merge({
        selection: React.PropTypes.object.isRequired,
        selected: React.PropTypes.object,
        selectedItem: React.PropTypes.array.isRequired,
        onClose: React.PropTypes.func,
        platformConfig: React.PropTypes.object.isRequired,
        userPreferences: React.PropTypes.object.isRequired,
        installations: React.PropTypes.array.isRequired,
    }, usual.isRequired),

    getInitialState: function() {
        return { requestedRaidSize: 0 };
    },

    componentWillReceiveProps: function(nextProps) {
        this.checkPropsAndInitializeState(nextProps);
    },

    componentWillMount: function() {
        this.checkPropsAndInitializeState(this.props);
    },

    render: function() {
    	var aggregateBuilder = this.builder,
            aggregate = aggregateBuilder.aggregate,
            readOnly = !this.isManualAggregatePolicyEnabled(),
            productLineIsESeries = this.isProductLineESeries(),
            displayType = productLineIsESeries ? 'Storage Container' : 'Aggregate',
            columnTitle = readOnly ? 'View ' + displayType : 'Change ' + displayType,
			hagroups = this.props.selectedItem,
			hagi = this.makeHagi(hagroups),
    		reporter = new AggregateReporter(hagi),
    		report = reporter.createAggregateReport(aggregate);

    	if (!this.canAddAggregate()) {
            return (
                <div className="placeholder-pane">
                    No unallocated/spare devices available to create new aggregate.<br/>
                    Add more drives to system.
                </div>
            );
        }

        return (
        	<div>
        		<ColumnHeader columnTitle={ columnTitle }>
                    <ActionLink
                        isToggle={ false }
                        select={ this.props.onClose }
                        selected={ false }
                        enabled={ true }>
                        Close
                    </ActionLink>
                </ColumnHeader>
                <ScrollableRegion>
	        		<AggregateEditorPane
	        			aggregateBuilder={ aggregateBuilder }
                        changeRaidSize={ this.changeRaidSize }
                        requestedRaidSize={ this.state.requestedRaidSize }
		                hagi={ hagi }
		                hagroups={ hagroups }
		                displayType={ displayType }
		                readOnly={ readOnly }
                        updateModel={ this.updateModel }
		                selected={ this.props.selected }
		                report={ report }
                        userPreferences={ this.props.userPreferences }
		                { ... usual(this.props) } />
        		</ScrollableRegion>
        	</div>
    	);
    },

    changeRaidSize: function(newSize) {
        this.setState({ requestedRaidSize: newSize});

        this.builder.setRaidSize(newSize);
        this.updateModel();
    },

    addAggregate: function(hagi) {
        this.builder = new ManualAggregateBuilder(hagi);

        if (this.builder.aggregate) {
            this.props.fire('PROJECT_ADD_MANUAL_AGGREGATE', hagi.hagroup._id, this.builder.aggregate, this.selectAggregate);
        } else {
            console.log('add failed 2: could not plan new aggregate');
        }
    },

    canAddAggregate: function() {
    	return this.isAggregateSpecifiedInSelection(this.props);
    },

    checkPropsAndInitializeState: function(propsToCheck) {
        /*
            Pseudo Code:

            If NO aggregate selected
                create builder with hagi as only arg
            If aggregate selected
                create builder with hagi and the selected aggregate (concrete, not an id)

            return the builder in scope with render, pass down to aggregate-editor-options
        */
        var hagi = this.makeHagi(propsToCheck.selectedItem),
            requestedRaidSize = this.state.requestedRaidSize;

    	if (!this.isAggregateSpecifiedInSelection(propsToCheck)) {
            this.addAggregate(hagi);
        } else {
            this.builder = new ManualAggregateBuilder(hagi, _.first(propsToCheck.selection), requestedRaidSize);
        }
    },

    isAggregateSpecifiedInSelection: function(propsToCheck) {
        return 'aggregate' in propsToCheck.selected.selector;
    },

    isManualAggregatePolicyEnabled: function() {
        var system = _.first(this.props.selectedItem),
            policies = system._policies || {},
            aggregatePolicy = policies.Aggregates || {},
            manualAggregatesPolicy = aggregatePolicy.manual ? true : false;

        return manualAggregatesPolicy;
    },

    isProductLineESeries: function() {
        var hagi = this.makeHagi(this.props.selectedItem);

        return hagi.isESeries;
    },

    makeHagi: function(hagroups) {
        var map = this.props.map,
            hagroup = _.first(hagroups);

        return map.inspect(hagroup);
    },

    selectAggregate: function(newAggregate) {
        var selected = this.props.selected,
            selector = _.clone(selected.selector) || {};

        if (newAggregate) {
            _.merge(selector, {aggregate: {_id: newAggregate._id}, controller: {_id: newAggregate._controller}});
            this.props.fire('HARDWARE_SELECT', selected.uuid, selector, selected.col2View, selected.col3View);
        }
    },

    updateModel: function() {
        var hagroup = _.first(this.props.selectedItem),
            aggregate = this.builder.aggregate;

        if (aggregate) {
            // this.props.fire('PROJECT_UPDATE_AGGREGATE', hagroup._id, aggregate, this.builder.aggregate, this.props.selectAggregate);
            // Old one will be deleted on attach
            this.props.fire('PROJECT_ADD_MANUAL_AGGREGATE', hagroup._id, aggregate, this.selectAggregate);
        } else {
            console.error('missing aggregate');
        }
    }

});

var AggregateEditorPane = React.createClass({
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
        report: React.PropTypes.object.isRequired,
        userPreferences: React.PropTypes.object.isRequired,
    }, usual.isRequired),

    getInitialState: function() {
    	return {
    		extendedOption: null
    	};
    },

	render: function() {
		return (
			<div className="aggregate-editor">
				<AggregateEditorOptions
					aggregateBuilder={ this.props.aggregateBuilder }
                    changeRaidSize={ this.props.changeRaidSize }
                    requestedRaidSize={ this.props.requestedRaidSize }
	                hagi={ this.props.hagi }
	                hagroups={ this.props.hagroups }
	                displayType={ this.props.displayType }
	                readOnly={ this.props.readOnly }
                    updateModel={ this.props.updateModel }
	                selected={ this.props.selected }
	                setExtendedOption={ this.setExtendedOption }
	                report={ this.props.report }
                    userPreferences={ this.props.userPreferences }
	                { ... usual(this.props) } />
				<AggregateEditorExtendedOptions
					extendedOption={ this.state.extendedOption }
                    aggregateBuilder={ this.props.aggregateBuilder }
                    hagi={ this.props.hagi }
                    hagroups={ this.props.hagroups }
                    displayType={ this.props.displayType }
                    readOnly={ this.props.readOnly }
                    updateModel={ this.props.updateModel }
                    selected={ this.props.selected }
                    setExtendedOption={ this.setExtendedOption }
                    report={ this.props.report }
                    userPreferences={ this.props.userPreferences }
                    close={ this.close }
                    { ... usual(this.props) } />
			</div>
		);
	},

    close: function() {
        this.setState({
            extendedOption: null
        });
    },

	setExtendedOption: function(extendedOption) {
		this.setState({
			extendedOption: extendedOption
		});
	}
});

module.exports = AggregateEditor;
