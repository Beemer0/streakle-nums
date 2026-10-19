// Validates the Scramble word banks and replays the generator over a date
// window: every day must lay out six distinct bank words of LENGTHS as a
// legal Scrabble-style board (each later word crosses an earlier one, every
// run of two or more letters is exactly one of the words, within MAX_ROWS ×
// MAX_COLS), give each rung a rack that is its free letters out of order,
// reuse no word from earlier in its BLOCK_DAYS-day block, and differ from
// every other day. Imports the engine directly — nothing to keep in sync.
//
//   node scripts/check-scramble.mjs                      # 2025-01-01, 2191 days (→ 2030-12-31)
//   node scripts/check-scramble.mjs --from 2026-10-01 --days 30
//   node scripts/check-scramble.mjs --dump 2026-10-18    # prints the board + the FALLBACK literal
import { readFileSync } from 'node:fs'
import { WORDS } from '../src/scramble/words.js'
import {
  LENGTHS, RUNGS, MAX_ROWS, MAX_COLS, ACROSS, BLOCK_EPOCH, BLOCK_DAYS, FALLBACK,
  generatePuzzle, cellsOf, freePositions, boardCells, cellKey,
} from '../src/scramble/engine.js'

const args = process.argv.slice(2)
const opt = (name, dflt) => { const i = args.indexOf(name); return i === -1 ? dflt : args[i + 1] }
const FROM = opt('--from', '2025-01-01')
const DAYS = parseInt(opt('--days', '2191'), 10)
const DUMP = opt('--dump', null)
// Per-day cost once its block is warm, and the cold cost of the window's first
// day (which also generates the earlier days of its block, as a cold page
// load does mid-block).
const MAX_MS = 60
const COLD_MAX_MS = 250

function* dates(from, days) {
  const [y, m, d] = from.split('-').map(Number)
  const cur = new Date(y, m - 1, d)
  for (let k = 0; k < days; k++) {
    yield cur.toLocaleDateString('en-CA')
    cur.setDate(cur.getDate() + 1)
  }
}

const picture = (p) => {
  const cells = boardCells(p)
  return Array.from({ length: p.rows }, (_, r) =>
    Array.from({ length: p.cols }, (_, c) => cells.get(cellKey(r, c))?.ch ?? '.').join(' '))
}

if (DUMP) {
  const p = generatePuzzle(DUMP, { noFallback: true })
  if (!p) { console.log(`${DUMP}: NO BOARD (fallback needed)`); process.exit(1) }
  console.log(`${DUMP} — ${p.words.join(' ')} · ${p.rows}×${p.cols} · racks ${p.racks.join(' ')} (attempt ${p.meta.attempt})\n`)
  picture(p).forEach(row => console.log(' ' + row))
  const ps = p.placements.map(q => `    { word: '${q.word}', row: ${q.row}, col: ${q.col}, dir: '${q.dir}' },`).join('\n')
  console.log(`\nexport const FALLBACK = {\n  placements: [\n${ps}\n  ],\n  racks: [${p.racks.map(r => `'${r}'`).join(', ')}],\n}`)
  process.exit(0)
}

// ── The banks ──
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
// The 5-letter bank is also spell-checked against the site's own dictionary.
// (Not anagram-checked: validWords.txt carries Wordle-only oddities like
// FRATE; ENABLE is the authority for "no second word", checked at authoring.)
for (const w of WORDS[5]) {
  if (!valid5.has(w)) { bankBad++; console.log(`WORDS[5] ${w}: not in validWords.txt`) }
}
const LEN_KEYS = Object.keys(WORDS).map(Number)
if (!LENGTHS.every(n => LEN_KEYS.includes(n))) { bankBad++; console.log('a LENGTHS entry has no bank') }

// Independent verification of one board (does not trust the engine's fit).
function verify(p) {
  if (!p) return ['null (fallback needed)']
  const errs = []
  if (p.placements.length !== RUNGS) return [`${p.placements.length} words`]
  p.placements.forEach((q, i) => {
    if (q.word.length !== LENGTHS[i]) errs.push(`rung ${i} has ${q.word.length} letters`)
    if (!bankSet.has(q.word)) errs.push(`${q.word} not in the bank`)
  })
  if (new Set(p.words).size !== RUNGS) errs.push('repeated word')
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
  if (runs.length !== RUNGS) errs.push(`${runs.length} letter runs for ${RUNGS} words`)
  // Each later rung crosses an earlier one; racks are the free letters, shuffled.
  for (let i = 0; i < RUNGS; i++) {
    const free = freePositions(p.placements, i)
    if (i > 0 && free.length === LENGTHS[i]) errs.push(`rung ${i} crosses no earlier word`)
    const letters = free.map(k => p.words[i][k])
    if (sig(p.racks[i]) !== sig(letters.join(''))) errs.push(`rack ${i} is not its free letters`)
    if (p.racks[i] === letters.join('') && new Set(letters).size > 1) errs.push(`rack ${i} is in answer order`)
  }
  return errs
}

