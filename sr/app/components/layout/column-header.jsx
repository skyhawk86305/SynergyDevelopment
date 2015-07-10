'use strict';

var React = require('react');

var ColumnHeader = React.createClass({
    propTypes: {
        columnTitle: React.PropTypes.string,
    },

    render: function() {
        return (
            <div className="column-header">
                <h1>{ this.props.columnTitle }</h1>
                <div className="action-links">
                    { this.props.children }
                </div>
            </div>
        );
    }
});

module.exports = ColumnHeader;