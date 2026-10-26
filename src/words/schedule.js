// Which Words answer a date gets. Pure ESM: Words.jsx, the tests and
// scripts/check-words.mjs all import it.
//
// Before WORDS_CUTOVER the answer was WORDS[YYYYMMDD % 144], whose month and
// year jumps bring some words back after only 59 days. Those dates keep that
// formula, fixed at the 144 words that shipped, so no answer a player has seen
// ever changes. From the cutover the words run in a fixed rotation
// (src/rotationSchedule.js), so each comes back only after a full cycle.
//
// The bank is laid out in alphabetical runs (… VOGUE WINCE XENON YODEL ZIPPY
// AROMA BAYOU …), and the old formula walks it in order, so on most days the
// answer started with the letter after yesterday's. The rotation is a seeded
// shuffle instead, which breaks that hint. Keeping a full cycle (144 days)
// between each word's last day under the old formula and its first day in the
// rotation would force the old order back, so across the cutover — once —
// the gap is at least MIN_GAP; from then on it is the full cycle.
//
// Growing the bank: append the new words to src/words/bank.js and add an era
// below whose `from` is a cycle boundary of the last era ((from - last.from)
// is a multiple of last.count) that no time zone has reached yet. The new era
// serves its new words first (in a seeded order), then the previous rotation,
// so dates already served never change and no word returns sooner than a full
// cycle. Never reorder or remove a word.
import { WORDS } from './bank.js'
import { rotationSchedule } from '../rotationSchedule.js'

export const WORDS_CUTOVER = '2026-10-30'
export const SHIPPED_COUNT = 144
export const ERAS = [
  { from: WORDS_CUTOVER, count: SHIPPED_COUNT },
]

// Fewest days between a word's last day under the old formula and its first
// day in the rotation. Measured over many seeds: up to 120 the rotation is as
// mixed as a free shuffle (the next day's answer starts with the next letter
// on ~4.3% of days, against 4.0% by chance); above it the old order creeps
// back (125: 4.5%, 130: 4.8%, 135: 5.4%, 140: 7.8%, 144: 45%).
export const MIN_GAP = 120
// The rotation's seed: the cutover's date. Never change it, MIN_GAP or the
// bank's first 144 words once the cutover has been served.
const ROTATION_SEED = 20261030

const schedule = rotationSchedule({
  name: 'Words',
  eras: ERAS,
  bankSize: WORDS.length,
  shuffle: { seed: ROTATION_SEED, minGap: MIN_GAP },
})

// The first rotation: the shipped words in a seeded order, each at least
// MIN_GAP days after its last day under the old formula.
export const ROTATION = schedule.rotation

export const dailyWordIndex = schedule.dailyIndex

export const getDailyWord = (dateStr) => WORDS[dailyWordIndex(dateStr)]
