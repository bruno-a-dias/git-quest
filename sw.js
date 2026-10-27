/* Service worker do Git Quest: o jogo inteiro funciona sem internet depois da primeira visita.
   - arquivos do jogo: cache primeiro, atualizando em segundo plano (stale-while-revalidate)
   - fontes do Google: cache na primeira vez que carregam
   - API do GitHub (missões de verdade): nunca vai para o cache
   Ao mudar arquivos do jogo, aumente CACHE_VERSION. */
const CACHE_VERSION='gq-v2';
const PRECACHE=[
  './','index.html','professor.html','manifest.webmanifest','favicon.svg',
  'css/style.css','css/professor.css',
  'js/git-engine.js','js/missions.js','js/i18n.js',
  'js/lang/en.js','js/lang/es.js','js/lang/fr.js','js/lang/de.js','js/lang/it.js','js/lang/ru.js','js/lang/hi.js',
  'js/progress.js','js/trophies.js','js/real.js','js/pdf.js','js/pwa.js','js/core.js',
  'js/ui-panels.js','js/ui-game.js','js/ui-extras.js','js/ui-share.js','js/professor.js',
  'assets/cover.png','assets/icons/icon-192.png','assets/icons/icon-512.png','assets/icons/icon-maskable-512.png'
];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE_VERSION).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE_VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.hostname==='api.github.com')return;
  const font=/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if(url.origin!==location.origin&&!font)return;
  e.respondWith(caches.open(CACHE_VERSION).then(async cache=>{
    const hit=await cache.match(req,{ignoreSearch:true});
    const net=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))cache.put(req,r.clone());return r;}).catch(()=>null);
    if(hit){e.waitUntil(net);return hit;}
    const r=await net;
    if(r)return r;
    if(req.mode==='navigate')return (await cache.match('index.html'))||Response.error();
    return Response.error();
  }));
});
