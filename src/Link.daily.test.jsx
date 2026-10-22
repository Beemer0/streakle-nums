// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'

// Today's Link board lives in localStorage ('streakle-link'): a reload resumes
// it exactly, a finished day stays finished and is never saved twice, and
// Archive replays never touch it.
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
const { PUZZLES } = await import('./link/puzzles.js')
// The puzzle a checkpoint is bound to: every group's label and words, in order.
const sigOf = (p) => p.categories.map(c => `${c.label}:${c.words.join(',')}`).join('|')

const KEY = 'streakle-link'
const TODAY = '2026-10-21'
const YESTERDAY = '2026-10-20'
const PAST = '2026-10-18'
const USER = { id: 'u-1', email: 'player@example.com', user_metadata: {} }
const WIN = { game: 'link', puzzleDate: TODAY, completed: true }
const LOSS = { game: 'link', puzzleDate: TODAY, completed: false }

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
// A reload: a fresh root over the same localStorage.
async function reload() {
  act(() => root.unmount())
  host.remove()
  await mount()
}

const tick = (ms) => act(async () => { vi.advanceTimersByTime(ms) })
const click = (el) => act(async () => { el.click() })
const button = (label) => [...host.querySelectorAll('button')].find(el => el.textContent.trim().startsWith(label))
// The unsolved words' grid (tiles drop their button role once the game ends).
const tiles = () => [...[...host.querySelectorAll('div')].find(d => d.style.gridTemplateColumns).children]
const tile = (word) => tiles().find(el => el.textContent === word)
const title = () => host.querySelector('.rc-title')?.textContent ?? null
const stored = () => JSON.parse(localStorage.getItem(KEY))
const store = (cp) => localStorage.setItem(KEY, typeof cp === 'string' ? cp : JSON.stringify(cp))
// The four life dots; spent ones turn grey.
const livesLeft = () => [...host.querySelectorAll('div')]
  .filter(d => d.style.width === '14px' && d.style.height === '14px' && d.style.background === 'var(--gold)').length

async function select(words) {
  for (const w of words) await click(tile(w))
  await click(button('Submit'))
}
async function solveGroup(cat) {
  await select(cat.words)
  await tick(1000)
}
// One word from each unsolved group in turn, so it never matches a group.
async function miss(puzzle, solved = []) {
  const open = puzzle.categories.filter((_, i) => !solved.includes(i))
  await select([0, 1, 2, 3].map(i => open[i % open.length].words[Math.floor(i / open.length)]))
  await tick(700)
  if (button('Deselect')) await click(button('Deselect'))
}

async function pickArchiveDay(date) {
  await click(host.querySelector('button[aria-label="Archive"]'))
  await tick(0)
  await click(host.querySelector(`button[title="${date}"]`))
  await tick(200)
}

const freshBoard = () => {
  expect(tiles()).toHaveLength(16)
  expect(livesLeft()).toBe(4)
  expect(button('Submit')).toBeDefined()
  expect(title()).toBeNull()
}

