import { useEffect, useId, useState } from 'react'
import { nextGame } from './games'
import './ResultCard.css'

const COPIED_MS = 2000

/**
 * Shares the result: the device share sheet where there is one, else the
 * clipboard with a "Copied!" flash. Closing the share sheet is not an error.
 *
 * @param {object} props
 * @param {() => string} props.getText - builds the share text when clicked
 * @param {string} [props.label]
 * @param {boolean} [props.isPrimary] - gold fill (true) or outlined
 */
export function ShareButton({ getText, label = 'Share result', isPrimary = true }) {
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (!isCopied) return
    const id = setTimeout(() => setIsCopied(false), COPIED_MS)
    return () => clearTimeout(id)
  }, [isCopied])

  const handleShare = async () => {
    const text = getText()
    const copy = async () => { await navigator.clipboard.writeText(text); setIsCopied(true) }
    try {
      if (navigator.share) await navigator.share({ text })
      else await copy()
    } catch (err) {
      if (err?.name === 'AbortError') return // the player closed the share sheet
      try { await copy() } catch { /* neither sharing nor the clipboard is available */ }
    }
  }

  return (
    <div className="rc-share">
      <button type="button" className={isPrimary ? 'rc-btn rc-btn-primary' : 'rc-btn'} onClick={handleShare}>
        <span aria-hidden="true">📋</span> {label}
      </button>
      {isCopied && <div className="rc-copied" aria-hidden="true">Copied!</div>}
      {/* Always mounted, so screen readers hear the text when it arrives. */}
      <div className="rc-sr-only" role="status">{isCopied ? 'Copied to clipboard' : ''}</div>
    </div>
  )
}

/**
 * The end-of-game card every game shows: the outcome, the game's own stats
 * (children — use .rc-headline / .rc-detail for the usual two lines), then
 * Share and a link on to the next game.
 *
 * @param {object} props
 * @param {string} props.game - key in GAMES (for the Next link)
 * @param {'won'|'lost'} props.outcome
 * @param {import('react').ReactNode} props.title
 * @param {() => string} props.shareText
 * @param {string} [props.shareLabel]
 * @param {import('react').Ref<HTMLElement>} [props.ref] - e.g. to move focus to the result
 * @param {import('react').ReactNode} [props.children]
 */
export default function ResultCard({ game, outcome, title, shareText, shareLabel, ref, children }) {
  const next = nextGame(game)
  const titleId = useId()
  return (
    <section ref={ref} tabIndex={ref ? -1 : undefined} className={`rc rc-${outcome}`} aria-labelledby={titleId}>
      <div id={titleId} className="rc-title">{title}</div>
      {children}
      <div className="rc-actions">
        <ShareButton getText={shareText} label={shareLabel} isPrimary={outcome === 'won'} />
        <a className="rc-next" href={next.path}>Next: {next.title} →</a>
      </div>
    </section>
  )
}
