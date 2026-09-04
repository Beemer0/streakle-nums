import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react'
import Archive from './Archive'
import UserMenu from './UserMenu'
import { saveResult } from './saveResult'
import { useStreak } from './useStreak'
import { useSeo, PAGE_SEO } from './seo'
import {
  RUNGS, MAX_ATTEMPTS, REVEALED, FLAGGED,
  generateBoard, openingState, dig, chord, toggleFlag, isWon, flagCount, formatTime, shareLines,
} from './mines/engine'

const GOLD = '#C9A84C', CARD = '#1C1A16', BORDER = '#2C2820', INK = '#F5F0E8', MUTED = '#7A6E5F'
const GREEN = '#4caf50', RED = '#e94560'
const DIGIT_COLORS = ['#93C5FD', '#86EFAC', '#FCA5A5', '#C4B5FD', '#FDBA74', '#5EEAD4', '#F5F0E8', '#C9A84C']
const CHECKPOINT_KEY = 'streakle-mines'
const BOOM_MS = 1100

const css = `
@keyframes mnBoom{0%{transform:scale(1)}40%{transform:scale(1.35)}100%{transform:scale(1)}}
@keyframes mnShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes mnPop{0%{transform:scale(0.6)}100%{transform:scale(1)}}
@keyframes mnConfetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(130px) rotate(720deg);opacity:0}}
@keyframes mnSlideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes mnFadeIn{from{opacity:0}to{opacity:1}}
@keyframes mnCopied{0%{opacity:0;transform:translateY(4px)}20%{opacity:1;transform:translateY(0)}80%{opacity:1}100%{opacity:0}}
.mn-wrap{width:100%;padding:0 12px;box-sizing:border-box}
.mn-grid{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:manipulation}
.mn-shake{animation:mnShake 0.45s ease}
.mn-row{display:grid;gap:2px;margin-bottom:2px}
.mn-cell{aspect-ratio:1;border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-sizing:border-box}
.mn-grid[aria-disabled="true"] .mn-cell{cursor:default}
.mn-cell:focus-visible{outline:2px solid #C9A84C;outline-offset:-2px;z-index:1}
.mn-hidden{background:#2C2418;border:1px solid #3A3226}
@media(hover:hover){.mn-grid:not([aria-disabled="true"]) .mn-hidden:hover{background:#3A3020}}
.mn-flag{background:#2C2418;border:1px solid #3A3226}
.mn-flag .mn-glyph{animation:mnPop 0.18s ease}
.mn-zero{background:#14120F;border:1px solid #1C1A16;cursor:default}
.mn-number{background:#14120F;border:1px solid #1C1A16}
.mn-boom{background:#e94560;border:1px solid #e94560}
.mn-boom .mn-glyph{animation:mnBoom 0.45s ease}
.mn-mine{background:#1C1A16;border:1px solid #2C2820}
.mn-wrongflag{background:#4a1a20;border:1px solid #e94560;color:#e94560;font-weight:800}
.mn-autoflag{background:#1a3a2a;border:1px solid #2d6a30}
.mn-digit{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:22px;line-height:1}
.mn-glyph{font-size:18px;line-height:1}
.mn-bar{display:flex;align-items:center;justify-content:center;gap:14px;margin:0 0 12px;font-variant-numeric:tabular-nums}
.mn-seg{display:flex;border:1px solid #2C2820;border-radius:8px;overflow:hidden}
.mn-seg button{background:none;border:none;color:#C9A84C;cursor:pointer;font-size:14px;font-weight:700;padding:0 16px;height:44px;touch-action:manipulation;font-family:inherit}
.mn-seg button[aria-pressed="true"]{background:#C9A84C;color:#0F0E0C}
.mn-ladder{display:flex;gap:6px;width:100%;margin-bottom:12px}
.mn-pill{flex:1 1 0;min-width:0;border:1px solid #2C2820;border-radius:8px;padding:6px 4px;text-align:center;background:#1C1A16}
.mn-pill-name{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:14px;letter-spacing:1px;color:#F5F0E8}
.mn-pill-sub{font-size:11px;color:#7A6E5F;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mn-pips{display:inline-flex;gap:4px;vertical-align:middle}
.mn-pip{width:7px;height:7px;border-radius:50%;background:#3A3428}
.mn-pip.on{background:#C9A84C}
.mn-toast{position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#1C1A16;border:1px solid #2C2820;border-radius:8px;padding:8px 20px;font-size:14px;font-weight:600;color:#F5F0E8;z-index:60;animation:mnSlideUp 0.2s ease;white-space:nowrap}
.mn-sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media(max-width:520px){
  .mn-bar{position:fixed;bottom:0;left:0;right:0;z-index:50;margin:0;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:rgba(15,14,12,0.96);border-top:1px solid #2C2820}
  .mn-main{padding-bottom:96px !important}
}
@media(max-width:480px){.mn-digit{font-size:17px}.mn-glyph{font-size:15px}}
@media(max-width:340px){.mn-digit{font-size:14px}.mn-glyph{font-size:13px}}
`

