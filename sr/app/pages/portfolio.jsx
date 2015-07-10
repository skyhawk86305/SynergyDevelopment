'use strict';

var React = require('react'),
    Masthead = require('../components/masthead'),
    Footer = require('../components/footer'),
    ProjectListPanel = require('../components/project-list'),
    SessionExpireOverlay = require('../components/session-expiration-overlay'),
    MOTD = require('../components/motd'),
    retitle = require('../retitle');

var PortfolioPage = React.createClass({
    propTypes: {
        stores: React.PropTypes.object.isRequired,
        fire: React.PropTypes.func.isRequired,
    },

    componentDidMount: function() {
        retitle('My Portfolio');
    },

    _onPortfolioFetch: function() {
        this.props.dispatcher.act('PORTFOLIO_FETCH');
    },

    render: function() {
        return (
            <div>
                <SessionExpireOverlay store={ this.props.stores.userSession } />
                <Masthead store={ this.props.stores.userSession } title="My Portfolio" />
                <div id="main-panel">
                    <div id="content" className="indented">
                        <div className="projects">
                            <ProjectListPanel
                                stores={ this.props.stores }
                                fire={ this.props.fire } />
                            <div className="motd col-sm-4">
                                <MOTD stores={ this.props.stores } />
                            </div>
                        </div>
                    </div>
                    <Footer />
                </div>
            </div>
        );
    }
});

module.exports = PortfolioPage;
