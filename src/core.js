(function initCore(root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  if (root) root.KCReplayCore = api
})(typeof globalThis !== 'undefined' ? globalThis : this, function coreFactory() {
  'use strict'

  const PHASE_LABELS = Object.freeze({
    battleStart: '战斗开始',
    searchStart: '索敌',
    searchResult: '索敌',
    formation: '阵形与交战形态',
    smoke: '烟幕展开',
    airBaseDefense: '基地航空队空袭',
    airBaseInjection: '基地喷式强袭',
    injectionKouku: '喷式强袭',
    airBaseAttack: '基地航空队',
    friendlyKouku: '友军航空支援',
    kouku: '航空战',
    kouku2: '第二次航空战',
    support: '支援舰队',
    openingTaisen: '先制对潜',
    openingAtack: '开幕雷击',
    hougeki1: '第一轮炮击',
    hougeki2: '第二轮炮击',
    hougeki3: '第三轮炮击',
    raigeki: '闭幕雷击',
    friendly: '友军舰队',
    nSupport: '夜战支援',
    nHougeki1: '夜战第一轮',
    nHougeki2: '夜战第二轮',
    hougeki: '夜战',
    damageControl: '应急修理',
    result: '战果报告',
  })

  const FORMATIONS = Object.freeze({
    1: '单纵阵', 2: '复纵阵', 3: '轮形阵', 4: '梯形阵', 5: '单横阵',
    6: '警戒阵', 11: '第一警戒航行序列', 12: '第二警戒航行序列',
    13: '第三警戒航行序列', 14: '第四警戒航行序列',
  })
  const ENGAGEMENTS = Object.freeze({ 1: '同航战', 2: '反航战', 3: 'T字有利', 4: 'T字不利' })
  const SEARCH_RESULTS = Object.freeze({
    1: '索敌成功',
    2: '索敌成功（侦察机未归还）',
    3: '索敌失败（侦察机未归还）',
    4: '索敌失败',
    5: '索敌成功（未使用侦察机）',
    6: '索敌失败（未使用侦察机）',
  })
  const AIR_STATES = Object.freeze({ 0: '航空均势', 1: '制空权确保', 2: '航空优势', 3: '航空劣势', 4: '制空权丧失' })
  const SPECIAL_ATTACK_TYPES = Object.freeze({
    100: 'Nelson Touch', 101: '长门特殊攻击',
    102: '陆奥特殊攻击', 103: 'Colorado 特殊攻击', 104: '金刚级特殊攻击',
    105: 'Richelieu 特殊攻击', 106: 'Queen Elizabeth 特殊攻击',
    200: '夜间瑞云攻击', 201: '夜间瑞云攻击', 300: '潜水舰特殊攻击',
    301: '潜水舰特殊攻击', 302: '潜水舰特殊攻击', 400: '大和特殊攻击',
    401: '大和特殊攻击', 1000: '夜间鱼雷攻击',
  })
  const DAY_ATTACK_TYPES = Object.freeze({
    0: '通常攻击', 1: 'レーザー/全体攻击', 2: '连击', 3: '主炮·副炮着弹观测',
    4: '主炮·电探着弹观测', 5: '主炮·彻甲弹着弹观测', 6: '主炮连击',
    7: '空母战爆联合',
    ...SPECIAL_ATTACK_TYPES,
  })
  const NIGHT_ATTACK_TYPES = Object.freeze({
    0: '夜战通常攻击',
    1: '夜战连击',
    2: '夜战主炮 CI',
    3: '夜战主炮·副炮 CI',
    4: '夜战主炮·鱼雷 CI',
    5: '夜战鱼雷 CI',
    6: '夜间航空 CI',
    ...SPECIAL_ATTACK_TYPES,
  })

  const DAY_PATHS = new Set([
    '/kcsapi/api_req_sortie/battle',
    '/kcsapi/api_req_sortie/airbattle',
    '/kcsapi/api_req_sortie/ld_airbattle',
    '/kcsapi/api_req_sortie/ld_shooting',
    '/kcsapi/api_req_sortie/night_to_day',
    '/kcsapi/api_req_combined_battle/battle',
    '/kcsapi/api_req_combined_battle/airbattle',
    '/kcsapi/api_req_combined_battle/battle_water',
    '/kcsapi/api_req_combined_battle/ld_airbattle',
    '/kcsapi/api_req_combined_battle/ld_shooting',
    '/kcsapi/api_req_combined_battle/ec_battle',
    '/kcsapi/api_req_combined_battle/each_battle',
    '/kcsapi/api_req_combined_battle/each_airbattle',
    '/kcsapi/api_req_combined_battle/each_battle_water',
    '/kcsapi/api_req_combined_battle/each_ld_airbattle',
    '/kcsapi/api_req_combined_battle/each_ld_shooting',
    '/kcsapi/api_req_combined_battle/ec_night_to_day',
    '/kcsapi/api_req_practice/battle',
  ])
  const NIGHT_START_PATHS = new Set([
    '/kcsapi/api_req_battle_midnight/sp_midnight',
    '/kcsapi/api_req_combined_battle/sp_midnight',
    '/kcsapi/api_req_combined_battle/each_sp_midnight',
  ])
  const NIGHT_CONTINUE_PATHS = new Set([
    '/kcsapi/api_req_battle_midnight/battle',
    '/kcsapi/api_req_combined_battle/midnight_battle',
    '/kcsapi/api_req_combined_battle/ec_midnight_battle',
    '/kcsapi/api_req_practice/midnight_battle',
  ])
  const AIR_BASE_DEFENSE_PATH = '/local/airbase-defense'
  const BATTLE_PATHS = new Set([...DAY_PATHS, ...NIGHT_START_PATHS, ...NIGHT_CONTINUE_PATHS, AIR_BASE_DEFENSE_PATH])
  const NIGHT_PHASES = new Set(['friendly', 'nSupport', 'nHougeki1', 'nHougeki2', 'hougeki'])
  const SHORT_COMBAT_PHASES = new Set(['openingTaisen', 'openingAtack', 'hougeki1', 'hougeki2', 'raigeki'])
  const EVENT_DURATIONS = Object.freeze({
    battleStart: 3200,
    formation: 3000,
    search: 3500,
    aviation: 3500,
    antiAirCutIn: 3000,
    damageControl: 3000,
    nightPhase: 3200,
    shortCombatPhase: 1800,
  })

  const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
  const toArray = (value) => (Array.isArray(value) ? value : [])
  const numberOr = (value, fallback = 0) => {
    const result = Number(value)
    return Number.isFinite(result) ? result : fallback
  }
  const floorDamage = (value) => Math.max(0, Math.floor(numberOr(value)))
  const cloneJson = (value) => JSON.parse(JSON.stringify(value))

  function cleanJsonText(text) {
    const trimmed = String(text).trim()
    return trimmed.startsWith('svdata=') ? trimmed.slice(7) : trimmed
  }

  function parseInput(input) {
    if (typeof input === 'string') return JSON.parse(cleanJsonText(input))
    return input
  }

  function unwrapBody(value) {
    if (!isObject(value)) return value
    if (isObject(value.api_data)) return value.api_data
    if (isObject(value.body) && isObject(value.body.api_data)) return value.body.api_data
    if (isObject(value.body)) return value.body
    return value
  }

  function inferPath(body, night = false) {
    const apiName = String(body.api_name || '')
    if (night || body.api_hougeki || body.api_n_hougeki1) {
      return apiName.includes('sp_midnight')
        ? '/kcsapi/api_req_battle_midnight/sp_midnight'
        : '/kcsapi/api_req_battle_midnight/battle'
    }
    if (apiName.includes('night_to_day')) return '/kcsapi/api_req_sortie/night_to_day'
    if (apiName.includes('airbattle')) return '/kcsapi/api_req_sortie/airbattle'
    return '/kcsapi/api_req_sortie/battle'
  }

  function normalizeRosterEntry(entry, fallbackMstId) {
    if (typeof entry === 'string') return { name: entry, mstId: numberOr(fallbackMstId, -1) }
    if (!isObject(entry)) return { name: '', mstId: numberOr(fallbackMstId, -1) }
    return {
      name: String(entry.name || entry.api_name || entry.shipName || ''),
      mstId: numberOr(entry.mstId ?? entry.mst_id ?? entry.api_ship_id ?? fallbackMstId, -1),
      maxHp: numberOr(entry.maxHp ?? entry.api_maxhp, 0),
      level: numberOr(entry.level ?? entry.api_lv, 0),
      retreated: Boolean(entry.retreated),
      damageControls: toArray(entry.damageControls)
        .map((itemId) => numberOr(itemId, -1))
        .filter((itemId) => itemId === 42 || itemId === 43),
    }
  }

  function rosterFromKc3(data) {
    return {
      playerMain: toArray(data.fleet1).map((entry) => normalizeRosterEntry(entry, entry && entry.mst_id)),
      playerEscort: toArray(data.fleet2).map((entry) => normalizeRosterEntry(entry, entry && entry.mst_id)),
      combinedType: numberOr(data.combined, 0),
      shipNames: isObject(data.shipNames) ? data.shipNames : {},
    }
  }

  function packetsFromKc3(data) {
    const battles = toArray(data.battles).length ? data.battles : data.battle ? [data.battle] : []
    const packets = []
    battles.forEach((battle) => {
      if (!isObject(battle)) return
      const day = unwrapBody(battle.data)
      if (isObject(day) && Object.keys(day).length) packets.push({ path: inferPath(day, false), body: day })
      const night = unwrapBody(battle.yasen)
      if (isObject(night) && Object.keys(night).length) packets.push({ path: inferPath(night, true), body: night })
    })
    return packets
  }

  function normalizePacket(packet, index) {
    const body = unwrapBody(packet)
    if (!isObject(body)) throw new TypeError(`第 ${index + 1} 个数据包没有有效 body/api_data`)
    const path = isObject(packet) && typeof packet.path === 'string'
      ? packet.path
      : inferPath(body, Boolean(body.api_hougeki && !body.api_hougeki1))
    return { path, body: cloneJson(body) }
  }

  function normalizeReplay(rawInput) {
    const input = parseInput(rawInput)
    if (!isObject(input) && !Array.isArray(input)) throw new TypeError('回放数据必须是 JSON 对象或数据包数组')

    let packets = []
    let roster = isObject(input.roster) ? cloneJson(input.roster) : {}
    let result = isObject(input.result) ? cloneJson(input.result) : null
    const resultMeta = isObject(input.resultMeta) ? cloneJson(input.resultMeta) : {}
    const location = isObject(input.location) ? cloneJson(input.location) : {}
    let battleId = String(input.battleId || '')

    if (Array.isArray(input)) {
      packets = input
    } else if (Array.isArray(input.packets)) {
      packets = input.packets
    } else if (Array.isArray(input.battles) || input.battle) {
      packets = packetsFromKc3(input)
      roster = { ...rosterFromKc3(input), ...roster }
    } else {
      packets = [input]
    }

    const normalizedPackets = packets.map(normalizePacket)
    if (!normalizedPackets.length) throw new TypeError('没有找到战斗数据包')
    if (!battleId) battleId = `local-${normalizedPackets.length}-${JSON.stringify(normalizedPackets[0].body).length}`

    return {
      version: numberOr(input.version, 1),
      source: String(input.source || (input.battles || input.battle ? 'kc3-replay' : 'local-json')),
      battleId,
      packets: normalizedPackets,
      roster,
      result,
      resultMeta,
      location,
    }
  }

  function stripPadding(values) {
    const array = toArray(values).slice()
    if (array[0] === -1 || array[0] === null) array.shift()
    return array
  }

  function extractFleetArrays(body) {
    let fNow = stripPadding(body.api_f_nowhps)
    let fMax = stripPadding(body.api_f_maxhps)
    let eNow = stripPadding(body.api_e_nowhps)
    let eMax = stripPadding(body.api_e_maxhps)

    if ((!fNow.length || !eNow.length) && Array.isArray(body.api_nowhps)) {
      const allNow = stripPadding(body.api_nowhps)
      const allMax = stripPadding(body.api_maxhps)
      const enemyCount = Math.max(toArray(body.api_ship_ke).length, 6)
      const friendCount = Math.max(0, allNow.length - enemyCount)
      fNow = allNow.slice(0, friendCount)
      fMax = allMax.slice(0, friendCount)
      eNow = allNow.slice(friendCount)
      eMax = allMax.slice(friendCount)
    }

    let fEscortNow = stripPadding(body.api_f_nowhps_combined)
    let fEscortMax = stripPadding(body.api_f_maxhps_combined)
    let eEscortNow = stripPadding(body.api_e_nowhps_combined)
    let eEscortMax = stripPadding(body.api_e_maxhps_combined)
    if (!fEscortNow.length && Array.isArray(body.api_nowhps_combined)) {
      const combinedNow = stripPadding(body.api_nowhps_combined)
      const combinedMax = stripPadding(body.api_maxhps_combined)
      if (combinedNow.length > 6 && toArray(body.api_ship_ke_combined).length) {
        fEscortNow = combinedNow.slice(0, combinedNow.length - 6)
        fEscortMax = combinedMax.slice(0, combinedMax.length - 6)
        eEscortNow = combinedNow.slice(-6)
        eEscortMax = combinedMax.slice(-6)
      } else {
        fEscortNow = combinedNow
        fEscortMax = combinedMax
      }
    }
    return { fNow, fMax, eNow, eMax, fEscortNow, fEscortMax, eEscortNow, eEscortMax }
  }

  function displayName(side, group, index, mstId, rosterEntry, names) {
    if (rosterEntry && rosterEntry.name) return rosterEntry.name
    const masterName = names[String(mstId)] || names[mstId]
    if (masterName) return String(masterName)
    if (side === 'friend') return mstId > 0 ? `ID ${mstId}` : 'ID 未知'
    const prefix = side === 'player' ? '我方' : side === 'friend' ? '友军' : '敌方'
    const groupText = group === 'escort' ? '护卫' : '主力'
    return `${prefix}${groupText} ${index + 1}${mstId > 0 ? ` · ID ${mstId}` : ''}`
  }

  function createUnit(side, group, index, mstId, nowHp, maxHp, rosterEntry, names) {
    const fallbackMax = rosterEntry && rosterEntry.maxHp ? rosterEntry.maxHp : numberOr(maxHp, 1)
    return {
      id: `${side}-${group}-${index}`,
      side,
      group,
      index,
      mstId: numberOr(mstId, rosterEntry ? rosterEntry.mstId : -1),
      name: displayName(side, group, index, numberOr(mstId, -1), rosterEntry, names),
      nowHp: numberOr(nowHp, fallbackMax),
      maxHp: Math.max(1, fallbackMax),
      level: rosterEntry ? numberOr(rosterEntry.level, 0) : 0,
      retreated: Boolean(rosterEntry && rosterEntry.retreated),
      damageControls: rosterEntry ? toArray(rosterEntry.damageControls).slice() : [],
      usedDamageControls: [],
    }
  }

  function createBattleState(body, roster, maxPlayerMain = Number.POSITIVE_INFINITY) {
    const arrays = extractFleetArrays(body)
    const names = isObject(roster.shipNames) ? roster.shipNames : {}
    const playerMainRoster = toArray(roster.playerMain).map((e) => normalizeRosterEntry(e))
    const playerEscortRoster = toArray(roster.playerEscort).map((e) => normalizeRosterEntry(e))
    const enemyMainIds = stripPadding(body.api_ship_ke)
    const enemyEscortIds = stripPadding(body.api_ship_ke_combined)
    const friendInfo = isObject(body.api_friendly_info) ? body.api_friendly_info : null

    const countFor = (...arraysToCheck) => Math.max(0, ...arraysToCheck.map((a) => toArray(a).length))
    const makeGroup = (side, group, count, ids, now, max, entries) => Array.from({ length: count }, (_, i) =>
      createUnit(side, group, i, ids[i], now[i], max[i], entries[i], names))

    const groups = {
      playerMain: makeGroup('player', 'main', Math.min(maxPlayerMain, countFor(arrays.fNow, playerMainRoster)), playerMainRoster.map((e) => e.mstId), arrays.fNow, arrays.fMax, playerMainRoster),
      playerEscort: makeGroup('player', 'escort', countFor(arrays.fEscortNow, playerEscortRoster), playerEscortRoster.map((e) => e.mstId), arrays.fEscortNow, arrays.fEscortMax, playerEscortRoster),
      enemyMain: makeGroup('enemy', 'main', countFor(arrays.eNow, enemyMainIds), enemyMainIds, arrays.eNow, arrays.eMax, []),
      enemyEscort: makeGroup('enemy', 'escort', countFor(arrays.eEscortNow, enemyEscortIds), enemyEscortIds, arrays.eEscortNow, arrays.eEscortMax, []),
      friendMain: [],
    }
    if (friendInfo) {
      const ids = stripPadding(friendInfo.api_ship_id)
      const levels = stripPadding(friendInfo.api_ship_lv)
      const now = stripPadding(friendInfo.api_nowhps)
      const max = stripPadding(friendInfo.api_maxhps)
      const count = countFor(ids, levels, now, max)
      const entries = Array.from({ length: count }, (_, index) => ({
        mstId: ids[index],
        maxHp: max[index],
        level: levels[index],
      }))
      groups.friendMain = makeGroup('friend', 'main', count, ids, now, max, entries)
    }
    return groups
  }

  function mergeMissingUnits(groups, body, roster) {
    const incoming = createBattleState(body, roster)
    Object.keys(groups).forEach((key) => {
      if (!groups[key].length && incoming[key].length) groups[key] = incoming[key]
    })
  }

  function cloneGroups(groups) {
    const result = {}
    Object.keys(groups).forEach((key) => {
      result[key] = groups[key].map((unit) => ({
        ...unit,
        damageControls: toArray(unit.damageControls).slice(),
        usedDamageControls: toArray(unit.usedDamageControls).slice(),
      }))
    })
    return result
  }

  function unitById(groups, id) {
    for (const key of Object.keys(groups)) {
      const found = groups[key].find((unit) => unit.id === id)
      if (found) return found
    }
    return null
  }

  function resolveUnit(groups, side, position, legacyOneBased = false) {
    let pos = numberOr(position, -1)
    if (legacyOneBased) pos -= 1
    if (pos < 0) return null
    const main = side === 'player' ? groups.playerMain : side === 'enemy' ? groups.enemyMain : groups.friendMain
    const escort = side === 'player' ? groups.playerEscort : side === 'enemy' ? groups.enemyEscort : []
    if (pos < main.length) return main[pos] || null
    if (escort.length && pos >= 6) return escort[pos - 6] || null
    return main[pos] || null
  }

  function syncHp(groups, body) {
    const arrays = extractFleetArrays(body)
    const pairs = [
      ['playerMain', arrays.fNow], ['playerEscort', arrays.fEscortNow],
      ['enemyMain', arrays.eNow], ['enemyEscort', arrays.eEscortNow],
    ]
    pairs.forEach(([key, values]) => {
      toArray(values).forEach((hp, index) => {
        if (groups[key][index] && Number.isFinite(Number(hp))) groups[key][index].nowHp = Number(hp)
      })
    })
  }

  function dayShellOrder(playerCombined, enemyCombined) {
    const combinedType = numberOr(playerCombined, 0)
    const hasEnemyEscort = Boolean(enemyCombined)
    const carrierOrTransport = combinedType === 1 || combinedType === 3
    if (carrierOrTransport && hasEnemyEscort) {
      return ['hougeki1', 'hougeki2', 'raigeki', 'hougeki3']
    }
    if (carrierOrTransport || (!combinedType && hasEnemyEscort)) {
      return ['hougeki1', 'raigeki', 'hougeki2', 'hougeki3']
    }
    return ['hougeki1', 'hougeki2', 'hougeki3', 'raigeki']
  }

  function buildTimeline(rawReplay) {
    const replay = normalizeReplay(rawReplay)
    const firstBody = replay.packets[0].body
    const maxPlayerMain = replay.packets[0].path === AIR_BASE_DEFENSE_PATH
      ? 3
      : Number.POSITIVE_INFINITY
    const groups = createBattleState(firstBody, replay.roster, maxPlayerMain)
    const events = []
    let phase = 'battleStart'
    let damageControlEnabled = true

    function addEvent(data, eventOptions = {}) {
      const hits = toArray(data.hits).filter((hit) => hit && hit.targetId)
      const attackerIds = [...new Set(
        toArray(data.attackerIds)
          .concat(data.attackerId || [])
          .concat(hits.map((hit) => hit.attackerId))
          .filter(Boolean),
      )]
      hits.forEach((hit) => {
        const target = unitById(groups, hit.targetId)
        if (target) target.nowHp = Math.max(0, target.nowHp - floorDamage(hit.damage))
      })
      const event = {
        id: events.length,
        phase,
        phaseLabel: PHASE_LABELS[phase] || phase,
        kind: data.kind || 'info',
        title: String(data.title || PHASE_LABELS[phase] || phase),
        detail: String(data.detail || ''),
        attackerId: data.attackerId || null,
        attackerIds,
        attackerName: String(data.attackerName || ''),
        attackerSide: data.attackerSide || null,
        recoveryId: data.recoveryId || null,
        recoveryName: String(data.recoveryName || ''),
        recoveredHp: numberOr(data.recoveredHp, 0),
        durationMs: Math.max(0, numberOr(data.durationMs, 0)),
        detailLines: toArray(data.detailLines).map((line) => String(line)),
        groupHitsBySide: Boolean(data.groupHitsBySide),
        hideHitDetails: Boolean(data.hideHitDetails),
        resultDrop: String(data.resultDrop || ''),
        hits,
        snapshot: cloneGroups(groups),
      }
      events.push(event)
      if (!eventOptions.skipDamageControl && data.kind === 'attack') activateDamageControls()
      return event
    }

    function activateDamageControls() {
      if (!damageControlEnabled) return
      ;['playerMain', 'playerEscort'].forEach((key) => {
        groups[key].forEach((unit) => {
          if (unit.retreated || unit.nowHp > 0 || !unit.damageControls.length) return
          const itemId = unit.damageControls.shift()
          const recoveredHp = itemId === 43
            ? unit.maxHp
            : Math.max(1, Math.floor(unit.maxHp * 0.2))
          unit.nowHp = recoveredHp
          unit.usedDamageControls.push(itemId)
          const previousPhase = phase
          phase = 'damageControl'
          addEvent({
            kind: 'recovery',
            title: itemId === 43 ? '应急修理女神发动' : '应急修理要员发动',
            detail: `${unit.name} 恢复至 HP ${recoveredHp} / ${unit.maxHp}`,
            recoveryId: unit.id,
            recoveryName: unit.name,
            recoveredHp,
            durationMs: EVENT_DURATIONS.damageControl,
          }, { skipDamageControl: true })
          phase = previousPhase
        })
      })
    }

    function beginPhase(key, detail = '', durationMs = 0, title = '') {
      phase = key
      addEvent({ kind: 'phase', title: title || PHASE_LABELS[key] || key, detail, durationMs })
    }

    function attackEvent(attacker, hits, title, detail, attackerSide) {
      if (!hits.length) return
      addEvent({
        kind: 'attack',
        title,
        detail,
        attackerId: attacker ? attacker.id : null,
        attackerName: attacker ? attacker.name : title,
        attackerSide: attacker ? attacker.side : attackerSide,
        hits,
      })
    }

    function formationDetail(body) {
      if (!Array.isArray(body.api_formation)) return ''
      const [ours, enemy, engagement] = body.api_formation
      return `我方 ${FORMATIONS[ours] || ours || '未知'} · 敌方 ${FORMATIONS[enemy] || enemy || '未知'} · ${ENGAGEMENTS[engagement] || engagement || '交战形态未知'}`
    }

    function formation(body) {
      const detail = formationDetail(body)
      if (!detail) return
      phase = 'formation'
      addEvent({
        kind: 'phase',
        title: PHASE_LABELS.formation,
        detail,
        durationMs: EVENT_DURATIONS.formation,
      })
    }

    function battleStart() {
      const location = isObject(replay.location) ? replay.location : {}
      const mapId = String(location.mapId || '').trim()
      const difficulty = String(location.difficulty || '').trim()
      const spot = String(location.spot || '').trim()
      const node = numberOr(location.node, -1)
      const detail = [
        mapId ? `海域 ${mapId}${difficulty}` : '',
        spot ? `节点 ${spot}` : node >= 0 ? `节点编号 ${node}` : '',
      ].filter(Boolean).join(' · ')
      beginPhase('battleStart', detail, EVENT_DURATIONS.battleStart)
    }

    function search(body) {
      if (!Array.isArray(body.api_search)) return
      const ours = numberOr(body.api_search[0], 0)
      const enemy = numberOr(body.api_search[1], 0)
      const describe = (value) => SEARCH_RESULTS[value] || (value ? `未知结果 ${value}` : '无索敌数据')
      beginPhase('searchStart', '', EVENT_DURATIONS.search, '索敌开始')
      beginPhase('searchResult', `我方：${describe(ours)} · 敌方：${describe(enemy)}`, EVENT_DURATIONS.search, '索敌结果')
    }

    function smoke(body) {
      const smokeType = numberOr(body.api_smoke_type, 0)
      if (smokeType <= 0) return
      beginPhase('smoke', '', 0, `烟幕 ${smokeType} 层`)
    }

    function airHits(stage, targetSide, combined = false, attackerSide = targetSide === 'player' ? 'enemy' : 'player') {
      if (!isObject(stage)) return []
      const damages = targetSide === 'player' ? stage.api_fdam : stage.api_edam
      const torpedoFlags = targetSide === 'player' ? stage.api_frai_flag : stage.api_erai_flag
      const bombFlags = targetSide === 'player' ? stage.api_fbak_flag : stage.api_ebak_flag
      const crits = targetSide === 'player' ? stage.api_fcl_flag : stage.api_ecl_flag
      const list = toArray(damages)
      const padded = list[0] === -1
      return list.flatMap((damage, rawIndex) => {
        const index = padded ? rawIndex - 1 : rawIndex
        if (index < 0) return []
        const hitFlag = numberOr(toArray(torpedoFlags)[rawIndex]) || numberOr(toArray(bombFlags)[rawIndex])
        if (!hitFlag && floorDamage(damage) <= 0) return []
        const position = combined ? index + 6 : index
        const target = resolveUnit(groups, targetSide, position)
        if (!target) return []
        return [{
          targetId: target.id,
          targetName: target.name,
          damage,
          critical: numberOr(toArray(crits)[rawIndex]) === 2,
          attackerSide,
        }]
      })
    }

    function hasAirActivity(kouku) {
      if (!isObject(kouku)) return false
      const hasPositive = (values) => toArray(values).some((value) => numberOr(value, 0) > 0)
      const hasPlaneSource = toArray(kouku.api_plane_from).some((source) =>
        toArray(source).some((position) => numberOr(position, -1) >= 0))
      const hasSquadron = toArray(kouku.api_squadron_plane).some((squadron) =>
        isObject(squadron) && numberOr(squadron.api_count, 0) > 0)
      const stages = [
        kouku.api_stage1,
        kouku.api_stage2,
        kouku.api_stage3,
        kouku.api_stage3_combined,
      ].filter(isObject)
      const hasCountOrLoss = stages.some((stage) =>
        ['api_f_count', 'api_e_count', 'api_f_lostcount', 'api_e_lostcount']
          .some((key) => numberOr(stage[key], 0) > 0))
      const hasTouchPlane = stages.some((stage) =>
        toArray(stage.api_touch_plane).some((itemId) => numberOr(itemId, -1) > 0))
      const hasAirFire = stages.some((stage) => isObject(stage.api_air_fire))
      const hasHit = stages.some((stage) =>
        [
          'api_frai_flag',
          'api_erai_flag',
          'api_fbak_flag',
          'api_ebak_flag',
          'api_fdam',
          'api_edam',
        ].some((key) => hasPositive(stage[key])))
      return hasPlaneSource || hasSquadron || hasCountOrLoss || hasTouchPlane || hasAirFire || hasHit
    }

    function parseKouku(key, kouku, title, attackerSide = 'player', phaseTitle = '') {
      if (!hasAirActivity(kouku)) return
      const stage1 = isObject(kouku.api_stage1) ? kouku.api_stage1 : null
      const detail = stage1
        ? `${AIR_STATES[stage1.api_disp_seiku] || '制空状态未知'} · 我方损失 ${numberOr(stage1.api_f_lostcount)} / 敌方损失 ${numberOr(stage1.api_e_lostcount)}`
        : '制空状态无响应数据'
      const label = phaseTitle || PHASE_LABELS[key] || key
      if (key !== 'airBaseAttack') {
        beginPhase(key, '', EVENT_DURATIONS.aviation, `${label}开始`)
      } else {
        phase = key
      }
      const airFire = isObject(kouku.api_stage2) && isObject(kouku.api_stage2.api_air_fire)
        ? kouku.api_stage2.api_air_fire
        : null
      if (airFire) {
        const attacker = resolveUnit(groups, 'player', airFire.api_idx)
        const usedItems = toArray(airFire.api_use_items)
          .map((itemId) => numberOr(itemId, -1))
          .filter((itemId) => itemId > 0)
        addEvent({
          kind: 'cutin',
          title: '对空 CI 发动',
          detail: [
            attacker ? attacker.name : '我方防空舰',
            `类型 ${numberOr(airFire.api_kind, 0) || '未知'}`,
            usedItems.length ? `装备 ID ${usedItems.join('、')}` : '',
          ].filter(Boolean).join(' · '),
          attackerId: attacker ? attacker.id : null,
          attackerName: attacker ? attacker.name : '我方防空舰',
          attackerSide: 'player',
          durationMs: EVENT_DURATIONS.antiAirCutIn,
        })
      }
      const jetAssault = key === 'airBaseInjection' || key === 'injectionKouku'
      if (!jetAssault) {
        beginPhase(key, detail, EVENT_DURATIONS.aviation, `${label}制空结果`)
      } else {
        phase = key
      }
      const stage3 = isObject(kouku.api_stage3) ? kouku.api_stage3 : null
      const stage3Combined = isObject(kouku.api_stage3_combined) ? kouku.api_stage3_combined : null
      const enemyHits = airHits(stage3, 'enemy', false, attackerSide)
        .concat(airHits(stage3Combined, 'enemy', true, attackerSide))
      const playerHits = airHits(stage3, 'player', false, 'enemy')
        .concat(airHits(stage3Combined, 'player', true, 'enemy'))
      const hits = enemyHits.concat(playerHits)
      if (hits.length) {
        const attackerSides = [...new Set(hits.map((hit) => hit.attackerSide).filter(Boolean))]
        addEvent({
          kind: 'attack',
          title: title || label,
          detail,
          attackerSide: attackerSides.length === 1 ? attackerSides[0] : null,
          groupHitsBySide: true,
          hits,
        })
      }
    }

    function parseAirBaseDefense(body) {
      const waves = Array.isArray(body.api_air_base_attack)
        ? body.api_air_base_attack
        : isObject(body.api_air_base_attack) ? [body.api_air_base_attack] : []
      const lostKinds = Array.isArray(body.api_lost_kind)
        ? body.api_lost_kind
        : body.api_lost_kind == null ? [] : [body.api_lost_kind]
      const formation = toArray(body.api_formation)
      const stage1s = waves.map((wave) => isObject(wave.api_stage1) ? wave.api_stage1 : null).filter(Boolean)
      const airStates = [...new Set(stage1s.map((stage1) =>
        AIR_STATES[stage1.api_disp_seiku] || '制空状态未知'))]
      const friendlyLoss = stage1s.reduce((sum, stage1) => sum + numberOr(stage1.api_f_lostcount), 0)
      const enemyLoss = stage1s.reduce((sum, stage1) => sum + numberOr(stage1.api_e_lostcount), 0)
      const firstLine = [
        formation.length ? `我方 ${FORMATIONS[formation[0]] || formation[0] || '未知'}` : '',
        formation.length ? `敌方 ${FORMATIONS[formation[1]] || formation[1] || '未知'}` : '',
        formation.length ? ENGAGEMENTS[formation[2]] || formation[2] || '交战形态未知' : '',
        airStates.join(' / '),
      ].filter(Boolean).join(' · ')
      const secondLine = [
        stage1s.length ? `航空损失 我方 ${friendlyLoss} / 敌方 ${enemyLoss}` : '',
        lostKinds.length
          ? `基地损害 状态代码 ${lostKinds.map((value) => numberOr(value, 0)).join(' / ')}`
          : '',
      ].filter(Boolean).join(' · ')
      const detailLines = [firstLine, secondLine].filter(Boolean)
      const detail = detailLines.join(' · ')
      const playerHits = waves.flatMap((wave) =>
        airHits(isObject(wave.api_stage3) ? wave.api_stage3 : null, 'player'))
      phase = 'airBaseDefense'
      addEvent({
        kind: playerHits.length ? 'attack' : 'info',
        title: '基地航空队空袭伤害',
        detail,
        attackerName: '敌方航空队',
        attackerSide: 'enemy',
        detailLines,
        hideHitDetails: true,
        hits: playerHits,
      })
    }

    function parseSupport(key, info, flag) {
      if (!isObject(info)) return
      if (isObject(info.api_support_airatack)) {
        parseKouku(key, info.api_support_airatack, '航空支援', 'player', '航空支援')
        return
      }
      if (!isObject(info.api_support_hourai)) return
      beginPhase(
        key,
        flag === 3 ? '雷击支援' : '炮击支援',
        NIGHT_PHASES.has(key) ? EVENT_DURATIONS.nightPhase : 0,
      )
      const damages = toArray(info.api_support_hourai.api_damage)
      const crits = toArray(info.api_support_hourai.api_cl_list)
      const padded = damages[0] === -1
      const hits = damages.flatMap((damage, rawIndex) => {
        const index = padded ? rawIndex - 1 : rawIndex
        const target = resolveUnit(groups, 'enemy', index)
        if (index < 0 || !target || floorDamage(damage) <= 0) return []
        return [{ targetId: target.id, targetName: target.name, damage, critical: numberOr(crits[rawIndex]) === 2 }]
      })
      attackEvent(null, hits, flag === 3 ? '支援雷击' : '支援炮击', '', 'player')
    }

    function resolveLegacyMixed(position, attacker) {
      const numeric = numberOr(position, -1)
      const side = numeric > 6 ? 'enemy' : 'player'
      const unit = resolveUnit(groups, side, numeric > 6 ? numeric - 6 : numeric, true)
      if (attacker) return { side, unit }
      return { side, unit }
    }

    function parseHougeki(key, hougeki, friendMode = false) {
      if (!isObject(hougeki) || !Array.isArray(hougeki.api_at_list)) return
      const phaseDuration = NIGHT_PHASES.has(key)
        ? EVENT_DURATIONS.nightPhase
        : SHORT_COMBAT_PHASES.has(key) ? EVENT_DURATIONS.shortCombatPhase : 0
      beginPhase(key, '', phaseDuration)
      const atList = hougeki.api_at_list
      const eflags = toArray(hougeki.api_at_eflag)
      const defenders = toArray(hougeki.api_df_list)
      const damages = toArray(hougeki.api_damage)
      const crits = toArray(hougeki.api_cl_list)
      const dayAttackTypes = toArray(hougeki.api_at_type)
      const isDayAttack = dayAttackTypes.length > 0
      const attackTypes = isDayAttack ? dayAttackTypes : toArray(hougeki.api_sp_list)
      const modern = eflags.length > 0

      atList.forEach((attackerPosition, index) => {
        if (attackerPosition === -1 || attackerPosition == null) return
        const attackType = numberOr(attackTypes[index], 0)
        let attackerSide
        let attacker
        let kongouAttackerPositions = null
        if (modern) {
          attackerSide = numberOr(eflags[index]) === 1 ? 'enemy' : friendMode ? 'friend' : 'player'
          if (!isDayAttack && attackType === 104) {
            const combinedEscortOffset = attackerSide === 'player' && groups.playerEscort.length ? 6 : 0
            kongouAttackerPositions = [combinedEscortOffset, combinedEscortOffset + 1]
            attacker = resolveUnit(groups, attackerSide, kongouAttackerPositions[0])
          } else {
            attacker = resolveUnit(groups, attackerSide, attackerPosition)
          }
        } else {
          const resolved = resolveLegacyMixed(attackerPosition, true)
          attackerSide = resolved.side
          attacker = resolved.unit
        }
        const targetSide = attackerSide === 'enemy' ? (friendMode ? 'friend' : 'player') : 'enemy'
        const df = Array.isArray(defenders[index]) ? defenders[index] : [defenders[index]]
        const dmg = Array.isArray(damages[index]) ? damages[index] : [damages[index]]
        const cl = Array.isArray(crits[index]) ? crits[index] : [crits[index]]
        const count = Math.max(df.length, dmg.length)
        const hits = []
        for (let hitIndex = 0; hitIndex < count; hitIndex += 1) {
          let target
          if (modern) target = resolveUnit(groups, targetSide, df[hitIndex] ?? df[0])
          else target = resolveLegacyMixed(df[hitIndex] ?? df[0], false).unit
          if (!target) continue
          const hitAttacker = kongouAttackerPositions
            ? resolveUnit(
              groups,
              attackerSide,
              kongouAttackerPositions[hitIndex] ?? kongouAttackerPositions[0],
            )
            : null
          hits.push({
            targetId: target.id,
            targetName: target.name,
            damage: dmg[hitIndex] ?? dmg[0] ?? 0,
            critical: numberOr(cl[hitIndex] ?? cl[0]) === 2,
            protected: Number(dmg[hitIndex] ?? dmg[0]) % 1 !== 0,
            attackerId: hitAttacker ? hitAttacker.id : null,
            attackerName: hitAttacker ? hitAttacker.name : '',
            attackerSide: hitAttacker ? attackerSide : null,
          })
        }
        const typeNames = isDayAttack ? DAY_ATTACK_TYPES : NIGHT_ATTACK_TYPES
        const fallbackTitle = isDayAttack
          ? `炮击（类型 ${attackType}）`
          : `夜战特殊攻击（类型 ${attackType}）`
        attackEvent(
          attacker,
          hits,
          typeNames[attackType] || fallbackTitle,
          attackType ? `攻击类型 ${attackType}` : '',
          attackerSide,
        )
      })
    }

    function parseRaigeki(key, data, opening = false) {
      if (!isObject(data)) return
      const multi = Array.isArray(data.api_frai_list_items) || Array.isArray(data.api_erai_list_items)
      const hits = []

      function parseSide(prefix, attackerSide, targetSide) {
        if (multi) {
          const targetsAll = toArray(data[`api_${prefix}rai_list_items`])
          const damagesAll = toArray(data[`api_${prefix === 'f' ? 'fy' : 'ey'}dam_list_items`])
          const critsAll = toArray(data[`api_${prefix}cl_list_items`])
          targetsAll.forEach((targets, attackerIndex) => {
            const attacker = resolveUnit(groups, attackerSide, attackerIndex)
            toArray(targets).forEach((targetPosition, subIndex) => {
              if (targetPosition == null || targetPosition < 0) return
              const target = resolveUnit(groups, targetSide, targetPosition)
              if (!target) return
              hits.push({
                targetId: target.id,
                targetName: target.name,
                damage: toArray(damagesAll[attackerIndex])[subIndex],
                critical: numberOr(toArray(critsAll[attackerIndex])[subIndex]) === 2,
                attackerId: attacker ? attacker.id : null,
                attackerName: attacker ? attacker.name : '',
                attackerSide,
              })
            })
          })
          return
        }

        const targets = toArray(data[`api_${prefix}rai`])
        const damages = toArray(data[`api_${prefix === 'f' ? 'fy' : 'ey'}dam`])
        const crits = toArray(data[`api_${prefix}cl`])
        const aggregateRaw = toArray(data[`api_${targetSide === 'player' ? 'f' : 'e'}dam`])
        const aggregate = stripPadding(aggregateRaw)
        const modeScore = (oneBased) => {
          const calculated = []
          targets.forEach((targetPosition, rawIndex) => {
            if (oneBased && rawIndex === 0) return
            const numericTarget = numberOr(targetPosition, -1)
            if (oneBased ? numericTarget <= 0 : numericTarget < 0) return
            const targetIndex = oneBased ? numericTarget - 1 : numericTarget
            calculated[targetIndex] = numberOr(calculated[targetIndex]) + floorDamage(damages[rawIndex])
          })
          const count = Math.max(aggregate.length, calculated.length)
          return Array.from({ length: count }, (_, index) =>
            Math.abs(floorDamage(aggregate[index]) - floorDamage(calculated[index])))
            .reduce((sum, difference) => sum + difference, 0)
        }
        const zeroBasedScore = modeScore(false)
        const oneBasedScore = targets[0] === -1 ? modeScore(true) : Number.POSITIVE_INFINITY
        const legacyOneBased = oneBasedScore < zeroBasedScore ||
          (oneBasedScore === zeroBasedScore && aggregateRaw[0] === -1)
        targets.forEach((targetPosition, rawIndex) => {
          if (legacyOneBased && rawIndex === 0) return
          const numericTarget = numberOr(targetPosition, -1)
          if (legacyOneBased ? numericTarget <= 0 : numericTarget < 0) return
          const attacker = resolveUnit(groups, attackerSide, rawIndex - (legacyOneBased ? 1 : 0))
          const target = resolveUnit(groups, targetSide, numericTarget, legacyOneBased)
          if (!target) return
          hits.push({
            targetId: target.id,
            targetName: target.name,
            damage: damages[rawIndex],
            critical: numberOr(crits[rawIndex]) === 2,
            attackerId: attacker ? attacker.id : null,
            attackerName: attacker ? attacker.name : '',
            attackerSide,
          })
        })
      }

      parseSide('f', 'player', 'enemy')
      parseSide('e', 'enemy', 'player')
      if (hits.length) {
        beginPhase(
          key,
          '',
          SHORT_COMBAT_PHASES.has(key) ? EVENT_DURATIONS.shortCombatPhase : 0,
        )
        const attackerSides = [...new Set(hits.map((hit) => hit.attackerSide).filter(Boolean))]
        addEvent({
          kind: 'attack',
          title: opening ? '开幕雷击' : '闭幕雷击',
          attackerSide: attackerSides.length === 1 ? attackerSides[0] : null,
          groupHitsBySide: true,
          hits,
        })
      }
    }

    function parseFriendly(body) {
      if (!isObject(body.api_friendly_battle)) return
      if (isObject(body.api_friendly_info) && !groups.friendMain.length) mergeMissingUnits(groups, body, replay.roster)
      parseHougeki('friendly', body.api_friendly_battle.api_hougeki, true)
    }

    function parsePacket(packet, packetIndex) {
      const body = packet.body
      const nightToDay = Boolean(body.api_n_hougeki1)
      const dayPacket = DAY_PATHS.has(packet.path)
      damageControlEnabled = !String(packet.path).includes('/api_req_practice/')
      mergeMissingUnits(groups, body, replay.roster)
      if (packetIndex > 0) syncHp(groups, body)
      if (packet.path === AIR_BASE_DEFENSE_PATH) {
        parseAirBaseDefense(body)
        return
      }
      if (packetIndex === 0) battleStart()
      if (dayPacket && !nightToDay) {
        search(body)
        smoke(body)
      }

      if (nightToDay) {
        parseFriendly(body)
        if (body.api_n_support_info) parseSupport('nSupport', body.api_n_support_info, body.api_n_support_flag)
        parseHougeki('nHougeki1', body.api_n_hougeki1)
        parseHougeki('nHougeki2', body.api_n_hougeki2)
        search(body)
        smoke(body)
      }

      if (body.api_air_base_injection) parseKouku('airBaseInjection', body.api_air_base_injection, '基地喷式攻击')
      if (body.api_injection_kouku) parseKouku('injectionKouku', body.api_injection_kouku, '喷式航空攻击')
      toArray(body.api_air_base_attack).forEach((wave) => {
        const baseId = numberOr(wave.api_base_id, 0)
        const label = baseId > 0 ? `第 ${baseId} 基地航空队` : '基地航空队'
        parseKouku('airBaseAttack', wave, `${label}航空攻击`, 'player', label)
      })
      if (body.api_friendly_kouku) parseKouku('friendlyKouku', body.api_friendly_kouku, '友军航空攻击', 'friend')
      if (body.api_kouku) parseKouku('kouku', body.api_kouku, '航空战')
      if (body.api_kouku2) parseKouku('kouku2', body.api_kouku2, '第二次航空战')
      if (body.api_support_info) parseSupport('support', body.api_support_info, body.api_support_flag)
      if (body.api_opening_taisen) parseHougeki('openingTaisen', body.api_opening_taisen)
      if (body.api_opening_atack) parseRaigeki('openingAtack', body.api_opening_atack, true)
      if (dayPacket) {
        formation(body)
      }

      const playerCombined = numberOr(replay.roster.combinedType, groups.playerEscort.length ? 2 : 0)
      const enemyCombined = groups.enemyEscort.length > 0 || toArray(body.api_ship_ke_combined).length > 0
      dayShellOrder(playerCombined, enemyCombined).forEach((key) => {
        if (key === 'raigeki') {
          if (body.api_raigeki) parseRaigeki(key, body.api_raigeki, false)
        } else if (body[`api_${key}`]) parseHougeki(key, body[`api_${key}`])
      })

      const nightOnly = body.api_hougeki && !body.api_hougeki1
      if (!nightToDay && (nightOnly || isObject(body.api_friendly_battle))) {
        parseFriendly(body)
        if (body.api_n_support_info) parseSupport('nSupport', body.api_n_support_info, body.api_n_support_flag)
        if (body.api_hougeki) parseHougeki('hougeki', body.api_hougeki)
      }
    }

    replay.packets.forEach(parsePacket)
    if (replay.result) {
      const mainMvpPosition = numberOr(replay.result.api_mvp, -1)
      const escortMvpPosition = numberOr(replay.result.api_mvp_combined, -1)
      const mainMvp = mainMvpPosition > 0 ? groups.playerMain[mainMvpPosition - 1] : null
      const escortMvp = escortMvpPosition > 0 ? groups.playerEscort[escortMvpPosition - 1] : null
      const resultDetail = [
        replay.result.api_win_rank ? `胜负判定 ${replay.result.api_win_rank}` : '',
        mainMvp ? `${groups.playerEscort.length ? '主力 ' : ''}MVP ${mainMvp.name}` : '',
        escortMvp ? `护卫 MVP ${escortMvp.name}` : '',
      ].filter(Boolean).join(' · ')
      const dropShip = isObject(replay.result.api_get_ship) ? replay.result.api_get_ship : null
      const dropShipName = dropShip ? String(dropShip.api_ship_name || '') : ''
      const dropShipId = dropShip ? numberOr(dropShip.api_ship_id, -1) : -1
      const dropShipText = dropShipName
        ? `获得舰船：${dropShipName}`
        : dropShipId > 0 ? `获得舰船：ID ${dropShipId}` : ''
      const dropItem = isObject(replay.result.api_get_useitem) ? replay.result.api_get_useitem : null
      const dropItemMeta = isObject(replay.resultMeta.useitem) ? replay.resultMeta.useitem : {}
      const dropItemId = dropItem
        ? numberOr(dropItem.api_useitem_id, numberOr(dropItemMeta.id, -1))
        : numberOr(dropItemMeta.id, -1)
      const dropItemName = dropItem
        ? String(dropItem.api_useitem_name || dropItemMeta.name || '')
        : String(dropItemMeta.name || '')
      const dropItemCount = numberOr(dropItemMeta.count, -1)
      const dropItemLabel = dropItemName || (dropItemId > 0 ? `ID ${dropItemId}` : '')
      const dropItemText = dropItemLabel
        ? `获得道具：${dropItemLabel}${dropItemCount >= 0 ? `（${dropItemCount}）` : ''}`
        : ''
      const dropText = [dropShipText, dropItemText].filter(Boolean).join(' · ')
      phase = 'result'
      addEvent({
        kind: 'phase',
        title: PHASE_LABELS.result,
        detail: resultDetail,
        durationMs: dropText ? 5000 : 0,
      })
      if (dropText) {
        addEvent({
          kind: 'phase',
          title: PHASE_LABELS.result,
          detail: resultDetail,
          resultDrop: dropText,
        })
      }
    }
    if (!events.length) addEvent({ kind: 'info', title: '已读取数据', detail: '没有可播放的战斗阶段' })

    return { replay, events, initial: events[0].snapshot, final: events[events.length - 1].snapshot }
  }

  function isBattlePath(path) { return BATTLE_PATHS.has(path) }
  function isInitialBattlePath(path) {
    return DAY_PATHS.has(path) || NIGHT_START_PATHS.has(path) || path === AIR_BASE_DEFENSE_PATH
  }

  return {
    PHASE_LABELS,
    DAY_PATHS,
    NIGHT_START_PATHS,
    NIGHT_CONTINUE_PATHS,
    AIR_BASE_DEFENSE_PATH,
    BATTLE_PATHS,
    EVENT_DURATIONS,
    dayShellOrder,
    normalizeReplay,
    buildTimeline,
    isBattlePath,
    isInitialBattlePath,
  }
})
