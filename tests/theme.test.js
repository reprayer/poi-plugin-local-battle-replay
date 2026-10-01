'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const theme = require('../src/theme')

test('theme settings accept only known modes, hexadecimal colors, and 0-100 opacity', () => {
  assert.deepEqual(theme.normalizeThemeSettings({
    mode: 'custom',
    custom: {
      background: '#123ABC',
      foreground: '#fedcba',
      backgroundOpacity: 0,
      foregroundOpacity: 62.6,
    },
  }), {
    mode: 'custom',
    custom: {
      background: '#123abc',
      foreground: '#fedcba',
      backgroundOpacity: 0,
      foregroundOpacity: 63,
    },
  })

  assert.deepEqual(theme.normalizeThemeSettings({
    mode: 'remote',
    custom: {
      background: 'url(https://invalid.example)',
      foreground: '#fff',
      backgroundOpacity: -10,
      foregroundOpacity: 800,
    },
  }), {
    mode: 'light',
    custom: {
      background: '#fffaf0',
      foreground: '#3f3f3f',
      backgroundOpacity: 0,
      foregroundOpacity: 100,
    },
  })
})

test('custom theme derives only the fixed local CSS variable allowlist', () => {
  const variables = theme.deriveCustomTheme({
    background: '#102030',
    foreground: '#f0e0d0',
    backgroundOpacity: 25,
    foregroundOpacity: 60,
  })

  assert.deepEqual(Object.keys(variables), [...theme.CUSTOM_VARIABLES])
  assert.equal(variables['--custom-paper'], '#102030')
  assert.equal(variables['--custom-page'], 'rgba(16, 32, 48, 0.25)')
  assert.equal(variables['--custom-ink'], 'rgba(240, 224, 208, 0.6)')
  assert.equal(variables['--custom-line'], '#f0e0d0')
  assert.match(variables['--custom-overlay'], /^rgba\(\d+, \d+, \d+, 0\.87\)$/)
  Object.values(variables).forEach((value) => {
    assert.doesNotMatch(value, /url|https?|@import/i)
  })
})

test('theme config uses the package namespace and preserves existing window bounds', () => {
  const data = {
    plugin: {
      'poi-plugin-local-battle-replay': {
        bounds: { x: 41, y: 69, width: 898, height: 912 },
      },
    },
  }
  const config = {
    get(configPath, fallback) {
      assert.equal(configPath, theme.CONFIG_PATH)
      return data.plugin['poi-plugin-local-battle-replay'].theme || fallback
    },
    set(configPath, value) {
      assert.equal(configPath, theme.CONFIG_PATH)
      data.plugin['poi-plugin-local-battle-replay'].theme = value
    },
  }

  assert.equal(theme.saveThemeSettings(config, {
    mode: 'custom',
    custom: {
      background: '#111111',
      foreground: '#eeeeee',
      backgroundOpacity: 21,
      foregroundOpacity: 82,
    },
  }), true)
  assert.deepEqual(data.plugin['poi-plugin-local-battle-replay'].bounds, {
    x: 41,
    y: 69,
    width: 898,
    height: 912,
  })
  assert.deepEqual(theme.readThemeSettings(config), {
    mode: 'custom',
    custom: {
      background: '#111111',
      foreground: '#eeeeee',
      backgroundOpacity: 21,
      foregroundOpacity: 82,
    },
  })
})

