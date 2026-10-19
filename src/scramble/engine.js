// Scramble — the pure engine behind /scramble. No React, no DOM, no Date, no
// Math.random: every board is a deterministic function of the date string, so
// all players get the same puzzle. Imported unchanged by Scramble.jsx,
// engine.test.js and scripts/check-scramble.mjs.
//
// A day is a ladder of six words (LENGTHS) laid out like a Scrabble board:
// every word after the first crosses at least one earlier word at a shared
// letter, and words only touch where they cross. Solving a rung locks its
// letters in, so later rungs start with some letters already placed and the
// rack holds only the rest, scrambled.
//
// ANY change to LENGTHS, the layout search, the rack shuffle, mixSeed, the
// block constants or words.js rewrites every historical board. The FALLBACK
// snapshot test makes that deliberate.

import { WORDS } from './words.js'

export const LENGTHS = [4, 5, 5, 6, 6, 7]
export const RUNGS = LENGTHS.length
export const MAX_MISTAKES = 3      // a third wrong word fails the day (play continues)
export const HINT_SECONDS = 30     // each revealed letter adds this to the time
export const MAX_COLS = 9, MAX_ROWS = 9
export const ACROSS = 'across', DOWN = 'down'

export const GEN_LAYOUTS = 40      // full-board attempts per day
export const GEN_CANDIDATES = 80   // words tried per rung before restarting
export const GEN_SAMPLE = 6        // candidates that fit, compared per rung
// Each rung takes the spot with the most crossings among GEN_SAMPLE fitting
// candidates, then one whose board area is within this factor of the most
// compact such spot — more crossings means more given letters and a tighter
// board, and the slack keeps shapes varied.
export const COMPACT_SLACK = 1.2

