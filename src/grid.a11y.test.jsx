// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'

// The three grid games (Faceoff, Gridiron, Knockout) for keyboard and
// screen-reader players: named cells and search box, the match list on the
// keyboard, focus that lands somewhere after every move, spoken results, the
// search panel kept above a phone's keyboard, and readable contrast.
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

// Node 25's own localStorage global (method-less without --localstorage-file)
// shadows happy-dom's, so give the page a working in-memory one.
class MemoryStorage {
  #items = new Map()
  get length() { return this.#items.size }
  key(i) { return [...this.#items.keys()][i] ?? null }
  getItem(k) { return this.#items.has(String(k)) ? this.#items.get(String(k)) : null }
  setItem(k, v) { this.#items.set(String(k), String(v)) }
  removeItem(k) { this.#items.delete(String(k)) }
  clear() { this.#items.clear() }
}
vi.stubGlobal('localStorage', new MemoryStorage())

const { default: FaceoffGame } = await import('./Faceoff.jsx')
const { default: GridironGame } = await import('./Gridiron.jsx')
const { default: KnockoutGame } = await import('./Knockout.jsx')
const faceoff = await import('./faceoff/puzzle.js')
const faceoffData = await import('./faceoff/data.js')
const gridiron = await import('./gridiron/puzzle.js')
const gridironData = await import('./gridiron/data.js')
const knockout = await import('./knockout/puzzle.js')
const knockoutData = await import('./knockout/data.js')

const TODAY = '2026-10-21'
const USER = { id: 'u-1', email: 'player@example.com', user_metadata: {} }
const KO_LABEL = { ...knockoutData.PROMOTIONS, ...knockoutData.WEIGHT_CLASSES, ...knockoutData.ACHIEVEMENTS }

// Each game's page, answers and wording, from its own modules.
const GAMES = [
  {
    name: 'Faceoff', Game: FaceoffGame, grid: '.faceoff-grid', opt: 'faceoff-opt', list: 'Matching players',
    search: 'Search NHL player for ', submit: 'Submit "', none: 'No player found', hasCancel: true, offersUsed: true,
    searchClass: 'faceoff-search', showsNone: true,
    pool: faceoff.PLAYERS, puzzle: faceoff.getDailyPuzzle(TODAY), fits: faceoff.fitsOn(TODAY),
    label: (k) => faceoffData.AWARDS[k] || faceoffData.TEAMS[k] || k,
    score: (p) => Math.max(5, Math.round(100 - p.f)),
  },
  {
    name: 'Gridiron', Game: GridironGame, grid: '.gridiron-grid', opt: 'gridiron-opt', list: 'Matching players',
    search: 'Search NFL player for ', submit: 'Submit "', none: 'No player found', hasCancel: true, offersUsed: true,
    searchClass: 'gridiron-search', showsNone: true,
    pool: gridiron.PLAYERS, puzzle: gridiron.getDailyPuzzle(TODAY), fits: gridiron.fitsOn(TODAY),
    label: (k) => gridironData.AWARDS[k] || gridironData.TEAMS[k] || k,
    score: (p) => Math.max(5, Math.round(100 - p.f)),
  },
  {
    name: 'Knockout', Game: KnockoutGame, grid: '.ko-grid', opt: 'ko-opt', list: 'Matching fighters',
    search: 'Search MMA fighter for ', submit: 'Confirm:', none: 'No fighter found', hasCancel: false, offersUsed: false,
    searchClass: 'ko-search', showsNone: false, // Knockout has no written no-match line
    pool: knockout.FIGHTERS, puzzle: knockout.getDailyPuzzle(TODAY), fits: knockout.fitsOn(TODAY),
    label: (k) => KO_LABEL[k],
    score: (p) => Math.max(5, Math.min(100, Math.round(115 - p.f))),
  },
]

// The palette, read from index.css, for contrast checks (WCAG relative luminance).
// (A variable path: Vite rewrites a literal new URL('./x', import.meta.url).)
const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8')
const TOKENS = Object.fromEntries([...source('./index.css')
  .matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map(m => [m[1], m[2]]))
const hexOf = (value) => {
  const m = /^var\(--([\w-]+)\)$/.exec(value.trim())
  if (!m || !TOKENS[m[1]]) throw new Error(`not a palette token: ${value}`)
  return TOKENS[m[1]]
}
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (fg, bg) => {
  const [a, b] = [luminance(hexOf(fg)), luminance(hexOf(bg))].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

let host, root
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 21, 12))
  saveResult.mockReset()
  localStorage.clear()
})
afterEach(() => {
  if (root) { act(() => root.unmount()); host.remove(); root = null }
  vi.useRealTimers()
  vi.restoreAllMocks()
})

async function mount(Game) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<AuthContext.Provider value={{ user: USER, signOut() {} }}><Game /></AuthContext.Provider>)
  })
}

const tick = (ms) => act(async () => { vi.advanceTimersByTime(ms) })
const click = (el) => act(async () => { el.click() })
const press = (el, key, opts = {}) => act(async () => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }))
})
const button = (label) => [...host.querySelectorAll('button')].find(el => el.textContent.trim().startsWith(label))
const focused = () => document.activeElement
// Everything the page's polite live regions currently say.
const ZWSP = String.fromCharCode(0x200b) // the announcer's repeat toggle
const spoken = () => [...host.querySelectorAll('[aria-live]')].map(el => el.textContent.split(ZWSP).join('')).join(' | ')

