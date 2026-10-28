import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { PUZZLES } from './puzzles.js'
import { dailyPuzzleIndex, getDailyPuzzle, LINK_CUTOVER, ROTATION, ERAS } from './schedule.js'
import { addDays, dateDay } from '../dateMath.js'

const legacy = (d) => parseInt(d.replace(/-/g, ''), 10) % 71

describe('Link schedule', () => {
  it('keeps every shipped date on its old puzzle', () => {
    expect(LINK_CUTOVER).toBe('2026-10-25')
    for (let d = '2025-01-01'; d < LINK_CUTOVER; d = addDays(d, 1)) {
      expect(dailyPuzzleIndex(d)).toBe(legacy(d))
    }
  })

  // A shipped puzzle changes only by a content correction (a filler word, a
  // wrong fact, a second valid split): made before its next day starts in any
  // time zone, never while it is anyone's today, and logged here with the pin.
  //   2026-10-27  #43 Go off on a ___: LIMB -> TIRADE (LIMB read as a tree part)
  it("changes a shipped puzzle's content only by a logged correction", () => {
    expect(createHash('sha256').update(JSON.stringify(PUZZLES.slice(0, 71))).digest('hex'))
      .toBe('9bd9db534fa26491d5788b84ede9719b5d045d9ff3de9e432235852856164be1')
  })

  it('pins the rotation from the cutover', () => {
    expect(ERAS).toEqual([{ from: '2026-10-25', count: 71 }])
    expect(ROTATION).toEqual([...Array(32).keys()].map(i => i + 39).concat([...Array(39).keys()]))
    expect(['2026-10-24', '2026-10-25', '2026-10-26', '2026-11-01', '2026-12-31'].map(dailyPuzzleIndex)).toEqual([38, 39, 40, 46, 35])
    expect(getDailyPuzzle('2026-11-01')).toBe(PUZZLES[46])
  })

  it('never brings a puzzle back within a full rotation, shipped history included', () => {
    const last = new Map()
    let minGap = Infinity
    for (let d = '2026-05-16'; d <= '2030-12-31'; d = addDays(d, 1)) {
      const i = dailyPuzzleIndex(d)
      if (d >= LINK_CUTOVER && last.has(i)) minGap = Math.min(minGap, dateDay(d) - dateDay(last.get(i)))
      last.set(i, d)
    }
    expect(minGap).toBe(PUZZLES.length)
  })
})
