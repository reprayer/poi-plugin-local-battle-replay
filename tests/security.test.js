'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

test('standalone CSP denies every outbound connection class', () => {
  const html = read('standalone/index.html')

  assert.match(html, /connect-src 'none'/)
  assert.match(html, /form-action 'none'/)
  assert.match(html, /object-src 'none'/)
  assert.match(html, /frame-src 'none'/)
  assert.doesNotMatch(html, /<form\b/i)
})

test('runtime does not invoke network or upload primitives', () => {
  const runtimeFiles = [
    'index.js',
    'src/core.js',
    'src/replay-app.js',
    'src/theme.js',
    'standalone/main.js',
  ]

  const forbidden = [
    /\bfetch\s*\(/,
    /\bnew\s+(?:XMLHttpRequest|WebSocket|EventSource)\b/,
    /\bnew\s+Image\s*\(/,
    /\bsendBeacon\s*\(/,
    /\baxios\b/,
    /\$\.ajax\s*\(/,
    /\brequire\s*\(\s*['"](?:node:)?(?:http|https|http2|net|tls|dgram|dns|child_process)['"]\s*\)/,
    /\bnavigator\.clipboard\b/,
    /\bwindow\.open\s*\(/,
    /\b(?:eval|Function)\s*\(/,
    /\b(?:localStorage|sessionStorage|indexedDB)\b/,
  ]

  runtimeFiles.forEach((file) => {
    const source = read(file)

    forbidden.forEach((pattern) => {
      assert.doesNotMatch(source, pattern, `${file} contains ${pattern}`)
    })
  })
})

test('HTML and CSS contain no external resource references', () => {
  assert.doesNotMatch(
    read('standalone/index.html'),
    /(?:src|href)\s*=\s*["'](?:https?:)?\/\//i,
  )

  assert.doesNotMatch(
    read('styles/replay.css'),
    /@import\b/i,
  )

  assert.doesNotMatch(
    read('styles/replay.css'),
    /url\(\s*["']?(?:https?:)?\/\//i,
  )
})

test('standalone lock replaces outbound browser capabilities with denials', () => {
  const lock = read('standalone/network-lock.js')

  for (const primitive of [
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    'EventSource',
    'sendBeacon',
  ]) {
    assert.match(lock, new RegExp(`['"]${primitive}['"]`))
  }

  assert.match(lock, /throw new Error/)
})

test('published package includes standalone, examples, and attribution', () => {
  const packageJson = JSON.parse(read('package.json'))

  assert.equal(packageJson.version, '1.0.0')
  assert.equal(packageJson.publishConfig.access, 'public')
  assert.equal(packageJson.private, undefined)

  assert.ok(packageJson.files.includes('index.js'))
  assert.ok(packageJson.files.includes('src/'))
  assert.ok(packageJson.files.includes('styles/'))
  assert.ok(packageJson.files.includes('standalone/'))
  assert.ok(packageJson.files.includes('examples/'))
  assert.ok(packageJson.files.includes('REFERENCES.md'))

  const references = read('REFERENCES.md')

  for (const project of [
    'poooi/poi',
    'poooi/plugin-prophet',
    'KC3Kai/KC3Kai',
    'KC3Kai/kancolle-replay',
  ]) {
    assert.ok(
      references.includes(project),
      `REFERENCES.md should mention ${project}`,
    )
  }

  assert.match(
    references,
    /不联网补全舰名、节点、装备或其他资料/,
  )
})