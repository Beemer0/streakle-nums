import React, { useState, useRef, useEffect, useMemo, useId } from "react";
import Archive from './Archive'
import GameShell from "./GameShell";
import ResultCard from './ResultCard';
import { saveResult } from './saveResult';
import { useStreak } from './useStreak';
import { useBoardDate } from './useBoardDate';
import AwardIcon from './AwardIcon';
import { clickableProps } from './a11y';
import { useAnnouncer } from './useAnnouncer';
import { useSeo, PAGE_SEO } from './seo';
import { slotHoldsLaterDay } from './checkpointSlot';
import { PROMOTIONS, WEIGHT_CLASSES, ACHIEVEMENTS } from './knockout/data';
import { FIGHTERS, getDailyPuzzle, fitsOn } from './knockout/puzzle';

// ── Categories ───────────────────────────────────────────────────────────────

const BADGE = {
  UFC:"UFC", PRIDE:"PRIDE", BELLATOR:"BEL", ONE:"ONE", STRIKEFORCE:"SF", WEC:"WEC",
  HW:"HW", LHW:"LHW", MW:"MW", WW:"WW", LW:"LW", FW:"FW",
  BW:"BW", FLY:"FLY", WBW:"W-BW", WFW:"W-FW", WSW:"W-SW", WFly:"W-FLY",
  CHAMPION:"CHAMP", MULTI_CHAMP:"2×CHAMP", HOF:"HOF",
  SUB_WIN:"SUB", KO_WIN:"KO", TITLE_DEF:"DEF×3",
};
const LABEL = { ...PROMOTIONS, ...WEIGHT_CLASSES, ...ACHIEVEMENTS };

function getHeaderStyle(key) {
  if (key in PROMOTIONS)    return { bg:'rgba(var(--gold-rgb),0.12)',  border:'rgba(var(--gold-rgb),0.25)', color:'var(--gold)' }
  if (key in WEIGHT_CLASSES) return { bg:'rgba(147,197,253,0.12)', border:'rgba(147,197,253,0.25)', color:'#93C5FD' }
  return                            { bg:'rgba(var(--success-text-rgb),0.12)', border:'rgba(var(--success-text-rgb),0.25)', color:'var(--success-text)' }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcScore(fighter) {
  return Math.max(5, Math.min(100, Math.round(115 - fighter.f)));
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y,m,d] = dateStr.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
}

// ── Today's checkpoint ───────────────────────────────────────────────────────
// The filled cells (fighter names) and guesses left, so a reload can never
// refund a guess or revive a finished grid. Archive replays never touch it.

const CHECKPOINT_KEY = 'streakle-knockout';
const MAX_GUESSES = 9;
const CELL_KEY = /^([0-2])-([0-2])$/;

function readCheckpoint(date, { rows, cols }) {
  try {
    const raw = localStorage.getItem(CHECKPOINT_KEY);
    if (!raw) return null;
    const cp = JSON.parse(raw);
    if (!cp || cp.v !== 1 || cp.date !== date) return null;
    if (!Number.isInteger(cp.left) || cp.left < 0 || cp.left > MAX_GUESSES) return null;
    if (!cp.cells || typeof cp.cells !== 'object' || Array.isArray(cp.cells)) return null;
    const entries = Object.entries(cp.cells);
    if (entries.length + cp.left > MAX_GUESSES) return null; // every filled cell spent a guess
    const cells = {};
    const used = new Set();
    for (const [key, name] of entries) {
      const m = CELL_KEY.exec(key);
      const fighter = FIGHTERS.find(f => f.n === name);
      if (!m || !fighter || used.has(name)) return null;
      if (!fitsOn(date)(fighter, rows[+m[1]]) || !fitsOn(date)(fighter, cols[+m[2]])) return null;
      used.add(name);
      // restored: already on the board, so it skips the reveal animation.
      cells[key] = { player: fighter, score: calcScore(fighter), restored: true };
    }
    return { cells, left: cp.left };
  } catch { return null; }
}

