// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'

// Today's Knockout board lives in localStorage ('streakle-knockout') so a
// reload resumes it exactly; Archive replays never touch it.
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

const { default: KnockoutGame } = await import('./Knockout.jsx')

// The page's own fighters and generator, so the test can't drift.
const { FIGHTERS, getDailyPuzzle, fitsOn, matchesHeader: headerFits } = await import('./knockout/puzzle.js')
const { FIGHTERS: SHIPPED, PROMOTIONS, WEIGHT_CLASSES, ACHIEVEMENTS } = await import('./knockout/data.js')
const { addDays } = await import('./dateMath.js')
// Every test date is a board dealt before the grid cutover: check answers the
// way the page does there (corrected data, or what the shipped data accepted).
const matchesHeader = fitsOn('2026-10-21')
// Knockout.jsx's scoring: rarer fighters score more.
const calcScore = (fighter) => Math.max(5, Math.min(100, Math.round(115 - fighter.f)))

const KEY = 'streakle-knockout'
const TODAY = '2026-10-21'
const PAST = '2026-10-18'
const USER = { id: 'u-1', email: 'player@example.com', user_metadata: {} }
const CELLS = [0, 1, 2].flatMap(r => [0, 1, 2].map(c => [r, c]))

const fits = (f, pz, r, c) => matchesHeader(f, pz.rows[r]) && matchesHeader(f, pz.cols[c])
const score = (name) => calcScore(FIGHTERS.find(f => f.n === name))

// A full answer key: nine distinct fighters, one per cell.
function solve(pz) {
  const out = {}
  const used = new Set()
  const go = (i) => {
    if (i === CELLS.length) return true
    const [r, c] = CELLS[i]
    for (const f of FIGHTERS) {
      if (used.has(f.n) || !fits(f, pz, r, c)) continue
      used.add(f.n); out[`${r}-${c}`] = f.n
      if (go(i + 1)) return true
      used.delete(f.n); delete out[`${r}-${c}`]
    }
    return false
  }
  if (!go(0)) throw new Error('no full solution')
  return out
}
// Fighters who do NOT fit a cell (for wrong guesses).
const misfits = (pz, r, c) => FIGHTERS.filter(f => !fits(f, pz, r, c)).map(f => f.n)

const PZ = getDailyPuzzle(TODAY)
const ANSWERS = solve(PZ)

// The two answer checks, worked out here from the data rather than through
// fitsOn, so a broken fitsOn can't also hide the answers the tests below need.
// Strict (boards from the grid cutover, 2026-10-25): the corrected data alone.
// Lenient (boards dealt before it): per header, the corrected data or what the
// shipped data (./knockout/data.js) said.
const SHIPPED_BY_NAME = new Map(SHIPPED.map(f => [f.n, f]))
const strictCell = (pz, f, r, c) => headerFits(f, pz.rows[r]) && headerFits(f, pz.cols[c])
const shippedOrCorrected = (f, h) => headerFits(f, h) || (SHIPPED_BY_NAME.has(f.n) && headerFits(SHIPPED_BY_NAME.get(f.n), h))
// A cell of `date`'s board and a fighter only the lenient check accepts there.
function lenientOnly(date) {
  const pz = getDailyPuzzle(date)
  for (const [r, c] of CELLS) {
    const f = FIGHTERS.find(x => !strictCell(pz, x, r, c) &&
      shippedOrCorrected(x, pz.rows[r]) && shippedOrCorrected(x, pz.cols[c]))
    if (f) return { r, c, name: f.n }
  }
  return null
}
// The first board from the day after the cutover that has such a fighter.
function afterCutoverCase() {
  for (let date = '2026-10-26'; date < '2027-01-01'; date = addDays(date, 1)) {
    const found = lenientOnly(date)
    if (found) return { date, ...found }
  }
  throw new Error('no board from 2026-10-26 to 2026-12-31 has a fighter only the shipped data accepted')
}
const localNoon = (date) => { const [y, m, d] = date.split('-').map(Number); return new Date(y, m - 1, d, 12) }
const longDate = (date) => localNoon(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
const LABEL = { ...PROMOTIONS, ...WEIGHT_CLASSES, ...ACHIEVEMENTS }

let host, root
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 21, 12))
  saveResult.mockClear()
  localStorage.clear()
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.useRealTimers()
})

async function mount() {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<AuthContext.Provider value={{ user: USER, signOut() {} }}><KnockoutGame /></AuthContext.Provider>)
  })
}
// A reload: a fresh root, localStorage kept.
async function reload() {
  act(() => root.unmount())
  host.remove()
  await mount()
}

