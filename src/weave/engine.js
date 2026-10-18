// Weave — the pure engine behind /weave. No React, no DOM, no Date, no
// Math.random: every grid is a deterministic function of the date string, so
// all players get the same puzzle. Imported unchanged by Weave.jsx,
// engine.test.js and scripts/check-weave.mjs.
//
// The board is a 5×5 lattice: rows 0/2/4 read across and columns 0/2/4 read
// down as five-letter words; the four odd/odd cells are holes. Boards are
// 25-character strings indexed r*5+c, with HOLE in the holes.
//
// ANY change to the fill search, the scramble, mixSeed or ANSWERS rewrites
// every historical grid. The FALLBACK snapshot test makes that deliberate.

import { ANSWERS } from './answers.js'

export const SIZE = 5
export const MAX_SWAPS = 15
// Every scramble is exactly PAR swaps from solved, so MAX_SWAPS - PAR stars
// is a perfect game.
export const PAR = 10
export const HOLE = '.'
export const GREEN = 'green', YELLOW = 'yellow', GREY = 'grey'

export const GEN_FILLS = 40       // top-row words tried before the fallback
export const GEN_NODES = 3000     // crossing checks allowed per top-row word
export const GEN_SCRAMBLES = 300  // scrambles tried per fill
// Misplaced tiles in a fresh scramble: 14–17, so 4–7 tiles start green.
export const MISPLACED_MIN = 14, MISPLACED_SPAN = 4
// No word may start with more than this many green tiles.
export const MAX_START_GREENS = 3

export const isActive = i => {
  const r = Math.floor(i / SIZE), c = i % SIZE
  return r % 2 === 0 || c % 2 === 0
}
export const ACTIVE = Array.from({ length: SIZE * SIZE }, (_, i) => i).filter(isActive)
// Word slots: across rows 0, 2, 4, then down columns 0, 2, 4.
export const WORD_CELLS = [
  [0, 1, 2, 3, 4], [10, 11, 12, 13, 14], [20, 21, 22, 23, 24],
  [0, 5, 10, 15, 20], [2, 7, 12, 17, 22], [4, 9, 14, 19, 24],
]
// The slots each cell sits in; the nine crossing cells sit in two.
export const CELL_WORDS = Array.from({ length: SIZE * SIZE }, (_, i) =>
  WORD_CELLS.flatMap((cells, w) => (cells.includes(i) ? [w] : [])))

// The launch-day puzzle (2026-10-17), pasted from `check-weave.mjs --dump`.
// It pins the engine (snapshot test) and is the last-resort fallback.
export const FALLBACK = {
  solution: 'ABBOTL.U.WOUNCEF.N.ETRYST',
  start: 'BTBSAL.U.WEFTORO.N.UTYECN',
}

export function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function dateSeed(dateStr) {
  return parseInt(dateStr.replace(/-/g, ''))
}

// A bijective 32-bit hash of the date seed (xor, xorshift and odd multiplies
// are all invertible), so distinct dates never share a seed while nearby
// dates still get unrelated streams.
export function mixSeed(seed) {
  let h = (seed ^ 0x5BD1E995) | 0
  h = Math.imul(h ^ (h >>> 16), 0x85EBCA6B)
  h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35)
  return (h ^ (h >>> 16)) | 0
}

function shuffled(arr, rng) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)]

