// Audits a grid-game answer key: verifies every daily puzzle is solvable
// (each of the 9 cells has at least one valid player AND a full board of 9
// DISTINCT players exists), and prints thin spots. Faceoff/Gridiron check
// their 30 static puzzles; Knockout simulates its procedural generator
// across a multi-year date range.
// Run: node scripts/check-faceoff.mjs [Faceoff|Gridiron|Knockout]
import { readFileSync } from 'node:fs'

const game = process.argv[2] ?? 'Faceoff'
const src = readFileSync(new URL(`../src/${game}.jsx`, import.meta.url), 'utf8')

function extractBlock(name, open, close) {
  const start = src.indexOf(`const ${name} = ${open}`)
  if (start === -1) throw new Error(`${name} not found`)
  const from = src.indexOf(open, start)
  let depth = 0
  for (let i = from; i < src.length; i++) {
    if (src[i] === open) depth++
    else if (src[i] === close) {
      depth--
      if (depth === 0) {
        return new Function(`return ${src.slice(from, i + 1)}`)()
      }
    }
  }
  throw new Error(`${name} unbalanced`)
}
const extractArray = (name) => extractBlock(name, '[', ']')
const extractObject = (name) => extractBlock(name, '{', '}')

// ── Knockout: simulate the procedural generator over a 3-year window ────────
if (game === 'Knockout') {
  const FIGHTERS = extractArray('FIGHTERS')
  const PROMOTIONS = extractObject('PROMOTIONS')
  const WEIGHT_CLASSES = extractObject('WEIGHT_CLASSES')
  const HEADER_POOL = extractArray('HEADER_POOL')

  const dupes = new Map()
  for (const f of FIGHTERS) dupes.set(f.n, (dupes.get(f.n) ?? 0) + 1)
  const d = [...dupes].filter(([, c]) => c > 1)
  if (d.length) console.log('DUPLICATE FIGHTERS:', d.map(([n]) => n).join(', '))

  const matchesHeader = (f, h) => {
    if (h in PROMOTIONS) return f.p.includes(h)
    if (h in WEIGHT_CLASSES) return f.w.includes(h)
    return f.a.includes(h)
  }
  // Mirrors mulberry32/dateToSeed/getDailyPuzzle in Knockout.jsx — keep in sync.
  const mulberry32 = (a) => () => {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
  const dateToSeed = (s) => s.split('-').reduce((a, n) => a * 100 + parseInt(n), 0)
  function generate(dateStr) {
    const seed = dateToSeed(dateStr)
    for (let pass = 0; pass < 2; pass++) {
      for (let attempt = 0; attempt < 600; attempt++) {
        const rng = mulberry32(seed + attempt * 997 + pass * 31337)
        const pool = [...HEADER_POOL]
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1))
          ;[pool[i], pool[j]] = [pool[j], pool[i]]
        }
        const rows = pool.slice(0, 3)
        const cols = pool.slice(3, 6)
        const all6 = [...rows, ...cols]
        if (pass === 0) {
          if (!all6.some(h => h in PROMOTIONS)) continue
          if (!all6.some(h => h in WEIGHT_CLASSES)) continue
        }
        if (rows.some(r => cols.includes(r))) continue
        let valid = true
        for (const row of rows) {
          for (const col of cols) {
            if (FIGHTERS.filter(f => matchesHeader(f, row) && matchesHeader(f, col)).length < 2) { valid = false; break }
          }
          if (!valid) break
        }
        if (valid) return { rows, cols, pass, attempt }
      }
    }
    return null // fell through to the hardcoded fallback
  }
  function matchableCells(rows, cols) {
    const cells = []
    for (const r of rows) for (const c of cols) {
      cells.push(FIGHTERS.filter(f => matchesHeader(f, r) && matchesHeader(f, c)))
    }
    const order = cells.map((players, idx) => ({ players, idx })).sort((a, b) => a.players.length - b.players.length)
    const used = new Set()
    const go = (k) => {
      if (k === order.length) return true
      for (const p of order[k].players) {
        if (used.has(p.n)) continue
        used.add(p.n)
        if (go(k + 1)) return true
        used.delete(p.n)
      }
      return false
    }
    return go(0)
  }

  let fallbacks = 0, unmatchable = 0, pass1 = 0
  const start = new Date(2025, 0, 1)
  for (let i = 0; i < 1095; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const ds = d.toLocaleDateString('en-CA')
    const g = generate(ds)
    if (!g) { fallbacks++; console.log(`${ds}: FELL THROUGH TO FALLBACK GRID`); continue }
    if (g.pass === 1) pass1++
    if (!matchableCells(g.rows, g.cols)) {
      unmatchable++
      console.log(`${ds}: NO 9-DISTINCT-FIGHTER SOLUTION (rows ${g.rows} x cols ${g.cols})`)
    }
  }
  // The hardcoded fallback grid must itself be solvable.
  if (!matchableCells(['UFC', 'PRIDE', 'MW'], ['CHAMPION', 'KO_WIN', 'SUB_WIN'])) {
    console.log('FALLBACK GRID: NO 9-DISTINCT-FIGHTER SOLUTION')
    unmatchable++
  }
  console.log(`\n${FIGHTERS.length} fighters; simulated 1095 days (2025-2027)`)
  console.log(`fallback grids: ${fallbacks}, unmatchable grids: ${unmatchable}, variety-relaxed (pass 1): ${pass1}`)
  process.exit(unmatchable + fallbacks > 0 ? 1 : 0)
}

