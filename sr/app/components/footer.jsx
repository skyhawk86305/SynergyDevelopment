'use strict';

var React = require('react');

var Footer = React.createClass({
    render: function() {
        return (
            <div id="footer">
                <div className="container-fluid">
                    <p>
                        <strong>PRE-ALPHA. IN EARLY DEVELOPMENT. </strong>
                        Contacts: Changjie Sun, Mark Sibert, Garth Kidd.
                    </p>
                </div>
            </div>
        );
    },
});

module.exports = Footer;
