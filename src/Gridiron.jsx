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
import { TEAMS, AWARDS, NFL_LOGO } from './gridiron/data';
import { PLAYERS, getDailyPuzzle, fitsOn } from './gridiron/puzzle';

function formatDate(dateStr) {
  let d = new Date();
  if (dateStr) { const [y,m,day] = dateStr.split('-').map(Number); d = new Date(y, m-1, day); }
  return d.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
}

function getScore(fame) {
  return Math.max(5, Math.round(100 - fame));
}

// The most one cell can score (the least famous answer's points). The how-to
// quotes it rather than a board total: a board's best depends on its cells.
const CELL_MAX = Math.max(...PLAYERS.map(p => getScore(p.f)));

const MAX_GUESSES = 9;
const CHECKPOINT_KEY = 'streakle-gridiron';
const PLAYERS_BY_NAME = new Map(PLAYERS.map(p => [p.n, p]));

// Everything else on the board follows from the filled cells and guesses left.
function boardOf(cells, guessesLeft) {
  const filled = Object.values(cells);
  const won = filled.length === 9;
  return {
    cells, guessesLeft, won,
    gameOver: !won && guessesLeft === 0,
    totalScore: filled.reduce((s, c) => s + c.score, 0),
  };
}

// ── Today's checkpoint: the filled cells (player names) and guesses left, so a
// reload can never refund a guess or revive a finished board. Archive replays
// never touch it.
function readCheckpoint(date, puzzle) {
  try {
    const raw = localStorage.getItem(CHECKPOINT_KEY);
    if (!raw) return null;
    const cp = JSON.parse(raw);
    if (!cp || cp.v !== 1 || cp.date !== date) return null;
    if (!Number.isInteger(cp.left) || cp.left < 0 || cp.left > MAX_GUESSES) return null;
    if (!cp.cells || typeof cp.cells !== 'object' || Array.isArray(cp.cells)) return null;
    const cells = {};
    for (const [key, name] of Object.entries(cp.cells)) {
      const m = /^([0-2])-([0-2])$/.exec(key);
      const player = typeof name === 'string' ? PLAYERS_BY_NAME.get(name) : undefined;
      if (!m || !player) return null;
      if (Object.values(cells).some(v => v.player === player)) return null;
      if (!fitsOn(date)(player, puzzle.rows[+m[1]]) || !fitsOn(date)(player, puzzle.cols[+m[2]])) return null;
      cells[key] = { player, score: getScore(player.f) };
    }
    // Every filled cell cost a guess.
    if (Object.keys(cells).length > MAX_GUESSES - cp.left) return null;
    return boardOf(cells, cp.left);
  } catch { return null; }
}

function writeCheckpoint(date, cells, guessesLeft) {
  const names = Object.fromEntries(Object.entries(cells).map(([key, v]) => [key, v.player.n]));
  try {
    // Never replace a later day's board (see checkpointSlot.js).
    if (slotHoldsLaterDay(CHECKPOINT_KEY, date)) return;
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify({ v: 1, date, cells: names, left: guessesLeft }));
  } catch { /* storage unavailable */ }
}

// How long typing must pause before screen readers hear the match count.
const COUNT_DELAY_MS = 700;
const guessesText = (n) => `${n} ${n === 1 ? 'guess' : 'guesses'} remaining`;

// The players already on the board whose names a search matches. They are
// never offered again, so a search that finds only them says so.
const placedMatching = (cells, q) => Object.values(cells).map(v => v.player.n).filter(n => n.toLowerCase().includes(q));
const alreadyText = (names) => names.length === 1
  ? `${names[0]} is already on the board`
  : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} are already on the board`;

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

const css = `
@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.08)}100%{transform:scale(1)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes confetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(130px) rotate(720deg);opacity:0}}
@keyframes cellReveal{0%{transform:scale(0.85);opacity:0}100%{transform:scale(1);opacity:1}}
.gridiron-grid{display:grid;grid-template-columns:90px repeat(3,110px);grid-template-rows:70px repeat(3,100px);gap:4px;padding:0 12px;margin-inline:auto}
.gridiron-head{padding:4px 6px}
.gridiron-cell{padding:6px}
.gridiron-name{font-size:11px}
/* Phones: cells shrink (to 64px, never under a 44px target) rather than
   overflow; slim side padding leaves the longest labels and names room (an
   88px cell holds "Roethlisberger" whole), and the header row grows for a
   two-line label. */
