'use strict';

var React = require('react'),
    assert = require('assert'),
    _ = require('lodash');

var Repeat = React.createClass({
    propTypes: {
        className: React.PropTypes.string,
        seq: React.PropTypes.array.isRequired,
        prop: React.PropTypes.string.isRequired,
        type: React.PropTypes.string,
        key: React.PropTypes.oneOfType([
            React.PropTypes.string,
            React.PropTypes.func,
        ]),
        children: React.PropTypes.element.isRequired
    },

    _getKeyExtractor: function() {
        var keyProp = this.props.key;

        switch (typeof keyProp) {
            case 'function':
                return keyProp;

            case 'string':
                return function (ob) {
                    return ob[keyProp];
                };

            default:
                assert.equal(typeof keyProp, 'undefined');
                return null;
        }
    },

    render: function () {
        assert(!_.isArray(this.props.children));
        var original = this.props.children,
            prop = this.props.prop,
            extractKey = this._getKeyExtractor(),
            kids = _.map(this.props.seq, function (member, idx) {
                var extras = {};
                extras[prop] = member;
                if (extractKey) {
                    extras.key = extractKey(member, idx);
                    // else preserve React's sombre warnings
                }
                return React.addons.cloneWithProps(original, extras);
            });

        /* Not sure if this good way of doing it. Hack fix for now. */
        if (this.props.type && this.props.type === 'tableRow') {
            return (
                <tbody className={ this.props.className }>
                    { kids }
                </tbody>
            );
        } else {
            return (
                <div className={ this.props.className }>
                    { kids }
                </div>
            );
        }
    }
});

module.exports = Repeat;
