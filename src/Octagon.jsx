import { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from './supabase'
import UserMenu from './UserMenu'
import { useSeo, PAGE_SEO } from './seo'
import { scoreEvent, eventRanking, deriveBelt, formRanking, METHOD_LABELS, POINTS } from './octagon/scoring'
import { fetchResults, parsePasted, matchFights } from './octagon/wiki'
import { clickableProps } from './a11y'

const GOLD = '#C9A84C', CARD = '#1C1A16', BORDER = '#2C2820', INK = '#F5F0E8', MUTED = '#7A6E5F'
const GREEN = '#86EFAC', RED = '#FCA5A5'

// The viewer's local timezone abbreviation, same approach as Bracket.
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
.oc-fighters{display:flex;gap:8px}
.oc-fbtn{flex:1 1 0;min-width:0}
.oc-chips{display:flex;gap:6px;flex-wrap:wrap}
@media(max-width:520px){
  .oc-fbtn{font-size:13px !important;padding:10px 4px !important}
  .oc-chip{font-size:11px !important;padding:5px 10px !important}
}
`

function fmtDay(iso) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
function fmtShort(iso) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}
function boutLabel(f) {
  return f.bout_order === 1 ? 'Main event' : f.bout_order === 2 ? 'Co-main event' : `Bout ${f.bout_order}`
}

// 30s-bucket clock (same as Bracket) so the event-start lock flips without a
// reload; the lock that matters is server-side (RLS checks starts_at > now()).
const NOW_BUCKET_MS = 30000
const subscribeClock = (cb) => {
  const t = setInterval(cb, 5000)
  return () => clearInterval(t)
}
const getNowBucket = () => Math.floor(Date.now() / NOW_BUCKET_MS)
function useNow() {
  return useSyncExternalStore(subscribeClock, getNowBucket) * NOW_BUCKET_MS
}

// datetime-local <-> ISO for the admin event form.
function toLocalInput(iso) {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function Octagon() {
  useSeo(PAGE_SEO.octagon)
  const { user } = useAuth()
  const [roster, setRoster] = useState(null) // null = loading, [] = not a member
  const [events, setEvents] = useState([])
  const [fights, setFights] = useState([])
  const [picks, setPicks] = useState([])
  const [view, setView] = useState('event')
  const [code, setCode] = useState('')
  const [joinState, setJoinState] = useState('idle') // idle | busy | bad
  const [flash, setFlash] = useState(null)
  const [showRules, setShowRules] = useState(false)
  const [showLineage, setShowLineage] = useState(false)
  const [selEvent, setSelEvent] = useState(null)
  const [openFight, setOpenFight] = useState(null)
  const [confirmKey, setConfirmKey] = useState(null) // two-tap confirm for deletes
  const now = useNow()

  const me = user && Array.isArray(roster) ? roster.find(r => r.user_id === user.id) : null
  const isMember = !!me
  const isAdmin = !!me?.is_admin

  const loadAll = useCallback(() => {
    // Non-members get empty sets from RLS — harmless.
    return Promise.all([
      supabase.rpc('get_pool_members', { pool: 'octagon' }),
      supabase.from('ufc_events').select('*').order('starts_at'),
      supabase.from('fights').select('*').order('bout_order'),
      supabase.from('fight_picks').select('*'),
    ]).then(([r, e, f, p]) => {
      setRoster(r.data ?? [])
      setEvents(e.data ?? [])
      setFights(f.data ?? [])
      setPicks(p.data ?? [])
    })
  }, [])

  useEffect(() => { if (user) loadAll() }, [user, loadAll])

  // Fights + picks refresh every 60s: results land mid-event as the admin
  // grades, and others' picks appear once RLS opens them at event start.
  useEffect(() => {
    if (!user) return
    const t = setInterval(() => {
      supabase.from('fights').select('*').order('bout_order')
        .then(({ data }) => { if (data) setFights(data) })
      supabase.from('fight_picks').select('*')
        .then(({ data }) => { if (data) setPicks(data) })
    }, 60000)
    return () => clearInterval(t)
  }, [user])

  const showFlash = (msg) => { setFlash(msg); setTimeout(() => setFlash(null), 2500) }

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!code.trim() || joinState === 'busy') return
    setJoinState('busy')
    const { data, error } = await supabase.rpc('join_pool', { pool: 'octagon', code: code.trim() })
    if (error || data !== true) { setJoinState('bad'); return }
    setJoinState('idle')
    setCode('')
    await loadAll()
  }

  // ── Derived ──
  const rosterById = useMemo(() =>
    new Map((Array.isArray(roster) ? roster : []).map(r => [r.user_id, r])), [roster])

  const effEvent = useMemo(() => {
    if (selEvent != null) return events.find(e => e.id === selEvent) ?? null
    const upcoming = events.find(e => new Date(e.starts_at).getTime() > now)
    return upcoming ?? events[events.length - 1] ?? null
  }, [events, selEvent, now])

  const evFights = useMemo(() =>
    effEvent ? fights.filter(f => f.event_id === effEvent.id) : [], [fights, effEvent])

  const started = effEvent ? new Date(effEvent.starts_at).getTime() <= now : false

  const myPicksByFight = useMemo(() => {
    const map = {}
    if (user) for (const p of picks) if (p.user_id === user.id) map[p.fight_id] = p
    return map
  }, [picks, user])

  const myLock = effEvent
    ? Object.values(myPicksByFight).find(p => p.event_id === effEvent.id && p.is_lock)
    : null

  // Live scores for the selected event (partial grading included).
  const liveScores = useMemo(() => {
    if (!effEvent) return {}
    return scoreEvent(picks.filter(p => p.event_id === effEvent.id), evFights)
  }, [picks, evFights, effEvent])

  const liveRanking = useMemo(() => {
    if (!effEvent) return []
    const firstAt = {}
    for (const p of picks) {
      if (p.event_id !== effEvent.id) continue
      if (!firstAt[p.user_id] || p.created_at < firstAt[p.user_id]) firstAt[p.user_id] = p.created_at
    }
    return eventRanking(liveScores, firstAt)
  }, [liveScores, picks, effEvent])

  // Belt / all-time / form only count fully graded events (every non-scratched
  // fight has a winner).
  const gradedEvents = useMemo(() => {
    const out = []
    for (const ev of events) {
      const efights = fights.filter(f => f.event_id === ev.id)
      const active = efights.filter(f => !f.scratched)
      if (active.length === 0 || !active.every(f => f.winner)) continue
      const epicks = picks.filter(p => p.event_id === ev.id)
      const firstAt = {}
      for (const p of epicks) {
        if (!firstAt[p.user_id] || p.created_at < firstAt[p.user_id]) firstAt[p.user_id] = p.created_at
      }
      out.push({ id: ev.id, name: ev.name, ranking: eventRanking(scoreEvent(epicks, efights), firstAt) })
    }
    return out
  }, [events, fights, picks])

  const belt = useMemo(() => deriveBelt(gradedEvents), [gradedEvents])
  const allTime = useMemo(() => formRanking(gradedEvents, gradedEvents.length), [gradedEvents])
  const form = useMemo(() => formRanking(gradedEvents, 6), [gradedEvents])

  // ── Pick writes (server-checked by RLS: event not started, not scratched) ──
  const writePick = async (fight, patch) => {
    if (!user) return
    const mine = myPicksByFight[fight.id]
    const winner = patch.winner ?? mine?.winner
    if (!winner) return
    const row = {
      user_id: user.id,
      fight_id: fight.id,
      winner,
      method: 'method' in patch ? patch.method : mine?.method ?? null,
      round: 'round' in patch ? patch.round : mine?.round ?? null,
      is_lock: 'is_lock' in patch ? patch.is_lock : mine?.is_lock ?? false,
      updated_at: new Date().toISOString(),
    }
    const prev = picks
    setPicks(ps => [
      ...ps.filter(p => !(p.user_id === user.id && p.fight_id === fight.id)),
      { ...row, event_id: fight.event_id, created_at: mine?.created_at ?? row.updated_at },
    ])
    const { error } = await supabase.from('fight_picks')
      .upsert(row, { onConflict: 'user_id,fight_id' })
    if (error) {
      setPicks(prev)
      showFlash('Could not save — the event may have started')
    }
  }

  const pickWinner = (fight, side) => {
    const mine = myPicksByFight[fight.id]
    if (mine?.winner === side) return
    writePick(fight, { winner: side })
  }

  const pickMethod = (fight, method) => {
    const mine = myPicksByFight[fight.id]
    const next = mine?.method === method ? null : method
    // Round only makes sense on a finish — clear it alongside dec/none.
    writePick(fight, { method: next, round: next === 'ko' || next === 'sub' ? mine?.round ?? null : null })
  }

  const pickRound = (fight, round) => {
    const mine = myPicksByFight[fight.id]
    writePick(fight, { round: mine?.round === round ? null : round })
  }

  const toggleLock = async (fight) => {
    const mine = myPicksByFight[fight.id]
    if (!mine) { showFlash('Pick a winner first'); return }
    if (mine.is_lock) { writePick(fight, { is_lock: false }); return }
    const cur = Object.values(myPicksByFight).find(p => p.event_id === fight.event_id && p.is_lock)
    if (cur) {
      const curFight = fights.find(f => f.id === cur.fight_id)
      if (curFight?.scratched) {
        // Updates on scratched fights are blocked by RLS; free the stranded
        // lock by deleting the (void anyway) pick.
        await supabase.from('fight_picks').delete()
          .eq('user_id', user.id).eq('fight_id', cur.fight_id)
        setPicks(ps => ps.filter(p => !(p.user_id === user.id && p.fight_id === cur.fight_id)))
      } else if (curFight) {
        await writePick(curFight, { is_lock: false })
      }
    }
    await writePick(fight, { is_lock: true })
  }

  const toggleFight = (f) => {
    setOpenFight(cur => (cur === f.id ? null : f.id))
  }

  // ── Admin writes ──
  const confirmTap = (key, fn) => {
    if (confirmKey === key) { setConfirmKey(null); fn(); return }
    setConfirmKey(key)
    setTimeout(() => setConfirmKey(c => (c === key ? null : c)), 3500)
  }

  const saveEvent = async (form, editingId) => {
    const row = {
      name: form.name.trim(),
      starts_at: new Date(form.when).toISOString(),
      wiki_slug: form.slug.trim() || null,
    }
    if (editingId) {
      const { error } = await supabase.from('ufc_events').update(row).eq('id', editingId)
      if (error) { showFlash(`Save failed: ${error.message}`); return false }
      setEvents(es => es.map(e => e.id === editingId ? { ...e, ...row } : e)
        .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)))
    } else {
      const { data, error } = await supabase.from('ufc_events').insert(row).select().single()
      if (error || !data) { showFlash(`Create failed: ${error?.message}`); return false }
      setEvents(es => [...es, data].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)))
      setSelEvent(data.id)
    }
    return true
  }

  const deleteEvent = async (ev) => {
    const { error } = await supabase.from('ufc_events').delete().eq('id', ev.id)
    if (error) { showFlash(`Delete failed: ${error.message}`); return }
    setEvents(es => es.filter(e => e.id !== ev.id))
    setFights(fs => fs.filter(f => f.event_id !== ev.id))
    setPicks(ps => ps.filter(p => p.event_id !== ev.id))
    if (selEvent === ev.id) setSelEvent(null)
  }

  const addFight = async (ev, form) => {
    const row = {
      event_id: ev.id,
      bout_order: fights.filter(f => f.event_id === ev.id).length + 1,
      fighter_a: form.a.trim(),
      fighter_b: form.b.trim(),
      weight_class: form.wc.trim() || null,
      rounds: form.rounds,
      favorite: form.favorite || null,
    }
    const { data, error } = await supabase.from('fights').insert(row).select().single()
    if (error || !data) { showFlash(`Add failed: ${error?.message}`); return false }
    setFights(fs => [...fs, data])
    return true
  }

  const updateFight = async (fight, patch) => {
    const { error } = await supabase.from('fights')
      .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', fight.id)
    if (error) { showFlash(`Update failed: ${error.message}`); return }
    setFights(fs => fs.map(f => f.id === fight.id ? { ...f, ...patch } : f))
  }

  const deleteFight = async (fight) => {
    const { error } = await supabase.from('fights').delete().eq('id', fight.id)
    if (error) { showFlash(`Delete failed: ${error.message}`); return }
    setFights(fs => fs.filter(f => f.id !== fight.id))
    setPicks(ps => ps.filter(p => p.fight_id !== fight.id))
  }

  // ── Chrome ──
  const header = (
    <>
      <style>{css}</style>
      <UserMenu />
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '12px 16px 0', minHeight: 44 }}>
        <a href="/" style={{ color: GOLD, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>← Back</a>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 2 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: 2, color: '#fff', margin: 0 }}>OCTAGON</h1>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginTop: 2 }}>
          UFC Pick'em · by Streakle
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
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 600, color: RED, zIndex: 50, animation: 'slideUp 0.3s ease', whiteSpace: 'nowrap' }}>
          {flash}
        </div>
      )}
      {children}
      {footer}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {showLineage && <LineageModal belt={belt} rosterById={rosterById} onClose={() => setShowLineage(false)} />}
    </main>
  )

  // ── Signed out ──
  if (!user) {
    return page(
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '36px 32px', maxWidth: 340, width: '90%', textAlign: 'center', marginTop: 48, animation: 'slideUp 0.4s ease' }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🥊</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Private UFC pick'em</div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 24, lineHeight: 1.6 }}>
          Pick winners for every PPV main card, steal the belt from your friends,
          defend it event after event. Sign in to join.
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
        <div style={{ fontSize: 32, marginBottom: 10 }}>🥊</div>
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
        {joinState === 'bad' && <div style={{ fontSize: 12, color: RED, marginBottom: 8 }}>Wrong code — try again</div>}
        <button type="submit" disabled={!code.trim() || joinState === 'busy'} style={{ width: '100%', background: code.trim() ? GOLD : CARD, border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 700, color: code.trim() ? '#0F0E0C' : '#555', cursor: code.trim() ? 'pointer' : 'default', transition: 'background 0.2s' }}>
          {joinState === 'busy' ? 'Joining…' : 'Join'}
        </button>
      </form>
    )
  }

  // ── Member ──
  const tabs = [
    ['event', 'Event'],
    ['board', 'Standings'],
    ...(isAdmin ? [['admin', 'Admin']] : []),
  ]

  const pickable = evFights.filter(f => !f.scratched)
  const pickedCount = pickable.filter(f => myPicksByFight[f.id]).length

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

      {events.length === 0 && view !== 'admin' && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '20px 24px', maxWidth: 420, width: '90%', textAlign: 'center', fontSize: 13, color: MUTED, lineHeight: 1.65 }}>
          No event on the card yet.
          {isAdmin && <> Head to the <b style={{ color: GOLD }}>Admin</b> tab to create the first one.</>}
        </div>
      )}

      {events.length > 1 && view !== 'board' && (
        <div className="oc-chips" style={{ justifyContent: 'center', maxWidth: 560, padding: '0 12px', marginBottom: 14 }}>
          {events.map(ev => (
            <button key={ev.id} onClick={() => setSelEvent(ev.id)} className="oc-chip" style={{
              background: effEvent?.id === ev.id ? 'rgba(201,168,76,0.15)' : 'none',
              border: `1px solid ${effEvent?.id === ev.id ? GOLD : BORDER}`,
              borderRadius: 16, color: effEvent?.id === ev.id ? GOLD : MUTED,
              cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '5px 12px',
            }}>
              {ev.name} · {fmtShort(ev.starts_at)}
            </button>
          ))}
        </div>
      )}

      {view === 'event' && effEvent && (
        <div style={{ width: '100%', maxWidth: 560, padding: '0 12px', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 800, letterSpacing: 1, color: INK }}>{effEvent.name}</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
              {fmtDay(effEvent.starts_at)} · {fmtTime(effEvent.starts_at)}{TZ_ABBR ? ` ${TZ_ABBR}` : ''}
            </div>
            <div style={{ fontSize: 12, color: started ? RED : MUTED, marginTop: 6 }}>
              {started
                ? 'Event started — picks are locked and everyone\'s are visible'
                : <>Picks lock at the event start · You've picked <b style={{ color: GOLD }}>{pickedCount}</b> of <b style={{ color: GOLD }}>{pickable.length}</b> fights</>}
            </div>
            {!started && myLock == null && pickable.length > 0 && (
              <div style={{ fontSize: 11, color: '#5A5040', marginTop: 3 }}>Don't forget your ★ Lock of the Night (one pick, double points)</div>
            )}
          </div>

          {evFights.length === 0 && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 22px', textAlign: 'center', fontSize: 13, color: MUTED }}>
              The card hasn't been announced yet — check back soon.
            </div>
          )}

          {evFights.map(f => (
            <FightCard
              key={f.id} fight={f} mine={myPicksByFight[f.id]} started={started}
              expanded={openFight === f.id} onToggle={() => toggleFight(f)}
              onWinner={pickWinner} onMethod={pickMethod} onRound={pickRound} onLock={toggleLock}
              roster={roster} meId={user.id} picks={picks} liveScores={liveScores}
            />
          ))}
        </div>
      )}

      {view === 'board' && (
        <div style={{ width: '100%', maxWidth: 560, padding: '0 12px', boxSizing: 'border-box' }}>
          <BeltBanner belt={belt} rosterById={rosterById} onLineage={() => setShowLineage(true)} />
          {effEvent && liveRanking.length > 0 && (
            <StandingsTable
              title={`${effEvent.name}${gradedEvents.some(g => g.id === effEvent.id) ? '' : started ? ' · live' : ' · picks in'}`}
              rows={liveRanking.map(r => ({ user_id: r.user_id, pts: r.total, sub: `${r.winners} winner${r.winners !== 1 ? 's' : ''}` }))}
              rosterById={rosterById} meId={user.id}
            />
          )}
          <StandingsTable
            title="All-time"
            rows={allTime.map(r => ({ user_id: r.user_id, pts: r.points, sub: `${r.events} event${r.events !== 1 ? 's' : ''}` }))}
            rosterById={rosterById} meId={user.id}
            empty="Nothing scored yet — the first graded event starts the count."
          />
          {gradedEvents.length > 1 && (
            <StandingsTable
              title="Form · last 6 events"
              rows={form.map(r => ({ user_id: r.user_id, pts: r.points, sub: `${r.events} event${r.events !== 1 ? 's' : ''}` }))}
              rosterById={rosterById} meId={user.id}
            />
          )}
        </div>
      )}

      {view === 'admin' && isAdmin && (
        <AdminPanel
          events={events} effEvent={effEvent} fights={fights} now={now}
          onSaveEvent={saveEvent} onDeleteEvent={deleteEvent}
          onAddFight={addFight} onUpdateFight={updateFight} onDeleteFight={deleteFight}
          confirmKey={confirmKey} confirmTap={confirmTap} showFlash={showFlash}
        />
      )}
    </>
  )
}

// ── Fight card ──────────────────────────────────────────────────────────────

function FightCard({ fight: f, mine, started, expanded, onToggle, onWinner, onMethod, onRound, onLock, roster, meId, picks, liveScores }) {
  const graded = !!f.winner && !f.scratched
  const isFinish = mine?.method === 'ko' || mine?.method === 'sub'
  const interactive = started && !f.scratched

  const fighterBtn = (side) => {
    const name = side === 'a' ? f.fighter_a : f.fighter_b
    const selected = mine?.winner === side
    const underdog = f.favorite && f.favorite !== side
    return (
      <button
        key={side}
        className="oc-fbtn"
        onClick={() => onWinner(f, side)}
        disabled={started || f.scratched}
        style={{
          background: selected ? GOLD : '#0F0E0C',
          border: `1px solid ${selected ? GOLD : BORDER}`,
          borderRadius: 10, padding: '12px 6px', cursor: started || f.scratched ? 'default' : 'pointer',
          color: selected ? '#0F0E0C' : INK, fontSize: 14, fontWeight: 700,
          pointerEvents: started || f.scratched ? 'none' : 'auto',
          opacity: f.scratched ? 0.45 : 1, transition: 'background 0.15s',
        }}
      >
        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        {underdog && (
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: selected ? '#0F0E0C' : GOLD, marginTop: 2 }}>
            UNDERDOG +{POINTS.underdog}
          </div>
        )}
      </button>
    )
  }

  const chip = (label, active, onClick, key) => (
    <button key={key ?? label} onClick={onClick} className="oc-chip" style={{
      background: active ? 'rgba(201,168,76,0.18)' : 'none',
      border: `1px solid ${active ? GOLD : BORDER}`, borderRadius: 14,
      color: active ? GOLD : MUTED, cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '5px 12px',
    }}>
      {label}
    </button>
  )

  const resultLine = () => {
    if (!graded) return null
    if (f.winner === 'draw' || f.winner === 'nc') {
      return <span style={{ color: MUTED }}>{f.winner === 'draw' ? 'Draw' : 'No contest'} — nobody scores</span>
    }
    const name = f.winner === 'a' ? f.fighter_a : f.fighter_b
    return (
      <span style={{ color: GREEN }}>
        ✓ {name}
        {f.method && <span style={{ color: INK }}> · {METHOD_LABELS[f.method]}</span>}
        {f.end_round && (f.method === 'ko' || f.method === 'sub') && <span style={{ color: INK }}> · R{f.end_round}</span>}
      </span>
    )
  }

  return (
    <div
      {...(interactive ? clickableProps(onToggle) : {})}
      aria-expanded={interactive ? expanded : undefined}
      style={{
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
        padding: '12px 14px', marginBottom: 10, cursor: interactive ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: GOLD, textTransform: 'uppercase', flexShrink: 0 }}>{boutLabel(f)}</span>
        <span style={{ fontSize: 11, color: MUTED, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {f.weight_class}{f.weight_class ? ' · ' : ''}{f.rounds} rounds
        </span>
        {f.scratched && <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: RED, flexShrink: 0 }}>SCRATCHED</span>}
        {mine?.is_lock && !f.scratched && <span title="Lock of the Night" style={{ fontSize: 12, color: GOLD, flexShrink: 0 }}>★ ×2</span>}
        {interactive && <span style={{ fontSize: 12, color: MUTED, flexShrink: 0 }}>{expanded ? '▴' : '▾'}</span>}
      </div>

      <div className="oc-fighters">
        {fighterBtn('a')}
        {fighterBtn('b')}
      </div>

      {f.scratched && (
        <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>Scratched from the card — picks on this fight are void.</div>
      )}

      {graded && (
        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 10 }}>{resultLine()}</div>
      )}

      {!started && !f.scratched && mine && (
        <div onClick={e => e.stopPropagation()} style={{ marginTop: 10 }}>
          <div className="oc-chips" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: MUTED, marginRight: 2 }}>Method +{POINTS.method}</span>
            {['ko', 'sub', 'dec'].map(m => chip(METHOD_LABELS[m], mine.method === m, () => onMethod(f, m), m))}
          </div>
          {isFinish && (
            <div className="oc-chips" style={{ alignItems: 'center', marginTop: 6 }}>
              <span style={{ fontSize: 11, color: MUTED, marginRight: 2 }}>Round +{POINTS.round}</span>
              {Array.from({ length: f.rounds }, (_, i) => i + 1).map(r =>
                chip(`R${r}`, mine.round === r, () => onRound(f, r), `r${r}`))}
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <button onClick={() => onLock(f)} style={{
              background: mine.is_lock ? 'rgba(201,168,76,0.18)' : 'none',
              border: `1px solid ${mine.is_lock ? GOLD : BORDER}`, borderRadius: 14,
              color: mine.is_lock ? GOLD : MUTED, cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '5px 12px',
            }}>
              ★ Lock of the Night ×2{mine.is_lock ? ' — on' : ''}
            </button>
          </div>
        </div>
      )}

      {!started && !f.scratched && !mine && (
        <div style={{ fontSize: 11, color: '#5A5040', marginTop: 8 }}>
          Tap a fighter to pick · winner {POINTS.winner} pts, bonuses after
        </div>
      )}

      {interactive && !expanded && (
        <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>Tap to see everyone's picks</div>
      )}

      {interactive && expanded && (
        <FightPicksPanel fight={f} roster={roster} meId={meId} picks={picks} liveScores={liveScores} />
      )}
    </div>
  )
}

function FightPicksPanel({ fight: f, roster, meId, picks, liveScores }) {
  const byUser = new Map(picks.filter(p => p.fight_id === f.id).map(p => [p.user_id, p]))
  const members = (roster ?? []).slice().sort((a, b) =>
    a.user_id === meId ? -1 : b.user_id === meId ? 1 : 0)
  const graded = !!f.winner

  const summary = (p) => {
    if (!p) return <span style={{ color: MUTED, fontSize: 12 }}>No pick</span>
    const r = liveScores[p.user_id]?.byFight?.[f.id]
    const winCol = graded ? (r?.winnerHit ? GREEN : RED) : INK
    return (
      <span style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        {p.is_lock && <span style={{ color: GOLD }}>★</span>}
        <span style={{ color: winCol }}>{p.winner === 'a' ? f.fighter_a : f.fighter_b}</span>
        {p.method && (
          <span style={{ color: graded ? (r?.methodHit ? GREEN : MUTED) : MUTED, fontWeight: 600, fontSize: 12 }}>
            {METHOD_LABELS[p.method]}
          </span>
        )}
        {p.round != null && (
          <span style={{ color: graded ? (r?.roundHit ? GREEN : MUTED) : MUTED, fontWeight: 600, fontSize: 12 }}>
            R{p.round}
          </span>
        )}
        {graded && r && (
          <span style={{ color: r.points > 0 ? GOLD : MUTED, fontWeight: 800, fontSize: 12, minWidth: 28, textAlign: 'right' }}>
            {r.points > 0 ? `+${r.points}` : '0'}
          </span>
        )}
      </span>
    )
  }

  return (
    <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 10, paddingTop: 8 }} onClick={e => e.stopPropagation()}>
      {members.map(mem => (
        <div key={mem.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
          <Avatar member={mem} />
          <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {mem.display_name ?? 'Player'}{mem.user_id === meId && <span style={{ color: MUTED, fontWeight: 600 }}> (you)</span>}
          </div>
          {summary(byUser.get(mem.user_id))}
        </div>
      ))}
    </div>
  )
}

function Avatar({ member: mem, size = 22 }) {
  return mem?.avatar_url
    ? <img src={mem.avatar_url} alt="" width={size} height={size} style={{ borderRadius: '50%', flexShrink: 0 }} referrerPolicy="no-referrer" />
    : <div style={{ width: size, height: size, borderRadius: '50%', background: '#0F0E0C', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: GOLD, flexShrink: 0 }}>
        {(mem?.display_name ?? '?')[0]?.toUpperCase()}
      </div>
}

// ── Standings ───────────────────────────────────────────────────────────────

function BeltBanner({ belt, rosterById, onLineage }) {
  const champ = belt.champion ? rosterById.get(belt.champion) : null
  return (
    <div style={{ background: CARD, border: `1px solid ${GOLD}`, borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 26, flexShrink: 0 }}>🏆</span>
      {belt.champion ? (
        <>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: GOLD, textTransform: 'uppercase' }}>Pool champion</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {champ?.display_name ?? 'Player'}
            </div>
            <div style={{ fontSize: 11, color: MUTED }}>
              {belt.defenses} defense{belt.defenses !== 1 ? 's' : ''}
            </div>
          </div>
          <button onClick={onLineage} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, color: GOLD, cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '4px 10px', flexShrink: 0 }}>
            Lineage
          </button>
        </>
      ) : (
        <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
          The belt is vacant — win the first event to claim it. Defend it on ties;
          lose it to anyone who outscores you.
        </div>
      )}
    </div>
  )
}

function StandingsTable({ title, rows, rosterById, meId, empty }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: GOLD, textTransform: 'uppercase', marginBottom: 8 }}>{title}</div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 13, color: MUTED }}>{empty ?? 'Nothing here yet.'}</div>
      ) : rows.map((r, i) => {
        const mem = rosterById.get(r.user_id)
        return (
          <div key={r.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: CARD, border: `1px solid ${r.user_id === meId ? GOLD : BORDER}`, borderRadius: 10, padding: '8px 12px', marginBottom: 6 }}>
            <span style={{ width: 18, textAlign: 'center', fontSize: 13, fontWeight: 800, color: i === 0 ? GOLD : MUTED, flexShrink: 0 }}>{i + 1}</span>
            <Avatar member={mem} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {mem?.display_name ?? 'Player'}{r.user_id === meId && <span style={{ color: MUTED, fontWeight: 600 }}> (you)</span>}
            </span>
            {r.sub && <span style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>{r.sub}</span>}
            <span style={{ fontSize: 16, fontWeight: 800, color: GOLD, flexShrink: 0, minWidth: 34, textAlign: 'right' }}>{r.pts}</span>
          </div>
        )
      })}
    </div>
  )
}

function LineageModal({ belt, rosterById, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const HOW = {
    claimed: 'claimed the vacant belt',
    defended: 'defended the belt',
    dethroned: 'took the belt',
    forfeited: 'took the vacant belt (champ sat out)',
  }

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label="Belt lineage" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'fadeIn 0.2s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 22px 18px', maxWidth: 380, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box', animation: 'slideUp 0.25s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: 2, color: INK }}>BELT LINEAGE</div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 18, padding: 4, lineHeight: 1 }}>✕</button>
        </div>
        {belt.lineage.length === 0
          ? <div style={{ fontSize: 13, color: MUTED }}>No graded events yet.</div>
          : belt.lineage.map((l, i) => (
            <div key={i} style={{ padding: '7px 0', borderBottom: i < belt.lineage.length - 1 ? '1px solid rgba(44,40,32,0.6)' : 'none', fontSize: 13 }}>
              <b style={{ color: l.how === 'defended' ? INK : GOLD }}>
                {rosterById.get(l.user_id)?.display_name ?? 'Player'}
              </b>{' '}
              <span style={{ color: MUTED }}>{HOW[l.how]}</span>
              <div style={{ fontSize: 11, color: '#5A5040', marginTop: 1 }}>{l.name}</div>
            </div>
          ))}
      </div>
    </div>
  )
}

// ── Rules ───────────────────────────────────────────────────────────────────

function RulesModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const sectionTitle = { fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: GOLD, textTransform: 'uppercase', marginTop: 18, marginBottom: 6 }
  const body = { fontSize: 13, color: '#ccc', lineHeight: 1.65, margin: 0 }
  const scoringRows = [
    ['Correct winner', `${POINTS.winner} pts`],
    [`Method (KO/TKO · Sub · Decision)`, `+${POINTS.method}`],
    ['Round (finishes only)', `+${POINTS.round}`],
    ['Underdog winner', `+${POINTS.underdog}`],
    ['★ Lock of the Night', '×2'],
  ]

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label="Pool rules" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'fadeIn 0.2s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '20px 22px 18px', maxWidth: 380, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxSizing: 'border-box', animation: 'slideUp 0.25s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: 2, color: INK }}>POOL RULES</div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 18, padding: 4, lineHeight: 1 }}>✕</button>
        </div>

        <div style={sectionTitle}>How it works</div>
        <p style={body}>
          Every UFC PPV main card, pick the winner of each fight. Picking the
          winner is the whole game if you want it to be — methods, rounds and
          the Lock are extra credit for the brave.
        </p>

        <div style={sectionTitle}>Scoring</div>
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', marginTop: 2 }}>
          {scoringRows.map(([label, pts], i) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', fontSize: 13, background: i % 2 ? 'transparent' : '#0F0E0C' }}>
              <span style={{ color: '#ccc' }}>{label}</span>
              <span style={{ color: GOLD, fontWeight: 800 }}>{pts}</span>
            </div>
          ))}
        </div>
        <p style={{ ...body, marginTop: 8 }}>
          The method bonus only pays if your winner was right. The round bonus
          pays when the fight ends in a finish in your round — decisions never
          pay it. The ★ Lock doubles one fight's whole haul; a wrong Lock just
          scores zero. Draws and no contests score nobody, and scratched fights
          are void.
        </p>

        <div style={sectionTitle}>Locking</div>
        <p style={body}>
          All picks lock when the main card starts — no picking the co-main
          after the opener. Until then, change anything. Everyone's picks stay
          hidden until the event starts; after that, tap any fight to see them.
        </p>

        <div style={sectionTitle}>The belt 🏆</div>
        <p style={body}>
          The first event's winner claims the pool belt. After every event, the
          champ <b>retains on a tie</b> (that's a title defense) — anyone who
          strictly outscores them takes the belt. Skip an event as champ and
          the event winner takes it. All-time points and a last-6-events form
          table run alongside.
        </p>
      </div>
    </div>
  )
}

// ── Admin ───────────────────────────────────────────────────────────────────

const emptyEvForm = { name: '', when: '', slug: '' }
const emptyFightForm = { a: '', b: '', wc: '', rounds: 3, favorite: '' }

function AdminPanel({ events, effEvent, fights, now, onSaveEvent, onDeleteEvent, onAddFight, onUpdateFight, onDeleteFight, confirmKey, confirmTap, showFlash }) {
  const [evForm, setEvForm] = useState(emptyEvForm)
  const [editingId, setEditingId] = useState(null)
  const [fightForm, setFightForm] = useState(emptyFightForm)
  const [proposals, setProposals] = useState(null)
  const [propBusy, setPropBusy] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')

  const evFights = effEvent ? fights.filter(f => f.event_id === effEvent.id) : []

  const input = (value, onChange, placeholder, extra = {}) => (
    <input
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      {...extra}
      style={{ width: '100%', boxSizing: 'border-box', background: '#0F0E0C', border: `1px solid ${BORDER}`, borderRadius: 8, color: '#fff', fontSize: 13, padding: '8px 12px', outline: 'none', marginBottom: 6, ...extra.style }}
    />
  )

  const smallBtn = (label, onClick, danger = false, active = false, key) => (
    <button key={key ?? label} onClick={onClick} style={{
      background: active ? 'rgba(201,168,76,0.18)' : 'none',
      border: `1px solid ${danger ? '#7a2c2c' : active ? GOLD : BORDER}`, borderRadius: 8,
      color: danger ? RED : active ? GOLD : MUTED, cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '5px 10px',
    }}>
      {label}
    </button>
  )

  const submitEvent = async () => {
    if (!evForm.name.trim() || !evForm.when) { showFlash('Event needs a name and a start time'); return }
    const ok = await onSaveEvent(evForm, editingId)
    if (ok) { setEvForm(emptyEvForm); setEditingId(null) }
  }

  const submitFight = async () => {
    if (!effEvent) return
    if (!fightForm.a.trim() || !fightForm.b.trim()) { showFlash('Both fighter names are required'); return }
    const ok = await onAddFight(effEvent, fightForm)
    if (ok) setFightForm(emptyFightForm)
  }

  const propose = async () => {
    if (!effEvent?.wiki_slug || propBusy) return
    setPropBusy(true)
    try {
      const rows = await fetchResults(effEvent.wiki_slug)
      const matched = matchFights(rows, evFights)
      setProposals(matched)
      if (matched.length === 0) showFlash('No fights matched the Wikipedia results')
    } catch {
      showFlash('Wikipedia fetch failed — try the paste fallback')
      setPasteOpen(true)
    }
    setPropBusy(false)
  }

  const proposeFromPaste = () => {
    const matched = matchFights(parsePasted(pasteText), evFights)
    setProposals(matched)
    if (matched.length === 0) showFlash('Nothing parseable in the pasted text')
  }

  const applyProposal = (p) => {
    const f = evFights.find(x => x.id === p.fight_id)
    if (!f || !p.winner) return
    onUpdateFight(f, {
      winner: p.winner,
      method: p.winner === 'draw' || p.winner === 'nc' ? null : p.method,
      end_round: p.winner === 'draw' || p.winner === 'nc' ? null : p.end_round,
    })
  }

  const proposalLabel = (p) => {
    const f = evFights.find(x => x.id === p.fight_id)
    if (!f) return null
    if (!p.winner) return 'unclear — grade by hand'
    if (p.winner === 'draw') return 'Draw'
    if (p.winner === 'nc') return 'No contest'
    const name = p.winner === 'a' ? f.fighter_a : f.fighter_b
    return `${name}${p.method ? ` · ${METHOD_LABELS[p.method]}` : ''}${p.end_round && (p.method === 'ko' || p.method === 'sub') ? ` · R${p.end_round}` : ''}`
  }

  return (
    <div style={{ width: '100%', maxWidth: 560, padding: '0 12px', boxSizing: 'border-box' }}>
      {/* Event builder */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: GOLD, textTransform: 'uppercase', marginBottom: 8 }}>
          {editingId ? 'Edit event' : 'New event'}
        </div>
        {input(evForm.name, v => setEvForm(f => ({ ...f, name: v })), 'Event name — e.g. UFC 324: Topuria vs Pimblett')}
        {input(evForm.when, v => setEvForm(f => ({ ...f, when: v })), '', { type: 'datetime-local' })}
        {input(evForm.slug, v => setEvForm(f => ({ ...f, slug: v })), 'Wikipedia slug for auto-grading — e.g. UFC_324')}
        <div style={{ display: 'flex', gap: 6 }}>
          {smallBtn(editingId ? 'Save changes' : 'Create event', submitEvent, false, true)}
          {editingId && smallBtn('Cancel', () => { setEditingId(null); setEvForm(emptyEvForm) })}
        </div>
        {events.length > 0 && (
          <div style={{ marginTop: 12, borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
            {events.map(ev => (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13 }}>
                <span style={{ flex: 1, minWidth: 0, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ev.name} <span style={{ color: MUTED, fontSize: 11 }}>· {fmtShort(ev.starts_at)}</span>
                </span>
                {smallBtn('Edit', () => { setEditingId(ev.id); setEvForm({ name: ev.name, when: toLocalInput(ev.starts_at), slug: ev.wiki_slug ?? '' }) }, false, false, `e${ev.id}`)}
                {smallBtn(confirmKey === `delev${ev.id}` ? 'Sure?' : '✕', () => confirmTap(`delev${ev.id}`, () => onDeleteEvent(ev)), true, false, `d${ev.id}`)}
              </div>
            ))}
          </div>
        )}
      </div>

      {effEvent && (
        <>
          {/* Fight builder */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: GOLD, textTransform: 'uppercase', marginBottom: 8 }}>
              Add fight · {effEvent.name}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {input(fightForm.a, v => setFightForm(f => ({ ...f, a: v })), 'Fighter A')}
              {input(fightForm.b, v => setFightForm(f => ({ ...f, b: v })), 'Fighter B')}
            </div>
            {input(fightForm.wc, v => setFightForm(f => ({ ...f, wc: v })), 'Weight class — e.g. Lightweight')}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: MUTED }}>Rounds</span>
              {[3, 5].map(r => smallBtn(`${r}`, () => setFightForm(f => ({ ...f, rounds: r })), false, fightForm.rounds === r, `rd${r}`))}
              <span style={{ fontSize: 11, color: MUTED, marginLeft: 8 }}>Favorite</span>
              {smallBtn('None', () => setFightForm(f => ({ ...f, favorite: '' })), false, fightForm.favorite === '')}
              {smallBtn(fightForm.a.trim() || 'A', () => setFightForm(f => ({ ...f, favorite: 'a' })), false, fightForm.favorite === 'a', 'fava')}
              {smallBtn(fightForm.b.trim() || 'B', () => setFightForm(f => ({ ...f, favorite: 'b' })), false, fightForm.favorite === 'b', 'favb')}
            </div>
            {smallBtn('Add fight', submitFight, false, true)}
          </div>

          {/* Grading */}
          {evFights.map(f => (
            <AdminFightRow
              key={f.id} fight={f}
              onUpdate={onUpdateFight} onDelete={onDeleteFight}
              confirmKey={confirmKey} confirmTap={confirmTap} smallBtn={smallBtn}
            />
          ))}

          {/* Wikipedia-assisted grading */}
          {evFights.length > 0 && new Date(effEvent.starts_at).getTime() <= now && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: GOLD, textTransform: 'uppercase', marginBottom: 8 }}>
                Assisted grading
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {effEvent.wiki_slug
                  ? smallBtn(propBusy ? 'Fetching…' : `Propose from Wikipedia (${effEvent.wiki_slug})`, propose, false, true)
                  : <span style={{ fontSize: 12, color: MUTED }}>Set the event's Wikipedia slug to enable auto-proposals.</span>}
                {smallBtn(pasteOpen ? 'Hide paste box' : 'Paste the results table', () => setPasteOpen(o => !o))}
              </div>
              {pasteOpen && (
                <div style={{ marginTop: 8 }}>
                  <textarea
                    value={pasteText} onChange={e => setPasteText(e.target.value)}
                    placeholder={'Copy the Results table off the Wikipedia event page and paste it here (one bout per line).'}
                    rows={5}
                    style={{ width: '100%', boxSizing: 'border-box', background: '#0F0E0C', border: `1px solid ${BORDER}`, borderRadius: 8, color: '#fff', fontSize: 12, padding: '8px 12px', outline: 'none', resize: 'vertical', marginBottom: 6 }}
                  />
                  {smallBtn('Parse pasted table', proposeFromPaste, false, true)}
                </div>
              )}
              {proposals && proposals.length > 0 && (
                <div style={{ marginTop: 10, borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>
                  {proposals.map(p => {
                    const f = evFights.find(x => x.id === p.fight_id)
                    if (!f) return null
                    return (
                      <div key={p.fight_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 12 }}>
                        <span style={{ flex: 1, minWidth: 0, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {f.fighter_a} vs {f.fighter_b} →{' '}
                          <b style={{ color: INK }}>{proposalLabel(p)}</b>
                          {p.fuzzy && <span style={{ color: '#f4c152' }}> · name match is fuzzy — double-check</span>}
                        </span>
                        {p.winner && smallBtn(f.winner ? 'Re-apply' : 'Apply', () => applyProposal(p), false, false, `ap${p.fight_id}`)}
                      </div>
                    )
                  })}
                  <div style={{ marginTop: 6 }}>
                    {smallBtn('Apply all', () => proposals.forEach(applyProposal), false, true)}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function AdminFightRow({ fight: f, onUpdate, onDelete, confirmKey, confirmTap, smallBtn }) {
  const graded = !!f.winner
  const isFinish = f.method === 'ko' || f.method === 'sub'

  const setWinner = (w) => {
    if (f.winner === w) { onUpdate(f, { winner: null, method: null, end_round: null }); return }
    onUpdate(f, w === 'draw' || w === 'nc'
      ? { winner: w, method: null, end_round: null }
      : { winner: w })
  }

  return (
    <div style={{ background: CARD, border: `1px solid ${graded ? 'rgba(134,239,172,0.35)' : BORDER}`, borderRadius: 12, padding: '10px 14px', marginBottom: 8, opacity: f.scratched ? 0.6 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: GOLD, textTransform: 'uppercase', flexShrink: 0 }}>{boutLabel(f)}</span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {f.fighter_a} vs {f.fighter_b}
          {f.favorite && <span style={{ color: MUTED, fontWeight: 400, fontSize: 11 }}> · fav: {f.favorite === 'a' ? f.fighter_a : f.fighter_b}</span>}
        </span>
        {smallBtn(f.scratched ? 'Unscratch' : 'Scratch', () => onUpdate(f, { scratched: !f.scratched }), false, f.scratched, 'scr')}
        {smallBtn(confirmKey === `delf${f.id}` ? 'Sure?' : '✕', () => confirmTap(`delf${f.id}`, () => onDelete(f)), true, false, 'del')}
      </div>
      {!f.scratched && (
        <div className="oc-chips" style={{ alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: MUTED }}>Winner</span>
          {smallBtn(f.fighter_a, () => setWinner('a'), false, f.winner === 'a', 'wa')}
          {smallBtn(f.fighter_b, () => setWinner('b'), false, f.winner === 'b', 'wb')}
          {smallBtn('Draw', () => setWinner('draw'), false, f.winner === 'draw', 'wd')}
          {smallBtn('NC', () => setWinner('nc'), false, f.winner === 'nc', 'wn')}
        </div>
      )}
      {(f.winner === 'a' || f.winner === 'b') && (
        <div className="oc-chips" style={{ alignItems: 'center', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: MUTED }}>Method</span>
          {['ko', 'sub', 'dec'].map(m =>
            smallBtn(METHOD_LABELS[m], () => onUpdate(f, { method: f.method === m ? null : m, end_round: m === 'dec' ? null : f.end_round }), false, f.method === m, `m${m}`))}
          {isFinish && (
            <>
              <span style={{ fontSize: 11, color: MUTED, marginLeft: 6 }}>Round</span>
              {Array.from({ length: f.rounds }, (_, i) => i + 1).map(r =>
                smallBtn(`${r}`, () => onUpdate(f, { end_round: f.end_round === r ? null : r }), false, f.end_round === r, `er${r}`))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
