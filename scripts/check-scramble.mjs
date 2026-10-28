// Validates the Scramble word bank and replays the generator over a date
// window: every day must be a 7-letter root (its pool, shuffled) plus shorter
// bank words spellable from those letters, laid out as a legal Scrabble-style
// board (connected, every run of two or more letters is exactly one of the
// words, within MAX_ROWS × MAX_COLS) with at least MIN_LONG_WORDS shorter
// words of 5+ letters, and no day may need the fallback. Before
// SCRAMBLE_CUTOVER (frozen; schedule.test.js pins the served boards) no root
// repeats within its ROOT_BLOCK_DAYS block and no shorter word within its
// WORD_BLOCK_DAYS stretch. From the cutover no root comes back within
// ROOT_GAP days (across the cutover too), no shorter word within
// WORD_BLOCK_DAYS days of its group block, no board (a root and its shorter
// words, whatever the shuffle and layout) repeats one served before the
// cutover, and none comes back within its epoch or sooner than the colour
// cycle allows. Imports the engine directly — nothing to keep in sync.
//
//   node scripts/check-scramble.mjs                      # 2025-01-01, 2191 days (→ 2030-12-31)
//   node scripts/check-scramble.mjs --days 4017          # → 2035-12-31, past the first epoch
//   node scripts/check-scramble.mjs --from 2026-10-01 --days 30
//   node scripts/check-scramble.mjs --dump 2026-10-18    # prints the board + the FALLBACK literal
//   --no-timing: report the warm max without failing on it and skip the cold
//   loads, which only measure time (the deploy gate)
import { readFileSync } from 'node:fs'
import { WORDS } from '../src/scramble/words.js'
import {
  POOL_SIZE, BOARD_WORDS, MIN_LEN, MAX_ROWS, MAX_COLS, ACROSS, MIN_LONG_WORDS,
  BLOCK_EPOCH, ROOT_BLOCK_DAYS, WORD_BLOCK_DAYS, FALLBACK,
  SCRAMBLE_CUTOVER, GROUP_BLOCK_DAYS, ROOT_GAP, EPOCH_DAYS, SERVED_BOARDS,
  generatePuzzle, cellsOf, boardCells, cellKey, spellable,
} from '../src/scramble/engine.js'
import { NO_TIMING, dateArg, daysArg, readArgs } from './cli.mjs'

const { values: args } = readArgs({
  from: { type: 'string', default: '2025-01-01' },
  days: { type: 'string', default: '2191' },
  dump: { type: 'string' },
  ...NO_TIMING,
})
const FROM = dateArg(args.from, '--from')
const DAYS = daysArg(args.days)
const DUMP = args.dump && dateArg(args.dump, '--dump')
const TIMING = !args['no-timing']
// Per-day cost once its block is warm, and the worst cold page load: the
// last day of a block in a fresh engine instance, which first generates every
// earlier day of its block. That work is deterministic and machine noise only
// adds to it, so each sampled day keeps the best of COLD_TRIES instances.
const MAX_MS = 60
const COLD_MAX_MS = 120
const COLD_TRIES = 3

function* dates(from, days) {
  const [y, m, d] = from.split('-').map(Number)
  const cur = new Date(y, m - 1, d)
  for (let k = 0; k < days; k++) {
    yield cur.toLocaleDateString('en-CA')
    cur.setDate(cur.getDate() + 1)
  }
}

const utcDay = (d) => { const [y, m, dd] = d.split('-').map(Number); return Date.UTC(y, m - 1, dd) / 86400000 }
const dateOf = (n) => new Date(n * 86400000).toISOString().slice(0, 10)

const picture = (p) => {
  const cells = boardCells(p)
  return Array.from({ length: p.rows }, (_, r) =>
    Array.from({ length: p.cols }, (_, c) => cells.get(cellKey(r, c))?.ch ?? '.').join(' '))
}

if (DUMP) {
  const p = generatePuzzle(DUMP, { noFallback: true })
  if (!p) { console.log(`${DUMP}: NO BOARD (fallback needed)`); process.exit(1) }
  console.log(`${DUMP} — letters ${p.pool} · ${p.words.join(' ')} · ${p.rows}×${p.cols}\n`)
  picture(p).forEach(row => console.log(' ' + row))
  const ps = p.placements.map(q => `    { word: '${q.word}', row: ${q.row}, col: ${q.col}, dir: '${q.dir}' },`).join('\n')
  console.log(`\nexport const FALLBACK = {\n  pool: '${p.pool}',\n  placements: [\n${ps}\n  ],\n}`)
  process.exit(0)
}

