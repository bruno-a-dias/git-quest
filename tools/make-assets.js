/* Gera os ícones do PWA (192, 512, maskable) e a imagem de capa 1200x630 (redes sociais).
   Uso: node tools/make-assets.js   (precisa do Playwright: npm i)  */
const fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT=path.join(__dirname,'..');
const C={bronze:['#cd7f32','#7a4a1a','#f3b57a'],silver:['#d5d9e0','#69707d','#ffffff'],gold:['#ffd24a','#a87a08','#fff4b8'],platinum:['#c9efff','#3f9fcf','#ffffff']};
const cup=(t,s)=>{const c=C[t];return `<svg viewBox="0 0 48 48" width="${s}" height="${s}"><path d="M14 9H8v4a6 6 0 0 0 6 6M34 9h6v4a6 6 0 0 1-6 6" fill="none" stroke="${c[1]}" stroke-width="2.4" stroke-linecap="round"/><path d="M14 6h20v12a10 10 0 0 1-20 0z" fill="${c[0]}" stroke="${c[1]}" stroke-width="1.6" stroke-linejoin="round"/><path d="M18 8h3v10a6 6 0 0 0 1 3.5A6 6 0 0 1 18 15z" fill="${c[2]}" opacity=".75"/><path d="M24 28v8" stroke="${c[1]}" stroke-width="4" stroke-linecap="round"/><path d="M17 36h14v6H17z" fill="${c[0]}" stroke="${c[1]}" stroke-width="1.6" stroke-linejoin="round"/>${t==='platinum'?'<path d="M24 11l1.4 3.2 3.4.3-2.6 2.2.8 3.3-3-1.8-3 1.8.8-3.3-2.6-2.2 3.4-.3z" fill="#3f9fcf"/>':''}</svg>`;};
const mark=(s)=>fs.readFileSync(path.join(ROOT,'favicon.svg'),'utf8').replace('<svg ',`<svg width="${s}" height="${s}" `);
const LINES=['#2dd4bf','#fbbf24','#fb7185','#a78bfa','#f97316','#38bdf8','#4ade80','#f43f5e','#e2e8f0'];
const metro=()=>LINES.map((c,i)=>{const y=34+i*38,n=3+(i%4);const dots=Array.from({length:n},(_,k)=>`<circle cx="${40+k*(250/(n-1||1))+ (i%2?0:0)}" cy="${y}" r="9" fill="${k===n-1?c:'#0a0f1e'}" stroke="${c}" stroke-width="5"/>`).join('');return `<path d="M40 ${y}H290" stroke="${c}" stroke-width="7" stroke-linecap="round"/>${dots}`;}).join('');
const cover=`<html><body style="margin:0;width:1200px;height:630px;background:radial-gradient(900px 500px at 25% 20%,#16224d,#0a0f1e 70%);color:#f4f6ff;font-family:'Inter','Segoe UI',system-ui,sans-serif;position:relative;overflow:hidden">
<div style="position:absolute;inset:26px;border:3px solid #b98a1d;border-radius:20px;box-shadow:inset 0 0 0 8px #0a0f1e,inset 0 0 0 10px #8a6a1c"></div>
<div style="position:absolute;left:84px;top:84px;display:flex;align-items:center;gap:24px">${mark(104)}<div style="font-size:92px;font-weight:800;letter-spacing:-2px;background:linear-gradient(135deg,#f6dc86,#b98a1d 45%,#fff3bf 60%,#d9a830);-webkit-background-clip:text;color:transparent">Git Quest</div></div>
<div style="position:absolute;left:88px;top:236px;font-size:42px;font-weight:600;line-height:1.25;max-width:720px">Aprenda Git jogando.<br><span style="color:#9fb0d8;font-weight:500;font-size:32px">Terminal simulado, XP, troféus e diploma.</span></div>
<div style="position:absolute;left:88px;top:420px;display:flex;gap:14px;font-size:26px;font-weight:700">${['9 linhas','40 missões','8 idiomas'].map(t=>`<span style="padding:8px 20px;border:2px solid #b98a1d;border-radius:999px;background:#131d42">${t}</span>`).join('')}</span></div>
<div style="position:absolute;left:84px;top:500px;display:flex;gap:18px;align-items:center">${['bronze','silver','gold','platinum'].map(t=>cup(t,74)).join('')}<span style="margin-left:14px;font:600 24px 'JetBrains Mono',Consolas,monospace;color:#2dd4bf">$ git commit -m "venci!"</span></div>
<svg style="position:absolute;right:92px;top:92px" width="330" height="${34*2+8*38}" viewBox="0 0 330 ${34*2+8*38}">${metro()}</svg>
</body></html>`;
const icon=(pad,bg)=>`<html><body style="margin:0;width:512px;height:512px;background:${bg||'transparent'};display:grid;place-items:center">${mark(512-pad*2)}</body></html>`;
(async()=>{
  const b=await chromium.launch();
  const shot=async(html,w,h,file,omit)=>{const p=await b.newPage({viewport:{width:w,height:h}});await p.setContent(html);await p.screenshot({path:path.join(ROOT,file),omitBackground:!!omit});await p.close();};
  await shot(cover,1200,630,'assets/cover.png');
  await shot(icon(0),512,512,'assets/icons/icon-512.png',true);
  await shot(icon(96,'#0a0f1e'),512,512,'assets/icons/icon-maskable-512.png');
  const p=await b.newPage({viewport:{width:192,height:192}});await p.setContent(`<html><body style="margin:0">${mark(192)}</body></html>`);await p.screenshot({path:path.join(ROOT,'assets/icons/icon-192.png'),omitBackground:true});
  await b.close();console.log('assets gerados');
})();
