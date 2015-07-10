'use strict';

var React = require('react'),
    Button = require('./button');

var SessionExpirationOverlay = React.createClass({
    propTypes: {
        store: React.PropTypes.object.isRequired
    },

    getInitialState: function() {
        return this.props.store.getState();
    },

    componentDidMount: function() {
        this.props.store.watch(this.getSessionData);
        this.interval = setInterval(this.getSessionData, 1000);
    },

    componentWillUnmount: function() {
        this.props.store.unwatch(this.getSessionData);
        clearInterval(this.interval);
    },

    getSessionData: function() {
        this.setState(this.props.store.getState());
    },

    reloadPage: function(/* event */) {
        location.reload();
    },

    render: function() {
        if (!this.state.isExpired) {
          return null;
        } else {
          return(
            <div className="session-expire-overlay">
              <div className="inner">
                <span className="session-expire-message">Your session has expired.</span><br/>
                <Button
                    title="login"
                    name="redirectToAuthnode"
                    id="REDIRECT_TO_AUTHNODE"
                    onClick={ this.reloadPage }
                    extraClasses={{
                        'btn-default': true,
                        'no-border': false,
                    }}>
                    Login
                </Button>
              </div>
            </div>
          );
        }
    }
});

module.exports = SessionExpirationOverlay;
