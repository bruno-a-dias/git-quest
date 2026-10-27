const fs=require('fs'),path=require('path');
const {createGit}=require('../js/git-engine.js');
const {MISSIONS}=require('../js/missions.js');
const {startMission,stepMission,goalStates}=require('../js/core.js');
let fails=0;
const g=createGit();
MISSIONS.forEach((m,i)=>{
  if(m.type==='quiz'){
    if(!(m.options&&m.options.length===4&&m.answer>=0&&m.answer<4)){fails++;console.log('QUIZ inválido: '+m.title);}
    return;
  }
  const ctx=startMission(g,m,null);
  if(m.type==='real'){
    if(goalStates(g,m,ctx).some(Boolean)){fails++;console.log('REAL JÁ NASCE CONCLUÍDA: '+m.title);}
    ctx.flags.verified=true;
    if(!goalStates(g,m,ctx).every(Boolean)){fails++;console.log('REAL NÃO CONCLUI: '+m.title);}
    else console.log('ok  #'+String(i).padStart(2,'0')+' '+m.title+'  (missão real)');
    return;
  }
  const before=goalStates(g,m,ctx);
  if(before.every(Boolean)){fails++;console.log('JÁ NASCE CONCLUÍDA: #'+i+' '+m.title);}
  m.solution.forEach(cmd=>{const r=stepMission(g,m,ctx,cmd);if(r.err&&!(m.title==='Nasce um repositório'&&cmd==='git status')){fails++;console.log('ERRO na solução de "'+m.title+'": '+cmd+'\n  '+r.out.map(l=>l[0][1]).join(' | '));}});
  const after=goalStates(g,m,ctx);
  if(!after.every(Boolean)){fails++;console.log('SOLUÇÃO NÃO COMPLETA: #'+i+' '+m.title+' -> '+JSON.stringify(after)+'  hist='+JSON.stringify(ctx.hist));}
  else console.log('ok  #'+String(i).padStart(2,'0')+' '+m.title+'  ('+m.goals.length+' objetivos)');
});
console.log(fails?('\n'+fails+' problemas'):'\nTODAS AS MISSÕES SÃO COMPLETÁVEIS');
process.exit(fails?1:0);
