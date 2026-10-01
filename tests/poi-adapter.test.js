'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')
const core = require('../src/core')

const originalLoad = Module._load
const reactHarness = {
  effects: [],
  refs: [],
  selectedState: {},
}
Module._load = function loadWithPoiPeers(request, parent, isMain) {
  if (request === 'react') {
    return {
      Fragment: Symbol('Fragment'),
      createElement: () => null,
      useEffect: (effect) => reactHarness.effects.push(effect),
      useRef: (initial) => reactHarness.refs.shift() || { current: initial },
    }
  }
  if (request === 'react-redux') return { useSelector: () => reactHarness.selectedState }
  return originalLoad.call(this, request, parent, isMain)
}
const plugin = require('../index')
Module._load = originalLoad

const poiStore = {
  const: {
    $ships: {
      11: { api_name: '我方测试舰', api_taik: [30, 30] },
      901: { api_name: '敌方测试舰', api_taik: [50, 50] },
      1001: { api_name: '友军测试舰', api_taik: [20, 20] },
    },
    $useitems: {
      93: { api_name: '秋刀鱼' },
    },
  },
  info: {
    fleets: [{ api_id: 1, api_ship: [101, -1, -1, -1, -1, -1] }],
    ships: {
      101: {
        api_id: 101,
        api_ship_id: 11,
        api_maxhp: 30,
        api_lv: 80,
        api_slot: [501, 502, -1, -1],
        api_slot_ex: 503,
      },
    },
    equips: {
      501: { api_id: 501, api_slotitem_id: 42 },
      502: { api_id: 502, api_slotitem_id: 10 },
      503: { api_id: 503, api_slotitem_id: 43 },
    },
    useitems: {
      93: { api_id: 93, api_count: 15 },
    },
  },
  sortie: { combinedFlag: 0, sortieStatus: [true, false, false, false] },
  battle: { _status: { deckId: 0 } },
}

function response(path, body) {
  return { type: `@@Response${path}`, payload: { path, body, postBody: {}, time: 1 } }
}

test('poi reducer captures only the active battle timeline and local display roster', () => {
  const dayPath = '/kcsapi/api_req_sortie/battle'
  const nightPath = '/kcsapi/api_req_battle_midnight/battle'
  let state = plugin.reducer(undefined, response(dayPath, {
    api_deck_id: 1,
    api_ship_ke: [901],
    api_f_nowhps: [30], api_f_maxhps: [30],
    api_e_nowhps: [50], api_e_maxhps: [50],
    api_formation: [1, 1, 1],
  }), poiStore)

  assert.equal(state.packetCount, 1)
  assert.equal(state.replay.roster.playerMain[0].name, '我方测试舰')
  assert.deepEqual(state.replay.roster.playerMain[0].damageControls, [42, 43])
  assert.equal(state.replay.roster.shipNames[901], '敌方测试舰')
  assert.equal(state.replay.packets[0].path, dayPath)

  state = plugin.reducer(state, response(nightPath, {
    api_ship_ke: [901],
    api_f_nowhps: [30], api_f_maxhps: [30],
    api_e_nowhps: [50], api_e_maxhps: [50],
    api_friendly_info: {
      api_ship_id: [1001], api_ship_lv: [70], api_nowhps: [20], api_maxhps: [20],
    },
    api_hougeki: { api_at_eflag: [], api_at_list: [] },
  }), poiStore)
  assert.equal(state.packetCount, 2)
  assert.equal(state.replay.battleId, 'poi-1')
  assert.equal(state.replay.roster.shipNames[1001], '友军测试舰')

  state = plugin.reducer(state, response('/kcsapi/api_req_sortie/battleresult', { api_win_rank: 'S' }), poiStore)
  assert.equal(state.replay.result.api_win_rank, 'S')
})

