'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const core = require('../src/core')

const projectRoot = path.resolve(__dirname, '..')
const compactSample = JSON.parse(fs.readFileSync(path.join(projectRoot, 'examples/sample-battle.json'), 'utf8'))

test('normalizes plain JSON, svdata text, and packet arrays', () => {
  const direct = core.normalizeReplay(compactSample)
  const prefixed = core.normalizeReplay(`svdata=${JSON.stringify(compactSample)}`)
  const packetArray = core.normalizeReplay(compactSample.packets)

  assert.equal(direct.packets.length, 1)
  assert.deepEqual(prefixed.packets, direct.packets)
  assert.equal(packetArray.packets[0].path, '/kcsapi/api_req_sortie/battle')
})

test('builds ordered phase and attack events and applies damage', () => {
  const timeline = core.buildTimeline(compactSample)
  const phases = timeline.events.map((event) => event.phase)
  const attacks = timeline.events.filter((event) => event.kind === 'attack')

  assert.deepEqual(phases, ['battleStart', 'formation', 'hougeki1', 'hougeki1', 'hougeki1', 'result'])
  assert.equal(attacks[0].attackerName, '我方一号舰')
  assert.equal(attacks[0].hits[0].targetName, '敌方旗舰')
  assert.equal(timeline.final.playerMain[1].nowHp, 23)
  assert.equal(timeline.final.enemyMain[0].nowHp, 46)
})

test('does not mutate imported battle JSON', () => {
  const input = JSON.parse(JSON.stringify(compactSample))
  const before = JSON.stringify(input)
  core.buildTimeline(input)
  assert.equal(JSON.stringify(input), before)
})

test('supports modern multi-target opening torpedoes', () => {
  const replay = {
    roster: {
      playerMain: [{ name: '雷巡甲' }],
      shipNames: { 91: '敌舰甲', 92: '敌舰乙' },
    },
    packets: [{
      path: '/kcsapi/api_req_sortie/battle',
      body: {
        api_ship_ke: [91, 92],
        api_f_nowhps: [50], api_f_maxhps: [50],
        api_e_nowhps: [40, 40], api_e_maxhps: [40, 40],
        api_formation: [1, 1, 1],
        api_opening_atack: {
          api_frai_list_items: [[0, 1]],
          api_fydam_list_items: [[15, 21]],
          api_fcl_list_items: [[1, 2]],
          api_erai_list_items: [],
          api_eydam_list_items: [],
          api_ecl_list_items: [],
        },
      },
    }],
  }
  const timeline = core.buildTimeline(replay)
  const attacks = timeline.events.filter((event) => event.kind === 'attack')

  assert.equal(attacks.length, 1)
  assert.equal(attacks[0].title, '开幕雷击')
  assert.equal(attacks[0].groupHitsBySide, true)
  assert.equal(attacks[0].hits.length, 2)
  assert.deepEqual(attacks[0].attackerIds, ['player-main-0'])
  assert.deepEqual(timeline.final.enemyMain.map((unit) => unit.nowHp), [25, 19])
  assert.equal(attacks[0].hits[1].critical, true)
  assert.equal(attacks[0].hits[1].attackerName, '雷巡甲')
  assert.ok(timeline.events.find((event) => event.phase === 'formation').id > attacks[0].id)
})

test('resolves combined-fleet positions to escort fleets', () => {
  const replay = {
    roster: {
      combinedType: 2,
      playerMain: Array.from({ length: 6 }, (_, i) => ({ name: `主力${i + 1}` })),
      playerEscort: Array.from({ length: 6 }, (_, i) => ({ name: `护卫${i + 1}` })),
      shipNames: { 101: '敌方旗舰' },
    },
    packets: [{
      path: '/kcsapi/api_req_combined_battle/battle',
      body: {
        api_ship_ke: [101],
        api_f_nowhps: [30, 30, 30, 30, 30, 30], api_f_maxhps: [30, 30, 30, 30, 30, 30],
        api_f_nowhps_combined: [25, 25, 25, 25, 25, 25], api_f_maxhps_combined: [25, 25, 25, 25, 25, 25],
        api_e_nowhps: [80], api_e_maxhps: [80],
        api_formation: [14, 1, 2],
        api_hougeki1: {
          api_at_eflag: [1], api_at_list: [0], api_at_type: [0],
          api_df_list: [[7]], api_damage: [[9]], api_cl_list: [[1]],
        },
      },
    }],
  }
  const timeline = core.buildTimeline(replay)

  assert.equal(timeline.events.find((event) => event.kind === 'attack').hits[0].targetName, '护卫2')
  assert.equal(timeline.final.playerEscort[1].nowHp, 16)
})