// The launch-day board (2026-10-18), pasted from `check-scramble.mjs --dump`.
// It pins the engine (snapshot test) and is the last-resort fallback.
export const FALLBACK = {
  placements: [
    { word: 'LOGO', row: 1, col: 4, dir: 'across' },
    { word: 'MOTIF', row: 0, col: 7, dir: 'down' },
    { word: 'WOMAN', row: 0, col: 5, dir: 'down' },
    { word: 'AGENDA', row: 3, col: 0, dir: 'across' },
    { word: 'HIGHLY', row: 1, col: 1, dir: 'down' },
    { word: 'UNKNOWN', row: 2, col: 3, dir: 'down' },
  ],
  racks: ['OOGL', 'ITFM', 'AMNW', 'GDEAN', 'HHLYI', 'KUNWON'],
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

const STEP = { [ACROSS]: [0, 1], [DOWN]: [1, 0] }
const OTHER = { [ACROSS]: DOWN, [DOWN]: ACROSS }
const key = (r, c) => `${r},${c}`

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

function bounds(placements) {
  let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity
  for (const p of placements) {
    for (const [r, c] of cellsOf(p)) {
      minR = Math.min(minR, r); maxR = Math.max(maxR, r)
      minC = Math.min(minC, c); maxC = Math.max(maxC, c)
    }
  }
  return { minR, minC, rows: maxR - minR + 1, cols: maxC - minC + 1 }
}

// Every legal spot for `word` that crosses the board, with its board area.
function options(grid, placements, word) {
  const out = []
  for (const p of placements) {
    const dir = OTHER[p.dir]
    const [dr, dc] = STEP[dir]
    cellsOf(p).forEach(([r, c], j) => {
      for (let k = 0; k < word.length; k++) {
        if (word[k] !== p.word[j]) continue
        const spot = { word, row: r - dr * k, col: c - dc * k, dir }
        const crossings = fit(grid, word, spot.row, spot.col, dir)
        if (crossings < 1) continue
        const b = bounds([...placements, spot])
        if (b.rows > MAX_ROWS || b.cols > MAX_COLS) continue
        out.push({ spot, crossings, area: b.rows * b.cols })
      }
    })
  }
  return out
}

// The most-crossing, near-most-compact spot among up to GEN_SAMPLE fitting
// candidates from `pool`, or null if none fits.
function bestSpot(grid, placements, pool, rng) {
  let all = [], fitting = 0
  for (const w of pool.slice(0, GEN_CANDIDATES)) {
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

// One board attempt: rung 0 goes at the origin, across or down; each later
// rung takes bestSpot among unbanned, unused candidates of its length.
function layout(rng, banned) {
  const grid = new Map()
  const placements = []
  const used = new Set()
  for (let i = 0; i < RUNGS; i++) {
    const pool = shuffled(WORDS[LENGTHS[i]], rng).filter(w => !banned.has(w) && !used.has(w))
    if (!pool.length) return null
    const chosen = i === 0
      ? { word: pool[0], row: 0, col: 0, dir: rng() < 0.5 ? ACROSS : DOWN }
      : bestSpot(grid, placements, pool, rng)
    if (!chosen) return null
    place(grid, chosen)
    placements.push(chosen)
    used.add(chosen.word)
  }
  const { minR, minC } = bounds(placements)
  return placements.map(p => ({ ...p, row: p.row - minR, col: p.col - minC }))
}

// Positions (letter indices) of rung i that no earlier rung has filled.
export function freePositions(placements, i) {
  const earlier = new Set()
  for (let j = 0; j < i; j++) cellsOf(placements[j]).forEach(([r, c]) => earlier.add(key(r, c)))
  return cellsOf(placements[i]).flatMap(([r, c], k) => (earlier.has(key(r, c)) ? [] : [k]))
}

// The rack for each rung: its free letters, shuffled so they never read in
// answer order (unless every free letter is the same).
function racksFor(placements, rng) {
  return placements.map((p, i) => {
    const letters = freePositions(placements, i).map(k => p.word[k])
    const inOrder = letters.join('')
    let rack = shuffled(letters, rng).join('')
    for (let t = 0; t < 20 && rack === inOrder && new Set(letters).size > 1; t++) rack = shuffled(letters, rng).join('')
    return rack
  })
}

function withShape(placements, racks, meta) {
  const { rows, cols } = bounds(placements)
  return { placements, racks, words: placements.map(p => p.word), rows, cols, meta }
}

function generateDay(dateStr, banned) {
  const rng = mulberry32(mixSeed(dateSeed(dateStr)))
  for (let attempt = 0; attempt < GEN_LAYOUTS; attempt++) {
    const placements = layout(rng, banned)
    if (placements) return withShape(placements, racksFor(placements, rng), { attempt, fallback: false })
  }
  return null
}

// No word repeats within a block: days are tiled into BLOCK_DAYS-day blocks
// from BLOCK_EPOCH, and each day bans every word used earlier in its block.
// A day therefore depends on the days before it in the block, so a block is
// generated in order once and cached.
export const BLOCK_EPOCH = '2025-01-01'
export const BLOCK_DAYS = 64
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
  return withShape(FALLBACK.placements, FALLBACK.racks, { attempt: -1, fallback: true })
}

// ── Play helpers ──

// Every board cell: key → { r, c, ch, rungs: [rung indices through it] }.
export function boardCells(puzzle) {
  const map = new Map()
  puzzle.placements.forEach((p, i) => {
    cellsOf(p).forEach(([r, c], k) => {
      const cell = map.get(key(r, c)) ?? { r, c, ch: p.word[k], rungs: [] }
      cell.rungs.push(i)
      map.set(key(r, c), cell)
    })
  })
  return map
}

export { key as cellKey }

// Seconds on the clock plus the hint penalty, as saved and shared.
export const scoreSeconds = (ms, hints) => Math.floor(ms / 1000) + hints * HINT_SECONDS

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60), sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

// One emoji per rung: 🟩 clean, 🟨 took a hint, 🟥 had a wrong guess, ⬛ unsolved.
export function shareLine(rungs) {
  return rungs.map(r => (!r.solved ? '⬛' : r.mistakes > 0 ? '🟥' : r.hints > 0 ? '🟨' : '🟩')).join('')
}
