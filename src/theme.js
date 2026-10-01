(function initReplayTheme(root, factory) {
  const api = factory()
  if (typeof module === 'object' && module.exports) module.exports = api
  if (root) root.KCReplayTheme = api
})(typeof globalThis !== 'undefined' ? globalThis : this, function replayThemeFactory() {
  'use strict'

  const CONFIG_PATH = 'plugin.poi-plugin-local-battle-replay.theme'
  const DEFAULT_THEME_SETTINGS = Object.freeze({
    mode: 'light',
    custom: Object.freeze({
      background: '#fffaf0',
      foreground: '#3f3f3f',
      backgroundOpacity: 100,
      foregroundOpacity: 100,
    }),
  })
  const THEME_MODES = new Set(['light', 'dark', 'custom'])
  const CUSTOM_VARIABLES = Object.freeze([
    '--custom-ink',
    '--custom-line',
    '--custom-page',
    '--custom-paper',
    '--custom-muted',
    '--custom-hairline',
    '--custom-soft',
    '--custom-target',
    '--custom-hp-track',
    '--custom-overlay',
    '--custom-overlay-border',
    '--custom-error',
  ])

  function normalizeHex(value, fallback) {
    const text = String(value || '').trim()
    return /^#[0-9a-f]{6}$/i.test(text) ? text.toLowerCase() : fallback
  }

  function normalizeOpacity(value, fallback = 100) {
    if (value === null || value === undefined || String(value).trim() === '') return fallback
    const number = Number(value)
    return Number.isFinite(number)
      ? Math.max(0, Math.min(100, Math.round(number)))
      : fallback
  }

  function normalizeThemeSettings(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
    const custom = source.custom && typeof source.custom === 'object' && !Array.isArray(source.custom)
      ? source.custom
      : {}
    return {
      mode: THEME_MODES.has(source.mode) ? source.mode : DEFAULT_THEME_SETTINGS.mode,
      custom: {
        background: normalizeHex(custom.background, DEFAULT_THEME_SETTINGS.custom.background),
        foreground: normalizeHex(custom.foreground, DEFAULT_THEME_SETTINGS.custom.foreground),
        backgroundOpacity: normalizeOpacity(
          custom.backgroundOpacity,
          DEFAULT_THEME_SETTINGS.custom.backgroundOpacity,
        ),
        foregroundOpacity: normalizeOpacity(
          custom.foregroundOpacity,
          DEFAULT_THEME_SETTINGS.custom.foregroundOpacity,
        ),
      },
    }
  }

  function hexChannels(value) {
    const hex = normalizeHex(value, '#000000')
    return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16))
  }

  function channelsHex(channels) {
    return `#${channels.map((value) => (
      Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')
    )).join('')}`
  }

  function mixHex(background, foreground, foregroundWeight) {
    const from = hexChannels(background)
    const to = hexChannels(foreground)
    const weight = Math.max(0, Math.min(1, Number(foregroundWeight) || 0))
    return channelsHex(from.map((channel, index) => channel + ((to[index] - channel) * weight)))
  }

  function rgbaHex(value, alpha) {
    const [red, green, blue] = hexChannels(value)
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`
  }

  function colorWithOpacity(value, opacity) {
    const normalizedColor = normalizeHex(value, '#000000')
    const normalizedOpacity = normalizeOpacity(opacity)
    return normalizedOpacity === 100
      ? normalizedColor
      : rgbaHex(normalizedColor, normalizedOpacity / 100)
  }

  function relativeLuminance(value) {
    const channels = hexChannels(value).map((channel) => {
      const normalized = channel / 255
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4
    })
    return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2])
  }

  function deriveCustomTheme(customValue) {
    const normalized = normalizeThemeSettings({ mode: 'custom', custom: customValue }).custom
    const paper = normalized.background
    const ink = normalized.foreground
    const backgroundOpacity = normalized.backgroundOpacity
    const foregroundOpacity = normalized.foregroundOpacity
    const darkBackground = relativeLuminance(paper) < 0.34
    return {
      '--custom-ink': colorWithOpacity(ink, foregroundOpacity),
      '--custom-line': ink,
      '--custom-page': colorWithOpacity(paper, backgroundOpacity),
      '--custom-paper': paper,
      '--custom-muted': colorWithOpacity(mixHex(paper, ink, 0.7), foregroundOpacity),
      '--custom-hairline': mixHex(paper, ink, 0.2),
      '--custom-soft': mixHex(paper, ink, 0.06),
      '--custom-target': mixHex(paper, ink, 0.12),
      '--custom-hp-track': mixHex(paper, ink, 0.2),
      '--custom-overlay': rgbaHex(paper, 0.87),
      '--custom-overlay-border': rgbaHex(ink, 0.35),
      '--custom-error': darkBackground ? '#e59986' : '#9a3e2b',
    }
  }

  function applyTheme(host, value) {
    if (!host || !host.style || !host.dataset) return normalizeThemeSettings(value)
    const settings = normalizeThemeSettings(value)
    CUSTOM_VARIABLES.forEach((name) => host.style.removeProperty(name))
    if (settings.mode === 'custom') {
      const variables = deriveCustomTheme(settings.custom)
      Object.entries(variables).forEach(([name, color]) => host.style.setProperty(name, color))
    }
    host.dataset.theme = settings.mode
    return settings
  }

  function getConfigApi(scope) {
    const config = scope && scope.config
    return config && typeof config.get === 'function' && typeof config.set === 'function'
      ? config
      : null
  }

  function readThemeSettings(config) {
    if (!config || typeof config.get !== 'function') return normalizeThemeSettings()
    try {
      return normalizeThemeSettings(config.get(CONFIG_PATH, DEFAULT_THEME_SETTINGS))
    } catch (_error) {
      return normalizeThemeSettings()
    }
  }

  function saveThemeSettings(config, value) {
    if (!config || typeof config.set !== 'function') return false
    try {
      config.set(CONFIG_PATH, normalizeThemeSettings(value))
      return true
    } catch (_error) {
      return false
    }
  }

  function controlsMarkup() {
    return [
      '<div class="kclr-theme-tools" data-theme-controls>',
      '  <div class="kclr-theme-tabs" role="group" aria-label="播放器配色">',
      '    <button type="button" data-theme-choice="light">LIGHT</button>',
      '    <button type="button" data-theme-choice="dark">DARK</button>',
      '    <button type="button" data-theme-choice="custom">CUSTOM</button>',
      '  </div>',
      '  <section class="kclr-theme-editor" data-theme-editor hidden>',
      '    <div class="kclr-theme-color-row"><span>背景</span><input type="color" data-theme-background aria-label="自定义背景色"><div class="kclr-theme-opacity"><input type="number" min="0" max="100" step="1" inputmode="numeric" data-theme-background-opacity aria-label="背景透明度百分比"><span>%</span></div></div>',
      '    <div class="kclr-theme-color-row"><span>文字</span><input type="color" data-theme-foreground aria-label="自定义主文字色"><div class="kclr-theme-opacity"><input type="number" min="0" max="100" step="1" inputmode="numeric" data-theme-foreground-opacity aria-label="文字透明度百分比"><span>%</span></div></div>',
      '    <small data-theme-status aria-live="polite"></small>',
      '    <div class="kclr-theme-actions">',
      '      <button type="button" data-theme-reset>重置</button>',
      '      <button type="button" data-theme-save>应用并保存</button>',
      '    </div>',
      '  </section>',
      '</div>',
    ].join('')
  }

  function createThemeController(themeRoot, options = {}) {
    if (!themeRoot || typeof themeRoot.querySelector !== 'function') return null
    const controls = themeRoot.querySelector('[data-theme-controls]')
    if (!controls) return null
    const scope = typeof globalThis !== 'undefined' ? globalThis : null
    const documentRef = themeRoot.ownerDocument || (scope && scope.document)
    const config = Object.prototype.hasOwnProperty.call(options, 'config')
      ? options.config
      : getConfigApi(scope)
    const buttons = Array.from(controls.querySelectorAll('[data-theme-choice]'))
    const editor = controls.querySelector('[data-theme-editor]')
    const background = controls.querySelector('[data-theme-background]')
    const foreground = controls.querySelector('[data-theme-foreground]')
    const backgroundOpacity = controls.querySelector('[data-theme-background-opacity]')
    const foregroundOpacity = controls.querySelector('[data-theme-foreground-opacity]')
    const reset = controls.querySelector('[data-theme-reset]')
    const save = controls.querySelector('[data-theme-save]')
    const status = controls.querySelector('[data-theme-status]')
    let settings = readThemeSettings(config)
    let draft = { ...settings.custom }
    let colorPickerActive = false
    let colorPickerReleaseTimer = null

    function setStatus(text) {
      status.textContent = String(text || '')
    }

    function showTheme(mode, custom = settings.custom) {
      applyTheme(themeRoot, { mode, custom })
      buttons.forEach((button) => {
        const active = button.dataset.themeChoice === mode
        button.classList.toggle('is-active', active)
        button.setAttribute('aria-pressed', String(active))
      })
    }

    function persist(nextSettings, successText) {
      settings = normalizeThemeSettings(nextSettings)
      const saved = saveThemeSettings(config, settings)
      setStatus(saved ? String(successText || '') : '仅当前页面生效')
      return saved
    }

    function releaseColorPickerAfterCurrentEvent() {
      if (colorPickerReleaseTimer !== null) clearTimeout(colorPickerReleaseTimer)
      colorPickerReleaseTimer = setTimeout(() => {
        colorPickerActive = false
        colorPickerReleaseTimer = null
      }, 0)
    }

    function closeFromOutside(event) {
      const target = event && event.target
      if (controls.contains(target)) {
        if (colorPickerActive && target !== background && target !== foreground) {
          releaseColorPickerAfterCurrentEvent()
        }
        return
      }
      if (colorPickerActive) {
        releaseColorPickerAfterCurrentEvent()
        return
      }
      editor.hidden = true
    }

    function previewDraft() {
      draft = normalizeThemeSettings({
        mode: 'custom',
        custom: {
          background: normalizeHex(background.value, settings.custom.background),
          foreground: normalizeHex(foreground.value, settings.custom.foreground),
          backgroundOpacity: normalizeOpacity(
            backgroundOpacity.value,
            settings.custom.backgroundOpacity,
          ),
          foregroundOpacity: normalizeOpacity(
            foregroundOpacity.value,
            settings.custom.foregroundOpacity,
          ),
        },
      }).custom
      showTheme('custom', draft)
      setStatus('预览中，尚未保存')
    }

    function syncInputs(custom) {
      background.value = custom.background
      foreground.value = custom.foreground
      backgroundOpacity.value = String(custom.backgroundOpacity)
      foregroundOpacity.value = String(custom.foregroundOpacity)
    }

    function chooseMode(mode) {
      if (!THEME_MODES.has(mode)) return
      if (mode === 'custom') {
        const alreadyCustom = themeRoot.dataset.theme === 'custom'
        if (!alreadyCustom) {
          draft = { ...settings.custom }
          syncInputs(draft)
          showTheme('custom', draft)
          persist({ ...settings, mode: 'custom' }, '')
          editor.hidden = false
        } else {
          editor.hidden = !editor.hidden
        }
        return
      }
      draft = { ...settings.custom }
      editor.hidden = true
      showTheme(mode)
      persist({ ...settings, mode }, '')
    }

    buttons.forEach((button) => {
      button.addEventListener('click', () => chooseMode(button.dataset.themeChoice))
    })
    ;[background, foreground].forEach((input) => {
      input.addEventListener('mousedown', () => {
        colorPickerActive = true
      })
      input.addEventListener('click', () => {
        colorPickerActive = true
      })
      input.addEventListener('input', previewDraft)
      input.addEventListener('change', () => {
        previewDraft()
        releaseColorPickerAfterCurrentEvent()
      })
      input.addEventListener('blur', releaseColorPickerAfterCurrentEvent)
    })
    ;[backgroundOpacity, foregroundOpacity].forEach((input) => {
      input.addEventListener('input', previewDraft)
      input.addEventListener('change', () => {
        previewDraft()
        syncInputs(draft)
      })
      input.addEventListener('blur', () => {
        previewDraft()
        syncInputs(draft)
      })
    })
    reset.addEventListener('click', () => {
      draft = { ...DEFAULT_THEME_SETTINGS.custom }
      syncInputs(draft)
      showTheme('custom', draft)
      setStatus('已恢复默认预览，尚未保存')
    })
    save.addEventListener('click', () => {
      settings = normalizeThemeSettings({ mode: 'custom', custom: draft })
      showTheme('custom', settings.custom)
      persist(settings, '已保存自定义配色')
    })

    if (documentRef && typeof documentRef.addEventListener === 'function') {
      documentRef.addEventListener('mousedown', closeFromOutside)
    }

    syncInputs(settings.custom)
    showTheme(settings.mode, settings.custom)
    if (!config) setStatus('独立页面：仅当前页面生效')

    return {
      destroy() {
        if (colorPickerReleaseTimer !== null) clearTimeout(colorPickerReleaseTimer)
        if (documentRef && typeof documentRef.removeEventListener === 'function') {
          documentRef.removeEventListener('mousedown', closeFromOutside)
        }
      },
      getSettings: () => normalizeThemeSettings({
        mode: themeRoot.dataset.theme,
        custom: themeRoot.dataset.theme === 'custom' ? draft : settings.custom,
      }),
    }
  }

  return {
    CONFIG_PATH,
    CUSTOM_VARIABLES,
    DEFAULT_THEME_SETTINGS,
    applyTheme,
    colorWithOpacity,
    controlsMarkup,
    createThemeController,
    deriveCustomTheme,
    getConfigApi,
    mixHex,
    normalizeHex,
    normalizeOpacity,
    normalizeThemeSettings,
    readThemeSettings,
    saveThemeSettings,
  }
})