test('a new day battle replaces the previous in-memory replay', () => {
  const action = response('/kcsapi/api_req_sortie/battle', {
    api_deck_id: 1,
    api_ship_ke: [901],
    api_f_nowhps: [30], api_f_maxhps: [30],
    api_e_nowhps: [50], api_e_maxhps: [50],
    api_formation: [1, 1, 1],
  })
  const first = plugin.reducer(undefined, action, poiStore)
  const withResult = plugin.reducer(first, response('/kcsapi/api_req_sortie/battleresult', {
    api_win_rank: 'S',
    api_get_ship: { api_ship_id: 999, api_ship_name: '待显示掉落舰' },
  }), poiStore)
  const second = plugin.reducer(withResult, action, poiStore)

  assert.equal(second.packetCount, 1)
  assert.equal(second.battleId, 2)
  assert.equal(second.replay.battleId, 'poi-2')
  assert.equal(second.replay.result, null)
})

test('poi captures a seasonal useitem with its post-drop inventory count', () => {
  let state = plugin.reducer(undefined, response('/kcsapi/api_req_sortie/battle', {
    api_deck_id: 1,
    api_ship_ke: [901],
    api_f_nowhps: [30], api_f_maxhps: [30],
    api_e_nowhps: [50], api_e_maxhps: [50],
  }), poiStore)
  state = plugin.reducer(state, response('/kcsapi/api_req_sortie/battleresult', {
    api_win_rank: 'S',
    api_get_useitem: { api_useitem_id: 93 },
  }), poiStore)

  assert.deepEqual(state.replay.resultMeta, {
    useitem: { id: 93, name: '秋刀鱼', count: 16 },
  })
  const resultEvents = core.buildTimeline(state.replay).events.filter((event) => event.phase === 'result')
  assert.equal(resultEvents[0].durationMs, 5000)
  assert.equal(resultEvents[1].resultDrop, '获得道具：秋刀鱼（16）')
})

test('practice battle endpoints are treated as a complete local replay', () => {
  const action = response('/kcsapi/api_req_practice/battle', {
    api_deck_id: 1,
    api_ship_ke: [901],
    api_f_nowhps: [30], api_f_maxhps: [30],
    api_e_nowhps: [50], api_e_maxhps: [50],
    api_formation: [1, 1, 1],
  })
  let state = plugin.reducer(undefined, action, poiStore)
  state = plugin.reducer(state, response('/kcsapi/api_req_practice/battle_result', { api_win_rank: 'A' }), poiStore)

  assert.equal(state.packetCount, 1)
  assert.equal(state.replay.result.api_win_rank, 'A')
})

test('map response exposes land-base air raid damage as a short local replay', () => {
  const state = plugin.reducer(undefined, response('/kcsapi/api_req_map/next', {
    api_destruction_battle: {
      api_ship_ke: [901],
      api_f_nowhps: [100, 120, 150],
      api_f_maxhps: [100, 120, 150],
      api_e_nowhps: [50],
      api_e_maxhps: [50],
      api_formation: [1, 1, 1],
      api_air_base_attack: {
        api_stage1: {
          api_disp_seiku: 3,
          api_f_lostcount: 2,
          api_e_lostcount: 1,
        },
        api_stage3: {
          api_fbak_flag: [1, 1, 1],
          api_frai_flag: [0, 0, 0],
          api_fcl_flag: [1, 1, 2],
          api_fdam: [12, 7, 30],
        },
      },
      api_lost_kind: [1, 0, 2],
    },
  }), poiStore)

  assert.equal(state.replay.source, 'poi-live-airbase-defense')
  assert.equal(state.replay.packets[0].path, core.AIR_BASE_DEFENSE_PATH)
  assert.deepEqual(state.replay.roster.playerMain.map((unit) => unit.name), [
    '第 1 基地航空队',
    '第 2 基地航空队',
    '第 3 基地航空队',
  ])
  assert.equal(state.replay.roster.shipNames[901], '敌方测试舰')
  assert.deepEqual(
    core.buildTimeline(state.replay).final.playerMain.map((unit) => unit.nowHp),
    [88, 113, 120],
  )
})

