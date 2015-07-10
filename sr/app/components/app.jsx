'use strict';

var React = require('react'),
    RouteHandler = require('react-router').RouteHandler;

/**
 * Our main container.
 */

var App = React.createClass({
    render: function() {
        return (
            <div id="app">
                <RouteHandler { ... this.props } />
            </div>
        );
    }
});

module.exports = App;
