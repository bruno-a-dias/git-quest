/* Painel da turma: lê códigos de progresso (GQ1.*) e resume cada turma. Nada sai do navegador. */
(function(){
const $=id=>document.getElementById(id);
const KEY='gitquest.turmas.v2',OLD='gitquest.turma.v1';
const N=MISSIONS.length;
const TOTAL=MISSIONS.reduce((a,m)=>a+(m.type==='quiz'?50:100),0);
const RKAT=[0,.08,.25,.45,.7,.92].map(f=>Math.round(f*TOTAL));
const rankIdx=xp=>{let r=0;RKAT.forEach((a,i)=>{if(xp>=a)r=i;});return r;};
const DAY=864e5,IDLE_DAYS=7,RISK_GAP=25;
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function msg(t,cls){const m=$('msg');m.textContent=t||'';m.className='progmsg'+(cls?' '+cls:'');}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}
function copy(text,ta){
  const fb=()=>{const t=ta||document.createElement('textarea');if(!ta){t.value=text;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);}t.focus();t.select();let ok=false;try{ok=document.execCommand('copy');}catch(e){}if(!ta)t.remove();return ok;};
  return navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(text).then(()=>true).catch(fb):Promise.resolve(fb());
}

/* ---------- armazenamento: várias turmas ---------- */
let db={v:2,cur:'',classes:{}};
const uid=()=>'t'+Math.random().toString(36).slice(2,8);
function load(){
  try{const j=JSON.parse(localStorage.getItem(KEY)||'null');if(j&&j.classes)db=j;}catch(e){}
  if(!Object.keys(db.classes).length){
    let old={};try{old=JSON.parse(localStorage.getItem(OLD)||'{}')||{};}catch(e){}
    const id=uid();db={v:2,cur:id,classes:{[id]:{name:'Minha turma',students:old}}};
  }
  if(!db.classes[db.cur])db.cur=Object.keys(db.classes)[0];
}
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(db));}catch(e){}};
const klass=()=>db.classes[db.cur];
const turma=()=>klass().students;
load();

/* ---------- leitura dos códigos ---------- */
const ERR={format:'formato inválido (copie o código inteiro)',checksum:'código alterado ou cortado',xp:'XP não bate com as missões',mission:'missão inexistente'};
function ingest(text){
  const codes=GQP.extract(text),bad=$('bad');bad.textContent='';
  let added=0,updated=0,invalid=0,older=0;
  codes.forEach(c=>{
    const r=GQP.decode(c,N);
    if(!r.ok){invalid++;bad.appendChild(el('li',null,c.slice(0,24)+'…  → '+(ERR[r.error]||'inválido')));return;}
    const d=r.data,id=d.p||('s:'+(d.n||'?').toLowerCase()),old=turma()[id];
    if(old){if((old.t||0)>(d.t||0)){older++;return;}updated++;}else added++;
    turma()[id]=d;
  });
  persist();render();
  if(!codes.length){msg('Nenhum código GQ1 encontrado no texto.','err');return;}
  msg(`${added} adicionado(s), ${updated} atualizado(s)`+(older?`, ${older} ignorado(s) por ser mais antigo(s)`:'')+(invalid?`, ${invalid} inválido(s)`:'')+'.',invalid?'err':'ok');
}

/* ---------- derivados ---------- */
function derive(d){
  const done=Object.keys(d.d).map(Number),set=new Set(done);
  let next=0;while(next<N&&set.has(next))next++;
  const name=(d.n||'(sem nome)').trim();
  return {id:d.p||('s:'+name.toLowerCase()),n:name,x:d.x,pct:Math.min(100,Math.round(d.x/TOTAL*100)),cnt:done.length,rk:rankIdx(d.x),next,
    nextTxt:next>=N?'Concluiu tudo':`${next+1}. ${MISSIONS[next].title}`,
    tro:(d.tr||[]).filter(id=>GQT.TROPHIES.some(t=>t.id===id)),code:done.length===N?GQP.diplomaCode(name,d.x,done):'',t:d.t||0,set,raw:d,finished:done.length===N};
}
function rows(){
  const l=Object.values(turma()).map(derive);
  const avg=l.length?l.reduce((a,s)=>a+s.pct,0)/l.length:0;
  l.forEach(s=>{
    s.idle=!s.finished&&s.t&&(Date.now()-s.t)>IDLE_DAYS*DAY;
    s.risk=!s.finished&&l.length>=3&&s.pct<avg-RISK_GAP;
    s.st=s.finished?'0':s.risk?'2':s.idle?'1':'3';           /* ordenação */
    s.stTxt=s.finished?'🎓 Concluiu':[s.risk&&'⚠ Em risco',s.idle&&'💤 Parado'].filter(Boolean).join(' · ')||'—';
  });
  return l;
}
function bottleneck(list){
  if(list.length<2)return null;
  const cnt=Array.from({length:N},(_,i)=>list.filter(s=>s.set.has(i)).length);
  let best=null;
  for(let i=1;i<N;i++){const drop=cnt[i-1]-cnt[i];if(drop>0&&(!best||drop>best.drop))best={i,drop};}
  return best;
}
const ago=t=>{if(!t)return '';const d=Math.floor((Date.now()-t)/DAY);return d<=0?'hoje':d===1?'ontem':`há ${d} dias`;};

