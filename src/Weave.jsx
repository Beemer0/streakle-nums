import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import Archive from './Archive'
import GameShell from './GameShell'
import { saveResult } from './saveResult'
import { useStreak } from './useStreak'
import { useSeo, PAGE_SEO } from './seo'
import {
  SIZE, MAX_SWAPS, PAR, ACTIVE, HOLE,
  generatePuzzle, colours, swap, isActive, shareGrid,
} from './weave/engine'
import { GOLD, CARD, BORDER, INK } from './theme'

const WIN = 'var(--success)', RED = 'var(--danger)'
// Keyed by the engine's colour names (GREEN/YELLOW/GREY). Light tiles take
// dark ink so every letter clears 3:1 against its tile.
const DARK_INK = 'var(--bg)'
const PALETTE = {
  bg: { green: '#538d4e', yellow: '#b59f3b', grey: 'var(--border-strong)' },
  ink: { green: INK, yellow: DARK_INK, grey: INK },
}
const PALETTE_HC = {
  bg: { green: '#f5793a', yellow: '#85c0f9', grey: 'var(--border-strong)' },
  ink: { green: DARK_INK, yellow: DARK_INK, grey: INK },
}
const CHECKPOINT_KEY = 'streakle-weave'
const HC_KEY = 'streakle-hc' // shared with Words
const MAX_STARS = MAX_SWAPS - PAR
const SWAP_MS = 280
const DRAG_START_PX = { mouse: 6, pen: 6, touch: 10 } // fingers jitter more

const css = `
@keyframes wvConfetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(130px) rotate(720deg);opacity:0}}
@keyframes wvSlideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes wvCopied{0%{opacity:0;transform:translateY(4px)}20%{opacity:1;transform:translateY(0)}80%{opacity:1}100%{opacity:0}}
@keyframes wvStar{0%{transform:scale(0) rotate(-20deg);opacity:0}60%{transform:scale(1.3) rotate(5deg);opacity:1}100%{transform:scale(1);opacity:1}}
.wv-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;width:min(340px,calc(100vw - 32px));touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.wv-tile{position:relative;aspect-ratio:1;min-width:0;padding:0;border:2px solid transparent;border-radius:8px;color:var(--ink);cursor:grab;container-type:inline-size;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:800;-webkit-tap-highlight-color:transparent;transition:background-color .2s,color .2s,border-color .15s,box-shadow .15s,translate .15s}
.wv-tile[aria-disabled="true"]{cursor:default}
.wv-tile:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.wv-letter{font-size:30px;font-size:58cqw;line-height:1;pointer-events:none}
/* The lift uses \`translate\`, not \`transform\`: drags and the swap animation
   own \`transform\`, and a CSS transition on it would override the animation. */
.wv-sel{border-color:var(--ink);translate:0 -3px;box-shadow:0 6px 16px rgba(0,0,0,.45)}
.wv-over{border-color:var(--ink);box-shadow:0 0 0 3px rgba(245,240,232,.25)}
.wv-drag{z-index:3;pointer-events:none;box-shadow:0 10px 24px rgba(0,0,0,.55);transition:none}
.wv-reveal{background:var(--surface-gold) !important;color:var(--gold) !important}
.wv-toast{position:fixed;top:80px;left:50%;transform:translateX(-50%);background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 20px;font-size:14px;font-weight:600;color:var(--ink);z-index:60;animation:wvSlideUp .2s ease;white-space:nowrap}
.wv-sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`

function formatDate(dateStr) {
  let d = new Date();
  if (dateStr) { const [y,m,day] = dateStr.split('-').map(Number); d = new Date(y, m-1, day); }
  return d.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
}

const plural = (n, word) => `${n} ${word}${n !== 1 ? 's' : ''}`
const todayStr = () => new Date().toLocaleDateString('en-CA')
const phaseOf = (board, left, solution) => (board === solution ? 'won' : left === 0 ? 'lost' : 'playing')

// Same holes and the same letters as the solution, in any order.
function sameTiles(board, solution) {
  if (typeof board !== 'string' || board.length !== solution.length) return false
  for (let i = 0; i < solution.length; i++) {
    if ((board[i] === HOLE) !== (solution[i] === HOLE)) return false
  }
  const tally = s => ACTIVE.map(i => s[i]).sort().join('')
  return tally(board) === tally(solution)
}