// ── The bank ──
const valid5 = new Set(readFileSync(new URL('../src/validWords.txt', import.meta.url), 'utf8').split(/\s+/).filter(Boolean).map(w => w.toUpperCase()))
const sig = w => [...w].sort().join('')
let bankBad = 0
const bankSet = new Set()
for (const [len, list] of Object.entries(WORDS)) {
  const seenSig = new Map()
  list.forEach((w, i) => {
    const errs = []
    if (!new RegExp(`^[A-Z]{${len}}$`).test(w)) errs.push(`not ${len} uppercase letters`)
    if (bankSet.has(w)) errs.push('duplicate')
    if (i > 0 && list[i - 1] >= w) errs.push('out of alphabetical order')
    if (seenSig.has(sig(w))) errs.push(`anagram of ${seenSig.get(sig(w))}`)
    seenSig.set(sig(w), w)
    bankSet.add(w)
    if (errs.length) { bankBad++; console.log(`WORDS[${len}] ${w}: ${errs.join(' | ')}`) }
  })
}
for (const w of WORDS[5]) if (!valid5.has(w)) { bankBad++; console.log(`WORDS[5] ${w}: not in validWords.txt`) }
for (let len = MIN_LEN; len <= POOL_SIZE; len++) {
  if (!WORDS[len]?.length) { bankBad++; console.log(`no WORDS[${len}]`) }
}

// Independent verification of one board (does not trust the engine's fit).
function verify(p) {
  if (!p) return ['null (fallback needed)']
  const errs = []
  if (p.placements.length !== BOARD_WORDS) return [`${p.placements.length} words`]
  const root = p.placements[0].word
  if (p.placements.some((q, i) => p.words[i] !== q.word) || p.root !== root) errs.push('words/root out of step with placements')
  if (root.length !== POOL_SIZE) errs.push(`root ${root} is not ${POOL_SIZE} letters`)
  if (sig(p.pool) !== sig(root)) errs.push(`pool ${p.pool} is not the root's letters`)
  if (p.pool === root) errs.push('pool spells the root')
  p.placements.forEach(q => {
    if (!bankSet.has(q.word)) errs.push(`${q.word} not in the bank`)
    if (q.word.length < MIN_LEN) errs.push(`${q.word} too short`)
    if (!spellable(q.word, p.pool)) errs.push(`${q.word} not spellable from ${p.pool}`)
  })
  if (p.placements.slice(1).some(q => q.word.length >= POOL_SIZE)) errs.push('a second 7-letter word')
  if (p.placements.slice(1).filter(q => q.word.length >= 5).length < MIN_LONG_WORDS) errs.push('too few 5+ letter words')
  if (new Set(p.words).size !== BOARD_WORDS) errs.push('repeated word')
  // Rebuild the letter grid; overlapping letters must agree.
  const grid = new Map()
  let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity
  p.placements.forEach(q => cellsOf(q).forEach(([r, c], k) => {
    const prev = grid.get(cellKey(r, c))
    if (prev && prev !== q.word[k]) errs.push(`clash at ${r},${c}`)
    grid.set(cellKey(r, c), q.word[k])
    minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c)
  }))
  if (minR !== 0 || minC !== 0) errs.push('board not anchored at 0,0')
  if (maxR + 1 !== p.rows || maxC + 1 !== p.cols) errs.push('rows/cols wrong')
  if (p.rows > MAX_ROWS || p.cols > MAX_COLS) errs.push(`board ${p.rows}×${p.cols} too big`)
  // Every run of 2+ letters, across and down, must be exactly one placed word.
  const words = new Set(p.placements.map(q => `${q.dir}:${q.row},${q.col}:${q.word}`))
  const runs = []
  for (const dir of [ACROSS, 'down']) {
    const [dr, dc] = dir === ACROSS ? [0, 1] : [1, 0]
    for (const k of grid.keys()) {
      const [r, c] = k.split(',').map(Number)
      if (grid.has(cellKey(r - dr, c - dc))) continue // not a run start
      let s = '', rr = r, cc = c
      while (grid.has(cellKey(rr, cc))) { s += grid.get(cellKey(rr, cc)); rr += dr; cc += dc }
      if (s.length >= 2) runs.push(`${dir}:${r},${c}:${s}`)
    }
  }
  runs.forEach(run => { if (!words.has(run)) errs.push(`stray run ${run}`) })
  if (runs.length !== BOARD_WORDS) errs.push(`${runs.length} letter runs for ${BOARD_WORDS} words`)
  // Connected: every cell reachable from the first through neighbouring cells.
  const start = [...grid.keys()][0]
  const seen = new Set([start]), stack = [start]
  while (stack.length) {
    const [r, c] = stack.pop().split(',').map(Number)
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const k = cellKey(r + dr, c + dc)
      if (grid.has(k) && !seen.has(k)) { seen.add(k); stack.push(k) }
    }
  }
  if (seen.size !== grid.size) errs.push('board is not connected')
  return errs
}

