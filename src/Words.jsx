import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Archive from './Archive'
import GameShell from "./GameShell";
import ResultCard from './ResultCard';
import { NO_PAGE_SHORTCUTS } from './UserMenu';
import { saveResult } from './saveResult';
import { useStreak } from './useStreak';
import { useBoardDate } from './useBoardDate';
import { evaluate } from './evaluate';
import validWordsRaw from './validWords.txt?raw';
import { useSeo, PAGE_SEO } from './seo';
import { slotHoldsLaterDay } from './checkpointSlot';
import { useAnnouncer } from './useAnnouncer';
import { WORDS } from './words/bank';
import { getDailyWord } from './words/schedule';

// Full Wordle-style valid-guess list (~14.8k 5-letter words).
// Source data lives in validWords.txt (github.com/tabatkins/wordle-list).
const VALID_WORDS = new Set(validWordsRaw.trim().toLowerCase().split(/\s+/))

function formatDate(dateStr) {
  let d = new Date();
  if (dateStr) { const [y,m,day] = dateStr.split('-').map(Number); d = new Date(y, m-1, day); }
  return d.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
}

const ROWS = 6, COLS = 5;
const KEYBOARD = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

// Tile letters never drop below 19px: at 800 weight that is WCAG "large
// text" (>= 18.66px bold), so light letters on --correct (3.66:1) stay legible
// on short phones, where the tiles shrink to 34px.
const TILE_FONT = 'max(19px, calc(var(--wd-tile) * 0.42))';
const ST = { empty:'empty', correct:'correct', present:'present', absent:'absent' };
// What takes Enter for itself when focused (see the board's keydown handler).
const CONTROL = 'a[href], button, [role="button"], [role="switch"]';
const CHECKPOINT_KEY = 'streakle-words';
const CLR = { empty:'var(--surface)', active:'var(--surface-gold)', correct:'var(--correct)', present:'var(--present)', absent:'var(--absent)' };
const PALETTE = CLR;
const PALETTE_HC = { ...CLR, correct:'var(--hc-correct)', present:'var(--hc-present)' };
// Letters on revealed tiles and used keys, the same in both palettes. Key labels
// are small text, and so are tile letters on screens under ~609px tall (tiles
// shrink below 44px), so every one clears 4.5:1: dark on green, amber and the
// high-contrast colours, --ink-2 on grey (light --ink on --correct is only
// 3.7:1, and --muted on --absent fell short too).
const INK = { correct:'var(--bg)', present:'var(--bg)', absent:'var(--ink-2)' };

// What a revealed tile or a used key means, in the how-to's words, for
// screen readers (the colours alone say nothing to them).
const ST_SPOKEN = { correct:'right spot', present:'wrong spot', absent:'not in word' };
const spell = (letters) => letters.split('').join(' ');
const guessesLeft = (n) => `${n} ${n===1?'guess':'guesses'} left`;

// A board row as a screen reader hears it: its letters, then — once revealed —
// what each one scored. states: the row's tile states, or null until revealed.
function describeRow(rowIdx, letters, states) {
  const head=`Guess ${rowIdx+1}: `;
  if (!letters) return `${head}empty`;
  if (!states) return head+spell(letters);
  if (states.every(st=>st===ST.correct)) return `${head}${spell(letters)}, all in the right spot`;
  return head+states.map((st,i)=>`${letters[i]} ${ST_SPOKEN[st]}`).join(', ');
}

