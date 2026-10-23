import { useId, useState } from 'react'
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
 * The bar across the top of every framed page: "← All games" on the left,
 * the account menu (or a Sign in link for guests) on the right.
 *
 * @param {object} props
 * @param {boolean} [props.showAccount] - false leaves the right side empty (the sign-in page itself)
 */
export function TopBar({ showAccount = true }) {
  const { user } = useAuth()
  return (
    <header className="gs-top">
      <a href="/" className="gs-back">← All games</a>
      {showAccount && (user ? <UserMenu isInline /> : <a href="/login" className="gs-signin">Sign in</a>)}
    </header>
  )
}

/** The footer every framed page ends with. */
export function ShellFooter() {
  return (
    <footer className="gs-foot">
      <a href="/privacy">Privacy Policy / Politique de confidentialité</a>
    </footer>
  )
}

/**
 * The frame every daily game sits in: a top bar (back link + account), the
 * title with How to play / Archive, the puzzle date, the how-to panel, the
 * game itself and the footer. The top bar and the footer sit outside <main>,
 * as the page's banner and contentinfo landmarks.
 *
 * @param {object} props
 * @param {string} props.game - key in GAMES (title and accent come from there)
 * @param {string} props.date - the puzzle date, already formatted
 * @param {import('react').ReactNode} props.howTo - how-to-play copy
 * @param {() => void} props.onArchive - opens the archive
 * @param {boolean} [props.hc] - high-contrast colours are on
 * @param {() => void} [props.onToggleHc] - adds a high-contrast switch to the how-to panel
 * @param {string} [props.className] - extra class on the page wrapper (top bar, <main> and footer)
 * @param {boolean} [props.isLoading] - the game's code is still loading: actions off
 * @param {import('react').ReactNode} props.children - the game
 */
export default function GameShell({ game, date, howTo, onArchive, hc = false, onToggleHc, className = '', isLoading = false, children }) {
  const [isHowOpen, setIsHowOpen] = useState(false)
  const howId = useId()
  const { title, color, accent } = GAME_BY_KEY[game]

  return (
    <div className={`gs ${className}`.trim()} style={{ '--game': accent, '--game-deep': color }}>
      <TopBar />

      <main className="gs-main">
        <div className="gs-head">
          <div className="gs-brand">
            <h1 className="gs-title">{title}</h1>
            <div className="gs-by">by Streakle</div>
          </div>
          <div className="gs-actions">
            <button type="button" className="gs-btn" aria-label="How to play" aria-expanded={isHowOpen} aria-controls={isHowOpen ? howId : undefined} disabled={isLoading} onClick={() => setIsHowOpen(open => !open)}>
              <HelpIcon /><span className="gs-btn-label">How to play</span>
            </button>
            <button type="button" className="gs-btn" aria-label="Archive" aria-haspopup="dialog" disabled={isLoading} onClick={onArchive}>
              <CalendarIcon /><span className="gs-btn-label">Archive</span>
            </button>
          </div>
        </div>
        <div className="gs-date">{date}</div>

        {isHowOpen && (
          <section id={howId} className="gs-how" aria-label="How to play">
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
      </main>

      <ShellFooter />
    </div>
  )
}

/**
 * Shown while a game's code loads: its real header and today's date at once,
 * with a soft placeholder where the board will be.
 *
 * @param {object} props
 * @param {string} props.game - key in GAMES
 */
export function GameLoading({ game }) {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  return (
    <GameShell game={game} date={today} isLoading>
      <div className="gs-skeleton" role="status" aria-label="Loading the puzzle" />
    </GameShell>
  )
}
