// Validates the Weave answer bank and replays the generator over a date
// window: every day must fill from the bank (six distinct answers), scramble
// to exactly PAR swaps from solved, keep its holes, start with no word more
// than MAX_START_GREENS green, reuse no word from earlier in its
// BLOCK_DAYS-day block, and differ from every other day. Imports the
// engine directly — nothing to keep in sync.
//
//   node scripts/check-weave.mjs                      # 2025-01-01, 2191 days (→ 2030-12-31)
//   node scripts/check-weave.mjs --from 2026-10-01 --days 30
//   node scripts/check-weave.mjs --dump 2026-10-17    # prints the grid + the FALLBACK literal
//   --no-timing: report the max time without failing on it (the deploy gate)
import { readFileSync } from 'node:fs'
import { ANSWERS } from '../src/weave/answers.js'
import {
  ACTIVE, WORD_CELLS, HOLE, PAR, MAX_START_GREENS, MISPLACED_MIN, MISPLACED_SPAN, FALLBACK,
  BLOCK_EPOCH, BLOCK_DAYS,
  generatePuzzle, minSwaps, wordsOf, isActive,
} from '../src/weave/engine.js'
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
const MAX_MS = 50

function* dates(from, days) {
  const [y, m, d] = from.split('-').map(Number)
  const cur = new Date(y, m - 1, d)
  for (let k = 0; k < days; k++) {
    yield cur.toLocaleDateString('en-CA')
    cur.setDate(cur.getDate() + 1)
  }
}

const grid = (board) => Array.from({ length: 5 }, (_, r) => board.slice(r * 5, r * 5 + 5).split('').join(' '))

if (DUMP) {
  const p = generatePuzzle(DUMP, { noFallback: true })
  if (!p) { console.log(`${DUMP}: NO PUZZLE (fallback needed)`); process.exit(1) }
  console.log(`${DUMP} — ${p.words.join(' ')} (fill ${p.meta.fill})\n\n start        solution`)
  const a = grid(p.start), b = grid(p.solution)
  a.forEach((row, r) => console.log(` ${row}    ${b[r]}`))
  console.log(`\nexport const FALLBACK = {\n  solution: '${p.solution}',\n  start: '${p.start}',\n}`)
  process.exit(0)
}

// ── The answer bank ──
const valid = new Set(readFileSync(new URL('../src/validWords.txt', import.meta.url), 'utf8').split(/\s+/).filter(Boolean).map(w => w.toUpperCase()))
const bankSet = new Set(ANSWERS)
let bankBad = 0
const seenWord = new Set()
for (const w of ANSWERS) {
  const errs = []
  if (!/^[A-Z]{5}$/.test(w)) errs.push('not 5 uppercase letters')
  else if (!valid.has(w)) errs.push('not in validWords.txt')
  if (seenWord.has(w)) errs.push('duplicate')
  seenWord.add(w)
  if (errs.length) { bankBad++; console.log(`ANSWERS ${w}: ${errs.join(' | ')}`) }
}
const sorted = ANSWERS.every((w, i) => i === 0 || ANSWERS[i - 1] < w)
if (!sorted) { bankBad++; console.log('ANSWERS is not in alphabetical order') }

// Independent verification of one puzzle (does not trust its meta).
function verify(p) {
  if (!p) return ['null (fallback needed)']
  const errs = []
  const { solution, start } = p
  if (solution.length !== 25 || start.length !== 25) return ['wrong board length']
  for (let i = 0; i < 25; i++) {
    if (!isActive(i) && (solution[i] !== HOLE || start[i] !== HOLE)) errs.push(`hole ${i} not empty`)
    if (isActive(i) && (!/[A-Z]/.test(solution[i]) || !/[A-Z]/.test(start[i]))) errs.push(`cell ${i} not a letter`)
  }
  const words = wordsOf(solution)
  words.forEach(w => { if (!bankSet.has(w)) errs.push(`${w} not in ANSWERS`) })
  if (new Set(words).size !== words.length) errs.push('repeated word')
  const tally = (b) => ACTIVE.map(i => b[i]).sort().join('')
  if (tally(start) !== tally(solution)) errs.push('start is not a rearrangement of the solution')
  const misplaced = ACTIVE.filter(i => start[i] !== solution[i]).length
  if (misplaced < MISPLACED_MIN || misplaced >= MISPLACED_MIN + MISPLACED_SPAN) errs.push(`${misplaced} misplaced tiles`)
  WORD_CELLS.forEach((slot, w) => {
    const greens = slot.filter(i => start[i] === solution[i]).length
    if (greens > MAX_START_GREENS) errs.push(`${words[w]} starts with ${greens} greens`)
  })
  const ms = minSwaps(start, solution)
  if (ms !== PAR) errs.push(`min swaps ${ms} ≠ ${PAR}`)
  return errs
}

