'use strict';

var React = require('react'),
    Glyph = require('./glyph'),
    Hardware = require('./hardware'),
    retitle = require('../retitle');

var Project = React.createClass({
    propTypes: {
        stores: React.PropTypes.object.isRequired,
        fire: React.PropTypes.func.isRequired,
        log: React.PropTypes.func.isRequired,
        uuid: React.PropTypes.string.isRequired,
        version: React.PropTypes.string
    },

    _getUpdatedStateFromStores: function() {
        return {
            project: this.props.stores.project.getState(),
            productInfo: this.props.stores.productInfo.getState(),
            userPreferences: this.props.stores.userPreferences.getState(),
            hardware: this.props.stores.hardware.getState()
        };
    },

    getInitialState: function() {
        return this._getUpdatedStateFromStores();
    },

    componentWillMount: function() {
        if (this.state.project.fetched && this.state.productInfo.fetched) {
            if (this.state.project.uuid !== this.props.uuid) {
                // wrong clip
                this._requestLoad();
            }
        } else if (!this.state.project.fetching && !this.state.project.fetched) {
            // no clip fetched or fetching, i.e. initial idle state
            this._requestLoad();
        }
    },

    _requestLoad: function() {
        this.props.fire('PROJECT_LOAD', this.props.uuid, this.props.version);
        this.setState(this.getInitialState());
    },

    componentDidMount: function() {
        this.props.stores.project.watch(this._onChange);
        this.props.stores.productInfo.watch(this._onChange);
        this.props.stores.userPreferences.watch(this._onChange);
        this.props.stores.hardware.watch(this._onChange);
        retitle(this._title(true));
    },

    componentWillUnmount: function() {
        this.props.stores.project.unwatch(this._onChange);
        this.props.stores.productInfo.unwatch(this._onChange);
        this.props.stores.userPreferences.unwatch(this._onChange);
        this.props.stores.hardware.unwatch(this._onChange);
    },

    _title: function (plain) {
        if (this.state.project.fetching) {
            return 'Opening Project\u2026';
        } else if (this.state.productInfo.fetching) {
            return 'Loading platform information\u2026';
        } else if (this.state.project.fetched && this.state.productInfo.fetched) {
            if (this.state.project.name) {
                return this.state.project.name;
            } else {
                if (plain) {
                    return this.state.project.uuid;
                }

                return (
                    <span className="mono">{ this.state.project.uuid }</span>
                );
            }
        } else if (this.state.project.err || this.state.productInfo.err) {
            return 'Error';
        } else {
            return 'SHOULD NOT BE DISPLAYED';
        }
    },

    _content: function() {
        if (this.state.project.fetching || this.state.productInfo.fetching) {
            return (
                <div className="placeholder-pane">
                    <Glyph
                        name="refresh"
                        spin={ true }
                        extraClasses={{ pad1em: true }} />
                    <span className="placeholder-loading-text">Loading your project&hellip;</span>
                </div>
            );
        }

        if (this.state.project.err) {
            return (
                <pre>
                    { this.state.project.err.message }
                </pre>
            );
        }

        var selected = {};
        if (this.state.project.uuid === this.state.hardware.uuid) {
            selected = this.state.hardware;
        }

        var map = this.state.project.map();
        map.rehydrate();

        return (
            <Hardware
                map={ map }
                projectId={ this.state.project.uuid }
                selected={ selected }
                productInfo = { this.state.productInfo.productInfo }
                userPreferences = { this.state.userPreferences }
                fire={ this.props.fire }
                log={ this.props.log } />
        );
    },

    render: function() {
        return (
            <div id="main-panel">
                <div id="content">
                    { this._content() }
                </div>
            </div>
        );
    },

    _onChange: function() {
        this.setState(this._getUpdatedStateFromStores());
        retitle(this._title(true));
    }
});

module.exports = Project;