// Board + keyboard fit the visible height on short phones: under the ~146px
// GameShell header, 42px of row gaps, the 20px board margin and 8px of air,
// tiles and keys share what's left (tile = key + 2px) and only reach full
// size (52/50) from 678px tall. Keys stop at 42px; tiles take the rest.
// Nothing may sit between the header and the board: the budget has no room
// for it, so the streak shares the date's line (see DateLine).
const css = `
@keyframes shake{0%,100%{transform:translateX(0)}15%{transform:translateX(-6px)}30%{transform:translateX(6px)}45%{transform:translateX(-4px)}60%{transform:translateX(4px)}75%{transform:translateX(-2px)}90%{transform:translateX(2px)}}
@keyframes bounce{0%,100%{transform:translateY(0)}40%{transform:translateY(-10px)}}
@keyframes letterPop{0%{transform:scale(1)}50%{transform:scale(1.12)}100%{transform:scale(1)}}
@keyframes cardFlip{0%{transform:rotateY(0deg)}100%{transform:rotateY(180deg)}}
@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes confetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(130px) rotate(720deg);opacity:0}}
.wd-board,.wd-kb{--wd-vh:100vh;--wd-key:clamp(42px,calc((var(--wd-vh) - 210px) / 9 - 2px),50px)}
@supports (height:100dvh){.wd-board,.wd-kb{--wd-vh:100dvh}}
.wd-board{--wd-tile:clamp(34px,calc((var(--wd-vh) - 216px - 3 * var(--wd-key)) / 6),52px)}
.wd-kb{display:flex;flex-direction:column;gap:6px;width:min(500px,calc(100vw - 16px))}
.wd-kb-row{display:flex;gap:5px}
.wd-kb-row:nth-child(2)::before,.wd-kb-row:nth-child(2)::after{content:'';flex:.5 1 0}
.wd-key{flex:1 1 0;min-width:0;height:var(--wd-key);padding:0;border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;user-select:none;transition:background .3s,color .3s}
.wd-key-wide{flex:1.5 1 0;font-size:11px}
@media (min-width:600px) and (min-height:800px){.wd-board{--wd-tile:60px}.wd-kb{--wd-key:56px}.wd-key{font-size:15px}.wd-key-wide{font-size:12px}}
.wd-streak{white-space:nowrap;line-height:1;color:var(--gold);font-weight:600}
.wd-streak-sep{color:var(--muted);font-weight:400}
`;

// The puzzle date, then the player's streak on the same line. The streak
// arrives late (after useStreak's reads), so it must cost the board no
// height: on a line of its own it pushed the board and keyboard down ~26px,
// the bottom row off a short phone and under a thumb mid-tap (F262). Its
// fixed line-height keeps the emoji font's taller metrics out of the line.
function DateLine({ date, streak }) {
  if (!(streak > 0)) return date;
  return (
    <>
      {date}<span className="sr-only">,</span>{' '}
      <span className="wd-streak">
        <span className="wd-streak-sep" aria-hidden="true">·</span>
        {' '}<span aria-hidden="true">🔥</span> {streak} day streak
      </span>
    </>
  );
}

// Keyboard colours after a guess: green beats amber beats grey.
function withKeyStates(prev, guess, result) {
  const next={...prev};
  guess.split('').forEach((ch,i)=>{
    const p=next[ch];
    if (result[i]===ST.correct) next[ch]=ST.correct;
    else if (result[i]===ST.present&&p!==ST.correct) next[ch]=ST.present;
    else if (!p) next[ch]=ST.absent;
  });
  return next;
}

// The whole board follows from the submitted guesses (none = a fresh board).
function boardFrom(list, word) {
  const results=list.map(g=>evaluate(g,word));
  const won=list.length>0&&list[list.length-1]===word;
  const gameOver=won||list.length>=ROWS;
  return {
    guesses:Array.from({length:ROWS},(_,r)=>list[r]??''),
    current:gameOver?list.length-1:list.length,
    tileStates:Object.fromEntries(results.flatMap((res,r)=>res.map((st,c)=>[`${r}-${c}`,st]))),
    keyStates:list.reduce((ks,g,r)=>withKeyStates(ks,g,results[r]),{}),
    won, gameOver,
  };
}

// ── Today's checkpoint: the submitted guesses, so a reload can never refund
// a guess or revive a finished game. Archive replays never touch it.
// It names the answer it was played against (a short hash, so the storage
// panel doesn't spell out today's word): a same-day bank edit that changes
// the day's word drops the old guesses instead of replaying them onto it.
function answerSig(word) {
  let h=0x811c9dc5; // FNV-1a, 32-bit
  for (const ch of word) h=Math.imul(h^ch.charCodeAt(0),0x01000193)>>>0;
  return h.toString(36);
}

function readCheckpoint(date, word) {
  try {
    const raw=localStorage.getItem(CHECKPOINT_KEY);
    if (!raw) return null;
    const cp=JSON.parse(raw);
    if (!cp||cp.v!==1||cp.date!==date||cp.sig!==answerSig(word)||!Array.isArray(cp.guesses)) return null;
    const list=cp.guesses;
    if (list.length>ROWS||!list.every(g=>typeof g==='string'&&g.length===COLS&&/^[A-Z]+$/.test(g))) return null;
    if (list.slice(0,-1).includes(word)) return null; // nothing after a winning guess
    return list;
  } catch { return null; }
}

