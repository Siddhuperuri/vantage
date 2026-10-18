/* ------------------------------------------------------------------
   lab/solve-wall.js  -  how the wall was made.

   A development tool, not part of the piece (run it with Node; nothing
   in the site depends on it). It searches for a crossword on a cylinder
   whose spine is the name and where every other word interlocks through
   a genuinely shared letter. It scores layouts by: how many crossings,
   how many counter-bearing letters (doors) sit on crossings, how close
   the two poles of each contradiction end up (so a reaction can be seen
   in one field of view), and how horizontal the words are (tall vertical
   words read badly).

     node lab/solve-wall.js            search (about a minute), print the best
     node lab/solve-wall.js 275418     print one layout and its relations

   Seed 275418 is the layout used in js/mind-data.js.
   ------------------------------------------------------------------ */
// Crossword-on-a-cylinder solver. The name is the spine (row 0). Every other word must interlock
// through a genuinely shared letter. Objective: place all words, keep it sparse, keep contradiction
// pairs meaningfully related, spread words around, leave the far side of the ring empty.
const N = 30;                 // columns around the cylinder
const ROWS = [-5, 5];
const CMIN = 3, CMAX = 26;         // inclusive
const SPINE = 'SIDDHARTHA';
const SPINE_C0 = 10;          // spine starts here; centre of spine = col 14.5

// role: pole pairs (contradictions) and bridges
const WORDS = [
  ['DESIGN','T'], ['TECHNOLOGY','T'], ['WEB','B'],
  ['INTUITION','T'], ['SYSTEMS','T'], ['EXPERIMENTS','B'],
  ['CURIOSITY','T'], ['STRUCTURE','T'], ['GAMES','B'],
  ['IMAGINATION','T'], ['ENGINEERING','T'], ['CAMERA','B'],
  ['ART','T'], ['CODE','T'], ['MOTION','B'],
  ['AI','E'], ['3D','E'], ['IDEAS','E']
];
const PAIRS = [['DESIGN','TECHNOLOGY'],['INTUITION','SYSTEMS'],['CURIOSITY','STRUCTURE'],['IMAGINATION','ENGINEERING'],['ART','CODE']];
const BRIDGE = { 'DESIGN|TECHNOLOGY':'WEB','INTUITION|SYSTEMS':'EXPERIMENTS','CURIOSITY|STRUCTURE':'GAMES','IMAGINATION|ENGINEERING':'CAMERA','ART|CODE':'MOTION' };

function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}

function key(c,r){return ((c%N+N)%N)+','+r;}

