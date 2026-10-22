// Shared daily-grid generator for Faceoff, Gridiron and Knockout. A pure ESM
// module: the three pages and scripts/check-faceoff.mjs all import it.
//
// Each day shuffles the game's header pool with a date-seeded RNG, takes 3 rows
// and 3 columns, and keeps the first grid the game's `accept` rule passes
// (variety and thin-cell rules in pass 0, relaxed in pass 1).
//
// Two seedings. Before GRID_CUTOVER every attempt used seed + attempt*997 +
// pass*31337, which collides across dates (a date 997k later replays the
// earlier date's attempt k), so later days repeated earlier grids. That
// legacy path is kept byte-identical so every board players have already
// seen stays the same. From GRID_CUTOVER each attempt's seed is a hash of
// (date, pass, attempt), and the games generate from their corrected data.
//
// ANY change here, to a game's header pool or accept rule, or to its data
// rewrites boards: dates before GRID_CUTOVER must never change.

import { addDays, dateDay } from '../dateMath.js'

export const GRID_CUTOVER = '2026-10-25'

export const isLegacyDate = (dateStr) => dateStr < GRID_CUTOVER

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// Same mixer as mines/engine.js: distinct (date, pass, attempt) triples land
// far apart, so no two dates share an attempt's random stream.
export function mixSeed(seed, pass, attempt) {
  let h = (seed ^ 0x9E3779B9) | 0
  h = Math.imul(h ^ (h >>> 16), 0x85EBCA6B)
  h = (h + Math.imul(pass + 1, 0x27D4EB2F) + Math.imul(attempt + 1, 0x165667B1)) | 0
  h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35)
  return (h ^ (h >>> 16)) | 0
}

const dateSeed = (dateStr) => parseInt(dateStr.replace(/-/g, ''), 10)

// Can every cell get its own answer? cells: one answer list per cell; answers
// are compared by their `n` (name). Most-constrained cells go first.
export function canFillBoard(cells) {
  const order = [...cells].sort((a, b) => a.length - b.length)
  const used = new Set()
  const go = (k) => {
    if (k === order.length) return true
    for (const p of order[k]) {
      if (used.has(p.n)) continue
      used.add(p.n)
      if (go(k + 1)) return true
      used.delete(p.n)
    }
    return false
  }
  return go(0)
}

// A grid's identity for repeat checks: the same six headers in either
// orientation, in any order, are the same puzzle to a player.
export const gridKey = (rows, cols) => [[...rows].sort().join(','), [...cols].sort().join(',')].sort().join('|')

// headerPool: the criteria a day may use. attempts: tries per pass.
// accept(rows, cols, pass): the game's rules for a candidate grid.
// banned: optional Set of gridKeys the day may not use (recently served).
export function generateGrid({ dateStr, headerPool, attempts, accept, fallback, banned }) {
  const seed = dateSeed(dateStr)
  const legacy = isLegacyDate(dateStr)
  for (let pass = 0; pass < 2; pass++) {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const rng = mulberry32(legacy ? seed + attempt * 997 + pass * 31337 : mixSeed(seed, pass, attempt))
      const pool = [...headerPool]
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[pool[i], pool[j]] = [pool[j], pool[i]]
      }
      const rows = pool.slice(0, 3)
      const cols = pool.slice(3, 6)
      if (rows.some(r => cols.includes(r))) continue
      if (banned && banned.has(gridKey(rows, cols))) continue
      if (accept(rows, cols, pass)) return { rows, cols }
    }
  }
  return fallback
}

// A game's daily schedule from GRID_CUTOVER: each day skips any grid served in
// the windowDays before it (shipped history included), so no grid returns
// within a year even when two dates' seeds happen to land on it. Built day by
// day from the window before the cutover and memoised; generate(dateStr,
// banned) makes one day's grid. Shipped dates are generated as they were.
export function scheduleWithoutRepeats(generate, windowDays = 365) {
  const start = addDays(GRID_CUTOVER, -windowDays)
  const schedule = []
  const recent = new Map() // gridKey -> times served in the trailing window
  const count = (grid, step) => {
    const key = gridKey(grid.rows, grid.cols)
    const n = (recent.get(key) ?? 0) + step
    if (n) recent.set(key, n)
    else recent.delete(key)
  }
  return (dateStr) => {
    if (isLegacyDate(dateStr)) return generate(dateStr)
    for (let day = addDays(start, schedule.length); day <= dateStr; day = addDays(day, 1)) {
      const grid = isLegacyDate(day) ? generate(day) : generate(day, recent)
      schedule.push(grid)
      count(grid, 1)
      if (schedule.length > windowDays) count(schedule[schedule.length - 1 - windowDays], -1)
    }
    return schedule[dateDay(dateStr) - dateDay(start)]
  }
}

