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
  missCount = 0
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
// A wrong group as the checkpoint keeps it: its words, sorted.
const keyOf = (words) => [...words].sort().join('|')
// One word from each unsolved group in turn, so it never matches a group.
// Each miss in a test takes the next word of each group, so no two are the
// same guess (a repeat costs nothing). Returns the words guessed.
let missCount = 0
async function miss(puzzle, solved = []) {
  const open = puzzle.categories.filter((_, i) => !solved.includes(i))
  const k = missCount++
  const words = [0, 1, 2, 3].map(i => open[i % open.length].words[(Math.floor(i / open.length) + k) % 4])
  await select(words)
  await tick(700)
  if (button('Deselect')) await click(button('Deselect'))
  return words
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
    const missed = await miss(p, [0])
    expect(stored()).toEqual({ v: 1, date: TODAY, sig: sigOf(p), solved: [0], lives: 3, history: [true, false], wrong: [keyOf(missed)] })

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
    const missed = []
    for (let i = 0; i < 3; i++) missed.push(await miss(p))
    const last = p.categories.map(c => c.words[3])
    await select(last)
    await click(button('Submit')) // same guess again before the card appears
    // No lives left: the tiles stop taking taps while the card is on its way.
    expect(tiles().filter(t => t.getAttribute('role') === 'button')).toHaveLength(0)
    await tick(700)
    expect(title()).toBe('Game over!')
    expect(livesLeft()).toBe(0)
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult).toHaveBeenCalledWith(LOSS)
    expect(stored()).toEqual({
      v: 1, date: TODAY, sig: sigOf(p), solved: [], lives: 0, history: [false, false, false, false],
      wrong: [...missed, last].map(keyOf),
    })

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

// A wrong four is remembered, in the checkpoint too: the same four again (a
// double tap on Submit, or the words picked in another order) says so and
// costs nothing.
describe('Link repeated wrong guesses', () => {
  const p = linkFor(TODAY)
  const first = p.categories.map(c => c.words[0])
  const second = p.categories.map(c => c.words[1])
  const toast = () => [...host.querySelectorAll('div')].find(d => d.style.position === 'fixed' && d.style.top === '80px')?.textContent ?? null

  it('charges nothing for a double tap on Submit or the same four in another order', async () => {
    await mount()
    await select(first)
    expect(livesLeft()).toBe(3)
    await click(button('Submit')) // the hand is still selected
    expect(livesLeft()).toBe(3)
    expect(toast()).toBe('Already guessed!')

    await click(button('Deselect'))
    await select([...first].reverse())
    expect(livesLeft()).toBe(3)
    expect(toast()).toBe('Already guessed!')
    expect(stored()).toEqual({ v: 1, date: TODAY, sig: sigOf(p), solved: [], lives: 3, history: [false], wrong: [keyOf(first)] })

    // Another wrong four still costs a life.
    await click(button('Deselect'))
    await select(second)
    expect(livesLeft()).toBe(2)
    expect(stored()).toMatchObject({ lives: 2, history: [false, false], wrong: [keyOf(first), keyOf(second)] })

    // The share grid has a red row per life lost, none for the repeats.
    await click(button('Deselect'))
    for (const c of p.categories) await solveGroup(c)
    expect(title()).toBe('🎉 Solved!')
    expect(host.textContent).toContain('6 guesses · 2 lives remaining')
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    await click(button('📋'))
    expect(writeText.mock.calls[0][0].match(/🟥🟥🟥🟥/g)).toHaveLength(2)
  })

  it('remembers a wrong four across a reload', async () => {
    await mount()
    await select(first)
    await reload()
    await select(first)
    expect(livesLeft()).toBe(3)
    expect(toast()).toBe('Already guessed!')
    expect(stored()).toMatchObject({ lives: 3, history: [false], wrong: [keyOf(first)] })
  })

  it('resumes a checkpoint saved before wrong fours were kept, and keeps them from then on', async () => {
    // The earlier build's checkpoint: a miss and a found group, but not which four missed.
    store({ v: 1, date: TODAY, sig: sigOf(p), solved: [1], lives: 3, history: [false, true] })
    await mount()
    expect(tiles()).toHaveLength(12)
    expect(livesLeft()).toBe(3)

    const open = [0, 2, 3].map(i => p.categories[i])
    const guess = [...open.map(c => c.words[0]), open[0].words[1]]
    await select(guess)
    expect(livesLeft()).toBe(2)
    expect(stored()).toEqual({ v: 1, date: TODAY, sig: sigOf(p), solved: [1], lives: 2, history: [false, true, false], wrong: [keyOf(guess)] })

    // Fewer wrong fours than lives lost: still today's board.
    await reload()
    expect(livesLeft()).toBe(2)
    await select(guess)
    expect(livesLeft()).toBe(2)
    expect(toast()).toBe('Already guessed!')
  })
})

