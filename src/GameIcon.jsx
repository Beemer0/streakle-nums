// One line-drawn glyph per game, drawn in currentColor on a 24px grid so the
// set reads as a family (emoji render differently on every platform).
const GLYPHS = {
  // A crossword cross of letter tiles.
  scramble: (
    <>
      <rect x="9" y="3" width="6" height="6" rx="1.2" />
      <rect x="3" y="9" width="6" height="6" rx="1.2" />
      <rect x="9" y="9" width="6" height="6" rx="1.2" fill="currentColor" fillOpacity=".3" />
      <rect x="15" y="9" width="6" height="6" rx="1.2" />
      <rect x="9" y="15" width="6" height="6" rx="1.2" />
    </>
  ),
  // The waffle lattice: three words across, three down.
  weave: <path d="M3.5 5h17M3.5 12h17M3.5 19h17M5 3.5v17M12 3.5v17M19 3.5v17" />,
  // A mine.
  mines: (
    <>
      <circle cx="12" cy="12" r="5.5" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
      <circle cx="10.2" cy="10.2" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  // A hockey stick and puck.
  faceoff: (
    <>
      <path d="M7 3l6.8 13.2a2 2 0 0 0 1.8 1.1H21" />
      <ellipse cx="7.5" cy="18.5" rx="3.6" ry="1.7" />
    </>
  ),
  // A football with laces.
  gridiron: (
    <>
      <ellipse cx="12" cy="12" rx="9.2" ry="5.4" transform="rotate(-35 12 12)" />
      <path d="M9 14.6l6-5.2M10.1 12.1l1.3 1.6M12 10.5l1.3 1.6M13.9 8.9l1.3 1.6" />
    </>
  ),
  // The octagon.
  knockout: (
    <>
      <path d="M8.5 3h7L21 8.5v7L15.5 21h-7L3 15.5v-7z" />
      <path d="M10.2 7.5h3.6l2.7 2.7v3.6l-2.7 2.7h-3.6l-2.7-2.7v-3.6z" strokeOpacity=".5" />
    </>
  ),
  // A row of letter tiles, one found.
  words: (
    <>
      <rect x="2.5" y="7.5" width="5.5" height="9" rx="1.2" />
      <rect x="9.25" y="7.5" width="5.5" height="9" rx="1.2" fill="currentColor" fillOpacity=".3" />
      <rect x="16" y="7.5" width="5.5" height="9" rx="1.2" />
    </>
  ),
  // Two chain links.
  link: (
    <>
      <path d="M10.2 13.8a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.4 1.4" />
      <path d="M13.8 10.2a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.4-1.4" />
    </>
  ),
  // Four number cells round a sum circle.
  nums: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
    </>
  ),
}

/**
 * A game's icon in its own colour (games.js), on a tinted tile.
 *
 * @param {object} props
 * @param {{ key: string, color: string, accent: string }} props.game - a GAMES entry
 * @param {number} [props.size] - tile size in px
 */
export default function GameIcon({ game, size = 40 }) {
  return (
    <span className="game-icon-tile" aria-hidden="true" style={{
      width: size, height: size, borderRadius: Math.round(size * 0.28),
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      background: `${game.color}2E`, border: `1px solid ${game.color}66`, color: game.accent,
    }}>
      <svg width={Math.round(size * 0.58)} height={Math.round(size * 0.58)} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {GLYPHS[game.key]}
      </svg>
    </span>
  )
}
