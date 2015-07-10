'use strict';

var _ = require('lodash'),
    React = require('react'),
    DriveSummary = require('./drive-summary'),
    SystemList = require('./system-list'),
    clipUtil = require('../../lib/clip/util');

var SystemSummary = React.createClass({
    propTypes: {
        hagroups: React.PropTypes.array.isRequired,
        isGrouped: React.PropTypes.bool.isRequired,
        currentSelection: React.PropTypes.object.isRequired,
        select: React.PropTypes.func.isRequired
    },

    render: function() {
        if(this.props.isGrouped) {
            return (
                <GroupedSystemList
                    hagroups={ this.props.hagroups }
                    currentSelection={ this.props.currentSelection }
                    select={ this.props.select } />
            );
        } else {
            return (
                <SystemList
                    hagroups={ this.props.hagroups }
                    isStandAlone={ false }
                    currentSelection={ this.props.currentSelection }
                    select={ this.props.select } />
            );
        }
    }
});

var GroupedSystemList = React.createClass({
    propTypes: {
        hagroups: React.PropTypes.array.isRequired,
        currentSelection: React.PropTypes.object.isRequired,
        select: React.PropTypes.func.isRequired
    },

    _getNodeCounts: function() {
        var nodeCounts = {};

        _.forEach(this.props.hagroups, function (hagroup) {
            var before = nodeCounts[hagroup.model] || 0,
                after = before + hagroup.controllers.length;
            nodeCounts[hagroup.model] = after;
        });

        return nodeCounts;
    },

    _renderNodeCount: function(count, model) {
        return (
            <div className="drive-summary-block controller">
                <span className="drive-count">{ count }</span>
                <span className="fa fa-netapp-controller fa-fw"></span>
                <span className="drive-label">{ model }</span>
            </div>
        );
    },

    isSelected: function(selector, hagroup) {
        var isClusterMatch = false,
            isHagroupMatch = false;

        var selectedCluster = _(selector).has('cluster') ? selector.cluster._id : '',
            selectedHagroup = _(selector).has('hagroup') ? selector.hagroup._model : '';

        if (selectedCluster) {
            var id = hagroup.cluster && hagroup.cluster._id || '';
            isClusterMatch = (selectedCluster === id) ? true : false;
        }

        if (selectedHagroup) {
            var model = hagroup._model || '';
            isHagroupMatch = (selectedHagroup === model) ? true : false;
        }

        return isClusterMatch && isHagroupMatch;
    },

    selectGroup: function(event) {
        event.stopPropagation();
        event.preventDefault();

        var selector = { hagroup: { _model: this.props.hagroups[0]._model } };
        this.props.select(selector, 'SystemOverview');
    },

    render: function() {
        var hagroups = this.props.hagroups,
            selected = this.props.currentSelection,
            driveDescriptions = clipUtil.getDriveDescriptionsFromXboms(hagroups),
            classNames = React.addons.classSet({
                'selectable': true,
                'selected': this.isSelected(selected, hagroups[0]),
            });

        return (
            <div className={ classNames } onClick={ this.selectGroup }>
                { _.map(this._getNodeCounts(), this._renderNodeCount) }
                <DriveSummary
                    hideIfZero={ true }
                    hideCapacity={ true }
                    drives={ driveDescriptions } />
            </div>
        );
    }
});

module.exports = SystemSummary;
