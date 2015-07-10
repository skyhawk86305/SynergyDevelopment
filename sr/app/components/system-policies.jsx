'use strict';

var _ = require('lodash'),
    React = require('react'),
    ScrollableRegion = require('./layout/scrollable-region'),
    FAGlyph = require('./faglyph');

var SystemPolicies = React.createClass({
    propTypes: {
        map: React.PropTypes.object.isRequired,
        hagroups: React.PropTypes.array.isRequired,
        hardwareSelector: React.PropTypes.object.isRequired
    },

    render: function() {
        var system = _.first(this.props.hagroups) || {},
            currentPolicies = system._policies || {};

        var addingTo = _.pick(this.props.hardwareSelector, ['installation', 'cluster', 'hagroup']),
            guard = this.props.map.guard(addingTo),
            policyOptions = guard.policies(),
            enabledOptions = _.where(policyOptions, { isEnabled: true }),
            groupedOptions = _.groupBy(enabledOptions, 'scope'),
            components = _.map(groupedOptions, createPolicyGroup, this);

        function createPolicyGroup(optionGroup) {
            // jshint -W040
            return (
                <PolicyGroup
                    { ...this.props }
                    currentPolicies={ currentPolicies }
                    optionGroup={ optionGroup } />
            );
        }

        return (
            <ScrollableRegion>
                { components }
            </ScrollableRegion>
        );
    }
});

var PolicyGroup = React.createClass({
    propTypes: {
        optionGroup: React.PropTypes.array.isRequired
    },

    render: function() {
        var components = _.map(this.props.optionGroup, createPolicyContainer, this);

        function createPolicyContainer(option) {
            // jshint -W040
            return (
                <PolicyContainer
                    { ...this.props }
                    scope={ option.scope }
                    policy={ option.policy }
                    label={ option.label }
                    defaultValue={ option.defaultValue }
                    invertedToggle={ option.inverted }
                    impactsCluster={ option.impactsCluster }
                    allowedValues={ option.allowedValues } />
            );
        }

        return (
            <div className="row-list-item-grouping">
                { components }
            </div>
        );
    }
});

var PolicyContainer = React.createClass({
    propTypes: {
        scope: React.PropTypes.string.isRequired,
        policy: React.PropTypes.string.isRequired,
        allowedValues: React.PropTypes.array,
        impactsCluster: React.PropTypes.bool.isRequired,
        map: React.PropTypes.object.isRequired,
        hagroups: React.PropTypes.array.isRequired,
        hardwareSelector: React.PropTypes.object.isRequired,
        fire: React.PropTypes.func.isRequired
    },

    render: function() {
        var currentScope = this.props.currentPolicies[this.props.scope] || {},
            currentPolicy = currentScope[this.props.policy],
            hasMultipleValues = !_.isEmpty(this.props.allowedValues),
            isEnabled;

        if (hasMultipleValues) {
            isEnabled = _.contains(this.props.allowedValues, currentPolicy);

            return (
                <SelectPolicy
                    { ...this.props }
                    currentPolicy={ currentPolicy }
                    isEnabled={ isEnabled }
                    handleClick={ this.handleClick } />
            );
        } else {
            isEnabled = (currentPolicy !== undefined) ? currentPolicy : this.props.defaultValue;

            return (
                <BooleanPolicy
                    { ...this.props }
                    isEnabled={ isEnabled }
                    handleClick={ this.handleClick } />
            );
        }
    },

    handleClick: function(value, event) {
        event.stopPropagation();
        event.preventDefault();

        var fire = this.props.fire,
            scope = this.props.scope,
            sampleHagroup = _.first(this.props.hagroups),
            policy = {};

        policy[this.props.policy] = value;

        if (this.props.impactsCluster && sampleHagroup && sampleHagroup.is_clustered) {
            fire('PROJECT_SET_CLUSTER_POLICY', sampleHagroup.cluster._id, scope, policy);
        } else {
            _.forEach(this.props.hagroups, firePolicyChange);
        }

        if ((scope === 'version') && (this.props.policy === 'pin') && (value === false)) {
            this.handleAutoVersion();
        }

        function firePolicyChange(hagroup) {
            fire('PROJECT_SET_SYSTEM_POLICY', hagroup._id, scope, policy);
        }
    },

    // We need to force the OS up when switching auto version on
    // DO NOT COPY THIS PATTERN to bolt on logic to other specific policies!
    handleAutoVersion: function() {
        var addingTo = _.pick(this.props.hardwareSelector, ['installation', 'cluster']),
            guard = this.props.map.guard(addingTo);

        var replacing = _.pick(this.props.hardwareSelector, ['installation', 'cluster', 'hagroup']),
            proposals = guard.changingVersion(replacing),
            enabled = _.where(proposals, { isEnabled: true }),
            versionConfig = _.last(enabled),
            newVersion = versionConfig ? versionConfig.newVersion : undefined;

        var fire = this.props.fire,
            sampleHagroup = _.first(this.props.hagroups);

        if (newVersion) {
            if (sampleHagroup && sampleHagroup.is_clustered) {
                fire('PROJECT_SET_CLUSTER_VERSION', sampleHagroup.cluster._id, newVersion);
            } else {
                _.forEach(this.props.hagroups, fireVersionChange);
            }
        }

        function fireVersionChange(hagroup) {
            fire('PROJECT_SET_SYSTEM_VERSION', hagroup._id, newVersion);
        }
    }
});

