// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'

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

// happy-dom has no Web Animations; the swap's flying tiles call el.animate.
if (!Element.prototype.animate) Element.prototype.animate = () => ({ cancel() {} })

const { default: NumsGame } = await import('./Nums.jsx')

// Rebuild a day's puzzle with the page's own generator, read from its source.
// (A variable path: Vite rewrites a literal new URL('./x', import.meta.url).)
const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8')
const src = source('./Nums.jsx')
const genSrc = src.slice(src.indexOf('const isActive'), src.indexOf('function formatDate('))
const gen = new Function(`${genSrc}\nreturn { isActive, mulberry32, generateSolution, scramble }`)()
function puzzleFor(date) {
  const rng = gen.mulberry32(parseInt(date.replace(/-/g, '')))
  const sol = gen.generateSolution(rng)
  return { sol, sc: gen.scramble(sol, rng) }
}
const ACTIVE = []
for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (gen.isActive(r, c)) ACTIVE.push([r, c])

const KEY = 'streakle-nums'
const TODAY = '2026-10-21'
const PAST = '2026-10-18'
const USER = { id: 'u-1', email: 'player@example.com', user_metadata: {} }
const PZ = puzzleFor(TODAY)

// Swaps that sort `board` into `sol`: each one puts a needed number in place.
function solvingSwaps(board, sol) {
  const b = board.map(row => [...row])
  const moves = []
  for (const [r, c] of ACTIVE) {
    if (b[r][c] === sol[r][c]) continue
    const [r2, c2] = ACTIVE.find(([r2, c2]) => b[r2][c2] === sol[r][c] && b[r2][c2] !== sol[r2][c2])
    moves.push([[r, c], [r2, c2]]);
    [b[r][c], b[r2][c2]] = [b[r2][c2], b[r][c]]
  }
  return moves
}
const applySwap = (board, [[r1, c1], [r2, c2]]) => {
  const b = board.map(row => [...row]);
  [b[r1][c1], b[r2][c2]] = [b[r2][c2], b[r1][c1]]
  return b
}
const PLAN = solvingSwaps(PZ.sc, PZ.sol)

// Node 25's own localStorage (no --localstorage-file, so no methods) shadows
// happy-dom's; each test gets a fresh in-memory one that survives its reloads.
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

let host, root
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 21, 12))
  saveResult.mockReset()
  vi.stubGlobal('localStorage', memoryStorage())
})
afterEach(() => {
  if (root) unmount()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

async function mount() {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<AuthContext.Provider value={{ user: USER, signOut() {} }}><NumsGame /></AuthContext.Provider>)
  })
}
function unmount() {
  act(() => root.unmount())
  host.remove()
  root = null
}
// A reload kills every pending timer (a swap still in flight included) and
// mounts a fresh page; localStorage survives. (clearAllTimers also rewinds
// the fake clock to when it was installed, so put the time back.)
async function reload() {
  const now = Date.now()
  vi.clearAllTimers()
  vi.setSystemTime(now)
  unmount()
  await mount()
}

const tick = (ms) => act(async () => { vi.advanceTimersByTime(ms) })
const click = (el) => act(async () => { el.click() })
const button = (label) => [...host.querySelectorAll('button')].find(el => el.textContent.includes(label))
const ended = () => host.querySelector('.rc-title') !== null
const stored = () => JSON.parse(localStorage.getItem(KEY))

// The 33 number tiles, in reading order (clue circles aren't draggable).
const tiles = () => [...host.querySelectorAll('[draggable]')]
const tileAt = (r, c) => tiles()[ACTIVE.findIndex(([ar, ac]) => ar === r && ac === c)]
function boardNow(sc = PZ.sc) {
  const b = sc.map(row => [...row])
  tiles().forEach((el, i) => { const [r, c] = ACTIVE[i]; b[r][c] = Number(el.textContent) })
  return b
}

async function swap([[r1, c1], [r2, c2]]) {
  await click(tileAt(r1, c1))
  await click(tileAt(r2, c2))
  await tick(400)
}

async function pickArchiveDay(date) {
  await click(host.querySelector('button[aria-label="Archive"]'))
  await tick(0)
  await click(host.querySelector(`button[title="${date}"]`))
  await tick(200)
}

// Two misplaced tiles that stay misplaced whichever way round they are, so
// swapping them back and forth just burns swaps.
function churnPair(board, sol) {
  for (const [r1, c1] of ACTIVE) for (const [r2, c2] of ACTIVE) {
    const a = board[r1][c1], b = board[r2][c2]
    if (a !== sol[r1][c1] && b !== sol[r2][c2] && a !== b && a !== sol[r2][c2] && b !== sol[r1][c1]) return [[r1, c1], [r2, c2]]
  }
  throw new Error('no churn pair')
}

