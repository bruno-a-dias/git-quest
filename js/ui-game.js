/* ===== Interface (parte B): terminal, missões, diploma ===== */
(function(){
const {g,$,el}=GQ;
let M=null,ctx=null,quizTries=0,hintsShown=0,winInfo=null,qstate={wrong:[],right:-1};
const LM=()=>I18N.m(MISSIONS.indexOf(M));
const hist=[];let hpos=0;
const tb=$('termbody'),inp=$('cmd');

/* ---------- terminal ---------- */
function printLines(out){
  out.forEach(line=>{
    const d=el('div','ln');
    if(!line.length)d.textContent=' ';
    line.forEach(([c,t])=>{const s=document.createElement('span');if(c)s.className='t-'+c;s.textContent=t;d.appendChild(s);});
    tb.appendChild(d);
  });
  tb.scrollTop=tb.scrollHeight;
}
function printText(txt,cls){printLines([[[cls||'',txt]]]);}
function promptParts(){
  const v=g.view();return {path:v.cwd,br:v.inRepo?' ('+v.branch+')':''};
}
function setPrompt(){
  const p=promptParts(),pr=$('prompt');pr.textContent='';
  pr.appendChild(el('span','p-path',p.path));if(p.br)pr.appendChild(el('span','p-br',p.br));pr.appendChild(el('span','p-dol',' $'));
  $('termpath').textContent='aluno@gitquest '+p.path;
}
function echoCmd(cmd){
  const p=promptParts(),d=el('div','ln cmdline');
  d.appendChild(el('span','p-path',p.path));if(p.br)d.appendChild(el('span','p-br',p.br));
  d.appendChild(el('span','p-dol',' $ '));d.appendChild(document.createTextNode(cmd));tb.appendChild(d);
}
function refresh(){const v=g.view();GQ.renderAreas(v);GQ.renderGraph(v);setPrompt();}

function submit(raw){
  const cmd=raw.trim();
  if(cmd){hist.push(cmd);}hpos=hist.length;
  echoCmd(cmd);
  if(!cmd){tb.scrollTop=tb.scrollHeight;return;}
  if(cmd==='clear'){tb.textContent='';refresh();return;}
  let res;
  if(M&&M.type!=='quiz'&&ctx)res=stepMission(g,M,ctx,cmd);else res=g.run(cmd);
  printLines(res.out);
  GQ.sfx(res.err?'err':'tick');
  refresh();
  if(M&&M.type!=='quiz'&&ctx){
    const st=goalStates(g,M,ctx);updateGoals(st);
    if(!ctx.done&&st.length&&st.every(Boolean))complete();
  }
}
inp.addEventListener('keydown',e=>{
  if(e.key==='Enter'){const v=inp.value;inp.value='';submit(v);}
  else if(e.key==='ArrowUp'){if(hist.length){e.preventDefault();hpos=Math.max(0,hpos-1);inp.value=hist[hpos]||'';}}
  else if(e.key==='ArrowDown'){if(hist.length){e.preventDefault();hpos=Math.min(hist.length,hpos+1);inp.value=hist[hpos]||'';}}
  else if(e.key==='Tab'){e.preventDefault();complete_();}
  else if(e.key==='l'&&e.ctrlKey){e.preventDefault();tb.textContent='';}
});
function complete_(){
  const v=inp.value,parts=v.split(/\s+/),last=parts[parts.length-1]||'',first=parts[0];
  let cands=[];
  if(first==='git'&&parts.length===2)cands=g.names.filter(n=>n.startsWith(last));
  else if(parts.length===1)cands=['git','ls','cat','touch','echo','mkdir','cd','pwd','rm','clear','help'].filter(n=>n.startsWith(last));
  else{const vw=g.view();cands=vw.wd.map(f=>f.n).concat(vw.folders).filter(n=>n.startsWith(last));
    if(first==='git'&&/^(switch|checkout|merge|branch)$/.test(parts[1])&&g.repo())cands=cands.concat(Object.keys(g.repo().branches).filter(n=>n.startsWith(last)));}
  cands=[...new Set(cands)];
  if(cands.length===1){parts[parts.length-1]=cands[0];inp.value=parts.join(' ')+(parts.length<=2&&first==='git'&&parts.length===2?' ':'');}
  else if(cands.length>1){echoCmd(v);printText(cands.join('  '),'d');}
}
function buildQuick(){
  const q=$('quick');q.textContent='';
  ['ls','git status','git log --oneline','git branch','clear'].forEach(c=>{
    const b=el('button',null,c);b.type='button';b.addEventListener('click',()=>{submit(c);if(matchMedia('(pointer:fine)').matches)inp.focus();});q.appendChild(b);
  });
}

/* ---------- missão ---------- */
function CHECK(){return '<svg viewBox="0 0 12 12"><path d="M2 6.5l2.6 2.6L10 3.4"/></svg>';}
function renderMission(){
  const box=$('mission');box.textContent='';
  const w=WORLDS[M.w],L=LM();box.style.setProperty('--wc',w.c);document.documentElement.style.setProperty('--wc',w.c);
  const tag=el('div','wtag');tag.appendChild(el('i'));tag.appendChild(document.createTextNode(I18N.t('line',w.n)+' · '+I18N.world(M.w)+(M.type==='quiz'?' · '+I18N.t('quiz_tag'):'')));box.appendChild(tag);
  const idx=MISSIONS.indexOf(M);
  box.appendChild(el('h2',null,L.title));
  if(M.type==='quiz'){
    box.appendChild(el('p','quizq',L.q));
    const ob=el('div','opts');ob.id='opts';
    L.options.forEach((t,i)=>{
      const b=el('button','opt');b.type='button';b.appendChild(el('b',null,'ABCD'[i]));b.appendChild(el('span',null,t));
      b.addEventListener('click',()=>answer(i,b));ob.appendChild(b);
    });
    box.appendChild(ob);
    const fb=el('div','hintbox');fb.id='quizfb';box.appendChild(fb);
  }else{
    box.appendChild(el('p','story',L.story));
    const ul=el('ul','goals');ul.id='goals';
    L.goals.forEach(txt=>{const li=el('li');const c=el('span','chk');c.innerHTML=CHECK();li.appendChild(c);li.appendChild(el('span',null,txt));ul.appendChild(li);});
    box.appendChild(ul);
    const bar=el('div','hintbar');
    const b1=el('button','btn sm',I18N.t('hint1')),b2=el('button','btn sm',I18N.t('hint2')),b3=el('button','btn sm',I18N.t('hint_sol')),b4=el('button','btn sm',I18N.t('restart'));
    [b1,b2,b3,b4].forEach(b=>b.type='button');b1.id='h1';b2.id='h2';b3.id='h3';b2.disabled=true;b3.disabled=true;
    b1.addEventListener('click',()=>showHint(1));b2.addEventListener('click',()=>showHint(2));b3.addEventListener('click',()=>showHint(3));
    b4.addEventListener('click',()=>GQ.go(idx,true));
    [b1,b2,b3,b4].forEach(b=>bar.appendChild(b));box.appendChild(bar);
    const hb=el('div','hintbox');hb.id='hintbox';box.appendChild(hb);
  }
  const win=el('div');win.id='win';box.appendChild(win);
}
function updateGoals(states){
  const lis=document.querySelectorAll('#goals li');
  lis.forEach((li,i)=>{const was=li.classList.contains('ok');li.classList.toggle('ok',!!states[i]);if(states[i]&&!was)GQ.sfx('ok');});
}
function showHint(n){
  if(!ctx)return;const hb=$('hintbox');
  if(n<=hintsShown)return;hintsShown=n;ctx.hintsUsed=Math.max(ctx.hintsUsed,n);
  if(n<=2){hb.appendChild(el('div','hint',LM().hints[n-1]));$('h'+n).disabled=true;if(n===1)$('h2').disabled=false;else $('h3').disabled=false;}
  if(n===2)$('h3').disabled=false;
  if(n===3){
    const s=el('div','sol');s.appendChild(el('div',null,I18N.t('sol_title')));
    M.solution.forEach(c=>{const b=el('button',null,c);b.type='button';b.addEventListener('click',()=>{inp.value=c;inp.focus();});s.appendChild(b);});
    hb.appendChild(s);$('h3').disabled=true;
  }
}
function answer(i,btn){
  if(!M||M.type!=='quiz'||ctx.done)return;quizTries++;
  const opts=[...document.querySelectorAll('#opts .opt')],fb=$('quizfb');
  if(i===M.answer){
    opts.forEach(o=>o.disabled=true);btn.classList.add('right');
    qstate.right=i;fb.textContent='';fb.appendChild(el('div','hint',LM().why));complete();
  }else{
    qstate.wrong.push(i);btn.classList.add('wrong');btn.disabled=true;GQ.sfx('err');
    fb.textContent='';fb.appendChild(el('div','hint',I18N.t('quiz_wrong')));
  }
}
function renderWin(){
  const idx=MISSIONS.indexOf(M),win=$('win');if(!win||!winInfo)return;win.textContent='';win.className='win';
  const L=LM(),quiz=M.type==='quiz';
  const h=el('h3');h.appendChild(el('span',null,I18N.t(quiz?'win_quiz':'win_mission')));h.appendChild(el('span','xpgain',winInfo.isFirst?'+'+winInfo.gain+' XP':I18N.t('review')));win.appendChild(h);
  if(!quiz){
    const p=el('p');p.appendChild(el('b',null,I18N.t('learned')));p.appendChild(document.createTextNode(L.learn+' ('+I18N.t('in_guide',I18N.doc(idx))+')'));win.appendChild(p);
    if(winInfo.bonus)win.appendChild(el('p','learn',I18N.t('bonus')));
  }
  const acts=el('div','winacts');const last=idx===MISSIONS.length-1;
  if(!last){const nb=el('button','btn pri',I18N.t('next'));nb.type='button';nb.addEventListener('click',()=>{GQ.go(idx+1);window.scrollTo({top:0,behavior:'smooth'});});acts.appendChild(nb);}
  else{const db=el('button','btn pri',I18N.t('diploma_see'));db.type='button';db.addEventListener('click',openDiploma);acts.appendChild(db);}
  if(!quiz){const sb=el('button','btn',I18N.t('keep_term'));sb.type='button';sb.addEventListener('click',()=>inp.focus());acts.appendChild(sb);}
  win.appendChild(acts);
}
function complete(){
  const S=GQ.S(),idx=MISSIONS.indexOf(M);ctx.done=true;
  const before=GQ.rankOf(S.xp);let gain=0;const first=!S.done[idx];
  if(first){
    if(M.type==='quiz')gain=[50,25,10][Math.min(quizTries,3)-1]||10;
    else gain=Math.max(20,100-Math.min(3,ctx.hintsUsed)*25)+((ctx.errors===0&&ctx.hintsUsed===0)?25:0);
    S.xp+=gain;S.done[idx]={xp:gain};
    if(M.type!=='quiz'){S.worldHints[M.w]=(S.worldHints[M.w]||0)+ctx.hintsUsed;S.combo=ctx.hintsUsed===0?S.combo+1:0;}
    if(M.noIdentity){const c=g.state().cfg;S.id={name:c['user.name']||S.id.name,email:c['user.email']||S.id.email};}
  }
  GQ.save();GQ.renderHud();GQ.renderMetro();GQ.sfx('win');GQ.confetti();
  winInfo={gain,isFirst:first,bonus:first&&ctx.errors===0&&ctx.hintsUsed===0};renderWin(true);
  if(M.type!=='quiz'){const gb=document.querySelectorAll('#goals li');gb.forEach(li=>li.classList.add('ok'));}
  if(first){
    BADGES.forEach(b=>{if(b.when(M.title))GQ.award(b.id);});
    const wm=MISSIONS.map((m,i)=>[m,i]).filter(([m])=>m.w===M.w);
    if(wm.every(([,i])=>S.done[i])&&!(S.worldHints[M.w]>0)&&wm.some(([m])=>m.type!=='quiz'))GQ.award('pure');
    const after=GQ.rankOf(S.xp);
    if(after>before){GQ.toast(I18N.t('levelup_t'),I18N.t('levelup_s',GQ.RK[after].name));GQ.sfx('level');}
    if(MISSIONS.every((m,i)=>S.done[i]))setTimeout(openDiploma,1400);
  }
  setTimeout(()=>{const w=$('win');if(w)w.scrollIntoView({behavior:'smooth',block:'nearest'});},120);
}

GQ.go=function(i,restart){
  const S=GQ.S();if(i<0||i>=MISSIONS.length)return;
  if(!GQ.unlocked(i))return;
  M=MISSIONS[i];S.cur=i;GQ.save();quizTries=0;hintsShown=0;winInfo=null;qstate={wrong:[],right:-1};
  const pm=M.type==='quiz'?{setup:BASE}:M;
  ctx=startMission(g,pm,S.id);
  if(M.type==='quiz')ctx.hist=[];
  if(S.done[i]&&!restart){/* revisão: segue o jogo normal sem XP */}
  renderMission();tb.textContent='';
  printText(I18N.t('banner_mission',i+1,MISSIONS.length,LM().title),'d');
  printText(I18N.t(M.type==='quiz'?'banner_quiz':'banner_help'),'d');
  printText('','');
  refresh();GQ.renderMetro();GQ.renderHud();
  if(matchMedia('(pointer:fine)').matches)inp.focus();
};

/* ---------- diploma ---------- */
function openDiploma(){
  const S=GQ.S();$('certname').value=S.player||'';
  const n=MISSIONS.length;
  $('certtxt').textContent=I18N.t('cert_txt',n,S.xp,GQ.RK[GQ.rankOf(S.xp)].name);
  const cb=$('certb');cb.textContent='';BADGES.forEach(b=>{if(S.badges[b.id])cb.appendChild(el('span',null,I18N.badge(b).t));});
  $('certdate').textContent=new Date().toLocaleDateString(I18N.locale,{day:'2-digit',month:'long',year:'numeric'});
  $('diploma').hidden=false;GQ.confetti();$('certname').focus();
}
$('certname').addEventListener('input',e=>{const S=GQ.S();S.player=e.target.value;GQ.save();});
$('certclose').addEventListener('click',()=>{$('diploma').hidden=true;});
$('btnDiploma').addEventListener('click',openDiploma);
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('diploma').hidden=true;});