test('orders combined-fleet shelling and torpedo phases by fleet type and enemy composition', () => {
  assert.deepEqual(core.dayShellOrder(0, false), ['hougeki1', 'hougeki2', 'hougeki3', 'raigeki'])
  assert.deepEqual(core.dayShellOrder(1, false), ['hougeki1', 'raigeki', 'hougeki2', 'hougeki3'])
  assert.deepEqual(core.dayShellOrder(2, false), ['hougeki1', 'hougeki2', 'hougeki3', 'raigeki'])
  assert.deepEqual(core.dayShellOrder(3, false), ['hougeki1', 'raigeki', 'hougeki2', 'hougeki3'])
  assert.deepEqual(core.dayShellOrder(0, true), ['hougeki1', 'raigeki', 'hougeki2', 'hougeki3'])
  assert.deepEqual(core.dayShellOrder(1, true), ['hougeki1', 'hougeki2', 'raigeki', 'hougeki3'])
  assert.deepEqual(core.dayShellOrder(2, true), ['hougeki1', 'hougeki2', 'hougeki3', 'raigeki'])
  assert.deepEqual(core.dayShellOrder(3, true), ['hougeki1', 'hougeki2', 'raigeki', 'hougeki3'])
})

test('adapts KC3 sortie replay data and appends night battle', () => {
  const kc3 = {
    combined: 0,
    fleet1: [{ mst_id: 1, name: '甲舰', level: 70 }],
    shipNames: { 501: '敌舰' },
    battles: [{
      data: {
        api_ship_ke: [501], api_f_nowhps: [30], api_f_maxhps: [30],
        api_e_nowhps: [50], api_e_maxhps: [50], api_formation: [1, 1, 1],
      },
      yasen: {
        api_ship_ke: [501], api_f_nowhps: [30], api_f_maxhps: [30],
        api_e_nowhps: [50], api_e_maxhps: [50],
        api_hougeki: {
          api_at_eflag: [0], api_at_list: [0], api_sp_list: [1],
          api_df_list: [[0]], api_damage: [[50]], api_cl_list: [[2]],
        },
      },
    }],
  }
  const timeline = core.buildTimeline(kc3)

  assert.equal(timeline.replay.source, 'kc3-replay')
  assert.equal(timeline.replay.packets.length, 2)
  assert.equal(timeline.events.at(-1).phase, 'hougeki')
  assert.equal(timeline.events.at(-1).title, '夜战连击')
  assert.equal(timeline.final.enemyMain[0].nowHp, 0)
})

test('keeps daytime and nighttime attack type labels separate', () => {
  const replay = {
    roster: {
      playerMain: [{ name: '我方舰' }],
      shipNames: { 901: '敌方舰' },
    },
    packets: [{
      path: '/kcsapi/api_req_sortie/battle',
      body: {
        api_ship_ke: [901],
        api_f_nowhps: [30], api_f_maxhps: [30],
        api_e_nowhps: [100], api_e_maxhps: [100],
        api_formation: [1, 1, 1],
        api_hougeki1: {
          api_at_eflag: [0], api_at_list: [0], api_at_type: [100],
          api_df_list: [[0]], api_damage: [[10]], api_cl_list: [[1]],
        },
      },
    }, {
      path: '/kcsapi/api_req_battle_midnight/battle',
      body: {
        api_ship_ke: [901],
        api_f_nowhps: [30], api_f_maxhps: [30],
        api_e_nowhps: [90], api_e_maxhps: [100],
        api_hougeki: {
          api_at_eflag: [0], api_at_list: [0], api_sp_list: [1],
          api_df_list: [[0, 0]], api_damage: [[10, 10]], api_cl_list: [[1, 1]],
        },
      },
    }],
  }

  const attacks = core.buildTimeline(replay).events.filter((event) => event.kind === 'attack')
  assert.equal(attacks[0].title, 'Nelson Touch')
  assert.equal(attacks[1].title, '夜战连击')
  const nightPhase = core.buildTimeline(replay).events.find((event) =>
    event.phase === 'hougeki' && event.kind === 'phase')
  assert.equal(nightPhase.durationMs, 3200)
})

test('maps combined-fleet night Kongou special attacks to escort attackers', () => {
  const replay = {
    roster: {
      combinedType: 1,
      playerMain: Array.from({ length: 6 }, (_, index) => ({ name: `主力${index + 1}` })),
      playerEscort: [{ name: '护卫旗舰' }, { name: '护卫二号舰' }],
      shipNames: { 901: '敌方旗舰' },
    },
    packets: [{
      path: '/kcsapi/api_req_combined_battle/battle',
      body: {
        api_ship_ke: [901],
        api_f_nowhps: [30, 30, 30, 30, 30, 30],
        api_f_maxhps: [30, 30, 30, 30, 30, 30],
        api_f_nowhps_combined: [35, 35],
        api_f_maxhps_combined: [35, 35],
        api_e_nowhps: [100], api_e_maxhps: [100],
      },
    }, {
      path: '/kcsapi/api_req_combined_battle/midnight_battle',
      body: {
        api_ship_ke: [901],
        api_f_nowhps: [30, 30, 30, 30, 30, 30],
        api_f_maxhps: [30, 30, 30, 30, 30, 30],
        api_f_nowhps_combined: [35, 35],
        api_f_maxhps_combined: [35, 35],
        api_e_nowhps: [100], api_e_maxhps: [100],
        api_hougeki: {
          api_at_eflag: [0],
          api_at_list: [0],
          api_sp_list: [104],
          api_df_list: [[0, 0]],
          api_damage: [[12, 13]],
          api_cl_list: [[1, 1]],
        },
      },
    }],
  }

  const attack = core.buildTimeline(replay).events.find((event) =>
    event.phase === 'hougeki' && event.kind === 'attack')
  assert.equal(attack.title, '金刚级特殊攻击')
  assert.equal(attack.attackerName, '护卫旗舰')
  assert.deepEqual(attack.attackerIds, ['player-escort-0', 'player-escort-1'])
  assert.deepEqual(attack.hits.map((hit) => hit.attackerName), ['护卫旗舰', '护卫二号舰'])
})

