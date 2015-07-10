'use strict';

var React = require('react'),
    version = require('../../version');

var Placeholder = React.createClass({
	render: function() {
        var branch = version.branch,
            datetime = version.datetime,
            revision = version.revision.substring(0,12);

        var info = (branch === 'master') ? '' : (datetime + ' ' + branch + ':' + revision);

        return (
        	<div className="placeholder-pane">
                Make a selection to the left to get started.
                <br/>
                <span className="version-info-text">{ info }</span>
            </div>
        );
    }
});

module.exports = Placeholder;
