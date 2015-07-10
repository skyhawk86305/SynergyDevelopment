'use strict';

var Button = require('./button'),
    React = require('react');

var EventButton = React.createClass({
    propTypes: {
        action: React.PropTypes.string.isRequired,
        args: React.PropTypes.array,
        title: React.PropTypes.string,
        glyph: React.PropTypes.string,
        act: React.PropTypes.func.isRequired,
        spin: React.PropTypes.bool,
    },

    _handleClick: function (/* event */) {
        var props = this.props,
            args = [ props.action ].concat(props.args || []);
        props.act.apply(null, args);
    },

    render: function() {
        return (
            <Button extraClasses = { this.props.extraClasses }
                    title = { this.props.title }
                    onClick = { this._handleClick }
                    glyph = { this.props.glyph }
                    spin = { this.props.spin }>
                { this.props.children }
            </Button>
        );
    }
});

module.exports = EventButton;