/* ---------- renderização ---------- */
let sort={k:'x',dir:-1},filter='all',query='',selBar=-1;
function renderClasses(){
  const s=$('cls');s.textContent='';
  Object.entries(db.classes).forEach(([id,c])=>{const o=el('option',null,`${c.name} (${Object.keys(c.students).length})`);o.value=id;if(id===db.cur)o.selected=true;s.appendChild(o);});
}
function renderCards(list){
  const c=$('cards');c.textContent='';
  const add=(big,small,cls)=>{const d=el('div','card'+(cls?' '+cls:''));d.appendChild(el('b',null,big));d.appendChild(el('span',null,small));c.appendChild(d);};
  const n=list.length,g=bottleneck(list);
  add(String(n),'alunos na turma');
  add(n?Math.round(list.reduce((a,s)=>a+s.pct,0)/n)+'%':'–','progresso médio');
  add(String(list.filter(s=>s.finished).length),'concluíram as '+N+' missões');
  add(String(list.filter(s=>s.risk||s.idle).length),'precisam de atenção (risco ou parados)','attn');
  add(g?`${g.i+1}. ${MISSIONS[g.i].title}`:'–',g?`maior queda: ${g.drop} aluno(s) a menos que na anterior`:'maior gargalo','wide');
}
function renderChart(list){
  const ch=$('chart'),ax=$('axis');ch.textContent='';ax.textContent='';
  const n=list.length,max=Math.max(1,n),g=bottleneck(list);
  const cnt=Array.from({length:N},(_,i)=>list.filter(s=>s.set.has(i)).length);
  cnt.forEach((v,i)=>{
    const b=el('div','bar'+(g&&g.i===i?' gap':'')+(selBar===i?' sel':''));
    b.style.height=Math.max(1,v/max*100)+'%';b.style.background=WORLDS[MISSIONS[i].w].c;
    b.tabIndex=0;b.setAttribute('role','button');b.title=`${i+1}. ${MISSIONS[i].title}: ${v} de ${n} aluno(s)`;b.setAttribute('aria-label',b.title);
    if(n&&n<=12&&v)b.appendChild(el('i',null,String(v)));
    const pick=()=>{selBar=selBar===i?-1:i;renderChart(list);renderWho(list);};
    b.addEventListener('click',pick);b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick();}});
    ch.appendChild(b);
  });
  /* eixo: um rótulo por mundo, ocupando as colunas das suas missões */
  WORLDS.forEach((w,wi)=>{
    const k=MISSIONS.filter(m=>m.w===wi).length;if(!k)return;
    const a=el('span',null,'L'+(wi+1));a.style.gridColumn='span '+k;a.style.borderColor=w.c;a.style.color=w.c;a.title=w.t;ax.appendChild(a);
  });
  $('chartnote').textContent=g?`Atenção à missão ${g.i+1} (${MISSIONS[g.i].title}): ${g.drop} aluno(s) concluíram a anterior e pararam aqui.`:(n?'Sem queda relevante entre missões.':'');
}
function renderWho(list){
  const w=$('who');
  if(selBar<0){w.hidden=true;return;}
  const m=MISSIONS[selBar],falta=list.filter(s=>!s.set.has(selBar)).sort((a,b)=>a.n.localeCompare(b.n,'pt-BR'));
  w.hidden=false;w.textContent='';
  w.appendChild(el('b',null,`${selBar+1}. ${m.title}`));
  w.appendChild(el('span','mute',` · ${WORLDS[m.w].t} · ${list.length-falta.length} de ${list.length} concluíram`));
  const p=el('p',null,falta.length?'Ainda não fizeram: '+falta.map(s=>s.n).join(', '):'Todos já concluíram esta missão.');w.appendChild(p);
}
function visible(list){
  const q=query.trim().toLowerCase();
  return list.filter(s=>(filter==='all'||(filter==='done'&&s.finished)||(filter==='risk'&&s.risk)||(filter==='idle'&&s.idle))&&(!q||s.n.toLowerCase().includes(q)));
}
function renderChips(list){
  const c={all:list.length,done:list.filter(s=>s.finished).length,risk:list.filter(s=>s.risk).length,idle:list.filter(s=>s.idle).length};
  document.querySelectorAll('#chips .chip2').forEach(b=>{b.querySelector('b').textContent=c[b.dataset.f];b.setAttribute('aria-pressed',String(b.dataset.f===filter));});
}
function renderTable(all){
  const list=visible(all),key=sort.k;
  list.sort((a,b)=>{
    const va=a[key],vb=b[key];
    const r=(typeof va==='string'?va.localeCompare(vb,'pt-BR'):va-vb)*sort.dir;
    return r||a.n.localeCompare(b.n,'pt-BR');
  });
  const tb=$('rows');tb.textContent='';
  list.forEach(s=>{
    const tr=el('tr',(s.finished?'done ':'')+(s.risk?'risk ':'')+(s.idle?'idle':''));tr.tabIndex=0;tr.title='Ver detalhes de '+s.n;
    tr.appendChild(el('td','nm',s.n));
    tr.appendChild(el('td','num',String(s.x)));
    const p=el('td','num');const bar=el('span','pct');const i=document.createElement('i');i.style.width=s.pct+'%';bar.appendChild(i);p.appendChild(bar);p.appendChild(document.createTextNode(s.pct+'%'));tr.appendChild(p);
    tr.appendChild(el('td','num',s.cnt+'/'+N));
    tr.appendChild(el('td',null,RANKS[s.rk][1]));
    tr.appendChild(el('td','where',s.nextTxt));
    tr.appendChild(el('td','mono',s.code||'–'));
    const t=el('td',null,ago(s.t));t.title=s.t?new Date(s.t).toLocaleString('pt-BR'):'';tr.appendChild(t);
    tr.appendChild(el('td','stt',s.stTxt));
    const x=el('td');const bt=el('button','x','×');bt.type='button';bt.title='Remover '+s.n;bt.setAttribute('aria-label','Remover '+s.n);
    bt.addEventListener('click',e=>{e.stopPropagation();delete turma()[s.id];persist();render();});x.appendChild(bt);tr.appendChild(x);
    const open=()=>openStudent(s.id);tr.addEventListener('click',open);tr.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target===tr)open();});
    tb.appendChild(tr);
  });
  $('empty').hidden=list.length>0;
  $('empty').textContent=all.length?'Nenhum aluno com este filtro.':'Nenhum aluno ainda. Cole os códigos acima.';
  document.querySelectorAll('#tbl th[data-k]').forEach(th=>{if(th.dataset.k===sort.k)th.setAttribute('aria-sort',sort.dir<0?'descending':'ascending');else th.removeAttribute('aria-sort');});
}
function render(){
  const l=rows();
  renderClasses();renderCards(l);renderChart(l);renderWho(l);renderChips(l);renderTable(l);
  document.title='Git Quest · '+klass().name;
  $('printtitle').textContent=klass().name+' · '+new Date().toLocaleDateString('pt-BR');
}

