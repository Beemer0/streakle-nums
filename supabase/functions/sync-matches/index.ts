// Syncs the World Cup 2026 schedule + results from football-data.org into the
// `matches` table. Idempotent: the first run seeds all 104 rows; later runs
// update results and fill in knockout teams as bracket slots resolve.
//
// Deploy:  supabase functions deploy sync-matches
// Secrets: FOOTBALL_DATA_TOKEN (free token from football-data.org).
//          SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected by Supabase.
// Cron:    see the commented block at the bottom of supabase/schema.sql.
import { createClient } from 'jsr:@supabase/supabase-js@2'

// football-data.org stage names → our stage keys. Both naming conventions for
// each knockout round are mapped because the 48-team format is new to the API.
const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: 'group',
  LAST_32: 'r32',
  ROUND_OF_32: 'r32',
  LAST_16: 'r16',
  ROUND_OF_16: 'r16',
  QUARTER_FINALS: 'qf',
  SEMI_FINALS: 'sf',
  THIRD_PLACE: '3p',
  THIRD_PLACE_PLAYOFF: '3p',
  FINAL: 'final',
}

const WINNER_MAP: Record<string, string> = {
  HOME_TEAM: 'a',
  AWAY_TEAM: 'b',
  DRAW: 'draw',
}

Deno.serve(async () => {
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
    headers: { 'X-Auth-Token': Deno.env.get('FOOTBALL_DATA_TOKEN')! },
  })
  if (!res.ok) {
    return new Response(`football-data.org responded ${res.status}`, { status: 502 })
  }
  const { matches } = await res.json()
  if (!Array.isArray(matches) || matches.length === 0) {
    return new Response('football-data.org returned no matches', { status: 502 })
  }

  const finished = (m: any) => m.status === 'FINISHED' || m.status === 'AWARDED'
  const rows = matches.map((m: any) => ({
    id: m.id,
    stage: STAGE_MAP[m.stage] ?? m.stage?.toLowerCase() ?? 'group',
    group_code: m.group ? m.group.replace('GROUP_', '') : null,
    kickoff_at: m.utcDate,
    team_a: m.homeTeam?.tla ?? null,
    team_b: m.awayTeam?.tla ?? null,
    team_a_locked: !!m.homeTeam?.tla,
    team_b_locked: !!m.awayTeam?.tla,
    result: finished(m) ? WINNER_MAP[m.score?.winner] ?? null : null,
    result_source: finished(m) && WINNER_MAP[m.score?.winner] ? 'api' : null,
    // fullTime holds the running score while IN_PLAY and the final once FINISHED;
    // it's null before kickoff. So this captures live scores too.
    score_a: m.score?.fullTime?.home ?? null,
    score_b: m.score?.fullTime?.away ?? null,
    status: m.status ?? null,
    updated_at: new Date().toISOString(),
  }))

  // Matches the admin graded by hand are frozen against API overwrites: strip
  // the result columns from those rows. Two upserts because PostgREST bulk
  // payloads must have uniform keys per request.
  const { data: adminRows, error: adminErr } = await sb
    .from('matches').select('id').eq('result_source', 'admin')
  if (adminErr) return new Response(adminErr.message, { status: 500 })
  const adminIds = new Set((adminRows ?? []).map((r) => r.id))

  const fresh = rows.filter((r) => !adminIds.has(r.id))
  const frozen = rows
    .filter((r) => adminIds.has(r.id))
    .map(({ result: _r, result_source: _s, score_a: _sa, score_b: _sb, ...rest }) => rest)

  for (const batch of [fresh, frozen]) {
    if (!batch.length) continue
    const { error } = await sb.from('matches').upsert(batch, { onConflict: 'id' })
    if (error) return new Response(error.message, { status: 500 })
  }

  return Response.json({
    synced: rows.length,
    graded: rows.filter((r) => r.result).length,
    adminProtected: frozen.length,
  })
})
