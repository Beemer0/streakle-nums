import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from './supabase'

// ─── Config ───────────────────────────────────────────────────────────────────
const LAUNCH_DATE = '2026-05-16'
const FREE_DAYS   = 7

const GAME_META = {
  nums:     { emoji: '🔢', label: 'Nums' },
  link:     { emoji: '🔗', label: 'Link' },
  words:    { emoji: '📝', label: 'Words' },
  gridiron: { emoji: '🏈', label: 'Gridiron' },
  faceoff:  { emoji: '🥊', label: 'Faceoff' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toLocalStr(date) {
  return date.toLocaleDateString('en-CA') // YYYY-MM-DD
}

function getTodayStr() {
  return toLocalStr(new Date())
}

function isAvailable(dateStr) {
  const launch = new Date(LAUNCH_DATE + 'T00:00:00')
  const date   = new Date(dateStr    + 'T00:00:00')
  const today  = new Date(); today.setHours(23, 59, 59, 999)
  return date >= launch && date <= today
}

function isLocked(dateStr, user) {
  if (user) return false
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - FREE_DAYS + 1)
  cutoff.setHours(0, 0, 0, 0)
  return new Date(dateStr + 'T00:00:00') < cutoff
}

function calcStreak(results) {
  let streak = 0
  const d = new Date()
  while (true) {
    const str = toLocalStr(d)
    if (results[str] === true) { streak++; d.setDate(d.getDate() - 1) }
    else break
  }
  return streak
}

function getCalendarDays(year, month) {
  const firstDow    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells       = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(toLocalStr(new Date(year, month, d)))
  return cells
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Archive({ game, onSelectDate, onClose }) {
  const { user } = useAuth()
  const [results,  setResults]  = useState({})
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)

  const today  = new Date()
  const launch = new Date(LAUNCH_DATE + 'T00:00:00')

  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const meta     = GAME_META[game] ?? { emoji: '🎮', label: game }
  const todayStr = getTodayStr()

  // ── Fetch results ────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchResults() {
      if (!user) { setLoading(false); return }
      const { data, error } = await supabase
        .from('game_results')
        .select('puzzle_date, completed')
        .eq('user_id', user.id)
        .eq('game', game)
      if (data) {
        const map = {}
        data.forEach(r => { map[r.puzzle_date] = r.completed })
        setResults(map)
      }
      if (error) console.error('Archive error:', error)
      setLoading(false)
    }
    fetchResults()
  }, [game, user])

  // ── Escape to close ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // ── Month navigation ─────────────────────────────────────────────────────
  const canGoBack    = !(viewYear === launch.getFullYear() && viewMonth === launch.getMonth())
  const canGoForward = !(viewYear === today.getFullYear()  && viewMonth === today.getMonth())

  function prevMonth() {
    if (!canGoBack) return
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (!canGoForward) return
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // ── Stats for current view month ─────────────────────────────────────────
  const calDays   = getCalendarDays(viewYear, viewMonth)
  const available = calDays.filter(Boolean).filter(isAvailable)
  const completed = available.filter(d => results[d] === true)
  const streak    = user ? calcStreak(results) : 0

  // ── Select handler ───────────────────────────────────────────────────────
  function handleSelect(dateStr) {
    if (!dateStr || !isAvailable(dateStr) || isLocked(dateStr, user)) return
    setSelected(dateStr)
    setTimeout(() => { onSelectDate(dateStr); onClose() }, 150)
  }

  const monthName = new Date(viewYear, viewMonth, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes archiveOverlayIn {
          from { opacity: 0 } to { opacity: 1 }
        }
        @keyframes archivePanelIn {
          from { opacity: 0; transform: translateY(24px) scale(0.96) }
          to   { opacity: 1; transform: translateY(0)   scale(1)    }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px) }
          to   { opacity: 1; transform: translateY(0)   }
        }
        .arch-close:hover  { background: rgba(255,255,255,0.14) !important; color: #fff !important; }
        .arch-nav:hover:not(:disabled) { background: rgba(255,255,255,0.14) !important; }
        .arch-day { transition: transform 0.13s ease, background 0.13s, border-color 0.13s; }
        .arch-day:hover:not(.arch-disabled) {
          transform: scale(1.12);
          border-color: rgba(255,255,255,0.28) !important;
          z-index: 2;
        }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16,
          animation: 'archiveOverlayIn 0.2s ease',
        }}
      >
        {/* ── Panel ── */}
        <div style={{
          background: 'rgba(18,18,30,0.95)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 24,
          padding: '24px 22px 22px',
          width: '100%', maxWidth: 400,
          boxShadow: '0 32px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.07)',
          display: 'flex', flexDirection: 'column', gap: 18,
          animation: 'archivePanelIn 0.25s cubic-bezier(0.34,1.4,0.64,1)',
        }}>

          {/* ── Header ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 21, fontWeight: 700, color: '#fff', letterSpacing: '-0.4px' }}>
                {meta.emoji} {meta.label} Archive
              </div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 3 }}>
                {user ? 'All puzzles since launch' : 'Last 7 days · sign in for full history'}
              </div>
            </div>
            <button
              className="arch-close"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#888', fontSize: 15, cursor: 'pointer',
                padding: '6px 11px', borderRadius: 10,
                transition: 'background 0.15s, color 0.15s',
              }}
            >✕</button>
          </div>

          {/* ── Streak + Stats (logged in) ── */}
          {user && (
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, padding: '14px 16px',
              display: 'flex', flexDirection: 'column', gap: 10,
              animation: 'fadeUp 0.35s ease',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 22 }}>🔥</span>
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#f5a623', lineHeight: 1 }}>
                    {streak}
                  </span>
                  <span style={{ fontSize: 13, color: '#777' }}>day streak</span>
                </div>
                <div style={{ fontSize: 13, color: '#666' }}>
                  <span style={{ color: '#4ade80', fontWeight: 600 }}>{completed.length}</span>
                  <span> / {available.length} this month</span>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{
                height: 6, background: 'rgba(255,255,255,0.06)',
                borderRadius: 99, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: available.length
                    ? `${Math.round((completed.length / available.length) * 100)}%`
                    : '0%',
                  background: 'linear-gradient(90deg, #4ade80 0%, #22d3ee 100%)',
                  borderRadius: 99,
                  transition: 'width 0.7s cubic-bezier(0.34,1.4,0.64,1)',
                }} />
              </div>
            </div>
          )}

          {/* ── Sign-in nudge (guest) ── */}
          {!user && (
            <div style={{
              background: 'rgba(245,166,35,0.08)',
              border: '1px solid rgba(245,166,35,0.18)',
              borderRadius: 12, padding: '11px 14px',
              fontSize: 13, color: '#f5a623', lineHeight: 1.5,
            }}>
              🔒 You're only seeing the last 7 days. Sign in to play every puzzle since launch.
            </div>
          )}

          {/* ── Divider ── */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 -4px' }} />

          {/* ── Calendar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Month navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                className="arch-nav"
                onClick={prevMonth}
                disabled={!canGoBack}
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: canGoBack ? '#ccc' : '#2a2a2a',
                  cursor: canGoBack ? 'pointer' : 'default',
                  padding: '5px 13px', borderRadius: 9, fontSize: 18,
                  transition: 'background 0.15s',
                }}
              >‹</button>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{monthName}</span>
              <button
                className="arch-nav"
                onClick={nextMonth}
                disabled={!canGoForward}
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: canGoForward ? '#ccc' : '#2a2a2a',
                  cursor: canGoForward ? 'pointer' : 'default',
                  padding: '5px 13px', borderRadius: 9, fontSize: 18,
                  transition: 'background 0.15s',
                }}
              >›</button>
            </div>

            {/* Day-of-week headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <div key={d} style={{
                  textAlign: 'center', fontSize: 11,
                  color: '#444', fontWeight: 700, letterSpacing: '0.04em', paddingBottom: 2,
                }}>{d}</div>
              ))}
            </div>

            {/* Day cells */}
            {loading ? (
              <div style={{ textAlign: 'center', color: '#444', padding: '28px 0', fontSize: 13 }}>
                Loading…
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
                {calDays.map((dateStr, i) => {
                  if (!dateStr) return <div key={`e${i}`} />

                  const avail   = isAvailable(dateStr)
                  const locked  = isLocked(dateStr, user)
                  const isToday = dateStr === todayStr
                  const isSel   = dateStr === selected
                  const played  = dateStr in results
                  const win     = results[dateStr] === true
                  const loss    = played && !win
                  const dayNum  = parseInt(dateStr.split('-')[2], 10)
                  const col     = i % 7

                  let bg          = 'rgba(255,255,255,0.04)'
                  let borderColor = 'rgba(255,255,255,0.07)'
                  let borderLeft  = `1px solid ${borderColor}`

                  if (!avail) {
                    bg = 'transparent'; borderColor = 'transparent'; borderLeft = 'none'
                  } else if (isSel) {
                    bg = 'rgba(245,166,35,0.2)'; borderColor = 'rgba(245,166,35,0.55)'
                  } else if (isToday) {
                    bg = 'rgba(255,255,255,0.09)'; borderColor = 'rgba(255,255,255,0.22)'
                  }

                  if (avail && !locked && (win || loss)) {
                    borderLeft = `3px solid ${win ? '#4ade80' : '#f87171'}`
                  }

                  const dotColor = win ? '#4ade80' : loss ? '#f87171' : 'transparent'

                  return (
                    <button
                      key={dateStr}
                      className={`arch-day${!avail || locked ? ' arch-disabled' : ''}`}
                      onClick={() => handleSelect(dateStr)}
                      disabled={!avail || locked}
                      title={locked ? 'Sign in to unlock' : dateStr}
                      style={{
                        position: 'relative',
                        background: bg,
                        border: `1px solid ${borderColor}`,
                        borderLeft,
                        borderRadius: 10,
                        aspectRatio: '1',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 3,
                        cursor: avail && !locked ? 'pointer' : 'default',
                        opacity: !avail ? 0 : locked ? 0.28 : 1,
                        padding: 0, color: '#fff', outline: 'none',
                        animation: avail
                          ? `fadeUp 0.28s ease ${col * 0.025}s both`
                          : 'none',
                      }}
                    >
                      <span style={{
                        fontSize: 13, lineHeight: 1,
                        fontWeight: isToday ? 700 : 400,
                        color: isToday ? '#fff' : '#aaa',
                      }}>{dayNum}</span>

                      <div style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: dotColor,
                        opacity: dotColor === 'transparent' ? 0 : 1,
                      }} />

                      {locked && (
                        <span style={{
                          fontSize: 8, position: 'absolute', bottom: 3, color: '#333',
                        }}>🔒</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Legend ── */}
          <div style={{
            display: 'flex', gap: 14, justifyContent: 'center',
            fontSize: 11, color: '#444',
          }}>
            {[
              { color: '#4ade80', label: 'Completed' },
              { color: '#f87171', label: 'Attempted' },
              { color: 'rgba(255,255,255,0.12)', label: 'Not played' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                <span>{label}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  )
}
