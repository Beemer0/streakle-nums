// A daily rotation through an append-only content bank, taking over at a
// cutover from the shipped YYYYMMDD % count formula. Pure ESM: Link's and
// Words' schedules (src/link/schedule.js, src/words/schedule.js) build theirs
// with it.
//
// The formula serves the same entry on neighbouring days whenever a month or
// year turns (10-30 and 11-01, 11-30 and 12-01…), so dates before the cutover
// keep it, fixed at the count that shipped, and no board a player has seen
// ever changes. From the cutover the bank runs in a fixed rotation, so each
// entry comes back only after a full cycle.
//
// The first rotation comes in one of two orders:
// - by default, the entries the old formula served longest ago first, so none
//   returns sooner than a full cycle across the cutover either (Link). That
//   order is the old formula's walk through the bank, kept forever.
// - with `shuffle: { seed, minGap }`, a seeded shuffle in which each entry's
//   first day in the rotation is at least `minGap` days after its last day
//   under the old formula (Words). A bank laid out in runs (alphabetical,
//   say) then stops showing them, at the price of a gap shorter than a full
//   cycle once, across the cutover; from then on it is a full cycle.
//
// `eras[0]` is { from: cutover, count: shipped }. Growing the bank: append the
// new entries and add an era whose `from` is a cycle boundary of the last era
// ((from - last.from) is a multiple of last.count) that no time zone has
// reached yet. The new era serves its new entries first (shuffled too, with
// `shuffle`), then the previous rotation, so dates already served never change
// and no entry returns sooner than a full cycle. Never reorder or remove an
// entry.
import { addDays, dateDay } from './dateMath.js'

// How far before the cutover to look for each entry's last day under the old
// formula (Link's 71 puzzles all turn up within 74 days, Words' 144 within
// 291); an entry not found counts as served longest ago.
const MAX_LOOKBACK_DAYS = 3650

export const legacyIndex = (dateStr, count) => parseInt(dateStr.replace(/-/g, ''), 10) % count

// Days from each entry's last day under the old formula to the cutover
// (Infinity for one not served within MAX_LOOKBACK_DAYS).
function daysSinceServed(cutover, shipped) {
  const daysAgo = new Map()
  for (let back = 1; daysAgo.size < shipped && back <= MAX_LOOKBACK_DAYS; back++) {
    const i = legacyIndex(addDays(cutover, -back), shipped)
    if (!daysAgo.has(i)) daysAgo.set(i, back)
  }
  return (i) => daysAgo.get(i) ?? Infinity
}

function mulberry32(seed) {
  let s = seed
  return function () {
    s = s + 0x6D2B79F5 | 0
    let t = Math.imul(s ^ s >>> 15, 1 | s)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// An independent random stream per (seed, era), so a new era's shuffle never
// disturbs an earlier era's.
function seededRandom(seed, era) {
  let h = (seed ^ Math.imul(era + 1, 0x9E3779B9) ^ 0x27D4EB2F) | 0
  h = Math.imul(h ^ (h >>> 16), 0x85EBCA6B)
  h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35)
  return mulberry32(h ^ (h >>> 16))
}

function shuffled(items, random) {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const bankIndexes = (count) => Array.from({ length: count }, (_, i) => i)

// The shipped entries, least recently served under the old formula first
// (ties keep bank order).
function leastRecentFirst(ago, shipped) {
  return bankIndexes(shipped).sort((a, b) => ago(b) - ago(a) || a - b)
}

// The shipped entries in a seeded order where an entry last served `ago` days
// before the cutover gets a rank (days after the cutover) of at least
// minGap - ago. Each rank, from the first, takes a random entry among those
// allowed there. That never strands one: an entry allowed at a rank is allowed
// at every later one, so if no entry is left for a rank, fewer than rank + 1
// entries are allowed by it and no order at all fits — hence the throw.
function minGapShuffle(name, ago, shipped, { seed, minGap }) {
  const random = seededRandom(seed, 0)
  const earliest = (i) => Math.max(0, minGap - ago(i))
  let pending = bankIndexes(shipped)
  const rotation = []
  for (let rank = 0; rank < shipped; rank++) {
    const allowed = pending.filter(i => earliest(i) <= rank)
    if (!allowed.length) {
      throw new Error(`${name}: no rotation keeps every entry ${minGap} days from its last day under the old formula (nothing fits day ${rank + 1})`)
    }
    const pick = allowed[Math.floor(random() * allowed.length)]
    rotation.push(pick)
    pending = pending.filter(i => i !== pick)
  }
  return rotation
}

// Each later era: its new entries, then the previous era's rotation.
function eraRotations(name, eras, bankSize, shuffle) {
  return eras.reduce((rotations, era, k) => {
    if (k === 0) {
      const ago = daysSinceServed(era.from, era.count)
      return [shuffle ? minGapShuffle(name, ago, era.count, shuffle) : leastRecentFirst(ago, era.count)]
    }
    const prev = eras[k - 1]
    const span = dateDay(era.from) - dateDay(prev.from)
    if (era.count <= prev.count || era.count > bankSize || span <= 0 || span % prev.count) {
      throw new Error(`${name} era ${era.from}: must add entries and start on a cycle boundary of the era before`)
    }
    const added = bankIndexes(era.count).slice(prev.count)
    const newFirst = shuffle ? shuffled(added, seededRandom(shuffle.seed, k)) : added
    return [...rotations, [...newFirst, ...rotations[k - 1]]]
  }, [])
}

function checkShuffle(name, shuffle) {
  if (shuffle === undefined) return
  const { seed, minGap } = shuffle
  if (!Number.isInteger(seed) || !Number.isInteger(minGap) || minGap < 1) {
    throw new Error(`${name}: shuffle needs an integer seed and a whole minGap of at least 1`)
  }
}

/**
 * @param {{
 *   name: string,
 *   eras: { from: string, count: number }[],
 *   bankSize: number,
 *   shuffle?: { seed: number, minGap: number },
 * }} schedule
 *   `shuffle` mixes the rotation (seeded) instead of serving the entries the
 *   old formula served longest ago first; each entry's first day in it is
 *   still at least `minGap` days after its last day under the old formula
 * @returns {{ rotation: number[], dailyIndex: (dateStr: string) => number }}
 *   the first era's rotation, and the bank index a YYYY-MM-DD date gets
 */
export function rotationSchedule({ name, eras, bankSize, shuffle }) {
  const [{ from: cutover, count: shipped }] = eras
  if (shipped > bankSize) throw new Error(`${name}: the first era counts ${shipped} entries, the bank has ${bankSize}`)
  checkShuffle(name, shuffle)
  const rotations = eraRotations(name, eras, bankSize, shuffle)
  const dailyIndex = (dateStr) => {
    if (dateStr < cutover) return legacyIndex(dateStr, shipped)
    const k = eras.findLastIndex(era => era.from <= dateStr)
    const rotation = rotations[k]
    return rotation[(dateDay(dateStr) - dateDay(eras[k].from)) % rotation.length]
  }
  return { rotation: rotations[0], dailyIndex }
}