test('parses night-to-day friendly fleet and night support only once', () => {
  const replay = {
    roster: {
      playerMain: [{ name: '我方舰' }],
      shipNames: { 901: '敌方舰', 1001: '友军舰' },
    },
    packets: [{
      path: '/kcsapi/api_req_sortie/night_to_day',
      body: {
        api_ship_ke: [901],
        api_f_nowhps: [30], api_f_maxhps: [30],
        api_e_nowhps: [100], api_e_maxhps: [100],
        api_friendly_info: {
          api_ship_id: [1001], api_ship_lv: [77], api_nowhps: [20], api_maxhps: [20],
        },
        api_friendly_battle: {
          api_hougeki: {
            api_at_eflag: [0], api_at_list: [0],
            api_df_list: [[0]], api_damage: [[5]], api_cl_list: [[1]],
          },
        },
        api_n_support_flag: 2,
        api_n_support_info: {
          api_support_hourai: { api_damage: [3], api_cl_list: [1] },
        },
        api_n_hougeki1: {
          api_at_eflag: [0], api_at_list: [0],
          api_df_list: [[0]], api_damage: [[7]], api_cl_list: [[1]],
        },
      },
    }],
  }

  const timeline = core.buildTimeline(replay)
  const attacks = timeline.events.filter((event) => event.kind === 'attack')
  const friendlyAttack = attacks.find((event) => event.phase === 'friendly')

  assert.deepEqual(attacks.map((event) => event.phase), ['friendly', 'nSupport', 'nHougeki1'])
  assert.deepEqual(attacks.map((event) => event.hits[0].damage), [5, 3, 7])
  assert.equal(friendlyAttack.attackerName, '友军舰')
  assert.equal(friendlyAttack.snapshot.friendMain[0].level, 77)
  assert.equal(timeline.final.enemyMain[0].nowHp, 85)
})

test('friendly ships fall back to master ID only when no name is available', () => {
  const replay = {
    roster: { playerMain: [{ name: '我方舰' }], shipNames: { 901: '敌方舰' } },
    packets: [{
      path: '/kcsapi/api_req_battle_midnight/battle',
      body: {
        api_ship_ke: [901],
        api_f_nowhps: [30], api_f_maxhps: [30],
        api_e_nowhps: [40], api_e_maxhps: [40],
        api_friendly_info: {
          api_ship_id: [1002], api_ship_lv: [65], api_nowhps: [18], api_maxhps: [18],
        },
        api_friendly_battle: {
          api_hougeki: {
            api_at_eflag: [0], api_at_list: [0],
            api_df_list: [[0]], api_damage: [[3]], api_cl_list: [[1]],
          },
        },
      },
    }],
  }

  const friendlyAttack = core.buildTimeline(replay).events.find((event) =>
    event.phase === 'friendly' && event.kind === 'attack')
  assert.equal(friendlyAttack.attackerName, 'ID 1002')
  assert.doesNotMatch(friendlyAttack.attackerName, /主力|护卫/)
})

test('keeps zero-based closing-torpedo indices when the first ship has no target', () => {
  const replay = {
    roster: {
      playerMain: ['高波改二', '五十鈴改二', '木曾改二', '冬月改', '潮改二', '岸波改'],
      shipNames: { 1779: '軽母ヌ級改', 1764: '軽母ヌ級', 1955: '重巡ネ級改 夏mode', 1592: '軽巡ツ級', 1621: '駆逐イ級後期型' },
    },
    packets: [{
      path: '/kcsapi/api_req_sortie/battle',
      body: {
        api_ship_ke: [1779, 1764, 1955, 1592, 1621, 1621],
        api_f_nowhps: [19, 39, 33, 38, 33, 32],
        api_f_maxhps: [33, 44, 51, 38, 33, 32],
        api_e_nowhps: [118, 84, 390, 66, 39, 39],
        api_e_maxhps: [118, 84, 390, 66, 39, 39],
        api_formation: [1, 1, 1],
        api_hougeki1: {
          api_at_eflag: [0, 1, 0, 1, 0, 0, 1, 0, 0],
          api_at_list: [4, 3, 2, 2, 1, 3, 5, 0, 5],
          api_at_type: [0, 0, 0, 0, 0, 0, 0, 0, 0],
          api_df_list: [[4], [1], [2], [4], [0], [0], [3], [2], [2]],
          api_cl_list: [[1], [1], [1], [1], [1], [2], [1], [1], [1]],
          api_damage: [[67], [2], [31], [21], [10], [40], [3], [36.1], [30]],
        },
        api_raigeki: {
          api_frai: [5, 5, 3, 2, -1, 2, -1],
          api_fcl: [1, 1, 2, 1, 0, 1, 0],
          api_fydam: [93, 84, 126, 23, 0, 12, 0],
          api_erai: [-1, -1, 3, 1, -1, 2, -1],
          api_ecl: [0, 0, 1, 1, 0, 0, 0],
          api_eydam: [0, 0, 21, 21, 0, 0, 0],
        },
      },
    }],
  }

  const timeline = core.buildTimeline(replay)
  assert.deepEqual(timeline.final.playerMain.map((unit) => unit.nowHp), [19, 16, 33, 14, 12, 32])
  const torpedo = timeline.events.find((event) => event.phase === 'raigeki' && event.kind === 'attack')
  const enemyTorpedoes = torpedo.hits.filter((hit) =>
    hit.attackerSide === 'enemy' && Math.floor(hit.damage) > 0)
  assert.deepEqual(enemyTorpedoes.map((hit) => hit.targetName), ['冬月改', '五十鈴改二'])
  assert.equal(torpedo.title, '闭幕雷击')
  assert.equal(torpedo.groupHitsBySide, true)
})

