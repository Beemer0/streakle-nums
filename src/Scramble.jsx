import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Archive from './Archive'
import UserMenu from './UserMenu'
import { saveResult } from './saveResult'
import { useStreak } from './useStreak'
import { useSeo, PAGE_SEO } from './seo'
import {
  LENGTHS, RUNGS, MAX_MISTAKES, HINT_SECONDS, ACROSS,
  generatePuzzle, boardCells, freePositions, cellKey, scoreSeconds, formatTime, shareLine,
} from './scramble/engine'

const GOLD = '#C9A84C', CARD = '#1C1A16', BORDER = '#2C2820', INK = '#F5F0E8', MUTED = '#7A6E5F'
const WIN = '#4caf50', RED = '#e94560', DARK_INK = '#0F0E0C'
// Solved letters and hinted letters; light tiles take dark ink for contrast.
const PALETTE = { done: '#538d4e', doneInk: INK, hint: '#b59f3b', hintInk: DARK_INK }
const PALETTE_HC = { done: '#f5793a', doneInk: DARK_INK, hint: '#85c0f9', hintInk: DARK_INK }
const CHECKPOINT_KEY = 'streakle-scramble'
const HC_KEY = 'streakle-hc' // shared with Words and Weave
const SHAKE_MS = 450
const POP_MS = 700

const css = `
@keyframes scShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes scPop{0%{transform:scale(1)}45%{transform:scale(1.14)}100%{transform:scale(1)}}
@keyframes scConfetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(130px) rotate(720deg);opacity:0}}
@keyframes scSlideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes scCopied{0%{opacity:0;transform:translateY(4px)}20%{opacity:1;transform:translateY(0)}80%{opacity:1}100%{opacity:0}}
.sc-board{display:grid;gap:4px;justify-content:center;margin:0 auto}
.sc-cell{width:var(--sc-cell);height:var(--sc-cell);box-sizing:border-box;border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:calc(var(--sc-cell) * 0.58);line-height:1;color:#F5F0E8;padding:0;border:2px solid transparent;user-select:none;-webkit-user-select:none}
.sc-future{background:#1C1A16;border-color:#2C2820}
.sc-slot{background:#14120F;border:2px dashed #8A7B60}
.sc-next{border-color:#C9A84C}
.sc-placed{background:#2C2418;border-color:#C9A84C;cursor:pointer}
.sc-given{border-color:#C9A84C}
.sc-pop{animation:scPop .5s ease}
.sc-shake{animation:scShake .45s ease}
.sc-rack{display:flex;gap:6px;justify-content:center;flex-wrap:nowrap;margin:18px 0 12px}
.sc-tile{width:min(46px,calc((100vw - 68px) / 7));height:min(52px,calc((100vw - 68px) / 7 * 1.12));border-radius:8px;border:2px solid #C9A84C;background:#2C2418;color:#F5F0E8;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:min(28px,calc((100vw - 68px) / 7 * 0.6));cursor:pointer;padding:0;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:transform .12s}
.sc-tile:active{transform:scale(.94)}
.sc-tile-used{opacity:.18;cursor:default}
.sc-tile:focus-visible,.sc-placed:focus-visible,.sc-ctl:focus-visible{outline:2px solid #F5F0E8;outline-offset:2px}
.sc-ctl{background:none;border:1px solid #2C2820;border-radius:8px;color:#C9A84C;cursor:pointer;font-size:13px;font-weight:600;padding:8px 14px;touch-action:manipulation}
.sc-ctl[aria-disabled="true"]{opacity:.4;cursor:default}
.sc-chip{min-width:26px;padding:3px 6px;border-radius:6px;border:1px solid #2C2820;font-size:12px;font-weight:700;color:#A09482;text-align:center;font-variant-numeric:tabular-nums}
.sc-toast{position:fixed;top:80px;left:50%;transform:translateX(-50%);background:#1C1A16;border:1px solid #2C2820;border-radius:8px;padding:8px 20px;font-size:14px;font-weight:600;color:#F5F0E8;z-index:60;animation:scSlideUp .2s ease;white-space:nowrap}
.sc-sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`

