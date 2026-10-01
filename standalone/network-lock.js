(function lockOutboundNetwork(scope) {
  'use strict'

  const deny = (name) => function deniedOutboundCall() {
    throw new Error(`本地回放页已阻止网络能力：${name}`)
  }
  const deniedConstructor = (name) => function DeniedNetworkConstructor() {
    throw new Error(`本地回放页已阻止网络能力：${name}`)
  }

  Object.defineProperty(scope, 'fetch', { configurable: false, writable: false, value: deny('fetch') })
  Object.defineProperty(scope, 'XMLHttpRequest', { configurable: false, writable: false, value: deniedConstructor('XMLHttpRequest') })
  Object.defineProperty(scope, 'WebSocket', { configurable: false, writable: false, value: deniedConstructor('WebSocket') })
  Object.defineProperty(scope, 'EventSource', { configurable: false, writable: false, value: deniedConstructor('EventSource') })

  if (scope.navigator) {
    Object.defineProperty(scope.navigator, 'sendBeacon', { configurable: false, writable: false, value: () => false })
  }
})(globalThis)
