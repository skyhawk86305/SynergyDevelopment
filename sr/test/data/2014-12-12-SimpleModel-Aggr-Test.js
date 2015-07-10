// TODO: Compress / Convert to base64

var model = {
  '_x_project_name': 'Hello',
  '_type': 'solution',
  'synergy_model': {
    'hagroups': [
      {
        '_id': '640013dd-b745-49a8-9f29-760dca08c484',
        '_model': 'FAS8060A',
        'is_clustered': true,
        'model': 'FAS8060',
        'cluster': {
          '_id': 'd0e10e9e-133e-4ef9-912b-40c15682aaf3',
          'name': 'cluster1'
        },
        'controllers': [
          {
            '_id': 'b117a2fa-968b-4e64-992b-10e1d33bec65',
            'aggregates': [
               {'_id':'0f0d14be-a9e3-4834-9812-824cccc48cd6',
                '_manual':false,
                'name':'root_aggr_1',
                'block_type':'32_bit',
                'raid_type':7,
                'cache_raid_type':null,
                'is_hybrid':false,
                'is_mirrored':false,
                'is_root_aggregate':true,
                '_snapreserve_proportion':0,
                '_cache_storage_pool_id':null,
                '_raid_groups':[{'name':'rg1','_devices':['!1a6659f0.1','!1a6659f0.2','!1a6659f0.3'],
                'cache':false,
                'plex_number':1,
                '__deviceSpecs':[
                   {'spec':
                      {'rawgb':4000,
                      'rsgb':3930.3973437440004,
                      'rpm':10,
                      'type':'MSATA',
                      'encrypted':false,
                      'fp_support':'no',
                      'quantity':24,
                      '_for_controller':'b117a2fa-968b-4e64-992b-10e1d33bec65'
                    },
                    'count':3}]}],
                    '_controller':'b117a2fa-968b-4e64-992b-10e1d33bec65'
                  },
                {'_id':'0f0d14be-a9e3-4834-9812-824cccc48cd5',
                '_manual':false,
                'name':'auto_aggr_1',
                'block_type':'32_bit',
                'raid_type':7,
                'cache_raid_type':null,
                'is_hybrid':false,
                'is_mirrored':false,
                'is_root_aggregate':false,
                '_snapreserve_proportion':0,
                '_cache_storage_pool_id':null,
                '_raid_groups':[{'name':'rg1','_devices':['!1a6659f0.4','!1a6659f0.5','!1a6659f0.6'],
                'cache':false,
                'plex_number':1,
                '__deviceSpecs':[
                   {'spec':
                      {'rawgb':4000,
                      'rsgb':3930.3973437440004,
                      'rpm':10,
                      'type':'MSATA',
                      'encrypted':false,
                      'fp_support':'no',
                      'quantity':24,
                      '_for_controller':'b117a2fa-968b-4e64-992b-10e1d33bec65'
                    },
                    'count':3}]}],
                    '_controller':'b117a2fa-968b-4e64-992b-10e1d33bec65'
                  }

            ],
            'name': 'netapp1'
          },
          {
            '_id': '3f9b7dc9-c412-4d57-b82e-5d6113998a30',
            'aggregates': [

            ],
            'name': 'netapp2'
          }
        ],
        'shelves': [
          {
            '_x_bom': {
              'drive_specs': [
                {
                  'model': 'X480A',
                  'rawgb': 4000,
                  'rsgb': 3930.3973437440004,
                  'rpm': 7.2,
                  'type': 'MSATA',
                  'encrypted': false,
                  'fp_support': 'no',
                  'quantity': 24
                }
              ],
              'drive_spec_members': [
                [
                  '!1a6659f0.1',
                  '!1a6659f0.2',
                  '!1a6659f0.3',
                  '!1a6659f0.4',
                  '!1a6659f0.5',
                  '!1a6659f0.6',
                  '!1a6659f0.7',
                  '!1a6659f0.8',
                  '!1a6659f0.9',
                  '!1a6659f0.10',
                  '!1a6659f0.11',
                  '!1a6659f0.12',
                  '!1a6659f0.13',
                  '!1a6659f0.14',
                  '!1a6659f0.15',
                  '!1a6659f0.16',
                  '!1a6659f0.17',
                  '!1a6659f0.18',
                  '!1a6659f0.19',
                  '!1a6659f0.20',
                  '!1a6659f0.21',
                  '!1a6659f0.22',
                  '!1a6659f0.23',
                  '!1a6659f0.24'
                ]
              ]
            },
            'model': 'DS4486',
            'bay_count': 48,
            '_id': '1a6659f0-537e-43af-b70d-093e295b5af6',
            '_isembedded': false,
            'shelf_number': 1
          },
          {
            '_x_bom': {
              'drive_specs': [
                {
                  'model': 'X423A',
                  'rawgb': 900,
                  'rsgb': 898.629632,
                  'rpm': 10,
                  'type': 'SAS',
                  'encrypted': false,
                  'fp_support': 'no',
                  'quantity': 24
                }
              ],
              'drive_spec_members': [
                [
                  '!1c5094a0.1',
                  '!1c5094a0.2',
                  '!1c5094a0.3',
                  '!1c5094a0.4',
                  '!1c5094a0.5',
                  '!1c5094a0.6',
                  '!1c5094a0.7',
                  '!1c5094a0.8',
                  '!1c5094a0.9',
                  '!1c5094a0.10',
                  '!1c5094a0.11',
                  '!1c5094a0.12',
                  '!1c5094a0.13',
                  '!1c5094a0.14',
                  '!1c5094a0.15',
                  '!1c5094a0.16',
                  '!1c5094a0.17',
                  '!1c5094a0.18',
                  '!1c5094a0.19',
                  '!1c5094a0.20',
                  '!1c5094a0.21',
                  '!1c5094a0.22',
                  '!1c5094a0.23',
                  '!1c5094a0.24'
                ]
              ]
            },
            'model': 'DS2246',
            'bay_count': 24,
            '_id': '1c5094a0-4fc6-47ce-a33a-1b87426074d6',
            '_isembedded': false,
            'shelf_number': 2
          }
        ],
        'version': '8.3RC1 Cluster-Mode'
      }
    ]
  },
  '_version': 5,
  '_uuid': 'e341fb6a-50c5-460a-9afd-ce285aabcde2',
  '_user_id': 'mkwasnic',
  '_timestamp': 1418400377633,
  '_client_id': 'sr',
  '_keys': [
    'synergy_model'
  ],
  '_url': 'https://tclip-dev.techteam.netapp.com/d/e341fb6a-50c5-460a-9afd-ce285aabcde2/5',
  '_sendto': 'https://sendto-dev.techteam.netapp.com/v/e341fb6a-50c5-460a-9afd-ce285aabcde2/5'
};

module.exports = model;
