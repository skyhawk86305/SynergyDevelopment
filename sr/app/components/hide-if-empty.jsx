'use strict';

var React = require('react'),
    _ = require('lodash');

var HideIfEmpty = React.createClass({
    propTypes: {
        className: React.PropTypes.string,
        hiddenClassName: React.PropTypes.string,
    },
    render: function () {
        var className = this.props.className || '',
            hiddenClassName = this.props.hiddenClassName || 'hide',
            classes = [],
            add = function (x) { classes.push(x); };

        var empty = Array.isArray(this.props.seq) ? 
                    this.props.seq.length === 0 : 
                    this.props.seq === 0;

        _.forEach(className.split(' '), add);

        if (empty) {
            _.forEach(hiddenClassName.split(' '), add);
        }

        return (
            <div className={ _.uniq(classes).join(' ') }>
                { empty ? null : this.props.children }
            </div>
        );
    }
});

module.exports = HideIfEmpty;
