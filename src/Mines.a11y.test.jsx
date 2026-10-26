// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { StrictMode, act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'
import { generateBoard, openingState, dig, isWon, HIDDEN, MAX_ATTEMPTS } from './mines/engine'

// Mines accessibility: undug tiles read apart from dug ones at 3:1 (F39), and
// the Dig / Flag toggle's focus ring is drawn where its clipped box shows it,
// dark on the pressed gold button (F159). Focus is never hidden behind the
// phone layout's fixed bar (2.4.11), and moves on when a clear, a new rung or
// the day's end removes or disables the control that had it (2.4.3).

const { saveResult } = vi.hoisted(() => ({ saveResult: vi.fn() }))
vi.mock('./saveResult', () => ({ saveResult }))

// The Archive and streak reads find no history; nobody belongs to a pool.
vi.mock('./supabase', () => {
  const query = () => {
    const q = { select: () => q, eq: () => q, then: (res, rej) => Promise.resolve({ data: [], error: null }).then(res, rej) }
    return q
  }
  return {
    supabase: {
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
      rpc: async () => ({ data: false, error: null }),
      from: query,
    },
  }
})

// Node 25's own localStorage (no --localstorage-file, so no methods) shadows
// happy-dom's; each test gets a fresh in-memory one.
function memoryStorage() {
  const m = new Map()
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)) },
    removeItem: (k) => { m.delete(k) },
    clear: () => { m.clear() },
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size },
  }
}

const { default: MinesGame } = await import('./Mines.jsx')

const TODAY = '2026-10-21'
const USER = { id: 'u-1', email: 'player@example.com', user_metadata: {} }

let host, root
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 21, 12))
  saveResult.mockReset()
  vi.stubGlobal('localStorage', memoryStorage())
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

// `strict` renders as main.jsx does, effects run twice on mount included.
async function mount({ strict = false } = {}) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  const page = <AuthContext.Provider value={{ user: USER, signOut() {} }}><MinesGame /></AuthContext.Provider>
  await act(async () => {
    root.render(strict ? <StrictMode>{page}</StrictMode> : page)
  })
}
// A reload: the page goes (and its focus with it), today's checkpoint stays.
async function remount() {
  act(() => root.unmount())
  host.remove()
  await mount({ strict: true })
}
const click = (el) => act(async () => { el.click() })
// A real press focuses what it lands on first (a mousedown does; el.click() doesn't).
const press = (el) => act(async () => { el.focus(); el.click() })
const tick = (ms) => act(async () => { vi.advanceTimersByTime(ms) })
const key = (el, k) => act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })) })
const grid = () => host.querySelector('[role="grid"]')
const cell = (i) => host.querySelector(`[role="gridcell"][data-idx="${i}"]`)
const toggle = (name) => [...host.querySelectorAll('[role="group"][aria-label="Tap action"] button')]
  .find(b => b.textContent.includes(name))

