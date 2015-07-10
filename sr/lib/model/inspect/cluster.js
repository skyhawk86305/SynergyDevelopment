'use strict';

var _ = require('lodash');

function ClusterInspector(init) {
    init(this); // this.inspect, this.info, this.cluster
}

ClusterInspector.prototype.nodeSummary = function nodeSummary(ejecting) {
    var count = 0,
        nasLimit,
        sanLimit,
        inspect = this.inspect;

    _.forEach(this._remainingHagroups(ejecting), function summarize(hagroup) {
        var hagroupInspector = inspect(hagroup),
            nasNodes = hagroupInspector.limits.nas_nodes,
            sanNodes = hagroupInspector.limits.san_nodes;

        count += hagroup.controllers.length || 0;
        nasLimit = (nasLimit === undefined) ? nasNodes : Math.min(nasLimit, nasNodes);
        sanLimit = (sanLimit === undefined) ? sanNodes : Math.min(sanLimit, sanNodes);
    }, this);

    return {
        quantity: count,
        limits: {
            nas: nasLimit || undefined,
            san: sanLimit || undefined
        }
    };
};

ClusterInspector.prototype.versionRange = function versionRange(ejecting) {
    var inspect = this.inspect;

    return _.reduce(this.cluster.hagroups || [], function intersection(range, hagroup) {
        var hagroupInspector = inspect(hagroup),
            shelfRange = hagroupInspector.shelfVersionRange(ejecting);

        var isEjectingHagroup = _.some(ejecting, { _type: 'hagroup', _id: hagroup._id }),
            versions;

        if (isEjectingHagroup) {
            versions = shelfRange ? shelfRange : range;
        } else {
            var systemRange = hagroupInspector.config.matrix.versions;

            versions = shelfRange ? _.intersection(systemRange, shelfRange) : systemRange;
        }

        return range ? _.intersection(range, versions) : versions;
    }, undefined, this);
};

ClusterInspector.prototype._remainingHagroups = function _remainingHagroups(ejecting) {
    var hagroups = _.where(ejecting, { _type: 'hagroup' });

    return _.filter(this.cluster.hagroups || [], function isNotReplacing(hagroup) {
        return !_.some(hagroups, { _id: hagroup._id });
    });
};

module.exports = ClusterInspector;
