/* ===== Interface (parte D): troféus, desafio cronometrado, revisão e missões de verdade ===== */
(function(){
const {$,el}=GQ;
const DAY=86400000;
const TC={bronze:['#cd7f32','#7a4a1a','#f3b57a'],silver:['#d5d9e0','#69707d','#ffffff'],gold:['#ffd24a','#a87a08','#fff4b8'],platinum:['#c9efff','#3f9fcf','#ffffff']};
const CUP={bowl:'M14 6h20v12a10 10 0 0 1-20 0z',hl:'M18 8h3v10a6 6 0 0 0 1 3.5A6 6 0 0 1 18 15z',hands:'M14 9H8v4a6 6 0 0 0 6 6M34 9h6v4a6 6 0 0 1-6 6',stem:'M24 28v8',base:'M17 36h14v6H17z'};
GQ.TC=TC;GQ.CUP=CUP;
GQ.cupSVG=(tier,locked)=>{
  const c=TC[tier];
  const s='<svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true" focusable="false"'+(locked?' style="filter:grayscale(1) brightness(.5)"':'')+'>'+
    '<path d="'+CUP.hands+'" fill="none" stroke="'+c[1]+'" stroke-width="2.4" stroke-linecap="round"/>'+
    '<path d="'+CUP.bowl+'" fill="'+c[0]+'" stroke="'+c[1]+'" stroke-width="1.6" stroke-linejoin="round"/>'+
    '<path d="'+CUP.hl+'" fill="'+c[2]+'" opacity=".75"/>'+
    '<path d="'+CUP.stem+'" stroke="'+c[1]+'" stroke-width="4" stroke-linecap="round"/>'+
    '<path d="'+CUP.base+'" fill="'+c[0]+'" stroke="'+c[1]+'" stroke-width="1.6" stroke-linejoin="round"/>'+
    (tier==='platinum'?'<path d="M24 11l1.4 3.2 3.4.3-2.6 2.2.8 3.3-3-1.8-3 1.8.8-3.3-2.6-2.2 3.4-.3z" fill="#3f9fcf"/>':'')+'</svg>';
  const w=el('span','cup');w.innerHTML=s;return w;
};

/* ---------- troféus ---------- */
const S_=()=>GQ.S();
function announce(id){
  const t=GQT.TROPHIES.find(x=>x.id===id);if(!t)return;
  const tr=I18N.trophy(id);
  GQ.toast('🏆 '+I18N.t('tro_'+t.tier)+' · '+tr.t,tr.d);GQ.sfx('level');
  if(t.tier==='platinum'||t.tier==='gold')GQ.confetti();
}
GQ.checkTrophies=function(silent){
  const S=S_();S.tro=S.tro||{};
  const ids=GQT.earned(S,MISSIONS),fresh=ids.filter(id=>!S.tro[id]);
  fresh.forEach(id=>{S.tro[id]=Date.now();});
  if(fresh.length){GQ.save();if(!silent)fresh.forEach((id,k)=>setTimeout(()=>announce(id),k*1100));}
  renderBtns();return fresh;
};
GQ.trophyIds=()=>Object.keys(S_().tro||{}).filter(id=>GQT.TROPHIES.some(t=>t.id===id));
function renderBtns(){
  const n=GQ.trophyIds().length,b=$('btnTro');
  b.textContent='🏆 '+I18N.t('tro_btn')+' '+n+'/'+GQT.TROPHIES.length;
  const S=S_(),due=Object.values(S.rev||{}).filter(r=>r.due<=Date.now()).length,rb=$('btnRev');
  rb.hidden=!Object.keys(S.rev||{}).length;rb.textContent=I18N.t('rev_btn')+(due?' ('+due+')':'');
}
GQ.renderExtraBtns=renderBtns;
function openTro(){
  const box=$('trobody');box.textContent='';const S=S_(),have=new Set(GQ.trophyIds()),cn=GQT.counts([...have]);
  $('trocount').textContent=I18N.t('tro_count',have.size,GQT.TROPHIES.length);
  const sum=el('div','trosum');
  GQT.TIERS.forEach(t=>{const d=el('div','tsum');d.appendChild(GQ.cupSVG(t,!cn[t].have));d.appendChild(el('b',null,cn[t].have+'/'+cn[t].total));d.appendChild(el('span',null,I18N.t('tro_'+t)));sum.appendChild(d);});
  box.appendChild(sum);
  GQT.TIERS.forEach(t=>{
    GQT.TROPHIES.filter(x=>x.tier===t).forEach(x=>{
      const on=have.has(x.id),tr=I18N.trophy(x.id);
      const c=el('div','tro '+t+(on?' on':''));c.appendChild(GQ.cupSVG(t,!on));
      const tx=el('div','trotx');tx.appendChild(el('b',null,tr.t));tx.appendChild(el('span',null,tr.d));
      if(on&&S.tro[x.id])tx.appendChild(el('small',null,new Date(S.tro[x.id]).toLocaleDateString(I18N.locale)));
      else tx.appendChild(el('small',null,I18N.t('tro_locked')));
      c.appendChild(tx);box.appendChild(c);
    });
  });
  $('tro').hidden=false;
}
$('btnTro').addEventListener('click',openTro);
$('troclose').addEventListener('click',()=>{$('tro').hidden=true;});

/* ---------- revisão espaçada ---------- */
function openRev(){
  const box=$('revbody');box.textContent='';const S=S_(),R=S.rev||{};
  const keys=Object.keys(R).filter(k=>MISSIONS[k]).sort((a,b)=>R[a].due-R[b].due);
  if(!keys.length)box.appendChild(el('p',null,I18N.t('rev_empty')));
  keys.forEach(k=>{
    const r=R[k],m=I18N.m(+k),now=r.due<=Date.now();
    const row=el('div','revrow'+(now?' now':''));
    row.appendChild(el('b',null,m.title));
    row.appendChild(el('span',null,now?I18N.t('rev_now'):I18N.t('rev_in',Math.max(1,Math.ceil((r.due-Date.now())/DAY)))));
    const b=el('button','btn sm',I18N.t('rev_do'));b.type='button';b.addEventListener('click',()=>{$('rev').hidden=true;GQ.go(+k,true);window.scrollTo({top:0,behavior:'smooth'});});
    row.appendChild(b);box.appendChild(row);
  });
  $('rev').hidden=false;
}
$('btnRev').addEventListener('click',openRev);
$('revclose').addEventListener('click',()=>{$('rev').hidden=true;});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('tro').hidden=true;$('rev').hidden=true;}});