/* ---------- detalhe do aluno ---------- */
let stuId='';
function openStudent(id){
  const d=turma()[id];if(!d)return;const s=derive(d);stuId=id;
  $('stuh').textContent=s.n;
  $('stusub').textContent=`${s.x} XP · ${s.pct}% · ${RANKS[s.rk][1]}`;
  const st=$('strip');st.textContent='';
  MISSIONS.forEach((m,i)=>{
    const c=el('span','cell'+(s.set.has(i)?' ok':'')+(i===s.next?' now':''));const col=WORLDS[m.w].c;
    c.style.setProperty('--c',col);c.title=`${i+1}. ${m.title}${s.set.has(i)?' ✓':''}`;c.setAttribute('role','listitem');c.setAttribute('aria-label',c.title);c.textContent=i+1;st.appendChild(c);
  });
  $('strip-note').textContent=s.finished?'Concluiu todas as missões.':`Parou antes da missão ${s.next+1}: ${MISSIONS[s.next].title}.`;
  const g=$('stugrid');g.textContent='';
  const add=(k,v)=>{const r=el('div');r.appendChild(el('span','mute',k));r.appendChild(el('b',null,v));g.appendChild(r);};
  add('Missões',s.cnt+'/'+N);add('Último envio',s.t?new Date(s.t).toLocaleString('pt-BR')+' ('+ago(s.t)+')':'—');
  add('Idioma do jogo',(d.l||'—').toUpperCase());add('Código do diploma',s.code||'ainda não concluiu');
  const cn=GQT.counts(s.tro),sx=d.st||{};
  add('Troféus',s.tro.length+'/'+GQT.TROPHIES.length+' (bronze '+cn.bronze.have+', prata '+cn.silver.have+', ouro '+cn.gold.have+', platina '+cn.platinum.have+')');
  add('Desafios vencidos / missões perfeitas',(sx.c|0)+' / '+(sx.p|0));
  const bb=$('stubadges');bb.textContent='';
  const earned=(d.b||[]).map(id=>BADGES.find(b=>b.id===id)).filter(Boolean);
  if(earned.length)earned.forEach(b=>bb.appendChild(el('span',null,b.t)));else bb.appendChild(el('span','mute','Sem conquistas ainda'));
  $('stucopy').disabled=!s.code;
  $('stu').hidden=false;$('stuclose').focus();
}
const closeStu=()=>{$('stu').hidden=true;};
$('stuclose').addEventListener('click',closeStu);
$('stu').addEventListener('click',e=>{if(e.target===$('stu'))closeStu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeStu();});
$('sturm').addEventListener('click',()=>{delete turma()[stuId];persist();closeStu();render();});
$('stucopy').addEventListener('click',()=>{const s=derive(turma()[stuId]);copy(s.code).then(ok=>{$('stucopy').textContent=ok?'Copiado!':'Selecione e copie manualmente';setTimeout(()=>{$('stucopy').textContent='Copiar código do diploma';},1800);});});