function tryBuild(seed){
  const R = mulberry(seed);
  const grid = new Map();       // key -> {ch, words:[{w,dir,i}]}
  const placed = [];            // {text, c, r, dir:'A'|'D'}
  function canPlace(text,c,r,dir,crossKey){
    const cells=[];
    for(let i=0;i<text.length;i++){
      const cc = dir==='A'? c+i : c, rr = dir==='A'? r : r+i;
      if(rr<ROWS[0]||rr>ROWS[1]||cc<CMIN||cc>CMAX) return null;
      const k=key(cc,rr), ex=grid.get(k);
      if(ex){ if(ex.ch!==text[i]) return null; if(ex.dirs[dir]) return null; }
      cells.push([cc,rr,k]);
    }
    // ends must be free (no accidental extension)
    const bc = dir==='A'? [c-1,r]:[c,r-1], ec = dir==='A'? [c+text.length,r]:[c,r+text.length];
    if(grid.has(key(bc[0],bc[1]))||grid.has(key(ec[0],ec[1]))) return null;
    // side adjacency (soft: count violations)
    let adj=0;
    for(let i=0;i<text.length;i++){
      const [cc,rr,k]=cells[i]; if(grid.has(k)) continue; // crossing cell: fine
      const s1= dir==='A'? [cc,rr-1]:[cc-1,rr], s2= dir==='A'? [cc,rr+1]:[cc+1,rr];
      if(grid.has(key(s1[0],s1[1]))) adj++;
      if(grid.has(key(s2[0],s2[1]))) adj++;
    }
    return {cells,adj};
  }
  function commit(text,c,r,dir,pl){
    pl.cells.forEach(([cc,rr,k],i)=>{ let e=grid.get(k); if(!e){e={ch:text[i],dirs:{}};grid.set(k,e);} e.dirs[dir]=text; });
    placed.push({text,c,r,dir});
  }
  // spine
  const sp={cells:[]}; for(let i=0;i<SPINE.length;i++) sp.cells.push([SPINE_C0+i,0,key(SPINE_C0+i,0)]);
  commit(SPINE,SPINE_C0,0,'A',sp);

  const order = WORDS.map(w=>w[0]).sort(()=>R()-0.5);
  // keep bridges after their poles where possible by simple retry loop
  const remaining = new Set(order);
  let guard=0;
  while(remaining.size && guard++<200){
    let progress=false;
    for(const text of [...remaining]){
      // candidate placements crossing any placed word at a shared letter
      const cands=[];
      for(const pw of placed){
        for(let j=0;j<pw.text.length;j++){
          for(let i=0;i<text.length;i++){
            if(text[i]!==pw.text[j]) continue;
            const dir = pw.dir==='A'?'D':'A';
            const cc = pw.dir==='A'? pw.c+j : pw.c, rr = pw.dir==='A'? pw.r : pw.r+j;
            const c0 = dir==='A'? cc-i : cc, r0 = dir==='A'? rr : rr-i;
            const pl = canPlace(text,c0,r0,dir);
            if(!pl) continue;
            // must actually cross (share the cell)
            if(!pl.cells.some(([a,b,k])=>k===key(cc,rr))) continue;
            // score: fewer adjacencies, prefer rows away from spine for long across words, spread
            let score = -pl.adj*6 + R()*2;
            const span = dir==='A' ? [c0,c0+text.length-1] : [c0,c0];
            const midc = (span[0]+span[1])/2;
            // distance from the back of the ring (col 29.5-ish => opposite of spine centre 14.5 is 29.5/-0.5)
            const dBack = Math.min(Math.abs(midc-29.5), Math.abs(midc+0.5));
            score += Math.min(dBack,8)*0.4;
            // prefer longer words across, shorter down
            if(dir==='A' && text.length>=7) score+=3;
            if(dir==='D' && text.length>6) score-=14; if(dir==='D' && text.length<=6) score+=1.5;
            // weak preference for touching the spine directly for a few words
            cands.push({text,c0,r0,dir,pl,score,cross:pw.text});
          }
        }
      }
      if(!cands.length) continue;
      cands.sort((a,b)=>b.score-a.score);
      const pick = cands[Math.floor(R()*Math.min(3,cands.length))];
      commit(pick.text,pick.c0,pick.r0,pick.dir,pick.pl);
      remaining.delete(text); progress=true;
    }
    if(!progress) break;
  }
  if(remaining.size) return null;
  return {grid,placed};
}

function evaluate(sol){
  const {grid,placed}=sol;
  let crossings=0, letters=grid.size, counters=0;
  for(const [k,e] of grid){ if(Object.keys(e.dirs).length===2) crossings++; }
  let minC=1e9,maxC=-1e9,minR=1e9,maxR=-1e9;
  for(const [k,e] of grid){ const [c,r]=k.split(',').map(Number); minC=Math.min(minC,c);maxC=Math.max(maxC,c);minR=Math.min(minR,r);maxR=Math.max(maxR,r);}
  // pair relation: do contradiction pairs directly cross?
  let pairCross=0;
  for(const [a,b] of PAIRS){
    const pa=placed.find(p=>p.text===a), pb=placed.find(p=>p.text===b);
    if(!pa||!pb) continue;
    const setA=new Set(), setB=new Set();
    for(let i=0;i<pa.text.length;i++) setA.add(pa.dir==='A'?key(pa.c+i,pa.r):key(pa.c,pa.r+i));
    for(let i=0;i<pb.text.length;i++) if(setA.has(pb.dir==='A'?key(pb.c+i,pb.r):key(pb.c,pb.r+i))) pairCross++;
  }
  // counter-bearing crossing nodes (A,D,O,P,R,B)
  for(const [k,e] of grid){ if(Object.keys(e.dirs).length===2 && 'ADOPRB'.includes(e.ch)) counters++; }
  // adjacency violations total
  let adj=0;
  for(const [k,e] of grid){
    const [c,r]=k.split(',').map(Number);
    const right=grid.get(key(c+1,r)), down=grid.get(key(c,r+1));
    if(right && !(e.dirs.A && right.dirs.A && e.dirs.A===right.dirs.A)) adj++;
    if(down && !(e.dirs.D && down.dirs.D && e.dirs.D===down.dirs.D)) adj++;
  }
  // width used (cols) via circular gap: find largest empty arc
  const cols=new Set(); for(const [k] of grid) cols.add(Number(k.split(',')[0])%N);
  let maxGap=0; for(let c=0;c<N;c++){ let g=0; while(!cols.has(((c+g)%N+N)%N) && g<N) g++; maxGap=Math.max(maxGap,g); }
  let longDown=0; for(const p of placed){ if(p.dir==='D' && p.text.length>6) longDown++; }
  return {letters,crossings,counters,pairCross,adj,longDown,width:maxC-minC+1,rows:[minR,maxR]};
}


