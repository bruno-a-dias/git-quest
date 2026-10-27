/* ===== Troféus estilo PlayStation: bronze, prata, ouro e platina =====
   Função pura: recebe o estado salvo (S) e a lista de missões e devolve os ids conquistados.
   Estatísticas usadas (todas opcionais no save antigo): S.done, S.qf (quizzes de primeira),
   S.bestCombo, S.exp (exportou o progresso), S.chw (desafios vencidos), S.perfect (missões perfeitas). */
(function(root,factory){
  if(typeof module!=='undefined'&&module.exports)module.exports=factory();else root.GQT=factory();
})(typeof self!=='undefined'?self:this,function(){
  const TIERS=['bronze','silver','gold','platinum'];
  const TROPHIES=[
    {id:'b_first',tier:'bronze',ok:c=>c.done>=1},
    {id:'b_w1',tier:'bronze',ok:c=>c.world(0)},
    {id:'b_quiz',tier:'bronze',ok:c=>(c.S.qf|0)>=1},
    {id:'b_combo',tier:'bronze',ok:c=>(c.S.bestCombo|0)>=3},
    {id:'b_save',tier:'bronze',ok:c=>!!c.S.exp},
    {id:'s_half',tier:'silver',ok:c=>c.done>=Math.ceil(c.total/2)},
    {id:'s_branch',tier:'silver',ok:c=>c.world(3)},
    {id:'s_conflict',tier:'silver',ok:c=>c.world(4)},
    {id:'s_clock',tier:'silver',ok:c=>(c.S.chw|0)>=3},
    {id:'g_cloud',tier:'gold',ok:c=>c.world(6)},
    {id:'g_adv',tier:'gold',ok:c=>c.world(7)},
    {id:'g_real',tier:'gold',ok:c=>c.world(8)},
    {id:'g_perfect',tier:'gold',ok:c=>(c.S.perfect|0)>=10},
    {id:'p_all',tier:'platinum',ok:c=>c.done>=c.total&&c.others}
  ];
  function earned(S,missions){
    const done=S.done||{},total=missions.length;
    const n=Object.keys(done).filter(k=>missions[k]).length;
    const world=w=>{const ms=missions.map((m,i)=>[m,i]).filter(([m])=>m.w===w);return ms.length>0&&ms.every(([,i])=>!!done[i]);};
    const base={S,done:n,total,world,others:false};
    const out=TROPHIES.filter(t=>t.tier!=='platinum'&&t.ok(base)).map(t=>t.id);
    const nonPlat=TROPHIES.filter(t=>t.tier!=='platinum').length;
    base.others=out.length===nonPlat;
    TROPHIES.filter(t=>t.tier==='platinum').forEach(t=>{if(t.ok(base))out.push(t.id);});
    return out;
  }
  function counts(ids){
    const o={};TIERS.forEach(t=>{o[t]={have:0,total:TROPHIES.filter(x=>x.tier===t).length};});
    ids.forEach(id=>{const t=TROPHIES.find(x=>x.id===id);if(t)o[t.tier].have++;});
    return o;
  }
  return {TIERS,TROPHIES,earned,counts};
});
