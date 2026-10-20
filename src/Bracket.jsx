import { useState, useEffect, useMemo, useCallback, useRef, useSyncExternalStore } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from './supabase'
import UserMenu from './UserMenu'
import { useSeo, PAGE_SEO } from './seo'
import { score, STAGE_LABELS, STAGE_POINTS } from './bracket/scoring'
import { flagUrl } from './bracket/flags'
import { clickableProps } from './a11y'

const GOLD = '#C9A84C', CARD = '#1C1A16', BORDER = '#2C2820', INK = '#F5F0E8', MUTED = '#7A6E5F'

// The viewer's local timezone abbreviation (e.g. "EDT"), shown so everyone knows
// kickoff times are in their own local time. Computed once; won't flip mid-session.
const TZ_ABBR = (() => {
  try {
    return new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
      .formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value ?? ''
  } catch { return '' }
})()

const css = `
@keyframes slideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0.25}}
.bk-row{display:flex;align-items:center;gap:10px}
.bk-time{width:84px;flex-shrink:0}
.bk-btns{display:flex;gap:6px;flex:1;justify-content:center;min-width:0}
.bk-btn{flex:1 1 0;max-width:104px;min-width:0}
.bk-status{width:52px;flex-shrink:0;text-align:right;font-size:12px}
@media(max-width:520px){
  .bk-row{gap:6px}
  .bk-time{width:58px}
  .bk-kick{font-size:11px !important}
  .bk-badge{font-size:8.5px !important}
  .bk-btn{font-size:12px !important;padding:8px 2px !important}
  .bk-btns{gap:4px}
  .bk-status{width:34px;font-size:11px}
}
`

function fmtDay(iso) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
function stageBadge(m) {
  if (m.stage === 'group') return m.group_code ? `Group ${m.group_code}` : 'Groups'
  return STAGE_LABELS[m.stage] ?? m.stage
}

function Flag({ code, size = 16 }) {
  const src = flagUrl(code)
  if (!src) return null
  return (
    <img
      src={src} alt="" width={size} height={Math.round(size * 0.75)} loading="lazy"
      style={{ borderRadius: 2, objectFit: 'cover', display: 'block', flexShrink: 0 }}
    />
  )
}

// Clock that re-renders subscribers when the 30s bucket rolls over, so
// kickoff locks flip without a reload. The granularity is fine — the lock
// that matters is server-side (RLS checks kickoff_at > now()).
// Match rows are read-only now (every match has kicked off), so picking is a no-op.
const noop = () => {}

const NOW_BUCKET_MS = 30000
const subscribeClock = (cb) => {
  const t = setInterval(cb, 5000)
  return () => clearInterval(t)
}
const getNowBucket = () => Math.floor(Date.now() / NOW_BUCKET_MS)
function useNow() {
  return useSyncExternalStore(subscribeClock, getNowBucket) * NOW_BUCKET_MS
}

