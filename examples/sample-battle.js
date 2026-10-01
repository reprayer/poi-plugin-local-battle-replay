(function defineSample(scope) {
  'use strict'

  scope.KC_REPLAY_SAMPLE = {
    version: 1,
    source: 'poooi-lib-battle-fixture',
    battleId: 'sample-poi-1584729348536',
    location: {
      mapId: '47-1',
      spot: 'T',
      node: 29
    },
    roster: {
      combinedType: 2,
      playerMain: [
        { name: 'Nelson改', mstId: 576, maxHp: 98, level: 136 },
        { name: '赤城改二戊', mstId: 599, maxHp: 89, level: 118 },
        { name: '伊勢改二', mstId: 553, maxHp: 86, level: 126 },
        { name: '利根改二', mstId: 188, maxHp: 66, level: 128 },
        { name: '日向改二', mstId: 554, maxHp: 86, level: 132 },
        { name: 'Atlanta改', mstId: 696, maxHp: 41, level: 94 }
      ],
      playerEscort: [
        { name: '秋津洲改', mstId: 450, maxHp: 36, level: 84 },
        { name: '沖波改', mstId: 359, maxHp: 32, level: 60 },
        { name: '朝霜改二', mstId: 578, maxHp: 33, level: 83 },
        { name: '巻雲改二', mstId: 563, maxHp: 33, level: 82 },
        { name: '北上改二', mstId: 119, maxHp: 49, level: 138 },
        { name: '夕張改二特', mstId: 623, maxHp: 41, level: 97 }
      ],
      shipNames: {
        119: '北上改二', 188: '利根改二', 324: '早霜改', 359: '沖波改',
        373: '藤波改', 450: '秋津洲改', 553: '伊勢改二', 554: '日向改二',
        563: '巻雲改二', 576: 'Nelson改', 578: '朝霜改二', 599: '赤城改二戊',
        623: '夕張改二特', 680: '浜波改', 695: '秋霜改', 696: 'Atlanta改',
        1501: '駆逐イ級', 1541: '戦艦タ級', 1555: '軽巡ヘ級', 1591: '軽巡ツ級',
        1594: '重巡ネ級', 1739: '駆逐ナ級', 1777: '軽母ヌ級', 1906: '空母棲姫改'
      }
    },
    packets: [
      {
        path: '/kcsapi/api_req_combined_battle/each_battle_water',
        body: {
          api_deck_id: 1,
          api_formation: [12, 14, 2],
          api_f_nowhps: [98, 74, 60, 66, 78, 36],
          api_f_maxhps: [98, 89, 86, 66, 86, 41],
          api_f_nowhps_combined: [36, 32, 32, 27, 32, 41],
          api_f_maxhps_combined: [36, 32, 33, 33, 49, 41],
          api_ship_ke: [1906, 1777, 1777, 1541, 1594, 1594],
          api_ship_lv: [1, 1, 1, 1, 1, 1],
          api_ship_ke_combined: [1555, 1591, 1739, 1501, 1501, 1501],
          api_ship_lv_combined: [1, 1, 1, 1, 1, 1],
          api_e_nowhps: [500, 70, 70, 84, 80, 80],
          api_e_maxhps: [500, 70, 70, 84, 80, 80],
          api_e_nowhps_combined: [57, 48, 60, 20, 20, 20],
          api_e_maxhps_combined: [57, 48, 60, 20, 20, 20],
          api_midnight_flag: 1,
          api_search: [1, 1],
          api_air_base_attack: [
            {
              api_base_id: 1,
              api_stage1: {
                api_f_count: 72, api_f_lostcount: 19,
                api_e_count: 347, api_e_lostcount: 44,
                api_disp_seiku: 3, api_touch_plane: [-1, 583]
              },
              api_stage2: {
                api_f_count: 42, api_f_lostcount: 0,
                api_e_count: 0, api_e_lostcount: 0
              },
              api_stage3: {
                api_erai_flag: [0, 0, 0, 0, 0, 0],
                api_ebak_flag: [0, 0, 0, 0, 0, 0],
                api_ecl_flag: [0, 0, 0, 0, 0, 0],
                api_edam: [0, 0, 0, 0, 0, 0]
              },
              api_stage3_combined: {
                api_erai_flag: [0, 1, 1, 0, 0, 1],
                api_ebak_flag: [0, 0, 0, 0, 0, 0],
                api_ecl_flag: [0, 0, 1, 0, 0, 0],
                api_edam: [0, 139, 256, 0, 0, 161]
              }
            },
            {
              api_base_id: 1,
              api_stage1: {
                api_f_count: 72, api_f_lostcount: 16,
                api_e_count: 300, api_e_lostcount: 50,
                api_disp_seiku: 3, api_touch_plane: [-1, 583]
              },
              api_stage2: {
                api_f_count: 44, api_f_lostcount: 4,
                api_e_count: 0, api_e_lostcount: 0
              },
              api_stage3: {
                api_erai_flag: [0, 0, 0, 0, 0, 1],
                api_ebak_flag: [0, 0, 0, 0, 0, 0],
                api_ecl_flag: [0, 0, 0, 0, 0, 0],
                api_edam: [0, 0, 0, 0, 0, 55]
              },
              api_stage3_combined: {
                api_erai_flag: [1, 0, 0, 0, 1, 0],
                api_ebak_flag: [0, 0, 0, 0, 0, 0],
                api_ecl_flag: [0, 0, 0, 0, 0, 0],
                api_edam: [148, 0, 0, 0, 176, 0]
              }
            }
          ],
          api_kouku: {
            api_plane_from: [[2, 3, 5, 7], [1, 2, 3]],
            api_stage1: {
              api_f_count: 86, api_f_lostcount: 13,
              api_e_count: 240, api_e_lostcount: 53,
              api_disp_seiku: 0, api_touch_plane: [-1, -1]
            },
            api_stage2: {
              api_f_count: 18, api_f_lostcount: 0,
              api_e_count: 122, api_e_lostcount: 91,
              api_air_fire: { api_idx: 5, api_kind: 39, api_use_items: [363, 362] }
            },
            api_stage3: {
              api_frai_flag: [0, 0, 0, 0, 0, 0],
              api_erai_flag: [0, 0, 0, 0, 0, 1],
              api_fbak_flag: [0, 0, 1, 0, 0, 0],
              api_ebak_flag: [0, 0, 0, 0, 1, 0],
              api_fcl_flag: [0, 0, 0, 0, 0, 0],
              api_ecl_flag: [0, 0, 0, 0, 0, 0],
              api_fdam: [0, 0, 6, 0, 0, 0],
              api_edam: [0, 0, 0, 0, 5, 0]
            },
            api_stage3_combined: {
              api_frai_flag: [0, 1, 0, 0, 0, 0],
              api_erai_flag: [0, 0, 0, 0, 0, 0],
              api_fbak_flag: [0, 0, 0, 0, 0, 0],
              api_ebak_flag: [0, 0, 0, 0, 0, 0],
              api_fcl_flag: [0, 0, 0, 0, 0, 0],
              api_ecl_flag: [0, 0, 0, 0, 0, 0],
              api_fdam: [0, 7, 0, 0, 0, 0],
              api_edam: [0, 0, 0, 0, 0, 0]
            }
          },
          api_opening_atack: {
            api_frai: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 2, 0],
            api_fcl: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2],
            api_fdam: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            api_fydam: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 83, 63],
            api_erai: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            api_ecl: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            api_edam: [63, 0, 83, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            api_eydam: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
          },
          api_hougeki1: {
            api_at_eflag: [0, 1, 0, 1, 0, 1, 0, 1, 0],
            api_at_list: [4, 0, 0, 3, 2, 1, 3, 4, 5],
            api_at_type: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            api_df_list: [[5], [4], [3], [3], [0], [1], [1], [3], [3]],
            api_si_list: [[9], [-1], [300], [508], [9], [-1], [50], [505], [362]],
            api_cl_list: [[1], [0], [1], [0], [2], [1], [1], [0], [1]],
            api_damage: [[45], [0], [59], [0], [22], [57], [44.1], [0], [10]]
          },
          api_hougeki2: {
            api_at_eflag: [0, 1, 0, 1, 0, 0, 0],
            api_at_list: [0, 0, 2, 3, 3, 4, 5],
            api_at_type: [100, 0, 0, 0, 0, 0, 0],
            api_df_list: [[4, 1, 0], [2], [9], [7], [0], [3], [0]],
            api_si_list: [[-1], [-1], [9], [512], [50], [9], [362]],
            api_cl_list: [[1, 1, 2], [1], [1], [0], [1], [1], [1]],
            api_damage: [[199, 178, 159], [40], [34], [0], [19], [35], [18]]
          },
          api_raigeki: {
            api_frai: [-1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0],
            api_fcl: [0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 1, 0],
            api_fdam: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            api_fydam: [0, 0, 0, 0, 0, 0, 0, 14, 19, 24, 15, 0],
            api_erai: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
            api_ecl: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            api_edam: [72, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            api_eydam: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
          }
        }
      },
      {
        path: '/kcsapi/api_req_combined_battle/ec_midnight_battle',
        body: {
          api_deck_id: 1,
          api_formation: [12, 14, 2],
          api_f_nowhps: [98, 17, 14, 66, 78, 36],
          api_f_maxhps: [98, 89, 86, 66, 86, 41],
          api_f_nowhps_combined: [36, 25, 32, 27, 32, 41],
          api_f_maxhps_combined: [36, 32, 33, 33, 49, 41],
          api_ship_ke: [1906, 1777, 1777, 1541, 1594, 1594],
          api_ship_lv: [1, 1, 1, 1, 1, 1],
          api_ship_ke_combined: [1555, 1591, 1739, 1501, 1501, 1501],
          api_ship_lv_combined: [1, 1, 1, 1, 1, 1],
          api_e_nowhps: [147, 0, 0, 0, 0, 0],
          api_e_maxhps: [500, 70, 70, 84, 80, 80],
          api_e_nowhps_combined: [0, 0, 0, 0, 0, 0],
          api_e_maxhps_combined: [57, 48, 60, 20, 20, 20],
          api_friendly_info: {
            api_production_type: 2,
            api_ship_id: [695, 324, 373, 680],
            api_ship_lv: [72, 73, 73, 71],
            api_nowhps: [29, 31, 29, 30],
            api_maxhps: [32, 32, 32, 32]
          },
          api_friendly_battle: {
            api_flare_pos: [0, -1],
            api_hougeki: {
              api_at_eflag: [0, 0, 0, 0],
              api_at_list: [0, 1, 2, 3],
              api_n_mother_list: [0, 0, 0, 0],
              api_df_list: [[0, 0], [0], [0], [0, 0]],
              api_si_list: [[366, 267], [267], [15], [15, 286]],
              api_cl_list: [[1, 1], [1], [1], [1, 1]],
              api_sp_list: [1, 0, 0, 3],
              api_damage: [[41, 88], [1], [1], [8, 4]]
            }
          },
          api_active_deck: [2, 1],
          api_touch_plane: [-1, -1],
          api_flare_pos: [-1, -1],
          api_hougeki: {
            api_at_eflag: [0, 0],
            api_at_list: [6, 7],
            api_n_mother_list: [0, 0],
            api_df_list: [[0], [0, 0]],
            api_si_list: [[-1], ['91', '91']],
            api_cl_list: [[0], [2, 2]],
            api_sp_list: [0, 1],
            api_damage: [[0], [61, 114]]
          }
        }
      }
    ],
    result: {
      api_win_rank: 'S',
      api_mvp: 1,
      api_mvp_combined: 2,
      api_quest_name: '期間限定海域:マニラ沖',
      api_quest_level: 13,
      api_first_clear: 0,
      api_get_ship: {
        api_ship_id: 424,
        api_ship_type: '駆逐艦',
        api_ship_name: '高波'
      }
    }
  }
})(globalThis)
