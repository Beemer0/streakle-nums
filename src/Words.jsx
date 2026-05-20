import { useState, useEffect, useCallback, useMemo } from "react";
import Archive from './Archive'
import UserMenu from "./UserMenu";
import { saveResult } from './saveResult';
import { useStreak } from './useStreak';
import validWordsRaw from './validWords.txt?raw';

const WORDS = [
  { word: "BRINY", def: "Salty like the sea.", fact: "The ocean contains about 35 grams of salt per litre. Ancient sailors called the sea 'the briny deep', and the phrase stuck around for centuries." },
  { word: "STOIC", def: "Enduring hardship without complaint.", fact: "Marcus Aurelius, a Roman emperor, wrote his private Stoic journals never intending them to be published. We know them as Meditations." },
  { word: "AXIOM", def: "A statement accepted as self-evidently true.", fact: "Euclid built all of geometry on just 5 axioms. Mathematicians spent 2,000 years trying to prove his 5th one — and couldn't. It gave birth to entirely new geometries." },
  { word: "EMBER", def: "A glowing fragment from a dying fire.", fact: "Embers can stay hot enough to reignite a fire for up to 72 hours after flames die out. Many wildfires start not from direct flames but from embers carried miles ahead by wind." },
  { word: "QUIRK", def: "A peculiar habit or characteristic.", fact: "Quirk originally meant a clever verbal trick in the 16th century. It only took on its modern meaning of an odd personal habit in the 1800s." },
  { word: "FJORD", def: "A long, narrow sea inlet between steep cliffs.", fact: "Norway's Sognefjord is the world's deepest at 1,308 metres — deeper than the height of the Burj Khalifa." },
  { word: "LUCID", def: "Clear and easy to understand; or vividly aware.", fact: "Lucid dreaming has been scientifically verified. In studies, dreamers signalled researchers with pre-agreed eye movements from inside the dream." },
  { word: "ZESTY", def: "Full of energy; having a strong, pleasant flavour.", fact: "Zest originally referred to the outer peel of a citrus fruit. The oils in the peel are so aromatic that rubbing it releases flavour compounds that juice alone doesn't contain." },
  { word: "CYNIC", def: "A person who believes people act only out of self-interest.", fact: "Diogenes, the most famous Cynic philosopher, reportedly lived in a large ceramic jar and told Alexander the Great to stop blocking his sunlight." },
  { word: "PIXIE", def: "A mythical fairy-like creature, often mischievous.", fact: "Pixies originate from Cornwall and Devon in England. They were said to lead travellers astray — still called being 'pixy-led' in some parts of England today." },
  { word: "TROVE", def: "A collection of valuable things.", fact: "In 2009, a man in England found 3,500 Anglo-Saxon gold and silver coins with a metal detector and was awarded £3.3 million by the Crown." },
  { word: "BLISS", def: "Perfect happiness; serene joy.", fact: "'Ignorance is bliss' comes from Thomas Gray's 1742 poem. The full line is: 'Where ignorance is bliss, 'tis folly to be wise.'" },
  { word: "CRYPT", def: "An underground room or vault, especially beneath a church.", fact: "Crypts were built to hold the remains of saints, believed to have miraculous powers. The word comes from the Greek kryptós, meaning hidden." },
  { word: "DWARF", def: "A mythological small being; or a very small star.", fact: "A teaspoon of white dwarf star material would weigh about 5 tonnes on Earth. They are roughly the size of Earth but contain half the Sun's mass." },
  { word: "FLINT", def: "A hard rock that produces sparks when struck.", fact: "Flint was humanity's first tool material, used for over 2 million years. It can be knapped into blades sharper than modern surgical steel." },
  { word: "GLEAN", def: "To gather information gradually from various sources.", fact: "Gleaning originally meant collecting leftover grain after a harvest — a legal right for the poor in medieval Europe. The Book of Ruth is largely a story about gleaning." },
  { word: "IRONY", def: "Saying the opposite of what you mean; or a twist of fate.", fact: "The Titanic sinking on its maiden voyage — the 'unsinkable ship' — is situational irony at its most devastating." },
  { word: "KNACK", def: "A special skill or talent for doing something.", fact: "Knack appeared in English around 1300 meaning a clever trick, before shifting to mean natural talent. Some linguists link it to the Dutch knak — the sound of something done with precise skill." },
  { word: "MAXIM", def: "A short statement expressing a general truth.", fact: "Benjamin Franklin was history's most prolific maxim writer — Poor Richard's Almanack is essentially a maxim collection." },
  { word: "OPTIC", def: "Relating to the eye or vision.", fact: "Your optic nerve has a blind spot. Your brain fills in the gap using surrounding visual information — essentially hallucinating the missing piece." },
  { word: "PLUMB", def: "Perfectly vertical; or to measure depth.", fact: "Plumbers got their name from the Latin plumbum, meaning lead — they once worked exclusively with lead pipes." },
  { word: "QUALM", def: "An uneasy feeling of doubt or anxiety.", fact: "Qualm originally meant a sudden feeling of faintness in the 16th century. It gradually shifted from a physical sensation to a moral one." },
  { word: "RELIC", def: "An object surviving from an earlier time; often sacred.", fact: "Medieval relic trade was rife with fraud. Across Europe, churches claimed enough pieces of the True Cross to build a small house." },
  { word: "SMIRK", def: "A self-satisfied, often irritating smile.", fact: "Smirk shares its Old English root with the word smile — they originally both just meant 'to smile'. Its conceited quality developed gradually over centuries." },
  { word: "TRAWL", def: "To search thoroughly; or to fish by dragging a net.", fact: "Scientists have compared bottom trawling's impact on deep-sea coral formations to clear-cutting ancient forests." },
  { word: "ENVOY", def: "A diplomatic representative sent on a special mission.", fact: "During the Cold War, secret envoys opened back-channel negotiations between enemies who couldn't publicly acknowledge talking to each other." },
  { word: "HEFTY", def: "Large, heavy, and powerful.", fact: "Hefty only appeared in American English around the 1860s, derived from heave. Before that, you'd say 'stout', 'burly', or 'ponderous'." },
  { word: "LUSTY", def: "Full of vigour and strength.", fact: "Lusty originally just meant healthy or cheerful in Middle English. Shakespeare used it constantly in this sense." },
  { word: "NYMPH", def: "A mythological spirit of nature in female form.", fact: "Greek mythology had dozens of types of nymphs — naiads in freshwater, nereids in the sea, dryads in trees, oreads in mountains." },
  { word: "APHID", def: "A tiny insect that feeds on plant sap.", fact: "Ants actually farm aphids — protecting them from predators in exchange for the sweet honeydew they secrete." },
];