let INDEX = null
// Answers by first letter, and by the letters at positions 0+2 and 0+2+4 —
// exactly the crossing letters of an across word. `bias` holds the
// usage-balancing acceptance odds described above findFill.
function answerIndex() {
  if (INDEX) return INDEX
  const byFirst = new Map(), byPair = new Map(), byTriple = new Map()
  const add = (map, key, w) => { const list = map.get(key); if (list) list.push(w); else map.set(key, [w]) }
  const freq = [0, 2, 4].map(() => ({}))
  for (const w of ANSWERS) {
    add(byFirst, w[0], w)
    add(byPair, w[0] + w[2], w)
    add(byTriple, w[0] + w[2] + w[4], w)
    ;[0, 2, 4].forEach((p, k) => { freq[k][w[p]] = (freq[k][w[p]] ?? 0) + 1 })
  }
  // odds(to, from)(L): how often L sits at position `to` relative to `from`,
  // capped at 1. Positions are 0, 2, 4 → freq rows 0, 1, 2.
  const odds = (to, from) => (L) => Math.min(1, (freq[to][L] ?? 0) / (freq[from][L] ?? 1))
  const start2 = odds(0, 1), start4 = odds(0, 2), mid4 = odds(1, 2), end2 = odds(2, 1)
  const bias = {
    top: w => start2(w[2]) * start4(w[4]),
    down0: w => start2(w[2]) * start4(w[4]),
    down2: w => mid4(w[4]),
    down4: w => end2(w[2]),
  }
  INDEX = { byFirst, byPair, byTriple, bias }
  return INDEX
}

// The three down words fix every crossing letter, so the middle and bottom
// across words are any unused answers with the right letters at 0, 2 and 4.
// A pattern with few answers is taken only that share of the time
// (ACROSS_CHOICE), so a lone completion like Y?E?D → YIELD is not used
// every time the search lands on it.
export const ACROSS_CHOICE = 4
function pickAcross(key, used, banned, rng) {
  const options = (answerIndex().byTriple.get(key) ?? []).filter(w => !used.includes(w) && !banned.has(w))
  if (!options.length || rng() >= options.length / ACROSS_CHOICE) return null
  return pick(options, rng)
}

// One fill attempt seeded by a random top word: down words through its
// letters 0, 2, 4, then the two lower across words. Bounded by GEN_NODES.
//
// Usage balancing: where a word's letter feeds another word's start (a top
// word's last letter starts the right-hand down word, say), letters that end
// many answers but start few — Y, E — would force the same handful of
// Y-/E-words over and over. Each candidate is kept with odds equal to how
// common its crossing letters are at the positions they feed, which spreads
// usage across the whole bank. `banned` words (used earlier in the block)
// are never chosen.
function findFill(rng, banned) {
  const { byFirst, byPair, bias } = answerIndex()
  let top = pick(ANSWERS, rng)
  for (let t = 0; t < GEN_NODES && (banned.has(top) || rng() >= bias.top(top)); t++) top = pick(ANSWERS, rng)
  if (banned.has(top)) return null
  const keep = (list, odds) => shuffled(list ?? [], rng).filter(w => !banned.has(w) && rng() < odds(w))
  const d0s = keep(byFirst.get(top[0]), bias.down0)
  const d2s = keep(byFirst.get(top[2]), bias.down2)
  const d4s = keep(byFirst.get(top[4]), bias.down4)
  let nodes = 0
  for (const d0 of d0s) {
    if (d0 === top) continue
    for (const d2 of d2s) {
      if (++nodes > GEN_NODES) return null
      if (d2 === top || d2 === d0) continue
      if (!byPair.has(d0[2] + d2[2]) || !byPair.has(d0[4] + d2[4])) continue
      for (const d4 of d4s) {
        if (++nodes > GEN_NODES) return null
        if (d4 === top || d4 === d0 || d4 === d2) continue
        const used = [top, d0, d2, d4]
        const mid = pickAcross(d0[2] + d2[2] + d4[2], used, banned, rng)
        if (!mid) continue
        const bottom = pickAcross(d0[4] + d2[4] + d4[4], [...used, mid], banned, rng)
        if (!bottom) continue
        return boardFromWords([top, mid, bottom, d0, d2, d4])
      }
    }
  }
  return null
}

// words: [across0, across2, across4, down0, down2, down4].
export function boardFromWords(words) {
  const cells = Array(SIZE * SIZE).fill(HOLE)
  WORD_CELLS.forEach((slot, w) => slot.forEach((i, k) => { cells[i] = words[w][k] }))
  return cells.join('')
}