// ── Faceoff / Gridiron: simulate the procedural grid generator ──────────────
// Both games generate their daily grid from the date seed and self-validate, so
// the worst case in-app is the hardcoded fallback. This replays the generator
// over 3 years and flags any day that fell back (= the criteria pool is too thin
// to make a fresh solvable grid) — keep this in sync with getDailyPuzzle.
const PLAYERS = extractArray('PLAYERS')
const AWARDS = extractObject('AWARDS')
const LOGO = extractObject(game === 'Gridiron' ? 'NFL_LOGO' : 'NHL_LOGO')

const seen = new Map()
for (const p of PLAYERS) seen.set(p.n, (seen.get(p.n) ?? 0) + 1)
const dupes = [...seen].filter(([, c]) => c > 1)
if (dupes.length) console.log('DUPLICATE PLAYERS:', dupes.map(([n]) => n).join(', '))

const HEADER_POOL = [
  ...Object.keys(LOGO).filter(t => !(game === 'Gridiron' && ['OAK', 'SD', 'STL'].includes(t))),
  ...Object.keys(AWARDS),
]
const AWARD_KEYS = new Set(Object.keys(AWARDS))
const PLAYERS_BY_CRIT = Object.fromEntries(
  HEADER_POOL.map(c => [c, PLAYERS.filter(p => p.t.includes(c) || p.a.includes(c))])
)
const cellPlayers = (row, col) => PLAYERS_BY_CRIT[row].filter(p => p.t.includes(col) || p.a.includes(col))

const mulberry32 = (a) => () => {
  a |= 0; a = a + 0x6D2B79F5 | 0
  let t = Math.imul(a ^ a >>> 15, 1 | a)
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
  return ((t ^ t >>> 14) >>> 0) / 4294967296
}

function matchable(cells) {
  const order = [...cells].sort((a, b) => a.length - b.length)
  const used = new Set()
  const go = (k) => {
    if (k === order.length) return true
    for (const p of order[k]) {
      if (used.has(p.n)) continue
      used.add(p.n)
      if (go(k + 1)) return true
      used.delete(p.n)
    }
    return false
  }
  return go(0)
}

function boardSolvable(rows, cols) {
  const cells = []
  for (const r of rows) for (const c of cols) {
    const pl = cellPlayers(r, c)
    if (pl.length === 0) return false
    cells.push(pl)
  }
  return matchable(cells)
}

function generate(dateStr) {
  const seed = parseInt(dateStr.replace(/-/g, ''))
  for (let pass = 0; pass < 2; pass++) {
    for (let attempt = 0; attempt < 800; attempt++) {
      const rng = mulberry32(seed + attempt * 997 + pass * 31337)
      const pool = [...HEADER_POOL]
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[pool[i], pool[j]] = [pool[j], pool[i]]
      }
      const rows = pool.slice(0, 3)
      const cols = pool.slice(3, 6)
      if (rows.some(r => cols.includes(r))) continue
      if (pass === 0) {
        const awards = [...rows, ...cols].filter(h => AWARD_KEYS.has(h)).length
        if (awards < 1 || awards > 3) continue
        let thin = false
        for (const r of rows) { for (const c of cols) { if (cellPlayers(r, c).length < 2) { thin = true; break } } if (thin) break }
        if (thin) continue
      }
      if (boardSolvable(rows, cols)) return { rows, cols, pass }
    }
  }
  return null
}

let fallbacks = 0, pass1 = 0
const distinct = new Set()
const start = new Date(2025, 0, 1)
for (let i = 0; i < 1095; i++) {
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
  const ds = d.toLocaleDateString('en-CA')
  const g = generate(ds)
  if (!g) { fallbacks++; console.log(`${ds}: FELL THROUGH TO FALLBACK GRID`); continue }
  if (g.pass === 1) pass1++
  distinct.add([...g.rows, '|', ...g.cols].join(','))
}

console.log(`${PLAYERS.length} players; simulated 1095 days (2025-2027)`)
console.log(`fallback grids: ${fallbacks}, variety-relaxed (pass 1): ${pass1}, distinct grids: ${distinct.size}`)
process.exit(fallbacks > 0 ? 1 : 0)
