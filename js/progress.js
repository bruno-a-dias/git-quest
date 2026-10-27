/* ===== Código de progresso (aluno -> professor) e código de verificação do diploma =====
   Não é segurança forte: roda no navegador e o objetivo é detectar cópia incompleta ou
   edição acidental. O painel da turma confere o checksum e se o XP bate com as missões. */
(function(root,factory){
  if(typeof module!=='undefined'&&module.exports)module.exports=factory();else root.GQP=factory();
})(typeof self!=='undefined'?self:this,function(){
  const PREFIX='GQ1';
  function fnv(str,seed){
    let h=(0x811c9dc5^(seed||0))>>>0;
    for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}
    return h>>>0;
  }
  function b64e(str){
    const bytes=new TextEncoder().encode(str);let bin='';
    for(let i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function b64d(s){
    s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';
    const bin=atob(s),bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  const chk=p=>fnv(PREFIX+'|'+p,7).toString(36);
  function newPid(){return Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4);}
  /* S = estado salvo do jogo (xp, done, badges, player, id, lang, cur, pid) */
  function encode(S){
    const d={};Object.keys(S.done||{}).forEach(k=>{d[k]=(S.done[k]&&S.done[k].xp)|0;});
    const data={v:1,p:S.pid||'',n:(S.player||(S.id&&S.id.name)||'').slice(0,60),x:S.xp|0,d,b:Object.keys(S.badges||{}).filter(k=>S.badges[k]),l:S.lang||'',c:S.cur|0,t:Date.now()};
    const p=b64e(JSON.stringify(data));
    return PREFIX+'.'+p+'.'+chk(p);
  }
  function decode(code,total){
    try{
      const m=/^GQ1\.([A-Za-z0-9_-]+)\.([a-z0-9]+)$/.exec(String(code||'').trim());
      if(!m)return {ok:false,error:'format'};
      if(chk(m[1])!==m[2])return {ok:false,error:'checksum'};
      const o=JSON.parse(b64d(m[1]));
      if(!o||o.v!==1||typeof o.d!=='object'||o.d===null||!Number.isInteger(o.x))return {ok:false,error:'format'};
      let sum=0;
      for(const k of Object.keys(o.d)){
        const i=Number(k);
        if(!Number.isInteger(i)||i<0||(total&&i>=total))return {ok:false,error:'mission'};
        if(!Number.isInteger(o.d[k])||o.d[k]<0)return {ok:false,error:'xp'};
        sum+=o.d[k];
      }
      if(sum!==o.x)return {ok:false,error:'xp'};
      return {ok:true,data:o};
    }catch(e){return {ok:false,error:'format'};}
  }
  /* aceita texto bagunçado (WhatsApp, e-mail): devolve todos os códigos encontrados */
  function extract(text){return String(text||'').match(/GQ1\.[A-Za-z0-9_-]+\.[a-z0-9]+/g)||[];}
  /* "GQ-XXXX-XXXX": mesmo valor no diploma do aluno e no painel do professor */
  function diplomaCode(name,xp,doneIdx){
    const s=String(name||'').trim().toLowerCase()+'|'+(xp|0)+'|'+[...doneIdx].map(Number).sort((a,b)=>a-b).join(',');
    const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let a=fnv(s,1),b=fnv(s,2),out='';
    for(let i=0;i<8;i++){const h=i<4?a:b;out+=A[(h>>>(i%4*5))&31];}
    return 'GQ-'+out.slice(0,4)+'-'+out.slice(4);
  }
  return {encode,decode,extract,diplomaCode,newPid};
});
