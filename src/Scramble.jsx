import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Archive from './Archive'
import GameShell from './GameShell'
import ResultCard from './ResultCard'
import { NO_PAGE_SHORTCUTS } from './UserMenu'
import { saveResult } from './saveResult'
import { useStreak } from './useStreak'
import { useBoardDate } from './useBoardDate'
import { useSeo, PAGE_SEO } from './seo'
import {
  POOL_SIZE, BOARD_WORDS, MIN_LEN, HINT_SECONDS,
  generatePuzzle, boardCells, cellKey, cellsOf, revealedCells, completeFound, nextHint,
  scoreSeconds, formatTime, shareLine,
} from './scramble/engine'
import { GOLD, INK } from './theme'
import { slotHoldsLaterDay } from './checkpointSlot'

const DARK_INK = 'var(--bg)'
// Found letters and hinted letters; light tiles take dark ink for contrast.
const PALETTE = { done: 'var(--correct)', doneInk: INK, hint: 'var(--present)', hintInk: DARK_INK }
const PALETTE_HC = { done: 'var(--hc-correct)', doneInk: DARK_INK, hint: 'var(--hc-present)', hintInk: DARK_INK }
const CHECKPOINT_KEY = 'streakle-scramble'
const CHECKPOINT_VERSION = 2 // v1 was the one-word-at-a-time ladder
const HC_KEY = 'streakle-hc' // shared with Words and Weave
const SHAKE_MS = 450
const POP_MS = 700

// A used tile dims through its colours, not opacity: opacity would fade its
// focus ring too, and Enter on a tile leaves focus on it as it turns used.
const css = `
@keyframes scShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes scPop{0%{transform:scale(1)}45%{transform:scale(1.14)}100%{transform:scale(1)}}
@keyframes scConfetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(130px) rotate(720deg);opacity:0}}
@keyframes scSlideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
.sc-board{display:grid;gap:4px;justify-content:center;margin:0 auto}
.sc-cell{width:var(--sc-cell);height:var(--sc-cell);box-sizing:border-box;border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:800;font-size:calc(var(--sc-cell) * 0.58);line-height:1;color:var(--ink);border:2px solid transparent;user-select:none;-webkit-user-select:none}
.sc-empty{background:var(--surface);border-color:var(--border-strong)}
.sc-pop{animation:scPop .5s ease}
.sc-shake{animation:scShake .45s ease}
.sc-guess{display:flex;gap:4px;justify-content:center;align-items:center;min-height:44px;margin:16px 0 4px}
.sc-guess-tile{width:34px;height:40px;border-radius:6px;background:var(--surface-gold);border:2px solid var(--gold);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:800;font-size:22px;color:var(--ink)}
.sc-rack{display:flex;gap:6px;justify-content:center;flex-wrap:nowrap;margin:10px 0 12px}
.sc-tile{width:min(54px,calc((100vw - 68px) / 7));height:min(60px,calc((100vw - 68px) / 7 * 1.12));border-radius:8px;border:2px solid var(--gold);background:var(--surface-gold);color:var(--ink);font-family:var(--font-display);font-weight:800;font-size:min(32px,calc((100vw - 68px) / 7 * 0.6));cursor:pointer;padding:0;touch-action:manipulation;-webkit-tap-highlight-color:transparent;transition:transform .12s}
.sc-tile:active{transform:scale(.94)}
.sc-tile-used{color:rgba(var(--ink-rgb),.18);border-color:rgba(var(--gold-rgb),.18);background:transparent;cursor:default}
.sc-tile:focus-visible,.sc-ctl:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.sc-ctl{background:none;border:1px solid var(--border);border-radius:8px;color:var(--gold);cursor:pointer;font-size:13px;font-weight:600;padding:8px 12px;touch-action:manipulation;white-space:nowrap}
.sc-ctl-primary{background:var(--gold);color:var(--bg);border-color:var(--gold)}
.sc-ctl[aria-disabled="true"]{opacity:.4;cursor:default}
.sc-chip{min-width:26px;padding:3px 6px;border-radius:6px;border:1px solid var(--border);font-size:12px;font-weight:700;color:var(--text-2);text-align:center;font-variant-numeric:tabular-nums}
.sc-toast{position:fixed;top:80px;left:50%;transform:translateX(-50%);background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 20px;font-size:14px;font-weight:600;color:var(--ink);z-index:60;animation:scSlideUp .2s ease;white-space:nowrap}
.sc-sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`

