import { useState } from 'react'
import { useAuth } from './AuthContext'
import UserMenu from './UserMenu'
import { GAME_BY_KEY } from './games'
import './GameShell.css'

function HelpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="8" cy="8" r="6.6" />
      <path d="M6.2 6.1a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.4" />
      <circle cx="8" cy="11.4" r=".5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <rect x="2" y="3" width="12" height="11" rx="2" />
      <path d="M2 6.6h12M5.2 1.6v2.6M10.8 1.6v2.6" />
    </svg>
  )
}

/**
 * The frame every daily game sits in: a top bar (back link + account), the
 * title with How to play / Archive, the puzzle date, the how-to panel, the
 * game itself and the footer.
 *
 * @param {object} props
 * @param {string} props.game - key in GAMES (title and accent come from there)
 * @param {string} props.date - the puzzle date, already formatted
 * @param {import('react').ReactNode} props.howTo - how-to-play copy
 * @param {() => void} props.onArchive - opens the archive
 * @param {boolean} [props.hc] - high-contrast colours are on
 * @param {() => void} [props.onToggleHc] - adds a high-contrast switch to the how-to panel
 * @param {string} [props.className] - extra class on <main>
 * @param {import('react').ReactNode} props.children - the game
 */
export default function GameShell({ game, date, howTo, onArchive, hc = false, onToggleHc, className = '', children }) {
  const { user } = useAuth()
  const [isHowOpen, setIsHowOpen] = useState(false)
  const { title, color, accent } = GAME_BY_KEY[game]

  return (
    <main className={`gs ${className}`.trim()} style={{ '--game': accent, '--game-deep': color }}>
      <header className="gs-top">
        <a href="/" className="gs-back">← All games</a>
        {user ? <UserMenu isInline /> : <a href="/login" className="gs-signin">Sign in</a>}
      </header>

      <div className="gs-head">
        <div className="gs-brand">
          <h1 className="gs-title">{title}</h1>
          <div className="gs-by">by Streakle</div>
        </div>
        <div className="gs-actions">
          <button type="button" className="gs-btn" aria-label="How to play" aria-expanded={isHowOpen} onClick={() => setIsHowOpen(open => !open)}>
            <HelpIcon /><span className="gs-btn-label">How to play</span>
          </button>
          <button type="button" className="gs-btn" aria-label="Archive" onClick={onArchive}>
            <CalendarIcon /><span className="gs-btn-label">Archive</span>
          </button>
        </div>
      </div>
      <div className="gs-date">{date}</div>

      {isHowOpen && (
        <section className="gs-how" aria-label="How to play">
          <b className="gs-how-title">How to play</b>
          {howTo}
          {onToggleHc && (
            <div className="gs-hc">
              <span>High contrast colours</span>
              <button type="button" className="gs-switch" role="switch" aria-checked={hc} aria-label="High contrast colours" onClick={onToggleHc} />
            </div>
          )}
        </section>
      )}

      {children}

      <footer className="gs-foot">
        <a href="/privacy">Privacy Policy / Politique de confidentialité</a>
      </footer>
    </main>
  )
}
