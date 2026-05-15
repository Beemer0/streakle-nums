import { useState, useRef, useEffect } from "react";

const isActive = (r, c) => r % 2 === 0 || c % 2 === 0;

// Seeded RNG (mulberry32)
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function dateToSeed() {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
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
      const t=g[r1][c1]; g[r1][c1]=g[r2][c2]; g[r2][c2]=t;
      sw++;
    }
  }
  return g;
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' });
}

function buildShareText(swaps, solved) {
  const used = 20 - swaps;
  const over = swaps < 0;
  const header = `🧇 Number Waffle — ${formatDate()}`;
  const result = solved
    ? over
      ? `Solved in ${used} swaps (${Math.abs(swaps)} over budget)`
      : `Solved in ${used} swap${used!==1?'s':''}! ${swaps} remaining`
    : `Could not solve today's puzzle`;
  const stars = solved ? '⭐'.repeat(Math.max(0, swaps)) || '—' : '💀';
  return `${header}\n${result}\n${stars}\n\nPlay at: [playstreakle.com]`;
}

const CS = 44, GAP = 4, TOTAL = CS + GAP;

const css = `
@keyframes ripple{0%{transform:scale(0.5);opacity:.8}100%{transform:scale(2.4);opacity:0}}
@keyframes correctPulse{0%{transform:scale(1)}50%{transform:scale(1.15)}100%{transform:scale(1)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes starPop{0%{transform:scale(0) rotate(-20deg);opacity:0}60%{transform:scale(1.3) rotate(5deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
@keyframes confetti{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(130px) rotate(720deg);opacity:0}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes copied{0%{opacity:0;transform:translateY(4px)}20%{opacity:1;transform:translateY(0)}80%{opacity:1}100%{opacity:0}}
`;

