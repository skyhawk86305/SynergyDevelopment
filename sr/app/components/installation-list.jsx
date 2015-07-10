'use strict';

var _ = require('lodash'),
    React = require('react'),
    ColumnHeader = require('./layout/column-header'),
    ActionLink = require('./layout/action-link'),
    ScrollableRegion = require('./layout/scrollable-region'),
    Repeat = require('./repeat'),
    ClusterList = require('./cluster-list'),
    SystemList = require('./system-list');

var InstallationList = React.createClass({
    propTypes: {
        installations: React.PropTypes.array.isRequired,
        selected: React.PropTypes.object.isRequired,
        projectId: React.PropTypes.string.isRequired,
        fire: React.PropTypes.func.isRequired
    },

    selectSystems: function(selector, col2View, col3View) {
        this.props.fire('HARDWARE_SELECT', this.props.projectId, selector, col2View, col3View);
    },

    addSystem: function(event) {
        event.stopPropagation();
        event.preventDefault();

        // Current add is designed assuming only one installation - will change with MCC
        var selector = { installation: { _id: this.props.installations[0]._id } },
            col2View = 'ProductLines';

        this.selectSystems(selector, col2View);
    },

    render: function() {
        return (
            <div>
                <ColumnHeader columnTitle="Systems">
                    <ActionLink
                        isToggle={ false }
                        select={ this.addSystem }
                        selected={ false }
                        enabled={ true }>
                        Add
                    </ActionLink>
                </ColumnHeader>
                <ScrollableRegion>
                    <Repeat seq={ this.props.installations }
                            prop="installation"
                            className="installations">
                        <Installation
                            currentSelection={ this.props.selected.selector || {} }
                            select={ this.selectSystems }
                            fire={ this.props.fire } />
                    </Repeat>
                </ScrollableRegion>
            </div>
        );
    },
});

var Installation = React.createClass({
    propTypes: {
        installation: React.PropTypes.object.isRequired,
        currentSelection: React.PropTypes.object.isRequired,
        select: React.PropTypes.func.isRequired,
        fire: React.PropTypes.func.isRequired
    },

    selectInstallation: function(selector, col2View, col3View) {
        var parent = { installation: { _id: this.props.installation._id } };
        this.props.select(_.merge(parent, selector), col2View, col3View);
    },

    render: function() {
        return (
            <div className="installation">
                <span className="group-type-label">Clusters</span>
                <ClusterList
                    clusters={ this.props.installation.clusters }
                    currentSelection={ this.props.currentSelection }
                    select={ this.selectInstallation }
                    fire={ this.props.fire } />
                <span className="group-type-label">Non-Clusters</span>
                <SystemList
                    hagroups={ this.props.installation.hagroups }
                    isStandAlone={ true }
                    currentSelection={ this.props.currentSelection }
                    select={ this.selectInstallation } />
            </div>
        );
    }
});

module.exports = InstallationList;