for (const g of GAMES) {
  const cellEl = (r, c) => host.querySelector(g.grid).children[5 + r * 4 + c]
  const input = () => host.querySelector('input[placeholder^="Search"]')
  const list = () => host.querySelector(`[role="group"][aria-label="${g.list}"]`)
  const rows = () => [...(list()?.children ?? [])]
  const rowName = (row) => row.firstChild.textContent
  const cellName = (r, c) => `${g.label(g.puzzle.rows[r])} and ${g.label(g.puzzle.cols[c])}`
  const fitsCell = (p, r, c) => g.fits(p, g.puzzle.rows[r]) && g.fits(p, g.puzzle.cols[c])
  const rightFor = (r, c) => g.pool.find(p => fitsCell(p, r, c))
  const wrongFor = (r, c) => g.pool.find(p => !fitsCell(p, r, c))
  // What a sighted player reads in the search panel (no screen-reader-only text).
  const panelText = () => {
    const copy = input().parentElement.cloneNode(true)
    copy.querySelectorAll('.sr-only').forEach(el => el.remove())
    return copy.textContent
  }
  // A full board: nine different players, each one a single, unambiguous
  // match among the at most 8 shown for its full name (found by backtracking;
  // the puzzle module guarantees a 9-answer solution exists).
  function solution() {
    const findable = (p) => {
      const q = p.n.toLowerCase()
      const hits = g.pool.filter(o => o.n.toLowerCase().includes(q))
      return hits.length <= 8 && hits.filter(o => o.n === p.n).length === 1
    }
    const options = Array.from({ length: 9 }, (_, i) =>
      g.pool.filter(p => fitsCell(p, Math.floor(i / 3), i % 3) && findable(p)))
    const picked = []
    const fill = (i) => {
      if (i === 9) return true
      for (const p of options[i]) {
        if (picked.some(q => q.n === p.n)) continue
        picked.push(p)
        if (fill(i + 1)) return true
        picked.pop()
      }
      return false
    }
    if (!fill(0)) throw new Error(`no findable 9-answer solution for ${g.name} on ${TODAY}`)
    return picked
  }

  async function type(text) {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input(), text)
      input().dispatchEvent(new Event('input', { bubbles: true }))
    })
  }
  async function openCell(r, c) {
    await click(cellEl(r, c))
    await tick(100) // the search box takes focus after 50 ms
  }
  // Picks `player` from the matches for its full name, then submits.
  async function answer(r, c, player) {
    await openCell(r, c)
    await type(player.n)
    await click(rows().find(row => rowName(row) === player.n))
    await click(button(g.submit))
  }

  describe(`${g.name} accessibility`, () => {
    it('names every open cell by its row and column, with the open one expanded', async () => {
      await mount(g.Game)
      const cell = cellEl(1, 2)
      expect(cell.getAttribute('role')).toBe('button')
      expect(cell.getAttribute('aria-label')).toBe(`${cellName(1, 2)}: empty`)
      expect(cell.getAttribute('aria-expanded')).toBe('false')
      expect(cell.textContent).toBe('?')

      await openCell(1, 2)
      expect(cell.getAttribute('aria-expanded')).toBe('true')
      const panel = document.getElementById(cell.getAttribute('aria-controls'))
      expect(panel).not.toBeNull()
      expect(panel.contains(input())).toBe(true)
      expect(cellEl(0, 0).getAttribute('aria-expanded')).toBe('false')
      // Each header's logo, icon or badge sits beside its written name, so
      // screen readers skip it rather than read the name twice.
      for (const i of [1, 2, 3, 4, 8, 12]) {
        const art = host.querySelector(g.grid).children[i].firstChild
        expect(art.getAttribute('alt') === '' || art.getAttribute('aria-hidden') === 'true').toBe(true)
      }
    })

    it('labels the search box with the cell it answers and keeps iOS from zooming or autocorrecting it', async () => {
      await mount(g.Game)
      await openCell(2, 0)
      const box = input()
      expect(focused()).toBe(box)
      expect(box.getAttribute('aria-label')).toBe(`${g.search}${cellName(2, 0)}`)
      expect(document.getElementById(box.getAttribute('aria-describedby')).textContent).toMatch(/Down Arrow/)
      expect(box.style.fontSize).toBe('16px')
      expect(box.getAttribute('autocorrect')).toBe('off')
      expect(box.getAttribute('autocapitalize')).toBe('none')
      expect(box.getAttribute('spellcheck')).toBe('false')
      expect(box.getAttribute('autocomplete')).toBe('off')
      // A phone keyboard's Enter key reads "Search", as it picks a match.
      expect(box.getAttribute('enterkeyhint')).toBe('search')
    })

    it('shows a focus ring on the search box', async () => {
      await mount(g.Game)
      await openCell(0, 0)
      const box = input()
      expect(focused()).toBe(box)
      // No inline outline:none (it would beat any stylesheet rule), and a
      // ring outside the box's own border, drawn whenever it has focus.
      expect(box.style.outline).toBe('')
      expect(box.classList.contains(g.searchClass)).toBe(true)
      const css = [...host.querySelectorAll('style')].map(s => s.textContent).join('\n')
      expect(css).toContain(`.${g.searchClass}:focus-visible{outline:2px solid var(--gold);outline-offset:2px}`)
    })

    it('moves through the matches with the arrow keys and picks with Enter', async () => {
      await mount(g.Game)
      await openCell(0, 0)
      await type('an')
      expect(rows().length).toBeGreaterThan(2)
      expect(rows().every(row => row.getAttribute('role') === 'button' && row.tabIndex === 0)).toBe(true)

      await press(input(), 'ArrowDown')
      expect(focused()).toBe(rows()[0])
      await press(rows()[0], 'ArrowDown')
      expect(focused()).toBe(rows()[1])
      await press(rows()[1], 'ArrowUp')
      expect(focused()).toBe(rows()[0])
      await press(rows()[0], 'ArrowUp')
      expect(focused()).toBe(input())

      // Enter on a focused match picks it, and focus goes to the submit button.
      await press(input(), 'ArrowDown')
      await press(rows()[0], 'ArrowDown')
      const second = rowName(rows()[1])
      await press(rows()[1], 'Enter')
      expect(focused()).toBe(button(g.submit))
      expect(focused().textContent).toContain(second)
      expect(saveResult).not.toHaveBeenCalled()
    })

    it('picks the first match when Enter is pressed in the search box', async () => {
      await mount(g.Game)
      await openCell(0, 0)
      await type('an')
      const first = rowName(rows()[0])
      await press(input(), 'Enter')
      expect(focused()).toBe(button(g.submit))
      expect(focused().textContent).toContain(first)
      expect(host.textContent).toContain('9 guesses left') // picking spends nothing
    })

    it('Escape closes the matches, then the search, returning focus to the cell', async () => {
      await mount(g.Game)
      await openCell(1, 1)
      await type('an')
      await press(input(), 'ArrowDown')
      await press(rows()[0], 'Escape')
      expect(list()).toBeNull()
      expect(focused()).toBe(input())

      await press(input(), 'Escape')
      expect(input()).toBeNull()
      expect(focused()).toBe(cellEl(1, 1))
      expect(cellEl(1, 1).getAttribute('aria-expanded')).toBe('false')
    })

    it('Escape hides the matches without claiming none were found, and Down Arrow brings them back', async () => {
      await mount(g.Game)
      await openCell(0, 0)
      await type('an')
      const names = rows().map(rowName)
      await press(input(), 'Escape')
      expect(list()).toBeNull()
      expect(input().value).toBe('an')
      expect(panelText()).not.toContain(g.none)
      await tick(1000)
      expect(spoken()).not.toContain(g.none)

      // Enter picks nothing from a list the player has closed.
      await press(input(), 'Enter')
      expect(button(g.submit)?.disabled ?? true).toBe(true)
      expect(focused()).toBe(input())

      await press(input(), 'ArrowDown')
      expect(rows().map(rowName)).toEqual(names)
      expect(focused()).toBe(rows()[0])

      // Closed again from a match, focus is back in the box; then Escape
      // closes the search.
      await press(rows()[0], 'Escape')
      expect(list()).toBeNull()
      expect(focused()).toBe(input())
      await press(input(), 'Escape')
      expect(input()).toBeNull()
      expect(focused()).toBe(cellEl(0, 0))
    })

    if (g.showsNone) {
      it('still writes the no-match line for a search that finds nobody', async () => {
        await mount(g.Game)
        await openCell(0, 0)
        await type('zzqxj')
        expect(panelText()).toContain(g.none)
        await type('an')
        expect(panelText()).not.toContain(g.none)
      })
    }

    it('drops a pending match count when the matches or the search close first', async () => {
      await mount(g.Game)
      await openCell(0, 0)
      // Escape closes the list before the count is read: no count follows.
      await type('an')
      await press(input(), 'Escape')
      await tick(1000)
      expect(spoken()).not.toContain('shown')

      // Escape (or Cancel) closes the search mid-count: nothing follows either.
      await type('zzqxj')
      await press(input(), 'Escape')
      expect(input()).toBeNull()
      await tick(1000)
      expect(spoken()).not.toContain(g.none)

      if (g.hasCancel) {
        await openCell(0, 0)
        await type('an')
        await click(button('Cancel'))
        await tick(1000)
        expect(spoken()).not.toContain('shown')
      }
    })

    it('leaves no match count waiting once the page has gone', async () => {
      await mount(g.Game)
      await openCell(0, 0)
      await tick(5000) // let any start-up timers run out
      await type('an')
      expect(vi.getTimerCount()).toBeGreaterThan(0)
      act(() => root.unmount())
      host.remove()
      root = null
      expect(vi.getTimerCount()).toBe(0)
    })

    if (g.hasCancel) {
      it('Cancel returns focus to the cell it closed', async () => {
        await mount(g.Game)
        await openCell(2, 1)
        await click(button('Cancel'))
        expect(input()).toBeNull()
        expect(focused()).toBe(cellEl(2, 1))
      })
    }

    it('announces a right answer and moves focus to the next empty cell', async () => {
      await mount(g.Game)
      const right = rightFor(0, 0)
      await answer(0, 0, right)
      const score = g.score(right)
      expect(spoken()).toContain(`Correct: ${right.n}, +${score} points. 8 guesses remaining.`)
      expect(focused()).toBe(cellEl(0, 1))
      // The answered cell is no longer a button; its content names it.
      expect(cellEl(0, 0).getAttribute('role')).toBeNull()
      expect(cellEl(0, 0).querySelector('[role="img"]').getAttribute('aria-label'))
        .toBe(`${cellName(0, 0)}: ${right.n}, +${score} points`)
    })

    it('announces a miss and keeps focus in the search box', async () => {
      await mount(g.Game)
      const wrong = wrongFor(2, 2)
      await answer(2, 2, wrong)
      expect(spoken()).toContain(`Not a match: ${wrong.n}. 8 guesses remaining.`)
      expect(focused()).toBe(input())
      expect(input().value).toBe('')
    })

    if (g.offersUsed) {
      it('announces a player already on the board', async () => {
        await mount(g.Game)
        const right = rightFor(0, 0)
        await answer(0, 0, right)
        await answer(1, 1, right)
        expect(spoken()).toContain(`${right.n} is already on the board. 7 guesses remaining.`)
        expect(focused()).toBe(input())
      })
    }

    it('moves focus to the result when the last guess ends the game', async () => {
      await mount(g.Game)
      const wrong = wrongFor(2, 2)
      for (let i = 0; i < 9; i++) {
        await answer(2, 2, wrong)
        await tick(600) // the miss's shake
      }
      const result = host.querySelector('.rc')
      expect(result).not.toBeNull()
      expect(focused()).toBe(result)
      expect(spoken()).toContain(`Not a match: ${wrong.n}. Out of guesses. Final score 0.`)
      // Every cell is locked now, and still named.
      expect(host.querySelectorAll(`${g.grid} [role="button"]`)).toHaveLength(0)
      expect(cellEl(0, 0).querySelector('[role="img"]').getAttribute('aria-label')).toBe(`${cellName(0, 0)}: empty`)
    })

    it('announces a right last guess as the end, and moves focus to the result', async () => {
      await mount(g.Game)
      const wrong = wrongFor(2, 2)
      for (let i = 0; i < 8; i++) {
        await answer(2, 2, wrong)
        await tick(600)
      }
      expect(spoken()).toContain(`Not a match: ${wrong.n}. 1 guess remaining.`)
      const right = rightFor(0, 0)
      await answer(0, 0, right)
      const score = g.score(right)
      expect(spoken()).toContain(`Correct: ${right.n}, +${score} points. Out of guesses. Final score ${score}.`)
      const result = host.querySelector('.rc')
      expect(result).not.toBeNull()
      expect(focused()).toBe(result)
    })

    it('announces a completed board with its final score, and moves focus to the result', async () => {
      await mount(g.Game)
      const players = solution()
      let total = 0
      for (let i = 0; i < 9; i++) {
        const [r, c] = [Math.floor(i / 3), i % 3]
        await answer(r, c, players[i])
        total += g.score(players[i])
        if (i < 8) expect(focused()).toBe(cellEl(Math.floor((i + 1) / 3), (i + 1) % 3))
      }
      const last = players[8]
      expect(spoken()).toContain(`Correct: ${last.n}, +${g.score(last)} points. Board complete! Final score ${total}.`)
      const result = host.querySelector('.rc')
      expect(result).not.toBeNull()
      expect(result.classList.contains('rc-won')).toBe(true)
      expect(focused()).toBe(result)
    })

    it('Space on a match picks it without scrolling the page', async () => {
      await mount(g.Game)
      await openCell(0, 0)
      await type('an')
      await press(input(), 'ArrowDown')
      const name = rowName(rows()[0])
      const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
      await act(async () => { rows()[0].dispatchEvent(space) })
      expect(space.defaultPrevented).toBe(true)
      expect(focused()).toBe(button(g.submit))
      expect(focused().textContent).toContain(name)
    })

    it('says how many players match once typing pauses', async () => {
      await mount(g.Game)
      await openCell(0, 0)
      await type('an')
      await tick(300)
      expect(spoken()).not.toContain('shown')
      await tick(500)
      expect(spoken()).toContain(`${rows().length} matches shown`)

      await type('zzqxj')
      await tick(800)
      expect(spoken()).toContain(g.none)

      // A pick cancels a pending count, so it can't talk over the pick.
      await type('an')
      await press(input(), 'Enter')
      await tick(1000)
      expect(spoken()).not.toContain('shown')
    })

    it('draws the match focus ring inside the row, where the list cannot clip it', async () => {
      await mount(g.Game)
      await openCell(0, 0)
      await type('an')
      expect(rows().every(row => row.classList.contains(g.opt))).toBe(true)
      const css = [...host.querySelectorAll('style')].map(s => s.textContent).join('\n')
      expect(css).toContain(`.${g.opt}[role="button"]:focus-visible{outline-offset:-3px}`)
    })

    it('keeps the matches above the on-screen keyboard on a short screen', async () => {
      const listeners = []
      const viewport = {
        offsetTop: 0, height: 800, scale: 1,
        addEventListener: (type, fn) => { if (type === 'resize') listeners.push(fn) },
        removeEventListener: (type, fn) => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1) },
      }
      const nativeViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport')
      Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true })
      const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
      // The panel's top at 250 px and the list's bottom at 700 px (client coordinates).
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
        const top = this === list() ? 330 : this === input()?.parentElement ? 250 : 0
        const bottom = this === list() ? 700 : top + 50
        return { top, bottom, left: 0, right: 0, width: 0, height: bottom - top, x: 0, y: top }
      })
      try {
        await mount(g.Game)
        await openCell(0, 0)
        await type('an')
        expect(scrollBy).not.toHaveBeenCalled() // all of it already shows

        // The keyboard comes up: 320 px stay visible. Scroll to show the list,
        // but never past the search box's top (min(700 - 320, 250 - 0)).
        viewport.height = 320
        await act(async () => { listeners.forEach(fn => fn()) })
        expect(scrollBy).toHaveBeenCalledWith(0, 250)

        // A list that appears while the keyboard is already up reveals itself too.
        await type('')
        expect(listeners).toHaveLength(0) // nothing listens while no list shows
        scrollBy.mockClear()
        await type('an')
        expect(scrollBy).toHaveBeenCalledWith(0, 250)

        // So does one Escape hid and Down Arrow brought back.
        await press(input(), 'Escape')
        expect(listeners).toHaveLength(0)
        scrollBy.mockClear()
        await press(input(), 'ArrowDown')
        expect(scrollBy).toHaveBeenCalledWith(0, 250)

        // A player who has pinch-zoomed keeps the view they chose.
        scrollBy.mockClear()
        viewport.scale = 2
        await act(async () => { listeners.forEach(fn => fn()) })
        await type('')
        await type('an')
        expect(scrollBy).not.toHaveBeenCalled()
      } finally {
        if (nativeViewport) Object.defineProperty(window, 'visualViewport', nativeViewport)
        else delete window.visualViewport
      }
    })

    it('meets AA contrast on the submit button and the match rows', async () => {
      await mount(g.Game)
      await openCell(0, 0)
      await type('an')
      // Knockout's weight classes tell fighters apart: readable on the row
      // as shown and hovered (and on the picked-row colour, kept for safety).
      const hint = g.name === 'Knockout' ? rows()[0].children[1] : null
      await click(rows()[0])
      const submit = button(g.submit)
      expect(contrast(submit.style.color, submit.style.background)).toBeGreaterThanOrEqual(4.5)
      if (hint) {
        for (const bg of ['var(--surface)', 'var(--correct-wash)', 'var(--surface-gold)']) {
          expect(contrast(hint.style.color, bg)).toBeGreaterThanOrEqual(4.5)
        }
      }
    })

    // On a phone the open list ran a screen tall, so a submit button below
    // it sat under the fold: a pick closes the list, as in all three games.
    it('closes the matches on a pick, so the submit button sits right under the box and takes focus', async () => {
      await mount(g.Game)
      await openCell(1, 1)
      await type('an')
      // Plain buttons, not toggles: a picked match never stays listed.
      expect(rows().some(row => row.hasAttribute('aria-pressed'))).toBe(false)
      const second = rowName(rows()[1])
      await click(rows()[1])
      expect(list()).toBeNull()
      expect(input().value).toBe(second)
      const submit = button(g.submit)
      expect(submit.textContent).toContain(second)
      expect(focused()).toBe(submit)
      // Nothing between the box and the button (the next element holds it).
      expect(input().nextElementSibling.contains(submit)).toBe(true)
      expect(host.textContent).toContain('9 guesses left') // picking spends nothing
      // No stray focus move or count turns up later.
      await tick(1000)
      expect(focused()).toBe(submit)
      expect(spoken()).not.toContain('shown')
    })

    it('searches again once the box changes after a pick, and a new pick (even the same player) focuses the submit button', async () => {
      await mount(g.Game)
      await openCell(0, 2)
      await type('an')
      const [first, second] = rows().map(rowName)
      await click(rows()[0])
      expect(focused()).toBe(button(g.submit))

      // Changing the search drops the pick and brings the matches back.
      await type('an')
      expect(rows().map(rowName)).toContain(second)
      expect(button(g.submit)?.disabled ?? true).toBe(true)
      await click(rows().find(row => rowName(row) === second))
      expect(input().value).toBe(second)
      expect(focused()).toBe(button(g.submit))
      expect(focused().textContent).toContain(second)

      // Back to the first player, by keyboard this time.
      await type('an')
      await press(input(), 'ArrowDown')
      await press(rows()[0], 'Enter')
      expect(list()).toBeNull()
      expect(focused()).toBe(button(g.submit))
      expect(focused().textContent).toContain(first)

      // The same player again: still a pick, still focused.
      await type('an')
      await click(rows()[0])
      expect(focused()).toBe(button(g.submit))
      expect(focused().textContent).toContain(first)
      expect(host.textContent).toContain('9 guesses left')
    })

    it('Escape on the submit button after a pick closes the search, back to its cell', async () => {
      await mount(g.Game)
      await openCell(2, 2)
      await type('an')
      await press(input(), 'Enter')
      expect(focused()).toBe(button(g.submit))
      await press(button(g.submit), 'Escape')
      expect(input()).toBeNull()
      expect(focused()).toBe(cellEl(2, 2))
      expect(saveResult).not.toHaveBeenCalled()
    })

    it('centres the grid with its own margins, never by centring the scroller, so a narrow screen can scroll to its left edge', async () => {
      await mount(g.Game)
      const grid = host.querySelector(g.grid)
      const scroller = grid.parentElement
      expect(scroller.style.overflowX).toBe('auto')
      expect(scroller.style.justifyContent).toBe('')
      const css = [...host.querySelectorAll('style')].map(s => s.textContent).join('\n')
      expect(css).toMatch(new RegExp(`\\${g.grid}\\{[^}]*margin-inline:auto`))
      // On phones the answer columns shrink instead of overflowing, never
      // below a comfortable tap target (the layout itself is checked in a
      // real browser: happy-dom draws nothing).
      expect(css).toContain(`@media(max-width:480px){${g.grid}{grid-template-columns:72px repeat(3,minmax(64px,88px))`)
    })
  })
}