/* ---------- botões do topo ---------- */
function soundLabel(){const S=GQ.S();$('btnSound').textContent=I18N.t(S.sound?'sound_on':'sound_off');$('btnSound').setAttribute('aria-pressed',String(!!S.sound));}
$('btnSound').addEventListener('click',()=>{const S=GQ.S();S.sound=!S.sound;GQ.save();soundLabel();GQ.sfx('ok');});
let rt=0;
$('btnReset').addEventListener('click',()=>{
  const b=$('btnReset');
  if(!rt){b.textContent=I18N.t('reset_confirm');b.classList.add('warn');rt=setTimeout(()=>{rt=0;b.textContent=I18N.t('reset');b.classList.remove('warn');},4500);return;}
  clearTimeout(rt);rt=0;b.textContent=I18N.t('reset');b.classList.remove('warn');
  try{localStorage.removeItem('gitquest.v1');}catch(e){}
  GQ.setS({xp:0,done:{},cur:0,id:{name:DEFAULT_ID.name,email:DEFAULT_ID.email},badges:{},combo:0,player:'',worldHints:{},sound:false,lang:GQ.S().lang});
  soundLabel();GQ.renderBadges();GQ.go(0,true);
});

/* ---------- início ---------- */
GQ.load();
/* ---------- idioma (bandeiras) ---------- */
function buildLangs(){
  const box=$('langs');box.textContent='';
  I18N.LANGS.forEach(l=>{
    const b=document.createElement('button');b.type='button';b.className='lg';b.innerHTML=l.flag;b.title=l.name;b.setAttribute('aria-label',l.name);b.dataset.code=l.code;
    b.setAttribute('aria-pressed',String(l.code===I18N.lang));
    b.addEventListener('click',()=>{const S=GQ.S();S.lang=l.code;GQ.save();I18N.set(l.code);});
    box.appendChild(b);
  });
}
function relang(){
  document.querySelectorAll('#langs .lg').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.code===I18N.lang)));
  const rb=$('btnReset');if(rt){clearTimeout(rt);rt=0;rb.classList.remove('warn');}
  soundLabel();GQ.renderHud();GQ.renderMetro();GQ.renderBadges();GQ.renderAreas(g.view());GQ.renderGraph(g.view());setPrompt();
  if(!M)return;
  renderMission();
  if(M.type==='quiz'){
    const opts=[...document.querySelectorAll('#opts .opt')];
    qstate.wrong.forEach(i=>{if(opts[i]){opts[i].classList.add('wrong');opts[i].disabled=true;}});
    if(qstate.right>=0){opts.forEach(o=>o.disabled=true);opts[qstate.right].classList.add('right');$('quizfb').appendChild(el('div','hint',LM().why));}
    else if(qstate.wrong.length)$('quizfb').appendChild(el('div','hint',I18N.t('quiz_wrong')));
  }else{
    if(ctx){updateGoals(goalStates(g,M,ctx));for(let n=1;n<=Math.min(2,hintsShown);n++){$('hintbox').appendChild(el('div','hint',LM().hints[n-1]));$('h'+n).disabled=true;}
      if(hintsShown>=1)$('h2').disabled=hintsShown>=2;if(hintsShown>=2)$('h3').disabled=hintsShown>=3;
      if(hintsShown>=3){hintsShown=2;showHint(3);}}
  }
  if(winInfo){renderWin();if(M.type!=='quiz')document.querySelectorAll('#goals li').forEach(li=>li.classList.add('ok'));}
}
I18N.onChange(relang);
(function init(){
  const S=GQ.S();
  if(typeof S.cur!=='number'||S.cur<0||S.cur>=MISSIONS.length||!GQ.unlocked(S.cur))S.cur=Math.min(MISSIONS.length-1,Math.max(0,Math.max(-1,...Object.keys(S.done).map(Number))+1));
  buildLangs();I18N.set(S.lang&&I18N.has(S.lang)?S.lang:I18N.detect());
  buildQuick();soundLabel();GQ.renderBadges();GQ.renderHud();
  GQ.go(S.cur);
})();
})();