test('still accepts padded one-based torpedo arrays from older replay data', () => {
  const replay = {
    roster: {
      playerMain: ['一号舰', '二号舰'],
      shipNames: { 901: '敌方一号', 902: '敌方二号' },
    },
    packets: [{
      path: '/kcsapi/api_req_sortie/battle',
      body: {
        api_ship_ke: [901, 902],
        api_f_nowhps: [30, 30], api_f_maxhps: [30, 30],
        api_e_nowhps: [40, 40], api_e_maxhps: [40, 40],
        api_formation: [1, 1, 1],
        api_raigeki: {
          api_frai: [-1, 2, -1],
          api_fcl: [-1, 1, 0],
          api_fydam: [-1, 9, 0],
          api_erai: [-1, 2, -1],
          api_ecl: [-1, 1, 0],
          api_eydam: [-1, 5, 0],
          api_fdam: [-1, 0, 5],
          api_edam: [-1, 0, 9],
        },
      },
    }],
  }

  const timeline = core.buildTimeline(replay)
  assert.deepEqual(timeline.final.playerMain.map((unit) => unit.nowHp), [30, 25])
  assert.deepEqual(timeline.final.enemyMain.map((unit) => unit.nowHp), [40, 31])
})

test('omits an empty closing-torpedo phase when no ship has a valid target', () => {
  const replay = {
    roster: {
      playerMain: ['一号舰', '二号舰'],
      shipNames: { 901: '敌方一号', 902: '敌方二号' },
    },
    packets: [{
      path: '/kcsapi/api_req_sortie/battle',
      body: {
        api_ship_ke: [901, 902],
        api_f_nowhps: [30, 30], api_f_maxhps: [30, 30],
        api_e_nowhps: [40, 40], api_e_maxhps: [40, 40],
        api_formation: [1, 1, 1],
        api_raigeki: {
          api_frai: [-1, -1],
          api_fcl: [0, 0],
          api_fydam: [0, 0],
          api_erai: [-1, -1],
          api_ecl: [0, 0],
          api_eydam: [0, 0],
          api_fdam: [0, 0],
          api_edam: [0, 0],
        },
      },
    }],
  }

  const timeline = core.buildTimeline(replay)
  assert.equal(timeline.events.some((event) => event.phase === 'raigeki'), false)
})

test('adds a standalone smoke phase only when smoke activates', () => {
  for (const smokeType of [1, 2, 3]) {
    const replay = {
      roster: { playerMain: ['我方舰'], shipNames: { 901: '敌方舰' } },
      packets: [{
        path: '/kcsapi/api_req_sortie/battle',
        body: {
          api_ship_ke: [901],
          api_f_nowhps: [30], api_f_maxhps: [30],
          api_e_nowhps: [40], api_e_maxhps: [40],
          api_formation: [1, 1, 1],
          api_smoke_type: smokeType,
        },
      }],
    }

    const timeline = core.buildTimeline(replay)
    assert.deepEqual(timeline.events.map((event) => event.phase), ['battleStart', 'smoke', 'formation'])
    assert.equal(timeline.events[1].title, `烟幕 ${smokeType} 层`)
    assert.equal(timeline.events[1].detail, '')
  }
})