const tick = (ms) => act(async () => { vi.advanceTimersByTime(ms) })
const click = (el) => act(async () => { el.click() })
const button = (label) => [...host.querySelectorAll('button')].find(el => el.textContent.trim().startsWith(label))
const ended = () => host.querySelector('.rc-title') !== null
const stored = () => localStorage.getItem(KEY)
const checkpoint = () => JSON.parse(stored())
// .ko-grid children: corner, 3 column headers, then per row a header + 3 cells.
const cellEl = (r, c) => host.querySelector('.ko-grid').children[5 + r * 4 + c]
const openCells = () => host.querySelectorAll('.ko-grid [role="button"]').length
const styled = (name) => [...host.querySelectorAll('div')].filter(el => (el.getAttribute('style') ?? '').includes(name))
// Each header's label line (its last child), rows then columns.
const headersShown = () => {
  const g = host.querySelector('.ko-grid')
  return {
    rows: [0, 1, 2].map(r => g.children[4 + r * 4].lastChild.textContent),
    cols: [1, 2, 3].map(i => g.children[i].lastChild.textContent),
  }
}

async function pickArchiveDay(date) {
  await click(host.querySelector('button[aria-label="Archive"]'))
  await tick(0)
  await click(host.querySelector(`button[title="${date}"]`))
  await tick(200)
}

// Search a fighter by full name for cell (r, c), pick them, confirm.
async function guess(r, c, name) {
  await click(cellEl(r, c))
  await tick(100)
  const input = host.querySelector('input[placeholder^="Search"]')
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, name)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const pick = [...input.parentElement.querySelectorAll('[role="button"]')].find(el => el.firstChild.textContent === name)
  await click(pick)
  await click(button('Confirm:'))
  await tick(600)
}

async function expectFreshBoard() {
  expect(host.textContent).toContain('9 guesses left')
  expect(host.textContent).toContain('Score: 0')
  expect(openCells()).toBe(9)
  expect(ended()).toBe(false)
}