function formatDate(dateStr) {
  let d = new Date();
  if (dateStr) { const [y,m,day] = dateStr.split('-').map(Number); d = new Date(y, m-1, day); }
  return d.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
}

const sum = arr => arr.reduce((a, b) => a + b, 0)
const plural = (n, word) => `${n} ${word}${n !== 1 ? 's' : ''}`
const todayStr = () => new Date().toLocaleDateString('en-CA')
const identity = n => Array.from({ length: n }, (_, i) => i)
const zeros = () => Array(RUNGS).fill(0)
const freshGame = () => ({ rung: 0, hints: zeros(), mistakes: zeros(), hinted: [], acc: 0 })

// ── Today's checkpoint: progress, hints, mistakes and clock, so a reload
// never refunds a mistake or revives a finished day. Archive replays never
// touch it. Placed-but-unchecked letters are not saved.
function readCheckpoint(date, free) {
  try {
    const raw = localStorage.getItem(CHECKPOINT_KEY)
    if (!raw) return null
    const cp = JSON.parse(raw)
    if (!cp || cp.v !== 1 || cp.date !== date) return null
    if (!Number.isInteger(cp.rung) || cp.rung < 0 || cp.rung > RUNGS) return null
    const counts = a => Array.isArray(a) && a.length === RUNGS && a.every(n => Number.isInteger(n) && n >= 0)
    if (!counts(cp.hints) || !counts(cp.mistakes)) return null
    if (!Number.isFinite(cp.acc) || cp.acc < 0) return null
    const allowed = cp.rung < RUNGS ? free[cp.rung] : []
    if (!Array.isArray(cp.hinted) || new Set(cp.hinted).size !== cp.hinted.length || !cp.hinted.every(k => allowed.includes(k))) return null
    if (cp.rung < RUNGS && (cp.hinted.length >= allowed.length || cp.hints[cp.rung] < cp.hinted.length)) return null
    return { rung: cp.rung, hints: cp.hints, mistakes: cp.mistakes, hinted: cp.hinted, acc: cp.acc }
  } catch { return null }
}

function writeCheckpoint(date, g) {
  try {
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify({ v: 1, date, ...g }))
  } catch { /* storage unavailable */ }
}

function readHc() {
  try { return localStorage.getItem(HC_KEY) === '1' } catch { return false }
}

function buildShareText(g, dateStr) {
  const hints = sum(g.hints), mistakes = sum(g.mistakes)
  const secs = scoreSeconds(g.acc, hints)
  const done = g.rung >= RUNGS
  const verb = !done ? `${g.rung}/${RUNGS} words so far` : mistakes >= MAX_MISTAKES ? `Finished in ${formatTime(secs)}` : `Solved in ${formatTime(secs)}`
  const line = shareLine(LENGTHS.map((_, i) => ({ solved: i < g.rung, hints: g.hints[i], mistakes: g.mistakes[i] })))
  return `SCRAMBLE by Streakle 🔀 — ${formatDate(dateStr)}\n${verb} · ${plural(hints, 'hint')} · ${plural(mistakes, 'mistake')}\n${line}\n\nPlay at: playstreakle.com/scramble`
}

