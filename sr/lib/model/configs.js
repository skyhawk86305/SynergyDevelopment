'use strict';

// jshint camelcase: false

var defaultConfigs = [
{ name :  'E2612 Duplex 4GB',  model : 'E2612',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E2612 Simplex 2GB', model : 'E2612',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E2624 Duplex 4GB',  model : 'E2624',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E2624 Simplex 2GB', model : 'E2624',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E2660 Duplex 4GB' , model : 'E2660',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E2712 Duplex 8GB',  model : 'E2712',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E2712 Duplex 16GB', model : 'E2712',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E2712 Simplex 4GB', model : 'E2712',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E2712 Simplex 8GB', model : 'E2712',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E2724 Duplex 8GB',  model : 'E2724',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E2724 Duplex 16GB', model : 'E2724',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E2724 Simplex 4GB', model : 'E2724',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E2724 Simplex 8GB', model : 'E2724',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E2760 Duplex 8GB',  model : 'E2760',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E2760 Duplex 16GB', model : 'E2760',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E5412 Duplex 12GB', model : 'E5412',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E5412 Duplex 24GB', model : 'E5412',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E5424 Duplex 12GB', model : 'E5424',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E5424 Duplex 24GB', model : 'E5424',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E5460 Duplex 12GB', model : 'E5460',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E5460 Duplex 24GB', model : 'E5460',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E5512 Duplex 24GB', model : 'E5512',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E5524 Duplex 24GB', model : 'E5524',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'E5560 Duplex 24GB', model : 'E5560',   shelf: 'DE6600', drive:'E-X4048A'},
{ name :  'EF540 Flash Array', model : 'EF540',   shelf: 'DE5600', drive:'E-X4059A'},
{ name :  'EF550 Flash Array', model : 'EF550',   shelf: 'DE5600', drive:'E-X4059A'},
{ name :  'FAS2220',           model : 'FAS2220', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS2220A',          model : 'FAS2220', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS2240-2',         model : 'FAS2240-2', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS2240-2HA',       model : 'FAS2240-2', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS2240-4',         model : 'FAS2240-4', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS2240-4HA',       model : 'FAS2240-4', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS2520HA',         model : 'FAS2520', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS2520',           model : 'FAS2520', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS2552',           model : 'FAS2552', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS2552HA',         model : 'FAS2552', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS2554',           model : 'FAS2554', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS2554HA',         model : 'FAS2554', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS3220',           model : 'FAS3220', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS3220E',          model : 'FAS3220', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS3220A',          model : 'FAS3220', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS3220AE',         model : 'FAS3220', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS3250E',          model : 'FAS3250', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS3250AE',         model : 'FAS3250', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS6220',           model : 'FAS6220', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS6220A',          model : 'FAS6220', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS6250',           model : 'FAS6250', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS6250A',          model : 'FAS6250', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS6290',           model : 'FAS6290', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS6290A',          model : 'FAS6290', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS8020',           model : 'FAS8020', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS8020A',          model : 'FAS8020', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS8040',           model : 'FAS8040', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS8040A',          model : 'FAS8040', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS8060',           model : 'FAS8060', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS8060A',          model : 'FAS8060', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS8080E EX',       model : 'FAS8080', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS8080AE EX',      model : 'FAS8080', shelf: 'DS4246', drive:'X477A'},
{ name :  'V3220',             model : 'V3220',   shelf: 'DS4246', drive:'X477A'},
{ name :  'V3220A',            model : 'V3220',   shelf: 'DS4246', drive:'X477A'},
{ name :  'V3220E',            model : 'V3220',   shelf: 'DS4246', drive:'X477A'},
{ name :  'V3220AE',           model : 'V3220',   shelf: 'DS4246', drive:'X477A'},
{ name :  'V3250AE',           model : 'V3250',   shelf: 'DS4246', drive:'X477A'},
{ name :  'V3250E',            model : 'V3250',   shelf: 'DS4246', drive:'X477A'},
{ name :  'V6220',             model : 'V6220',   shelf: 'DS4246', drive:'X477A'},
{ name :  'V6220A',            model : 'V6220',   shelf: 'DS4246', drive:'X477A'},
{ name :  'V6250',             model : 'V6250',   shelf: 'DS4246', drive:'X477A'},
{ name :  'V6250A',            model : 'V6250',   shelf: 'DS4246', drive:'X477A'},
{ name :  'V6290',             model : 'V6290',   shelf: 'DS4246', drive:'X477A'},
{ name :  'V6290A',            model : 'V6290',   shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS6080',           model : 'FAS6080', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS6080HA',         model : 'FAS6080', shelf: 'DS4246', drive:'X477A'},
{ name :  'FAS6080-FMC',       model : 'FAS6080', shelf: 'DS4246', drive:'X477A'}
];

module.exports = defaultConfigs;