function formatDate(dateStr) {
  let d = new Date();
  if (dateStr) { const [y,m,day] = dateStr.split('-').map(Number); d = new Date(y, m-1, day); }
  return d.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
}

const plural = (n, word) => `${n} ${word}${n !== 1 ? 's' : ''}`
const identity = n => Array.from({ length: n }, (_, i) => i)
const freshGame = () => ({ found: [], hinted: [], hints: 0, acc: 0 })

// A focused control (a letter tile, Hint, ⌫, the high-contrast switch, a
// link) keeps Enter for itself: Enter activates it, never submits the guess.
const CONTROL = 'a[href], button, [role="button"], [role="switch"]'
// Drops focus from whichever control holds it, so the next Enter submits
// the guess instead of pressing that control.
const blurFocusedControl = () => {
  const focused = document.activeElement
  if (focused instanceof HTMLElement && focused.closest(CONTROL)) focused.blur()
}
// After a mouse/touch click (detail > 0, unlike keyboard activation), hand
// Enter back to the guess: blur the control the click focused, or the one
// it left focused (one reached by Tab, or refocused by a closing dialog) —
// not every click moves focus to the button it presses.
const blurAfterClick = (e) => { if (e.detail > 0) blurFocusedControl() }
// Wall-clock reads for the game clock. Only ever called from event handlers
// and effects — never while rendering.
const clockNow = () => Date.now()
// Picks which hidden letter a hint reveals (the engine stays deterministic).
const randomUnit = () => Math.random()

const withCompleted = (pz, g) => {
  const found = completeFound(pz, g.found, g.hinted)
  return found === g.found ? g : { ...g, found }
}

// ── The board for screen readers (its cells are aria-hidden): each word's
// length, the letters showing in it so far and where it crosses other
// words. A hidden letter is spoken as "blank" — screen readers skip a bare
// "_" at their default punctuation level.
//
// Every board repeats a word length, so each word is named by its place in
// the chip row (shortest first, then board order): "word 3". The board
// list, finds and hints all use that name.
function wordNumbers(pz) {
  const order = pz.words.map((w, i) => i).sort((a, b) => pz.words[a].length - pz.words[b].length || a - b)
  return { order, num: pz.words.map((w, i) => order.indexOf(i) + 1) }
}

function spokenPattern(pz, i, revealed) {
  const p = pz.placements[i]
  return cellsOf(p).map(([r, c], k) => (revealed.has(cellKey(r, c)) ? p.word[k] : 'blank')).join(' ')
}

// "Letter 1 crosses word 6, letter 3 crosses word 5." — the grid's shape.
function spokenCrossings(pz, i, cells, num) {
  const parts = cellsOf(pz.placements[i]).flatMap(([r, c], k) =>
    cells.get(cellKey(r, c)).words.filter(j => j !== i).map(j => `letter ${k + 1} crosses word ${num[j]}`))
  if (!parts.length) return ''
  const text = parts.join(', ')
  return ` ${text[0].toUpperCase()}${text.slice(1)}.`
}

function spokenWord(pz, i, found, revealed, cells, num) {
  if (found.includes(i)) return `Word ${num[i]}: ${pz.words[i]}, found`
  const showing = cellsOf(pz.placements[i]).some(([r, c]) => revealed.has(cellKey(r, c)))
  const letters = showing ? `: ${spokenPattern(pz, i, revealed)}` : ', none showing'
  return `Word ${num[i]}, ${pz.words[i].length} letters${letters}.${spokenCrossings(pz, i, cells, num)}`
}

