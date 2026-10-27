/* ===== Interface (parte C): código de progresso, importação e diploma em imagem ===== */
(function(){
const {$}=GQ;
const dlg=$('diploma'),prog=$('progress');

/* ---------- utilidades ---------- */
function slug(s){return (s||'aluno').normalize('NFKD').replace(/[^\w]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase()||'aluno';}
function saveBlob(blob,name){
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;
  document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);
}
function copyText(ta,txt){
  const fallback=()=>{ta.focus();ta.select();try{return document.execCommand('copy');}catch(e){return false;}};
  if(navigator.clipboard&&navigator.clipboard.writeText){return navigator.clipboard.writeText(txt).then(()=>true).catch(()=>fallback());}
  return Promise.resolve(fallback());
}
function msg(text,cls){const m=$('progmsg');m.textContent=text||'';m.className='progmsg'+(cls?' '+cls:'');}
function closeAll(e){if(e.key==='Escape'){prog.hidden=true;}}

/* ---------- código de progresso ---------- */
function myCode(){
  const S=GQ.S();
  if(!S.pid){S.pid=GQP.newPid();GQ.save();}
  return GQP.encode(S);
}
let confirmTimer=0;
function resetConfirm(){clearTimeout(confirmTimer);confirmTimer=0;$('progload').textContent=I18N.t('prog_import_btn');$('progload').classList.remove('warn');}
function openProgress(){
  $('progcode').value=myCode();$('progin').value='';msg('');resetConfirm();
  prog.hidden=false;$('progcopy').focus();
}
$('btnProgress').addEventListener('click',openProgress);
$('progclose').addEventListener('click',()=>{prog.hidden=true;resetConfirm();});
document.addEventListener('keydown',closeAll);
$('progcopy').addEventListener('click',()=>{
  copyText($('progcode'),$('progcode').value).then(ok=>{if(ok){msg(I18N.t('prog_copied'),'ok');}});
});
$('progfile').addEventListener('click',()=>{
  const S=GQ.S();
  saveBlob(new Blob([$('progcode').value+'\n'],{type:'text/plain'}),'gitquest-'+slug(S.player||S.id.name)+'.gqp.txt');
});
$('progload').addEventListener('click',()=>{
  const found=GQP.extract($('progin').value);
  if(!found.length){msg(I18N.t('prog_import_bad'),'err');return;}
  const r=GQP.decode(found[0],MISSIONS.length);
  if(!r.ok){msg(I18N.t('prog_import_bad'),'err');return;}
  const S=GQ.S();
  if(S.xp>0&&!confirmTimer){
    $('progload').textContent=I18N.t('prog_import_confirm');$('progload').classList.add('warn');
    confirmTimer=setTimeout(resetConfirm,5000);return;
  }
  resetConfirm();
  const o=r.data,done={};Object.keys(o.d).forEach(k=>{done[k]={xp:o.d[k]};});
  const badges={};(o.b||[]).forEach(id=>{badges[id]=true;});
  const ns=Object.assign({},S,{xp:o.x,done,badges,player:o.n||S.player,pid:o.p||S.pid,worldHints:{},combo:0});
  let cur=Number.isInteger(o.c)&&o.c>=0&&o.c<MISSIONS.length?o.c:0;
  GQ.setS(ns);
  if(!GQ.unlocked(cur))cur=Math.min(MISSIONS.length-1,Math.max(-1,...Object.keys(done).map(Number))+1);
  ns.cur=cur;GQ.save();
  GQ.renderBadges();GQ.renderHud();GQ.renderMetro();GQ.go(cur,true);
  $('progcode').value=myCode();$('progin').value='';
  msg(I18N.t('prog_import_ok',o.x,Object.keys(done).length),'ok');
});

/* ---------- diploma: código de verificação ---------- */
function certName(){return $('certname').value.trim();}
function certCode(){
  const S=GQ.S();
  return GQP.diplomaCode(certName(),S.xp,Object.keys(S.done));
}
function refreshCode(){$('certcode').textContent=certCode();$('certpreview').hidden=true;}
$('certname').addEventListener('input',refreshCode);
new MutationObserver(()=>{if(!dlg.hidden)refreshCode();}).observe(dlg,{attributes:true,attributeFilter:['hidden']});
I18N.onChange(()=>{if(!dlg.hidden)refreshCode();});

/* ---------- diploma: imagem PNG ---------- */
function wrap(ctx,text,maxW){
  /* quebra por palavras; textos sem espaço (hindi/russo/CJK) caem na quebra por letra */
  const words=text.split(/\s+/),lines=[];let cur='';
  const push=w=>{
    if(ctx.measureText(w).width<=maxW){return w;}
    let part='';for(const ch of w){if(ctx.measureText(part+ch).width>maxW){lines.push(part);part=ch;}else part+=ch;}
    return part;
  };
  words.forEach(w=>{
    const t=cur?cur+' '+w:w;
    if(ctx.measureText(t).width<=maxW){cur=t;}
    else{if(cur)lines.push(cur);cur=push(w);}
  });
  if(cur)lines.push(cur);
  return lines;
}
async function drawDiploma(){
  const S=GQ.S(),W=1600,H=1131;
  const FD='"Bricolage Grotesque","Noto Sans Devanagari","Trebuchet MS",system-ui,sans-serif';
  const FB='"IBM Plex Sans","Noto Sans Devanagari","Segoe UI",system-ui,sans-serif';
  const FM='"JetBrains Mono",Consolas,monospace';
  try{
    await Promise.all([`800 64px ${FD}`,`700 44px ${FD}`,`400 30px ${FB}`,`600 24px ${FB}`,`600 26px ${FM}`].map(f=>document.fonts.load(f,certName()+'Git Quest')));
    await document.fonts.ready;
  }catch(e){}
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const c=cv.getContext('2d');
  /* fundo: papel milimetrado escuro */
  c.fillStyle='#0a0f1e';c.fillRect(0,0,W,H);
  c.strokeStyle='rgba(120,140,200,.07)';c.lineWidth=1;
  for(let x=0;x<=W;x+=40){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}
  for(let y=0;y<=H;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
  /* moldura dupla */
  c.strokeStyle='#fbbf24';c.lineWidth=6;c.strokeRect(50,50,W-100,H-100);
  c.strokeStyle='#243259';c.lineWidth=2;c.strokeRect(74,74,W-148,H-148);
  c.textAlign='center';c.textBaseline='alphabetic';
  /* topo */
  c.fillStyle='#8d9ac0';c.font=`600 26px ${FB}`;
  if('letterSpacing' in c)c.letterSpacing='6px';
  c.fillText(I18N.t('cert_small').toUpperCase(),W/2,170);
  if('letterSpacing' in c)c.letterSpacing='0px';
  c.fillStyle='#fbbf24';c.font=`800 112px ${FD}`;c.fillText('Git Quest',W/2,300);
  c.fillStyle='#c9d2ee';c.font=`400 32px ${FB}`;c.fillText(I18N.t('cert_to'),W/2,380);
  /* nome (encolhe se for longo) */
  let size=84;const name=certName();
  do{c.font=`700 ${size}px ${FD}`;size-=4;}while(c.measureText(name).width>W-300&&size>36);
  c.fillStyle='#e9edf9';c.fillText(name,W/2,490);
  c.strokeStyle='#5e6b93';c.setLineDash([10,8]);c.lineWidth=2;
  c.beginPath();c.moveTo(W/2-480,516);c.lineTo(W/2+480,516);c.stroke();c.setLineDash([]);
  /* texto de conclusão */
  c.fillStyle='#c9d2ee';c.font=`400 34px ${FB}`;
  const txt=I18N.t('cert_txt',MISSIONS.length,S.xp,GQ.RK[GQ.rankOf(S.xp)].name);
  let y=598;wrap(c,txt,W-340).forEach(l=>{c.fillText(l,W/2,y);y+=50;});
  /* conquistas */
  const names=BADGES.filter(b=>S.badges[b.id]).map(b=>I18N.badge(b).t);
  c.font=`600 24px ${FB}`;
  let rows=[],row=[],rw=0;const gap=16,pad=20;
  names.forEach(n=>{const w=c.measureText(n).width+pad*2;if(rw+w+(row.length?gap:0)>W-340&&row.length){rows.push(row);row=[];rw=0;}row.push([n,w]);rw+=w+(row.length>1?gap:0);});
  if(row.length)rows.push(row);
  y+=14;
  rows.forEach(r=>{
    const tot=r.reduce((a,[,w])=>a+w,0)+gap*(r.length-1);let x=W/2-tot/2;
    r.forEach(([n,w])=>{
      c.fillStyle='#16213f';c.strokeStyle='#243259';c.lineWidth=2;
      c.beginPath();c.roundRect?c.roundRect(x,y-30,w,46,23):c.rect(x,y-30,w,46);c.fill();c.stroke();
      c.fillStyle='#e9edf9';c.fillText(n,x+w/2,y+3);x+=w+gap;
    });
    y+=62;
  });
  /* linha de metrô com as 7 estações (uma por mundo) */
  const ly=H-250,x0=240,x1=W-240;
  c.lineCap='round';c.lineWidth=12;c.strokeStyle='#243259';c.beginPath();c.moveTo(x0,ly);c.lineTo(x1,ly);c.stroke();
  WORLDS.forEach((w,i)=>{
    const x=x0+(x1-x0)*i/(WORLDS.length-1);
    c.fillStyle='#0a0f1e';c.strokeStyle=w.c;c.lineWidth=8;c.beginPath();c.arc(x,ly,17,0,Math.PI*2);c.fill();c.stroke();
    c.fillStyle=w.c;c.beginPath();c.arc(x,ly,6,0,Math.PI*2);c.fill();
  });
  /* rodapé: data, código e endereço */
  c.fillStyle='#8d9ac0';c.font=`600 26px ${FM}`;c.textAlign='left';
  c.fillText(new Date().toLocaleDateString(I18N.locale,{day:'2-digit',month:'long',year:'numeric'}),130,H-130);
  c.textAlign='right';c.fillStyle='#fbbf24';
  c.fillText(I18N.t('cert_code')+': '+certCode(),W-130,H-130);
  c.textAlign='center';c.fillStyle='#5e6b93';c.font=`400 22px ${FB}`;
  c.fillText('bruno-a-dias.github.io/git-quest',W/2,H-92);
  return cv;
}
$('certpng').addEventListener('click',async()=>{
  const nm=certName();
  if(!nm){$('certname').focus();GQ.toast(I18N.t('cert_name_ph'),'');return;}
  const btn=$('certpng');btn.disabled=true;
  try{
    const cv=await drawDiploma();
    const url=cv.toDataURL('image/png');
    $('certimg').src=url;$('certpreview').hidden=false;
    cv.toBlob(b=>{if(b)saveBlob(b,'diploma-git-quest-'+slug(nm)+'.png');},'image/png');
  }finally{btn.disabled=false;}
});
GQ.drawDiploma=drawDiploma;
})();