describe('Link daily checkpoint', () => {
  it('resumes a mid-game reload with nothing refunded', async () => {
    const p = linkFor(TODAY)
    await mount()
    await solveGroup(p.categories[0])
    await miss(p, [0])
    expect(stored()).toEqual({ v: 1, date: TODAY, sig: sigOf(p), solved: [0], lives: 3, history: [true, false] })

    await reload()
    expect(host.textContent).toContain(p.categories[0].label)
    expect(tiles()).toHaveLength(12)
    expect(tile(p.categories[0].words[0])).toBeUndefined()
    expect(livesLeft()).toBe(3)
    expect(title()).toBeNull()

    // Three lives were left, so the third miss ends it.
    await miss(p, [0])
    await miss(p, [0])
    expect(title()).toBeNull()
    await miss(p, [0])
    expect(title()).toBe('Game over!')
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult).toHaveBeenCalledWith(LOSS)
  })

  it('finishes a resumed game with its whole guess history', async () => {
    const p = linkFor(TODAY)
    await mount()
    await solveGroup(p.categories[2])
    await miss(p, [2])
    await reload()

    for (const i of [0, 1, 3]) await solveGroup(p.categories[i])
    expect(title()).toBe('🎉 Solved!')
    expect(host.textContent).toContain('5 guesses · 3 lives remaining')
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult).toHaveBeenCalledWith(WIN)

    // The share grid replays every guess in order, including the one before the reload.
    // (happy-dom has no navigator.share, so Share copies to the clipboard.)
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    await click(button('📋'))
    expect(writeText.mock.calls[0][0]).toContain('🟩🟩🟩🟩\n🟥🟥🟥🟥\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n🟩🟩🟩🟩\n')
  })

  it('restores a lost game as lost and never saves it again', async () => {
    const p = linkFor(TODAY)
    await mount()
    for (let i = 0; i < 4; i++) await miss(p)
    expect(title()).toBe('Game over!')
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult).toHaveBeenCalledWith(LOSS)
    expect(stored()).toMatchObject({ solved: [], lives: 0 })

    saveResult.mockClear()
    await reload()
    expect(title()).toBe('Game over!')
    expect(host.textContent).toContain('The categories were:')
    for (const c of p.categories) expect(host.textContent).toContain(c.label)
    expect(button('📋')).toBeDefined()
    expect(button('Submit')).toBeUndefined()
    expect(livesLeft()).toBe(0)
    await tick(5000)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('restores a won game as won, without confetti, reveal or a second save', async () => {
    const p = linkFor(TODAY)
    await mount()
    for (const c of p.categories) await solveGroup(c)
    expect(title()).toBe('🎉 Solved!')
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult).toHaveBeenCalledWith(WIN)

    saveResult.mockClear()
    await reload()
    expect(title()).toBe('🎉 Solved!')
    expect(host.textContent).toContain('4 guesses · 4 lives remaining')
    expect(button('📋')).toBeDefined()
    const animated = (name) => [...host.querySelectorAll('div')].filter(d => d.style.animation.includes(name))
    expect(animated('confetti')).toHaveLength(0)
    expect(animated('revealRow')).toHaveLength(0)
    await tick(5000)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('saves the win before checkpointing it, so a reload mid-flight keeps both', async () => {
    const p = linkFor(TODAY)
    await mount()
    for (const c of p.categories.slice(0, 3)) await solveGroup(c)
    await select(p.categories[3].words)
    await tick(100) // the last group is still flying in
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult).toHaveBeenCalledWith(WIN)
    expect(stored()).toMatchObject({ solved: [0, 1, 2, 3], lives: 4 })

    await reload()
    expect(title()).toBe('🎉 Solved!')
    await tick(5000)
    expect(saveResult).toHaveBeenCalledTimes(1)
  })

  it('keeps a group found mid-flight across a reload', async () => {
    const p = linkFor(TODAY)
    await mount()
    await select(p.categories[1].words)
    await tick(100)
    await reload()
    expect(host.textContent).toContain(p.categories[1].label)
    expect(tiles()).toHaveLength(12)
    expect(title()).toBeNull()
  })

  it('charges no fifth life when Submit is tapped again during the game-over delay', async () => {
    const p = linkFor(TODAY)
    await mount()
    for (let i = 0; i < 3; i++) await miss(p)
    await select(p.categories.map(c => c.words[3]))
    await click(button('Submit')) // same guess again before the card appears
    // No lives left: the tiles stop taking taps while the card is on its way.
    expect(tiles().filter(t => t.getAttribute('role') === 'button')).toHaveLength(0)
    await tick(700)
    expect(title()).toBe('Game over!')
    expect(livesLeft()).toBe(0)
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult).toHaveBeenCalledWith(LOSS)
    expect(stored()).toEqual({ v: 1, date: TODAY, sig: sigOf(p), solved: [], lives: 0, history: [false, false, false, false] })

    // The share grid shows the four misses, not a fifth.
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    await click(button('📋'))
    const share = writeText.mock.calls[0][0]
    expect(share.match(/🟥🟥🟥🟥/g)).toHaveLength(4)
    expect(share).not.toContain('🟩')

    saveResult.mockClear()
    await reload()
    expect(title()).toBe('Game over!')
    expect(saveResult).not.toHaveBeenCalled()
  })
})

