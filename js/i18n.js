/* ===== Git Quest: internacionalização =====
   - O português é o idioma-base (missions.js e as chaves abaixo).
   - Cada idioma extra vive em js/lang/<codigo>.js e chama I18N.add(codigo, {...}).
   - As bandeiras são SVG inline (emoji de bandeira não aparece no Windows).
*/
const I18N=(function(){
  const FL=(inner)=>'<svg viewBox="0 0 30 20" width="30" height="20" aria-hidden="true" focusable="false">'+inner+'</svg>';
  const LANGS=[
    {code:'pt',name:'Português',locale:'pt-BR',flag:FL('<rect width="30" height="20" fill="#009b3a"/><path d="M15 2L27.5 10L15 18L2.5 10Z" fill="#fedf00"/><circle cx="15" cy="10" r="4.6" fill="#002776"/><path d="M10.5 9.1Q15 7.8 19.5 11.2" fill="none" stroke="#fff" stroke-width="1.1"/>')},
    {code:'en',name:'English',locale:'en-GB',flag:FL('<rect width="30" height="20" fill="#012169"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" stroke-width="1.6"/><path d="M15 0V20M0 10H30" stroke="#fff" stroke-width="6.4"/><path d="M15 0V20M0 10H30" stroke="#c8102e" stroke-width="3.6"/>')},
    {code:'es',name:'Español',locale:'es-ES',flag:FL('<rect width="30" height="20" fill="#aa151b"/><rect y="5" width="30" height="10" fill="#f1bf00"/><rect x="6.5" y="7.6" width="3.6" height="4.8" rx="1" fill="#aa151b"/>')},
    {code:'fr',name:'Français',locale:'fr-FR',flag:FL('<rect width="10" height="20" fill="#0055a4"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ef4135"/>')},
    {code:'de',name:'Deutsch',locale:'de-DE',flag:FL('<rect width="30" height="20" fill="#000"/><rect y="6.67" width="30" height="13.33" fill="#dd0000"/><rect y="13.33" width="30" height="6.67" fill="#ffce00"/>')},
    {code:'it',name:'Italiano',locale:'it-IT',flag:FL('<rect width="10" height="20" fill="#009246"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ce2b37"/>')},
    {code:'ru',name:'Русский',locale:'ru-RU',flag:FL('<rect width="30" height="20" fill="#fff"/><rect y="6.67" width="30" height="6.67" fill="#0039a6"/><rect y="13.33" width="30" height="6.67" fill="#d52b1e"/>')},
    {code:'hi',name:'हिन्दी',locale:'hi-IN',flag:FL('<rect width="30" height="20" fill="#fff"/><rect width="30" height="6.67" fill="#ff9933"/><rect y="13.33" width="30" height="6.67" fill="#138808"/><circle cx="15" cy="10" r="2.5" fill="none" stroke="#000080" stroke-width=".7"/><path d="M15 7.5V12.5M12.5 10H17.5M13.2 8.2L16.8 11.8M16.8 8.2L13.2 11.8" stroke="#000080" stroke-width=".35"/>')}
  ];
  const D={pt:{ui:{
    tagline:'Aprenda Git jogando: 7 linhas, um comando por vez',
    sound_on:'Som: ligado',sound_off:'Som: desligado',sound_title:'Ligar ou desligar os efeitos sonoros',
    diploma_btn:'Ver diploma',reset:'Recomeçar tudo',reset_title:'Apaga o progresso deste navegador',reset_confirm:'Confirmar: apagar progresso?',lang_label:'Idioma',
    map_h:'Mapa de linhas',areas_h:'As áreas do Git',areas_aria:'As quatro áreas do Git',
    flow_html:'<b>pasta</b><em>git add</em>&rarr;<b>staging</b><em>git commit</em>&rarr;<b>repositório</b><em>git push</em>&rarr;<b>remoto</b>',
    graph_h:'Mapa de commits',badges_h:'Conquistas',
    term_aria:'Terminal simulado',term_out_aria:'Saída do terminal',term_tag:'terminal simulado',cmd_ph:'digite um comando e aperte Enter',xp_aria:'Experiência',
    foot_html:'Simulador didático: os comandos rodam num Git de mentira dentro da página, nada é gravado no seu computador. Professor? Abra a página com <span class="mono">#professor</span> no final do endereço para liberar todas as missões.',
    cert_small:'Certificado de conclusão',cert_to:'Este diploma é concedido a',cert_name_ph:'Digite seu nome',cert_name_aria:'Seu nome',
    cert_txt:'por concluir as {0} missões do Git Quest, somando {1} XP, com o título de {2}.',cert_print:'Baixe a imagem para guardar ou entregar ao professor.',cert_back:'Voltar ao jogo',diploma_aria:'Diploma Git Quest',
    level:'Nível {0} · ',next_level:'próximo nível: {0} XP',max_level:'nível máximo',combo:'combo x{0}',line:'Linha {0}',quiz_tag:'quiz',quiz_pre:'Quiz: ',locked:' (bloqueada)',
    badge_toast:'Conquista: {0}',levelup_t:'Subiu de nível!',levelup_s:'Agora você é {0}.',
    a_wd:'Pasta de trabalho',a_wd_empty:'vazia: crie arquivos com echo ou touch',a_st:'Staging',a_norepo:'sem repositório',a_repo:'Repositório local',a_repo_none:'rode git init',
    a_st_empty:'nada preparado',a_commit1:'{0} · {1} commit',a_commitN:'{0} · {1} commits',a_repo_empty:'nenhum commit ainda',a_rem:'Remoto',a_rem_none:'sem remoto',a_rem_nopush:'nada enviado ainda',a_rem_add:'sem remoto: git remote add',a_more:'+ {0} arquivos',
    lbl_new:'novo',lbl_mod:'editado',lbl_conf:'conflito',lbl_ign:'ignorado',lbl_del:'removido',
    g_empty_repo:'Ainda não há commits. O primeiro aparece aqui.',g_empty_none:'Sem repositório. Rode git init para começar o mapa.',g_aria:'Mapa de commits',
    hint1:'Dica 1',hint2:'Dica 2',hint_sol:'Ver solução',restart:'Recomeçar missão',sol_title:'Solução (clique para colocar no terminal):',
    quiz_wrong:'Quase! Pense mais um pouco e tente outra alternativa.',win_quiz:'Resposta certa!',win_mission:'Missão cumprida!',review:'revisão',
    learned:'O que você aprendeu: ',in_guide:'{0} do guia',part:'Parte',parts:'Partes',to:'a',and:'e',
    bonus:'Bônus de +25 XP: sem erros e sem dicas.',next:'Próxima missão',diploma_see:'Ver meu diploma',keep_term:'Continuar no terminal',
 prog_btn:'Progresso',prog_title:'Salvar ou carregar seu progresso',prog_h:'Meu progresso',prog_intro:'Seu progresso fica só neste navegador. Copie o código abaixo (ou salve o arquivo) para entregar ao professor ou continuar em outro aparelho.',prog_copy:'Copiar código',prog_copied:'Copiado!',prog_file:'Salvar arquivo',prog_import_h:'Carregar progresso',prog_import_ph:'Cole aqui um código de progresso',prog_import_btn:'Carregar',prog_import_confirm:'Confirmar: substituir o progresso atual?',prog_import_ok:'Progresso carregado: {0} XP e {1} missões.',prog_import_bad:'Código inválido. Copie-o novamente por inteiro.',prog_close:'Fechar',cert_png:'Baixar imagem do diploma',cert_png_hint:'Se o download não começar, toque e segure a imagem abaixo para salvar.',cert_code:'Código de verificação',cert_png_alt:'Imagem do diploma',
    banner_mission:'Missão {0} de {1} · {2}',banner_quiz:'O terminal está livre enquanto você pensa. Explore à vontade.',banner_help:'Digite help para ver os comandos. Setas ↑ ↓ repetem comandos e Tab completa.'
  }}};
  let lang='pt';const subs=[];
  const fmt=(s,a)=>String(s).replace(/\{(\d+)\}/g,(_,i)=>a[i]===undefined?'':a[i]);
  const cur=()=>D[lang]||D.pt;
  function t(k,...a){const u=cur().ui;const s=(u&&u[k]!==undefined)?u[k]:D.pt.ui[k];return fmt(s===undefined?k:s,a);}
  function add(code,data){D[code]=data;}
  function has(code){return !!D[code];}
  function world(i){const w=cur().worlds;return (w&&w[i])||WORLDS[i].t;}
  function rank(i){const r=cur().ranks;return (r&&r[i])||RANKS[i][1];}
  function badge(b){const o=cur().badges&&cur().badges[b.id];return o?{t:o[0],d:o[1]}:{t:b.t,d:b.d};}
  /* missão localizada (sem alterar MISSIONS): comandos e soluções continuam iguais */
  function m(i){
    const b=MISSIONS[i],x=cur().missions&&cur().missions[i];
    if(b.type==='quiz'){
      return {title:x?x[0]:b.title,q:x?x[1]:b.q,options:x?x[2]:b.options,why:x?x[3]:b.why};
    }
    return {title:x?x[0]:b.title,story:x?x[1]:b.story,goals:b.goals.map((g,k)=>(x&&x[2]&&x[2][k])||g.t),hints:x&&x[3]?x[3]:b.hints,learn:x?x[4]:b.learn};
  }
  /* "Partes 8, 13 e 14" / "Parte 2" / "Partes 1 a 3" */
  function doc(i){
    const d=MISSIONS[i].doc,mm=/^(Partes?) (.+)$/.exec(d);if(!mm)return d;
    const nums=mm[2].replace(/ a /g,' '+t('to')+' ').replace(/ e /g,' '+t('and')+' ');
    return t(mm[1]==='Parte'?'part':'parts')+' '+nums;
  }
  function apply(){
    const root=document;
    root.querySelectorAll('[data-i18n]').forEach(e=>{e.textContent=t(e.getAttribute('data-i18n'));});
    root.querySelectorAll('[data-i18n-html]').forEach(e=>{e.innerHTML=t(e.getAttribute('data-i18n-html'));});
    root.querySelectorAll('[data-i18n-attr]').forEach(e=>{
      e.getAttribute('data-i18n-attr').split(';').forEach(p=>{const [a,k]=p.split(':');if(a&&k)e.setAttribute(a.trim(),t(k.trim()));});
    });
  }
  function set(code){
    if(!D[code])code='pt';lang=code;
    try{document.documentElement.lang=LANGS.find(l=>l.code===code).locale;}catch(e){}
    apply();subs.forEach(f=>f(code));
  }
  function detect(){
    const n=(navigator.language||'pt').toLowerCase().slice(0,2);
    if(D[n])return n;return 'en';
  }
  const api={LANGS,add,has,t,world,rank,badge,m,doc,apply,set,detect,get lang(){return lang;},get locale(){return LANGS.find(l=>l.code===lang).locale;},onChange:f=>subs.push(f)};
  /* o motor de Git pergunta aqui se há tradução das mensagens do simulador */
  globalThis.GQ_X=(k,...a)=>{if(lang==='pt')return null;const u=D[lang]&&D[lang].ui;const s=u&&u['x_'+k];return s?fmt(s,a):null;};
  return api;
})();
