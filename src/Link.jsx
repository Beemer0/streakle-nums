import { useState, useRef, useEffect, useCallback } from "react";

const PUZZLES = [
  {
    categories: [
      { label: "Planets", color: "#b59f3b", words: ["MARS", "VENUS", "SATURN", "NEPTUNE"] },
      { label: "Card games", color: "#538d4e", words: ["POKER", "BRIDGE", "SNAP", "SOLITAIRE"] },
      { label: "Things that are blue", color: "#3a7bd5", words: ["SKY", "OCEAN", "SAPPHIRE", "BLUEBELL"] },
      { label: "___berry", color: "#9b59b6", words: ["STRAW", "BLUE", "RASP", "GOOSE"] },
    ]
  },
  {
    categories: [
      { label: "Dog breeds", color: "#b59f3b", words: ["POODLE", "BOXER", "HUSKY", "BEAGLE"] },
      { label: "Olympic sports", color: "#538d4e", words: ["JUDO", "FENCING", "LUGE", "ARCHERY"] },
      { label: "Types of cheese", color: "#3a7bd5", words: ["BRIE", "GOUDA", "FETA", "HAVARTI"] },
      { label: "Famous Leonardos", color: "#9b59b6", words: ["DAVINCI", "DICAPRIO", "FIBONACCI", "NIMOY"] },
    ]
  },
  {
    categories: [
      { label: "Currencies", color: "#b59f3b", words: ["YEN", "EURO", "FRANC", "PESO"] },
      { label: "Bones in the body", color: "#538d4e", words: ["FEMUR", "TIBIA", "RADIUS", "ULNA"] },
      { label: "Shakespeare plays", color: "#3a7bd5", words: ["HAMLET", "OTHELLO", "MACBETH", "TEMPEST"] },
      { label: "___ ball", color: "#9b59b6", words: ["BASKET", "FOOT", "FIRE", "ODD"] },
    ]
  },
  {
    categories: [
      { label: "African countries", color: "#b59f3b", words: ["CHAD", "MALI", "TOGO", "BENIN"] },
      { label: "Types of pasta", color: "#538d4e", words: ["PENNE", "RIGATONI", "ORZO", "FUSILLI"] },
      { label: "Famous scientists", color: "#3a7bd5", words: ["CURIE", "DARWIN", "NEWTON", "TESLA"] },
      { label: "Things with rings", color: "#9b59b6", words: ["SATURN", "BOXING", "WEDDING", "CIRCUS"] },
    ]
  },
  {
    categories: [
      { label: "Jazz musicians", color: "#b59f3b", words: ["COLTRANE", "DAVIS", "PARKER", "MONK"] },
      { label: "Types of clouds", color: "#538d4e", words: ["CUMULUS", "STRATUS", "CIRRUS", "NIMBUS"] },
      { label: "Robin ___", color: "#3a7bd5", words: ["HOOD", "WILLIAMS", "WRIGHT", "THICKE"] },
      { label: "Cocktail ingredients", color: "#9b59b6", words: ["VERMOUTH", "BITTERS", "GRENADINE", "KAHLUA"] },
    ]
  },
  {
    categories: [
      { label: "Mountain ranges", color: "#b59f3b", words: ["ANDES", "ROCKIES", "ALPS", "URALS"] },
      { label: "Dances", color: "#538d4e", words: ["TANGO", "WALTZ", "SALSA", "FOXTROT"] },
      { label: "Greek gods", color: "#3a7bd5", words: ["APOLLO", "HERMES", "ARES", "POSEIDON"] },
      { label: "Types of bread", color: "#9b59b6", words: ["BRIOCHE", "CIABATTA", "FOCACCIA", "NAAN"] },
    ]
  },
  {
    categories: [
      { label: "Rivers", color: "#b59f3b", words: ["NILE", "AMAZON", "GANGES", "DANUBE"] },
      { label: "Famous paintings", color: "#538d4e", words: ["GUERNICA", "STARRY NIGHT", "PERSISTENCE", "NIGHTHAWKS"] },
      { label: "Constellations", color: "#3a7bd5", words: ["ORION", "LYRA", "DRACO", "CASSIOPEIA"] },
      { label: "Martial arts", color: "#9b59b6", words: ["KARATE", "AIKIDO", "TAEKWONDO", "MUAY THAI"] },
    ]
  },
  {
    categories: [
      { label: "Gemstones", color: "#b59f3b", words: ["OPAL", "GARNET", "TOPAZ", "ONYX"] },
      { label: "Board games", color: "#538d4e", words: ["CATAN", "RISK", "CLUE", "TABOO"] },
      { label: "Philosophers", color: "#3a7bd5", words: ["SOCRATES", "KANT", "HUME", "LOCKE"] },
      { label: "___ note", color: "#9b59b6", words: ["BANK", "STICKY", "FOOT", "KEY"] },
    ]
  },
  {
    categories: [
      { label: "Volcanoes", color: "#b59f3b", words: ["ETNA", "FUJI", "KRAKATOA", "VESUVIUS"] },
      { label: "Types of tea", color: "#538d4e", words: ["OOLONG", "MATCHA", "DARJEELING", "ROOIBOS"] },
      { label: "Cold ___", color: "#3a7bd5", words: ["FRONT", "SHOULDER", "SNAP", "TURKEY"] },
      { label: "Primates", color: "#9b59b6", words: ["GIBBON", "MANDRILL", "TAMARIN", "BONOBO"] },
    ]
  },
  {
    categories: [
      { label: "Deserts", color: "#b59f3b", words: ["GOBI", "SAHARA", "MOJAVE", "NAMIB"] },
      { label: "Canadian provinces", color: "#538d4e", words: ["ALBERTA", "ONTARIO", "QUEBEC", "MANITOBA"] },
      { label: "___ bear", color: "#3a7bd5", words: ["POLAR", "GRIZZLY", "KOALA", "TEDDY"] },
      { label: "Types of coffee", color: "#9b59b6", words: ["ESPRESSO", "LUNGO", "RISTRETTO", "MACCHIATO"] },
    ]
  },
  {
    categories: [
      { label: "Mythical creatures", color: "#b59f3b", words: ["GRIFFIN", "SPHINX", "MINOTAUR", "BASILISK"] },
      { label: "Fast food chains", color: "#538d4e", words: ["WENDY'S", "ARBY'S", "SONIC", "IN-N-OUT"] },
      { label: "Languages", color: "#3a7bd5", words: ["SWAHILI", "PUNJABI", "CATALAN", "TAGALOG"] },
      { label: "Ballet terms", color: "#9b59b6", words: ["PLIE", "ARABESQUE", "PIROUETTE", "TENDU"] },
    ]
  },
  {
    categories: [
      { label: "Famous generals", color: "#b59f3b", words: ["PATTON", "ROMMEL", "HANNIBAL", "WELLINGTON"] },
      { label: "Types of beer", color: "#538d4e", words: ["STOUT", "PILSNER", "PORTER", "SAISON"] },
      { label: "Tropical fruits", color: "#3a7bd5", words: ["PAPAYA", "LYCHEE", "JACKFRUIT", "DURIAN"] },
      { label: "___ field", color: "#9b59b6", words: ["CORN", "MINE", "SPRING", "LEFT"] },
    ]
  },
  {
    categories: [
      { label: "Types of tide", color: "#b59f3b", words: ["SPRING", "NEAP", "FLOOD", "EBB"] },
      { label: "Logical fallacies", color: "#538d4e", words: ["STRAW MAN", "AD HOMINEM", "RED HERRING", "SLIPPERY SLOPE"] },
      { label: "Famous left-handers", color: "#3a7bd5", words: ["OBAMA", "HENDRIX", "DA VINCI", "MCCARTNEY"] },
      { label: "___ power", color: "#9b59b6", words: ["SOLAR", "WILL", "FLOWER", "BRAIN"] },
    ]
  },
  {
    categories: [
      { label: "Shades of red", color: "#b59f3b", words: ["CRIMSON", "SCARLET", "VERMILLION", "CARMINE"] },
      { label: "Types of government", color: "#538d4e", words: ["OLIGARCHY", "THEOCRACY", "REPUBLIC", "MONARCHY"] },
      { label: "___ code", color: "#3a7bd5", words: ["MORSE", "DRESS", "ZIP", "DA VINCI"] },
      { label: "Yoga poses", color: "#9b59b6", words: ["COBRA", "WARRIOR", "DOWNWARD DOG", "LOTUS"] },
    ]
  },
  {
    categories: [
      { label: "Classical composers", color: "#b59f3b", words: ["BACH", "CHOPIN", "VIVALDI", "HANDEL"] },
      { label: "Things that bark", color: "#538d4e", words: ["DOG", "TREE", "SEAL", "SERGEANT"] },
      { label: "Island groups", color: "#3a7bd5", words: ["AZORES", "MALDIVES", "FAROE", "GALAPAGOS"] },
      { label: "___ map", color: "#9b59b6", words: ["ROAD", "MIND", "HEAT", "GOOGLE"] },
    ]
  },
];

