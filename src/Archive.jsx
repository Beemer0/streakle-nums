import { useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from './supabase'
import { calcStreak } from './streak'
import { GAME_BY_KEY } from './games'
import GameIcon from './GameIcon'
import './Archive.css'

// ─── Config ───────────────────────────────────────────────────────────────────
const LAUNCH_DATE = '2026-05-16'
const FREE_DAYS   = 7

// Games that shipped after LAUNCH_DATE start their calendar later.
const GAME_META = {
  mines:    { start: '2026-09-04' },
  weave:    { start: '2026-10-17' },
  scramble: { start: '2026-10-18' },
}

const LEGEND = [
  { className: 'is-won',  label: 'Completed' },
  { className: 'is-lost', label: 'Attempted' },
  { className: '',        label: 'Not played' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toLocalStr(date) {
  return date.toLocaleDateString('en-CA') // YYYY-MM-DD
}

function getTodayStr() {
  return toLocalStr(new Date())
}

function isAvailable(dateStr, launchStr = LAUNCH_DATE) {
  const launch = new Date(launchStr + 'T00:00:00')
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

function getCalendarDays(year, month) {
  const firstDow    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells       = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(toLocalStr(new Date(year, month, d)))
  return cells
}

// ─── Icons (16px grid, currentColor, like GameShell's) ────────────────────────
function Glyph({ size = 16, strokeWidth = 1.8, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}
const CloseIcon = () => <Glyph size={14}><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" /></Glyph>
const PrevIcon  = () => <Glyph><path d="M10 3.5L5.5 8l4.5 4.5" /></Glyph>
const NextIcon  = () => <Glyph><path d="M6 3.5L10.5 8 6 12.5" /></Glyph>
const CheckIcon = () => <Glyph size={10} strokeWidth={2.4}><path d="M3 8.5l3.2 3.2L13 4.5" /></Glyph>
const LockIcon  = ({ size = 13 }) => (
  <Glyph size={size} strokeWidth={1.6}>
    <rect x="3" y="7" width="10" height="7" rx="1.6" />
    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
  </Glyph>
)

// ─── Component ────────────────────────────────────────────────────────────────
export default function Archive({ game, onSelectDate, onClose }) {
  const { user } = useAuth()
  const [results,  setResults]  = useState({})
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)

  const info      = GAME_BY_KEY[game]
  const launchStr = GAME_META[game]?.start ?? LAUNCH_DATE
  const today  = new Date()
  const launch = new Date(launchStr + 'T00:00:00')

  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const todayStr = getTodayStr()
  const panelRef = useRef(null)

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

  // ── Focus: move into the dialog on open, trap Tab, restore on close ───────
  useEffect(() => {
    const prevFocus = document.activeElement
    const panel = panelRef.current
    panel?.querySelector('button')?.focus()
    const onKeyDown = (e) => {
      if (e.key !== 'Tab' || !panel) return
      const items = [...panel.querySelectorAll('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')]
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    panel?.addEventListener('keydown', onKeyDown)
    return () => {
      panel?.removeEventListener('keydown', onKeyDown)
      if (prevFocus instanceof HTMLElement) prevFocus.focus()
    }
  }, [])

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
  const available = calDays.filter(Boolean).filter(d => isAvailable(d, launchStr))
  const completed = available.filter(d => results[d] === true)
  const streak    = user ? calcStreak(Object.keys(results).filter(d => results[d] === true)) : 0

  // ── Select handler ───────────────────────────────────────────────────────
  function handleSelect(dateStr) {
    if (!dateStr || !isAvailable(dateStr, launchStr) || isLocked(dateStr, user)) return
    setSelected(dateStr)
    setTimeout(() => { onSelectDate(dateStr); onClose() }, 150)
  }

  const monthName = new Date(viewYear, viewMonth, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const progress = available.length ? Math.round((completed.length / available.length) * 100) : 0

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="ar-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={panelRef} className="ar-panel" role="dialog" aria-modal="true" aria-label="Puzzle archive"
        style={{ '--ar-game': info.color }}>

        {/* ── Header ── */}
        <div className="ar-head">
          <GameIcon game={info} size={32} />
          <div className="ar-head-text">
            <h2 className="ar-title">{info.title} Archive</h2>
            <div className="ar-sub">
              {user ? 'All puzzles since launch' : 'Last 7 days · sign in for full history'}
            </div>
          </div>
          <button type="button" className="ar-btn" aria-label="Close archive" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {/* ── Streak + Stats (logged in) ── */}
        {user && (
          <div className="ar-stats">
            <div className="ar-stats-row">
              <div className="ar-streak">
                <span className="ar-fire" aria-hidden="true">🔥</span>
                <span className="ar-streak-num">{streak}</span>
                <span>day streak</span>
              </div>
              <div className="ar-count"><b>{completed.length}</b> / {available.length} this month</div>
            </div>
            <div className="ar-bar">
              <div className="ar-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* ── Sign-in nudge (guest) ── */}
        {!user && (
          <div className="ar-nudge">
            <LockIcon />
            <span>You're only seeing the last 7 days. Sign in to play every puzzle since launch.</span>
          </div>
        )}

        {/* ── Calendar ── */}
        <div className="ar-cal">
          <div className="ar-monthbar">
            <button type="button" className="ar-btn" aria-label="Previous month" onClick={prevMonth} disabled={!canGoBack}>
              <PrevIcon />
            </button>
            <span className="ar-month">{monthName}</span>
            <button type="button" className="ar-btn" aria-label="Next month" onClick={nextMonth} disabled={!canGoForward}>
              <NextIcon />
            </button>
          </div>

          <div className="ar-dow">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d}>{d}</div>)}
          </div>

          {loading ? (
            <div className="ar-loading">Loading…</div>
          ) : (
            <div className="ar-days">
              {calDays.map((dateStr, i) => {
                if (!dateStr) return <div key={`e${i}`} />

                const avail   = isAvailable(dateStr, launchStr)
                const locked  = isLocked(dateStr, user)
                const open    = avail && !locked
                const played  = dateStr in results
                const win     = open && results[dateStr] === true
                const loss    = open && played && !win
                const dayNum  = parseInt(dateStr.split('-')[2], 10)
                const classes = [
                  'ar-day',
                  !avail && 'is-off',
                  avail && locked && 'is-locked',
                  dateStr === todayStr && 'is-today',
                  win && 'is-won',
                  loss && 'is-lost',
                  dateStr === selected && 'is-selected',
                ].filter(Boolean).join(' ')

                return (
                  <button
                    key={dateStr}
                    type="button"
                    className={classes}
                    onClick={() => handleSelect(dateStr)}
                    disabled={!open}
                    title={locked ? 'Sign in to unlock' : dateStr}
                    style={{ animationDelay: `${(i % 7) * 0.025}s` }}
                  >
                    <span className="ar-num">{dayNum}</span>
                    <span className="ar-mark">
                      {win && <CheckIcon />}
                      {loss && <span className="ar-dot" />}
                      {avail && locked && <LockIcon size={9} />}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Legend ── */}
        <div className="ar-legend">
          {LEGEND.map(({ className, label }) => (
            <span key={label} className="ar-key">
              <span className={`ar-swatch ${className}`.trim()} />
              {label}
            </span>
          ))}
        </div>

      </div>
    </div>
  )
}