/* ---------- eventos ---------- */
$('add').addEventListener('click',()=>{ingest($('paste').value);$('paste').value='';});
async function readFiles(fs){let all='';for(const f of fs)all+='\n'+await f.text();ingest(all);}
$('files').addEventListener('change',async e=>{const fs=[...e.target.files];e.target.value='';await readFiles(fs);});
const drop=$('drop');
['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('over');}));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('over');}));
drop.addEventListener('drop',e=>{const fs=[...(e.dataTransfer&&e.dataTransfer.files||[])];if(fs.length)readFiles(fs);});
let clr=0;
$('clear').addEventListener('click',()=>{
  const b=$('clear');
  if(!clr){b.textContent='Confirmar: esvaziar a turma?';b.classList.add('warn');clr=setTimeout(()=>{clr=0;b.textContent='Limpar turma';b.classList.remove('warn');},4500);return;}
  clearTimeout(clr);clr=0;b.textContent='Limpar turma';b.classList.remove('warn');klass().students={};selBar=-1;persist();render();msg('Turma esvaziada.','ok');
});
document.querySelectorAll('#tbl th[data-k]').forEach(th=>{
  th.tabIndex=0;
  const go=()=>{const k=th.dataset.k;sort=sort.k===k?{k,dir:-sort.dir}:{k,dir:(k==='n'||k==='code'||k==='next'||k==='st')?1:-1};render();};
  th.addEventListener('click',go);th.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
});
$('q').addEventListener('input',e=>{query=e.target.value;render();});
document.querySelectorAll('#chips .chip2').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.f;render();}));

/* turmas */
let mode='';
function showForm(m){mode=m;$('clsform').hidden=false;$('clsName').value=m==='rename'?klass().name:'';$('clsName').focus();}
$('clsNew').addEventListener('click',()=>showForm('new'));
$('clsRename').addEventListener('click',()=>showForm('rename'));
$('clsCancel').addEventListener('click',()=>{$('clsform').hidden=true;});
$('clsform').addEventListener('submit',e=>{
  e.preventDefault();const name=$('clsName').value.trim();if(!name)return;
  if(mode==='new'){const id=uid();db.classes[id]={name,students:{}};db.cur=id;selBar=-1;}else klass().name=name;
  $('clsform').hidden=true;persist();render();
});
$('cls').addEventListener('change',e=>{db.cur=e.target.value;selBar=-1;persist();render();});
let dc=0;
$('clsDel').addEventListener('click',()=>{
  const b=$('clsDel');
  if(Object.keys(db.classes).length<2){msg('Mantenha pelo menos uma turma.','err');return;}
  if(!dc){b.textContent='Confirmar exclusão?';b.classList.add('warn');dc=setTimeout(()=>{dc=0;b.textContent='Excluir turma';b.classList.remove('warn');},4500);return;}
  clearTimeout(dc);dc=0;b.textContent='Excluir turma';b.classList.remove('warn');
  delete db.classes[db.cur];db.cur=Object.keys(db.classes)[0];selBar=-1;persist();render();
});