export default function Bracket() {
  useSeo(PAGE_SEO.bracket)
  const { user } = useAuth()
  const [roster, setRoster] = useState(null) // null = loading, [] = not a member
  const [matches, setMatches] = useState([])
  const [preds, setPreds] = useState([])
  const [archive, setArchive] = useState(null) // the frozen pool_archive row (members only)
  const [view, setView] = useState('board')
  const [showRules, setShowRules] = useState(false)
  const [openMatch, setOpenMatch] = useState(null)
  const [openStanding, setOpenStanding] = useState(null)
  const [openPastDays, setOpenPastDays] = useState(() => new Set()) // finished days the user re-opened
  const [tourTab, setTourTab] = useState('groups') // groups | bracket
  const [historyTeam, setHistoryTeam] = useState(null) // team code whose WC history modal is open
  const currentDayRef = useRef(null)
  const didScrollRef = useRef(false)
  const now = useNow()

  const me = user && Array.isArray(roster) ? roster.find(r => r.user_id === user.id) : null
  const isMember = !!me

  // The pool ended with the 2026-07-19 final and is archived: one load, no
  // polling (the results sync is switched off), nothing writable.
  const loadAll = useCallback(() => {
    // For non-members RLS returns empty sets for all four — harmless.
    return Promise.all([
      supabase.rpc('get_pool_members'),
      supabase.from('matches').select('*').order('kickoff_at'),
      supabase.from('predictions').select('user_id,match_id,pick,locked_at'),
      supabase.from('pool_archive').select('tournament,standings,archived_at').eq('pool_id', 'wc2026').maybeSingle(),
    ]).then(([r, m, p, a]) => {
      setRoster(r.data ?? [])
      setMatches(m.data ?? [])
      setPreds(p.data ?? [])
      setArchive(a.data ?? null)
    })
  }, [])

  useEffect(() => { if (user) loadAll() }, [user, loadAll])

  const myPicks = useMemo(() => {
    const map = {}
    if (user) for (const p of preds) if (p.user_id === user.id) map[p.match_id] = p.pick
    return map
  }, [preds, user])

  const myLocked = useMemo(() => {
    const s = new Set()
    if (user) for (const p of preds) if (p.user_id === user.id && p.locked_at) s.add(p.match_id)
    return s
  }, [preds, user])

  const days = useMemo(() => {
    const map = new Map()
    for (const m of matches) {
      const key = fmtDay(m.kickoff_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(m)
    }
    return [...map.entries()]
  }, [matches])

  // Per-day metadata for the Picks view. A day is "past" once its LAST match has
  // kicked off — so a day straddling now stays expanded and keeps its pickable
  // rows + Lock-in button. Past days collapse to a one-line summary by default.
  const pickDays = useMemo(() => days.map(([day, dayMatches]) => {
    const lastKick = Math.max(...dayMatches.map(m => new Date(m.kickoff_at).getTime()))
    const settled = dayMatches.filter(m => !m.excluded && m.result)
    const correct = settled.filter(m => myPicks[m.id] === m.result).length
    return { day, dayMatches, isPast: lastKick <= now, scored: settled.length, correct }
  }), [days, now, myPicks])
  const currentDayLabel = pickDays.find(d => !d.isPast)?.day ?? null

  // Land the user on the current day once, instead of scrolling past finished days.
  useEffect(() => {
    if (view !== 'picks' || didScrollRef.current || !currentDayRef.current) return
    didScrollRef.current = true
    currentDayRef.current.scrollIntoView({ block: 'start', behavior: 'auto' })
  }, [view, currentDayLabel, matches.length])

  const togglePastDay = (day) => setOpenPastDays(s => {
    const n = new Set(s); n.has(day) ? n.delete(day) : n.add(day); return n
  })

  const onTeam = useCallback((code) => { if (code) setHistoryTeam(code) }, [])

  // Final standings come from the frozen snapshot, so they never change even
  // if a member later deletes their account (their picks would cascade away).
  // Avatars still come from the live roster. Without a snapshot, compute live.
  const standings = useMemo(() => {
    if (!Array.isArray(roster)) return []
    const avatar = new Map(roster.map(r => [r.user_id, r.avatar_url]))
    if (Array.isArray(archive?.standings)) {
      return archive.standings.map(s => ({
        user_id: s.user_id, display_name: s.name, avatar_url: avatar.get(s.user_id) ?? null,
        rank: s.rank, total: s.points, correct: s.correct, byStage: s.by_stage ?? {},
      }))
    }
    const totals = score(preds, matches)
    const sorted = roster
      .map(r => ({ ...r, ...(totals[r.user_id] ?? { total: 0, correct: 0, byStage: {} }) }))
      .sort((a, b) => b.total - a.total || b.correct - a.correct)
    // Ties (same points and correct picks) share a rank: 1, 2, 2, 4.
    let rank = 0
    return sorted.map((s, i) => {
      if (i === 0 || s.total !== sorted[i - 1].total || s.correct !== sorted[i - 1].correct) rank = i + 1
      return { ...s, rank }
    })
  }, [roster, preds, matches, archive])

  const matchById = useMemo(() => new Map(matches.map(m => [m.id, m])), [matches])

  // Live group tables from match results. Ranks by points, then goal difference,
  // then goals scored, then alphabetical (FIFA order, minus head-to-head). GD/GF
  // need the score_a/score_b the sync now stores.
  const cmpTeam = (x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.team.localeCompare(y.team)
  const groupTables = useMemo(() => {
    const groups = {}
    for (const m of matches) {
      // Excluded matches are out of the POOL (unpickable/unscored), but they're
      // still real tournament games, so they DO count toward group standings.
      if (m.stage !== 'group' || !m.group_code) continue
      const g = (groups[m.group_code] ??= {})
      for (const t of [m.team_a, m.team_b]) {
        if (t && !g[t]) g[t] = { team: t, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }
      }
      if (!m.result) continue
      const a = g[m.team_a], b = g[m.team_b]
      if (!a || !b) continue
      if (m.score_a != null && m.score_b != null) {
        a.gf += m.score_a; a.ga += m.score_b; b.gf += m.score_b; b.ga += m.score_a
      }
      if (m.result === 'a') { a.w++; a.pts += 3; b.l++ }
      else if (m.result === 'b') { b.w++; b.pts += 3; a.l++ }
      else { a.d++; b.d++; a.pts++; b.pts++ }
    }
    return Object.entries(groups)
      .map(([code, teams]) => [code, Object.values(teams).sort(cmpTeam)])
      .sort((a, b) => a[0].localeCompare(b[0]))
  }, [matches])

  // The 8 best 3rd-placed teams also advance in the 48-team format.
  const qualifyingThirds = useMemo(() => {
    const thirds = groupTables.map(([, teams]) => teams[2]).filter(Boolean)
    return new Set([...thirds].sort(cmpTeam).slice(0, 8).map(t => t.team))
  }, [groupTables])

  // A participant's settled picks, oldest first (form strip reads left→right;
  // the list reverses to newest-first). Only matches that have kicked off and
  // are graded + non-excluded — NEVER upcoming. RLS already withholds other
  // members' pre-kickoff picks; the explicit kickoff check makes the same rule
  // legible here and guards the viewer's own row against an early-set result.
  const historyFor = useCallback((userId) => {
    const out = []
    for (const p of preds) {
      if (p.user_id !== userId) continue
      const m = matchById.get(p.match_id)
      if (!m || m.excluded || !m.result) continue
      if (new Date(m.kickoff_at).getTime() > now) continue
      const correct = p.pick === m.result
      out.push({ m, pick: p.pick, correct, pts: correct ? (STAGE_POINTS[m.stage] ?? 0) : 0 })
    }
    out.sort((a, b) => new Date(a.m.kickoff_at) - new Date(b.m.kickoff_at))
    return out
  }, [preds, matchById, now])

  // Others' picks only become visible post-kickoff via RLS, so a page left open
  // since before kickoff needs a refetch when a match is expanded. Render cached
  // picks immediately; the fresh rows land async. Guard against an empty/failed
  // refetch clobbering cached data.
  const refreshMatchPreds = useCallback(async (id) => {
    const { data, error } = await supabase
      .from('predictions').select('user_id,match_id,pick,locked_at').eq('match_id', id)
    if (error || !data) return
    setPreds(ps => [...ps.filter(p => p.match_id !== id), ...data])
  }, [])

  const toggleMatch = (m) => {
    setOpenMatch(cur => {
      const next = cur === m.id ? null : m.id
      if (next) refreshMatchPreds(m.id)
      return next
    })
  }

  const header = (
    <>
      <style>{css}</style>
      <UserMenu />
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '12px 16px 0', minHeight: 44 }}>
        <a href="/" style={{ color: GOLD, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>← Back</a>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 2 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: 2, color: '#fff', margin: 0 }}>BRACKET</h1>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginTop: 2 }}>
          World Cup 2026 · Final results
        </div>
        <button onClick={() => setShowRules(true)} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, color: GOLD, cursor: 'pointer', fontSize: 12, padding: '3px 12px', marginTop: 8 }}>
          📖 Rules
        </button>
      </div>
    </>
  )

  const footer = (
    <div style={{ marginTop: 40, marginBottom: 24, fontSize: 12, color: '#5A5040', textAlign: 'center' }}>
      <a href="/privacy" style={{ color: '#5A5040', textDecoration: 'none' }}>Privacy Policy / Politique de confidentialité</a>
    </div>
  )

  const page = (children) => (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', color: INK, position: 'relative' }}>
      {header}
      {children}
      {footer}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {historyTeam && <TeamHistoryModal team={historyTeam} matches={matches} onClose={() => setHistoryTeam(null)} />}
    </main>
  )

  // ── Signed out ──
  if (!user) {
    return page(
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '36px 32px', maxWidth: 340, width: '90%', textAlign: 'center', marginTop: 48, animation: 'slideUp 0.4s ease' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>⚽</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Private prediction pool</div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 24, lineHeight: 1.6 }}>
          The World Cup 2026 pool has ended. Members can sign in to see the final standings and everyone's picks.
        </div>
        <a href="/login" style={{ display: 'block', background: GOLD, color: '#0F0E0C', borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
          Sign in
        </a>
      </div>
    )
  }

  // ── Loading ──
  if (roster === null) {
    return page(<div style={{ marginTop: 64, fontSize: 14, color: MUTED }}>Loading the pool…</div>)
  }

  // ── Signed in, not a member: registration is closed ──
  if (!isMember) {
    return page(
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '36px 32px', maxWidth: 340, width: '90%', textAlign: 'center', marginTop: 48, animation: 'slideUp 0.4s ease' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🏁</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>This pool has ended</div>
        <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
          The World Cup 2026 pool closed after the final. Its results are visible to members only.
        </div>
      </div>
    )
  }

  // ── Member: the archived results ──
  const tabs = [
    ['board', 'Standings'],
    ['picks', 'My picks'],
    ['tournament', 'Tournament'],
  ]
  const champions = standings.filter(s => s.rank === 1)
  const cup = archive?.tournament
  const myScored = pickDays.reduce((n, d) => n + d.scored, 0)
  const myCorrect = pickDays.reduce((n, d) => n + d.correct, 0)

  return page(
    <>
      {champions.length > 0 && (
        <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 12, padding: '14px 20px', marginTop: 14, maxWidth: 420, width: '90%', boxSizing: 'border-box', textAlign: 'center', animation: 'slideUp 0.4s ease' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: GOLD, textTransform: 'uppercase' }}>🏆 Pool champion</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: INK, marginTop: 4 }}>
            {champions.map(s => s.display_name ?? 'Player').join(' & ')}
          </div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{champions[0].total} points · {champions[0].correct} correct picks</div>
          {cup?.champion && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12, color: '#A89880', marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
              World Cup won by <Flag code={cup.champion} size={14} /> <b style={{ color: INK }}>{cup.champion}</b>
              {cup.runner_up && <>· {cup.final_score} vs <Flag code={cup.runner_up} size={14} /> {cup.runner_up}</>}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 14, marginBottom: 18 }}>
        {tabs.map(([key, label]) => (
          <button key={key} onClick={() => setView(key)} style={{
            background: view === key ? GOLD : 'none',
            border: `1px solid ${view === key ? GOLD : BORDER}`,
            borderRadius: 20, color: view === key ? '#0F0E0C' : GOLD,
            cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '6px 18px',
            transition: 'background 0.15s',
          }}>
            {label}
          </button>
        ))}
      </div>

      {matches.length === 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px', maxWidth: 420, width: '90%', textAlign: 'center', fontSize: 13, color: MUTED, lineHeight: 1.65 }}>
          Couldn't load the matches — try reloading the page.
        </div>
      )}

      {view === 'picks' && matches.length > 0 && (
        <div style={{ width: '100%', maxWidth: 560, padding: '0 12px', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', fontSize: 12, color: MUTED, marginBottom: 14 }}>
            You got <b style={{ color: GOLD }}>{myCorrect}</b> of <b style={{ color: GOLD }}>{myScored}</b> scored picks right · tap a day, then a match to see everyone's picks
            {TZ_ABBR && <div style={{ fontSize: 11, color: '#5A5040', marginTop: 3 }}>Kickoff times shown in {TZ_ABBR} (your local time)</div>}
          </div>
          {pickDays.map(({ day, dayMatches, isPast, scored, correct }) => {
            const collapsed = isPast && !openPastDays.has(day)
            const isCurrent = day === currentDayLabel
            const nMatch = `${dayMatches.length} match${dayMatches.length !== 1 ? 'es' : ''}`
            const stats = scored > 0 ? `${nMatch} · ${correct}/${scored} correct` : nMatch

            if (collapsed) {
              return (
                <div key={day} {...clickableProps(() => togglePastDay(day))} aria-expanded={false} style={{
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  marginBottom: 8, paddingBottom: 4, borderBottom: `1px solid ${BORDER}`,
                }}>
                  <span style={{ flex: 1, minWidth: 0, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: 1, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{day}</span>
                  <span style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>{stats}</span>
                  <span style={{ fontSize: 13, color: MUTED, flexShrink: 0 }}>▾</span>
                </div>
              )
            }

            return (
              <div key={day} ref={isCurrent ? currentDayRef : null} style={{ marginBottom: 22, ...(isCurrent ? { borderLeft: `2px solid ${GOLD}`, paddingLeft: 8 } : null) }}>
                {isPast ? (
                  <div {...clickableProps(() => togglePastDay(day))} aria-expanded={true} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 17, fontWeight: 800, letterSpacing: 1, color: INK, marginBottom: 8, borderBottom: `1px solid ${BORDER}`, paddingBottom: 4 }}>
                    <span style={{ flex: 1, minWidth: 0 }}>{day}</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 400, color: MUTED, flexShrink: 0 }}>{stats}</span>
                    <span style={{ fontSize: 13, color: MUTED, flexShrink: 0 }}>▴</span>
                  </div>
                ) : (
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 17, fontWeight: 800, letterSpacing: 1, color: INK, marginBottom: 8, borderBottom: `1px solid ${BORDER}`, paddingBottom: 4 }}>
                    {day}
                  </div>
                )}
                {dayMatches.map(m => (
                  <MatchRow
                    key={m.id} m={m} myPick={myPicks[m.id]} lockedIn={myLocked.has(m.id)} now={now} onPick={noop}
                    expanded={openMatch === m.id}
                    onToggle={() => toggleMatch(m)}
                    roster={roster}
                    meId={user.id}
                    matchPreds={openMatch === m.id ? preds.filter(p => p.match_id === m.id) : null}
                    onTeam={onTeam}
                  />
                ))}
              </div>
            )
          })}
        </div>
      )}

      {view === 'board' && (
        <div style={{ width: '100%', maxWidth: 480, padding: '0 12px', boxSizing: 'border-box' }}>
          {standings.map((s, i) => {
            const hist = historyFor(s.user_id)
            const expandable = hist.length > 0
            const open = openStanding === s.user_id
            return (
              <div key={s.user_id} style={{
                background: CARD, border: `1px solid ${s.user_id === user.id ? GOLD : BORDER}`,
                borderRadius: 10, padding: '10px 16px', marginBottom: 6,
                animation: `fadeIn 0.4s ${i * 60}ms both ease`,
                cursor: expandable ? 'pointer' : 'default',
              }}
                {...(expandable ? { ...clickableProps(() => setOpenStanding(c => c === s.user_id ? null : s.user_id)), 'aria-expanded': open } : {})}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 24, fontSize: 15, fontWeight: 800, color: s.rank === 1 ? GOLD : MUTED, textAlign: 'center' }}>
                    {s.rank === 1 ? '👑' : s.rank}
                  </div>
                  {s.avatar_url
                    ? <img src={s.avatar_url} alt="" width={28} height={28} style={{ borderRadius: '50%', flexShrink: 0 }} referrerPolicy="no-referrer" />
                    : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0F0E0C', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: GOLD, flexShrink: 0 }}>
                        {(s.display_name ?? '?')[0]?.toUpperCase()}
                      </div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.display_name ?? 'Player'}{s.user_id === user.id && <span style={{ color: MUTED, fontWeight: 600 }}> (you)</span>}
                    </div>
                    <div style={{ fontSize: 11, color: MUTED }}>{s.correct} correct</div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.rank === 1 ? GOLD : INK }}>{s.total}</div>
                  {expandable && (
                    <div style={{ color: MUTED, fontSize: 13, marginLeft: 2, flexShrink: 0 }}>{open ? '▴' : '▾'}</div>
                  )}
                </div>
                {open && <HistoryPanel history={hist} />}
              </div>
            )
          })}
          <div style={{ textAlign: 'center', fontSize: 11, color: '#5A5040', marginTop: 14, lineHeight: 1.7 }}>
            Group 1 · R32 2 · R16 3 · QF 5 · SF 8 · 3rd place 5 · Final 12 points per correct pick.
            {archive?.archived_at && <><br />Final standings, frozen {new Date(archive.archived_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.</>}
          </div>
        </div>
      )}

      {view === 'tournament' && (
        <div style={{ width: '100%', maxWidth: 560, padding: '0 12px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
            {[['groups', 'Groups'], ['bracket', 'Bracket']].map(([k, l]) => (
              <button key={k} onClick={() => setTourTab(k)} style={{
                background: tourTab === k ? 'rgba(201,168,76,0.14)' : 'none',
                border: `1px solid ${tourTab === k ? 'rgba(201,168,76,0.35)' : BORDER}`,
                borderRadius: 20, color: tourTab === k ? GOLD : MUTED,
                cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '5px 16px',
              }}>{l}</button>
            ))}
          </div>

          {tourTab === 'groups' && (
            groupTables.length === 0
              ? <div style={{ textAlign: 'center', fontSize: 13, color: MUTED }}>No group results yet.</div>
              : <>
                  {groupTables.map(([code, teams]) => (
                    <GroupTable key={code} code={code} teams={teams} qualifyingThirds={qualifyingThirds} onTeam={onTeam} />
                  ))}
                  <div style={{ textAlign: 'center', fontSize: 11, color: '#5A5040', marginTop: 6, lineHeight: 1.8 }}>
                    <span style={{ color: GOLD }}>■</span> top 2 advance · <span style={{ color: '#8a7a3a' }}>■</span> in the 8 best 3rd-place spots
                  </div>
                </>
          )}

          {tourTab === 'bracket' && <BracketView matches={matches} onTeam={onTeam} />}
        </div>
      )}
    </>
  )
}

