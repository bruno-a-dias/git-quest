/* Painel da turma: lê códigos de progresso (GQ1.*) e resume a turma. Nada sai do navegador. */
(function(){
const $=id=>document.getElementById(id);
const KEY='gitquest.turma.v1';
const N=MISSIONS.length;
const TOTAL=MISSIONS.reduce((a,m)=>a+(m.type==='quiz'?50:100),0);
const RKAT=[0,.08,.25,.45,.7,.92].map(f=>Math.round(f*TOTAL));
const rankName=xp=>{let r=0;RKAT.forEach((a,i)=>{if(xp>=a)r=i;});return RANKS[r][1];};
const rankIdx=xp=>{let r=0;RKAT.forEach((a,i)=>{if(xp>=a)r=i;});return r;};
let turma={};   /* pid -> dados do código */
let sort={k:'x',dir:-1};
try{turma=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){turma={};}
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(turma));}catch(e){}};
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function msg(t,cls){const m=$('msg');m.textContent=t||'';m.className='progmsg'+(cls?' '+cls:'');}

const ERR={format:'formato inválido (copie o código inteiro)',checksum:'código alterado ou cortado',xp:'XP não bate com as missões',mission:'missão inexistente'};
function ingest(text){
  const codes=GQP.extract(text);
  const bad=$('bad');bad.textContent='';
  let added=0,updated=0,invalid=0,older=0;
  codes.forEach(c=>{
    const r=GQP.decode(c,N);
    if(!r.ok){invalid++;bad.appendChild(el('li',null,c.slice(0,24)+'…  → '+(ERR[r.error]||'inválido')));return;}
    const d=r.data,id=d.p||('s:'+(d.n||'?').toLowerCase());
    const old=turma[id];
    if(old){if((old.t||0)>(d.t||0)){older++;return;}updated++;}else added++;
    turma[id]=d;
  });
  persist();render();
  if(!codes.length){msg('Nenhum código GQ1 encontrado no texto.','err');return;}
  msg(`${added} adicionado(s), ${updated} atualizado(s)`+(older?`, ${older} ignorado(s) por ser mais antigo(s)`:'')+(invalid?`, ${invalid} inválido(s)`:'')+'.',invalid?'err':'ok');
}

function derive(d){
  const done=Object.keys(d.d).map(Number),set=new Set(done);
  let next=0;while(next<N&&set.has(next))next++;
  const name=(d.n||'(sem nome)').trim();
  return {
    id:d.p,n:name,x:d.x,pct:Math.round(d.x/TOTAL*100),cnt:done.length,rk:rankIdx(d.x),next,
    nextTxt:next>=N?'Concluiu tudo':`${next+1}. ${MISSIONS[next].title}`,
    code:done.length===N?GQP.diplomaCode(name,d.x,done):'',t:d.t||0,set,raw:d
  };
}
const rows=()=>Object.values(turma).map(derive);

