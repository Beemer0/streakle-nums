import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { WORDS } from './bank.js'
import { dailyWordIndex, getDailyWord, WORDS_CUTOVER, ROTATION, ERAS, MIN_GAP } from './schedule.js'
import { addDays, dateDay } from '../dateMath.js'

const sha256 = (text) => createHash('sha256').update(text).digest('hex')
const legacy = (d) => parseInt(d.replace(/-/g, ''), 10) % 144
// The Archive's first day (LAUNCH_DATE in Archive.jsx): the first Words board
// anyone could play.
const LAUNCH_DATE = '2026-05-16'
// Days since the old formula last served each shipped word, as of the cutover.
const daysAgo = (() => {
  const ago = new Map()
  for (let back = 1; ago.size < 144; back++) {
    const i = legacy(addDays(WORDS_CUTOVER, -back))
    if (!ago.has(i)) ago.set(i, back)
  }
  return ago
})()

describe('Words schedule', () => {
  it('keeps every shipped date on its old answer', () => {
    expect(WORDS_CUTOVER).toBe('2026-10-30')
    for (let d = '2025-01-01'; d < WORDS_CUTOVER; d = addDays(d, 1)) {
      expect(dailyWordIndex(d)).toBe(legacy(d))
    }
  })

  // A shipped word never changes. Its def or fact may be corrected (a wrong
  // fact or etymology), logged here with the second pin:
  //   2026-10-27  XYLEM fact (phloem carries sugars both ways), KIOSK fact (Persian origin, not Turkish)
  //   2026-10-28  facts of BRINY VERVE DROLL EMBER TROVE MAXIM QUIRK SMIRK AROMA
  //               FJORD FLINT KUDOS RELIC QUASH: myths, unsupported superlatives
  //               and wrong etymologies, each re-sourced (see that commit)
  it('never changes a shipped word or its place in the bank, and its text only by a logged correction', () => {
    const shipped = WORDS.slice(0, 144)
    expect(shipped).toHaveLength(144)
    expect(sha256(shipped.map(w => w.word).join(','))).toBe('bf0d02715f5eb91db10c7ee7f0debe6d6dec45b6f4ea0ef152d48a47a00b8a15')
    expect(sha256(JSON.stringify(shipped))).toBe('acb16b928c5aea681539544ca6d51d6529bd140234a46e98ad14e1218d9ba686')
  })

  it('pins the answer of every day served before the cutover', () => {
    const served = []
    for (let d = LAUNCH_DATE; d < WORDS_CUTOVER; d = addDays(d, 1)) served.push(`${d} ${getDailyWord(d).word}`)
    expect(served).toHaveLength(167)
    expect(served[0]).toBe('2026-05-16 QUIRK')
    expect(served.at(-1)).toBe('2026-10-29 YIELD')
    expect(sha256(served.join('\n'))).toBe('ab88d0d04098575d210824756704829a7fe8eca05c611bf7f442a3db1fd19d44')
  })

  it('pins the rotation from the cutover', () => {
    expect(ERAS).toEqual([{ from: '2026-10-30', count: 144 }])
    expect(MIN_GAP).toBe(120)
    expect(ROTATION.slice(0, 8)).toEqual([133, 33, 89, 96, 43, 48, 142, 49])
    expect(ROTATION.slice(-3)).toEqual([66, 80, 76])
    expect(sha256(ROTATION.join(','))).toBe('91fc24474e85cf46ae095de7b059c0dfc7f6dfa94bbd873b8bc87ba3f9dc1715')
    expect(['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'].map(d => getDailyWord(d).word))
      .toEqual(['YIELD', 'XYLEM', 'NADIR', 'CREDO', 'KIOSK', 'CRAVE', 'INEPT'])
  })

  it('serves every shipped word exactly once a cycle', () => {
    expect([...ROTATION].sort((a, b) => a - b)).toEqual([...Array(144).keys()])
    for (const start of [WORDS_CUTOVER, '2027-01-01', '2028-02-29', '2030-06-15']) {
      const cycle = Array.from({ length: 144 }, (_, k) => dailyWordIndex(addDays(start, k)))
      expect(new Set(cycle).size).toBe(144)
    }
  })

  it('keeps each word MIN_GAP days from its last day under the old formula', () => {
    // A word on rotation day r (0 = the cutover) last served `ago` days
    // before it returns after r + ago days.
    const gaps = ROTATION.map((i, r) => r + daysAgo.get(i))
    expect(Math.min(...gaps)).toBe(MIN_GAP)
    // YIELD, served the day before the cutover, waits at least MIN_GAP - 1
    // days into the rotation; it no longer has to come last.
    const yieldIndex = WORDS.findIndex(w => w.word === 'YIELD')
    expect(daysAgo.get(yieldIndex)).toBe(1)
    expect(ROTATION.indexOf(yieldIndex)).toBeGreaterThanOrEqual(MIN_GAP - 1)
  })

  it('never brings a word back within MIN_GAP across the cutover, or a full rotation after it', () => {
    const last = new Map()
    let before = Infinity, across = Infinity
    const after = new Set()
    for (let d = '2025-01-01'; d <= '2030-12-31'; d = addDays(d, 1)) {
      const i = dailyWordIndex(d)
      if (last.has(i)) {
        const gap = dateDay(d) - dateDay(last.get(i))
        if (d < WORDS_CUTOVER) before = Math.min(before, gap)
        else if (last.get(i) < WORDS_CUTOVER) across = Math.min(across, gap)
        else after.add(gap)
      }
      last.set(i, d)
    }
    // The old formula brought some words back after 59 days.
    expect(before).toBe(59)
    expect(across).toBe(MIN_GAP)
    expect([...after]).toEqual([WORDS.length])
  })

  it('no longer walks the bank\'s alphabetical runs', () => {
    // The share of days whose answer starts with the letter after the day
    // before's (Z → A included), and with the same letter.
    const firstLetter = (d) => getDailyWord(d).word.charCodeAt(0) - 65
    const shares = (from, to) => {
      let pairs = 0, next = 0, same = 0
      for (let d = addDays(from, 1); d <= to; d = addDays(d, 1)) {
        const a = firstLetter(addDays(d, -1)), b = firstLetter(d)
        pairs++
        if (b === (a + 1) % 26) next++
        if (b === a) same++
      }
      return { next: next / pairs, same: same / pairs }
    }
    // The old formula: the next letter on 72% of days.
    expect(shares(LAUNCH_DATE, addDays(WORDS_CUTOVER, -1)).next).toBeGreaterThan(0.7)
    // The rotation: about chance (4.0% next letter, 3.5% same letter for a
    // shuffled bank), over its first cycle and through 2030.
    for (const [from, to] of [[WORDS_CUTOVER, addDays(WORDS_CUTOVER, 143)], [WORDS_CUTOVER, '2030-12-31']]) {
      const { next, same } = shares(from, to)
      expect(next).toBeLessThan(0.05)
      expect(same).toBeLessThan(0.05)
    }
  })
})
