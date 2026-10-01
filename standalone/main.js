(function startStandalone(scope) {
  'use strict'

  const host = document.getElementById('app')
  const app = scope.KCReplayLocal.createReplayApp(host, { showImporter: true })
  if (scope.KC_REPLAY_SAMPLE) app.setReplay(scope.KC_REPLAY_SAMPLE, { autoplay: false })
  scope.addEventListener('beforeunload', () => app.destroy(), { once: true })
})(globalThis)