test('shows recon before formation and identifies the friendly anti-air cut-in ship', () => {
  const replay = {
    roster: {
      playerMain: ['一号舰', '二号舰', '三号舰', '冬月改'],
      shipNames: { 901: '敌方舰' },
    },
    packets: [{
      path: '/kcsapi/api_req_sortie/battle',
      body: {
        api_ship_ke: [901],
        api_f_nowhps: [30, 30, 30, 38], api_f_maxhps: [30, 30, 30, 38],
        api_e_nowhps: [40], api_e_maxhps: [40],
        api_search: [5, 1],
        api_formation: [1, 1, 1],
        api_kouku: {
          api_plane_from: [[1], null],
          api_stage1: {
            api_disp_seiku: 4,
            api_f_lostcount: 0,
            api_e_lostcount: 2,
          },
          api_stage2: {
            api_air_fire: {
              api_idx: 3,
              api_kind: 1,
              api_use_items: [122, 122, 278],
            },
          },
          api_stage3: null,
        },
      },
    }],
  }

  const timeline = core.buildTimeline(replay)
  assert.deepEqual(timeline.events.map((event) => event.phase), [
    'battleStart',
    'searchStart',
    'searchResult',
    'kouku',
    'kouku',
    'kouku',
    'formation',
  ])
  assert.equal(timeline.events[1].title, '索敌开始')
  assert.equal(timeline.events[1].durationMs, 3500)
  assert.equal(timeline.events[2].title, '索敌结果')
  assert.equal(timeline.events[2].durationMs, 3500)
  assert.match(timeline.events[2].detail, /我方：索敌成功（未使用侦察机）/)
  assert.match(timeline.events[2].detail, /敌方：索敌成功/)
  const airPages = timeline.events.filter((event) => event.phase === 'kouku' && event.kind === 'phase')
  assert.deepEqual(airPages.map((event) => event.durationMs), [3500, 3500])
  assert.match(airPages[1].detail, /制空权丧失/)
  assert.equal(timeline.events.at(-1).durationMs, 3000)
  const cutin = timeline.events.find((event) => event.kind === 'cutin')
  assert.equal(cutin.attackerName, '冬月改')
  assert.equal(cutin.attackerId, 'player-main-3')
  assert.equal(cutin.durationMs, 3000)
  assert.ok(cutin.id > airPages[0].id)
  assert.ok(cutin.id < airPages[1].id)
  assert.match(cutin.detail, /^冬月改 · /)
  assert.match(cutin.detail, /类型 1/)
  assert.match(cutin.detail, /122、122、278/)
})

test('keeps the requested daytime phase order around aviation, opening attacks, and formation', () => {
  const air = {
    api_plane_from: [[1], null],
    api_stage1: {
      api_disp_seiku: 2,
      api_f_lostcount: 0,
      api_e_lostcount: 0,
    },
    api_stage3: null,
  }
  const replay = {
    roster: { playerMain: ['我方舰'], shipNames: { 901: '敌方舰' } },
    packets: [{
      path: '/kcsapi/api_req_sortie/battle',
      body: {
        api_ship_ke: [901],
        api_f_nowhps: [30], api_f_maxhps: [30],
        api_e_nowhps: [50], api_e_maxhps: [50],
        api_search: [1, 1],
        api_formation: [1, 1, 1],
        api_smoke_type: 3,
        api_air_base_injection: air,
        api_injection_kouku: air,
        api_air_base_attack: [{ ...air, api_base_id: 2 }],
        api_kouku: air,
        api_support_flag: 2,
        api_support_info: {
          api_support_hourai: { api_damage: [1], api_cl_list: [1] },
        },
        api_opening_taisen: {
          api_at_eflag: [0], api_at_list: [0], api_at_type: [0],
          api_df_list: [[0]], api_damage: [[1]], api_cl_list: [[1]],
        },
        api_opening_atack: {
          api_frai_list_items: [[0]],
          api_fydam_list_items: [[1]],
          api_fcl_list_items: [[1]],
          api_erai_list_items: [],
          api_eydam_list_items: [],
          api_ecl_list_items: [],
        },
        api_hougeki1: {
          api_at_eflag: [0], api_at_list: [0], api_at_type: [0],
          api_df_list: [[0]], api_damage: [[1]], api_cl_list: [[1]],
        },
        api_hougeki2: {
          api_at_eflag: [1], api_at_list: [0], api_at_type: [0],
          api_df_list: [[0]], api_damage: [[1]], api_cl_list: [[1]],
        },
        api_raigeki: {
          api_frai: [0], api_fcl: [1], api_fydam: [1],
          api_erai: [-1], api_ecl: [0], api_eydam: [0],
          api_fdam: [0], api_edam: [1],
        },
      },
    }],
  }

  const events = core.buildTimeline(replay).events
  const first = (phase) => events.findIndex((event) => event.phase === phase)
  assert.ok(first('searchResult') < first('smoke'))
  assert.ok(first('smoke') < first('airBaseInjection'))
  assert.ok(first('airBaseInjection') < first('injectionKouku'))
  assert.ok(first('injectionKouku') < first('airBaseAttack'))
  assert.ok(first('airBaseAttack') < first('kouku'))
  assert.ok(first('kouku') < first('support'))
  assert.ok(first('support') < first('openingTaisen'))
  assert.ok(first('openingTaisen') < first('openingAtack'))
  assert.ok(first('openingAtack') < first('formation'))
  assert.ok(first('formation') < first('hougeki1'))
  assert.ok(first('hougeki1') < first('hougeki2'))
  assert.ok(first('hougeki2') < first('raigeki'))
  ;['openingTaisen', 'openingAtack', 'hougeki1', 'hougeki2', 'raigeki'].forEach((phase) => {
    const prompt = events.find((event) => event.phase === phase && event.kind === 'phase')
    assert.equal(prompt.durationMs, 1800, `${phase} prompt duration`)
    const attacks = events.filter((event) => event.phase === phase && event.kind === 'attack')
    assert.ok(attacks.length > 0, `${phase} has an attack frame`)
    attacks.forEach((event) => assert.equal(event.durationMs, 0, `${phase} attack uses default timing`))
  })
})

