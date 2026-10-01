(function defineSample(scope) {
  'use strict'

  scope.KC_REPLAY_SAMPLE = {
    version: 1,
    source: 'bundled-local-sample',
    battleId: 'sample-normal-001',
    roster: {
      combinedType: 0,
      playerMain: [
        { name: '白露改', mstId: 497, level: 88 },
        { name: '时雨改二', mstId: 145, level: 96 },
        { name: '夕立改二', mstId: 144, level: 97 },
        { name: '由良改二', mstId: 488, level: 91 },
        { name: '最上改二', mstId: 699, level: 93 },
        { name: '瑞凤改二乙', mstId: 560, level: 95 }
      ],
      playerEscort: [],
      shipNames: {
        "1501": "深海旗舰",
        "1502": "深海战舰",
        "1503": "深海空母",
        "1504": "深海轻巡",
        "1505": "深海驱逐甲",
        "1506": "深海驱逐乙"
      }
    },
    packets: [
      {
        path: '/kcsapi/api_req_sortie/battle',
        body: {
          api_deck_id: 1,
          api_ship_ke: [1501, 1502, 1503, 1504, 1505, 1506],
          api_f_nowhps: [31, 31, 31, 45, 62, 59],
          api_f_maxhps: [31, 31, 31, 45, 62, 59],
          api_e_nowhps: [180, 96, 88, 55, 35, 35],
          api_e_maxhps: [180, 96, 88, 55, 35, 35],
          api_formation: [1, 1, 1],
          api_kouku: {
            api_stage1: { api_f_count: 42, api_f_lostcount: 3, api_e_count: 64, api_e_lostcount: 21, api_disp_seiku: 1 },
            api_stage3: {
              api_frai_flag: [0, 0, 0, 0, 0, 0],
              api_fbak_flag: [0, 0, 0, 0, 0, 0],
              api_fcl_flag: [0, 0, 0, 0, 0, 0],
              api_fdam: [0, 0, 0, 0, 0, 0],
              api_erai_flag: [1, 0, 1, 0, 0, 0],
              api_ebak_flag: [0, 0, 1, 0, 0, 0],
              api_ecl_flag: [1, 0, 2, 0, 0, 0],
              api_edam: [18, 0, 42, 0, 0, 0]
            }
          },
          api_support_flag: 2,
          api_support_info: {
            api_support_hourai: {
              api_damage: [0, 0, 11, 0, 27, 0],
              api_cl_list: [0, 0, 1, 0, 2, 0]
            }
          },
          api_opening_taisen: {
            api_at_eflag: [0], api_at_list: [1], api_at_type: [0],
            api_df_list: [[4]], api_damage: [[16]], api_cl_list: [[1]]
          },
          api_opening_atack: {
            api_frai: [-1, 0, -1, 3, -1, -1],
            api_fydam: [0, 28, 0, 19, 0, 0],
            api_fcl: [0, 2, 0, 1, 0, 0],
            api_erai: [-1, -1, -1, -1, -1, -1],
            api_eydam: [0, 0, 0, 0, 0, 0],
            api_ecl: [0, 0, 0, 0, 0, 0]
          },
          api_hougeki1: {
            api_at_eflag: [0, 1, 0, 1],
            api_at_list: [4, 0, 5, 2],
            api_at_type: [2, 0, 6, 0],
            api_df_list: [[0, 0], [4], [0, 0], [5]],
            api_damage: [[23, 31], [12], [38, 20], [9]],
            api_cl_list: [[1, 2], [1], [2, 1], [1]]
          },
          api_hougeki2: {
            api_at_eflag: [0, 1], api_at_list: [0, 1], api_at_type: [0, 0],
            api_df_list: [[1], [3]], api_damage: [[34], [18]], api_cl_list: [[1], [2]]
          },
          api_raigeki: {
            api_frai: [1, -1, 0, -1, -1, -1], api_fydam: [25, 0, 33, 0, 0, 0], api_fcl: [1, 0, 2, 0, 0, 0],
            api_erai: [-1, -1, -1, 2, -1, -1], api_eydam: [0, 0, 0, 17, 0, 0], api_ecl: [0, 0, 0, 1, 0, 0]
          }
        }
      },
      {
        path: '/kcsapi/api_req_battle_midnight/battle',
        body: {
          api_ship_ke: [1501, 1502, 1503, 1504, 1505, 1506],
          api_f_nowhps: [19, 31, 14, 45, 62, 59],
          api_f_maxhps: [31, 31, 31, 45, 62, 59],
          api_e_nowhps: [20, 37, 0, 0, 0, 0],
          api_e_maxhps: [180, 96, 88, 55, 35, 35],
          api_formation: [1, 1, 1],
          api_hougeki: {
            api_at_eflag: [0, 1, 0],
            api_at_list: [0, 0, 1],
            api_sp_list: [3, 0, 1],
            api_df_list: [[0, 0], [0], [1, 1]],
            api_damage: [[41, 53], [8], [25, 19]],
            api_cl_list: [[2, 1], [1], [1, 2]]
          }
        }
      }
    ],
    result: { api_win_rank: 'S' }
  }
})(globalThis)
