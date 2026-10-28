// Validates the Link puzzle bank and schedule. Every puzzle must have 4
// categories, 4 words each, all 16 words unique within the puzzle (Connections
// assigns each word to exactly one category), ASCII-only, and no per-category
// colour (Link colours a group by its position, easiest to trickiest). Every
// puzzle must be in the schedule (an era per batch of new puzzles), and from
// LINK_CUTOVER none may return within a full shipped cycle (71 days; shipped
// history included). New puzzles also get a warning for any word over 10
// letters. Run after editing src/link/puzzles.js:  node scripts/check-link.mjs
import { PUZZLES } from '../src/link/puzzles.js'
import { dailyPuzzleIndex, LINK_CUTOVER, ERAS } from '../src/link/schedule.js'
import { addDays, dateDay } from '../src/dateMath.js'
import { readArgs } from './cli.mjs'

readArgs() // takes no arguments

const MIN_GAP = 71
// A tile on a 320px phone fits about 10 letters at its smallest size; a longer
// word there may break onto two lines (ATTEN-BOROUGH). New puzzles get a warning
// (not a failure) so an author can pick a shorter word; the shipped bank,
// which already has a few, is left alone.
const LONG_WORD_LETTERS = 10
const SHIPPED_PUZZLES = ERAS[0].count

let bad = 0
let longWords = 0
if (ERAS[ERAS.length - 1].count !== PUZZLES.length) {
  bad++
  console.log(`${PUZZLES.length - ERAS[ERAS.length - 1].count} puzzle(s) not in the schedule: add an era in src/link/schedule.js`)
}
PUZZLES.forEach((p, i) => {
  const errs = []
  if (p.categories.length !== 4) errs.push(`${p.categories.length} categories`)
  const all = []
  p.categories.forEach((c) => {
    if (c.words.length !== 4) errs.push(`"${c.label}" has ${c.words.length} words`)
    if ('color' in c) errs.push(`"${c.label}" has a colour; Link colours groups by position`)
    c.words.forEach(w => all.push(w))
  })
  const dupes = [...new Set(all.filter((w, j) => all.indexOf(w) !== j))]
  if (dupes.length) errs.push(`DUP WORDS: ${dupes.join(', ')}`)
  const nonAscii = all.filter(w => /[^\x00-\x7F]/.test(w))
  if (nonAscii.length) errs.push(`NON-ASCII: ${nonAscii.join(', ')}`)
  if (errs.length) { bad++; console.log(`PUZZLE ${i}: ${errs.join(' | ')}`) }
  const long = i < SHIPPED_PUZZLES ? [] : all.filter(w => w.split(' ').some(run => run.length > LONG_WORD_LETTERS))
  if (long.length) {
    longWords += long.length
    console.log(`warning: PUZZLE ${i}: ${long.join(', ')} (over ${LONG_WORD_LETTERS} letters: may take two lines on a 320px phone)`)
  }
})
const lastServed = new Map()
let minGap = Infinity, repeats = 0
for (let d = '2025-01-01'; d <= '2030-12-31'; d = addDays(d, 1)) {
  const i = dailyPuzzleIndex(d)
  if (d >= LINK_CUTOVER && lastServed.has(i)) {
    const gap = dateDay(d) - dateDay(lastServed.get(i))
    minGap = Math.min(minGap, gap)
    if (gap < MIN_GAP) { repeats++; console.log(`${d}: puzzle ${i} again after ${gap} days`) }
  }
  lastServed.set(i, d)
}

if (longWords) console.log(`${longWords} long word(s) in new puzzles (a warning, not a failure)`)
console.log(`\n${PUZZLES.length} puzzles, ${bad} broken; from ${LINK_CUTOVER} to 2030-12-31 the closest repeat is ${minGap} days (${repeats} closer than ${MIN_GAP})`)
process.exit(bad + repeats > 0 ? 1 : 0)
