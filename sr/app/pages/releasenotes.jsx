'use strict';

var React = require('react'),
    Masthead = require('../components/masthead'),
    retitle = require('../retitle');

var ReleaseNotesPage = React.createClass({
    propTypes: {
        stores: React.PropTypes.object.isRequired,
        fire: React.PropTypes.func.isRequired,
    },

    componentDidMount: function() {
        retitle('Release Notes');
    },

    render: function() {
        return (
            <div>
                <Masthead store={ this.props.stores.userSession } title="Release Notes" />
                <div id="main-panel">
                    <div className="release-notes">
                        <h2>Release Notes Synergy 6 Beta-3 (February 9, 2015)</h2>
                        <h3>Features:</h3>
                        <ul>
                            <li>E Series Platform support</li>
                            <li>Flash Pool support</li>
                            <li>Report output in Word format</li>
                            <li>Enforce system limits and ensure configurations are always valid when shelves/drives are deleted</li>
                            <li>Root data partitioning for SSD on All Flash FAS (AFF)</li>
                        </ul>
                        <h3>Known Bugs:</h3>
                        <ul>
                            <li>Session expires after 1 hour. If Synergy becomes unresponsive, click Refresh to login and reestablish a session.</li>
                            <li>When "Automatically fill system with aggregates" is disabled,  Auto- aggregates is still created when new drives are added.</li>
                            <li>Shelves/drives are not allowed to delete if manual aggregate is assigned to it. Ideally we should allow user to do that and reassigned aggregate to other free drives.</li>
                            <li>Firefox browsers yield an “Unresponsive script” message upon first access. Click the Continue button to access Synergy for full functionality.</li>
                        </ul>
                        <hr/>
                        <h2>Release Notes Synergy 6 Beta-2 (December 23, 2014)</h2>
                        <h3>Features:</h3>
                        <ul>
                            <li>Support Root-Data HDD partition</li>
                            <li>Support manual aggregate</li>
                            <li>Project can be deleted</li>
                            <li>UI Enhancements based upon FAB and Insight Feedback</li>
                        </ul>
                        <h3>Known Bugs:</h3>
                        <ul>
                            <li>Cluster maximum node limit is not considered or restricted</li>
                            <li>System maximum storage limit is not considered or restricted</li>
                            <li>Aggregate maximum limit is not considered or restricted</li>
                            <li>Session expires after 1 hour.  If Synergy becomes unresponsive, click Refresh to login and reestablish a session.</li>
                        </ul>
                        <hr/>
                        <h2>Release Notes Synergy 6 Beta-1 (October 20, 2014)</h2>
                        <h3>Features:</h3>
                        <ul>
                            <li>Accessible by employees and partners (Windows/Mac desktop browsers only)</li>
                            <li>Persistent cloud storage of projects</li>
                            <li>Project search by name and metadata (tags)</li>
                            <li>User can add/edit/delete clustered and unclustered controllers to a project. </li>
                            <li>User can add/edit/delete shelves for a controller</li>
                            <li>User can specify drives for a shelf</li>
                            <li>Auto-aggregate creation according to best practices (TR-3838)</li>
                            <li>Usable capacity calculations are shown in a summary pane</li>
                        </ul>
                        <h3>Known Bugs:</h3>
                        <ul>
                            <li>Cluster maximum node limit is not considered or restricted</li>
                            <li>System maximum storage limit is not considered or restricted</li>
                            <li>Session expires after 1 hour.  If Synergy becomes unresponsive, click Refresh to login and reestablish a session.</li>
                        </ul>
                        <hr/>
                        <h3>Beta-1 Patch 1 (November 17, 2014)</h3>
                        <ul>
                            <li>UI Enhancements based upon FAB and Insight Feedback</li>
                            <li>Fix incorrect drive count for NL-SAS in summary result</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = ReleaseNotesPage;
