import { useState, useEffect, useRef, useCallback, memo } from 'react'
import Archive from './Archive'
import GameShell from './GameShell'
import ResultCard from './ResultCard'
import { saveResult } from './saveResult'
import { useStreak } from './useStreak'
import { useBoardDate } from './useBoardDate'
import { useSeo, PAGE_SEO } from './seo'
import {
  RUNGS, MAX_ATTEMPTS, REVEALED, FLAGGED,
  generateBoard, openingState, dig, chord, toggleFlag, isWon, flagCount, formatTime, shareLines,
} from './mines/engine'
import { GOLD, CARD, BORDER, INK, MUTED } from './theme'
import { slotHoldsLaterDay } from './checkpointSlot'

const GREEN = 'var(--success)', RED = 'var(--danger)'
const DIGIT_COLORS = ['#93C5FD', 'var(--success-text)', 'var(--danger-text)', '#C4B5FD', '#FDBA74', '#5EEAD4', 'var(--ink)', 'var(--gold)']
const CHECKPOINT_KEY = 'streakle-mines'
const BOOM_MS = 1100
// What a move says waits this long after the focus move that comes with it:
// screen readers cut off a live message that arrives together with a focus
// change, but queue one that arrives once the focus speech has begun.
const ANNOUNCE_AFTER_FOCUS_MS = 200

const css = `
@keyframes mnBoom{0%{transform:scale(1)}40%{transform:scale(1.35)}100%{transform:scale(1)}}
@keyframes mnShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes mnPop{0%{transform:scale(0.6)}100%{transform:scale(1)}}
@keyframes mnConfetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(130px) rotate(720deg);opacity:0}}
@keyframes mnSlideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes mnFadeIn{from{opacity:0}to{opacity:1}}
.mn-wrap{width:100%;padding:0 12px;box-sizing:border-box}
.mn-grid{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:manipulation}
.mn-shake{animation:mnShake 0.45s ease}
.mn-row{display:grid;gap:2px;margin-bottom:2px}
/* Each row is its own grid, so tracks must never depend on content: a wide
   emoji font or an enlarged system text size would otherwise widen one row's
   columns and leave the board jagged. Glyphs are sized from the cell (cqw)
   with a px fallback for browsers without container-query units. */
.mn-cell{aspect-ratio:1;min-width:0;min-height:0;overflow:hidden;white-space:nowrap;container-type:inline-size;border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-sizing:border-box}
.mn-grid[aria-disabled="true"] .mn-cell{cursor:default}
/* Focus: a gold ring over the cell's outer 2px, a --bg band inside its border. */
.mn-cell:focus-visible{outline:2px solid var(--gold);outline-offset:-2px;box-shadow:inset 0 0 0 2px var(--bg);z-index:1}
/* Undug cells sit raised and lighter; dug ones sunken and dark. The 2px edge
   is what tells them apart at >= 3:1 (the fills alone are ~1.5:1). */
.mn-hidden,.mn-flag{background:linear-gradient(180deg,var(--mines-tile),var(--mines-tile-low));border:2px solid var(--mines-tile-edge)}
.mn-hidden{box-shadow:inset 0 1px 0 rgba(var(--ink-rgb),.07)}
/* A focused undug tile keeps that edge: its ring moves inside the --bg band
   (edge 0-2px, band 2-4px, ring 4-6px), so edge, band, ring and fill each
   differ by >= 3:1. A ring over the edge left only the ~1.5:1 fills to tell
   a focused undug tile from a focused dug one. */
.mn-hidden:focus-visible,.mn-flag:focus-visible{outline-offset:-6px}
@media(hover:hover){.mn-grid:not([aria-disabled="true"]) .mn-hidden:hover{background:var(--mines-tile-hover)}}
.mn-flag .mn-glyph{animation:mnPop 0.18s ease}
.mn-zero{background:var(--mines-dug);border:1px solid var(--surface);cursor:default}
.mn-number{background:var(--mines-dug);border:1px solid var(--surface)}
.mn-boom{background:var(--danger);border:1px solid var(--danger)}
.mn-boom .mn-glyph{animation:mnBoom 0.45s ease}
.mn-mine{background:var(--surface);border:1px solid var(--border)}
.mn-wrongflag{background:var(--danger-wash);border:1px solid var(--danger);color:var(--danger);font-weight:800}
.mn-autoflag{background:var(--correct-wash);border:1px solid var(--correct-deep)}
.mn-digit{font-family:var(--font-display);font-weight:800;font-size:17px;font-size:52cqw;line-height:1}
.mn-glyph{font-size:15px;font-size:46cqw;line-height:1}
.mn-bar{display:flex;align-items:center;justify-content:center;gap:14px;margin:0 0 12px;font-variant-numeric:tabular-nums}
.mn-seg{display:flex;border:1px solid var(--border);border-radius:8px;overflow:hidden}
.mn-seg button{background:none;border:none;color:var(--gold);cursor:pointer;font-size:14px;font-weight:700;padding:0 16px;height:44px;touch-action:manipulation;font-family:inherit}
.mn-seg button[aria-pressed="true"]{background:var(--gold);color:var(--bg)}
/* .mn-seg clips its children, so the ring goes inside the button; on the
   pressed gold button it takes the label's dark colour (--ink is 2:1 there). */
.mn-seg button:focus-visible{outline:2px solid var(--gold);outline-offset:-3px}
.mn-seg button[aria-pressed="true"]:focus-visible{outline-color:var(--bg)}
.mn-ladder{display:flex;gap:6px;width:100%;margin-bottom:12px}
.mn-pill{flex:1 1 0;min-width:0;border:1px solid var(--border);border-radius:8px;padding:6px 4px;text-align:center;background:var(--surface)}
.mn-pill-name{font-family:var(--font-display);font-weight:800;font-size:14px;letter-spacing:1px;color:var(--ink)}
.mn-pill-sub{font-size:11px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mn-pips{display:inline-flex;gap:4px;vertical-align:middle}
.mn-pip{width:7px;height:7px;border-radius:50%;background:var(--border-strong)}
.mn-pip.on{background:var(--gold)}
/* It sits over the header's How to play / Archive for 2.2 s, so taps go
   through it; what it says was already announced with the blast. */
.mn-toast{position:fixed;top:80px;left:50%;transform:translateX(-50%);background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 20px;font-size:14px;font-weight:600;color:var(--ink);z-index:60;animation:mnSlideUp 0.2s ease;white-space:nowrap;pointer-events:none}
.mn-sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`

