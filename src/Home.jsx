import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from './supabase'
import UserMenu from './UserMenu'
import { calcStreak } from './streak'
import { useSeo, PAGE_SEO } from './seo'
import { GAMES } from './games'

function calcStreaks(allResults) {
  const byGame = {}
  allResults.forEach(r => {
    if (!byGame[r.game]) byGame[r.game] = []
    byGame[r.game].push(r.puzzle_date)
  })
  const streaks = {}
  Object.entries(byGame).forEach(([game, dates]) => {
    streaks[game] = calcStreak(dates)
  })
  return streaks
}

export default function Home() {
  const { user } = useAuth()
  const [todayResults, setTodayResults] = useState({})
  const [streaks, setStreaks] = useState({})

  useSeo(PAGE_SEO.home)

  useEffect(() => {
    if (!user) return
    const today = new Date().toLocaleDateString('en-CA')
    supabase
      .from('game_results')
      .select('game, puzzle_date, completed')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!data) return
        const map = {}
        data.forEach(r => { if (r.puzzle_date === today) map[r.game] = r.completed })
        setTodayResults(map)
        const completed = data.filter(r => r.completed)
        setStreaks(calcStreaks(completed))
      })
  }, [user])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '48px 24px 48px',
      position: 'relative',
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .game-row { text-decoration: none; display: flex; align-items: center; transition: background 0.15s; }
        .game-row:hover { background: var(--surface-raised) !important; }
        .game-row:hover .game-row-cta { background: var(--gold-hover) !important; }
        @media (max-width: 520px) {
          .game-row { padding: 14px 16px !important; gap: 10px !important; }
          .game-desc { display: none; }
          .game-name { width: 100px !important; }
          .game-name-title { font-size: 22px !important; }
          .game-status { min-width: 36px !important; }
          .game-cta { padding: 7px 10px !important; font-size: 11px !important; }
          .game-row-cta { padding: 7px 10px !important; font-size: 11px !important; }
          .home-logo { font-size: 48px !important; letter-spacing: 6px !important; }
          .home-section { margin-bottom: 6px !important; }
          .home-badge { margin-bottom: 24px !important; }
        }
      `}</style>

      <UserMenu />

      <main style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* ── Logo ── */}
      <div className="home-section" style={{ textAlign: 'center', marginBottom: 12, animation: 'fadeIn 0.5s ease' }}>
        <h1 className="home-logo" style={{
          fontFamily: 'var(--font-display)',
          fontSize: 72, fontWeight: 800, letterSpacing: 10,
          color: 'var(--ink)', lineHeight: 1, margin: 0,
        }}>
          STREAKLE
        </h1>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: 4,
          color: 'var(--gold)', textTransform: 'uppercase', marginTop: 12,
        }}>
          Start your day with a puzzle
        </div>
      </div>

      {/* ── Live badge ── */}
      <div className="home-badge" style={{
        background: 'rgba(var(--gold-rgb),0.07)',
        border: '1px solid rgba(var(--gold-rgb),0.22)',
        borderRadius: 20, padding: '6px 16px',
        fontSize: 12, color: 'var(--gold)', fontWeight: 600,
        marginBottom: 52, animation: 'fadeIn 0.65s ease',
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        <span style={{
          display: 'inline-block', width: 7, height: 7,
          borderRadius: '50%', background: 'var(--gold)',
          animation: 'pulse 2s infinite',
        }} />
        New puzzles every day
      </div>

      {/* ── Game list ── */}
      <nav aria-label="Games" style={{
        width: '100%', maxWidth: 820,
        border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden',
        marginBottom: 60,
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
      }}>
        {GAMES.map((g, i) => {
          const played    = g.key in todayResults
          const completed = todayResults[g.key] === true
          const failed    = played && !completed

          return (
            <a
              key={g.path}
              href={g.path}
              className="game-row"
              style={{
                background: 'var(--surface)',
                borderLeft: `4px solid ${g.color}`,
                borderBottom: i < GAMES.length - 1 ? '1px solid var(--border)' : 'none',
                padding: '18px 24px',
                gap: 20,
                animation: `fadeIn 0.4s ${i * 70}ms both ease`,
              }}
            >
              {/* Emoji */}
              <div style={{ fontSize: 28, flexShrink: 0, width: 36, textAlign: 'center' }}>{g.emoji}</div>

              {/* Name + badge */}
              <div className="game-name" style={{ width: 148, flexShrink: 0 }}>
                <div className="game-name-title" style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 28, fontWeight: 800, letterSpacing: 1.5,
                  color: 'var(--ink)', lineHeight: 1,
                }}>{g.title}</div>
                <div style={{
                  marginTop: 6,
                  display: 'inline-block',
                  background: `${g.color}18`,
                  border: `1px solid ${g.color}40`,
                  borderRadius: 4, padding: '2px 8px',
                  fontSize: 9, fontWeight: 700, color: g.accent,
                  textTransform: 'uppercase', letterSpacing: 1.5,
                }}>{g.badge}</div>
              </div>

              {/* Description */}
              <div className="game-desc" style={{
                flex: 1,
                fontSize: 13, color: 'var(--muted)', lineHeight: 1.55,
              }}>{g.description}</div>

              {/* Status + streak — only rendered when there's something to show */}
              {user && (completed || failed || streaks[g.key] > 0) && (
                <div className="game-status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0, minWidth: 52 }}>
                  {completed && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--success-text)', letterSpacing: 0.3 }}>✓ Done</div>
                  )}
                  {failed && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger-text)', letterSpacing: 0.3 }}>✗ Tried</div>
                  )}
                  {streaks[g.key] > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)' }}>🔥 {streaks[g.key]}</div>
                  )}
                </div>
              )}

              {/* CTA */}
              <div
                className={completed ? 'game-cta' : 'game-cta game-row-cta'}
                style={{
                  flexShrink: 0,
                  background: completed ? 'rgba(var(--success-text-rgb),0.08)' : failed ? 'transparent' : 'var(--gold)',
                  border: completed ? '1px solid rgba(var(--success-text-rgb),0.22)' : failed ? '1px solid rgba(var(--danger-text-rgb),0.3)' : 'none',
                  borderRadius: 20, padding: '7px 16px',
                  fontSize: 12, fontWeight: 700, letterSpacing: 0.4,
                  color: completed ? 'var(--success-text)' : failed ? 'var(--danger-text)' : 'var(--bg)',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.15s',
                }}
              >
                {completed ? 'Play Again →' : failed ? 'Archive →' : 'Play →'}
              </div>
            </a>
          )
        })}
      </nav>

      </main>

      {/* ── Footer ── */}
      <footer style={{ textAlign: 'center', fontSize: 12 }}>
        <a href="/privacy" style={{ color: '#9A8C73', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseOver={e => e.currentTarget.style.color = 'var(--gold)'}
          onMouseOut={e => e.currentTarget.style.color = '#9A8C73'}
        >
          Privacy Policy / Politique de confidentialité
        </a>
        <div style={{ marginTop: 6, color: '#7E7158' }}>© 2026 Streakle. All rights reserved.</div>
      </footer>
    </div>
  )
}
