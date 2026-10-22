// Knockout's daily grid and answer rules. Pure ESM: Knockout.jsx and
// scripts/check-faceoff.mjs both import it.
import {
  generateGrid, canFillBoard, isLegacyDate, scheduleWithoutRepeats, answerEras, answerTimeline,
} from '../grid/engine.js'
import { PROMOTIONS, WEIGHT_CLASSES, ACHIEVEMENTS, FIGHTERS as SHIPPED } from './data.js'
import { BATCHES } from './corrections.js'

export const HEADER_POOL = [
  'UFC', 'PRIDE', 'BELLATOR', 'ONE', 'STRIKEFORCE', 'WEC',
  'HW', 'LHW', 'MW', 'WW', 'LW', 'FW', 'BW', 'FLY', 'WBW', 'WSW',
  'CHAMPION', 'MULTI_CHAMP', 'HOF', 'SUB_WIN', 'KO_WIN', 'TITLE_DEF',
]
export const FALLBACK_PUZZLE = { rows: ['UFC', 'PRIDE', 'MW'], cols: ['CHAMPION', 'KO_WIN', 'SUB_WIN'] }

export function matchesHeader(fighter, header) {
  if (header in PROMOTIONS) return fighter.p.includes(header)
  if (header in WEIGHT_CLASSES) return fighter.w.includes(header)
  if (header in ACHIEVEMENTS) return fighter.a.includes(header)
  return false
}

// The answers over time: shipped, then each verified correction batch from its date.
const TIMELINE = answerTimeline(answerEras(SHIPPED, BATCHES), matchesHeader)
// The fighters the page searches and checks against: every correction so far.
export const FIGHTERS = TIMELINE.latest
// The answer check for a date's board (lenient on boards dealt from older data).
export const fitsOn = (dateStr) => TIMELINE.eraOf(dateStr).fits

// Every cell needs 2+ fighters; pass 0 also wants a promotion and a weight
// class among the six headers. From the cutover the whole board must also have
// a 9-distinct-fighter solution (the shipped generator never checked it).
function generate(dateStr, banned) {
  const legacy = isLegacyDate(dateStr)
  const cellFighters = TIMELINE.eraOf(dateStr).cells
  return generateGrid({
    dateStr,
    headerPool: HEADER_POOL,
    attempts: 600,
    fallback: FALLBACK_PUZZLE,
    banned,
    accept(rows, cols, pass) {
      const all6 = [...rows, ...cols]
      if (pass === 0) {
        if (!all6.some(h => h in PROMOTIONS)) return false
        if (!all6.some(h => h in WEIGHT_CLASSES)) return false
      }
      const cells = rows.flatMap(r => cols.map(c => cellFighters(r, c)))
      if (cells.some(c => c.length < 2)) return false
      return legacy || canFillBoard(cells)
    },
  })
}

export const getDailyPuzzle = scheduleWithoutRepeats(generate)