function getDailyPuzzle() {
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return PUZZLES[seed % PUZZLES.length];
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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

const TILE_GAP = 8;
const COLS = 4;

const css = `
@keyframes tileFlipOut{0%{transform:rotateY(0deg) scale(1)}100%{transform:rotateY(90deg) scale(0.8)}}
@keyframes tileFlipIn{0%{transform:rotateY(-90deg) scale(0.8)}100%{transform:rotateY(0deg) scale(1)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes revealRow{0%{transform:scaleY(0);opacity:0}100%{transform:scaleY(1);opacity:1}}
@keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes confetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(120px) rotate(720deg);opacity:0}}
@keyframes copied{0%{opacity:0;transform:translateY(4px)}20%{opacity:1;transform:translateY(0)}80%{opacity:1}100%{opacity:0}}
`;

function FlyingTile({ word, fromX, fromY, toX, toY, color, delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.animate([
      { transform: `translate(${fromX}px,${fromY}px) rotateY(0deg) scale(1)`, offset: 0 },
      { transform: `translate(${fromX}px,${fromY}px) rotateY(90deg) scale(0.85)`, offset: 0.3 },
      { transform: `translate(${toX}px,${toY}px) rotateY(-90deg) scale(0.85)`, offset: 0.6 },
      { transform: `translate(${toX}px,${toY}px) rotateY(0deg) scale(1)`, offset: 1 },
    ], { duration: 700, delay, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' });
  }, []);

  return (
    <div ref={ref} style={{
      position: 'absolute', left: 0, top: 0,
      width: '23%', height: 56,
      background: color, borderRadius: 8,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: word.length > 8 ? 10 : word.length > 6 ? 12 : 14,
      fontWeight: 700, color: '#fff',
      pointerEvents: 'none', zIndex: 20,
      boxShadow: `0 4px 20px ${color}88`,
      willChange: 'transform', padding: '0 4px', textAlign: 'center',
      perspective: '400px',
      transformStyle: 'preserve-3d',
    }}>{word}</div>
  );
}

export default function GridGame() {
  const [puzzle] = useState(() => {
    const p = getDailyPuzzle();
    const seed = new Date().getFullYear() * 10000 + (new Date().getMonth() + 1) * 100 + new Date().getDate();
    return { ...p, shuffled: seededShuffle(p.categories.flatMap(c => c.words), seed) };
  });

  const [selected, setSelected] = useState([]);
  const [solved, setSolved] = useState([]);
  const [lives, setLives] = useState(4);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [shakeWords, setShakeWords] = useState([]);
  const [showHow, setShowHow] = useState(false);
  const [message, setMessage] = useState(null);
  const [guessHistory, setGuessHistory] = useState([]);
  const [confetti, setConfetti] = useState([]);
  const [copied, setCopied] = useState(false);
  const [oneAway, setOneAway] = useState(false);
  const [flyingTiles, setFlyingTiles] = useState([]);
  const [animating, setAnimating] = useState(false);
  const [hiddenWords, setHiddenWords] = useState([]);

  const gridRef = useRef(null);
  const solvedRef = useRef(null);
  const wordRefs = useRef({});
  const solvedRef2 = useRef([]); // always up to date ref

  // Keep ref in sync with state
  useEffect(() => { solvedRef2.current = solved; }, [solved]);

  const solvedWords = solved.flatMap(i => puzzle.categories[i].words);
  const remaining = puzzle.shuffled.filter(w => !solvedWords.includes(w));

  const toggleWord = (word) => {
    if (gameOver || won || animating) return;
    if (selected.includes(word)) setSelected(s => s.filter(w => w !== word));
    else if (selected.length < 4) setSelected(s => [...s, word]);
  };

  const showMsg = (msg, dur = 1800) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), dur);
  };

  const spawnConfetti = () => {
    const items = Array.from({ length: 30 }, (_, i) => ({
      id: i, x: 20 + Math.random() * 60, delay: Math.random() * 600,
      color: ['#b59f3b','#538d4e','#3a7bd5','#9b59b6','#fff'][i % 5],
      size: 5 + Math.random() * 8
    }));
    setConfetti(items);
    setTimeout(() => setConfetti([]), 1600);
  };

  const handleSubmit = () => {
    if (selected.length !== 4 || animating || won || gameOver) return;

    const catIdx = puzzle.categories.findIndex((c, i) =>
      !solvedRef2.current.includes(i) &&
      selected.every(w => c.words.includes(w))
    );

    if (catIdx !== -1) {
      // Correct! Animate tiles flying to solved row
      const cat = puzzle.categories[catIdx];
      const container = gridRef.current;

      if (!container) {
        // No animation fallback
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
        return { word, fromX, fromY, toX, toY, color: cat.color, delay: ti * 60 };
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
          if (ns.length === 4) {
            setWon(true);
            spawnConfetti();
          } else {
            showMsg(`✅ ${cat.label}!`);
          }
          return ns;
        });
      }, 700 + 3 * 60 + 100);

    } else {
      // Wrong
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

      if (newLives === 0) setTimeout(() => setGameOver(true), 600);
    }
  };

  const handleShare = async () => {
    const lines = guessHistory.map(g => g.correct ? '🟩🟩🟩🟩' : '🟥🟥🟥🟥');
    const result = won ? `Solved in ${guessHistory.length} guess${guessHistory.length !== 1 ? 'es' : ''}!` : `Could not solve today's Grid`;
    const text = `GRID by Streakle 🔥 — ${formatDate()}\n${result}\n${lines.join('\n')}\n\nPlay at: playstreakle.com/grid`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 24, fontFamily: "'Segoe UI', sans-serif", color: '#e0e0e0', position: 'relative', overflow: 'hidden' }}>
      <style>{css}</style>
      <a href="/" style={{ position: 'absolute', left: 16, top: 24, color: '#aaaaff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>← Back</a>

      {confetti.map(c => (
        <div key={c.id} style={{ position: 'fixed', left: `${c.x}%`, top: '30%', width: c.size, height: c.size, background: c.color, borderRadius: c.size > 10 ? '50%' : 2, animation: `confetti 1.3s ${c.delay}ms ease forwards`, pointerEvents: 'none', zIndex: 100 }} />
      ))}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 2 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: 2, color: '#fff' }}>LINK</div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 3, color: '#f5a623', textTransform: 'uppercase', marginTop: -4 }}>by Streakle</div>
        </div>
        <button onClick={() => setShowHow(!showHow)} style={{ background: 'none', border: '1px solid #4a4a8a', borderRadius: 6, color: '#aaaaff', cursor: 'pointer', fontSize: 13, padding: '3px 10px', marginLeft: 8 }}>
          How to play
        </button>
      </div>

      <div style={{ fontSize: 13, color: '#6666aa', marginBottom: 10, marginTop: 6 }}>{formatDate()}</div>

      {showHow && (
        <div style={{ background: '#0f1535', border: '1px solid #4a4a8a', borderRadius: 10, padding: 16, maxWidth: 340, marginBottom: 12, fontSize: 13, lineHeight: 1.65, color: '#ccc', animation: 'slideUp 0.3s ease' }}>
          <b style={{ color: '#aaaaff' }}>How to play</b><br />
          Find 4 groups of 4 words that share something in common.<br /><br />
          Select 4 words and tap <b>Submit</b>. Each correct group flies into place.<br /><br />
          🟨 Easiest → 🟩 → 🟦 → 🟪 Trickiest<br /><br />
          You have <b>4 lives</b>. Watch out for words that seem to fit multiple groups!
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: i < lives ? '#f5a623' : '#333', transition: 'background 0.3s' }} />
        ))}
      </div>

      {message && (
        <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', background: '#16213e', border: '1px solid #4a4a8a', borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 600, color: oneAway ? '#f5a623' : '#fff', zIndex: 50, animation: 'slideUp 0.3s ease', whiteSpace: 'nowrap' }}>
          {message}
        </div>
      )}

      <div ref={gridRef} style={{ position: 'relative', width: '100%', maxWidth: 440, padding: '0 12px', boxSizing: 'border-box' }}>
        {/* Solved rows */}
        <div ref={solvedRef} style={{ marginBottom: solved.length > 0 ? 6 : 0 }}>
          {solved.map(i => (
            <div key={i} style={{ background: puzzle.categories[i].color, borderRadius: 8, padding: '12px 16px', marginBottom: 6, textAlign: 'center', animation: 'revealRow 0.35s ease' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.55)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>{puzzle.categories[i].label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{puzzle.categories[i].words.join(', ')}</div>
            </div>
          ))}
        </div>

        {/* Word grid */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: TILE_GAP, marginBottom: 16 }}>
          {remaining.map(word => {
            const isSel = selected.includes(word);
            const isShaking = shakeWords.includes(word);
            const isHidden = hiddenWords.includes(word);
            return (
              <div key={word} ref={el => wordRefs.current[word] = el} onClick={() => toggleWord(word)} style={{
                aspectRatio: '5/3',
                background: isSel ? '#4a4a8a' : '#16213e',
                border: `2px solid ${isSel ? '#aaaaff' : '#0f3460'}`,
                borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: word.length > 8 ? 10 : word.length > 6 ? 12 : 14,
                fontWeight: 700, color: isSel ? '#fff' : '#e0e0e0',
                cursor: gameOver || won || animating ? 'default' : 'pointer',
                userSelect: 'none', textAlign: 'center', padding: '0 4px',
                transition: 'background 0.15s, border-color 0.15s',
                animation: isShaking ? 'shake 0.45s ease' : isSel ? 'pop 0.3s ease' : 'none',
                boxShadow: isSel ? '0 0 0 3px #aaaaff33' : 'none',
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
          <button onClick={() => setSelected([])} disabled={animating} style={{ background: 'none', border: '1px solid #4a4a8a', borderRadius: 8, color: '#aaaaff', cursor: 'pointer', fontSize: 14, padding: '8px 20px', fontWeight: 600 }}>
            Deselect
          </button>
          <button onClick={handleSubmit} disabled={selected.length !== 4 || animating} style={{
            background: selected.length === 4 && !animating ? '#aaaaff' : '#2a2a4a',
            border: 'none', borderRadius: 8,
            color: selected.length === 4 && !animating ? '#1a1a2e' : '#555',
            cursor: selected.length === 4 && !animating ? 'pointer' : 'default',
            fontSize: 14, padding: '8px 28px', fontWeight: 700, transition: 'background 0.2s',
          }}>
            Submit
          </button>
        </div>
      )}

      {won && (
        <div style={{ textAlign: 'center', animation: 'slideUp 0.5s ease' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#4caf50', marginBottom: 6 }}>🎉 Solved!</div>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 16 }}>{guessHistory.length} guess{guessHistory.length !== 1 ? 'es' : ''} · {lives} life{lives !== 1 ? 's' : ''} remaining</div>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button onClick={handleShare} style={{ background: '#4a4a8a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              onMouseOver={e => e.currentTarget.style.background = '#6666bb'}
              onMouseOut={e => e.currentTarget.style.background = '#4a4a8a'}>
              📋 Share result
            </button>
            {copied && <div style={{ position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)', background: '#2d6a30', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6, whiteSpace: 'nowrap', animation: 'copied 2s ease forwards', pointerEvents: 'none' }}>Copied!</div>}
          </div>
        </div>
      )}

      {gameOver && !won && (
        <div style={{ textAlign: 'center', animation: 'slideUp 0.4s ease', width: '100%', maxWidth: 440, padding: '0 12px', boxSizing: 'border-box' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#e94560', marginBottom: 8 }}>Game over!</div>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 10 }}>The categories were:</div>
          {puzzle.categories.map((cat, i) => !solved.includes(i) && (
            <div key={i} style={{ background: cat.color, borderRadius: 8, padding: '8px 16px', marginBottom: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,0,0,0.6)', textTransform: 'uppercase' }}>{cat.label}</div>
              <div style={{ fontSize: 13, color: '#fff' }}>{cat.words.join(', ')}</div>
            </div>
          ))}
          <div style={{ position: 'relative', display: 'inline-block', marginTop: 12 }}>
            <button onClick={handleShare} style={{ background: '#2a2a4a', color: '#aaaaff', border: '1px solid #4a4a8a', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              📋 Share result
            </button>
            {copied && <div style={{ position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)', background: '#2d6a30', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6, whiteSpace: 'nowrap', animation: 'copied 2s ease forwards', pointerEvents: 'none' }}>Copied!</div>}
          </div>
        </div>
      )}

      <div style={{ marginTop: 32, fontSize: 12, color: '#4a4a8a', textAlign: 'center' }}>
        <a href="/privacy" style={{ color: '#4a4a8a', textDecoration: 'none' }}>Privacy Policy / Politique de confidentialité</a>
      </div>
    </div>
  );
}