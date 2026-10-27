/* Confere se todos os idiomas estão completos e coerentes com missions.js */
const fs=require('fs'),path=require('path');
const {MISSIONS,WORLDS,RANKS,BADGES}=require('../js/missions.js');
const D={};global.I18N={add:(c,d)=>{D[c]=d;}};
const dir=path.join(__dirname,'..','js','lang');
fs.readdirSync(dir).filter(f=>f.endsWith('.js')).forEach(f=>{(0,eval)(fs.readFileSync(path.join(dir,f),'utf8').replace(/^\s*I18N\.add/,'I18N.add'));});
let fails=0;const bad=m=>{fails++;console.log('ERRO: '+m);};
const ref=D.en;const cmdRe=/\bgit [a-z-]+(?: [-\w.\/@{}~"<>]+)*/g;
Object.keys(D).forEach(c=>{
  const d=D[c];
  Object.keys(ref.ui).forEach(k=>{if(d.ui[k]===undefined)bad(c+': falta ui.'+k);else{
    const a=(ref.ui[k].match(/\{\d+\}/g)||[]).sort().join(),b=(d.ui[k].match(/\{\d+\}/g)||[]).sort().join();
    if(a!==b)bad(c+': marcadores {n} diferentes em ui.'+k);}});
  Object.keys(d.ui).forEach(k=>{if(ref.ui[k]===undefined)bad(c+': chave extra ui.'+k);});
  if(!d.worlds||d.worlds.length!==WORLDS.length)bad(c+': worlds');
  if(!d.ranks||d.ranks.length!==RANKS.length)bad(c+': ranks');
  BADGES.forEach(b=>{if(!d.badges||!d.badges[b.id]||d.badges[b.id].length!==2)bad(c+': badge '+b.id);});
  if(!d.missions||d.missions.length!==MISSIONS.length){bad(c+': missions length');return;}
  MISSIONS.forEach((m,i)=>{
    const x=d.missions[i];
    if(m.type==='quiz'){if(x.length!==4||x[2].length!==4||x.some(v=>!v||(Array.isArray(v)&&v.some(s=>!s))))bad(c+': quiz '+i);}
    else{
      if(x.length!==5||x[2].length!==m.goals.length||x[3].length!==2||x.some(v=>!v))bad(c+': missão '+i);
      /* os trechos técnicos (opções, arquivos, branches, aspas) citados nas dicas precisam continuar iguais */
      const toks=(m.hints.join(' ').match(/\S+/g)||[]).map(w=>w.replace(/[,.;:()]+$/,'')).filter(w=>/[-\/@{<"=~]|\.[a-z]/.test(w)&&!/^[-–]$/.test(w)&&w.length>1);
      const t=x[3].join(' ');
      toks.forEach(w=>{if(i===0&&/["@]/.test(w))return;/* exemplos de nome/e-mail são traduzidos de propósito */if(!t.includes(w))bad(c+': missão '+i+' dica perdeu "'+w+'"');});
    }
  });
});
console.log(fails?('\n'+fails+' problemas'):'\nTODOS OS IDIOMAS ESTÃO COMPLETOS ('+Object.keys(D).join(', ')+')');
process.exit(fails?1:0);