// What a hint revealed: its letter (and the words sharing it, at a
// crossing), then each word that letter sits in — the word's new pattern,
// or that the letter completed it.
function hintMessage(pz, cell, next, num) {
  const shown = revealedCells(pz, next.found, next.hinted)
  const ws = [...cell.words].sort((a, b) => num[a] - num[b])
  const shared = ws.length > 1 ? `, shared by words ${ws.map(i => num[i]).join(' and ')}` : ''
  const words = ws.map(i => (next.found.includes(i)
    ? `That completes ${pz.words[i]} (word ${num[i]}).`
    : `Word ${num[i]} now reads ${spokenPattern(pz, i, shown)}.`))
  return `Hint: ${cell.ch}${shared}. ${words.join(' ')} ${HINT_SECONDS} seconds added.`
}

// ── Today's checkpoint: found words, hinted cells, hints and clock, so a
// reload never refunds a hint or revives a finished day. Archive replays
// never touch it. A half-spelled guess is not saved.
// The board a checkpoint belongs to: a same-day engine or word-list change
// gives a different signature, and the old progress is dropped.
const boardSig = (pz) => `${pz.pool}:${pz.words.join(',')}`

function readCheckpoint(date, pz, cells) {
  try {
    const raw = localStorage.getItem(CHECKPOINT_KEY)
    if (!raw) return null
    const cp = JSON.parse(raw)
    if (!cp || cp.v !== CHECKPOINT_VERSION || cp.date !== date || cp.sig !== boardSig(pz)) return null
    const okFound = Array.isArray(cp.found) && new Set(cp.found).size === cp.found.length &&
      cp.found.every(i => Number.isInteger(i) && i >= 0 && i < BOARD_WORDS)
    const okHinted = Array.isArray(cp.hinted) && new Set(cp.hinted).size === cp.hinted.length &&
      cp.hinted.every(k => typeof k === 'string' && cells.has(k))
    if (!okFound || !okHinted) return null
    if (!Number.isInteger(cp.hints) || cp.hints < cp.hinted.length) return null
    if (!Number.isFinite(cp.acc) || cp.acc < 0) return null
    return withCompleted(pz, { found: cp.found, hinted: cp.hinted, hints: cp.hints, acc: cp.acc })
  } catch { return null }
}

// There is one slot, and a tab left open since yesterday keeps the board it
// was dealt, so a write never replaces a later day's checkpoint (YYYY-MM-DD
// strings compare as dates) — its next move, or its clock pausing, would
// wipe today's progress.
function writeCheckpoint(date, pz, g) {
  try {
    if (slotHoldsLaterDay(CHECKPOINT_KEY, date)) return
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify({ v: CHECKPOINT_VERSION, date, sig: boardSig(pz), ...g }))
  } catch { /* storage unavailable */ }
}

function readHc() {
  try { return localStorage.getItem(HC_KEY) === '1' } catch { return false }
}

function buildShareText(pz, g, dateStr) {
  const done = g.found.length === BOARD_WORDS
  const head = done ? `Solved in ${formatTime(scoreSeconds(g.acc, g.hints))}` : `${g.found.length}/${BOARD_WORDS} words so far`
  return `SCRAMBLE by Streakle 🔀 — ${formatDate(dateStr)}\n${head} · ${plural(g.hints, 'hint')}\n${shareLine(pz, g.found, g.hinted)}\n\nPlay at: playstreakle.com/scramble`
}

