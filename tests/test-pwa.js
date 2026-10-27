/* O service worker só funciona se tudo o que o jogo carrega estiver na lista de pré-cache. */
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');let fails=0;const bad=m=>{fails++;console.log('ERRO: '+m);};
const sw=fs.readFileSync(path.join(ROOT,'sw.js'),'utf8');
const list=eval(/const PRECACHE=(\[[\s\S]*?\]);/.exec(sw)[1]);
list.forEach(f=>{if(f!=='./'&&!fs.existsSync(path.join(ROOT,f)))bad('pré-cache aponta para arquivo inexistente: '+f);});
for(const page of ['index.html','professor.html']){
  const html=fs.readFileSync(path.join(ROOT,page),'utf8');
  const refs=[...html.matchAll(/(?:src|href)="((?!https?:|#|data:)[^"]+)"/g)].map(m=>m[1]).filter(f=>!/^\.?\/?$/.test(f));
  refs.forEach(f=>{if(!list.includes(f))bad(page+' usa '+f+' que não está no pré-cache');});
}
const man=JSON.parse(fs.readFileSync(path.join(ROOT,'manifest.webmanifest'),'utf8'));
man.icons.forEach(i=>{if(!fs.existsSync(path.join(ROOT,i.src)))bad('ícone ausente '+i.src);});
if(!man.icons.some(i=>i.sizes==='192x192')||!man.icons.some(i=>i.sizes==='512x512'))bad('ícones 192 e 512 são exigidos');
const cover=fs.readFileSync(path.join(ROOT,'assets/cover.png'));
if(cover.readUInt32BE(16)!==1200||cover.readUInt32BE(20)!==630)bad('capa precisa ter 1200x630');
console.log(fails?('\n'+fails+' problemas'):'PWA OK ('+list.length+' arquivos no pré-cache)');process.exit(fails?1:0);