function GroupTable({ code, teams, qualifyingThirds, onTeam }) {
  const cols = '1fr 16px 16px 16px 26px 26px'
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: 1, color: INK, marginBottom: 6 }}>GROUP {code}</div>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 6, padding: '6px 12px', fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `1px solid ${BORDER}` }}>
          <span>Team</span><span style={{ textAlign: 'center' }}>W</span><span style={{ textAlign: 'center' }}>D</span><span style={{ textAlign: 'center' }}>L</span><span style={{ textAlign: 'center' }}>GD</span><span style={{ textAlign: 'right' }}>Pts</span>
        </div>
        {teams.map((t, i) => {
          const advance = i < 2
          const thirdQ = i === 2 && qualifyingThirds.has(t.team)
          const accent = advance ? GOLD : thirdQ ? '#8a7a3a' : 'transparent'
          const gd = t.gf - t.ga
          return (
            <div key={t.team} style={{ display: 'grid', gridTemplateColumns: cols, gap: 6, padding: '7px 12px', fontSize: 13, alignItems: 'center', borderLeft: `2px solid ${accent}`, background: advance || thirdQ ? 'rgba(201,168,76,0.05)' : 'transparent' }}>
              <span {...clickableProps(() => onTeam(t.team))} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, cursor: 'pointer' }}>
                <Flag code={t.team} size={14} />
                <span style={{ color: advance || thirdQ ? INK : '#A89880', fontWeight: advance || thirdQ ? 500 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.team}</span>
              </span>
              <span style={{ textAlign: 'center', color: MUTED }}>{t.w}</span>
              <span style={{ textAlign: 'center', color: MUTED }}>{t.d}</span>
              <span style={{ textAlign: 'center', color: MUTED }}>{t.l}</span>
              <span style={{ textAlign: 'center', color: '#A89880' }}>{gd > 0 ? '+' : ''}{gd}</span>
              <span style={{ textAlign: 'right', color: advance ? GOLD : INK, fontWeight: 700 }}>{t.pts}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const KO_STAGES = [['r32', 'Round of 32'], ['r16', 'Round of 16'], ['qf', 'Quarter-finals'], ['sf', 'Semi-finals'], ['3p', 'Third place'], ['final', 'Final']]

function BracketView({ matches, onTeam }) {
  const byStage = {}
  for (const m of matches) {
    if (m.stage === 'group' || m.excluded) continue
    ;(byStage[m.stage] ??= []).push(m)
  }
  Object.values(byStage).forEach(arr => arr.sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at)))
  const anyTeams = matches.some(m => m.stage !== 'group' && m.team_a)
  const stages = KO_STAGES.filter(([k]) => byStage[k]?.length)
  if (!stages.length) return <div style={{ textAlign: 'center', fontSize: 13, color: MUTED }}>The knockout schedule isn't set yet.</div>
  return (
    <>
      {!anyTeams && <div style={{ textAlign: 'center', fontSize: 11, color: MUTED, marginBottom: 6 }}>Teams fill in as the group stage finishes.</div>}
      {TZ_ABBR && <div style={{ textAlign: 'center', fontSize: 11, color: '#5A5040', marginBottom: 14 }}>Times shown in {TZ_ABBR} (your local time)</div>}
      {stages.map(([key, label]) => (
        <div key={key} style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 1.5, color: GOLD, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
          {byStage[key].map(m => <KoRow key={m.id} m={m} onTeam={onTeam} />)}
        </div>
      ))}
    </>
  )
}

function KoRow({ m, onTeam }) {
  const aWin = m.result === 'a', bWin = m.result === 'b'
  const scoreStr = (m.score_a != null && m.score_b != null) ? `${m.score_a}–${m.score_b}` : null
  const when = `${new Date(m.kickoff_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${fmtTime(m.kickoff_at)}`
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 14px', marginBottom: 6 }}>
      <div style={{ fontSize: 10, color: MUTED, textAlign: 'center', marginBottom: 5, letterSpacing: 0.3 }}>
        {when}{m.venue && <span style={{ color: '#5A5040' }}> · {m.venue}, {m.city}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span {...(m.team_a ? clickableProps(() => onTeam(m.team_a)) : {})} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, fontSize: 13, color: aWin ? '#86EFAC' : '#A89880', fontWeight: aWin ? 700 : 400, cursor: m.team_a ? 'pointer' : 'default' }}>
          {m.team_a && <Flag code={m.team_a} size={14} />}
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.team_a ?? 'TBD'}</span>
        </span>
        <span style={{ flexShrink: 0, padding: '0 10px', fontSize: scoreStr ? 13 : 11, fontWeight: scoreStr ? 700 : 400, color: scoreStr ? INK : MUTED }}>{scoreStr ?? 'vs'}</span>
        <span {...(m.team_b ? clickableProps(() => onTeam(m.team_b)) : {})} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, justifyContent: 'flex-end', fontSize: 13, color: bWin ? '#86EFAC' : '#A89880', fontWeight: bWin ? 700 : 400, cursor: m.team_b ? 'pointer' : 'default' }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.team_b ?? 'TBD'}</span>
          {m.team_b && <Flag code={m.team_b} size={14} />}
        </span>
      </div>
    </div>
  )
}