export default function App() {
  const [pz] = useState(() => {
    const rng = mulberry32(dateToSeed());
    const sol = generateSolution(rng);
    return { sol, cl: computeClues(sol), sc: scramble(sol, rng) };
  });

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
  const animIdRef = useRef(0);

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
      color:['#4caf50','#f5a623','#aaaaff','#e94560','#ffd700','#fff'][i%6],
      size:5+Math.random()*8
    }));
    setConfetti(items);
    setTimeout(()=>setConfetti([]),1600);
  };

  const handleShare = async () => {
          const text = buildShareText(swaps, solved).replace('🧇 Number Waffle', 'NUMS by Streakle 🔥');
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(()=>setCopied(false), 2000);
      }
    } catch(e) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(()=>setCopied(false), 2000);
    }
  };

  const handleClick = (r, c) => {
    if (!isActive(r,c) || swapping) return;
    if (!sel) {
      setSel([r,c]);
    } else {
      const [pr,pc] = sel;
      if (pr===r && pc===c) { setSel(null); return; }

      const id1=++animIdRef.current, id2=++animIdRef.current;
      setFlyingTiles([
        {id:id1, num:board[pr][pc], fr:pr, fc:pc, tr:r,  tc:c },
        {id:id2, num:board[r][c],   fr:r,  fc:c,  tr:pr, tc:pc},
      ]);
      setSwapping(true);
      setSel(null);

      setTimeout(()=>{
        const nb = board.map(row=>[...row]);
        const tmp=nb[pr][pc]; nb[pr][pc]=nb[r][c]; nb[r][c]=tmp;
        const newSwaps = swaps - 1;
        setBoard(nb);
        setFlyingTiles([]);
        setSwapping(false);
        setSwaps(newSwaps);

        const corrKeys=[];
        [[pr,pc],[r,c]].forEach(([cr,cc])=>{
          if (nb[cr][cc]===pz.sol[cr][cc]) corrKeys.push(`${cr},${cc}`);
        });
        if (corrKeys.length) triggerCellAnim(corrKeys,'correctPulse',600);

        if (isSolved(nb)) {
          setSolved(true);
          setTimeout(()=>{ spawnConfetti(); setStarsAnim(true); },100);
        }
      }, 380);
    }
  };

  const gSize = 7*TOTAL - GAP;
  const starCount = Math.max(0, swaps);

  const cells = [];
  for (let r=0;r<7;r++) for (let c=0;c<7;c++) {
    const x=c*TOTAL, y=r*TOTAL, key=`${r},${c}`;
    const isSel=sel&&sel[0]===r&&sel[1]===c;
    const isFlying=flyingTiles.some(f=>f.fr===r&&f.fc===c);
    const isCorr=board[r][c]===pz.sol[r][c];
    const an=cellAnim[key];

    if (isActive(r,c)) {
      let bg='#16213e', border='#0f3460', color='#e0e0e0';
      if (isCorr) { bg='#2d6a30'; border='#4caf50'; color='#fff'; }
      if (isSel)  { bg='#7a4d00'; border='#f5a623'; color='#fff'; }
      cells.push(
        <div key={key} onClick={()=>handleClick(r,c)} style={{
          position:'absolute', left:x, top:y, width:CS, height:CS,
          background:bg, border:`2px solid ${border}`, borderRadius:8,
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:swapping?'default':'pointer',
          fontSize:20, fontWeight:700, color, userSelect:'none',
          transition:'background 0.2s, border-color 0.2s',
          animation: an?`${an} ${an==='correctPulse'?'0.55s':'0.45s'} ease`:'none',
          opacity: isFlying?0:1, overflow:'hidden',
        }}>
          {board[r][c]}
          {isSel&&<div style={{position:'absolute',inset:0,borderRadius:6,border:'2px solid #f5a623',animation:'ripple 0.5s ease forwards',pointerEvents:'none'}}/>}
        </div>
      );
    } else if (r%2===1&&c%2===1) {
      const cl=pz.cl[key];
      cells.push(
        <div key={key} style={{
          position:'absolute', left:x+2, top:y+2, width:CS-4, height:CS-4,
          background:'#2a2a4a', border:'1.5px solid #4a4a8a', borderRadius:'50%',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:12, fontWeight:600, color:'#aaaaff', userSelect:'none',
        }}>{cl?.sum}</div>
      );
    }
  }

  return (
    <div style={{minHeight:'100vh', background:'#1a1a2e', display:'flex', flexDirection:'column', alignItems:'center', paddingTop:24, fontFamily:"'Segoe UI',sans-serif", color:'#e0e0e0', position:'relative', overflow:'hidden'}}>
      <style>{css}</style>

      {confetti.map(c=>(
        <div key={c.id} style={{position:'fixed',left:`${c.x}%`,top:'28%',width:c.size,height:c.size,background:c.color,borderRadius:c.size>10?'50%':2,animation:`confetti 1.3s ${c.delay}ms ease forwards`,pointerEvents:'none',zIndex:100}}/>
      ))}

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:2}}>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div style={{fontSize:32,fontWeight:900,letterSpacing:2,color:'#fff'}}>NUMS</div>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:3,color:'#f5a623',textTransform:'uppercase',marginTop:-4}}>by Streakle</div>
        </div>
        <button onClick={()=>setShowHow(!showHow)} style={{background:'none',border:'1px solid #4a4a8a',borderRadius:6,color:'#aaaaff',cursor:'pointer',fontSize:13,padding:'3px 10px',marginLeft:8}}>
          How to play
        </button>
      </div>

      {/* Date */}
      <div style={{fontSize:13,color:'#6666aa',marginBottom:10,marginTop:6}}>{formatDate()}</div>

      {showHow&&(
        <div style={{background:'#0f1535',border:'1px solid #4a4a8a',borderRadius:10,padding:16,maxWidth:340,marginBottom:12,fontSize:13,lineHeight:1.65,color:'#ccc',animation:'slideUp 0.3s ease'}}>
          <b style={{color:'#aaaaff'}}>How to play</b><br/>
          Rearrange numbers so every <b>row</b> and <b>column</b> contains <b>1–7</b> once each.<br/><br/>
          Tap a cell to select, tap another to swap. 🟢 Green = correct position.<br/><br/>
          Circles show the <b>sum</b> of the 4 surrounding numbers — use them as clues!<br/><br/>
          You start with 20 swaps. Going over counts against you — but you can always finish!
        </div>
      )}

      {/* Swap counter */}
      <div style={{marginBottom:14,fontSize:15,fontWeight:600,transition:'color 0.4s',
        color: solved?'#4caf50': swaps<0?'#e94560': swaps<=5?'#f5a623':'#aaaaff'}}>
        {solved
          ? swaps>=0 ? `Solved with ${swaps} swap${swaps!==1?'s':''} to spare!` : `Solved — ${Math.abs(swaps)} over budget`
          : swaps>=0 ? `${swaps} swap${swaps!==1?'s':''} remaining`
                     : `${Math.abs(swaps)} swap${Math.abs(swaps)!==1?'s':''} over budget`
        }
      </div>

      {/* Grid */}
      <div style={{position:'relative',width:gSize,height:gSize,marginBottom:20,flexShrink:0}}>
        {cells}
        {flyingTiles.map(f=><FlyingTile key={f.id} {...f} cs={CS} total={TOTAL}/>)}
      </div>

      {/* Win panel */}
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

          {/* Share button */}
          <div style={{position:'relative',display:'inline-block'}}>
            <button onClick={handleShare} style={{
              background:'#4a4a8a',color:'#fff',border:'none',borderRadius:8,
              padding:'10px 28px',fontSize:15,fontWeight:700,cursor:'pointer',
              transition:'transform 0.15s, background 0.2s',
            }}
              onMouseOver={e=>e.currentTarget.style.background='#6666bb'}
              onMouseOut={e=>e.currentTarget.style.background='#4a4a8a'}>
              📋 Share result
            </button>
            {copied&&(
              <div style={{position:'absolute',top:-32,left:'50%',transform:'translateX(-50%)',background:'#2d6a30',color:'#fff',fontSize:12,fontWeight:600,padding:'4px 12px',borderRadius:6,whiteSpace:'nowrap',animation:'copied 2s ease forwards',pointerEvents:'none'}}>
                Copied to clipboard!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share anytime (after budget exceeded) */}
      {!solved&&swaps<0&&(
        <div style={{position:'relative',display:'inline-block',marginTop:4}}>
          <button onClick={handleShare} style={{
            background:'#2a2a4a',color:'#aaaaff',border:'1px solid #4a4a8a',borderRadius:8,
            padding:'8px 20px',fontSize:13,fontWeight:600,cursor:'pointer',
          }}>📋 Share progress</button>
          {copied&&(
            <div style={{position:'absolute',top:-32,left:'50%',transform:'translateX(-50%)',background:'#2d6a30',color:'#fff',fontSize:12,fontWeight:600,padding:'4px 12px',borderRadius:6,whiteSpace:'nowrap',animation:'copied 2s ease forwards',pointerEvents:'none'}}>
              Copied!
            </div>
          )}
        </div>
      )}

      {!solved&&sel&&(
        <div style={{fontSize:13,color:'#aaa',marginTop:8,animation:'fadeIn 0.3s ease'}}>
          Selected <b style={{color:'#f5a623'}}>{board[sel[0]][sel[1]]}</b> — tap another cell to swap
        </div>
      )}
    </div>
  );
}

