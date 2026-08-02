import { describe, it, expect } from 'vitest'
import { scoreFight, scoreEvent, eventRanking, deriveBelt, formRanking } from './scoring.js'

// Fight + pick factories with sensible defaults; tests override what matters.
const fight = (over = {}) => ({
  id: 1, event_id: 1, bout_order: 1, fighter_a: 'A', fighter_b: 'B',
  rounds: 3, favorite: null, scratched: false,
  winner: null, method: null, end_round: null, ...over,
})
const pick = (over = {}) => ({
  user_id: 'u1', fight_id: 1, winner: 'a', method: null, round: null,
  is_lock: false, created_at: '2026-08-01T00:00:00+00:00', ...over,
})

describe('scoreFight', () => {
  it('pays 10 for a bare correct winner', () => {
    const r = scoreFight(pick(), fight({ winner: 'a', method: 'dec' }))
    expect(r.points).toBe(10)
    expect(r.winnerHit).toBe(true)
  })

  it('pays 0 for a wrong winner', () => {
    const r = scoreFight(pick({ winner: 'b' }), fight({ winner: 'a', method: 'ko', end_round: 2 }))
    expect(r.points).toBe(0)
  })

  it('adds +5 underdog when the pick beat the flagged favorite', () => {
    const f = fight({ winner: 'b', method: 'dec', favorite: 'a' })
    expect(scoreFight(pick({ winner: 'b' }), f).points).toBe(15)
  })

  it('no underdog bonus for picking the favorite, or when none is flagged', () => {
    expect(scoreFight(pick(), fight({ winner: 'a', method: 'dec', favorite: 'a' })).points).toBe(10)
    expect(scoreFight(pick(), fight({ winner: 'a', method: 'dec' })).points).toBe(10)
  })

  it('method bonus only pays on a correct winner', () => {
    const f = fight({ winner: 'a', method: 'ko', end_round: 1 })
    expect(scoreFight(pick({ method: 'ko' }), f).points).toBe(15)
    expect(scoreFight(pick({ winner: 'b', method: 'ko' }), f).points).toBe(0)
    expect(scoreFight(pick({ method: 'sub' }), f).points).toBe(10) // wrong method
  })

  it('round bonus needs a finish and a round match', () => {
    const ko2 = fight({ winner: 'a', method: 'ko', end_round: 2 })
    expect(scoreFight(pick({ round: 2 }), ko2).points).toBe(15)
    expect(scoreFight(pick({ round: 3 }), ko2).points).toBe(10)
    // decisions never pay the round bonus
    const dec = fight({ winner: 'a', method: 'dec', end_round: 3 })
    expect(scoreFight(pick({ round: 3 }), dec).points).toBe(10)
  })

  it('round bonus is independent of the method pick', () => {
    const sub3 = fight({ winner: 'a', method: 'sub', end_round: 3 })
    // wrong method pick, right round: 10 + 5
    expect(scoreFight(pick({ method: 'ko', round: 3 }), sub3).points).toBe(15)
    // no method pick at all, right round
    expect(scoreFight(pick({ round: 3 }), sub3).points).toBe(15)
  })

  it('lock doubles the whole subtotal, bonuses included', () => {
    const f = fight({ winner: 'b', method: 'sub', end_round: 4, favorite: 'a' })
    const p = pick({ winner: 'b', method: 'sub', round: 4, is_lock: true })
    // (10 winner + 5 method + 5 round + 5 underdog) × 2
    expect(scoreFight(p, f).points).toBe(50)
  })

  it('a wrong lock just scores 0', () => {
    const r = scoreFight(pick({ winner: 'b', is_lock: true }), fight({ winner: 'a', method: 'dec' }))
    expect(r.points).toBe(0)
    expect(r.locked).toBe(true)
  })

  it('draw and NC pay nobody', () => {
    expect(scoreFight(pick(), fight({ winner: 'draw' })).points).toBe(0)
    expect(scoreFight(pick({ is_lock: true }), fight({ winner: 'nc' })).points).toBe(0)
  })

  it('scratched and ungraded fights are void (null)', () => {
    expect(scoreFight(pick(), fight({ scratched: true, winner: 'a', method: 'ko' }))).toBeNull()
    expect(scoreFight(pick(), fight())).toBeNull()
    expect(scoreFight(pick(), undefined)).toBeNull()
  })
})

