import { describe, it, expect } from 'vitest'
import { calcStreak } from './streak'

// local YYYY-MM-DD for `daysAgo` days before today — matches calcStreak's format
function dayStr(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toLocaleDateString('en-CA')
}

describe('calcStreak', () => {
  it('is 0 with no completed days', () => {
    expect(calcStreak([])).toBe(0)
  })

  it('is 0 when today is not completed', () => {
    expect(calcStreak([dayStr(1), dayStr(2)])).toBe(0)
  })

  it('counts today alone as 1', () => {
    expect(calcStreak([dayStr(0)])).toBe(1)
  })

  it('counts a consecutive run ending today', () => {
    expect(calcStreak([dayStr(0), dayStr(1), dayStr(2), dayStr(3)])).toBe(4)
  })

  it('stops at the first missing day', () => {
    // today + yesterday present; day-2 missing makes day-3/4 unreachable
    expect(calcStreak([dayStr(0), dayStr(1), dayStr(3), dayStr(4)])).toBe(2)
  })

  it('ignores order and duplicate dates', () => {
    expect(calcStreak([dayStr(2), dayStr(0), dayStr(0), dayStr(1)])).toBe(3)
  })
})
