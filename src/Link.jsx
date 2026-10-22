import { useState, useRef, useEffect, useMemo } from "react";
import Archive from './Archive'
import GameShell from "./GameShell";
import ResultCard from './ResultCard';
import { saveResult } from './saveResult';
import { useStreak } from './useStreak';
import { useBoardDate } from './useBoardDate';
import { clickableProps } from './a11y';
import { useSeo, PAGE_SEO } from './seo';
import { slotHoldsLaterDay } from './checkpointSlot';
import { getDailyPuzzle } from './link/schedule';

function formatDate(dateStr) {
  let d = new Date();
  if (dateStr) { const [y,m,day] = dateStr.split('-').map(Number); d = new Date(y, m-1, day); }
  return d.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
}

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// A group's colour comes from its place in the puzzle: categories run from
// easiest to trickiest (🟨 🟩 🟦 🟪 in How to play). Dark letters on all four.
const TIER = ['var(--link-1)', 'var(--link-2)', 'var(--link-3)', 'var(--link-4)'];
const TILE_GAP = 8;
const COLS = 4;
const LIVES = 4;
const CHECKPOINT_KEY = 'streakle-link';

// ── Today's checkpoint: the solved groups (in solve order), lives left and
// each guess's outcome (true = a group found), so a reload can never refund a
// life or revive a finished puzzle. won/gameOver are derived. Archive replays
// never touch it.
// The puzzle a checkpoint belongs to: `solved` holds category indices, so a
// same-day bank edit (a new puzzle shifts the daily pick, a fixed word or
// reordered group changes it) gives a different signature and the old
// progress is dropped rather than replayed onto another puzzle.
const puzzleSig = (puzzle) => puzzle.categories.map(c => `${c.label}:${c.words.join(',')}`).join('|');

function readCheckpoint(date, puzzle) {
  try {
    const raw = localStorage.getItem(CHECKPOINT_KEY);
    if (!raw) return null;
    const cp = JSON.parse(raw);
    if (!cp || cp.v !== 1 || cp.date !== date || cp.sig !== puzzleSig(puzzle)) return null;
    const groups = puzzle.categories.length;
    const { solved, lives, history } = cp;
    if (!Array.isArray(solved) || !Array.isArray(history) || !Number.isInteger(lives)) return null;
    if (lives < 0 || lives > LIVES || solved.length > groups || new Set(solved).size !== solved.length) return null;
    if (!solved.every(i => Number.isInteger(i) && i >= 0 && i < groups)) return null;
    if (!history.every(g => typeof g === 'boolean')) return null;
    // Every right guess is a solved group, every wrong one cost a life, and
    // nothing follows the guess that ended the game.
    const right = history.filter(Boolean).length;
    if (right !== solved.length || history.length - right !== LIVES - lives) return null;
    const won = solved.length === groups;
    if (won && lives === 0) return null;
    if ((won || lives === 0) && history[history.length - 1] !== won) return null;
    return { solved, lives, guessHistory: history.map(correct => ({ correct })) };
  } catch { return null; }
}

// One slot for every tab. A tab left open since an earlier day keeps the board
// it was dealt, so its next guess must not overwrite a later day's checkpoint:
// today's board would reload fresh, refunding lives or wiping a finish.
function writeCheckpoint(date, puzzle, { solved, lives, guessHistory }) {
  try {
    if (slotHoldsLaterDay(CHECKPOINT_KEY, date)) return;
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify({ v: 1, date, sig: puzzleSig(puzzle), solved, lives, history: guessHistory.map(g => g.correct) }));
  } catch { /* storage unavailable */ }
}

const css = `
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.12)}100%{transform:scale(1)}}
@keyframes revealRow{0%{transform:scaleY(0);opacity:0}100%{transform:scaleY(1);opacity:1}}
@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes confetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(120px) rotate(720deg);opacity:0}}
`;

