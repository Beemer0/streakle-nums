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
const gen = new Function(`${genSrc}\nreturn { isActive, mulberry32, generateSolution, computeClues, scramble }`)()
function puzzleFor(date) {
  const rng = gen.mulberry32(parseInt(date.replace(/-/g, '')))
  const sol = gen.generateSolution(rng)
  return { sol, cl: gen.computeClues(sol), sc: gen.scramble(sol, rng) }
}
const ACTIVE = []
for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (gen.isActive(r, c)) ACTIVE.push([r, c])

const KEY = 'streakle-nums'
const TODAY = '2026-10-21'
const USER = { id: 'u-1', email: 'player@example.com', user_metadata: {} }
const PZ = puzzleFor(TODAY)

// Swaps that sort `board` into `sol`: each one puts a needed number in place
// at its FIRST cell.
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

// Two misplaced tiles that stay misplaced whichever way round they are.
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

// prefers-reduced-motion on or off; every other media query is false.
function preferReducedMotion(on) {
  vi.spyOn(window, 'matchMedia').mockImplementation((media) => ({
    media,
    matches: on && media.includes('prefers-reduced-motion: reduce'),
    onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
    dispatchEvent: () => false,
  }))
}

let host, root
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 21, 12))
  saveResult.mockReset()
  vi.stubGlobal('localStorage', memoryStorage())
  preferReducedMotion(false)
})
afterEach(() => {
  if (root) unmount()
  vi.restoreAllMocks()
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
async function reload() {
  const now = Date.now()
  vi.clearAllTimers()
  vi.setSystemTime(now)
  unmount()
  await mount()
}

const tick = (ms) => act(async () => { vi.advanceTimersByTime(ms) })
const click = (el) => act(async () => { el.click() })
const focus = (el) => act(async () => { el.focus() })
const press = (key, el = document.activeElement) => act(async () => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
})
const stored = () => JSON.parse(localStorage.getItem(KEY))

// Everything the polite live regions currently say (zero-width toggles stripped).
const spoken = () => [...host.querySelectorAll('[aria-live="polite"]')].map(el => el.textContent.replace(/\u200b/g, ''))

const grid = () => host.querySelector('[role="grid"]')
const rows = () => [...grid().querySelectorAll('[role="row"]')]
const cell = (r, c) => rows()[r].querySelectorAll('[role="gridcell"]')[c]
const label = (r, c) => cell(r, c).getAttribute('aria-label')
const result = () => host.querySelector('section[aria-labelledby]')

const place = (r, c) => `row ${r + 1}, column ${c + 1}`
const tileText = (b, r, c) => `${b[r][c]}${b[r][c] === PZ.sol[r][c] ? ', correct' : ''}`
const swapText = (b, [[r1, c1], [r2, c2]], left) =>
  `Swapped. R${place(r1, c1).slice(1)} is now ${tileText(b, r1, c1)}; ${place(r2, c2)} is now ${tileText(b, r2, c2)}. ${left}.`

// Click both tiles of a swap and let it land.
async function swap([[r1, c1], [r2, c2]]) {
  await click(cell(r1, c1))
  await click(cell(r2, c2))
  await tick(400)
}

// HTML5 drag and drop: happy-dom has no DataTransfer, so each drag carries a
// stand-in that records what the page sets on it. A browser starts dropEffect
// at the drag's effectAllowed ('move' here) on every dragover.
const transfer = () => ({ dropEffect: 'move', effectAllowed: 'uninitialized', setData() {}, getData: () => '', setDragImage() {} })
const drag = (type, el, dataTransfer) => act(async () => {
  const e = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(e, 'dataTransfer', { value: dataTransfer })
  el.dispatchEvent(e)
})
const dragOver = async (el, dt) => { dt.dropEffect = 'move'; await drag('dragover', el, dt) }
// Drop `from` on `to`, as a browser does when the last dragover allowed it.
async function dragSwap(from, to) {
  const dt = transfer()
  await drag('dragstart', from, dt)
  await tick(0)
  await dragOver(to, dt)
  if (dt.dropEffect !== 'none') await drag('drop', to, dt)
  await drag('dragend', from, dt)
  await tick(400)
}
// A tile lit up as the drop target (it also hides a green tile's colour).
const isDropTarget = (el) => el.style.transform === 'scale(1.08)'
const toast = () => host.querySelector('.nm-toast')
const boardText = () => ACTIVE.map(([r, c]) => cell(r, c).textContent).join(',')
const scText = ACTIVE.map(([r, c]) => PZ.sc[r][c]).join(',')

describe('Nums board semantics', () => {
  it('is a labelled 7×7 grid of rows and cells, described by the swaps left', async () => {
    await mount()
    expect(grid().getAttribute('aria-label')).toBe('Nums board, 7 by 7')
    expect(document.getElementById(grid().getAttribute('aria-describedby')).textContent).toBe('20 swaps remaining')
    expect(rows()).toHaveLength(7)
    for (const row of rows()) expect(row.querySelectorAll('[role="gridcell"]')).toHaveLength(7)
  })

  it('names every tile by its place, number and whether it is correct; green tiles are disabled', async () => {
    await mount()
    let locked = 0
    for (const [r, c] of ACTIVE) {
      const el = cell(r, c)
      const correct = PZ.sc[r][c] === PZ.sol[r][c]
      expect(el.getAttribute('aria-label')).toBe(`Row ${r + 1}, column ${c + 1}: ${PZ.sc[r][c]}${correct ? ', correct' : ''}`)
      expect(el.textContent).toBe(String(PZ.sc[r][c])) // the visible digit is unchanged
      if (correct) {
        locked++
        expect(el.getAttribute('aria-disabled')).toBe('true')
        expect(el.hasAttribute('aria-selected')).toBe(false)
      } else {
        expect(el.hasAttribute('aria-disabled')).toBe(false)
        expect(el.getAttribute('aria-selected')).toBe('false')
      }
    }
    expect(locked).toBeGreaterThan(0) // the day's scramble has green tiles to check
  })

  it('names every clue circle with the sum it gives', async () => {
    await mount()
    for (let r = 1; r < 7; r += 2) for (let c = 1; c < 7; c += 2) {
      const sum = PZ.sol[r - 1][c] + PZ.sol[r + 1][c] + PZ.sol[r][c - 1] + PZ.sol[r][c + 1]
      expect(sum).toBe(PZ.cl[`${r},${c}`].sum)
      expect(label(r, c)).toBe(`Row ${r + 1}, column ${c + 1}: clue, the 4 tiles around it sum to ${sum}`)
      expect(cell(r, c).textContent).toBe(String(sum))
    }
  })

  it('hides the flying swap tiles from screen readers', async () => {
    await mount()
    const [a, b] = PLAN[0]
    await click(cell(...a))
    await click(cell(...b))
    const flying = [...grid().children].filter(el => el.getAttribute('role') !== 'row')
    expect(flying).toHaveLength(2)
    for (const el of flying) expect(el.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('Nums announcements', () => {
  it('announces a selection and its clearing, and marks the selected tile', async () => {
    await mount()
    const [[r, c]] = PLAN[0]
    await click(cell(r, c))
    expect(cell(r, c).getAttribute('aria-selected')).toBe('true')
    expect(spoken()).toContain(`Selected ${PZ.sc[r][c]}. Choose a tile to swap it with.`)

    await click(cell(r, c))
    expect(cell(r, c).getAttribute('aria-selected')).toBe('false')
    expect(spoken()).toContain('Selection cleared.')
  })

  it('announces each swap: the new numbers, which are now correct, and the swaps left', async () => {
    await mount()
    await swap(PLAN[0])
    const b1 = applySwap(PZ.sc, PLAN[0])
    expect(spoken()).toContain(swapText(b1, PLAN[0], '19 swaps left'))
    const [[r, c]] = PLAN[0]
    expect(label(r, c)).toBe(`Row ${r + 1}, column ${c + 1}: ${PZ.sol[r][c]}, correct`)
    expect(cell(r, c).getAttribute('aria-disabled')).toBe('true')

    await swap(PLAN[1])
    expect(spoken()).toContain(swapText(applySwap(b1, PLAN[1]), PLAN[1], '18 swaps left'))
  })

  it('announces swaps over budget', async () => {
    await mount()
    const pair = churnPair(PZ.sc, PZ.sol)
    for (let i = 0; i < 21; i++) await swap(pair)
    expect(spoken()).toContain(swapText(applySwap(PZ.sc, pair), pair, '1 swap over budget'))
  })

  it('announces the solve and moves focus to the result', async () => {
    await mount()
    for (const m of PLAN) await swap(m)
    expect(PLAN.length).toBeGreaterThan(20)
    expect(spoken()).toContain(`Solved in ${PLAN.length} swaps, ${PLAN.length - 20} over budget.`)
    expect(result()).not.toBeNull()
    expect(document.activeElement).toBe(result())
  })

  it('announces a solve with swaps to spare, and names the stars as one image', async () => {
    // One swap from solved: two tiles holding different numbers, swapped.
    const [r0, c0] = ACTIVE[0]
    const pair = [[r0, c0], ACTIVE.find(([r, c]) => PZ.sol[r][c] !== PZ.sol[r0][c0])]
    localStorage.setItem(KEY, JSON.stringify({ v: 1, date: TODAY, board: applySwap(PZ.sol, pair), swaps: 5 }))
    await mount()
    await swap(pair)
    expect(spoken()).toContain('Solved in 16 swaps, 4 to spare.')
    expect(document.activeElement).toBe(result())
    const stars = result().querySelector('[role="img"]')
    expect(stars.getAttribute('aria-label')).toBe('4 stars')
    for (const star of stars.children) expect(star.getAttribute('aria-hidden')).toBe('true')
  })

  it('leaves focus alone when a solved board is restored on reload', async () => {
    await mount()
    for (const m of PLAN) await swap(m)
    await reload()
    await tick(500)
    expect(result()).not.toBeNull()
    expect(document.activeElement).not.toBe(result())
    expect(spoken().join('')).toBe('')
  })
})

describe('Nums keyboard', () => {
  it('has one Tab stop, and arrows, Home and End move it over tiles and clues', async () => {
    await mount()
    const tabStops = () => [...grid().querySelectorAll('[role="gridcell"]')].filter(el => el.tabIndex === 0)
    expect(tabStops()).toEqual([cell(0, 0)])
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (r || c) expect(cell(r, c).getAttribute('tabindex')).toBe('-1')

    await focus(cell(0, 0))
    await press('ArrowRight')
    expect(document.activeElement).toBe(cell(0, 1))
    await press('ArrowDown')
    expect(document.activeElement).toBe(cell(1, 1)) // a clue circle
    expect(document.activeElement.getAttribute('aria-label')).toMatch(/^Row 2, column 2: clue/)
    await press('End')
    expect(document.activeElement).toBe(cell(1, 6))
    await press('Home')
    expect(document.activeElement).toBe(cell(1, 0))
    await press('ArrowLeft') // already at the edge
    expect(document.activeElement).toBe(cell(1, 0))
    await press('ArrowUp')
    expect(document.activeElement).toBe(cell(0, 0))
    expect(tabStops()).toEqual([cell(0, 0)])

    await press('ArrowDown')
    expect(tabStops()).toEqual([cell(1, 0)])
  })

  it('selects with Enter or Space, clears with Escape, and swaps with Enter', async () => {
    await mount()
    const [a, b] = PLAN[0]
    await focus(cell(...a))
    await press('Enter')
    expect(cell(...a).getAttribute('aria-selected')).toBe('true')
    expect(spoken()).toContain(`Selected ${PZ.sc[a[0]][a[1]]}. Choose a tile to swap it with.`)

    await press('Escape')
    expect(cell(...a).getAttribute('aria-selected')).toBe('false')
    expect(spoken()).toContain('Selection cleared.')
    expect(host.textContent).not.toContain('tap another or drag to swap')

    await press(' ')
    expect(cell(...a).getAttribute('aria-selected')).toBe('true')
    await focus(cell(...b))
    await press('Enter')
    await tick(400)
    expect(cell(...a).textContent).toBe(String(PZ.sc[b[0]][b[1]]))
    expect(cell(...b).textContent).toBe(String(PZ.sc[a[0]][a[1]]))
    expect(host.textContent).toContain('19 swaps remaining')
    expect(stored().swaps).toBe(19)
  })

  it('does nothing on Enter on a green tile or a clue', async () => {
    await mount()
    const [r, c] = ACTIVE.find(([r, c]) => PZ.sc[r][c] === PZ.sol[r][c])
    await focus(cell(r, c))
    await press('Enter')
    expect(cell(r, c).hasAttribute('aria-selected')).toBe(false)
    await focus(cell(1, 1))
    await press('Enter')
    expect(grid().querySelector('[aria-selected="true"]')).toBeNull()
    expect(spoken().join('')).toBe('')
  })

  it('keeps focus on the swapped tile during the flight and after it turns green', async () => {
    await mount()
    // The second tile activated is the one the swap makes correct.
    const [target, from] = PLAN[0]
    await focus(cell(...from))
    await press('Enter')
    await focus(cell(...target))
    await press('Enter')

    await tick(200) // mid-flight: the tiles must stay focusable
    expect(cell(...target).getAttribute('tabindex')).toBe('0')
    expect(cell(...from).getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(cell(...target))

    await tick(400) // landed: the focused tile is green and locked, still focused
    expect(label(...target)).toMatch(/, correct$/)
    expect(cell(...target).getAttribute('aria-disabled')).toBe('true')
    expect(cell(...target).getAttribute('tabindex')).toBe('0')
    expect(document.activeElement).toBe(cell(...target))
  })
})

describe('Nums same-number swaps', () => {
  const PAIR = equalPair(PZ.sc, PZ.sol)

  it('costs nothing to swap two tiles holding the same number, and says so', async () => {
    const animate = vi.spyOn(Element.prototype, 'animate')
    await mount()
    const [a, b] = PAIR
    await click(cell(...a))
    await click(cell(...b))
    expect(animate).not.toHaveBeenCalled() // no flight for a swap that changes nothing
    await tick(400)
    expect(boardText()).toBe(scText)
    expect(host.textContent).toContain('20 swaps remaining')
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(spoken()).toContain('Same number — no swap used')
    expect(grid().querySelector('[aria-selected="true"]')).toBeNull()

    // The next real swap still costs one.
    await swap(PLAN[0])
    expect(host.textContent).toContain('19 swaps remaining')
  })

  it('costs nothing by keyboard or with reduced motion either', async () => {
    preferReducedMotion(true)
    await mount()
    const [a, b] = PAIR
    await focus(cell(...a))
    await press('Enter')
    await focus(cell(...b))
    await press('Enter')
    expect(boardText()).toBe(scText)
    expect(host.textContent).toContain('20 swaps remaining')
    expect(spoken()).toContain('Same number — no swap used')
    expect(document.activeElement).toBe(cell(...b)) // focus stays put
  })

  it('costs nothing when one is dragged onto the other', async () => {
    await mount()
    const [a, b] = PAIR
    await dragSwap(cell(...a), cell(...b))
    expect(boardText()).toBe(scText)
    expect(host.textContent).toContain('20 swaps remaining')
    expect(spoken()).toContain('Same number — no swap used')
  })

  it('shows the note briefly, to the eye only, and lets taps through to whatever it covers', async () => {
    await mount()
    await click(cell(...PAIR[0]))
    await click(cell(...PAIR[1]))
    expect(toast().textContent).toBe('Same number — no swap used')
    expect(toast().getAttribute('aria-hidden')).toBe('true') // the live region speaks it
    // It floats over the header's How to play / Archive buttons.
    expect(getComputedStyle(toast()).pointerEvents).toBe('none')
    await tick(1700)
    expect(toast()).not.toBeNull()
    await tick(200)
    expect(toast()).toBeNull()
  })
})

describe('Nums drag and drop', () => {
  const LOCKED = ACTIVE.find(([r, c]) => PZ.sc[r][c] === PZ.sol[r][c])

  it('offers a misplaced tile as a drop target, and the drop swaps', async () => {
    await mount()
    const [a, b] = PLAN[0]
    const dt = transfer()
    await drag('dragstart', cell(...a), dt)
    await dragOver(cell(...b), dt)
    expect(dt.dropEffect).toBe('move')
    expect(isDropTarget(cell(...b))).toBe(true)
    await drag('drop', cell(...b), dt)
    await drag('dragend', cell(...a), dt)
    await tick(400)
    expect(host.textContent).toContain('19 swaps remaining')
  })

  it('never offers a green tile as a drop target, so it keeps its colour and nothing is spent', async () => {
    await mount()
    const [a] = PLAN[0]
    const green = cell(...LOCKED).style.background
    expect(green).toBe('var(--correct-deep)')
    const dt = transfer()
    await drag('dragstart', cell(...a), dt)
    await dragOver(cell(...LOCKED), dt)
    expect(dt.dropEffect).toBe('none') // the browser shows its no-drop cursor
    expect(isDropTarget(cell(...LOCKED))).toBe(false)
    expect(cell(...LOCKED).style.background).toBe(green)

    // Moving on to a misplaced tile and back takes the highlight off again.
    await dragOver(cell(...PLAN[0][1]), dt)
    expect(isDropTarget(cell(...PLAN[0][1]))).toBe(true)
    await dragOver(cell(...LOCKED), dt)
    expect([...grid().querySelectorAll('[role="gridcell"]')].some(isDropTarget)).toBe(false)

    await drag('dragend', cell(...a), dt)
    await tick(400)
    expect(boardText()).toBe(scText)
    expect(host.textContent).toContain('20 swaps remaining')
  })

  it('never lights the dragged tile as its own drop target, but keeps the move cursor over it', async () => {
    await mount()
    const [a] = PLAN[0]
    const dt = transfer()
    await drag('dragstart', cell(...a), dt)
    await dragOver(cell(...a), dt)
    expect(dt.dropEffect).toBe('move')
    expect(isDropTarget(cell(...a))).toBe(false)
  })
})

describe('Nums reduced motion', () => {
  it('swaps the tiles in place at once, with no flight, when reduced motion is preferred', async () => {
    preferReducedMotion(true)
    const animate = vi.spyOn(Element.prototype, 'animate')
    await mount()
    const [a, b] = PLAN[0]
    await click(cell(...a))
    await click(cell(...b))
    // No timers run: the swap has already landed.
    expect(cell(...a).textContent).toBe(String(PZ.sc[b[0]][b[1]]))
    expect(cell(...b).textContent).toBe(String(PZ.sc[a[0]][a[1]]))
    expect(host.textContent).toContain('19 swaps remaining')
    expect(stored().swaps).toBe(19)
    expect(spoken()).toContain(swapText(applySwap(PZ.sc, PLAN[0]), PLAN[0], '19 swaps left'))
    expect(animate).not.toHaveBeenCalled()
    expect([...grid().children].every(el => el.getAttribute('role') === 'row')).toBe(true)
    // The next swap is not blocked by a flight that never ran.
    await click(cell(...PLAN[1][0]))
    await click(cell(...PLAN[1][1]))
    expect(host.textContent).toContain('18 swaps remaining')
  })

  it('flies the tiles for the length of the swap otherwise', async () => {
    const animate = vi.spyOn(Element.prototype, 'animate')
    await mount()
    const [a, b] = PLAN[0]
    await click(cell(...a))
    await click(cell(...b))
    expect(animate).toHaveBeenCalledTimes(2)
    expect(cell(...a).textContent).toBe(String(PZ.sc[a[0]][a[1]]))
    await tick(400)
    expect(cell(...a).textContent).toBe(String(PZ.sc[b[0]][b[1]]))
  })
})