// Never replaces a later day's board in the slot (see checkpointSlot.js).
function writeCheckpoint(date, word, list) {
  try {
    if (slotHoldsLaterDay(CHECKPOINT_KEY, date)) return;
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify({ v:1, date, sig:answerSig(word), guesses:list }));
  } catch { /* storage unavailable */ }
}

export default function WordsGame() {
  const { streak } = useStreak('words');
  useSeo(PAGE_SEO.words)
  const [showArchive, setShowArchive] = useState(false)
  const { seedDate, isToday, boardKey, selectDate } = useBoardDate()
  const [hc, setHc] = useState(() => {
    try { return localStorage.getItem('streakle-hc') === '1' } catch { return false }
  });
  const palette = hc ? PALETTE_HC : PALETTE;
  const toggleHc = () => setHc(v => {
    const n = !v;
    try { localStorage.setItem('streakle-hc', n ? '1' : '0') } catch { /* storage unavailable */ }
    return n;
  });

  const howTo = (
    <>
      Guess the 5-letter word in 6 tries.<br/><br/>
      {hc?'🟧':'🟩'} Right letter, right spot<br/>
      {hc?'🟦':'🟨'} Right letter, wrong spot<br/>
      ⬛ Letter not in the word<br/><br/>
      After the game, discover something fascinating about the word!
    </>
  )

  return (
    <GameShell game="words" date={<DateLine date={formatDate(seedDate)} streak={isToday ? streak : 0} />} howTo={howTo} onArchive={() => setShowArchive(true)} hc={hc} onToggleHc={toggleHc}>
      <style>{css}</style>

      {/* Keyed by date: picking a puzzle in the Archive starts a fresh board.
          While the Archive is open its keys are its own, not the board's. */}
      <WordsBoard key={boardKey} seedDate={seedDate} isToday={isToday} hc={hc} palette={palette} keysBlocked={showArchive} />


      {showArchive && (
        <Archive
          game="words"
          onSelectDate={selectDate}
          onClose={() => setShowArchive(false)}
        />
      )}
    </GameShell>
  );
}

