// Octagon (UFC pick'em) scoring — pure functions, no Supabase.
//
// Per fight: winner 10 · method +5 (only if winner correct) · round +5 (only
// if winner correct AND the fight ended in a finish AND the round matches —
// independent of the method pick) · underdog +5 (winner correct on the
// non-favorite side). One "Lock of the Night" per event doubles that fight's
// earned subtotal, bonuses included — a wrong lock just scores 0.
// Draw/No Contest: nobody scores the fight. Scratched fights are voided.
export const POINTS = { winner: 10, method: 5, round: 5, underdog: 5 }

export const METHOD_LABELS = { ko: 'KO/TKO', sub: 'Submission', dec: 'Decision' }

const FINISHES = new Set(['ko', 'sub'])

// One pick on one fight → breakdown, or null when the fight contributes
// nothing (missing, scratched, or not graded yet).
export function scoreFight(pick, fight) {
  if (!fight || fight.scratched || !fight.winner) return null
  if (fight.winner === 'draw' || fight.winner === 'nc') {
    return { points: 0, winnerHit: false, methodHit: false, roundHit: false,
             underdogHit: false, locked: !!pick.is_lock }
  }
  const winnerHit = pick.winner === fight.winner
  const methodHit = winnerHit && !!pick.method && pick.method === fight.method
  const roundHit = winnerHit && pick.round != null
    && FINISHES.has(fight.method) && pick.round === fight.end_round
  const underdogHit = winnerHit && !!fight.favorite && pick.winner !== fight.favorite
  let points = (winnerHit ? POINTS.winner : 0)
    + (methodHit ? POINTS.method : 0)
    + (roundHit ? POINTS.round : 0)
    + (underdogHit ? POINTS.underdog : 0)
  if (pick.is_lock) points *= 2
  return { points, winnerHit, methodHit, roundHit, underdogHit, locked: !!pick.is_lock }
}

// scoreEvent(picks, fights) →
//   { [user_id]: { total, winners, methods, rounds, underdogs, byFight } }
// Users appear as soon as they have any pick (total 0 until grading), so a
// live leaderboard can show everyone mid-event.
export function scoreEvent(picks, fights) {
  const byId = new Map(fights.map(f => [f.id, f]))
  const out = {}
  for (const p of picks) {
    let u = out[p.user_id]
    if (!u) {
      u = out[p.user_id] =
        { total: 0, winners: 0, methods: 0, rounds: 0, underdogs: 0, byFight: {} }
    }
    const r = scoreFight(p, byId.get(p.fight_id))
    if (!r) continue
    u.byFight[p.fight_id] = r
    u.total += r.points
    if (r.winnerHit) u.winners += 1
    if (r.methodHit) u.methods += 1
    if (r.roundHit) u.rounds += 1
    if (r.underdogHit) u.underdogs += 1
  }
  return out
}

// ISO timestamps in a uniform format compare correctly as strings.
function cmpTime(a, b) {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return a < b ? -1 : a > b ? 1 : 0
}

// Deterministic event leaderboard. Tie-breaks: total → correct winners →
// correct methods → earliest first-pick time → user id (stable last resort).
// firstPickAt: { [user_id]: earliest pick created_at for this event }.
export function eventRanking(scores, firstPickAt = {}) {
  return Object.entries(scores)
    .map(([user_id, s]) => ({ user_id, ...s }))
    .sort((a, b) =>
      b.total - a.total
      || b.winners - a.winners
      || b.methods - a.methods
      || cmpTime(firstPickAt[a.user_id], firstPickAt[b.user_id])
      || (a.user_id < b.user_id ? -1 : a.user_id > b.user_id ? 1 : 0))
}

// The lineal belt. events: [{ id, name, ranking }] in chronological order,
// ranking from eventRanking (may be empty → event skipped). First winner
// claims the belt; after that the champ retains on ties (defense +1), any
// strictly-higher total dethrones, and an absent champ (no picks) forfeits
// to the event winner.
export function deriveBelt(events) {
  let champion = null
  let defenses = 0
  const lineage = []
  for (const ev of events) {
    const ranking = ev.ranking
    if (!ranking || ranking.length === 0) continue
    const top = ranking[0]
    if (champion === null) {
      champion = top.user_id
      lineage.push({ eventId: ev.id, name: ev.name, user_id: champion, how: 'claimed' })
      continue
    }
    const champEntry = ranking.find(r => r.user_id === champion)
    if (!champEntry) {
      champion = top.user_id
      defenses = 0
      lineage.push({ eventId: ev.id, name: ev.name, user_id: champion, how: 'forfeited' })
    } else if (top.total > champEntry.total) {
      champion = top.user_id
      defenses = 0
      lineage.push({ eventId: ev.id, name: ev.name, user_id: champion, how: 'dethroned' })
    } else {
      defenses += 1
      lineage.push({ eventId: ev.id, name: ev.name, user_id: champion, how: 'defended' })
    }
  }
  return { champion, defenses, lineage }
}

// Points over the last n graded events (pass events.length for all-time).
// → [{ user_id, points, events }] sorted points desc, then user id.
export function formRanking(events, n = 6) {
  const window = n >= events.length ? events : events.slice(-n)
  const acc = {}
  for (const ev of window) {
    for (const r of ev.ranking ?? []) {
      let u = acc[r.user_id]
      if (!u) u = acc[r.user_id] = { user_id: r.user_id, points: 0, events: 0 }
      u.points += r.total
      u.events += 1
    }
  }
  return Object.values(acc)
    .sort((a, b) => b.points - a.points
      || (a.user_id < b.user_id ? -1 : a.user_id > b.user_id ? 1 : 0))
}
