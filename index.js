'use strict'

const fs = require('fs')
const path = require('path')
const React = require('react')
const { useSelector } = require('react-redux')
const core = require('./src/core')
const theme = require('./src/theme')
const { createReplayApp } = require('./src/replay-app')

const PACKAGE_KEY = 'poi-plugin-local-battle-replay'
const MAP_PATHS = new Set(['/kcsapi/api_req_map/start', '/kcsapi/api_req_map/next'])
const EVENT_DIFFICULTIES = Object.freeze({ 1: '丁', 2: '丙', 3: '乙', 4: '甲' })
const styleText = fs.readFileSync(path.join(__dirname, 'styles', 'replay.css'), 'utf8')
const initialState = Object.freeze({ replay: null, battleId: 0, packetCount: 0, location: null })

function actionPath(action) {
  if (action && action.payload && typeof action.payload.path === 'string') return action.payload.path
  if (action && typeof action.path === 'string') return action.path
  if (action && typeof action.type === 'string' && action.type.startsWith('@@Response')) {
    return action.type.slice('@@Response'.length)
  }
  return ''
}

function actionBody(action) {
  if (action && action.payload && action.payload.body) return action.payload.body
  return action && action.body
}

function jsonCopy(value) {
  return JSON.parse(JSON.stringify(value))
}

function asObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function numeric(value, fallback = -1) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeMapId(value) {
  const mapId = String(value || '').trim()
  return /^\d{2,}$/.test(mapId) ? `${mapId.slice(0, -1)}-${mapId.slice(-1)}` : mapId
}

function getDeck(store, deckNumber) {
  const fleets = asArray(asObject(store.info).fleets)
  return asObject(fleets[deckNumber - 1])
}

function getShipEntry(store, shipInstanceId) {
  const infoShips = asObject(asObject(store.info).ships)
  const instance = asObject(infoShips[shipInstanceId])
  const mstId = numeric(instance.api_ship_id)
  const masterShips = asObject(asObject(store.const).$ships)
  const master = asObject(masterShips[mstId])
  const equipInstances = asObject(asObject(store.info).equips)
  const slots = asArray(instance.api_slot).length
    ? asArray(instance.api_slot)
    : asArray(instance.slot)
  const extraSlot = numeric(instance.api_slot_ex ?? instance.exslot, -1)
  const equipped = extraSlot > 0 ? slots.concat(extraSlot) : slots
  const damageControls = equipped.flatMap((slot) => {
    const equip = slot && typeof slot === 'object'
      ? asObject(slot)
      : asObject(equipInstances[numeric(slot)])
    const itemId = numeric(equip.api_slotitem_id ?? equip.api_id, -1)
    return itemId === 42 || itemId === 43 ? [itemId] : []
  })
  return {
    name: String(master.api_name || ''),
    mstId,
    maxHp: numeric(instance.api_maxhp, numeric(master.api_taik && master.api_taik[0], 1)),
    level: numeric(instance.api_lv, 0),
    damageControls,
  }
}

function deckRoster(store, deckNumber, escapedPositions = new Set(), escapedOffset = 0) {
  const deck = getDeck(store, deckNumber)
  return asArray(deck.api_ship)
    .filter((id) => numeric(id) > 0)
    .map((id, index) => ({
      ...getShipEntry(store, id),
      retreated: escapedPositions.has(escapedOffset + index),
    }))
}

function activeDeckNumber(store, body, action) {
  const postBody = asObject(action && (action.postBody || (action.payload && action.payload.postBody)))
  const fromPacket = numeric(body.api_deck_id ?? postBody.api_deck_id, 0)
  if (fromPacket > 0) return fromPacket
  const battleStatus = asObject(asObject(store.battle)._status)
  const fromStatus = numeric(battleStatus.deckId, -1)
  if (fromStatus >= 0) return fromStatus + 1
  const sortieStatus = asArray(asObject(store.sortie).sortieStatus)
  const activeIndex = sortieStatus.findIndex(Boolean)
  return activeIndex >= 0 ? activeIndex + 1 : 1
}

function enemyIds(body) {
  return asArray(body.api_ship_ke).concat(asArray(body.api_ship_ke_combined))
    .map((id) => numeric(id))
    .filter((id) => id > 0)
}

function friendlyIds(body) {
  return asArray(asObject(body.api_friendly_info).api_ship_id)
    .map((id) => numeric(id))
    .filter((id) => id > 0)
}