export default function Scramble() {
  const { streak } = useStreak('scramble')
  useSeo(PAGE_SEO.scramble)
  const [showArchive, setShowArchive] = useState(false)
  const [puzzleDate, setPuzzleDate] = useState(null)
  const [showHow, setShowHow] = useState(false)
  const [hc, setHc] = useState(readHc)

  const seedDate = puzzleDate ?? todayStr()
  const toggleHc = () => setHc(v => {
    const n = !v
    try { localStorage.setItem(HC_KEY, n ? '1' : '0') } catch { /* storage unavailable */ }
    return n
  })
  const howBtn = { background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, color: GOLD, cursor: 'pointer', fontSize: 13, padding: '3px 10px', whiteSpace: 'nowrap' }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 0, position: 'relative', color: INK, overflow: 'hidden' }}>
      <style>{css}</style>
      <UserMenu />
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '12px 16px 0', minHeight: 44 }}>
        <a href="/" style={{ color: GOLD, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>← Back</a>
      </div>
      {/* Wraps on narrow phones: the 8-letter title takes its own line. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 12, rowGap: 8, marginBottom: 2, padding: '0 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: 2, color: '#fff', margin: 0 }}>SCRAMBLE</h1>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, color: GOLD, textTransform: 'uppercase', marginTop: -4 }}>by Streakle</div>
        </div>
        <button onClick={() => setShowHow(!showHow)} aria-expanded={showHow} style={{ ...howBtn, marginLeft: 8 }}>How to play</button>
        <button onClick={() => setShowArchive(true)} style={howBtn}>📅 Archive</button>
      </div>
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 8, marginTop: 6 }}>{formatDate(puzzleDate)}</div>

      {showHow && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, maxWidth: 340, margin: '0 16px 12px', fontSize: 13, lineHeight: 1.65, color: '#ccc', animation: 'scSlideUp 0.3s ease' }}>
          <b style={{ color: GOLD }}>How to play</b><br/>
          Unscramble six words, shortest to longest — 4 up to 7 letters.<br/><br/>
          <b>Tap</b> letters (or type) to fill the highlighted word; tap a placed letter to take it back.
          Each word you solve locks into the board, and its letters fill in the words that cross it.<br/><br/>
          Stuck? A <b>hint</b> reveals one letter (+{HINT_SECONDS}s). The clock only runs while you play.
          {' '}{MAX_MISTAKES} wrong words and today won't count toward your streak — but you can still finish.
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
            <span>High contrast colours</span>
            <button onClick={toggleHc} role="switch" aria-checked={hc} aria-label="High contrast colours" style={{ background: hc ? '#f5793a' : BORDER, border: 'none', borderRadius: 11, width: 44, height: 22, position: 'relative', cursor: 'pointer', padding: 0 }}>
              <span style={{ position: 'absolute', top: 2, left: hc ? 24 : 2, width: 18, height: 18, borderRadius: '50%', background: INK, transition: 'left 0.2s' }} />
            </button>
          </div>
        </div>
      )}

      {streak > 0 && (
        <div style={{ fontSize: 13, color: GOLD, fontWeight: 600, marginBottom: 8 }}>🔥 {streak} day streak</div>
      )}

      {/* Keyed by date: a new puzzle is a fresh board, never a stale one. */}
      <ScrambleBoard key={seedDate} seedDate={seedDate} isToday={puzzleDate === null} palette={hc ? PALETTE_HC : PALETTE} keysBlocked={showArchive} />

      <div style={{ marginTop: 32, fontSize: 12, color: '#5A5040', textAlign: 'center' }}>
        <a href="/privacy" style={{ color: '#5A5040', textDecoration: 'none' }}>Privacy Policy / Politique de confidentialité</a>
      </div>

      {showArchive && (
        <Archive
          game="scramble"
          onSelectDate={(date) => setPuzzleDate(date === todayStr() ? null : date)}
          onClose={() => setShowArchive(false)}
        />
      )}
    </main>
  )
}

