// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { URL as FileURL } from 'node:url'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'

// Today's Gridiron board lives in a localStorage checkpoint, so a reload
// resumes it exactly (no refunded guesses) and an ended board stays ended
// without saving again. Archive replays never touch it.
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

// A plain in-memory localStorage: the runtime's own global can shadow
// happy-dom's (Node 25's throws without a backing file).
const store = new Map()
const memoryStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)) },
  removeItem: (k) => { store.delete(k) },
  clear: () => { store.clear() },
}

const { default: GridironGame } = await import('./Gridiron.jsx')

// The player bank and header labels, read from the source the way the checkers do.
// (Node's URL: happy-dom's resolves a Windows file:// base to http://localhost.)
const src = readFileSync(new FileURL('./Gridiron.jsx', import.meta.url), 'utf8')
const literal = (name, open, close) => {
  const start = src.indexOf(open, src.indexOf(`const ${name} =`))
  const end = src.indexOf(`\n${close};`, start)
  return new Function(`return ${src.slice(start, end + 2)}`)()
}
const TEAMS = literal('TEAMS', '{', '}')
const AWARDS = literal('AWARDS', '{', '}')
const PLAYERS = literal('PLAYERS', '[', ']')
// The relocated codes never head a grid, so each header label names one key.
const KEY_BY_LABEL = Object.fromEntries([
  ...Object.entries(TEAMS).filter(([k]) => !['OAK', 'SD', 'STL'].includes(k)),
  ...Object.entries(AWARDS),
].map(([k, label]) => [label, k]))
const fits = (p, crit) => p.t.includes(crit) || p.a.includes(crit)

const KEY = 'streakle-gridiron'
const TODAY = '2026-10-21'
const PAST = '2026-10-18'
const USER = { id: 'u-1', email: 'player@example.com', user_metadata: {} }
const CELLS = ['0-0', '0-1', '0-2', '1-0', '1-1', '1-2', '2-0', '2-1', '2-2']

let host, root
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 21, 12))
  vi.stubGlobal('localStorage', memoryStorage)
  saveResult.mockReset()
  store.clear()
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

async function mount() {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<AuthContext.Provider value={{ user: USER, signOut() {} }}><GridironGame /></AuthContext.Provider>)
  })
}
// A reload: a fresh page over the same localStorage.
async function reload() {
  act(() => root.unmount())
  host.remove()
  await mount()
}
const tick = (ms) => act(async () => { vi.advanceTimersByTime(ms) })
const click = (el) => act(async () => { el.click() })
const button = (label) => [...host.querySelectorAll('button')].find(el => el.textContent.trim().startsWith(label))
const ended = () => host.querySelector('.rc-title') !== null
const grid = () => host.querySelector('.gridiron-grid')
const cellEl = (key) => grid().children[5 + Number(key[0]) * 4 + Number(key[2])]
const scoreShown = () => Number([...host.querySelectorAll('div')].find(d => d.children.length === 0 && d.textContent.startsWith('Score: ')).textContent.slice(7))
const checkpoint = () => JSON.parse(store.get(KEY))
const styled = (word) => [...host.querySelectorAll('div')].filter(d => (d.getAttribute('style') ?? '').includes(word)).length
const fresh = () => {
  expect(ended()).toBe(false)
  expect(host.textContent).toContain('9 guesses left')
  expect(scoreShown()).toBe(0)
  for (const key of CELLS) expect(cellEl(key).textContent).toBe('?')
}

