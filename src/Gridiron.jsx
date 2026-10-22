import React, { useState, useRef, useEffect, useMemo } from "react";
import Archive from './Archive'
import GameShell from "./GameShell";
import ResultCard from './ResultCard';
import { saveResult } from './saveResult';
import { useStreak } from './useStreak';
import { useBoardDate } from './useBoardDate';
import AwardIcon from './AwardIcon';
import { clickableProps } from './a11y';
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

const css = `
@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.08)}100%{transform:scale(1)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes confetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(130px) rotate(720deg);opacity:0}}
@keyframes cellReveal{0%{transform:scale(0.85);opacity:0}100%{transform:scale(1);opacity:1}}
.gridiron-grid{display:grid;grid-template-columns:90px repeat(3,110px);grid-template-rows:70px repeat(3,100px);gap:4px;padding:0 12px}
@media(max-width:480px){.gridiron-grid{grid-template-columns:72px repeat(3,88px);grid-template-rows:60px repeat(3,86px)}}
@media(min-width:700px) and (min-height:760px){.gridiron-grid{grid-template-columns:100px repeat(3,128px);grid-template-rows:78px repeat(3,116px)}}
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
      🏆 Rarer answers = higher score. Max score: ~855.
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
  const [pendingPlayer, setPendingPlayer] = useState(null);
  const [guessesLeft, setGuessesLeft] = useState(initial.guessesLeft);
  const [shakeCell, setShakeCell] = useState(null);
  const [won, setWon] = useState(initial.won);
  const [gameOver, setGameOver] = useState(initial.gameOver);
  const [confetti, setConfetti] = useState([]);
  const [totalScore, setTotalScore] = useState(initial.totalScore);
  const inputRef = useRef(null);

  // Auto-focus input when cell becomes active
  useEffect(() => {
    if (activeCell) setTimeout(() => inputRef.current?.focus(), 50);
  }, [activeCell]);

  const rowHeaders = puzzle.rows;
  const colHeaders = puzzle.cols;
  const totalPossible = 9 * 95;

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
    setPendingPlayer(null);
  };

  const handleQuery = (val) => {
    setQuery(val);
    setPendingPlayer(null);
    if (val.length < 2) { setSuggestions([]); return; }
    const q = val.toLowerCase();
    const matches = PLAYERS.filter(p => p.n.toLowerCase().includes(q)).slice(0, 8);
    setSuggestions(matches);
  };

  const handleSelect = (player) => {
    setPendingPlayer(player);
    setQuery(player.n);
    setSuggestions([]);
  };

  const handleSubmit = () => {
    if (!activeCell || !pendingPlayer) return;
    const [r, c] = activeCell;
    const key = `${r}-${c}`;
    const rowCrit = rowHeaders[r];
    const colCrit = colHeaders[c];
    const newGuesses = guessesLeft - 1;
    setGuessesLeft(newGuesses);

    const usedNames = Object.values(cells).map(v => v.player.n);
    const alreadyUsed = usedNames.includes(pendingPlayer.n);
    const valid = !alreadyUsed && fitsOn(seedDate)(pendingPlayer, rowCrit) && fitsOn(seedDate)(pendingPlayer, colCrit);

    if (valid) {
      const score = getScore(pendingPlayer.f);
      const newCells = {...cells, [key]: {player: pendingPlayer, score}};
      setCells(newCells);
      setTotalScore(s => s + score);
      setActiveCell(null);
      setQuery('');
      setPendingPlayer(null);
      setSuggestions([]);
      if (Object.keys(newCells).length === 9) {
        if (isToday) saveResult({ game: 'gridiron', puzzleDate: seedDate, completed: true, score: totalScore + score });
        setWon(true);
        spawnConfetti();
      } else if (newGuesses === 0) {
        if (isToday) saveResult({ game: 'gridiron', puzzleDate: seedDate, completed: false, score: totalScore });
        setGameOver(true);
      }
      // After any save above: saveResult queues the result on disk
      // synchronously, before the checkpoint records the finish.
      if (isToday) writeCheckpoint(seedDate, newCells, newGuesses);
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
    }
  };

  const buildShareText = () => {
    const grid = Array.from({length:3},(_,r)=>Array.from({length:3},(_,c)=>cells[`${r}-${c}`]?'✅':'⬜').join('')).join('\n');
    const filled = Object.keys(cells).length;
    return `GRIDIRON by Streakle 🏈 — ${formatDate(seedDate)}\nScore: ${totalScore} | ${filled}/9 cells\n${grid}\n\nPlay at: playstreakle.com/gridiron`;
  };

  return (
    <>
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

      {/* Grid */}
      <div style={{overflowX:'auto',width:'100%',display:'flex',justifyContent:'center'}}>
        <div className="gridiron-grid">
          
          <div style={{background:'transparent'}}/>

          {colHeaders.map((col,ci)=>{
            const {award,label,color,logoUrl}=getHeaderContent(col);
            return (
              <div key={ci} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'4px 6px',textAlign:'center'}}>
                {logoUrl ? <img src={logoUrl} alt={label} width={38} height={38} style={{objectFit:'contain'}} onError={e=>{e.target.style.display='none'}}/> : <AwardIcon name={award} size={38}/>}
                <div style={{fontSize:9,fontWeight:700,color,lineHeight:1.2,marginTop:3}}>{label}</div>
              </div>
            );
          })}

          {rowHeaders.map((row,ri)=>(
            <React.Fragment key={`row-${ri}`}>
              <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'4px 6px',textAlign:'center'}}>
                {(()=>{const{award,label,color,logoUrl}=getHeaderContent(row);return(<>{logoUrl?<img src={logoUrl} alt={label} width={38} height={38} style={{objectFit:'contain'}} onError={e=>{e.target.style.display='none'}}/>:<AwardIcon name={award} size={38}/>}<div style={{fontSize:9,fontWeight:700,color,lineHeight:1.2,marginTop:3}}>{label}</div></>);})()}
              </div>
              {colHeaders.map((col,ci)=>{
                const key=`${ri}-${ci}`;
                const filled=cells[key];
                const isActive=activeCell&&activeCell[0]===ri&&activeCell[1]===ci;
                const isShaking=shakeCell===key;
                return (
                  <div key={key} {...clickableProps(()=>handleCellClick(ri,ci), filled||gameOver||won)} style={{
                    background:filled?'var(--correct-wash)':isActive?'var(--surface-gold)':'var(--surface)',
                    border:`2px solid ${filled?'var(--success)':isActive?'var(--gold)':'var(--border)'}`,
                    borderRadius:8,cursor:filled||gameOver||won?'default':'pointer',
                    display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                    padding:6,textAlign:'center',userSelect:'none',
                    animation:isShaking?'shake 0.45s ease':filled&&!initial.cells[key]?'cellReveal 0.35s ease':'none',
                    transition:'background 0.2s,border-color 0.2s',
                  }}>
                    {filled?(
                      <>
                        <div style={{fontSize:10,fontWeight:700,color:'var(--success-text)',marginBottom:2}}>+{filled.score}</div>
                        <div style={{fontSize:11,fontWeight:700,color:'var(--ink)',lineHeight:1.3}}>{filled.player.n}</div>
                      </>
                    ):isActive?(
                      <div style={{fontSize:11,color:'var(--gold)'}}>Type below ↓</div>
                    ):(
                      <div style={{fontSize:20,opacity:0.2}}>?</div>
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
        <div style={{marginTop:16,width:'100%',maxWidth:340,padding:'0 12px',boxSizing:'border-box',animation:'slideUp 0.3s ease'}}>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:6,textAlign:'center'}}>
            {getHeaderContent(rowHeaders[activeCell[0]]).label} × {getHeaderContent(colHeaders[activeCell[1]]).label}
          </div>
          <input ref={inputRef} value={query} onChange={e=>handleQuery(e.target.value)} placeholder="Search NFL player..."
            style={{width:'100%',boxSizing:'border-box',background:'var(--surface)',border:`2px solid ${pendingPlayer?'var(--success)':'var(--gold)'}`,borderRadius:8,color:'var(--ink)',fontSize:15,padding:'10px 14px',outline:'none'}}
          />
          {suggestions.length>0&&(
            <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,marginTop:4,overflow:'hidden'}}>
              {suggestions.map((p,i)=>(
                <div key={i} {...clickableProps(()=>handleSelect(p))} style={{
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
            <div style={{color:'var(--text-2)',fontSize:12,textAlign:'center',marginTop:8}}>No player found</div>
          )}
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button onClick={()=>{setActiveCell(null);setQuery('');setSuggestions([]);setPendingPlayer(null);}} style={{flex:1,background:'none',border:'1px solid var(--border)',borderRadius:6,color:'var(--gold)',cursor:'pointer',fontSize:12,padding:'8px'}}>Cancel</button>
            <button onClick={handleSubmit} disabled={!pendingPlayer} style={{flex:2,background:pendingPlayer?'var(--success)':'var(--surface)',border:'none',borderRadius:6,color:pendingPlayer?'var(--ink)':'var(--faint)',cursor:pendingPlayer?'pointer':'default',fontSize:13,fontWeight:700,padding:'8px',transition:'background 0.2s'}}>
              {pendingPlayer?`Submit "${pendingPlayer.n}"`:'Select a player first'}
            </button>
          </div>
        </div>
      )}

      {(won||gameOver)&&(
        <ResultCard game="gridiron" outcome={won?'won':'lost'} title={won?'🎉 Board Complete!':'Game Over!'} shareText={buildShareText}>
          <div className="rc-headline">Final Score: {totalScore} / {totalPossible}</div>
          <div className="rc-detail">{Object.keys(cells).length}/9 cells filled</div>
        </ResultCard>
      )}
    </>
  );
}