'use strict';

var React = require('react'),
    Version = require('../../version'),
    Link = require('react-router').Link;

var Masthead = React.createClass({
    propTypes: {
        title: React.PropTypes.string,
        store: React.PropTypes.object.isRequired
    },

    getInitialState: function() {
        return this.props.store.getState();
    },

    componentDidMount: function() {
        this.props.store.watch(this._onChange);
    },

    componentWillUnmount: function() {
        this.props.store.unwatch(this._onChange);
    },

    _onChange: function() {
        this.setState(this.props.store.getState());
    },

    _title: function() {
        if (this.props.title) {
            return (
                <span className="current">{ this.props.title }</span>
            );
        }
    },

    render: function() {
        var BetaStrip = '', UserInfoStrip = '';
        if (Version.branch === 'master') {
          BetaStrip = (
            <div className="beta-text">
              BETA 3
            </div>
          );
        }
        if (this.state.firstName !== '') {
          UserInfoStrip = (
            <div className="user-info">
              Welcome, { this.state.firstName }
            </div>
          );
        }

        return (
            <header id="masthead">
                <div className="logo">
                    <img src="/media/img/na_logo.png" alt="Logo" />
                </div>
                <div className="breadcrumb-nav">
                    <Link
                        title="Return to Synergy: My Portfolio"
                        to="/"
                        className="home-link">
                        Synergy 6
                    </Link>
                    { this._title() }
                </div>
                { BetaStrip }
                <div id="headerUtilitiesDiv" className="headerUtilities header-nav">
                    <ul>
                      <li><Link
                              title="Return to Synergy: My Portfolio"
                              to="/"
                              className="headerButtonIcon">
                              <span className="fa fa-home fa-fw"></span>
                          </Link>
                      </li>
                      <li><a id="informationSection" href="#" title="Information" className="infoCls headerButtonIcon">
                      <span className="fa fa-info-circle fa-fw"></span></a>
                        <div className="headerSubMenu">
                          <div className="subMenuHeader"> Information </div>
                          <ul>
                            <li><a href="https://private-communities.netapp.com/docs/DOC-35424" target="_blank">Release Notes</a></li>
                            <li><a href="http://www.netapp.com/us/communities/subscriptions.aspx" target="_blank">Subscription Center</a></li>
                          </ul>
                          <div className="subMenuHeader">Quick Links</div>
                          <ul>
                            <li><a href="https://fieldportal.netapp.com/funded-tools-a-z.aspx"
                                        target="_blank">NetApp Funded Technical Tools</a></li>
                            <li><a href="http://synergy5.netapp.com/"
                                        target="_blank">Synergy 5</a></li>
                          </ul>
                        </div>
                      </li>
                      <li><a id="communitySection" href="https://communities.netapp.com/community/netapp_partners_network/netapp_tools/synergy"
                                            title="Community" className="commCls headerButtonIcon" target="_blank">
                        <span className="fa fa-users fa-fw"></span></a>
                        <div className="headerSubMenu">
                          <ul>
                            <li><a href="https://communities.netapp.com/community/netapp_partners_network/netapp_tools/synergy" target="_blank">Community</a></li>
                            <li><a href="https://twitter.com/netapptools" target="_blank">@NetApp Tools</a></li>
                            <li><a href="https://www.surveymonkey.com/s/QP83YWB" target="_blank">Rate This Tool</a></li>
                          </ul>
                        </div>
                      </li>
                      <li><a id="faqSection" href="#" className="faqCls headerButtonIcon" title="FAQ">
                        <span className="fa fa-book fa-fw"></span></a>
                        <div className="headerSubMenu">
                          <ul>
                            <li><a href="https://private-communities.netapp.com/docs/DOC-35044" target="_blank">Synergy 6 FAQ</a></li>
                            <li><a href="#">User Guide (coming soon)</a></li>
                          </ul>
                        </div>
                      </li>
                      <li><a id="supportSection" href="https://track.netapp.com/Ticket/synergyweb/42" className="contactCls headerButtonIcon" title="Support" target="_blank">
                        <span className="fa fa-headphones fa-fw"></span></a>
                        <div className="headerSubMenu">
                          <ul>
                            <li><a href="https://track.netapp.com/Ticket/synergyweb/42" target="_blank">Support</a></li>
                          </ul>
                        </div>
                      </li>
                    </ul>
                    { UserInfoStrip }
                </div>
            </header>
        );
    }
});

module.exports = Masthead;
