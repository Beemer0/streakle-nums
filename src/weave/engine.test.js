import { describe, it, expect } from 'vitest'
import { ANSWERS } from './answers.js'
import {
  ACTIVE, WORD_CELLS, CELL_WORDS, HOLE, PAR, MAX_START_GREENS, FALLBACK, BLOCK_EPOCH, BLOCK_DAYS,
  GREEN, YELLOW, GREY,
  mulberry32, mixSeed, generatePuzzle, minSwaps, minSwapsBetween, colours, swap, isSolved,
  boardFromWords, wordsOf, shareGrid,
} from './engine.js'

// Hand-built board for colour tests (any letters work — colours never checks
// words). Row 0 reads BREAD; the only other E is at cell 21.
//   B R E A D
//   F . G . H
//   I J K L M
//   N . O . P
//   Q E S T U
const SOL = 'BREADF.G.HIJKLMN.O.PQESTU'

function bfsSwaps(from, to) {
  const target = to.join('')
  let frontier = [from.join('')]
  const seen = new Set(frontier)
  for (let d = 0; frontier.length; d++) {
    if (frontier.includes(target)) return d
    const next = []
    for (const s of frontier) {
      for (let i = 0; i < s.length; i++) {
        for (let j = i + 1; j < s.length; j++) {
          if (s[i] === s[j]) continue
          const t = s.split('')
          ;[t[i], t[j]] = [t[j], t[i]]
          const k = t.join('')
          if (!seen.has(k)) { seen.add(k); next.push(k) }
        }
      }
    }
    frontier = next
  }
  return -1
}

function addDays(dateStr, k) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + k)).toISOString().slice(0, 10)
}

describe('layout', () => {
  it('has 21 tiles, four holes and nine crossing cells', () => {
    expect(ACTIVE).toHaveLength(21)
    expect([6, 8, 16, 18].every(i => !ACTIVE.includes(i))).toBe(true)
    expect(CELL_WORDS.filter(w => w.length === 2)).toHaveLength(9)
    expect(CELL_WORDS[12]).toEqual([1, 4])
  })

  it('round-trips words through a board', () => {
    const words = ['ABBOT', 'OUNCE', 'TRYST', 'ALOFT', 'BUNNY', 'TWEET']
    const board = boardFromWords(words)
    expect(board).toBe(FALLBACK.solution)
    expect(wordsOf(board)).toEqual(words)
  })
})

describe('generatePuzzle', () => {
  it('is deterministic per date and differs across dates', () => {
    const a = generatePuzzle('2026-11-02'), b = generatePuzzle('2026-11-02')
    expect(b.solution).toBe(a.solution)
    expect(b.start).toBe(a.start)
    expect(generatePuzzle('2026-11-03').solution).not.toBe(a.solution)
  })

  it('pins the launch-day puzzle as FALLBACK (update via check-weave --dump)', () => {
    const p = generatePuzzle('2026-10-17', { noFallback: true })
    expect({ solution: p.solution, start: p.start }).toEqual(FALLBACK)
  })

  it('mixSeed separates adjacent dates', () => {
    expect(mixSeed(20261017)).not.toBe(mixSeed(20261018))
    expect(mulberry32(mixSeed(1))()).toBeGreaterThanOrEqual(0)
  })

  it('every sampled day is a valid, exactly-PAR scramble of six distinct answers', () => {
    const bank = new Set(ANSWERS)
    for (let k = 0; k < 40; k++) {
      const p = generatePuzzle(addDays('2026-10-01', k * 9), { noFallback: true })
      expect(p).not.toBeNull()
      expect(p.words.every(w => bank.has(w))).toBe(true)
      expect(new Set(p.words).size).toBe(6)
      for (let i = 0; i < 25; i++) {
        if (!ACTIVE.includes(i)) { expect(p.solution[i]).toBe(HOLE); expect(p.start[i]).toBe(HOLE) }
      }
      const tally = s => ACTIVE.map(i => s[i]).sort().join('')
      expect(tally(p.start)).toBe(tally(p.solution))
      expect(minSwaps(p.start, p.solution)).toBe(PAR)
      for (const slot of WORD_CELLS) {
        expect(slot.filter(i => p.start[i] === p.solution[i]).length).toBeLessThanOrEqual(MAX_START_GREENS)
      }
    }
  })

  it('never repeats a word within a block', () => {
    const words = []
    for (let k = 0; k < BLOCK_DAYS; k++) words.push(...generatePuzzle(addDays(BLOCK_EPOCH, BLOCK_DAYS + k)).words)
    expect(new Set(words).size).toBe(words.length)
  })
})

