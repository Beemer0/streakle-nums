// Audits a grid-game answer key (Faceoff or Gridiron): verifies every one of
// the 30 daily puzzles is solvable (each of the 9 cells has at least one valid
// player AND a full board of 9 DISTINCT players exists), and prints thin spots.
// Run: node scripts/check-faceoff.mjs [Gridiron]
import { readFileSync } from 'node:fs'

const game = process.argv[2] ?? 'Faceoff'
const src = readFileSync(new URL(`../src/${game}.jsx`, import.meta.url), 'utf8')

function extractArray(name) {
  const start = src.indexOf(`const ${name} = [`)
  if (start === -1) throw new Error(`${name} not found`)
  const open = src.indexOf('[', start)
  let depth = 0
  for (let i = open; i < src.length; i++) {
    if (src[i] === '[') depth++
    else if (src[i] === ']') {
      depth--
      if (depth === 0) {
        return new Function(`return ${src.slice(open, i + 1)}`)()
      }
    }
  }
  throw new Error(`${name} unbalanced`)
}

const PLAYERS = extractArray('PLAYERS')
const PUZZLES = extractArray('PUZZLES')

const isValid = (p, crit) => p.t.includes(crit) || p.a.includes(crit)

// Exact perfect-matching check: can all 9 cells be filled with distinct players?
function matchable(cellPlayers) {
  const order = cellPlayers
    .map((players, idx) => ({ players, idx }))
    .sort((a, b) => a.players.length - b.players.length)
  const used = new Set()
  function go(k) {
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

// Duplicate-name check
const seen = new Map()
for (const p of PLAYERS) {
  seen.set(p.n, (seen.get(p.n) ?? 0) + 1)
}
const dupes = [...seen].filter(([, c]) => c > 1)
if (dupes.length) console.log('DUPLICATE PLAYERS:', dupes.map(([n]) => n).join(', '))

let broken = 0
let unsolvable = 0
const thin = []
PUZZLES.forEach((pz, i) => {
  const cells = []
  for (const r of pz.rows) {
    for (const c of pz.cols) {
      const eligible = PLAYERS.filter(p => isValid(p, r) && isValid(p, c))
      cells.push({ r, c, eligible })
      if (eligible.length === 0) {
        broken++
        console.log(`PUZZLE ${i}: EMPTY CELL ${r} x ${c}`)
      } else if (eligible.length < 3) {
        thin.push(`puzzle ${i}: ${r} x ${c} = ${eligible.length} (${eligible.map(p => p.n).join(', ')})`)
      }
    }
  }
  if (!matchable(cells.map(c => c.eligible))) {
    unsolvable++
    console.log(`PUZZLE ${i}: NO FULL 9-PLAYER SOLUTION (rows ${pz.rows} x cols ${pz.cols})`)
  }
})

console.log(`\n${PLAYERS.length} players, ${PUZZLES.length} puzzles`)
console.log(`empty cells: ${broken}, unsolvable puzzles: ${unsolvable}`)
console.log(`\nTHIN CELLS (<3 answers): ${thin.length}`)
thin.forEach(t => console.log('  ' + t))