function MatchRow({ m, myPick, lockedIn, now, onPick, expanded, onToggle, roster, meId, matchPreds, onTeam }) {
  const kicked = new Date(m.kickoff_at).getTime() <= now
  const tbd = !m.team_a_locked || !m.team_b_locked
  const locked = kicked || tbd || !!m.result || !!m.excluded || !!lockedIn
  const expandable = kicked && !m.excluded
  const isLive = m.status === 'IN_PLAY' || m.status === 'PAUSED'
  const options = m.stage === 'group'
    ? [['a', m.team_a ?? 'TBD'], ['draw', 'Draw'], ['b', m.team_b ?? 'TBD']]
    : [['a', m.team_a ?? 'TBD'], ['b', m.team_b ?? 'TBD']]
  const pts = STAGE_POINTS[m.stage] ?? 0

  let status = null
  if (m.excluded) {
    status = <span style={{ color: MUTED }}>Not scored</span>
  } else if (m.result && myPick) {
    status = myPick === m.result
      ? <span style={{ color: '#86EFAC', fontWeight: 700 }}>✓ +{pts}</span>
      : <span style={{ color: '#FCA5A5', fontWeight: 700 }}>✗</span>
  } else if (m.result) {
    status = <span style={{ color: MUTED }}>—</span>
  } else if (kicked) {
    status = <span style={{ color: MUTED }}>Locked</span>
  } else if (lockedIn) {
    status = <span style={{ color: GOLD, fontWeight: 700 }}>🔒 In</span>
  } else if (tbd) {
    status = <span style={{ color: MUTED }}>TBD</span>
  }

  return (
    <div
      style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 12px', marginBottom: 6, cursor: expandable ? 'pointer' : 'default' }}
      {...(expandable ? { ...clickableProps(onToggle), 'aria-expanded': expanded } : {})}
    >
      <div className="bk-row">
        <div className="bk-time">
          <div className="bk-kick" style={{ fontSize: 12, fontWeight: 700, color: INK }}>{fmtTime(m.kickoff_at)}</div>
          <div className="bk-badge" style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: 0.5 }}>{stageBadge(m)}</div>
        </div>
        <div className="bk-btns">
          {options.map(([key, label]) => {
            const active = myPick === key
            const won = m.result === key
            return (
              <button
                key={key}
                className="bk-btn"
                onClick={() => onPick(m, key)}
                disabled={locked}
                style={{
                  padding: '8px 4px',
                  background: active ? (m.result ? (won ? 'rgba(134,239,172,0.12)' : 'rgba(252,165,165,0.10)') : GOLD) : '#0F0E0C',
                  border: `2px solid ${won ? '#4caf50' : active ? GOLD : BORDER}`,
                  borderRadius: 8,
                  color: active && !m.result ? '#0F0E0C' : won ? '#86EFAC' : active ? INK : locked ? '#5A5040' : INK,
                  fontSize: 13, fontWeight: 800, letterSpacing: 0.5,
                  cursor: locked ? 'default' : 'pointer',
                  opacity: locked && !active && !won ? 0.55 : 1,
                  pointerEvents: locked ? 'none' : 'auto',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  {key !== 'draw' && <Flag code={key === 'a' ? m.team_a : m.team_b} />}
                  {label}
                </span>
              </button>
            )
          })}
        </div>
        <div className="bk-status">
          {status}
          {expandable && (
            <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, marginTop: 2 }}>
              {expanded ? 'picks ▴' : 'picks ▾'}
            </div>
          )}
        </div>
      </div>
      {m.score_a != null && m.score_b != null && (
        <div style={{ textAlign: 'center', fontSize: 11, color: MUTED, marginTop: 5, letterSpacing: 0.3 }}>
          {isLive && <span style={{ color: '#e94560', fontWeight: 700, marginRight: 6 }}><span style={{ animation: 'blink 1.2s infinite' }}>●</span> LIVE</span>}
          <span {...clickableProps((e) => { e.stopPropagation(); onTeam(m.team_a) })} style={{ color: m.result === 'a' ? '#86EFAC' : '#A89880', fontWeight: m.result === 'a' ? 700 : 400, cursor: 'pointer' }}>{m.team_a}</span>
          {' '}<span style={{ color: INK, fontWeight: 700 }}>{m.score_a}–{m.score_b}</span>{' '}
          <span {...clickableProps((e) => { e.stopPropagation(); onTeam(m.team_b) })} style={{ color: m.result === 'b' ? '#86EFAC' : '#A89880', fontWeight: m.result === 'b' ? 700 : 400, cursor: 'pointer' }}>{m.team_b}</span>
        </div>
      )}
      {m.venue && (
        <div style={{ textAlign: 'center', fontSize: 10, color: '#5A5040', marginTop: 3, letterSpacing: 0.3 }}>
          {m.venue}, {m.city}
        </div>
      )}
      {expanded && <PicksPanel m={m} roster={roster} matchPreds={matchPreds} meId={meId} />}
    </div>
  )
}