// One word of a solved group flipping from its grid spot (fromX/fromY, px
// from the board's top-left) into the solved row (toX/toY), staggered by delay.
function FlyingTile({ word, fromX, fromY, toX, toY, delay, color }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.animate([
      { transform: `translate(${fromX}px,${fromY}px) rotateY(0deg) scale(1)`, offset: 0 },
      { transform: `translate(${fromX}px,${fromY}px) rotateY(90deg) scale(0.85)`, offset: 0.3 },
      { transform: `translate(${toX}px,${toY}px) rotateY(-90deg) scale(0.85)`, offset: 0.6 },
      { transform: `translate(${toX}px,${toY}px) rotateY(0deg) scale(1)`, offset: 1 },
    ], { duration: reduced ? 0 : 700, delay: reduced ? 0 : delay, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'both' });
  }, [fromX, fromY, toX, toY, delay]);

  return (
    <div ref={ref} style={{
      position: 'absolute', left: 0, top: 0,
      transform: `translate(${fromX}px,${fromY}px)`,
      width: '23%', height: 56,
      background: color, borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: word.length > 8 ? 10 : word.length > 6 ? 12 : 14,
      fontWeight: 700, color: 'var(--bg)',
      pointerEvents: 'none', zIndex: 20,
      boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
      willChange: 'transform', padding: '0 4px', textAlign: 'center',
      perspective: '400px', transformStyle: 'preserve-3d',
    }}>{word}</div>
  );
}

export default function GridGame() {
  const { streak } = useStreak('link');
  useSeo(PAGE_SEO.link)
  const [showArchive, setShowArchive] = useState(false)
  const { seedDate, isToday, boardKey, selectDate } = useBoardDate()
  const howTo = (
    <>
      Find 4 groups of 4 words that share something in common.<br /><br />
      Select 4 words and tap <b>Submit</b>. Each correct group flies into place.<br /><br />
      🟨 Easiest → 🟩 → 🟦 → 🟪 Trickiest<br /><br />
      You have <b>4 lives</b>. Watch out for words that seem to fit multiple groups!
    </>
  )

  return (
    <GameShell game="link" date={formatDate(seedDate)} howTo={howTo} onArchive={() => setShowArchive(true)}>
      <style>{css}</style>


      {/* Keyed by date: picking a puzzle in the Archive starts a fresh board. */}
      <LinkBoard key={boardKey} seedDate={seedDate} isToday={isToday} streak={streak} />


      {showArchive && (
        <Archive
          game="link"
          onSelectDate={selectDate}
          onClose={() => setShowArchive(false)}
        />
      )}
    </GameShell>
  );
}