// Two misplaced tiles that hold the same number.
function equalPair(board, sol) {
  for (const [r1, c1] of ACTIVE) for (const [r2, c2] of ACTIVE) {
    if ((r1 !== r2 || c1 !== c2) && board[r1][c1] === board[r2][c2] &&
      board[r1][c1] !== sol[r1][c1] && board[r2][c2] !== sol[r2][c2]) return [[r1, c1], [r2, c2]]
  }
  throw new Error('no equal pair')
}

// What a share button copies, on a device with no share sheet.
async function sharedText(label) {
  const writeText = vi.fn(async () => {})
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
  try {
    await click(button(label))
    expect(writeText).toHaveBeenCalledTimes(1)
    return writeText.mock.calls[0][0]
  } finally {
    delete navigator.clipboard
    delete navigator.share
  }
}

describe('Nums share text', () => {
  const HEADER = 'NUMS by Streakle 🔥 — October 21, 2026'
  const LINK = 'Play at: playstreakle.com/nums'

  it('shares a solve with swaps to spare as stars, linking to Nums', async () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, date: TODAY, board: PZ.sol, swaps: 4 }))
    await mount()
    expect(await sharedText('Share result')).toBe(`${HEADER}\nSolved in 16 swaps! 4 remaining\n⭐⭐⭐⭐\n\n${LINK}`)
  })

  it('shares a solve over budget, linking to Nums', async () => {
    await mount()
    for (const m of PLAN) await swap(m)
    expect(PLAN.length).toBeGreaterThan(20)
    expect(host.textContent).toContain(`${PLAN.length} swaps used (${PLAN.length - 20} over budget)`)
    expect(await sharedText('Share result'))
      .toBe(`${HEADER}\nSolved in ${PLAN.length} swaps (${PLAN.length - 20} over budget)\n—\n\n${LINK}`)
  })

  it('shares progress over budget, linking to Nums', async () => {
    await mount()
    const pair = churnPair(PZ.sc, PZ.sol)
    for (let i = 0; i < 21; i++) await swap(pair)
    expect(await sharedText('Share progress')).toBe(`${HEADER}\nStill solving today's puzzle\n🔥\n\n${LINK}`)
  })
})

