// Validates the Link puzzle bank: every puzzle must have 4 categories, 4 words
// each, all 16 words unique within the puzzle (Connections assigns each word to
// exactly one category), ASCII-only, and the 4 standard colours. Run after
// editing PUZZLES in src/Link.jsx:  node scripts/check-link.mjs
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/Link.jsx', import.meta.url), 'utf8')
const start = src.indexOf('const PUZZLES = [')
const open = src.indexOf('[', start)
let depth = 0, end = -1
for (let i = open; i < src.length; i++) {
  if (src[i] === '[') depth++
  else if (src[i] === ']') { depth--; if (depth === 0) { end = i; break } }
}
const PUZZLES = new Function(`return ${src.slice(open, end + 1)}`)()

const COLORS = ['#b59f3b', '#538d4e', '#3a7bd5', '#9b59b6']
let bad = 0
PUZZLES.forEach((p, i) => {
  const errs = []
  if (p.categories.length !== 4) errs.push(`${p.categories.length} categories`)
  const all = []
  p.categories.forEach((c, ci) => {
    if (c.words.length !== 4) errs.push(`"${c.label}" has ${c.words.length} words`)
    if (c.color !== COLORS[ci]) errs.push(`"${c.label}" colour ${c.color} (expected ${COLORS[ci]})`)
    c.words.forEach(w => all.push(w))
  })
  const dupes = [...new Set(all.filter((w, j) => all.indexOf(w) !== j))]
  if (dupes.length) errs.push(`DUP WORDS: ${dupes.join(', ')}`)
  const nonAscii = all.filter(w => /[^\x00-\x7F]/.test(w))
  if (nonAscii.length) errs.push(`NON-ASCII: ${nonAscii.join(', ')}`)
  if (errs.length) { bad++; console.log(`PUZZLE ${i}: ${errs.join(' | ')}`) }
})
console.log(`\n${PUZZLES.length} puzzles, ${bad} broken`)
process.exit(bad > 0 ? 1 : 0)
