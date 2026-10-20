import { describe, it, expect } from 'vitest'
import { WORDS } from './words.js'
import {
  POOL_SIZE, BOARD_WORDS, MIN_LEN, MAX_ROWS, MAX_COLS, ACROSS, DOWN, FALLBACK, MIN_LONG_WORDS,
  BLOCK_EPOCH, ROOT_BLOCK_DAYS, WORD_BLOCK_DAYS, HINT_SECONDS,
  mixSeed, generatePuzzle, spellable, subwords, cellsOf, boardCells, cellKey,
  revealedCells, completedWords, completeFound, nextHint, scoreSeconds, formatTime, shareLine,
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

// The launch-day board: PATIENT with INEPT, PAINT, PINE, PANE, PAIN.
//   . . P . . . I .
//   . . A . P I N E
//   . . I . A . E .
//   . . N . N . P .
//   P A T I E N T .
//   A . . . . . . .
//   I . . . . . . .
//   N . . . . . . .
const LAUNCH = generatePuzzle('2026-10-18')

describe('word bank', () => {
  it('has every length, sorted, with no duplicates or in-bank anagrams', () => {
    for (let len = MIN_LEN; len <= POOL_SIZE; len++) {
      const list = WORDS[len]
      expect(list.length).toBeGreaterThan(300)
      expect(list.every(w => w.length === len && /^[A-Z]+$/.test(w))).toBe(true)
      expect(list.every((w, i) => i === 0 || list[i - 1] < w)).toBe(true)
      expect(new Set(list.map(sig)).size).toBe(list.length)
    }
  })
})

describe('letters', () => {
  it('spells words from a pool, each tile once', () => {
    expect(spellable('PAINT', 'PATIENT')).toBe(true)
    expect(spellable('PATENT', 'PATIENT')).toBe(true) // two Ts in the pool
    expect(spellable('TATTLE', 'PATIENT')).toBe(false)
    expect(spellable('PIPE', 'PATIENT')).toBe(false)
  })

  it('lists the shorter bank words inside a root', () => {
    const subs = subwords('PATIENT')
    expect(subs).toContain('PAINT')
    expect(subs).toContain('INEPT')
    expect(subs.every(w => w.length >= MIN_LEN && w.length < POOL_SIZE && spellable(w, 'PATIENT'))).toBe(true)
    expect(subwords('PATIENT')).toBe(subs) // memoised
  })
})

describe('generatePuzzle', () => {
  it('is deterministic per date and differs across dates', () => {
    const a = generatePuzzle('2026-11-02'), b = generatePuzzle('2026-11-02')
    expect(b.placements).toEqual(a.placements)
    expect(b.pool).toBe(a.pool)
    expect(generatePuzzle('2026-11-03').words).not.toEqual(a.words)
  })

  it('pins the launch-day board as FALLBACK (update via check-scramble --dump)', () => {
    const p = generatePuzzle('2026-10-18', { noFallback: true })
    expect({ pool: p.pool, placements: p.placements }).toEqual(FALLBACK)
  })

  it('mixSeed separates adjacent dates', () => {
    expect(mixSeed(20261018)).not.toBe(mixSeed(20261019))
  })

  it('builds every sampled day from one shuffled 7-letter root, as a legal board', () => {
    for (let k = 0; k < 40; k++) {
      const p = generatePuzzle(addDays('2026-10-01', k * 11), { noFallback: true })
      expect(p).not.toBeNull()
      expect(p.words).toHaveLength(BOARD_WORDS)
      expect(new Set(p.words).size).toBe(BOARD_WORDS)
      expect(p.root).toHaveLength(POOL_SIZE)
      expect(sig(p.pool)).toBe(sig(p.root))
      expect(p.pool).not.toBe(p.root)
      expect(p.words.every(w => WORDS[w.length].includes(w) && spellable(w, p.pool))).toBe(true)
      expect(p.words.slice(1).filter(w => w.length >= 5).length).toBeGreaterThanOrEqual(MIN_LONG_WORDS)
      expect(p.rows).toBeLessThanOrEqual(MAX_ROWS)
      expect(p.cols).toBeLessThanOrEqual(MAX_COLS)
      // The only letter runs on the board are the six words themselves.
      expect(letterRuns(p)).toEqual(p.placements.map(q => `${q.dir}:${q.row},${q.col}:${q.word}`).sort())
    }
  })

  it('never repeats a root within a block or a shorter word within a stretch', () => {
    const start = addDays(BLOCK_EPOCH, ROOT_BLOCK_DAYS * 2)
    const roots = [], stretch = []
    for (let k = 0; k < ROOT_BLOCK_DAYS; k++) {
      const p = generatePuzzle(addDays(start, k))
      roots.push(p.root)
      if (k < WORD_BLOCK_DAYS) stretch.push(...p.words.slice(1))
    }
    expect(new Set(roots).size).toBe(roots.length)
    expect(new Set(stretch).size).toBe(stretch.length)
  })
})

describe('play helpers', () => {
  it('maps board cells, marking crossings with both words', () => {
    const cells = boardCells(LAUNCH)
    const total = LAUNCH.words.reduce((n, w) => n + w.length, 0)
    const shared = [...cells.values()].filter(c => c.words.length === 2)
    expect(cells.size).toBe(total - shared.length)
    // PATIENT and PAINT cross at the T.
    expect(cells.get(cellKey(4, 2))).toEqual({ r: 4, c: 2, ch: 'T', words: [0, 2] })
  })

  it('reveals found words and hinted cells, and completes words they fill', () => {
    const iPain = LAUNCH.words.indexOf('PAIN')
    const iPatient = LAUNCH.words.indexOf('PATIENT')
    const revealed = revealedCells(LAUNCH, [iPatient], ['5,0', '6,0'])
    expect(revealed.has('4,6')).toBe(true)
    expect(completedWords(LAUNCH, revealed)).toEqual([iPatient])
    revealed.add('7,0')
    expect(completedWords(LAUNCH, revealed).sort()).toEqual([iPatient, iPain].sort())
  })

  it('counts words filled in by crossings and hints as found', () => {
    const iPatient = LAUNCH.words.indexOf('PATIENT'), iPain = LAUNCH.words.indexOf('PAIN')
    const found = [iPatient]
    expect(completeFound(LAUNCH, found, ['5,0', '6,0'])).toBe(found) // PAIN still has a gap
    expect(completeFound(LAUNCH, found, ['5,0', '6,0', '7,0'])).toEqual([iPatient, iPain])
  })

  it('hints the word closest to finished, shortest first', () => {
    const iPatient = LAUNCH.words.indexOf('PATIENT')
    // With PATIENT found, PANE (E given) and PAIN (P given) have 3 hidden
    // cells each and 4 letters; PANE comes first on the board, so its first
    // hidden cell, the P at the top, goes first.
    const revealed = revealedCells(LAUNCH, [iPatient], [])
    expect(nextHint(LAUNCH, revealed)).toBe('1,4')
    revealed.add('1,4'); revealed.add('2,4'); revealed.add('3,4')
    // PANE done; its P is also PINE's first letter, so PINE and PAIN now tie
    // at 3 hidden cells and PINE (earlier on the board) gets its I next.
    expect(nextHint(LAUNCH, revealed)).toBe('1,5')
    const all = revealedCells(LAUNCH, LAUNCH.words.map((_, i) => i), [])
    expect(nextHint(LAUNCH, all)).toBeNull()
  })

  it('scores time plus the hint penalty and formats it', () => {
    expect(scoreSeconds(61_900, 0)).toBe(61)
    expect(scoreSeconds(61_900, 2)).toBe(61 + 2 * HINT_SECONDS)
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(125)).toBe('2:05')
  })

  it('shares one square per word, shortest first', () => {
    const idx = w => LAUNCH.words.indexOf(w)
    const found = ['PATIENT', 'PAINT', 'PINE', 'PAIN'].map(idx)
    // A hint in PAIN's column; PANE and INEPT not found.
    expect(shareLine(LAUNCH, found, ['5,0'])).toBe('🟩⬛🟨⬛🟩🟩') // PINE PANE PAIN | INEPT PAINT | PATIENT
  })
})