const fbErrs = FALLBACK.placements.length ? verify(generatePuzzleShape(FALLBACK)) : ['FALLBACK is empty']
if (fbErrs.length) console.log(`FALLBACK: ${fbErrs.join('; ')}`)

function generatePuzzleShape(fb) {
  let rows = 0, cols = 0
  fb.placements.forEach(q => cellsOf(q).forEach(([r, c]) => { rows = Math.max(rows, r + 1); cols = Math.max(cols, c + 1) }))
  return { ...fb, words: fb.placements.map(q => q.word), rows, cols }
}

const utcDay = (d) => { const [y, m, dd] = d.split('-').map(Number); return Date.UTC(y, m - 1, dd) / 86400000 }
const blockOf = (d) => Math.floor((utcDay(d) - utcDay(BLOCK_EPOCH)) / BLOCK_DAYS)

const t0 = performance.now()
const seen = new Set()
const blockWords = new Map()
const uses = new Map()
const times = [], shapes = new Map(), given = []
let coldMs = null
let bad = 0, day = 0, attemptsMax = 0
for (const dateStr of dates(FROM, DAYS)) {
  const a = performance.now()
  const p = generatePuzzle(dateStr, { noFallback: true })
  const took = performance.now() - a
  if (coldMs === null) coldMs = took
  else times.push(took)
  const errs = verify(p)
  if (p) {
    const id = p.placements.map(q => `${q.word}${q.row},${q.col}${q.dir[0]}`).join('|')
    if (seen.has(id)) errs.push('duplicate of an earlier board')
    seen.add(id)
    const b = blockOf(dateStr)
    if (!blockWords.has(b)) blockWords.set(b, new Set())
    const inBlock = blockWords.get(b)
    p.words.forEach(w => { if (inBlock.has(w)) errs.push(`${w} already used in this block`); inBlock.add(w) })
  }
  if (errs.length) { bad++; console.log(`${dateStr}: ${errs.join('; ')}`); day++; continue }
  attemptsMax = Math.max(attemptsMax, p.meta.attempt)
  p.words.forEach(w => { const l = uses.get(w); if (l) l.push(day); else uses.set(w, [day]) })
  const shape = `${p.rows}×${p.cols}`
  shapes.set(shape, (shapes.get(shape) ?? 0) + 1)
  for (let i = 1; i < RUNGS; i++) given.push(LENGTHS[i] - freePositions(p.placements, i).length)
  day++
}
const elapsed = (performance.now() - t0) / 1000

let minGap = Infinity, maxUses = 0, weekRepeats = 0
for (const ds of uses.values()) {
  maxUses = Math.max(maxUses, ds.length)
  for (let k = 1; k < ds.length; k++) {
    minGap = Math.min(minGap, ds[k] - ds[k - 1])
    if (ds[k] - ds[k - 1] <= 7) weekRepeats++
  }
}
const ms = times.slice().sort((x, y) => x - y)
const mean = ms.length ? ms.reduce((x, y) => x + y, 0) / ms.length : 0
const max = ms.length ? ms[ms.length - 1] : 0
const slow = max > MAX_MS || coldMs > COLD_MAX_MS
const bankSize = Object.values(WORDS).reduce((n, l) => n + l.length, 0)
const avgGiven = given.reduce((x, y) => x + y, 0) / Math.max(1, given.length)

console.log(`\n${bankSize} words (${Object.entries(WORDS).map(([k, l]) => `${k}:${l.length}`).join(' ')}), ${bankBad} bank problems`)
console.log(`${DAYS} days from ${FROM}  ${elapsed.toFixed(1)}s · ${mean.toFixed(2)}ms mean / ${(ms[Math.floor(ms.length * 0.99)] ?? 0).toFixed(2)} p99 / ${max.toFixed(2)} max warm · ${coldMs.toFixed(1)}ms cold start · layout attempts max ${attemptsMax + 1}`)
console.log(`words used ${uses.size}/${bankSize} · most uses of one word ${maxUses} · shortest gap between repeats ${minGap === Infinity ? '—' : minGap + ' days'} · repeats within a week ${weekRepeats} (block edges only)`)
console.log(`letters given per later rung ${avgGiven.toFixed(2)} avg · board shapes: ${[...shapes].sort((x, y) => y[1] - x[1]).slice(0, 8).map(([s, n]) => `${s}:${n}`).join(' ')}`)
console.log(`\n${bad} bad days, ${fbErrs.length ? 'bad' : 'good'} fallback${slow ? `, too slow (warm max ${max.toFixed(0)}ms / ${MAX_MS}, cold ${coldMs.toFixed(0)}ms / ${COLD_MAX_MS})` : ''}`)
process.exit(bad > 0 || bankBad > 0 || fbErrs.length > 0 || slow ? 1 : 0)