// One slot holds the live day's board. A tab left open since yesterday keeps
// the board it was dealt (and can still finish and save it), but its moves
// must never overwrite the checkpoint another tab has since written for today.
describe("Link checkpoint and a tab left open past midnight", () => {
  const yesterday = linkFor(YESTERDAY)
  const today = linkFor(TODAY)

  // Deals yesterday's board at 23:58 and plays a group on it, then moves the
  // clock past midnight and stores the checkpoint another tab wrote for today.
  async function staleTab(todayCheckpoint) {
    vi.setSystemTime(new Date(2026, 9, 20, 23, 58))
    await mount()
    await solveGroup(yesterday.categories[0])
    expect(stored()).toMatchObject({ date: YESTERDAY, solved: [0], lives: 4 })

    vi.setSystemTime(new Date(2026, 9, 21, 0, 5))
    const cp = { v: 1, date: TODAY, sig: sigOf(today), ...todayCheckpoint }
    store(cp)
    return cp
  }

  it("leaves today's mid-game checkpoint alone and today's board resumes it", async () => {
    const cp = await staleTab({ solved: [1], lives: 3, history: [false, true] })

    // The old tab's move still counts on its own board.
    await miss(yesterday, [0])
    expect(livesLeft()).toBe(3)
    expect(host.textContent).toContain(yesterday.categories[0].label)
    expect(stored()).toEqual(cp)

    await reload()
    expect(host.textContent).toContain(today.categories[1].label)
    expect(tiles()).toHaveLength(12)
    expect(livesLeft()).toBe(3)
    expect(title()).toBeNull()
  })

  it("leaves today's finished checkpoint alone when the old tab finishes yesterday's board", async () => {
    const cp = await staleTab({ solved: [0, 1, 2, 3], lives: 4, history: [true, true, true, true] })

    for (let i = 0; i < 4; i++) await miss(yesterday, [0])
    expect(title()).toBe('Game over!')
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult).toHaveBeenCalledWith({ ...LOSS, puzzleDate: YESTERDAY })
    expect(stored()).toEqual(cp)

    saveResult.mockClear()
    await reload()
    expect(title()).toBe('🎉 Solved!')
    expect(host.textContent).toContain('4 guesses · 4 lives remaining')
    await tick(5000)
    expect(saveResult).not.toHaveBeenCalled()
  })
})

