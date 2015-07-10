'use strict';

var React = require('react'),
    _ = require('lodash');

var FAGlyph = React.createClass({
    propTypes: {
        name: React.PropTypes.string,
        title: React.PropTypes.string,
        extraClasses: React.PropTypes.object,
        spin: React.PropTypes.bool,
        hideIfUnnamed: React.PropTypes.bool
    },

    render: function() {
        var classes = {
            'fa': true,
            'fa-spin': this.props.spin,
            'fa-fw': true,
            'hide': this.props.hideIfUnnamed && !this.props.name
        };

        _.merge(classes, this.props.extraClasses || {});
        classes['fa-' + this.props.name] = true;

        return (
            <span title={ this.props.title }
                  className={ React.addons.classSet(classes) }></span>
        );
    }
});

module.exports = FAGlyph;