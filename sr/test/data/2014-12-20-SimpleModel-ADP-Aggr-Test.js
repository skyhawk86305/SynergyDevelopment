// TODO: Compress / Convert to base64

var model = {
  '_x_project_name': 'Simple project with ADP enabled',
  '_x_original_timestamp': 1419136089039,
  '_type': 'solution',
  'synergy_model': {
    'hagroups': [
      {
        '_id': '7be25437-1517-4425-9651-e7e0fcfcd5a9',
        '_model': 'FAS2240-2HA',
        '_type': 'hagroup',
        '_policies': {
          'Aggregates': {
            'manual': true
          }
        },
        'is_clustered': true,
        'model': 'FAS2240-2',
        'cluster': {
          '_id': '3b5108db-ba1e-42f2-988c-e2e697562573',
          'name': 'cluster2'
        },
        'controllers': [
          {
            '_id': 'b17e009c-8675-4fa4-b00b-1fa61d30f346',
            '_type': 'controller',
            'name': 'netapp3',
            'aggregates': [
              {
                '_id': '242f2b62-a334-4eac-a52d-ea9bc4e7e767',
                '_manual': false,
                'name': 'root_aggr_1',
                'block_type': '32_bit',
                'raid_type': 7,
                'cache_raid_type': null,
                'is_hybrid': false,
                'is_mirrored': false,
                'is_root_aggregate': true,
                '_snapreserve_proportion': 0,
                '_cache_storage_pool_id': null,
                '_raid_groups': [
                  {
                    'name': 'rg1',
                    '_devices': [
                      '!8b17aa9c.0P2',
                      '!8b17aa9c.1P2',
                      '!8b17aa9c.2P2',
                      '!8b17aa9c.3P2',
                      '!8b17aa9c.4P2',
                      '!8b17aa9c.5P2',
                      '!8b17aa9c.6P2',
                      '!8b17aa9c.7P2',
                      '!8b17aa9c.8P2',
                      '!8b17aa9c.9P2'
                    ],
                    'cache': false,
                    'plex_number': 1
                  }
                ]
              },
              {
                '_id': '9a58499a-72a2-46f2-9aa4-1de78562930c',
                '_manual': false,
                'name': 'aggr_3',
                'block_type': '64_bit',
                'raid_type': 7,
                'cache_raid_type': null,
                'is_hybrid': false,
                'is_mirrored': false,
                'is_root_aggregate': false,
                '_snapreserve_proportion': 0,
                '_cache_storage_pool_id': null,
                '_raid_groups': [
                  {
                    'name': 'rg1',
                    '_devices': [
                      '!8b17aa9c.0P1',
                      '!8b17aa9c.1P1',
                      '!8b17aa9c.2P1',
                      '!8b17aa9c.3P1',
                      '!8b17aa9c.4P1',
                      '!8b17aa9c.5P1',
                      '!8b17aa9c.6P1',
                      '!8b17aa9c.7P1',
                      '!8b17aa9c.8P1',
                      '!8b17aa9c.9P1',
                      '!8b17aa9c.10P1'
                    ],
                    'cache': false,
                    'plex_number': 1
                  }
                ]
              }
            ],
            '_assigned_storage': [
              {
                'slice_details': {
                  'slice': 'P2',
                  'used_blocks': 7266880,
                  'devices': [
                    '!8b17aa9c.0P2',
                    '!8b17aa9c.1P2',
                    '!8b17aa9c.2P2',
                    '!8b17aa9c.3P2',
                    '!8b17aa9c.4P2',
                    '!8b17aa9c.5P2',
                    '!8b17aa9c.6P2',
                    '!8b17aa9c.7P2',
                    '!8b17aa9c.8P2',
                    '!8b17aa9c.9P2',
                    '!8b17aa9c.10P2',
                    '!8b17aa9c.11P2'
                  ]
                }
              },
              {
                'slice_details': {
                  'slice': 'P1',
                  'used_blocks': 136083776,
                  'devices': [
                    '!8b17aa9c.0P1',
                    '!8b17aa9c.1P1',
                    '!8b17aa9c.2P1',
                    '!8b17aa9c.3P1',
                    '!8b17aa9c.4P1',
                    '!8b17aa9c.5P1',
                    '!8b17aa9c.6P1',
                    '!8b17aa9c.7P1',
                    '!8b17aa9c.8P1',
                    '!8b17aa9c.9P1',
                    '!8b17aa9c.10P1',
                    '!8b17aa9c.11P1'
                  ]
                }
              }
            ]
          },
          {
            '_id': 'b9c5d8f3-9b5e-46d8-bf2f-5ef08be5dffe',
            '_type': 'controller',
            'name': 'netapp4',
            'aggregates': [
              {
                '_id': 'b50fb57f-e1fa-4f5b-a1af-b3bc08708d48',
                '_manual': false,
                'name': 'root_aggr_2',
                'block_type': '32_bit',
                'raid_type': 7,
                'cache_raid_type': null,
                'is_hybrid': false,
                'is_mirrored': false,
                'is_root_aggregate': true,
                '_snapreserve_proportion': 0,
                '_cache_storage_pool_id': null,
                '_raid_groups': [
                  {
                    'name': 'rg1',
                    '_devices': [
                      '!8b17aa9c.12P2',
                      '!8b17aa9c.13P2',
                      '!8b17aa9c.14P2',
                      '!8b17aa9c.15P2',
                      '!8b17aa9c.16P2',
                      '!8b17aa9c.17P2',
                      '!8b17aa9c.18P2',
                      '!8b17aa9c.19P2',
                      '!8b17aa9c.20P2',
                      '!8b17aa9c.21P2'
                    ],
                    'cache': false,
                    'plex_number': 1
                  }
                ]
              },
              {
                '_id': '534c6219-d216-4860-b382-726299cbb3e6',
                '_manual': false,
                'name': 'aggr_4',
                'block_type': '64_bit',
                'raid_type': 7,
                'cache_raid_type': null,
                'is_hybrid': false,
                'is_mirrored': false,
                'is_root_aggregate': false,
                '_snapreserve_proportion': 0,
                '_cache_storage_pool_id': null,
                '_raid_groups': [
                  {
                    'name': 'rg1',
                    '_devices': [
                      '!8b17aa9c.12P1',
                      '!8b17aa9c.13P1',
                      '!8b17aa9c.14P1',
                      '!8b17aa9c.15P1',
                      '!8b17aa9c.16P1',
                      '!8b17aa9c.17P1',
                      '!8b17aa9c.18P1',
                      '!8b17aa9c.19P1',
                      '!8b17aa9c.20P1',
                      '!8b17aa9c.21P1',
                      '!8b17aa9c.22P1'
                    ],
                    'cache': false,
                    'plex_number': 1
                  }
                ]
              }
            ],
            '_assigned_storage': [
              {
                'slice_details': {
                  'slice': 'P2',
                  'used_blocks': 7266880,
                  'devices': [
                    '!8b17aa9c.12P2',
                    '!8b17aa9c.13P2',
                    '!8b17aa9c.14P2',
                    '!8b17aa9c.15P2',
                    '!8b17aa9c.16P2',
                    '!8b17aa9c.17P2',
                    '!8b17aa9c.18P2',
                    '!8b17aa9c.19P2',
                    '!8b17aa9c.20P2',
                    '!8b17aa9c.21P2',
                    '!8b17aa9c.22P2',
                    '!8b17aa9c.23P2'
                  ]
                }
              },
              {
                'slice_details': {
                  'slice': 'P1',
                  'used_blocks': 136083776,
                  'devices': [
                    '!8b17aa9c.12P1',
                    '!8b17aa9c.13P1',
                    '!8b17aa9c.14P1',
                    '!8b17aa9c.15P1',
                    '!8b17aa9c.16P1',
                    '!8b17aa9c.17P1',
                    '!8b17aa9c.18P1',
                    '!8b17aa9c.19P1',
                    '!8b17aa9c.20P1',
                    '!8b17aa9c.21P1',
                    '!8b17aa9c.22P1',
                    '!8b17aa9c.23P1'
                  ]
                }
              }
            ]
          }
        ],
        'shelves': [
          {
            '_id': '8b17aa9c-9478-4d57-9b4d-23640d79da18',
            '_type': 'shelf',
            '_x_bom': {
              'drive_specs': [
                {
                  'model': 'X422A',
                  'rawgb': 600,
                  'rsgb': 587.2025600000001,
                  'rpm': 10,
                  'type': 'SAS',
                  'encrypted': false,
                  'fp_support': false,
                  'quantity': 24
                }
              ],
              'drive_spec_members': [
                [
                  '!8b17aa9c.0',
                  '!8b17aa9c.1',
                  '!8b17aa9c.2',
                  '!8b17aa9c.3',
                  '!8b17aa9c.4',
                  '!8b17aa9c.5',
                  '!8b17aa9c.6',
                  '!8b17aa9c.7',
                  '!8b17aa9c.8',
                  '!8b17aa9c.9',
                  '!8b17aa9c.10',
                  '!8b17aa9c.11',
                  '!8b17aa9c.12',
                  '!8b17aa9c.13',
                  '!8b17aa9c.14',
                  '!8b17aa9c.15',
                  '!8b17aa9c.16',
                  '!8b17aa9c.17',
                  '!8b17aa9c.18',
                  '!8b17aa9c.19',
                  '!8b17aa9c.20',
                  '!8b17aa9c.21',
                  '!8b17aa9c.22',
                  '!8b17aa9c.23'
                ]
              ]
            },
            'model': 'DS2246',
            'bay_count': 24,
            '_isembedded': true,
            'shelf_number': 1
          }
        ],
        'version': '8.3RC1 Cluster-Mode'
      }
    ]
  },
  '_version': 57,
  '_uuid': 'eec7c06c-e79e-46e0-a1d4-8237de04c946',
  '_user_id': 'changjie',
  '_timestamp': 1419138403448,
  '_client_id': 'sr',
  '_keys': [
    'synergy_model'
  ],
  '_url': 'https://tclip-dev.techteam.netapp.com/d/eec7c06c-e79e-46e0-a1d4-8237de04c946/57',
  '_sendto': 'https://sendto-dev.techteam.netapp.com/v/eec7c06c-e79e-46e0-a1d4-8237de04c946/57'
};

module.exports = model;
