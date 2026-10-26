// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'
import { generatePuzzle as weavePuzzle, ACTIVE, MAX_SWAPS, PAR, SIZE, HOLE, minSwaps, swap } from './weave/engine'
import { generateBoard, MAX_ATTEMPTS } from './mines/engine'
import { generatePuzzle as scramblePuzzle, BOARD_WORDS } from './scramble/engine'

// An archive replay is not a play of that day, so it must never call
// saveResult: that records under the board's dealt date (today or yesterday),
// so a replayed yesterday would otherwise still be recorded.
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

// Node 25's own (method-less, without --localstorage-file) localStorage
// shadows happy-dom's, so give the games a working in-memory one, emptied
// before each test: a finished board's checkpoint must not leak into the next.
function memoryStorage() {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)) },
    removeItem: (k) => { data.delete(k) },
    clear: () => { data.clear() },
    key: (i) => [...data.keys()][i] ?? null,
    get length() { return data.size },
  }
}
vi.stubGlobal('localStorage', memoryStorage())

// happy-dom has no Web Animations; Link's solved-group flight calls el.animate.
if (!Element.prototype.animate) Element.prototype.animate = () => ({ cancel() {} })

const { default: WordsGame } = await import('./Words.jsx')
const { default: LinkGame } = await import('./Link.jsx')
const { default: FaceoffGame } = await import('./Faceoff.jsx')
const { default: GridironGame } = await import('./Gridiron.jsx')
const { default: KnockoutGame } = await import('./Knockout.jsx')
const { default: WeaveGame } = await import('./Weave.jsx')
const { default: MinesGame } = await import('./Mines.jsx')
const { default: ScrambleGame } = await import('./Scramble.jsx')
const { getDailyPuzzle: linkFor } = await import('./link/schedule.js')
const { PUZZLES: LINK_PUZZLES } = await import('./link/puzzles.js')
const { getDailyWord } = await import('./words/schedule.js')
const { WORDS } = await import('./words/bank.js')

const seedOf = (date) => parseInt(date.replace(/-/g, ''))
const wordFor = (date) => getDailyWord(date).word

const TODAY = '2026-10-21'
const PAST = '2026-10-18'
const YESTERDAY = '2026-10-20'
const NEXT = '2026-10-22'
const USER = { id: 'u-1', email: 'player@example.com', user_metadata: {} }

// `host` is the page the helpers act on; `pages` is every page still open
// (a stale-tab test keeps two tabs of one game open at once).
let host
let pages = []
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 21, 12))
  saveResult.mockClear()
  localStorage.clear()
})
afterEach(() => {
  for (const page of pages) close(page)
  vi.useRealTimers()
})

async function mount(Game) {
  host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  const page = { host, root }
  pages = [...pages, page]
  await act(async () => {
    root.render(<AuthContext.Provider value={{ user: USER, signOut() {} }}><Game /></AuthContext.Provider>)
  })
  return page
}
// Closes a tab (unmounting runs the page's own cleanup, e.g. Scramble's clock pause).
function close(page) {
  act(() => page.root.unmount())
  page.host.remove()
  pages = pages.filter(p => p !== page)
}
const focusPage = (page) => { host = page.host }
const tick = (ms) => act(async () => { vi.advanceTimersByTime(ms) })
const click = (el) => act(async () => { el.click() })
const button = (label) => [...host.querySelectorAll('button')].find(el => el.textContent.trim().startsWith(label))
const ended = () => host.querySelector('.rc-title') !== null

async function pickArchiveDay(date) {
  await click(host.querySelector('button[aria-label="Archive"]'))
  await tick(0)
  await click(host.querySelector(`button[title="${date}"]`))
  await tick(200)
}

async function typeWord(word) {
  for (const key of [...word, 'Enter']) {
    await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key })) })
  }
  await tick(2000)
}

const linkTile = (word) => [...host.querySelectorAll('[role="button"]')].find(el => el.textContent === word)
// The board's tiles (the top bar's account menu is a role="button" too).
const linkTiles = () => [...host.querySelectorAll('[role="button"]')].filter(el => !el.closest('.gs-top')).map(el => el.textContent).sort()
const linkWords = (puzzle) => puzzle.categories.flatMap(c => c.words).sort()