/* ---------- desafio cronometrado ---------- */
const C={idx:-1,left:0,total:0,on:false,expired:false,timer:0};
function stopTimer(){clearInterval(C.timer);C.timer=0;}
function paintTimer(){
  const p=$('chpill');if(!p)return;
  p.hidden=!C.on&&!C.expired;
  p.className='chpill'+(C.expired?' lost':'')+(C.on&&C.left<=10?' low':'');
  p.textContent=C.expired?I18N.t('ch_lost'):I18N.t('ch_left',C.left);
  const b=$('chbtn');if(b)b.hidden=C.on||C.expired;
}
GQ.hookGo=function(i){stopTimer();C.idx=i;C.on=false;C.expired=false;};
GQ.chWin=function(idx){
  const ok=C.on&&!C.expired&&C.idx===idx;
  if(ok){stopTimer();C.on=false;}
  return ok;
};
function startChallenge(){
  const M=GQ.cur();if(!M||C.on)return;
  C.total=M.type==='quiz'?25:120;C.left=C.total;C.on=true;C.expired=false;
  stopTimer();C.timer=setInterval(()=>{
    C.left--;
    if(C.left<=0){stopTimer();C.on=false;C.expired=true;GQ.sfx('err');}
    paintTimer();
  },1000);
  paintTimer();
  const t=document.querySelector('#cmd');if(t&&matchMedia('(pointer:fine)').matches)t.focus();
}

