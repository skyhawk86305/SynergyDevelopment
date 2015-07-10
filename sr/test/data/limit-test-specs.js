'use strict';

var h1 = {
        configModel: 'FAS2220A',
        version: '8.1.4 Cluster-Mode',
        shelves: [{
            model: 'DS2126',
            quantity: 1,
            isEmbedded: true,
            drives: [{
                model: 'X306A', // 2TB SATA
                quantity: 12
            }]
        }]
    };

var h2 = {
        configModel: 'FAS8080AE EX',
        version: '8.3RC1 Cluster-Mode',
        shelves: []
    };

var h3 = {
        configModel: 'FAS2552HA',
        version: '8.3RC2 Cluster-Mode',
        shelves: [{
            model: 'DS2246',
            quantity: 1,
            isEmbedded: true,
            drives: [{
                model: 'X422A', // 600GB SAS
                quantity: 24
            }]
        }, {
            model: 'DS4246',
            quantity: 1,
            isEmbedded: false,
            drives: [{
                model: 'X575A', // 400GB SSD
                quantity: 4
            }, {
                model: 'X477A', // 4TB NL-SAS
                quantity: 20
            }]
        }]
    };

var h4 = {
        configModel: 'FAS8040A',
        version: '8.3RC2 Cluster-Mode',
        shelves: []
    };

var h5 = {
        configModel: 'FAS6290A',
        version: '8.3RC2 Cluster-Mode',
        shelves: []
    };

var h6 = {
        configModel: 'FAS8060A',
        version: '8.3RC2 Cluster-Mode',
        shelves: []
    };

var h7 = {
        configModel: 'FAS8080E EX',
        controllerCount: 1,
        version: '8.3RC1 Cluster-Mode',
        shelves: []
    };

var h8 = {
        configModel: 'FAS3240A',
        version: '8.0.5 Cluster-Mode',
        shelves: [{
            model: 'DS14-Mk4-FC',
            quantity: 1,
            isEmbedded: false,
            drives: [{
                model: 'X274B', // 144GB FC
                quantity: 14
            }]
        }, {
            model: 'DS2246',
            quantity: 1,
            isEmbedded: false,
            drives: [{
                model: 'X423A', // 900GB SAS
                quantity: 24
            }]
        }]
    };

var h9 = {
        configModel: 'FAS6250A',
        version: '8.0.5 Cluster-Mode',
        shelves: [{
            model: 'DS4246',
            quantity: 1,
            isEmbedded: false,
            drives: [{
                model: 'X308A', // 3TB SATA
                quantity: 24
            }]
        }]
    };

var h10 = {
        configModel: 'FAS8080AE EX',
        version: '8.2.2 7-Mode',
        shelves: [{
            model: 'DS4246',
            quantity: 60,
            isEmbedded: false,
            drives: [{
                model: 'X316A', // 6TB NL-SAS
                quantity: 24
            }]
        }]
    };

var h11 = {
        configModel: 'FAS2220',
        controllerCount: 1,
        version: '8.2.2 7-Mode',
        shelves: [{
            model: 'DS2126',
            quantity: 1,
            isEmbedded: true,
            drives: [{
                model: 'X306A', // 2TB SATA
                quantity: 12
            }]
        }, {
            model: 'DS4246',
            quantity: 4,
            isEmbedded: false,
            drives: [{
                model: 'X302A', // 1TB SATA
                quantity: 12
            }]
        }]
    };

var h12 = {
        configModel: 'FAS2554',
        controllerCount: 1,
        version: '8.2.3 7-Mode',
        shelves: [{
            model: 'DS4246',
            quantity: 1,
            isEmbedded: true,
            drives: [{
                model: 'X577A', // 800GB SSD (encrypted)
                quantity: 24
            }]
        }, {
            model: 'DS4246',
            quantity: 3,
            isEmbedded: false,
            drives: [{
                model: 'X577A', // 800GB SSD (encrypted)
                quantity: 24
            }]
        }]
    };

var h13 = {
        configModel: 'FAS2220',
        controllerCount: 1,
        version: '8.2.2 7-Mode',
        shelves: [{
            model: 'DS2126',
            quantity: 1,
            isEmbedded: true,
            drives: [{
                model: 'X477A', // 4TB NL-SAS
                quantity: 12
            }]
        }, {
            model: 'DS4246',
            quantity: 4,
            isEmbedded: false,
            drives: [{
                model: 'X477A', // 4TB NL-SAS
                quantity: 12
            }]
        }]
    };

var h14 = {
        configModel: 'FAS6250',
        controllerCount: 1,
        version: '8.2.2 7-Mode',
        shelves: [{
            model: 'DS14-Mk4-FC',
            quantity: 84,
            isEmbedded: false,
            drives: [{
                model: 'X292A', // 600GB FC
                quantity: 14
            }]
        }]
    };

var h15 = {
        configModel: 'FAS2220',
        controllerCount: 1,
        version: '8.2.2 7-Mode',
        shelves: [{
            model: 'DS2126',
            quantity: 1,
            isEmbedded: true,
            drives: [{
                model: 'X306A', // 2TB SATA
                quantity: 12
            }]
        }, {
            model: 'DS4246',
            quantity: 2,
            isEmbedded: false,
            drives: [{
                model: 'X575A', // 400GB SSD
                quantity: 4
            }, {
                model: 'X477A', // 4TB NL-SAS
                quantity: 20
            }]
        }]
    };

var h16 = {
        configModel: 'E2712 Duplex 16GB',
        version: '8.20 SANtricity',
        shelves: [{
            model: 'DE1600',
            quantity: 1,
            isEmbedded: true,
            drives: [{
                model: 'E-X4022B', // 3TB NL-SAS
                quantity: 12
            }]
        }]
    };

var h17 = {
        configModel: 'EF540 Flash Array',
        version: '8.20 SANtricity',
        shelves: [{
            model: 'DE5600',
            quantity: 1,
            isEmbedded: true,
            drives: [{
                model: 'E-X4041B', // 800GB SSD
                quantity: 24
            }]
        }]
    };

var cluster1 = [h1],                // 5158d4784d89
    cluster2 = [h1, h1],            // cb277c9c71db
    cluster4 = [h2],                // 856273a47d6c
    cluster5 = [h3, h4, h5, h6],    // 4c58bf768732
    cluster6 = [h7],                // f60205490775
    cluster7 = [h8, h9];            // aceb4a86915b

module.exports = {
    CLUSTER: {
        NON_NSE: cluster1,          // c34a1ef7e2d0
        HOMOGENEOUS: cluster2,      // d1ededdbc7cb, e3dec07f73ba
        SINGLE_HA_PAIR: cluster4,   // 7c2dca2a1088
        HETEROGENEOUS: cluster5,    // 52982eca00b4, 8330e5278ac9, c41a96d438a1, 84216d79c81f
        SINGLE_NODE: cluster6,      // 7f0f0d453be6
        HARDWARE_SHELF: cluster7    // 647b978edb34, d6df78f769f5
    },
    MAX_CAPACITY: h10,              // 0d4f6978de6d (replaces 3db27448fd8a)
    MAX_SATA: h11,                  // 3769dcd6d26e
    MAX_SSD_NSE: h12,               // 8cde322d2645
    MAX_SAS: h13,                   // abb86524d477
    MAX_FC_EXTERNAL: h14,           // 87b7b1c66614
    MAX_DRIVES: h15,                // 142465b5ace5
    E_NSE: h16,                     // 12aae7e16e4e
    EF_NON_NSE: h17                 // 75140be75336
};
