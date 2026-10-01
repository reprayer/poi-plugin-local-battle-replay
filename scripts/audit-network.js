'use strict'

const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const runtimeFiles = ['index.js', 'src/core.js', 'src/replay-app.js', 'src/theme.js', 'standalone/main.js']
const forbidden = [
  ['fetch call', /\bfetch\s*\(/],
  ['network constructor', /\bnew\s+(?:XMLHttpRequest|WebSocket|EventSource)\b/],
  ['image constructor', /\bnew\s+Image\s*\(/],
  ['beacon call', /\bsendBeacon\s*\(/],
  ['axios', /\baxios\b/],
  ['jQuery ajax', /\$\.ajax\s*\(/],
  ['Node network/process module', /\brequire\s*\(\s*['"](?:node:)?(?:http|https|http2|net|tls|dgram|dns|child_process)['"]\s*\)/],
  ['clipboard read/write', /\bnavigator\.clipboard\b/],
  ['external window', /\bwindow\.open\s*\(/],
  ['dynamic evaluation', /\b(?:eval|Function)\s*\(/],
  ['browser persistence', /\b(?:localStorage|sessionStorage|indexedDB)\b/],
]

const violations = []
for (const file of runtimeFiles) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  for (const [label, pattern] of forbidden) {
    if (pattern.test(source)) violations.push(`${file}: ${label}`)
  }
}

const html = fs.readFileSync(path.join(root, 'standalone/index.html'), 'utf8')
if (!html.includes("connect-src 'none'")) violations.push('standalone/index.html: missing connect-src lock')
if (!html.includes("form-action 'none'")) violations.push('standalone/index.html: missing form-action lock')
if (/(?:src|href)\s*=\s*["'](?:https?:)?\/\//i.test(html)) {
  violations.push('standalone/index.html: external resource URL')
}

const css = fs.readFileSync(path.join(root, 'styles/replay.css'), 'utf8')
if (/@import\b/i.test(css) || /url\(\s*["']?(?:https?:)?\/\//i.test(css)) {
  violations.push('styles/replay.css: external import or resource URL')
}

if (violations.length) {
  process.stderr.write(`网络审计失败：\n${violations.map((item) => `- ${item}`).join('\n')}\n`)
  process.exitCode = 1
} else {
  process.stdout.write(`网络审计通过：${runtimeFiles.length} 个运行时文件无外发调用，独立页 CSP 已锁定。\n`)
}