// ── Today's checkpoint: the board and swaps left, so a reload can never
// refund a swap or revive a finished puzzle. Archive replays never touch it.
function readCheckpoint(date, solution) {
  try {
    const raw = localStorage.getItem(CHECKPOINT_KEY)
    if (!raw) return null
    const cp = JSON.parse(raw)
    if (!cp || cp.v !== 1 || cp.date !== date || !sameTiles(cp.board, solution)) return null
    if (!Number.isInteger(cp.left) || cp.left < 0 || cp.left > MAX_SWAPS) return null
    return { board: cp.board, left: cp.left, phase: phaseOf(cp.board, cp.left, solution) }
  } catch { return null }
}

function writeCheckpoint(date, g) {
  try {
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify({ v: 1, date, board: g.board, left: g.left }))
  } catch { /* storage unavailable */ }
}

function readHc() {
  try { return localStorage.getItem(HC_KEY) === '1' } catch { return false }
}

function buildShareText(g, solution, dateStr, hc) {
  const used = MAX_SWAPS - g.left
  const result = g.phase === 'won'
    ? `Solved in ${plural(used, 'swap')} ${'⭐'.repeat(g.left)}`.trimEnd()
    : g.phase === 'lost' ? 'Out of swaps' : `Still weaving — ${plural(g.left, 'swap')} left`
  const grid = shareGrid(g.board, solution, hc).join('\n')
  return `WEAVE by Streakle 🧶 — ${formatDate(dateStr)}\n${result}\n${grid}\n\nPlay at: playstreakle.com/weave`
}

const COLOUR_DESC = {
  green: 'correct',
  yellow: 'belongs elsewhere in its row or column',
  grey: 'not needed in its row or column',
}

export default function Weave() {
  const { streak } = useStreak('weave')
  useSeo(PAGE_SEO.weave)
  const [showArchive, setShowArchive] = useState(false)
  const [puzzleDate, setPuzzleDate] = useState(null)
  const [hc, setHc] = useState(readHc)

  const seedDate = puzzleDate ?? todayStr()
  const toggleHc = () => setHc(v => {
    const n = !v
    try { localStorage.setItem(HC_KEY, n ? '1' : '0') } catch { /* storage unavailable */ }
    return n
  })
  const palette = hc ? PALETTE_HC : PALETTE

  const howTo = (
    <>
      Swap tiles until all six words are right — three across, three down.<br/><br/>
      <b>Tap</b> a tile, then another to swap them — or <b>drag</b> one onto another.<br/>
      {hc ? '🟧' : '🟩'} Right spot — locked in<br/>
      {hc ? '🟦' : '🟨'} Belongs somewhere else in its row or column (a corner or crossing tile may belong to either)<br/>
      ⬜ Not needed in its row or column<br/><br/>
      Every puzzle can be solved in <b>{PAR} swaps</b>. You get {MAX_SWAPS} — each one left over is a ⭐. Run out and the puzzle ends.
    </>
  )

  return (
    <GameShell game="weave" date={formatDate(puzzleDate)} howTo={howTo} onArchive={() => setShowArchive(true)} hc={hc} onToggleHc={toggleHc}>
      <style>{css}</style>


      {streak > 0 && (
        <div style={{ fontSize: 13, color: GOLD, fontWeight: 600, marginBottom: 8 }}>🔥 {streak} day streak</div>
      )}

      {/* Keyed by date: a new puzzle is a fresh board, never a stale one. */}
      <WeaveBoard key={seedDate} seedDate={seedDate} isToday={puzzleDate === null} palette={palette} hc={hc} />


      {showArchive && (
        <Archive
          game="weave"
          onSelectDate={(date) => setPuzzleDate(date === todayStr() ? null : date)}
          onClose={() => setShowArchive(false)}
        />
      )}
    </GameShell>
  )
}

