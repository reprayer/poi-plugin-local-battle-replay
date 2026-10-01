'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {
  BASE_STEP_MS,
  cardEdgeLine,
  canStartPlayback,
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
} = require('../src/replay-app')

test('uses the revised 1x timing and honors longer phase-specific pauses', () => {
  assert.equal(BASE_STEP_MS, 2140)
  assert.deepEqual(require('../src/core').EVENT_DURATIONS, {
    battleStart: 3200,
    formation: 3000,
    search: 3500,
    aviation: 3500,
    antiAirCutIn: 3000,
    damageControl: 3000,
    nightPhase: 3200,
    shortCombatPhase: 1800,
  })
  assert.equal(eventDelay({}, 1), 2140)
  assert.equal(eventDelay({ durationMs: 1800 }, 1), 1800)
  assert.equal(eventDelay({ durationMs: 3500 }, 1), 3500)
  assert.equal(eventDelay({ kind: 'cutin', durationMs: 3000 }, 1), 3000)
  assert.equal(eventDelay({ durationMs: 3000 }, 1), 3000)
  assert.equal(eventDelay({ durationMs: 3200 }, 2), 1600)
  assert.equal(eventDelay({}, 4), 535)
})

test('playback can resume in place but never implicitly restarts at the end', () => {
  assert.equal(canStartPlayback(2, 5), true)
  assert.equal(canStartPlayback(4, 5), false)
  assert.equal(canStartPlayback(0, 1), false)
})

test('damage-control badges show only remaining equipment', () => {
  assert.deepEqual(damageControlLabels({ damageControls: [42, 43] }), ['损管', '女神'])
  assert.deepEqual(damageControlLabels({ damageControls: [42, 42] }), ['损管×2'])
  assert.deepEqual(damageControlLabels({ damageControls: [] }), [])
  assert.deepEqual(damageControlLabels({ usedDamageControls: [43] }), [])
})

test('damage-state thresholds match healthy, light, medium, heavy, and sunk rules', () => {
  const stateAt = (nowHp) => damageState({ nowHp, maxHp: 100 })
  assert.equal(stateAt(76), 'healthy')
  assert.equal(stateAt(75), 'light')
  assert.equal(stateAt(51), 'light')
  assert.equal(stateAt(50), 'medium')
  assert.equal(stateAt(26), 'medium')
  assert.equal(stateAt(25), 'heavy')
  assert.equal(stateAt(1), 'heavy')
  assert.equal(stateAt(0), 'sunk')
  assert.equal(damageState({ nowHp: -1, maxHp: 100, retreated: true }), 'retreated')
})

test('four-column fleet layout activates for escort fleets or a 7+6 friendly fleet', () => {
  assert.equal(usesCombinedLayout({ playerEscort: [], enemyEscort: [] }), false)
  assert.equal(usesCombinedLayout({ playerEscort: [{}], enemyEscort: [] }), true)
  assert.equal(usesCombinedLayout({ playerEscort: [], enemyEscort: [{}] }), true)
  assert.equal(usesCombinedLayout({ playerEscort: [], enemyEscort: [], friendMain: Array(7).fill({}) }), false)
  assert.equal(usesCombinedLayout({ playerEscort: [], enemyEscort: [], friendMain: Array(8).fill({}) }), false)
  assert.equal(usesCombinedLayout({ playerEscort: [], enemyEscort: [], friendMain: Array(8).fill({}) }, true), true)
})

test('friendly display columns preserve flat attack indices while presenting 7+6 order', () => {
  const friends = Array.from({ length: 13 }, (_, index) => ({ id: `friend-main-${index}`, index }))
  const [firstFleet, secondFleet] = friendlyFleetColumns(friends)

  assert.deepEqual(firstFleet.map((unit) => unit.index), [0, 1, 2, 3, 4, 5, 6])
  assert.deepEqual(secondFleet.map((unit) => unit.index), [7, 8, 9, 10, 11, 12])
  assert.equal(secondFleet[0].id, 'friend-main-7')
})

