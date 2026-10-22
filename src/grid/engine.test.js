import { describe, it, expect } from 'vitest'
import { mixSeed, gridKey, canFillBoard, correctedAnswers, withFranchises, isLegacyDate, GRID_CUTOVER, answerEras, answerTimeline } from './engine.js'

describe('grid engine', () => {
  it('splits shipped dates from the cutover', () => {
    expect(GRID_CUTOVER).toBe('2026-10-25')
    expect(isLegacyDate('2026-10-24')).toBe(true)
    expect(isLegacyDate('2026-10-25')).toBe(false)
  })

  it("never gives two dates the same attempt stream (the old +997 seeding did)", () => {
    // 20261102 = 20260105 + 997: the legacy streams of these attempts were equal.
    expect(mixSeed(20261102, 0, 0)).not.toBe(mixSeed(20260105, 0, 1))
    const seen = new Set()
    for (let day = 20261023; day < 20261023 + 400; day++) {
      for (let attempt = 0; attempt < 50; attempt++) seen.add(mixSeed(day, 0, attempt))
    }
    expect(seen.size).toBe(400 * 50)
  })

  it('treats the same six headers in either orientation as one grid', () => {
    const key = gridKey(['A', 'B', 'C'], ['D', 'E', 'F'])
    expect(gridKey(['C', 'A', 'B'], ['F', 'D', 'E'])).toBe(key)
    expect(gridKey(['D', 'E', 'F'], ['A', 'B', 'C'])).toBe(key)
    expect(gridKey(['A', 'B', 'D'], ['C', 'E', 'F'])).not.toBe(key)
  })

  it('fills a board only with distinct answers', () => {
    const a = { n: 'a' }, b = { n: 'b' }
    expect(canFillBoard([[a, b], [a]])).toBe(true)
    expect(canFillBoard([[a], [a]])).toBe(false)
  })

  it('applies corrections without touching the shipped list', () => {
    const shipped = [{ n: 'X', t: ['STL', 'NYG'], a: ['PRO_BOWL'] }, { n: 'Y', t: ['DAL'], a: [] }]
    const fixed = correctedAnswers(shipped, { X: { t: { add: ['MIN'], remove: ['NYG'] }, a: { remove: ['PRO_BOWL'] } } }, [{ n: 'Z', t: ['GB'], a: [] }])
    expect(fixed.map(p => [p.n, p.t, p.a])).toEqual([['X', ['STL', 'MIN'], []], ['Y', ['DAL'], []], ['Z', ['GB'], []]])
    expect(shipped[0]).toEqual({ n: 'X', t: ['STL', 'NYG'], a: ['PRO_BOWL'] })
    expect(() => correctedAnswers(shipped, { Nobody: { t: { add: ['GB'] } } })).toThrow(/Nobody/)
  })

  it('folds relocated predecessors into their franchise', () => {
    const [warner, brady] = withFranchises([{ n: 'Warner', t: ['STL', 'ARI'] }, { n: 'Brady', t: ['NE'] }], { LAR: ['STL'] })
    expect(warner.t).toEqual(['STL', 'ARI', 'LAR'])
    expect(brady.t).toEqual(['NE'])
  })

  it('runs correction batches as dated eras, each lenient on boards dealt before it', () => {
    const shipped = [{ n: 'X', t: ['NYG'] }, { n: 'Y', t: ['DAL'] }]
    const eras = answerEras(shipped, [
      { from: '2026-10-25', corrections: { X: { t: { remove: ['NYG'], add: ['STL'] } } } },
      { from: '2027-03-01', corrections: { Y: { t: { add: ['NYG'] } } } },
    ], { LAR: ['STL'] })
    expect(eras.map(e => e.from)).toEqual(['', '2026-10-25', '2027-03-01'])
    expect(eras[1].answers[0].t).toEqual(['STL', 'LAR'])
    expect(eras[2].answers.map(p => p.t)).toEqual([['STL', 'LAR'], ['DAL', 'NYG']])

    const fits = (p, c) => p.t.includes(c)
    const { latest, eraOf } = answerTimeline(eras, fits)
    expect(latest).toBe(eras[2].answers)
    expect(eraOf('2026-10-24').fits(latest[0], 'NYG')).toBe(true) // shipped board: old tag still counts
    expect(eraOf('2026-10-25').fits(latest[0], 'NYG')).toBe(false)
    expect(eraOf('2026-10-25').fits(latest[1], 'NYG')).toBe(true) // a later addition counts on older boards
    expect(eraOf('2027-03-01').fits(latest[0], 'LAR')).toBe(true)

    expect(() => answerEras(shipped, [{ from: '2026-10-01', corrections: {} }])).toThrow(/2026-10-01/)
    expect(() => answerEras(shipped, [{ from: '2027-01-01', corrections: {} }, { from: '2026-12-01', corrections: {} }])).toThrow(/2026-12-01/)
  })
})