/* CSV, resumo, backup, impressão */
const q=s=>'"'+String(s).replace(/"/g,'""')+'"';
$('csv').addEventListener('click',()=>{
  const l=rows().sort((a,b)=>b.x-a.x);
  if(!l.length){msg('Não há alunos para exportar.','err');return;}
  const head=['Aluno','XP','Percentual','Missões concluídas','Título','Está em','Código do diploma','Enviado em','Situação','Troféus','Platina'];
  const lines=[head.map(q).join(';')].concat(l.map(s=>[s.n,s.x,s.pct,s.cnt,RANKS[s.rk][1],s.nextTxt,s.code,s.t?new Date(s.t).toLocaleString('pt-BR'):'',s.stTxt.replace(/^[^\wÀ-ÿ—]+/,''),s.tro.length,s.tro.includes('p_all')?'sim':'não'].map(q).join(';')));
  download(new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),'git-quest-'+slug(klass().name)+'.csv');
});
const slug=s=>(s||'turma').normalize('NFKD').replace(/[^\w]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase()||'turma';
$('wpp').addEventListener('click',()=>{
  const l=rows().sort((a,b)=>b.x-a.x);
  if(!l.length){msg('Não há alunos para resumir.','err');return;}
  const g=bottleneck(l),avg=Math.round(l.reduce((a,s)=>a+s.pct,0)/l.length);
  const lines=[`*Git Quest · ${klass().name}* (${new Date().toLocaleDateString('pt-BR')})`,
    `${l.length} alunos · média ${avg}% · ${l.filter(s=>s.finished).length} concluíram`];
  if(g)lines.push(`Onde trava: missão ${g.i+1} (${MISSIONS[g.i].title})`);
  lines.push('','*Top 3*',...l.slice(0,3).map((s,i)=>`${['🥇','🥈','🥉'][i]} ${s.n} · ${s.x} XP`));
  const att=l.filter(s=>s.risk||s.idle);
  if(att.length)lines.push('','*Vamos ajudar:*',...att.map(s=>`• ${s.n} (${s.cnt}/${N}, parou em "${MISSIONS[s.next]?MISSIONS[s.next].title:'—'}")`));
  copy(lines.join('\n')).then(ok=>msg(ok?'Resumo copiado. É só colar no grupo.':'Não consegui copiar automaticamente.',ok?'ok':'err'));
});
$('print').addEventListener('click',()=>window.print());
$('backup').addEventListener('click',()=>download(new Blob([JSON.stringify({gitquest:'turmas',...db},null,1)],{type:'application/json'}),'git-quest-backup-'+new Date().toISOString().slice(0,10)+'.json'));
$('restore').addEventListener('change',async e=>{
  const f=e.target.files[0];e.target.value='';if(!f)return;
  try{
    const j=JSON.parse(await f.text());if(!j||j.gitquest!=='turmas'||!j.classes)throw 0;
    let nc=0,ns=0;
    Object.entries(j.classes).forEach(([id,c])=>{
      const ok={};Object.entries(c.students||{}).forEach(([k,d])=>{
        /* revalida cada aluno: nada de dado sem checksum válido entra no painel */
        const code=GQP.encode({pid:d.p,player:d.n,xp:d.x,done:Object.fromEntries(Object.entries(d.d||{}).map(([i,v])=>[i,{xp:v}])),badges:Object.fromEntries((d.b||[]).map(b=>[b,true])),lang:d.l,cur:d.c});
        const r=GQP.decode(code,N);if(r.ok){r.data.t=Number(d.t)||r.data.t;ok[k]=r.data;ns++;}
      });
      const nid=db.classes[id]?uid():id;db.classes[nid]={name:String(c.name||'Turma').slice(0,40),students:ok};nc++;
    });
    persist();render();msg(`Backup restaurado: ${nc} turma(s), ${ns} aluno(s).`,'ok');
  }catch(err){msg('Arquivo de backup inválido.','err');}
});
render();
})();
