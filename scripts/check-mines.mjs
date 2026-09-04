// Replays the Mines generator over a date window and proves every board is
// no-guess: solvable AND sound from its opening, right mine count, clean
// protected square, opening big enough, distinct from every other board.
// Imports the engine directly — nothing to keep in sync.
//
//   node scripts/check-mines.mjs                      # 2025-01-01, 2191 days (→ 2030-12-31)
//   node scripts/check-mines.mjs --from 2026-09-01 --days 30
//   node scripts/check-mines.mjs --dump 2026-09-04    # prints the boards + the FALLBACKS literal
//   node scripts/check-mines.mjs --bench              # 3 timing passes over 60 days, best reported
import {
  RUNGS, GEN_LAYOUTS, GEN_REPAIRS, FALLBACKS,
  generateBoard, solve, boardToString, boardFromString, neighbors, REVEALED,
} from '../src/mines/engine.js'

const args = process.argv.slice(2)
const opt = (name, dflt) => { const i = args.indexOf(name); return i === -1 ? dflt : args[i + 1] }
const FROM = opt('--from', '2025-01-01')
const DAYS = parseInt(opt('--days', '2191'), 10)
const DUMP = opt('--dump', null)
const BENCH = args.includes('--bench')
const HARD_MAX_MS = 60

function* dates(from, days) {
  const [y, m, d] = from.split('-').map(Number)
  const cur = new Date(y, m - 1, d)
  for (let k = 0; k < days; k++) {
    yield cur.toLocaleDateString('en-CA')
    cur.setDate(cur.getDate() + 1)
  }
}

// Independent verification of one board (does not trust board.meta).
function verify(board, rung) {
  const spec = RUNGS[rung]
  const errs = []
  if (!board) return ['null (fallback needed)']
  const N = spec.cols * spec.rows
  let mines = 0
  for (let i = 0; i < N; i++) mines += board.mine[i]
  if (mines !== spec.mines) errs.push(`mine count ${mines}`)
  const or = Math.floor(board.open / spec.cols), oc = board.open % spec.cols
  for (let i = 0; i < N; i++) {
    const r = Math.floor(i / spec.cols), c = i % spec.cols
    if (Math.abs(r - or) <= spec.protect && Math.abs(c - oc) <= spec.protect && board.mine[i]) {
      errs.push(`mine inside protected square at ${i}`); break
    }
  }
  if (board.count[board.open] !== 0) errs.push('opening cell is not a zero')
  if (board.opening.length < spec.minOpen) errs.push(`opening ${board.opening.length} < ${spec.minOpen}`)
  const { adj } = neighbors(spec.cols, spec.rows)
  for (let i = 0; i < N; i++) {
    if (board.mine[i]) continue
    let n = 0
    for (const j of adj[i]) n += board.mine[j]
    if (n !== board.count[i]) { errs.push(`count mismatch at ${i}`); break }
  }
  const res = solve(board)
  if (!res.solved) errs.push('solver stuck')
  for (let i = 0; i < N; i++) {
    if (res.cells[i] === REVEALED && board.mine[i]) { errs.push(`UNSOUND: revealed mine at ${i}`); break }
    if (res.cells[i] === 2 && !board.mine[i]) { errs.push(`UNSOUND: flagged safe cell at ${i}`); break }
  }
  return errs
}

if (DUMP) {
  const literal = []
  for (let rung = 0; rung < RUNGS.length; rung++) {
    const b = generateBoard(DUMP, rung, { noFallback: true })
    if (!b) { console.log(`${RUNGS[rung].label}: NO BOARD (fallback needed)`); continue }
    const s = boardToString(b)
    console.log(`\n${RUNGS[rung].label} ${b.cols}x${b.rows}/${b.mines} — opening ${b.opening.length} cells, layout ${b.meta.layout}, repairs ${b.meta.repairs}, rules ${b.meta.rules}`)
    console.log(s.split('/').join('\n'))
    literal.push(`  '${s}',`)
  }
  console.log(`\nexport const FALLBACKS = [\n${literal.join('\n')}\n]`)
  process.exit(0)
}