test('night append advances from the old daytime end to the first new event', () => {
  const oldDaytimeEventCount = 18
  const oldDaytimeEnd = oldDaytimeEventCount - 1
  const newDayAndNightEventCount = 25

  assert.equal(
    replayPosition(
      newDayAndNightEventCount,
      oldDaytimeEnd,
      true,
      { preservePosition: true, previousEventCount: oldDaytimeEventCount },
    ),
    oldDaytimeEventCount,
  )
  assert.equal(
    replayPosition(
      newDayAndNightEventCount,
      9,
      true,
      { preservePosition: true, previousEventCount: oldDaytimeEventCount },
    ),
    9,
  )
  assert.equal(
    replayPosition(
      newDayAndNightEventCount,
      oldDaytimeEnd,
      false,
      { preservePosition: true },
    ),
    0,
  )
  assert.equal(
    replayPosition(
      newDayAndNightEventCount,
      0,
      true,
      { startAtEnd: true },
    ),
    newDayAndNightEventCount - 1,
  )
})

test('attack lines connect facing short-edge midpoints in either direction', () => {
  const stage = { left: 100, top: 50 }
  const leftCard = { left: 120, top: 70, width: 80, height: 40 }
  const rightCard = { left: 400, top: 130, width: 90, height: 60 }

  assert.deepEqual(cardEdgeLine(leftCard, rightCard, stage), {
    x1: 100,
    y1: 40,
    x2: 300,
    y2: 110,
  })
  assert.deepEqual(cardEdgeLine(rightCard, leftCard, stage), {
    x1: 300,
    y1: 110,
    x2: 100,
    y2: 40,
  })
})

test('event presentation assigns overview, overlay, and narration distinct roles', () => {
  assert.deepEqual(eventPresentation({
    phase: 'formation',
    kind: 'phase',
    title: '阵形与交战形态',
    detail: '我方 单纵阵',
  }), {
    showOverlay: true,
    phaseOverview: '',
    narrationTitle: '',
    detailLines: [],
    groupHitsBySide: false,
    showAttackDetails: false,
  })

  assert.deepEqual(eventPresentation({
    phase: 'hougeki1',
    kind: 'attack',
    title: '连击',
    detail: '攻击类型 2',
    attackerId: 'player-main-0',
    attackerName: '测试舰',
  }), {
    showOverlay: false,
    phaseOverview: '第一轮炮击',
    narrationTitle: '测试舰 · 连击 · 攻击类型 2',
    detailLines: [],
    groupHitsBySide: false,
    showAttackDetails: true,
  })

  assert.equal(eventPresentation({
    phase: 'openingAtack',
    kind: 'attack',
    title: '开幕雷击',
    detail: '',
    groupHitsBySide: true,
  }).narrationTitle, '开幕雷击')

  const zuiun = eventPresentation({
    phase: 'hougeki',
    kind: 'attack',
    title: '夜间瑞云攻击',
    detail: '攻击类型 200',
    attackerId: 'player-main-0',
    attackerName: '瑞云测试舰',
  })
  assert.equal(zuiun.showOverlay, false)
  assert.equal(zuiun.narrationTitle, '瑞云测试舰 · 夜间瑞云攻击 · 攻击类型 200')
})

test('dropped-ship log entry replaces the repeated result summary', () => {
  assert.equal(eventLogSummary({
    title: '战果报告',
    detail: '胜负判定 S · MVP 测试舰',
    resultDrop: '获得舰船：掉落测试舰',
    hits: [],
  }), '获得舰船：掉落测试舰')
  assert.equal(eventLogSummary({
    title: '战果报告',
    detail: '胜负判定 S · MVP 测试舰',
    resultDrop: '',
    hits: [],
  }), '胜负判定 S · MVP 测试舰')
})

test('phase overview uses only the requested stages and includes battle result', () => {
  assert.equal(phaseOverview({ phase: 'battleStart' }), '战斗开始')
  assert.equal(phaseOverview({ phase: 'airBaseAttack' }), '基地航空队')
  assert.equal(phaseOverview({ phase: 'kouku2' }), '航空战')
  assert.equal(phaseOverview({ phase: 'openingTaisen' }), '先制对潜')
  assert.equal(phaseOverview({ phase: 'openingAtack' }), '开幕雷击')
  assert.equal(phaseOverview({ phase: 'hougeki1' }), '第一轮炮击')
  assert.equal(phaseOverview({ phase: 'hougeki2' }), '第二轮炮击')
  assert.equal(phaseOverview({ phase: 'raigeki' }), '闭幕雷击')
  assert.equal(phaseOverview({ phase: 'friendly' }), '友军')
  assert.equal(phaseOverview({ phase: 'hougeki' }), '夜战')
  assert.equal(phaseOverview({ phase: 'result' }), '战果报告')
  for (const phase of ['searchStart', 'searchResult', 'smoke', 'formation', 'support', 'hougeki3', 'damageControl']) {
    assert.equal(phaseOverview({ phase }), '')
  }
})