export function wordsOf(board) {
  return WORD_CELLS.map(slot => slot.map(i => board[i]).join(''))
}

// Minimum swaps to turn `from` into `to` (equal-length letter arrays, same
// multiset). Duplicate letters make this more than permutation cycles: build
// a letter graph with one edge per mismatched slot (shown letter → needed
// letter); n mismatches decomposed into k cycles cost n − k swaps, so the
// answer is n − (most cycles any decomposition achieves).
export function minSwapsBetween(from, to) {
  const g = {}
  let n = 0
  for (let i = 0; i < from.length; i++) {
    if (from[i] === to[i]) continue
    const k = from[i] + to[i]
    g[k] = (g[k] ?? 0) + 1
    n++
  }
  return n - maxCycles(g, n)
}

// Exact maximum edge-disjoint cycle decomposition of a small Eulerian letter
// multigraph, memoised on the remaining edge counts. Some cycle in every
// decomposition leaves the smallest node, so branching over the simple cycles
// through it is complete; with no self-loops every cycle has ≥ 2 edges.
function maxCycles(g, edges) {
  const memo = new Map()
  const rec = (left) => {
    const keys = Object.keys(g).filter(k => g[k] > 0).sort()
    if (!keys.length) return 0
    const memoKey = keys.map(k => k + g[k]).join(',')
    const hit = memo.get(memoKey)
    if (hit !== undefined) return hit
    const cap = Math.floor(left / 2)
    const start = keys[0][0]
    const onPath = new Set([start])
    let best = 0
    const walk = (node, len) => {
      for (const k of keys) {
        if (best === cap) return
        if (k[0] !== node || g[k] === 0) continue
        const to = k[1]
        if (to === start) {
          g[k]--
          best = Math.max(best, 1 + rec(left - len - 1))
          g[k]++
        } else if (!onPath.has(to)) {
          onPath.add(to)
          g[k]--
          walk(to, len + 1)
          g[k]++
          onPath.delete(to)
        }
      }
    }
    walk(start, 0)
    memo.set(memoKey, best)
    return best
  }
  return rec(edges)
}

export function minSwaps(board, solution) {
  return minSwapsBetween(ACTIVE.map(i => board[i]), ACTIVE.map(i => solution[i]))
}

const greensIn = (board, solution, slot) => slot.filter(i => board[i] === solution[i]).length

// Rotates m tiles round m − PAR random cycles, which is exactly PAR swaps if
// every letter were distinct. Duplicates can open shortcuts, so a scramble is
// accepted only when the duplicate-aware minimum is still PAR, no tile lands
// back on its own letter by accident, and no word starts with more than
// MAX_START_GREENS green.
function scramble(solution, rng) {
  for (let t = 0; t < GEN_SCRAMBLES; t++) {
    const misplaced = MISPLACED_MIN + Math.floor(rng() * MISPLACED_SPAN)
    const cycles = misplaced - PAR
    const lens = Array(cycles).fill(2)
    for (let extra = misplaced - 2 * cycles; extra > 0; extra--) lens[Math.floor(rng() * cycles)]++
    const order = shuffled(ACTIVE, rng)
    const cells = solution.split('')
    let p = 0
    for (const len of lens) {
      const cyc = order.slice(p, p + len)
      p += len
      cyc.forEach((cell, j) => { cells[cell] = solution[cyc[(j + 1) % len]] })
    }
    const start = cells.join('')
    if (ACTIVE.filter(i => start[i] !== solution[i]).length !== misplaced) continue
    if (WORD_CELLS.some(slot => greensIn(start, solution, slot) > MAX_START_GREENS)) continue
    if (minSwaps(start, solution) !== PAR) continue
    return start
  }
  return null
}

