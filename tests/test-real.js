const R=require('../js/real.js');
let fails=0;const bad=m=>{fails++;console.log('ERRO: '+m);};
const mk=(table)=>async(url)=>{
  const k=url.replace('https://api.github.com','');
  if(table==='throw')throw new Error('offline');
  const v=table[k];
  if(v===undefined)return {ok:false,status:404,json:async()=>({})};
  if(v==='limit')return {ok:false,status:403,json:async()=>({})};
  return {ok:true,status:200,json:async()=>v};
};
(async()=>{
  const T={'/repos/ana/pizzaria':{fork:false,private:false},'/repos/ana/git-quest':{fork:true},'/repos/bruno-a-dias/git-quest/pulls/7':{state:'open',user:{login:'ana'}},'/repos/x/y':'limit'};
  const f=mk(T);
  let r=await R.verify('repo',{user:'ana',repo:'pizzaria'},f);if(!r.ok)bad('repo existente');
  r=await R.verify('repo',{user:'ana',repo:'git-quest'},f);if(r.ok||r.reason!=='mismatch')bad('fork não vale como repo novo');
  r=await R.verify('fork',{user:'ana',repo:'git-quest'},f);if(!r.ok)bad('fork existente');
  r=await R.verify('fork',{user:'ana',repo:'pizzaria'},f);if(r.ok||r.reason!=='mismatch')bad('repo comum não é fork');
  r=await R.verify('repo',{user:'ana',repo:'nada'},f);if(r.ok||r.reason!=='notfound')bad('inexistente');
  r=await R.verify('repo',{user:'x',repo:'y'},f);if(r.ok||r.reason!=='offline')bad('limite da API vira offline');
  r=await R.verify('repo',{user:'ana',repo:'pizzaria'},mk('throw'));if(r.ok||r.reason!=='offline')bad('sem rede');
  r=await R.verify('repo',{user:'../x',repo:'a b'},f);if(r.ok||r.reason!=='notfound')bad('entrada inválida');
  r=await R.verify('pr',{url:'https://github.com/bruno-a-dias/git-quest/pull/7'},f);if(!r.ok)bad('PR existente');
  r=await R.verify('pr',{url:'https://github.com/bruno-a-dias/git-quest/pull/8'},f);if(r.ok)bad('PR inexistente');
  r=await R.verify('pr',{url:'https://exemplo.com/pull/1'},f);if(r.ok||r.reason!=='notfound')bad('URL que não é do GitHub');
  console.log(fails?('\n'+fails+' problemas'):'MISSÕES REAIS OK');process.exit(fails?1:0);
})();
