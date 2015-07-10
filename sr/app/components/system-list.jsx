'use strict';

var React = require('react'),
    Repeat = require('./repeat'),
    ListedSystem = require('./system-listed');

var SystemList = React.createClass({
    propTypes: {
        hagroups: React.PropTypes.array.isRequired,
        isStandAlone: React.PropTypes.bool.isRequired,
        currentSelection: React.PropTypes.object.isRequired,
        select: React.PropTypes.func.isRequired
    },

    render: function() {
        return (
            <Repeat seq={ this.props.hagroups }
                    prop="hagroup"
                    className={ this.props.isStandAlone ? 'hc-standalones' : ''}>
                <ListedSystem
                    isStandAlone={ this.props.isStandAlone }
                    currentSelection={ this.props.currentSelection }
                    select={ this.props.select } />
            </Repeat>
        );
    }
});

module.exports = SystemList;