describe("Knockout: today's checkpoint", () => {
  it('resumes a mid-game reload with nothing refunded', async () => {
    await mount()
    await guess(0, 0, ANSWERS['0-0'])
    await guess(2, 2, ANSWERS['2-2'])
    await guess(1, 1, misfits(PZ, 1, 1)[0]) // a wrong guess is spent too
    const total = score(ANSWERS['0-0']) + score(ANSWERS['2-2'])
    expect(host.textContent).toContain('6 guesses left')
    expect(checkpoint()).toEqual({ v: 1, date: TODAY, cells: { '0-0': ANSWERS['0-0'], '2-2': ANSWERS['2-2'] }, left: 6 })

    await reload()
    expect(host.textContent).toContain('6 guesses left')
    expect(host.textContent).toContain(`Score: ${total}`)
    expect(cellEl(0, 0).textContent).toContain(ANSWERS['0-0'])
    expect(cellEl(2, 2).textContent).toContain(ANSWERS['2-2'])
    expect(cellEl(1, 1).textContent).toBe('?')
    expect(openCells()).toBe(7)
    expect(styled('cellReveal')).toHaveLength(0) // restored cells don't re-reveal
    expect(saveResult).not.toHaveBeenCalled()

    // Play on: six guesses left fill six more cells, then the board ends.
    const rest = CELLS.map(([r, c]) => `${r}-${c}`).filter(k => !['0-0', '2-2', '1-1'].includes(k)).slice(0, 6)
    for (const k of rest) await guess(+k[0], +k[2], ANSWERS[k])
    expect(ended()).toBe(true)
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult).toHaveBeenCalledWith({
      game: 'knockout', puzzleDate: TODAY, completed: false,
      score: total + rest.reduce((s, k) => s + score(ANSWERS[k]), 0),
    })
  })

  it('restores a won board as won and never saves it again', async () => {
    await mount()
    for (const [r, c] of CELLS) await guess(r, c, ANSWERS[`${r}-${c}`])
    const total = Object.values(ANSWERS).reduce((s, n) => s + score(n), 0)
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult).toHaveBeenCalledWith({ game: 'knockout', puzzleDate: TODAY, completed: true, score: total })
    expect(styled('confetti').length).toBeGreaterThan(0)
    expect(checkpoint()).toEqual({ v: 1, date: TODAY, cells: ANSWERS, left: 0 })

    saveResult.mockClear()
    await reload()
    await tick(2000)
    expect(ended()).toBe(true)
    expect(host.textContent).toContain('Flawless Victory!')
    expect(host.textContent).toContain(`Final score: ${total}`)
    expect(host.textContent).toContain('9/9 cells filled')
    expect(host.textContent).toContain('Complete!')
    expect(host.querySelector('.rc-share button')).not.toBeNull()
    expect(openCells()).toBe(0)
    expect(styled('confetti')).toHaveLength(0)
    expect(styled('cellReveal')).toHaveLength(0)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('restores a lost board as lost and never saves it again', async () => {
    await mount()
    await guess(0, 0, ANSWERS['0-0'])
    const wrong = misfits(PZ, 1, 1)
    for (let i = 0; i < 8; i++) await guess(1, 1, wrong[i])
    expect(ended()).toBe(true)
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult).toHaveBeenCalledWith({ game: 'knockout', puzzleDate: TODAY, completed: false, score: score(ANSWERS['0-0']) })

    saveResult.mockClear()
    await reload()
    await tick(2000)
    expect(ended()).toBe(true)
    expect(host.textContent).toContain('Game Over')
    expect(host.textContent).toContain('Game over')
    expect(host.textContent).toContain(`Final score: ${score(ANSWERS['0-0'])}`)
    expect(host.textContent).toContain('1/9 cells filled')
    expect(host.querySelector('.rc-share button')).not.toBeNull()
    expect(openCells()).toBe(0)
    expect(saveResult).not.toHaveBeenCalled()
  })

  // saveResult queues the result on disk synchronously, so calling it first
  // means the result is stored before the checkpoint records the finish.
  it("saves the finishing move before the checkpoint records it", async () => {
    const setItem = vi.spyOn(localStorage, 'setItem')
    try {
      await mount()
      for (const [r, c] of CELLS) await guess(r, c, ANSWERS[`${r}-${c}`])
      const finishing = setItem.mock.calls.findIndex(([k, v]) => k === KEY && JSON.parse(v).left === 0)
      expect(finishing).toBeGreaterThanOrEqual(0)
      expect(saveResult.mock.invocationCallOrder[0]).toBeLessThan(setItem.mock.invocationCallOrder[finishing])
    } finally {
      setItem.mockRestore()
    }
  })

  it('an Archive replay never reads a checkpoint, even one dated that day', async () => {
    const pastPz = getDailyPuzzle(PAST)
    const pastAnswers = solve(pastPz)
    const raw = JSON.stringify({ v: 1, date: PAST, cells: { '0-0': pastAnswers['0-0'] }, left: 8 })
    localStorage.setItem(KEY, raw)
    await mount()
    await expectFreshBoard() // dated another day: today's board ignores it
    await pickArchiveDay(PAST)
    await expectFreshBoard()
    await guess(0, 1, pastAnswers['0-1'])
    expect(host.textContent).toContain('8 guesses left')
    expect(stored()).toBe(raw)
  })

  it("an Archive replay never writes, and picking today again resumes today's board", async () => {
    await mount()
    await guess(0, 0, ANSWERS['0-0'])
    await guess(0, 1, misfits(PZ, 0, 1)[0])
    const today = stored()

    await pickArchiveDay(PAST)
    await expectFreshBoard()
    const pastAnswers = solve(getDailyPuzzle(PAST))
    for (const [r, c] of CELLS) await guess(r, c, pastAnswers[`${r}-${c}`])
    expect(host.textContent).toContain('Flawless Victory!')
    expect(stored()).toBe(today)
    expect(saveResult).not.toHaveBeenCalled()

    await pickArchiveDay(TODAY)
    expect(ended()).toBe(false)
    expect(host.textContent).toContain('7 guesses left')
    expect(host.textContent).toContain(`Score: ${score(ANSWERS['0-0'])}`)
    expect(cellEl(0, 0).textContent).toContain(ANSWERS['0-0'])
    expect(openCells()).toBe(8)
    expect(styled('confetti')).toHaveLength(0)
    expect(styled('cellReveal')).toHaveLength(0)
    expect(stored()).toBe(today)
  })

  const base = { v: 1, date: TODAY, cells: { '0-0': ANSWERS['0-0'] }, left: 8 }
  // A fighter who fits two cells of one row, to test a repeated answer.
  const twice = (() => {
    for (const r of [0, 1, 2]) {
      const f = FIGHTERS.find(x => fits(x, PZ, r, 0) && fits(x, PZ, r, 1))
      if (f) return { [`${r}-0`]: f.n, [`${r}-1`]: f.n }
    }
    throw new Error('no fighter fits two cells')
  })()
  // A fighter placed in a cell whose row they fit but not its column (or the
  // reverse), so each half of the fit check has to reject them on its own.
  const halfFit = (fitsRow) => {
    for (const [r, c] of CELLS) {
      const f = FIGHTERS.find(x => matchesHeader(x, PZ.rows[r]) === fitsRow && matchesHeader(x, PZ.cols[c]) !== fitsRow)
      if (f) return { [`${r}-${c}`]: f.n }
    }
    throw new Error(`no fighter fits only the ${fitsRow ? 'row' : 'column'}`)
  }
  const BAD = {
    'not JSON': '{"v":1,',
    'JSON null': 'null',
    'an array': '[]',
    'a number': '42',
    'a string': '"streakle"',
    'a newer version': JSON.stringify({ ...base, v: 2 }),
    'no version': JSON.stringify({ ...base, v: undefined }),
    'no cells': JSON.stringify({ ...base, cells: undefined }),
    'null cells': JSON.stringify({ ...base, cells: null }),
    'cells as an array': JSON.stringify({ ...base, cells: [ANSWERS['0-0']] }),
    'cells as a string': JSON.stringify({ ...base, cells: ANSWERS['0-0'] }),
    'an unknown fighter': JSON.stringify({ ...base, cells: { '0-0': 'Not A Fighter' } }),
    'a non-string fighter': JSON.stringify({ ...base, cells: { '0-0': 7 } }),
    'a fighter who does not fit the cell': JSON.stringify({ ...base, cells: { '0-0': misfits(PZ, 0, 0)[0] } }),
    "a fighter who fits the cell's row but not its column": JSON.stringify({ ...base, cells: halfFit(true) }),
    "a fighter who fits the cell's column but not its row": JSON.stringify({ ...base, cells: halfFit(false) }),
    'the same fighter twice': JSON.stringify({ ...base, cells: twice, left: 7 }),
    'an off-grid cell': JSON.stringify({ ...base, cells: { '3-0': ANSWERS['0-0'] } }),
    'a malformed cell key': JSON.stringify({ ...base, cells: { '00': ANSWERS['0-0'] } }),
    'a __proto__ cell key': `{"v":1,"date":"${TODAY}","cells":{"__proto__":"${ANSWERS['0-0']}"},"left":8}`,
    'too many guesses left': JSON.stringify({ ...base, cells: {}, left: 10 }),
    'negative guesses left': JSON.stringify({ ...base, left: -1 }),
    'fractional guesses left': JSON.stringify({ ...base, left: 7.5 }),
    'guesses left as a string': JSON.stringify({ ...base, left: '8' }),
    'missing guesses left': JSON.stringify({ ...base, left: undefined }),
    'more cells than guesses spent': JSON.stringify({ ...base, cells: { '0-0': ANSWERS['0-0'], '1-1': ANSWERS['1-1'] }, left: 8 }),
  }

  it.each(Object.entries(BAD))('ignores a checkpoint with %s and starts fresh', async (_, raw) => {
    localStorage.setItem(KEY, raw)
    await mount()
    await expectFreshBoard()
    expect(saveResult).not.toHaveBeenCalled()
    await guess(0, 0, ANSWERS['0-0'])
    expect(checkpoint()).toEqual({ v: 1, date: TODAY, cells: { '0-0': ANSWERS['0-0'] }, left: 8 })
  })

  it('accepts the well-formed base checkpoint those cases break', async () => {
    localStorage.setItem(KEY, JSON.stringify(base))
    await mount()
    expect(host.textContent).toContain('8 guesses left')
    expect(cellEl(0, 0).textContent).toContain(ANSWERS['0-0'])
  })

  it.each(['2026-10-20', '2026-10-22'])('ignores a checkpoint dated %s', async (date) => {
    localStorage.setItem(KEY, JSON.stringify({ ...base, date, cells: ANSWERS, left: 0 }))
    await mount()
    await expectFreshBoard()
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('keeps a board left open past midnight under the day it was dealt', async () => {
    vi.setSystemTime(new Date(2026, 9, 21, 23, 58))
    await mount()
    await guess(0, 0, ANSWERS['0-0'])
    vi.setSystemTime(new Date(2026, 9, 22, 0, 2))
    await guess(0, 1, ANSWERS['0-1'])
    expect(checkpoint()).toEqual({ v: 1, date: TODAY, cells: { '0-0': ANSWERS['0-0'], '0-1': ANSWERS['0-1'] }, left: 7 })

    await reload() // now the 22nd: yesterday's checkpoint is not today's board
    await expectFreshBoard()
    expect(host.textContent).toContain('October 22, 2026')
  })

  it("a tab left open since yesterday never overwrites today's checkpoint", async () => {
    // Today's board, played in another tab: a hit and a miss.
    await mount()
    await guess(0, 0, ANSWERS['0-0'])
    await guess(0, 1, misfits(PZ, 0, 1)[0])
    const today = stored()

    // The stale tab, dealt at 23:58 yesterday, plays on after midnight.
    vi.setSystemTime(new Date(2026, 9, 20, 23, 58))
    await reload()
    expect(host.textContent).toContain('October 20, 2026')
    await expectFreshBoard()
    const yesterdayPz = getDailyPuzzle('2026-10-20')
    const yesterday = solve(yesterdayPz)
    vi.setSystemTime(new Date(2026, 9, 21, 0, 5))
    await guess(0, 0, yesterday['0-0'])
    await guess(1, 1, misfits(yesterdayPz, 1, 1)[0])
    await guess(2, 2, misfits(yesterdayPz, 2, 2)[0])
    expect(host.textContent).toContain('6 guesses left')
    expect(cellEl(0, 0).textContent).toContain(yesterday['0-0'])
    expect(stored()).toBe(today)

    // Today's board still resumes from its own checkpoint.
    await reload()
    expect(host.textContent).toContain('October 21, 2026')
    expect(host.textContent).toContain('7 guesses left')
    expect(cellEl(0, 0).textContent).toContain(ANSWERS['0-0'])
    expect(openCells()).toBe(8)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('plays on when storage throws', async () => {
    const getItem = vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('denied') })
    const setItem = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('denied') })
    // A throw inside a click handler doesn't stop the click; it surfaces here.
    const errors = []
    const onError = (e) => errors.push(e.error ?? e.message)
    window.addEventListener('error', onError)
    try {
      await mount()
      await expectFreshBoard()
      await guess(0, 0, ANSWERS['0-0'])
      await guess(1, 1, misfits(PZ, 1, 1)[0])
      expect(host.textContent).toContain('7 guesses left')
      expect(cellEl(0, 0).textContent).toContain(ANSWERS['0-0'])
      expect(errors).toEqual([])
    } finally {
      window.removeEventListener('error', onError)
      getItem.mockRestore()
      setItem.mockRestore()
    }
  })
})