@media(max-width:480px){.gridiron-grid{grid-template-columns:72px repeat(3,minmax(64px,88px));grid-template-rows:minmax(60px,auto) repeat(3,86px)}.gridiron-head{padding:4px 2px}.gridiron-cell{padding:6px 2px}}
/* Narrower than the 372px phone grid (320-371px): slimmer gutters and 10px
   names for the narrower cells (the very longest still break mid-word). */
@media(max-width:371px){.gridiron-grid{padding:0 6px;gap:3px}.gridiron-name{font-size:10px}}
@media(min-width:700px) and (min-height:760px){.gridiron-grid{grid-template-columns:100px repeat(3,128px);grid-template-rows:78px repeat(3,116px)}}
.gridiron-opt[role="button"]:focus-visible{outline-offset:-3px}
.gridiron-search:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
`;

export default function GridironGame() {
  const { streak } = useStreak('gridiron');
  useSeo(PAGE_SEO.gridiron)
  const [showArchive, setShowArchive] = useState(false)
  const { seedDate, isToday, boardKey, selectDate } = useBoardDate()
  const howTo = (
    <>
      Fill the 3×3 grid with NFL players. Each player must satisfy <b>both</b> the row and column criteria.<br/><br/>
      Rows and columns can be <b>NFL teams</b> (player played for that franchise — a St. Louis Rams player counts for the Rams) or <b>awards</b> (player won that award).<br/><br/>
      Each player can only be used <b>once</b>. You have <b>9 guesses</b> — one per cell.<br/><br/>
      🏆 Rarer answers = higher score: up to {CELL_MAX} points a cell.
    </>
  )

  return (
    <GameShell game="gridiron" date={formatDate(seedDate)} howTo={howTo} onArchive={() => setShowArchive(true)}>
      <style>{css}</style>



      {/* Keyed by date: picking a puzzle in the Archive starts a fresh board. */}
      <GridironBoard key={boardKey} seedDate={seedDate} isToday={isToday} streak={streak} />


      {showArchive && (
        <Archive
          game="gridiron"
          onSelectDate={selectDate}
          onClose={() => setShowArchive(false)}
        />
      )}
    </GameShell>
  );
}

// isToday: the live board, not an Archive replay (replays never save).
function GridironBoard({ seedDate, isToday, streak }) {
  const puzzle = useMemo(() => getDailyPuzzle(seedDate), [seedDate])
  // Today's board resumes from its checkpoint (an ended one stays ended, with
  // no confetti or reveal); replays always start fresh.
  const [initial] = useState(() =>
    (isToday && readCheckpoint(seedDate, puzzle)) || boardOf({}, MAX_GUESSES));
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
  const submitRef = useRef(null);
  const resultRef = useRef(null);
  const countTimer = useRef(null);
  // Where focus goes once the next render lands: a move can unmount the
  // element that had it (the search panel, a suggestion, Submit).
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

  const rowHeaders = puzzle.rows;
  const colHeaders = puzzle.cols;

  const spawnConfetti = () => {
    const items = Array.from({length:30},(_,i)=>({id:i,x:20+Math.random()*60,delay:Math.random()*600,color:['var(--success)','var(--gold)','var(--gold)','var(--danger)','var(--star)'][i%5],size:5+Math.random()*8}));
    setConfetti(items);
    setTimeout(()=>setConfetti([]),1600);
  };

  const getHeaderContent = (key) => {
    if (AWARDS[key]) return { award: key, label: AWARDS[key], color: 'var(--gold)', logoUrl: null };
    const abbr = NFL_LOGO[key];
    return { award: null, label: TEAMS[key] || key, color: 'var(--gold)', logoUrl: abbr ? `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png` : null };
  };

  const handleCellClick = (r, c) => {
    if (gameOver || won) return;
    const key = `${r}-${c}`;
    if (cells[key]) return;
    setActiveCell([r,c]);
    setQuery('');
    setSuggestions([]);
    setListHidden(false);
    setPendingPlayer(null);
  };

  const labelOf = (key) => getHeaderContent(key).label;
  const cellName = (r, c) => `${labelOf(rowHeaders[r])} and ${labelOf(colHeaders[c])}`;
  const cellEl = (key) => gridRef.current?.querySelector(`[data-cell="${key}"]`);

  const handleQuery = (val) => {
    setQuery(val);
    setPendingPlayer(null);
    setListHidden(false);
    clearTimeout(countTimer.current);
    if (val.length < 2) { setSuggestions([]); return; }
    const q = val.toLowerCase();
    // Each player is used once: nobody already on the board is offered.
    const used = new Set(Object.values(cells).map(v => v.player.n));
    const matches = PLAYERS.filter(p => p.n.toLowerCase().includes(q) && !used.has(p.n)).slice(0, 8);
    setSuggestions(matches);
    const n = matches.length;
    const placed = placedMatching(cells, q);
    const none = placed.length ? alreadyText(placed) : 'No player found';
    countTimer.current = setTimeout(() => announce(n ? `${n} ${n === 1 ? 'match' : 'matches'} shown` : none), COUNT_DELAY_MS);
  };

  const handleSelect = (player) => {
    clearTimeout(countTimer.current);
    setPendingPlayer(player);
    setQuery(player.n);
    setSuggestions([]);
    focusNext.current = () => submitRef.current;
  };

  const cancelSearch = () => {
    clearTimeout(countTimer.current);
    if (activeCell) { const key = `${activeCell[0]}-${activeCell[1]}`; focusNext.current = () => cellEl(key); }
    setActiveCell(null); setQuery(''); setSuggestions([]); setListHidden(false); setPendingPlayer(null);
  };

  // Escape closes the match list first, then the search (back to its cell).
  const handlePanelKey = (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    if (!shownCount) { cancelSearch(); return; }
    clearTimeout(countTimer.current);
    setListHidden(true);
    // Leave the closing list now; queued too, so no older target can win.
    inputRef.current?.focus();
    focusNext.current = () => inputRef.current;
  };

  // Down Arrow moves into the matches (bringing back a list Escape hid);
  // Enter picks the first one shown.
  const handleInputKey = (e) => {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!listHidden) { listRef.current?.children[0]?.focus(); return; }
      setListHidden(false);
      focusNext.current = () => listRef.current?.children[0];
    }
    else if (e.key === 'Enter' && !listHidden) { e.preventDefault(); handleSelect(suggestions[0]); }
  };

  // A match: Enter or Space picks it; the arrows move between matches (Up
  // from the first goes back to the search box).
  const handleOptionKey = (e, i) => {
    const rows = listRef.current?.children;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(suggestions[i]); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); rows?.[Math.min(i + 1, suggestions.length - 1)]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (i ? rows?.[i - 1] : inputRef.current)?.focus(); }
  };

  const handleSubmit = () => {
    if (!activeCell || !pendingPlayer) return;
    clearTimeout(countTimer.current);
    // Never offered (see handleQuery); should a placed player get here anyway,
    // he costs no guess: with nine guesses for nine cells, that would cost the board.
    if (Object.values(cells).some(v => v.player.n === pendingPlayer.n)) {
      setPendingPlayer(null);
      setQuery('');
      announce(`${alreadyText([pendingPlayer.n])}. ${guessesText(guessesLeft)}.`);
      focusNext.current = () => inputRef.current;
      return;
    }
    const [r, c] = activeCell;
    const key = `${r}-${c}`;
    const rowCrit = rowHeaders[r];
    const colCrit = colHeaders[c];
    const newGuesses = guessesLeft - 1;
    setGuessesLeft(newGuesses);

    const valid = fitsOn(seedDate)(pendingPlayer, rowCrit) && fitsOn(seedDate)(pendingPlayer, colCrit);

    if (valid) {
      const score = getScore(pendingPlayer.f);
      const newCells = {...cells, [key]: {player: pendingPlayer, score}};
      // One total for the card, both saves and the announcement.
      const newTotal = totalScore + score;
      setCells(newCells);
      setTotalScore(newTotal);
      setActiveCell(null);
      setQuery('');
      setPendingPlayer(null);
      setSuggestions([]);
      if (Object.keys(newCells).length === 9) {
        if (isToday) saveResult({ game: 'gridiron', puzzleDate: seedDate, completed: true, score: newTotal });
        setWon(true);
        spawnConfetti();
      } else if (newGuesses === 0) {
        if (isToday) saveResult({ game: 'gridiron', puzzleDate: seedDate, completed: false, score: newTotal });
        setGameOver(true);
      }
      // After any save above: saveResult queues the result on disk
      // synchronously, before the checkpoint records the finish.
      if (isToday) writeCheckpoint(seedDate, newCells, newGuesses);
      const next = nextEmpty(key, newCells);
      const right = `Correct: ${pendingPlayer.n}, +${score} points.`;
      if (!next) announce(`${right} Board complete! Final score ${newTotal}.`);
      else if (newGuesses === 0) announce(`${right} Out of guesses. Final score ${newTotal}.`);
      else announce(`${right} ${guessesText(newGuesses)}.`);
      focusNext.current = next && newGuesses > 0 ? () => cellEl(next) : () => resultRef.current;
    } else {
      setShakeCell(key);
      setTimeout(()=>setShakeCell(null), 500);
      setPendingPlayer(null);
      setQuery('');
      if (newGuesses === 0) {
        setActiveCell(null);
        if (isToday) saveResult({ game: 'gridiron', puzzleDate: seedDate, completed: false, score: totalScore });
        setGameOver(true);
      }
      if (isToday) writeCheckpoint(seedDate, cells, newGuesses);
      const wrong = `Not a match: ${pendingPlayer.n}.`;
      announce(newGuesses === 0 ? `${wrong} Out of guesses. Final score ${totalScore}.` : `${wrong} ${guessesText(newGuesses)}.`);
      focusNext.current = newGuesses === 0 ? () => resultRef.current : () => inputRef.current;
    }
  };

  const buildShareText = () => {
    const grid = Array.from({length:3},(_,r)=>Array.from({length:3},(_,c)=>cells[`${r}-${c}`]?'✅':'⬜').join('')).join('\n');
    const filled = Object.keys(cells).length;
    return `GRIDIRON by Streakle 🏈 — ${formatDate(seedDate)}\nScore: ${totalScore} | ${filled}/9 cells\n${grid}\n\nPlay at: playstreakle.com/gridiron`;
  };

  // Under a search that lists nobody: either nobody matches, or only players
  // already on the board do.
  const placedHits = placedMatching(cells, query.toLowerCase());
  const noMatchText = placedHits.length ? alreadyText(placedHits) : 'No player found';

  return (
    <>
      {liveRegion}
      {confetti.map(c=>(
        <div key={c.id} style={{position:'fixed',left:`${c.x}%`,top:'28%',width:c.size,height:c.size,background:c.color,borderRadius:c.size>10?'50%':2,animation:`confetti 1.3s ${c.delay}ms ease forwards`,pointerEvents:'none',zIndex:100}}/>
      ))}

      <div style={{display:'flex',gap:24,marginBottom:12,fontSize:14}}>
        <div style={{color:'var(--gold)',fontWeight:700}}>Score: {totalScore}</div>
        <div style={{color:guessesLeft<=3?'var(--danger)':'var(--gold)',fontWeight:700}}>
          {won?'Complete!':gameOver?'Game over':`${guessesLeft} guess${guessesLeft!==1?'es':''} left`}
        </div>
      </div>

      {streak > 0 && (
        <div style={{fontSize:13, color:'var(--gold)', fontWeight:600, marginBottom:8}}>
          🔥 {streak} day streak
        </div>
      )}

      {/* Grid: centred by its own auto margins, which (unlike centring the
          scroller's content) let a grid too wide for the screen overflow to
          the right only, where it scrolls, never past the left edge. */}
      <div style={{overflowX:'auto',width:'100%',display:'flex'}}>
        <div className="gridiron-grid" ref={gridRef}>

          <div style={{background:'transparent'}}/>

          {colHeaders.map((col,ci)=>{
            const {award,label,color,logoUrl}=getHeaderContent(col);
            return (
              <div key={ci} className="gridiron-head" style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
                {logoUrl ? <img src={logoUrl} alt="" width={38} height={38} style={{objectFit:'contain'}} onError={e=>{e.target.style.display='none'}}/> : <AwardIcon name={award} size={38}/>}
                <div style={{fontSize:9,fontWeight:700,color,lineHeight:1.2,marginTop:3,overflowWrap:'anywhere'}}>{label}</div>
              </div>
            );
          })}

          {rowHeaders.map((row,ri)=>(
            <React.Fragment key={`row-${ri}`}>
              <div className="gridiron-head" style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
                {(()=>{const{award,label,color,logoUrl}=getHeaderContent(row);return(<>{logoUrl?<img src={logoUrl} alt="" width={38} height={38} style={{objectFit:'contain'}} onError={e=>{e.target.style.display='none'}}/>:<AwardIcon name={award} size={38}/>}<div style={{fontSize:9,fontWeight:700,color,lineHeight:1.2,marginTop:3,overflowWrap:'anywhere'}}>{label}</div></>);})()}
              </div>
              {colHeaders.map((col,ci)=>{
                const key=`${ri}-${ci}`;
                const filled=cells[key];
                const isOpen=!(filled||gameOver||won);
                // An ended board shows no cell as waiting for a guess.
                const isActive=isOpen&&activeCell&&activeCell[0]===ri&&activeCell[1]===ci;
                const isShaking=shakeCell===key;
                // Open cells are buttons named by their criteria; a locked
                // cell names itself through its content (an image role).
                const cellLabel=`${cellName(ri,ci)}: ${filled?`${filled.player.n}, +${filled.score} points`:'empty'}`;
                return (
                  <div key={key} data-cell={key} className="gridiron-cell"
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
                    animation:isShaking?'shake 0.45s ease':filled&&!initial.cells[key]?'cellReveal 0.35s ease':'none',
                    transition:'background 0.2s,border-color 0.2s',
                  }}>
                    {filled?(
                      <div role="img" aria-label={cellLabel}>
                        <div style={{fontSize:10,fontWeight:700,color:'var(--success-text)',marginBottom:2}}>+{filled.score}</div>
                        {/* A name too long for a phone's cell breaks inside it rather than spill out. */}
                        <div className="gridiron-name" style={{fontWeight:700,color:'var(--ink)',lineHeight:1.3,overflowWrap:'anywhere'}}>{filled.player.n}</div>
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
      {activeCell&&!won&&!gameOver&&(
        <div id={panelId} ref={panelRef} onKeyDown={handlePanelKey} style={{marginTop:16,width:'100%',maxWidth:340,padding:'0 12px',boxSizing:'border-box',animation:'slideUp 0.3s ease'}}>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:6,textAlign:'center'}}>
            {getHeaderContent(rowHeaders[activeCell[0]]).label} × {getHeaderContent(colHeaders[activeCell[1]]).label}
          </div>
          <span id={hintId} className="sr-only">Down Arrow moves through the matches; Enter picks the first.</span>
          <input ref={inputRef} className="gridiron-search" value={query} onChange={e=>handleQuery(e.target.value)} onKeyDown={handleInputKey} placeholder="Search NFL player..."
            aria-label={`Search NFL player for ${cellName(activeCell[0],activeCell[1])}`} aria-describedby={hintId}
            autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint="search"
            style={{width:'100%',boxSizing:'border-box',background:'var(--surface)',border:`2px solid ${pendingPlayer?'var(--success)':'var(--gold)'}`,borderRadius:8,color:'var(--ink)',fontSize:16,padding:'10px 14px'}}
          />
          {shownCount>0&&(
            <div ref={listRef} role="group" aria-label="Matching players" style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,marginTop:4,overflow:'hidden'}}>
              {suggestions.map((p,i)=>(
                <div key={i} className="gridiron-opt" role="button" tabIndex={0} onClick={()=>handleSelect(p)} onKeyDown={e=>handleOptionKey(e,i)} style={{
                  padding:'10px 14px',cursor:'pointer',fontSize:13,
                  borderBottom:i<suggestions.length-1?'1px solid var(--border)':'none',
                  background:pendingPlayer?.n===p.n?'var(--correct-wash)':'transparent',
                  transition:'background 0.15s',
                }}
                  onMouseOver={e=>e.currentTarget.style.background='var(--surface-gold)'}
                  onMouseOut={e=>e.currentTarget.style.background=pendingPlayer?.n===p.n?'var(--correct-wash)':'transparent'}
                >
                  <span style={{color:'var(--ink)',fontWeight:600}}>{p.n}</span>
                </div>
              ))}
            </div>
          )}
          {query.length>=2&&suggestions.length===0&&!pendingPlayer&&(
            <div style={{color:'var(--text-2)',fontSize:12,textAlign:'center',marginTop:8}}>{noMatchText}</div>
          )}
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button onClick={cancelSearch} style={{flex:1,background:'none',border:'1px solid var(--border)',borderRadius:6,color:'var(--gold)',cursor:'pointer',fontSize:12,padding:'8px'}}>Cancel</button>
            <button ref={submitRef} onClick={handleSubmit} disabled={!pendingPlayer} style={{flex:2,background:pendingPlayer?'var(--correct-deep)':'var(--surface)',border:'none',borderRadius:6,color:pendingPlayer?'var(--ink)':'var(--faint)',cursor:pendingPlayer?'pointer':'default',fontSize:13,fontWeight:700,padding:'8px',transition:'background 0.2s'}}>
              {pendingPlayer?`Submit "${pendingPlayer.n}"`:'Select a player first'}
            </button>
          </div>
        </div>
      )}

      {(won||gameOver)&&(
        <ResultCard ref={resultRef} game="gridiron" outcome={won?'won':'lost'} title={won?'🎉 Board Complete!':'Game Over!'} shareText={buildShareText}>
          <div className="rc-headline">Final Score: {totalScore}</div>
          <div className="rc-detail">{Object.keys(cells).length}/9 cells filled</div>
        </ResultCard>
      )}
    </>
  );
}