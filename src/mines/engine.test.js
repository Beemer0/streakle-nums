import { describe, it, expect } from 'vitest'
import {
  RUNGS, FALLBACKS, HIDDEN, REVEALED, FLAGGED,
  mulberry32, mixSeed, neighbors, computeCounts, generateBoard, openingState,
  dig, chord, toggleFlag, isWon, revealedCount, flagCount, solve,
  boardToString, boardFromString, formatTime, shareLines,
} from './engine.js'

const idx = (board, r, c) => r * board.cols + c

// Hand-built boards for solver tests. rung selects the dims; the string
// carries the mines and the 'o' opening cell.
function fromRows(rows, cols, mineRows, open) {
  const N = cols * rows
  const mine = new Uint8Array(N)
  mineRows.forEach((line, r) => [...line].forEach((ch, c) => { if (ch === '*') mine[r * cols + c] = 1 }))
  const mines = mine.reduce((a, b) => a + b, 0)
  const board = { rung: -1, cols, rows, mines, mine, count: new Uint8Array(N), open, opening: [], meta: null }
  computeCounts(board)
  const cells = new Uint8Array(N)
  // opening = flood from `open`
  const stack = [open]; cells[open] = REVEALED
  const { adj } = neighbors(cols, rows)
  while (stack.length) {
    const i = stack.pop()
    if (board.count[i] !== 0) continue
    for (const j of adj[i]) if (cells[j] === HIDDEN) { cells[j] = REVEALED; stack.push(j) }
  }
  board.opening = [...cells.keys()].filter(i => cells[i] === REVEALED)
  return board
}

describe('neighbors', () => {
  it('counts corner/edge/interior cells and caches', () => {
    const { adj, near2 } = neighbors(9, 9)
    expect(adj[0]).toHaveLength(3)
    expect(adj[4]).toHaveLength(5)
    expect(adj[40]).toHaveLength(8)
    expect(near2[0]).toHaveLength(8)
    expect(near2[40]).toHaveLength(24)
    expect(neighbors(9, 9)).toBe(neighbors(9, 9))
  })
})

describe('generateBoard', () => {
  it('is deterministic per date and rung, and differs across them', () => {
    const a = generateBoard('2026-10-01', 0), b = generateBoard('2026-10-01', 0)
    expect(b.mine).toEqual(a.mine)
    expect(b.count).toEqual(a.count)
    expect(b.open).toBe(a.open)
    expect(boardToString(generateBoard('2026-10-01', 1))).not.toBe(boardToString(a))
    expect(boardToString(generateBoard('2026-10-02', 0))).not.toBe(boardToString(a))
  })

  it('mixSeed does not collide where seed + attempt*997 does', () => {
    expect(20260105 + 997).toBe(20261102)
    expect(mixSeed(20260105, 0, 1)).not.toBe(mixSeed(20261102, 0, 0))
    expect(mulberry32(mixSeed(1, 0, 0))()).toBeGreaterThanOrEqual(0)
  })

  it('pins the launch-day boards (change FALLBACKS deliberately if the engine changes)', () => {
    for (let r = 0; r < RUNGS.length; r++) {
      expect(boardToString(generateBoard('2026-09-04', r))).toBe(FALLBACKS[r])
    }
  })

  it('satisfies the layout invariants over 20 dates × 3 rungs', () => {
    const d = new Date(2026, 8, 10)
    for (let k = 0; k < 20; k++) {
      const dateStr = d.toLocaleDateString('en-CA')
      for (let rung = 0; rung < RUNGS.length; rung++) {
        const spec = RUNGS[rung]
        const b = generateBoard(dateStr, rung, { noFallback: true })
        expect(b, `${dateStr} ${spec.key}`).not.toBeNull()
        expect(b.meta.fallback).toBe(false)
        expect(b.mine.reduce((a, x) => a + x, 0)).toBe(spec.mines)
        const { adj } = neighbors(spec.cols, spec.rows)
        for (let i = 0; i < b.mine.length; i++) {
          if (b.mine[i]) continue
          expect(b.count[i]).toBe(adj[i].reduce((a, j) => a + b.mine[j], 0))
        }
        const or = Math.floor(b.open / spec.cols), oc = b.open % spec.cols
        for (let i = 0; i < b.mine.length; i++) {
          const r = Math.floor(i / spec.cols), c = i % spec.cols
          if (Math.abs(r - or) <= spec.protect && Math.abs(c - oc) <= spec.protect) expect(b.mine[i]).toBe(0)
        }
        expect(b.count[b.open]).toBe(0)
        expect(b.opening).toContain(b.open)
        expect(b.opening.length).toBeGreaterThanOrEqual(spec.minOpen)
        const inOpening = new Set(b.opening)
        for (let k2 = 1; k2 < b.opening.length; k2++) expect(b.opening[k2]).toBeGreaterThan(b.opening[k2 - 1])
        for (const i of b.opening) {
          expect(b.mine[i]).toBe(0)
          if (b.count[i] === 0) for (const j of adj[i]) expect(inOpening.has(j)).toBe(true)
        }
      }
      d.setDate(d.getDate() + 1)
    }
  })

  it('never falls back over a 60-day sweep and every board solves', () => {
    const d = new Date(2026, 8, 4)
    for (let k = 0; k < 60; k++) {
      const dateStr = d.toLocaleDateString('en-CA')
      for (let rung = 0; rung < RUNGS.length; rung++) {
        const b = generateBoard(dateStr, rung, { noFallback: true })
        expect(b, `${dateStr} rung ${rung}`).not.toBeNull()
        expect(solve(b).solved).toBe(true)
      }
      d.setDate(d.getDate() + 1)
    }
  })

  it('FALLBACKS parse to valid no-guess boards', () => {
    for (let r = 0; r < RUNGS.length; r++) {
      const spec = RUNGS[r]
      const b = boardFromString(FALLBACKS[r], r)
      expect(b.cols).toBe(spec.cols)
      expect(b.rows).toBe(spec.rows)
      expect(b.mines).toBe(spec.mines)
      expect(b.opening.length).toBeGreaterThanOrEqual(spec.minOpen)
      expect(solve(b).solved).toBe(true)
    }
  })
})

