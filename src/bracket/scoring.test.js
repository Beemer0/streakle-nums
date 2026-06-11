import { describe, it, expect } from 'vitest'
import { score, STAGE_POINTS } from './scoring'

const match = (id, stage, result) => ({ id, stage, result })
const pred = (user_id, match_id, pick) => ({ user_id, match_id, pick })

describe('STAGE_POINTS', () => {
  it('escalates through the knockout rounds', () => {
    expect(STAGE_POINTS.group).toBe(1)
    expect(STAGE_POINTS.r32).toBe(2)
    expect(STAGE_POINTS.r16).toBe(3)
    expect(STAGE_POINTS.qf).toBe(5)
    expect(STAGE_POINTS.sf).toBe(8)
    expect(STAGE_POINTS['3p']).toBe(5)
    expect(STAGE_POINTS.final).toBe(12)
  })
})

describe('score', () => {
  it('awards stage points for a correct pick', () => {
    const result = score([pred('u1', 1, 'a')], [match(1, 'group', 'a')])
    expect(result.u1).toEqual({ total: 1, correct: 1, byStage: { group: 1 } })
  })

  it('awards the right points for every stage', () => {
    for (const [stage, pts] of Object.entries(STAGE_POINTS)) {
      const result = score([pred('u1', 1, 'b')], [match(1, stage, 'b')])
      expect(result.u1.total).toBe(pts)
    }
  })

  it('scores a correct draw pick in the group stage', () => {
    const result = score([pred('u1', 1, 'draw')], [match(1, 'group', 'draw')])
    expect(result.u1.total).toBe(1)
  })

  it('gives nothing for a wrong pick', () => {
    const result = score([pred('u1', 1, 'a')], [match(1, 'final', 'b')])
    expect(result.u1).toEqual({ total: 0, correct: 0, byStage: {} })
  })

  it('ignores ungraded matches', () => {
    const result = score([pred('u1', 1, 'a')], [match(1, 'group', null)])
    expect(result.u1).toBeUndefined()
  })

  it('ignores predictions for unknown matches', () => {
    const result = score([pred('u1', 99, 'a')], [match(1, 'group', 'a')])
    expect(result.u1).toBeUndefined()
  })

  it('scores unknown stages as zero points but still counts them correct', () => {
    const result = score([pred('u1', 1, 'a')], [match(1, 'mystery', 'a')])
    expect(result.u1).toEqual({ total: 0, correct: 1, byStage: { mystery: 0 } })
  })

  it('aggregates totals and per-stage breakdown across users', () => {
    const matches = [
      match(1, 'group', 'a'),
      match(2, 'group', 'draw'),
      match(3, 'qf', 'b'),
      match(4, 'final', 'a'),
    ]
    const predictions = [
      pred('u1', 1, 'a'),    // +1
      pred('u1', 2, 'draw'), // +1
      pred('u1', 3, 'a'),    // miss
      pred('u1', 4, 'a'),    // +12
      pred('u2', 1, 'b'),    // miss
      pred('u2', 3, 'b'),    // +5
    ]
    const result = score(predictions, matches)
    expect(result.u1).toEqual({ total: 14, correct: 3, byStage: { group: 2, final: 12 } })
    expect(result.u2).toEqual({ total: 5, correct: 1, byStage: { qf: 5 } })
  })
})
