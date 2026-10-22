// Audits a grid game's daily schedule by replaying its real generator (the
// pure modules the page imports — nothing here to keep in sync):
// - no day falls back to the hardcoded grid (= the criteria pool is too thin);
// - every board has a 9-distinct-answer solution;
// - from GRID_CUTOVER on, no grid repeats within REPEAT_WINDOW days — the same
//   six headers in either orientation count as a repeat — against any earlier
//   day in that window, shipped history included.
// - a page's first board at the end of the range, built cold in a fresh
//   process (the no-repeat schedule replays every day from the cutover), takes
//   under COLD_LIMIT_MS — when it doesn't, snapshot the served history.
// Run: node scripts/check-faceoff.mjs [Faceoff|Gridiron|Knockout] [--from YYYY-MM-DD] [--to YYYY-MM-DD]
import { execFileSync } from 'node:child_process'
import { GRID_CUTOVER, canFillBoard, gridKey } from '../src/grid/engine.js'
import { dateDay } from '../src/dateMath.js'

const game = process.argv[2] ?? 'Faceoff'
const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag)
  return i > 0 ? process.argv[i + 1] : fallback
}
const FROM = arg('--from', '2025-01-01')
const TO = arg('--to', '2030-12-31')
const REPEAT_WINDOW = 365
const COLD_LIMIT_MS = 300

const modules = {
  Faceoff: '../src/faceoff/puzzle.js',
  Gridiron: '../src/gridiron/puzzle.js',
  Knockout: '../src/knockout/puzzle.js',
}
if (!modules[game]) throw new Error(`unknown game ${game}`)
const puzzle = await import(modules[game])
const answers = puzzle.PLAYERS ?? puzzle.FIGHTERS
const fitsNow = puzzle.matchesHeader ?? puzzle.isValid

const seen = new Map()
for (const p of answers) seen.set(p.n, (seen.get(p.n) ?? 0) + 1)
const dupes = [...seen].filter(([, c]) => c > 1)
if (dupes.length) console.log('DUPLICATE ANSWERS:', dupes.map(([n]) => n).join(', '))

const days = []
for (let d = new Date(`${FROM}T12:00:00`); d <= new Date(`${TO}T12:00:00`); d.setDate(d.getDate() + 1)) {
  days.push(d.toLocaleDateString('en-CA'))
}
const fallbackKey = JSON.stringify(puzzle.FALLBACK_PUZZLE)

let fallbacks = 0, unsolvable = 0, repeats = 0
const lastSeen = new Map() // grid key -> last date it was served
let minGap = Infinity
for (const ds of days) {
  const grid = puzzle.getDailyPuzzle(ds)
  if (JSON.stringify(grid) === fallbackKey) { fallbacks++; console.log(`${ds}: FELL THROUGH TO FALLBACK GRID`) }
  // Checked the way the page checks answers on that date's board.
  const fits = puzzle.fitsOn(ds)
  const cells = grid.rows.flatMap(r => grid.cols.map(c => answers.filter(a => fits(a, r) && fits(a, c))))
  if (!canFillBoard(cells)) { unsolvable++; console.log(`${ds}: NO 9-DISTINCT SOLUTION (${grid.rows} x ${grid.cols})`) }
  const key = gridKey(grid.rows, grid.cols)
  const prev = lastSeen.get(key)
  if (prev && ds >= GRID_CUTOVER) {
    const gap = dateDay(ds) - dateDay(prev)
    minGap = Math.min(minGap, gap)
    if (gap <= REPEAT_WINDOW) { repeats++; console.log(`${ds}: REPEATS ${prev} (${gap} days)`) }
  }
  lastSeen.set(key, ds)
}
// The hardcoded fallback grid must itself be solvable.
const fb = puzzle.FALLBACK_PUZZLE
if (!canFillBoard(fb.rows.flatMap(r => fb.cols.map(c => answers.filter(a => fitsNow(a, r) && fitsNow(a, c)))))) {
  console.log('FALLBACK GRID: NO 9-DISTINCT SOLUTION')
  unsolvable++
}

console.log(`\n${game}: ${answers.length} answers; ${days.length} days (${FROM}..${TO}), cutover ${GRID_CUTOVER}`)
console.log(`fallback grids: ${fallbacks}, unsolvable: ${unsolvable}, repeats within ${REPEAT_WINDOW} days from the cutover: ${repeats}` +
  (minGap < Infinity ? `, closest repeat from the cutover: ${minGap} days` : ', no repeat from the cutover'))
// Cold cost of the last day's board, as a page pays it on first load.
const moduleUrl = new URL(modules[game], import.meta.url).href
const coldMs = Number(execFileSync(process.execPath, ['--input-type=module', '-e',
  `const t = performance.now(); const m = await import(${JSON.stringify(moduleUrl)}); m.getDailyPuzzle(${JSON.stringify(TO)}); console.log(Math.round(performance.now() - t))`,
], { encoding: 'utf8' }).trim())
const slow = coldMs > COLD_LIMIT_MS ? 1 : 0
console.log(`cold first board for ${TO}: ${coldMs} ms (limit ${COLD_LIMIT_MS})${slow ? ' — TOO SLOW' : ''}`)
process.exit(fallbacks + unsolvable + repeats + slow > 0 ? 1 : 0)