function shapeOf(fb) {
  let rows = 0, cols = 0
  fb.placements.forEach(q => cellsOf(q).forEach(([r, c]) => { rows = Math.max(rows, r + 1); cols = Math.max(cols, c + 1) }))
  return { ...fb, root: fb.placements[0]?.word, words: fb.placements.map(q => q.word), rows, cols }
}
const fbErrs = FALLBACK.placements.length ? verify(shapeOf(FALLBACK)) : ['FALLBACK is empty']
if (fbErrs.length) console.log(`FALLBACK: ${fbErrs.join('; ')}`)

const cut = utcDay(SCRAMBLE_CUTOVER), epoch0 = utcDay(BLOCK_EPOCH)
const groupBlock = (n) => Math.floor((n - cut) / GROUP_BLOCK_DAYS)
const epochOf = (n) => Math.floor((n - cut) / EPOCH_DAYS)
// From the cutover a board may only come back in a later epoch, in its root's
// group block RESIDUES cycles on — so at least this many days later.
const MIN_RETURN = EPOCH_DAYS - GROUP_BLOCK_DAYS + 1
// A board: its root and shorter words, whatever the shuffle and layout.
const boardOf = (p) => `${p.root}|${p.words.slice(1).sort().join(',')}`
// The boards served before the cutover (from launch; SERVED_BOARDS has one
// per day, and schedule.test.js pins them), replayed here.
const served = new Map()
for (let n = cut - SERVED_BOARDS.length; n < cut; n++) served.set(boardOf(generatePuzzle(dateOf(n))), dateOf(n))
// Repeats and gaps, kept apart for the frozen days and the days from the cutover.
const era = () => ({ rootGap: Infinity, wordGap: Infinity, wordsWithin: 0, repeats: 0, closest: Infinity, boards: new Map() })
const before = era(), after = era()

const t0 = performance.now()
const lastRoot = new Map(), lastWord = new Map()
const rootsInBlock = new Map(), wordsInStretch = new Map()
const rootUses = new Map(), wordUses = new Map()
const times = [], shapes = new Map(), mixes = new Map()
let bad = 0, day = 0, crossGap = Infinity
for (const dateStr of dates(FROM, DAYS)) {
  const n = utcDay(dateStr), post = n >= cut, e = post ? after : before
  const a = performance.now()
  const p = generatePuzzle(dateStr, { noFallback: true })
  times.push(performance.now() - a)
  const errs = verify(p)
  if (p) {
    const id = boardOf(p)
    if (e.boards.has(id)) {
      const prev = e.boards.get(id), gap = n - prev
      e.repeats++
      e.closest = Math.min(e.closest, gap)
      if (post && (epochOf(prev) === epochOf(n) || gap < MIN_RETURN)) errs.push(`same board as ${dateOf(prev)}, ${gap} days back`)
    }
    e.boards.set(id, n)
    if (post && served.has(id)) errs.push(`same board as ${served.get(id)}, served before the cutover`)
    if (lastRoot.has(p.root)) {
      const gap = n - lastRoot.get(p.root)
      e.rootGap = Math.min(e.rootGap, gap)
      if (post && lastRoot.get(p.root) < cut) crossGap = Math.min(crossGap, gap)
      if (post && gap < ROOT_GAP) errs.push(`root ${p.root} back after ${gap} days`)
    }
    lastRoot.set(p.root, n)
    p.words.slice(1).forEach(w => {
      if (lastWord.has(w)) {
        const gap = n - lastWord.get(w)
        e.wordGap = Math.min(e.wordGap, gap)
        if (gap < WORD_BLOCK_DAYS) e.wordsWithin++
        if (post && gap < WORD_BLOCK_DAYS && lastWord.get(w) >= cut && groupBlock(lastWord.get(w)) === groupBlock(n)) errs.push(`${w} back after ${gap} days in its block`)
      }
      lastWord.set(w, n)
    })
    if (!post) {
      const offset = n - epoch0
      const b = Math.floor(offset / ROOT_BLOCK_DAYS)
      const s = `${b}:${Math.floor((offset - b * ROOT_BLOCK_DAYS) / WORD_BLOCK_DAYS)}`
      if (!rootsInBlock.has(b)) rootsInBlock.set(b, new Set())
      if (!wordsInStretch.has(s)) wordsInStretch.set(s, new Set())
      if (rootsInBlock.get(b).has(p.root)) errs.push(`root ${p.root} already used in this block`)
      rootsInBlock.get(b).add(p.root)
      p.words.slice(1).forEach(w => { if (wordsInStretch.get(s).has(w)) errs.push(`${w} already used in this stretch`); wordsInStretch.get(s).add(w) })
    }
  }
  if (errs.length) { bad++; console.log(`${dateStr}: ${errs.join('; ')}`); day++; continue }
  rootUses.set(p.root, (rootUses.get(p.root) ?? 0) + 1)
  p.words.slice(1).forEach(w => { const l = wordUses.get(w); if (l) l.push(day); else wordUses.set(w, [day]) })
  const shape = `${p.rows}×${p.cols}`
  shapes.set(shape, (shapes.get(shape) ?? 0) + 1)
  const mix = p.words.slice(1).map(w => w.length).sort().join('')
  mixes.set(mix, (mixes.get(mix) ?? 0) + 1)
  day++
}
const elapsed = (performance.now() - t0) / 1000

