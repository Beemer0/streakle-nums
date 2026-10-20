// Scramble — the pure engine behind /scramble. No React, no DOM, no clock, no
// Math.random (dates only go through Date.UTC arithmetic): every board is a
// deterministic function of the date string, so all players get the same
// puzzle. Imported unchanged by Scramble.jsx,
// engine.test.js and scripts/check-scramble.mjs.
//
// A day is one set of POOL_SIZE letters — a scrambled 7-letter root word —
// and a Scrabble-style board of BOARD_WORDS words built from those letters:
// the root itself plus shorter words (4–6 letters) that fit inside it. Every
// word crosses the board at a shared letter and words only touch where they
// cross. Players find the words in any order; a found word's letters show up
// in the words that cross it.
//
// ANY change to the constants, the layout search, the pool shuffle, mixSeed,
// the block scheme or words.js rewrites every historical board. The FALLBACK
// snapshot test makes that deliberate.

import { WORDS } from './words.js'

export const POOL_SIZE = 7
export const BOARD_WORDS = 6
export const MIN_LEN = 4
export const HINT_SECONDS = 30     // each revealed letter adds this to the time
export const MAX_COLS = 9, MAX_ROWS = 9
export const ACROSS = 'across', DOWN = 'down'

export const GEN_ROOTS = 60        // root words tried per day before the fallback
export const GEN_LAYOUTS = 4       // board attempts per root
export const GEN_SAMPLE = 8        // fitting candidates compared per placement
// Each placement takes the spot with the most crossings among GEN_SAMPLE
// fitting candidates, then one whose board area is within this factor of
// the most compact such spot — tight, well-crossed boards, varied shapes.
export const COMPACT_SLACK = 1.2