/* ---------- missões de verdade (GitHub) ---------- */
const realVals={};
function realForm(M,box){
  const idx=MISSIONS.indexOf(M),v=realVals[idx]=realVals[idx]||{};
  const f=el('div','realbox');
  const mk=(key,ph,type)=>{const i=el('input','realin');i.type=type||'text';i.autocomplete='off';i.spellcheck=false;i.placeholder=I18N.t(ph);i.value=v[key]||'';i.addEventListener('input',()=>{v[key]=i.value;});i.setAttribute('aria-label',I18N.t(ph));return i;};
  if(M.kind==='pr')f.appendChild(mk('url','real_pr_ph'));
  else{f.appendChild(mk('user','real_user_ph'));f.appendChild(mk('repo','real_repo_ph'));}
  const row=el('div','winacts');
  const vb=el('button','btn pri',I18N.t('real_verify'));vb.type='button';
  const mb=el('button','btn',I18N.t('real_manual'));mb.type='button';mb.hidden=true;mb.id='realman';
  const msg=el('p','progmsg');msg.id='realmsg';msg.setAttribute('role','status');
  const done=ok=>{const c=GQ.ctx();if(!c||c.done)return;c.flags.verified=true;GQ.recheck();};
  vb.addEventListener('click',async()=>{
    msg.className='progmsg';msg.textContent=I18N.t('real_checking');vb.disabled=true;
    const r=await GQR.verify(M.kind,v);vb.disabled=false;
    if(r.ok){msg.className='progmsg ok';msg.textContent=I18N.t('real_ok');done();return;}
    msg.className='progmsg err';msg.textContent=I18N.t('real_'+r.reason);
    if(r.reason==='offline')mb.hidden=false;
  });
  mb.addEventListener('click',()=>{msg.className='progmsg ok';msg.textContent=I18N.t('real_ok');done();});
  row.appendChild(vb);row.appendChild(mb);f.appendChild(row);f.appendChild(msg);
  return f;
}

GQ.hookRender=function(){
  const M=GQ.cur(),box=$('mission');if(!M)return;
  const idx=MISSIONS.indexOf(M);
  if(M.type==='real'){
    const h3=$('h3');if(h3)h3.hidden=true;
    box.insertBefore(realForm(M,box),$('win'));return;
  }
  const row=el('div','chrow');
  const b=el('button','btn sm chbtn','⏱ '+I18N.t('ch_btn'));b.type='button';b.id='chbtn';b.addEventListener('click',startChallenge);
  const p=el('span','chpill');p.id='chpill';p.setAttribute('role','timer');p.hidden=true;
  row.appendChild(b);row.appendChild(p);
  box.insertBefore(row,box.children[2]||null);
  if(C.idx===idx)paintTimer();
};

/* ---------- depois de cada missão concluída ---------- */
GQ.afterComplete=function(o){
  const S=S_();
  if(o.first){
    const perfect=o.quiz?o.tries===1:(o.errors===0&&o.hints===0);
    if(perfect)S.perfect=(S.perfect|0)+1;
    if(o.quiz&&o.tries===1)S.qf=(S.qf|0)+1;
    S.bestCombo=Math.max(S.bestCombo|0,S.combo|0);
    if(!S.t0)S.t0=Math.floor(Date.now()/1000);
  }
  const R=S.rev=S.rev||{};
  const weak=o.quiz?o.tries>1:(o.hints>0||o.errors>=3);
  if(o.first){if(weak&&o.type!=='real')R[o.idx]={due:Date.now()+DAY,box:0};}
  else if(R[o.idx]){
    if(!weak){
      R[o.idx].box++;
      if(R[o.idx].box>=3){delete R[o.idx];GQ.toast(I18N.t('rev_gone'),'');}
      else{const d=Math.pow(2,R[o.idx].box);R[o.idx].due=Date.now()+d*DAY;GQ.toast(I18N.t('rev_ok',d),'');}
    }else R[o.idx].due=Date.now()+DAY;
  }
  if(o.chWon)GQ.toast(I18N.t('ch_won',o.first?50:0),'');
  GQ.save();GQ.checkTrophies();
};

I18N.onChange(()=>{renderBtns();paintTimer();if(!$('tro').hidden)openTro();if(!$('rev').hidden)openRev();});
if(!S_().t0&&Object.keys(S_().done).length)S_().t0=Math.floor(Date.now()/1000);
GQ.checkTrophies(true);
if(GQ.cur&&GQ.cur()){C.idx=MISSIONS.indexOf(GQ.cur());GQ.hookRender();}
})();
