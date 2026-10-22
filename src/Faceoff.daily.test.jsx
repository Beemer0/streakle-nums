// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'

// Today's Faceoff board survives a reload: the checkpoint resumes it exactly,
// a finished board comes back finished without saving again, and Archive
// replays never read or write it.
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

// Node 25 ships its own localStorage global (method-less without
// --localstorage-file), which shadows happy-dom's here. Give the page a
// working in-memory one; a reload below keeps it, like a browser would.
class MemoryStorage {
  #items = new Map()
  get length() { return this.#items.size }
  key(i) { return [...this.#items.keys()][i] ?? null }
  getItem(k) { return this.#items.has(String(k)) ? this.#items.get(String(k)) : null }
  setItem(k, v) { this.#items.set(String(k), String(v)) }
  removeItem(k) { this.#items.delete(String(k)) }
  clear() { this.#items.clear() }
}
const nativeStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true, writable: true })
afterAll(() => {
  if (nativeStorage) Object.defineProperty(globalThis, 'localStorage', nativeStorage)
  else delete globalThis.localStorage
})

const { default: FaceoffGame } = await import('./Faceoff.jsx')

// The page's own answers and generator, so the test can't drift.
const { PLAYERS, getDailyPuzzle, fitsOn, isValid } = await import('./faceoff/puzzle.js')
const { PLAYERS: SHIPPED, TEAMS, AWARDS } = await import('./faceoff/data.js')
const { addDays } = await import('./dateMath.js')

const KEY = 'streakle-faceoff'
const TODAY = '2026-10-21'
const YESTERDAY = '2026-10-20'
const PAST = '2026-10-18'
const USER = { id: 'u-1', email: 'player@example.com', user_metadata: {} }

// Every test date is a board dealt before the grid cutover: check answers the
// way the page does there (corrected data, or what the shipped data accepted).
const fits = fitsOn('2026-10-21')
const fitsCell = (puzzle, p, r, c) => fits(p, puzzle.rows[r]) && fits(p, puzzle.cols[c])
const scoreOf = (name) => Math.max(5, Math.round(100 - PLAYERS.find(p => p.n === name).f))

// Nine distinct players that fill the board (index r*3+c).
function solve(date) {
  const puzzle = getDailyPuzzle(date)
  const picks = []
  const go = (k) => {
    if (k === 9) return true
    for (const p of PLAYERS) {
      if (picks.includes(p.n) || !fitsCell(puzzle, p, Math.floor(k / 3), k % 3)) continue
      picks.push(p.n)
      if (go(k + 1)) return true
      picks.pop()
    }
    return false
  }
  if (!go(0)) throw new Error(`no solution for ${date}`)
  return picks
}
const wrongFor = (date, r, c) => PLAYERS.find(p => !fitsCell(getDailyPuzzle(date), p, r, c)).n

const SOL = solve(TODAY)
const WRONG = wrongFor(TODAY, 2, 2)

// The two answer checks, worked out here from the data rather than through
// fitsOn, so a broken fitsOn can't also hide the answers the tests below need.
// Strict (boards from the grid cutover, 2026-10-25): the corrected data alone.
// Lenient (boards dealt before it): per header, the corrected data or what the
// shipped data (./faceoff/data.js) said.
const SHIPPED_BY_NAME = new Map(SHIPPED.map(p => [p.n, p]))
const strictCell = (puzzle, p, r, c) => isValid(p, puzzle.rows[r]) && isValid(p, puzzle.cols[c])
const shippedOrCorrected = (p, h) => isValid(p, h) || (SHIPPED_BY_NAME.has(p.n) && isValid(SHIPPED_BY_NAME.get(p.n), h))
// A cell of `date`'s board and a player only the lenient check accepts there.
function lenientOnly(date) {
  const puzzle = getDailyPuzzle(date)
  for (let k = 0; k < 9; k++) {
    const [r, c] = [Math.floor(k / 3), k % 3]
    const p = PLAYERS.find(x => !strictCell(puzzle, x, r, c) &&
      shippedOrCorrected(x, puzzle.rows[r]) && shippedOrCorrected(x, puzzle.cols[c]))
    if (p) return { r, c, name: p.n }
  }
  return null
}
// The first board from the day after the cutover that has such a player.
function afterCutoverCase() {
  for (let date = '2026-10-26'; date < '2027-01-01'; date = addDays(date, 1)) {
    const found = lenientOnly(date)
    if (found) return { date, ...found }
  }
  throw new Error('no board from 2026-10-26 to 2026-12-31 has a player only the shipped data accepted')
}
const localNoon = (date) => { const [y, m, d] = date.split('-').map(Number); return new Date(y, m - 1, d, 12) }
const longDate = (date) => localNoon(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
const headerLabel = (key) => AWARDS[key] || TEAMS[key] || key

let host, root
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 21, 12))
  saveResult.mockReset()
  localStorage.clear()
})
afterEach(() => {
  unmount()
  vi.useRealTimers()
})

function unmount() {
  if (!root) return
  act(() => root.unmount())
  host.remove()
  root = null
}

async function mount() {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<AuthContext.Provider value={{ user: USER, signOut() {} }}><FaceoffGame /></AuthContext.Provider>)
  })
}
// A reload: a fresh page over the same localStorage.
async function reload() {
  unmount()
  await mount()
}