function run(from, days, quiet) {
  const stats = RUNGS.map(() => ({ n: 0, layouts: 0, layoutsMax: 0, repairs: 0, repairsMax: 0, solves: 0, solvesMax: 0, ms: [], rule2: 0, rule3: 0 }))
  const seen = new Set()
  let bad = 0
  for (const dateStr of dates(from, days)) {
    for (let rung = 0; rung < RUNGS.length; rung++) {
      const t0 = performance.now()
      const board = generateBoard(dateStr, rung, { noFallback: true })
      const ms = performance.now() - t0
      const errs = verify(board, rung)
      if (board) {
        const key = boardToString(board)
        if (seen.has(key)) errs.push('duplicate of an earlier board')
        seen.add(key)
      }
      if (errs.length) {
        bad++
        if (!quiet) console.log(`${dateStr} ${RUNGS[rung].label}: ${errs.join('; ')}`)
        continue
      }
      const s = stats[rung], m = board.meta
      s.n++
      s.layouts += m.layout + 1; s.layoutsMax = Math.max(s.layoutsMax, m.layout + 1)
      s.repairs += m.repairs; s.repairsMax = Math.max(s.repairsMax, m.repairs)
      s.solves += m.solves; s.solvesMax = Math.max(s.solvesMax, m.solves)
      s.ms.push(ms)
      if (m.rules & 2) s.rule2++
      if (m.rules & 4) s.rule3++
    }
  }
  return { stats, bad }
}

if (BENCH) {
  let best = null
  for (let pass = 0; pass < 3; pass++) {
    const { stats } = run('2026-09-01', 60, true)
    const total = stats.reduce((a, s) => a + s.ms.reduce((x, y) => x + y, 0), 0)
    if (!best || total < best.total) best = { total, stats }
  }
  for (let rung = 0; rung < RUNGS.length; rung++) {
    const ms = best.stats[rung].ms.slice().sort((a, b) => a - b)
    const mean = ms.reduce((a, b) => a + b, 0) / ms.length
    console.log(`${RUNGS[rung].label.padEnd(7)} mean ${mean.toFixed(2)}ms  p99 ${ms[Math.floor(ms.length * 0.99)].toFixed(2)}ms  max ${ms[ms.length - 1].toFixed(2)}ms`)
  }
  process.exit(0)
}

// Fallbacks must themselves be valid no-guess boards.
let fbBad = 0
for (let rung = 0; rung < RUNGS.length; rung++) {
  if (!FALLBACKS[rung]) { console.log(`FALLBACKS[${rung}] missing`); fbBad++; continue }
  const errs = verify(boardFromString(FALLBACKS[rung], rung), rung)
  if (errs.length) { console.log(`FALLBACKS[${rung}]: ${errs.join('; ')}`); fbBad++ }
}

const t0 = performance.now()
const { stats, bad } = run(FROM, DAYS, false)
const elapsed = (performance.now() - t0) / 1000
let hardMax = 0
console.log(`\n${DAYS} days from ${FROM} × ${RUNGS.length} rungs  (GEN_LAYOUTS ${GEN_LAYOUTS}, GEN_REPAIRS ${GEN_REPAIRS})  ${elapsed.toFixed(1)}s`)
for (let rung = 0; rung < RUNGS.length; rung++) {
  const s = stats[rung]
  const ms = s.ms.slice().sort((a, b) => a - b)
  const mean = ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : 0
  const p99 = ms.length ? ms[Math.floor(ms.length * 0.99)] : 0
  const max = ms.length ? ms[ms.length - 1] : 0
  if (rung === 2) hardMax = max
  console.log(
    `${RUNGS[rung].label.padEnd(7)} ${String(s.n).padStart(5)} ok · layouts ${(s.layouts / s.n).toFixed(2)} (max ${s.layoutsMax})` +
    ` · repairs ${(s.repairs / s.n).toFixed(1)} (max ${s.repairsMax}) · solves ${(s.solves / s.n).toFixed(1)} (max ${s.solvesMax})` +
    ` · ${mean.toFixed(1)}ms mean / ${p99.toFixed(1)} p99 / ${max.toFixed(1)} max` +
    ` · needs rule2 ${(100 * s.rule2 / s.n).toFixed(0)}% rule3 ${(100 * s.rule3 / s.n).toFixed(0)}%`)
}
const slow = hardMax > HARD_MAX_MS
console.log(`\n${bad} bad boards, ${fbBad} bad fallbacks${slow ? `, Hard max ${hardMax.toFixed(0)}ms > ${HARD_MAX_MS}ms` : ''}`)
process.exit(bad > 0 || fbBad > 0 || slow ? 1 : 0)