// Four wrong groups (one word from each category), losing all four lives.
async function loseLink(puzzle) {
  for (let i = 0; i < 4; i++) {
    for (const c of puzzle.categories) await click(linkTile(c.words[i]))
    await click(button('Submit'))
    await tick(700)
    if (i < 3) await click(button('Deselect'))
  }
}

async function solveLink(puzzle) {
  for (const c of puzzle.categories) {
    for (const w of c.words) await click(linkTile(w))
    await click(button('Submit'))
    await tick(1000)
  }
}

describe('Words', () => {
  it("saves a win on today's board", async () => {
    await mount(WordsGame)
    await typeWord(wordFor(TODAY))
    expect(ended()).toBe(true)
    expect(saveResult).toHaveBeenCalledWith({ game: 'words', puzzleDate: TODAY, completed: true })
  })

  it('never saves a win on an archive day', async () => {
    await mount(WordsGame)
    await pickArchiveDay(PAST)
    await typeWord(wordFor(PAST))
    expect(ended()).toBe(true)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('never saves a loss on an archive day', async () => {
    await mount(WordsGame)
    await pickArchiveDay(PAST)
    const misses = ['CRANE', 'SLOTH', 'PIVOT', 'MUDDY', 'WHELK', 'JAZZY', 'FROWN'].filter(w => w !== wordFor(PAST))
    for (const w of misses.slice(0, 6)) await typeWord(w)
    expect(ended()).toBe(true)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('treats picking today in the Archive as the live board', async () => {
    await mount(WordsGame)
    await pickArchiveDay(TODAY)
    await typeWord(wordFor(TODAY))
    expect(saveResult).toHaveBeenCalledWith({ game: 'words', puzzleDate: TODAY, completed: true })
  })

  it('deals from the rotation after the Words cutover, not YYYYMMDD % 144', async () => {
    const date = '2026-11-01'
    const rotated = WORDS[89].word // CREDO
    const oldFormula = WORDS[seedOf(date) % 144].word // WORDS[13], DWARF
    expect(wordFor(date)).toBe(rotated)
    expect(oldFormula).not.toBe(rotated)

    vi.setSystemTime(new Date(2026, 10, 1, 12))
    await mount(WordsGame)
    expect(host.textContent).toContain('November 1, 2026')
    // The rotation's word is today's answer: it wins in one.
    await typeWord(rotated)
    expect(ended()).toBe(true)
    expect(host.textContent).toContain('Got it in 1!')
    expect(saveResult).toHaveBeenCalledWith({ game: 'words', puzzleDate: date, completed: true })
  })
})

describe('Words across midnight', () => {
  it("keeps the board it was dealt and saves it under that day", async () => {
    vi.setSystemTime(new Date(2026, 9, 21, 23, 58))
    await mount(WordsGame)
    vi.setSystemTime(new Date(2026, 9, 22, 0, 2))
    await typeWord(wordFor(TODAY))
    expect(ended()).toBe(true)
    expect(host.textContent).toContain('October 21, 2026')
    expect(saveResult).toHaveBeenCalledWith({ game: 'words', puzzleDate: TODAY, completed: true })
  })

  it("moves on to the new day when today is picked in the Archive", async () => {
    vi.setSystemTime(new Date(2026, 9, 21, 23, 58))
    await mount(WordsGame)
    vi.setSystemTime(new Date(2026, 9, 22, 0, 2))
    await pickArchiveDay(NEXT)
    await typeWord(wordFor(NEXT))
    expect(host.textContent).toContain('October 22, 2026')
    expect(saveResult).toHaveBeenCalledWith({ game: 'words', puzzleDate: NEXT, completed: true })
  })
})

describe('Link', () => {
  it("saves a loss on today's board", async () => {
    await mount(LinkGame)
    await loseLink(linkFor(TODAY))
    expect(saveResult).toHaveBeenCalledWith({ game: 'link', puzzleDate: TODAY, completed: false })
  })

  it('never saves a loss on an archive day', async () => {
    await mount(LinkGame)
    await pickArchiveDay(PAST)
    await loseLink(linkFor(PAST))
    expect(host.textContent).toContain('Game over!')
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('never saves a win on an archive day', async () => {
    await mount(LinkGame)
    await pickArchiveDay(PAST)
    await solveLink(linkFor(PAST))
    expect(ended()).toBe(true)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('treats picking today in the Archive as the live board', async () => {
    await mount(LinkGame)
    await pickArchiveDay(TODAY)
    await loseLink(linkFor(TODAY))
    expect(saveResult).toHaveBeenCalledWith({ game: 'link', puzzleDate: TODAY, completed: false })
  })

  it('deals from the rotation after the Link cutover, not YYYYMMDD % 71', async () => {
    const date = '2026-11-01'
    const rotated = LINK_PUZZLES[46]
    const oldFormula = LINK_PUZZLES[seedOf(date) % 71] // PUZZLES[44]
    expect(linkFor(date)).toBe(rotated)
    expect(linkWords(oldFormula)).not.toEqual(linkWords(rotated))

    vi.setSystemTime(new Date(2026, 10, 1, 12))
    await mount(LinkGame)
    expect(host.textContent).toContain('November 1, 2026')
    expect(linkTiles()).toEqual(linkWords(rotated))
    // Its groups are the rotation puzzle's: solving them wins today's board.
    await solveLink(rotated)
    expect(ended()).toBe(true)
    expect(saveResult).toHaveBeenCalledWith({ game: 'link', puzzleDate: date, completed: true })
  })
})

// The grid games: answer every cell with the first search suggestion until
// the board ends (mostly wrong answers, so it ends on a loss).
const GRIDS = [
  { name: 'Faceoff', Game: FaceoffGame, game: 'faceoff', cells: '.faceoff-grid [role="button"]', query: 'an', submit: 'Submit "' },
  { name: 'Gridiron', Game: GridironGame, game: 'gridiron', cells: '.gridiron-grid [role="button"]', query: 'an', submit: 'Submit "' },
  { name: 'Knockout', Game: KnockoutGame, game: 'knockout', cells: '.ko-grid [role="button"]', query: 'a', submit: 'Confirm:' },
]

for (const g of GRIDS) {
  async function guessOnce() {
    const cells = [...host.querySelectorAll(g.cells)]
    await click(cells.find(c => c.textContent === '?') ?? cells[0])
    await tick(100)
    const input = host.querySelector('input[placeholder^="Search"]')
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, g.query)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await click(input.parentElement.querySelector('[role="button"]'))
    await click(button(g.submit))
  }
  async function playOut() {
    for (let i = 0; i < 12 && !ended(); i++) await guessOnce()
  }

  describe(g.name, () => {
    it("saves today's board", async () => {
      await mount(g.Game)
      await playOut()
      expect(ended()).toBe(true)
      expect(saveResult).toHaveBeenCalledTimes(1)
      expect(saveResult.mock.calls[0][0]).toMatchObject({ game: g.game, puzzleDate: TODAY })
    })

    it('never saves an archive day', async () => {
      await mount(g.Game)
      await pickArchiveDay(PAST)
      await playOut()
      expect(ended()).toBe(true)
      expect(saveResult).not.toHaveBeenCalled()
    })

    it('treats picking today in the Archive as the live board', async () => {
      await mount(g.Game)
      await pickArchiveDay(TODAY)
      await playOut()
      expect(saveResult).toHaveBeenCalledTimes(1)
    })

    it("keeps a finished board when today is picked again (no replay to re-save)", async () => {
      await mount(g.Game)
      await playOut()
      await pickArchiveDay(TODAY)
      expect(ended()).toBe(true)
      expect(saveResult).toHaveBeenCalledTimes(1)
    })
  })
}

// ── Weave, Mines and Scramble: a daily board with one checkpoint slot per game
// ('streakle-<game>'), written as today's board is played.

const weaveTile = (i) => host.querySelector(`[data-idx="${i}"]`)
const weaveBoard = () => Array.from({ length: SIZE * SIZE }, (_, i) => weaveTile(i)?.textContent ?? HOLE).join('')
const swapsLeft = () => host.textContent.match(/\d+ swaps? left/)?.[0]

async function swapWeave(a, b) {
  await click(weaveTile(a))
  await click(weaveTile(b))
}

// Solves in PAR swaps: each swap puts a right letter in place and cuts the
// minimum still needed by one.
async function solveWeave(date) {
  const { solution } = weavePuzzle(date)
  for (let n = 0; n < MAX_SWAPS && weaveBoard() !== solution; n++) {
    const b = weaveBoard()
    const wrong = ACTIVE.filter(i => b[i] !== solution[i])
    const need = minSwaps(b, solution) - 1
    const pair = wrong.flatMap(i => wrong.filter(j => b[j] === solution[i]).map(j => [i, j]))
      .find(([i, j]) => minSwaps(swap(b, i, j), solution) === need)
    await swapWeave(...pair)
  }
}

// One swap that puts neither letter in place.
async function wasteWeaveSwap(date) {
  const { solution } = weavePuzzle(date)
  const b = weaveBoard()
  const wrong = ACTIVE.filter(i => b[i] !== solution[i])
  const pair = wrong.flatMap(i => wrong.map(j => [i, j]))
    .find(([i, j]) => b[i] !== b[j] && b[j] !== solution[i] && b[i] !== solution[j])
  await swapWeave(...pair)
}

const minesCell = (i) => host.querySelector(`[role="gridcell"][data-idx="${i}"]`)
const minesHidden = (i) => minesCell(i).classList.contains('mn-hidden')
const minesRung = () => host.querySelector('[role="grid"]').getAttribute('aria-label').split(' board')[0]
const minesAttempts = () => host.querySelector('.mn-pips')?.getAttribute('aria-label')

async function clearMinesRung(date, rung) {
  const board = generateBoard(date, rung)
  for (let i = 0; i < board.cols * board.rows; i++) {
    if (!board.mine[i] && minesHidden(i)) await click(minesCell(i))
  }
}

async function hitMine(date, rung) {
  const board = generateBoard(date, rung)
  await click(minesCell(board.mine.findIndex((m, i) => m && minesHidden(i))))
  await tick(1200) // the blast, then the board resets to its opening
}

const scrambleFound = () => host.querySelector('[role="img"][aria-label*="words found"]').getAttribute('aria-label')
const scrambleFoundWords = () => (scrambleFound().match(/found: ([A-Z, ]+)/)?.[1] ?? '').split(', ')

// Taps the word's letters on the rack and enters it. Clicks stay inside this
// page, unlike typing, which every open Scramble tab would hear.
async function spellScramble(word) {
  for (const ch of word) await click(host.querySelector(`.sc-rack button[aria-label="Add ${ch}"]`))
  await click(button('Enter'))
}

async function solveScramble(date) {
  for (const word of scramblePuzzle(date).words) {
    if (ended()) return
    if (!scrambleFoundWords().includes(word)) await spellScramble(word)
  }
}

// Per game: `finish` plays a board to its end and `result` is what that saves;
// `move` is one checkpointed move; `state` is what a reload must restore and
// `fresh` its value on an untouched board.
const DAILY = [
  {
    name: 'Weave', Game: WeaveGame, key: 'streakle-weave',
    finish: solveWeave,
    result: (date) => ({ game: 'weave', puzzleDate: date, completed: true, score: MAX_SWAPS - PAR, swaps_used: PAR }),
    move: wasteWeaveSwap,
    state: () => `${weaveBoard()} · ${swapsLeft()}`,
    fresh: (date) => `${weavePuzzle(date).start} · ${MAX_SWAPS} swaps left`,
  },
  {
    // Three mines on Easy end the day.
    name: 'Mines', Game: MinesGame, key: 'streakle-mines',
    finish: async (date) => { for (let k = 0; k < MAX_ATTEMPTS; k++) await hitMine(date, 0) },
    result: (date) => ({ game: 'mines', puzzleDate: date, completed: false, score: 0, swaps_used: MAX_ATTEMPTS }),
    move: (date) => hitMine(date, 0),
    state: () => `${minesRung()} · ${minesAttempts()}`,
    fresh: () => `Easy · ${MAX_ATTEMPTS} attempts left`,
  },
  {
    name: 'Scramble', Game: ScrambleGame, key: 'streakle-scramble',
    finish: solveScramble,
    result: (date) => ({ game: 'scramble', puzzleDate: date, completed: true, score: 0, swaps_used: 0 }),
    move: (date) => spellScramble(scramblePuzzle(date).words[0]),
    state: () => scrambleFound().split(';')[0],
    fresh: () => `0 of ${BOARD_WORDS} words found`,
  },
]

for (const g of DAILY) {
  describe(g.name, () => {
    it("saves today's finish under today's date", async () => {
      await mount(g.Game)
      await g.finish(TODAY)
      expect(ended()).toBe(true)
      expect(saveResult).toHaveBeenCalledTimes(1)
      expect(saveResult).toHaveBeenCalledWith(g.result(TODAY))
    })

    it('never saves or checkpoints an archive replay', async () => {
      await mount(g.Game)
      await pickArchiveDay(PAST)
      await g.finish(PAST)
      expect(ended()).toBe(true)
      expect(saveResult).not.toHaveBeenCalled()
      expect(localStorage.getItem(g.key)).toBeNull()
    })

    it('keeps a board dealt before midnight and saves it under that day', async () => {
      vi.setSystemTime(new Date(2026, 9, 21, 23, 58))
      await mount(g.Game)
      vi.setSystemTime(new Date(2026, 9, 22, 0, 2))
      await g.finish(TODAY)
      expect(ended()).toBe(true)
      expect(host.textContent).toContain('October 21, 2026')
      expect(saveResult).toHaveBeenCalledTimes(1)
      expect(saveResult).toHaveBeenCalledWith(g.result(TODAY))
    })

    it('moves to a fresh board for the new day when today is picked after midnight', async () => {
      vi.setSystemTime(new Date(2026, 9, 21, 23, 58))
      await mount(g.Game)
      await g.move(TODAY)
      vi.setSystemTime(new Date(2026, 9, 22, 0, 2))
      await pickArchiveDay(NEXT)
      expect(host.textContent).toContain('October 22, 2026')
      expect(g.state()).toBe(g.fresh(NEXT))
      await g.finish(NEXT)
      expect(saveResult).toHaveBeenCalledTimes(1)
      expect(saveResult).toHaveBeenCalledWith(g.result(NEXT))
    })

    it("never lets a tab dealt yesterday overwrite today's checkpoint", async () => {
      vi.setSystemTime(new Date(2026, 9, 20, 23, 58))
      const stale = await mount(g.Game)
      // Today, another tab makes a move: that is today's checkpoint.
      vi.setSystemTime(new Date(2026, 9, 21, 12))
      const todayTab = await mount(g.Game)
      await g.move(TODAY)
      const todayState = g.state()
      close(todayTab)
      const saved = localStorage.getItem(g.key)
      expect(JSON.parse(saved).date).toBe(TODAY)
      // The stale tab, still on yesterday's board, moves and then closes.
      focusPage(stale)
      await g.move(YESTERDAY)
      expect(localStorage.getItem(g.key)).toBe(saved)
      close(stale)
      expect(localStorage.getItem(g.key)).toBe(saved)
      // Reloading today's board restores today's state.
      await mount(g.Game)
      expect(g.state()).toBe(todayState)
      expect(g.state()).not.toBe(g.fresh(TODAY))
    })
  })
}

describe('Mines across midnight', () => {
  it('climbs a ladder dealt before midnight and saves the win under that day', async () => {
    vi.setSystemTime(new Date(2026, 9, 21, 23, 58))
    await mount(MinesGame)
    await clearMinesRung(TODAY, 0)
    vi.setSystemTime(new Date(2026, 9, 22, 0, 2))
    await click(button('Next: Medium'))
    await clearMinesRung(TODAY, 1)
    await click(button('Next: Hard'))
    await clearMinesRung(TODAY, 2)
    expect(host.querySelector('.rc-title').textContent).toBe('🎉 All clear!')
    expect(host.textContent).toContain('October 21, 2026')
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult.mock.calls[0][0]).toMatchObject({ game: 'mines', puzzleDate: TODAY, completed: true, swaps_used: 0 })
  })
})
