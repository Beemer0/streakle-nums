// Validates the Words answer bank and schedule. Every entry must be a unique
// 5-letter uppercase word with a non-empty definition and fact, and every word
// must be in the schedule (an era per batch of new words). Every date before
// the cutover must keep the word it shipped with, WORDS[YYYYMMDD % 144] over
// the 144 shipped words (both frozen below, not read from the modules under
// check). From the cutover to 2030-12-31 a shipped word's first return must
// come at least MIN_GAP days after its last day under the old formula (frozen
// below too), and every later return exactly a full cycle of the era it
// returns in (the whole bank, today). And the rotation must not walk the
// bank's alphabetical runs: fewer than MAX_LETTER_SHARE of its days may start
// with the letter after the day before's (or the same letter).
// Run after editing src/words/bank.js:  node scripts/check-words.mjs
import { createHash } from 'node:crypto'
import { WORDS } from '../src/words/bank.js'
import { dailyWordIndex, WORDS_CUTOVER, SHIPPED_COUNT, ERAS } from '../src/words/schedule.js'
import { addDays, dateDay } from '../src/dateMath.js'
import { readArgs } from './cli.mjs'

readArgs() // takes no arguments

const FIRST_DAY = '2025-01-01'
const LAST_DAY = '2030-12-31'
// What shipped: the cutover, the count the old formula ran over, and the
// shipped words in bank order (sha256 of them comma-joined, as
// src/words/schedule.test.js pins). Never change these.
const CUTOVER = '2026-10-30'
const SHIPPED = 144
const SHIPPED_WORDS_SHA256 = 'bf0d02715f5eb91db10c7ee7f0debe6d6dec45b6f4ea0ef152d48a47a00b8a15'
// The fewest days between a shipped word's last day under the old formula and
// its first day in the rotation (src/words/schedule.js picked 120 to break up
// the alphabetical runs). Never lower it.
const MIN_GAP = 120
// The old formula started the next day's answer with the next letter on two
// days in three; a shuffled bank does on ~4% (the same letter: ~3.5%).
const MAX_LETTER_SHARE = 0.1
const legacyIndex = (d) => parseInt(d.replace(/-/g, ''), 10) % SHIPPED
const cycleOn = (d) => ERAS.findLast(era => era.from <= d).count
const firstLetter = (i) => WORDS[i].word.charCodeAt(0) - 65
const percent = (n, of) => `${(100 * n / of).toFixed(1)}%`

const shipped = WORDS.slice(0, SHIPPED).map(w => w.word)
const seen = new Map()
let bad = 0
if (createHash('sha256').update(shipped.join(',')).digest('hex') !== SHIPPED_WORDS_SHA256) {
  bad++
  console.log(`The first ${SHIPPED} words are not the shipped ones: never edit, reorder or remove a word, only append`)
}
if (WORDS_CUTOVER !== CUTOVER || SHIPPED_COUNT !== SHIPPED || ERAS[0].from !== CUTOVER || ERAS[0].count !== SHIPPED) {
  bad++
  console.log(`src/words/schedule.js must start at ${CUTOVER} over the ${SHIPPED} shipped words: add new words with an era`)
}
if (ERAS[ERAS.length - 1].count !== WORDS.length) {
  bad++
  console.log(`${WORDS.length - ERAS[ERAS.length - 1].count} word(s) not in the schedule: add an era in src/words/schedule.js`)
}
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

const lastServed = new Map()
let changed = 0, oldMinGap = Infinity, firstReturn = Infinity, offCycle = 0
const laterReturns = new Set()
// Pairs of consecutive days both before the cutover, and both from it: how
// many, and how many start with the letter after the day before's (Z → A
// included) or with the same letter.
const letters = { before: { pairs: 0, next: 0, same: 0 }, from: { pairs: 0, next: 0, same: 0 } }
for (let d = FIRST_DAY, prev = null; d <= LAST_DAY; d = addDays(d, 1)) {
  const i = dailyWordIndex(d)
  if (d < CUTOVER && WORDS[i]?.word !== shipped[legacyIndex(d)]) {
    changed++
    console.log(`${d}: ${WORDS[i]?.word} served, but it shipped as ${shipped[legacyIndex(d)]}`)
  }
  if (lastServed.has(i)) {
    const since = lastServed.get(i)
    const gap = dateDay(d) - dateDay(since)
    if (d < CUTOVER) oldMinGap = Math.min(oldMinGap, gap)
    else if (since < CUTOVER) {
      firstReturn = Math.min(firstReturn, gap)
      if (gap < MIN_GAP) { offCycle++; console.log(`${d}: ${WORDS[i].word} back after ${gap} days, from ${since} under the old formula`) }
    } else {
      laterReturns.add(gap)
      if (gap !== cycleOn(d)) { offCycle++; console.log(`${d}: ${WORDS[i].word} back after ${gap} days, not a full cycle (${cycleOn(d)})`) }
    }
  }
  if (prev !== null && (d < CUTOVER || addDays(d, -1) >= CUTOVER)) {
    const tally = letters[d < CUTOVER ? 'before' : 'from']
    tally.pairs++
    if (firstLetter(i) === (firstLetter(prev) + 1) % 26) tally.next++
    if (firstLetter(i) === firstLetter(prev)) tally.same++
  }
  lastServed.set(i, d)
  prev = i
}
const { before, from } = letters
const runs = [from.next, from.same].filter(n => n >= MAX_LETTER_SHARE * from.pairs).length
if (runs) console.log(`The rotation walks the alphabet: keep each share below ${percent(MAX_LETTER_SHARE, 1)}`)

console.log(`\n${WORDS.length} words, ${bad} problems; ${changed} shipped day(s) changed before ${CUTOVER} (closest repeat then: ${oldMinGap} days)`)
console.log(`From ${CUTOVER} to ${LAST_DAY} a shipped word first returns after ${firstReturn} days at the closest (at least ${MIN_GAP}), then every ${[...laterReturns].join('/')} days (${offCycle} off)`)
console.log(`Next day's answer starts with the next letter: ${percent(before.next, before.pairs)} of days before ${CUTOVER}, ${percent(from.next, from.pairs)} from it; with the same letter: ${percent(before.same, before.pairs)}, ${percent(from.same, from.pairs)}`)
process.exit(bad + changed + offCycle + runs > 0 ? 1 : 0)
