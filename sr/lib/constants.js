'use strict';

module.exports = {
    PROJECT_LIST_PATH: '/projects/list',
    PROJECT_LOAD_PATH: '/projects/load',
    PROJECT_ADJUST_PATH: '/projects/adjust',
    PROJECT_REPLACE_PATH: '/projects/replace',
    PROJECT_INFO_PATH: '/projects/info',
    CLIENT_LOG_PATH: '/log',
    PROJECT_INFO_CONCURRENCY: 5,
    SERVER_READ_CONCURRENCY: 5,
    SERVER_WRITE_CONCURRENCY: 5,
    PLATFORM_OPTIONS_GET_PATH: '/platform/options',
    UNWANTED_METADATA: [
        '_x_metrics',
        '_x_gps_position',
        '_x_localization',
        '_x_statistics',
        '_x_generator',
        '_x_log'
    ],
    CONFIG_GROUPS: {
        // please keep these unique, even if they're nested
        FAS: 'FAS',
        FAS_CMODE_NORMAL: 'c-mode',
        FAS_CMODE_MCC: 'mcc',
        FAS_7MODE_NORMAL: '7-mode',
        FAS_7MODE_MC: '7mc',
        FAS_VSERIES: 'V',
        E: 'E',
        E_NORMAL: 'e-series',
        EF_NORMAL: 'ef-series'
    },
    LIMIT_TYPES: {
        ENABLED: 'ENABLED',
        VERSION: 'VERSION',
        NAS_NODES: 'NAS_NODES',
        CAPACITY_GB: 'CAPACITY_GB',
        EMBEDDED: 'EMBEDDED',
        DRIVE_TOTAL: 'DRIVE_TOTAL',
        DRIVE_SATA: 'DRIVE_SATA',
        DRIVE_FC: 'DRIVE_FC',
        DRIVE_SAS: 'DRIVE_SAS',
        DRIVE_SSD: 'DRIVE_SSD',
        EXT_SHELVES: 'EXT_SHELVES',
        AGGR_MANUAL: 'AGGR_MANUAL',
        AGGR_SIZE_64_TB: 'AGGR_SIZE_64_TB',
        AGGR_MIN_FP_DRIVES: 'AGGR_MIN_FP_DRIVES',
        CACHE_NO_FLASH: 'CACHE_NO_FLASH',
        PRODUCTLINE: 'PRODUCTLINE',
        HARDWARE_SHELF: 'HARDWARE_SHELF',
        DRIVE_NSE: 'DRIVE_NSE'
    },
    LIMIT_REASONS: {
        ENABLED: 'Config limit reached.',
        VERSION: 'Outside OS version range.',
        NAS_NODES: 'Max NAS node limit reached.',
        CAPACITY_GB: 'Max capacity reached.',
        EMBEDDED: 'Embedded shelf.',
        DRIVE_TOTAL: 'Max drive limit reached.',
        DRIVE_SATA: 'Max SATA drive limit reached.',
        DRIVE_FC: 'Max FC drive limit reached.',
        DRIVE_SAS: 'Max SAS drive limit reached.',
        DRIVE_SSD: 'Max SSD drive limit reached.',
        EXT_SHELVES: 'Max external shelves limit reached.',
        AGGR_MANUAL: 'Impacts devices used by a manual aggregate.',
        AGGR_SIZE_64_TB: 'Manual aggregates would exceed the size limit.',
        AGGR_MIN_FP_DRIVES: 'Manual flash pool does not have enough drives.',
        CACHE_NO_FLASH: 'Manual flash pool would exceed the size limit.',
        PRODUCTLINE: 'Only one product line per project.',
        HARDWARE_SHELF: 'Existing shelf hardware not supported.',
        DRIVE_NSE: 'Mixing encrypting and nonencrypting disks.'
    },
    POLICIES: {
        SPARES: {
            DEFAULT: 'Balanced',
            ALLOWED: ['Minimum', 'Balanced', 'Maximum'],
        },
    }
};