const PREF = {
  'DESIGN|TECHNOLOGY':['WEB','3D','CAMERA','AI','IDEAS'],
  'INTUITION|SYSTEMS':['EXPERIMENTS','AI','IDEAS','GAMES'],
  'CURIOSITY|STRUCTURE':['GAMES','EXPERIMENTS','IDEAS'],
  'IMAGINATION|ENGINEERING':['DESIGN','CAMERA','3D','AI'],
  'ART|CODE':['MOTION','3D','AI']
};
function crossGraph(sol){
  const {grid,placed}=sol; const adj={}; placed.forEach(p=>adj[p.text]=new Set());
  for(const [k,e] of grid){ const d=Object.values(e.dirs); if(d.length===2){ adj[d[0]].add(d[1]); adj[d[1]].add(d[0]); } }
  return adj;
}
function cellsOf(p){ const a=[]; for(let i=0;i<p.text.length;i++) a.push(p.dir==='A'?[p.c+i,p.r]:[p.c,p.r+i]); return a; }
function minDist(sol,a,b){
  const pa=sol.placed.find(p=>p.text===a), pb=sol.placed.find(p=>p.text===b); if(!pa||!pb) return 99;
  let m=99; for(const x of cellsOf(pa)) for(const y of cellsOf(pb)){ const d=Math.max(Math.abs(x[0]-y[0]),Math.abs(x[1]-y[1])); if(d<m) m=d; } return m;
}
function pairInfo(sol){
  const adj=crossGraph(sol); const out=[]; let good=0, prefHit=0, near=0;
  for(const [a,b] of PAIRS){
    const md=minDist(sol,a,b); if(md<=3) near++; else if(md<=5) near+=0.4;
    const direct=adj[a].has(b);
    const common=[...adj[a]].filter(x=>adj[b].has(x));
    const key=a+'|'+b;
    const pref=common.filter(x=>PREF[key].includes(x));
    if(direct||common.length) good++;
    if(pref.length) prefHit++;
    out.push({pair:key,direct,common,pref,md});
  }
  return {out,good,prefHit,near};
}

function show(sol){
  const {grid}=sol; let out='      '+Array.from({length:N},(_,i)=>i%10).join('')+'\n';
  for(let r=ROWS[0];r<=ROWS[1];r++){
    let line=(r<0?'':' ')+String(r).padStart(3)+'  ';
    for(let c=0;c<N;c++){ const e=grid.get(key(c,r)); line+= e? (Object.keys(e.dirs).length===2? e.ch.toLowerCase(): e.ch) : '·'; }
    out+=line+'\n';
  }
  return out;
}


if (process.argv[2]) {
  const sol = tryBuild(Number(process.argv[2]));
  if (!sol) { console.log('no valid layout for that seed'); process.exit(1); }
  console.log(show(sol));
  console.log(sol.placed.map(p => p.text + '@' + p.dir + '(' + p.c + ',' + p.r + ')').join('  '));
  const adj = crossGraph(sol);
  Object.keys(adj).forEach(k => console.log(k.padEnd(12), 'x', [...adj[k]].join(', ')));
  process.exit(0);
}
let best=null,bestScore=-1e9,tries=0; const top=[];
for(let s=1;s<=300000;s++){
  const sol=tryBuild(s); if(!sol) continue; tries++;
  const ev=evaluate(sol);
  const pi=pairInfo(sol); const score = ev.crossings*1.0 + ev.counters*3 + pi.good*5 + pi.prefHit*5 + pi.near*14 - ev.adj*5 - ev.longDown*12 - ev.letters*0.2 + (ev.width<=22?3:0); ev.pi=pi;
  if(score>bestScore){bestScore=score;best={sol,ev,seed:s};} top.push({score,sol,ev,seed:s,pi}); if(top.length>400){top.sort((a,b)=>b.score-a.score);top.length=6;}
}
top.sort((a,b)=>b.score-a.score);
for(const t of top.slice(0,3)){
  console.log('--- seed',t.seed,'score',t.score.toFixed(1),JSON.stringify(Object.assign({},t.ev,{pi:undefined})));
  console.log(t.ev.pi.out.map(o=>o.pair+': '+(o.direct?'DIRECT ':'')+'via ['+o.common.join(',')+'] dist '+o.md).join(String.fromCharCode(10)));
  console.log(show(t.sol));
}
console.log('valid layouts:',tries,'best score',bestScore.toFixed(1),'seed',best.seed);
console.log(JSON.stringify(best.ev));
console.log(show(best.sol));
console.log(best.sol.placed.map(p=>`${p.text}@${p.dir}(${p.c},${p.r})`).join('  '));