// Today's (or the shown day's) board: a full distinct-player solution, a
// wrong player for every cell, one player who fits two cells, and a player
// placed in a cell whose row he fits but not its column (rowOnly) or the
// reverse (colOnly), so each half of the fit check must reject him alone.
function readBoard() {
  const g = grid()
  const cols = [1, 2, 3].map(i => KEY_BY_LABEL[g.children[i].textContent])
  const rows = [0, 1, 2].map(r => KEY_BY_LABEL[g.children[4 + r * 4].textContent])
  expect([...rows, ...cols].every(Boolean)).toBe(true)
  const options = {}, wrong = {}
  for (const key of CELLS) {
    const [r, c] = [rows[key[0]], cols[key[2]]]
    options[key] = PLAYERS.filter(p => fits(p, r) && fits(p, c)).map(p => p.n)
    wrong[key] = PLAYERS.find(p => !(fits(p, r) && fits(p, c))).n
  }
  const order = [...CELLS].sort((a, b) => options[a].length - options[b].length)
  const solution = {}, used = new Set()
  const go = (i) => {
    if (i === order.length) return true
    for (const n of options[order[i]]) {
      if (used.has(n)) continue
      used.add(n); solution[order[i]] = n
      if (go(i + 1)) return true
      used.delete(n)
    }
    return false
  }
  expect(go(0)).toBe(true)
  let twice = null
  for (const a of CELLS) for (const b of CELLS) {
    const n = a < b && options[a].find(name => options[b].includes(name))
    if (n && !twice) twice = { name: n, cells: [a, b] }
  }
  const halfFit = (fitsRow) => {
    for (const key of CELLS) {
      const [r, c] = [rows[key[0]], cols[key[2]]]
      const p = PLAYERS.find(x => fits(x, r) === fitsRow && fits(x, c) !== fitsRow)
      if (p) return { [key]: p.n }
    }
    return null
  }
  return { solution, wrong, twice, rowOnly: halfFit(true), colOnly: halfFit(false) }
}

async function guess(key, name) {
  await click(cellEl(key))
  await tick(100)
  const input = host.querySelector('input[placeholder^="Search"]')
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, name)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await click([...input.parentElement.querySelectorAll('[role="button"]')].find(el => el.textContent === name))
  await click(button('Submit "'))
  await tick(600)
}

async function pickArchiveDay(date) {
  await click(host.querySelector('button[aria-label="Archive"]'))
  await tick(0)
  await click(host.querySelector(`button[title="${date}"]`))
  await tick(200)
}