describe('Link checkpoint and the Archive', () => {
  it('an Archive replay neither reads nor writes the checkpoint', async () => {
    // A finished game dated the replayed day: a replay that read it would open on Game over.
    const raw = JSON.stringify({ v: 1, date: PAST, sig: sigOf(linkFor(PAST)), solved: [], lives: 0, history: [false, false, false, false] })
    store(raw)
    await mount()
    await pickArchiveDay(PAST)
    expect(host.textContent).toContain('October 18, 2026')
    freshBoard()

    const p = linkFor(PAST)
    await solveGroup(p.categories[0])
    await miss(p, [0])
    expect(livesLeft()).toBe(3)
    expect(localStorage.getItem(KEY)).toBe(raw)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it("leaves today's checkpoint alone during a replay and resumes it after", async () => {
    const p = linkFor(TODAY)
    await mount()
    await solveGroup(p.categories[3])
    const raw = localStorage.getItem(KEY)

    await pickArchiveDay(PAST)
    freshBoard()
    for (let i = 0; i < 4; i++) await miss(linkFor(PAST))
    expect(title()).toBe('Game over!')
    expect(localStorage.getItem(KEY)).toBe(raw)

    await pickArchiveDay(TODAY)
    expect(host.textContent).toContain(p.categories[3].label)
    expect(tiles()).toHaveLength(12)
    expect(livesLeft()).toBe(4)
    expect(saveResult).not.toHaveBeenCalled()
  })
})

describe('Link checkpoint validation', () => {
  const today = linkFor(TODAY)
  const good = { v: 1, date: TODAY, sig: sigOf(today), solved: [1], lives: 3, history: [false, true] }
  // Today's puzzle after a same-day bank fix: one word swapped, or two groups reordered.
  const edited = { categories: today.categories.map((c, i) => i === 2 ? { ...c, words: [...c.words.slice(0, 3), 'ZEBRA'] } : c) }
  const reordered = { categories: [today.categories[1], today.categories[0], ...today.categories.slice(2)] }
  const BAD = [
    ['malformed JSON', '{"v":1,'],
    ['null', 'null'],
    ['a number', '42'],
    ['a string', '"hello"'],
    ['an array', '[]'],
    ['another version', { ...good, v: 2 }],
    ['missing fields', { v: 1, date: TODAY, sig: good.sig }],
    ['no puzzle signature', { ...good, sig: undefined }],
    ['a signature that is not text', { ...good, sig: 7 }],
    ["another day's puzzle", { ...good, sig: sigOf(linkFor(YESTERDAY)) }],
    ['an edited word in the puzzle', { ...good, sig: sigOf(edited) }],
    ['reordered groups', { ...good, sig: sigOf(reordered) }],
    ['solved not a list', { ...good, solved: '1' }],
    ['a repeated group', { ...good, solved: [1, 1], history: [true, true], lives: 4 }],
    ['a group out of range', { ...good, solved: [4] }],
    ['a negative group index', { ...good, solved: [-1] }],
    ['a fractional group', { ...good, solved: [0.5] }],
    ['too many lives', { ...good, lives: 5, history: [true] }],
    ['negative lives', { ...good, lives: -1, history: [true, false, false, false, false, false] }],
    ['lives as text', { ...good, lives: '3' }],
    ['a non-boolean guess', { ...good, history: [0, 1] }],
    ['a solved group with no guess', { ...good, history: [false] }],
    ['a lost life with no guess', { ...good, history: [true] }],
    ['won and lost at once', { ...good, solved: [0, 1, 2, 3], lives: 0, history: [true, true, true, true, false, false, false, false] }],
    ['won with no lives, last guess right', { ...good, solved: [0, 1, 2, 3], lives: 0, history: [false, false, false, false, true, true, true, true] }],
    ['a guess after the win', { ...good, solved: [0, 1, 2, 3], lives: 3, history: [true, true, true, true, false] }],
    ['a guess after the loss', { ...good, solved: [0], lives: 0, history: [false, false, false, false, true] }],
  ]

  it.each(BAD)('ignores %s and starts fresh', async (_, cp) => {
    store(cp)
    await mount()
    freshBoard()

    // The board still plays, and the next guess replaces the bad checkpoint.
    await miss(today)
    expect(stored()).toEqual({ v: 1, date: TODAY, sig: sigOf(today), solved: [], lives: 3, history: [false] })
  })

  it('accepts a well-formed checkpoint', async () => {
    store(good)
    await mount()
    expect(tiles()).toHaveLength(12)
    expect(livesLeft()).toBe(3)
    expect(host.textContent).toContain(today.categories[1].label)
  })

  it('ignores a checkpoint dated another day', async () => {
    // Today's own signature, so only the date gives it away.
    store({ v: 1, date: YESTERDAY, sig: good.sig, solved: [], lives: 0, history: [false, false, false, false] })
    await mount()
    freshBoard()
    await miss(today)
    expect(stored()).toEqual({ v: 1, date: TODAY, sig: sigOf(today), solved: [], lives: 3, history: [false] })
  })

  // A puzzle edit deployed mid-day (a word fixed, a group reworded) changes
  // today's puzzle: the checkpoint was written against another one.
  const stale = PUZZLES[(PUZZLES.indexOf(linkFor(TODAY)) + 1) % PUZZLES.length]
  it.each([
    ['mid-game', { solved: [0], lives: 3, history: [true, false] }],
    ['lost', { solved: [], lives: 0, history: [false, false, false, false] }],
    ['won', { solved: [0, 1, 2, 3], lives: 4, history: [true, true, true, true] }],
  ])("drops today's %s checkpoint when the day's puzzle changed under it", async (_, cp) => {
    expect(sigOf(stale)).not.toBe(sigOf(today))
    store({ v: 1, date: TODAY, sig: sigOf(stale), ...cp })
    await mount()
    freshBoard()
    for (const c of today.categories) expect(host.textContent).not.toContain(c.label)

    // The new puzzle plays from scratch and the checkpoint now names it.
    await solveGroup(today.categories[0])
    expect(stored()).toEqual({ v: 1, date: TODAY, sig: sigOf(today), solved: [0], lives: 4, history: [true] })
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('plays on when storage throws', async () => {
    store(good)
    // Blocked site data: touching localStorage at all throws (afterEach restores it).
    setStorage({ get() { throw new DOMException('The operation is insecure.', 'SecurityError') } })
    await mount()
    freshBoard()
    const p = linkFor(TODAY)
    for (const c of p.categories) await solveGroup(c)
    expect(title()).toBe('🎉 Solved!')
    expect(saveResult).toHaveBeenCalledWith(WIN)
  })
})