// The phone layout's bar, added to the page's <style> only while the day is
// in play: once it ends there is nothing to dig or flag, so on a phone the bar
// goes (barDoneCss), and both reservations for it with it. Wider screens keep
// the bar in the page's flow as it was.
const barDoneCss = `@media(max-width:520px){.mn-bar-done{display:none}}`
const barCss = `
/* Here the bar is fixed over the bottom of the screen, which a browser's
   focus scrolling ignores. Its height is set once (1px border + 10px + the
   46px toggle + 10px, plus the home-bar inset, which stays 0 until the
   viewport meta opts into viewport-fit=cover) and reserved twice: as the
   root's scroll padding, so a focused cell, Next or the result stops above
   the bar (8px clears a ring drawn outside its element), and below the page
   (GameShell's own 24px on top), so the last of it can scroll that far. This
   <style> only exists while Mines is mounted, so no other page keeps either. */
@media(max-width:520px){
  html{--mn-bar-h:calc(67px + env(safe-area-inset-bottom));scroll-padding-bottom:calc(var(--mn-bar-h) + 8px)}
  .mn-bar{position:fixed;bottom:0;left:0;right:0;z-index:50;height:var(--mn-bar-h);margin:0;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:rgba(15,14,12,0.96);border-top:1px solid var(--border)}
  .mn-main{padding-bottom:calc(var(--mn-bar-h) + 24px) !important}
}
`

function formatDate(dateStr) {
  let d = new Date();
  if (dateStr) { const [y,m,day] = dateStr.split('-').map(Number); d = new Date(y, m-1, day); }
  return d.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
}

const sum = arr => arr.reduce((a, b) => a + b, 0)
const plural = (n, word) => `${n} ${word}${n !== 1 ? 's' : ''}`

// Focus the player can no longer use: dropped to <body> with a control that
// went away, or left on the board, which a clear or the day's end disables.
// Anywhere else (the Dig / Flag toggle, a header button, the open Archive)
// the player put it, so it stays.
function focusStranded(grid) {
  const el = document.activeElement
  return !el || el === document.body || !el.isConnected || Boolean(grid?.contains(el))
}