test('omits an aviation phase when its response contains no direct activity', () => {
  const replay = {
    roster: { playerMain: ['我方舰'], shipNames: { 901: '敌方舰' } },
    packets: [{
      path: '/kcsapi/api_req_sortie/battle',
      body: {
        api_ship_ke: [901],
        api_f_nowhps: [30], api_f_maxhps: [30],
        api_e_nowhps: [40], api_e_maxhps: [40],
        api_formation: [1, 1, 1],
        api_kouku: {
          api_plane_from: [null, null],
          api_stage1: {
            api_f_count: 0,
            api_e_count: 0,
            api_f_lostcount: 0,
            api_e_lostcount: 0,
            api_disp_seiku: 0,
            api_touch_plane: [-1, -1],
          },
          api_stage2: null,
          api_stage3: null,
        },
      },
    }],
  }

  const timeline = core.buildTimeline(replay)
  assert.equal(timeline.events.some((event) => event.phase === 'kouku'), false)
  assert.deepEqual(timeline.events.map((event) => event.phase), ['battleStart', 'formation'])
})

test('jet assault skips the air-result overlay and proceeds to its attack frame', () => {
  const replay = {
    roster: { playerMain: ['我方舰'], shipNames: { 901: '敌方舰' } },
    packets: [{
      path: '/kcsapi/api_req_sortie/battle',
      body: {
        api_ship_ke: [901],
        api_f_nowhps: [30], api_f_maxhps: [30],
        api_e_nowhps: [40], api_e_maxhps: [40],
        api_injection_kouku: {
          api_plane_from: [[1], null],
          api_stage1: {
            api_disp_seiku: 2,
            api_f_lostcount: 1,
            api_e_lostcount: 2,
          },
          api_stage3: {
            api_erai_flag: [1],
            api_ebak_flag: [0],
            api_ecl_flag: [1],
            api_edam: [8],
          },
        },
      },
    }],
  }

  const jetEvents = core.buildTimeline(replay).events.filter((event) => event.phase === 'injectionKouku')
  assert.deepEqual(jetEvents.map((event) => [event.kind, event.title]), [
    ['phase', '喷式强袭开始'],
    ['attack', '喷式航空攻击'],
  ])
  assert.equal(jetEvents.some((event) => /制空结果/.test(event.title)), false)
  assert.equal(jetEvents[1].hits[0].targetName, '敌方舰')
})

test('shows only the directly supplied land-base team id and never invents a wave number', () => {
  const replay = {
    roster: { playerMain: ['我方舰'], shipNames: { 901: '敌方舰' } },
    packets: [{
      path: '/kcsapi/api_req_sortie/battle',
      body: {
        api_ship_ke: [901],
        api_f_nowhps: [30], api_f_maxhps: [30],
        api_e_nowhps: [40], api_e_maxhps: [40],
        api_air_base_attack: [{
          api_base_id: 3,
          api_stage1: {
            api_disp_seiku: 1,
            api_f_lostcount: 2,
            api_e_lostcount: 4,
          },
          api_stage3: {
            api_erai_flag: [1],
            api_ebak_flag: [0],
            api_ecl_flag: [1],
            api_edam: [8],
          },
        }],
      },
    }],
  }

  const events = core.buildTimeline(replay).events
  const baseEvents = events.filter((event) => event.phase === 'airBaseAttack')
  assert.deepEqual(baseEvents.map((event) => event.title), [
    '第 3 基地航空队制空结果',
    '第 3 基地航空队航空攻击',
  ])
  assert.doesNotMatch(baseEvents.map((event) => event.title).join(' '), /第\s*[一二两12]\s*波/)
  assert.match(baseEvents[0].detail, /制空权确保/)
})

test('battle start shows only location fields already attached to the replay', () => {
  const replay = {
    location: { mapId: '7-5', node: 12 },
    roster: { playerMain: ['我方舰'], shipNames: { 901: '敌方舰' } },
    packets: [{
      path: '/kcsapi/api_req_sortie/battle',
      body: {
        api_ship_ke: [901],
        api_f_nowhps: [30], api_f_maxhps: [30],
        api_e_nowhps: [40], api_e_maxhps: [40],
      },
    }],
  }

  const timeline = core.buildTimeline(replay)
  assert.equal(timeline.events[0].title, '战斗开始')
  assert.equal(timeline.events[0].detail, '海域 7-5 · 节点编号 12')
  assert.equal(timeline.events[0].durationMs, 3200)
  assert.deepEqual(timeline.replay.location, { mapId: '7-5', node: 12 })
})

test('battle start appends directly captured event difficulty and mapped spot', () => {
  const replay = {
    location: { mapId: '62-1', difficulty: '甲', node: 14, spot: 'N' },
    roster: { playerMain: ['我方舰'], shipNames: { 901: '敌方舰' } },
    packets: [{
      path: '/kcsapi/api_req_sortie/battle',
      body: {
        api_ship_ke: [901],
        api_f_nowhps: [30], api_f_maxhps: [30],
        api_e_nowhps: [40], api_e_maxhps: [40],
      },
    }],
  }

  const timeline = core.buildTimeline(replay)
  assert.equal(timeline.events[0].detail, '海域 62-1甲 · 节点 N')
  assert.deepEqual(timeline.replay.location, replay.location)
})

