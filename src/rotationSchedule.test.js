import { describe, it, expect } from 'vitest'
import { rotationSchedule, legacyIndex } from './rotationSchedule.js'
import { addDays, dateDay } from './dateMath.js'

// A seven-entry bank cut over on 2026-03-02. The old formula served entry 5 on
// 02-24 and again on 03-01, five days apart (February is short).
const CUTOVER = '2026-03-02'
const days = (from, n) => Array.from({ length: n }, (_, k) => addDays(from, k))
const schedule = (eras, bankSize = eras.at(-1).count) => rotationSchedule({ name: 'Test', eras, bankSize })

// The closest return of any entry served from `from` on (`until` exclusive),
// counting its last day before `from` too.
function minGap(dailyIndex, from, until) {
  const last = new Map()
  let gap = Infinity
  for (let d = addDays(from, -400); d < until; d = addDays(d, 1)) {
    const i = dailyIndex(d)
    if (d >= from && last.has(i)) gap = Math.min(gap, dateDay(d) - dateDay(last.get(i)))
    last.set(i, d)
  }
  return gap
}

describe('rotationSchedule', () => {
  it('is the shipped YYYYMMDD % count before the cutover', () => {
    expect(legacyIndex('2026-03-01', 7)).toBe(20260301 % 7)
    const { dailyIndex } = schedule([{ from: CUTOVER, count: 7 }])
    for (const d of days('2025-01-01', dateDay(CUTOVER) - dateDay('2025-01-01'))) {
      expect(dailyIndex(d)).toBe(legacyIndex(d, 7))
    }
  })

  it('starts the rotation with the entries the old formula served longest ago', () => {
    // Last served before the cutover: 3 on 02-22, 4 on 02-23, 6 on 02-25,
    // 0 on 02-26, 1 on 02-27, 2 on 02-28, 5 on 03-01.
    const { rotation, dailyIndex } = schedule([{ from: CUTOVER, count: 7 }])
    expect(rotation).toEqual([3, 4, 6, 0, 1, 2, 5])
    expect(days(CUTOVER, 9).map(dailyIndex)).toEqual([3, 4, 6, 0, 1, 2, 5, 3, 4])
  })

  it('never brings an entry back within a full cycle, across the cutover too', () => {
    const { dailyIndex } = schedule([{ from: CUTOVER, count: 7 }])
    expect(minGap(dailyIndex, CUTOVER, '2028-01-01')).toBe(7)
  })

  it('serves a new era\'s entries first, then the previous rotation, leaving earlier days alone', () => {
    const one = schedule([{ from: CUTOVER, count: 7 }], 9)
    const ERA = addDays(CUTOVER, 14)
    const two = schedule([{ from: CUTOVER, count: 7 }, { from: ERA, count: 9 }])
    for (const d of days('2026-01-01', dateDay(ERA) - dateDay('2026-01-01'))) {
      expect(two.dailyIndex(d)).toBe(one.dailyIndex(d))
    }
    expect(days(ERA, 11).map(two.dailyIndex)).toEqual([7, 8, 3, 4, 6, 0, 1, 2, 5, 7, 8])
    expect(minGap(two.dailyIndex, CUTOVER, '2028-01-01')).toBe(7)
    expect(minGap(two.dailyIndex, ERA, '2028-01-01')).toBe(9)
  })

  it.each([
    ['off a cycle boundary', [{ from: CUTOVER, count: 7 }, { from: addDays(CUTOVER, 10), count: 9 }], 9],
    ['that adds nothing', [{ from: CUTOVER, count: 7 }, { from: addDays(CUTOVER, 14), count: 7 }], 9],
    ['past the end of the bank', [{ from: CUTOVER, count: 7 }, { from: addDays(CUTOVER, 14), count: 10 }], 9],
    ['that starts before the era it follows', [{ from: CUTOVER, count: 7 }, { from: addDays(CUTOVER, -7), count: 9 }], 9],
    ['on the same day as the era it follows', [{ from: CUTOVER, count: 7 }, { from: CUTOVER, count: 9 }], 9],
  ])('refuses an era %s', (_, eras, bankSize) => {
    expect(() => schedule(eras, bankSize)).toThrow(/^Test era /)
  })

  it('refuses a first era bigger than the bank', () => {
    expect(() => schedule([{ from: CUTOVER, count: 7 }], 6)).toThrow(/^Test: /)
  })
})

// Every return of an entry served from `from` on (`until` exclusive): the
// closest one whose previous day fell before `from`, and the set of gaps
// whose previous day fell on or after it.
function returnGaps(dailyIndex, from, until) {
  const last = new Map()
  let across = Infinity
  const after = new Set()
  for (let d = addDays(from, -400); d < until; d = addDays(d, 1)) {
    const i = dailyIndex(d)
    if (d >= from && last.has(i)) {
      const gap = dateDay(d) - dateDay(last.get(i))
      if (last.get(i) < from) across = Math.min(across, gap)
      else after.add(gap)
    }
    last.set(i, d)
  }
  return { across, after: [...after] }
}

