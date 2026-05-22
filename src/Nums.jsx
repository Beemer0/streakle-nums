import { useState, useRef, useEffect, useMemo } from "react";
import Archive from './Archive'
import UserMenu from "./UserMenu";
import { saveResult } from './saveResult';
import { useStreak } from './useStreak';
import { clickableProps } from './a11y';
import { useSeo, PAGE_SEO } from './seo';

const isActive = (r, c) => r % 2 === 0 || c % 2 === 0;

function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateSolution(rng) {
  const base = [1,2,3,4,5,6,7];
  const latin = Array.from({length:7}, (_,i) => {
    const r = [...base];
    for (let k = 0; k < i*2%7; k++) r.push(r.shift());
    return r;
  });
  const rp = seededShuffle([0,1,2,3,4,5,6], rng);
  const cp = seededShuffle([0,1,2,3,4,5,6], rng);
  return Array.from({length:7}, (_,r) => Array.from({length:7}, (_,c) => latin[rp[r]][cp[c]]));
}

function computeClues(sol) {
  const cl = {};
  for (let r = 1; r < 7; r += 2) for (let c = 1; c < 7; c += 2) {
    const nb = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].filter(([nr,nc]) => nr>=0&&nr<7&&nc>=0&&nc<7&&isActive(nr,nc));
    cl[`${r},${c}`] = { sum: nb.reduce((s,[nr,nc]) => s + sol[nr][nc], 0) };
  }
  return cl;
}

function scramble(sol, rng) {
  const flat = [];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (isActive(r,c)) flat.push([r,c]);
  const g = sol.map(r => [...r]);
  for (let sw = 0; sw < 30;) {
    const i = Math.floor(rng() * flat.length), j = Math.floor(rng() * flat.length);
    if (i !== j) {
      const [r1,c1]=flat[i],[r2,c2]=flat[j];
      const t=g[r1][c1]; g[r1][c1]=g[r2][c2]; g[r2][c2]=t; sw++;
    }
  }
  return g;
}

function formatDate(dateStr) {
  let d = new Date();
  if (dateStr) { const [y,m,day] = dateStr.split('-').map(Number); d = new Date(y, m-1, day); }
  return d.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
}

function buildShareText(swaps, solved, dateStr) {
  const used = 20 - swaps;
  const over = swaps < 0;
  const header = `NUMS by Streakle 🔥 — ${formatDate(dateStr)}`;
  const result = solved
    ? over ? `Solved in ${used} swaps (${Math.abs(swaps)} over budget)`
           : `Solved in ${used} swap${used!==1?'s':''}! ${swaps} remaining`
    : `Still solving today's puzzle`;
  const stars = solved ? '⭐'.repeat(Math.max(0, swaps)) || '—' : '🔥';
  return `${header}\n${result}\n${stars}\n\nPlay at: playstreakle.com`;
}

const CS = 44, GAP = 4, TOTAL = CS + GAP;

const css = `
@keyframes ripple{0%{transform:scale(0.5);opacity:.8}100%{transform:scale(2.4);opacity:0}}
@keyframes correctPulse{0%{transform:scale(1)}50%{transform:scale(1.18)}100%{transform:scale(1)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes starPop{0%{transform:scale(0) rotate(-20deg);opacity:0}60%{transform:scale(1.3) rotate(5deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
@keyframes confetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(130px) rotate(720deg);opacity:0}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes copied{0%{opacity:0;transform:translateY(4px)}20%{opacity:1;transform:translateY(0)}80%{opacity:1}100%{opacity:0}}
@keyframes dropPulse{0%{transform:scale(1)}50%{transform:scale(1.08)}100%{transform:scale(1)}}
`;