test('renders land-base air raid damage as a standalone local battle', () => {
  const replay = {
    roster: {
      playerMain: [
        { name: '第 1 基地航空队', maxHp: 100 },
        { name: '第 2 基地航空队', maxHp: 120 },
      ],
      shipNames: { 901: '敌空袭舰' },
    },
    packets: [{
      path: core.AIR_BASE_DEFENSE_PATH,
      body: {
        api_ship_ke: [901],
        api_f_nowhps: [100, 120], api_f_maxhps: [100, 120],
        api_e_nowhps: [50], api_e_maxhps: [50],
        api_formation: [1, 1, 1],
        api_air_base_attack: {
          api_stage1: {
            api_disp_seiku: 3,
            api_f_lostcount: 4,
            api_e_lostcount: 1,
          },
          api_stage3: {
            api_fbak_flag: [1, 1],
            api_frai_flag: [0, 0],
            api_fcl_flag: [1, 2],
            api_fdam: [10, 25],
          },
        },
        api_lost_kind: [1, 2],
      },
    }],
  }

  const timeline = core.buildTimeline(replay)
  const attack = timeline.events.find((event) => event.kind === 'attack')
  assert.equal(core.isBattlePath(core.AIR_BASE_DEFENSE_PATH), true)
  assert.equal(timeline.events.length, 1)
  assert.equal(attack.title, '基地航空队空袭伤害')
  assert.equal(attack.attackerSide, 'enemy')
  assert.deepEqual(attack.hits.map((hit) => hit.targetName), [
    '第 1 基地航空队',
    '第 2 基地航空队',
  ])
  assert.deepEqual(timeline.final.playerMain.map((unit) => unit.nowHp), [90, 95])
  assert.match(attack.detail, /我方 单纵阵/)
  assert.match(attack.detail, /同航战/)
  assert.match(attack.detail, /航空劣势/)
  assert.match(attack.detail, /1 \/ 2/)
  assert.deepEqual(attack.detailLines, [
    '我方 单纵阵 · 敌方 单纵阵 · 同航战 · 航空劣势',
    '航空损失 我方 4 / 敌方 1 · 基地损害 状态代码 1 / 2',
  ])
  assert.equal(attack.hideHitDetails, true)
})

test('combines friendly and enemy aviation damage into side-labelled hit groups', () => {
  const replay = {
    roster: { playerMain: ['我方舰'], shipNames: { 901: '敌方舰' } },
    packets: [{
      path: '/kcsapi/api_req_sortie/battle',
      body: {
        api_ship_ke: [901],
        api_f_nowhps: [30], api_f_maxhps: [30],
        api_e_nowhps: [40], api_e_maxhps: [40],
        api_kouku: {
          api_plane_from: [[1], [1]],
          api_stage1: {
            api_disp_seiku: 0,
            api_f_count: 10,
            api_e_count: 10,
            api_f_lostcount: 1,
            api_e_lostcount: 2,
          },
          api_stage3: {
            api_frai_flag: [1],
            api_fbak_flag: [0],
            api_fcl_flag: [1],
            api_fdam: [6],
            api_erai_flag: [1],
            api_ebak_flag: [0],
            api_ecl_flag: [2],
            api_edam: [5],
          },
        },
      },
    }],
  }

  const timeline = core.buildTimeline(replay)
  const aviation = timeline.events.find((event) => event.kind === 'attack')
  assert.equal(aviation.title, '航空战')
  assert.equal(aviation.groupHitsBySide, true)
  assert.deepEqual(aviation.hits.map((hit) => hit.attackerSide), ['player', 'enemy'])
  assert.deepEqual(timeline.final.playerMain.map((unit) => unit.nowHp), [24])
  assert.deepEqual(timeline.final.enemyMain.map((unit) => unit.nowHp), [35])
})

test('shows MVP first and reveals a dropped ship five seconds later', () => {
  const replay = JSON.parse(JSON.stringify(compactSample))
  replay.result = {
    api_win_rank: 'S',
    api_mvp: 2,
    api_get_ship: { api_ship_id: 999, api_ship_name: '掉落测试舰' },
  }

  const resultEvents = core.buildTimeline(replay).events.filter((event) => event.phase === 'result')
  assert.equal(resultEvents.length, 2)
  assert.equal(resultEvents[0].title, '战果报告')
  assert.equal(resultEvents[0].detail, '胜负判定 S · MVP 我方二号舰')
  assert.equal(resultEvents[0].durationMs, 5000)
  assert.equal(resultEvents[0].resultDrop, '')
  assert.equal(resultEvents[1].detail, resultEvents[0].detail)
  assert.equal(resultEvents[1].resultDrop, '获得舰船：掉落测试舰')
})

