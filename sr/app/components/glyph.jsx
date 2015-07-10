'use strict';

var React = require('react'),
    _ = require('lodash');

var Glyph = React.createClass({
    propTypes: {
        name: React.PropTypes.string,
        title: React.PropTypes.string,
        extraClasses: React.PropTypes.object,
        spin: React.PropTypes.bool
    },

    render: function() {
        var classes = {
            'glyphicon': true,
            'spin': this.props.spin
        };

        _.merge(classes, this.props.extraClasses || {});
        classes['glyphicon-' + this.props.name] = true;

        return (
            <span title={ this.props.title }
                  className={ React.addons.classSet(classes) }></span>
        );
    }
});

module.exports = Glyph;