import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from './supabase'

const GAME_LABELS = {
  nums:      { emoji: '🔢', label: 'Nums' },
  link:      { emoji: '🔗', label: 'Link' },
  words:     { emoji: '📝', label: 'Words' },
  gridiron:  { emoji: '🏈', label: 'Gridiron' },
  faceoff:   { emoji: '🥊', label: 'Faceoff' },
}

const LAUNCH_DATE = '2026-05-16'
const FREE_DAYS   = 7

function getDayList() {
  const days = []
  const launch = new Date(LAUNCH_DATE + 'T00:00:00')
  const d = new Date()
  while (d >= launch) {
    days.push(d.toLocaleDateString('en-CA'))
    d.setDate(d.getDate() - 1)
  }
  return days
}

function formatLabel(dateStr, index) {
  if (index === 0) return 'Today'
  if (index === 1) return 'Yesterday'
  // Append T00:00:00 to force local-time parsing (avoids UTC-shift bug)
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function Archive({ game, onSelectDate, onClose }) {
  const { user } = useAuth()
  const [results,  setResults]  = useState({})
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)

  const days = getDayList()
  const meta = GAME_LABELS[game] ?? { emoji: '🎮', label: game }

  // ── Fetch this user's results for this game ───────────────────────────────
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
      if (error) console.error('Archive fetch error:', error)
      setLoading(false)
    }
    fetchResults()
  }, [game, user])

  // ── Close on Escape ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleSelect(dateStr, index) {
    const locked = !user && index >= FREE_DAYS
    if (locked) return
    setSelected(dateStr)
    // Short delay so user sees the highlight before modal closes
    setTimeout(() => {
      onSelectDate(dateStr)
      onClose()
    }, 120)
  }

  // ── Status icon ───────────────────────────────────────────────────────────
  function statusIcon(dateStr, index) {
    const locked = !user && index >= FREE_DAYS
    if (locked)                    return { icon: '🔒', color: '#555' }
    if (!(dateStr in results))     return { icon: '⬜', color: '#666' }
    return results[dateStr]
      ? { icon: '✅', color: '#4ade80' }
      : { icon: '❌', color: '#f87171' }
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const styles = {
    overlay: {
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
      animation: 'archiveFadeIn 0.18s ease',
    },
    panel: {
      background: 'linear-gradient(160deg, #1c1c30 0%, #12121e 100%)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 20,
      padding: '24px 20px 20px',
      width: '100%', maxWidth: 380,
      maxHeight: '82vh',
      display: 'flex', flexDirection: 'column', gap: 14,
      boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      animation: 'archiveSlideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)',
    },
    header: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    },
    title: {
      margin: 0, color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px',
    },
    subtitle: {
      margin: '4px 0 0', color: '#888', fontSize: 13,
    },
    closeBtn: {
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      color: '#aaa', fontSize: 18,
      cursor: 'pointer', lineHeight: 1,
      padding: '5px 9px', borderRadius: 8,
      transition: 'background 0.15s, color 0.15s',
      flexShrink: 0,
    },
    banner: {
      background: 'rgba(245,166,35,0.1)',
      border: '1px solid rgba(245,166,35,0.25)',
      borderRadius: 10, padding: '10px 14px',
      fontSize: 13, color: '#f5a623', lineHeight: 1.45,
    },
    divider: {
      height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 -4px',
    },
    list: {
      overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6,
      paddingRight: 2,
    },
    loadingText: {
      color: '#666', textAlign: 'center', margin: '32px 0', fontSize: 14,
    },
  }

  function rowStyle(dateStr, index) {
    const isToday    = index === 0
    const isSelected = selected === dateStr
    const locked     = !user && index >= FREE_DAYS

    return {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: isSelected
        ? 'rgba(245,166,35,0.15)'
        : isToday
        ? 'rgba(255,255,255,0.05)'
        : 'transparent',
      border: isToday
        ? '1px solid rgba(255,255,255,0.1)'
        : '1px solid transparent',
      borderRadius: 11, padding: '11px 14px',
      cursor: locked ? 'not-allowed' : 'pointer',
      opacity: locked ? 0.38 : 1,
      transition: 'background 0.13s, border-color 0.13s',
      width: '100%', textAlign: 'left', color: '#fff',
      userSelect: 'none',
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes archiveFadeIn {
          from { opacity: 0 } to { opacity: 1 }
        }
        @keyframes archiveSlideUp {
          from { opacity: 0; transform: translateY(18px) scale(0.97) }
          to   { opacity: 1; transform: translateY(0)   scale(1)    }
        }
        .archive-row:hover:not(:disabled) {
          background: rgba(255,255,255,0.06) !important;
          border-color: rgba(255,255,255,0.12) !important;
        }
        .archive-close:hover {
          background: rgba(255,255,255,0.12) !important;
          color: #fff !important;
        }
        .archive-list::-webkit-scrollbar { width: 4px }
        .archive-list::-webkit-scrollbar-track { background: transparent }
        .archive-list::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.12); border-radius: 4px;
        }
      `}</style>

      {/* Backdrop */}
      <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div style={styles.panel}>

          {/* Header */}
          <div style={styles.header}>
            <div>
              <h2 style={styles.title}>
                {meta.emoji} {meta.label} Archive
              </h2>
              <p style={styles.subtitle}>
                {user
                  ? `All puzzles since launch`
                  : `Sign in to unlock full history`}
              </p>
            </div>
            <button
              className="archive-close"
              style={styles.closeBtn}
              onClick={onClose}
              aria-label="Close archive"
            >✕</button>
          </div>

          {/* Sign-in nudge */}
          {!user && (
            <div style={styles.banner}>
              🔒 You're only seeing the last 7 days. Sign in to play every puzzle since launch.
              Free players get the last {FREE_DAYS} puzzles.
            </div>
          )}

          <div style={styles.divider} />

          {/* Day list */}
          <div className="archive-list" style={styles.list}>
            {loading ? (
              <p style={styles.loadingText}>Loading…</p>
            ) : (
              days.map((dateStr, i) => {
                const { icon, color } = statusIcon(dateStr, i)
                const locked = !user && i >= FREE_DAYS

                return (
                  <button
                    key={dateStr}
                    className="archive-row"
                    style={rowStyle(dateStr, i)}
                    disabled={locked}
                    onClick={() => handleSelect(dateStr, i)}
                    title={locked ? 'Sign in to unlock' : undefined}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 15, color: '#f0f0f0' }}>
                        {formatLabel(dateStr, i)}
                        {i === 0 && (
                          <span style={{
                            marginLeft: 8, fontSize: 11, fontWeight: 500,
                            background: 'rgba(245,166,35,0.2)', color: '#f5a623',
                            padding: '2px 7px', borderRadius: 20, verticalAlign: 'middle',
                          }}>TODAY</span>
                        )}
                      </span>
                      <span style={{ fontSize: 12, color: '#555' }}>{dateStr}</span>
                    </div>
                    <span style={{ fontSize: 20, color, flexShrink: 0 }}>{icon}</span>
                  </button>
                )
              })
            )}
          </div>

        </div>
      </div>
    </>
  )
}