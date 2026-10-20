import { describe, it, expect } from 'vitest'
import { POOLS, groupPools, finishLines, ordinal } from './pools'

const ARCHIVE = { pool_id: 'wc2026', archived_at: '2026-10-20T18:36:49.190439+00:00', standings: [] }

describe('groupPools', () => {
  it('splits my pools into active and past by their pool_archive row', () => {
    const { active, past } = groupPools(['wc2026', 'octagon'], [ARCHIVE])
    expect(active.map(p => p.id)).toEqual(['octagon'])
    expect(past.map(p => p.id)).toEqual(['wc2026'])
    expect(past[0].archive).toBe(ARCHIVE)
    expect(past[0].path).toBe('/bracket')
  })

  it('leaves out registered pools I am not a member of', () => {
    expect(groupPools(['octagon'], [])).toEqual({ active: [POOLS.find(p => p.id === 'octagon')], past: [] })
    expect(groupPools([], [ARCHIVE])).toEqual({ active: [], past: [] })
  })

  it('ignores archive rows for pools I am not in', () => {
    expect(groupPools(['octagon'], [ARCHIVE]).past).toEqual([])
  })

  it('picks up a newly registered pool and moves it to past once archived', () => {
    const pools = [...POOLS, { id: 'nfl2027', name: 'NFL 2027', kind: 'Survivor pool', path: '/survivor', emoji: '🏈' }]
    expect(groupPools(['nfl2027'], [], pools).active.map(p => p.id)).toEqual(['nfl2027'])
    const later = { pool_id: 'nfl2027', archived_at: '2028-02-15T00:00:00+00:00', standings: [] }
    const { active, past } = groupPools(['nfl2027', 'wc2026'], [ARCHIVE, later], pools)
    expect(active).toEqual([])
    expect(past.map(p => p.id)).toEqual(['nfl2027', 'wc2026']) // newest archive first
  })

  it('does not mutate the registry', () => {
    const before = JSON.stringify(POOLS)
    groupPools(['wc2026', 'octagon'], [ARCHIVE])
    expect(JSON.stringify(POOLS)).toBe(before)
  })
})

describe('ordinal', () => {
  it('handles the teens and the 1/2/3 endings', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal))
      .toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th'])
  })
})

describe('finishLines', () => {
  const standings = [
    { rank: 1, user_id: 'u-ana', name: 'Ana', points: 113 },
    { rank: 2, user_id: 'u-bo', name: 'Bo', points: 98 },
    { rank: 2, user_id: 'u-cy', name: 'Cy', points: 98 },
    { rank: 4, user_id: 'u-di', name: 'Di', points: 1 },
  ]

  it('names the winner and where I finished', () => {
    expect(finishLines(standings, 'u-di')).toEqual(['🏆 Won by Ana · 113 pts', 'You finished 4th of 4 · 1 pt'])
  })

  it('says when I tied', () => {
    expect(finishLines(standings, 'u-bo')[1]).toBe('You finished tied 2nd of 4 · 98 pts')
  })

  it('tells the winner they won, with no second line', () => {
    expect(finishLines(standings, 'u-ana')).toEqual(['🏆 You won · 113 pts'])
  })

  it('handles shared wins', () => {
    const tiedTop = [{ rank: 1, user_id: 'a', name: 'Ana', points: 9 }, { rank: 1, user_id: 'b', name: 'Bo', points: 9 }]
    expect(finishLines(tiedTop, 'x')).toEqual(['🏆 Won by Ana & Bo · 9 pts'])
    expect(finishLines(tiedTop, 'b')).toEqual(['🏆 You tied for 1st · 9 pts'])
  })

  it('skips my line when I am not in the standings', () => {
    expect(finishLines(standings, 'u-zz')).toEqual(['🏆 Won by Ana · 113 pts'])
  })

  it('returns nothing for missing or empty standings', () => {
    expect(finishLines(undefined, 'u-ana')).toEqual([])
    expect(finishLines(null, 'u-ana')).toEqual([])
    expect(finishLines([], 'u-ana')).toEqual([])
  })
})