describe('Gridiron daily checkpoint', () => {
  it('resumes a mid-game reload exactly, with no guess refunded', async () => {
    await mount()
    const { solution, wrong } = readBoard()
    await guess('0-0', solution['0-0'])
    expect(cellEl('0-0').getAttribute('style')).toContain('cellReveal')
    await guess('0-1', solution['0-1'])
    await guess('0-2', wrong['0-2'])
    const score = scoreShown()
    expect(score).toBeGreaterThan(0)
    expect(host.textContent).toContain('6 guesses left')
    expect(checkpoint()).toEqual({ v: 1, date: TODAY, cells: { '0-0': solution['0-0'], '0-1': solution['0-1'] }, left: 6 })

    await reload()
    expect(ended()).toBe(false)
    expect(host.textContent).toContain('6 guesses left')
    expect(scoreShown()).toBe(score)
    expect(cellEl('0-0').textContent).toContain(solution['0-0'])
    expect(cellEl('0-1').textContent).toContain(solution['0-1'])
    expect(cellEl('0-2').textContent).toBe('?')
    // Restored cells are locked and don't replay their reveal.
    expect(cellEl('0-0').getAttribute('role')).toBeNull()
    expect(styled('cellReveal')).toBe(0)

    // Play carries on from there: the next guess is the fourth, not a refund.
    await guess('1-0', solution['1-0'])
    expect(host.textContent).toContain('5 guesses left')
    expect(cellEl('1-0').getAttribute('style')).toContain('cellReveal')
    expect(checkpoint().left).toBe(5)
    expect(Object.keys(checkpoint().cells)).toHaveLength(3)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('restores a won board as won, without saving again or replaying the confetti', async () => {
    await mount()
    const { solution } = readBoard()
    let atSave
    saveResult.mockImplementation(() => { atSave = checkpoint() })
    for (const key of CELLS) await guess(key, solution[key])
    expect(styled('confetti')).toBeGreaterThan(0) // the live win's confetti (1.6 s)
    await tick(2000)

    expect(ended()).toBe(true)
    const score = scoreShown()
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult).toHaveBeenCalledWith({ game: 'gridiron', puzzleDate: TODAY, completed: true, score })
    // saveResult (which queues the result on disk synchronously) ran before
    // the checkpoint recorded the ended board.
    expect(atSave).toEqual({ v: 1, date: TODAY, cells: expect.any(Object), left: 1 })
    expect(Object.keys(atSave.cells)).toHaveLength(8)
    expect(checkpoint()).toEqual({ v: 1, date: TODAY, cells: solution, left: 0 })

    saveResult.mockClear()
    await reload()
    expect(ended()).toBe(true)
    expect(host.querySelector('.rc-title').textContent).toBe('🎉 Board Complete!')
    expect(host.textContent).toContain('Complete!')
    expect(host.textContent).toContain(`Final Score: ${score} / 855`)
    expect(host.textContent).toContain('9/9 cells filled')
    for (const key of CELLS) expect(cellEl(key).textContent).toContain(solution[key])
    expect(host.querySelector('.rc-share button').textContent).toContain('Share result')
    expect(styled('confetti')).toBe(0)
    expect(styled('cellReveal')).toBe(0)
    expect(host.querySelectorAll('.gridiron-grid [role="button"]')).toHaveLength(0)
    await tick(2000)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('restores a lost board as lost, without saving again', async () => {
    await mount()
    const { solution, wrong } = readBoard()
    await guess('1-1', solution['1-1'])
    for (const key of CELLS.filter(k => k !== '1-1')) await guess(key, wrong[key])
    expect(ended()).toBe(true)
    const score = scoreShown()
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult).toHaveBeenCalledWith({ game: 'gridiron', puzzleDate: TODAY, completed: false, score })
    expect(checkpoint()).toEqual({ v: 1, date: TODAY, cells: { '1-1': solution['1-1'] }, left: 0 })

    saveResult.mockClear()
    await reload()
    expect(ended()).toBe(true)
    expect(host.querySelector('.rc-title').textContent).toBe('Game Over!')
    expect(host.textContent).toContain(`Final Score: ${score} / 855`)
    expect(host.textContent).toContain('1/9 cells filled')
    expect(cellEl('1-1').textContent).toContain(solution['1-1'])
    expect(host.querySelector('.rc-share button').textContent).toContain('Share result')
    expect(host.querySelector('input[placeholder^="Search"]')).toBeNull()
    expect(host.querySelectorAll('.gridiron-grid [role="button"]')).toHaveLength(0)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it("never reads the checkpoint on an Archive replay, even one dated that day", async () => {
    await mount()
    await pickArchiveDay(PAST)
    const past = readBoard()
    await reload()
    store.set(KEY, JSON.stringify({ v: 1, date: PAST, cells: { '0-0': past.solution['0-0'] }, left: 8 }))
    const getItem = vi.spyOn(memoryStorage, 'getItem')
    await pickArchiveDay(PAST)
    fresh()
    expect(getItem.mock.calls.filter(([k]) => k === KEY)).toHaveLength(0)
  })

  it("never writes the checkpoint on an Archive replay, and today's board resumes after it", async () => {
    await mount()
    const today = readBoard()
    await guess('0-0', today.solution['0-0'])
    const saved = store.get(KEY)

    const setItem = vi.spyOn(memoryStorage, 'setItem')
    await pickArchiveDay(PAST)
    const past = readBoard()
    await guess('1-1', past.solution['1-1'])
    await guess('2-2', past.wrong['2-2'])
    expect(host.textContent).toContain('7 guesses left')
    expect(setItem.mock.calls.filter(([k]) => k === KEY)).toHaveLength(0)
    expect(store.get(KEY)).toBe(saved)

    await pickArchiveDay(TODAY)
    expect(host.textContent).toContain('8 guesses left')
    expect(cellEl('0-0').textContent).toContain(today.solution['0-0'])
    expect(cellEl('1-1').textContent).toBe('?')
    expect(saveResult).not.toHaveBeenCalled()
  })

  // archiveReplay.test.jsx's two "today in the Archive" checks, over working storage.
  it('treats picking today in the Archive as the live board', async () => {
    await mount()
    await pickArchiveDay(TODAY)
    const { solution, wrong } = readBoard()
    await guess('0-0', solution['0-0'])
    expect(checkpoint()).toEqual({ v: 1, date: TODAY, cells: { '0-0': solution['0-0'] }, left: 8 })
    for (const key of CELLS.slice(1)) await guess(key, wrong[key])
    expect(ended()).toBe(true)
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult.mock.calls[0][0]).toMatchObject({ game: 'gridiron', puzzleDate: TODAY, completed: false })
  })

  it('keeps a finished board when today is picked again, also after a replay', async () => {
    await mount()
    const { solution, wrong } = readBoard()
    await guess('0-0', solution['0-0'])
    for (const key of CELLS.slice(1)) await guess(key, wrong[key])
    expect(saveResult).toHaveBeenCalledTimes(1)

    await pickArchiveDay(TODAY)
    expect(ended()).toBe(true)
    await pickArchiveDay(PAST)
    fresh()
    // Back to today: a remount restored from the checkpoint, still ended.
    await pickArchiveDay(TODAY)
    expect(ended()).toBe(true)
    expect(cellEl('0-0').textContent).toContain(solution['0-0'])
    expect(host.textContent).toContain('1/9 cells filled')
    expect(saveResult).toHaveBeenCalledTimes(1)
  })

  it('restores a well-formed checkpoint written by hand', async () => {
    await mount()
    const { solution } = readBoard()
    store.set(KEY, JSON.stringify({ v: 1, date: TODAY, cells: { '2-1': solution['2-1'] }, left: 7 }))
    await reload()
    expect(host.textContent).toContain('7 guesses left')
    expect(cellEl('2-1').textContent).toContain(solution['2-1'])
    expect(scoreShown()).toBeGreaterThan(0)
  })

  const valid = ({ solution }) => ({ v: 1, date: TODAY, cells: { '0-0': solution['0-0'] }, left: 8 })
  const bad = (overrides) => (b) => JSON.stringify({ ...valid(b), ...overrides(b) })
  it.each([
    ['not JSON', () => '{"v":1,"date":'],
    ['JSON null', () => 'null'],
    ['an array', () => '[]'],
    ['a number', () => '42'],
    ['another version', bad(() => ({ v: 2 }))],
    ['no version', bad(() => ({ v: undefined }))],
    ['no date', bad(() => ({ date: undefined }))],
    ['no cells', bad(() => ({ cells: undefined }))],
    ['cells as an array', bad(({ solution }) => ({ cells: [solution['0-0']] }))],
    ['cells as a string', bad(({ solution }) => ({ cells: solution['0-0'] }))],
    ['an unknown player', bad(() => ({ cells: { '0-0': 'Nobody Special' } }))],
    ['a player name that is not a string', bad(() => ({ cells: { '0-0': { n: 'Tom Brady' } } }))],
    ['a player who does not fit the cell', bad(({ wrong }) => ({ cells: { '0-0': wrong['0-0'] } }))],
    ["a player who fits the cell's row but not its column", bad(({ rowOnly }) => ({ cells: rowOnly }))],
    ["a player who fits the cell's column but not its row", bad(({ colOnly }) => ({ cells: colOnly }))],
    ['the same player twice', bad(({ twice }) => ({ cells: { [twice.cells[0]]: twice.name, [twice.cells[1]]: twice.name }, left: 7 }))],
    ['a cell off the grid', bad(({ solution }) => ({ cells: { '3-0': solution['0-0'] } }))],
    ['a malformed cell key', bad(({ solution }) => ({ cells: { '00': solution['0-0'] } }))],
    ['negative guesses left', bad(() => ({ left: -1 }))],
    ['too many guesses left', bad(() => ({ left: 10 }))],
    ['fractional guesses left', bad(() => ({ left: 7.5 }))],
    ['guesses left as a string', bad(() => ({ left: '8' }))],
    ['more filled cells than guesses spent', bad(({ solution }) => ({ cells: { '0-0': solution['0-0'], '0-1': solution['0-1'] }, left: 8 }))],
  ])('ignores a checkpoint with %s and starts fresh', async (_, raw) => {
    await mount()
    const board = readBoard()
    expect(board.twice).not.toBeNull()
    expect(board.rowOnly).not.toBeNull()
    expect(board.colOnly).not.toBeNull()
    store.set(KEY, raw(board))
    await reload()
    fresh()
    // The next move replaces it with a good one.
    await guess('2-2', board.solution['2-2'])
    expect(checkpoint()).toEqual({ v: 1, date: TODAY, cells: { '2-2': board.solution['2-2'] }, left: 8 })
  })

  it('ignores a checkpoint dated another day', async () => {
    await mount()
    const board = readBoard()
    // Yesterday's date over cells that would fit today's board.
    store.set(KEY, JSON.stringify({ ...valid(board), date: '2026-10-20' }))
    await reload()
    fresh()
    await guess('1-2', board.solution['1-2'])
    expect(checkpoint()).toEqual({ v: 1, date: TODAY, cells: { '1-2': board.solution['1-2'] }, left: 8 })
  })

  it('moves on to a fresh board when reloaded after midnight', async () => {
    await mount()
    const board = readBoard()
    await guess('0-0', board.solution['0-0'])
    vi.setSystemTime(new Date(2026, 9, 22, 0, 5))
    await reload()
    expect(host.textContent).toContain('October 22, 2026')
    fresh()
  })

  it("a tab left open since yesterday never overwrites today's checkpoint", async () => {
    // Today's board, played in another tab: a hit and a miss.
    await mount()
    const today = readBoard()
    await guess('0-0', today.solution['0-0'])
    await guess('0-1', today.wrong['0-1'])
    const saved = store.get(KEY)

    // The stale tab, dealt at 23:58 yesterday, plays on after midnight.
    vi.setSystemTime(new Date(2026, 9, 20, 23, 58))
    await reload()
    expect(host.textContent).toContain('October 20, 2026')
    fresh()
    const yesterday = readBoard()
    vi.setSystemTime(new Date(2026, 9, 21, 0, 5))
    await guess('0-0', yesterday.solution['0-0'])
    await guess('1-1', yesterday.wrong['1-1'])
    await guess('2-2', yesterday.wrong['2-2'])
    expect(host.textContent).toContain('6 guesses left')
    expect(cellEl('0-0').textContent).toContain(yesterday.solution['0-0'])
    expect(store.get(KEY)).toBe(saved)

    // Today's board still resumes from its own checkpoint.
    await reload()
    expect(host.textContent).toContain('October 21, 2026')
    expect(host.textContent).toContain('7 guesses left')
    expect(cellEl('0-0').textContent).toContain(today.solution['0-0'])
    expect(host.querySelectorAll('.gridiron-grid [role="button"]')).toHaveLength(8)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('still plays and saves when storage throws', async () => {
    const broken = () => { throw new Error('storage disabled') }
    vi.stubGlobal('localStorage', { getItem: broken, setItem: broken, removeItem: broken, clear: broken })
    await mount()
    const { solution, wrong } = readBoard()
    await guess('0-0', solution['0-0'])
    for (const key of CELLS.slice(1)) await guess(key, wrong[key])
    expect(ended()).toBe(true)
    expect(saveResult).toHaveBeenCalledTimes(1)
    await reload()
    fresh()
  })
})
