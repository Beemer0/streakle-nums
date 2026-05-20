import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from './supabase'
import UserMenu from './UserMenu'

const games = [
  {
    key: 'faceoff',
    path: '/faceoff',
    title: 'FACEOFF',
    emoji: '🏒',
    description: 'Test your NHL knowledge. Match players to teams and awards in the grid.',
    color: '#0C4A6E',
    accent: '#7DD3FC',
    badge: 'Know It',
  },
  {
    key: 'gridiron',
    path: '/gridiron',
    title: 'GRIDIRON',
    emoji: '🏈',
    description: 'Test your NFL knowledge. Match players to teams and awards in the grid.',
    color: '#991B1B',
    accent: '#FCA5A5',
    badge: 'Know It',
  },
  {
    key: 'words',
    path: '/words',
    title: 'WORDS',
    emoji: '🔤',
    description: 'Guess the 5-letter word in 6 tries. Learn something new every day.',
    color: '#5B21B6',
    accent: '#C4B5FD',
    badge: 'Guess It',
  },
  {
    key: 'link',
    path: '/link',
    title: 'LINK',
    emoji: '🔗',
    description: 'Find 4 groups of 4 words that share something in common.',
    color: '#166534',
    accent: '#86EFAC',
    badge: 'Group It',
  },
  {
    key: 'nums',
    path: '/nums',
    title: 'NUMS',
    emoji: '🔢',
    description: 'Swap numbers so every row and column contains 1–7.',
    color: '#1E40AF',
    accent: '#93C5FD',
    badge: 'Swap It',
  },
]

function calcStreaks(allResults) {
  const byGame = {}
  allResults.forEach(r => {
    if (!byGame[r.game]) byGame[r.game] = []
    byGame[r.game].push(r.puzzle_date)
  })
  const streaks = {}
  Object.entries(byGame).forEach(([game, dates]) => {
    dates.sort().reverse()
    let count = 0
    for (let i = 0; i < dates.length; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      if (dates[i] === d.toLocaleDateString('en-CA')) count++
      else break
    }
    streaks[game] = count
  })
  return streaks
}

export default function Home() {
  const { user } = useAuth()
  const [todayResults, setTodayResults] = useState({})
  const [streaks, setStreaks] = useState({})

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
        .game-row:hover { background: #211F1A !important; }
        .game-row:hover .game-row-cta { background: #D4B45A !important; }
        @media (max-width: 520px) {
          .game-row { padding: 14px 16px !important; gap: 12px !important; }
          .game-desc { display: none; }
          .game-row-cta { padding: 8px 12px !important; font-size: 11px !important; }
          .home-logo { font-size: 48px !important; letter-spacing: 6px !important; }
          .home-section { margin-bottom: 6px !important; }
          .home-badge { margin-bottom: 24px !important; }
        }
      `}</style>

      <UserMenu />

      {/* ── Logo ── */}
      <div className="home-section" style={{ textAlign: 'center', marginBottom: 12, animation: 'fadeIn 0.5s ease' }}>
        <div className="home-logo" style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 72, fontWeight: 800, letterSpacing: 10,
          color: '#F5F0E8', lineHeight: 1,
        }}>
          STREAKLE
        </div>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: 4,
          color: '#C9A84C', textTransform: 'uppercase', marginTop: 12,
        }}>
          Start your day with a puzzle
        </div>
      </div>

      {/* ── Live badge ── */}
      <div className="home-badge" style={{
        background: 'rgba(201,168,76,0.07)',
        border: '1px solid rgba(201,168,76,0.22)',
        borderRadius: 20, padding: '6px 16px',
        fontSize: 12, color: '#C9A84C', fontWeight: 600,
        marginBottom: 52, animation: 'fadeIn 0.65s ease',
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        <span style={{
          display: 'inline-block', width: 7, height: 7,
          borderRadius: '50%', background: '#C9A84C',
          animation: 'pulse 2s infinite',
        }} />
        New puzzles every day
      </div>

      {/* ── Game list ── */}
      <div style={{
        width: '100%', maxWidth: 820,
        border: '1px solid #2C2820',
        borderRadius: 12, overflow: 'hidden',
        marginBottom: 60,
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
      }}>
        {games.map((g, i) => {
          const played    = g.key in todayResults
          const completed = todayResults[g.key] === true
          const failed    = played && !completed

          return (
            <a
              key={g.path}
              href={g.path}
              className="game-row"
              style={{
                background: '#1C1A16',
                borderLeft: `4px solid ${g.color}`,
                borderBottom: i < games.length - 1 ? '1px solid #2C2820' : 'none',
                padding: '18px 24px',
                gap: 20,
                animation: `fadeIn 0.4s ${i * 70}ms both ease`,
              }}
            >
              {/* Emoji */}
              <div style={{ fontSize: 28, flexShrink: 0, width: 36, textAlign: 'center' }}>{g.emoji}</div>

              {/* Name + badge */}
              <div style={{ width: 148, flexShrink: 0 }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 28, fontWeight: 800, letterSpacing: 1.5,
                  color: '#F5F0E8', lineHeight: 1,
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
                fontSize: 13, color: '#7A6E5F', lineHeight: 1.55,
              }}>{g.description}</div>

              {/* Status + streak — only rendered when there's something to show */}
              {user && (completed || failed || streaks[g.key] > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0, minWidth: 52 }}>
                  {completed && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#86EFAC', letterSpacing: 0.3 }}>✓ Done</div>
                  )}
                  {failed && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#FCA5A5', letterSpacing: 0.3 }}>✗ Tried</div>
                  )}
                  {streaks[g.key] > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#C9A84C' }}>🔥 {streaks[g.key]}</div>
                  )}
                </div>
              )}

              {/* CTA */}
              <div
                className={completed ? '' : 'game-row-cta'}
                style={{
                  flexShrink: 0,
                  background: completed ? 'rgba(134,239,172,0.08)' : failed ? 'transparent' : '#C9A84C',
                  border: completed ? '1px solid rgba(134,239,172,0.22)' : failed ? '1px solid rgba(252,165,165,0.3)' : 'none',
                  borderRadius: 20, padding: '7px 16px',
                  fontSize: 12, fontWeight: 700, letterSpacing: 0.4,
                  color: completed ? '#86EFAC' : failed ? '#FCA5A5' : '#0F0E0C',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.15s',
                }}
              >
                {completed ? 'Play Again →' : failed ? 'Archive →' : 'Play →'}
              </div>
            </a>
          )
        })}
      </div>

      {/* ── Footer ── */}
      <div style={{ textAlign: 'center', fontSize: 12 }}>
        <a href="/privacy" style={{ color: '#5A5040', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseOver={e => e.currentTarget.style.color = '#C9A84C'}
          onMouseOut={e => e.currentTarget.style.color = '#5A5040'}
        >
          Privacy Policy / Politique de confidentialité
        </a>
        <div style={{ marginTop: 6, color: '#3A3228' }}>© 2026 Streakle. All rights reserved.</div>
      </div>
    </div>
  )
}
