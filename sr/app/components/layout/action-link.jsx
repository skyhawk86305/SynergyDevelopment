'use strict';

var React = require('react');

var ActionLink = React.createClass({
    propTypes: {
        isToggle: React.PropTypes.bool.isRequired,
        select: React.PropTypes.func.isRequired,
        selected: React.PropTypes.bool.isRequired,
        enabled: React.PropTypes.bool.isRequired,
    },

    render: function() {
        var classNames = React.addons.classSet({
            'action-link': true,
            'selected': this.props.selected,
            'disabled': !this.props.enabled,
            'toggle': this.props.isToggle,
            'hide-contracted': this.props.hideContracted,
        });

        if (this.props.enabled) {
            return (
                <span className={ classNames } onClick={ this.props.select }>
                    { this.props.children }
                </span>
            );
        } else {
            return (
                <span className={ classNames }>
                    { this.props.children }
                </span>
            );
        }
    }
});

module.exports = ActionLink;