// Every header pair's answers, worked out on first use and kept: trying a
// candidate grid is then nine lookups.
export function cellBook(answers, fits) {
  const book = new Map()
  return (row, col) => {
    const key = `${row}|${col}`
    let cell = book.get(key)
    if (!cell) book.set(key, cell = answers.filter(a => fits(a, row) && fits(a, col)))
    return cell
  }
}

// The answer check for a board dealt from older data: an answer fits if the
// current data says so or the data the board was dealt from did, so no board
// is made harder (or unwinnable) by a later correction, while additions count
// everywhere.
export function lenientFits(fits, dealtFrom) {
  const before = new Map(dealtFrom.map(a => [a.n, a]))
  return (answer, criterion) => fits(answer, criterion) || (before.has(answer.n) && fits(before.get(answer.n), criterion))
}

// What a game needs per era: its cell lookups and the answer check for boards
// dealt in it (strict on the current era, lenient on older ones). latest is the
// answer list the pages search and check against.
export function answerTimeline(eras, fits) {
  const current = eras[eras.length - 1]
  const timeline = eras.map(era => ({
    from: era.from,
    cells: cellBook(era.answers, fits),
    fits: era === current ? fits : lenientFits(fits, era.answers),
  }))
  const eraOf = (dateStr) => timeline.findLast(era => era.from <= dateStr)
  return { latest: current.answers, eraOf }
}

// A game's answer data over time. Era 0 is the shipped list; each correction
// batch { from, corrections } starts a new era on its `from` date, applied on
// top of the previous one and folded into franchises. A batch must start on a
// day no time zone has reached when it ships (2+ days after the deploy), so a
// board already dealt never changes: grids generate from the era of their date.
export function answerEras(shipped, batches, franchises = {}) {
  const eras = [{ from: '', answers: shipped }]
  let current = shipped
  for (const { from, corrections } of batches) {
    if (!(from > eras[eras.length - 1].from) || from < GRID_CUTOVER) {
      throw new Error(`correction batch ${from}: batches run in date order, from GRID_CUTOVER on`)
    }
    current = correctedAnswers(current, corrections)
    eras.push({ from, answers: withFranchises(current, franchises) })
  }
  return eras
}

// Applies verified corrections to a game's legacy answer list:
// corrections = { [name]: { [field]: { add: [...], remove: [...] } } } and
// added = whole new entries. Unknown names throw, so a typo can't slip by.
export function correctedAnswers(entries, corrections, added = []) {
  const known = new Set(entries.map(e => e.n))
  for (const name of Object.keys(corrections)) {
    if (!known.has(name)) throw new Error(`correction for unknown answer: ${name}`)
  }
  const fixed = entries.map(e => {
    const fix = corrections[e.n]
    if (!fix) return e
    const next = { ...e }
    for (const [field, { add = [], remove = [] }] of Object.entries(fix)) {
      next[field] = [...e[field].filter(c => !remove.includes(c)), ...add.filter(c => !e[field].includes(c))]
    }
    return next
  })
  return [...fixed, ...added]
}

// Folds relocated predecessors into the franchise header they now belong to,
// e.g. { LAR: ['STL'] } makes every St. Louis Rams player count for the Rams.
export function withFranchises(entries, franchises) {
  return entries.map(e => {
    const extra = Object.entries(franchises)
      .filter(([team, olds]) => !e.t.includes(team) && olds.some(o => e.t.includes(o)))
      .map(([team]) => team)
    return extra.length ? { ...e, t: [...e.t, ...extra] } : e
  })
}