function WeaveBoard({ seedDate, isToday, palette, hc }) {
  const pz = useMemo(() => generatePuzzle(seedDate), [seedDate])
  const { solution } = pz
  const [g, setG] = useState(() =>
    (isToday && readCheckpoint(seedDate, solution)) || { board: pz.start, left: MAX_SWAPS, phase: 'playing' })
  const [sel, setSel] = useState(null)
  const [drag, setDrag] = useState(null) // { from, dx, dy, over }
  const [live, setLive] = useState({ n: 0, text: '' })
  const [toast, setToast] = useState(null)
  const [copied, setCopied] = useState(false)
  const [confetti, setConfetti] = useState([])
  const [focusIdx, setFocusIdx] = useState(ACTIVE[0]) // the board's one tab stop

  const tileEls = useRef([])
  const press = useRef(null)      // { idx, x, y, id, dragging }
  const flip = useRef(null)       // { a, b, ghost } — the swap to animate after render
  const suppressClickUntil = useRef(0)
  const timeouts = useRef([])

  const { board, left, phase } = g
  const col = useMemo(() => colours(board, solution), [board, solution])
  const playing = phase === 'playing'
  const movable = (i) => playing && isActive(i) && board[i] !== solution[i]

  useEffect(() => {
    const t = timeouts
    return () => { t.current.forEach(clearTimeout); t.current = [] }
  }, [])

  // FLIP the two swapped tiles from where their letters were to where they
  // are now. Slots come from offsetLeft/Top, which ignore transforms, so a
  // lifted or just-dropped tile measures as its grid cell. A dropped letter
  // starts from where the drag left it (`drop` = the drag offset from a).
  // Web Animations ignore the CSS reduced-motion rule, so check it.
  useLayoutEffect(() => {
    const f = flip.current
    flip.current = null
    if (!f || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const ea = tileEls.current[f.a], eb = tileEls.current[f.b]
    if (!ea || !eb) return
    const sa = { left: ea.offsetLeft, top: ea.offsetTop }, sb = { left: eb.offsetLeft, top: eb.offsetTop }
    const fly = (el, to, from, lift) => el.animate([
      { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${lift})`, zIndex: 2 },
      { transform: 'none', zIndex: 2 },
    ], { duration: SWAP_MS, easing: 'cubic-bezier(.2,.8,.2,1)' })
    fly(ea, sa, sb, 1.1)
    if (f.drop) fly(eb, sb, { left: sa.left + f.drop.dx, top: sa.top + f.drop.dy }, 1.08)
    else fly(eb, sb, sa, 1.1)
  }, [board])

  const pushTimeout = (fn, ms) => { timeouts.current.push(setTimeout(fn, ms)) }
  const announce = (text) => setLive(l => ({ n: l.n + 1, text }))
  const showToast = (msg) => {
    setToast(msg)
    announce(msg)
    pushTimeout(() => setToast(t => (t === msg ? null : t)), 1800)
  }
  const spawnConfetti = () => {
    setConfetti(Array.from({ length: 30 }, (_, i) => ({
      id: i, x: 20 + Math.random() * 60, delay: Math.random() * 700,
      color: ['var(--success)', 'var(--gold)', 'var(--gold)', 'var(--danger)', '#ffd700', 'var(--ink)'][i % 6],
      size: 5 + Math.random() * 8,
    })))
    pushTimeout(() => setConfetti([]), 1600)
  }

  const cellName = (i) => `row ${Math.floor(i / SIZE) + 1}, column ${(i % SIZE) + 1}`
  const capital = (t) => t[0].toUpperCase() + t.slice(1)

  const finish = (next) => {
    if (next.phase === 'won') {
      // Archive replays never write results — they would land on today's row.
      if (isToday) saveResult({ game: 'weave', completed: true, score: next.left, swaps_used: MAX_SWAPS - next.left })
      spawnConfetti()
      announce(`Solved in ${plural(MAX_SWAPS - next.left, 'swap')}! ${plural(next.left, 'star')}.`)
    } else {
      if (isToday) saveResult({ game: 'weave', completed: false, score: 0, swaps_used: MAX_SWAPS })
      announce('Out of swaps. The answer is shown.')
    }
  }

  const commit = (a, b, drop = null) => {
    setSel(null)
    if (board[a] === board[b]) { showToast('Same letter — no swap used'); return }
    const nb = swap(board, a, b)
    const next = { board: nb, left: left - 1, phase: phaseOf(nb, left - 1, solution) }
    flip.current = { a, b, drop }
    setG(next)
    if (isToday) writeCheckpoint(seedDate, next)
    if (next.phase !== 'playing') { finish(next); return }
    const after = colours(nb, solution)
    announce(`Swapped. ${capital(cellName(a))} is ${nb[a]}, ${COLOUR_DESC[after[a]]}; ${cellName(b)} is ${nb[b]}, ${COLOUR_DESC[after[b]]}. ${plural(next.left, 'swap')} left.`)
  }

  const tap = (i) => {
    if (!movable(i)) return
    if (sel === null) { setSel(i); announce(`Selected ${board[i]}. Choose a tile to swap it with.`); return }
    if (sel === i) { setSel(null); announce('Selection cleared.'); return }
    commit(sel, i)
  }

  // ── Pointer: a primary press becomes a drag after DRAG_START_PX; otherwise
  // the click that follows is a tap. Capture starts only once dragging, so
  // taps keep their normal click target. Any press, a released button or a
  // lost capture ends a drag, so a tile can never stay stuck mid-air. ──
  const cellAt = (x, y) => {
    const el = document.elementFromPoint(x, y)?.closest?.('[data-idx]')
    return el ? Number(el.dataset.idx) : -1
  }
  const endDrag = () => { press.current = null; setDrag(null) }
  const onPointerDown = (e) => {
    if (!e.isPrimary) return
    suppressClickUntil.current = 0
    endDrag()
    const el = e.target.closest?.('[data-idx]')
    const i = el ? Number(el.dataset.idx) : -1
    if (i < 0 || !movable(i) || (e.pointerType === 'mouse' && e.button !== 0)) return
    press.current = { idx: i, x: e.clientX, y: e.clientY, id: e.pointerId, type: e.pointerType, dragging: false }
  }
  const onPointerMove = (e) => {
    const p = press.current
    if (!p || p.id !== e.pointerId) return
    if (e.buttons === 0) { endDrag(); return }
    const dx = e.clientX - p.x, dy = e.clientY - p.y
    if (!p.dragging) {
      if (Math.hypot(dx, dy) < (DRAG_START_PX[p.type] ?? DRAG_START_PX.mouse)) return
      p.dragging = true
      // Throws if the pointer is already gone; the drag still works uncaptured.
      try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* pointer no longer active */ }
    }
    const over = cellAt(e.clientX, e.clientY)
    setDrag({ from: p.idx, dx, dy, over: over !== p.idx && movable(over) ? over : -1 })
  }
  const onPointerUp = (e) => {
    const p = press.current
    if (!p || p.id !== e.pointerId) return
    if (!p.dragging) { press.current = null; return }
    suppressClickUntil.current = performance.now() + 400
    const target = cellAt(e.clientX, e.clientY)
    const drop = { dx: e.clientX - p.x, dy: e.clientY - p.y }
    endDrag()
    // Dropped back on itself: a jittery tap, so treat it as one.
    if (target === p.idx) tap(p.idx)
    else if (target >= 0 && movable(target)) commit(p.idx, target, drop)
  }
  const onClick = (e) => {
    if (performance.now() < suppressClickUntil.current) return
    const el = e.target.closest?.('[data-idx]')
    if (el) tap(Number(el.dataset.idx))
  }

  // ── Keyboard: one tab stop; arrows move between tiles, skipping holes. ──
  const onFocus = (e) => {
    const el = e.target.closest?.('[data-idx]')
    if (el) setFocusIdx(Number(el.dataset.idx))
  }
  const ARROWS = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }
  const onKeyDown = (e) => {
    if (e.key === 'Escape' && sel !== null) { setSel(null); announce('Selection cleared.'); return }
    const step = ARROWS[e.key]
    if (!step) return
    e.preventDefault()
    let r = Math.floor(focusIdx / SIZE) + step[0], c = (focusIdx % SIZE) + step[1]
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && !isActive(r * SIZE + c)) { r += step[0]; c += step[1] }
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return
    tileEls.current[r * SIZE + c]?.focus()
  }

  const handleShare = async () => {
    const text = buildShareText(g, solution, isToday ? null : seedDate, hc)
    const flash = () => { setCopied(true); pushTimeout(() => setCopied(false), 2000) }
    try {
      if (navigator.share) await navigator.share({ text })
      else { await navigator.clipboard.writeText(text); flash() }
    } catch (err) {
      if (err?.name === 'AbortError') return // the player closed the share sheet
      try { await navigator.clipboard.writeText(text); flash() } catch { /* sharing unavailable */ }
    }
  }

  // ── Render ──
  const shown = phase === 'lost' ? solution : board
  const tiles = Array.from({ length: SIZE * SIZE }, (_, i) => {
    if (!isActive(i)) return <div key={i} aria-hidden="true" />
    const c = col[i]
    const isDrag = drag?.from === i
    const cls = ['wv-tile']
    if (phase === 'lost') cls.push('wv-reveal')
    if (sel === i) cls.push('wv-sel')
    if (drag?.over === i) cls.push('wv-over')
    if (isDrag) cls.push('wv-drag')
    const style = { background: palette.bg[c], color: palette.ink[c] }
    if (isDrag) style.transform = `translate(${drag.dx}px, ${drag.dy}px) scale(1.08)`
    const desc = phase === 'lost' ? 'answer' : COLOUR_DESC[c]
    return (
      <button
        key={i}
        type="button"
        data-idx={i}
        ref={el => { tileEls.current[i] = el }}
        className={cls.join(' ')}
        style={style}
        aria-label={`${capital(cellName(i))}: ${shown[i]}, ${desc}`}
        aria-pressed={sel === i}
        aria-disabled={!movable(i)}
        tabIndex={i === focusIdx ? 0 : -1}
      >
        <span className="wv-letter">{shown[i]}</span>
      </button>
    )
  })

  const used = MAX_SWAPS - left
  let status, statusColor = GOLD
  if (phase === 'won') { status = `Solved in ${plural(used, 'swap')}!`; statusColor = WIN }
  else if (phase === 'lost') { status = 'Out of swaps'; statusColor = RED }
  else { status = `${plural(left, 'swap')} left`; if (left <= 3) statusColor = RED }

  const shareBtn = (primary) => (
    <div style={{ position: 'relative', display: 'inline-block', marginTop: 4 }}>
      <button onClick={handleShare} style={primary
        ? { background: GOLD, color: 'var(--bg)', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }
        : { background: CARD, color: GOLD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        📋 Share result
      </button>
      {copied && <div style={{ position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)', background: '#2d6a30', color: 'var(--ink)', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6, whiteSpace: 'nowrap', animation: 'wvCopied 2s ease forwards', pointerEvents: 'none' }}>Copied!</div>}
    </div>
  )

  const wordList = (
    <div style={{ fontSize: 13, color: 'var(--text-2)', margin: '6px 0 14px', letterSpacing: 1 }}>
      {pz.words.join(' · ')}
    </div>
  )

  return (
    <>
      {confetti.map(c => (
        <div key={c.id} style={{ position: 'fixed', left: `${c.x}%`, top: '28%', width: c.size, height: c.size, background: c.color, borderRadius: c.size > 10 ? '50%' : 2, animation: `wvConfetti 1.3s ${c.delay}ms ease forwards`, pointerEvents: 'none', zIndex: 100 }} />
      ))}

      <div style={{ fontSize: 15, fontWeight: 600, color: statusColor, marginBottom: 12, minHeight: 20, transition: 'color 0.4s' }}>{status}</div>

      <div
        className="wv-grid"
        role="group"
        aria-label="Weave board: three words across, three down"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onClick={onClick}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
      >
        {tiles}
      </div>

      {playing && (
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 12, minHeight: 18 }}>
          {sel !== null ? <>Selected <b style={{ color: INK }}>{board[sel]}</b> — tap another tile to swap</> : 'Tap two tiles to swap them'}
        </div>
      )}

      {phase === 'won' && (
        <div style={{ textAlign: 'center', marginTop: 18, animation: 'wvSlideUp 0.5s ease' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: WIN, marginBottom: 6 }}>🎉 Woven!</div>
          <div role="img" aria-label={`${plural(left, 'star')} out of ${MAX_STARS}`} style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 4 }}>
            {Array.from({ length: MAX_STARS }, (_, k) => (
              <span key={k} aria-hidden="true" style={{ fontSize: 24, color: k < left ? '#ffd700' : 'var(--border-strong)', animation: k < left ? `wvStar 0.4s ${k * 100}ms both ease` : 'none' }}>★</span>
            ))}
          </div>
          {wordList}
          {shareBtn(true)}
        </div>
      )}

      {phase === 'lost' && (
        <div style={{ textAlign: 'center', marginTop: 18, animation: 'wvSlideUp 0.4s ease' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: RED, marginBottom: 4 }}>So close!</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Here's how it weaves together:</div>
          {wordList}
          {shareBtn(false)}
        </div>
      )}

      {toast && <div className="wv-toast" role="presentation">{toast}</div>}
      <div className="wv-sr-only" aria-live="polite" aria-atomic="true">{live.text}{live.n % 2 ? '​' : ''}</div>
    </>
  )
}