function PicksPanel({ m, roster, matchPreds, meId }) {
  const byUser = new Map((matchPreds ?? []).map(p => [p.user_id, p.pick]))
  // Viewer pinned first, then roster (joined) order. No correct-first sorting —
  // rows reshuffling when a result lands is worse than colours doing the work.
  const members = (roster ?? []).slice().sort((a, b) =>
    a.user_id === meId ? -1 : b.user_id === meId ? 1 : 0)

  const pickCell = (pick) => {
    if (!pick) return <span style={{ color: MUTED, fontSize: 12 }}>No pick</span>
    const color = m.result ? (pick === m.result ? '#86EFAC' : '#FCA5A5') : INK
    const label = pick === 'draw' ? 'Draw' : pick === 'a' ? m.team_a : m.team_b
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
        {pick !== 'draw' && <Flag code={pick === 'a' ? m.team_a : m.team_b} size={14} />}
        {label ?? '—'}
      </span>
    )
  }

  return (
    <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 8, paddingTop: 8 }} onClick={e => e.stopPropagation()}>
      {members.map(mem => (
        <div key={mem.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
          {mem.avatar_url
            ? <img src={mem.avatar_url} alt="" width={22} height={22} style={{ borderRadius: '50%', flexShrink: 0 }} referrerPolicy="no-referrer" />
            : <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#0F0E0C', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: GOLD, flexShrink: 0 }}>
                {(mem.display_name ?? '?')[0]?.toUpperCase()}
              </div>}
          <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {mem.display_name ?? 'Player'}{mem.user_id === meId && <span style={{ color: MUTED, fontWeight: 600 }}> (you)</span>}
          </div>
          {pickCell(byUser.get(mem.user_id))}
        </div>
      ))}
    </div>
  )
}

