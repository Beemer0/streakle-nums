// Gridiron's daily grid and answer rules. Pure ESM: Gridiron.jsx and
// scripts/check-faceoff.mjs both import it.
import {
  generateGrid, canFillBoard, scheduleWithoutRepeats, answerEras, answerTimeline,
} from '../grid/engine.js'
import { AWARDS, NFL_LOGO, PLAYERS as SHIPPED } from './data.js'
import { BATCHES } from './corrections.js'

// A team header is the franchise: its relocated predecessors count for it.
export const FRANCHISES = { LV: ['OAK'], LAC: ['SD'], LAR: ['STL'] }

// Criteria pool = the 32 current teams (the relocated codes OAK/SD/STL are
// left out so e.g. OAK and LV never both appear) + the awards.
export const HEADER_POOL = [
  ...Object.keys(NFL_LOGO).filter(t => !['OAK', 'SD', 'STL'].includes(t)),
  ...Object.keys(AWARDS),
]
const AWARD_KEYS = new Set(Object.keys(AWARDS))
export const FALLBACK_PUZZLE = { rows: ['NE', 'DAL', 'NFL_MVP'], cols: ['SB_CHAMP', 'GB', 'PRO_BOWL'] }

export const isValid = (player, criteria) => player.t.includes(criteria) || player.a.includes(criteria)

// The answers over time: shipped, then each verified correction batch from its
// date, with relocated predecessors folded into their franchise.
const TIMELINE = answerTimeline(answerEras(SHIPPED, BATCHES, FRANCHISES), isValid)
// The answers the page searches and checks against: every correction so far.
export const PLAYERS = TIMELINE.latest
// The answer check for a date's board (lenient on boards dealt from older data).
export const fitsOn = (dateStr) => TIMELINE.eraOf(dateStr).fits

// Every cell has answers and the whole board has a 9-distinct-player solution;
// pass 0 also wants 1–3 award headers and no cell with fewer than 2 answers.
// Impossible award pairs (DPOY×OROY, rushing×passing title) self-reject.
function generate(dateStr, banned) {
  const cellPlayers = TIMELINE.eraOf(dateStr).cells
  return generateGrid({
    dateStr,
    headerPool: HEADER_POOL,
    attempts: 800,
    fallback: FALLBACK_PUZZLE,
    banned,
    accept(rows, cols, pass) {
      if (pass === 0) {
        const awards = [...rows, ...cols].filter(h => AWARD_KEYS.has(h)).length
        if (awards < 1 || awards > 3) return false
        if (rows.some(r => cols.some(c => cellPlayers(r, c).length < 2))) return false
      }
      const cells = rows.flatMap(r => cols.map(c => cellPlayers(r, c)))
      return cells.every(c => c.length > 0) && canFillBoard(cells)
    },
  })
}

export const getDailyPuzzle = scheduleWithoutRepeats(generate)