describe('Nums daily checkpoint', () => {
  it('spends nothing on a same-number swap, and a reload agrees', async () => {
    await mount()
    await swap(PLAN[0])
    const before = localStorage.getItem(KEY)
    expect(JSON.parse(before).swaps).toBe(19)

    await swap(equalPair(applySwap(PZ.sc, PLAN[0]), PZ.sol))
    expect(boardNow()).toEqual(applySwap(PZ.sc, PLAN[0]))
    expect(host.textContent).toContain('19 swaps remaining')
    expect(localStorage.getItem(KEY)).toBe(before)

    await reload()
    expect(host.textContent).toContain('19 swaps remaining')
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('starts today fresh with no checkpoint', async () => {
    await mount()
    expect(boardNow()).toEqual(PZ.sc)
    expect(host.textContent).toContain('20 swaps remaining')
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('resumes a reload mid-game with no swap refunded', async () => {
    await mount()
    for (const m of PLAN.slice(0, 3)) await swap(m)
    const before = boardNow()
    expect(host.textContent).toContain('17 swaps remaining')
    expect(stored()).toEqual({ v: 1, date: TODAY, board: before, swaps: 17 })

    await reload()
    expect(boardNow()).toEqual(before)
    expect(host.textContent).toContain('17 swaps remaining')
    expect(ended()).toBe(false)

    await swap(PLAN[3])
    expect(host.textContent).toContain('16 swaps remaining')
    expect(stored().swaps).toBe(16)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('keeps an over-budget count across a reload', async () => {
    await mount()
    const pair = churnPair(PZ.sc, PZ.sol)
    for (let i = 0; i < 21; i++) await swap(pair)
    const before = boardNow()
    expect(before).toEqual(applySwap(PZ.sc, pair))
    expect(host.textContent).toContain('1 swap over budget')

    await reload()
    expect(boardNow()).toEqual(before)
    expect(host.textContent).toContain('1 swap over budget')
    expect(button('Share progress')).toBeTruthy()
    expect(stored().swaps).toBe(-1)
  })

  it('restores a solved board as solved without saving again or replaying confetti', async () => {
    await mount()
    for (const m of PLAN) await swap(m)
    expect(ended()).toBe(true)
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult).toHaveBeenCalledWith({ game: 'nums', puzzleDate: TODAY, completed: true, swaps_used: PLAN.length })
    await tick(150)
    expect(host.querySelector('[style*="confetti"]')).not.toBeNull() // the live solve celebrates

    await reload()
    await tick(500)
    expect(ended()).toBe(true)
    expect(host.textContent).toContain('Solved!')
    expect(button('Share result')).toBeTruthy()
    expect(boardNow()).toEqual(PZ.sol)
    expect(tiles().filter(el => el.getAttribute('role') === 'button')).toEqual([]) // every tile locked
    expect(host.textContent).toContain(`Solved — ${PLAN.length - 20} over budget`)
    expect(host.querySelector('[style*="confetti"]')).toBeNull()
    expect(saveResult).toHaveBeenCalledTimes(1)
  })

  it('restores a solve with swaps to spare, its stars already in place', async () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, date: TODAY, board: PZ.sol, swaps: 4 }))
    await mount()
    await tick(500)
    expect(ended()).toBe(true)
    expect(host.textContent).toContain('Solved with 4 swaps to spare!')
    const stars = [...host.querySelectorAll('.rc span')].filter(el => el.textContent === '★')
    expect(stars).toHaveLength(4)
    for (const star of stars) expect(star.style.animation).toBe('none')
    expect(host.querySelector('[style*="confetti"]')).toBeNull()
    expect(saveResult).not.toHaveBeenCalled()
  })

  it('saves the solve before the checkpoint records it, and a reload mid-swap loses nothing', async () => {
    await mount()
    for (const m of PLAN.slice(0, -1)) await swap(m)
    const beforeLast = boardNow()
    const left = 20 - (PLAN.length - 1)

    // Reload while the winning swap is still flying: it never landed.
    const [[r1, c1], [r2, c2]] = PLAN.at(-1)
    await click(tileAt(r1, c1))
    await click(tileAt(r2, c2))
    await tick(200)
    await reload()
    expect(ended()).toBe(false)
    expect(boardNow()).toEqual(beforeLast)
    expect(stored().swaps).toBe(left)
    expect(saveResult).not.toHaveBeenCalled()

    // When it lands, the result is queued (saveResult runs) before the
    // checkpoint records the solve.
    let atSave
    saveResult.mockImplementation(() => { atSave = stored() })
    await swap(PLAN.at(-1))
    expect(ended()).toBe(true)
    expect(saveResult).toHaveBeenCalledTimes(1)
    expect(saveResult).toHaveBeenCalledWith({ game: 'nums', puzzleDate: TODAY, completed: true, swaps_used: PLAN.length })
    expect(atSave.board).toEqual(beforeLast)
    expect(stored()).toEqual({ v: 1, date: TODAY, board: PZ.sol, swaps: left - 1 })
  })

  it('never reads or writes the checkpoint on an Archive replay', async () => {
    // A checkpoint that would be valid for the archive day, if it were read.
    const past = puzzleFor(PAST)
    const pastPlan = solvingSwaps(past.sc, past.sol)
    const raw = JSON.stringify({ v: 1, date: PAST, board: applySwap(past.sc, pastPlan[0]), swaps: 5 })
    localStorage.setItem(KEY, raw)

    await mount()
    await pickArchiveDay(PAST)
    expect(boardNow(past.sc)).toEqual(past.sc)
    expect(host.textContent).toContain('20 swaps remaining')

    for (const m of pastPlan) await swap(m)
    expect(ended()).toBe(true)
    expect(localStorage.getItem(KEY)).toBe(raw)
    expect(saveResult).not.toHaveBeenCalled()
  })

  it("leaves today's checkpoint alone during a replay and resumes it after", async () => {
    await mount()
    for (const m of PLAN.slice(0, 2)) await swap(m)
    const today = boardNow()
    const raw = localStorage.getItem(KEY)

    await pickArchiveDay(PAST)
    const past = puzzleFor(PAST)
    await swap(solvingSwaps(past.sc, past.sol)[0])
    expect(localStorage.getItem(KEY)).toBe(raw)

    await pickArchiveDay(TODAY)
    expect(boardNow()).toEqual(today)
    expect(host.textContent).toContain('18 swaps remaining')
  })

  describe('ignores a bad checkpoint and starts fresh', () => {
    const valid = { v: 1, date: TODAY, board: applySwap(PZ.sc, PLAN[0]), swaps: 19 }
    const withBoard = (edit) => {
      const board = valid.board.map(row => [...row])
      edit(board)
      return JSON.stringify({ ...valid, board })
    }
    const [ar, ac] = ACTIVE[0]
    const cases = {
      'invalid JSON': '{"v":1,',
      'null': 'null',
      'a number': '42',
      'an array': '[]',
      'another version': JSON.stringify({ ...valid, v: 2 }),
      'no board': JSON.stringify({ ...valid, board: undefined }),
      'a board with 6 rows': JSON.stringify({ ...valid, board: valid.board.slice(0, 6) }),
      'a row of 8': withBoard(b => b[0].push(1)),
      'a changed inactive cell': withBoard(b => { b[1][1] = b[1][1] % 7 + 1 }),
      'numbers that are not the scramble': withBoard(b => { b[ar][ac] = b[ar][ac] % 7 + 1 }),
      'numbers stored as strings': JSON.stringify({ ...valid, board: valid.board.map(row => row.map(String)) }),
      // The inactive cells still match and '1'..'7' tally like 1..7, so only
      // the integer check on each cell rejects this one.
      'active numbers stored as strings': withBoard(b => { for (const [r, c] of ACTIVE) b[r][c] = String(b[r][c]) }),
      'swaps above 20': JSON.stringify({ ...valid, swaps: 21 }),
      'fractional swaps': JSON.stringify({ ...valid, swaps: 2.5 }),
      'swaps as a string': JSON.stringify({ ...valid, swaps: '19' }),
      'no swaps': JSON.stringify({ ...valid, swaps: undefined }),
    }

    it('restores the valid control case', async () => {
      localStorage.setItem(KEY, JSON.stringify(valid))
      await mount()
      expect(boardNow()).toEqual(valid.board)
      expect(host.textContent).toContain('19 swaps remaining')
    })

    for (const [name, raw] of Object.entries(cases)) {
      it(name, async () => {
        localStorage.setItem(KEY, raw)
        await mount()
        expect(boardNow()).toEqual(PZ.sc)
        expect(host.textContent).toContain('20 swaps remaining')
        expect(ended()).toBe(false)

        await swap(PLAN[0])
        expect(stored()).toEqual(valid)
      })
    }
  })

  it('ignores a checkpoint dated another day', async () => {
    const yesterday = { v: 1, date: '2026-10-20', board: applySwap(PZ.sc, PLAN[0]), swaps: 19 }
    localStorage.setItem(KEY, JSON.stringify(yesterday))
    await mount()
    expect(boardNow()).toEqual(PZ.sc)
    expect(host.textContent).toContain('20 swaps remaining')
  })

  it('keeps the day it was dealt past midnight, then starts the new day fresh', async () => {
    vi.setSystemTime(new Date(2026, 9, 21, 23, 58))
    await mount()
    await swap(PLAN[0])
    vi.setSystemTime(new Date(2026, 9, 22, 0, 2))
    await swap(PLAN[1])
    expect(stored()).toMatchObject({ date: TODAY, swaps: 18 })

    await reload()
    const next = puzzleFor('2026-10-22')
    expect(boardNow(next.sc)).toEqual(next.sc)
    expect(host.textContent).toContain('20 swaps remaining')
  })

  // One storage slot for every tab: a tab dealt yesterday and still open after
  // midnight must not overwrite today's checkpoint, mid-game or solved.
  const YESTERDAY = '2026-10-20'
  const todays = {
    'mid-game': { cp: { v: 1, date: TODAY, board: applySwap(PZ.sc, PLAN[0]), swaps: 19 }, shows: '19 swaps remaining' },
    'solved': { cp: { v: 1, date: TODAY, board: PZ.sol, swaps: 4 }, shows: 'Solved with 4 swaps to spare!' },
  }
  for (const [name, { cp, shows }] of Object.entries(todays)) {
    it(`never lets a tab dealt yesterday overwrite today's ${name} checkpoint`, async () => {
      const raw = JSON.stringify(cp)
      localStorage.setItem(KEY, raw)
      vi.setSystemTime(new Date(2026, 9, 20, 23, 58))
      await mount()
      const old = puzzleFor(YESTERDAY)
      const oldPlan = solvingSwaps(old.sc, old.sol)
      expect(boardNow(old.sc)).toEqual(old.sc)

      vi.setSystemTime(new Date(2026, 9, 21, 0, 2))
      await swap(oldPlan[0])
      expect(host.textContent).toContain('19 swaps remaining')
      expect(localStorage.getItem(KEY)).toBe(raw)

      // Finishing yesterday's board still saves that day, and still leaves
      // today's checkpoint alone.
      for (const m of oldPlan.slice(1)) await swap(m)
      expect(ended()).toBe(true)
      expect(saveResult).toHaveBeenCalledWith({ game: 'nums', puzzleDate: YESTERDAY, completed: true, swaps_used: oldPlan.length })
      expect(localStorage.getItem(KEY)).toBe(raw)

      await reload()
      await tick(500)
      expect(boardNow()).toEqual(cp.board)
      expect(host.textContent).toContain(shows)
      expect(saveResult).toHaveBeenCalledTimes(1)
    })
  }

  it('still plays when storage throws', async () => {
    const denied = () => { throw new Error('SecurityError') }
    vi.stubGlobal('localStorage', { getItem: denied, setItem: denied, removeItem: denied, clear() {} })
    await mount()
    expect(boardNow()).toEqual(PZ.sc)
    await swap(PLAN[0])
    expect(host.textContent).toContain('19 swaps remaining')
  })
})
