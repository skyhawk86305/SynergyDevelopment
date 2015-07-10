'use strict';

var React = require('react');

var ScrollableRegion = React.createClass({
	propTypes: {
		top: React.PropTypes.string
	},

    render: function() {
    	var styles = {
    		top: this.props.top,
    	};

        return (
            <div className="scrollable" style={ styles }>
                { this.props.children }
            </div>
        );
    }
});

module.exports = ScrollableRegion;