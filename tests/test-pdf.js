const {execFileSync}=require('child_process');const fs=require('fs'),os=require('os'),path=require('path');
const {build}=require('../js/pdf.js');
let fails=0;const bad=m=>{fails++;console.log('ERRO: '+m);};
/* JPEG real de 8x8 (gerado com python/PIL se existir; senão um mínimo válido embutido) */
const jpg=Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=','base64');
const pdf=build([{data:new Uint8Array(jpg),w:1754,h:1240},{data:new Uint8Array(jpg),w:1754,h:1240}],{title:'Teste'});
const s=Buffer.from(pdf).toString('latin1');
if(!s.startsWith('%PDF-1.4')||!s.trimEnd().endsWith('%%EOF'))bad('cabeçalho/rodapé');
if((s.match(/\/Type \/Page /g)||[]).length!==2)bad('duas páginas');
/* a tabela xref precisa apontar para "N 0 obj" exatos */
const xr=/startxref\n(\d+)/.exec(s)[1]|0;
const lines=s.slice(xr).split('\n');const n=+lines[1].split(' ')[1];
for(let i=1;i<n;i++){const off=+lines[2+i].slice(0,10);if(s.slice(off,off+(i+' 0 obj').length)!==i+' 0 obj'){bad('xref do objeto '+i);break;}}
try{const f=path.join(os.tmpdir(),'gq-test.pdf');fs.writeFileSync(f,pdf);
  try{const o=execFileSync('python3',['-c','import sys\ntry:\n import pypdf\nexcept Exception:\n print("skip");sys.exit()\nr=pypdf.PdfReader(sys.argv[1]);print(len(r.pages))',f]).toString().trim();if(o!=='skip'&&o!=='2')bad('pypdf leu '+o+' páginas');}catch(e){}
}catch(e){}
console.log(fails?('\n'+fails+' problemas'):'PDF OK');process.exit(fails?1:0);
