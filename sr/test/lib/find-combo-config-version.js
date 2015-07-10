'use strict';

var CONFIG_GROUPS = require('../../lib/constants').CONFIG_GROUPS;

// arrays hard-coded becaude lab can't asynchronously declare tests
var FAS_CMODE_VERSIONS_TO_TEST = [
        '8.2.3 Cluster-Mode',
        '8.3RC2 Cluster-Mode',
    ],
    FAS_7MODE_VERSIONS_TO_TEST = [
        '8.2.3 7-Mode',
    ],
    E_VERSIONS_TO_TEST = [
        '8.20 SANtricity',
    ],
    EF_VERSIONS_TO_TEST = [
        '8.20 SANtricity',
    ],
    FAS_MODELS_TO_TEST = [
        'FAS2220',
        'FAS2220A',
        'FAS2240-2',
        'FAS2240-2HA',
        'FAS2240-4',
        'FAS2240-4HA',
        'FAS2520',
        'FAS2520HA',
        'FAS2552',
        'FAS2552HA',
        'FAS2554',
        'FAS2554HA',
        'FAS6220',
        'FAS6220A',

        // higher midrange FAS boring
        // 'FAS6250',
        // 'FAS6250A',
        // 'FAS6290',
        // 'FAS6290A',

        'FAS8020',
        'FAS8020A',

        // higher end FAS boring
        // 'FAS8040',
        // 'FAS8040A',
        // 'FAS8060',
        // 'FAS8060A',
        // 'FAS8060AE',
        // 'FAS8060E',
        // 'FAS8080AE EX',
        // 'FAS8080E EX',

        // v-series boring until we can customise 3rd party storage
        // 'V6220',
        // 'V6220A',
        // 'V6250',
        // 'V6250A',
        // 'V6290',
        // 'V6290A',
    ],
    E_MODELS_TO_TEST = [
        'E2712 Duplex 16GB',
        // 'E2712 Duplex 8GB',  // memory change only
        // 'E2712 Simplex 4GB', // ...
        'E2712 Simplex 8GB',
        'E2724 Duplex 16GB',
        // 'E2724 Duplex 8GB',
        // 'E2724 Simplex 4GB',
        'E2724 Simplex 8GB',
        'E2760 Duplex 16GB',
        // 'E2760 Duplex 8GB',
        // 'E5412 Duplex 12GB',
        'E5412 Duplex 24GB',
        // 'E5424 Duplex 12GB',
        'E5424 Duplex 24GB',
        // 'E5460 Duplex 12GB',
        'E5460 Duplex 24GB',
        'E5512 Duplex 24GB',
        'E5524 Duplex 24GB',
        'E5560 Duplex 24GB',
        'E5612 Duplex 24GB',
        'E5624 Duplex 24GB',
        'E5660 Duplex 24GB',
    ],
    EF_MODELS_TO_TEST = [
        'EF540 Flash Array',
        'EF550 Flash Array',
        'EF560 Flash Array'
    ],
    TESTS = [{
            group: CONFIG_GROUPS.FAS,
            subGroup: CONFIG_GROUPS.FAS_CMODE_NORMAL,
            models: FAS_MODELS_TO_TEST,
            versions: FAS_CMODE_VERSIONS_TO_TEST,
        }, {
            group: CONFIG_GROUPS.FAS,
            subGroup: CONFIG_GROUPS.FAS_7MODE_NORMAL,
            models: FAS_MODELS_TO_TEST,
            versions: FAS_7MODE_VERSIONS_TO_TEST,
        }, {
            group: CONFIG_GROUPS.E,
            subGroup: CONFIG_GROUPS.E_NORMAL,
            models:E_MODELS_TO_TEST,
            versions: E_VERSIONS_TO_TEST,
        }, {
            group: CONFIG_GROUPS.E,
            subGroup: CONFIG_GROUPS.EF_NORMAL,
            models:EF_MODELS_TO_TEST,
            versions: EF_VERSIONS_TO_TEST,
        },
    ];

module.exports = TESTS;
