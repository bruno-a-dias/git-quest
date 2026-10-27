/* E2E dos extras: aviso do terminal acompanha o idioma, desafio cronometrado (+50 XP),
   revisão espaçada e sala de troféus. Uso: node tests/e2e/extras.js */
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT=path.join(__dirname,'..','..');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{let f=path.join(ROOT,decodeURIComponent(req.url.split('?')[0]));if(f.endsWith(path.sep))f+='index.html';if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);});
let fails=0;const bad=m=>{fails++;console.log('  ERRO: '+m);};
(async()=>{
  await new Promise(r=>server.listen(0,r));const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch();const ctx=await browser.newContext({viewport:{width:1280,height:900}});
  await ctx.route(/fonts\./,r=>r.abort());
  const page=await ctx.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/fonts|ERR_FAILED/.test(m.text()))errors.push(m.text());});
  await page.addInitScript(()=>{try{if(!localStorage.getItem('gitquest.v1'))localStorage.setItem('gitquest.v1',JSON.stringify({lang:'pt'}));}catch(e){}});
  await page.goto(base+'/index.html');await page.waitForSelector('#goals li');
  /* 1) aviso do terminal acompanha o idioma */
  const b1=await page.textContent('#termbody');
  if(!/Missão 1 de 40/.test(b1))bad('aviso em português: '+b1.slice(0,80));
  await page.click('#langs .lg[data-code="en"]');
  const b2=await page.textContent('#termbody');
  if(!/Mission 1 of 40/.test(b2)||/Missão 1/.test(b2))bad('aviso não foi traduzido: '+b2.slice(0,80));
  /* 2) desafio: vencer dá +50 XP e conta vitória */
  await page.click('#chbtn');
  if(!await page.isVisible('#chpill'))bad('cronômetro não apareceu');
  for(const c of ['git config --global user.name "Ana"','git config --global user.email "ana@x.com"']){await page.fill('#cmd',c);await page.press('#cmd','Enter');}
  await page.waitForSelector('#mission .win',{timeout:5000});
  const S=await page.evaluate(()=>GQ.S());
  if(S.chw!==1)bad('vitória do desafio não contou: '+S.chw);
  if(S.xp!==125+50&&S.xp!==100+50)bad('XP com bônus esperado 150/175, veio '+S.xp);
  if(!(S.tro||{}).b_first)bad('troféu "Primeiro passo" não veio');
  /* 3) revisão: missão feita com dica entra na fila */
  await page.click('#mission .win .btn.pri');await page.waitForSelector('#goals li');
  await page.click('#h1');
  for(const c of ['mkdir pizzaria','cd pizzaria']){await page.fill('#cmd',c);await page.press('#cmd','Enter');}
  await page.waitForSelector('#mission .win',{timeout:5000});
  const S2=await page.evaluate(()=>GQ.S());
  if(!S2.rev||!S2.rev[1])bad('missão com dica não entrou na revisão');
  if(await page.isHidden('#btnRev'))bad('botão de revisão deveria aparecer');
  await page.click('#btnRev');await page.waitForSelector('#rev:not([hidden])');
  if(!(await page.textContent('#revbody')).includes('pizzaria')&&!(await page.$$('#revbody .revrow')).length)bad('lista de revisão vazia');
  await page.click('#revclose');
  /* 4) sala de troféus abre e mostra 14 */
  await page.click('#btnTro');await page.waitForSelector('#tro:not([hidden])');
  const n=(await page.$$('#trobody .tro')).length;if(n!==14)bad('troféus listados: '+n);
  await page.click('#troclose');
  if(await page.isVisible('#h3')===false){/* ok em missões reais */}
  /* 5) offline: depois da primeira visita o jogo abre sem rede */
  await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));
  await page.waitForFunction(()=>caches.keys().then(k=>k.length>0));
  await page.reload();await page.waitForSelector('#goals li');
  await ctx.setOffline(true);
  await page.reload();
  const ok=await page.waitForSelector('#goals li, #opts',{timeout:8000}).then(()=>true).catch(()=>false);
  if(!ok)bad('jogo não abriu offline');
  else{
    await page.fill('#cmd','git --version');await page.press('#cmd','Enter');
    if(!(await page.textContent('#termbody')).includes('git version'))bad('terminal não respondeu offline');
  }
  await ctx.setOffline(false);
  errors.slice(0,5).forEach(e=>bad(e));
  await browser.close();server.close();
  console.log(fails?`\n${fails} problemas`:'EXTRAS OK NO NAVEGADOR');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