function captureRoster(storeValue, body, action) {
  const store = asObject(storeValue)
  const deckNumber = activeDeckNumber(store, body, action)
  const sortie = asObject(store.sortie)
  const combinedType = numeric(sortie.combinedFlag, 0)
  const escapedPositions = new Set(
    asArray(sortie.escapedPos).map((position) => numeric(position)).filter((position) => position >= 0),
  )
  const masterShips = asObject(asObject(store.const).$ships)
  const shipNames = {}
  new Set(enemyIds(body).concat(friendlyIds(body))).forEach((id) => {
    const master = asObject(masterShips[id])
    if (master.api_name) shipNames[id] = String(master.api_name)
  })
  const playerMain = deckRoster(store, deckNumber, escapedPositions)
  return {
    playerMain,
    playerEscort: combinedType && deckNumber === 1
      ? deckRoster(store, 2, escapedPositions, playerMain.length)
      : [],
    combinedType,
    shipNames,
  }
}

function captureAirBaseDefenseRoster(storeValue, body) {
  const store = asObject(storeValue)
  const masterShips = asObject(asObject(store.const).$ships)
  const shipNames = {}
  enemyIds(body).forEach((id) => {
    const master = asObject(masterShips[id])
    if (master.api_name) shipNames[id] = String(master.api_name)
  })
  const nowHps = asArray(body.api_f_nowhps).slice()
  const maxHps = asArray(body.api_f_maxhps).slice()
  if (nowHps[0] === -1 || nowHps[0] === null) nowHps.shift()
  if (maxHps[0] === -1 || maxHps[0] === null) maxHps.shift()
  const count = Math.min(3, Math.max(nowHps.length, maxHps.length))
  return {
    playerMain: Array.from({ length: count }, (_, index) => ({
      name: `第 ${index + 1} 基地航空队`,
      maxHp: numeric(maxHps[index], Math.max(1, numeric(nowHps[index], 1))),
      level: 0,
    })),
    playerEscort: [],
    combinedType: 0,
    shipNames,
  }
}

function captureResultMeta(storeValue, bodyValue) {
  const store = asObject(storeValue)
  const body = asObject(bodyValue)
  const obtained = asObject(body.api_get_useitem)
  const itemId = numeric(obtained.api_useitem_id, -1)
  if (itemId <= 0) return {}

  const master = asObject(asObject(asObject(store.const).$useitems)[itemId])
  const inventory = asObject(asObject(asObject(store.info).useitems)[itemId])
  const previousCount = numeric(inventory.api_count, -1)
  const name = String(obtained.api_useitem_name || master.api_name || '')
  return {
    useitem: {
      id: itemId,
      ...(name ? { name } : {}),
      ...(previousCount >= 0 ? { count: previousCount + 1 } : {}),
    },
  }
}

function captureLocation(storeValue, bodyValue) {
  const store = asObject(storeValue)
  const body = asObject(bodyValue)
  const sortie = asObject(store.sortie)
  let mapId = normalizeMapId(sortie.sortieMapId)
  const mapArea = numeric(body.api_maparea_id, -1)
  const mapInfo = numeric(body.api_mapinfo_no, -1)
  if (!mapId && mapArea >= 0 && mapInfo >= 0) mapId = `${mapArea}-${mapInfo}`
  const responseNode = numeric(body.api_no, -1)
  const storeNode = numeric(sortie.currentNode, -1)
  const node = responseNode >= 0 ? responseNode : storeNode
  if (!mapId && node < 0) return null
  const compactMapId = mapId.replace(/-/g, '')
  const maps = asObject(asObject(store.info).maps)
  const eventMap = asObject(asObject(maps[compactMapId]).api_eventmap)
  const difficulty = EVENT_DIFFICULTIES[numeric(eventMap.api_selected_rank, 0)] || ''
  const fcdMaps = asObject(asObject(store.fcd).map)
  const route = asObject(asObject(fcdMaps[mapId]).route)
  const routeEntry = asArray(route[node])
  const spot = routeEntry[1] == null ? '' : String(routeEntry[1]).trim()
  return {
    mapId,
    node,
    ...(difficulty ? { difficulty } : {}),
    ...(spot ? { spot } : {}),
  }
}

