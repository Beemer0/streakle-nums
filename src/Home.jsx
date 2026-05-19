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
    color: '#1E40AF',
    accent: '#93C5FD',
    badge: 'Swap It',
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
    key: 'faceoff',
    path: '/faceoff',
    title: 'FACEOFF',
    emoji: '🏒',
    description: 'Test your NHL knowledge. Match players to teams and awards in the grid.',
    color: '#0C4A6E',
    accent: '#7DD3FC',
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
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .game-card-link { text-decoration: none; display: block; height: 100%; }
        .game-card-inner {
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .game-card-link:hover .game-card-inner {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(201,168,76,0.22) !important;
        }
      `}</style>

      <UserMenu />

      {/* ── Logo ── */}
      <div style={{ textAlign: 'center', marginBottom: 12, animation: 'fadeIn 0.5s ease' }}>
        <div style={{
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
      <div style={{
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

      {/* ── Game cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900, width: '100%', marginBottom: 60 }}>
        {[games.slice(0, 3), games.slice(3)].map((row, rowIdx) => (
          <div key={rowIdx} style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
            {row.map((g, colIdx) => {
          const i = rowIdx === 0 ? colIdx : 3 + colIdx
          const played    = g.key in todayResults
          const completed = todayResults[g.key] === true
          const failed    = played && !completed

          return (
            <a
              key={g.path}
              href={g.path}
              className="game-card-link"
              style={{ animation: `fadeIn 0.5s ${i * 110}ms both ease`, width: 260, flexShrink: 0 }}
            >
              <div className="game-card-inner" style={{
                background: '#1C1A16',
                border: '1px solid #2C2820',
                borderTop: `3px solid ${g.color}`,
                borderRadius: 12,
                padding: '22px 20px 20px',
                boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
              }}>

                {/* Emoji + badges row */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', marginBottom: 14,
                }}>
                  <div style={{ fontSize: 30 }}>{g.emoji}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                    <div style={{
                      background: `${g.color}18`,
                      border: `1px solid ${g.color}40`,
                      borderRadius: 4, padding: '2px 8px',
                      fontSize: 9, fontWeight: 700, color: g.accent,
                      textTransform: 'uppercase', letterSpacing: 1.5,
                      fontFamily: "'DM Sans', sans-serif",
                    }}>{g.badge}</div>
                    {user && streaks[g.key] > 0 && (
                      <div style={{
                        fontSize: 9, fontWeight: 700, color: '#C9A84C',
                        background: 'rgba(201,168,76,0.1)',
                        border: '1px solid rgba(201,168,76,0.28)',
                        borderRadius: 4, padding: '2px 8px',
                      }}>🔥 {streaks[g.key]}</div>
                    )}
                    {completed && (
                      <div style={{
                        fontSize: 9, fontWeight: 700, color: '#86EFAC',
                        background: 'rgba(134,239,172,0.08)',
                        border: '1px solid rgba(134,239,172,0.22)',
                        borderRadius: 4, padding: '2px 8px',
                      }}>✓ Done</div>
                    )}
                    {failed && (
                      <div style={{
                        fontSize: 9, fontWeight: 700, color: '#FCA5A5',
                        background: 'rgba(252,165,165,0.08)',
                        border: '1px solid rgba(252,165,165,0.22)',
                        borderRadius: 4, padding: '2px 8px',
                      }}>✗ Tried</div>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 30, fontWeight: 800,
                  letterSpacing: 1.5, color: '#F5F0E8', marginBottom: 8,
                  lineHeight: 1,
                }}>
                  {g.title}
                </div>

                {/* Description */}
                <div style={{
                  fontSize: 13, color: '#7A6E5F',
                  lineHeight: 1.6, marginBottom: 20, flexGrow: 1,
                }}>
                  {g.description}
                </div>

                {/* CTA button */}
                {completed ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: 'rgba(134,239,172,0.08)',
                    border: '1px solid rgba(134,239,172,0.22)',
                    borderRadius: 6, padding: '10px 0',
                    fontSize: 12, fontWeight: 700, color: '#86EFAC',
                    letterSpacing: 0.3,
                  }}>
                    ✓ Completed · Play Again?
                  </div>
                ) : (
                  <div style={{
                    background: failed ? 'transparent' : '#C9A84C',
                    border: failed ? '1px solid rgba(252,165,165,0.3)' : 'none',
                    borderRadius: 6, padding: '10px 0',
                    textAlign: 'center',
                    fontSize: 12, fontWeight: 700,
                    color: failed ? '#FCA5A5' : '#0F0E0C',
                    letterSpacing: 0.5,
                  }}>
                    {failed ? 'Try Archive →' : "Play Today's Puzzle →"}
                  </div>
                )}
              </div>
            </a>
          )
        })}
          </div>
        ))}
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