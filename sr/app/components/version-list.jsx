'use strict';

var _ = require('lodash'),
    React = require('react'),
    ActionLink = require('./layout/action-link'),
    ColumnHeader = require('./layout/column-header'),
    ScrollableRegion = require('./layout/scrollable-region'),
    Repeat = require('./repeat');

var VersionList = React.createClass({
    propTypes: {
        hagroups: React.PropTypes.array.isRequired,
        map: React.PropTypes.object.isRequired,
        hardwareSelector: React.PropTypes.object.isRequired,
        handleClose: React.PropTypes.func.isRequired,
        fire: React.PropTypes.func.isRequired
    },

    render: function() {
        var addingTo = _.pick(this.props.hardwareSelector, ['installation', 'cluster']),
            guard = this.props.map.guard(addingTo);

        var replacing = _.pick(this.props.hardwareSelector, ['installation', 'cluster', 'hagroup']),
            proposals = guard.changingVersion(replacing);

        var sampleHagroup = _.first(this.props.hagroups),
            matrix = this.props.map.inspect(sampleHagroup).config.matrix;

        return (
            <div>
                <ColumnHeader columnTitle={ 'Change OS Version' }>
                    <ActionLink
                        isToggle={ false }
                        select={ this.props.handleClose }
                        selected={ false }
                        enabled={ true }>
                        Close
                    </ActionLink>
                </ColumnHeader>
                <ScrollableRegion>
                    <Repeat seq={ proposals }
                            prop="proposal">
                        <Proposal
                            matrix={ matrix }
                            selectedVersion={ this.getCurrentVersion() }
                            handleSelect={ this.handleVersionChange } />
                    </Repeat>
                </ScrollableRegion>
            </div>
        );
    },

    handleVersionChange: function(version, event) {
        event.stopPropagation();
        event.preventDefault();

        var fire = this.props.fire,
            sampleHagroup = _.first(this.props.hagroups);

        if (sampleHagroup && sampleHagroup.is_clustered) {
            fire('PROJECT_SET_CLUSTER_VERSION', sampleHagroup.cluster._id, version);
        } else {
            _.forEach(this.props.hagroups, fireVersionChange);
        }

        this.props.handleClose(event);

        function fireVersionChange(hagroup) {
            fire('PROJECT_SET_SYSTEM_VERSION', hagroup._id, version);
        }
    },

    getCurrentVersion: function() {
        var sampleHagroup = _.first(this.props.hagroups);

        return sampleHagroup.version;
    }
});

var Proposal = React.createClass({
    propTypes: {
        matrix: React.PropTypes.object.isRequired,
        handleSelect: React.PropTypes.func.isRequired
    },

    render: function() {
        var proposal = this.props.proposal,
            proposalCSS = React.addons.classSet({
                'row-list-item': true,
                'selectable': proposal.isEnabled,
                'disabled': !proposal.isEnabled,
            }),
            selectedCheck;

        if (this.props.selectedVersion === proposal.newVersion) {
            selectedCheck = (
                <div className="chevron">
                    <span className="fa fa-fw fa-check"></span>
                </div>
            );
        }

        var displayVersion = this.props.matrix.getFullNameForVersion(proposal.newVersion);

        if (proposal.isEnabled) {
            var action = _.partial(this.props.handleSelect, proposal.newVersion);

            return (
                <div className={ proposalCSS } onClick={ action }>
                    <div className="row-list-cell">
                        { displayVersion }
                    </div>
                    { selectedCheck }
                </div>
            );
        } else {
            return (
                <div className={ proposalCSS }>
                    <div className="row-list-cell">
                        { displayVersion }
                    </div>
                </div>
            );
        }
    }
});

module.exports = VersionList;