describe('solver soundness', () => {
  it('never reveals a mine or flags a safe cell on random layouts of any density', () => {
    const rng = mulberry32(12345)
    for (let k = 0; k < 200; k++) {
      const cols = 5 + Math.floor(rng() * 6), rows = 5 + Math.floor(rng() * 6)
      const N = cols * rows
      const density = 0.05 + rng() * 0.3
      const mine = new Uint8Array(N)
      for (let i = 0; i < N; i++) mine[i] = rng() < density ? 1 : 0
      const open = Math.floor(rng() * N)
      if (mine[open]) mine[open] = 0
      const mines = mine.reduce((a, b) => a + b, 0)
      const board = { rung: -1, cols, rows, mines, mine, count: new Uint8Array(N), open, opening: [open], meta: null }
      computeCounts(board)
      const res = solve(board)
      for (let i = 0; i < N; i++) {
        if (res.cells[i] === REVEALED) expect(mine[i]).toBe(0)
        if (res.cells[i] === FLAGGED) expect(mine[i]).toBe(1)
      }
    }
  })
})

describe('solver rules', () => {
  it('trivial: reveals around zeros and flags the forced mine', () => {
    // 3x3: one mine bottom-right, open at top-left → whole board floods except the mine
    const b = fromRows(3, 3, ['...', '...', '..*'], 0)
    const res = solve(b)
    expect(res.solved).toBe(true)
    expect(res.cells[8]).toBe(FLAGGED)
    expect(res.rules & 1).toBe(1)
  })

  it('1-1 subset: deduces the safe cell', () => {
    // Row0 open area, row1 numbers 1 1 1 over row2 with a single mine in the middle
    // ....   opening cells are the top rows; the "1 1 1" over ".*." needs the subset rule
    const b = fromRows(4, 3, ['...', '...', '...', '.*.'], 0)
    const res = solve(b)
    expect(res.solved).toBe(true)
    expect(res.cells[10]).toBe(FLAGGED)
  })

  it('1-2 wall: deduces the mine from a pairwise difference', () => {
    // bottom row "1 2 1" pattern: mines at (3,0) and (3,2)? Use classic: numbers 1 2 1 → mines under the 1s.
    const b = fromRows(4, 3, ['...', '...', '...', '*.*'], 1)
    const res = solve(b)
    expect(res.solved).toBe(true)
    expect(res.cells[9]).toBe(FLAGGED)
    expect(res.cells[11]).toBe(FLAGGED)
    expect(res.cells[10]).toBe(REVEALED)
  })

  it('global count finishes an endgame the local rules cannot', () => {
    // 2 mines total; a "1" sees two hidden cells (one mine), the other mine is isolated far away.
    // 4x4, open top-left, mines at (3,3) and one of {(3,0),(3,1)}: build so a corner remains.
    const b = fromRows(4, 4, ['....', '....', '....', '*..*'], 0)
    const res = solve(b)
    // Bottom-left: cell(2,0)=1, cell(2,1)=1 see {(3,0),(3,1)} and {(3,0),(3,1),(3,2)} — subset gives (3,2) safe,
    // then (3,2)=1 sees {(3,1),(3,3)}... the far corner needs the count. Either way it must solve.
    expect(res.solved).toBe(true)
  })

  it('reports a canonical 50/50 as unsolved with the two cells in the frontier', () => {
    // 2x3: top row open (zero impossible with mines below). Build: mines at (1,0) only → "1 1" over ".*"? need symmetric
    // Classic 50/50: two hidden cells under a single "1" with nothing else touching them, count = 1 remaining.
    const b = fromRows(3, 2, ['..', '..', '*.'], 0)
    // From open (0,0): row0 floods; row1 cells show 1 and 1 → {(2,0),(2,1)} one mine; global count 1 → stuck.
    const res = solve(b)
    expect(res.solved).toBe(false)
    expect(res.frontier).toEqual([4, 5])
  })
})

