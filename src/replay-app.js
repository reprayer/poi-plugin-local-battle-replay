(function initReplayApp(root, factory) {
  const core = typeof module === 'object' && module.exports ? require('./core') : root.KCReplayCore
  const theme = typeof module === 'object' && module.exports ? require('./theme') : root.KCReplayTheme
  const api = factory(core, theme)
  if (typeof module === 'object' && module.exports) module.exports = api
  if (root) root.KCReplayLocal = api
})(typeof globalThis !== 'undefined' ? globalThis : this, function replayAppFactory(core, theme) {
  'use strict'

  if (!core) throw new Error('KCReplayCore 未加载')

  const GROUP_META = Object.freeze([
    ['playerMain', '我方主力'],
    ['playerEscort', '我方护卫'],
    ['enemyMain', '敌方主力'],
    ['enemyEscort', '敌方护卫'],
  ])
  const PHASE_OVERVIEW = Object.freeze({
    battleStart: '战斗开始',
    airBaseDefense: '基地航空队',
    airBaseInjection: '基地航空队',
    airBaseAttack: '基地航空队',
    injectionKouku: '航空战',
    kouku: '航空战',
    kouku2: '航空战',
    friendlyKouku: '友军',
    openingTaisen: '先制对潜',
    openingAtack: '开幕雷击',
    hougeki1: '第一轮炮击',
    hougeki2: '第二轮炮击',
    raigeki: '闭幕雷击',
    friendly: '友军',
    nHougeki1: '夜战',
    nHougeki2: '夜战',
    hougeki: '夜战',
    result: '战果报告',
  })
  const OVERLAY_KICKERS = Object.freeze({
    battleStart: 'BATTLE START',
    searchStart: 'RECONNAISSANCE',
    searchResult: 'RECONNAISSANCE',
    smoke: 'SMOKE SCREEN',
    formation: 'FORMATION',
    airBaseDefense: 'AIR RAID',
    airBaseInjection: 'LAND-BASE AIR STRIKE',
    airBaseAttack: 'LAND-BASE AIR STRIKE',
    injectionKouku: 'JET ASSAULT',
    friendlyKouku: 'FRIEND FLEET',
    kouku: 'AIR BATTLE',
    kouku2: 'AIR BATTLE',
    support: 'SUPPORT ATTACK',
    openingTaisen: 'OPENING ASW',
    openingAtack: 'OPENING TORPEDO',
    hougeki1: 'SHELLING I',
    hougeki2: 'SHELLING II',
    hougeki3: 'SHELLING III',
    raigeki: 'CLOSING TORPEDO',
    friendly: 'FRIEND FLEET',
    nSupport: 'NIGHT SUPPORT',
    nHougeki1: 'NIGHT BATTLE',
    nHougeki2: 'NIGHT BATTLE',
    hougeki: 'NIGHT BATTLE',
    damageControl: 'DAMAGE CONTROL',
    result: 'BATTLE REPORT',
  })
  const BASE_STEP_MS = 2140
  let appSerial = 0

  function makeElement(documentRef, tag, className, text) {
    const node = documentRef.createElement(tag)
    if (className) node.className = className
    if (text !== undefined) node.textContent = String(text)
    return node
  }

  function formatHit(hit) {
    const tags = []
    if (hit.critical) tags.push('暴击')
    if (hit.protected) tags.push('庇护')
    const route = hit.attackerName ? `${hit.attackerName} → ` : ''
    return `${route}${hit.targetName} −${Math.floor(Number(hit.damage) || 0)}${tags.length ? `（${tags.join('、')}）` : ''}`
  }

  function damageState(unit) {
    if (unit.retreated) return 'retreated'
    if (unit.nowHp <= 0) return 'sunk'
    const ratio = unit.nowHp / unit.maxHp
    if (ratio <= 0.25) return 'heavy'
    if (ratio <= 0.5) return 'medium'
    if (ratio <= 0.75) return 'light'
    return 'healthy'
  }

  function statusText(unit) {
    return {
      healthy: '健在',
      light: '小破',
      medium: '中破',
      heavy: '大破',
      retreated: '退避',
      sunk: '击沉',
    }[damageState(unit)]
  }

  function damageControlLabels(unit) {
    const counts = new Map()
    ;(Array.isArray(unit && unit.damageControls) ? unit.damageControls : []).forEach((itemId) => {
      const numericId = Number(itemId)
      if (numericId === 42 || numericId === 43) {
        counts.set(numericId, (counts.get(numericId) || 0) + 1)
      }
    })
    return [42, 43].flatMap((itemId) => {
      const count = counts.get(itemId) || 0
      if (!count) return []
      const name = itemId === 43 ? '女神' : '损管'
      return [count > 1 ? `${name}×${count}` : name]
    })
  }

  function replayPosition(eventCount, previousIndex, sameBattle, options = {}) {
    const lastIndex = Math.max(0, eventCount - 1)
    if (options.startAtEnd) return lastIndex
    if (options.preservePosition && sameBattle) {
      const previousEventCount = Number(options.previousEventCount)
      const appendedAfterEnd = Number.isInteger(previousEventCount) &&
        previousEventCount > 0 &&
        previousIndex >= previousEventCount - 1 &&
        eventCount > previousEventCount
      if (appendedAfterEnd) return Math.min(previousEventCount, lastIndex)
      return Math.max(0, Math.min(previousIndex, lastIndex))
    }
    return 0
  }

  function eventDelay(event, speed = 1) {
    const eventDuration = Number(event && event.durationMs)
    const base = Number.isFinite(eventDuration) && eventDuration > 0 ? eventDuration : BASE_STEP_MS
    return Math.max(120, base / Math.max(0.25, Number(speed) || 1))
  }

  function canStartPlayback(index, eventCount) {
    return eventCount > 0 && index < eventCount - 1
  }

  function usesCombinedLayout(snapshot, friendlyVisible = false) {
    const value = snapshot || {}
    return (Array.isArray(value.playerEscort) && value.playerEscort.length > 0) ||
      (Array.isArray(value.enemyEscort) && value.enemyEscort.length > 0) ||
      (friendlyVisible && Array.isArray(value.friendMain) && value.friendMain.length > 7)
  }

  function phaseOverview(event) {
    return PHASE_OVERVIEW[event && event.phase] || ''
  }

  function showsFriendlyFleet(event) {
    return Boolean(event && (event.phase === 'friendly' || event.phase === 'friendlyKouku'))
  }

  function friendlyFleetColumns(units) {
    const friends = Array.isArray(units) ? units : []
    return [friends.slice(0, 7), friends.slice(7)]
  }

  function overlayKicker(event) {
    if (event && event.kind === 'recovery') return 'DAMAGE CONTROL'
    if (event && event.kind === 'cutin') return 'ANTI-AIR CUT-IN'
    return OVERLAY_KICKERS[event && event.phase] || 'BATTLE EVENT'
  }

  function cardEdgeLine(attackerRect, targetRect, stageRect) {
    const localRect = (rect) => ({
      left: rect.left - stageRect.left,
      right: rect.left - stageRect.left + rect.width,
      centerX: rect.left - stageRect.left + rect.width / 2,
      centerY: rect.top - stageRect.top + rect.height / 2,
    })
    const attacker = localRect(attackerRect)
    const target = localRect(targetRect)
    const targetIsRight = target.centerX >= attacker.centerX
    return {
      x1: targetIsRight ? attacker.right : attacker.left,
      y1: attacker.centerY,
      x2: targetIsRight ? target.left : target.right,
      y2: target.centerY,
    }
  }

  function eventPresentation(event) {
    const overlay = event.kind === 'phase' || event.kind === 'recovery' || event.kind === 'cutin'
    const attack = event.kind === 'attack'
    const detailLines = Array.isArray(event.detailLines) ? event.detailLines : []
    const attackTitle = attack
      ? event.groupHitsBySide || detailLines.length
        ? event.title
        : [
          event.attackerId && event.attackerName ? event.attackerName : '',
          event.title,
          event.detail,
        ].filter(Boolean).join(' · ')
      : ''
    return {
      showOverlay: overlay,
      phaseOverview: phaseOverview(event),
      narrationTitle: event.resultDrop || attackTitle,
      detailLines,
      groupHitsBySide: Boolean(attack && event.groupHitsBySide),
      showAttackDetails: Boolean(attack && !event.hideHitDetails),
    }
  }

  function eventLogSummary(event) {
    if (!event) return ''
    return String(
      event.resultDrop ||
      (Array.isArray(event.hits) ? event.hits.map(formatHit).join('；') : '') ||
      event.detail ||
      '',
    )
  }

  function createReplayApp(root, options = {}) {
    if (!root || typeof root.appendChild !== 'function') throw new TypeError('需要有效的挂载节点')
    const documentRef = root.ownerDocument || document
    const view = documentRef.defaultView || (typeof window !== 'undefined' ? window : globalThis)
    const element = (tag, className, text) => makeElement(documentRef, tag, className, text)
    const markerId = `kclr-shot-arrow-${++appSerial}`
    const state = {
      timeline: null,
      index: 0,
      playing: false,
      speed: 1,
      timer: null,
      drawFrame: null,
      destroyed: false,
      replayId: '',
      resumeOnVisible: false,
    }

    root.classList.add('kc-local-replay')
    const headerMarkup = options.showHeader === false ? '' : [
      '  <header class="kclr-header">',
      '    <div class="kclr-title-lockup"><p class="kclr-kicker">LOCAL BATTLE SEQUENCE</p><h1>本地战斗回放</h1></div>',
      theme ? `    ${theme.controlsMarkup()}` : '',
      '  </header>',
    ].join('')
    root.innerHTML = [
      '<section class="kclr-shell">',
      headerMarkup,
      '  <section class="kclr-import" data-importer>',
      '    <div><strong>本地数据入口</strong><small>选择 JSON 文件，或把 poi/KC3 数据粘贴到下方。数据不会离开本机。</small></div>',
      '    <label class="kclr-file-button">选择本地 JSON<input type="file" accept="application/json,.json,text/plain" data-file></label>',
      '    <textarea rows="3" spellcheck="false" placeholder="粘贴 JSON / svdata=..." data-paste></textarea>',
      '    <button type="button" data-load-text>读取粘贴内容</button>',
      '    <p class="kclr-error" data-error aria-live="polite"></p>',
      '  </section>',
      '  <section class="kclr-status" data-empty>',
      '    <p>等待战斗响应或本地 JSON</p>',
      '    <span>支持 poi 响应、原始 api_data，以及 KC3Kai sortie replay 结构。</span>',
      '  </section>',
      '  <main class="kclr-player" data-player hidden>',
      '    <section class="kclr-phase-head">',
      '      <h2 data-phase-overview aria-live="polite"></h2>',
      '    </section>',
      '    <section class="kclr-stage" data-stage>',
      '      <div class="kclr-side kclr-player-side" data-player-fleets></div>',
      '      <div class="kclr-centerline"></div>',
      '      <div class="kclr-side kclr-enemy-side" data-enemy-fleets></div>',
      '      <svg class="kclr-lines" data-lines aria-hidden="true"></svg>',
      '      <div class="kclr-phase-overlay" data-phase-overlay hidden>',
      '        <span data-overlay-kicker>PHASE</span>',
      '        <strong data-overlay-title>—</strong>',
      '        <small data-overlay-detail></small>',
      '      </div>',
      '    </section>',
      '    <section class="kclr-narration" data-narration-box>',
      '      <p data-narration>—</p>',
      '      <ul data-hits></ul>',
      '    </section>',
      '    <section class="kclr-controls">',
      '      <button type="button" data-first title="回到开始">↺</button>',
      '      <button type="button" data-prev title="上一步">←</button>',
      '      <button type="button" class="kclr-play" data-play>播放</button>',
      '      <button type="button" data-next title="下一步">→</button>',
      '      <div class="kclr-counter" aria-label="当前回放进度"><span data-current>0</span><span>/</span><span data-total>0</span></div>',
      '      <label>速度<select data-speed><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label>',
      '      <input type="range" min="0" max="0" value="0" data-range aria-label="回放进度">',
      '    </section>',
      '    <ol class="kclr-log" data-log></ol>',
      '  </main>',
      '</section>',
    ].join('')

    const $ = (selector) => root.querySelector(selector)
    const themeController = options.showHeader === false || !theme
      ? null
      : theme.createThemeController(root, { config: options.themeConfig || null })
    const refs = {
      importer: $('[data-importer]'), file: $('[data-file]'), paste: $('[data-paste]'),
      loadText: $('[data-load-text]'), error: $('[data-error]'), empty: $('[data-empty]'),
      player: $('[data-player]'), phaseOverview: $('[data-phase-overview]'),
      current: $('[data-current]'), total: $('[data-total]'),
      stage: $('[data-stage]'), playerFleets: $('[data-player-fleets]'),
      enemyFleets: $('[data-enemy-fleets]'), lines: $('[data-lines]'), narration: $('[data-narration]'),
      narrationBox: $('[data-narration-box]'),
      phaseOverlay: $('[data-phase-overlay]'), overlayKicker: $('[data-overlay-kicker]'),
      overlayTitle: $('[data-overlay-title]'), overlayDetail: $('[data-overlay-detail]'),
      hits: $('[data-hits]'), first: $('[data-first]'), prev: $('[data-prev]'), play: $('[data-play]'),
      next: $('[data-next]'), speed: $('[data-speed]'), range: $('[data-range]'), log: $('[data-log]'),
    }
    if (options.showImporter === false) refs.importer.hidden = true
    if (options.emptyText) refs.empty.querySelector('p').textContent = String(options.emptyText)
    if (options.hideEmptyState) refs.empty.hidden = true

    function clearTimer() {
      if (state.timer !== null) clearTimeout(state.timer)
      state.timer = null
    }

    function cancelLineDraw() {
      if (state.drawFrame !== null && typeof view.cancelAnimationFrame === 'function') {
        view.cancelAnimationFrame(state.drawFrame)
      }
      state.drawFrame = null
    }

    function pause() {
      state.playing = false
      clearTimer()
      refs.play.textContent = '播放'
    }

    function playbackHidden() {
      return Boolean(documentRef.hidden || root.hidden)
    }

    function schedule() {
      clearTimer()
      if (!state.playing || !state.timeline || state.destroyed) return
      if (state.index >= state.timeline.events.length - 1) {
        pause()
        return
      }
      state.timer = setTimeout(() => {
        state.index += 1
        render()
        schedule()
      }, eventDelay(state.timeline.events[state.index], state.speed))
    }

    function play(renderFirst = true) {
      if (!state.timeline) return
      if (options.pauseWhenHidden && playbackHidden()) {
        state.resumeOnVisible = true
        return
      }
      if (!canStartPlayback(state.index, state.timeline.events.length)) return
      state.playing = true
      refs.play.textContent = '暂停'
      if (renderFirst) render()
      schedule()
    }

    function setIndex(index) {
      if (!state.timeline) return
      pause()
      state.index = Math.max(0, Math.min(state.timeline.events.length - 1, Number(index) || 0))
      render()
    }

    function renderGroup(key, label, units, host, event, positionOffset = 0) {
      if (!units.length) return
      const section = element('section', 'kclr-fleet')
      section.dataset.groupKey = key
      section.appendChild(element('h3', '', label))
      const list = element('div', 'kclr-unit-list')
      units.forEach((unit) => {
        const card = element('article', 'kclr-unit')
        const unitDamageState = damageState(unit)
        card.dataset.unitId = unit.id
        card.dataset.damageState = unitDamageState
        const attackerIds = Array.isArray(event.attackerIds) ? event.attackerIds : []
        if (event.attackerId === unit.id || attackerIds.includes(unit.id)) card.classList.add('is-attacker')
        if (event.hits.some((hit) => hit.targetId === unit.id)) card.classList.add('is-target')
        if (event.recoveryId === unit.id) card.classList.add('is-recovered')
        if (unit.retreated) card.classList.add('is-retreated')
        else if (unit.nowHp <= 0) card.classList.add('is-sunk')

        const line1 = element('div', 'kclr-unit-head')
        line1.appendChild(element('strong', '', unit.name))
        line1.appendChild(element('span', 'kclr-damage-state', statusText(unit)))
        const hp = element('progress', 'kclr-hp')
        hp.max = Math.max(1, unit.maxHp)
        hp.value = unit.retreated ? 0 : Math.max(0, Math.min(unit.maxHp, unit.nowHp))
        hp.setAttribute('aria-label', `${unit.name} HP`)
        const line2 = element('div', 'kclr-unit-foot')
        const hpMeta = element('span', 'kclr-hp-meta')
        hpMeta.appendChild(element(
          'span',
          'kclr-hp-value',
          unit.retreated ? 'HP —' : `HP ${Math.max(0, unit.nowHp)} / ${unit.maxHp}`,
        ))
        damageControlLabels(unit).forEach((label) => {
          hpMeta.appendChild(element('b', 'kclr-damage-control', label))
        })
        line2.appendChild(hpMeta)
        const position = Math.max(1, unit.index - positionOffset + 1)
        line2.appendChild(element('span', '', unit.level ? `Lv ${unit.level}` : `#${position}`))
        card.append(line1, hp, line2)
        list.appendChild(card)
      })
      section.appendChild(list)
      host.appendChild(section)
    }

    function drawLines(event) {
      const svg = refs.lines
      while (svg.firstChild) svg.removeChild(svg.firstChild)
      if (event.kind !== 'attack' || !event.hits.length) return
      const stageRect = refs.stage.getBoundingClientRect()
      if (!stageRect.width || !stageRect.height) return
      svg.setAttribute('viewBox', `0 0 ${stageRect.width} ${stageRect.height}`)
      svg.setAttribute('width', stageRect.width)
      svg.setAttribute('height', stageRect.height)
      const defs = documentRef.createElementNS('http://www.w3.org/2000/svg', 'defs')
      const marker = documentRef.createElementNS('http://www.w3.org/2000/svg', 'marker')
      marker.setAttribute('id', markerId)
      marker.setAttribute('viewBox', '0 0 10 10')
      marker.setAttribute('refX', '10')
      marker.setAttribute('refY', '5')
      marker.setAttribute('markerWidth', '7')
      marker.setAttribute('markerHeight', '7')
      marker.setAttribute('orient', 'auto-start-reverse')
      marker.setAttribute('markerUnits', 'strokeWidth')
      const arrow = documentRef.createElementNS('http://www.w3.org/2000/svg', 'path')
      arrow.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z')
      arrow.setAttribute('class', 'kclr-shot-arrow')
      marker.appendChild(arrow)
      defs.appendChild(marker)
      svg.appendChild(defs)

      event.hits.forEach((hit) => {
        const target = refs.stage.querySelector(`[data-unit-id="${hit.targetId}"]`)
        if (!target) return
        const attackerId = hit.attackerId || event.attackerId
        const attackerNode = attackerId
          ? refs.stage.querySelector(`[data-unit-id="${attackerId}"]`)
          : null
        const attackerRect = attackerNode ? attackerNode.getBoundingClientRect() : null
        const sourceFromLeft = (hit.attackerSide || event.attackerSide) !== 'enemy'
        const targetRect = target.getBoundingClientRect()
        const fallbackStartX = sourceFromLeft ? stageRect.width * 0.42 : stageRect.width * 0.58
        const fallbackStartY = stageRect.height / 2
        const points = attackerRect
          ? cardEdgeLine(attackerRect, targetRect, stageRect)
          : {
              x1: fallbackStartX,
              y1: fallbackStartY,
              x2: fallbackStartX <= targetRect.left - stageRect.left + targetRect.width / 2
                ? targetRect.left - stageRect.left
                : targetRect.left - stageRect.left + targetRect.width,
              y2: targetRect.top - stageRect.top + targetRect.height / 2,
            }
        const line = documentRef.createElementNS('http://www.w3.org/2000/svg', 'line')
        line.setAttribute('x1', points.x1)
        line.setAttribute('y1', points.y1)
        line.setAttribute('x2', points.x2)
        line.setAttribute('y2', points.y2)
        line.setAttribute('class', 'kclr-shot-line')
        line.setAttribute('marker-end', `url(#${markerId})`)
        svg.appendChild(line)
      })
    }

    function renderLog(index) {
      refs.log.replaceChildren()
      const start = Math.max(0, index - 7)
      state.timeline.events.slice(start, index + 1).forEach((entry) => {
        const item = element('li', entry.id === index ? 'is-current' : '')
        item.appendChild(element('span', '', String(entry.id + 1).padStart(2, '0')))
        item.appendChild(element('b', '', entry.title))
        item.appendChild(element('em', '', eventLogSummary(entry)))
        refs.log.appendChild(item)
      })
    }

    function render() {
      if (!state.timeline) return
      const events = state.timeline.events
      const event = events[state.index]
      const presentation = eventPresentation(event)
      refs.phaseOverview.textContent = presentation.phaseOverview
      refs.current.textContent = state.index + 1
      refs.total.textContent = events.length
      refs.range.max = Math.max(0, events.length - 1)
      refs.range.value = state.index
      refs.prev.disabled = state.index === 0
      refs.first.disabled = state.index === 0
      refs.next.disabled = state.index >= events.length - 1
      refs.overlayKicker.textContent = overlayKicker(event)
      refs.overlayTitle.textContent = event.title
      refs.overlayDetail.textContent = event.detail
      refs.phaseOverlay.hidden = !presentation.showOverlay

      refs.playerFleets.replaceChildren()
      refs.enemyFleets.replaceChildren()
      cancelLineDraw()
      refs.lines.replaceChildren()
      const friendlyVisible = showsFriendlyFleet(event)
      const combinedLayout = usesCombinedLayout(event.snapshot, friendlyVisible)
      refs.playerFleets.classList.toggle('is-combined', combinedLayout)
      refs.enemyFleets.classList.toggle('is-combined', combinedLayout)
      if (friendlyVisible) {
        const [firstFleet, secondFleet] = friendlyFleetColumns(event.snapshot.friendMain)
        renderGroup(
          'friendMain',
          secondFleet.length ? '友军一队' : '友军舰队',
          firstFleet,
          refs.playerFleets,
          event,
        )
        renderGroup('friendEscort', '友军二队', secondFleet, refs.playerFleets, event, 7)
      }
      GROUP_META.forEach(([key, label]) => {
        if (friendlyVisible && key.startsWith('player')) return
        const host = key.startsWith('enemy') ? refs.enemyFleets : refs.playerFleets
        renderGroup(key, label, event.snapshot[key] || [], host, event)
      })

      refs.narration.textContent = presentation.narrationTitle
      refs.narrationBox.classList.toggle('is-grouped-attack', presentation.groupHitsBySide)
      refs.narrationBox.classList.toggle('has-detail-lines', presentation.detailLines.length > 0)
      refs.hits.replaceChildren()
      presentation.detailLines.forEach((line) => {
        refs.hits.appendChild(element('li', 'kclr-detail-line', line))
      })
      if (presentation.groupHitsBySide && event.hits.length) {
        ;[
          ['player', '我方攻击'],
          ['friend', '友军攻击'],
          ['enemy', '敌方攻击'],
        ].forEach(([side, label]) => {
          const sideHits = event.hits.filter((hit) => (hit.attackerSide || event.attackerSide) === side)
          if (!sideHits.length) return
          const row = element('li', 'kclr-attack-row')
          row.appendChild(element('b', '', label))
          row.appendChild(element('span', '', sideHits.map(formatHit).join('；')))
          refs.hits.appendChild(row)
        })
      } else if (presentation.showAttackDetails && event.hits.length) {
        event.hits.forEach((hit) => refs.hits.appendChild(element('li', '', formatHit(hit))))
      }
      renderLog(state.index)
      if (typeof view.requestAnimationFrame === 'function') {
        state.drawFrame = view.requestAnimationFrame(() => {
          state.drawFrame = null
          if (state.destroyed || !state.timeline || state.timeline.events[state.index] !== event) return
          drawLines(event)
        })
      } else {
        drawLines(event)
      }
    }

    function showError(error) {
      refs.error.textContent = error instanceof Error ? error.message : String(error)
    }

    function setReplay(input, setOptions = {}) {
      try {
        const timeline = core.buildTimeline(input)
        const sameBattle = state.replayId && state.replayId === timeline.replay.battleId
        const previousEventCount = state.timeline ? state.timeline.events.length : 0
        const wasAtEnd = state.timeline && state.index >= state.timeline.events.length - 1
        const wasPlaying = state.playing
        const previousIndex = state.index
        pause()
        state.timeline = timeline
        state.replayId = timeline.replay.battleId
        const requestedPhaseIndex = typeof setOptions.startAtPhase === 'string'
          ? timeline.events.findIndex((event) => event.phase === setOptions.startAtPhase)
          : -1
        state.index = requestedPhaseIndex >= 0
          ? requestedPhaseIndex
          : replayPosition(
            timeline.events.length,
            previousIndex,
            sameBattle,
            { ...setOptions, previousEventCount },
          )
        refs.error.textContent = ''
        refs.empty.hidden = true
        refs.player.hidden = false
        render()
        const shouldAutoplay = setOptions.autoplay !== false &&
          (requestedPhaseIndex >= 0 || !sameBattle || wasPlaying || wasAtEnd)
        if (shouldAutoplay) {
          if (options.pauseWhenHidden && playbackHidden()) state.resumeOnVisible = true
          else play(false)
        }
        if (typeof options.onLoad === 'function') options.onLoad(timeline)
        return timeline
      } catch (error) {
        showError(error)
        if (typeof options.onError === 'function') options.onError(error)
        return null
      }
    }

    function readFile(file) {
      if (!file) return
      const Reader = view.FileReader || FileReader
      const reader = new Reader()
      reader.addEventListener('load', () => setReplay(String(reader.result || ''), { autoplay: false }))
      reader.addEventListener('error', () => showError(new Error('无法读取本地文件')))
      reader.readAsText(file, 'utf-8')
    }

    refs.file.addEventListener('change', () => readFile(refs.file.files && refs.file.files[0]))
    refs.loadText.addEventListener('click', () => setReplay(refs.paste.value, { autoplay: false }))
    refs.first.addEventListener('click', () => setIndex(0))
    refs.prev.addEventListener('click', () => setIndex(state.index - 1))
    refs.next.addEventListener('click', () => setIndex(state.index + 1))
    refs.play.addEventListener('click', () => (state.playing ? pause() : play()))
    refs.speed.addEventListener('change', () => {
      state.speed = Math.max(0.25, Number(refs.speed.value) || 1)
      if (state.playing) schedule()
    })
    refs.range.addEventListener('input', () => setIndex(Number(refs.range.value)))

    const resizeHandler = () => {
      if (state.timeline) drawLines(state.timeline.events[state.index])
    }
    const visibilityHandler = () => {
      if (playbackHidden()) {
        state.resumeOnVisible = state.resumeOnVisible || state.playing
        pause()
      } else if (state.resumeOnVisible) {
        state.resumeOnVisible = false
        play()
      }
    }
    if (options.pauseWhenHidden) documentRef.addEventListener('visibilitychange', visibilityHandler)
    if (typeof view.ResizeObserver === 'function') {
      state.resizeObserver = new view.ResizeObserver(resizeHandler)
      state.resizeObserver.observe(refs.stage)
    } else if (view && typeof view.addEventListener === 'function') {
      view.addEventListener('resize', resizeHandler)
    }

    return {
      setReplay,
      play,
      pause,
      setIndex,
      setVisible(visible) {
        if (!visible) {
          state.resumeOnVisible = state.resumeOnVisible || state.playing
          pause()
        } else if (state.resumeOnVisible && !documentRef.hidden) {
          state.resumeOnVisible = false
          play()
        }
      },
      getTimeline: () => state.timeline,
      getIndex: () => state.index,
      isPlaying: () => state.playing,
      destroy() {
        state.destroyed = true
        pause()
        cancelLineDraw()
        if (themeController && typeof themeController.destroy === 'function') themeController.destroy()
        if (options.pauseWhenHidden) documentRef.removeEventListener('visibilitychange', visibilityHandler)
        if (state.resizeObserver) state.resizeObserver.disconnect()
        else if (view && typeof view.removeEventListener === 'function') view.removeEventListener('resize', resizeHandler)
        root.replaceChildren()
      },
    }
  }

  return {
    BASE_STEP_MS,
    cardEdgeLine,
    canStartPlayback,
    createReplayApp,
    damageState,
    damageControlLabels,
    eventLogSummary,
    eventPresentation,
    eventDelay,
    friendlyFleetColumns,
    overlayKicker,
    phaseOverview,
    replayPosition,
    showsFriendlyFleet,
    usesCombinedLayout,
  }
})
