'use strict';

var React = require('react');

var Column = React.createClass({
    propTypes: {
        expanded: React.PropTypes.bool,
        expandedWidth: React.PropTypes.string,
        collapsedWidth: React.PropTypes.string,
        lightTheme: React.PropTypes.bool,
        onClick: React.PropTypes.func,
        zIndex: React.PropTypes.number,
    },

    render: function() {
        var expandedClass = 'col-xs-' + this.props.expandedWidth,
            collapsedClass = 'col-xs-' + this.props.collapsedWidth,
            classes = {
                'column': true,
                'contracted-view': !this.props.expanded,
                'expanded-view': this.props.expanded,
                'column-light': this.props.lightTheme,
            };

            if (this.props.expanded) {
                classes[expandedClass] = true;
            } else {
                classes[collapsedClass] = true;
            }

        var classNames = React.addons.classSet(classes),
            styles = {
                zIndex: this.props.zIndex,
            };

        return (
            <div className={ classNames } style={ styles } onClick={ this.props.onClick }>
                { this.props.children }
            </div>
        );
    }
});

module.exports = Column;