function HistoryPanel({ history }) {
  const newest = [...history].reverse()
  return (
    <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 10, paddingTop: 10 }} onClick={e => e.stopPropagation()}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: GOLD, textTransform: 'uppercase', marginBottom: 6 }}>Form</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
        {history.map((h, i) => (
          <span key={i} title={`${h.m.team_a} v ${h.m.team_b}`} style={{
            width: 16, height: 16, borderRadius: 3,
            background: h.correct ? 'rgba(134,239,172,0.85)' : 'rgba(252,165,165,0.85)',
          }} />
        ))}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: GOLD, textTransform: 'uppercase', marginBottom: 4 }}>Pick history</div>
      {newest.map((h, i) => {
        const pickLabel = h.pick === 'draw' ? 'Draw' : h.pick === 'a' ? h.m.team_a : h.m.team_b
        return (
          <div key={h.m.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: i < newest.length - 1 ? '1px solid rgba(44,40,32,0.6)' : 'none' }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {h.m.team_a ?? 'TBD'} <span style={{ color: MUTED }}>v</span> {h.m.team_b ?? 'TBD'}
            </span>
            <span style={{ fontSize: 12, color: MUTED, margin: '0 10px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              {h.pick !== 'draw' && <Flag code={h.pick === 'a' ? h.m.team_a : h.m.team_b} size={13} />}
              {pickLabel}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: h.correct ? '#86EFAC' : '#FCA5A5', flexShrink: 0, minWidth: 30, textAlign: 'right' }}>
              {h.correct ? `+${h.pts}` : '✗'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function TeamHistoryModal({ team, matches, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const hist = useMemo(() =>
    matches.filter(m => m.team_a === team || m.team_b === team)
      .sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at)),
    [matches, team])

  let w = 0, d = 0, l = 0
  for (const m of hist) {
    if (!m.result) continue
    const isA = m.team_a === team
    if (m.result === 'draw') d++
    else if ((m.result === 'a' && isA) || (m.result === 'b' && !isA)) w++
    else l++
  }

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label={`${team} match history`} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'fadeIn 0.2s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 22px 18px', maxWidth: 380, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box', animation: 'slideUp 0.25s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Flag code={team} size={22} />
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: 1.5, color: INK, flex: 1 }}>{team}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 18, padding: 4, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          World Cup record · <b style={{ color: INK }}>{w}W {d}D {l}L</b>
        </div>
        {hist.length === 0
          ? <div style={{ fontSize: 13, color: MUTED, padding: '8px 0' }}>No matches yet.</div>
          : hist.map(m => <TeamHistoryRow key={m.id} m={m} team={team} />)}
      </div>
    </div>
  )
}

function TeamHistoryRow({ m, team }) {
  const isA = m.team_a === team
  const opp = isA ? m.team_b : m.team_a
  const isLive = m.status === 'IN_PLAY' || m.status === 'PAUSED'
  const hasScore = m.score_a != null && m.score_b != null
  let pill = null
  if (m.result === 'draw') pill = { t: 'D', c: MUTED }
  else if (m.result === 'a') pill = isA ? { t: 'W', c: '#86EFAC' } : { t: 'L', c: '#FCA5A5' }
  else if (m.result === 'b') pill = isA ? { t: 'L', c: '#FCA5A5' } : { t: 'W', c: '#86EFAC' }
  const myScore = isA ? m.score_a : m.score_b
  const oppScore = isA ? m.score_b : m.score_a
  return (
    <div style={{ padding: '8px 0', borderBottom: '1px solid rgba(44,40,32,0.6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 58, flexShrink: 0, fontSize: 10, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: 0.5 }}>{stageBadge(m)}</div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>vs</span>
          {opp && <Flag code={opp} size={14} />}
          <span style={{ fontSize: 13, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opp ?? 'TBD'}</span>
        </div>
        {hasScore ? (
          <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 700, color: INK }}>
            {isLive && <span style={{ color: '#e94560', marginRight: 5 }}><span style={{ animation: 'blink 1.2s infinite' }}>●</span></span>}
            {myScore}–{oppScore}
          </span>
        ) : (
          <span style={{ flexShrink: 0, fontSize: 11, color: MUTED }}>{new Date(m.kickoff_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
        )}
        {pill && <span style={{ flexShrink: 0, width: 16, textAlign: 'center', fontSize: 11, fontWeight: 800, color: pill.c }}>{pill.t}</span>}
      </div>
      {m.venue && (
        <div style={{ fontSize: 10, color: '#5A5040', marginTop: 2, paddingLeft: 66 }}>{m.venue}, {m.city}</div>
      )}
    </div>
  )
}

function RulesModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const sectionTitle = { fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: GOLD, textTransform: 'uppercase', marginTop: 18, marginBottom: 6 }
  const body = { fontSize: 13, color: '#ccc', lineHeight: 1.65, margin: 0 }
  const stages = ['group', 'r32', 'r16', 'qf', 'sf', '3p', 'final']

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label="Pool rules" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'fadeIn 0.2s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 22px 18px', maxWidth: 380, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box', animation: 'slideUp 0.25s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: 2, color: INK }}>POOL RULES</div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 18, padding: 4, lineHeight: 1 }}>✕</button>
        </div>

        <div style={sectionTitle}>How it works</div>
        <p style={body}>
          Pick the winner of every World Cup match before it kicks off. Group-stage
          matches can end in a <b>draw</b> — knockout matches can't (extra time and
          penalties decide a winner).
        </p>

        <div style={sectionTitle}>Locking</div>
        <p style={body}>
          Picks save as drafts you can change any time before kickoff. Hit
          <b> 🔒 Lock in</b> under a matchday to commit those picks — locked picks
          can't be changed, ever. Anything still in draft locks automatically at
          kickoff. Everyone's picks stay hidden until the match starts — no copying.
          Once a match kicks off, tap it to see what everyone picked.
          Knockout matches open for picking once both teams are known.
        </p>

        <div style={sectionTitle}>Points per correct pick</div>
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', marginTop: 2 }}>
          {stages.map((s, i) => (
            <div key={s} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', fontSize: 13, background: i % 2 ? 'transparent' : '#0F0E0C' }}>
              <span style={{ color: '#ccc' }}>{STAGE_LABELS[s]}</span>
              <span style={{ color: GOLD, fontWeight: 800 }}>{STAGE_POINTS[s]} pt{STAGE_POINTS[s] !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>

        <div style={sectionTitle}>Standings</div>
        <p style={body}>
          Most points wins. Ties are broken by total correct picks. Results come in
          automatically a few minutes after full-time. Matches marked
          <b> "Not scored"</b> don't count for anyone.
        </p>
      </div>
    </div>
  )
}