// The worst cold load, in fresh module instances (a query string gives each
// import its own cache): the last day of a few legacy blocks, and of every
// group block in the window, each the best of COLD_TRIES instances.
const firstDay = utcDay(FROM), lastDay = firstDay + DAYS - 1
const coldDays = [1, 2, 3].map(b => epoch0 + (b + 1) * ROOT_BLOCK_DAYS - 1)
for (let b = Math.max(0, groupBlock(firstDay)); cut + b * GROUP_BLOCK_DAYS <= lastDay; b++) coldDays.push(cut + (b + 1) * GROUP_BLOCK_DAYS - 1)
let coldMs = 0, coldWorst = '', instance = 0
for (const n of TIMING ? coldDays : []) {
  let best = Infinity
  for (let t = 0; t < COLD_TRIES; t++) {
    const fresh = await import(new URL(`../src/scramble/engine.js?cold=${instance++}`, import.meta.url))
    const a = performance.now()
    fresh.generatePuzzle(dateOf(n))
    best = Math.min(best, performance.now() - a)
  }
  if (best > coldMs) { coldMs = best; coldWorst = dateOf(n) }
}

let weekRepeats = 0, maxWordUses = 0
for (const ds of wordUses.values()) {
  maxWordUses = Math.max(maxWordUses, ds.length)
  for (let k = 1; k < ds.length; k++) if (ds[k] - ds[k - 1] <= 7) weekRepeats++
}
const ms = times.slice().sort((x, y) => x - y)
const mean = ms.length ? ms.reduce((x, y) => x + y, 0) / ms.length : 0
const max = ms.length ? ms[ms.length - 1] : 0
const slow = TIMING && (max > MAX_MS || coldMs > COLD_MAX_MS)
const bankSize = Object.values(WORDS).reduce((n, l) => n + l.length, 0)
const top = (m, n) => [...m].sort((x, y) => y[1] - x[1]).slice(0, n).map(([s, k]) => `${s}:${k}`).join(' ')
const gap = (g) => (g === Infinity ? '–' : g)
const repeats = (e) => `${e.repeats} repeated boards${e.repeats ? ` (closest ${e.closest} days apart)` : ''}`

console.log(`\n${bankSize} words (${Object.entries(WORDS).map(([k, l]) => `${k}:${l.length}`).join(' ')}), ${bankBad} bank problems`)
console.log(`${DAYS} days from ${FROM}  ${elapsed.toFixed(1)}s · ${mean.toFixed(2)}ms mean / ${(ms[Math.floor(ms.length * 0.99)] ?? 0).toFixed(2)} p99 / ${max.toFixed(2)} max warm · ${TIMING ? `${coldMs.toFixed(1)}ms worst cold load (${coldWorst})` : 'cold loads skipped (--no-timing)'}`)
console.log(`roots used ${rootUses.size}/${WORDS[POOL_SIZE].length} (most uses ${Math.max(0, ...rootUses.values())}) · shorter words used ${wordUses.size} (most uses ${maxWordUses}, repeats within a week ${weekRepeats})`)
console.log(`length mixes ${top(mixes, 6)} · board shapes ${top(shapes, 6)}`)
console.log(`from the cutover (${SCRAMBLE_CUTOVER}): root gap ≥ ${gap(after.rootGap)} days (ROOT_GAP ${ROOT_GAP}; ${gap(crossGap)} across the cutover) · shorter-word gap ≥ ${gap(after.wordGap)} (${after.wordsWithin} back within ${WORD_BLOCK_DAYS} days, all across a block edge) · ${repeats(after)}; a board may only return in a later epoch (${EPOCH_DAYS} days), ${MIN_RETURN}+ days on`)
console.log(`before it (frozen): root gap ≥ ${gap(before.rootGap)} · shorter-word gap ≥ ${gap(before.wordGap)} (${before.wordsWithin} back within ${WORD_BLOCK_DAYS} days) · ${repeats(before)}`)
console.log(`\n${bad} bad days, ${fbErrs.length ? 'bad' : 'good'} fallback${slow ? `, too slow (warm max ${max.toFixed(0)}ms / ${MAX_MS}, cold ${coldMs.toFixed(0)}ms / ${COLD_MAX_MS})` : ''}`)
process.exit(bad > 0 || bankBad > 0 || fbErrs.length > 0 || slow ? 1 : 0)
