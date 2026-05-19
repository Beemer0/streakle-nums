import { useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from './supabase'
import UserMenu from './UserMenu'

const games = [
  {
    key: 'nums',
    path: '/nums',
    title: 'NUMS',
    emoji: '🔢',
    description: 'Swap numbers so every row and column contains 1–7.',
    color: '#3a7bd5',
    accent: '#4a9eff',
    badge: 'Swap It',
  },
  {
    key: 'link',
    path: '/link',
    title: 'LINK',
    emoji: '🔗',
    description: 'Find 4 groups of 4 words that share something in common.',
    color: '#538d4e',
    accent: '#4caf50',
    badge: 'Group It',
  },
  {
    key: 'words',
    path: '/words',
    title: 'WORDS',
    emoji: '🔤',
    description: 'Guess the 5-letter word in 6 tries. Learn something new every day.',
    color: '#9b59b6',
    accent: '#b07fd4',
    badge: 'Guess It',
  },
  {
    key: 'gridiron',
    path: '/gridiron',
    title: 'GRIDIRON',
    emoji: '🏈',
    description: 'Test your NFL knowledge. Match players to teams and awards in the grid.',
    color: '#e94560',
    accent: '#ff6b6b',
    badge: 'Know It',
  },
  {
    key: 'faceoff',
    path: '/faceoff',
    title: 'FACEOFF',
    emoji: '🏒',
    description: 'Test your NHL knowledge. Match players to teams and awards in the grid.',
    color: '#4a9eff',
    accent: '#7ab8ff',
    badge: 'Know It',
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
        @keyframes fadeIn { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.45} }
        .game-card-link { text-decoration: none; display: block; }
        .game-card-inner {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .game-card-link:hover .game-card-inner {
          transform: translateY(-6px);
          box-shadow: 0 20px 48px rgba(0,0,0,0.45) !important;
        }
      `}</style>

      <UserMenu />

      {/* ── Logo ── */}
      <div style={{ textAlign: 'center', marginBottom: 10, animation: 'fadeIn 0.5s ease' }}>
        <div style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 52, fontWeight: 800, letterSpacing: 6,
          color: '#fff', lineHeight: 1,
          textShadow: '0 0 80px rgba(99,102,241,0.5)',
        }}>
          STREAKLE
        </div>
        <div style={{
          fontSize: 12, fontWeight: 600, letterSpacing: 3,
          color: '#f5a623', textTransform: 'uppercase', marginTop: 10,
        }}>
          Start your day with a puzzle
        </div>
      </div>

      {/* ── Live badge ── */}
      <div style={{
        background: 'rgba(15,21,53,0.55)',
        border: '1px solid rgba(99,102,241,0.22)',
        borderRadius: 20, padding: '6px 16px',
        fontSize: 12, color: '#aaaaff', fontWeight: 600,
        marginBottom: 52, animation: 'fadeIn 0.65s ease',
        display: 'flex', alignItems: 'center', gap: 7,
        backdropFilter: 'blur(8px)',
      }}>
        <span style={{
          display: 'inline-block', width: 7, height: 7,
          borderRadius: '50%', background: '#4caf50',
          animation: 'pulse 2s infinite',
        }} />
        New puzzles every day
      </div>

      {/* ── Game cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 260px))',
        justifyContent: 'center',
        gap: 20, maxWidth: 900,
        width: '100%', marginBottom: 60,
      }}>
        {games.map((g, i) => {
          const played    = g.key in todayResults
          const completed = todayResults[g.key] === true
          const failed    = played && !completed

          return (
            <a
              key={g.path}
              href={g.path}
              className="game-card-link"
              style={{ animation: `fadeIn 0.5s ${i * 110}ms both ease` }}
            >
              <div className="game-card-inner" style={{
                background: 'rgba(18,26,58,0.75)',
                backdropFilter: 'blur(14px)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderTop: `3px solid ${g.color}`,
                borderRadius: 16,
                padding: '24px 22px 22px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
              }}>

                {/* Corner glow */}
                <div style={{
                  position: 'absolute', top: -30, left: -30,
                  width: 120, height: 120, borderRadius: '50%',
                  background: `radial-gradient(circle, ${g.color}20 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }} />

                {/* Emoji + mechanic badge */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', marginBottom: 16,
                }}>
                  <div style={{ fontSize: 32 }}>{g.emoji}</div>
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
                  }}>
                    <div style={{
                      background: `${g.color}22`,
                      border: `1px solid ${g.color}55`,
                      borderRadius: 8, padding: '3px 9px',
                      fontSize: 10, fontWeight: 700, color: g.accent,
                      textTransform: 'uppercase', letterSpacing: 1,
                    }}>{g.badge}</div>
                    {/* Streak badge */}
                    {user && streaks[g.key] > 0 && (
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: '#fbbf24',
                        background: 'rgba(251,191,36,0.1)',
                        border: '1px solid rgba(251,191,36,0.25)',
                        borderRadius: 8, padding: '2px 8px',
                      }}>🔥 {streaks[g.key]}</div>
                    )}
                    {/* Today's status badge */}
                    {completed && (
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: '#4ade80',
                        background: 'rgba(74,222,128,0.1)',
                        border: '1px solid rgba(74,222,128,0.25)',
                        borderRadius: 8, padding: '2px 8px',
                      }}>✅ Done</div>
                    )}
                    {failed && (
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: '#f87171',
                        background: 'rgba(248,113,113,0.1)',
                        border: '1px solid rgba(248,113,113,0.25)',
                        borderRadius: 8, padding: '2px 8px',
                      }}>❌ Tried</div>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 22, fontWeight: 800,
                  letterSpacing: 1, color: '#fff', marginBottom: 10,
                }}>
                  {g.title}
                </div>

                {/* Description */}
                <div style={{
                  fontSize: 13, color: '#6e6e99',
                  lineHeight: 1.65, marginBottom: 22,
                }}>
                  {g.description}
                </div>

                {/* CTA button */}
                {completed ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: 'rgba(74,222,128,0.1)',
                    border: '1px solid rgba(74,222,128,0.28)',
                    borderRadius: 8, padding: '10px 0',
                    fontSize: 13, fontWeight: 700, color: '#4ade80',
                  }}>
                    ✅ Completed · Play Again?
                  </div>
                ) : (
                  <div style={{
                    background: g.color,
                    borderRadius: 8, padding: '10px 0',
                    textAlign: 'center',
                    fontSize: 13, fontWeight: 700, color: '#fff',
                    letterSpacing: 0.3,
                  }}>
                    {failed ? 'Try Archive →' : "Play Today's Puzzle →"}
                  </div>
                )}
              </div>
            </a>
          )
        })}
      </div>

      {/* ── Footer ── */}
      <div style={{ textAlign: 'center', fontSize: 12 }}>
        <a href="/privacy" style={{ color: '#6666aa', textDecoration: 'none' }}>
          Privacy Policy / Politique de confidentialité
        </a>
        <div style={{ marginTop: 6, color: '#44446a' }}>© 2026 Streakle. All rights reserved.</div>
      </div>
    </div>
  )
}