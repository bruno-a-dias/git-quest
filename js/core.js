/* ===== Núcleo do jogo: iniciar missão e avaliar objetivos ===== */
const DEFAULT_ID={name:'Aluno Git',email:'aluno@iesb.edu.br'};
function startMission(g,m,identity){
  g.reset();
  if(!m.noIdentity){
    const id=identity||DEFAULT_ID;
    g.silent(['git config --global user.name "'+id.name.replace(/"/g,'')+'"','git config --global user.email "'+id.email.replace(/"/g,'')+'"']);
  }
  (m.setup||[]).forEach(s=>{if(typeof s==='function')s(g);else g.silent([s]);});
  return {hist:[],flags:{},errors:0,hintsUsed:0,done:false};
}
function track(g,ctx){
  const r=g.repo();
  if(r&&r.merging)ctx.flags.conflict=true;
  if(r&&r.stash.length>0)ctx.flags.stash=true;
}
function stepMission(g,m,ctx,cmd){
  const res=g.run(cmd);
  const c=cmd.trim();
  if(c)ctx.hist.push(c);
  if(res.err)ctx.errors++;
  track(g,ctx);
  return res;
}
function goalStates(g,m,ctx){
  track(g,ctx);
  return (m.goals||[]).map(x=>{try{return !!x.ok(g,ctx);}catch(e){return false;}});
}
if(typeof module!=='undefined')module.exports={startMission,stepMission,goalStates,DEFAULT_ID};
