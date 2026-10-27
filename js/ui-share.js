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
  markExported();
  copyText($('progcode'),$('progcode').value).then(ok=>{if(ok){msg(I18N.t('prog_copied'),'ok');}});
});
function markExported(){const S=GQ.S();if(!S.exp){S.exp=1;GQ.save();if(GQ.checkTrophies)GQ.checkTrophies();}}
$('progfile').addEventListener('click',()=>{
  const S=GQ.S();markExported();
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
  const ns=Object.assign({},S,{xp:o.x,done,badges,player:o.n||S.player,pid:o.p||S.pid,worldHints:{},combo:0,tro:{},rev:{},qf:0,chw:0,perfect:0,bestCombo:0,exp:0,t0:o.t0||0});
  (o.tr||[]).forEach(id=>{ns.tro[id]=Date.now();});
  if(o.st){ns.qf=o.st.q|0;ns.chw=o.st.c|0;ns.perfect=o.st.p|0;ns.bestCombo=o.st.b|0;ns.exp=o.st.e|0;}
  let cur=Number.isInteger(o.c)&&o.c>=0&&o.c<MISSIONS.length?o.c:0;
  GQ.setS(ns);
  if(!GQ.unlocked(cur))cur=Math.min(MISSIONS.length-1,Math.max(-1,...Object.keys(done).map(Number))+1);
  ns.cur=cur;GQ.save();
  GQ.renderBadges();GQ.renderHud();GQ.renderMetro();if(GQ.checkTrophies)GQ.checkTrophies(true);GQ.go(cur,true);
  $('progcode').value=myCode();$('progin').value='';
  msg(I18N.t('prog_import_ok',o.x,Object.keys(done).length),'ok');
});

