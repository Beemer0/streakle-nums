// Which Link puzzle a date gets. Pure ESM: Link.jsx, the tests and
// scripts/check-link.mjs all import it.
//
// Before LINK_CUTOVER the puzzle was PUZZLES[YYYYMMDD % 71], which serves the
// same puzzle on neighbouring days (10-30 and 11-01, 11-30 and 12-01…). Those
// dates keep that formula, fixed at the 71 puzzles that shipped, so no board a
// player has seen ever changes. From the cutover the puzzles run in a fixed
// rotation, so each comes back only after a full cycle; it starts with the
// puzzles the old formula served longest ago.
//
// Growing the bank: append the new puzzles to PUZZLES and add an era below
// whose `from` is a cycle boundary of the last era ((from - last.from) is a
// multiple of last.count) that no time zone has reached yet. The new era serves
// its new puzzles first, then the previous rotation, so dates already served
// never change and no puzzle returns sooner than a full cycle. Never reorder or
// remove a puzzle.
import { PUZZLES } from './puzzles.js'
import { addDays, dateDay } from '../dateMath.js'

export const LINK_CUTOVER = '2026-10-25'
const SHIPPED_COUNT = 71
export const ERAS = [
  { from: LINK_CUTOVER, count: SHIPPED_COUNT },
]

const legacyIndex = (dateStr) => parseInt(dateStr.replace(/-/g, ''), 10) % SHIPPED_COUNT

// The first rotation: the shipped puzzles, least recently served under the old
// formula first (ties keep bank order).
export const ROTATION = (() => {
  const lastServed = Array.from({ length: SHIPPED_COUNT }, () => -Infinity)
  for (let back = 1; back <= 2 * SHIPPED_COUNT; back++) {
    const i = legacyIndex(addDays(LINK_CUTOVER, -back))
    if (lastServed[i] === -Infinity) lastServed[i] = -back
  }
  return lastServed.map((_, i) => i).sort((a, b) => lastServed[a] - lastServed[b] || a - b)
})()

// Each later era: its new puzzles, then the previous era's rotation.
const ROTATIONS = ERAS.reduce((rotations, era, k) => {
  if (k === 0) return [ROTATION]
  const prev = ERAS[k - 1]
  if (era.count <= prev.count || era.count > PUZZLES.length || (dateDay(era.from) - dateDay(prev.from)) % prev.count) {
    throw new Error(`Link era ${era.from}: must add puzzles and start on a cycle boundary of the era before`)
  }
  const added = Array.from({ length: era.count - prev.count }, (_, i) => prev.count + i)
  return [...rotations, [...added, ...rotations[k - 1]]]
}, [])

export function dailyPuzzleIndex(dateStr) {
  if (dateStr < LINK_CUTOVER) return legacyIndex(dateStr)
  const k = ERAS.findLastIndex(era => era.from <= dateStr)
  const rotation = ROTATIONS[k]
  return rotation[(dateDay(dateStr) - dateDay(ERAS[k].from)) % rotation.length]
}

export const getDailyPuzzle = (dateStr) => PUZZLES[dailyPuzzleIndex(dateStr)]
