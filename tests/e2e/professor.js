/* Painel da turma: gera códigos de alunos fictícios e confere ranking, gargalo, CSV e códigos inválidos. */
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const {MISSIONS,WORLDS}=require('../../js/missions.js');
const P=require('../../js/progress.js');
const ROOT=path.join(__dirname,'..','..');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  const f=path.join(ROOT,decodeURIComponent(req.url.split('?')[0]));
  if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);
});
let fails=0;const bad=m=>{fails++;console.log('ERRO: '+m);};
const xpOf=i=>MISSIONS[i].type==='quiz'?50:100;
function aluno(nome,pid,ate,t){const done={},badges={};for(let i=0;i<ate;i++)done[i]={xp:xpOf(i)};
  const xp=Object.values(done).reduce((a,d)=>a+d.xp,0);
  const S={pid,player:nome,xp,done,badges,lang:'pt',cur:ate};
  const orig=Date.now;if(t)Date.now=()=>t;const c=P.encode(S);Date.now=orig;return c;}
(async()=>{
  await new Promise(r=>server.listen(0,r));
  const base='http://127.0.0.1:'+server.address().port;
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:1000},acceptDownloads:true,permissions:['clipboard-read','clipboard-write']});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  const page=await ctx.newPage();const errs=[];page.on('pageerror',e=>errs.push(e.message));
  await page.goto(base+'/professor.html');
  const N=MISSIONS.length;
  const lista=[aluno('Ana <img src=x onerror=alert(1)>','a1',N),aluno('Bruno Lima','b2',14),aluno('Carla Souza','c3',14),aluno('Davi','d4',5),aluno('Eva','e5',24,Date.now()-10*864e5)];
  const velho=aluno('Bruno Lima','b2',3,1000);       /* mais antigo: deve ser ignorado */
  const novo=aluno('Davi Alves','d4',7,Date.now()+5000); /* mais novo: atualiza a linha */
  const texto='oi prof, segue:\n'+lista.slice(0,3).join('\n')+'\n\n'+lista[3]+' e '+lista[4]+'\nlixo GQ1.abc.def\n'+velho+'\n'+novo;
  await page.fill('#paste',texto);await page.click('#add');
  await page.waitForSelector('#rows tr');
  const rows=await page.$$eval('#rows tr',trs=>trs.map(tr=>[...tr.children].map(td=>td.textContent)));
  if(rows.length!==5)bad('esperava 5 alunos, veio '+rows.length);
  if(!/^Ana <img/.test(rows[0][0]))bad('nome com HTML deveria aparecer como texto');
  if(await page.$('#rows img'))bad('HTML do nome foi interpretado (XSS)');
  if(rows[0][3]!==N+'/'+N||!/^GQ-/.test(rows[0][6]))bad('aluno que concluiu deveria ter todas as missões e código de diploma: '+rows[0]);
  const davi=rows.find(r=>r[0].startsWith('Davi'));
  if(!davi||davi[0]!=='Davi Alves'||davi[3]!=='7/'+N)bad('atualização do Davi falhou: '+davi);
  const bruno=rows.find(r=>r[0]==='Bruno Lima');
  if(!bruno||bruno[3]!=='14/'+N)bad('código antigo sobrescreveu o novo: '+bruno);
  const msg=await page.textContent('#msg');
  if(!/1 inválido/.test(msg)||!/1 ignorado/.test(msg))bad('mensagem de resumo: '+msg);
  if((await page.$$('#bad li')).length!==1)bad('lista de inválidos');
  /* código de diploma do painel = o mesmo que o aluno veria */
  const esperado=P.diplomaCode('Ana <img src=x onerror=alert(1)>',MISSIONS.reduce((a,m)=>a+xpOf(MISSIONS.indexOf(m)),0),[...Array(N).keys()]);
  if(rows[0][6]!==esperado)bad('código do diploma diverge: '+rows[0][6]+' vs '+esperado);
  /* gargalo: caiu de 12 → 20 concluídos... a maior queda precisa estar marcada */
  const cards=await page.$$eval('#cards .card',c=>c.map(x=>x.textContent));
  if(!/^5/.test(cards[0]))bad('card de alunos: '+cards[0]);
  const gap=await page.$$('#chart .bar.gap');if(gap.length!==1)bad('barra do gargalo: '+gap.length);
  /* ordenar por nome */
  await page.click('th[data-k="n"]');
  const nomes=await page.$$eval('#rows tr td:first-child',t=>t.map(x=>x.textContent));
  const ord=[...nomes].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  if(JSON.stringify(nomes)!==JSON.stringify(ord))bad('ordenação por nome: '+nomes);
  /* situação: Eva parada (10 dias), Davi em risco (29% < média-25), Ana concluiu */
  const st=Object.fromEntries((await page.$$eval('#rows tr',trs=>trs.map(tr=>[tr.children[0].textContent,tr.children[8].textContent]))));
  if(!/Concluiu/.test(st['Ana <img src=x onerror=alert(1)>']))bad('situação da Ana: '+st['Ana <img src=x onerror=alert(1)>']);
  if(!/Parado/.test(st['Eva']))bad('Eva deveria estar parada: '+st['Eva']);
  if(!/Em risco/.test(st['Davi Alves']))bad('Davi deveria estar em risco: '+st['Davi Alves']);
  if(/Parado|risco/.test(st['Bruno Lima']))bad('Bruno não deveria ter alerta: '+st['Bruno Lima']);
  /* filtros e busca */
  await page.click('.chip2[data-f="idle"]');
  if((await page.$$('#rows tr')).length!==1)bad('filtro Parados');
  await page.click('.chip2[data-f="all"]');
  await page.fill('#q','lima');
  if((await page.$$('#rows tr')).length!==1)bad('busca por nome');
  await page.fill('#q','');
  /* clique na barra mostra quem falta */
  await page.click('#chart .bar:nth-child(15)');
  const who=await page.textContent('#who');
  if(!/Ainda não fizeram:.*Davi Alves/.test(who)||/Ainda não fizeram:.*Eva/.test(who))bad('painel "quem falta": '+who);
  if((await page.$$('#axis span')).length!==WORLDS.length)bad('eixo com '+WORLDS.length+' linhas');
  /* detalhe do aluno */
  await page.click('#rows tr:has-text("Eva")');
  await page.waitForSelector('#stu:not([hidden])');
  if((await page.$$('#strip .cell.ok')).length!==24)bad('faixa de missões da Eva');
  if(!/missão 25/.test(await page.textContent('#strip-note')))bad('nota da faixa: '+await page.textContent('#strip-note'));
  if(!/Troféus\s*0\/14/.test(await page.textContent('#stugrid')))bad('painel deveria mostrar troféus: '+await page.textContent('#stugrid'));
  await page.keyboard.press('Escape');
  if(!(await page.$('#stu[hidden]')))bad('Esc deveria fechar o detalhe');
  /* resumo para WhatsApp */
  await page.click('#wpp');await page.waitForSelector('#msg.ok');
  const clip=await page.evaluate(()=>navigator.clipboard.readText());
  if(!/\*Git Quest · Minha turma\*/.test(clip)||!/🥇 Ana/.test(clip)||!/Vamos ajudar/.test(clip))bad('resumo WhatsApp: '+clip);
  /* várias turmas */
  await page.click('#clsNew');await page.fill('#clsName','Noturno 2026/2');await page.press('#clsName','Enter');
  if((await page.$$('#rows tr')).length!==0)bad('turma nova deveria começar vazia');
  await page.fill('#paste',aluno('Zeca','z9',4));await page.click('#add');
  if((await page.$$('#rows tr')).length!==1)bad('aluno na turma nova');
  await page.selectOption('#cls',{label:'Minha turma (5)'});
  if((await page.$$('#rows tr')).length!==5)bad('voltar para a primeira turma');
  /* backup: exporta, esvazia e restaura, rejeitando aluno adulterado */
  const [bk]=await Promise.all([page.waitForEvent('download'),page.click('#backup')]);
  const bf='/tmp/gq-backup.json';await bk.saveAs(bf);
  const bj=JSON.parse(fs.readFileSync(bf,'utf8'));
  if(bj.gitquest!=='turmas'||Object.keys(bj.classes).length!==2)bad('conteúdo do backup');
  const first=Object.values(bj.classes)[0];const k0=Object.keys(first.students)[0];first.students[k0].x+=777; /* XP incoerente */
  fs.writeFileSync('/tmp/gq-backup-forjado.json',JSON.stringify(bj));
  await page.setInputFiles('#restore','/tmp/gq-backup-forjado.json');await page.waitForSelector('#msg.ok');
  const m2=await page.textContent('#msg');
  if(!/2 turma\(s\), 5 aluno\(s\)/.test(m2))bad('restauração deveria descartar o aluno forjado: '+m2);
  await page.setInputFiles('#restore',{name:'x.json',mimeType:'application/json',buffer:Buffer.from('{"oi":1}')});
  await page.waitForSelector('#msg.err');
  /* excluir turma extra */
  while((await page.$$('#cls option')).length>1){
    const lab=await page.$$eval('#cls option',o=>o.map(x=>x.textContent).filter(t=>!t.startsWith('Minha turma (5)')));
    await page.selectOption('#cls',{label:lab[0]});await page.click('#clsDel');await page.click('#clsDel');
  }
  if(!/Minha turma/.test(await page.textContent('#cls option:checked')))bad('turma restante');
  /* persistência */
  await page.reload();await page.waitForSelector('#rows tr');
  if((await page.$$('#rows tr')).length<1)bad('turma não persistiu');
  /* CSV */
  const [dl]=await Promise.all([page.waitForEvent('download'),page.click('#csv')]);
  const f='/tmp/gq-turma.csv';await dl.saveAs(f);const csv=fs.readFileSync(f,'utf8');
  if(!csv.startsWith('﻿"Aluno";')||csv.split('\r\n').length!==6)bad('CSV inesperado');
  /* remover e limpar */
  await page.click('#rows tr:first-child .x');
  if((await page.$$('#rows tr')).length!==4)bad('remover');
  await page.click('#clear');await page.click('#clear');
  if((await page.$$('#rows tr')).length!==0)bad('limpar turma');
  if(process.env.SHOT){await page.fill('#paste',texto);await page.click('#add');await page.click('#chart .bar:nth-child(15)');await page.screenshot({path:process.env.SHOT,fullPage:true});await page.click('#rows tr:has-text("Eva")');await page.screenshot({path:process.env.SHOT.replace('.png','-det.png')});await page.keyboard.press('Escape');await page.setViewportSize({width:400,height:900});await page.screenshot({path:process.env.SHOT.replace('.png','-mob.png'),fullPage:true});}
  if(errs.length)bad('erros de página: '+errs.join(' | '));
  await b.close();server.close();
  console.log(fails?`\n${fails} problemas`:'ok  painel da turma');
  process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
