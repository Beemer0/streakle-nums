// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'

// Link for screen-reader and keyboard players: tiles are toggle buttons with
// their pressed state, lives are named, every selection, miss and solve is
// read out, and focus lands somewhere useful after a solve and at the end.
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

// happy-dom has no Web Animations; Link's solved-group flight calls el.animate.
if (!Element.prototype.animate) Element.prototype.animate = () => ({ cancel() {} })

// Node 25's own localStorage global (an empty object without
// --localstorage-file) shadows happy-dom's; put a real happy-dom Storage back.
const storage = new Storage()
const setStorage = (desc) => Object.defineProperty(globalThis, 'localStorage', { configurable: true, ...desc })
setStorage({ value: storage, writable: true })

const { default: LinkGame } = await import('./Link.jsx')
const { getDailyPuzzle: linkFor } = await import('./link/schedule.js')

const TODAY = '2026-10-21'
const USER = { id: 'u-1', email: 'player@example.com', user_metadata: {} }

let host, root
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 21, 12))
  saveResult.mockClear()
  localStorage.clear()
})
afterEach(() => {
  vi.restoreAllMocks()
  setStorage({ value: storage, writable: true })
  act(() => root.unmount())
  host.remove()
  vi.useRealTimers()
})

async function mount() {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<AuthContext.Provider value={{ user: USER, signOut() {} }}><LinkGame /></AuthContext.Provider>)
  })
}
async function reload() {
  act(() => root.unmount())
  host.remove()
  await mount()
}

const tick = (ms) => act(async () => { vi.advanceTimersByTime(ms) })
const click = (el) => act(async () => { el.click() })
const press = (el, key) => act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })) })
const button = (label) => [...host.querySelectorAll('button')].find(el => el.textContent.trim().startsWith(label))
const board = () => host.querySelector('[role="group"][aria-label="Words"]')
const tiles = () => [...board().children]
const tile = (word) => tiles().find(el => el.textContent === word)
const lives = () => host.querySelector('[role="img"][aria-label$="lives left"]')
const resultCard = () => host.querySelector('section.rc')
// The board's polite live region (the zero-width space only forces a re-read).
const ZWSP = String.fromCharCode(0x200b)
function live() {
  const regions = host.querySelectorAll('[aria-live="polite"][aria-atomic="true"]')
  expect(regions).toHaveLength(1)
  return regions[0].textContent.split(ZWSP).join('')
}
// The accessible name a section gets from aria-labelledby.
const labelOf = (el) => document.getElementById(el.getAttribute('aria-labelledby'))?.textContent

async function select(words) {
  for (const w of words) await click(tile(w))
}
// Submit the way a keyboard player does: focus on Submit, then activate it.
async function submit() {
  const b = button('Submit')
  b.focus()
  await click(b)
}
// One word from each group: matches no group and is never "one away".
const missGuess = (p) => p.categories.map((c, i) => c.words[i])
// A found group's fly-in (four 700 ms flips, 60 ms apart, plus 100 ms), and
// a beat after it: the solve message waits until focus has moved, so the
// screen reader's focus speech doesn't cut it off.
// Two ticks: React renders the landing (and schedules the message) between them.
const LAND = 700 + 3 * 60 + 100
const BEAT = 250
async function land() {
  await tick(LAND)
  await tick(BEAT)
}
async function solveGroup(words) {
  await select(words)
  await submit()
  await land()
}