const tick = (ms) => act(async () => { vi.advanceTimersByTime(ms) })
const click = (el) => act(async () => { el.click() })
const button = (label) => [...host.querySelectorAll('button')].find(el => el.textContent.trim().startsWith(label))
const ended = () => host.querySelector('.rc-title') !== null
const cell = (r, c) => host.querySelector('.faceoff-grid').children[5 + r * 4 + c]
const openCells = () => host.querySelectorAll('.faceoff-grid [role="button"]').length
const scoreShown = () => Number([...host.querySelectorAll('div')].find(d => /^Score: \d+$/.test(d.textContent)).textContent.slice(7))
const confettiShown = () => [...host.querySelectorAll('div')].some(d => d.style.animation.startsWith('confetti'))
const stored = () => JSON.parse(localStorage.getItem(KEY))
// Each header's label line (its last child), rows then columns.
const headersShown = () => {
  const g = host.querySelector('.faceoff-grid')
  return {
    rows: [0, 1, 2].map(r => g.children[4 + r * 4].lastChild.textContent),
    cols: [1, 2, 3].map(i => g.children[i].lastChild.textContent),
  }
}

async function guess(r, c, name) {
  await click(cell(r, c))
  await tick(100)
  const input = host.querySelector('input[placeholder^="Search"]')
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, name)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await click([...input.parentElement.querySelectorAll('[role="button"]')].find(el => el.textContent === name))
  await click(button('Submit "'))
}

async function pickArchiveDay(date) {
  await click(host.querySelector('button[aria-label="Archive"]'))
  await tick(0)
  await click(host.querySelector(`button[title="${date}"]`))
  await tick(200)
}