export default function Scramble() {
  const { streak } = useStreak('scramble')
  useSeo(PAGE_SEO.scramble)
  const [showArchive, setShowArchive] = useState(false)
  const { seedDate, isToday, boardKey, selectDate } = useBoardDate()
  const [hc, setHc] = useState(readHc)

  const toggleHc = () => setHc(v => {
    const n = !v
    try { localStorage.setItem(HC_KEY, n ? '1' : '0') } catch { /* storage unavailable */ }
    return n
  })

  const howTo = (
    <>
      Six words are hidden in today's {POOL_SIZE} letters — from {MIN_LEN}-letter words up to one that uses all {POOL_SIZE}.<br/><br/>
      <b>Tap</b> letters (or type) to spell a word, then <b>Enter</b>. Find them in any order: each word you find fills in letters of the words that cross it.<br/><br/>
      Guesses that aren't on the board cost nothing. Stuck? A <b>hint</b> reveals a letter (+{HINT_SECONDS}s). The clock only runs while you play.
    </>
  )

  return (
    <GameShell game="scramble" date={formatDate(seedDate)} howTo={howTo} onArchive={() => setShowArchive(true)} hc={hc} onToggleHc={toggleHc}>
      <style>{css}</style>


      {streak > 0 && (
        <div style={{ fontSize: 13, color: GOLD, fontWeight: 600, marginBottom: 8 }}>🔥 {streak} day streak</div>
      )}

      {/* Keyed by date: a new puzzle is a fresh board, never a stale one. */}
      <ScrambleBoard key={boardKey} seedDate={seedDate} isToday={isToday} palette={hc ? PALETTE_HC : PALETTE} keysBlocked={showArchive} />


      {showArchive && (
        <Archive
          game="scramble"
          onSelectDate={selectDate}
          onClose={() => setShowArchive(false)}
        />
      )}
    </GameShell>
  )
}