describe('play primitives', () => {
  const b = fromRows(4, 4, ['....', '....', '..*.', '....'], 0)

  it('dig floods zeros, stops at numbers, and never mutates the input', () => {
    const cells = new Uint8Array(16)
    const r = dig(b, cells, 0)
    expect(cells.every(v => v === HIDDEN)).toBe(true)
    expect(r.hit).toBe(-1)
    expect(r.cells[0]).toBe(REVEALED)
    expect(r.cells[idx(b, 1, 1)]).toBe(REVEALED) // the "1" next to the mine
    expect(r.cells[idx(b, 2, 2)]).toBe(HIDDEN)   // the mine
    expect(r.opened.length).toBe(revealedCount(r.cells))
  })

  it('dig on a revealed or flagged cell is a no-op returning the same reference', () => {
    const cells = openingState(b)
    expect(dig(b, cells, b.open).cells).toBe(cells)
    const flagged = toggleFlag(cells, idx(b, 2, 2))
    expect(dig(b, flagged, idx(b, 2, 2)).cells).toBe(flagged)
  })

  it('dig on a mine reports the hit with cells unchanged', () => {
    const cells = openingState(b)
    const r = dig(b, cells, idx(b, 2, 2))
    expect(r.hit).toBe(idx(b, 2, 2))
    expect(r.cells).toBe(cells)
  })

  it('chord reveals the rest once flags match, hits on a wrong flag, no-ops on mismatch', () => {
    // Two mines so the "1" at (2,1) keeps two hidden neighbours after the
    // opening flood: the mine (2,2) and the safe (3,2).
    const b2 = fromRows(4, 4, ['....', '....', '..**', '....'], 0)
    const cells = openingState(b2)
    const num = idx(b2, 2, 1)
    expect(cells[num]).toBe(REVEALED)
    expect(cells[idx(b2, 3, 2)]).toBe(HIDDEN)
    expect(chord(b2, cells, num).cells).toBe(cells) // 0 flags ≠ 1
    const good = toggleFlag(cells, idx(b2, 2, 2))
    const r = chord(b2, good, num)
    expect(r.hit).toBe(-1)
    expect(r.cells[idx(b2, 3, 2)]).toBe(REVEALED)
    // wrong flag on the safe neighbour, mine left hidden → chord hits it
    const wrong = toggleFlag(cells, idx(b2, 3, 2))
    expect(chord(b2, wrong, num).hit).toBe(idx(b2, 2, 2))
  })

  it('toggleFlag flips hidden/flagged and leaves revealed alone', () => {
    const cells = openingState(b)
    const f = toggleFlag(cells, 15)
    expect(f[15]).toBe(FLAGGED)
    expect(toggleFlag(f, 15)[15]).toBe(HIDDEN)
    expect(toggleFlag(cells, b.open)).toBe(cells)
    expect(flagCount(f)).toBe(1)
  })

  it('isWon ignores flags and needs every safe cell revealed', () => {
    const all = new Uint8Array(16).fill(REVEALED)
    all[idx(b, 2, 2)] = HIDDEN
    expect(isWon(b, all)).toBe(true)
    all[idx(b, 2, 2)] = FLAGGED
    expect(isWon(b, all)).toBe(true)
    all[0] = HIDDEN
    expect(isWon(b, all)).toBe(false)
  })
})

describe('formatting', () => {
  it('formatTime', () => {
    expect(formatTime(7000)).toBe('0:07')
    expect(formatTime(252000)).toBe('4:12')
    expect(formatTime(3723000)).toBe('1:02:03')
    expect(formatTime(-5)).toBe('0:00')
  })

  it('shareLines', () => {
    expect(shareLines([
      { state: 'cleared', ms: 42000, hits: 0 },
      { state: 'failed', ms: 76000, hits: 3 },
      { state: 'locked', ms: 0, hits: 0 },
    ])).toEqual(['🟩 Easy 0:42', '🟥 Medium 1:16 💥💥💥', '⬛ Hard —'])
  })
})