function renderCards(list){
  const c=$('cards');c.textContent='';
  const add=(big,small,cls)=>{const d=el('div','card'+(cls?' '+cls:''));d.appendChild(el('b',null,big));d.appendChild(el('span',null,small));c.appendChild(d);};
  const n=list.length;
  add(String(n),'alunos na turma');
  add(n?Math.round(list.reduce((a,s)=>a+s.pct,0)/n)+'%':'–','progresso médio');
  add(String(list.filter(s=>s.cnt===N).length),'concluíram as '+N+' missões');
  const g=bottleneck(list);
  add(g?`${g.i+1}. ${MISSIONS[g.i].title}`:'–',g?`maior queda: ${g.drop} aluno(s) a menos que na anterior`:'maior gargalo','wide');
}
function bottleneck(list){
  if(list.length<2)return null;
  const cnt=Array.from({length:N},(_,i)=>list.filter(s=>s.set.has(i)).length);
  let best=null;
  for(let i=1;i<N;i++){const drop=cnt[i-1]-cnt[i];if(drop>0&&(!best||drop>best.drop))best={i,drop};}
  return best;
}
function renderChart(list){
  const ch=$('chart');ch.textContent='';
  const n=list.length,max=Math.max(1,n);
  const cnt=Array.from({length:N},(_,i)=>list.filter(s=>s.set.has(i)).length);
  const g=bottleneck(list);
  cnt.forEach((v,i)=>{
    const b=el('div','bar'+(g&&g.i===i?' gap':''));
    b.style.height=Math.max(1,v/max*100)+'%';b.style.background=WORLDS[MISSIONS[i].w].c;
    b.tabIndex=0;b.title=`${i+1}. ${MISSIONS[i].title}: ${v} de ${n} aluno(s)`;
    b.setAttribute('aria-label',b.title);
    if(n&&n<=12&&v)b.appendChild(el('i',null,String(v)));
    ch.appendChild(b);
  });
  $('chartnote').textContent=g?`Atenção à missão ${g.i+1} (${MISSIONS[g.i].title}): ${g.drop} aluno(s) concluíram a anterior e pararam aqui.`:(n?'Sem queda relevante entre missões.':'');
}
const fmtDate=t=>t?new Date(t).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
function renderTable(list){
  const key=sort.k;
  list.sort((a,b)=>{
    const va=key==='rk'?a.rk:a[key],vb=key==='rk'?b.rk:b[key];
    const r=(typeof va==='string'?va.localeCompare(vb,'pt-BR'):va-vb)*sort.dir;
    return r||a.n.localeCompare(b.n,'pt-BR');
  });
  const tb=$('rows');tb.textContent='';
  list.forEach(s=>{
    const tr=el('tr',s.cnt===N?'done':'');
    tr.appendChild(el('td','who',s.n));
    tr.appendChild(el('td','num',String(s.x)));
    const p=el('td','num');const bar=el('span','pct');const i=document.createElement('i');i.style.width=s.pct+'%';bar.appendChild(i);p.appendChild(bar);p.appendChild(document.createTextNode(s.pct+'%'));tr.appendChild(p);
    tr.appendChild(el('td','num',s.cnt+'/'+N));
    tr.appendChild(el('td',null,RANKS[s.rk][1]));
    tr.appendChild(el('td','where',s.nextTxt));
    tr.appendChild(el('td','mono',s.code||'–'));
    tr.appendChild(el('td',null,fmtDate(s.t)));
    const x=el('td');const bt=el('button','x','×');bt.type='button';bt.title='Remover '+s.n;bt.setAttribute('aria-label','Remover '+s.n);
    bt.addEventListener('click',()=>{delete turma[s.id];persist();render();});x.appendChild(bt);tr.appendChild(x);
    tb.appendChild(tr);
  });
  $('empty').hidden=list.length>0;
  document.querySelectorAll('#tbl th[data-k]').forEach(th=>{
    if(th.dataset.k===sort.k)th.setAttribute('aria-sort',sort.dir<0?'descending':'ascending');else th.removeAttribute('aria-sort');
  });
}
function render(){const l=rows();renderCards(l);renderChart(l);renderTable(l);}

/* ---------- eventos ---------- */
$('add').addEventListener('click',()=>{ingest($('paste').value);$('paste').value='';});
$('files').addEventListener('change',async e=>{
  const fs=[...e.target.files];let all='';
  for(const f of fs){all+='\n'+await f.text();}
  e.target.value='';ingest(all);
});
let clr=0;
$('clear').addEventListener('click',()=>{
  const b=$('clear');
  if(!clr){b.textContent='Confirmar: apagar a turma?';b.classList.add('warn');clr=setTimeout(()=>{clr=0;b.textContent='Limpar turma';b.classList.remove('warn');},4500);return;}
  clearTimeout(clr);clr=0;b.textContent='Limpar turma';b.classList.remove('warn');turma={};persist();render();msg('Turma apagada.','ok');
});
document.querySelectorAll('#tbl th[data-k]').forEach(th=>{
  th.tabIndex=0;
  const go=()=>{const k=th.dataset.k;sort=sort.k===k?{k,dir:-sort.dir}:{k,dir:(k==='n'||k==='code'||k==='next')?1:-1};render();};
  th.addEventListener('click',go);th.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
});
const q=s=>'"'+String(s).replace(/"/g,'""')+'"';
$('csv').addEventListener('click',()=>{
  const l=rows().sort((a,b)=>b.x-a.x);
  if(!l.length){msg('Não há alunos para exportar.','err');return;}
  const head=['Aluno','XP','Percentual','Missões concluídas','Título','Está em','Código do diploma','Enviado em'];
  const lines=[head.map(q).join(';')].concat(l.map(s=>[s.n,s.x,s.pct,s.cnt,RANKS[s.rk][1],s.nextTxt,s.code,s.t?new Date(s.t).toLocaleString('pt-BR'):''].map(q).join(';')));
  const blob=new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='git-quest-turma.csv';document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);
});
render();
})();
