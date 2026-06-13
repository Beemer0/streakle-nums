// Validates the Words answer bank: every entry must be a unique 5-letter
// uppercase word with a non-empty definition and fact. Run after editing WORDS
// in src/Words.jsx:  node scripts/check-words.mjs
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/Words.jsx', import.meta.url), 'utf8')
const start = src.indexOf('const WORDS = [')
const open = src.indexOf('[', start)
let depth = 0, end = -1
for (let i = open; i < src.length; i++) {
  if (src[i] === '[') depth++
  else if (src[i] === ']') { depth--; if (depth === 0) { end = i; break } }
}
const WORDS = new Function(`return ${src.slice(open, end + 1)}`)()

const seen = new Map()
let bad = 0
WORDS.forEach((w, i) => {
  const errs = []
  if (!/^[A-Z]{5}$/.test(w.word)) errs.push(`"${w.word}" is not 5 uppercase letters`)
  if (!w.def || w.def.length < 5) errs.push('missing/short def')
  if (!w.fact || w.fact.length < 15) errs.push('missing/short fact')
  seen.set(w.word, (seen.get(w.word) ?? 0) + 1)
  if (errs.length) { bad++; console.log(`#${i} ${w.word}: ${errs.join(' | ')}`) }
})
const dupes = [...seen].filter(([, c]) => c > 1).map(([w]) => w)
if (dupes.length) { bad += dupes.length; console.log(`DUPLICATE WORDS: ${dupes.join(', ')}`) }

console.log(`\n${WORDS.length} words, ${bad} problems`)
process.exit(bad > 0 ? 1 : 0)