// The share of consecutive rotation days (wrapping round) whose entry is the
// bank's next one after the day before's.
const nextInBankShare = (rotation) =>
  rotation.filter((i, k) => rotation[(k + 1) % rotation.length] === (i + 1) % rotation.length).length / rotation.length

describe('rotationSchedule with shuffle', () => {
  const shuffledSchedule = (eras, shuffle, bankSize = eras.at(-1).count) =>
    rotationSchedule({ name: 'Test', eras, bankSize, shuffle })

  it('keeps the shipped YYYYMMDD % count before the cutover', () => {
    const { dailyIndex } = shuffledSchedule([{ from: CUTOVER, count: 7 }], { seed: 1, minGap: 5 })
    for (const d of days('2025-01-01', dateDay(CUTOVER) - dateDay('2025-01-01'))) {
      expect(dailyIndex(d)).toBe(legacyIndex(d, 7))
    }
  })

  it('serves every entry once a cycle, in an order fixed by the seed', () => {
    const eras = [{ from: CUTOVER, count: 60 }]
    const a = shuffledSchedule(eras, { seed: 7, minGap: 50 })
    const b = shuffledSchedule(eras, { seed: 7, minGap: 50 })
    const c = shuffledSchedule(eras, { seed: 8, minGap: 50 })
    expect([...a.rotation].sort((x, y) => x - y)).toEqual([...Array(60).keys()])
    expect(b.rotation).toEqual(a.rotation)
    expect(c.rotation).not.toEqual(a.rotation)
    expect(days(addDays(CUTOVER, 60), 60).map(a.dailyIndex)).toEqual(a.rotation)
  })

  it('breaks up the old formula\'s walk through the bank', () => {
    // The old formula steps to the next entry on most days, and so does the
    // least-recently-served order; the shuffle does so about as often as chance.
    const eras = [{ from: CUTOVER, count: 60 }]
    expect(nextInBankShare(schedule(eras).rotation)).toBeGreaterThan(0.8)
    expect(nextInBankShare(shuffledSchedule(eras, { seed: 7, minGap: 50 }).rotation)).toBeLessThan(0.1)
  })

  it('keeps each entry minGap days from its last old-formula day, then a full cycle apart', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { dailyIndex } = shuffledSchedule([{ from: CUTOVER, count: 60 }], { seed, minGap: 50 })
      const { across, after } = returnGaps(dailyIndex, CUTOVER, '2028-01-01')
      expect(across).toBeGreaterThanOrEqual(50)
      expect(after).toEqual([60])
    }
  })

  it('fits a minGap of a full cycle and refuses one no order can meet', () => {
    // Entries last served 8, 7, 5, 4, 3, 2 and 1 days before the cutover: at
    // a 7-day gap only 3 and 4 may go first, then 6, 0, 1, 2, 5 in turn.
    const { rotation } = shuffledSchedule([{ from: CUTOVER, count: 7 }], { seed: 1, minGap: 7 })
    expect(rotation.slice(2)).toEqual([6, 0, 1, 2, 5])
    // At 8 days only entry 3 fits day 1 and only 4 day 2; nothing fits day 3.
    expect(() => shuffledSchedule([{ from: CUTOVER, count: 7 }], { seed: 1, minGap: 8 }))
      .toThrow(/^Test: no rotation keeps every entry 8 days .*day 3\)$/)
  })

  it.each([
    ['a fractional seed', { seed: 1.5, minGap: 5 }],
    ['a missing seed', { minGap: 5 }],
    ['a zero minGap', { seed: 1, minGap: 0 }],
    ['a fractional minGap', { seed: 1, minGap: 4.5 }],
  ])('refuses %s', (_, shuffle) => {
    expect(() => shuffledSchedule([{ from: CUTOVER, count: 7 }], shuffle)).toThrow(/^Test: shuffle needs/)
  })

  it('serves a new era\'s entries first (shuffled), then the previous rotation, leaving earlier days alone', () => {
    const shuffle = { seed: 3, minGap: 5 }
    const one = shuffledSchedule([{ from: CUTOVER, count: 7 }], shuffle, 20)
    const ERA = addDays(CUTOVER, 14)
    const two = shuffledSchedule([{ from: CUTOVER, count: 7 }, { from: ERA, count: 20 }], shuffle)
    expect(two.rotation).toEqual(one.rotation)
    for (const d of days('2026-01-01', dateDay(ERA) - dateDay('2026-01-01'))) {
      expect(two.dailyIndex(d)).toBe(one.dailyIndex(d))
    }
    const added = days(ERA, 13).map(two.dailyIndex)
    expect([...added].sort((a, b) => a - b)).toEqual([...Array(13).keys()].map(i => i + 7))
    expect(added).not.toEqual([...added].sort((a, b) => a - b))
    expect(days(addDays(ERA, 13), 7).map(two.dailyIndex)).toEqual(one.rotation)
    expect(days(addDays(ERA, 20), 20).map(two.dailyIndex)).toEqual(days(ERA, 20).map(two.dailyIndex))
    expect(returnGaps(two.dailyIndex, ERA, '2028-01-01')).toEqual({ across: 20, after: [20] })
  })
})