function mergeLocation(previous, current) {
  if (!current) return previous || null
  const oldLocation = asObject(previous)
  const mapId = current.mapId || String(oldLocation.mapId || '')
  const node = current.node >= 0 ? current.node : numeric(oldLocation.node, -1)
  const sameMap = mapId === String(oldLocation.mapId || '')
  const sameNode = sameMap && node === numeric(oldLocation.node, -1)
  const difficulty = current.difficulty || (sameMap ? String(oldLocation.difficulty || '') : '')
  const spot = current.spot || (sameNode ? String(oldLocation.spot || '') : '')
  return {
    mapId,
    node,
    ...(difficulty ? { difficulty } : {}),
    ...(spot ? { spot } : {}),
  }
}

function mergeNames(previousRoster, currentRoster) {
  const mergeFleet = (previous, current) => {
    if (!current.length) return previous
    return current.map((entry, index) => ({
      ...previous[index],
      ...entry,
      retreated: Boolean((previous[index] && previous[index].retreated) || entry.retreated),
      damageControls: previous[index] && Array.isArray(previous[index].damageControls)
        ? previous[index].damageControls
        : entry.damageControls,
    }))
  }
  return {
    ...previousRoster,
    ...currentRoster,
    playerMain: mergeFleet(previousRoster.playerMain, currentRoster.playerMain),
    playerEscort: mergeFleet(previousRoster.playerEscort, currentRoster.playerEscort),
    shipNames: { ...previousRoster.shipNames, ...currentRoster.shipNames },
  }
}

function reducer(state = initialState, action, store) {
  const pathName = actionPath(action)
  const rawBody = actionBody(action)
  const body = rawBody && rawBody.api_data ? rawBody.api_data : rawBody

  if (pathName === '/kcsapi/api_port/port' && state.location) {
    return { ...state, location: null }
  }

  if (MAP_PATHS.has(pathName) && body && typeof body === 'object') {
    const capturedLocation = captureLocation(store, body)
    const location = pathName === '/kcsapi/api_req_map/start'
      ? capturedLocation
      : mergeLocation(state.location, capturedLocation)
    const destructionBattle = asObject(body.api_destruction_battle)
    if (Object.keys(destructionBattle).length) {
      const battleId = state.battleId + 1
      const replay = {
        version: 1,
        source: 'poi-live-airbase-defense',
        battleId: `poi-${battleId}`,
        location,
        roster: captureAirBaseDefenseRoster(store, destructionBattle),
        packets: [{
          path: core.AIR_BASE_DEFENSE_PATH,
          body: jsonCopy(destructionBattle),
        }],
        result: null,
      }
      return { replay, battleId, packetCount: 1, location }
    }
    return { ...state, location }
  }

  if (core.isBattlePath(pathName) && body && typeof body === 'object') {
    const isInitial = core.isInitialBattlePath(pathName) || !state.replay
    const battleId = isInitial ? state.battleId + 1 : state.battleId
    const roster = captureRoster(store, body, action)
    const previousReplay = !isInitial && state.replay ? state.replay : null
    const replay = {
      version: 1,
      source: 'poi-live-response',
      battleId: `poi-${battleId}`,
      location: previousReplay
        ? previousReplay.location
        : String(pathName).includes('/api_req_practice/') ? null : state.location,
      roster: previousReplay ? mergeNames(previousReplay.roster, roster) : roster,
      packets: previousReplay ? previousReplay.packets.slice() : [],
      result: null,
    }
    replay.packets.push({ path: pathName, body: jsonCopy(body) })
    return { replay, battleId, packetCount: replay.packets.length, location: state.location }
  }

  if (
    state.replay &&
    (pathName === '/kcsapi/api_req_sortie/battleresult' ||
      pathName === '/kcsapi/api_req_combined_battle/battleresult' ||
      pathName === '/kcsapi/api_req_practice/battle_result') &&
    body && typeof body === 'object'
  ) {
    return {
      ...state,
      replay: {
        ...state.replay,
        result: jsonCopy(body),
        resultMeta: captureResultMeta(store, body),
      },
    }
  }

  return state
}

function selectPluginState(state) {
  return (((state || {}).ext || {})[PACKAGE_KEY] || {})._ || initialState
}

