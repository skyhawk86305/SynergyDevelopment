'use strict';

var React = require('react'),
    Masthead = require('../components/masthead'),
    Footer = require('../components/footer'),
    Project = require('../components/project'),
    SessionExpireOverlay = require('../components/session-expiration-overlay');

var ProjectPage = React.createClass({
    propTypes: {
        stores: React.PropTypes.object.isRequired,
        fire: React.PropTypes.func.isRequired,
        log: React.PropTypes.func.isRequired,
    },

    getInitialState: function() {
        return {
            project: this.props.stores.project.getState()
        };
    },

    componentDidMount: function() {
        this.props.stores.project.watch(this._onChange);
        this.setState({
            project: this.props.stores.project.getState(),
        });
    },

    componentWillUnmount: function() {
        this.props.stores.project.unwatch(this._onChange);
    },

    _onChange: function() {
        this.setState({
            project: this.props.stores.project.getState(),
        });
        // don't word-process! retitle() only necessary in one watcher
    },

    _title: function () {
        var project = this.state.project;
        if (project.fetching) {
            return 'Opening Project\u2026';
        } else if (project.err) {
            return 'Error';
        } else if (project.name === '') {
            return 'Opening Project';
        } else {
            // Truncate long names to prevent pushing other UI elements off the page
            var fullName = project.name || project.uuid,
                displayName = (fullName.length > 40) ? fullName.slice(0,40) + '\u2026' : fullName;

            return (this.state.project.queueStatus.writeQueueLength) ? displayName + ' (Saving)' : displayName;
        }
    },

    render: function() {
        return (
            <div>
                <SessionExpireOverlay store={ this.props.stores.userSession } />
                <Masthead store={ this.props.stores.userSession } title={ this._title() }/>
                <Project uuid={ this.props.params.uuid }
                         version={ this.props.params.version }
                         { ... this.props } />
                <Footer />
            </div>
        );
    }
});

module.exports = ProjectPage;