// isToday: the live board, not an Archive replay (replays never save).
// keysBlocked: a dialog (the Archive) is open, so typing never reaches the board.
function WordsBoard({ seedDate, isToday, hc, palette, keysBlocked }) {
  const daily = useMemo(() => getDailyWord(seedDate), [seedDate])
  // Today's board resumes from its checkpoint, already revealed (no flips, no confetti).
  const [initial] = useState(() => boardFrom((isToday && readCheckpoint(seedDate, daily.word)) || [], daily.word));
  const [guesses, setGuesses] = useState(initial.guesses);
  const [current, setCurrent] = useState(initial.current);
  const [input, setInput] = useState('');
  const [tileStates, setTileStates] = useState(initial.tileStates);
  const [keyStates, setKeyStates] = useState(initial.keyStates);
  const [shakeRow, setShakeRow] = useState(null);
  const [bounceRow, setBounceRow] = useState(null);
  const [gameOver, setGameOver] = useState(initial.gameOver);
  const [won, setWon] = useState(initial.won);
  const [message, setMessage] = useState(null);
  const [confetti, setConfetti] = useState([]);
  const [showFact, setShowFact] = useState(initial.gameOver);
  const [revealingTiles, setRevealingTiles] = useState({});
  const revealingRef = useRef(false);
  // Set the moment the deciding guess (a win or the sixth) is submitted, well
  // before gameOver lands after its reveal: from then on no key is taken.
  const decidedRef = useRef(initial.gameOver);
  const [announce, liveRegion] = useAnnouncer();
  const resultRef = useRef(null);
  const wasOverRef = useRef(initial.gameOver);
  // What to say once focus is on the result: a focus move cancels speech
  // already queued, so a loss's answer is announced after it, not with it.
  const afterFocusRef = useRef(null);

  // Finishing unmounts the keyboard; move focus to the result so keyboard and
  // screen-reader users land somewhere (not on a reload of a finished game).
  useEffect(()=>{
    if (showFact&&!wasOverRef.current) {
      resultRef.current?.focus();
      if (afterFocusRef.current) announce(afterFocusRef.current);
      afterFocusRef.current=null;
    }
    wasOverRef.current=showFact;
  }, [showFact, announce]);

  // The toast is visual; spoken (default: the same text, null: nothing) goes to screen readers.
  const showMsg = useCallback((msg, dur=1800, spoken=msg) => { setMessage(msg); if (spoken) announce(spoken); setTimeout(()=>setMessage(null), dur); }, [announce]);

  const spawnConfetti = () => {
    const items = Array.from({length:30},(_,i)=>({
      id:i, x:20+Math.random()*60, delay:Math.random()*600,
      color:['var(--correct)','var(--present)','var(--gold)','var(--gold)','var(--ink)'][i%5], size:5+Math.random()*8
    }));
    setConfetti(items);
    setTimeout(()=>setConfetti([]),1600);
  };

  const submitGuess = useCallback(() => {
    if (decidedRef.current || revealingRef.current) return;
    if (input.length!==COLS) {
      setShakeRow(current); setTimeout(()=>setShakeRow(null),600);
      showMsg('Not enough letters'); return;
    }
    if (!VALID_WORDS.has(input.toLowerCase()) && !WORDS.some(w=>w.word===input)) {
      setShakeRow(current); setTimeout(()=>setShakeRow(null),600);
      showMsg('Not a valid word!'); return;
    }
    const result = evaluate(input, daily.word);
    revealingRef.current = true;
    const rowIdx = current;
    const submittedInput = input;
    const isWin=result.every(s=>s===ST.correct);
    const isLast=rowIdx+1>=ROWS;
    // Lock input now, not when gameOver lands after the reveal: a guess typed
    // in that gap would overwrite this row, rewrite the checkpoint and save again.
    if (isWin||isLast) decidedRef.current=true;
    setGuesses(prev=>{const n=[...prev];n[rowIdx]=submittedInput;return n;});
    setInput('');

    // Record the guess (and the result, once it decides the game) as it lands,
    // before the reveal, so a reload mid-animation neither refunds it nor loses
    // the save. Keep this order: saveResult queues the result on disk
    // synchronously, before its first await, so the result is queued on disk
    // before the checkpoint records the finish.
    if (isToday) {
      if (isWin) saveResult({ game: 'words', puzzleDate: seedDate, completed: true });
      else if (isLast) saveResult({ game: 'words', puzzleDate: seedDate, completed: false });
      writeCheckpoint(seedDate, daily.word, [...guesses.slice(0,rowIdx), submittedInput]);
    }

    result.forEach((st,colIdx)=>{
      setTimeout(()=>{
        const key=`${rowIdx}-${colIdx}`;
        setTileStates(prev=>({...prev,[key]:st}));
        setRevealingTiles(prev=>({...prev,[key]:true}));
        setTimeout(()=>setRevealingTiles(prev=>{const n={...prev};delete n[key];return n;}),800);
      }, colIdx*150);
    });

    const totalDelay = (COLS-1)*150+800;

    // Spoken once the reveal finishes, like the colours: the row's result, then
    // what's left (or, on the sixth miss, the answer — one message, not two).
    const spokenRow = describeRow(rowIdx, submittedInput, result);
    setTimeout(()=>{
      setKeyStates(prev=>withKeyStates(prev, submittedInput, result));
      revealingRef.current = false;
      if (isWin) {
        announce(`${spokenRow}. Solved!`);
        setBounceRow(rowIdx); setTimeout(()=>setBounceRow(null),1000);
        setTimeout(()=>{setWon(true);setGameOver(true);spawnConfetti();setShowFact(true);},400);
      } else if (isLast) {
        afterFocusRef.current=`${spokenRow}. Out of guesses. The word was ${daily.word}.`;
        setTimeout(()=>{setGameOver(true);setShowFact(true);showMsg(daily.word,3000,null);},200);
      } else {
        announce(`${spokenRow}. ${guessesLeft(ROWS-rowIdx-1)}.`);
        setCurrent(c=>c+1);
      }
    }, totalDelay);
  }, [input, current, guesses, daily.word, isToday, seedDate, announce, showMsg]);

  const handleKey = useCallback((key) => {
    if (decidedRef.current || revealingRef.current) return;
    if (key==='ENTER') { submitGuess(); return; }
    if (key==='⌫'||key==='BACKSPACE') { setInput(i=>i.slice(0,-1)); return; }
    if (/^[A-Z]$/.test(key)&&input.length<COLS) setInput(i=>i+key);
  }, [input, submitGuess]);

  // The control a mouse last pressed: pressing a button focuses it in most
  // browsers, so Enter typed afterwards is the player's, not the button's.
  const pointerControlRef = useRef(null);
  useEffect(()=>{
    const onPointer=(e)=>{ pointerControlRef.current=e.target instanceof Element?e.target.closest(CONTROL):null; };
    window.addEventListener('pointerdown',onPointer,true);
    return ()=>window.removeEventListener('pointerdown',onPointer,true);
  }, []);

  useEffect(()=>{
    const handler=(e)=>{
      if (e.key==='Tab') pointerControlRef.current=null; // focus now moves by keyboard
      // An open dialog owns the keyboard: Enter activates its buttons and
      // letters never land on the hidden board behind it.
      if (keysBlocked||e.ctrlKey||e.metaKey||e.altKey) return;
      // So does the open account menu: Enter there works its items (even the
      // avatar a mouse pressed), and letters and Backspace skip the row.
      if (e.target instanceof Element&&e.target.closest(NO_PAGE_SHORTCUTS)) return;
      // Enter on a focused control activates it (Archive, How to play, an
      // on-screen key reached with Tab). Only with letters typed, on a button
      // the mouse pressed (it kept focus), does Enter submit the guess instead.
      // Links and switches always keep their Enter.
      if (e.key==='Enter'&&e.target instanceof HTMLElement) {
        const control=e.target.closest(CONTROL);
        const submits=input.length>0&&control===pointerControlRef.current&&!control.matches('a[href], [role="switch"]');
        if (control&&!submits) return;
        if (control) e.preventDefault();
      }
      handleKey(e.key.toUpperCase());
    };
    window.addEventListener('keydown',handler);
    return ()=>window.removeEventListener('keydown',handler);
  }, [handleKey, input.length, keysBlocked]);

  const getLetter=(r,c)=>{
    if (guesses[r]) return guesses[r][c]||'';
    if (r===current) return input[c]||'';
    return '';
  };

  const getTileColor=(r,c)=>{
    const st=tileStates[`${r}-${c}`];
    return st?palette[st]:palette.empty;
  };

  const getTileInk=(r,c)=>INK[tileStates[`${r}-${c}`]]||'var(--ink)';

  // A row's tile states once its flip has finished (null before then), so the
  // spoken board never gets ahead of the visible one.
  const settledStates=(r)=>{
    const states=Array.from({length:COLS},(_,c)=>tileStates[`${r}-${c}`]);
    return states.every(Boolean)&&!states.some((_,c)=>revealingTiles[`${r}-${c}`])?states:null;
  };
  const rowLetters=(r)=>guesses[r]||(r===current?input:'');

  // Every key keeps a name (a fresh letter is just itself), so its markup only
  // ever changes values, never which attributes it has.
  const keyLabel=(key,st)=>{
    if (key==='⌫') return 'Backspace';
    if (key==='ENTER') return 'Enter';
    return st?`${key}, ${ST_SPOKEN[st]}`:key;
  };

  const buildShare=()=>{
    const emoji=hc?{[ST.correct]:'🟧',[ST.present]:'🟦',[ST.absent]:'⬛'}:{[ST.correct]:'🟩',[ST.present]:'🟨',[ST.absent]:'⬛'};
    const rows=guesses.slice(0,won?current+1:ROWS).filter(g=>g)
      .map((_,i)=>Array.from({length:COLS},(__,j)=>emoji[tileStates[`${i}-${j}`]]||'⬛').join(''));
    const result=won?`${current+1}/${ROWS}`:'X/6';
    return `WORDS by Streakle 🔥 — ${formatDate(seedDate)}\n${result}\n${rows.join('\n')}\n\nPlay at: playstreakle.com/words`;
  };


  return (
    <>
      {confetti.map(c=>(
        <div key={c.id} style={{position:'fixed',left:`${c.x}%`,top:'28%',width:c.size,height:c.size,background:c.color,borderRadius:c.size>10?'50%':2,animation:`confetti 1.3s ${c.delay}ms ease forwards`,pointerEvents:'none',zIndex:100}}/>
      ))}

      {message&&(
        <div style={{position:'fixed',top:80,left:'50%',transform:'translateX(-50%)',background:'var(--ink)',borderRadius:8,padding:'8px 20px',fontSize:14,fontWeight:700,color:'var(--bg)',zIndex:50,animation:'slideUp 0.2s ease',whiteSpace:'nowrap'}}>
          {message}
        </div>
      )}

      {liveRegion}

      <div className="wd-board" style={{display:'flex',flexDirection:'column',gap:6,marginBottom:20}}>
        {/* The board as screen readers read it: one line per guess. The tiles
            below are visual only (each letter sits on both faces of its flip). */}
        <ul className="sr-only" aria-label="Guesses">
          {Array.from({length:ROWS},(_,rowIdx)=>(
            <li key={rowIdx}>{describeRow(rowIdx, rowLetters(rowIdx), settledStates(rowIdx))}</li>
          ))}
        </ul>
        {Array.from({length:ROWS},(_,rowIdx)=>{
          const isShaking=shakeRow===rowIdx;
          const isBouncing=bounceRow===rowIdx;
          return (
            <div key={rowIdx} aria-hidden="true" style={{display:'flex',gap:6,animation:isShaking?'shake 0.5s ease':'none'}}>
              {Array.from({length:COLS},(_,colIdx)=>{
                const letter=getLetter(rowIdx,colIdx);
                const tileColor=getTileColor(rowIdx,colIdx);
                const colored=tileColor!==CLR.empty;
                const revealing=!!revealingTiles[`${rowIdx}-${colIdx}`];
                return (
                  <div key={colIdx} style={{width:'var(--wd-tile)',height:'var(--wd-tile)',perspective:'200px',flexShrink:0,animation:isBouncing?`bounce 0.4s ${colIdx*80}ms ease`:'none'}}>
                    <div style={{
                      width:'100%',height:'100%',position:'relative',
                      transformStyle:'preserve-3d',
                      animation:revealing?'cardFlip 0.80s ease forwards':'none',
                      transform:colored&&!revealing?'rotateY(180deg)':'rotateY(0deg)',
                    }}>
                      <div style={{
                        position:'absolute',inset:0,
                        backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden',
                        background:letter?CLR.active:CLR.empty,
                        border:`2px solid ${letter?'var(--gold)':'var(--border)'}`,
                        borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:TILE_FONT,fontWeight:800,color:'var(--ink)',
                        animation:letter&&!colored?'letterPop 0.1s ease':'none',
                      }}>{letter}</div>
                      <div style={{
                        position:'absolute',inset:0,
                        backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden',
                        transform:'rotateY(180deg)',
                        background:tileColor,border:'2px solid transparent',
                        borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:TILE_FONT,fontWeight:800,color:getTileInk(rowIdx,colIdx),
                      }}>{letter}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {showFact&&(
        <ResultCard ref={resultRef} game="words" outcome={won?'won':'lost'} title={won?<><span aria-hidden="true">🎉</span> Got it in {current+1}!</>:'So close!'} shareText={buildShare}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'var(--muted)',textTransform:'uppercase',marginTop:4,marginBottom:4}}>
            {won?"Today's word":"Today's word was"}
          </div>
          <div style={{fontFamily:'var(--font-display)',fontSize:34,fontWeight:800,letterSpacing:4,color:'var(--ink)',lineHeight:1,marginBottom:6}}>{daily.word}</div>
          <div style={{fontSize:13,color:'var(--gold)',fontStyle:'italic',marginBottom:10}}>{daily.def}</div>
          <div className="rc-detail" style={{lineHeight:1.65}}>{daily.fact}</div>
        </ResultCard>
      )}

      {!gameOver&&(
        <div className="wd-kb">
          {KEYBOARD.map((row,ri)=>(
            <div key={ri} className="wd-kb-row">
              {row.map(key=>{
                const st=keyStates[key];
                const wide=key==='ENTER'||key==='⌫';
                return (
                  <button key={key} type="button" aria-label={keyLabel(key,st)} onClick={()=>handleKey(key)} className={wide?'wd-key wd-key-wide':'wd-key'} style={{
                    background:st===ST.correct?palette.correct:st===ST.present?palette.present:st===ST.absent?palette.absent:'var(--key)',
                    color:INK[st]||'var(--ink)',
                  }}>{key}</button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </>
  );
}