function FlyingTile({num,fr,fc,tr,tc,cs,total}) {
  const ref=useRef(null);
  useEffect(()=>{
    const el=ref.current; if(!el) return;
    const fromX=fc*total,fromY=fr*total,toX=tc*total,toY=tr*total;
    const dx=toX-fromX,dy=toY-fromY,dist=Math.sqrt(dx*dx+dy*dy);
    const mx=(fromX+toX)/2,my=(fromY+toY)/2;
    const perp=dist>0?{x:-dy/dist,y:dx/dist}:{x:0,y:-1};
    const arc=Math.min(dist*0.35,60);
    el.animate([
      {transform:`translate(${fromX}px,${fromY}px) scale(1)`,opacity:1,offset:0},
      {transform:`translate(${mx+perp.x*arc}px,${my+perp.y*arc}px) scale(1.22)`,opacity:1,offset:0.45},
      {transform:`translate(${toX}px,${toY}px) scale(1)`,opacity:1,offset:1},
    ],{duration:380,easing:'ease-in-out',fill:'forwards'});
  },[]);
  return (
    <div ref={ref} style={{position:'absolute',left:0,top:0,width:cs,height:cs,background:'#7a4d00',border:'2px solid #f5a623',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:'#fff',pointerEvents:'none',zIndex:10,boxShadow:'0 4px 20px #f5a62366',willChange:'transform'}}>
      {num}
    </div>
  );
}