/* ---------- diploma: código de verificação ---------- */
function certName(){return $('certname').value.trim();}
function certCode(){
  const S=GQ.S();
  return GQP.diplomaCode(certName(),S.xp,Object.keys(S.done));
}
let sealFor='';
function refreshCode(){$('certcode').textContent=certCode();$('certpreview').hidden=true;const k=I18N.lang+'|'+GQ.S().xp;if(sealFor!==k||!dlg.hidden){sealFor=k;drawScreenSeal();}}
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
/* ----- peças de luxo: moldura dourada e selo ----- */
const FD='"Bricolage Grotesque","Noto Sans Devanagari","Trebuchet MS",system-ui,sans-serif';
const FB='"IBM Plex Sans","Noto Sans Devanagari","Segoe UI",system-ui,sans-serif';
const FM='"JetBrains Mono",Consolas,monospace';
const SIGF='64px "Great Vibes","Brush Script MT","Caveat","Dancing Script",cursive';
function goldGrad(c,x0,y0,x1,y1){
  const g=c.createLinearGradient(x0,y0,x1,y1);
  [[0,'#6b4a10'],[.16,'#f6dc86'],[.34,'#b98a1d'],[.5,'#fff3bf'],[.68,'#9b6f16'],[.84,'#f3d575'],[1,'#7a5412']].forEach(([o,k])=>g.addColorStop(o,k));
  return g;
}
function poly(c,pts,fill){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();}
function drawFrame(c,W,H){
  const o=30,t=64,x0=o,y0=o,x1=W-o,y1=H-o,ix0=x0+t,iy0=y0+t,ix1=x1-t,iy1=y1-t;
  c.save();c.shadowColor='rgba(0,0,0,.85)';c.shadowBlur=34;c.shadowOffsetY=10;c.fillStyle='#000';c.fillRect(x0,y0,x1-x0,y1-y0);c.restore();
  const g=goldGrad(c,x0,y0,x1,y1);
  const T=[[x0,y0],[x1,y0],[ix1,iy0],[ix0,iy0]],L=[[x0,y0],[ix0,iy0],[ix0,iy1],[x0,y1]],R=[[x1,y0],[x1,y1],[ix1,iy1],[ix1,iy0]],B=[[x0,y1],[ix0,iy1],[ix1,iy1],[x1,y1]];
  [T,L,R,B].forEach(q=>poly(c,q,g));
  /* luz de cima/esquerda, sombra de baixo/direita: dá volume de moldura entalhada */
  poly(c,T,'rgba(255,255,255,.22)');poly(c,L,'rgba(255,255,255,.08)');poly(c,R,'rgba(0,0,0,.24)');poly(c,B,'rgba(0,0,0,.38)');
  /* filetes de entalhe: externo, central (fundo escuro) e interno */
  c.lineJoin='miter';
  [[0,'#3d2a06',3],[7,'#fff1b0',2],[t*.22,'rgba(60,40,6,.75)',3],[t*.78,'rgba(60,40,6,.75)',3],[t-8,'#fff1b0',2],[t,'#3d2a06',3]].forEach(([d,k,w])=>{c.strokeStyle=k;c.lineWidth=w;c.strokeRect(x0+d,y0+d,x1-x0-2*d,y1-y0-2*d);});
  /* canal central com friso de contas */
  c.fillStyle='rgba(30,20,3,.55)';
  const mid=t*.5,ch=t*.44;
  [[x0+mid-ch/2,y0+mid-ch/2,x1-x0-mid*2+ch,ch],[x0+mid-ch/2,y1-mid-ch/2,x1-x0-mid*2+ch,ch],[x0+mid-ch/2,y0+mid-ch/2,ch,y1-y0-mid*2+ch],[x1-mid-ch/2,y0+mid-ch/2,ch,y1-y0-mid*2+ch]].forEach(r=>c.fillRect(...r));
  const bead=(x,y)=>{const bg=c.createRadialGradient(x-2,y-2,1,x,y,6);bg.addColorStop(0,'#fffbe0');bg.addColorStop(.5,'#e9bf4a');bg.addColorStop(1,'#7a5412');c.fillStyle=bg;c.beginPath();c.arc(x,y,5.2,0,Math.PI*2);c.fill();};
  for(let x=x0+mid+26;x<x1-mid-20;x+=24){bead(x,y0+mid);bead(x,y1-mid);}
  for(let y=y0+mid+26;y<y1-mid-20;y+=24){bead(x0+mid,y);bead(x1-mid,y);}
  /* rosetas nos cantos */
  [[x0+mid,y0+mid],[x1-mid,y0+mid],[x0+mid,y1-mid],[x1-mid,y1-mid]].forEach(([x,y])=>{
    const rg=c.createRadialGradient(x-6,y-6,2,x,y,26);rg.addColorStop(0,'#fffbe0');rg.addColorStop(.45,'#e0b13c');rg.addColorStop(1,'#6b4a10');
    c.fillStyle=rg;c.strokeStyle='#3d2a06';c.lineWidth=2;c.beginPath();c.arc(x,y,24,0,Math.PI*2);c.fill();c.stroke();
    c.fillStyle='#3d2a06';c.beginPath();c.arc(x,y,7,0,Math.PI*2);c.fill();
  });
  /* passe-partout: fundo azul-noite com sombra interna */
  c.fillStyle='#0a1024';c.fillRect(ix0,iy0,ix1-ix0,iy1-iy0);
  for(let k=0;k<14;k++){c.strokeStyle=`rgba(0,0,0,${.34*(1-k/14)})`;c.lineWidth=2;c.strokeRect(ix0+k+1,iy0+k+1,ix1-ix0-2*k-2,iy1-iy0-2*k-2);}
  /* filete dourado duplo e ornamentos de canto */
  const m=30;
  c.strokeStyle=goldGrad(c,ix0,iy0,ix1,iy1);c.lineWidth=3;c.strokeRect(ix0+m,iy0+m,ix1-ix0-2*m,iy1-iy0-2*m);
  c.strokeStyle='#8a6a1c';c.lineWidth=1.5;c.strokeRect(ix0+m+10,iy0+m+10,ix1-ix0-2*m-20,iy1-iy0-2*m-20);
  [[ix0+m,iy0+m,1,1],[ix1-m,iy0+m,-1,1],[ix0+m,iy1-m,1,-1],[ix1-m,iy1-m,-1,-1]].forEach(([x,y,sx,sy])=>{
    c.strokeStyle='#e9bf4a';c.lineWidth=2.5;
    [26,42].forEach(r=>{c.beginPath();c.arc(x,y,r,sx>0?(sy>0?0:-Math.PI/2):(sy>0?Math.PI/2:Math.PI),sx>0?(sy>0?Math.PI/2:0):(sy>0?Math.PI:Math.PI*1.5));c.stroke();});
    c.fillStyle='#f6dc86';c.save();c.translate(x+sx*58,y+sy*58);c.rotate(Math.PI/4);c.fillRect(-6,-6,12,12);c.restore();
  });
}
function arcText(c,text,cx,cy,R,fontPx,font){
  c.font=`700 ${fontPx}px ${font}`;
  const ws=[...text].map(ch=>c.measureText(ch).width+fontPx*.08),total=ws.reduce((a,b)=>a+b,0);
  let span=total/R;const lim=2.55;
  if(span>lim){fontPx*=lim/span;c.font=`700 ${fontPx}px ${font}`;const k=lim/span;for(let i=0;i<ws.length;i++)ws[i]*=k;span=lim;}
  let a=-Math.PI/2-span/2;
  [...text].forEach((ch,i)=>{const mid=a+ws[i]/2/R;c.save();c.translate(cx+R*Math.cos(mid),cy+R*Math.sin(mid));c.rotate(mid+Math.PI/2);c.textAlign='center';c.fillText(ch,0,0);c.restore();a+=ws[i]/R;});
}
function star5(c,x,y,r){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.42:r;c.lineTo(x+rr*Math.cos(a),y+rr*Math.sin(a));}c.closePath();c.fill();}
/* selo dourado com fitas: cx,cy = centro do medalhão; r = raio */
function drawSeal(c,cx,cy,r,rank,count){
  /* fitas */
  const rg=c.createLinearGradient(0,cy,0,cy+r*1.8);rg.addColorStop(0,'#d12c47');rg.addColorStop(1,'#6a0e20');
  [-1,1].forEach(sd=>{
    c.beginPath();c.moveTo(cx+sd*r*.5,cy+r*.35);c.lineTo(cx+sd*r*.02,cy+r*.5);c.lineTo(cx+sd*r*.3,cy+r*1.72);c.lineTo(cx+sd*r*.5,cy+r*1.48);c.lineTo(cx+sd*r*.8,cy+r*1.66);c.closePath();
    c.fillStyle=rg;c.fill();c.strokeStyle='#e9bf4a';c.lineWidth=Math.max(1.5,r*.02);c.stroke();
  });
  /* rosácea de 32 pontas */
  c.save();c.shadowColor='rgba(0,0,0,.6)';c.shadowBlur=r*.18;c.shadowOffsetY=r*.06;
  c.beginPath();for(let i=0;i<64;i++){const a=i*Math.PI/32,rr=i%2?r*.92:r;c.lineTo(cx+rr*Math.cos(a),cy+rr*Math.sin(a));}c.closePath();
  const gg=c.createRadialGradient(cx-r*.35,cy-r*.35,r*.1,cx,cy,r);gg.addColorStop(0,'#fff7cf');gg.addColorStop(.35,'#f1c84b');gg.addColorStop(.75,'#b8861b');gg.addColorStop(1,'#6b4a10');
  c.fillStyle=gg;c.fill();c.restore();
  c.strokeStyle='#4a3208';c.lineWidth=Math.max(1,r*.015);c.stroke();
  /* anel azul-noite com o título em arco */
  c.beginPath();c.arc(cx,cy,r*.84,0,Math.PI*2);c.fillStyle='#0c1431';c.fill();
  c.lineWidth=Math.max(2,r*.035);c.strokeStyle=goldGrad(c,cx-r,cy-r,cx+r,cy+r);c.stroke();
  /* escritas com letras ligadas (devanágari) não podem ser separadas letra a letra num arco */
  const arc=/[\u0900-\u097F]/.test(rank||'')?'GIT QUEST · '+new Date().getFullYear():(rank||'').toUpperCase();
  c.fillStyle='#f6dc86';arcText(c,arc,cx,cy,r*.7,r*.17,FB);
  [-.5,0,.5].forEach(d=>{const a=Math.PI/2+d*.42;c.fillStyle='#f6dc86';star5(c,cx+r*.7*Math.cos(a),cy+r*.7*Math.sin(a),r*.075);});
  /* disco central */
  c.beginPath();c.arc(cx,cy,r*.54,0,Math.PI*2);
  const cg=c.createRadialGradient(cx-r*.2,cy-r*.25,r*.05,cx,cy,r*.54);cg.addColorStop(0,'#fff3bf');cg.addColorStop(.6,'#e9bf4a');cg.addColorStop(1,'#a67a17');
  c.fillStyle=cg;c.fill();c.strokeStyle='#4a3208';c.lineWidth=Math.max(1.5,r*.025);c.stroke();
  c.fillStyle='#3a2606';c.textAlign='center';c.textBaseline='alphabetic';
  star5(c,cx,cy-r*.3,r*.1);
  c.font=`800 ${r*.42}px ${FD}`;c.fillText(String(count),cx,cy+r*.18);
  c.font=`700 ${r*.1}px ${FB}`;if('letterSpacing' in c)c.letterSpacing=r*.02+'px';c.fillText('GIT QUEST',cx,cy+r*.36);if('letterSpacing' in c)c.letterSpacing='0px';
  /* brilho */
  const hl=c.createRadialGradient(cx-r*.45,cy-r*.55,0,cx-r*.45,cy-r*.55,r*.9);hl.addColorStop(0,'rgba(255,255,255,.45)');hl.addColorStop(1,'rgba(255,255,255,0)');
  c.save();c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.clip();c.fillStyle=hl;c.fillRect(cx-r,cy-r,r*2,r*2);c.restore();
}
async function loadFonts(sample){
  try{
    await Promise.all([`800 64px ${FD}`,`700 44px ${FD}`,`400 30px ${FB}`,`600 24px ${FB}`,`700 24px ${FB}`,`600 26px ${FM}`].map(f=>document.fonts.load(f,sample+'Git Quest')).concat(document.fonts.load(SIGF,'Bruno A. Dias')));
    await document.fonts.ready;
  }catch(e){}
}
async function drawDiploma(){
  const S=GQ.S(),W=1754,H=1240;
  await loadFonts(certName());
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const c=cv.getContext('2d');
  /* fundo */
  const bg=c.createRadialGradient(W/2,H*.4,100,W/2,H/2,W*.7);bg.addColorStop(0,'#131d42');bg.addColorStop(1,'#060a16');
  c.fillStyle=bg;c.fillRect(0,0,W,H);
  c.strokeStyle='rgba(120,140,200,.06)';c.lineWidth=1;
  for(let x=0;x<=W;x+=40){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}
  for(let y=0;y<=H;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
  drawFrame(c,W,H);
  c.textAlign='center';c.textBaseline='alphabetic';
  /* cabeçalho */
  c.fillStyle='#8d9ac0';c.font=`600 28px ${FB}`;
  if('letterSpacing' in c)c.letterSpacing='7px';
  c.fillText(I18N.t('cert_small').toUpperCase(),W/2,250);
  if('letterSpacing' in c)c.letterSpacing='0px';
  c.save();c.shadowColor='rgba(251,191,36,.45)';c.shadowBlur=30;
  c.fillStyle=goldGrad(c,W/2-300,300,W/2+300,380);c.font=`800 132px ${FD}`;c.fillText('Git Quest',W/2,385);c.restore();
  /* divisor ornamental */
  const dy=425;c.strokeStyle='#b98a1d';c.lineWidth=2;
  [[-1],[1]].forEach(([sd])=>{c.beginPath();c.moveTo(W/2+sd*40,dy);c.lineTo(W/2+sd*300,dy);c.stroke();});
  c.fillStyle='#f6dc86';c.save();c.translate(W/2,dy);c.rotate(Math.PI/4);c.fillRect(-9,-9,18,18);c.restore();
  c.fillStyle='#c9d2ee';c.font=`400 34px ${FB}`;c.fillText(I18N.t('cert_to'),W/2,490);
  /* nome */
  let size=92;const name=certName();
  do{c.font=`700 ${size}px ${FD}`;size-=4;}while(c.measureText(name).width>W-480&&size>38);
  c.fillStyle='#f4f6ff';c.fillText(name,W/2,600);
  c.strokeStyle='#b98a1d';c.setLineDash([12,9]);c.lineWidth=2;
  c.beginPath();c.moveTo(W/2-520,630);c.lineTo(W/2+520,630);c.stroke();c.setLineDash([]);
  /* texto */
  c.fillStyle='#c9d2ee';c.font=`400 33px ${FB}`;
  const txt=I18N.t('cert_txt',MISSIONS.length,S.xp,GQ.RK[GQ.rankOf(S.xp)].name);
  let y=702;wrap(c,txt,W-520).forEach(l=>{c.fillText(l,W/2,y);y+=46;});
  /* conquistas */
  const names=BADGES.filter(b=>S.badges[b.id]).map(b=>I18N.badge(b).t);
  c.font=`600 23px ${FB}`;
  let rows=[],row=[],rw=0;const gap=14,pad=18;
  names.forEach(n=>{const w=c.measureText(n).width+pad*2;if(rw+w+(row.length?gap:0)>W-520&&row.length){rows.push(row);row=[];rw=0;}row.push([n,w]);rw+=w+(row.length>1?gap:0);});
  if(row.length)rows.push(row);
  y+=6;
  rows.forEach(r=>{
    const tot=r.reduce((a,[,w])=>a+w,0)+gap*(r.length-1);let x=W/2-tot/2;
    r.forEach(([n,w])=>{
      c.fillStyle='#16213f';c.strokeStyle='#b98a1d';c.lineWidth=1.8;
      c.beginPath();c.roundRect?c.roundRect(x,y-28,w,42,21):c.rect(x,y-28,w,42);c.fill();c.stroke();
      c.fillStyle='#f4f6ff';c.fillText(n,x+w/2,y+2);x+=w+gap;
    });
    y+=54;
  });
  /* selo de conclusão, canto inferior direito, sobre o passe-partout */
  drawSeal(c,W-310,H-300,92,GQ.RK[GQ.rankOf(S.xp)].name,MISSIONS.length);
  /* assinatura do professor (centro-direita do rodapé), em dourado claro para contrastar com o fundo escuro */
  const sx=1010;
  c.save();c.textAlign='center';c.textBaseline='alphabetic';
  c.shadowColor='rgba(251,191,36,.35)';c.shadowBlur=14;
  c.fillStyle='#f6e7b4';c.font=SIGF;c.fillText('Bruno A. Dias',sx,H-206);c.restore();
  c.strokeStyle='#b98a1d';c.lineWidth=2;c.beginPath();c.moveTo(sx-170,H-186);c.lineTo(sx+170,H-186);c.stroke();
  c.textAlign='center';c.fillStyle='#e9edf9';c.font=`700 24px ${FB}`;c.fillText('Prof. Me. Bruno A. Dias',sx,H-154);
  /* rodapé à esquerda: data, código e endereço */
  c.textAlign='left';c.fillStyle='#8d9ac0';c.font=`600 26px ${FM}`;
  c.fillText(new Date().toLocaleDateString(I18N.locale,{day:'2-digit',month:'long',year:'numeric'}),240,H-214);
  c.fillStyle='#f1c84b';c.fillText(I18N.t('cert_code')+': '+certCode(),240,H-178);
  c.fillStyle='#5e6b93';c.font=`400 22px ${FB}`;
  c.fillText('bruno-a-dias.github.io/git-quest',240,H-148);
  return cv;
}
/* selo exibido no diploma da tela */
async function drawScreenSeal(){
  const cv=$('certseal');if(!cv)return;
  const S=GQ.S();await loadFonts('');
  const c=cv.getContext('2d');c.clearRect(0,0,cv.width,cv.height);
  drawSeal(c,cv.width/2,128,100,GQ.RK[GQ.rankOf(S.xp)].name,MISSIONS.length);
  cv.classList.remove('pop');void cv.offsetWidth;cv.classList.add('pop');
}
/* ----- verso do diploma: trilhas e troféus lado a lado, com a numeração abaixo ----- */
function fit(c,text,maxW){
  if(c.measureText(text).width<=maxW)return text;
  let t=text;while(t.length>1&&c.measureText(t+'…').width>maxW)t=t.slice(0,-1);return t+'…';
}
/* escreve num tamanho que caiba na largura (reduz a fonte até 12px) */
function shrink(c,text,maxW,font,x,y){
  const m=/(\d+)px/.exec(font);let px=+m[1];
  do{c.font=font.replace(/\d+px/,px+'px');px--;}while(c.measureText(text).width>maxW&&px>=12);
  c.fillText(text,x,y);
}
function cup(c,x,y,sc,tier,on){
  const col=GQ.TC[tier],P=GQ.CUP;
  c.save();c.translate(x,y);c.scale(sc,sc);c.globalAlpha=on?1:.28;
  c.lineCap='round';c.lineJoin='round';
  c.strokeStyle=col[1];c.lineWidth=2.4;c.stroke(new Path2D(P.hands));
  const g=c.createLinearGradient(14,6,34,28);g.addColorStop(0,col[2]);g.addColorStop(.45,col[0]);g.addColorStop(1,col[1]);
  c.fillStyle=g;c.lineWidth=1.6;c.fill(new Path2D(P.bowl));c.stroke(new Path2D(P.bowl));
  c.fillStyle=col[2];c.globalAlpha=on?.7:.2;c.fill(new Path2D(P.hl));c.globalAlpha=on?1:.28;
  c.lineWidth=4;c.stroke(new Path2D(P.stem));
  c.fillStyle=g;c.lineWidth=1.6;c.fill(new Path2D(P.base));c.stroke(new Path2D(P.base));
  if(tier==='platinum'){c.fillStyle=col[1];star5(c,24,17,5.5);}
  c.restore();
}
function backStats(){
  const S=GQ.S(),ids=GQ.trophyIds();
  const tracks=WORLDS.map((w,wi)=>{
    const ms=MISSIONS.map((m,i)=>[m,i]).filter(([m])=>m.w===wi);
    return {n:w.n,c:w.c,name:I18N.world(wi),done:ms.filter(([,i])=>S.done[i]).length,total:ms.length,xp:ms.reduce((a,[,i])=>a+((S.done[i]&&S.done[i].xp)||0),0)};
  });
  return {S,ids,tracks,counts:GQT.counts(ids)};
}
async function drawBack(){
  const {S,ids,tracks,counts}=backStats(),W=1754,H=1240;
  await loadFonts(certName());
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');
  const bg=c.createRadialGradient(W/2,H*.4,100,W/2,H/2,W*.7);bg.addColorStop(0,'#131d42');bg.addColorStop(1,'#060a16');
  c.fillStyle=bg;c.fillRect(0,0,W,H);
  c.strokeStyle='rgba(120,140,200,.06)';c.lineWidth=1;
  for(let x=0;x<=W;x+=40){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke();}
  for(let y=0;y<=H;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
  drawFrame(c,W,H);
  const L=190,R=W-190,dev=/[\u0900-\u097F]/.test(I18N.t('back_title')),spc=(px)=>{if('letterSpacing' in c)c.letterSpacing=(dev?0:px)+'px';};/* letras ligadas do devanágari não aceitam espaçamento */
  c.textBaseline='alphabetic';
  /* cabeçalho */
  c.textAlign='center';c.fillStyle='#8d9ac0';c.font=`600 26px ${FB}`;spc(6);c.fillText(I18N.t('back_title').toUpperCase(),W/2,226);spc(0);
  let size=64;const name=certName();
  do{c.font=`700 ${size}px ${FD}`;size-=4;}while(c.measureText(name).width>W-520&&size>34);
  c.fillStyle='#f4f6ff';c.fillText(name,W/2,296);
  c.fillStyle=goldGrad(c,W/2-300,312,W/2+300,352);c.font=`800 34px ${FD}`;c.fillText('Git Quest',W/2,344);
  c.strokeStyle='#b98a1d';c.lineWidth=2;c.beginPath();c.moveTo(L,372);c.lineTo(R,372);c.stroke();
  /* títulos das duas metades */
  const RX=960;
  c.textAlign='left';c.fillStyle='#f1c84b';c.font=`700 30px ${FD}`;spc(4);
  c.fillText(I18N.t('back_tracks').toUpperCase(),L,416);c.fillText(I18N.t('back_trophies').toUpperCase(),RX,416);spc(0);
  c.strokeStyle='rgba(185,138,29,.45)';c.lineWidth=1.5;
  c.beginPath();c.moveTo(L,430);c.lineTo(880,430);c.moveTo(RX,430);c.lineTo(R,430);c.stroke();
  /* trilhas: grade 3x3, anel de progresso e numeração embaixo */
  const cw=230,ch=146;
  tracks.forEach((t,i)=>{
    const cx=L+(i%3)*cw+cw/2,cy0=446+Math.floor(i/3)*ch,cy=cy0+44;
    c.lineWidth=9;c.strokeStyle='rgba(140,160,210,.22)';c.beginPath();c.arc(cx,cy,34,0,Math.PI*2);c.stroke();
    if(t.done){c.strokeStyle=t.c;c.lineCap='round';c.beginPath();c.arc(cx,cy,34,-Math.PI/2,-Math.PI/2+Math.PI*2*t.done/t.total);c.stroke();c.lineCap='butt';}
    c.fillStyle=t.done===t.total?t.c:'#16213f';c.beginPath();c.arc(cx,cy,24,0,Math.PI*2);c.fill();
    c.textAlign='center';c.fillStyle=t.done===t.total?'#0a1024':'#e9edf9';c.font=`800 26px ${FD}`;c.fillText(String(t.n),cx,cy+9);
    c.fillStyle='#f4f6ff';c.font=`800 30px ${FD}`;c.fillText(t.done+'/'+t.total,cx,cy0+108);
    c.fillStyle='#9fb0d8';c.font=`400 19px ${FB}`;c.fillText(fit(c,t.name,cw-18),cx,cy0+134);
  });
  /* troféus: quatro taças lado a lado com a contagem embaixo */
  const kw=(R-RX)/4;
  GQT.TIERS.forEach((tier,i)=>{
    const cx=RX+i*kw+kw/2,n=counts[tier];
    cup(c,cx-50,446,2.1,tier,n.have>0);
    c.textAlign='center';c.fillStyle=n.have?'#f4f6ff':'#6d7aa3';c.font=`800 44px ${FD}`;c.fillText(n.have+'/'+n.total,cx,598);
    c.fillStyle=GQ.TC[tier][0];c.font=`700 22px ${FB}`;spc(2);c.fillText(I18N.t('tro_'+tier).toUpperCase(),cx,630);spc(0);
  });
  /* nomes dos troféus conquistados */
  c.textAlign='left';c.font=`500 21px ${FB}`;
  const have=GQT.TROPHIES.filter(t=>ids.includes(t.id));
  if(!have.length){c.fillStyle='#6d7aa3';c.fillText('—',RX,684);}
  have.forEach((t,i)=>{
    const col=i%2,row=Math.floor(i/2),x=RX+col*(kw*2),y=684+row*31;
    c.fillStyle=GQ.TC[t.tier][0];c.beginPath();c.arc(x+8,y-7,7,0,Math.PI*2);c.fill();
    c.fillStyle='#d6def5';c.fillText(fit(c,I18N.trophy(t.id).t,kw*2-34),x+24,y);
  });
  /* resumo */
  const rankName=GQ.RK[GQ.rankOf(S.xp)].name,nDone=Object.keys(S.done).filter(k=>MISSIONS[k]).length,nBadge=BADGES.filter(b=>S.badges[b.id]).length;
  const cells=[[I18N.t('back_rank'),rankName],[I18N.t('back_xp'),String(S.xp)],[I18N.t('back_missions'),nDone+'/'+MISSIONS.length],[I18N.t('back_badges'),nBadge+'/'+BADGES.length],[I18N.t('back_challenges'),String(S.chw|0)],[I18N.t('back_perfect'),String(S.perfect|0)]];
  const cwid=(R-L)/cells.length;
  c.strokeStyle='rgba(185,138,29,.5)';c.lineWidth=1.5;c.beginPath();c.moveTo(L,906);c.lineTo(R,906);c.stroke();
  cells.forEach(([lb,v],i)=>{
    const cx=L+i*cwid+cwid/2;c.textAlign='center';
    c.fillStyle='#8d9ac0';shrink(c,lb.toUpperCase(),cwid-24,`600 17px ${FB}`,cx,942);
    c.fillStyle='#f4f6ff';c.font=`800 ${i===0?26:36}px ${FD}`;c.fillText(fit(c,v,cwid-20),cx,990);
  });
  c.beginPath();c.strokeStyle='rgba(185,138,29,.5)';c.lineWidth=1.5;c.moveTo(L,1012);c.lineTo(R,1012);c.stroke();
  /* rodapé: período, emissão, código e nota */
  const fmt=d=>d.toLocaleDateString(I18N.locale,{day:'2-digit',month:'2-digit',year:'numeric'});
  const today=new Date(),start=S.t0?new Date(S.t0*1000):today;
  c.textAlign='left';c.fillStyle='#8d9ac0';c.font=`500 21px ${FM}`;
  c.fillText(I18N.t('back_period')+': '+fmt(start)+' – '+fmt(today),L+40,1052);
  c.textAlign='right';c.fillStyle='#f1c84b';c.fillText(I18N.t('cert_code')+': '+certCode(),R-40,1052);
  c.textAlign='center';c.fillStyle='#5e6b93';c.font=`400 17px ${FB}`;
  wrap(c,I18N.t('back_note'),R-L).slice(0,1).forEach(l=>c.fillText(l,W/2,1084));
  return cv;
}
GQ.drawBack=drawBack;
async function showBack(){
  const nm=certName();
  if(!nm){$('certname').focus();GQ.toast(I18N.t('cert_name_ph'),'');return null;}
  const cv=await drawBack();
  $('certbackimg').src=cv.toDataURL('image/png');
  return cv;
}
function pdfBytes(cv){
  const u=cv.toDataURL('image/jpeg',.92).split(',')[1],bin=atob(u),a=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a;
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
/* frente e verso: alternar na tela, baixar o verso em PNG e o conjunto em PDF */
const front=$('certfront'),backBox=$('certbackbox');
$('certflip').addEventListener('click',async()=>{
  const b=$('certflip');b.disabled=true;
  try{if(await showBack()){front.hidden=true;backBox.hidden=false;}}finally{b.disabled=false;}
});
$('certunflip').addEventListener('click',()=>{backBox.hidden=true;front.hidden=false;});
$('certbackpng').addEventListener('click',async()=>{
  const cv=await drawBack();cv.toBlob(b=>{if(b)saveBlob(b,'diploma-verso-git-quest-'+slug(certName())+'.png');},'image/png');
});
async function savePdf(){
  const nm=certName();
  if(!nm){$('certname').focus();GQ.toast(I18N.t('cert_name_ph'),'');return;}
  const [a,b]=[await drawDiploma(),await drawBack()];
  const pdf=GQPDF.build([{data:pdfBytes(a),w:a.width,h:a.height},{data:pdfBytes(b),w:b.width,h:b.height}],{title:'Diploma Git Quest - '+nm});
  saveBlob(new Blob([pdf],{type:'application/pdf'}),'diploma-git-quest-'+slug(nm)+'.pdf');
}
$('certpdf').addEventListener('click',savePdf);
$('certpdf2').addEventListener('click',savePdf);
$('certclose2').addEventListener('click',()=>$('certclose').click());
new MutationObserver(()=>{if(dlg.hidden){backBox.hidden=true;front.hidden=false;}}).observe(dlg,{attributes:true,attributeFilter:['hidden']});
})();