// isToday: the live board, not an Archive replay (replays never save).
function LinkBoard({ seedDate, isToday, streak }) {
  const puzzle = useMemo(() => {
    const seed = parseInt(seedDate.replace(/-/g, ''))
    const p = getDailyPuzzle(seedDate)
    return { ...p, shuffled: seededShuffle(p.categories.flatMap(c => c.words), seed) }
  }, [seedDate])

  // Today's board resumes from its checkpoint (never an Archive replay).
  const [restored] = useState(() => isToday ? readCheckpoint(seedDate, puzzle) : null);
  const [selected, setSelected] = useState([]);
  const [solved, setSolved] = useState(restored?.solved ?? []);
  const [lives, setLives] = useState(restored?.lives ?? LIVES);
  const [gameOver, setGameOver] = useState(restored?.lives === 0);
  const [won, setWon] = useState(restored?.solved.length === puzzle.categories.length);
  const [shakeWords, setShakeWords] = useState([]);
  const [message, setMessage] = useState(null);
  const [guessHistory, setGuessHistory] = useState(restored?.guessHistory ?? []);
  const [confetti, setConfetti] = useState([]);
  const [oneAway, setOneAway] = useState(false);
  const [flyingTiles, setFlyingTiles] = useState([]);
  const [animating, setAnimating] = useState(false);
  const [hiddenWords, setHiddenWords] = useState([]);

  const gridRef = useRef(null);
  const solvedRef = useRef(null);
  const wordRefs = useRef({});
  const solvedRef2 = useRef([]);

  useEffect(() => { solvedRef2.current = solved; }, [solved]);

  const solvedWords = solved.flatMap(i => puzzle.categories[i].words);
  const remaining = puzzle.shuffled.filter(w => !solvedWords.includes(w));
  // No guesses: the game is over, a group is flying in, or the last life is
  // gone and the game-over card is on its way (a tap then would cost a fifth).
  const inert = gameOver || won || animating || lives <= 0;

  const toggleWord = (word) => {
    if (inert) return;
    if (selected.includes(word)) setSelected(s => s.filter(w => w !== word));
    else if (selected.length < 4) setSelected(s => [...s, word]);
  };

  const showMsg = (msg, dur = 1800) => { setMessage(msg); setTimeout(() => setMessage(null), dur); };

  const spawnConfetti = () => {
    const items = Array.from({ length: 30 }, (_, i) => ({
      id: i, x: 20 + Math.random() * 60, delay: Math.random() * 600,
      color: [...TIER, 'var(--ink)'][i % 5],
      size: 5 + Math.random() * 8
    }));
    setConfetti(items);
    setTimeout(() => setConfetti([]), 1600);
  };

  // Records a guess on today's board. Called after that guess's saveResult,
  // which queues the result on disk synchronously (before its first await),
  // so the result is queued before the checkpoint records the finish.
  const checkpoint = (next) => { if (isToday) writeCheckpoint(seedDate, puzzle, next); };

  const handleSubmit = () => {
    if (selected.length !== 4 || inert) return;

    const catIdx = puzzle.categories.findIndex((c, i) =>
      !solvedRef2.current.includes(i) && selected.every(w => c.words.includes(w))
    );

    if (catIdx !== -1) {
      const cat = puzzle.categories[catIdx];
      const container = gridRef.current;

      // The group counts now, not when its fly-in lands: save (the result is
      // queued on disk at once) then checkpoint here, so a reload mid-flight
      // keeps the group and the day's result.
      const nextSolved = [...solved, catIdx];
      if (nextSolved.length === 4 && isToday) saveResult({ game: 'link', puzzleDate: seedDate, completed: true });
      checkpoint({ solved: nextSolved, lives, guessHistory: [...guessHistory, { correct: true }] });

      if (!container) {
        setSolved(prev => {
          const ns = [...prev, catIdx];
          if (ns.length === 4) { setWon(true); spawnConfetti(); }
          else showMsg(`✅ ${cat.label}!`);
          return ns;
        });
        setGuessHistory(h => [...h, { correct: true }]);
        setSelected([]);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const solvedHeight = solvedRef2.current.length * 62;
      const toY = solvedHeight;

      const tiles = selected.map((word, ti) => {
        const el = wordRefs.current[word];
        const fromRect = el?.getBoundingClientRect();
        const fromX = fromRect ? fromRect.left - containerRect.left : 0;
        const fromY = fromRect ? fromRect.top - containerRect.top : 0;
        const toX = ti * (containerRect.width / 4);
        return { word, fromX, fromY, toX, toY, delay: ti * 60, color: TIER[catIdx] };
      });

      setHiddenWords([...selected]);
      setFlyingTiles(tiles);
      setAnimating(true);
      setSelected([]);

      setTimeout(() => {
        setFlyingTiles([]);
        setHiddenWords([]);
        setAnimating(false);
        setGuessHistory(h => [...h, { correct: true }]);
        setSolved(prev => {
          const ns = [...prev, catIdx];
          if (ns.length === 4) { setWon(true); spawnConfetti(); }
          else showMsg(`✅ ${cat.label}!`);
          return ns;
        });
      }, 700 + 3 * 60 + 100);
    } else {
      const bestMatch = puzzle.categories
        .filter((_, i) => !solvedRef2.current.includes(i))
        .map(c => selected.filter(w => c.words.includes(w)).length)
        .reduce((a, b) => Math.max(a, b), 0);

      setGuessHistory(h => [...h, { correct: false }]);
      setShakeWords([...selected]);
      setTimeout(() => setShakeWords([]), 500);

      const newLives = lives - 1;
      setLives(newLives);

      if (bestMatch === 3) { setOneAway(true); showMsg("One away! 👀", 2000); }
      else { setOneAway(false); showMsg("Not quite! Try again."); }

      if (newLives === 0) { if (isToday) saveResult({ game: 'link', puzzleDate: seedDate, completed: false }); setTimeout(() => setGameOver(true), 600); }
      checkpoint({ solved, lives: newLives, guessHistory: [...guessHistory, { correct: false }] });
    }
  };

  const buildShareText = () => {
    const lines = guessHistory.map(g => g.correct ? '🟩🟩🟩🟩' : '🟥🟥🟥🟥');
    const result = won ? `Solved in ${guessHistory.length} guess${guessHistory.length !== 1 ? 'es' : ''}!` : `Could not solve today's Link`;
    return `LINK by Streakle 🔥 — ${formatDate(seedDate)}\n${result}\n${lines.join('\n')}\n\nPlay at: playstreakle.com/link`;
  };

  return (
    <>
      {confetti.map(c => (
        <div key={c.id} style={{ position: 'fixed', left: `${c.x}%`, top: '30%', width: c.size, height: c.size, background: c.color, borderRadius: c.size > 10 ? '50%' : 2, animation: `confetti 1.3s ${c.delay}ms ease forwards`, pointerEvents: 'none', zIndex: 100 }} />
      ))}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: i < lives ? 'var(--gold)' : 'var(--border-strong)', transition: 'background 0.3s' }} />
        ))}
      </div>

      {streak > 0 && (
        <div style={{fontSize:13, color:'var(--gold)', fontWeight:600, marginBottom:8}}>
          🔥 {streak} day streak
        </div>
      )}

      {message && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 600, color: oneAway ? 'var(--gold)' : 'var(--ink)', zIndex: 50, animation: 'slideUp 0.3s ease', whiteSpace: 'nowrap' }}>
          {message}
        </div>
      )}

      <div ref={gridRef} style={{ position: 'relative', width: '100%', maxWidth: 500, padding: '0 12px', boxSizing: 'border-box' }}>
        <div ref={solvedRef} style={{ marginBottom: solved.length > 0 ? 6 : 0 }}>
          {solved.map(i => (
            <div key={i} style={{ background: TIER[i], borderRadius: 8, padding: '12px 16px', marginBottom: 6, textAlign: 'center', animation: restored?.solved.includes(i) ? 'none' : 'revealRow 0.35s ease' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.75)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{puzzle.categories[i].label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--bg)' }}>{puzzle.categories[i].words.join(', ')}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: TILE_GAP, marginBottom: 16 }}>
          {remaining.map(word => {
            const isSel = selected.includes(word);
            const isShaking = shakeWords.includes(word);
            const isHidden = hiddenWords.includes(word);
            return (
              <div key={word} ref={el => wordRefs.current[word] = el} {...clickableProps(() => toggleWord(word), inert)} style={{
                aspectRatio: '5/3', background: isSel ? 'var(--gold)' : 'var(--surface)',
                border: `2px solid ${isSel ? 'var(--gold)' : 'var(--border)'}`,
                borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: word.length > 8 ? 10 : word.length > 6 ? 12 : 14,
                fontWeight: 700, color: isSel ? 'var(--bg)' : 'var(--ink)',
                cursor: inert ? 'default' : 'pointer',
                userSelect: 'none', textAlign: 'center', padding: '0 4px',
                transition: 'background 0.15s, border-color 0.15s',
                animation: isShaking ? 'shake 0.45s ease' : isSel ? 'pop 0.3s ease' : 'none',
                boxShadow: isSel ? '0 0 0 3px rgba(var(--gold-rgb),0.2)' : 'none',
                opacity: isHidden ? 0 : 1,
              }}>
                {word}
              </div>
            );
          })}
        </div>

        {flyingTiles.map((ft, i) => (
          <FlyingTile key={`${ft.word}-${i}`} {...ft} />
        ))}
      </div>

      {!gameOver && !won && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={() => setSelected([])} disabled={animating} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--gold)', cursor: 'pointer', fontSize: 14, padding: '8px 20px', fontWeight: 600 }}>
            Deselect
          </button>
          <button onClick={handleSubmit} disabled={selected.length !== 4 || animating} style={{
            background: selected.length === 4 && !animating ? 'var(--gold)' : 'var(--surface)',
            border: 'none', borderRadius: 8,
            color: selected.length === 4 && !animating ? 'var(--bg)' : 'var(--faint)',
            cursor: selected.length === 4 && !animating ? 'pointer' : 'default',
            fontSize: 14, padding: '8px 28px', fontWeight: 700, transition: 'background 0.2s',
          }}>
            Submit
          </button>
        </div>
      )}

      {won && (
        <ResultCard game="link" outcome="won" title="🎉 Solved!" shareText={buildShareText}>
          <div className="rc-detail">{guessHistory.length} guess{guessHistory.length !== 1 ? 'es' : ''} · {lives} {lives === 1 ? 'life' : 'lives'} remaining</div>
        </ResultCard>
      )}

      {gameOver && !won && (
        <ResultCard game="link" outcome="lost" title="Game over!" shareText={buildShareText}>
          <div className="rc-detail" style={{ marginBottom: 10 }}>The categories were:</div>
          {puzzle.categories.map((cat, i) => !solved.includes(i) && (
            <div key={i} style={{ background: TIER[i], borderRadius: 8, padding: '8px 16px', marginBottom: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.75)', textTransform: 'uppercase' }}>{cat.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bg)' }}>{cat.words.join(', ')}</div>
            </div>
          ))}
        </ResultCard>
      )}
    </>
  );
}