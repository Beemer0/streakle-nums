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

  it('are all defined, in index.css or by the component that uses them', () => {
    // A component may define a local size/colour variable in its <style>
    // block (`.wd-board{--wd-tile:52px}`) or inline style (`'--sc-cell': …`);
    // only that same file may then use it.
    const definedIn = (text) => new Set([...text.matchAll(/['"]?(--[a-z0-9-]+)['"]?\s*:/g)].map(m => m[1]))
    const global = definedIn(css)
    const missing = sources.flatMap(([file, text]) => {
      const local = definedIn(text)
      return [...text.matchAll(/var\((--[a-z0-9-]+)\)/g)]
        .map(m => m[1])
        .filter(t => !global.has(t) && !local.has(t))
        .map(t => `${file}: ${t}`)
    })
    expect([...new Set(missing)]).toEqual([])
  })
})