function createModeShell(host) {
  host.innerHTML = [
    '<section class="kclr-window-shell">',
    '  <header class="kclr-window-header">',
    '    <div class="kclr-title-lockup"><p class="kclr-kicker">LOCAL BATTLE SEQUENCE</p><h1>本地战斗回放</h1></div>',
    '  </header>',
    '  <div class="kclr-mode-bar">',
    '    <nav class="kclr-mode-tabs" aria-label="回放数据来源">',
    '      <button type="button" class="is-active" data-mode="live">实时监控播放</button>',
    '      <button type="button" data-mode="import">导入战斗数据</button>',
    '    </nav>',
    `    ${theme.controlsMarkup()}`,
    '  </div>',
    '  <div class="kclr-mode-panel" data-panel="live"></div>',
    '  <div class="kclr-mode-panel" data-panel="import" hidden></div>',
    '</section>',
  ].join('')

  const liveHost = host.querySelector('[data-panel="live"]')
  const importHost = host.querySelector('[data-panel="import"]')
  const buttons = Array.from(host.querySelectorAll('[data-mode]'))
  const panels = Array.from(host.querySelectorAll('[data-panel]'))
  const configScope = typeof window !== 'undefined' ? window : null
  const themeController = theme.createThemeController(host, { config: theme.getConfigApi(configScope) })
  let liveApp
  let importApp
  const activate = (mode) => {
    buttons.forEach((button) => button.classList.toggle('is-active', button.dataset.mode === mode))
    panels.forEach((panel) => { panel.hidden = panel.dataset.panel !== mode })
    if (liveApp) liveApp.setVisible(mode === 'live')
    if (importApp) importApp.setVisible(mode === 'import')
  }
  buttons.forEach((button) => {
    button.addEventListener('click', () => activate(button.dataset.mode))
  })

  liveApp = createReplayApp(liveHost, {
    showHeader: false,
    showImporter: false,
    pauseWhenHidden: true,
    hideEmptyState: true,
  })
  importApp = createReplayApp(importHost, {
    showHeader: false,
    showImporter: true,
    pauseWhenHidden: true,
    emptyText: '请选择或粘贴一份本地战斗数据',
  })
  importApp.setVisible(false)

  return {
    liveApp,
    importApp,
    destroy() {
      liveApp.destroy()
      importApp.destroy()
      if (themeController && typeof themeController.destroy === 'function') themeController.destroy()
      host.replaceChildren()
    },
  }
}

function liveReplayOptions(hasLoadedReplay, replayExistedWhenOpened, hasResult) {
  if (hasResult) {
    return hasLoadedReplay
      ? { startAtPhase: 'result', autoplay: true }
      : { startAtEnd: true, autoplay: false }
  }
  if (!hasLoadedReplay && replayExistedWhenOpened) {
    return { startAtEnd: true, autoplay: false }
  }
  return { preservePosition: true, autoplay: true }
}

function LocalBattleReplay() {
  const hostRef = React.useRef(null)
  const shellRef = React.useRef(null)
  const hasLoadedReplayRef = React.useRef(false)
  const pluginState = useSelector(selectPluginState)
  const replayExistedWhenOpenedRef = React.useRef(Boolean(pluginState.replay))

  React.useEffect(() => {
    if (!hostRef.current) return undefined
    shellRef.current = createModeShell(hostRef.current)
    return () => {
      if (shellRef.current) shellRef.current.destroy()
      shellRef.current = null
    }
  }, [])

  React.useEffect(() => {
    if (shellRef.current && pluginState.replay) {
      const options = liveReplayOptions(
        hasLoadedReplayRef.current,
        replayExistedWhenOpenedRef.current,
        Boolean(pluginState.replay.result),
      )
      shellRef.current.liveApp.setReplay(pluginState.replay, options)
      hasLoadedReplayRef.current = true
    }
  }, [pluginState.replay, pluginState.packetCount])

  return React.createElement(
    React.Fragment,
    null,
    React.createElement('style', { dangerouslySetInnerHTML: { __html: styleText } }),
    React.createElement('div', { ref: hostRef, className: 'kclr-plugin-host' }),
  )
}

module.exports.reactClass = LocalBattleReplay
module.exports.reducer = reducer
module.exports.windowMode = true
module.exports.switchPluginPath = []
module.exports.__test = {
  captureAirBaseDefenseRoster,
  captureLocation,
  captureResultMeta,
  captureRoster,
  createModeShell,
  friendlyIds,
  liveReplayOptions,
  normalizeMapId,
  reducer,
  selectPluginState,
  themeConfigPath: theme.CONFIG_PATH,
}