function ScrambleBoard({ seedDate, isToday, palette, keysBlocked }) {
  const pz = useMemo(() => generatePuzzle(seedDate), [seedDate])
  const cells = useMemo(() => boardCells(pz), [pz])
  const free = useMemo(() => pz.placements.map((_, i) => freePositions(pz.placements, i)), [pz])

  const [g, setG] = useState(() => (isToday && readCheckpoint(seedDate, free)) || freshGame())
  const [placed, setPlaced] = useState([])       // [{ pos, tile }] for the current rung, in order
  const [order, setOrder] = useState(() => identity(pz.racks[g.rung]?.length ?? 0))
  const [segStart, setSegStart] = useState(null) // Date.now() when the running clock segment began
  const [now, setNow] = useState(0)
  const [shake, setShake] = useState(false)
  const [pop, setPop] = useState(-1)             // the rung that just locked in
  const [live, setLive] = useState({ n: 0, text: '' })
  const [toast, setToast] = useState(null)
  const [copied, setCopied] = useState(false)
  const [confetti, setConfetti] = useState([])
  const timeouts = useRef([])
  const keyHandler = useRef(null)

  const { rung, hints, mistakes, hinted, acc } = g
  const done = rung >= RUNGS
  const word = done ? '' : pz.words[rung]
  const rack = done ? '' : pz.racks[rung]
  const freeHere = done ? [] : free[rung]
  const totalMistakes = sum(mistakes)
  const failed = totalMistakes >= MAX_MISTAKES
  const running = segStart !== null ? Math.max(0, now - segStart) : 0
  const seconds = scoreSeconds(acc + running, sum(hints))

  // Hints consume rack tiles: each hinted position takes the first unused
  // tile with its letter, so the mapping is rebuilt the same way on reload.
  const hintTiles = new Map()
  for (const pos of hinted) {
    for (let t = 0; t < rack.length; t++) {
      if (rack[t] === word[pos] && ![...hintTiles.values()].includes(t)) { hintTiles.set(pos, t); break }
    }
  }
  const usedTiles = new Set([...hintTiles.values(), ...placed.map(p => p.tile)])
  const openSlots = freeHere.filter(pos => !hintTiles.has(pos) && !placed.some(p => p.pos === pos))

  useEffect(() => {
    if (segStart === null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [segStart])

  useEffect(() => {
    const t = timeouts
    return () => { t.current.forEach(clearTimeout); t.current = [] }
  }, [])

  const pushTimeout = (fn, ms) => { timeouts.current.push(setTimeout(fn, ms)) }
  const announce = (text) => setLive(l => ({ n: l.n + 1, text }))
  const showToast = (msg, ms = 2000) => {
    setToast(msg)
    announce(msg)
    pushTimeout(() => setToast(t => (t === msg ? null : t)), ms)
  }
  const persist = (next) => { if (isToday) writeCheckpoint(seedDate, next) }
  // saveResult stamps the wall-clock date, so a session that runs past
  // midnight must not write yesterday's board onto today's row.
  const canSave = () => isToday && todayStr() === seedDate
  const spawnConfetti = () => {
    setConfetti(Array.from({ length: 30 }, (_, i) => ({
      id: i, x: 20 + Math.random() * 60, delay: Math.random() * 700,
      color: ['#4caf50', '#C9A84C', '#C9A84C', '#e94560', '#ffd700', '#fff'][i % 6],
      size: 5 + Math.random() * 8,
    })))
    pushTimeout(() => setConfetti([]), 1600)
  }

  // Folds the running clock segment into acc (and restarts it if `keep`).
  const foldClock = (keep) => {
    const t = Date.now()
    const folded = acc + (segStart !== null ? Math.max(0, t - segStart) : 0)
    setSegStart(keep ? t : null)
    setNow(t)
    return folded
  }
  const startClock = () => {
    if (segStart !== null || done) return
    const t = Date.now()
    setSegStart(t)
    setNow(t)
  }

  const describeRung = (i) => {
    const given = LENGTHS[i] - free[i].length
    return `Word ${i + 1} of ${RUNGS}: ${LENGTHS[i]} letters${given ? `, ${given} already placed` : ''}.`
  }

  const finish = (next) => {
    const h = sum(next.hints), m = sum(next.mistakes)
    const counted = m < MAX_MISTAKES
    // Archive replays never write results — they would land on today's row.
    if (canSave()) saveResult({ game: 'scramble', completed: counted, score: scoreSeconds(next.acc, h), swaps_used: m })
    if (counted) spawnConfetti()
    announce(`All six words solved in ${formatTime(scoreSeconds(next.acc, h))}.`)
  }

  // base: the game state to advance from (hints may have just changed it).
  const solve = (base) => {
    const next = { ...base, rung: base.rung + 1, hinted: [], acc: foldClock(base.rung + 1 < RUNGS) }
    setG(next)
    persist(next)
    setPlaced([])
    setOrder(identity(pz.racks[next.rung]?.length ?? 0))
    setPop(base.rung)
    pushTimeout(() => setPop(p => (p === base.rung ? -1 : p)), POP_MS)
    if (next.rung === RUNGS) finish(next)
    else announce(`${pz.words[base.rung]} — solved! ${describeRung(next.rung)}`)
  }

  const wrong = (attempt) => {
    setPlaced(attempt)
    setShake(true)
    const mistakesNext = mistakes.slice()
    mistakesNext[rung] += 1
    const next = { ...g, mistakes: mistakesNext, acc: foldClock(true) }
    setG(next)
    persist(next)
    const total = sum(mistakesNext)
    if (total === MAX_MISTAKES) {
      if (canSave()) saveResult({ game: 'scramble', completed: false, score: scoreSeconds(next.acc, sum(next.hints)), swaps_used: total })
      showToast(`${MAX_MISTAKES} mistakes — today won't count, but keep going!`, 3200)
    } else {
      showToast(total > MAX_MISTAKES ? 'Not quite' : `Not quite — ${plural(MAX_MISTAKES - total, 'mistake')} left`)
    }
    pushTimeout(() => { setShake(false); setPlaced([]) }, SHAKE_MS)
  }

  const guessFor = (attempt) => Array.from(word, (ch, k) => {
    if (!freeHere.includes(k) || hintTiles.has(k)) return ch
    const p = attempt.find(x => x.pos === k)
    return p ? rack[p.tile] : '?'
  }).join('')

  const placeTile = (t) => {
    if (done || shake || usedTiles.has(t) || !openSlots.length) return
    startClock()
    const attempt = [...placed, { pos: openSlots[0], tile: t }]
    if (openSlots.length > 1) {
      setPlaced(attempt)
      announce(`${rack[t]} placed. ${plural(openSlots.length - 1, 'letter')} to go.`)
      return
    }
    if (guessFor(attempt) === word) solve(g)
    else wrong(attempt)
  }
  const removeAt = (pos) => {
    if (shake) return
    setPlaced(ps => ps.filter(p => p.pos !== pos))
  }
  const removeLast = () => { if (!shake) setPlaced(ps => ps.slice(0, -1)) }
  const clearAll = () => { if (!shake) setPlaced([]) }
  const shuffle = () => {
    if (done || shake) return
    setOrder(o => {
      const a = o.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
      }
      return a
    })
  }
  const hint = () => {
    if (done || shake) return
    const target = freeHere.find(pos => !hinted.includes(pos))
    if (target === undefined) return
    startClock()
    const hintsNext = hints.slice()
    hintsNext[rung] += 1
    const next = { ...g, hints: hintsNext, hinted: [...hinted, target] }
    setPlaced([])
    if (next.hinted.length === freeHere.length) { solve(next); return }
    setG(next)
    persist(next)
    announce(`Hint: letter ${target + 1} is ${word[target]}. ${HINT_SECONDS} seconds added.`)
  }

  // Typing: letters place the first matching tile, Backspace takes the last
  // one back, Escape clears. The handler is refreshed after every render.
  useEffect(() => {
    keyHandler.current = (e) => {
      if (keysBlocked || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.repeat && e.key !== 'Backspace') return
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable="true"]')) return
      if (e.key === 'Backspace') { e.preventDefault(); removeLast(); return }
      if (e.key === 'Escape') { clearAll(); return }
      const ch = e.key.length === 1 ? e.key.toUpperCase() : ''
      if (!/^[A-Z]$/.test(ch)) return
      const t = order.find(i => rack[i] === ch && !usedTiles.has(i))
      if (t !== undefined) { e.preventDefault(); placeTile(t) }
    }
  })
  useEffect(() => {
    const onKey = (e) => keyHandler.current?.(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Pause when the tab hides or the page unloads so backgrounded time never
  // counts and progress survives a reload.
  const pause = useCallback(() => {
    if (segStart === null) return
    const next = { ...g, acc: g.acc + Math.max(0, Date.now() - segStart) }
    setG(next)
    setSegStart(null)
    if (isToday) writeCheckpoint(seedDate, next)
  }, [segStart, g, isToday, seedDate])

  const pauseRef = useRef(pause)
  useEffect(() => { pauseRef.current = pause })
  useEffect(() => () => pauseRef.current(), [])

  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'hidden') pause() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', pause)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', pause)
    }
  }, [pause])

  const handleShare = async () => {
    const text = buildShareText(g, isToday ? null : seedDate)
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
  const current = done ? null : pz.placements[rung]
  const posOf = (cell) => (current.dir === ACROSS ? cell.c - current.col : cell.r - current.row)
  const board = []
  for (let r = 0; r < pz.rows; r++) {
    for (let c = 0; c < pz.cols; c++) {
      const cell = cells.get(cellKey(r, c))
      if (!cell) { board.push(<div key={`${r},${c}`} aria-hidden="true" />); continue }
      const solved = cell.rungs.some(i => i < rung)
      const popping = pop >= 0 && cell.rungs.includes(pop)
      const inCurrent = !done && cell.rungs.includes(rung)
      const k = inCurrent ? posOf(cell) : -1
      const cls = ['sc-cell']
      if (popping) cls.push('sc-pop')
      if (inCurrent && shake) cls.push('sc-shake')
      let letter = null, style = null
      if (solved) {
        letter = cell.ch
        style = { background: palette.done, color: palette.doneInk }
        if (inCurrent) cls.push('sc-given')
      } else if (inCurrent && hintTiles.has(k)) {
        letter = cell.ch
        style = { background: palette.hint, color: palette.hintInk }
      } else if (inCurrent) {
        const p = placed.find(x => x.pos === k)
        if (p) {
          board.push(
            <button key={`${r},${c}`} type="button" className={[...cls, 'sc-placed'].join(' ')}
              onClick={() => removeAt(k)} aria-label={`Letter ${k + 1}: ${rack[p.tile]}. Tap to take it back`}>
              {rack[p.tile]}
            </button>
          )
          continue
        }
        cls.push('sc-slot')
        if (k === openSlots[0]) cls.push('sc-next')
      } else {
        cls.push('sc-future')
      }
      board.push(<div key={`${r},${c}`} className={cls.join(' ')} style={style} aria-hidden="true">{letter}</div>)
    }
  }

  const pattern = done ? '' : Array.from(word, (ch, k) => {
    if (!freeHere.includes(k) || hintTiles.has(k)) return ch
    const p = placed.find(x => x.pos === k)
    return p ? rack[p.tile] : '_'
  }).join(' ')

  const cellSize = `min(44px, calc((min(100vw, 400px) - 32px - ${(pz.cols - 1) * 4}px) / ${pz.cols}))`

  const shareBtn = (primary) => (
    <div style={{ position: 'relative', display: 'inline-block', marginTop: 4 }}>
      <button onClick={handleShare} style={primary
        ? { background: GOLD, color: '#0F0E0C', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }
        : { background: CARD, color: GOLD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        📋 Share result
      </button>
      {copied && <div style={{ position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)', background: '#2d6a30', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6, whiteSpace: 'nowrap', animation: 'scCopied 2s ease forwards', pointerEvents: 'none' }}>Copied!</div>}
    </div>
  )

  return (
    <>
      {confetti.map(c => (
        <div key={c.id} style={{ position: 'fixed', left: `${c.x}%`, top: '28%', width: c.size, height: c.size, background: c.color, borderRadius: c.size > 10 ? '50%' : 2, animation: `scConfetti 1.3s ${c.delay}ms ease forwards`, pointerEvents: 'none', zIndex: 100 }} />
      ))}

      {/* Ladder: one chip per word, by length. */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }} role="img" aria-label={`Ladder: ${Math.min(rung, RUNGS)} of ${RUNGS} words solved; lengths ${LENGTHS.join(', ')}`}>
        {LENGTHS.map((len, i) => {
          const st = i < rung ? 'done' : i === rung ? 'current' : 'todo'
          return (
            <span key={i} className="sc-chip" aria-current={st === 'current' ? 'step' : undefined}
              style={st === 'done' ? { color: '#86EFAC', borderColor: '#2d6a30' } : st === 'current' ? { color: '#0F0E0C', background: GOLD, borderColor: GOLD } : null}>
              {st === 'done' ? '✓' : len}
            </span>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 14, fontWeight: 600, marginBottom: 12, fontVariantNumeric: 'tabular-nums' }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, color: INK }} role="timer" aria-label={`Time ${formatTime(seconds)}`}>⏱ {formatTime(seconds)}</span>
        <span role="img" aria-label={`${plural(totalMistakes, 'mistake')} of ${MAX_MISTAKES}`} style={{ display: 'inline-flex', gap: 4 }}>
          {Array.from({ length: MAX_MISTAKES }, (_, k) => (
            <span key={k} aria-hidden="true" style={{ width: 9, height: 9, borderRadius: '50%', background: k < totalMistakes ? RED : '#3A3428' }} />
          ))}
        </span>
        {failed && !done && <span style={{ fontSize: 12, color: RED }}>not counting today</span>}
      </div>

      <div className="sc-board" style={{ gridTemplateColumns: `repeat(${pz.cols}, var(--sc-cell))`, '--sc-cell': cellSize }}>
        {board}
      </div>

      {!done && (
        <>
          <div style={{ fontSize: 13, color: '#aaa', marginTop: 14 }} aria-hidden="true">
            Word {rung + 1} of {RUNGS} · {word.length} letters
          </div>
          <div className="sc-sr-only">{describeRung(rung)} Current letters: {pattern}.</div>
          <div className={`sc-rack${shake ? ' sc-shake' : ''}`} role="group" aria-label="Letters to place">
            {order.map(t => (
              <button key={t} type="button" className={`sc-tile${usedTiles.has(t) ? ' sc-tile-used' : ''}`}
                onClick={() => placeTile(t)} aria-disabled={usedTiles.has(t)} aria-label={usedTiles.has(t) ? `${rack[t]}, placed` : `Place ${rack[t]}`}>
                {rack[t]}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="sc-ctl" onClick={shuffle}>🔀 Shuffle</button>
            <button className="sc-ctl" onClick={clearAll} aria-disabled={!placed.length}>Clear</button>
            <button className="sc-ctl" onClick={hint}>💡 Hint (+{HINT_SECONDS}s)</button>
          </div>
        </>
      )}

      {done && (
        <div style={{ textAlign: 'center', marginTop: 18, animation: 'scSlideUp 0.5s ease' }}>
          {failed ? (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, color: GOLD, marginBottom: 6 }}>Finished!</div>
              <div style={{ fontSize: 13, color: '#aaa', marginBottom: 4 }}>{formatTime(seconds)} · {plural(totalMistakes, 'mistake')} — this one doesn't count toward your streak</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 700, color: WIN, marginBottom: 6 }}>🎉 Unscrambled!</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: GOLD, marginBottom: 4 }}>{formatTime(seconds)} · {plural(sum(hints), 'hint')} · {plural(totalMistakes, 'mistake')}</div>
            </>
          )}
          <div style={{ fontSize: 13, color: '#aaa', margin: '6px 0 14px', letterSpacing: 1 }}>{pz.words.join(' · ')}</div>
          {shareBtn(!failed)}
        </div>
      )}

      {toast && <div className="sc-toast" role="presentation">{toast}</div>}
      <div className="sc-sr-only" aria-live="polite" aria-atomic="true">{live.text}{live.n % 2 ? '​' : ''}</div>
    </>
  )
}
