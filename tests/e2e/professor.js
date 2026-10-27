/* Painel da turma: gera códigos de alunos fictícios e confere ranking, gargalo, CSV e códigos inválidos. */
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const {MISSIONS}=require('../../js/missions.js');
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
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:1000},acceptDownloads:true});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  const page=await ctx.newPage();const errs=[];page.on('pageerror',e=>errs.push(e.message));
  await page.goto(base+'/professor.html');
  const N=MISSIONS.length;
  const lista=[aluno('Ana <img src=x onerror=alert(1)>','a1',N),aluno('Bruno Lima','b2',12),aluno('Carla Souza','c3',12),aluno('Davi','d4',5),aluno('Eva','e5',20)];
  const velho=aluno('Bruno Lima','b2',3,1000);       /* mais antigo: deve ser ignorado */
  const novo=aluno('Davi Alves','d4',9,Date.now()+5000); /* mais novo: atualiza a linha */
  const texto='oi prof, segue:\n'+lista.slice(0,3).join('\n')+'\n\n'+lista[3]+' e '+lista[4]+'\nlixo GQ1.abc.def\n'+velho+'\n'+novo;
  await page.fill('#paste',texto);await page.click('#add');
  await page.waitForSelector('#rows tr');
  const rows=await page.$$eval('#rows tr',trs=>trs.map(tr=>[...tr.children].map(td=>td.textContent)));
  if(rows.length!==5)bad('esperava 5 alunos, veio '+rows.length);
  if(!/^Ana <img/.test(rows[0][0]))bad('nome com HTML deveria aparecer como texto');
  if(await page.$('#rows img'))bad('HTML do nome foi interpretado (XSS)');
  if(rows[0][3]!=='32/32'||!/^GQ-/.test(rows[0][6]))bad('aluno que concluiu deveria ter 32/32 e código de diploma: '+rows[0]);
  const davi=rows.find(r=>r[0].startsWith('Davi'));
  if(!davi||davi[0]!=='Davi Alves'||davi[3]!=='9/32')bad('atualização do Davi falhou: '+davi);
  const bruno=rows.find(r=>r[0]==='Bruno Lima');
  if(!bruno||bruno[3]!=='12/32')bad('código antigo sobrescreveu o novo: '+bruno);
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
  /* persistência */
  await page.reload();await page.waitForSelector('#rows tr');
  if((await page.$$('#rows tr')).length!==5)bad('turma não persistiu');
  /* CSV */
  const [dl]=await Promise.all([page.waitForEvent('download'),page.click('#csv')]);
  const f='/tmp/gq-turma.csv';await dl.saveAs(f);const csv=fs.readFileSync(f,'utf8');
  if(!csv.startsWith('﻿"Aluno";')||csv.split('\r\n').length!==6)bad('CSV inesperado');
  /* remover e limpar */
  await page.click('#rows tr:first-child .x');
  if((await page.$$('#rows tr')).length!==4)bad('remover');
  await page.click('#clear');await page.click('#clear');
  if((await page.$$('#rows tr')).length!==0)bad('limpar turma');
  if(process.env.SHOT){await page.fill('#paste',texto);await page.click('#add');await page.screenshot({path:process.env.SHOT,fullPage:true});}
  if(errs.length)bad('erros de página: '+errs.join(' | '));
  await b.close();server.close();
  console.log(fails?`\n${fails} problemas`:'ok  painel da turma');
  process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
