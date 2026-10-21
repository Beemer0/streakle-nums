import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'

// Colours are CSS custom properties (index.css), so a hex alpha suffix on one
// — `${GOLD}33`, 'var(--gold)40' — is invalid CSS the browser silently drops.
const SRC = new URL('.', import.meta.url)
const sources = readdirSync(SRC)
  .filter(f => f.endsWith('.jsx'))
  .map(f => [f, readFileSync(new URL(f, SRC), 'utf8')])
const css = readFileSync(new URL('index.css', SRC), 'utf8')

describe('design tokens', () => {
  it('are never given a hex alpha suffix', () => {
    const bad = /var\(--[a-z0-9-]+\)[0-9a-fA-F]{2}\b|\$\{(GOLD|CARD|BORDER|INK|MUTED)\}[0-9a-fA-F]{2}\b/
    expect(sources.filter(([, text]) => bad.test(text)).map(([f]) => f)).toEqual([])
  })

  it('are all defined in index.css', () => {
    const defined = new Set([...css.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map(m => m[1]))
    const used = new Set(sources.flatMap(([, text]) => [...text.matchAll(/var\((--[a-z0-9-]+)\)/g)].map(m => m[1])))
    // Scramble sets --sc-cell on its own board.
    const missing = [...used].filter(t => !defined.has(t) && !t.startsWith('--sc-'))
    expect(missing).toEqual([])
  })
})