// The order of the tiles is the date's alone (src/link/deal.js, tested in
// link/deal.test.js): the same for every player and every load.
describe('Link tile deal', () => {
  // Each tile's place in the puzzle's group-order word list.
  const dealOf = (p) => tiles().map(t => p.categories.flatMap(c => c.words).indexOf(t.textContent))

  it('deals the same board on every load, and a resumed board keeps its order', async () => {
    const p = linkFor(TODAY)
    await mount()
    // Pinned (a day before the deal's cutover keeps the order it was shown in).
    expect(dealOf(p)).toEqual([13, 6, 1, 10, 3, 7, 15, 9, 12, 0, 5, 4, 14, 2, 11, 8])
    const dealt = tiles().map(t => t.textContent)

    // A checkpoint keeps groups, not tile order: it resumes on the deal.
    store({ v: 1, date: TODAY, sig: sigOf(p), solved: [2], lives: 3, history: [false, true] })
    await reload()
    expect(tiles().map(t => t.textContent)).toEqual(dealt.filter(w => !p.categories[2].words.includes(w)))
    expect(host.textContent).toContain(p.categories[2].label)
    expect(livesLeft()).toBe(3)
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
  // good's one miss: a word from each group.
  const wrongKey = keyOf(today.categories.map(c => c.words[0]))
  const otherKey = keyOf(today.categories.map(c => c.words[1]))
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
    ['wrong groups not a list', { ...good, wrong: wrongKey }],
    ['a wrong group that is not text', { ...good, wrong: [7] }],
    ['a wrong group of three words', { ...good, wrong: [keyOf(today.categories.slice(1).map(c => c.words[0]))] }],
    ['a wrong group naming a word twice', { ...good, wrong: [keyOf([...today.categories.slice(1).map(c => c.words[0]), today.categories[1].words[0]])] }],
    ['a wrong group with a word from another puzzle', { ...good, wrong: [keyOf([...today.categories.slice(1).map(c => c.words[0]), 'ZEBRA'])] }],
    ['a wrong group out of order', { ...good, wrong: [today.categories.map(c => c.words[0]).sort().reverse().join('|')] }],
    ['the same wrong group twice', { ...good, lives: 2, history: [false, true, false], wrong: [wrongKey, wrongKey] }],
    ['more wrong groups than lives lost', { ...good, wrong: [wrongKey, otherKey] }],
  ]

  it.each(BAD)('ignores %s and starts fresh', async (_, cp) => {
    store(cp)
    await mount()
    freshBoard()

    // The board still plays, and the next guess replaces the bad checkpoint.
    const missed = await miss(today)
    expect(stored()).toEqual({ v: 1, date: TODAY, sig: sigOf(today), solved: [], lives: 3, history: [false], wrong: [keyOf(missed)] })
  })

  it.each([
    ['without wrong groups (as written before they were kept)', good],
    ['with its wrong group', { ...good, wrong: [wrongKey] }],
  ])('accepts a well-formed checkpoint %s', async (_, cp) => {
    store(cp)
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
    const missed = await miss(today)
    expect(stored()).toEqual({ v: 1, date: TODAY, sig: sigOf(today), solved: [], lives: 3, history: [false], wrong: [keyOf(missed)] })
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
    expect(stored()).toEqual({ v: 1, date: TODAY, sig: sigOf(today), solved: [0], lives: 4, history: [true], wrong: [] })
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
