import { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from './supabase'
import UserMenu from './UserMenu'
import { useSeo, PAGE_SEO } from './seo'
import { score, STAGE_LABELS, STAGE_POINTS } from './bracket/scoring'
import { flagUrl } from './bracket/flags'

const GOLD = '#C9A84C', CARD = '#1C1A16', BORDER = '#2C2820', INK = '#F5F0E8', MUTED = '#7A6E5F'

const css = `
@keyframes slideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
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
  const [view, setView] = useState('picks')
  const [code, setCode] = useState('')
  const [joinState, setJoinState] = useState('idle') // idle | busy | bad
  const [flash, setFlash] = useState(null)
  const [showRules, setShowRules] = useState(false)
  const [confirmDay, setConfirmDay] = useState(null)
  const now = useNow()

  const me = user && Array.isArray(roster) ? roster.find(r => r.user_id === user.id) : null
  const isMember = !!me
  const isAdmin = !!me?.is_admin

  const loadAll = useCallback(() => {
    // For non-members RLS returns empty sets for all three — harmless.
    return Promise.all([
      supabase.rpc('get_pool_members'),
      supabase.from('matches').select('*').order('kickoff_at'),
      supabase.from('predictions').select('user_id,match_id,pick,locked_at'),
    ]).then(([r, m, p]) => {
      setRoster(r.data ?? [])
      setMatches(m.data ?? [])
      setPreds(p.data ?? [])
    })
  }, [])

  useEffect(() => { if (user) loadAll() }, [user, loadAll])

  const showFlash = (msg) => { setFlash(msg); setTimeout(() => setFlash(null), 2500) }

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

  const standings = useMemo(() => {
    if (!Array.isArray(roster)) return []
    const totals = score(preds, matches)
    return roster
      .map(r => ({ ...r, ...(totals[r.user_id] ?? { total: 0, correct: 0, byStage: {} }) }))
      .sort((a, b) => b.total - a.total || b.correct - a.correct)
  }, [roster, preds, matches])

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!code.trim() || joinState === 'busy') return
    setJoinState('busy')
    const { data, error } = await supabase.rpc('join_pool', { code: code.trim() })
    if (error || data !== true) { setJoinState('bad'); return }
    setJoinState('idle')
    setCode('')
    await loadAll()
  }

  const savePick = async (m, pick) => {
    if (!user) return
    if (myLocked.has(m.id)) { showFlash('That pick is locked in — no changes') ; return }
    const prev = preds
    setPreds(ps => [
      ...ps.filter(p => !(p.user_id === user.id && p.match_id === m.id)),
      { user_id: user.id, match_id: m.id, pick },
    ])
    const { error } = await supabase.from('predictions').upsert(
      { user_id: user.id, match_id: m.id, pick, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,match_id' },
    )
    if (error) {
      setPreds(prev)
      showFlash('Could not save — this match may already be locked')
    }
  }

  // Locks every draft pick for the given matches — RLS makes the rows
  // immutable from then on, so this is enforced server-side, not just here.
  const lockPicks = async (ids) => {
    const stamp = new Date().toISOString()
    const { error } = await supabase.from('predictions')
      .update({ locked_at: stamp })
      .eq('user_id', user.id)
      .is('locked_at', null)
      .in('match_id', ids)
    if (error) { showFlash(`Could not lock: ${error.message}`); return }
    setPreds(ps => ps.map(p =>
      p.user_id === user.id && ids.includes(p.match_id) && !p.locked_at
        ? { ...p, locked_at: stamp }
        : p
    ))
    setConfirmDay(null)
  }

  const handleLockDay = (day, ids) => {
    if (confirmDay === day) { lockPicks(ids); return }
    setConfirmDay(day)
    setTimeout(() => setConfirmDay(c => (c === day ? null : c)), 3500)
  }

  const setResult = async (m, result) => {
    const { error } = await supabase.from('matches')
      .update({ result, result_source: 'admin', updated_at: new Date().toISOString() })
      .eq('id', m.id)
    if (error) showFlash(`Update failed: ${error.message}`)
    else setMatches(ms => ms.map(x => x.id === m.id ? { ...x, result, result_source: 'admin' } : x))
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
          World Cup 2026 · by Streakle
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
      {flash && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 600, color: '#FCA5A5', zIndex: 50, animation: 'slideUp 0.3s ease', whiteSpace: 'nowrap' }}>
          {flash}
        </div>
      )}
      {children}
      {footer}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </main>
  )

  // ── Signed out ──
  if (!user) {
    return page(
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '36px 32px', maxWidth: 340, width: '90%', textAlign: 'center', marginTop: 48, animation: 'slideUp 0.4s ease' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>⚽</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Private prediction pool</div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 24, lineHeight: 1.6 }}>
          Pick winners for every World Cup match and battle your friends on the leaderboard. Sign in to join.
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

  // ── Signed in, not a member ──
  if (!isMember) {
    return page(
      <form onSubmit={handleJoin} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '36px 32px', maxWidth: 340, width: '90%', textAlign: 'center', marginTop: 48, animation: joinState === 'bad' ? 'shake 0.45s ease' : 'slideUp 0.4s ease' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>⚽</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Join the pool</div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 20, lineHeight: 1.6 }}>
          Enter the invite code you got from the pool admin.
        </div>
        <input
          value={code}
          onChange={e => { setCode(e.target.value); if (joinState === 'bad') setJoinState('idle') }}
          placeholder="Invite code"
          autoFocus
          style={{ width: '100%', boxSizing: 'border-box', background: '#0F0E0C', border: `2px solid ${joinState === 'bad' ? '#e94560' : BORDER}`, borderRadius: 8, color: '#fff', fontSize: 15, padding: '10px 14px', outline: 'none', textAlign: 'center', letterSpacing: 1, marginBottom: 8 }}
        />
        {joinState === 'bad' && <div style={{ fontSize: 12, color: '#FCA5A5', marginBottom: 8 }}>Wrong code — try again</div>}
        <button type="submit" disabled={!code.trim() || joinState === 'busy'} style={{ width: '100%', background: code.trim() ? GOLD : CARD, border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 700, color: code.trim() ? '#0F0E0C' : '#555', cursor: code.trim() ? 'pointer' : 'default', transition: 'background 0.2s' }}>
          {joinState === 'busy' ? 'Joining…' : 'Join'}
        </button>
      </form>
    )
  }

  // ── Member ──
  const upcoming = matches.filter(m => !m.excluded && new Date(m.kickoff_at).getTime() > now && m.team_a_locked && m.team_b_locked)
  const pickedCount = upcoming.filter(m => myPicks[m.id]).length

  const tabs = [
    ['picks', 'Picks'],
    ['board', 'Standings'],
    ...(isAdmin ? [['admin', 'Admin']] : []),
  ]

  return page(
    <>
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
          The match schedule hasn't been synced yet.
          {isAdmin && <> Deploy and invoke the <b style={{ color: GOLD }}>sync-matches</b> Edge Function to seed it — see <b style={{ color: GOLD }}>supabase/schema.sql</b>.</>}
        </div>
      )}

      {view === 'picks' && matches.length > 0 && (
        <div style={{ width: '100%', maxWidth: 560, padding: '0 12px', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', fontSize: 12, color: MUTED, marginBottom: 14 }}>
            {upcoming.length > 0
              ? <>You've picked <b style={{ color: GOLD }}>{pickedCount}</b> of <b style={{ color: GOLD }}>{upcoming.length}</b> open matches</>
              : 'No open matches right now'}
          </div>
          {days.map(([day, dayMatches]) => {
            const lockable = dayMatches
              .filter(m => myPicks[m.id] && !myLocked.has(m.id) && !m.excluded && !m.result
                && new Date(m.kickoff_at).getTime() > now)
              .map(m => m.id)
            return (
              <div key={day} style={{ marginBottom: 22 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 17, fontWeight: 800, letterSpacing: 1, color: INK, marginBottom: 8, borderBottom: `1px solid ${BORDER}`, paddingBottom: 4 }}>
                  {day}
                </div>
                {dayMatches.map(m => (
                  <MatchRow key={m.id} m={m} myPick={myPicks[m.id]} lockedIn={myLocked.has(m.id)} now={now} onPick={savePick} />
                ))}
                {lockable.length > 0 && (
                  <button onClick={() => handleLockDay(day, lockable)} style={{
                    width: '100%', marginTop: 2, padding: '9px 12px',
                    background: confirmDay === day ? GOLD : 'none',
                    border: `1px solid ${confirmDay === day ? GOLD : BORDER}`,
                    borderRadius: 8, color: confirmDay === day ? '#0F0E0C' : GOLD,
                    fontSize: 12, fontWeight: 700, letterSpacing: 0.5, cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}>
                    {confirmDay === day
                      ? `Tap again to lock ${lockable.length} pick${lockable.length !== 1 ? 's' : ''} — can't be undone`
                      : `🔒 Lock in ${lockable.length} pick${lockable.length !== 1 ? 's' : ''} for this day`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {view === 'board' && (
        <div style={{ width: '100%', maxWidth: 480, padding: '0 12px', boxSizing: 'border-box' }}>
          {standings.map((s, i) => (
            <div key={s.user_id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: CARD, border: `1px solid ${s.user_id === user.id ? GOLD : BORDER}`,
              borderRadius: 10, padding: '10px 16px', marginBottom: 6,
              animation: `fadeIn 0.4s ${i * 60}ms both ease`,
            }}>
              <div style={{ width: 24, fontSize: 15, fontWeight: 800, color: i === 0 ? GOLD : MUTED, textAlign: 'center' }}>
                {i === 0 ? '👑' : i + 1}
              </div>
              {s.avatar_url
                ? <img src={s.avatar_url} alt="" width={28} height={28} style={{ borderRadius: '50%' }} referrerPolicy="no-referrer" />
                : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0F0E0C', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: GOLD }}>
                    {(s.display_name ?? '?')[0]?.toUpperCase()}
                  </div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.display_name ?? 'Player'}{s.user_id === user.id && <span style={{ color: MUTED, fontWeight: 600 }}> (you)</span>}
                </div>
                <div style={{ fontSize: 11, color: MUTED }}>{s.correct} correct</div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: i === 0 ? GOLD : INK }}>{s.total}</div>
            </div>
          ))}
          <div style={{ textAlign: 'center', fontSize: 11, color: '#5A5040', marginTop: 14, lineHeight: 1.7 }}>
            Group 1 · R32 2 · R16 3 · QF 5 · SF 8 · 3rd place 5 · Final 12 points per correct pick.
            <br />Other players' picks are visible only after kickoff.
          </div>
        </div>
      )}

      {view === 'admin' && isAdmin && (
        <div style={{ width: '100%', maxWidth: 560, padding: '0 12px', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', fontSize: 12, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>
            Results sync automatically every 5 minutes. Grading here overrides the API for that match — for fixing wrong or stuck scores.
          </div>
          {days.map(([day, dayMatches]) => (
            <div key={day} style={{ marginBottom: 22 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 17, fontWeight: 800, letterSpacing: 1, color: INK, marginBottom: 8, borderBottom: `1px solid ${BORDER}`, paddingBottom: 4 }}>
                {day}
              </div>
              {dayMatches.map(m => <AdminRow key={m.id} m={m} onSet={setResult} />)}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function MatchRow({ m, myPick, lockedIn, now, onPick }) {
  const kicked = new Date(m.kickoff_at).getTime() <= now
  const tbd = !m.team_a_locked || !m.team_b_locked
  const locked = kicked || tbd || !!m.result || !!m.excluded || !!lockedIn
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
    <div className="bk-row" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 12px', marginBottom: 6 }}>
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
      <div className="bk-status">{status}</div>
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

function AdminRow({ m, onSet }) {
  const options = m.stage === 'group' ? ['a', 'draw', 'b'] : ['a', 'b']
  const label = { a: m.team_a ?? 'A', draw: 'Draw', b: m.team_b ?? 'B' }
  return (
    <div className="bk-row" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 12px', marginBottom: 6 }}>
      <div className="bk-time">
        <div className="bk-kick" style={{ fontSize: 12, fontWeight: 700, color: INK }}>{fmtTime(m.kickoff_at)}</div>
        <div className="bk-badge" style={{ fontSize: 10, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: 0.5 }}>{stageBadge(m)}</div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: INK }}>
        <Flag code={m.team_a} size={14} /> {m.team_a ?? 'TBD'}
        <span style={{ color: MUTED, fontWeight: 400 }}>vs</span>
        {m.team_b ?? 'TBD'} <Flag code={m.team_b} size={14} />
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {options.map(key => (
          <button key={key} onClick={() => onSet(m, key)} style={{
            padding: '5px 8px',
            background: m.result === key ? 'rgba(134,239,172,0.12)' : '#0F0E0C',
            border: `1px solid ${m.result === key ? '#4caf50' : BORDER}`,
            borderRadius: 6, color: m.result === key ? '#86EFAC' : MUTED,
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>
            {label[key]}
          </button>
        ))}
        {m.result && (
          <span style={{ fontSize: 9, fontWeight: 700, color: m.result_source === 'admin' ? '#FCA5A5' : MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 }}>
            {m.result_source}
          </span>
        )}
      </div>
    </div>
  )
}