describe('Link accessibility', () => {
  it('names the word grid and makes every tile a toggle button with its pressed state', async () => {
    const p = linkFor(TODAY)
    await mount()
    expect(tiles()).toHaveLength(16)
    for (const t of tiles()) {
      expect(t.getAttribute('role')).toBe('button')
      expect(t.tabIndex).toBe(0)
      expect(t.getAttribute('aria-pressed')).toBe('false')
      expect(t.textContent.trim()).not.toBe('')
    }

    const word = p.categories[0].words[0]
    await click(tile(word))
    expect(tile(word).getAttribute('aria-pressed')).toBe('true')
    // ...and is named by its word alone.
    expect(tiles().map(t => t.textContent).sort()).toEqual(p.categories.flatMap(c => c.words).sort())
    // Enter on a focused tile still toggles it.
    await press(tile(word), 'Enter')
    expect(tile(word).getAttribute('aria-pressed')).toBe('false')
    await press(tile(word), ' ')
    expect(tile(word).getAttribute('aria-pressed')).toBe('true')
  })

  it('reads out each selection with the count, a full hand and a cleared one', async () => {
    const p = linkFor(TODAY)
    const [a, b, c, d] = p.categories[0].words
    await mount()

    await click(tile(a))
    expect(live()).toBe(`${a} selected, 1 of 4`)
    await click(tile(b))
    await click(tile(c))
    expect(live()).toBe(`${c} selected, 3 of 4`)
    await click(tile(d))
    expect(live()).toBe(`${d} selected, 4 of 4, ready to submit`)

    // A fifth tap does nothing on screen; say why.
    await click(tile(p.categories[1].words[0]))
    expect(live()).toBe('4 already selected. Deselect one first.')
    expect(tile(p.categories[1].words[0]).getAttribute('aria-pressed')).toBe('false')

    await click(tile(b))
    expect(live()).toBe(`${b} deselected, 3 of 4`)

    await click(button('Deselect'))
    expect(live()).toBe('Selection cleared')
    expect(tiles().filter(t => t.getAttribute('aria-pressed') === 'true')).toHaveLength(0)
  })

  it('names the lives left and reads out a miss and a near miss with the lives left', async () => {
    const p = linkFor(TODAY)
    await mount()
    expect(lives().getAttribute('aria-label')).toBe('4 of 4 lives left')

    await select(missGuess(p))
    await submit()
    expect(live()).toBe('Not quite, 3 lives left.')
    expect(lives().getAttribute('aria-label')).toBe('3 of 4 lives left')
    // A wrong guess keeps the hand, so focus stays on Submit.
    expect(document.activeElement).toBe(button('Submit'))
    await tick(700)
    await click(button('Deselect'))

    const [g0, g1] = p.categories
    await select([g0.words[0], g0.words[1], g0.words[2], g1.words[0]])
    await submit()
    expect(live()).toBe('One away, 2 lives left.')
    expect(lives().getAttribute('aria-label')).toBe('2 of 4 lives left')
  })

  it('reads out a found group and moves focus to the first word left once it lands', async () => {
    const p = linkFor(TODAY)
    const group = p.categories[2]
    await mount()

    await select(group.words)
    await submit()
    // The flying copies are decoration: hidden from screen readers.
    const flying = [...host.querySelectorAll('div')].filter(d => d.style.zIndex === '20')
    expect(flying).toHaveLength(4)
    for (const f of flying) expect(f.getAttribute('aria-hidden')).toBe('true')

    // Focus moves the moment the group lands...
    await tick(LAND)
    expect(tiles()).toHaveLength(12)
    const first = tiles()[0]
    expect(group.words).not.toContain(first.textContent)
    expect(document.activeElement).toBe(first)
    expect(first.getAttribute('role')).toBe('button')
    expect(live()).toBe(`${group.words[3]} selected, 4 of 4, ready to submit`)
    // ...and the message follows a beat later, behind the focus speech.
    await tick(BEAT)
    expect(live()).toBe(`Solved: ${group.label}. 3 groups left.`)
    expect(document.activeElement).toBe(first)
  })

  it('lets a newer message replace a solve message still waiting to be read', async () => {
    const p = linkFor(TODAY)
    await mount()
    await select(p.categories[0].words)
    await submit()
    await tick(LAND)
    // A tap straight after the group lands: its message is the one that stays.
    const next = p.categories[1].words[0]
    await click(tile(next))
    expect(live()).toBe(`${next} selected, 1 of 4`)
    await tick(BEAT)
    expect(live()).toBe(`${next} selected, 1 of 4`)
  })

  it('leaves focus alone if the player moved it during the fly-in', async () => {
    const p = linkFor(TODAY)
    await mount()
    await select(p.categories[0].words)
    await submit()
    // e.g. the player tabbed on to another control while the group flew in.
    const elsewhere = document.createElement('button')
    document.body.appendChild(elsewhere)
    elsewhere.focus()
    await land()
    expect(live()).toBe(`Solved: ${p.categories[0].label}. 3 groups left.`)
    expect(document.activeElement).toBe(elsewhere)
    elsewhere.remove()
  })

  it('moves focus to the result card on a win', async () => {
    const p = linkFor(TODAY)
    await mount()
    for (const c of p.categories.slice(0, 3)) await solveGroup(c.words)
    const last = p.categories[3]
    await select(last.words)
    await submit()
    await tick(LAND)
    expect(resultCard()).not.toBeNull()
    expect(labelOf(resultCard())).toBe('🎉 Solved!')
    expect(document.activeElement).toBe(resultCard())
    expect(live()).not.toContain('Puzzle complete')
    // The last group's message follows the card's focus speech.
    await tick(BEAT)
    expect(live()).toBe(`Solved: ${last.label}. Puzzle complete!`)
    expect(document.activeElement).toBe(resultCard())
  })

  it('keeps focus in the Archive when it is opened during the final fly-in', async () => {
    const p = linkFor(TODAY)
    await mount()
    for (const c of p.categories.slice(0, 3)) await solveGroup(c.words)
    await select(p.categories[3].words)
    await submit()
    const archive = host.querySelector('button[aria-label="Archive"]')
    archive.focus()
    await click(archive)
    await tick(50)
    const dialog = host.querySelector('[role="dialog"][aria-modal="true"]')
    expect(dialog).not.toBeNull()
    expect(dialog.contains(document.activeElement)).toBe(true)

    await land()
    expect(resultCard()).not.toBeNull()
    expect(host.querySelector('[role="dialog"]')).toBe(dialog)
    expect(dialog.contains(document.activeElement)).toBe(true)
    // The win is still read out behind the open dialog.
    expect(live()).toBe(`Solved: ${p.categories[3].label}. Puzzle complete!`)
  })

  it('keeps focus on a control the player moved to while the game-over card was on its way', async () => {
    const p = linkFor(TODAY)
    await mount()
    for (let i = 0; i < 4; i++) {
      await select(missGuess(p))
      await submit()
      if (i < 3) { await tick(700); await click(button('Deselect')) }
    }
    // e.g. the player opened How to play in the 600 ms before the card.
    const howTo = host.querySelector('button[aria-label="How to play"]')
    howTo.focus()
    await click(howTo)
    await tick(700)
    expect(labelOf(resultCard())).toBe('Game over!')
    expect(document.activeElement).toBe(howTo)
  })

  it('reads out the last miss and moves focus to the result card on a loss', async () => {
    const p = linkFor(TODAY)
    await mount()
    for (let i = 0; i < 4; i++) {
      await select(missGuess(p))
      await submit()
      if (i < 3) { await tick(700); await click(button('Deselect')) }
    }
    expect(live()).toBe('Not quite, no lives left.')
    expect(lives().getAttribute('aria-label')).toBe('0 of 4 lives left')
    await tick(700)
    expect(labelOf(resultCard())).toBe('Game over!')
    expect(document.activeElement).toBe(resultCard())
    // The finished board's words are plain text, not stale toggle buttons.
    expect(tiles().filter(t => t.hasAttribute('aria-pressed') || t.hasAttribute('role'))).toHaveLength(0)
  })

  it('lets a long word break at a clean join that screen readers never hear', async () => {
    // 2026-11-01 deals ATTENBOROUGH and COPPERFIELD, too wide for a tile on a
    // 320px screen even at the smallest size a word gets.
    vi.setSystemTime(new Date(2026, 10, 1, 12))
    const words = linkFor('2026-11-01').categories.flatMap(c => c.words)
    expect(words).toEqual(expect.arrayContaining(['ATTENBOROUGH', 'COPPERFIELD']))
    await mount()

    // The break is an empty, aria-hidden marker whose generated content is a
    // soft hyphen (invisible unless the word breaks there, then a hyphen), so
    // the tile's text is still exactly its word.
    expect([...host.querySelectorAll('style')].map(s => s.textContent).join('')).toContain('.lk-shy::before{content:"\\00AD"}')
    const markers = (el) => [...el.querySelectorAll('.lk-shy')]
    for (const [w, before, after] of [['ATTENBOROUGH', 'ATTEN', 'BOROUGH'], ['COPPERFIELD', 'COPPER', 'FIELD']]) {
      const [marker, ...more] = markers(tile(w))
      expect(more).toHaveLength(0)
      expect(marker.getAttribute('aria-hidden')).toBe('true')
      expect(marker.textContent).toBe('')
      expect([marker.previousSibling.textContent, marker.nextSibling.textContent]).toEqual([before, after])
    }
    // Words that always fit on one line carry none.
    expect(markers(tile('PENN'))).toEqual([])
    expect(markers(tile('HOUDINI'))).toEqual([])
    // Every tile is still a toggle whose text is its word.
    expect(tiles().map(t => t.textContent).sort()).toEqual([...words].sort())
    for (const t of tiles()) expect(t.getAttribute('role')).toBe('button')
  })

  it('does not pull focus to the result card when a finished day reloads', async () => {
    const p = linkFor(TODAY)
    await mount()
    for (const c of p.categories) await solveGroup(c.words)
    expect(document.activeElement).toBe(resultCard())

    await reload()
    expect(resultCard()).not.toBeNull()
    expect(document.activeElement).not.toBe(resultCard())
    expect(live()).toBe('')
  })
})
