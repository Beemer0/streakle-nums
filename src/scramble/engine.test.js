import { describe, it, expect } from 'vitest'
import { WORDS } from './words.js'
import {
  LENGTHS, RUNGS, MAX_ROWS, MAX_COLS, ACROSS, DOWN, FALLBACK, BLOCK_EPOCH, BLOCK_DAYS, HINT_SECONDS,
  mixSeed, generatePuzzle, cellsOf, freePositions, boardCells, cellKey, scoreSeconds, formatTime, shareLine,
} from './engine.js'

const sig = w => [...w].sort().join('')

function addDays(dateStr, k) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + k)).toISOString().slice(0, 10)
}

// Every maximal run of 2+ letters, as "dir:row,col:WORD".
function letterRuns(p) {
  const grid = new Map()
  p.placements.forEach(q => cellsOf(q).forEach(([r, c], k) => grid.set(cellKey(r, c), q.word[k])))
  const runs = []
  for (const [dir, dr, dc] of [[ACROSS, 0, 1], [DOWN, 1, 0]]) {
    for (const k of grid.keys()) {
      const [r, c] = k.split(',').map(Number)
      if (grid.has(cellKey(r - dr, c - dc))) continue
      let s = '', rr = r, cc = c
      while (grid.has(cellKey(rr, cc))) { s += grid.get(cellKey(rr, cc)); rr += dr; cc += dc }
      if (s.length >= 2) runs.push(`${dir}:${r},${c}:${s}`)
    }
  }
  return runs.sort()
}

describe('word banks', () => {
  it('has every ladder length, sorted, with no duplicates or in-bank anagrams', () => {
    for (const len of new Set(LENGTHS)) {
      const list = WORDS[len]
      expect(list.length).toBeGreaterThan(300)
      expect(list.every(w => w.length === len && /^[A-Z]+$/.test(w))).toBe(true)
      expect(list.every((w, i) => i === 0 || list[i - 1] < w)).toBe(true)
      expect(new Set(list.map(sig)).size).toBe(list.length)
    }
  })
})

describe('generatePuzzle', () => {
  it('is deterministic per date and differs across dates', () => {
    const a = generatePuzzle('2026-11-02'), b = generatePuzzle('2026-11-02')
    expect(b.placements).toEqual(a.placements)
    expect(b.racks).toEqual(a.racks)
    expect(generatePuzzle('2026-11-03').words).not.toEqual(a.words)
  })

  it('pins the launch-day board as FALLBACK (update via check-scramble --dump)', () => {
    const p = generatePuzzle('2026-10-18', { noFallback: true })
    expect({ placements: p.placements, racks: p.racks }).toEqual(FALLBACK)
  })

  it('mixSeed separates adjacent dates', () => {
    expect(mixSeed(20261018)).not.toBe(mixSeed(20261019))
  })

  it('lays every sampled day out as a legal, connected ladder', () => {
    for (let k = 0; k < 40; k++) {
      const p = generatePuzzle(addDays('2026-10-01', k * 11), { noFallback: true })
      expect(p).not.toBeNull()
      expect(p.words.map(w => w.length)).toEqual(LENGTHS)
      expect(new Set(p.words).size).toBe(RUNGS)
      expect(p.words.every(w => WORDS[w.length].includes(w))).toBe(true)
      expect(p.rows).toBeLessThanOrEqual(MAX_ROWS)
      expect(p.cols).toBeLessThanOrEqual(MAX_COLS)
      // The only letter runs on the board are the six words themselves.
      const placed = p.placements.map(q => `${q.dir}:${q.row},${q.col}:${q.word}`).sort()
      expect(letterRuns(p)).toEqual(placed)
      for (let i = 0; i < RUNGS; i++) {
        const free = freePositions(p.placements, i)
        if (i > 0) expect(free.length).toBeLessThan(LENGTHS[i]) // crosses an earlier word
        const letters = free.map(j => p.words[i][j]).join('')
        expect(sig(p.racks[i])).toBe(sig(letters))
        if (new Set(letters).size > 1) expect(p.racks[i]).not.toBe(letters)
      }
    }
  })

  it('never repeats a word within a block', () => {
    const words = []
    for (let k = 0; k < BLOCK_DAYS; k++) words.push(...generatePuzzle(addDays(BLOCK_EPOCH, BLOCK_DAYS * 3 + k)).words)
    expect(new Set(words).size).toBe(words.length)
  })
})

describe('play helpers', () => {
  it('maps board cells, marking crossings with both rungs', () => {
    const p = generatePuzzle('2026-10-18')
    const cells = boardCells(p)
    const total = p.words.reduce((n, w) => n + w.length, 0)
    const crossings = [...cells.values()].filter(c => c.rungs.length === 2)
    expect(cells.size).toBe(total - crossings.length)
    expect(crossings.length).toBeGreaterThanOrEqual(RUNGS - 1)
    // LOGO/MOTIF cross at the last O.
    expect(cells.get(cellKey(1, 7))).toEqual({ r: 1, c: 7, ch: 'O', rungs: [0, 1] })
  })

  it('scores time plus the hint penalty and formats it', () => {
    expect(scoreSeconds(61_900, 0)).toBe(61)
    expect(scoreSeconds(61_900, 2)).toBe(61 + 2 * HINT_SECONDS)
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(125)).toBe('2:05')
  })

  it('shares one square per rung', () => {
    const rungs = [
      { solved: true, hints: 0, mistakes: 0 },
      { solved: true, hints: 1, mistakes: 0 },
      { solved: true, hints: 0, mistakes: 2 },
      { solved: false, hints: 0, mistakes: 0 },
    ]
    expect(shareLine(rungs)).toBe('🟩🟨🟥⬛')
  })
})