function formatDate(dateStr) {
  let d = new Date();
  if (dateStr) { const [y,m,day] = dateStr.split('-').map(Number); d = new Date(y, m-1, day); }
  return d.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
}

const sum = arr => arr.reduce((a, b) => a + b, 0)
const plural = (n, word) => `${n} ${word}${n !== 1 ? 's' : ''}`

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

function writeCheckpoint(seedDate, d) {
  try {
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify({
      v: 1, date: seedDate, rung: d.rung, hits: d.hits, acc: d.acc, phase: d.phase, hit: d.hit,
    }))
  } catch { /* storage unavailable */ }
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
  const [puzzleDate, setPuzzleDate] = useState(null)
  const [showHow, setShowHow] = useState(false)

  const seedDate = useMemo(() => puzzleDate ?? new Date().toLocaleDateString('en-CA'), [puzzleDate])
  const isToday = puzzleDate === null

  // One object for the whole game so every transition is a single setState.
  const [g, setG] = useState(() => bootstrap(seedDate, readCheckpoint(seedDate)))
  const [segStart, setSegStart] = useState(null) // Date.now() when the running clock segment began
  const [now, setNow] = useState(0)
  const [mode, setMode] = useState('dig')
  const [focusIdx, setFocusIdx] = useState(() => g.board.open)
  const [copied, setCopied] = useState(false)
  const [confetti, setConfetti] = useState([])
  const [live, setLive] = useState({ n: 0, text: '' })
  const [toast, setToast] = useState(null)

  const timeouts = useRef([])
  const pressTimer = useRef(null)
  const press = useRef(null)
  const lastPointerType = useRef('mouse')
  const suppressClick = useRef(false)
  const ladderRef = useRef(null)

  const { board, cells, rung, hits, acc, phase, hit } = g
  const spec = RUNGS[rung]
  const inputOpen = phase === 'ready' || phase === 'playing'
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
  // back to today re-bootstraps from the checkpoint, so a lost day stays lost.
  const prevSeed = useRef(seedDate)
  useEffect(() => {
    if (prevSeed.current === seedDate) return
    prevSeed.current = seedDate
    timeouts.current.forEach(clearTimeout)
    timeouts.current = []
    const next = puzzleDate ? freshGame(puzzleDate) : bootstrap(seedDate, readCheckpoint(seedDate))
    setG(next)
    setSegStart(null)
    setNow(0)
    setFocusIdx(next.board.open)
    setCopied(false)
    setConfetti([])
    setLive({ n: 0, text: '' })
    setToast(null)
  }, [seedDate, puzzleDate])

  const persist = (d) => { if (isToday) writeCheckpoint(seedDate, d) }
  const announce = (text) => setLive(l => ({ n: l.n + 1, text }))
  const pushTimeout = (fn, ms) => { timeouts.current.push(setTimeout(fn, ms)) }
  const showToast = (msg) => {
    setToast(msg)
    pushTimeout(() => setToast(t => (t === msg ? null : t)), 2200)
  }

  const spawnConfetti = () => {
    const items = Array.from({length:30},(_,i)=>({
      id:i, x:20+Math.random()*60, delay:Math.random()*700,
      color:['#4caf50','#C9A84C','#C9A84C','#e94560','#ffd700','#fff'][i%6],
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
    persist({ ...next, phase: lost ? 'lost' : 'ready' })
    if (lost) {
      // Archive replays never write results — they would land on today's row.
      if (isToday) saveResult({ game: 'mines', completed: false, score: Math.round(sum(accNext) / 1000), swaps_used: sum(hitsNext) })
      announce('Mine! Out of attempts. Game over.')
    } else {
      announce(`Mine! ${plural(left, 'attempt')} left. The board resets to its opening.`)
    }
    pushTimeout(() => {
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
      persist(next)
      if (isToday) saveResult({ game: 'mines', completed: true, score: Math.round(total / 1000), swaps_used: mistakes })
      spawnConfetti()
      announce(`All three boards cleared in ${formatTime(total)}.`)
    } else {
      const next = { ...g, cells: done, acc: accNext, phase: 'cleared' }
      setG(next)
      setSegStart(null)
      // Written as the NEXT rung so a reload lands on it, not on a replay.
      persist({ ...next, rung: rung + 1, phase: 'ready', hit: -1 })
      announce(`${spec.label} cleared in ${formatTime(accNext[rung])}. ${RUNGS[rung + 1].label} unlocked.`)
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
    announce(`${RUNGS[r].label}: ${nb.cols} by ${nb.rows}, ${nb.mines} mines. 3 attempts.`)
    ladderRef.current?.scrollIntoView({ block: 'start' })
  }

  // Pause when the tab hides or the page unloads so backgrounded time never
  // counts and the ladder survives a reload.
  const pause = useCallback(() => {
    if (segStart === null) return
    const accNext = acc.slice()
    accNext[rung] += Math.max(0, Date.now() - segStart)
    const next = { ...g, acc: accNext, phase: 'ready' }
    setG(next)
    setSegStart(null)
    if (isToday) writeCheckpoint(seedDate, next)
  }, [segStart, acc, rung, g, isToday, seedDate])

  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'hidden') pause() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', pause)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', pause)
    }
  }, [pause])

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
      e.currentTarget.querySelector(`[data-idx="${i}"]`)?.focus()
    }
  }

  const handleShare = async () => {
    const text = buildShareText(g, puzzleDate);
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000); }
    } catch { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000); }
  };

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

  const shareBtn = (gold) => (
    <div style={{ position: 'relative', display: 'inline-block', marginTop: gold ? 0 : 12 }}>
      <button onClick={handleShare} style={gold
        ? { background: GOLD, color: '#0F0E0C', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }
        : { background: CARD, color: GOLD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        onMouseOver={gold ? e => e.currentTarget.style.background = '#D4B45A' : undefined}
        onMouseOut={gold ? e => e.currentTarget.style.background = GOLD : undefined}>
        📋 Share result
      </button>
      {copied && <div style={{ position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)', background: '#2d6a30', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6, whiteSpace: 'nowrap', animation: 'mnCopied 2s ease forwards', pointerEvents: 'none' }}>Copied!</div>}
    </div>
  )

  return (
    <main className="mn-main" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 0, position: 'relative', color: INK, overflow: 'hidden' }}>
      <style>{css}</style>
      {confetti.map(c => (
        <div key={c.id} style={{ position: 'fixed', left: `${c.x}%`, top: '28%', width: c.size, height: c.size, background: c.color, borderRadius: c.size > 10 ? '50%' : 2, animation: `mnConfetti 1.3s ${c.delay}ms ease forwards`, pointerEvents: 'none', zIndex: 100 }} />
      ))}
      <UserMenu />
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '12px 16px 0', minHeight: 44 }}>
        <a href="/" style={{ color: GOLD, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>← Back</a>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 2 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: 2, color: '#fff', margin: 0 }}>MINES</h1>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginTop: -4 }}>by Streakle</div>
        </div>
        <button onClick={() => setShowHow(!showHow)} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, color: GOLD, cursor: 'pointer', fontSize: 13, padding: '3px 10px', marginLeft: 8 }}>
          How to play
        </button>
        <button onClick={() => setShowArchive(true)} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, color: GOLD, cursor: 'pointer', fontSize: 13, padding: '3px 10px' }}>
          📅 Archive
        </button>
      </div>
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 8, marginTop: 6 }}>{formatDate(puzzleDate)}</div>

      {showHow && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, maxWidth: 340, marginBottom: 12, fontSize: 13, lineHeight: 1.65, color: '#ccc', animation: 'mnSlideUp 0.3s ease' }}>
          <b style={{ color: GOLD }}>How to play</b><br/>
          Three minefields a day — <b>Easy</b>, <b>Medium</b> and <b>Hard</b>. Clear one to unlock the next; clear Hard to keep your streak.<br/><br/>
          A number shows how many of its 8 neighbours hide a mine. <b>Tap</b> to dig, <b>hold</b> (or right-click) to flag — or switch with the Dig / Flag toggle. Tap a number whose flags are all placed to dig everything else around it.<br/><br/>
          Every board is solvable by logic alone from the open area — <b>no guessing, ever</b>. Hit a mine and the board resets to its opening; three mines on one board ends your day.<br/><br/>
          The clock only runs while you dig.<br/>
          <span style={{ color: MUTED }}>Keyboard: arrow keys move, Enter digs, F flags.</span>
        </div>
      )}

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
              <div key={s.key} className="mn-pill" aria-current={st === 'current' ? 'step' : undefined} style={{ borderColor: border, background: st === 'current' ? '#2C2418' : CARD, opacity: st === 'locked' ? 0.45 : 1 }}>
                <div className="mn-pill-name">{s.label}</div>
                <div className="mn-pill-sub">
                  {st === 'cleared' && <span style={{ color: '#86EFAC' }}>✓ {formatTime(acc[i])}</span>}
                  {st === 'failed' && <span style={{ color: '#FCA5A5' }}>✗ {formatTime(acc[i])}</span>}
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

        <div className="mn-bar">
          <span style={{ fontSize: 14, fontWeight: 700, color: INK, minWidth: 52 }}>💣 {minesLeft}</span>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700, color: INK, minWidth: 64 }} aria-label={`Time ${formatTime(rungMs)}`}>⏱ {formatTime(rungMs)}</span>
          <div className="mn-seg" role="group" aria-label="Tap action">
            <button aria-pressed={mode === 'dig'} onClick={() => { setMode('dig'); announce('Dig mode.') }}>⛏ Dig</button>
            <button aria-pressed={mode === 'flag'} onClick={() => { setMode('flag'); announce('Flag mode.') }}>🚩 Flag</button>
          </div>
        </div>

        <div
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
            <div key={r} role="row" className="mn-row" style={{ gridTemplateColumns: `repeat(${board.cols}, 1fr)` }}>
              {Array.from({ length: board.cols }, (_, c) => {
                const i = r * board.cols + c
                return <Cell key={i} idx={i} r={r} c={c} variant={variantOf(i)} n={board.count[i]} focused={i === focusIdx} />
              })}
            </div>
          ))}
        </div>

        {phase === 'cleared' && (
          <div style={{ textAlign: 'center', margin: '16px 0 4px', animation: 'mnSlideUp 0.4s ease' }}>
            <button onClick={nextRung} style={{ background: GOLD, color: '#0F0E0C', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              onMouseOver={e => e.currentTarget.style.background = '#D4B45A'}
              onMouseOut={e => e.currentTarget.style.background = GOLD}>
              Next: {RUNGS[rung + 1].label} →
            </button>
          </div>
        )}

        {phase === 'won' && (
          <div style={{ textAlign: 'center', marginTop: 18, animation: 'mnSlideUp 0.5s ease' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: GREEN, marginBottom: 6 }}>🎉 All clear!</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: GOLD, marginBottom: 4 }}>{formatTime(totalMs)} · {plural(mistakes, 'mistake')}</div>
            <div style={{ fontSize: 13, color: '#aaa', marginBottom: 16 }}>
              {RUNGS.map((s, i) => `${s.label} ${formatTime(acc[i])}`).join(' · ')}
            </div>
            {shareBtn(true)}
          </div>
        )}

        {phase === 'lost' && (
          <div style={{ textAlign: 'center', marginTop: 18, animation: 'mnSlideUp 0.4s ease' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: RED, marginBottom: 6 }}>Game over!</div>
            <div style={{ fontSize: 13, color: '#aaa' }}>Out of attempts on {spec.label} · {formatTime(totalMs)} · {plural(mistakes, 'mistake')}</div>
            {shareBtn(false)}
          </div>
        )}
      </div>

      {toast && <div className="mn-toast" role="presentation">{toast}</div>}
      <div className="mn-sr-only" aria-live="polite" aria-atomic="true">{live.text}{live.n % 2 ? '​' : ''}</div>

      <div style={{ marginTop: 32, fontSize: 12, color: '#5A5040', textAlign: 'center' }}>
        <a href="/privacy" style={{ color: '#5A5040', textDecoration: 'none' }}>Privacy Policy / Politique de confidentialité</a>
      </div>

      {showArchive && (
        <Archive
          game="mines"
          onSelectDate={(date) => setPuzzleDate(date === new Date().toLocaleDateString('en-CA') ? null : date)}
          onClose={() => setShowArchive(false)}
        />
      )}
    </main>
  )
}
