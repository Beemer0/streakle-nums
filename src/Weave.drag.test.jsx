// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from './AuthContext'
import { generatePuzzle, ACTIVE, MAX_SWAPS, SIZE, HOLE } from './weave/engine'

// Weave's pointer drag (F298). A touch (or pen) press is implicitly captured
// by the tile it went down on; once the press becomes a drag the grid takes
// the capture, so the browser fires lostpointercapture at that tile and it
// bubbles to the grid. That hand-over must not end the drag: only the grid
// losing the drag's own pointer may. happy-dom has no layout and no implicit
// capture, so the tests place the tiles on a 100px grid and fire the
// capture events the browser would.

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

// Node 25's own localStorage (no --localstorage-file, so no methods) shadows
// happy-dom's; each test gets a fresh in-memory one.
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

// happy-dom has no Web Animations; a swap FLIPs its two tiles with el.animate.
if (!Element.prototype.animate) Element.prototype.animate = () => ({ cancel() {} })

const { default: WeaveGame } = await import('./Weave.jsx')

const TODAY = '2026-10-26'
const USER = { id: 'u-1', email: 'player@example.com', user_metadata: {} }
const CELL_PX = 100

let host, root, captures
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 26, 12))
  saveResult.mockReset()
  vi.stubGlobal('localStorage', memoryStorage())
  // Tile i sits at row i/SIZE, column i%SIZE of a 100px grid. The dragged
  // tile has pointer-events: none, so its slot hit-tests as the grid.
  vi.spyOn(document, 'elementFromPoint').mockImplementation((x, y) => {
    const r = Math.floor(y / CELL_PX), c = Math.floor(x / CELL_PX)
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return null
    const el = host.querySelector(`[data-idx="${r * SIZE + c}"]`)
    return el && !el.classList.contains('wv-drag') ? el : grid()
  })
  const realRect = Element.prototype.getBoundingClientRect
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
    if (!this.dataset?.idx) return realRect.call(this)
    const i = Number(this.dataset.idx), left = (i % SIZE) * CELL_PX, top = Math.floor(i / SIZE) * CELL_PX
    return { left, top, right: left + CELL_PX, bottom: top + CELL_PX, width: CELL_PX, height: CELL_PX, x: left, y: top }
  })
  captures = []
  vi.spyOn(Element.prototype, 'setPointerCapture').mockImplementation(function (id) { captures.push({ el: this, id }) })
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

async function mount() {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<AuthContext.Provider value={{ user: USER, signOut() {} }}><WeaveGame /></AuthContext.Provider>)
  })
}

const tile = (i) => host.querySelector(`[data-idx="${i}"]`)
const grid = () => host.querySelector('.wv-grid')
const board = () => Array.from({ length: SIZE * SIZE }, (_, i) => tile(i)?.textContent ?? HOLE).join('')
const swapsLeft = () => host.textContent.match(/\d+ swaps? left/)?.[0]
const centre = (i) => ({ clientX: (i % SIZE) * CELL_PX + CELL_PX / 2, clientY: Math.floor(i / SIZE) * CELL_PX + CELL_PX / 2 })

// A pointer event as the browser fires it: `on` is where it is dispatched
// (the tile under the finger, or the element holding the capture).
const pointer = (type, on, init) => act(async () => {
  on.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, buttons: 1, ...init }))
})
const click = (el) => act(async () => { el.click() })

// Two movable tiles with different letters: swapping them spends a swap.
function pickPair() {
  const { solution } = generatePuzzle(TODAY)
  const b = board()
  const wrong = ACTIVE.filter(i => b[i] !== solution[i])
  const [a, c] = wrong.flatMap(i => wrong.map(j => [i, j])).find(([i, j]) => i !== j && b[i] !== b[j])
  return [a, c]
}