function generateDay(dateStr, banned) {
  const rng = mulberry32(mixSeed(dateSeed(dateStr)))
  for (let fill = 0; fill < GEN_FILLS; fill++) {
    const solution = findFill(rng, banned)
    if (!solution) continue
    const start = scramble(solution, rng)
    if (start) return { solution, start, words: wordsOf(solution), meta: { fill, fallback: false } }
  }
  return null
}

// No word repeats within a block: days are tiled into BLOCK_DAYS-day blocks
// from BLOCK_EPOCH, and each day bans every word used earlier in its block.
// A day therefore depends on the days before it in the block, so a block is
// generated in order once and cached (≤ BLOCK_DAYS fills, a few ms).
export const BLOCK_EPOCH = '2025-01-01'
export const BLOCK_DAYS = 128
const DAY_MS = 86400000
const dayNumber = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / DAY_MS
}
const dateOf = (n) => new Date(n * DAY_MS).toISOString().slice(0, 10)
const BLOCKS = new Map()

// The returned object is shared — treat it as read-only. Never throws once
// FALLBACK is filled; opts are for tests and the checker.
export function generatePuzzle(dateStr, opts = {}) {
  const { noFallback = false } = opts
  const n = dayNumber(dateStr)
  const epoch = dayNumber(BLOCK_EPOCH)
  const b = Math.floor((n - epoch) / BLOCK_DAYS)
  const first = epoch + b * BLOCK_DAYS
  let block = BLOCKS.get(b)
  if (!block) { block = { days: [], banned: new Set() }; BLOCKS.set(b, block) }
  while (block.days.length <= n - first) {
    const p = generateDay(dateOf(first + block.days.length), block.banned)
    if (p) p.words.forEach(w => block.banned.add(w))
    block.days.push(p)
  }
  const p = block.days[n - first]
  if (p || noFallback) return p
  return { ...FALLBACK, words: wordsOf(FALLBACK.solution), meta: { fill: -1, fallback: true } }
}

// Per-cell colour (null in holes). Green: right letter. Yellow: the letter is
// still missing from this tile's row or column word. Each yellow accounts for
// one missing letter, so duplicates only light up as often as they are
// needed. A word's missing letters go first to tiles that sit only in that
// word, then to the crossing tiles in reading order, across word first.
export function colours(board, solution) {
  const out = Array(SIZE * SIZE).fill(null)
  const need = WORD_CELLS.map(slot => {
    const m = {}
    for (const i of slot) if (board[i] !== solution[i]) m[solution[i]] = (m[solution[i]] ?? 0) + 1
    return m
  })
  const claim = (i) => {
    for (const w of CELL_WORDS[i]) {
      if (need[w][board[i]] > 0) { need[w][board[i]]--; return true }
    }
    return false
  }
  const loose = []
  for (const i of ACTIVE) {
    if (board[i] === solution[i]) out[i] = GREEN
    else if (CELL_WORDS[i].length === 1) out[i] = claim(i) ? YELLOW : GREY
    else loose.push(i)
  }
  for (const i of loose) out[i] = claim(i) ? YELLOW : GREY
  return out
}

export function swap(board, a, b) {
  const cells = board.split('')
  ;[cells[a], cells[b]] = [cells[b], cells[a]]
  return cells.join('')
}

export const isSolved = (board, solution) => board === solution

// Five emoji rows for the share text: holes ⬛, tiles by their final colour.
export function shareGrid(board, solution, hc = false) {
  const col = colours(board, solution)
  const icon = hc
    ? { [GREEN]: '🟧', [YELLOW]: '🟦', [GREY]: '⬜' }
    : { [GREEN]: '🟩', [YELLOW]: '🟨', [GREY]: '⬜' }
  const rows = []
  for (let r = 0; r < SIZE; r++) {
    let s = ''
    for (let c = 0; c < SIZE; c++) s += col[r * SIZE + c] ? icon[col[r * SIZE + c]] : '⬛'
    rows.push(s)
  }
  return rows
}
