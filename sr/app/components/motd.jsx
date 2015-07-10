'use strict';

var React = require('react'),
    Glyph = require('./glyph');

var MOTD = React.createClass({
    propTypes: {
        stores: React.PropTypes.object.isRequired,
    },

    getInitialState: function() {
        return this.props.stores.motd.getState();
    },

    componentDidMount: function() {
        this.props.stores.motd.watch(this._onChange);
    },

    componentWillUnmount: function() {
        this.props.stores.motd.unwatch(this._onChange);
    },

    _glyph: function() {
        if (!this.state.fetching) {
            return null;
        }

        return (
            <Glyph
                name="refresh"
                spin={true}
                extraClasses={{ 'pull-right': true }} />
        );
    },

    _content: function() {
        if (this.state.fetching) {
            return this._glyph();
        }

        if (this.state.err) {
            console.log('MOTD error:', this.state.err.message);
            return (
                <div>
                    <p>
                        Welcome to the fully redesigned Synergy. Being a BETA, this version will undergo a bit more change prior to GA release.
                        <br/><br/>
                        Please explore the tool and provide <a href="https://track.netapp.com/Ticket/synergyweb/42" target="_blank">feedback</a>.
                        <br/><br/>
                        Be aware that projects in the BETA version of My Portfolio may or may not transition into the final release.
                        Click <a href="https://private-communities.netapp.com/docs/DOC-35044" target="_blank">here</a> for more information.
                    </p>
                    Known Bugs:
                    <ul>
                        <li>Session expires after 1 hour. If Synergy becomes unresponsive, click Refresh to login and reestablish a session.</li>
                        <li>When "Automatically fill system with aggregates" is disabled,  Auto-aggregates are still created when new drives are added.</li>
                        <li>Shelves/drives are not allowed to be deleted if a manual aggregate is assigned to it. Ideally we should allow user to do that and reassign the aggregate to other free drives.</li>
                        <li>Firefox browsers yield an “Unresponsive script” message upon first access. Click the Continue button to access Synergy for full functionality.</li>
                    </ul>
                    <p>
                        Click <a href="https://private-communities.netapp.com/docs/DOC-35424" target="_blank">release notes</a> for more details.
                    </p>
                </div>
            );
        }

        return (
            <div>
                { this.state.content || <p>No news is good news.</p> }
            </div>
        );
    },

    render: function() {
        return (
            <div>
                <strong>Message of the Day</strong>
                { this._glyph() }<br />
                { this._content() }
            </div>
        );
    },

    _onChange: function() {
        this.setState(this.props.stores.motd.getState());
    }
});

module.exports = MOTD;