describe('minSwapsBetween', () => {
  it('handles simple permutations and duplicates', () => {
    expect(minSwapsBetween([...'AB'], [...'AB'])).toBe(0)
    expect(minSwapsBetween([...'AB'], [...'BA'])).toBe(1)
    expect(minSwapsBetween([...'ABC'], [...'BCA'])).toBe(2)
    // A 4-cycle of positions, but duplicates let two swaps do it.
    expect(minSwapsBetween([...'ABAB'], [...'BABA'])).toBe(2)
    expect(minSwapsBetween([...'AABB'], [...'BBAA'])).toBe(2)
  })

  it('matches a brute-force search on random small cases with repeats', () => {
    const rng = mulberry32(7)
    for (let t = 0; t < 150; t++) {
      const n = 4 + Math.floor(rng() * 5)          // 4–8 tiles
      const letters = 2 + Math.floor(rng() * 4)    // 2–5 distinct letters
      const to = Array.from({ length: n }, () => 'ABCDE'[Math.floor(rng() * letters)])
      const from = to.slice()
      for (let i = from.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [from[i], from[j]] = [from[j], from[i]]
      }
      expect(minSwapsBetween(from, to)).toBe(bfsSwaps(from, to))
    }
  })
})

describe('colours', () => {
  it('is all green when solved and null in the holes', () => {
    const c = colours(SOL, SOL)
    expect(ACTIVE.every(i => c[i] === GREEN)).toBe(true)
    expect([6, 8, 16, 18].every(i => c[i] === null)).toBe(true)
  })

  it('marks letters missing from the row as yellow', () => {
    const c = colours(swap(SOL, 0, 1), SOL) // R B E A D
    expect(c[0]).toBe(YELLOW)
    expect(c[1]).toBe(YELLOW)
    expect(c[2]).toBe(GREEN)
  })

  it('marks letters needed by neither word as grey', () => {
    const c = colours(swap(SOL, 1, 23), SOL) // row 0 gets S, row 4 gets R
    expect(c[1]).toBe(GREY)
    expect(c[23]).toBe(GREY)
  })

  it('lets a crossing tile turn yellow through its column', () => {
    const c = colours(swap(SOL, 5, 10), SOL) // F and I trade places in column 0
    expect(c[10]).toBe(YELLOW) // F: not missing from row 2, missing from column 0
    expect(c[5]).toBe(YELLOW)
  })

  it('only lights a duplicate as often as the word needs it', () => {
    // Row 0 becomes B E A E D: it is missing R, E and A — one E, two E tiles.
    const board = swap(swap(SOL, 2, 3), 1, 21)
    const c = colours(board, SOL)
    expect(c[1]).toBe(YELLOW) // first loose E claims the row's only missing E
    expect(c[3]).toBe(GREY)
    expect(c[2]).toBe(YELLOW) // A, a crossing tile, still missing from row 0
  })

  it('serves tiles in one word before crossing tiles', () => {
    // Row 0 becomes E E B A D: missing B, R, E. The loose E at 1 wins the E;
    // the crossing E at 0 is not needed by column 0 either.
    const board = swap(swap(SOL, 0, 2), 1, 21)
    const c = colours(board, SOL)
    expect(c[1]).toBe(YELLOW)
    expect(c[0]).toBe(GREY)
    expect(c[2]).toBe(YELLOW)
  })
})

describe('play helpers', () => {
  it('swap returns a new board and leaves the original alone', () => {
    const b = swap(SOL, 0, 4)
    expect(b).toBe('DREABF.G.HIJKLMN.O.PQESTU')
    expect(SOL[0]).toBe('B')
    expect(isSolved(SOL, SOL)).toBe(true)
    expect(isSolved(b, SOL)).toBe(false)
  })

  it('shares the board as emoji rows', () => {
    expect(shareGrid(SOL, SOL)).toEqual(['🟩🟩🟩🟩🟩', '🟩⬛🟩⬛🟩', '🟩🟩🟩🟩🟩', '🟩⬛🟩⬛🟩', '🟩🟩🟩🟩🟩'])
    expect(shareGrid(swap(SOL, 1, 23), SOL)[0]).toBe('🟩⬜🟩🟩🟩')
    expect(shareGrid(swap(SOL, 0, 1), SOL, true)[0]).toBe('🟦🟦🟧🟧🟧')
  })
})
