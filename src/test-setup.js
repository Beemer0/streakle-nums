// Runs before every test file (vite.config.js `test.setupFiles`). Tells React
// the tests drive it through act(), so it reports any state update that lands
// outside act() — a test asserting on a half-updated DOM — instead of warning
// that act() itself isn't supported.
globalThis.IS_REACT_ACT_ENVIRONMENT = true