// ── The palette, read from index.css's :root block (WCAG relative luminance) ──
const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8')
const TOKENS = Object.fromEntries(
  [...source('./index.css').match(/:root\s*\{([\s\S]*?)\n\}/)[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)]
    .map(m => [m[1], m[2]]),
)
// Every colour in a declaration value, in order: a token reference resolves
// through :root; a hex literal stands for itself (so a regression fails on its ratio).
const coloursIn = (value) => [...(value ?? '').matchAll(/var\(--([\w-]+)\)|#[0-9a-fA-F]{6}\b/g)]
  .map(m => (m[1] ? TOKENS[m[1]] : m[0]))
const colourOf = (value) => {
  const [c] = coloursIn(value)
  expect(c, `a colour in "${value}"`).toMatch(/^#[0-9a-fA-F]{6}$/)
  return c
}
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// ── The rules the page itself injects (its <style> block) ──
// happy-dom's CSSOM mangles shorthands that hold var(), so read the text:
// each innermost `selectors { declarations }` block, @media bodies included.
const pageCss = () => [...host.querySelectorAll('style')].map(s => s.textContent).find(t => t.includes('.mn-cell'))
function rulesOf(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '')
  return [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => ({
    selectors: sel.split(',').map(s => s.trim()),
    decls: Object.fromEntries(body.split(';').map(d => d.split(/:(.*)/s).map(s => s.trim())).filter(([p, v]) => p && v)),
  }))
}
// The last value a selector sets for a property (later rules win).
const decl = (selector, prop) => rulesOf(pageCss())
  .filter(r => r.selectors.includes(selector) && prop in r.decls)
  .map(r => r.decls[prop])
  .at(-1)
const borderOf = (selector) => {
  const value = decl(selector, 'border') ?? ''
  return { width: parseFloat(value.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? '0'), colour: colourOf(value), value }
}

const minContrast = (as, bs) => Math.min(...as.flatMap(a => bs.map(b => contrast(a, b))))

// What a focused cell paints from its outer edge inwards, one entry per px
// (the colours that px can take): its border, then the inset box-shadow band
// over the fill, then the outline on top of both. The focus rules share one
// specificity, so the last one that sets a property wins.
const focusDecl = (sel, prop) => rulesOf(pageCss())
  .filter(r => (r.selectors.includes('.mn-cell:focus-visible') || r.selectors.includes(`${sel}:focus-visible`)) && prop in r.decls)
  .map(r => r.decls[prop])
  .at(-1)
const PROFILE_DEPTH = 12
function focusProfile(sel) {
  const border = borderOf(sel)
  const fill = coloursIn(decl(sel, 'background'))
  const outline = focusDecl(sel, 'outline') ?? ''
  const ring = colourOf(outline)
  const ringWidth = parseFloat(outline.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? '0')
  const offset = parseFloat(focusDecl(sel, 'outline-offset') ?? '0')
  const shadow = focusDecl(sel, 'box-shadow') ?? ''
  let band = null, spread = 0
  if (/\binset\b/.test(shadow)) {
    const lengths = shadow.replace(/\binset\b|var\([^)]*\)|#[0-9a-fA-F]+/g, '').trim().split(/\s+/).map(parseFloat)
    expect(lengths.slice(0, 3), `${sel} focus band: no offset or blur`).toEqual([0, 0, 0])
    band = colourOf(shadow)
    spread = lengths[3] ?? 0
  }
  return Array.from({ length: PROFILE_DEPTH }, (_, d) => {
    if (d >= -offset - ringWidth && d < -offset) return [ring]
    if (d < border.width) return [border.colour]
    if (band && d < border.width + spread) return [band]
    return fill
  })
}

const HIDDEN_SELECTORS = ['.mn-hidden', '.mn-flag']
const DUG_SELECTORS = ['.mn-zero', '.mn-number']

describe('Mines undug tiles vs dug cells (F39)', () => {
  it('puts the tile states on the real board: hidden, flagged, clear and numbered', async () => {
    await mount()
    const board = generateBoard(TODAY, 0)
    const cells = openingState(board)
    const hiddenIdx = cells.findIndex(s => s === HIDDEN)
    expect(cell(hiddenIdx).className).toContain('mn-hidden')
    expect(cell(hiddenIdx).getAttribute('aria-label')).toMatch(/, hidden$/)
    expect(cell(board.open).className).toContain('mn-zero')
    const numbered = [...host.querySelectorAll('[role="gridcell"]')].find(el => /, \d$/.test(el.getAttribute('aria-label')))
    expect(numbered.className).toContain('mn-number')

    // Flag mode, then a tap: the tile becomes a flagged one.
    await click(toggle('Flag'))
    await click(cell(hiddenIdx))
    expect(cell(hiddenIdx).getAttribute('aria-label')).toMatch(/, flagged$/)
    expect(cell(hiddenIdx).className).toContain('mn-flag')
  })

  it('edges undug and flagged tiles at >= 3:1 against dug cells and the page, 2px wide', async () => {
    await mount()
    for (const dug of DUG_SELECTORS) {
      const dugFill = colourOf(decl(dug, 'background'))
      for (const sel of HIDDEN_SELECTORS) {
        const edge = borderOf(sel)
        expect(edge.width, `${sel} edge width`).toBeGreaterThanOrEqual(2)
        expect(contrast(edge.colour, dugFill), `${sel} edge vs ${dug}`).toBeGreaterThanOrEqual(3)
        expect(contrast(edge.colour, TOKENS.bg), `${sel} edge vs --bg`).toBeGreaterThanOrEqual(3)
        // Against the cards around the board too (the dug cells' own edge).
        expect(contrast(edge.colour, TOKENS.surface), `${sel} edge vs --surface`).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('takes every tile colour from an index.css token, never a hex literal', async () => {
    await mount()
    for (const sel of [...HIDDEN_SELECTORS, ...DUG_SELECTORS]) {
      for (const prop of ['background', 'border']) {
        const value = decl(sel, prop)
        expect(value, `${sel} ${prop}`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
        for (const [, name] of value.matchAll(/var\(--([\w-]+)\)/g)) expect(TOKENS[name], `--${name}`).toBeDefined()
      }
    }
    const hover = decl('.mn-grid:not([aria-disabled="true"]) .mn-hidden:hover', 'background')
    expect(hover).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('keeps the edge on hover and the gold focus ring at >= 3:1 on every tile fill', async () => {
    await mount()
    const hoverSel = '.mn-grid:not([aria-disabled="true"]) .mn-hidden:hover'
    // Hover lifts the fill only: the 3:1 edge stays.
    expect(decl(hoverSel, 'border')).toBeUndefined()
    expect(decl(hoverSel, 'border-color')).toBeUndefined()

    const ring = colourOf(decl('.mn-cell:focus-visible', 'outline'))
    expect(ring).toBe(TOKENS.gold)
    const fills = [
      ...HIDDEN_SELECTORS.flatMap(sel => coloursIn(decl(sel, 'background'))),
      colourOf(decl(hoverSel, 'background')),
      ...DUG_SELECTORS.map(sel => colourOf(decl(sel, 'background'))),
      TOKENS.bg,
    ]
    for (const fill of fills) expect(contrast(ring, fill), `ring vs ${fill}`).toBeGreaterThanOrEqual(3)
  })

  it('keeps a focused undug tile apart from a focused dug cell and from its unfocused self', async () => {
    await mount()
    // Keyboard: arrows move the roving focus onto an undug tile.
    const board = generateBoard(TODAY, 0)
    const start = host.querySelector('[role="gridcell"][tabindex="0"]')
    await act(async () => { start.focus() })
    let moved = false
    for (const k of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) {
      for (let n = 0; n < board.cols && !document.activeElement.classList.contains('mn-hidden'); n++) await key(grid(), k)
      if (document.activeElement.classList.contains('mn-hidden')) { moved = true; break }
    }
    expect(moved).toBe(true)
    expect(document.activeElement.matches('.mn-cell')).toBe(true)

    const hover = colourOf(decl('.mn-grid:not([aria-disabled="true"]) .mn-hidden:hover', 'background'))
    const ring = colourOf(decl('.mn-cell:focus-visible', 'outline'))
    for (const sel of HIDDEN_SELECTORS) {
      const edge = borderOf(sel)
      const focused = focusProfile(sel)
      // The edge (the undug cue, >= 3:1 on dug cells and the page) is still
      // the tile's outermost 2px: the ring is drawn inside it, not over it.
      expect(edge.width).toBeGreaterThanOrEqual(2)
      for (let d = 0; d < edge.width; d++) expect(focused[d], `${sel}:focus-visible at ${d}px`).toEqual([edge.colour])
      // Edge | band | ring | fill: each part reads apart from the next at 3:1.
      const parts = focused.filter((c, d) => d === 0 || c.join() !== focused[d - 1].join())
      expect(parts.length, `${sel} focused parts`).toBeGreaterThanOrEqual(3)
      for (let p = 1; p < parts.length; p++) {
        const next = p === parts.length - 1 && sel === '.mn-hidden' ? [...parts[p], hover] : parts[p]
        expect(minContrast(parts[p - 1], next), `${sel} focused part ${p - 1} vs ${p}`).toBeGreaterThanOrEqual(3)
      }

      // Against a focused dug cell, depth by depth: a >= 2px band differs at 3:1
      // (with the ring over the edge, only the ~1.5:1 fills told them apart).
      for (const dug of DUG_SELECTORS) {
        const other = focusProfile(dug)
        const apart = focused.map((c, d) => minContrast(c, other[d]) >= 3)
        expect(apart.some((ok, d) => ok && apart[d + 1]), `${sel} vs ${dug}, both focused`).toBe(true)
      }

      // Against its unfocused self: the ring replaces >= 2px of fill at 3:1.
      const ringDepths = focused.flatMap((c, d) => (c.length === 1 && c[0] === ring ? [d] : []))
      expect(ringDepths.length, `${sel} ring width`).toBeGreaterThanOrEqual(2)
      expect(Math.min(...ringDepths), `${sel} ring inside the edge, on the fill`).toBeGreaterThanOrEqual(edge.width)
      const fills = sel === '.mn-hidden' ? [...coloursIn(decl(sel, 'background')), hover] : coloursIn(decl(sel, 'background'))
      expect(minContrast([ring], fills), `${sel} ring vs unfocused fill`).toBeGreaterThanOrEqual(3)
    }
  })

  it('keeps every digit on a dug cell at >= 4.5:1', async () => {
    await mount()
    const dugFill = colourOf(decl('.mn-number', 'background'))
    const digits = source('./Mines.jsx').match(/const DIGIT_COLORS = \[([^\]]*)\]/)[1]
    const all = coloursIn(digits)
    expect(all).toHaveLength(8)
    for (const c of all) expect(contrast(c, dugFill), `digit ${c}`).toBeGreaterThanOrEqual(4.5)
    // And the ones on today's opening, as rendered.
    for (const el of host.querySelectorAll('.mn-number .mn-digit')) {
      expect(contrast(colourOf(el.style.color), dugFill)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('Mines Dig / Flag toggle focus ring (F159)', () => {
  const SEG = '.mn-seg button:focus-visible'
  const PRESSED = '.mn-seg button[aria-pressed="true"]:focus-visible'

  it('draws the ring inside the toggle, which clips anything outside it', async () => {
    await mount()
    expect(decl('.mn-seg', 'overflow')).toBe('hidden')
    const outline = decl(SEG, 'outline') ?? ''
    const width = parseFloat(outline.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? 'NaN')
    const offset = parseFloat(decl(SEG, 'outline-offset') ?? 'NaN')
    expect(width).toBeGreaterThanOrEqual(2)
    // offset + width <= 0: the whole ring sits inside the button's box.
    expect(offset + width).toBeLessThanOrEqual(0)
    expect(contrast(colourOf(outline), TOKENS.bg), 'ring on an unpressed button').toBeGreaterThanOrEqual(3)
  })

  it('turns the ring dark on the pressed gold button', async () => {
    await mount()
    const dig = toggle('Dig'), flag = toggle('Flag')
    expect(dig.getAttribute('aria-pressed')).toBe('true')
    await click(flag)
    expect(flag.getAttribute('aria-pressed')).toBe('true')
    expect(dig.getAttribute('aria-pressed')).toBe('false')
    await act(async () => { flag.focus() })
    expect(document.activeElement).toBe(flag)
    expect(flag.matches('.mn-seg button[aria-pressed="true"]')).toBe(true)

    const pressedFill = colourOf(decl('.mn-seg button[aria-pressed="true"]', 'background'))
    const ring = colourOf(decl(PRESSED, 'outline-color') ?? decl(PRESSED, 'outline'))
    expect(contrast(ring, pressedFill), 'ring vs the gold fill').toBeGreaterThanOrEqual(3)
    // Still inside the box: the pressed rule keeps (or restates) the inset offset.
    const offset = parseFloat(decl(PRESSED, 'outline-offset') ?? decl(SEG, 'outline-offset'))
    expect(offset).toBeLessThan(0)
  })
})

// ── Focus kept clear of the phone layout's fixed bar (2.4.11) ──
// happy-dom has no layout, so these pin the CSS and the scroll calls that keep
// focus in view; the scrolling itself is checked in a real browser.
const NARROW = /@media\s*\(max-width:\s*520px\)\s*\{([\s\S]*?)\n\}/
const lengthsIn = (value) => [...(value ?? '').matchAll(/(\d+(?:\.\d+)?)px/g)].reduce((s, m) => s + Number(m[1]), 0)
// A shorthand's values, a calc() counted as one.
const valuesOf = (value) => value.match(/calc\((?:[^()]|\([^()]*\))*\)|\S+/g)

describe('Mines fixed bar on narrow screens (2.4.11)', () => {
  it('reserves the bar\'s whole height, home-bar inset included, below the page and as scroll padding', async () => {
    await mount()
    const block = pageCss().match(NARROW)
    expect(block, 'the narrow-screen @media block').not.toBeNull()
    const narrow = rulesOf(block[1])
    const at = (sel, prop) => narrow.filter(r => r.selectors.includes(sel) && prop in r.decls).map(r => r.decls[prop]).at(-1)
    expect(at('.mn-bar', 'position')).toBe('fixed')

    // The bar's height is one custom property on the root ...
    const name = at('.mn-bar', 'height')?.match(/^var\((--[\w-]+)\)$/)?.[1]
    expect(name, 'the bar\'s height as a var()').toBeDefined()
    const height = at('html', name)
    // ... that adds up everything the bar draws: its top border, its padding
    // (the bottom one over the home-bar inset) and the Dig / Flag toggle.
    const padding = valuesOf(at('.mn-bar', 'padding'))
    const padTop = padding[0], padBottom = padding[2] ?? padTop
    const toggle = parseFloat(decl('.mn-seg button', 'height')) + 2 * parseFloat(decl('.mn-seg', 'border'))
    expect(toggle).toBe(46)
    expect(lengthsIn(height)).toBe(lengthsIn(at('.mn-bar', 'border-top')) + lengthsIn(padTop) + toggle + lengthsIn(padBottom))
    expect(padBottom).toContain('env(safe-area-inset-bottom)')
    expect(height).toContain('env(safe-area-inset-bottom)')

    // Focus scrolling stops above the bar, with a gap for a ring drawn outside
    // its element (Next's sits 2px out) ...
    const scrollPad = at('html', 'scroll-padding-bottom')
    expect(scrollPad).toContain(`var(${name})`)
    expect(lengthsIn(scrollPad)).toBeGreaterThanOrEqual(4)
    // ... and the page keeps at least that much below its content, so the
    // last of it (the result, the footer's links) can scroll that far.
    const pagePad = at('.mn-main', 'padding-bottom')
    expect(pagePad).toContain(`var(${name})`)
    expect(lengthsIn(pagePad)).toBeGreaterThanOrEqual(lengthsIn(scrollPad))
  })

  it('scrolls a cell the arrow keys move to just into view, so the scroll padding applies', async () => {
    await mount()
    const board = generateBoard(TODAY, 0)
    const start = cell(board.open)
    await act(async () => { start.focus() })
    const focus = vi.spyOn(HTMLElement.prototype, 'focus')
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    await key(grid(), board.open % board.cols < board.cols - 1 ? 'ArrowRight' : 'ArrowLeft')
    const moved = document.activeElement
    expect(moved).not.toBe(start)
    expect(moved.getAttribute('role')).toBe('gridcell')
    // Not the browser's own focus scroll (Chrome centres the cell, a jump on
    // every arrow press), but the nearest edge, clear of the bar.
    expect(focus.mock.contexts).toEqual([moved])
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
    expect(scroll.mock.contexts).toEqual([moved])
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' })
  })
})

// ── Focus after a clear, a new rung and the day's end (2.4.3) ──
const nextButton = () => [...host.querySelectorAll('button')].find(b => b.textContent.startsWith('Next: '))
const result = () => host.querySelector('section.rc')
const liveText = () => host.querySelector('.mn-sr-only[aria-live]').textContent
const rungName = () => grid().getAttribute('aria-label').split(' board')[0]
// Longer than the pause between a focus move and what is said after it.
const BEAT_MS = 250
const BOOM_MS = 1200 // the blast, then the board resets (or the day ends)

// Digs every safe tile still hidden on rung `r`; the last dig clears it.
// `how` is how a tile is dug: a press (focus lands on it) or a bare click.
async function clearRung(r, how = press) {
  const board = generateBoard(TODAY, r)
  for (let i = 0; i < board.mine.length; i++) {
    if (!board.mine[i] && cell(i).classList.contains('mn-hidden')) await how(cell(i))
  }
}
// Presses rung `r`'s safe tiles up to the one whose dig would clear it, and
// returns that one.
async function digToLast(r) {
  const board = generateBoard(TODAY, r)
  let cur = openingState(board)
  for (let i = 0; ; i++) {
    if (board.mine[i] || cur[i] !== HIDDEN) continue
    const next = dig(board, cur, i).cells
    if (isWon(board, next)) return i
    await press(cell(i))
    cur = next
  }
}

// Outside act(), React renders through its scheduler, which took the real
// setImmediate when it loaded (before the fake timers): a render lays out in
// one task and runs its effects in a later one. This lets those tasks run.
const realImmediate = globalThis.setImmediate
async function settle() {
  for (let k = 0; k < 10; k++) await new Promise(resolve => realImmediate(resolve))
}
// Resolves once React has laid out a change to `el`, before that render's
// effects have run (a MutationObserver reports in a microtask after the commit),
// having first called `then` there: a tap or a timer landing in that gap.
const onLaidOut = (el, then) => new Promise(resolve => {
  const seen = new MutationObserver(() => { seen.disconnect(); then(); resolve() })
  seen.observe(el, { attributes: true, childList: true, subtree: true })
})

describe('Mines focus after a clear, a new rung and the end of the day (2.4.3)', () => {
  it('moves focus off the cleared board to Next, then to the new board\'s opening cell', async () => {
    await mount({ strict: true })
    await clearRung(0)
    // The board is disabled now: focus moves on to what is left to do.
    expect(grid().getAttribute('aria-disabled')).toBe('true')
    expect(nextButton().textContent).toBe('Next: Medium →')
    expect(document.activeElement).toBe(nextButton())
    await tick(BEAT_MS)
    expect(liveText()).toMatch(/^Easy cleared in .*\. Medium unlocked\./)

    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    await press(nextButton())
    // Next is gone: focus lands on the new board's opening cell, its one Tab stop.
    const medium = generateBoard(TODAY, 1)
    expect(rungName()).toBe('Medium')
    expect(document.activeElement).toBe(cell(medium.open))
    expect(cell(medium.open).getAttribute('tabindex')).toBe('0')
    // The ladder goes to the top of the screen, then the cell only as far as it must.
    expect(scroll.mock.contexts).toEqual([host.querySelector('.mn-ladder'), cell(medium.open)])
    expect(scroll.mock.calls).toEqual([[{ block: 'start' }], [{ block: 'nearest', inline: 'nearest' }]])
    // The rung is announced once the focus speech has begun (a live message
    // that arrives with a focus change is cut off).
    expect(liveText()).not.toMatch(/^Medium:/)
    await tick(BEAT_MS)
    expect(liveText()).toBe(`Medium: ${medium.cols} by ${medium.rows}, ${medium.mines} mines. 3 attempts.`)

    // A reload into Medium restores the rung without moving focus.
    await remount()
    expect(rungName()).toBe('Medium')
    expect(document.activeElement).toBe(document.body)
  })

  it('moves focus to Next when the clearing dig lands between a clock tick\'s layout and its effects', async () => {
    await mount({ strict: true })
    const last = await digToLast(0)
    await act(async () => { cell(last).focus() })
    // The running clock ticks outside any event. The clearing tap comes in
    // before that tick's effects have run, so the clear's own render runs
    // them first: they must leave the clear's focus move to it.
    const clock = host.querySelector('[aria-label^="Time "]')
    const dug = onLaidOut(clock, () => cell(last).click())
    vi.advanceTimersByTime(1000)
    await dug
    await settle()
    expect(grid().getAttribute('aria-disabled')).toBe('true')
    expect(nextButton()).toBeDefined()
    expect(document.activeElement).toBe(nextButton())
    await act(async () => { vi.advanceTimersByTime(BEAT_MS) })
    expect(liveText()).toMatch(/^Easy cleared in .*\. Medium unlocked\./)
  })

  it('moves focus to the new board when Next is pressed between the clear announcement\'s layout and its effects', async () => {
    await mount({ strict: true })
    await clearRung(0)
    expect(document.activeElement).toBe(nextButton())
    // The clear is said a beat after its focus move, from a timer; Next is
    // pressed as that lands.
    const live = host.querySelector('.mn-sr-only[aria-live]')
    const pressed = onLaidOut(live, () => nextButton().click())
    vi.advanceTimersByTime(BEAT_MS)
    await pressed
    await settle()
    const medium = generateBoard(TODAY, 1)
    expect(rungName()).toBe('Medium')
    expect(document.activeElement).toBe(cell(medium.open))
    await act(async () => { vi.advanceTimersByTime(BEAT_MS) })
    expect(liveText()).toBe(`Medium: ${medium.cols} by ${medium.rows}, ${medium.mines} mines. 3 attempts.`)
  })

  it('leaves focus on a control the player moved it to, and still lands Next on the board', async () => {
    await mount({ strict: true })
    const dig = toggle('Dig')
    await act(async () => { dig.focus() })
    // Taps that never take focus (iOS Safari's): the toggle keeps it.
    await clearRung(0, click)
    expect(nextButton()).toBeDefined()
    expect(document.activeElement).toBe(dig)

    await press(nextButton())
    expect(document.activeElement).toBe(cell(generateBoard(TODAY, 1).open))
  })

  it('moves focus to the result when the last board clears, but not on a reload of the finished day', async () => {
    await mount({ strict: true })
    for (const r of [0, 1, 2]) {
      await clearRung(r)
      if (r < 2) await press(nextButton())
    }
    expect(result().querySelector('.rc-title').textContent).toBe('🎉 All clear!')
    expect(document.activeElement).toBe(result())
    await tick(BEAT_MS)
    expect(liveText()).toMatch(/^All three boards cleared in /)

    await remount()
    expect(result()).not.toBeNull()
    expect(document.activeElement).toBe(document.body)
  })

  it('moves focus to the result when the third mine ends the day', async () => {
    await mount({ strict: true })
    const mine = generateBoard(TODAY, 0).mine.findIndex(Boolean)
    for (let k = 0; k < MAX_ATTEMPTS; k++) {
      await press(cell(mine))
      await tick(BOOM_MS)
    }
    expect(result().querySelector('.rc-title').textContent).toBe('Game over!')
    expect(document.activeElement).toBe(result())
  })
})