test('missing poi config falls back to memory without browser persistence', () => {
  assert.equal(theme.getConfigApi({}), null)
  assert.equal(theme.saveThemeSettings(null, { mode: 'dark' }), false)
  assert.deepEqual(theme.readThemeSettings(null), {
    mode: 'light',
    custom: {
      background: '#fffaf0',
      foreground: '#3f3f3f',
      backgroundOpacity: 100,
      foregroundOpacity: 100,
    },
  })

  const values = new Map()
  const host = {
    dataset: {},
    style: {
      setProperty(name, value) { values.set(name, value) },
      removeProperty(name) { values.delete(name) },
    },
  }
  theme.applyTheme(host, {
    mode: 'custom',
    custom: { background: '#222222', foreground: '#dddddd' },
  })
  assert.equal(host.dataset.theme, 'custom')
  assert.equal(values.get('--custom-paper'), '#222222')
  assert.equal(values.get('--custom-page'), '#222222')
  assert.equal(values.get('--custom-ink'), '#dddddd')

  const source = fs.readFileSync(path.resolve(__dirname, '../src/theme.js'), 'utf8')
  assert.doesNotMatch(source, /\b(?:localStorage|sessionStorage|indexedDB)\b/)
  assert.match(source, /addEventListener\('mousedown', closeFromOutside\)/)
  assert.match(source, /removeEventListener\('mousedown', closeFromOutside\)/)
  assert.doesNotMatch(source, /keydown|keyup|keyCode/)
  assert.match(source, /已保存自定义配色/)
  assert.doesNotMatch(source, /已记住 CUSTOM|CUSTOM 配色已保存/)
  assert.doesNotMatch(theme.controlsMarkup(), /textarea|contenteditable/i)
  assert.match(theme.controlsMarkup(), /input type="color"/)
  assert.match(theme.controlsMarkup(), /input type="number" min="0" max="100"/)
  assert.match(theme.controlsMarkup(), /class="kclr-theme-color-row"/)
  assert.doesNotMatch(theme.controlsMarkup(), /<label/)
  assert.match(source, /let colorPickerActive = false/)
  assert.match(source, /input\.addEventListener\('change',/)
  assert.match(source, /if \(colorPickerActive\)\s*\{[\s\S]*releaseColorPickerAfterCurrentEvent\(\)[\s\S]*return/)
  assert.ok(
    theme.controlsMarkup().indexOf('data-theme-status') <
    theme.controlsMarkup().indexOf('class="kclr-theme-actions"'),
  )
})

test('dismissing a native color picker keeps CUSTOM open and preserves its draft', async () => {
  const makeElement = (dataset = {}) => {
    const listeners = new Map()
    return {
      dataset,
      hidden: false,
      value: '',
      textContent: '',
      classList: { toggle() {} },
      setAttribute() {},
      addEventListener(type, listener) { listeners.set(type, listener) },
      dispatch(type, event = {}) {
        const listener = listeners.get(type)
        if (listener) listener({ target: this, ...event })
      },
    }
  }
  const light = makeElement({ themeChoice: 'light' })
  const dark = makeElement({ themeChoice: 'dark' })
  const custom = makeElement({ themeChoice: 'custom' })
  const editor = makeElement()
  editor.hidden = true
  const background = makeElement()
  const foreground = makeElement()
  const backgroundOpacity = makeElement()
  const foregroundOpacity = makeElement()
  const reset = makeElement()
  const save = makeElement()
  const status = makeElement()
  const inside = new Set([
    light, dark, custom, editor, background, foreground,
    backgroundOpacity, foregroundOpacity, reset, save, status,
  ])
  const selectors = new Map([
    ['[data-theme-editor]', editor],
    ['[data-theme-background]', background],
    ['[data-theme-foreground]', foreground],
    ['[data-theme-background-opacity]', backgroundOpacity],
    ['[data-theme-foreground-opacity]', foregroundOpacity],
    ['[data-theme-reset]', reset],
    ['[data-theme-save]', save],
    ['[data-theme-status]', status],
  ])
  const controls = {
    querySelectorAll: () => [light, dark, custom],
    querySelector: (selector) => selectors.get(selector),
    contains: (target) => inside.has(target),
  }
  let documentMouseDown = null
  const documentRef = {
    addEventListener(type, listener) {
      if (type === 'mousedown') documentMouseDown = listener
    },
    removeEventListener() {},
  }
  const properties = new Map()
  const themeRoot = {
    dataset: {},
    ownerDocument: documentRef,
    querySelector: () => controls,
    style: {
      setProperty(name, value) { properties.set(name, value) },
      removeProperty(name) { properties.delete(name) },
    },
  }
  const controller = theme.createThemeController(themeRoot, { config: null })

  custom.dispatch('click')
  assert.equal(editor.hidden, false)

  background.value = '#123456'
  background.dispatch('mousedown')
  background.dispatch('input')
  backgroundOpacity.value = '37'
  backgroundOpacity.dispatch('input')
  documentMouseDown({ target: {} })
  assert.equal(editor.hidden, false)
  assert.equal(controller.getSettings().custom.background, '#123456')
  assert.equal(controller.getSettings().custom.backgroundOpacity, 37)

  await new Promise((resolve) => setImmediate(resolve))
  documentMouseDown({ target: {} })
  assert.equal(editor.hidden, true)
  controller.destroy()
})
