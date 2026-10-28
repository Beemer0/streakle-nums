// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'
import { GAMES, GROUPS } from './games'

// Keyboard focus on Home: the game list is the site's primary navigation, so
// every row needs a focus ring a sighted keyboard user can see (F159).

vi.mock('./saveResult', () => ({ saveResult: vi.fn() }))

// Home reads the player's results (none, unless a test sets some); the account
// menu asks which pools they're in.
const db = vi.hoisted(() => ({ results: [] }))
vi.mock('./supabase', () => {
  const query = () => {
    const q = { select: () => q, eq: () => q, then: (res, rej) => Promise.resolve({ data: db.results, error: null }).then(res, rej) }
    return q
  }
  return { supabase: { from: query, rpc: async () => ({ data: true, error: null }) } }
})

const { default: Home } = await import('./Home.jsx')
const { default: AppRoutes } = await import('./App.jsx')
const { refreshPoolMemberships } = await import('./usePoolMemberships.js')

const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8')
const css = source('./index.css')
const homeSource = source('./Home.jsx')

// ─── Colour maths (WCAG relative luminance) ─────────────────────────────────
const token = (name) => css.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`))[1]
const channels = (colour) => {
  const hex = colour.match(/^#([0-9a-f]{6})$/i)
  if (hex) return [0, 2, 4].map(i => parseInt(hex[1].slice(i, i + 2), 16))
  const rgb = colour.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (rgb) return rgb.slice(1, 4).map(Number)
  throw new Error(`Unparsed colour: ${colour}`)
}
const luminance = (colour) => {
  const [r, g, b] = channels(colour).map(v => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const px = (value) => parseFloat(value) || 0

// ─── Rendering ──────────────────────────────────────────────────────────────
let host, root
async function render(user = null) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(
      <AuthContext.Provider value={{ user, signOut: () => {} }}>
        <Home />
      </AuthContext.Provider>,
    )
  })
  await act(async () => { await new Promise(r => setTimeout(r, 0)) })
}
const gameRows = () => [...host.querySelectorAll('nav a.game-row')]
// Computed style, read only after focus has moved (happy-dom caches it).
async function focusedStyle(el) {
  await act(async () => { el.focus() })
  expect(document.activeElement).toBe(el)
  return getComputedStyle(el)
}

beforeAll(() => {
  // The global focus ring lives in index.css; Home's own <style> renders with it.
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
})
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-23T12:00:00'))
  refreshPoolMemberships()
  db.results = []
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.useRealTimers()
})

describe('Home game list focus ring', () => {
  it('draws every row\'s ring inside the row, clear of the group card\'s clip — first rows included', async () => {
    await render()
    const rows = gameRows()
    expect(rows.map(r => r.getAttribute('href'))).toEqual(GAMES.map(g => g.path))
    // The first row of each group is the one whose ring used to vanish entirely.
    const firsts = [...host.querySelectorAll('nav section')].map(s => s.querySelector('a.game-row'))
    expect(firsts).toHaveLength(GROUPS.length)
    expect(firsts.every(f => rows.includes(f))).toBe(true)

    for (const row of rows) {
      const name = row.getAttribute('href')
      const ring = await focusedStyle(row)
      const card = getComputedStyle(row.parentElement)
      // The group card clips its rows to its rounded corners…
      expect(card.overflow).toBe('hidden')
      expect(ring.outlineStyle, name).toBe('solid')
      expect(px(ring.outlineWidth), name).toBeGreaterThanOrEqual(2)
      // …so the ring's outer edge must sit inside the row's own border edge
      // (a later row paints over anything outside it)…
      const inset = -px(ring.outlineOffset) - px(ring.outlineWidth)
      expect(inset, name).toBeGreaterThanOrEqual(0)
      // …and its square corner inside the card's inner corner curve.
      const radius = px(card.borderTopLeftRadius) - px(card.borderTopWidth)
      expect(radius).toBeGreaterThan(0)
      expect(Math.SQRT2 * (radius - inset), name).toBeLessThanOrEqual(radius)
    }
  })

  it('puts the ring on the row\'s own surface, past the game stripe, at 3:1 or more at rest and hovered', async () => {
    await render()
    const hoverToken = homeSource.match(/\.game-row:hover\s*\{\s*background:\s*var\((--[a-z-]+)\)/)[1]
    for (const row of gameRows()) {
      const name = row.getAttribute('href')
      const ring = await focusedStyle(row)
      const stripe = px(ring.borderLeftWidth)
      expect(stripe, name).toBeGreaterThan(0)
      expect(-px(ring.outlineOffset) - px(ring.outlineWidth), name).toBeGreaterThanOrEqual(stripe)
      expect(channels(ring.outlineColor)).toEqual(channels(token('--gold')))
      expect(channels(ring.backgroundColor)).toEqual(channels(token('--surface')))
      expect(contrast(ring.outlineColor, ring.backgroundColor), name).toBeGreaterThanOrEqual(3)
      expect(contrast(ring.outlineColor, token(hoverToken)), name).toBeGreaterThanOrEqual(3)
    }
  })

  it('leaves Home\'s other focusable elements unclipped, with the global outset ring', async () => {
    await render({ id: 'u-1', email: 'u-1@example.com', user_metadata: { full_name: 'Uma' } })
    const trigger = host.querySelector('button[aria-label="Account menu"]')
    await act(async () => { trigger.click() })
    await act(async () => { await new Promise(r => setTimeout(r, 0)) })
    const footerLink = host.querySelector('footer a')
    const menuItems = [...host.querySelectorAll('a[href], button')]
      .filter(el => !el.classList.contains('game-row') && el !== footerLink)
    const names = menuItems.map(el => el.getAttribute('aria-label') || el.textContent.trim())
    expect(names).toEqual(['Account menu', '🏆 Pool History', 'Sign out'])

    for (const el of [footerLink, ...menuItems]) {
      const ring = await focusedStyle(el)
      expect(ring.outlineStyle).toBe('solid')
      expect(px(ring.outlineOffset)).toBeGreaterThanOrEqual(0)
      for (let up = el.parentElement; up && up !== document.body; up = up.parentElement) {
        expect(['visible', ''], `${el.textContent.trim()} inside a clipping box`).toContain(getComputedStyle(up).overflow)
      }
    }
  })
})

describe('Home rows\' call to action (F64)', () => {
  const cta = (path) => host.querySelector(`a.game-row[href="${path}"] .game-cta`).textContent

  it('says what a row opens: Play, Play Again, and a lost day\'s finished board', async () => {
    db.results = [
      { game: 'link', puzzle_date: '2026-10-23', completed: false },
      { game: 'words', puzzle_date: '2026-10-23', completed: true },
      { game: 'weave', puzzle_date: '2026-10-22', completed: false }, // yesterday's
    ]
    await render({ id: 'u-1', email: 'u-1@example.com', user_metadata: {} })

    const link = host.querySelector('a.game-row[href="/link"]')
    expect(link.textContent).toContain('✗ Tried')
    // The row opens today's game, where the finished board and its result
    // show — not the Archive, which only that page's own button opens.
    expect(cta('/link')).toBe('See result →')
    expect(cta('/words')).toBe('Play Again →')
    expect(cta('/weave')).toBe('Play →')
    expect(GAMES.filter(g => !['link', 'words'].includes(g.key)).every(g => cta(g.path) === 'Play →')).toBe(true)
    expect(host.textContent).not.toContain('Archive')
  })
})

describe('Home\'s Sign in link for guests (F263)', () => {
  async function renderApp() {
    window.history.replaceState(null, '', '/')
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: null, loading: false, signOut: async () => true }}>
          <AppRoutes />
        </AuthContext.Provider>,
      )
    })
  }

  it('scrolls away with the page instead of floating over the game rows', async () => {
    await renderApp()
    const link = host.querySelector('a.sign-in-banner')
    expect(link.getAttribute('href')).toBe('/login')
    const style = getComputedStyle(link)
    // Pinned to the page's top-right corner, where it always sat, rather than
    // to the screen, where a scrolled row's Play button slid under it.
    expect(style.position).toBe('absolute')
    expect([style.top, style.right]).toEqual(['16px', '16px'])
    for (let up = link.parentElement; up && up !== document.body; up = up.parentElement) {
      expect(['fixed', 'sticky']).not.toContain(getComputedStyle(up).position)
    }
  })
})