// Without preventScroll the browser scrolls a focused element its own way
// (Chrome centres it); 'nearest' moves only as far as needed and honours the
// root's scroll padding, so on a phone it stops above the fixed bar.
function focusInView(el) {
  el.focus({ preventScroll: true })
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

// Every safe cell revealed, every mine flagged — the finished-board state.
function fullReveal(board) {
  const cells = new Uint8Array(board.cols * board.rows)
  for (let i = 0; i < cells.length; i++) cells[i] = board.mine[i] ? FLAGGED : REVEALED
  return cells
}

// ── Ladder checkpoint (today only). Holds progress, never cell state, so a
// reload can cost the current board but never the ladder — and never refunds
// an attempt. ──────────────────────────────────────────────────────────────
function readCheckpoint(seedDate) {
  try {
    const raw = localStorage.getItem(CHECKPOINT_KEY)
    if (!raw) return null
    const cp = JSON.parse(raw)
    if (!cp || cp.v !== 1 || cp.date !== seedDate) return null
    if (!Number.isInteger(cp.rung) || cp.rung < 0 || cp.rung >= RUNGS.length) return null
    const okArr = a => Array.isArray(a) && a.length === RUNGS.length && a.every(n => Number.isFinite(n) && n >= 0)
    if (!okArr(cp.hits) || !okArr(cp.acc) || cp.hits.some(n => n > MAX_ATTEMPTS)) return null
    if (!['ready', 'won', 'lost'].includes(cp.phase)) return null
    if (!Number.isInteger(cp.hit)) return null
    return cp
  } catch { return null }
}

// There is one slot, and a tab left open since yesterday keeps the ladder it
// was dealt, so a write never replaces a later day's checkpoint (YYYY-MM-DD
// strings compare as dates) — its next move would wipe today's progress.
function writeCheckpoint(seedDate, d) {
  try {
    if (slotHoldsLaterDay(CHECKPOINT_KEY, seedDate)) return
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify({
      v: 1, date: seedDate, rung: d.rung, hits: d.hits, acc: d.acc, phase: d.phase, hit: d.hit,
    }))
  } catch { /* storage unavailable */ }
}

function storedCheckpoint() {
  try { return localStorage.getItem(CHECKPOINT_KEY) } catch { return null }
}

// The board held in memory while the player is away on another day comes
// back only to the day it was dealt, and only while the checkpoint still says
// what it said when they left: one another tab moved on wins.
function heldGameFor(held, seedDate) {
  return held && held.date === seedDate && storedCheckpoint() === held.saved ? held.game : null
}

function freshGame(seedDate, rung = 0) {
  const board = generateBoard(seedDate, rung)
  return { board, cells: openingState(board), rung, hits: [0, 0, 0], acc: [0, 0, 0], phase: 'ready', hit: -1 }
}

function bootstrap(seedDate, cp) {
  if (!cp) return freshGame(seedDate)
  const phase = cp.hits[cp.rung] >= MAX_ATTEMPTS ? 'lost' : cp.phase
  const board = generateBoard(seedDate, cp.rung)
  const cells = phase === 'won' ? fullReveal(board) : openingState(board)
  return { board, cells, rung: cp.rung, hits: cp.hits.slice(), acc: cp.acc.slice(), phase, hit: cp.hit }
}

function buildShareText(g, dateStr) {
  const total = sum(g.acc)
  const mistakes = sum(g.hits)
  const outcome = g.phase === 'won' ? 'All 3 boards cleared' : `Out of attempts on ${RUNGS[g.rung].label}`
  const rows = RUNGS.map((_, i) => ({
    state: g.phase === 'won' || i < g.rung ? 'cleared' : i === g.rung ? 'failed' : 'locked',
    ms: g.acc[i],
    hits: g.hits[i],
  }))
  return `MINES by Streakle 💣 — ${formatDate(dateStr)}\n${outcome} · ${formatTime(total)} · ${plural(mistakes, 'mistake')}\n${shareLines(rows).join('\n')}\n\nPlay at: playstreakle.com/mines`
}

const CELL_DESC = {
  hidden: 'hidden', flag: 'flagged', zero: 'clear', boom: 'mine hit', mine: 'mine',
  wrongflag: 'wrong flag', autoflag: 'mine flagged',
}

const Cell = memo(function Cell({ idx, r, c, variant, n, focused }) {
  const desc = variant === 'number' ? String(n) : CELL_DESC[variant]
  let content = null
  if (variant === 'number') content = <span className="mn-digit" style={{ color: DIGIT_COLORS[n - 1] }}>{n}</span>
  else if (variant === 'flag' || variant === 'autoflag') content = <span className="mn-glyph">🚩</span>
  else if (variant === 'boom') content = <span className="mn-glyph">💥</span>
  else if (variant === 'mine') content = <span className="mn-glyph">💣</span>
  else if (variant === 'wrongflag') content = <span className="mn-glyph">✕</span>
  return (
    <div
      role="gridcell"
      data-idx={idx}
      tabIndex={focused ? 0 : -1}
      aria-label={`Row ${r + 1}, column ${c + 1}, ${desc}`}
      className={`mn-cell mn-${variant}`}
    >
      {content}
    </div>
  )
})