const fbErrs = FALLBACK.solution ? verify(FALLBACK) : ['FALLBACK is empty']
if (fbErrs.length) console.log(`FALLBACK: ${fbErrs.join('; ')}`)

const utcDay = (d) => { const [y, m, dd] = d.split('-').map(Number); return Date.UTC(y, m - 1, dd) / 86400000 }
const blockOf = (d) => Math.floor((utcDay(d) - utcDay(BLOCK_EPOCH)) / BLOCK_DAYS)

const t0 = performance.now()
const seen = new Set()
const blockWords = new Map()  // block → words used so far
const uses = new Map()   // word → day numbers it appeared on
const times = []
const greens = new Map()
let bad = 0, day = 0, fillsMax = 0
for (const dateStr of dates(FROM, DAYS)) {
  const a = performance.now()
  const p = generatePuzzle(dateStr, { noFallback: true })
  times.push(performance.now() - a)
  const errs = verify(p)
  if (p) {
    if (seen.has(p.solution)) errs.push('duplicate of an earlier grid')
    seen.add(p.solution)
    const b = blockOf(dateStr)
    if (!blockWords.has(b)) blockWords.set(b, new Set())
    const inBlock = blockWords.get(b)
    p.words.forEach(w => { if (inBlock.has(w)) errs.push(`${w} already used in this block`); inBlock.add(w) })
  }
  if (errs.length) { bad++; console.log(`${dateStr}: ${errs.join('; ')}`); day++; continue }
  fillsMax = Math.max(fillsMax, p.meta.fill)
  p.words.forEach(w => { const l = uses.get(w); if (l) l.push(day); else uses.set(w, [day]) })
  const g = ACTIVE.filter(i => p.start[i] === p.solution[i]).length
  greens.set(g, (greens.get(g) ?? 0) + 1)
  day++
}
const elapsed = (performance.now() - t0) / 1000

let minGap = Infinity, maxUses = 0, weekRepeats = 0
for (const days of uses.values()) {
  maxUses = Math.max(maxUses, days.length)
  for (let k = 1; k < days.length; k++) {
    minGap = Math.min(minGap, days[k] - days[k - 1])
    if (days[k] - days[k - 1] <= 7) weekRepeats++
  }
}
const ms = times.slice().sort((x, y) => x - y)
const mean = ms.reduce((x, y) => x + y, 0) / ms.length
const max = ms[ms.length - 1]
const slow = TIMING && max > MAX_MS

console.log(`\n${ANSWERS.length} answers, ${bankBad} bank problems`)
console.log(`${DAYS} days from ${FROM}  ${elapsed.toFixed(1)}s · ${mean.toFixed(2)}ms mean / ${ms[Math.floor(ms.length * 0.99)].toFixed(2)} p99 / ${max.toFixed(2)} max · fill attempts max ${fillsMax + 1}`)
console.log(`words used ${uses.size}/${ANSWERS.length} · most uses of one word ${maxUses} · shortest gap between repeats ${minGap === Infinity ? '—' : minGap + ' days'} · repeats within a week ${weekRepeats} (block edges only)`)
console.log(`start greens: ${[...greens].sort((x, y) => x[0] - y[0]).map(([g, n]) => `${g}:${n}`).join(' ')}`)
console.log(`\n${bad} bad days, ${fbErrs.length ? 'bad' : 'good'} fallback${slow ? `, max ${max.toFixed(0)}ms > ${MAX_MS}ms` : ''}`)
process.exit(bad > 0 || bankBad > 0 || fbErrs.length > 0 || slow ? 1 : 0)