test('poi reducer carries directly available event difficulty and FCD spot into the next battle', () => {
  const sortieStore = {
    ...poiStore,
    info: {
      ...poiStore.info,
      maps: {
        621: { api_eventmap: { api_selected_rank: 4 } },
      },
    },
    fcd: {
      map: {
        '62-1': { route: { 9: ['M', 'N'] }, spots: {} },
      },
    },
    sortie: {
      ...poiStore.sortie,
      sortieMapId: '621',
      currentNode: 12,
    },
  }
  let state = plugin.reducer(undefined, response('/kcsapi/api_req_map/next', {
    api_no: 9,
  }), sortieStore)

  assert.deepEqual(state.location, { mapId: '62-1', node: 9, difficulty: '甲', spot: 'N' })
  assert.equal(state.replay, null)

  state = plugin.reducer(state, response('/kcsapi/api_req_sortie/battle', {
    api_deck_id: 1,
    api_ship_ke: [901],
    api_f_nowhps: [30], api_f_maxhps: [30],
    api_e_nowhps: [50], api_e_maxhps: [50],
  }), sortieStore)
  assert.deepEqual(state.replay.location, { mapId: '62-1', node: 9, difficulty: '甲', spot: 'N' })
  assert.equal(core.buildTimeline(state.replay).events[0].detail, '海域 62-1甲 · 节点 N')

  state = plugin.reducer(state, response('/kcsapi/api_port/port', {}), sortieStore)
  assert.equal(state.location, null)
})

test('poi inserts a separator before the final digit of compact numeric map ids', () => {
  assert.equal(plugin.__test.normalizeMapId('24'), '2-4')
  assert.equal(plugin.__test.normalizeMapId('621'), '62-1')
  assert.equal(plugin.__test.normalizeMapId('2-4'), '2-4')
  assert.equal(plugin.__test.normalizeMapId('62-1'), '62-1')
  assert.equal(plugin.__test.normalizeMapId('7'), '7')

  const compactMapStore = {
    ...poiStore,
    sortie: {
      ...poiStore.sortie,
      sortieMapId: '24',
      currentNode: 6,
    },
  }
  const state = plugin.reducer(undefined, response('/kcsapi/api_req_map/next', {}), compactMapStore)
  assert.deepEqual(state.location, { mapId: '2-4', node: 6 })
})

test('poi opens in window mode and preserves live append position through battle results', () => {
  assert.equal(plugin.windowMode, true)
  assert.deepEqual(plugin.switchPluginPath, [])
  assert.equal(plugin.__test.themeConfigPath, 'plugin.poi-plugin-local-battle-replay.theme')
  assert.deepEqual(plugin.__test.liveReplayOptions(true, true), {
    preservePosition: true,
    autoplay: true,
  })
  assert.deepEqual(plugin.__test.liveReplayOptions(false, true), {
    startAtEnd: true,
    autoplay: false,
  })
  assert.deepEqual(plugin.__test.liveReplayOptions(false, false), {
    preservePosition: true,
    autoplay: true,
  })
  assert.deepEqual(plugin.__test.liveReplayOptions(true, true, true), {
    preservePosition: true,
    autoplay: true,
  })
  assert.deepEqual(plugin.__test.liveReplayOptions(false, true, true), {
    startAtEnd: true,
    autoplay: false,
  })
  assert.deepEqual(plugin.__test.liveReplayOptions(false, false, true), {
    preservePosition: true,
    autoplay: true,
  })
})

test('poi roster marks escaped positions across main and escort fleets', () => {
  const combinedStore = {
    ...poiStore,
    const: {
      $ships: {
        ...poiStore.const.$ships,
        12: { api_name: '护卫退避舰', api_taik: [25, 25] },
      },
    },
    info: {
      ...poiStore.info,
      fleets: [
        { api_id: 1, api_ship: [101, -1, -1, -1, -1, -1] },
        { api_id: 2, api_ship: [102, -1, -1, -1, -1, -1] },
      ],
      ships: {
        ...poiStore.info.ships,
        102: { api_id: 102, api_ship_id: 12, api_maxhp: 25, api_lv: 70, api_slot: [] },
      },
    },
    sortie: {
      ...poiStore.sortie,
      combinedFlag: 1,
      escapedPos: [1],
    },
  }
  const roster = plugin.__test.captureRoster(combinedStore, { api_deck_id: 1 }, {})
  assert.equal(roster.playerMain[0].retreated, false)
  assert.equal(roster.playerEscort[0].retreated, true)
})
