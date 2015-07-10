'use strict';

var _ = require('lodash'),
    React = require('react'),
    DriveSummary = require('./drive-summary'),
    clipUtil = require('../../lib/clip/util');

var ListedSystem = React.createClass({
    propTypes: {
        hagroup: React.PropTypes.object.isRequired,
        isStandAlone: React.PropTypes.bool.isRequired,
        currentSelection: React.PropTypes.object.isRequired,
        select: React.PropTypes.func.isRequired
    },

    isSelected: function(selector, hagroup, isStandAlone) {
        var isClusterMatch = false,
            isHagroupMatch = false;

        var selectedCluster = _(selector).has('cluster') ? selector.cluster._id : '',
            selectedHagroup = _(selector).has('hagroup') ? selector.hagroup._id : '';

        if (selectedCluster) {
            var cid = hagroup.cluster && hagroup.cluster._id || '';
            isClusterMatch = (selectedCluster === cid) ? true : false;
        }

        if (selectedHagroup) {
            var hid = hagroup._id || '';
            isHagroupMatch = (selectedHagroup === hid) ? true : false;
        }

        return isStandAlone ? isHagroupMatch : (isClusterMatch && isHagroupMatch);
    },

    selectSystem: function(event) {
        event.stopPropagation();
        event.preventDefault();

        var selector = { hagroup: { _id: this.props.hagroup._id } };
        this.props.select(selector, 'SystemOverview');
    },

    render: function() {
        var hagroup = this.props.hagroup,
            selected = this.props.currentSelection,
            isStandAlone = this.props.isStandAlone,
            isSelected = this.isSelected(selected, hagroup, isStandAlone);

        var controllers = hagroup.controllers || [],
            nodeCount = isStandAlone ? controllers.length : '',
            model = isStandAlone ? hagroup.model : hagroup._model;

        var driveDescriptions = clipUtil.getDriveDescriptionsFromXboms([hagroup]),
            classNames = React.addons.classSet({
                'system': true,
                'selectable': true,
                'selected': isSelected,
            });

        return (
            <div className={ classNames } onClick={ this.selectSystem }>
                <span className={ isStandAlone ? 'name' : 'sub-name' }>
                    { _(controllers).flatten('name').compact().join(' / ') || 'un-named' }
                </span>
                <div className="system-components">
                    <div className="drive-summary-block controller no-overflow">
                        <span className="drive-count">{ nodeCount }</span>
                        <span className="fa fa-fw fa-netapp-controller"></span>
                        <span className="drive-label">{ model }</span>
                    </div>
                    <DriveSummary
                        hideIfZero={ true }
                        hideCapacity={ true }
                        drives={ driveDescriptions } />
                </div>
            </div>
        );
    }
});

module.exports = ListedSystem;
