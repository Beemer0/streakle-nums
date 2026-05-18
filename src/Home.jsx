const css = `
@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
.game-card{transition:transform 0.2s,box-shadow 0.2s;}
.game-card:hover{transform:translateY(-4px);box-shadow:0 12px 40px rgba(0,0,0,0.4)!important;}
`;

const games = [
  {
    path: '/nums',
    title: 'NUMS',
    emoji: '🔢',
    description: 'Swap numbers so every row and column contains 1–7.',
    color: '#3a7bd5',
    accent: '#4a9eff',
    badge: 'Swap It',
  },
  {
    path: '/link',
    title: 'LINK',
    emoji: '🔗',
    description: 'Find 4 groups of 4 words that share something in common.',
    color: '#538d4e',
    accent: '#4caf50',
    badge: 'Group It',
  },
  {
    path: '/words',
    title: 'WORDS',
    emoji: '🔤',
    description: 'Guess the 5-letter word in 6 tries. Learn something new every day.',
    color: '#9b59b6',
    accent: '#b07fd4',
    badge: 'Guess It',
  },
  {
    path: '/gridiron',
    title: 'GRIDIRON',
    emoji: '🏈',
    description: 'Test your NFL knowledge. Match players to teams and awards in the grid.',
    color: '#e94560',
    accent: '#ff6b6b',
    badge: 'Know It',
  },
  {
    path: '/faceoff',
    title: 'FACEOFF',
    emoji: '🏒',
    description: 'Test your NHL knowledge. Match players to teams and awards in the grid.',
    color: '#4a9eff',
    accent: '#7ab8ff',
    badge: 'Know It',
  },
];

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh', background: '#1a1a2e',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: "'Segoe UI', sans-serif", color: '#e0e0e0',
      padding: '48px 24px 32px',
    }}>
      <style>{css}</style>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 8, animation: 'fadeIn 0.5s ease' }}>
        <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: 4, color: '#fff', lineHeight: 1 }}>
          STREAKLE
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, color: '#f5a623', textTransform: 'uppercase', marginTop: 6 }}>
          Start your day with a puzzle
        </div>
      </div>

      {/* Daily badge */}
      <div style={{
        background: '#0f1535', border: '1px solid #2a2a6a',
        borderRadius: 20, padding: '6px 16px', fontSize: 12,
        color: '#aaaaff', fontWeight: 600, marginBottom: 48,
        animation: 'fadeIn 0.6s ease',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#4caf50', animation: 'pulse 2s infinite' }} />
        New puzzles every day
      </div>

      {/* Game cards */}
      <div style={{
        display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center',
        maxWidth: 800, width: '100%', marginBottom: 48,
      }}>
        {games.map((g, i) => (
          <a key={g.path} href={g.path} style={{ textDecoration: 'none', animation: `fadeIn 0.5s ${i * 150}ms both ease` }}>
            <div className="game-card" style={{
              width: 240, background: '#16213e',
              border: `2px solid ${g.color}44`,
              borderRadius: 16, padding: '28px 24px',
              boxShadow: `0 4px 24px ${g.color}22`,
              cursor: 'pointer',
            }}>
              {/* Emoji + badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ fontSize: 36 }}>{g.emoji}</div>
                <div style={{
                  background: `${g.color}22`, border: `1px solid ${g.color}66`,
                  borderRadius: 10, padding: '3px 10px',
                  fontSize: 11, fontWeight: 700, color: g.accent,
                  textTransform: 'uppercase', letterSpacing: 1,
                }}>{g.badge}</div>
              </div>

              {/* Title */}
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 2, color: '#fff', marginBottom: 8 }}>
                {g.title}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, color: '#f5a623', textTransform: 'uppercase', marginBottom: 12 }}>
                by Streakle
              </div>

              {/* Description */}
              <div style={{ fontSize: 13, color: '#8888aa', lineHeight: 1.6, marginBottom: 20 }}>
                {g.description}
              </div>

              {/* Play button */}
              <div style={{
                background: g.color, borderRadius: 8,
                padding: '10px 0', textAlign: 'center',
                fontSize: 14, fontWeight: 700, color: '#fff',
                letterSpacing: 1,
              }}>
                Play Today's Puzzle →
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', color: '#333', fontSize: 12 }}>
        <a href="/privacy" style={{ color: '#4a4a8a', textDecoration: 'none' }}>
          Privacy Policy / Politique de confidentialité
        </a>
        <div style={{ marginTop: 8, color: '#2a2a4a' }}>© 2026 Streakle. All rights reserved.</div>
      </div>
    </div>
  );
}