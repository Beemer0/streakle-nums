// Which Link puzzle a date gets. Pure ESM: Link.jsx, the tests and
// scripts/check-link.mjs all import it.
//
// Before LINK_CUTOVER the puzzle was PUZZLES[YYYYMMDD % 71], which serves the
// same puzzle on neighbouring days (10-30 and 11-01, 11-30 and 12-01…). Those
// dates keep that formula, fixed at the 71 puzzles that shipped, so no board a
// player has seen ever changes. From the cutover the puzzles run in a fixed
// rotation (src/rotationSchedule.js), so each comes back only after a full
// cycle; it starts with the puzzles the old formula served longest ago.
//
// Growing the bank: append the new puzzles to PUZZLES and add an era below
// whose `from` is a cycle boundary of the last era ((from - last.from) is a
// multiple of last.count) that no time zone has reached yet. The new era serves
// its new puzzles first, then the previous rotation, so dates already served
// never change and no puzzle returns sooner than a full cycle. Never reorder or
// remove a puzzle.
import { PUZZLES } from './puzzles.js'
import { rotationSchedule } from '../rotationSchedule.js'

export const LINK_CUTOVER = '2026-10-25'
const SHIPPED_COUNT = 71
export const ERAS = [
  { from: LINK_CUTOVER, count: SHIPPED_COUNT },
]

const schedule = rotationSchedule({ name: 'Link', eras: ERAS, bankSize: PUZZLES.length })

// The first rotation: the shipped puzzles, least recently served under the old
// formula first (ties keep bank order).
export const ROTATION = schedule.rotation

export const dailyPuzzleIndex = schedule.dailyIndex

export const getDailyPuzzle = (dateStr) => PUZZLES[dailyPuzzleIndex(dateStr)]