function writeCheckpoint(date, cells, left) {
  const names = Object.fromEntries(Object.entries(cells).map(([key, c]) => [key, c.player.n]));
  try {
    // Never replace a later day's board (see checkpointSlot.js).
    if (slotHoldsLaterDay(CHECKPOINT_KEY, date)) return;
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify({ v: 1, date, cells: names, left }));
  } catch { /* storage unavailable */ }
}

// The board a checkpoint describes (none = a fresh one); score and outcome
// are derived from the cells and guesses left.
function boardFrom(cp) {
  const cells = cp ? cp.cells : {};
  const guessesLeft = cp ? cp.left : MAX_GUESSES;
  const won = Object.keys(cells).length === 9;
  return {
    cells, guessesLeft, won,
    gameOver: !won && guessesLeft === 0,
    totalScore: Object.values(cells).reduce((sum, c) => sum + c.score, 0),
  };
}

// How long typing must pause before screen readers hear the match count.
const COUNT_DELAY_MS = 700;
const guessesText = (n) => `${n} ${n === 1 ? 'guess' : 'guesses'} remaining`;

// The first empty cell after `key` in reading order (wrapping round), or null.
function nextEmpty(key, cells) {
  const start = Number(key[0]) * 3 + Number(key[2]);
  for (let step = 1; step < 9; step++) {
    const i = (start + step) % 9;
    const k = `${Math.floor(i / 3)}-${i % 3}`;
    if (!cells[k]) return k;
  }
  return null;
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const css = `
@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes confetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(130px) rotate(720deg);opacity:0}}
@keyframes cellReveal{0%{transform:scale(0.85);opacity:0}100%{transform:scale(1);opacity:1}}
.ko-grid{display:grid;grid-template-columns:90px repeat(3,110px);grid-template-rows:70px repeat(3,100px);gap:4px;padding:0 12px;margin-inline:auto}
.ko-head{padding:4px 6px}
.ko-cell{padding:6px}
.ko-name{font-size:11px}
/* Phones: cells shrink (to 64px, never under a 44px target) rather than
   overflow; slim side padding leaves the longest labels room, 10px names
   keep the longest surname ("Nurmagomedov", 86px at 11px) whole in an 88px
   cell, and the header row grows for a two-line label. */
@media(max-width:480px){.ko-grid{grid-template-columns:72px repeat(3,minmax(64px,88px));grid-template-rows:minmax(60px,auto) repeat(3,86px)}.ko-head{padding:4px 2px}.ko-cell{padding:6px 2px}.ko-name{font-size:10px}}
/* Narrower than the 372px phone grid (320-371px): slimmer gutters. */
@media(max-width:371px){.ko-grid{padding:0 6px;gap:3px}}
@media(min-width:700px) and (min-height:760px){.ko-grid{grid-template-columns:100px repeat(3,128px);grid-template-rows:78px repeat(3,116px)}}
.ko-opt[role="button"]:focus-visible{outline-offset:-3px}
.ko-search:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function KnockoutGame() {
  const { streak } = useStreak('knockout');
  useSeo(PAGE_SEO.knockout)
  const [showArchive, setShowArchive] = useState(false);
  // isToday: the live board, not an Archive replay (replays never save).
  const { seedDate, isToday, boardKey, keyFor, selectDate } = useBoardDate();
  const puzzle = useMemo(() => getDailyPuzzle(seedDate), [seedDate]);
  const { rows: rowHeaders, cols: colHeaders } = puzzle;

  // Today's board resumes from its checkpoint, so a reload refunds nothing.
  const [initial] = useState(() => boardFrom(isToday ? readCheckpoint(seedDate, puzzle) : null));
  const [cells, setCells] = useState(initial.cells);
  const [activeCell, setActiveCell] = useState(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  // Escape hides the matches but keeps them: the search still found them,
  // and Down Arrow brings them back.
  const [listHidden, setListHidden] = useState(false);
  const [pendingPlayer, setPendingPlayer] = useState(null);
  const [guessesLeft, setGuessesLeft] = useState(initial.guessesLeft);
  const [shakeCell, setShakeCell] = useState(null);
  const [won, setWon] = useState(initial.won);
  const [gameOver, setGameOver] = useState(initial.gameOver);
  const [confetti, setConfetti] = useState([]);
  const [totalScore, setTotalScore] = useState(initial.totalScore);
  const inputRef = useRef(null);
  const gridRef = useRef(null);
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const confirmRef = useRef(null);
  const resultRef = useRef(null);
  const countTimer = useRef(null);
  // Where focus goes once the next render lands: a move can unmount the
  // element that had it (the search panel, Confirm).
  const focusNext = useRef(null);
  const [announce, liveRegion] = useAnnouncer();
  const panelId = useId();
  const hintId = useId();

  // Auto-focus input when cell becomes active
  useEffect(() => {
    if (activeCell) setTimeout(() => inputRef.current?.focus(), 50);
  }, [activeCell]);

  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    target?.()?.focus();
  });

  useEffect(() => {
    const timer = countTimer;
    return () => clearTimeout(timer.current);
  }, []);

  // On a short phone the keyboard covers the page's lower part: when matches
  // appear (or the keyboard resizes the visible area), scroll just enough to
  // show the list, never pushing the search box above the top. A pinch-zoomed
  // view is the player's own, so it is left alone.
  const shownCount = listHidden ? 0 : suggestions.length;
  useEffect(() => {
    if (!shownCount) return;
    const vv = window.visualViewport;
    const reveal = () => {
      if (!panelRef.current || !listRef.current || vv?.scale > 1.01) return;
      const top = vv ? vv.offsetTop : 0;
      const bottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const by = Math.min(listRef.current.getBoundingClientRect().bottom - bottom,
        panelRef.current.getBoundingClientRect().top - top);
      if (by > 0) window.scrollBy(0, by);
    };
    reveal();
    vv?.addEventListener('resize', reveal);
    return () => vv?.removeEventListener('resize', reveal);
  }, [shownCount]);

  const cellName = (r, c) => `${LABEL[rowHeaders[r]]} and ${LABEL[colHeaders[c]]}`;
  const cellEl = (key) => gridRef.current?.querySelector(`[data-cell="${key}"]`);

  function handleCellClick(ri, ci) {
    if (won || gameOver) return;
    const key = `${ri}-${ci}`;
    if (cells[key]) return;
    setActiveCell([ri, ci]);
    setQuery('');
    setSuggestions([]);
    setListHidden(false);
    setPendingPlayer(null);
  }

  function handleQuery(val) {
    setQuery(val);
    setPendingPlayer(null);
    setListHidden(false);
    clearTimeout(countTimer.current);
    if (!val.trim()) { setSuggestions([]); return; }
    const q = val.toLowerCase();
    const used = new Set(Object.values(cells).map(c => c.player.n));
    const results = FIGHTERS
      .filter(f => f.n.toLowerCase().includes(q) && !used.has(f.n))
      .sort((a,b) => b.f - a.f)
      .slice(0, 8);
    setSuggestions(results);
    const n = results.length;
    countTimer.current = setTimeout(() => announce(n ? `${n} ${n === 1 ? 'match' : 'matches'} shown` : 'No fighter found'), COUNT_DELAY_MS);
  }

  // A pick closes the matches and fills the box with the name, as in Faceoff
  // and Gridiron, so Confirm sits right under the box (on a phone, not a
  // screen below the list) and takes focus; editing the box searches again.
  function handleSelect(fighter) {
    clearTimeout(countTimer.current);
    setPendingPlayer(fighter);
    setQuery(fighter.n);
    setSuggestions([]);
    focusNext.current = () => confirmRef.current;
  }

  function cancelSearch() {
    clearTimeout(countTimer.current);
    if (activeCell) { const key = `${activeCell[0]}-${activeCell[1]}`; focusNext.current = () => cellEl(key); }
    setActiveCell(null); setQuery(''); setSuggestions([]); setListHidden(false); setPendingPlayer(null);
  }

  // Escape closes the match list first, then the search (back to its cell).
  function handlePanelKey(e) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    if (!shownCount) { cancelSearch(); return; }
    clearTimeout(countTimer.current);
    setListHidden(true);
    // Leave the closing list now; queued too, so no older target can win.
    inputRef.current?.focus();
    focusNext.current = () => inputRef.current;
  }

  // Down Arrow moves into the matches (bringing back a list Escape hid);
  // Enter picks the first one shown.
  function handleInputKey(e) {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!listHidden) { listRef.current?.children[0]?.focus(); return; }
      setListHidden(false);
      focusNext.current = () => listRef.current?.children[0];
    }
    else if (e.key === 'Enter' && !listHidden) { e.preventDefault(); handleSelect(suggestions[0]); }
  }

  // A match: Enter or Space picks it; the arrows move between matches (Up
  // from the first goes back to the search box).
  function handleOptionKey(e, i) {
    const rows = listRef.current?.children;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(suggestions[i]); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); rows?.[Math.min(i + 1, suggestions.length - 1)]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (i ? rows?.[i - 1] : inputRef.current)?.focus(); }
  }

  function handleConfirm() {
    if (!pendingPlayer || !activeCell) return;
    clearTimeout(countTimer.current);
    const [ri, ci] = activeCell;
    const key = `${ri}-${ci}`;
    const row = rowHeaders[ri];
    const col = colHeaders[ci];

    const valid = fitsOn(seedDate)(pendingPlayer, row) && fitsOn(seedDate)(pendingPlayer, col);

    if (!valid) {
      setShakeCell(key);
      setTimeout(() => setShakeCell(null), 500);
      const newGuesses = guessesLeft - 1;
      setGuessesLeft(newGuesses);
      if (newGuesses === 0) {
        setGameOver(true);
        if (isToday) saveResult({ game: 'knockout', puzzleDate: seedDate, completed: false, score: totalScore });
      }
      // After any save: saveResult queues the result on disk synchronously,
      // before the checkpoint records the finish.
      if (isToday) writeCheckpoint(seedDate, cells, newGuesses);
      setQuery('');
      setSuggestions([]);
      setPendingPlayer(null);
      const wrong = `Not a match: ${pendingPlayer.n}.`;
      announce(newGuesses === 0 ? `${wrong} Out of guesses. Final score ${totalScore}.` : `${wrong} ${guessesText(newGuesses)}.`);
      focusNext.current = newGuesses === 0 ? () => resultRef.current : () => inputRef.current;
      return;
    }

    const score = calcScore(pendingPlayer);
    const newCells = { ...cells, [key]: { player: pendingPlayer, score } };
    setCells(newCells);
    const newTotal = totalScore + score;
    setTotalScore(newTotal);
    setQuery('');
    setSuggestions([]);
    setPendingPlayer(null);
    setActiveCell(null);

    const newGuesses = guessesLeft - 1;
    setGuessesLeft(newGuesses);

    const next = nextEmpty(key, newCells);
    const right = `Correct: ${pendingPlayer.n}, +${score} points.`;
    if (!next) announce(`${right} Board complete! Final score ${newTotal}.`);
    else if (newGuesses === 0) announce(`${right} Out of guesses. Final score ${newTotal}.`);
    else announce(`${right} ${guessesText(newGuesses)}.`);
    focusNext.current = next && newGuesses > 0 ? () => cellEl(next) : () => resultRef.current;

    if (Object.keys(newCells).length === 9) {
      setWon(true);
      if (isToday) saveResult({ game: 'knockout', puzzleDate: seedDate, completed: true, score: newTotal });
      if (isToday) writeCheckpoint(seedDate, newCells, newGuesses);
      const colors = ['var(--gold)','var(--ink)','var(--success-text)','var(--danger-text)','#93C5FD'];
      setConfetti(Array.from({length:30},(_,i)=>({
        id:i, x:Math.random()*100, size:Math.random()*10+6,
        color:colors[i%colors.length], delay:Math.random()*400,
      })));
      return;
    }

    if (newGuesses === 0) {
      setGameOver(true);
      if (isToday) saveResult({ game: 'knockout', puzzleDate: seedDate, completed: false, score: newTotal });
    }
    if (isToday) writeCheckpoint(seedDate, newCells, newGuesses);
  }

  function handleSelectDate(date) {
    setShowArchive(false);
    // Already on that board: keep it, as the other games do.
    const key = keyFor(date);
    if (key === boardKey) return;
    selectDate(date);
    // Back on today's live board (keyFor's 'today-…'): resume its checkpoint.
    // An Archive replay starts empty.
    const isLive = key.startsWith('today-');
    const board = boardFrom(isLive ? readCheckpoint(date, getDailyPuzzle(date)) : null);
    setCells(board.cells);
    setGuessesLeft(board.guessesLeft);
    setWon(board.won);
    setGameOver(board.gameOver);
    setTotalScore(board.totalScore);
    setActiveCell(null);
    setQuery('');
    setSuggestions([]);
    setListHidden(false);
    setPendingPlayer(null);
    setConfetti([]);
    clearTimeout(countTimer.current);
  }

  function buildShareText() {
    const grid = Array.from({length:3},(_,r)=>Array.from({length:3},(_,c)=>cells[`${r}-${c}`]?'✅':'⬜').join('')).join('\n');
    return `KNOCKOUT by Streakle 🥊 — ${formatDate(seedDate)}\nScore: ${totalScore} | ${Object.keys(cells).length}/9 cells\n${grid}\n\nPlay at: playstreakle.com/knockout`;
  }

  const howTo = (
    <>
      Fill the 3×3 grid with MMA fighters. Each answer must satisfy <b>both</b> the row and column criteria.<br/><br/>
      Criteria can be a <b>promotion</b> (fighter competed there), a <b>weight class</b> (fighter competed at that weight), or an <b>achievement</b>.<br/><br/>
      Each fighter can only be used <b>once</b>. You have <b>9 guesses</b> — one per cell.<br/><br/>
      🏆 Rarer answers score higher. Max score: ~900.
    </>
  )

  return (
    <GameShell game="knockout" date={formatDate(seedDate)} howTo={howTo} onArchive={() => setShowArchive(true)}>
      <style>{css}</style>
      {liveRegion}

      {confetti.map(c=>(
        <div key={c.id} style={{position:'fixed',left:`${c.x}%`,top:'28%',width:c.size,height:c.size,background:c.color,borderRadius:c.size>10?'50%':2,animation:`confetti 1.3s ${c.delay}ms ease forwards`,pointerEvents:'none',zIndex:100}}/>
      ))}


      {/* Legend */}
      <div style={{display:'flex',gap:12,marginBottom:10,fontSize:11,fontWeight:600}}>
        <span style={{color:'var(--gold)'}}>■ Promotion</span>
        <span style={{color:'#93C5FD'}}>■ Division</span>
        <span style={{color:'var(--success-text)'}}>■ Achievement</span>
      </div>


      <div style={{display:'flex',gap:24,marginBottom:8,fontSize:14}}>
        <div style={{color:'var(--gold)',fontWeight:700}}>Score: {totalScore}</div>
        <div style={{color:guessesLeft<=3?'var(--danger)':'var(--gold)',fontWeight:700}}>
          {won?'Complete!':gameOver?'Game over':`${guessesLeft} guess${guessesLeft!==1?'es':''} left`}
        </div>
      </div>

      {streak > 0 && (
        <div style={{fontSize:13,color:'var(--gold)',fontWeight:600,marginBottom:8}}>
          🔥 {streak} day streak
        </div>
      )}

      {/* Grid: centred by its own auto margins, which (unlike centring the
          scroller's content) let a grid too wide for the screen overflow to
          the right only, where it scrolls, never past the left edge. */}
      <div style={{overflowX:'auto',width:'100%',display:'flex'}}>
        <div className="ko-grid" ref={gridRef}>
          {/* Top-left blank */}
          <div style={{background:'transparent'}}/>

          {/* Column headers */}
          {colHeaders.map((col,ci)=>{
            const {bg,border,color}=getHeaderStyle(col);
            return (
              <div key={ci} className="ko-head" style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
                {col in ACHIEVEMENTS
                  ? <AwardIcon name={col} size={32}/>
                  : <div aria-hidden="true" style={{background:bg,border:`1px solid ${border}`,borderRadius:4,padding:'2px 6px',fontSize:9,fontWeight:800,color,letterSpacing:0.5}}>{BADGE[col]}</div>}
                <div style={{fontSize:9,fontWeight:700,color,lineHeight:1.2,marginTop:3,overflowWrap:'anywhere'}}>{LABEL[col]}</div>
              </div>
            );
          })}

          {/* Rows */}
          {rowHeaders.map((row,ri)=>(
            <React.Fragment key={`row-${ri}`}>
              {/* Row header */}
              <div className="ko-head" style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
                {(()=>{const{bg,border,color}=getHeaderStyle(row);return(<>{row in ACHIEVEMENTS?<AwardIcon name={row} size={32}/>:<div aria-hidden="true" style={{background:bg,border:`1px solid ${border}`,borderRadius:4,padding:'2px 6px',fontSize:9,fontWeight:800,color,letterSpacing:0.5}}>{BADGE[row]}</div>}<div style={{fontSize:9,fontWeight:700,color,lineHeight:1.2,marginTop:3,overflowWrap:'anywhere'}}>{LABEL[row]}</div></>);})()}
              </div>
              {/* Cells */}
              {colHeaders.map((col,ci)=>{
                const key=`${ri}-${ci}`;
                const filled=cells[key];
                const isActive=activeCell&&activeCell[0]===ri&&activeCell[1]===ci;
                const isShaking=shakeCell===key;
                const isOpen=!(filled||gameOver||won);
                // Open cells are buttons named by their criteria; a locked
                // cell names itself through its content (an image role).
                const cellLabel=`${cellName(ri,ci)}: ${filled?`${filled.player.n}, +${filled.score} points`:'empty'}`;
                return (
                  <div key={key} data-cell={key} className="ko-cell"
                    {...clickableProps(()=>handleCellClick(ri,ci), !isOpen)}
                    aria-label={isOpen?cellLabel:undefined}
                    aria-expanded={isOpen?Boolean(isActive):undefined}
                    aria-controls={isOpen&&isActive?panelId:undefined}
                    style={{
                    background:filled?'var(--correct-wash)':isActive?'var(--surface-gold)':'var(--surface)',
                    border:`2px solid ${filled?'var(--success)':isActive?'var(--gold)':'var(--border)'}`,
                    borderRadius:8,cursor:filled||gameOver||won?'default':'pointer',
                    display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                    textAlign:'center',userSelect:'none',
                    animation:isShaking?'shake 0.45s ease':filled&&!filled.restored?'cellReveal 0.35s ease':'none',
                    transition:'background 0.2s,border-color 0.2s',
                  }}>
                    {filled?(
                      <div role="img" aria-label={cellLabel}>
                        <div style={{fontSize:10,fontWeight:700,color:'var(--success-text)',marginBottom:2}}>+{filled.score}</div>
                        {/* A name too long for a phone's cell breaks inside it rather than spill out. */}
                        <div className="ko-name" style={{fontWeight:700,color:'var(--ink)',lineHeight:1.3,overflowWrap:'anywhere'}}>{filled.player.n}</div>
                      </div>
                    ):isActive?(
                      <div style={{fontSize:11,color:'var(--gold)'}}>Type below ↓</div>
                    ):(
                      <div role={isOpen?undefined:'img'} aria-label={isOpen?undefined:cellLabel} style={{fontSize:20,opacity:0.2}}>?</div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Search */}
      {activeCell && !won && !gameOver && (
        <div id={panelId} ref={panelRef} onKeyDown={handlePanelKey} style={{marginTop:16,width:'100%',maxWidth:340,padding:'0 12px',boxSizing:'border-box',animation:'slideUp 0.3s ease'}}>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:6,textAlign:'center'}}>
            {LABEL[rowHeaders[activeCell[0]]]} × {LABEL[colHeaders[activeCell[1]]]}
          </div>
          <span id={hintId} className="sr-only">Down Arrow moves through the matches; Enter picks the first.</span>
          <input ref={inputRef} className="ko-search" value={query} onChange={e=>handleQuery(e.target.value)} onKeyDown={handleInputKey}
            placeholder="Search MMA fighter..."
            aria-label={`Search MMA fighter for ${cellName(activeCell[0],activeCell[1])}`} aria-describedby={hintId}
            autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint="search"
            style={{width:'100%',boxSizing:'border-box',background:'var(--surface)',border:`2px solid ${pendingPlayer?'var(--success)':'var(--gold)'}`,borderRadius:8,color:'var(--ink)',fontSize:16,padding:'10px 14px'}}
          />
          {shownCount > 0 && (
            <div ref={listRef} role="group" aria-label="Matching fighters" style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,marginTop:4,overflow:'hidden'}}>
              {suggestions.map((f,i)=>(
                <div key={i} className="ko-opt" role="button" tabIndex={0} onClick={()=>handleSelect(f)} onKeyDown={e=>handleOptionKey(e,i)} style={{
                  padding:'10px 14px',cursor:'pointer',fontSize:13,
                  borderBottom:i<suggestions.length-1?'1px solid var(--border)':'none',
                  background:pendingPlayer?.n===f.n?'var(--correct-wash)':'transparent',
                  transition:'background 0.15s',
                }}
                  onMouseOver={e=>e.currentTarget.style.background='var(--surface-gold)'}
                  onMouseOut={e=>e.currentTarget.style.background=pendingPlayer?.n===f.n?'var(--correct-wash)':'transparent'}
                >
                  <span style={{color:'var(--ink)',fontWeight:600}}>{f.n}</span>
                  <span style={{color:'var(--text-2)',fontSize:11,marginLeft:8}}>
                    {f.w.map(w=>WEIGHT_CLASSES[w]||w).join(' / ')}
                  </span>
                </div>
              ))}
            </div>
          )}
          {pendingPlayer && (
            <button ref={confirmRef} onClick={handleConfirm} style={{
              marginTop:10,width:'100%',background:'var(--gold)',border:'none',
              borderRadius:8,color:'var(--bg)',fontSize:14,fontWeight:700,
              padding:'11px',cursor:'pointer',transition:'background 0.15s',
            }}
              onMouseOver={e=>e.currentTarget.style.background='var(--gold-hover)'}
              onMouseOut={e=>e.currentTarget.style.background='var(--gold)'}
            >
              Confirm: {pendingPlayer.n}
            </button>
          )}
        </div>
      )}

      {/* Result */}
      {(won || gameOver) && (
        <ResultCard ref={resultRef} game="knockout" outcome={won?'won':'lost'} title={won ? '🥊 Flawless Victory!' : 'Game Over'} shareText={buildShareText}>
          <div className="rc-headline">Final score: {totalScore}</div>
          <div className="rc-detail">{Object.keys(cells).length}/9 cells filled</div>
        </ResultCard>
      )}


      {showArchive && (
        <Archive game="knockout" onClose={()=>setShowArchive(false)} onSelectDate={handleSelectDate} />
      )}
    </GameShell>
  );
}