// Full Wordle-style valid-guess list (~14.8k 5-letter words).
// Source data lives in validWords.txt (github.com/tabatkins/wordle-list).
const VALID_WORDS = new Set(validWordsRaw.trim().toLowerCase().split(/\s+/))

function getDailyWord(dateStr) {
  const seedDate = dateStr ?? new Date().toLocaleDateString('en-CA')
  const seed = parseInt(seedDate.replace(/-/g, ''))
  return WORDS[seed % WORDS.length]
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

const ROWS = 6, COLS = 5;
const KEYBOARD = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

const ST = { empty:'empty', correct:'correct', present:'present', absent:'absent' };
const CLR = { empty:'#1C1A16', active:'#2C2418', correct:'#538d4e', present:'#b59f3b', absent:'#161412' };

const css = `
@keyframes shake{0%,100%{transform:translateX(0)}15%{transform:translateX(-6px)}30%{transform:translateX(6px)}45%{transform:translateX(-4px)}60%{transform:translateX(4px)}75%{transform:translateX(-2px)}90%{transform:translateX(2px)}}
@keyframes bounce{0%,100%{transform:translateY(0)}40%{transform:translateY(-10px)}}
@keyframes letterPop{0%{transform:scale(1)}50%{transform:scale(1.12)}100%{transform:scale(1)}}
@keyframes cardFlip{0%{transform:rotateY(0deg)}100%{transform:rotateY(180deg)}}
@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes confetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(130px) rotate(720deg);opacity:0}}
@keyframes copied{0%{opacity:0;transform:translateY(4px)}20%{opacity:1;transform:translateY(0)}80%{opacity:1}100%{opacity:0}}
`;

export default function WordsGame() {
  const { streak } = useStreak('words');
  const [showArchive, setShowArchive] = useState(false)
  const [puzzleDate, setPuzzleDate] = useState(null)
  const daily = useMemo(() => getDailyWord(puzzleDate), [puzzleDate])
  const [guesses, setGuesses] = useState(Array(ROWS).fill(''));
  const [current, setCurrent] = useState(0);
  const [input, setInput] = useState('');
  const [tileStates, setTileStates] = useState({});
  const [keyStates, setKeyStates] = useState({});
  const [shakeRow, setShakeRow] = useState(null);
  const [bounceRow, setBounceRow] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [message, setMessage] = useState(null);
  const [confetti, setConfetti] = useState([]);
  const [copied, setCopied] = useState(false);
  const [showFact, setShowFact] = useState(false);
  const [revealingTiles, setRevealingTiles] = useState({});

  const showMsg = (msg, dur=1800) => { setMessage(msg); setTimeout(()=>setMessage(null), dur); };

  const spawnConfetti = () => {
    const items = Array.from({length:30},(_,i)=>({
      id:i, x:20+Math.random()*60, delay:Math.random()*600,
      color:['#538d4e','#b59f3b','#C9A84C','#C9A84C','#fff'][i%5], size:5+Math.random()*8
    }));
    setConfetti(items);
    setTimeout(()=>setConfetti([]),1600);
  };

  const evaluate = useCallback((guess) => {
    const result = Array(COLS).fill(ST.absent);
    const target = daily.word.split('');
    const guessArr = guess.split('');
    const used = Array(COLS).fill(false);
    for (let i=0;i<COLS;i++) {
      if (guessArr[i]===target[i]) { result[i]=ST.correct; used[i]=true; }
    }
    for (let i=0;i<COLS;i++) {
      if (result[i]===ST.correct) continue;
      for (let j=0;j<COLS;j++) {
        if (!used[j]&&guessArr[i]===target[j]) { result[i]=ST.present; used[j]=true; break; }
      }
    }
    return result;
  }, [daily.word]);

  const submitGuess = useCallback(() => {
    if (input.length!==COLS) {
      setShakeRow(current); setTimeout(()=>setShakeRow(null),600);
      showMsg('Not enough letters'); return;
    }
    if (!VALID_WORDS.has(input.toLowerCase()) && !WORDS.some(w=>w.word===input)) {
      setShakeRow(current); setTimeout(()=>setShakeRow(null),600);
      showMsg('Not a valid word!'); return;
    }
    const result = evaluate(input);
    const rowIdx = current;
    const submittedInput = input;
    setGuesses(prev=>{const n=[...prev];n[rowIdx]=submittedInput;return n;});
    setInput('');

    result.forEach((st,colIdx)=>{
      setTimeout(()=>{
        const key=`${rowIdx}-${colIdx}`;
        setTileStates(prev=>({...prev,[key]:st}));
        setRevealingTiles(prev=>({...prev,[key]:true}));
        setTimeout(()=>setRevealingTiles(prev=>{const n={...prev};delete n[key];return n;}),800);
      }, colIdx*150);
    });

    const totalDelay = (COLS-1)*150+800;

    setTimeout(()=>{
      const newKeyStates={...keyStates};
      submittedInput.split('').forEach((ch,i)=>{
        const prev=newKeyStates[ch];
        if (result[i]===ST.correct) newKeyStates[ch]=ST.correct;
        else if (result[i]===ST.present&&prev!==ST.correct) newKeyStates[ch]=ST.present;
        else if (!prev) newKeyStates[ch]=ST.absent;
      });
      setKeyStates(newKeyStates);
      const isWin=result.every(s=>s===ST.correct);
      if (isWin) {
        setBounceRow(rowIdx); setTimeout(()=>setBounceRow(null),1000);
        saveResult({ game: 'words', completed: true });
        setTimeout(()=>{setWon(true);setGameOver(true);spawnConfetti();setShowFact(true);},400);
      } else if (rowIdx+1>=ROWS) {
        saveResult({ game: 'words', completed: false });
        setTimeout(()=>{setGameOver(true);setShowFact(true);showMsg(daily.word,3000);},200);
      } else {
        setCurrent(c=>c+1);
      }
    }, totalDelay);
  }, [input, current, keyStates, evaluate, daily.word]);

  const handleKey = useCallback((key) => {
    if (gameOver) return;
    if (key==='ENTER') { submitGuess(); return; }
    if (key==='⌫'||key==='BACKSPACE') { setInput(i=>i.slice(0,-1)); return; }
    if (/^[A-Z]$/.test(key)&&input.length<COLS) setInput(i=>i+key);
  }, [gameOver, input, submitGuess]);

  useEffect(()=>{
    const handler=(e)=>handleKey(e.key.toUpperCase());
    window.addEventListener('keydown',handler);
    return ()=>window.removeEventListener('keydown',handler);
  }, [handleKey]);

  useEffect(() => {
    if (!puzzleDate) return
    setGuesses(Array(ROWS).fill(''))
    setCurrent(0)
    setInput('')
    setTileStates({})
    setKeyStates({})
    setShakeRow(null)
    setBounceRow(null)
    setGameOver(false)
    setWon(false)
    setMessage(null)
    setConfetti([])
    setCopied(false)
    setShowFact(false)
    setRevealingTiles({})
  }, [puzzleDate])

  const getLetter=(r,c)=>{
    if (guesses[r]) return guesses[r][c]||'';
    if (r===current) return input[c]||'';
    return '';
  };

  const getTileColor=(r,c)=>{
    const st=tileStates[`${r}-${c}`];
    return st?CLR[st]:CLR.empty;
  };

  const buildShare=()=>{
    const emoji={[ST.correct]:'🟩',[ST.present]:'🟨',[ST.absent]:'⬛'};
    const rows=guesses.slice(0,won?current+1:ROWS).filter(g=>g)
      .map((_,i)=>Array.from({length:COLS},(__,j)=>emoji[tileStates[`${i}-${j}`]]||'⬛').join(''));
    const result=won?`${current+1}/${ROWS}`:'X/6';
    return `WORDS by Streakle 🔥 — ${formatDate()}\n${result}\n${rows.join('\n')}\n\nPlay at: playstreakle.com/words`;
  };

  const handleShare=async()=>{
    const text=buildShare();
    try {
      if (navigator.share) await navigator.share({text});
      else {await navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);}
    } catch {await navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);}
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',paddingTop:0,paddingBottom:32,color:'#F5F0E8',position:'relative',overflow:'hidden'}}>
      <style>{css}</style>
      <UserMenu />
      <div style={{width:'100%',display:'flex',alignItems:'center',padding:'12px 16px 0',minHeight:44}}>
        <a href="/" style={{color:'#C9A84C',textDecoration:'none',fontSize:13,fontWeight:600}}>← Back</a>
      </div>

      {confetti.map(c=>(
        <div key={c.id} style={{position:'fixed',left:`${c.x}%`,top:'28%',width:c.size,height:c.size,background:c.color,borderRadius:c.size>10?'50%':2,animation:`confetti 1.3s ${c.delay}ms ease forwards`,pointerEvents:'none',zIndex:100}}/>
      ))}

      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:2}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div style={{fontSize:32,fontWeight:900,letterSpacing:2,color:'#fff'}}>WORDS</div>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:3,color:'#C9A84C',textTransform:'uppercase',marginTop:-4}}>by Streakle</div>
        </div>
        <button onClick={()=>setShowHow(!showHow)} style={{background:'none',border:'1px solid #2C2820',borderRadius:6,color:'#C9A84C',cursor:'pointer',fontSize:13,padding:'3px 10px',marginLeft:8}}>
          How to play
        </button>
        <button onClick={() => setShowArchive(true)} style={{background:'none',border:'1px solid #2C2820',borderRadius:6,color:'#C9A84C',cursor:'pointer',fontSize:13,padding:'3px 10px'}}>
          📅 Archive
        </button>
      </div>

      <div style={{fontSize:13,color:'#7A6E5F',marginBottom:10,marginTop:6}}>{formatDate()}</div>

      {streak > 0 && (
        <div style={{fontSize:13, color:'#C9A84C', fontWeight:600, marginBottom:8}}>
          🔥 {streak} day streak
        </div>
      )}

      {showHow&&(
        <div style={{background:'#1C1A16',border:'1px solid #2C2820',borderRadius:10,padding:16,maxWidth:320,marginBottom:12,fontSize:13,lineHeight:1.65,color:'#ccc',animation:'slideUp 0.3s ease'}}>
          <b style={{color:'#C9A84C'}}>How to play</b><br/>
          Guess the 5-letter word in 6 tries.<br/><br/>
          🟩 Right letter, right spot<br/>
          🟨 Right letter, wrong spot<br/>
          ⬛ Letter not in the word<br/><br/>
          After the game, discover something fascinating about the word!
        </div>
      )}

      {message&&(
        <div style={{position:'fixed',top:80,left:'50%',transform:'translateX(-50%)',background:'#F5F0E8',borderRadius:8,padding:'8px 20px',fontSize:14,fontWeight:700,color:'#0F0E0C',zIndex:50,animation:'slideUp 0.2s ease',whiteSpace:'nowrap'}}>
          {message}
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:20}}>
        {Array.from({length:ROWS},(_,rowIdx)=>{
          const isShaking=shakeRow===rowIdx;
          const isBouncing=bounceRow===rowIdx;
          return (
            <div key={rowIdx} style={{display:'flex',gap:6,animation:isShaking?'shake 0.5s ease':'none'}}>
              {Array.from({length:COLS},(_,colIdx)=>{
                const letter=getLetter(rowIdx,colIdx);
                const tileColor=getTileColor(rowIdx,colIdx);
                const colored=tileColor!==CLR.empty;
                const revealing=!!revealingTiles[`${rowIdx}-${colIdx}`];
                return (
                  <div key={colIdx} style={{width:52,height:52,perspective:'200px',flexShrink:0,animation:isBouncing?`bounce 0.4s ${colIdx*80}ms ease`:'none'}}>
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
                        border:`2px solid ${letter?'#C9A84C':'#2C2820'}`,
                        borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:22,fontWeight:800,color:'#fff',
                        animation:letter&&!colored?'letterPop 0.1s ease':'none',
                      }}>{letter}</div>
                      <div style={{
                        position:'absolute',inset:0,
                        backfaceVisibility:'hidden',WebkitBackfaceVisibility:'hidden',
                        transform:'rotateY(180deg)',
                        background:tileColor,border:'2px solid transparent',
                        borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:22,fontWeight:800,color:'#fff',
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
        <div style={{background:'#1C1A16',border:`1px solid ${won?'#538d4e':'#2C2820'}`,borderRadius:12,padding:'16px 20px',maxWidth:340,width:'90%',marginBottom:16,animation:'slideUp 0.5s ease'}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:won?'#4caf50':'#C9A84C',textTransform:'uppercase',marginBottom:6}}>
            {won?"✅ Today's word":"❌ Today's word was"}
          </div>
          <div style={{fontSize:28,fontWeight:900,letterSpacing:3,color:'#fff',marginBottom:4}}>{daily.word}</div>
          <div style={{fontSize:13,color:'#C9A84C',fontStyle:'italic',marginBottom:10}}>{daily.def}</div>
          <div style={{fontSize:13,color:'#aaa',lineHeight:1.65}}>{daily.fact}</div>
        </div>
      )}

      {gameOver&&(
        <div style={{position:'relative',display:'inline-block',marginBottom:20}}>
          <button onClick={handleShare} style={{background:'#C9A84C',color:'#0F0E0C',border:'none',borderRadius:8,padding:'10px 28px',fontSize:15,fontWeight:700,cursor:'pointer',transition:'background 0.2s'}}
            onMouseOver={e=>e.currentTarget.style.background='#D4B45A'}
            onMouseOut={e=>e.currentTarget.style.background='#C9A84C'}>
            📋 Share result
          </button>
          {copied&&<div style={{position:'absolute',top:-32,left:'50%',transform:'translateX(-50%)',background:'#2d6a30',color:'#fff',fontSize:12,fontWeight:600,padding:'4px 12px',borderRadius:6,whiteSpace:'nowrap',animation:'copied 2s ease forwards',pointerEvents:'none'}}>Copied!</div>}
        </div>
      )}

      {!gameOver&&(
        <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'center'}}>
          {KEYBOARD.map((row,ri)=>(
            <div key={ri} style={{display:'flex',gap:5}}>
              {row.map(key=>{
                const st=keyStates[key];
                const wide=key==='ENTER'||key==='⌫';
                return (
                  <button key={key} onClick={()=>handleKey(key)} style={{
                    minWidth:wide?56:34,height:46,
                    background:st===ST.correct?CLR.correct:st===ST.present?CLR.present:st===ST.absent?CLR.absent:'#4A433A',
                    border:'none',borderRadius:6,
                    color:st===ST.absent?'#3A342E':'#fff',
                    fontSize:wide?11:14,fontWeight:700,
                    cursor:'pointer',userSelect:'none',
                    transition:'background 0.3s, color 0.3s',padding:'0 4px',
                  }}>{key}</button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div style={{marginTop:32,fontSize:12,color:'#5A5040',textAlign:'center'}}>
        <a href="/privacy" style={{color:'#5A5040',textDecoration:'none'}}>Privacy Policy / Politique de confidentialité</a>
      </div>

      {showArchive && (
        <Archive
          game="words"
          onSelectDate={(date) => setPuzzleDate(date)}
          onClose={() => setShowArchive(false)}
        />
      )}
    </div>
  );
}