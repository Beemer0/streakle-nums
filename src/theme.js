// JS handles on the design tokens defined in index.css, for inline styles.
// Change a colour in index.css, never here. These are var() strings, so never
// append a hex alpha (`${GOLD}33` is invalid CSS) — use
// rgba(var(--gold-rgb), 0.2); tokens.test.js guards this.
export const GOLD = 'var(--gold)'
export const CARD = 'var(--surface)'
export const BORDER = 'var(--border)'
export const INK = 'var(--ink)'
export const MUTED = 'var(--muted)'
