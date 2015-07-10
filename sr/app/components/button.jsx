'use strict';

var Glyph = require('./glyph'),
    FAGlyph = require('./faglyph'),
    React = require('react');

var Button = React.createClass({
    propTypes: {
        onClick: React.PropTypes.func.isRequired,
        title: React.PropTypes.string,
        glyph: React.PropTypes.string,
        faglyph: React.PropTypes.string,
        spin: React.PropTypes.bool,
        alignRight: React.PropTypes.bool
    },

    _glyph: function() {
        if (this.props.faglyph) {
            return (
                <FAGlyph
                    name={ this.props.faglyph }
                    spin={ this.props.spin } />
            );
        } else if (this.props.glyph) {
            return (
                <Glyph
                    name={ this.props.glyph }
                    spin={ this.props.spin } />
            );
        } else {
            return null;
        }
    },

    _allClasses: function() {
        var classes = {
            'btn': true,
            'btn-default': true,
        };
        if (this.props.extraClasses instanceof Array) {
            this.props.extraClasses.forEach(function (extra) {
                classes[extra] = true;
            });
        } else if (typeof(this.props.extraClasses) === 'string') {
            this.props.extraClasses.split(' ').forEach(function (extra) {
                classes[extra] = true;
            });
        } else if (this.props.extraClasses instanceof Object) {
            for (var key in this.props.extraClasses) {
                classes[key] = this.props.extraClasses[key];
            }
        }
        return React.addons.classSet(classes);
    },

    _renderInside: function() {
        if (this.props.alignRight) {
            return (
                <span>
                    { this._glyph() }
                    { this.props.children }
                </span>
            );
        } else {
            return (
                <span>
                    { this.props.children }
                    { this._glyph() }
                </span>
            );
        }
    },

    _handleKeyUp: function(event) {
        if (event.key === 'Enter') {
            this.props.onClick();
        }
    },

    render: function() {
        return (
            <div className={ this._allClasses() }
                 title={ this.props.title }
                 tabIndex={0}
                 onClick={ this.props.onClick }
                 onKeyUp={ this._handleKeyUp }>
                { this._renderInside() }
            </div>
        );
    }
});

module.exports = Button;