function ScrambleBoard({ seedDate, isToday, palette, keysBlocked }) {
  const pz = useMemo(() => generatePuzzle(seedDate), [seedDate])
  const cells = useMemo(() => boardCells(pz), [pz])
  const { order: wordOrder, num } = useMemo(() => wordNumbers(pz), [pz])

  const [g, setG] = useState(() => (isToday && readCheckpoint(seedDate, pz, cells)) || freshGame())
  const [guess, setGuess] = useState([])         // pool tile indices, in spelling order
  const [order, setOrder] = useState(() => identity(POOL_SIZE))
  const [segStart, setSegStart] = useState(null) // Date.now() when the running clock segment began
  const [now, setNow] = useState(0)
  const [shake, setShake] = useState(false)
  const [pop, setPop] = useState([])             // words that just filled in
  const [live, setLive] = useState({ n: 0, text: '' })
  const [toast, setToast] = useState(null)     // { id, msg }
  const [confetti, setConfetti] = useState([])
  const timeouts = useRef([])
  const keyHandler = useRef(null)
  const toastId = useRef(0)
  const shakeTimer = useRef(null)            // pending clear of a rejected guess
  const resultRef = useRef(null)
  const wasDone = useRef(null)

  const { found, hinted, hints, acc } = g
  const done = found.length === BOARD_WORDS
  const revealed = revealedCells(pz, found, hinted)
  const running = segStart !== null ? Math.max(0, now - segStart) : 0
  const seconds = scoreSeconds(acc + running, hints)
  const guessWord = guess.map(t => pz.pool[t]).join('')

  useEffect(() => {
    if (segStart === null) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [segStart])

  useEffect(() => {
    const t = timeouts, sh = shakeTimer
    return () => { t.current.forEach(clearTimeout); t.current = []; clearTimeout(sh.current) }
  }, [])

  // Finishing unmounts the rack and controls; move focus to the result so
  // keyboard and screen-reader users land somewhere (not on a reload).
  useEffect(() => {
    if (wasDone.current === false && done) resultRef.current?.focus()
    wasDone.current = done
  }, [done])

  const pushTimeout = (fn, ms) => { timeouts.current.push(setTimeout(fn, ms)) }
  const announce = (text) => setLive(l => ({ n: l.n + 1, text }))
  const showToast = (msg, ms = 1800) => {
    const id = ++toastId.current
    setToast({ id, msg })
    announce(msg)
    pushTimeout(() => setToast(t => (t?.id === id ? null : t)), ms)
  }
  const persist = (next) => { if (isToday) writeCheckpoint(seedDate, pz, next) }
  const spawnConfetti = () => {
    setConfetti(Array.from({ length: 30 }, (_, i) => ({
      id: i, x: 20 + Math.random() * 60, delay: Math.random() * 700,
      color: ['var(--success)', 'var(--gold)', 'var(--gold)', 'var(--danger)', 'var(--star)', 'var(--ink)'][i % 6],
      size: 5 + Math.random() * 8,
    })))
    pushTimeout(() => setConfetti([]), 1600)
  }

  const startClock = () => {
    if (segStart !== null || done) return
    const t = clockNow()
    setSegStart(t)
    setNow(t)
  }
  // Folds the running segment into acc and stops the clock (the day is done).
  const stopClock = () => {
    const folded = acc + (segStart !== null ? Math.max(0, clockNow() - segStart) : 0)
    setSegStart(null)
    return folded
  }

  // Applies a step that may have completed words: animates them, saves, and
  // finishes the day when the last word lands.
  const advance = (base, newlyFound) => {
    let next = withCompleted(pz, base)
    const landed = [...newlyFound, ...next.found.filter(i => !base.found.includes(i))]
    if (next.found.length === BOARD_WORDS) {
      next = { ...next, acc: stopClock() }
      // Archive replays never write results: a replay is not a play of that
      // day, and a replayed yesterday would otherwise still be recorded.
      // Saved before persist() below, so the result is queued on disk before
      // the checkpoint records the finish.
      if (isToday) saveResult({ game: 'scramble', puzzleDate: seedDate, completed: true, score: scoreSeconds(next.acc, next.hints), swaps_used: next.hints })
      spawnConfetti()
      announce(`All six words found in ${formatTime(scoreSeconds(next.acc, next.hints))}.`)
    }
    setG(next)
    persist(next)
    if (landed.length) {
      setPop(landed)
      pushTimeout(() => setPop(p => (p === landed ? [] : p)), POP_MS)
    }
    return next
  }

  // Ends a rejected guess's shake early; true if one was pending (the old
  // guess is then gone, whatever the next input is).
  const settleShake = () => {
    if (!shakeTimer.current) return false
    clearTimeout(shakeTimer.current)
    shakeTimer.current = null
    setShake(false)
    setGuess([])
    return true
  }
  const tapTile = (t) => {
    if (done) return
    if (settleShake()) { startClock(); setGuess([t]); return }
    if (guess.includes(t)) return
    startClock()
    setGuess(gs => [...gs, t])
  }
  const backspace = () => { if (!settleShake()) setGuess(gs => gs.slice(0, -1)) }
  const clearGuess = () => { if (!settleShake()) setGuess([]) }
  const shuffle = () => {
    if (done) return
    setOrder(o => {
      const a = o.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]]
      }
      return a
    })
  }
  const reject = (msg) => {
    setShake(true)
    showToast(msg)
    shakeTimer.current = setTimeout(() => { shakeTimer.current = null; setShake(false); setGuess([]) }, SHAKE_MS)
  }

  const submit = () => {
    if (done || settleShake() || !guess.length) return
    if (guessWord.length < MIN_LEN) { reject(`Words are ${MIN_LEN}+ letters`); return }
    const i = pz.words.indexOf(guessWord)
    if (i < 0) { reject('Not on the board'); return }
    if (found.includes(i)) { reject(`${guessWord} — already found`); return }
    setGuess([])
    const next = advance({ ...g, found: [...found, i] }, [i])
    if (next.found.length < BOARD_WORDS) {
      // Words its letters filled in by crossing count as found too.
      const also = next.found.filter(j => j !== i && !found.includes(j)).map(j => `${pz.words[j]} (word ${num[j]})`)
      announce(`${guessWord} (word ${num[i]}) found!${also.length ? ` That also completes ${also.join(' and ')}.` : ''} ${next.found.length} of ${BOARD_WORDS}.`)
    }
  }

  const hint = () => {
    if (done) return
    settleShake()
    const cell = nextHint(pz, revealed, randomUnit)
    if (!cell) return
    startClock()
    setGuess([])
    const next = advance({ ...g, hinted: [...hinted, cell], hints: hints + 1 }, [])
    if (next.found.length < BOARD_WORDS) announce(hintMessage(pz, cells.get(cell), next, num))
  }

  // Typing: letters pick the first unused matching tile, Backspace removes
  // the last letter, Enter submits, Escape clears. Enter on a focused
  // control activates that control instead; a typed letter drops focus from
  // one, so typing a word and pressing Enter submits it wherever focus was.
  // Refreshed every render.
  useEffect(() => {
    keyHandler.current = (e) => {
      if (keysBlocked || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable="true"]')) return
      // Keys pressed in the open account menu are the menu's: a letter must
      // not blur Sign out, nor Backspace or Escape edit the guess.
      if (e.target instanceof HTMLElement && e.target.closest(NO_PAGE_SHORTCUTS)) return
      if (e.key === 'Backspace') { e.preventDefault(); backspace(); return }
      if (e.repeat) return
      if (e.key === 'Enter') {
        if (e.target instanceof HTMLElement && e.target.closest(CONTROL)) return
        e.preventDefault(); submit(); return
      }
      if (e.key === 'Escape') { clearGuess(); return }
      const ch = e.key.length === 1 ? e.key.toUpperCase() : ''
      if (!/^[A-Z]$/.test(ch)) return
      const t = order.find(i => pz.pool[i] === ch && !guess.includes(i))
      if (t === undefined) return
      e.preventDefault()
      if (!done) blurFocusedControl()
      tapTile(t)
    }
  })
  useEffect(() => {
    const onKey = (e) => keyHandler.current?.(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Pause when the tab hides, the page unloads or the board unmounts (an
  // Archive date switch), so backgrounded time never counts and the clock
  // survives a reload.
  const pause = useCallback(() => {
    if (segStart === null) return
    const next = { ...g, acc: g.acc + Math.max(0, Date.now() - segStart) }
    setG(next)
    setSegStart(null)
    if (isToday) writeCheckpoint(seedDate, pz, next)
  }, [segStart, g, isToday, seedDate, pz])

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

  const shareText = () => buildShareText(pz, g, seedDate)

  // ── Render ──
  const popCells = new Set(pop.flatMap(i => cellsOf(pz.placements[i]).map(([r, c]) => cellKey(r, c))))
  const board = []
  for (let r = 0; r < pz.rows; r++) {
    for (let c = 0; c < pz.cols; c++) {
      const k = cellKey(r, c)
      const cell = cells.get(k)
      if (!cell) { board.push(<div key={k} aria-hidden="true" />); continue }
      const cls = ['sc-cell']
      if (popCells.has(k)) cls.push('sc-pop')
      let style = null, letter = null
      if (revealed.has(k)) {
        letter = cell.ch
        const inFound = cell.words.some(i => found.includes(i))
        style = inFound ? { background: palette.done, color: palette.doneInk } : { background: palette.hint, color: palette.hintInk }
      } else {
        cls.push('sc-empty')
      }
      board.push(<div key={k} className={cls.join(' ')} style={style} aria-hidden="true">{letter}</div>)
    }
  }

  // One chip per word, shortest first: its length, or ✓ once found.
  const chips = wordOrder.map(i => ({ i, len: pz.words[i].length }))
  const remaining = chips.filter(ch => !found.includes(ch.i)).map(ch => ch.len)
  const cellSize = `min(52px, calc((min(100vw, 480px) - 32px - ${(pz.cols - 1) * 4}px) / ${pz.cols}))`


  return (
    <>
      {confetti.map(c => (
        <div key={c.id} style={{ position: 'fixed', left: `${c.x}%`, top: '28%', width: c.size, height: c.size, background: c.color, borderRadius: c.size > 10 ? '50%' : 2, animation: `scConfetti 1.3s ${c.delay}ms ease forwards`, pointerEvents: 'none', zIndex: 100 }} />
      ))}

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }} role="img"
        aria-label={`${found.length} of ${BOARD_WORDS} words found${found.length ? `: ${found.map(i => pz.words[i]).join(', ')}` : ''}${remaining.length ? `; still to find: ${remaining.join(', ')} letters` : ''}`}>
        {chips.map(ch => {
          const got = found.includes(ch.i)
          return (
            <span key={ch.i} className="sc-chip" aria-hidden="true" style={got ? { color: 'var(--success-text)', borderColor: 'var(--correct-deep)' } : null}>
              {got ? '✓' : ch.len}
            </span>
          )
        })}
      </div>

      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: INK, marginBottom: 12, fontVariantNumeric: 'tabular-nums' }}
        role="timer" aria-label={`Time ${formatTime(seconds)}`}>
        ⏱ {formatTime(seconds)}
      </div>

      <ul className="sc-sr-only" aria-label="Board">
        {chips.map(ch => <li key={ch.i}>{spokenWord(pz, ch.i, found, revealed, cells, num)}</li>)}
      </ul>
      <div className="sc-board" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${pz.cols}, var(--sc-cell))`, '--sc-cell': cellSize }}>
        {board}
      </div>

      {!done && (
        <>
          <div className={`sc-guess${shake ? ' sc-shake' : ''}`} role="status">
            <span className="sc-sr-only">{guessWord ? `Your word: ${guessWord.split('').join(' ')}` : 'No letters yet'}</span>
            {guess.length
              ? guess.map((t, k) => <span key={k} className="sc-guess-tile" aria-hidden="true">{pz.pool[t]}</span>)
              : <span style={{ fontSize: 13, color: 'var(--text-2)' }} aria-hidden="true">Tap letters to spell a word</span>}
          </div>
          <div className="sc-rack" role="group" aria-label="Today's letters">
            {order.map(t => (
              <button key={t} type="button" className={`sc-tile${guess.includes(t) ? ' sc-tile-used' : ''}`}
                onClick={(e) => { blurAfterClick(e); tapTile(t) }} aria-disabled={guess.includes(t)}
                aria-label={guess.includes(t) ? `${pz.pool[t]}, used` : `Add ${pz.pool[t]}`}>
                {pz.pool[t]}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', padding: '0 16px' }}>
            <button className="sc-ctl" onClick={(e) => { blurAfterClick(e); shuffle() }} aria-label="Shuffle letters">🔀</button>
            <button className="sc-ctl" onClick={(e) => { blurAfterClick(e); backspace() }} aria-disabled={!guess.length} aria-label="Delete last letter">⌫</button>
            <button className="sc-ctl sc-ctl-primary" onClick={(e) => { blurAfterClick(e); submit() }} aria-disabled={!guess.length}>Enter</button>
            <button className="sc-ctl" onClick={(e) => { blurAfterClick(e); hint() }}>💡 Hint (+{HINT_SECONDS}s)</button>
          </div>
        </>
      )}

      {done && (
        <ResultCard ref={resultRef} game="scramble" outcome="won" title="🎉 Unscrambled!" shareText={shareText}>
          <div className="rc-headline">{formatTime(seconds)} · {plural(hints, 'hint')}</div>
          <div className="rc-detail" style={{ letterSpacing: 1 }}>
            {chips.map(ch => pz.words[ch.i]).join(' · ')}
          </div>
        </ResultCard>
      )}

      {toast && <div className="sc-toast" role="presentation">{toast.msg}</div>}
      <div className="sc-sr-only" aria-live="polite" aria-atomic="true">{live.text}{live.n % 2 ? '​' : ''}</div>
    </>
  )
}
