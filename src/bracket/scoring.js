// Pool scoring — pure functions, no Supabase. Points escalate through the
// knockout rounds; group draws score the same as any other correct pick.
export const STAGE_POINTS = {
  group: 1,
  r32: 2,
  r16: 3,
  qf: 5,
  sf: 8,
  '3p': 5,
  final: 12,
}

export const STAGE_LABELS = {
  group: 'Groups',
  r32: 'Round of 32',
  r16: 'Round of 16',
  qf: 'Quarter-finals',
  sf: 'Semi-finals',
  '3p': 'Third place',
  final: 'Final',
}

// score(predictions, matches) → { [user_id]: { total, correct, byStage } }
// Ungraded matches (result null) and unknown stages contribute nothing.
export function score(predictions, matches) {
  const byMatch = new Map(matches.map(m => [m.id, m]))
  const out = {}
  for (const p of predictions) {
    const m = byMatch.get(p.match_id)
    if (!m || !m.result) continue
    let user = out[p.user_id]
    if (!user) user = out[p.user_id] = { total: 0, correct: 0, byStage: {} }
    if (p.pick === m.result) {
      const pts = STAGE_POINTS[m.stage] ?? 0
      user.total += pts
      user.correct += 1
      user.byStage[m.stage] = (user.byStage[m.stage] ?? 0) + pts
    }
  }
  return out
}