describe('scoreEvent', () => {
  const fights = [
    fight({ id: 1, winner: 'a', method: 'ko', end_round: 1 }),
    fight({ id: 2, winner: 'b', method: 'dec', favorite: 'a' }),
    fight({ id: 3, scratched: true }),
    fight({ id: 4 }), // ungraded
  ]

  it('aggregates totals and hit counts per user', () => {
    const picks = [
      pick({ fight_id: 1, method: 'ko', round: 1, is_lock: true }), // (10+5+5)×2 = 40
      pick({ fight_id: 2, winner: 'b' }),                           // 10+5 underdog
      pick({ fight_id: 3 }),                                        // void
      pick({ fight_id: 4, winner: 'b' }),                           // ungraded
    ]
    const s = scoreEvent(picks, fights)
    expect(s.u1.total).toBe(55)
    expect(s.u1.winners).toBe(2)
    expect(s.u1.methods).toBe(1)
    expect(s.u1.rounds).toBe(1)
    expect(s.u1.underdogs).toBe(1)
    expect(Object.keys(s.u1.byFight)).toEqual(['1', '2'])
  })

  it('lists a user with 0 before any of their fights are graded', () => {
    const s = scoreEvent([pick({ user_id: 'u2', fight_id: 4 })], fights)
    expect(s.u2.total).toBe(0)
  })
})

describe('eventRanking', () => {
  it('breaks ties total → winners → methods → earliest pick → user id', () => {
    const mk = (total, winners, methods) =>
      ({ total, winners, methods, rounds: 0, underdogs: 0, byFight: {} })
    const scores = {
      u1: mk(20, 2, 0),
      u2: mk(25, 1, 1),  // highest total
      u3: mk(20, 2, 1),  // ties u1 on total+winners, wins on methods
      u4: mk(20, 1, 2),  // loses to u1/u3 on winners
      u5: mk(20, 2, 1),  // ties u3 everywhere → earlier pick wins
    }
    const firstPickAt = {
      u3: '2026-08-01T12:00:00+00:00',
      u5: '2026-08-01T09:00:00+00:00',
    }
    const order = eventRanking(scores, firstPickAt).map(r => r.user_id)
    expect(order).toEqual(['u2', 'u5', 'u3', 'u1', 'u4'])
  })
})

describe('deriveBelt', () => {
  const ev = (id, ranking) => ({ id, name: `UFC ${id}`, ranking })
  const row = (user_id, total) =>
    ({ user_id, total, winners: 0, methods: 0, rounds: 0, underdogs: 0 })

  it('first event winner claims the belt', () => {
    const b = deriveBelt([ev(1, [row('u1', 30), row('u2', 20)])])
    expect(b.champion).toBe('u1')
    expect(b.defenses).toBe(0)
    expect(b.lineage).toEqual([{ eventId: 1, name: 'UFC 1', user_id: 'u1', how: 'claimed' }])
  })

  it('champ retains on a tie and counts a defense', () => {
    const b = deriveBelt([
      ev(1, [row('u1', 30)]),
      ev(2, [row('u2', 25), row('u1', 25)]), // u2 tie-broken first, but only a tie
    ])
    expect(b.champion).toBe('u1')
    expect(b.defenses).toBe(1)
    expect(b.lineage[1].how).toBe('defended')
  })

  it('a strictly higher scorer dethrones', () => {
    const b = deriveBelt([
      ev(1, [row('u1', 30)]),
      ev(2, [row('u2', 26), row('u1', 25)]),
    ])
    expect(b.champion).toBe('u2')
    expect(b.defenses).toBe(0)
    expect(b.lineage[1].how).toBe('dethroned')
  })

  it('an absent champ forfeits to the event winner', () => {
    const b = deriveBelt([
      ev(1, [row('u1', 30)]),
      ev(2, [row('u2', 5)]), // u1 made no picks
    ])
    expect(b.champion).toBe('u2')
    expect(b.lineage[1].how).toBe('forfeited')
  })

  it('skips events with no graded participants', () => {
    const b = deriveBelt([ev(1, []), ev(2, [row('u1', 10)])])
    expect(b.champion).toBe('u1')
    expect(b.lineage).toHaveLength(1)
  })
})

describe('formRanking', () => {
  const ev = (id, totals) => ({
    id,
    name: `UFC ${id}`,
    ranking: Object.entries(totals).map(([user_id, total]) => ({ user_id, total })),
  })

  it('sums only the last n events', () => {
    const events = [
      ev(1, { u1: 50 }),
      ev(2, { u1: 10, u2: 20 }),
      ev(3, { u1: 10, u2: 5 }),
    ]
    const form = formRanking(events, 2)
    expect(form).toEqual([
      { user_id: 'u2', points: 25, events: 2 },
      { user_id: 'u1', points: 20, events: 2 },
    ])
  })

  it('handles fewer events than the window (all-time)', () => {
    const events = [ev(1, { u1: 50 }), ev(2, { u2: 20 })]
    const all = formRanking(events, 6)
    expect(all).toEqual([
      { user_id: 'u1', points: 50, events: 1 },
      { user_id: 'u2', points: 20, events: 1 },
    ])
  })
})
