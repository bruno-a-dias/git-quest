/* ===== Interface (parte A): estado, painéis, efeitos ===== */
(function(){
const $=id=>document.getElementById(id);
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
const SAVE='gitquest.v1';
const PROF=location.hash==='#professor';
const g=createGit();
window.GQ={g,$,el};
let S={xp:0,done:{},cur:0,id:{name:DEFAULT_ID.name,email:DEFAULT_ID.email},badges:{},combo:0,player:'',worldHints:{},sound:false};
function load(){try{const j=JSON.parse(localStorage.getItem(SAVE)||'null');if(j&&typeof j==='object')S=Object.assign(S,j);}catch(e){}}
function save(){try{localStorage.setItem(SAVE,JSON.stringify(S));}catch(e){}}
GQ.S=()=>S;GQ.save=save;GQ.load=load;GQ.setS=o=>{S=o;};GQ.PROF=PROF;

/* ---------- ranks e XP ---------- */
const TOTAL=MISSIONS.reduce((a,m)=>a+(m.type==='quiz'?50:100),0);
const RK=[0,.08,.25,.45,.7,.92].map((f,i)=>({at:Math.round(f*TOTAL),name:RANKS[i][1]}));
GQ.TOTAL=TOTAL;
function rankOf(xp){let r=0;RK.forEach((k,i)=>{if(xp>=k.at)r=i;});return r;}
GQ.rankOf=rankOf;GQ.RK=RK;
function renderHud(){
  const r=rankOf(S.xp),cur=RK[r],nx=RK[r+1];
  $('rank').textContent='';
  const sp=el('span',null,'Nível '+(r+1)+' · ');$('rank').appendChild(sp);$('rank').appendChild(document.createTextNode(cur.name));
  $('xpnow').textContent=S.xp+' XP';
  $('xpnext').textContent=nx?'próximo nível: '+nx.at+' XP':'nível máximo';
  const pct=nx?Math.max(3,Math.min(100,(S.xp-cur.at)/(nx.at-cur.at)*100)):100;
  $('xpfill').style.width=pct+'%';
  $('xpbar').setAttribute('aria-valuenow',String(Math.round(pct)));
  const cb=$('combo');if(S.combo>=2){cb.hidden=false;cb.textContent='combo x'+S.combo;}else cb.hidden=true;
  const all=MISSIONS.every((m,i)=>S.done[i]);$('btnDiploma').hidden=!all;
}
GQ.renderHud=renderHud;

/* ---------- mapa de linhas ---------- */
const maxDone=()=>Math.max(-1,...Object.keys(S.done).map(Number));
const unlocked=i=>PROF||i<=maxDone()+1;
GQ.unlocked=unlocked;
function renderMetro(){
  const box=$('metro');box.textContent='';
  WORLDS.forEach((w,wi)=>{
    const row=el('div','world');row.style.setProperty('--wc',w.c);
    const nm=el('div','wname');nm.appendChild(el('b',null,'Linha '+w.n));nm.appendChild(document.createTextNode(w.t));row.appendChild(nm);
    const st=el('div','stations');
    MISSIONS.forEach((m,i)=>{
      if(m.w!==wi)return;
      const b=el('button','st'+(m.type==='quiz'?' quiz':'')+(S.done[i]?' done':'')+(i===S.cur?' cur':'')+(unlocked(i)?'':' lock'));
      b.title=(m.type==='quiz'?'Quiz: ':'')+m.title+(unlocked(i)?'':' (bloqueada)');
      b.setAttribute('aria-label',b.title);
      if(!unlocked(i))b.disabled=true;
      b.addEventListener('click',()=>GQ.go(i));
      st.appendChild(b);
    });
    row.appendChild(st);box.appendChild(row);
  });
}
GQ.renderMetro=renderMetro;

/* ---------- conquistas ---------- */
function renderBadges(){
  const b=$('badges');b.textContent='';
  BADGES.forEach(x=>{
    const d=el('div','badge'+(S.badges[x.id]?' on':''));d.appendChild(el('b',null,x.t));d.appendChild(document.createTextNode(S.badges[x.id]?x.d:'???'));
    b.appendChild(d);
  });
}
GQ.renderBadges=renderBadges;
GQ.award=id=>{
  if(S.badges[id])return;S.badges[id]=true;save();renderBadges();
  const b=BADGES.find(x=>x.id===id);if(b){toast('Conquista: '+b.t,b.d);GQ.sfx('level');}
};
function toast(t,s){
  const d=el('div','toast');d.appendChild(el('b',null,t));d.appendChild(el('span',null,s||''));
  $('toasts').appendChild(d);setTimeout(()=>{d.style.transition='opacity .4s';d.style.opacity='0';setTimeout(()=>d.remove(),450);},4800);
}
GQ.toast=toast;

/* ---------- áreas do Git ---------- */
const prevZ={wd:new Set(),st:new Set(),repo:new Set(),rem:new Set()};
function chip(zone,name,cls,small){
  const key=name+'|'+cls+'|'+(small||'');
  const c=el('div','chip '+cls);c.title=name;c.appendChild(el('span',null,name));
  if(small)c.appendChild(el('small',null,small));
  const fresh=!prevZ[zone].has(key);if(fresh)c.classList.add('fresh');
  return {c,key};
}
function area(title,sub,zone,items,emptyTxt){
  const a=el('div','area');const h=el('h4',null,title);if(sub)h.appendChild(el('span',null,sub));a.appendChild(h);
  const box=el('div','chips');const keys=new Set();
  if(!items.length)box.appendChild(el('div','empty',emptyTxt));
  items.slice(0,9).forEach(it=>{const r=chip(zone,it.n,it.cls,it.small);keys.add(r.key);box.appendChild(r.c);});
  if(items.length>9)box.appendChild(el('div','empty','+ '+(items.length-9)+' arquivos'));
  prevZ[zone]=keys;a.appendChild(box);return a;
}
const SLBL={untracked:'novo',modified:'editado',conflict:'conflito',ignored:'ignorado',clean:'',plain:'',new:'novo',mod:'editado',del:'removido'};
function renderAreas(v){
  const box=$('areas');box.textContent='';
  const wd=v.wd.map(f=>({n:f.n,cls:f.s==='plain'?'clean':f.s,small:SLBL[f.s]}));
  box.appendChild(area('Pasta de trabalho',v.inRepo?'':'',"wd",wd,'vazia: crie arquivos com echo ou touch'));
  if(!v.inRepo){
    box.appendChild(area('Staging','','st',[],'sem repositório'));
    box.appendChild(area('Repositório local','','repo',[],'rode git init'));
    box.appendChild(area('Remoto','','rem',[],'sem remoto'));return;
  }
  box.appendChild(area('Staging','','st',v.staged.map(f=>({n:f.n,cls:f.s,small:SLBL[f.s]})),'nada preparado'));
  box.appendChild(area('Repositório local',v.branch+' · '+v.commits+(v.commits===1?' commit':' commits'),'repo',v.repoFiles.map(f=>({n:f.n,cls:'clean',small:''})),'nenhum commit ainda'));
  const rm=v.remote?v.remote.branches.map(b=>({n:b.b,cls:'rem',small:b.sha})):[];
  box.appendChild(area('Remoto',v.remote?v.remote.name:'','rem',rm,v.remote?'nada enviado ainda':'sem remoto: git remote add'));
}
GQ.renderAreas=renderAreas;

/* ---------- grafo de commits ---------- */
const NS='http://www.w3.org/2000/svg';
function S_(t,a,txt){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);if(txt!==undefined)e.textContent=txt;return e;}
const LC=['#2dd4bf','#a78bfa','#fbbf24','#fb7185','#38bdf8','#f97316','#4ade80'];
let seenNodes=new Set();
function renderGraph(v){
  const box=$('graph');box.textContent='';
  if(!v.inRepo||!v.graph||!v.graph.nodes.length){
    box.appendChild(el('div','gempty',v.inRepo?'Ainda não há commits. O primeiro aparece aqui.':'Sem repositório. Rode git init para começar o mapa.'));
    seenNodes=new Set();return;
  }
  const G=v.graph;let nodes=G.nodes;const cut=nodes.length>13;if(cut)nodes=nodes.slice(-13);
  const idx={};nodes.forEach((n,i)=>{idx[n.sha]=i;});
  const maxPills=Math.max(1,...nodes.map(n=>Math.min(3,(G.tips[n.sha]||[]).length)));
  const sx=64,padL=34,padT=26+maxPills*21,ly=48,lanes=Math.max(...nodes.map(n=>n.lane))+1;
  const W=padL*2+(nodes.length-1)*sx+30,H=padT+(lanes-1)*ly+46;
  const svg=S_('svg',{viewBox:'0 0 '+W+' '+H,width:Math.max(W,300),height:H,role:'img','aria-label':'Mapa de commits'});
  const X=i=>padL+i*sx,Y=l=>padT+l*ly;
  nodes.forEach((n,i)=>{
    n.parents.forEach((p,pi)=>{
      if(idx[p]===undefined)return;const a=nodes[idx[p]];
      const x1=X(idx[p]),y1=Y(a.lane),x2=X(i),y2=Y(n.lane);
      const col=LC[(pi===0?n.lane:a.lane)%LC.length];
      const d=y1===y2?'M'+x1+' '+y1+'L'+x2+' '+y2:'M'+x1+' '+y1+'C'+((x1+x2)/2)+' '+y1+' '+((x1+x2)/2)+' '+y2+' '+x2+' '+y2;
      svg.appendChild(S_('path',{d,stroke:col,'stroke-width':4,fill:'none','stroke-linecap':'round',opacity:.9}));
    });
  });
  if(cut)svg.appendChild(S_('text',{x:6,y:Y(0)+4,class:'gtxt'},'…'));
  const newSeen=new Set();
  nodes.forEach((n,i)=>{
    const x=X(i),y=Y(n.lane),col=LC[n.lane%LC.length];
    const grp=S_('g',{});newSeen.add(n.sha);if(!seenNodes.has(n.sha))grp.setAttribute('class','node');
    if(G.head===n.sha)grp.appendChild(S_('circle',{cx:x,cy:y,r:15,fill:'none',stroke:'#fbbf24','stroke-width':2,'stroke-dasharray':'3 3'}));
    grp.appendChild(S_('circle',{cx:x,cy:y,r:9,fill:n.merge?col:'#0a0f1e',stroke:col,'stroke-width':4}));
    if(n.merge)grp.appendChild(S_('circle',{cx:x,cy:y,r:3,fill:'#0a0f1e'}));
    const t=S_('title',{},n.sha.slice(0,7)+' · '+n.msg);grp.appendChild(t);
    grp.appendChild(S_('text',{x,y:y+28,'text-anchor':'middle',class:'gtxt'},n.sha.slice(0,7)));
    const tips=(G.tips[n.sha]||[]).slice().sort((a,b)=>(b.cur?1:0)-(a.cur?1:0)).slice(0,3);
    tips.forEach((tp,k)=>{
      const label=tp.t==='tag'?'tag '+tp.name:(tp.cur?'HEAD → '+tp.name:tp.name);
      const w=Math.min(label.length*6.1+14,118),py=y-27-k*21;
      const px=Math.max(2,Math.min(x-w/2,W-w-2));
      let fill='none',stroke=col,txt=col,dash='';
      if(tp.cur){fill=col;txt='#0a0f1e';}
      else if(tp.t==='remote'){stroke='#38bdf8';txt='#38bdf8';dash='3 2';}
      else if(tp.t==='tag'){stroke='#fbbf24';txt='#fbbf24';}
      else if(tp.t==='head'){fill='#fbbf24';stroke='#fbbf24';txt='#0a0f1e';}
      grp.appendChild(S_('rect',{x:px,y:py-11,width:w,height:17,rx:8.5,fill,stroke,'stroke-width':1.5,'stroke-dasharray':dash}));
      const tx=S_('text',{x:px+w/2,y:py+1,'text-anchor':'middle',class:'gpill',fill:txt},label.length>19?label.slice(0,18)+'…':label);
      grp.appendChild(tx);
    });
    svg.appendChild(grp);
  });
  seenNodes=newSeen;box.appendChild(svg);box.scrollLeft=box.scrollWidth;
}
GQ.renderGraph=renderGraph;

/* ---------- som e confete ---------- */
let AC=null;
GQ.sfx=function(kind){
  if(!S.sound)return;
  try{
    AC=AC||new (window.AudioContext||window.webkitAudioContext)();
    const seq={ok:[[660,.07],[880,.09]],err:[[170,.16]],win:[[523,.09],[659,.09],[784,.09],[1047,.2]],level:[[392,.09],[523,.09],[659,.09],[784,.09],[1047,.25]],tick:[[520,.03]]}[kind]||[];
    let t=AC.currentTime;
    seq.forEach(([f,d])=>{const o=AC.createOscillator(),gn=AC.createGain();o.type=kind==='err'?'sawtooth':'triangle';o.frequency.value=f;gn.gain.setValueAtTime(.06,t);gn.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(gn);gn.connect(AC.destination);o.start(t);o.stop(t+d);t+=d*.9;});
  }catch(e){}
};
let parts=[],raf=0;
GQ.confetti=function(){
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const cv=$('confetti'),cx=cv.getContext('2d');cv.width=innerWidth;cv.height=innerHeight;
  const cols=['#2dd4bf','#fbbf24','#fb7185','#a78bfa','#38bdf8','#f97316','#4ade80'];
  for(let i=0;i<130;i++)parts.push({x:innerWidth/2+(Math.random()-.5)*240,y:innerHeight*.35,vx:(Math.random()-.5)*14,vy:-Math.random()*13-3,w:6+Math.random()*7,h:4+Math.random()*5,r:Math.random()*6,vr:(Math.random()-.5)*.4,c:cols[i%cols.length],life:0});
  cancelAnimationFrame(raf);
  const step=()=>{
    cx.clearRect(0,0,cv.width,cv.height);
    parts.forEach(p=>{p.life++;p.vy+=.38;p.vx*=.992;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;cx.save();cx.translate(p.x,p.y);cx.rotate(p.r);cx.fillStyle=p.c;cx.globalAlpha=Math.max(0,1-p.life/120);cx.fillRect(-p.w/2,-p.h/2,p.w,p.h);cx.restore();});
    parts=parts.filter(p=>p.life<120&&p.y<cv.height+40);
    if(parts.length)raf=requestAnimationFrame(step);else cx.clearRect(0,0,cv.width,cv.height);
  };
  raf=requestAnimationFrame(step);
};
})();