export default function App() {
  const { streak } = useStreak('nums');
  useSeo(PAGE_SEO.nums)
  const [showArchive, setShowArchive] = useState(false)
  const [puzzleDate, setPuzzleDate] = useState(null)

  const pz = useMemo(() => {
    const seedDate = puzzleDate ?? new Date().toLocaleDateString('en-CA')
    const seed = parseInt(seedDate.replace(/-/g, ''))
    const rng = mulberry32(seed)
    const sol = generateSolution(rng)
    return { sol, cl: computeClues(sol), sc: scramble(sol, rng) }
  }, [puzzleDate])

  const [board, setBoard] = useState(() => pz.sc.map(r => [...r]));
  const [sel, setSel] = useState(null);
  const [swaps, setSwaps] = useState(20);
  const [solved, setSolved] = useState(false);
  const [showHow, setShowHow] = useState(false);
  const [starsAnim, setStarsAnim] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const [cellAnim, setCellAnim] = useState({});
  const [flyingTiles, setFlyingTiles] = useState([]);
  const [swapping, setSwapping] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(null); // [r,c] being hovered
  const [dragging, setDragging] = useState(null); // [r,c] being dragged
  const animIdRef = useRef(0);

  useEffect(() => {
    if (!puzzleDate) return
    setBoard(pz.sc.map(r => [...r]))
    setSwaps(20)
    setSolved(false)
    setSel(null)
    setStarsAnim(false)
    setConfetti([])
    setCellAnim({})
    setFlyingTiles([])
    setSwapping(false)
    setCopied(false)
    setDragOver(null)
    setDragging(null)
  }, [puzzleDate])

  const triggerCellAnim = (keys, name, dur=500) => {
    setCellAnim(a => { const n={...a}; keys.forEach(k=>n[k]=name); return n; });
    setTimeout(() => setCellAnim(a => { const n={...a}; keys.forEach(k=>delete n[k]); return n; }), dur);
  };

  const isSolved = b => {
    for (let r=0;r<7;r++) for (let c=0;c<7;c++)
      if (isActive(r,c) && b[r][c]!==pz.sol[r][c]) return false;
    return true;
  };

  const spawnConfetti = () => {
    const items = Array.from({length:30},(_,i)=>({
      id:i, x:20+Math.random()*60, delay:Math.random()*700,
      color:['#4caf50','#C9A84C','#C9A84C','#e94560','#ffd700','#fff'][i%6],
      size:5+Math.random()*8
    }));
    setConfetti(items);
    setTimeout(()=>setConfetti([]),1600);
  };

  const doSwap = (r1, c1, r2, c2) => {
    if (swapping) return;
    const id1=++animIdRef.current, id2=++animIdRef.current;
    setFlyingTiles([
      {id:id1, num:board[r1][c1], fr:r1, fc:c1, tr:r2, tc:c2},
      {id:id2, num:board[r2][c2], fr:r2, fc:c2, tr:r1, tc:c1},
    ]);
    setSwapping(true);
    setSel(null);
    setDragging(null);
    setDragOver(null);

    setTimeout(() => {
      const nb = board.map(row=>[...row]);
      const tmp=nb[r1][c1]; nb[r1][c1]=nb[r2][c2]; nb[r2][c2]=tmp;
      const newSwaps = swaps - 1;
      setBoard(nb);
      setFlyingTiles([]);
      setSwapping(false);
      setSwaps(newSwaps);

      const corrKeys=[];
      [[r1,c1],[r2,c2]].forEach(([cr,cc])=>{
        if (nb[cr][cc]===pz.sol[cr][cc]) corrKeys.push(`${cr},${cc}`);
      });
      if (corrKeys.length) triggerCellAnim(corrKeys,'correctPulse',600);

      if (isSolved(nb)) {
        setSolved(true);
        saveResult({ game: 'nums', completed: true, swaps_used: 20 - newSwaps });
        setTimeout(()=>{ spawnConfetti(); setStarsAnim(true); },100);
      }
    }, 380);
  };

  // Click to swap
  const handleClick = (r, c) => {
    if (!isActive(r,c) || swapping || dragging) return;
    if (!sel) {
      setSel([r,c]);
    } else {
      const [pr,pc] = sel;
      if (pr===r && pc===c) { setSel(null); return; }
      doSwap(pr, pc, r, c);
    }
  };

  // Drag handlers
  const handleDragStart = (e, r, c) => {
    if (!isActive(r,c) || swapping) return;
    const isCorr = board[r][c] === pz.sol[r][c];
    if (isCorr) { e.preventDefault(); return; } // locked
    setDragging([r,c]);
    setSel(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${r},${c}`);
    // Create a clean custom drag image (no barred circle)
    const ghost = document.createElement('div');
    ghost.textContent = board[r][c];
    Object.assign(ghost.style, {
      width:`${CS}px`, height:`${CS}px`,
      background:'#2C1F00', border:'2px solid #C9A84C',
      borderRadius:'8px', display:'flex', alignItems:'center',
      justifyContent:'center', fontSize:'20px', fontWeight:'700',
      color:'#fff', position:'fixed', top:'-200px', left:'-200px',
      boxShadow:'0 4px 20px #C9A84C66',
    });
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, CS/2, CS/2);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDragOver = (e, r, c) => {
    if (!isActive(r,c) || !dragging) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver([r,c]);
  };

  const handleDragLeave = () => setDragOver(null);

  const handleDrop = (e, r, c) => {
    e.preventDefault();
    if (!dragging || !isActive(r,c)) { setDragging(null); setDragOver(null); return; }
    const isCorr = board[r][c] === pz.sol[r][c];
    if (isCorr) { setDragging(null); setDragOver(null); return; } // can't drop on locked cell
    const [dr, dc] = dragging;
    if (dr===r && dc===c) { setDragging(null); setDragOver(null); return; }
    doSwap(dr, dc, r, c);
  };

  const handleDragEnd = () => { setDragging(null); setDragOver(null); };

  const handleShare = async () => {
    const text = buildShareText(swaps, solved, puzzleDate);
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000); }
    } catch { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000); }
  };

  const gSize = 7*TOTAL - GAP;
  const starCount = Math.max(0, swaps);

  const cells = [];
  for (let r=0;r<7;r++) for (let c=0;c<7;c++) {
    const x=c*TOTAL, y=r*TOTAL, key=`${r},${c}`;
    const isSel = sel&&sel[0]===r&&sel[1]===c;
    const isDragging = dragging&&dragging[0]===r&&dragging[1]===c;
    const isDragOver = dragOver&&dragOver[0]===r&&dragOver[1]===c;
    const isFlying = flyingTiles.some(f=>f.fr===r&&f.fc===c);
    const isCorr = board[r][c]===pz.sol[r][c];
    const an = cellAnim[key];

    if (isActive(r,c)) {
      let bg='#1C1A16', border='#2C2820', color='#e0e0e0';
      if (isCorr)     { bg='#2d6a30'; border='#4caf50'; color='#fff'; }
      if (isSel)      { bg='#2C1F00'; border='#C9A84C'; color='#fff'; }
      if (isDragging) { bg='#1a1200'; border='#C9A84C'; color='#fff'; }
      if (isDragOver) { bg='#1a3a6a'; border='#4a9eff'; color='#fff'; }

      cells.push(
        <div key={key}
          {...clickableProps(()=>handleClick(r,c), swapping||isCorr)}
          draggable={!swapping}
          onDragStart={e=>handleDragStart(e,r,c)}
          onDragOver={e=>handleDragOver(e,r,c)}
          onDragLeave={handleDragLeave}
          onDrop={e=>handleDrop(e,r,c)}
          onDragEnd={handleDragEnd}
          style={{
            position:'absolute', left:x, top:y, width:CS, height:CS,
            background:bg, border:`2px solid ${border}`, borderRadius:8,
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor: swapping ? 'default' : isCorr ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
            fontSize:20, fontWeight:700, color, userSelect:'none',
            transition:'background 0.15s, border-color 0.15s, transform 0.15s',
            animation: an ? `${an} ${an==='correctPulse'?'0.55s':'0.45s'} ease` : 'none',
            opacity: isFlying ? 0 : isDragging ? 0.5 : 1,
            transform: isDragOver ? 'scale(1.08)' : 'scale(1)',
            overflow:'hidden',
            boxShadow: isDragOver ? '0 0 0 3px #4a9eff44' : isSel ? '0 0 0 3px #C9A84C44' : 'none',
          }}>
          {board[r][c]}
          {isSel&&<div style={{position:'absolute',inset:0,borderRadius:6,border:'2px solid #C9A84C',animation:'ripple 0.5s ease forwards',pointerEvents:'none'}}/>}
          {isDragOver&&<div style={{position:'absolute',inset:0,borderRadius:6,border:'2px solid #4a9eff',animation:'ripple 0.5s ease forwards',pointerEvents:'none'}}/>}
        </div>
      );
    } else if (r%2===1&&c%2===1) {
      const cl=pz.cl[key];
      cells.push(
        <div key={key}
          onDragOver={e=>e.preventDefault()}
          style={{
            position:'absolute', left:x+2, top:y+2, width:CS-4, height:CS-4,
            background:'#1C1A16', border:'1.5px solid #2C2820', borderRadius:'50%',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:12, fontWeight:600, color:'#C9A84C', userSelect:'none',
          }}>{cl?.sum}</div>
      );
    }
  }

  return (
    <main style={{minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', paddingTop:0, position:'relative', color:'#F5F0E8', overflow:'hidden'}}>
      <style>{css}</style>

      {confetti.map(c=>(
        <div key={c.id} style={{position:'fixed',left:`${c.x}%`,top:'28%',width:c.size,height:c.size,background:c.color,borderRadius:c.size>10?'50%':2,animation:`confetti 1.3s ${c.delay}ms ease forwards`,pointerEvents:'none',zIndex:100}}/>
      ))}

      <UserMenu />
      <div style={{width:'100%',display:'flex',alignItems:'center',padding:'12px 16px 0',minHeight:44}}>
        <a href="/" style={{color:'#C9A84C',textDecoration:'none',fontSize:13,fontWeight:600}}>← Back</a>
      </div>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:2}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
          <h1 style={{fontSize:32,fontWeight:900,letterSpacing:2,color:'#fff',margin:0}}>NUMS</h1>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:3,color:'#C9A84C',textTransform:'uppercase',marginTop:-4}}>by Streakle</div>
        </div>
        <button onClick={()=>setShowHow(!showHow)} style={{background:'none',border:'1px solid #2C2820',borderRadius:6,color:'#C9A84C',cursor:'pointer',fontSize:13,padding:'3px 10px',marginLeft:8}}>
          How to play
        </button>
        <button onClick={() => setShowArchive(true)} style={{background:'none',border:'1px solid #2C2820',borderRadius:6,color:'#C9A84C',cursor:'pointer',fontSize:13,padding:'3px 10px'}}>
          📅 Archive
        </button>
      </div>

      <div style={{fontSize:13,color:'#7A6E5F',marginBottom:10,marginTop:6}}>{formatDate(puzzleDate)}</div>

      {showHow&&(
        <div style={{background:'#1C1A16',border:'1px solid #2C2820',borderRadius:10,padding:16,maxWidth:340,marginBottom:12,fontSize:13,lineHeight:1.65,color:'#ccc',animation:'slideUp 0.3s ease'}}>
          <b style={{color:'#C9A84C'}}>How to play</b><br/>
          Rearrange numbers so every <b>row</b> and <b>column</b> contains <b>1–7</b> once each.<br/><br/>
          <b>Tap</b> a cell to select then tap another to swap — or <b>drag</b> a tile directly onto another. 🟢 Green = correct position.<br/><br/>
          Circles show the <b>sum</b> of the 4 surrounding numbers — use them as clues!<br/><br/>
          You start with 20 swaps. Going over counts against you — but you can always finish!
        </div>
      )}

      <div style={{marginBottom:14,fontSize:15,fontWeight:600,transition:'color 0.4s',
        color: solved?'#4caf50': swaps<0?'#e94560': swaps<=5?'#C9A84C':'#C9A84C'}}>
        {solved
          ? swaps>=0 ? `Solved with ${swaps} swap${swaps!==1?'s':''} to spare!` : `Solved — ${Math.abs(swaps)} over budget`
          : swaps>=0 ? `${swaps} swap${swaps!==1?'s':''} remaining`
                     : `${Math.abs(swaps)} swap${Math.abs(swaps)!==1?'s':''} over budget`
        }
      </div>

      {streak > 0 && (
        <div style={{fontSize:13, color:'#C9A84C', fontWeight:600, marginBottom:8}}>
          🔥 {streak} day streak
        </div>
      )}

      <div onDragOver={e=>e.preventDefault()} style={{position:'relative',width:gSize,height:gSize,marginBottom:20,flexShrink:0}}>
        {cells}
        {flyingTiles.map(f=><FlyingTile key={f.id} {...f} cs={CS} total={TOTAL}/>)}
      </div>

      {solved&&(
        <div style={{textAlign:'center',animation:'slideUp 0.5s ease'}}>
          <div style={{fontSize:22,fontWeight:700,color:'#4caf50',marginBottom:6}}>🎉 Solved!</div>
          {starCount>0&&(
            <div style={{display:'flex',gap:6,justifyContent:'center',marginBottom:8}}>
              {Array.from({length:starCount},(_,i)=>(
                <span key={i} style={{fontSize:22,color:'#ffd700',animation:starsAnim?`starPop 0.4s ${i*100}ms both ease`:'none'}}>★</span>
              ))}
            </div>
          )}
          <div style={{fontSize:13,color:'#aaa',marginBottom:16}}>
            {20-swaps} swap{20-swaps!==1?'s':''} used{swaps<0?` (${Math.abs(swaps)} over budget)`:''}
          </div>
          <div style={{position:'relative',display:'inline-block'}}>
            <button onClick={handleShare} style={{background:'#C9A84C',color:'#0F0E0C',border:'none',borderRadius:8,padding:'10px 28px',fontSize:15,fontWeight:700,cursor:'pointer',transition:'background 0.2s'}}
              onMouseOver={e=>e.currentTarget.style.background='#D4B45A'}
              onMouseOut={e=>e.currentTarget.style.background='#C9A84C'}>
              📋 Share result
            </button>
            {copied&&<div style={{position:'absolute',top:-32,left:'50%',transform:'translateX(-50%)',background:'#2d6a30',color:'#fff',fontSize:12,fontWeight:600,padding:'4px 12px',borderRadius:6,whiteSpace:'nowrap',animation:'copied 2s ease forwards',pointerEvents:'none'}}>Copied!</div>}
          </div>
        </div>
      )}

      {!solved&&swaps<0&&(
        <div style={{position:'relative',display:'inline-block',marginTop:4}}>
          <button onClick={handleShare} style={{background:'#1C1A16',color:'#C9A84C',border:'1px solid #2C2820',borderRadius:8,padding:'8px 20px',fontSize:13,fontWeight:600,cursor:'pointer'}}>
            📋 Share progress
          </button>
          {copied&&<div style={{position:'absolute',top:-32,left:'50%',transform:'translateX(-50%)',background:'#2d6a30',color:'#fff',fontSize:12,fontWeight:600,padding:'4px 12px',borderRadius:6,whiteSpace:'nowrap',animation:'copied 2s ease forwards',pointerEvents:'none'}}>Copied!</div>}
        </div>
      )}

      {!solved&&sel&&!dragging&&(
        <div style={{fontSize:13,color:'#aaa',marginTop:8,animation:'fadeIn 0.3s ease'}}>
          Selected <b style={{color:'#C9A84C'}}>{board[sel[0]][sel[1]]}</b> — tap another or drag to swap
        </div>
      )}

      <div style={{marginTop:32,fontSize:12,color:'#5A5040',textAlign:'center'}}>
        <a href="/privacy" style={{color:'#5A5040',textDecoration:'none'}}>Privacy Policy / Politique de confidentialité</a>
      </div>

      {showArchive && (
        <Archive
          game="nums"
          onSelectDate={(date) => setPuzzleDate(date)}
          onClose={() => setShowArchive(false)}
        />
      )}
    </main>
  );
}

function FlyingTile({num, fr, fc, tr, tc, cs, total}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const fromX=fc*total, fromY=fr*total, toX=tc*total, toY=tr*total;
    const dx=toX-fromX, dy=toY-fromY, dist=Math.sqrt(dx*dx+dy*dy);
    const mx=(fromX+toX)/2, my=(fromY+toY)/2;
    const perp = dist>0 ? {x:-dy/dist, y:dx/dist} : {x:0, y:-1};
    const arc = Math.min(dist*0.35, 60);
    el.animate([
      {transform:`translate(${fromX}px,${fromY}px) scale(1)`,    opacity:1, offset:0},
      {transform:`translate(${mx+perp.x*arc}px,${my+perp.y*arc}px) scale(1.22)`, opacity:1, offset:0.45},
      {transform:`translate(${toX}px,${toY}px) scale(1)`,         opacity:1, offset:1},
    ], {duration:380, easing:'ease-in-out', fill:'forwards'});
  }, []);

  return (
    <div ref={ref} style={{
      position:'absolute', left:0, top:0, width:cs, height:cs,
      background:'#2C1F00', border:'2px solid #C9A84C', borderRadius:8,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:20, fontWeight:700, color:'#fff',
      pointerEvents:'none', zIndex:10,
      boxShadow:'0 4px 20px #C9A84C66', willChange:'transform',
    }}>{num}</div>
  );
}