test('reveals a dropped ship and seasonal useitem together after five seconds', () => {
  const replay = JSON.parse(JSON.stringify(compactSample))
  replay.result = {
    api_win_rank: 'S',
    api_mvp: 2,
    api_get_ship: { api_ship_id: 999, api_ship_name: '掉落测试舰' },
    api_get_useitem: { api_useitem_id: 93, api_useitem_name: '秋刀鱼' },
  }
  replay.resultMeta = { useitem: { id: 93, name: '秋刀鱼', count: 16 } }

  const resultEvents = core.buildTimeline(replay).events.filter((event) => event.phase === 'result')
  assert.equal(resultEvents.length, 2)
  assert.equal(resultEvents[0].durationMs, 5000)
  assert.equal(
    resultEvents[1].resultDrop,
    '获得舰船：掉落测试舰 · 获得道具：秋刀鱼（16）',
  )
})

test('reveals an imported useitem without guessing an unavailable inventory count', () => {
  const replay = JSON.parse(JSON.stringify(compactSample))
  replay.result = {
    api_win_rank: 'S',
    api_get_useitem: { api_useitem_id: 93, api_useitem_name: '秋刀鱼' },
  }

  const resultEvents = core.buildTimeline(replay).events.filter((event) => event.phase === 'result')
  assert.equal(resultEvents.length, 2)
  assert.equal(resultEvents[0].durationMs, 5000)
  assert.equal(resultEvents[1].resultDrop, '获得道具：秋刀鱼')
})

test('labels main and escort MVPs separately for a combined fleet', () => {
  const replay = JSON.parse(JSON.stringify(compactSample))
  replay.roster.playerEscort = [
    { name: '护卫一号舰', maxHp: 30 },
    { name: '护卫二号舰', maxHp: 28 },
  ]
  replay.packets[0].body.api_f_nowhps_combined = [30, 28]
  replay.packets[0].body.api_f_maxhps_combined = [30, 28]
  replay.result = { api_win_rank: 'A', api_mvp: 1, api_mvp_combined: 2 }

  const resultEvent = core.buildTimeline(replay).events.find((event) => event.phase === 'result')
  assert.equal(resultEvent.detail, '胜负判定 A · 主力 MVP 我方一号舰 · 护卫 MVP 护卫二号舰')
})

test('preserves explicit retreat state instead of treating negative HP as sinking', () => {
  const replay = {
    roster: {
      playerMain: [
        { name: '旗舰', maxHp: 40 },
        { name: '退避测试舰', maxHp: 30, retreated: true, damageControls: [43] },
      ],
      shipNames: { 901: '敌方舰' },
    },
    packets: [{
      path: '/kcsapi/api_req_sortie/battle',
      body: {
        api_ship_ke: [901],
        api_f_nowhps: [40, -1], api_f_maxhps: [40, 30],
        api_e_nowhps: [40], api_e_maxhps: [40],
        api_formation: [1, 1, 1],
      },
    }],
  }

  const timeline = core.buildTimeline(replay)
  assert.equal(timeline.initial.playerMain[0].retreated, false)
  assert.equal(timeline.initial.playerMain[1].retreated, true)
  assert.equal(timeline.initial.playerMain[1].nowHp, -1)
  assert.equal(timeline.events.some((event) => event.kind === 'recovery'), false)
})

test('shows damage-control personnel and goddess recovery as explicit events', () => {
  const replay = {
    roster: {
      playerMain: [{ name: '损管测试舰', maxHp: 30, damageControls: [42, 43] }],
      shipNames: { 901: '敌方舰' },
    },
    packets: [{
      path: '/kcsapi/api_req_sortie/battle',
      body: {
        api_ship_ke: [901],
        api_f_nowhps: [10], api_f_maxhps: [30],
        api_e_nowhps: [40], api_e_maxhps: [40],
        api_formation: [1, 1, 1],
        api_hougeki1: {
          api_at_eflag: [1, 1], api_at_list: [0, 0],
          api_df_list: [[0], [0]], api_damage: [[20], [8]], api_cl_list: [[1], [1]],
        },
      },
    }],
  }

  const timeline = core.buildTimeline(replay)
  const recoveries = timeline.events.filter((event) => event.kind === 'recovery')
  assert.deepEqual(recoveries.map((event) => event.title), ['应急修理要员发动', '应急修理女神发动'])
  assert.deepEqual(recoveries.map((event) => event.recoveredHp), [6, 30])
  assert.deepEqual(recoveries.map((event) => event.durationMs), [3000, 3000])
  assert.equal(timeline.final.playerMain[0].nowHp, 30)
  assert.deepEqual(timeline.final.playerMain[0].usedDamageControls, [42, 43])
})

test('does not activate damage control during practice battles', () => {
  const replay = {
    roster: {
      playerMain: [{ name: '演习舰', maxHp: 30, damageControls: [43] }],
      shipNames: { 901: '演习敌舰' },
    },
    packets: [{
      path: '/kcsapi/api_req_practice/battle',
      body: {
        api_ship_ke: [901],
        api_f_nowhps: [10], api_f_maxhps: [30],
        api_e_nowhps: [40], api_e_maxhps: [40],
        api_formation: [1, 1, 1],
        api_hougeki1: {
          api_at_eflag: [1], api_at_list: [0],
          api_df_list: [[0]], api_damage: [[20]], api_cl_list: [[1]],
        },
      },
    }],
  }

  const timeline = core.buildTimeline(replay)
  assert.equal(timeline.events.some((event) => event.kind === 'recovery'), false)
  assert.equal(timeline.final.playerMain[0].nowHp, 0)
})
