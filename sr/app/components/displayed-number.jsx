/**
 * React component to display K when number is over 1000
 * Eg: Returns 9K for 9999
 *
 * Usage : <DisplayedNumber number=9999 compress="true" /> // Returns <span>9K<span>
 */

'use strict';

var React = require('react'),
	_DisplayedNumber = require('../../lib/displayed-number');


var DisplayedNumber = React.createClass({

	propTypes: {
		number: React.PropTypes.number,
		compress: React.PropTypes.oneOfType([
			React.PropTypes.string,
			React.PropTypes.bool
		])
	},

	render: function() {
		var number = this.props.number,
			compress = this.props.compress;

		if(compress){
			compress = compress.toLowerCase();
		}

		var displayedNumber = new _DisplayedNumber(number, compress);

		return (
			<span title={number}>{displayedNumber.show()}</span>
		);
	}
});

module.exports = DisplayedNumber;