// The launch-day board (2026-10-18), pasted from `check-scramble.mjs --dump`.
// It pins the engine (snapshot test) and is the last-resort fallback.
export const FALLBACK = {
  pool: 'INTTPAE',
  placements: [
    { word: 'PATIENT', row: 4, col: 0, dir: 'across' },
    { word: 'INEPT', row: 0, col: 6, dir: 'down' },
    { word: 'PAINT', row: 0, col: 2, dir: 'down' },
    { word: 'PINE', row: 1, col: 4, dir: 'across' },
    { word: 'PANE', row: 1, col: 4, dir: 'down' },
    { word: 'PAIN', row: 4, col: 0, dir: 'down' },
  ],
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

// A bijective 32-bit hash of the date seed, so distinct dates never share a
// seed and nearby dates get unrelated streams.
export function mixSeed(seed) {
  let h = (seed ^ 0x27D4EB2F) | 0
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

// ── Letters ──

function letterCounts(word) {
  const c = new Array(26).fill(0)
  for (let i = 0; i < word.length; i++) c[word.charCodeAt(i) - 65]++
  return c
}

// True if `word` can be spelled from `letters`, each tile used at most once.
export function spellable(word, letters) {
  const have = letterCounts(letters)
  for (let i = 0; i < word.length; i++) {
    if (--have[word.charCodeAt(i) - 65] < 0) return false
  }
  return true
}

const letterMask = (counts) => counts.reduce((m, n, i) => (n ? m | (1 << i) : m), 0)

let SHORT = null
// The 4–6 letter bank words with their letter counts and letter-set masks,
// in bank order — built once so subwords() is a cheap scan.
function shortWords() {
  if (!SHORT) {
    SHORT = []
    for (let len = MIN_LEN; len < POOL_SIZE; len++) {
      for (const w of WORDS[len]) { const counts = letterCounts(w); SHORT.push({ w, counts, mask: letterMask(counts) }) }
    }
  }
  return SHORT
}

const SUBS = new Map()
// The 4–6 letter bank words that fit inside `root`, in bank order (memoised).
// The mask test rejects any word using a letter the root lacks.
export function subwords(root) {
  let list = SUBS.get(root)
  if (!list) {
    const have = letterCounts(root)
    const mask = letterMask(have)
    list = []
    for (const e of shortWords()) {
      if ((e.mask & ~mask) !== 0) continue
      let ok = true
      for (let i = 0; i < 26 && ok; i++) ok = e.counts[i] <= have[i]
      if (ok) list.push(e.w)
    }
    SUBS.set(root, list)
  }
  return list
}

// ── Board geometry ──

const STEP = { [ACROSS]: [0, 1], [DOWN]: [1, 0] }
const OTHER = { [ACROSS]: DOWN, [DOWN]: ACROSS }
const key = (r, c) => `${r},${c}`
export { key as cellKey }

// The [row, col] of each letter of a placement.
export function cellsOf({ word, row, col, dir }) {
  const [dr, dc] = STEP[dir]
  return Array.from(word, (_, k) => [row + dr * k, col + dc * k])
}

// grid: key → { ch, across, down } (which directions already run through it).
// Returns the number of crossings, or -1 if the word cannot go there: every
// shared cell must hold the same letter and not already run this way, the
// cells just before and after must be empty, and a new letter may not sit
// beside another word's letter (that would spell a stray two-letter run).
function fit(grid, word, row, col, dir) {
  const [dr, dc] = STEP[dir]
  const [pr, pc] = [dc, dr]
  const n = word.length
  if (grid.has(key(row - dr, col - dc)) || grid.has(key(row + dr * n, col + dc * n))) return -1
  let crossings = 0
  for (let k = 0; k < n; k++) {
    const r = row + dr * k, c = col + dc * k
    const cell = grid.get(key(r, c))
    if (cell) {
      if (cell.ch !== word[k] || cell[dir]) return -1
      crossings++
    } else if (grid.has(key(r + pr, c + pc)) || grid.has(key(r - pr, c - pc))) {
      return -1
    }
  }
  return crossings
}

function place(grid, p) {
  cellsOf(p).forEach(([r, c], k) => {
    const cell = grid.get(key(r, c)) ?? { ch: p.word[k], [ACROSS]: false, [DOWN]: false }
    cell[p.dir] = true
    grid.set(key(r, c), cell)
  })
}

// A straight word's extent is just its two ends.
function box(placements) {
  let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity
  for (const p of placements) {
    const [dr, dc] = STEP[p.dir]
    const n = p.word.length - 1
    minR = Math.min(minR, p.row); maxR = Math.max(maxR, p.row + dr * n)
    minC = Math.min(minC, p.col); maxC = Math.max(maxC, p.col + dc * n)
  }
  return { minR, minC, maxR, maxC }
}

function bounds(placements) {
  const { minR, minC, maxR, maxC } = box(placements)
  return { minR, minC, rows: maxR - minR + 1, cols: maxC - minC + 1 }
}

// Every legal spot for `word` that crosses the board, with its board area.
function options(grid, placements, word) {
  const out = []
  const base = box(placements)
  for (const p of placements) {
    const dir = OTHER[p.dir]
    const [dr, dc] = STEP[dir]
    cellsOf(p).forEach(([r, c], j) => {
      for (let k = 0; k < word.length; k++) {
        if (word[k] !== p.word[j]) continue
        const spot = { word, row: r - dr * k, col: c - dc * k, dir }
        const crossings = fit(grid, word, spot.row, spot.col, dir)
        if (crossings < 1) continue
        const n = word.length - 1
        const rows = Math.max(base.maxR, spot.row + dr * n) - Math.min(base.minR, spot.row) + 1
        const cols = Math.max(base.maxC, spot.col + dc * n) - Math.min(base.minC, spot.col) + 1
        if (rows > MAX_ROWS || cols > MAX_COLS) continue
        out.push({ spot, crossings, area: rows * cols })
      }
    })
  }
  return out
}

// The most-crossing, near-most-compact spot among up to GEN_SAMPLE fitting
// candidates from `pool`, or null if none fits.
function bestSpot(grid, placements, pool, rng) {
  let all = [], fitting = 0
  for (const w of pool) {
    const opts = options(grid, placements, w)
    if (!opts.length) continue
    all = all.concat(opts)
    if (++fitting >= GEN_SAMPLE) break
  }
  if (!all.length) return null
  const most = Math.max(...all.map(o => o.crossings))
  const top = all.filter(o => o.crossings === most)
  const tightest = Math.min(...top.map(o => o.area))
  const near = top.filter(o => o.area <= tightest * COMPACT_SLACK)
  return near[Math.floor(rng() * near.length)].spot
}

// The shorter words' lengths each board aims for, in placement order. 4-letter
// words fit inside far more roots, so without a target most boards would be
// four 4s; a placement falls back to other lengths (longest first) only when
// its target length has no legal spot.
export const TARGET_LENGTHS = [6, 5, 5, 4, 4]
export const MIN_LONG_WORDS = 2  // shorter words of 5+ letters a board must have

// One board attempt for `root`: the root goes at the origin, then each word
// takes bestSpot among the unused candidates of its target length.
function layout(root, candidates, rng) {
  const grid = new Map()
  const placements = [{ word: root, row: 0, col: 0, dir: rng() < 0.5 ? ACROSS : DOWN }]
  place(grid, placements[0])
  const used = new Set([root])
  const order = shuffled(candidates, rng)
  for (const target of TARGET_LENGTHS) {
    const lengths = [target, ...[6, 5, 4].filter(n => n !== target)]
    let spot = null
    for (const len of lengths) {
      spot = bestSpot(grid, placements, order.filter(w => w.length === len && !used.has(w)), rng)
      if (spot) break
    }
    if (!spot) return null
    place(grid, spot)
    placements.push(spot)
    used.add(spot.word)
  }
  if (placements.slice(1).filter(p => p.word.length >= 5).length < MIN_LONG_WORDS) return null
  const { minR, minC } = bounds(placements)
  return placements.map(p => ({ ...p, row: p.row - minR, col: p.col - minC }))
}

// The root's letters, shuffled so they never spell the root.
function poolFor(root, rng) {
  let pool = shuffled([...root], rng).join('')
  for (let t = 0; t < 20 && pool === root; t++) pool = shuffled([...root], rng).join('')
  return pool
}

function withShape(pool, placements, meta) {
  const { rows, cols } = bounds(placements)
  return { pool, root: placements[0].word, placements, words: placements.map(p => p.word), rows, cols, meta }
}

// bannedRoots / bannedWords: roots and shorter words used recently (see
// generatePuzzle). A root needs at least BOARD_WORDS − 1 fresh words inside it.
function generateDay(dateStr, bannedRoots, bannedWords) {
  const rng = mulberry32(mixSeed(dateSeed(dateStr)))
  const roots = shuffled(WORDS[POOL_SIZE], rng).filter(w => !bannedRoots.has(w)).slice(0, GEN_ROOTS)
  for (let r = 0; r < roots.length; r++) {
    const root = roots[r]
    const candidates = subwords(root).filter(w => !bannedWords.has(w))
    if (candidates.length < BOARD_WORDS - 1) continue
    for (let attempt = 0; attempt < GEN_LAYOUTS; attempt++) {
      const placements = layout(root, candidates, rng)
      if (placements) return withShape(poolFor(root, rng), placements, { root: r, attempt, fallback: false })
    }
  }
  return null
}

// No repeats: days are tiled into ROOT_BLOCK_DAYS-day blocks from
// BLOCK_EPOCH, and no root repeats within a block. Shorter words are shared
// between many roots (RAIN fits PAINTER, TRAINED, …), so banning them for a
// whole block would starve later days; they are banned within each
// WORD_BLOCK_DAYS-day stretch of the block instead. A day depends on the
// days before it in its block, so a block is generated in order once and
// cached.
export const BLOCK_EPOCH = '2025-01-01'
export const ROOT_BLOCK_DAYS = 64
export const WORD_BLOCK_DAYS = 16
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
  const b = Math.floor((n - epoch) / ROOT_BLOCK_DAYS)
  const first = epoch + b * ROOT_BLOCK_DAYS
  let block = BLOCKS.get(b)
  if (!block) { block = { days: [], roots: new Set(), words: new Set() }; BLOCKS.set(b, block) }
  while (block.days.length <= n - first) {
    const k = block.days.length
    if (k % WORD_BLOCK_DAYS === 0) block.words = new Set()
    const p = generateDay(dateOf(first + k), block.roots, block.words)
    if (p) {
      block.roots.add(p.root)
      p.words.slice(1).forEach(w => block.words.add(w))
    }
    block.days.push(p)
  }
  const p = block.days[n - first]
  if (p || noFallback) return p
  return withShape(FALLBACK.pool, FALLBACK.placements, { root: -1, attempt: -1, fallback: true })
}

// ── Play helpers ──

// Every board cell: key → { r, c, ch, words: [indices of the words through it] }.
export function boardCells(puzzle) {
  const map = new Map()
  puzzle.placements.forEach((p, i) => {
    cellsOf(p).forEach(([r, c], k) => {
      const cell = map.get(key(r, c)) ?? { r, c, ch: p.word[k], words: [] }
      cell.words.push(i)
      map.set(key(r, c), cell)
    })
  })
  return map
}

// Cell keys showing a letter: every cell of a found word, plus hinted cells.
export function revealedCells(puzzle, found, hinted) {
  const out = new Set(hinted)
  found.forEach(i => cellsOf(puzzle.placements[i]).forEach(([r, c]) => out.add(key(r, c))))
  return out
}

// Indices of words whose every cell is revealed (found, or filled in by
// crossings and hints).
export function completedWords(puzzle, revealed) {
  return puzzle.placements.flatMap((p, i) => (cellsOf(p).every(([r, c]) => revealed.has(key(r, c))) ? [i] : []))
}

// `found` plus every word the revealed letters now complete, appended in
// board order — a word filled in by crossings and hints counts as found.
// Returns the same array when nothing new completes.
export function completeFound(puzzle, found, hinted) {
  const done = completedWords(puzzle, revealedCells(puzzle, found, hinted)).filter(i => !found.includes(i))
  return done.length ? [...found, ...done] : found
}

// The cell a hint reveals: the first hidden cell of the unfinished word with
// the fewest hidden cells (ties → shorter word, then board order), so hints
// help finish words rather than scatter letters. Null when nothing is hidden.
export function nextHint(puzzle, revealed) {
  const before = (a, b) => {
    for (let j = 0; j < a.length; j++) if (a[j] !== b[j]) return a[j] < b[j]
    return false
  }
  let best = null
  puzzle.placements.forEach((p, i) => {
    const hidden = cellsOf(p).filter(([r, c]) => !revealed.has(key(r, c)))
    if (!hidden.length) return
    const rank = [hidden.length, p.word.length, i]
    if (!best || before(rank, best.rank)) best = { rank, cell: key(hidden[0][0], hidden[0][1]) }
  })
  return best?.cell ?? null
}

// Seconds on the clock plus the hint penalty, as saved and shared.
export const scoreSeconds = (ms, hints) => Math.floor(ms / 1000) + hints * HINT_SECONDS

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60), sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

// One square per word, shortest first: 🟩 found unaided, 🟨 a hint touched
// it, ⬛ not found yet.
export function shareLine(puzzle, found, hinted) {
  const hintSet = new Set(hinted)
  return puzzle.placements
    .map((p, i) => ({ i, len: p.word.length, helped: cellsOf(p).some(([r, c]) => hintSet.has(key(r, c))) }))
    .sort((a, b) => a.len - b.len || a.i - b.i)
    .map(w => (!found.includes(w.i) ? '⬛' : w.helped ? '🟨' : '🟩'))
    .join('')
}