describe('Knockout answer checks around the grid cutover', () => {
  const todayCase = lenientOnly(TODAY)
  const noTodayCase = `no fighter on ${TODAY}'s board fits a cell only under the shipped data`

  it('restores a checkpointed fighter that only the shipped data fits to the cell', async ({ skip }) => {
    skip(!todayCase, noTodayCase)
    const { r, c, name } = todayCase
    localStorage.setItem(KEY, JSON.stringify({ v: 1, date: TODAY, cells: { [`${r}-${c}`]: name }, left: 8 }))
    await mount()
    expect(host.textContent).toContain('8 guesses left')
    expect(host.textContent).toContain(`Score: ${score(name)}`)
    expect(cellEl(r, c).textContent).toContain(name)
    expect(openCells()).toBe(8)
  })

  it("accepts a fighter that only the shipped data fits to the cell on today's board", async ({ skip }) => {
    skip(!todayCase, noTodayCase)
    const { r, c, name } = todayCase
    await mount()
    await guess(r, c, name)
    expect(cellEl(r, c).textContent).toContain(name)
    expect(host.textContent).toContain('8 guesses left')
    expect(host.textContent).toContain(`Score: ${score(name)}`)
    expect(checkpoint()).toEqual({ v: 1, date: TODAY, cells: { [`${r}-${c}`]: name }, left: 8 })
  })

  it('checks strictly against the corrected data on a board dealt after the cutover', async () => {
    const { date, r, c, name } = afterCutoverCase()
    const pz = getDailyPuzzle(date)
    vi.setSystemTime(localNoon(date))
    await mount()
    expect(host.textContent).toContain(longDate(date))
    expect(headersShown()).toEqual({ rows: pz.rows.map(h => LABEL[h]), cols: pz.cols.map(h => LABEL[h]) })

    // The shipped data's answer is a miss now: it costs a guess, fills nothing.
    await guess(r, c, name)
    expect(cellEl(r, c).textContent).not.toContain(name)
    expect(host.textContent).toContain('8 guesses left')
    expect(host.textContent).toContain('Score: 0')
    expect(openCells()).toBe(9)
    expect(checkpoint()).toEqual({ v: 1, date, cells: {}, left: 8 })

    // A fighter the corrected data puts there still fills the cell.
    const right = FIGHTERS.find(f => strictCell(pz, f, r, c)).n
    await guess(r, c, right)
    expect(cellEl(r, c).textContent).toContain(right)
    expect(checkpoint()).toEqual({ v: 1, date, cells: { [`${r}-${c}`]: right }, left: 7 })
  })
})