test('phase overlays use specific English kickers instead of a generic PHASE label', () => {
  assert.equal(overlayKicker({ phase: 'searchStart', kind: 'phase' }), 'RECONNAISSANCE')
  assert.equal(overlayKicker({ phase: 'airBaseAttack', kind: 'phase' }), 'LAND-BASE AIR STRIKE')
  assert.equal(overlayKicker({ phase: 'hougeki2', kind: 'phase' }), 'SHELLING II')
  assert.equal(overlayKicker({ phase: 'result', kind: 'phase' }), 'BATTLE REPORT')
  assert.equal(overlayKicker({ phase: 'kouku', kind: 'cutin' }), 'ANTI-AIR CUT-IN')
  assert.equal(overlayKicker({ phase: 'damageControl', kind: 'recovery' }), 'DAMAGE CONTROL')
})

test('friendly events replace player fleets only during the friendly phase', () => {
  assert.equal(showsFriendlyFleet({ phase: 'friendly' }), true)
  assert.equal(showsFriendlyFleet({ phase: 'friendlyKouku' }), true)
  assert.equal(showsFriendlyFleet({ phase: 'hougeki' }), false)
  assert.equal(showsFriendlyFleet({ phase: 'damageControl' }), false)
})

test('UI source keeps arrows above cards, moves the counter, and provides scoped themes', () => {
  const root = path.resolve(__dirname, '..')
  const css = fs.readFileSync(path.join(root, 'styles/replay.css'), 'utf8')
  const app = fs.readFileSync(path.join(root, 'src/replay-app.js'), 'utf8')
  const theme = fs.readFileSync(path.join(root, 'src/theme.js'), 'utf8')
  const plugin = fs.readFileSync(path.join(root, 'index.js'), 'utf8')
  const standalone = fs.readFileSync(path.join(root, 'standalone/index.html'), 'utf8')

  assert.match(css, /\.kc-local-replay \[hidden\]\s*\{\s*display:\s*none\s*!important/)
  assert.match(css, /\.kclr-shot-line\s*\{[^}]*stroke-width:\s*3/)
  assert.match(css, /\.kclr-lines\s*\{[^}]*z-index:\s*3/)
  assert.match(app, /marker-end/)
  assert.match(app, /cardEdgeLine\(attackerRect,\s*targetRect,\s*stageRect\)/)
  assert.doesNotMatch(app, /kclr-hit-dot/)
  assert.doesNotMatch(`${app}\n${plugin}`, /零网络\s*·\s*仅内存/)
  assert.match(plugin, /showImporter:\s*false/)
  assert.match(plugin, /hideEmptyState:\s*true/)
  assert.match(css, /\.kclr-side\.is-combined\s*\{[^}]*grid-template-columns:\s*repeat\(2/)
  assert.match(css, /playerMain[^}]*grid-column:\s*1/)
  assert.match(css, /playerEscort[^}]*grid-column:\s*2/)
  assert.match(css, /enemyEscort[^}]*grid-column:\s*1/)
  assert.match(css, /enemyMain[^}]*grid-column:\s*2/)
  assert.match(css, /friendMain[^}]*grid-column:\s*1/)
  assert.match(css, /friendEscort[^}]*grid-column:\s*2/)
  assert.doesNotMatch(css, /friendMain[^}]*grid-column:\s*1\s*\/\s*-1/)
  assert.match(app, /friends\.slice\(0,\s*7\)/)
  assert.match(app, /friends\.slice\(7\)/)
  assert.match(css, /\.kclr-window-header h1\s*\{[^}]*margin:\s*5px 0 0/)
  assert.match(css, /\.kclr-header h1\s*\{[^}]*margin:\s*5px 0 0/)
  for (const group of ['playerMain', 'playerEscort', 'enemyEscort', 'enemyMain']) {
    assert.match(css, new RegExp(`${group}[^}]*grid-row:\\s*1`))
  }
  assert.match(css, /\.kclr-player-side\s*\{\s*justify-self:\s*start/)
  assert.match(css, /\.kclr-enemy-side\s*\{[^}]*justify-self:\s*end/)
  assert.match(css, /\.kclr-side\.is-combined\s*\{[^}]*width:\s*calc\(100%\s*-\s*58px\)/)
  assert.match(css, /min-width:\s*900px/)
  for (const state of ['healthy', 'light', 'medium', 'heavy']) {
    assert.match(css, new RegExp(`data-damage-state=["']${state}["']`))
  }
  assert.match(css, /--damage-healthy:\s*#389640/i)
  assert.match(css, /--damage-light:\s*#E7BE58/i)
  assert.match(css, /--damage-medium:\s*#D67B1E/i)
  assert.match(css, /--damage-heavy:\s*#BB4B2E/i)
  assert.match(css, /kclr-hp::?-webkit-progress-value/)
  assert.match(css, /kclr-hp::?-moz-progress-bar/)
  assert.match(app, /hit\.attackerId\s*\|\|\s*event\.attackerId/)
  assert.match(app, /attackerIds\.includes\(unit\.id\)/)
  const nextIndex = app.indexOf('data-next title="下一步"')
  const counterIndex = app.indexOf('class="kclr-counter"')
  const speedIndex = app.indexOf('速度<select')
  assert.ok(nextIndex >= 0 && nextIndex < counterIndex && counterIndex < speedIndex)
  assert.match(plugin, /theme\.controlsMarkup\(\)/)
  assert.match(app, /theme\.controlsMarkup\(\)/)
  assert.match(theme, /data-theme-choice="custom"/)
  assert.match(theme, /input type="color"/)
  assert.match(theme, /plugin\.poi-plugin-local-battle-replay\.theme/)
  assert.match(standalone, /src\/theme\.js/)
  assert.match(css, /\[data-theme="dark"\]/)
  assert.match(css, /\[data-theme="custom"\]/)
  assert.match(css, /--ink:\s*#3f3f3f/i)
  assert.match(css, /--paper:\s*#fffaf0/i)
  assert.match(app, /data-phase-overview/)
  assert.match(css, /\.kclr-phase-head\s*\{[^}]*height:\s*52px/)
  assert.match(css, /\.kclr-stage\s*\{[^}]*min-height:\s*400px/)
  assert.match(css, /\.kclr-narration\s*\{[^}]*height:\s*104px/)
  assert.match(css, /\.kclr-attack-row\s*\{[^}]*grid-template-columns:/)
  assert.match(css, /\.kclr-unit\.is-retreated\s*\{[^}]*opacity:/)
  assert.match(css, /\.kclr-mode-bar\s*\{[^}]*margin:\s*3px 0 12px[^}]*border-bottom:\s*2px/)
  assert.match(css, /\.kclr-mode-tabs button\s*\{[^}]*min-width:\s*132px[^}]*height:\s*36px/)
  assert.match(css, /\.kclr-theme-tabs\s*\{[^}]*height:\s*36px[^}]*border:\s*1px solid var\(--line\)/)
  assert.match(css, /\.kclr-theme-tabs button\s*\{[^}]*width:\s*auto[^}]*height:\s*34px[^}]*border:\s*0/)
  assert.match(css, /\.kclr-theme-tabs button\s*\{[^}]*font:\s*700 11px\/1[^}]*system-ui,\s*sans-serif[^}]*letter-spacing:\s*\.05em/)
  assert.doesNotMatch(css, /\.kclr-theme-tabs button\s*\{[^}]*ui-monospace/)
  assert.match(css, /\.kclr-theme-tabs button \+ button::before\s*\{[^}]*content:\s*"\/"/)
  assert.match(css, /\.kclr-theme-tabs button\.is-active\s*\{[^}]*text-decoration:\s*underline[^}]*text-underline-offset:\s*4px/)
  assert.match(css, /\.kclr-theme-editor\s*\{[^}]*grid-template-columns:\s*1fr[^}]*gap:\s*6px[^}]*width:\s*220px[^}]*padding:\s*12px/)
  assert.match(css, /\.kclr-theme-color-row\s*\{[^}]*grid-template-columns:\s*1fr 58px 54px[^}]*font:\s*700 14px/)
  assert.doesNotMatch(css, /\.kclr-theme-editor label\s*\{/)
  assert.match(css, /\.kclr-theme-editor input\[type="color"\]\s*\{[^}]*width:\s*58px[^}]*height:\s*30px/)
  assert.match(css, /\.kclr-theme-opacity\s*\{[^}]*width:\s*54px[^}]*height:\s*30px/)
  assert.match(css, /\.kclr-theme-actions\s*\{[^}]*grid-template-columns:\s*72px 116px/)
  assert.match(css, /\.kclr-theme-editor small\s*\{[^}]*font:\s*12px\/18px[^}]*text-align:\s*left/)
  assert.match(css, /\.kclr-theme-editor small:empty\s*\{[^}]*display:\s*none/)
  assert.doesNotMatch(css, /\.kclr-window-header\s*\{[^}]*border-bottom:/)
  assert.match(plugin, /class="kclr-mode-bar"[\s\S]*class="kclr-mode-tabs"[\s\S]*theme\.controlsMarkup/)
  assert.match(css, /\.kclr-import > button\s*\{[^}]*grid-column:\s*2[^}]*justify-self:\s*stretch/)
  assert.match(css, /\.kclr-unit\.is-attacker\s*\{[^}]*outline:\s*2px solid/)
  assert.match(css, /\.kclr-unit\.is-recovered\s*\{[^}]*outline:\s*3px double/)
  assert.doesNotMatch(css, /\.kclr-unit\.is-attacker\s*\{[^}]*border:\s*2px/)
  assert.doesNotMatch(css, /\.kclr-unit\.is-recovered\s*\{[^}]*border:\s*3px/)
  assert.match(css, /\.kclr-fleet\s*\{\s*min-width:\s*0;\s*\}/)
  assert.match(css, /\.kclr-unit-list\s*\{[^}]*gap:\s*5px/)
  assert.match(css, /\.kclr-counter\s*\{[^}]*font:\s*400 11px/)
  assert.doesNotMatch(app, /<b data-current>/)
  assert.match(css, /\.kclr-controls label,\s*\.kclr-controls > input\[type="range"\]\s*\{[^}]*top:\s*3px/)
  assert.match(css, /\.kclr-plugin-host \.kc-local-replay\s*\{\s*background:\s*transparent/)
  assert.match(css, /--page:\s*var\(--custom-page\)/)
  assert.match(css, /\.kclr-shot-line\s*\{[^}]*stroke:\s*var\(--line\)/)
  assert.match(css, /\.kclr-window-header h1\s*\{[^}]*font-weight:\s*900/)
  assert.match(css, /\.kclr-header h1\s*\{[^}]*font-weight:\s*900/)
  assert.match(css, /\.kclr-title-lockup\s*\{[^}]*text-align:\s*center/)
  assert.match(app, /class="kclr-title-lockup"[^>]*><p class="kclr-kicker">LOCAL BATTLE SEQUENCE/)
  assert.match(plugin, /class="kclr-title-lockup"[^>]*><p class="kclr-kicker">LOCAL BATTLE SEQUENCE/)
  assert.match(css, /\.kclr-window-header h1\s*\{[^}]*font-size:\s*clamp\(26px,\s*3vw,\s*34px\)/)
  assert.doesNotMatch(css, /\.kclr-phase-head\s*\{[^}]*border-bottom:/)
  assert.match(css, /\.kclr-phase-overlay small\s*\{[^}]*min-height:\s*42px/)
  assert.match(app, /cancelAnimationFrame\(state\.drawFrame\)/)
  assert.match(app, /state\.timeline\.events\[state\.index\]\s*!==\s*event/)
  assert.match(app, /else play\(false\)/)
  assert.ok(app.indexOf('refs.overlayDetail.textContent') < app.indexOf('refs.phaseOverlay.hidden'))
  assert.doesNotMatch(app, />交战线</)
  assert.match(css, /::-webkit-slider-runnable-track/)
  assert.match(css, /::-webkit-slider-thumb/)
  assert.match(css, /::-moz-range-track/)
  assert.match(css, /--damage-healthy:\s*#389640/i)
})
