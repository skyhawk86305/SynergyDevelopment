'use strict';

var assert = require('assert'),
    constants = require('./constants');

var CONFIG_GROUPS = constants.CONFIG_GROUPS;

function Policies() {
    assert(this instanceof Policies, 'use new');
    return buildPolicies();
}

function buildPolicies() {
    return [{
        scope: 'Aggregates',
        policy: 'manual',
        label: 'Automatically fill system with Aggregates',
        defaultValue: false,
        inverted: true,
        impactsCluster: false,
        productLines: [ CONFIG_GROUPS.FAS ]
    }, {
        scope: 'Aggregates',
        policy: 'manual',
        label: 'Automatically fill system with Storage Containers',
        defaultValue: false,
        inverted: true,
        impactsCluster: false,
        productLines: [ CONFIG_GROUPS.E ]
    }, {
        scope: 'ADP',
        policy: 'prohibitedByUser',
        label: 'Use Root-Data Partitioning when available',
        defaultValue: false,
        inverted: true,
        impactsCluster: false,
        productLines: [ CONFIG_GROUPS.FAS ]
    }, {
        scope: 'Aggregates',
        policy: 'ssdsForFlashPool',
        label: 'Prefer using SSDs for Flash Pool',
        defaultValue: true,
        inverted: false,
        impactsCluster: false,
        productLines: [ CONFIG_GROUPS.FAS ]
    }, {
        scope: 'version',
        policy: 'pin',
        label: 'Automatically select the latest compatible OS version',
        defaultValue: true,
        inverted: true,
        impactsCluster: true,
        productLines: [ CONFIG_GROUPS.FAS, CONFIG_GROUPS.E ]
    }, {
        scope: 'spare_allocation',
        policy: 'enforce',
        label: 'Enforce spare allocation policy',
        defaultValue: constants.POLICIES.SPARES.DEFAULT,
        allowedValues: constants.POLICIES.SPARES.ALLOWED,
        inverted: false,
        impactsCluster: false,
        productLines: [ CONFIG_GROUPS.FAS ]
    }];
}

module.exports = Policies;
