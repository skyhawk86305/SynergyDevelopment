'use strict';

var _ = require('lodash'),
	React = require('react'),
	Repeat = require('./repeat'),
    SystemSummary = require('./system-summary');

var ClusterList = React.createClass({
    propTypes: {
        clusters: React.PropTypes.array.isRequired,
        currentSelection: React.PropTypes.object.isRequired,
        select: React.PropTypes.func.isRequired,
        fire: React.PropTypes.func.isRequired
    },

    render: function() {
        return (
            <Repeat seq={ this.props.clusters }
                    prop="cluster"
                    className="clusters">
                <Cluster
                    currentSelection={ this.props.currentSelection }
                    select={ this.props.select } />
            </Repeat>
        );
    }
});

var Cluster = React.createClass({
    propTypes: {
        cluster: React.PropTypes.object.isRequired,
        currentSelection: React.PropTypes.object.isRequired,
        select: React.PropTypes.func.isRequired
    },

    isSelected: function(selector, cluster) {
        var isClusterMatch = false,
            selectedCluster = _(selector).has('cluster') ? selector.cluster._id : '';

        if (selectedCluster) {
            var id = cluster._id || '';
            isClusterMatch = (selectedCluster === id) ? true : false;
        }

        return _(selector).has('hagroup') ? false : isClusterMatch;
    },

    selectCluster: function(event) {
        event.stopPropagation();
        event.preventDefault();

        var selector = { cluster: { _id: this.props.cluster._id } };
        this.props.select(selector, 'ClusterGrouping');
    },

    selectClusterGroup: function(selector, col2View, col3View) {
        var parent = { cluster: { _id: this.props.cluster._id } };
        this.props.select(_.merge(parent, selector), col2View, col3View);
    },

    render: function() {
        var cluster = this.props.cluster,
            selected = this.props.currentSelection,
            isSelected = this.isSelected(selected, cluster),
            modelGroups = _.groupBy(cluster.hagroups, function(s) { return s._model; }),
            classNames = React.addons.classSet({
                'cluster': true,
                'selectable': true,
                'selected': isSelected,
            });

        return (
            <div className={ classNames }>
                <span className="sub-grouping-label" onClick={ this.selectCluster }>
                    { cluster.name || 'un-named' }
                    <span className="pull-right action">
                        Edit
                    </span>
                </span>
                <Repeat seq={ _.map(modelGroups) }
                        prop="hagroups"
                        className="standalones">
                    <SystemSummary
                        isGrouped={ false }
                        currentSelection={ selected }
                        select={ this.selectClusterGroup } />
                </Repeat>
            </div>
        );
    }
});

module.exports = ClusterList;
