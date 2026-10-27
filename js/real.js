/* ===== Missões de verdade: confere no GitHub pela API pública (sem login) =====
   Se não houver internet ou o limite da API estourar, o aluno pode confirmar manualmente. */
(function(root,factory){
  if(typeof module!=='undefined'&&module.exports)module.exports=factory();else root.GQR=factory();
})(typeof self!=='undefined'?self:this,function(){
  const API='https://api.github.com';
  const USER=/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/,REPO=/^[A-Za-z0-9._-]{1,100}$/;
  async function get(path,f){
    try{
      const r=await f(API+path,{headers:{Accept:'application/vnd.github+json'}});
      if(r.status===404)return {s:'notfound'};
      if(!r.ok)return {s:'offline'};
      return {s:'ok',j:await r.json()};
    }catch(e){return {s:'offline'};}
  }
  /* kind: repo | fork | pr   vals: {user, repo} ou {url}  ->  {ok, reason: notfound|mismatch|offline} */
  async function verify(kind,v,f){
    f=f||(typeof fetch!=='undefined'?fetch:null);
    if(!f)return {ok:false,reason:'offline'};
    if(kind==='pr'){
      const m=/^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)/.exec(String((v&&v.url)||'').trim());
      if(!m)return {ok:false,reason:'notfound'};
      const r=await get('/repos/'+m[1]+'/'+m[2]+'/pulls/'+m[3],f);
      return r.s==='ok'?{ok:true,data:r.j}:{ok:false,reason:r.s};
    }
    const u=String((v&&v.user)||'').trim(),n=String((v&&v.repo)||'').trim();
    if(!USER.test(u)||!REPO.test(n))return {ok:false,reason:'notfound'};
    const r=await get('/repos/'+u+'/'+n,f);
    if(r.s!=='ok')return {ok:false,reason:r.s};
    if(kind==='fork')return r.j.fork?{ok:true,data:r.j}:{ok:false,reason:'mismatch'};
    return r.j.fork||r.j.private?{ok:false,reason:'mismatch'}:{ok:true,data:r.j};
  }
  return {verify,USER,REPO};
});