describe('Faceoff daily checkpoint', () => {
  it('stores filled cells as player names plus the guesses left', async () => {
    await mount()
    await guess(0, 0, SOL[0])
    await guess(2, 2, WRONG)
    expect(stored()).toEqual({ v: 1, date: TODAY, cells: { '0-0': SOL[0] }, left: 7 })
  })

  it('resumes a mid-game reload exactly, with no guess refunded', async () => {
    await mount()
    await guess(0, 0, SOL[0])
    await guess(1, 1, SOL[4])
    await guess(2, 2, WRONG)
    const score = scoreOf(SOL[0]) + scoreOf(SOL[4])
    expect(host.textContent).toContain('6 guesses left')
    expect(scoreShown()).toBe(score)

    await reload()
    expect(host.textContent).toContain('6 guesses left')
    expect(scoreShown()).toBe(score)
    expect(cell(0, 0).textContent).toBe(`+${scoreOf(SOL[0])}${SOL[0]}`)
    expect(cell(1, 1).textContent).toBe(`+${scoreOf(SOL[4])}${SOL[4]}`)
    expect(cell(0, 0).style.animation).toBe('none') // no reveal replay
    expect(openCells()).toBe(7)
    expect(ended()).toBe(false)
    expect(saveResult).not.toHaveBeenCalled()

    // A restored player can't be used again, and a new cell still reveals.
    await guess(0, 1, SOL[0])
    expect(host.textContent).toContain('5 guesses left')
    await tick(600) // let the miss's shake finish
    await guess(0, 1, SOL[1])
    expect(cell(0, 1).style.animation).toMatch(/^cellReveal/)

    // Finishing after the reload saves once, scored from the restored cells.
    for (let i = 0; i < 4; i++) await guess(2, 2, WRONG)
    expect(ended()).toBe(true)
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult).toHaveBeenCalledWith({
      game: 'faceoff', puzzleDate: TODAY, completed: false, score: score + scoreOf(SOL[1]),
    })
  })

  it('restores a won board as won, without saving again or replaying confetti', async () => {
    await mount()
    let atSave = null
    saveResult.mockImplementation(() => { atSave = stored() })
    for (let k = 0; k < 9; k++) await guess(Math.floor(k / 3), k % 3, SOL[k])
    const total = SOL.reduce((sum, n) => sum + scoreOf(n), 0)
    expect(ended()).toBe(true)
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult).toHaveBeenCalledWith({ game: 'faceoff', puzzleDate: TODAY, completed: true, score: total })
    // saveResult (which queues the result on disk synchronously) ran before
    // the checkpoint recorded the finish.
    expect(atSave.left).toBe(1)
    expect(stored()).toMatchObject({ left: 0 })
    expect(Object.keys(stored().cells)).toHaveLength(9)

    saveResult.mockClear()
    await reload()
    expect(ended()).toBe(true)
    expect(host.querySelector('.rc-title').textContent).toContain('Board Complete!')
    expect(host.textContent).toContain(`Final Score: ${total} / 855`)
    expect(host.textContent).toContain('9/9 cells filled')
    expect(host.textContent).toContain('Complete!')
    expect(button('📋')).toBeTruthy() // Share
    expect(openCells()).toBe(0)
    expect(confettiShown()).toBe(false)
    expect(cell(2, 2).style.animation).toBe('none')
    await tick(5000)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('restores a lost board as lost, without saving again', async () => {
    await mount()
    await guess(1, 0, SOL[3])
    for (let i = 0; i < 8; i++) await guess(2, 2, WRONG)
    expect(ended()).toBe(true)
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult).toHaveBeenCalledWith({ game: 'faceoff', puzzleDate: TODAY, completed: false, score: scoreOf(SOL[3]) })
    expect(stored()).toEqual({ v: 1, date: TODAY, cells: { '1-0': SOL[3] }, left: 0 })

    saveResult.mockClear()
    await reload()
    expect(ended()).toBe(true)
    expect(host.querySelector('.rc-title').textContent).toContain('Game Over!')
    expect(host.textContent).toContain('Game over')
    expect(host.textContent).toContain('1/9 cells filled')
    expect(cell(1, 0).textContent).toContain(SOL[3])
    expect(openCells()).toBe(0)
    expect(button('📋')).toBeTruthy()
    await tick(5000)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('never reads or writes the checkpoint on an Archive replay', async () => {
    // A checkpoint valid for the replayed day: reading it would resume it.
    // Its filled cell is one the replay below never plays, so neither of the
    // replay's moves could write this same value back.
    const pastSol = solve(PAST)
    const seeded = JSON.stringify({ v: 1, date: PAST, cells: { '1-1': pastSol[4] }, left: 8 })
    localStorage.setItem(KEY, seeded)
    await mount()
    const get = vi.spyOn(MemoryStorage.prototype, 'getItem')
    const set = vi.spyOn(MemoryStorage.prototype, 'setItem')
    try {
      await pickArchiveDay(PAST)
      expect(host.textContent).toContain('October 18, 2026')
      expect(host.textContent).toContain('9 guesses left')
      expect(cell(1, 1).textContent).toBe('?')

      await guess(0, 0, pastSol[0]) // a valid guess
      await guess(2, 2, wrongFor(PAST, 2, 2)) // and a miss
      expect(host.textContent).toContain('7 guesses left')
      expect(cell(0, 0).textContent).toContain(pastSol[0])
      expect(get.mock.calls.filter(([k]) => k === KEY)).toEqual([])
      expect(set.mock.calls.filter(([k]) => k === KEY)).toEqual([])
    } finally {
      get.mockRestore()
      set.mockRestore()
    }
    expect(localStorage.getItem(KEY)).toBe(seeded)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it("keeps today's checkpoint through a replay and resumes it when today is picked again", async () => {
    await mount()
    await guess(0, 0, SOL[0])
    const live = localStorage.getItem(KEY)

    const pastSol = solve(PAST)
    await pickArchiveDay(PAST)
    await guess(0, 0, pastSol[0])
    await guess(2, 2, wrongFor(PAST, 2, 2))
    expect(host.textContent).toContain('7 guesses left')
    expect(localStorage.getItem(KEY)).toBe(live)

    await pickArchiveDay(TODAY)
    expect(host.textContent).toContain('8 guesses left')
    expect(cell(0, 0).textContent).toContain(SOL[0])
  })

  const puzzle = getDailyPuzzle(TODAY)
  const notToday = PLAYERS.find(p => !fitsCell(puzzle, p, 0, 0)).n
  // A player who fits two cells, so only the no-repeats rule rejects him twice.
  const twice = (() => {
    for (const p of PLAYERS) {
      const fit = [...Array(9).keys()].filter(k => fitsCell(puzzle, p, Math.floor(k / 3), k % 3))
      if (fit.length >= 2) return Object.fromEntries(fit.slice(0, 2).map(k => [`${Math.floor(k / 3)}-${k % 3}`, p.n]))
    }
    throw new Error('no player fits two cells')
  })()
  // A player placed in a cell whose row he fits but not its column (or the
  // reverse), so each half of the fit check has to reject him on its own.
  const halfFit = (fitsRow) => {
    for (let k = 0; k < 9; k++) {
      const [r, c] = [Math.floor(k / 3), k % 3]
      const p = PLAYERS.find(x => fits(x, puzzle.rows[r]) === fitsRow && fits(x, puzzle.cols[c]) !== fitsRow)
      if (p) return { [`${r}-${c}`]: p.n }
    }
    throw new Error(`no player fits only the ${fitsRow ? 'row' : 'column'}`)
  }
  const base ={ v: 1, date: TODAY, cells: { '0-0': SOL[0] }, left: 8 }
  const bad = {
    'not JSON': '{"v":1,',
    'JSON null': 'null',
    'a number': '42',
    'an array': '[]',
    'another version': JSON.stringify({ ...base, v: 2 }),
    'no cells': JSON.stringify({ ...base, cells: undefined }),
    'cells as an array': JSON.stringify({ ...base, cells: [SOL[0]] }),
    'cells as null': JSON.stringify({ ...base, cells: null }),
    'guesses above 9': JSON.stringify({ ...base, left: 10 }),
    'negative guesses': JSON.stringify({ ...base, left: -1 }),
    'fractional guesses': JSON.stringify({ ...base, left: 7.5 }),
    'guesses as a string': JSON.stringify({ ...base, left: '8' }),
    'an unknown player': JSON.stringify({ ...base, cells: { '0-0': 'Nobody Atall' } }),
    'a player name that is not a string': JSON.stringify({ ...base, cells: { '0-0': 99 } }),
    "a player who doesn't fit the cell": JSON.stringify({ ...base, cells: { '0-0': notToday } }),
    "a player who fits the cell's row but not its column": JSON.stringify({ ...base, cells: halfFit(true) }),
    "a player who fits the cell's column but not its row": JSON.stringify({ ...base, cells: halfFit(false) }),
    'one player in two cells': JSON.stringify({ ...base, cells: twice, left: 7 }),
    'a cell off the board': JSON.stringify({ ...base, cells: { '3-0': SOL[0] } }),
    'a malformed cell key': JSON.stringify({ ...base, cells: { '00': SOL[0] } }),
    'more cells than guesses spent': JSON.stringify({ ...base, cells: { '0-0': SOL[0], '0-1': SOL[1] }, left: 8 }),
  }

  it.each(Object.entries(bad))('ignores a corrupted checkpoint (%s) and starts fresh', async (_, raw) => {
    localStorage.setItem(KEY, raw)
    await mount()
    expect(host.textContent).toContain('9 guesses left')
    expect(scoreShown()).toBe(0)
    expect(openCells()).toBe(9)
    expect(ended()).toBe(false)

    // The next move replaces it with a good checkpoint.
    await guess(0, 0, SOL[0])
    expect(stored()).toEqual({ v: 1, date: TODAY, cells: { '0-0': SOL[0] }, left: 8 })
  })

  it('ignores a checkpoint dated another day, even one that fits today', async () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, date: YESTERDAY, cells: { '0-0': SOL[0] }, left: 0 }))
    await mount()
    expect(host.textContent).toContain('9 guesses left')
    expect(cell(0, 0).textContent).toBe('?')
    expect(ended()).toBe(false)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it("a tab left open since yesterday never overwrites today's checkpoint", async () => {
    // Today's board, played in another tab: a hit and a miss.
    await mount()
    await guess(0, 0, SOL[0])
    await guess(2, 2, WRONG)
    const today = localStorage.getItem(KEY)

    // The stale tab, dealt at 23:58 yesterday, plays on after midnight.
    vi.setSystemTime(new Date(2026, 9, 20, 23, 58))
    await reload()
    expect(host.textContent).toContain('October 20, 2026')
    expect(host.textContent).toContain('9 guesses left')
    vi.setSystemTime(new Date(2026, 9, 21, 0, 5))
    const yesterday = solve(YESTERDAY)
    await guess(0, 0, yesterday[0])
    await guess(1, 1, wrongFor(YESTERDAY, 1, 1))
    await guess(2, 2, wrongFor(YESTERDAY, 2, 2))
    expect(host.textContent).toContain('6 guesses left')
    expect(cell(0, 0).textContent).toContain(yesterday[0])
    expect(localStorage.getItem(KEY)).toBe(today)

    // Today's board still resumes from its own checkpoint.
    await reload()
    expect(host.textContent).toContain('October 21, 2026')
    expect(host.textContent).toContain('7 guesses left')
    expect(cell(0, 0).textContent).toContain(SOL[0])
    expect(openCells()).toBe(8)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it.each([
    ['blocked (private mode)', true],
    ['full', false],
  ])('still plays when storage is %s', async (_label, readsThrow) => {
    const get = vi.spyOn(MemoryStorage.prototype, 'getItem')
    if (readsThrow) get.mockImplementation(() => { throw new Error('denied') })
    const set = vi.spyOn(MemoryStorage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied') })
    try {
      await mount()
      expect(host.textContent).toContain('9 guesses left')
      await guess(0, 0, SOL[0])
      expect(host.textContent).toContain('8 guesses left')
      expect(cell(0, 0).textContent).toContain(SOL[0])
      // The write was attempted and its failure swallowed.
      expect(get).toHaveBeenCalledWith(KEY)
      expect(set.mock.calls.some(([k]) => k === KEY)).toBe(true)
    } finally {
      get.mockRestore()
      set.mockRestore()
    }
  })
})

describe('Faceoff answer checks around the grid cutover', () => {
  it('restores a checkpointed player that only the shipped data fits to his cell', async ({ skip }) => {
    const found = lenientOnly(TODAY)
    skip(!found, `no player on ${TODAY}'s board fits a cell only under the shipped data`)
    const { r, c, name } = found
    localStorage.setItem(KEY, JSON.stringify({ v: 1, date: TODAY, cells: { [`${r}-${c}`]: name }, left: 8 }))
    await mount()
    expect(host.textContent).toContain('8 guesses left')
    expect(cell(r, c).textContent).toBe(`+${scoreOf(name)}${name}`)
    expect(scoreShown()).toBe(scoreOf(name))
    expect(openCells()).toBe(8)
  })

  it('checks strictly against the corrected data on a board dealt after the cutover', async () => {
    const { date, r, c, name } = afterCutoverCase()
    const puzzle = getDailyPuzzle(date)
    vi.setSystemTime(localNoon(date))
    await mount()
    expect(host.textContent).toContain(longDate(date))
    expect(headersShown()).toEqual({ rows: puzzle.rows.map(headerLabel), cols: puzzle.cols.map(headerLabel) })

    // The shipped data's answer is a miss now: it shakes and costs a guess.
    await guess(r, c, name)
    expect(cell(r, c).style.animation).toMatch(/^shake/)
    expect(cell(r, c).textContent).not.toContain(name)
    expect(host.textContent).toContain('8 guesses left')
    expect(scoreShown()).toBe(0)
    expect(stored()).toEqual({ v: 1, date, cells: {}, left: 8 })

    // A player the corrected data puts there still fills the cell.
    await tick(600)
    const right = PLAYERS.find(p => strictCell(puzzle, p, r, c)).n
    await guess(r, c, right)
    expect(cell(r, c).textContent).toBe(`+${scoreOf(right)}${right}`)
    expect(stored()).toEqual({ v: 1, date, cells: { [`${r}-${c}`]: right }, left: 7 })
  })
})
