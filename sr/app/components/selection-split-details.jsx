'use strict';

var React = require('react'),
    _ = require('lodash'),
    constants = require('../../lib/constants.js');

var SelectionSplitDetails = React.createClass({
    propTypes: {
        config: React.PropTypes.object,
        selectionType: React.PropTypes.string.isRequired
    },

    render: function() {
        var selectionType = this.props.selectionType;
        if (!this.props.config) {
            return (
                <div className="selection-split-details">
                    Hover over any { selectionType.toLowerCase() } to see more details or view what impacts selecting this { selectionType.toLowerCase() } will have.
                </div>
            );
        } else {
            if (this.props.config.conflicts.length > 0) {
                var conflicts = _.map(this.props.config.conflicts, function(conflict) {
                    var attribute = conflict.attribute.toUpperCase().replace('.','_'),
                        limit_type = constants.LIMIT_TYPES[attribute],
                        limit_reason = constants.LIMIT_REASONS[limit_type];

                    return (
                        <div>
                            { limit_reason }
                        </div>
                    );
                });
                return (
                    <div className="selection-split-details">
                        This { selectionType.toLowerCase() } is not available because:<hr />
                        { conflicts }
                    </div>
                );
            } else {
                //var effects = _.map(this.props.details.config.effects, function(effect) {
                    //return null; //TODO: IMPLEMENT
                //});
                return (
                    <div className="selection-split-details">
                        Headroom data will go here.
                    </div>
                );
            }
        }
    }
});

module.exports = SelectionSplitDetails;
