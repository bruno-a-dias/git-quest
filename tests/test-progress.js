const P=require('../js/progress.js');
let fails=0;const bad=m=>{fails++;console.log('ERRO: '+m);};
const S={pid:'abc123',player:'Maria da Silva — मारिया',xp:225,done:{0:{xp:100},3:{xp:125}},badges:{first:true,pure:false},lang:'hi',cur:4};
const code=P.encode(S);
if(!/^GQ1\.[\w-]+\.[a-z0-9]+$/.test(code))bad('formato do código');
const r=P.decode(code,32);
if(!r.ok)bad('decode falhou '+r.error);
else{
  if(r.data.n!==S.player)bad('nome com acentos/devanágari');
  if(r.data.x!==225||r.data.d[3]!==125)bad('xp/missões');
  if(r.data.b.join()!=='first')bad('conquistas');
}
/* troféus e estatísticas viajam no código; códigos antigos continuam válidos */
{
  const S3=Object.assign({},S,{tro:{b_first:1,s_half:2},qf:1,chw:2,perfect:3,bestCombo:4,exp:1,t0:1700000000});
  const r3=P.decode(P.encode(S3),40);
  if(!r3.ok||r3.data.tr.join()!=='b_first,s_half'||r3.data.st.c!==2||r3.data.st.e!==1||r3.data.t0!==1700000000)bad('troféus no código');
  const r4=P.decode(P.encode(S),40);
  if(!r4.ok||r4.data.tr!==undefined||r4.data.st!==undefined)bad('campos opcionais deveriam sumir quando vazios');
}
/* adulterações precisam ser recusadas */
const parts=code.split('.');
const forged=parts[0]+'.'+parts[1].slice(0,-2)+(parts[1].slice(-2)==='AA'?'BB':'AA')+'.'+parts[2];
if(P.decode(forged,32).ok)bad('aceitou payload adulterado');
if(P.decode(code.slice(0,-1),32).ok)bad('aceitou checksum truncado');
if(P.decode('lixo',32).ok)bad('aceitou lixo');
/* XP incoerente com as missões, mesmo com checksum válido (recalculado) */
const B=Buffer.from(JSON.stringify({v:1,p:'x',n:'Fraude',x:9999,d:{0:100},b:[],l:'pt',c:0,t:1})).toString('base64url');
const chkFn=(()=>{let h=(0x811c9dc5^7)>>>0;const s='GQ1|'+B;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h.toString(36);})();
if(P.decode('GQ1.'+B+'.'+chkFn,32).ok)bad('aceitou XP incoerente');
/* missão fora do intervalo */
const S2={xp:100,done:{40:{xp:100}},badges:{}};
if(P.decode(P.encode(S2),32).ok)bad('aceitou missão inexistente');
/* extração de texto bagunçado */
const found=P.extract('oi prof!\n'+code+'\n  e o do colega: '+P.encode({xp:0,done:{},badges:{}})+' valeu');
if(found.length!==2)bad('extract achou '+found.length);
/* código de diploma: estável, ignora caixa/ordem, muda com o XP */
const d1=P.diplomaCode('Maria Silva',3000,[2,1,0]),d2=P.diplomaCode(' maria silva ',3000,[0,1,2]),d3=P.diplomaCode('Maria Silva',3001,[0,1,2]);
if(!/^GQ-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(d1))bad('formato do diploma '+d1);
if(d1!==d2)bad('diploma deveria ignorar caixa/espaços/ordem');
if(d1===d3)bad('diploma deveria mudar com o XP');
console.log(fails?('\n'+fails+' problemas'):'ok  código de progresso e de diploma');
process.exit(fails?1:0);