// Presses `a` and drags past the threshold, ending over `a` itself: the grid
// takes the capture, and the browser moves a touch press's implicit capture
// off the tile (lostpointercapture at the tile, bubbling; gotpointercapture
// at the grid) before the next move.
async function startDrag(a, init = {}) {
  const from = centre(a)
  await pointer('pointerdown', tile(a), { ...from, ...init })
  await pointer('pointermove', tile(a), { clientX: from.clientX + 30, clientY: from.clientY, ...init })
  expect(captures.map(c => c.el)).toEqual([grid()])
  if ((init.pointerType ?? 'touch') !== 'mouse') {
    await pointer('lostpointercapture', tile(a), { ...init, buttons: 0 })
    await pointer('gotpointercapture', grid(), { ...init, buttons: 0 })
  }
}

describe('Weave pointer drag', () => {
  it('swaps two tiles with a touch drag, past the tile handing its capture to the grid', async () => {
    await mount()
    const [a, b] = pickPair()
    const before = board()
    await startDrag(a)
    expect(tile(a).classList.contains('wv-drag')).toBe(true)

    await pointer('pointermove', grid(), centre(b))
    expect(tile(b).classList.contains('wv-over')).toBe(true)
    await pointer('pointerup', grid(), { ...centre(b), buttons: 0 })
    await pointer('lostpointercapture', grid(), { buttons: 0 }) // capture ends with the press

    expect(board()[a]).toBe(before[b])
    expect(board()[b]).toBe(before[a])
    expect(swapsLeft()).toBe(`${MAX_SWAPS - 1} swaps left`)
    expect(tile(a).classList.contains('wv-drag')).toBe(false)
  })

  it('swaps with a pen drag the same way', async () => {
    await mount()
    const [a, b] = pickPair()
    const before = board()
    await startDrag(a, { pointerType: 'pen' })
    await pointer('pointermove', grid(), { ...centre(b), pointerType: 'pen' })
    await pointer('pointerup', grid(), { ...centre(b), pointerType: 'pen', buttons: 0 })

    expect(board()[b]).toBe(before[a])
    expect(swapsLeft()).toBe(`${MAX_SWAPS - 1} swaps left`)
  })

  it('still swaps with a mouse drag (no implicit capture)', async () => {
    await mount()
    const [a, b] = pickPair()
    const before = board()
    await startDrag(a, { pointerType: 'mouse' })
    await pointer('pointermove', grid(), { ...centre(b), pointerType: 'mouse' })
    await pointer('pointerup', grid(), { ...centre(b), pointerType: 'mouse', buttons: 0 })
    await click(tile(b)) // the click that follows a drag is not a tap

    expect(board()[b]).toBe(before[a])
    expect(swapsLeft()).toBe(`${MAX_SWAPS - 1} swaps left`)
    expect(host.querySelector('.wv-sel')).toBeNull()
  })

  it('ends the drag when the grid itself loses the capture: nothing is swapped', async () => {
    await mount()
    const [a, b] = pickPair()
    const before = board()
    await startDrag(a)
    await pointer('pointermove', grid(), centre(b))
    expect(tile(b).classList.contains('wv-over')).toBe(true)

    // Something else took the pointer: the grid loses the drag's capture.
    await pointer('lostpointercapture', grid(), { buttons: 0 })
    expect(tile(a).classList.contains('wv-drag')).toBe(false)
    expect(tile(b).classList.contains('wv-over')).toBe(false)

    await pointer('pointermove', tile(b), centre(b))
    await pointer('pointerup', tile(b), { ...centre(b), buttons: 0 })
    expect(board()).toBe(before)
    expect(swapsLeft()).toBe(`${MAX_SWAPS} swaps left`)
    expect(tile(a).classList.contains('wv-drag')).toBe(false)
  })

  it('ends the drag on pointercancel: nothing is swapped', async () => {
    await mount()
    const [a, b] = pickPair()
    const before = board()
    await startDrag(a)
    await pointer('pointermove', grid(), centre(b))
    await pointer('pointercancel', grid(), { ...centre(b), buttons: 0 })
    expect(tile(a).classList.contains('wv-drag')).toBe(false)

    await pointer('pointerup', grid(), { ...centre(b), buttons: 0 })
    expect(board()).toBe(before)
    expect(swapsLeft()).toBe(`${MAX_SWAPS} swaps left`)
  })

  it("keeps a drag going through a second finger's press, lift, cancel and lost capture", async () => {
    await mount()
    const [a, b] = pickPair()
    const before = board()
    const other = ACTIVE.find(i => i !== a && i !== b)
    const second = { pointerId: 2, isPrimary: false }
    await startDrag(a)

    // The second finger is implicitly captured by the tile it lands on.
    await pointer('pointerdown', tile(other), { ...centre(other), ...second })
    await pointer('pointerup', tile(other), { ...centre(other), ...second, buttons: 0 })
    await pointer('lostpointercapture', tile(other), { ...second, buttons: 0 })
    await pointer('pointercancel', tile(other), { ...centre(other), ...second, buttons: 0 })
    expect(tile(a).classList.contains('wv-drag')).toBe(true)

    await pointer('pointermove', grid(), centre(b))
    await pointer('pointerup', grid(), { ...centre(b), buttons: 0 })
    expect(board()[b]).toBe(before[a])
    expect(swapsLeft()).toBe(`${MAX_SWAPS - 1} swaps left`)
  })

  // Past the threshold but released over its own slot, which hit-tests as the
  // grid while the tile is dragged. The browser may still fire its click (a
  // finger's tap slop is wider than DRAG_START_PX), which must not tap twice.
  it('treats a touch drag that lifts over its own slot as a tap', async () => {
    await mount()
    const [a] = pickPair()
    const before = board()
    const { clientX, clientY } = centre(a)
    await startDrag(a)
    await pointer('pointermove', grid(), { clientX: clientX + 12, clientY })
    await pointer('pointerup', grid(), { clientX: clientX + 12, clientY, buttons: 0 })
    await pointer('lostpointercapture', grid(), { buttons: 0 })
    await click(tile(a))

    expect(tile(a).getAttribute('aria-pressed')).toBe('true')
    expect(tile(a).classList.contains('wv-drag')).toBe(false)
    expect(board()).toBe(before)
    expect(swapsLeft()).toBe(`${MAX_SWAPS} swaps left`)
  })

  it('treats a mouse drag that wanders off its slot and back as a tap', async () => {
    await mount()
    const [a] = pickPair()
    const { clientX, clientY } = centre(a)
    const mouse = { pointerType: 'mouse' }
    await startDrag(a, mouse)
    await pointer('pointermove', grid(), { ...mouse, clientX, clientY: clientY - CELL_PX })
    await pointer('pointermove', grid(), { ...mouse, clientX: clientX + 2, clientY })
    await pointer('pointerup', grid(), { ...mouse, clientX: clientX + 2, clientY, buttons: 0 })
    await click(tile(a))

    expect(tile(a).getAttribute('aria-pressed')).toBe('true')
    expect(swapsLeft()).toBe(`${MAX_SWAPS} swaps left`)
  })

  it('does nothing when a drag is dropped off the board', async () => {
    await mount()
    const [a] = pickPair()
    const before = board()
    await startDrag(a)
    const off = { clientX: centre(a).clientX, clientY: SIZE * CELL_PX + 20 }
    await pointer('pointermove', grid(), off)
    await pointer('pointerup', grid(), { ...off, buttons: 0 })
    await click(tile(a)) // the click that follows a drag is not a tap

    expect(board()).toBe(before)
    expect(swapsLeft()).toBe(`${MAX_SWAPS} swaps left`)
    expect(host.querySelector('.wv-sel')).toBeNull()
    expect(tile(a).classList.contains('wv-drag')).toBe(false)
  })

  it('keeps a touch tap a tap: no capture taken, and its click selects then swaps', async () => {
    await mount()
    const [a, b] = pickPair()
    const before = board()
    for (const i of [a, b]) {
      await pointer('pointerdown', tile(i), centre(i))
      await pointer('pointermove', tile(i), { clientX: centre(i).clientX + 3, clientY: centre(i).clientY })
      await pointer('pointerup', tile(i), { ...centre(i), buttons: 0 })
      await pointer('lostpointercapture', tile(i), { buttons: 0 }) // the implicit capture ends
      await click(tile(i))
      if (i === a) expect(tile(a).getAttribute('aria-pressed')).toBe('true')
    }
    expect(captures).toEqual([])
    expect(board()[b]).toBe(before[a])
    expect(swapsLeft()).toBe(`${MAX_SWAPS - 1} swaps left`)
  })
})
