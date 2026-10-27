/* Teste de ponta a ponta: abre o jogo num Chromium de verdade e joga as 32 missões
   pela interface (digitando os comandos e clicando nos quizzes), em cada idioma pedido.
   Também confere: código de progresso, importação e diploma em PNG.
   Uso: node tests/e2e/play-all.js            (pt e hi)
        LANGS=all node tests/e2e/play-all.js  (os 8 idiomas)
        LANGS=pt,de node tests/e2e/play-all.js */
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const {MISSIONS}=require('../../js/missions.js');
const ROOT=path.join(__dirname,'..','..');
const ALL=['pt','en','es','fr','de','it','ru','hi'];
const LANGS=process.env.LANGS==='all'?ALL:(process.env.LANGS||'pt,hi').split(',');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{
  let f=path.join(ROOT,decodeURIComponent(req.url.split('?')[0]));
  if(f.endsWith(path.sep))f+='index.html';
  if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);
});
let fails=0;const bad=m=>{fails++;console.log('  ERRO: '+m);};

async function newPage(browser,base,lang,errors){
  const ctx=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true,locale:'en-US'});
  /* bloqueia fontes externas: o teste não depende de rede */
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/fonts\.|ERR_FAILED/.test(m.text()))errors.push('console: '+m.text());});
  await page.addInitScript(l=>{try{if(!localStorage.getItem('gitquest.v1'))localStorage.setItem('gitquest.v1',JSON.stringify({lang:l}));}catch(e){}},lang);
  await page.goto(base+'/index.html');
  await page.waitForSelector('#mission .win, #goals li, #opts',{timeout:10000});
  return {ctx,page};
}

async function playAll(page,lang){
  for(let i=0;i<MISSIONS.length;i++){
    const m=MISSIONS[i];
    const cur=await page.evaluate(()=>GQ.S().cur);
    if(cur!==i){bad(`[${lang}] esperava missão ${i}, está na ${cur}`);return false;}
    if(m.type==='quiz'){
      await page.waitForSelector('#opts .opt');
      await page.locator('#opts .opt').nth(m.answer).click();
    }else{
      await page.waitForSelector('#goals li');
      for(const cmd of m.solution){
        await page.fill('#cmd',cmd);await page.press('#cmd','Enter');
      }
    }
    try{await page.waitForSelector('#mission .win',{timeout:5000});}
    catch(e){
      const g=await page.$$eval('#goals li',ls=>ls.map(l=>l.className));
      bad(`[${lang}] missão ${i} "${m.title}" não concluiu. objetivos: ${JSON.stringify(g)}`);return false;
    }
    if(i<MISSIONS.length-1)await page.locator('#mission .win .btn.pri').click();
  }
  return true;
}

(async()=>{
  await new Promise(r=>server.listen(0,r));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch();
  let progressCode='';
  for(const lang of LANGS){
    const errors=[];const t0=Date.now();
    const {ctx,page}=await newPage(browser,base,lang,errors);
    const shown=await page.evaluate(()=>I18N.lang);
    if(shown!==lang)bad(`[${lang}] idioma ativo foi ${shown}`);
    const ok=await playAll(page,lang);
    if(ok){
      const S=await page.evaluate(()=>GQ.S());
      const done=Object.keys(S.done).length;
      if(done!==MISSIONS.length)bad(`[${lang}] concluídas: ${done}/${MISSIONS.length}`);
      const exp=MISSIONS.length&&S.xp;
      if(!(exp>0))bad(`[${lang}] XP zerado`);
      /* diploma abre sozinho ao terminar */
      await page.waitForSelector('#diploma:not([hidden])',{timeout:5000}).catch(()=>bad(`[${lang}] diploma não abriu`));
      /* código de verificação e PNG */
      await page.fill('#certname','Maria da Silva — '+lang);
      const code=await page.textContent('#certcode');
      if(!/^GQ-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code))bad(`[${lang}] código do diploma inválido: ${code}`);
      const [dl]=await Promise.all([page.waitForEvent('download',{timeout:10000}),page.click('#certpng')]);
      const file=path.join(require('os').tmpdir(),'gq-diploma-'+lang+'.png');await dl.saveAs(file);
      const buf=fs.readFileSync(file);
      if(buf.length<20000||buf.readUInt32BE(16)!==1754||buf.readUInt32BE(20)!==1240)bad(`[${lang}] PNG do diploma inesperado (${buf.length} bytes)`);
      if(process.env.KEEP_PNG)fs.copyFileSync(file,path.join(process.env.KEEP_PNG,'diploma-'+lang+'.png'));
      /* exportar */
      await page.click('#certclose');await page.click('#btnProgress');
      progressCode=await page.inputValue('#progcode');
      if(!/^GQ1\./.test(progressCode))bad(`[${lang}] código de progresso inválido`);
      /* importar em navegador novo: precisa reproduzir XP e missões */
      const second=await newPage(browser,base,lang,errors);
      await second.page.click('#btnProgress');
      await second.page.fill('#progin',progressCode);await second.page.click('#progload');
      await second.page.waitForSelector('#progmsg.ok',{timeout:5000}).catch(()=>bad(`[${lang}] importação não confirmou`));
      const S2=await second.page.evaluate(()=>GQ.S());
      if(S2.xp!==S.xp||Object.keys(S2.done).length!==done)bad(`[${lang}] importação divergiu: xp ${S2.xp}/${S.xp}`);
      /* código adulterado é recusado */
      await second.page.fill('#progin',progressCode.slice(0,-2)+'zz');await second.page.click('#progload');
      await second.page.waitForSelector('#progmsg.err',{timeout:3000}).catch(()=>bad(`[${lang}] código adulterado foi aceito`));
      await second.ctx.close();
    }
    if(errors.length)errors.slice(0,5).forEach(e=>bad(`[${lang}] ${e}`));
    await ctx.close();
    console.log(`${fails?'FALHOU':'ok    '} ${lang}  ${((Date.now()-t0)/1000).toFixed(1)}s`);
  }
  await browser.close();server.close();
  console.log(fails?`\n${fails} problemas`:`\nJOGO COMPLETO NO NAVEGADOR EM ${LANGS.length} IDIOMA(S): ${LANGS.join(', ')}`);
  process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