var SelectPolicy = React.createClass({
    propTypes: {
        defaultValue: React.PropTypes.string.isRequired,
        isEnabled: React.PropTypes.bool.isRequired,
        allowedValues: React.PropTypes.array.isRequired,
        handleClick: React.PropTypes.func.isRequired
    },

    render: function() {
        var allowedValuesList = _.map(this.props.allowedValues, createAllowedValueComponent, this);

        function createAllowedValueComponent(allowedValue) {
            // jshint -W040
            return (
                <SelectOption
                    { ...this.props }
                    optionValue={ allowedValue }
                    handleClick={ this.props.handleClick } />
            );
        }

        var value = this.props.isEnabled ? '' : this.props.defaultValue,
            action = _.partial(this.props.handleClick, value);

        return (
            <Policy { ...this.props } handleClick={ action }>
                { allowedValuesList }
            </Policy>
        );
    }
});

var SelectOption = React.createClass({
    propTypes: {
        currentPolicy: React.PropTypes.string.isRequired,
        optionValue: React.PropTypes.string.isRequired,
        isEnabled: React.PropTypes.bool.isRequired,
        handleClick: React.PropTypes.func.isRequired
    },

    render: function() {
        var rowItemStyle = React.addons.classSet({
                'row-list-item': true,
                'row-list-item-loose': true,
                'selectable': this.props.isEnabled,
                'disabled': !this.props.isEnabled
            }),
            checkStyle = (this.props.currentPolicy === this.props.optionValue) ? 'check' : '';

        var setValue = _.partial(this.props.handleClick, this.props.optionValue),
            action = this.props.isEnabled ? setValue : this.suppressClick;

        return (
            <div className={ rowItemStyle } onClick={ action }>
                <div className="row-list-cell">
                    { this.props.optionValue }
                </div>
                <span className="chevron">
                    <FAGlyph name={ checkStyle } />
                </span>
            </div>
        );
    },

    suppressClick: function(event) {
        event.stopPropagation();
        event.preventDefault();
    }
});

var BooleanPolicy = React.createClass({
    propTypes: {
        isEnabled: React.PropTypes.bool.isRequired,
        handleClick: React.PropTypes.func.isRequired
    },

    render: function() {
        var action = _.partial(this.props.handleClick, !this.props.isEnabled);

        return (
            <Policy { ...this.props } handleClick={ action } />
        );
    }
});

var Policy = React.createClass({
    propTypes: {
        label: React.PropTypes.string.isRequired,
        invertedToggle: React.PropTypes.bool.isRequired,
        isEnabled: React.PropTypes.bool.isRequired,
        handleClick: React.PropTypes.func.isRequired
    },

    render: function() {
        var rowItemStyle = 'row-list-item selectable row-list-item-loose',
            toggleOn = this.props.invertedToggle ? 'toggle-off' : 'toggle-on',
            toggleOff = this.props.invertedToggle ? 'toggle-on' : 'toggle-off',
            toggleStyle = this.props.isEnabled ? toggleOn : toggleOff;

        return (
            <div>
                <div className={ rowItemStyle } onClick={ this.props.handleClick }>
                    <div className="row-list-cell">
                        { this.props.label }
                    </div>
                    <span className="chevron">
                        <FAGlyph name={ toggleStyle } />
                    </span>
                </div>
                { this.props.children }
            </div>
        );
    }
});

module.exports = SystemPolicies;