export default function Mines() {
  const { streak } = useStreak('mines')
  useSeo(PAGE_SEO.mines)
  const [showArchive, setShowArchive] = useState(false)
  const { seedDate, isToday, boardKey, keyFor, selectDate } = useBoardDate()

  // One object for the whole game so every transition is a single setState.
  const [g, setG] = useState(() => bootstrap(seedDate, readCheckpoint(seedDate)))
  const [segStart, setSegStart] = useState(null) // Date.now() when the running clock segment began
  const [now, setNow] = useState(0)
  const [mode, setMode] = useState('dig')
  const [focusIdx, setFocusIdx] = useState(() => g.board.open)
  const [confetti, setConfetti] = useState([])
  const [live, setLive] = useState({ n: 0, text: '' })
  const [toast, setToast] = useState(null)

  const timeouts = useRef([])
  const pressTimer = useRef(null)
  const press = useRef(null)
  const lastPointerType = useRef('mouse')
  const suppressClick = useRef(false)
  const ladderRef = useRef(null)
  const gridRef = useRef(null)
  const nextRef = useRef(null)
  const resultRef = useRef(null)
  // Set by a clear, a new rung and the day's end, whose render removes or
  // disables the control that had focus (never by a load, a reload into a
  // later rung or an Archive switch): the render it waits for (`phase` and
  // `rung`), what to focus once that render lands (`target`), whether the
  // ladder goes to the top first, and what to say.
  const afterMove = useRef(null)
  // Today's board while the player is on another day (see pickDate).
  const heldToday = useRef(null)

  const { board, cells, rung, hits, acc, phase, hit } = g
  const spec = RUNGS[rung]
  const inputOpen = phase === 'ready' || phase === 'playing'
  const dayOver = phase === 'won' || phase === 'lost'
  const attemptsLeft = MAX_ATTEMPTS - hits[rung]
  const mistakes = sum(hits)
  const minesLeft = board.mines - flagCount(cells)
  const running = segStart !== null ? Math.max(0, now - segStart) : 0
  const rungMs = acc[rung] + running
  const totalMs = sum(acc) + running

  // The clock is display-only; final times are computed in the handlers.
  useEffect(() => {
    if (segStart === null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [segStart])

  useEffect(() => {
    const t = timeouts
    return () => { t.current.forEach(clearTimeout); t.current = [] }
  }, [])

  // Archive replay: a fresh ladder for that date, never persisted. Coming
  // back to today finds the board pickDate held, or else re-bootstraps from
  // the checkpoint, so a lost day stays lost.
  const prevKey = useRef(boardKey)
  useEffect(() => {
    if (prevKey.current === boardKey) return
    prevKey.current = boardKey
    timeouts.current.forEach(clearTimeout)
    timeouts.current = []
    const held = isToday ? heldGameFor(heldToday.current, seedDate) : null
    if (isToday) heldToday.current = null
    const next = held ?? (isToday ? bootstrap(seedDate, readCheckpoint(seedDate)) : freshGame(seedDate))
    // A held board still in play carries on, and its clock with it.
    const start = next.phase === 'playing' && document.visibilityState !== 'hidden' ? Date.now() : null
    setG(next)
    setSegStart(start)
    setNow(start ?? 0)
    setFocusIdx(next.board.open)
    setConfetti([])
    setLive({ n: 0, text: '' })
    setToast(null)
  }, [boardKey, isToday, seedDate])

  const persist = (d) => { if (isToday) writeCheckpoint(seedDate, d) }
  const announce = (text) => setLive(l => ({ n: l.n + 1, text }))
  const pushTimeout = (fn, ms) => { timeouts.current.push(setTimeout(fn, ms)) }
  const showToast = (msg) => {
    setToast(msg)
    pushTimeout(() => setToast(t => (t === msg ? null : t)), 2200)
  }

  // An earlier render's effects can run after a move is set: a clock tick's,
  // say, which React runs a task after laying it out, or first thing before
  // the move's own render. So a move is taken only by the render it names.
  useEffect(() => {
    const move = afterMove.current
    if (!move || move.phase !== phase || move.rung !== rung) return
    afterMove.current = null
    if (move.top) ladderRef.current?.scrollIntoView({ block: 'start' })
    const el = move.target()
    if (el && focusStranded(gridRef.current)) focusInView(el)
    if (move.say) pushTimeout(() => announce(move.say), ANNOUNCE_AFTER_FOCUS_MS)
  })

  const spawnConfetti = () => {
    const items = Array.from({length:30},(_,i)=>({
      id:i, x:20+Math.random()*60, delay:Math.random()*700,
      color:['var(--success)','var(--gold)','var(--gold)','var(--danger)','var(--star)','var(--ink)'][i%6],
      size:5+Math.random()*8
    }));
    setConfetti(items);
    pushTimeout(()=>setConfetti([]),1600);
  };

  // Folds the running clock segment into the current rung's total.
  const foldTime = () => {
    const next = acc.slice()
    if (segStart !== null) next[rung] += Math.max(0, Date.now() - segStart)
    return next
  }

  const explode = (hitIdx) => {
    const accNext = foldTime()
    const hitsNext = hits.slice()
    hitsNext[rung] += 1
    const lost = hitsNext[rung] >= MAX_ATTEMPTS
    const left = MAX_ATTEMPTS - hitsNext[rung]
    const next = { ...g, acc: accNext, hits: hitsNext, phase: 'exploded', hit: hitIdx }
    setG(next)
    setSegStart(null)
    if (lost) {
      // Archive replays never write results: a replay is not a play of that
      // day, and a replayed yesterday would otherwise still be recorded.
      if (isToday) saveResult({ game: 'mines', puzzleDate: seedDate, completed: false, score: Math.round(sum(accNext) / 1000), swaps_used: sum(hitsNext) })
      announce('Mine! Out of attempts. Game over.')
    } else {
      announce(`Mine! ${plural(left, 'attempt')} left. The board resets to its opening.`)
    }
    // After saveResult: the result is queued on disk before the checkpoint
    // records the loss.
    persist({ ...next, phase: lost ? 'lost' : 'ready' })
    pushTimeout(() => {
      // The loss was said with the blast; focus goes to the result.
      if (lost) afterMove.current = { phase: 'lost', rung, target: () => resultRef.current }
      setG(cur => lost
        ? { ...cur, phase: 'lost' }
        : { ...cur, cells: openingState(cur.board), phase: 'ready', hit: -1 })
      if (!lost) showToast(`Back to the opening — ${plural(left, 'attempt')} left`)
    }, BOOM_MS)
  }

  const clearRung = (nextCells) => {
    const accNext = foldTime()
    const total = sum(accNext)
    const last = rung === RUNGS.length - 1
    const done = fullReveal(board)
    if (last) {
      const next = { ...g, cells: done, acc: accNext, phase: 'won' }
      setG(next)
      setSegStart(null)
      // saveResult first: the result is queued on disk before the checkpoint
      // records the finish.
      if (isToday) saveResult({ game: 'mines', puzzleDate: seedDate, completed: true, score: Math.round(total / 1000), swaps_used: mistakes })
      persist(next)
      spawnConfetti()
      afterMove.current = { phase: 'won', rung, target: () => resultRef.current, say: `All three boards cleared in ${formatTime(total)}.` }
    } else {
      const next = { ...g, cells: done, acc: accNext, phase: 'cleared' }
      setG(next)
      setSegStart(null)
      // Written as the NEXT rung so a reload lands on it, not on a replay.
      persist({ ...next, rung: rung + 1, phase: 'ready', hit: -1 })
      afterMove.current = {
        phase: 'cleared',
        rung,
        target: () => nextRef.current,
        say: `${spec.label} cleared in ${formatTime(accNext[rung])}. ${RUNGS[rung + 1].label} unlocked.`,
      }
    }
    void nextCells
  }

  const play = (res) => {
    if (res.hit >= 0) { explode(res.hit); return }
    if (res.cells === cells) return
    if (isWon(board, res.cells)) { clearRung(res.cells); return }
    if (segStart === null) { const t = Date.now(); setSegStart(t); setNow(t) }
    setG({ ...g, cells: res.cells, phase: 'playing' })
  }

  const onDig = (idx) => {
    if (!inputOpen) return
    if (cells[idx] === REVEALED) { play(chord(board, cells, idx)); return }
    if (cells[idx] === FLAGGED) return
    play(dig(board, cells, idx))
  }

  const onFlag = (idx) => {
    if (!inputOpen) return
    if (cells[idx] === REVEALED) { play(chord(board, cells, idx)); return }
    // Functional update: the 400 ms hold timer calls this with a render
    // closure that may predate a tab-hide pause; never spread a stale `g`.
    const placing = cells[idx] !== FLAGGED
    setG(cur => ({ ...cur, cells: toggleFlag(cur.cells, idx) }))
    announce(placing ? 'Flag placed.' : 'Flag removed.')
  }

  const act = (idx) => (mode === 'flag' ? onFlag(idx) : onDig(idx))

  const nextRung = () => {
    if (phase !== 'cleared') return
    const r = rung + 1
    const nb = generateBoard(seedDate, r)
    setG({ ...g, board: nb, cells: openingState(nb), rung: r, phase: 'ready', hit: -1 })
    setFocusIdx(nb.open)
    // Next goes with this render. Once the new board is laid out, the ladder
    // goes to the top and focus to the opening cell, the board's Tab stop.
    afterMove.current = {
      phase: 'ready',
      rung: r,
      top: true,
      target: () => gridRef.current?.querySelector(`[data-idx="${nb.open}"]`),
      say: `${RUNGS[r].label}: ${nb.cols} by ${nb.rows}, ${nb.mines} mines. 3 attempts.`,
    }
  }

  // Pause when the tab hides or the page unloads so backgrounded time never
  // counts and the ladder survives a reload. The board stays in play here
  // ('ready' only on disk, as after a reload), so resume can tell it apart.
  const pause = useCallback(() => {
    if (segStart === null) return
    const accNext = acc.slice()
    accNext[rung] += Math.max(0, Date.now() - segStart)
    const next = { ...g, acc: accNext }
    setG(next)
    setSegStart(null)
    if (isToday) writeCheckpoint(seedDate, { ...next, phase: 'ready' })
  }, [segStart, acc, rung, g, isToday, seedDate])

  // Back on screen, a board in play runs its clock again without waiting for
  // a dig: thinking time is play time. A board nobody has dug yet still
  // starts at its first dig; a cleared or finished one stays stopped.
  const resume = useCallback(() => {
    if (phase !== 'playing' || segStart !== null) return
    const t = Date.now()
    setSegStart(t)
    setNow(t)
  }, [phase, segStart])

  useEffect(() => {
    const onVis = () => (document.visibilityState === 'hidden' ? pause() : resume())
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', pause)
    window.addEventListener('pageshow', resume)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', pause)
      window.removeEventListener('pageshow', resume)
    }
  }, [pause, resume])

  // Leaving today's board for another day (a replay, or after midnight the
  // new day's board) folds its running clock segment in and checkpoints it
  // first, as a tab hide does, so a round-trip never zeroes the clock. The
  // board itself is held in memory, never on disk (the checkpoint holds no
  // cells), so coming back finds it as it was; a reload still costs it. A
  // blast in progress isn't held: its checkpoint already has the outcome.
  const pickDate = (date) => {
    if (isToday && keyFor(date) !== boardKey) {
      const kept = { ...g, acc: foldTime() }
      if (segStart !== null) writeCheckpoint(seedDate, { ...kept, phase: 'ready' })
      heldToday.current = phase === 'exploded' ? null : { date: seedDate, game: kept, saved: storedCheckpoint() }
    }
    selectDate(date)
  }

  // ── Pointer + keyboard, delegated from the grid ──
  const cellFromEvent = (e) => {
    const el = e.target.closest?.('[data-idx]')
    return el ? Number(el.dataset.idx) : -1
  }
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
    pressTimer.current = null
    press.current = null
  }
  const onPointerDown = (e) => {
    const idx = cellFromEvent(e)
    if (idx < 0) return
    lastPointerType.current = e.pointerType
    suppressClick.current = false
    if (e.pointerType === 'mouse' || !inputOpen || cells[idx] === REVEALED) return
    press.current = { idx, x: e.clientX, y: e.clientY }
    if (pressTimer.current) clearTimeout(pressTimer.current)
    pressTimer.current = setTimeout(() => {
      press.current = null
      pressTimer.current = null
      suppressClick.current = true
      onFlag(idx)
    }, 400)
  }
  const onPointerMove = (e) => {
    if (!press.current) return
    if (Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > 8) cancelPress()
  }
  const onClick = (e) => {
    const idx = cellFromEvent(e)
    if (idx < 0) return
    if (suppressClick.current) { suppressClick.current = false; return }
    act(idx)
    setFocusIdx(idx)
  }
  const onContextMenu = (e) => {
    e.preventDefault()
    if (lastPointerType.current !== 'mouse') return
    const idx = cellFromEvent(e)
    if (idx >= 0) onFlag(idx)
  }
  const onKeyDown = (e) => {
    // A key with a modifier is the browser's (Ctrl/Cmd+F finds, Alt+arrows
    // go back and forward), never a move here.
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const { cols, rows } = board
    let i = focusIdx
    switch (e.key) {
      case 'ArrowLeft': if (i % cols > 0) i--; break
      case 'ArrowRight': if (i % cols < cols - 1) i++; break
      case 'ArrowUp': if (i >= cols) i -= cols; break
      case 'ArrowDown': if (i + cols < cols * rows) i += cols; break
      case 'Home': i -= i % cols; break
      case 'End': i += cols - 1 - (i % cols); break
      case 'Enter': case ' ': act(i); break
      case 'f': case 'F': onFlag(i); break
      default: return
    }
    e.preventDefault()
    if (i !== focusIdx) {
      setFocusIdx(i)
      const el = e.currentTarget.querySelector(`[data-idx="${i}"]`)
      if (el) focusInView(el)
    }
  }

  const shareText = () => buildShareText(g, seedDate)

  // ── Derived render data ──
  const variantOf = (i) => {
    const st = cells[i]
    if (phase === 'lost') {
      if (i === hit) return 'boom'
      if (board.mine[i]) return st === FLAGGED ? 'autoflag' : 'mine'
      if (st === FLAGGED) return 'wrongflag'
    }
    if (phase === 'exploded' && i === hit) return 'boom'
    if (st === FLAGGED) return phase === 'cleared' || phase === 'won' ? 'autoflag' : 'flag'
    if (st === REVEALED) return board.count[i] === 0 ? 'zero' : 'number'
    return 'hidden'
  }

  let status, statusColor = GOLD
  if (phase === 'exploded') {
    status = attemptsLeft > 0 ? `💥 Mine! ${plural(attemptsLeft, 'attempt')} left` : '💥 Mine! Out of attempts'
    statusColor = RED
  } else if (phase === 'cleared') { status = `${spec.label} cleared — ${formatTime(acc[rung])}`; statusColor = GREEN }
  else if (phase === 'lost') { status = 'Out of attempts'; statusColor = RED }
  else if (phase === 'won') { status = 'All three boards cleared!'; statusColor = GREEN }
  else status = `${spec.label} · ${spec.mines} mines · ${plural(attemptsLeft, 'attempt')} left`

  const rungState = (i) => {
    if (i < rung) return 'cleared'
    if (i > rung) return 'locked'
    if (phase === 'lost') return 'failed'
    if (phase === 'won' || phase === 'cleared') return 'cleared'
    return 'current'
  }


  const howTo = (
    <>
      Three minefields a day — <b>Easy</b>, <b>Medium</b> and <b>Hard</b>. Clear one to unlock the next; clear Hard to keep your streak.<br/><br/>
      A number shows how many of its 8 neighbours hide a mine. <b>Tap</b> to dig, <b>hold</b> (or right-click) to flag — or switch with the Dig / Flag toggle. Tap a number whose flags are all placed to dig everything else around it.<br/><br/>
      Every board is solvable by logic alone from the open area — <b>no guessing, ever</b>. Hit a mine and the board resets to its opening; three mines on one board ends your day.<br/><br/>
      The clock runs from your first dig while the page is on screen.<br/>
      <span style={{ color: MUTED }}>Keyboard: arrow keys move, Enter does what a tap does (digs, or flags in Flag mode), F flags.</span>
    </>
  )

  return (
    <GameShell game="mines" date={formatDate(seedDate)} howTo={howTo} onArchive={() => setShowArchive(true)} className="mn-main">
      <style>{css + (dayOver ? barDoneCss : barCss)}</style>
      {confetti.map(c => (
        <div key={c.id} style={{ position: 'fixed', left: `${c.x}%`, top: '28%', width: c.size, height: c.size, background: c.color, borderRadius: c.size > 10 ? '50%' : 2, animation: `mnConfetti 1.3s ${c.delay}ms ease forwards`, pointerEvents: 'none', zIndex: 100 }} />
      ))}


      <div style={{ fontSize: 15, fontWeight: 600, color: statusColor, marginBottom: 8, textAlign: 'center', minHeight: 20 }}>{status}</div>

      {streak > 0 && (
        <div style={{ fontSize: 13, color: GOLD, fontWeight: 600, marginBottom: 8 }}>
          🔥 {streak} day streak
        </div>
      )}

      <div className="mn-wrap" style={{ maxWidth: board.cols * 46 + 22 }}>
        <div ref={ladderRef} className="mn-ladder" aria-label="Ladder">
          {RUNGS.map((s, i) => {
            const st = rungState(i)
            const border = st === 'cleared' ? GREEN : st === 'current' ? GOLD : st === 'failed' ? RED : BORDER
            return (
              <div key={s.key} className="mn-pill" aria-current={st === 'current' ? 'step' : undefined} style={{ borderColor: border, background: st === 'current' ? 'var(--surface-gold)' : CARD, opacity: st === 'locked' ? 0.45 : 1 }}>
                <div className="mn-pill-name">{s.label}</div>
                <div className="mn-pill-sub">
                  {st === 'cleared' && <span style={{ color: 'var(--success-text)' }}>✓ {formatTime(acc[i])}</span>}
                  {st === 'failed' && <span style={{ color: 'var(--danger-text)' }}>✗ {formatTime(acc[i])}</span>}
                  {st === 'locked' && <>🔒 {s.cols}×{s.rows} · {s.mines}</>}
                  {st === 'current' && (
                    <span className="mn-pips" role="img" aria-label={`${plural(attemptsLeft, 'attempt')} left`}>
                      {Array.from({ length: MAX_ATTEMPTS }, (_, k) => <span key={k} className={`mn-pip${k < attemptsLeft ? ' on' : ''}`} />)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className={`mn-bar${dayOver ? ' mn-bar-done' : ''}`}>
          <span style={{ fontSize: 14, fontWeight: 700, color: INK, minWidth: 52 }}>💣 {minesLeft}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: INK, minWidth: 64 }} aria-label={`Time ${formatTime(rungMs)}`}>⏱ {formatTime(rungMs)}</span>
          <div className="mn-seg" role="group" aria-label="Tap action">
            <button aria-pressed={mode === 'dig'} onClick={() => { setMode('dig'); announce('Dig mode.') }}>⛏ Dig</button>
            <button aria-pressed={mode === 'flag'} onClick={() => { setMode('flag'); announce('Flag mode.') }}>🚩 Flag</button>
          </div>
        </div>

        <div
          ref={gridRef}
          className={`mn-grid${phase === 'exploded' ? ' mn-shake' : ''}`}
          role="grid"
          aria-label={`${spec.label} board, ${board.rows} rows by ${board.cols} columns, ${board.mines} mines`}
          aria-rowcount={board.rows}
          aria-colcount={board.cols}
          aria-disabled={!inputOpen}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={cancelPress}
          onPointerCancel={cancelPress}
          onPointerLeave={cancelPress}
          onClick={onClick}
          onContextMenu={onContextMenu}
          onKeyDown={onKeyDown}
        >
          {Array.from({ length: board.rows }, (_, r) => (
            <div key={r} role="row" className="mn-row" style={{ gridTemplateColumns: `repeat(${board.cols}, minmax(0, 1fr))` }}>
              {Array.from({ length: board.cols }, (_, c) => {
                const i = r * board.cols + c
                return <Cell key={i} idx={i} r={r} c={c} variant={variantOf(i)} n={board.count[i]} focused={i === focusIdx} />
              })}
            </div>
          ))}
        </div>

        {phase === 'cleared' && (
          <div style={{ textAlign: 'center', margin: '16px 0 4px', animation: 'mnSlideUp 0.4s ease' }}>
            <button ref={nextRef} onClick={nextRung} style={{ background: GOLD, color: 'var(--bg)', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--gold-hover)'}
              onMouseOut={e => e.currentTarget.style.background = GOLD}>
              Next: {RUNGS[rung + 1].label} →
            </button>
          </div>
        )}

        {phase === 'won' && (
          <ResultCard ref={resultRef} game="mines" outcome="won" title="🎉 All clear!" shareText={shareText}>
            <div className="rc-headline">{formatTime(totalMs)} · {plural(mistakes, 'mistake')}</div>
            <div className="rc-detail">
              {RUNGS.map((s, i) => `${s.label} ${formatTime(acc[i])}`).join(' · ')}
            </div>
          </ResultCard>
        )}

        {phase === 'lost' && (
          <ResultCard ref={resultRef} game="mines" outcome="lost" title="Game over!" shareText={shareText}>
            <div className="rc-detail">Out of attempts on {spec.label} · {formatTime(totalMs)} · {plural(mistakes, 'mistake')}</div>
          </ResultCard>
        )}
      </div>

      {toast && <div className="mn-toast" role="presentation">{toast}</div>}
      <div className="mn-sr-only" aria-live="polite" aria-atomic="true">{live.text}{live.n % 2 ? '​' : ''}</div>


      {showArchive && (
        <Archive
          game="mines"
          onSelectDate={pickDate}
          onClose={() => setShowArchive(false)}
        />
      )}
    </GameShell>
  )
}
