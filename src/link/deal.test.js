import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { dealWords, DEAL_CUTOVER } from './deal.js'
import { addDays } from '../dateMath.js'

// A deal as the place of each tile's word in the puzzle's group-order list
// (0-3 the easiest group, 12-15 the trickiest).
const INDICES = [...Array(16).keys()]
const deal = (date) => dealWords(INDICES, date)

describe('Link tile deal', () => {
  it('keeps every board dealt before the cutover in the order players saw', () => {
    expect(DEAL_CUTOVER).toBe('2026-10-30')
    const lines = []
    for (let d = '2026-05-16'; d < DEAL_CUTOVER; d = addDays(d, 1)) lines.push(`${d} ${deal(d).join(',')}`)
    expect(lines).toHaveLength(167)
    expect(deal('2026-10-21')).toEqual([13, 6, 1, 10, 3, 7, 15, 9, 12, 0, 5, 4, 14, 2, 11, 8])
    expect(createHash('sha256').update(lines.join('\n')).digest('hex'))
      .toBe('945c7b4b116970fed88b72a1f1cbc21e48dd0b20ef2ee10ac8b82299c6082d3d')
  })

  it('from the cutover, puts each group in every spot about equally often', () => {
    const counts = Array.from({ length: 16 }, () => [0, 0, 0, 0])
    let days = 0
    for (let d = DEAL_CUTOVER; d <= '2030-12-31'; d = addDays(d, 1), days++) {
      deal(d).forEach((w, spot) => { counts[spot][w >> 2]++ })
    }
    // About a quarter each. The old deal put the easiest group in the
    // top-left spot (the first word read) on ~45% of days.
    for (const share of counts.flat().map(n => n / days)) {
      expect(share).toBeGreaterThan(0.2)
      expect(share).toBeLessThan(0.3)
    }
  })

  it('pins deals from the cutover (changing one reorders a board someone may be halfway through)', () => {
    expect(deal('2026-10-30')).toEqual([1, 3, 12, 14, 10, 11, 4, 8, 5, 7, 2, 13, 15, 6, 9, 0])
    expect(deal('2026-12-31')).toEqual([4, 12, 3, 9, 2, 15, 11, 8, 13, 10, 0, 1, 5, 14, 7, 6])
  })
})
