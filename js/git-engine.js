/* ===== Motor de Git simulado (parte A: núcleo) ===== */
function createGit(){
  const G={cfg:{'init.defaultBranch':'main'},folders:{'~':{wd:{},repo:null}},cwd:'~'};
  let OUT=[];
  const P=(t,c)=>OUT.push([[c||'',String(t)]]);
  const PS=(...segs)=>OUT.push(segs);
  const F=()=>G.folders[G.cwd];
  const W=()=>F().wd;
  const pathStr=()=>G.cwd==='~'?'~':'~/'+G.cwd;
  const s7=s=>s?s.slice(0,7):'0000000';
  const uniq=(...objs)=>[...new Set(objs.flatMap(o=>Array.isArray(o)?o:Object.keys(o)))];

  function hash40(s){
    let h1=0xdeadbeef,h2=0x41c6ce57,out='';
    for(let r=0;r<4;r++){
      for(let i=0;i<s.length;i++){const ch=s.charCodeAt(i);h1=Math.imul(h1^ch,2654435761);h2=Math.imul(h2^ch,1597334677);}
      h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);
      h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
      out+=(h2>>>0).toString(16).padStart(8,'0')+(h1>>>0).toString(16).padStart(8,'0');
      s+=out;
    }
    return out.slice(0,40);
  }
  function tokenize(line){
    const toks=[];let cur='',q=null,has=false;
    const flush=()=>{if(has||cur){toks.push({v:cur});cur='';has=false;}};
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(q){if(ch===q)q=null;else cur+=ch;continue;}
      if(ch==='"'||ch==="'"){q=ch;has=true;continue;}
      if(/\s/.test(ch)){flush();continue;}
      if(ch==='>'){flush();if(line[i+1]==='>'){toks.push({v:'>>',op:true});i++;}else toks.push({v:'>',op:true});continue;}
      cur+=ch;has=true;
    }
    flush();return toks;
  }
  function lev(a,b){const d=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=1;j<=b.length;j++)d[0][j]=j;
    for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[a.length][b.length];}

  /* ---------- repositório ---------- */
  function newRepo(branch){
    return {head:branch,detached:null,branches:{[branch]:null},commits:{},n:0,index:{},stash:[],tags:{},
      remotes:{},remoteRefs:{},server:{branches:{},tags:{}},upstream:{},merging:null,reflog:[],prev:null};
  }
  const headSha=r=>r.detached||r.branches[r.head]||null;
  const treeOf=(r,sha)=>sha?r.commits[sha].tree:{};
  const stamp=n=>'Mon Oct 26 '+String((21+Math.floor(n/60))%24).padStart(2,'0')+':'+String(n%60).padStart(2,'0')+':00 2026 -0300';
  function mkCommit(r,msg,parents,tree,author){
    const n=++r.n;
    const sha=hash40(msg+'|'+n+'|'+parents.join(',')+'|'+JSON.stringify(tree));
    r.commits[sha]={sha,msg,parents,tree:{...tree},n,author:author||G.cfg['user.name']||'Aluno',email:author?'equipe@exemplo.com':(G.cfg['user.email']||'aluno@exemplo.com')};
    return sha;
  }
  function moveHead(r,sha,why){
    if(r.detached)r.detached=sha;else r.branches[r.head]=sha;
    r.reflog.unshift({sha,msg:why});
  }
  function ancestors(r,sha){
    const seen=new Set(),st=sha?[sha]:[];
    while(st.length){const s=st.pop();if(seen.has(s)||!r.commits[s])continue;seen.add(s);r.commits[s].parents.forEach(p=>st.push(p));}
    return seen;
  }
  const isAncestor=(r,a,b)=>ancestors(r,b).has(a);
  function mergeBase(r,a,b){
    const A=ancestors(r,a),B=ancestors(r,b);let best=null;
    for(const s of A)if(B.has(s)&&(!best||r.commits[s].n>r.commits[best].n))best=s;
    return best;
  }
  function findPrefix(r,p){
    if(p.length<4||!/^[0-9a-f]+$/.test(p))return null;
    return Object.keys(r.commits).find(s=>s.startsWith(p))||null;
  }
  function resolve(r,rev){
    if(!rev)return null;let m;
    if((m=rev.match(/^HEAD@\{(\d+)\}$/))){const e=r.reflog[+m[1]];return e?e.sha:null;}
    m=rev.match(/^(.*?)((?:~\d*|\^)*)$/);const base=m[1],suf=m[2];
    let sha=base==='HEAD'?headSha(r):(r.branches[base]!==undefined?r.branches[base]:(r.tags[base]?r.tags[base].sha:(r.remoteRefs[base]!==undefined?r.remoteRefs[base]:findPrefix(r,base))));
    if(!sha)return null;
    for(const p of (suf.match(/~\d*|\^/g)||[])){
      const k=p==='^'?1:(p.length>1?parseInt(p.slice(1)):1);
      for(let i=0;i<k;i++){const c=r.commits[sha];if(!c||!c.parents.length)return null;sha=c.parents[0];}
    }
    return sha;
  }
  function decor(r,sha){
    const l=[];
    if(headSha(r)===sha)l.push(r.detached?'HEAD':'HEAD -> '+r.head);
    Object.entries(r.tags).forEach(([t,v])=>{if(v.sha===sha)l.push('tag: '+t);});
    Object.entries(r.branches).forEach(([b,s])=>{if(s===sha&&!(b===r.head&&!r.detached))l.push(b);});
    Object.entries(r.remoteRefs).forEach(([k,s])=>{if(s===sha)l.push(k);});
    return l.length?'('+l.join(', ')+')':'';
  }
  const brLabel=r=>r.detached?'detached HEAD':r.head;
  function R(){
    const f=F();
    if(!f||!f.repo){P('fatal: not a git repository (or any of the parent directories): .git','r');return null;}
    return f.repo;
  }

  /* ---------- diff ---------- */
  const lines=s=>s===''?[]:s.split('\n');
  function lineDiff(a,b){
    const x=lines(a),y=lines(b),n=x.length,m=y.length;
    const d=Array.from({length:n+1},()=>new Array(m+1).fill(0));
    for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)d[i][j]=x[i]===y[j]?d[i+1][j+1]+1:Math.max(d[i+1][j],d[i][j+1]);
    const out=[];let i=0,j=0;
    while(i<n&&j<m){if(x[i]===y[j]){out.push([' ',x[i]]);i++;j++;}else if(d[i+1][j]>=d[i][j+1]){out.push(['-',x[i]]);i++;}else{out.push(['+',y[j]]);j++;}}
    while(i<n)out.push(['-',x[i++]]);while(j<m)out.push(['+',y[j++]]);
    return out;
  }
  function diffTrees(A,B){
    const o=[];
    for(const f of uniq(A,B).sort()){
      const a=A[f],b=B[f];if(a===b)continue;
      o.push(['b','diff --git a/'+f+' b/'+f]);
      if(a===undefined){o.push(['b','new file mode 100644']);o.push(['b','--- /dev/null']);}else o.push(['b','--- a/'+f]);
      if(b===undefined){o.push(['b','deleted file mode 100644']);o.push(['b','+++ /dev/null']);}else o.push(['b','+++ b/'+f]);
      const d=lineDiff(a===undefined?'':a,b===undefined?'':b);
      const na=d.filter(l=>l[0]!=='+').length,nb=d.filter(l=>l[0]!=='-').length;
      o.push(['c','@@ -'+(na?1:0)+','+na+' +'+(nb?1:0)+','+nb+' @@']);
      d.forEach(l=>o.push([l[0]==='+'?'g':l[0]==='-'?'r':'',l[0]+l[1]]));
    }
    return o;
  }
  function statOf(A,B){
    let files=0,ins=0,del=0;
    for(const f of uniq(A,B)){
      if(A[f]===B[f])continue;files++;
      lineDiff(A[f]===undefined?'':A[f],B[f]===undefined?'':B[f]).forEach(l=>{if(l[0]==='+')ins++;if(l[0]==='-')del++;});
    }
    return {files,ins,del};
  }
  function statText(st){
    const pl=(n,w)=>n+' '+w+(n===1?'':'s');
    return ' '+pl(st.files,'file')+' changed'+(st.ins?', '+pl(st.ins,'insertion')+'(+)':'')+(st.del?', '+pl(st.del,'deletion')+'(-)':'');
  }
  function modeLines(A,B){
    uniq(A,B).sort().forEach(f=>{
      if(A[f]===undefined&&B[f]!==undefined)P(' create mode 100644 '+f);
      if(A[f]!==undefined&&B[f]===undefined)P(' delete mode 100644 '+f);
    });
  }
  function showStat(A,B){
    uniq(A,B).sort().forEach(f=>{
      if(A[f]===B[f])return;
      const st=statOf({[f]:A[f]},{[f]:B[f]});const t=st.ins+st.del;
      PS(['',' '+f+' | '+t+' '],['g','+'.repeat(st.ins)],['r','-'.repeat(st.del)]);
    });
    P(statText(statOf(A,B)));modeLines(A,B);
  }

  /* ---------- .gitignore / globs ---------- */
  function globRe(p){return new RegExp('^'+p.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'[^/]*').replace(/\?/g,'.')+'$');}
  function isIgnored(f){
    const gi=W()['.gitignore'];if(gi===undefined)return false;
    let ign=false;
    for(let ln of gi.split('\n')){
      ln=ln.trim();if(!ln||ln[0]==='#')continue;
      let neg=false;if(ln[0]==='!'){neg=true;ln=ln.slice(1);}
      let dir=false;if(ln.endsWith('/')){dir=true;ln=ln.slice(0,-1);}
      ln=ln.replace(/^\//,'');
      const re=globRe(ln);
      const hit=dir?(f.startsWith(ln+'/')||f.split('/').slice(0,-1).some(s=>re.test(s))):(re.test(f)||re.test(f.split('/').pop())||f.startsWith(ln+'/'));
      if(hit)ign=!neg;
    }
    return ign;
  }
  function globMatch(p,names){
    p=p.replace(/^\.\//,'');
    if(p.includes('*'))return names.filter(n=>globRe(p).test(n));
    const dir=p.replace(/\/$/,'');
    return names.filter(n=>n===dir||n.startsWith(dir+'/'));
  }

  /* ---------- status ---------- */
  function changes(r){
    const head=treeOf(r,headSha(r)),idx=r.index,wd=W();
    const staged=[],unstaged=[],untracked=[];
    const conf=r.merging?r.merging.conflicts:[];
    for(const f of uniq(idx,head).sort()){
      if(conf.includes(f))continue;
      if(idx[f]!==undefined&&head[f]===undefined)staged.push(['new file',f]);
      else if(idx[f]===undefined&&head[f]!==undefined)staged.push(['deleted',f]);
      else if(idx[f]!==head[f])staged.push(['modified',f]);
    }
    for(const f of Object.keys(idx).sort()){
      if(conf.includes(f))continue;
      if(wd[f]===undefined)unstaged.push(['deleted',f]);else if(wd[f]!==idx[f])unstaged.push(['modified',f]);
    }
    for(const f of Object.keys(wd).sort())if(idx[f]===undefined&&!isIgnored(f))untracked.push(f);
    return {staged,unstaged,untracked,conflicts:conf.slice()};
  }
  function counts(r,a,b){let ah=0,bh=0;const A=ancestors(r,a),B=ancestors(r,b);A.forEach(s=>{if(!B.has(s))ah++;});B.forEach(s=>{if(!A.has(s))bh++;});return[ah,bh];}
  const GIT={};
  GIT.status=a=>{
    const r=R();if(!r)return;const c=changes(r);
    if(a.includes('-s')||a.includes('--short')){
      const m={};
      c.staged.forEach(([k,f])=>{m[f]=[k==='new file'?'A':k==='deleted'?'D':'M',' '];});
      c.unstaged.forEach(([k,f])=>{m[f]=m[f]||[' ',' '];m[f][1]=k==='deleted'?'D':'M';});
      c.conflicts.forEach(f=>{m[f]=['U','U'];});
      Object.keys(m).sort().forEach(f=>PS(['g',m[f][0]],['r',m[f][1]],['',' '+f]));
      c.untracked.forEach(f=>PS(['r','??'],['',' '+f]));
      return;
    }
    P(r.detached?'HEAD detached at '+s7(r.detached):'On branch '+r.head);
    const up=r.upstream[r.head];
    if(up&&r.remoteRefs[up]!==undefined&&headSha(r)){
      const [ah,bh]=counts(r,headSha(r),r.remoteRefs[up]);
      if(!ah&&!bh)P("Your branch is up to date with '"+up+"'.");
      else if(ah&&!bh){P("Your branch is ahead of '"+up+"' by "+ah+" commit"+(ah>1?'s':'')+'.');P('  (use "git push" to publish your local commits)');}
      else if(!ah&&bh){P("Your branch is behind '"+up+"' by "+bh+" commit"+(bh>1?'s':'')+', and can be fast-forwarded.');P('  (use "git pull" to update your local branch)');}
      else P("Your branch and '"+up+"' have diverged,");
    }
    if(!headSha(r)){P('');P('No commits yet');}
    if(r.merging){
      P('');P('You have unmerged paths.');P('  (fix conflicts and run "git commit")');P('  (use "git merge --abort" to abort the merge)');
      P('');P('Unmerged paths:');P('  (use "git add <file>..." to mark resolution)');
      c.conflicts.forEach(f=>P('\tboth modified:   '+f,'r'));
    }
    if(c.staged.length){
      P('');P('Changes to be committed:');
      P('  (use "git restore --staged <file>..." to unstage)');
      c.staged.forEach(([k,f])=>P('\t'+(k+':').padEnd(12)+f,'g'));
    }
    if(c.unstaged.length){
      P('');P('Changes not staged for commit:');
      P('  (use "git add <file>..." to update what will be committed)');
      P('  (use "git restore <file>..." to discard changes in working directory)');
      c.unstaged.forEach(([k,f])=>P('\t'+(k+':').padEnd(12)+f,'r'));
    }
    if(c.untracked.length){
      P('');P('Untracked files:');
      P('  (use "git add <file>..." to include in what will be committed)');
      c.untracked.forEach(f=>P('\t'+f,'r'));
    }
    P('');
    if(r.merging&&!c.conflicts.length&&!c.staged.length)return;
    if(c.staged.length||c.conflicts.length)return;
    if(c.unstaged.length)P('no changes added to commit (use "git add" and/or "git commit -a")');
    else if(c.untracked.length)P('nothing added to commit but untracked files present (use "git add" to track)');
    else if(!headSha(r))P('nothing to commit (create/copy files and use "git add" to track)');
    else P('nothing to commit, working tree clean');
  };

  /* ---------- add / commit ---------- */
  GIT.add=a=>{
    const r=R();if(!r)return;const wd=W();
    const flags=a.filter(x=>x.startsWith('-')),paths=a.filter(x=>!x.startsWith('-'));
    const all=flags.includes('-A')||flags.includes('--all'),upd=flags.includes('-u')||flags.includes('--update');
    if(!paths.length&&!all&&!upd){P('Nothing specified, nothing added.','y');P("hint: Maybe you wanted to say 'git add .'?",'y');return;}
    const stage=f=>{
      if(wd[f]===undefined)delete r.index[f];else r.index[f]=wd[f];
      if(r.merging)r.merging.conflicts=r.merging.conflicts.filter(x=>x!==f);
    };
    if(all||upd||paths.includes('.')){
      const names=new Set(Object.keys(r.index));
      if(!upd)Object.keys(wd).forEach(f=>{if(!isIgnored(f))names.add(f);});
      names.forEach(stage);return;
    }
    for(const p of paths){
      const m=globMatch(p,uniq(wd,r.index));
      if(!m.length){P("fatal: pathspec '"+p+"' did not match any files",'r');return;}
      const ign=m.filter(f=>r.index[f]===undefined&&isIgnored(f));
      if(ign.length){P('The following paths are ignored by one of your .gitignore files:','r');ign.forEach(f=>P(f));P('hint: Use -f if you really want to add them.','y');return;}
      m.forEach(stage);
    }
  };
  function parseMsg(a){
    const o={msgs:[],all:false,amend:false,noedit:false,empty:false};
    for(let i=0;i<a.length;i++){
      const x=a[i];
      if(x==='--amend')o.amend=true;else if(x==='--no-edit')o.noedit=true;else if(x==='--allow-empty')o.empty=true;
      else if(x==='--all')o.all=true;else if(x.startsWith('--message='))o.msgs.push(x.slice(10));else if(x==='--message')o.msgs.push(a[++i]||'');
      else if(/^-[a-zA-Z]+$/.test(x)){for(const ch of x.slice(1)){if(ch==='a')o.all=true;else if(ch==='m')o.msgs.push(a[++i]||'');}}
    }
    return o;
  }
  GIT.commit=a=>{
    const r=R();if(!r)return;const o=parseMsg(a),wd=W();
    if(!G.cfg['user.name']||!G.cfg['user.email']){
      P('Author identity unknown','r');P('');P('*** Please tell me who you are.','y');P('');P('Run','y');P('');
      P('  git config --global user.email "voce@exemplo.com"','y');P('  git config --global user.name "Seu Nome"','y');P('');
      P("to set your account's default identity.",'y');P('fatal: unable to auto-detect email address','r');return;
    }
    if(o.all)Object.keys(r.index).forEach(f=>{if(wd[f]===undefined)delete r.index[f];else r.index[f]=wd[f];});
    if(r.merging&&r.merging.conflicts.length){
      P('error: Committing is not possible because you have unmerged files.','r');
      P("hint: Fix them up in the work tree, and then use 'git add <file>'",'y');P('hint: as appropriate to mark resolution and make a commit.','y');P('fatal: Exiting because of an unresolved conflict.','r');return;
    }
    const head=headSha(r),ht=treeOf(r,head);
    const same=JSON.stringify(Object.entries(r.index).sort())===JSON.stringify(Object.entries(ht).sort());
    if(!o.amend&&!r.merging&&same&&!o.empty){GIT.status([]);return;}
    let msg=o.msgs.join('\n\n');
    if(o.amend){
      if(!head){P('fatal: You have nothing to amend.','r');return;}
      const old=r.commits[head];if(!msg)msg=old.msg;
      const ns=mkCommit(r,msg,old.parents,r.index);moveHead(r,ns,'commit (amend): '+msg.split('\n')[0]);
      P('['+brLabel(r)+' '+s7(ns)+'] '+msg.split('\n')[0]);
      P(statText(statOf(treeOf(r,old.parents[0]),r.index)));modeLines(treeOf(r,old.parents[0]),r.index);return;
    }
    if(!msg&&r.merging)msg="Merge branch '"+r.merging.name+"'";
    if(!msg){P('Aborting commit due to empty commit message.','r');P('hint: neste simulador não existe editor de texto. Use:  git commit -m "sua mensagem"','y');return;}
    const parents=head?[head]:[];if(r.merging)parents.push(r.merging.theirs);
    const ns=mkCommit(r,msg,parents,r.index);
    moveHead(r,ns,(!head?'commit (initial): ':r.merging?'commit (merge): ':'commit: ')+msg.split('\n')[0]);
    r.merging=null;
    P('['+brLabel(r)+(head?'':' (root-commit)')+' '+s7(ns)+'] '+msg.split('\n')[0]);
    P(statText(statOf(ht,r.index)));modeLines(ht,r.index);
  };

  /* ---------- log / show / diff ---------- */
  function allTips(r){
    const t=[];Object.values(r.branches).forEach(s=>s&&t.push(s));Object.values(r.remoteRefs).forEach(s=>s&&t.push(s));
    Object.values(r.tags).forEach(v=>t.push(v.sha));if(headSha(r))t.push(headSha(r));return t;
  }
  function printCommit(r,c,opts){
    const dec=decor(r,c.sha);
    PS(['y','commit '+c.sha],['c',dec?' '+dec:'']);
    if(c.parents.length>1)P('Merge: '+c.parents.map(s7).join(' '));
    P('Author: '+c.author+' <'+c.email+'>');P('Date:   '+stamp(c.n));P('');
    c.msg.split('\n').forEach(l=>P('    '+l));P('');
    if(opts.stat||opts.patch){
      const pt=treeOf(r,c.parents[0]);
      if(opts.stat){showStat(pt,c.tree);P('');}
      if(opts.patch){diffTrees(pt,c.tree).forEach(l=>P(l[1],l[0]));P('');}
    }
  }
  GIT.log=a=>{
    const r=R();if(!r)return;const all=a.includes('--all');
    if(!headSha(r)&&!all){P("fatal: your current branch '"+r.head+"' does not have any commits yet",'r');return;}
    const one=a.includes('--oneline'),graph=a.includes('--graph');
    let max=Infinity;const ni=a.findIndex(x=>/^-\d+$/.test(x)||x==='-n');
    if(ni>=0)max=a[ni]==='-n'?parseInt(a[ni+1]):parseInt(a[ni].slice(1));
    let tips=all?allTips(r):[headSha(r)];
    const rng=a.find(x=>/^[^-].*\.\.[^.]/.test(x));let excl=new Set();
    if(rng){const [x,y]=rng.split('..');const sx=resolve(r,x),sy=resolve(r,y);if(!sx||!sy){P("fatal: ambiguous argument '"+rng+"': unknown revision",'r');return;}tips=[sy];excl=ancestors(r,sx);}
    const set=new Set();tips.forEach(t=>ancestors(r,t).forEach(s=>{if(!excl.has(s))set.add(s);}));
    let list=[...set].map(s=>r.commits[s]).sort((x,y)=>y.n-x.n);
    const g=a.find(x=>x.startsWith('--grep=')),au=a.find(x=>x.startsWith('--author='));
    if(g)list=list.filter(c=>c.msg.toLowerCase().includes(g.slice(7).toLowerCase()));
    if(au)list=list.filter(c=>c.author.toLowerCase().includes(au.slice(9).toLowerCase()));
    list.slice(0,max).forEach(c=>{
      const dec=decor(r,c.sha);
      if(one)PS(['',graph?'* ':''],['y',s7(c.sha)+' '],['c',dec?dec+' ':''],['',c.msg.split('\n')[0]]);
      else printCommit(r,c,{stat:a.includes('--stat'),patch:a.includes('-p')||a.includes('--patch')});
    });
  };
  GIT.show=a=>{
    const r=R();if(!r)return;const rev=a.find(x=>!x.startsWith('-'))||'HEAD';const sha=resolve(r,rev);
    if(!sha){P("fatal: ambiguous argument '"+rev+"': unknown revision or path not in the working tree.",'r');return;}
    printCommit(r,r.commits[sha],{patch:true});
  };
  GIT.diff=a=>{
    const r=R();if(!r)return;const wd=W(),head=treeOf(r,headSha(r));
    const staged=a.includes('--staged')||a.includes('--cached'),pos=a.filter(x=>!x.startsWith('-'));
    let A,B;
    if(pos.length===2&&resolve(r,pos[0])&&resolve(r,pos[1])){A=treeOf(r,resolve(r,pos[0]));B=treeOf(r,resolve(r,pos[1]));}
    else if(staged){A=head;B={...r.index};}
    else if(pos[0]==='HEAD'){A=head;B={};Object.keys(r.index).forEach(f=>{if(wd[f]!==undefined)B[f]=wd[f];});}
    else{A={...r.index};B={};Object.keys(r.index).forEach(f=>{if(wd[f]!==undefined)B[f]=wd[f];});}
    if(a.includes('--stat')){showStat(A,B);return;}
    if(a.includes('--name-only')){uniq(A,B).sort().forEach(f=>{if(A[f]!==B[f])P(f);});return;}
    const fp=pos.filter(x=>!resolve(r,x));
    if(fp.length){const keep=new Set(fp.flatMap(p=>globMatch(p,uniq(A,B))));A=Object.fromEntries(Object.entries(A).filter(([k])=>keep.has(k)));B=Object.fromEntries(Object.entries(B).filter(([k])=>keep.has(k)));}
    diffTrees(A,B).forEach(l=>P(l[1],l[0]));
  };


  /* ===== parte B: config, init, desfazer, branches, merge ===== */
  GIT.config=a=>{
    const flags=a.filter(x=>x.startsWith('--')),args=a.filter(x=>!x.startsWith('--'));
    if(flags.includes('--list')||args[0]==='-l'){Object.entries(G.cfg).forEach(([k,v])=>P(k+'='+v));return;}
    if(flags.includes('--unset')){delete G.cfg[args[0]];return;}
    if(args.length===1){if(G.cfg[args[0]]!==undefined)P(G.cfg[args[0]]);return;}
    if(args.length>=2){G.cfg[args[0]]=args.slice(1).join(' ');return;}
    P('usage: git config [<options>]','r');
  };
  GIT.init=a=>{
    let branch=G.cfg['init.defaultBranch']||'master';const rest=[];
    for(let i=0;i<a.length;i++){
      if(a[i]==='-b'||a[i]==='--initial-branch')branch=a[++i];
      else if(a[i].startsWith('--initial-branch='))branch=a[i].split('=')[1];
      else if(!a[i].startsWith('-'))rest.push(a[i]);
    }
    let folder=G.cwd;
    if(rest[0]){folder=rest[0];if(!G.folders[folder])G.folders[folder]={wd:{},repo:null};}
    const f=G.folders[folder],where='~'+(folder==='~'?'':'/'+folder)+'/.git/';
    if(f.repo){P('Reinitialized existing Git repository in '+where);return;}
    f.repo=newRepo(branch);P('Initialized empty Git repository in '+where);
  };
  GIT.rev_parse=a=>{
    const r=R();if(!r)return;
    if(a.includes('--is-inside-work-tree'))P('true');
    else if(a.includes('--abbrev-ref'))P(r.detached?'HEAD':r.head);
    else if(a.includes('--short')){const s=resolve(r,a.find(x=>!x.startsWith('-'))||'HEAD');if(s)P(s7(s));}
    else{const s=resolve(r,a.find(x=>!x.startsWith('-'))||'HEAD');if(s)P(s);}
  };
  GIT.ls_files=a=>{
    const r=R();if(!r)return;
    if(a.includes('-o')||a.includes('--others')){changes(r).untracked.forEach(f=>P(f));return;}
    Object.keys(r.index).sort().forEach(f=>P(f));
  };

  /* ---------- restore / reset / revert / rm / mv / clean ---------- */
  GIT.restore=a=>{
    const r=R();if(!r)return;const wd=W();
    const staged=a.includes('--staged')||a.includes('-S'),both=a.includes('--worktree')||a.includes('-W');
    const paths=a.filter(x=>!x.startsWith('-'));
    if(!paths.length){P('fatal: you must specify path(s) to restore','r');return;}
    const head=treeOf(r,headSha(r));
    let names=[];
    for(const p of paths){
      if(p==='.')names=names.concat(staged?uniq(r.index,head):Object.keys(r.index));
      else{const m=globMatch(p,staged?uniq(r.index,head):uniq(r.index,wd));if(!m.length){P("error: pathspec '"+p+"' did not match any file(s) known to git",'r');return;}names=names.concat(m);}
    }
    for(const f of names){
      if(staged){
        if(head[f]===undefined)delete r.index[f];else r.index[f]=head[f];
        if(both){if(head[f]===undefined)delete wd[f];else wd[f]=head[f];}
      }else{
        if(r.index[f]===undefined){P("error: pathspec '"+f+"' did not match any file(s) known to git",'r');return;}
        wd[f]=r.index[f];
      }
    }
  };
  GIT.reset=a=>{
    const r=R();if(!r)return;const wd=W();let mode='mixed';const rest=[];
    for(const x of a){if(x==='--soft')mode='soft';else if(x==='--hard')mode='hard';else if(x==='--mixed')mode='mixed';else if(x!=='--')rest.push(x);}
    let rev=null,paths=[];
    if(rest.length){if(rest[0]==='HEAD'||resolve(r,rest[0])){rev=rest[0];paths=rest.slice(1);}else paths=rest;}
    const head=treeOf(r,headSha(r));
    if(paths.length){
      paths.forEach(p=>globMatch(p,uniq(r.index,head)).forEach(f=>{if(head[f]===undefined)delete r.index[f];else r.index[f]=head[f];}));
      const c=changes(r);if(c.unstaged.length){P('Unstaged changes after reset:');c.unstaged.forEach(([k,f])=>P((k==='deleted'?'D':'M')+'\t'+f));}
      return;
    }
    const target=rev?resolve(r,rev):headSha(r);
    if(rev&&!target){P("fatal: ambiguous argument '"+rev+"': unknown revision or path not in the working tree.",'r');return;}
    if(!target){return;}
    const oldIdx={...r.index},oldHead=head;
    moveHead(r,target,'reset: moving to '+(rev||'HEAD'));
    const tree=treeOf(r,target);
    if(mode==='soft')return;
    r.index={...tree};
    if(mode==='hard'){
      uniq(oldIdx,oldHead,tree).forEach(f=>{if(tree[f]===undefined)delete wd[f];else wd[f]=tree[f];});
      r.merging=null;P('HEAD is now at '+s7(target)+' '+r.commits[target].msg.split('\n')[0]);
    }else{
      const c=changes(r);if(c.unstaged.length){P('Unstaged changes after reset:');c.unstaged.forEach(([k,f])=>P((k==='deleted'?'D':'M')+'\t'+f));}
    }
  };
  function applyTree(r,nt){
    const wd=W(),old=r.index;
    uniq(old,nt).forEach(f=>{if(nt[f]===undefined)delete wd[f];else wd[f]=nt[f];});
    r.index={...nt};
  }
  GIT.revert=a=>{
    const r=R();if(!r)return;const rev=a.find(x=>!x.startsWith('-'))||'HEAD';const sha=resolve(r,rev);
    if(!sha){P("fatal: bad revision '"+rev+"'",'r');return;}
    const c=r.commits[sha];
    if(c.parents.length>1){P('error: commit '+sha+' is a merge but no -m option was given.','r');P('fatal: revert failed','r');return;}
    const ch=changes(r);
    if(ch.staged.length||ch.unstaged.length){P('error: your local changes would be overwritten by revert.','r');P('hint: commit your changes or stash them to proceed.','y');P('fatal: revert failed','r');return;}
    const pt=treeOf(r,c.parents[0]),head=treeOf(r,headSha(r)),nt={...head};let bad=false;
    for(const f of uniq(c.tree,pt)){
      if(c.tree[f]===pt[f])continue;
      if(head[f]===c.tree[f]){if(pt[f]===undefined)delete nt[f];else nt[f]=pt[f];}else bad=true;
    }
    if(bad){P('error: could not revert '+s7(sha)+'... '+c.msg.split('\n')[0],'r');P('hint: este simulador não resolve conflitos de revert.','y');return;}
    const msg='Revert "'+c.msg.split('\n')[0]+'"';
    const ns=mkCommit(r,msg+'\n\nThis reverts commit '+sha+'.',[headSha(r)],nt);
    moveHead(r,ns,'revert: '+msg);applyTree(r,nt);
    P('['+brLabel(r)+' '+s7(ns)+'] '+msg);P(statText(statOf(head,nt)));modeLines(head,nt);
  };
  GIT.rm=a=>{
    const r=R();if(!r)return;const wd=W();
    const cached=a.includes('--cached'),force=a.includes('-f')||a.includes('--force');
    const paths=a.filter(x=>!x.startsWith('-'));
    if(!paths.length){P('fatal: No pathspec was given. Which files should I remove?','r');return;}
    for(const p of paths){
      const names=globMatch(p,Object.keys(r.index));
      if(!names.length){P("fatal: pathspec '"+p+"' did not match any files",'r');return;}
      for(const f of names){
        if(!cached&&!force&&wd[f]!==undefined&&wd[f]!==r.index[f]){
          P('error: the following file has local modifications:','r');P('    '+f,'r');P('(use --cached to keep the file, or -f to force removal)','y');return;
        }
        delete r.index[f];if(!cached)delete wd[f];P("rm '"+f+"'");
      }
    }
  };
  GIT.mv=a=>{
    const r=R();if(!r)return;const [s,d]=a.filter(x=>!x.startsWith('-'));
    if(!s||!d){P('usage: git mv <source> <destination>','r');return;}
    if(r.index[s]===undefined){P('fatal: not under version control, source='+s+', destination='+d,'r');return;}
    W()[d]=W()[s];delete W()[s];r.index[d]=r.index[s];delete r.index[s];
  };
  GIT.clean=a=>{
    const r=R();if(!r)return;const fl=a.filter(x=>x.startsWith('-')).join(' ');
    const n=/(^| )-[a-z]*n/.test(fl)||a.includes('--dry-run'),f=/(^| )-[a-z]*f/.test(fl)||a.includes('--force');
    if(!n&&!f){P('fatal: clean.requireForce defaults to true and neither -i, -n, nor -f given; refusing to clean','r');return;}
    changes(r).untracked.forEach(x=>{if(n)P('Would remove '+x);else{delete W()[x];P('Removing '+x);}});
  };

  /* ---------- branch / switch / checkout ---------- */
  function checkoutTree(r,newSha){
    const wd=W(),cur=treeOf(r,headSha(r)),nt=treeOf(r,newSha),bad=[];
    for(const f of uniq(cur,nt)){
      if(cur[f]===nt[f])continue;
      const localMod=(r.index[f]!==cur[f])||(r.index[f]!==undefined&&wd[f]!==r.index[f]);
      const untrackedClash=r.index[f]===undefined&&wd[f]!==undefined&&nt[f]!==undefined;
      if(localMod||untrackedClash)bad.push(f);
    }
    if(bad.length){
      P('error: Your local changes to the following files would be overwritten by checkout:','r');bad.forEach(f=>P('\t'+f,'r'));
      P('Please commit your changes or stash them before you switch branches.','y');P('Aborting','r');return false;
    }
    for(const f of uniq(cur,nt)){
      if(cur[f]===nt[f])continue;
      if(nt[f]===undefined){delete wd[f];delete r.index[f];}else{wd[f]=nt[f];r.index[f]=nt[f];}
    }
    return true;
  }
  GIT.branch=a=>{
    const r=R();if(!r)return;const flags=a.filter(x=>x.startsWith('-')),pos=a.filter(x=>!x.startsWith('-'));
    const has=f=>flags.includes(f);
    if(has('-d')||has('-D')||has('--delete')){
      for(const b of pos){
        if(r.branches[b]===undefined){P("error: branch '"+b+"' not found.",'r');continue;}
        if(b===r.head&&!r.detached){P("error: Cannot delete branch '"+b+"' checked out at '"+pathStr()+"'",'r');continue;}
        const s=r.branches[b];
        if(!has('-D')&&s&&headSha(r)&&!isAncestor(r,s,headSha(r))){
          P("error: The branch '"+b+"' is not fully merged.",'r');P("If you are sure you want to delete it, run 'git branch -D "+b+"'",'y');continue;
        }
        delete r.branches[b];delete r.upstream[b];P("Deleted branch "+b+" (was "+s7(s)+").");
      }
      return;
    }
    if(has('-m')||has('-M')){
      let oldN=r.head,newN=pos[0];if(pos.length>1){oldN=pos[0];newN=pos[1];}
      if(r.branches[oldN]===undefined){P("error: refname refs/heads/"+oldN+" not found",'r');P('fatal: Branch rename failed','r');return;}
      if(r.branches[newN]!==undefined&&!has('-M')){P("fatal: a branch named '"+newN+"' already exists",'r');return;}
      r.branches[newN]=r.branches[oldN];delete r.branches[oldN];if(r.head===oldN)r.head=newN;
      if(r.upstream[oldN]){r.upstream[newN]=r.upstream[oldN];delete r.upstream[oldN];}return;
    }
    if(pos.length){
      const name=pos[0];
      if(r.branches[name]!==undefined){P("fatal: a branch named '"+name+"' already exists",'r');return;}
      if(!/^[\w.\-\/]+$/.test(name)){P("fatal: '"+name+"' is not a valid branch name",'r');return;}
      const s=pos[1]?resolve(r,pos[1]):headSha(r);
      if(!s){P(pos[1]?"fatal: not a valid object name: '"+pos[1]+"'":"fatal: not a valid object name: '"+r.head+"'",'r');return;}
      r.branches[name]=s;return;
    }
    const vv=has('-v')||has('-vv')||has('--verbose');
    const show=(n,sha,cls)=>{
      const cur=n===r.head&&!r.detached;
      const up=r.upstream[n]&&has('-vv')?' ['+r.upstream[n]+']':'';
      const base=(cur?'* ':'  ')+n;
      if(vv&&sha)PS([cur?'g':cls||'',base.padEnd(18)+' '+s7(sha)+up+' '+r.commits[sha].msg.split('\n')[0]]);
      else PS([cur?'g':cls||'',base]);
    };
    if(r.detached)PS(['g','* (HEAD detached at '+s7(r.detached)+')']);
    Object.keys(r.branches).sort().forEach(b=>{if(has('-r'))return;if(r.branches[b]===null&&b!==r.head)return;show(b,r.branches[b]);});
    if(has('-a')||has('-r'))Object.keys(r.remoteRefs).sort().forEach(k=>show((has('-a')?'remotes/':'')+k,r.remoteRefs[k],'r'));
  };
  function switchTo(r,name,o){
    const prevLabel=r.detached?s7(r.detached):r.head;
    const finish=(msg)=>{r.prev=prevLabel;P(msg);};
    if(o.create){
      if(r.branches[name]!==undefined&&!o.force){P("fatal: a branch named '"+name+"' already exists",'r');return;}
      if(!/^[\w.\-\/]+$/.test(name)){P("fatal: '"+name+"' is not a valid branch name",'r');return;}
      const start=o.start?resolve(r,o.start):headSha(r);
      if(o.start&&!start){P('fatal: invalid reference: '+o.start,'r');return;}
      if(!start){r.branches[name]=null;delete r.branches[r.head];r.head=name;r.detached=null;P("Switched to a new branch '"+name+"'");return;}
      if(start!==headSha(r)&&!checkoutTree(r,start))return;
      r.branches[name]=start;r.head=name;r.detached=null;
      r.reflog.unshift({sha:start,msg:'checkout: moving from '+prevLabel+' to '+name});
      finish("Switched to a new branch '"+name+"'");return;
    }
    if(name==='-'){name=r.prev;if(!name){P('fatal: invalid reference: @{-1}','r');return;}}
    if(r.branches[name]!==undefined){
      if(r.head===name&&!r.detached){P("Already on '"+name+"'");return;}
      const t=r.branches[name];
      if(t&&!checkoutTree(r,t))return;
      r.head=name;r.detached=null;r.reflog.unshift({sha:t,msg:'checkout: moving from '+prevLabel+' to '+name});
      finish("Switched to branch '"+name+"'");
      const up=r.upstream[name];
      if(up&&r.remoteRefs[up]&&t){const [ah,bh]=counts(r,t,r.remoteRefs[up]);P(!ah&&!bh?"Your branch is up to date with '"+up+"'.":ah&&!bh?"Your branch is ahead of '"+up+"' by "+ah+' commit'+(ah>1?'s':'')+'.':"Your branch is behind '"+up+"' by "+bh+' commit'+(bh>1?'s':'')+'.');}
      return;
    }
    for(const rem of Object.keys(r.remotes)){
      const key=rem+'/'+name;
      if(r.remoteRefs[key]){
        const t=r.remoteRefs[key];if(!checkoutTree(r,t))return;
        r.branches[name]=t;r.upstream[name]=key;r.head=name;r.detached=null;
        r.reflog.unshift({sha:t,msg:'checkout: moving from '+prevLabel+' to '+name});
        P("branch '"+name+"' set up to track '"+key+"'.");finish("Switched to a new branch '"+name+"'");return;
      }
    }
    const sha=resolve(r,name);
    if(sha&&(o.cmd==='checkout'||o.detach)){
      if(!checkoutTree(r,sha))return;
      r.detached=sha;r.reflog.unshift({sha,msg:'checkout: moving from '+prevLabel+' to '+name});
      P("Note: switching to '"+name+"'.",'y');P('');P("You are in 'detached HEAD' state. You can look around, make experimental",'y');
      P('changes and commit them, and you can discard any commits you make in this','y');P('state without impacting any branches by switching back to a branch.','y');P('');
      finish('HEAD is now at '+s7(sha)+' '+r.commits[sha].msg.split('\n')[0]);return;
    }
    P(o.cmd==='switch'?'fatal: invalid reference: '+name:"error: pathspec '"+name+"' did not match any file(s) known to git",'r');
  }
  GIT.switch=a=>{
    const r=R();if(!r)return;const o={cmd:'switch'};const pos=[];
    for(let i=0;i<a.length;i++){
      const x=a[i];
      if(x==='-c'||x==='--create'){o.create=true;pos.push(a[++i]);}
      else if(x==='-C'||x==='--force-create'){o.create=true;o.force=true;pos.push(a[++i]);}
      else if(x==='--detach'||x==='-d')o.detach=true;
      else if(x==='-'||!x.startsWith('-'))pos.push(x);
    }
    if(!pos.length){P('fatal: missing branch or commit argument','r');return;}
    if(o.create&&pos[1])o.start=pos[1];
    switchTo(r,pos[0],o);
  };
  GIT.checkout=a=>{
    const r=R();if(!r)return;const o={cmd:'checkout'};const pos=[];let dd=false;
    for(let i=0;i<a.length;i++){
      const x=a[i];
      if(x==='-b'){o.create=true;pos.push(a[++i]);}
      else if(x==='-B'){o.create=true;o.force=true;pos.push(a[++i]);}
      else if(x==='--'){dd=true;}
      else if(x==='--detach')o.detach=true;
      else if(x==='-'||!x.startsWith('-')){if(dd)pos.push('--file:'+x);else pos.push(x);}
    }
    if(!pos.length){P('fatal: missing branch or commit argument','r');return;}
    const files=pos.filter(p=>p.startsWith('--file:')).map(p=>p.slice(7));
    if(files.length){GIT.restore(files);return;}
    if(!o.create&&r.branches[pos[0]]===undefined&&!resolve(r,pos[0])&&r.index[pos[0]]!==undefined){GIT.restore([pos[0]]);return;}
    if(o.create&&pos[1])o.start=pos[1];
    switchTo(r,pos[0],o);
  };

  /* ---------- merge / cherry-pick ---------- */
  function doMerge(r,theirSha,theirName,o){
    const ours=headSha(r);
    if(isAncestor(r,theirSha,ours)){P('Already up to date.');return true;}
    const c0=changes(r);
    if(c0.staged.length||c0.unstaged.length){
      P('error: Your local changes to the following files would be overwritten by merge:','r');
      c0.staged.concat(c0.unstaged).forEach(([k,f])=>P('\t'+f,'r'));
      P('Please commit your changes or stash them before you merge.','y');P('Aborting','r');return false;
    }
    const wd=W(),O=treeOf(r,ours),T=treeOf(r,theirSha);
    if(isAncestor(r,ours,theirSha)&&!o.noff){
      P('Updating '+s7(ours)+'..'+s7(theirSha));P('Fast-forward');
      moveHead(r,theirSha,(o.why||'merge '+theirName)+': Fast-forward');
      uniq(O,T).forEach(f=>{if(T[f]===undefined){delete wd[f];delete r.index[f];}else{wd[f]=T[f];r.index[f]=T[f];}});
      showStat(O,T);return true;
    }
    if(o.ffOnly){P('fatal: Not possible to fast-forward, aborting.','r');return false;}
    const base=mergeBase(r,ours,theirSha),B=treeOf(r,base),out={},conflicts=[];
    for(const f of uniq(O,T,B)){
      const ov=O[f],tv=T[f],bv=B[f];
      if(ov===tv){if(ov!==undefined)out[f]=ov;}
      else if(ov===bv){if(tv!==undefined)out[f]=tv;}
      else if(tv===bv){if(ov!==undefined)out[f]=ov;}
      else{conflicts.push(f);if(ov!==undefined)out[f]=ov;}
    }
    for(const f of uniq(O,T,out)){
      if(conflicts.includes(f)){
        P('Auto-merging '+f);P('CONFLICT (content): Merge conflict in '+f,'r');
        wd[f]='<<<<<<< HEAD\n'+(O[f]===undefined?'':O[f])+'\n=======\n'+(T[f]===undefined?'':T[f])+'\n>>>>>>> '+theirName;
        if(O[f]===undefined)delete r.index[f];else r.index[f]=O[f];
      }else if(out[f]===undefined){delete wd[f];delete r.index[f];}
      else{wd[f]=out[f];r.index[f]=out[f];}
    }
    if(conflicts.length){
      r.merging={theirs:theirSha,name:theirName,conflicts};
      P('Automatic merge failed; fix conflicts and then commit the result.','r');return false;
    }
    const msg=o.msg||o.mergeMsg||"Merge branch '"+theirName+"'";
    const ns=mkCommit(r,msg,[ours,theirSha],out);
    moveHead(r,ns,'merge '+theirName+': Merge made by the \'ort\' strategy.');
    P("Merge made by the 'ort' strategy.");showStat(O,out);return true;
  }
  GIT.merge=a=>{
    const r=R();if(!r)return;
    if(a.includes('--abort')){
      if(!r.merging){P('fatal: There is no merge to abort (MERGE_HEAD missing).','r');return;}
      const wd=W(),ht=treeOf(r,headSha(r));
      uniq(r.index,ht,wd).forEach(f=>{if(ht[f]===undefined)delete wd[f];else wd[f]=ht[f];});
      r.index={...ht};r.merging=null;return;
    }
    if(r.merging){P('fatal: You have not concluded your merge (MERGE_HEAD exists).','r');P('Please, commit your changes before you merge.','y');return;}
    const o={noff:a.includes('--no-ff'),ffOnly:a.includes('--ff-only')};
    const mi=a.findIndex(x=>x==='-m');if(mi>=0)o.msg=a[mi+1];
    const name=a.filter((x,i)=>!x.startsWith('-')&&a[i-1]!=='-m')[0];
    if(!name){P('fatal: No commit specified and merge.defaultToUpstream not set.','r');return;}
    if(!headSha(r)){P('fatal: You cannot merge into a branch without commits.','r');return;}
    const sha=resolve(r,name);
    if(!sha){P('merge: '+name+' - not something we can merge','r');return;}
    doMerge(r,sha,name,o);
  };
  GIT.cherry_pick=a=>{
    const r=R();if(!r)return;
    if(a.includes('--abort'))return;
    const revs=a.filter(x=>!x.startsWith('-'));
    if(!revs.length){P('fatal: You must specify at least one commit to cherry-pick.','r');return;}
    for(const rev of revs){
      const sha=resolve(r,rev);
      if(!sha){P("fatal: bad revision '"+rev+"'",'r');return;}
      const c=r.commits[sha],pt=treeOf(r,c.parents[0]),head=treeOf(r,headSha(r)),nt={...head};let bad=false;
      for(const f of uniq(c.tree,pt)){
        if(c.tree[f]===pt[f])continue;
        if(head[f]===pt[f]){if(c.tree[f]===undefined)delete nt[f];else nt[f]=c.tree[f];}
        else if(head[f]!==c.tree[f])bad=true;
      }
      if(bad){P('error: could not apply '+s7(sha)+'... '+c.msg.split('\n')[0],'r');P('hint: este simulador não resolve conflitos de cherry-pick.','y');return;}
      const ns=mkCommit(r,c.msg,[headSha(r)],nt,undefined);
      moveHead(r,ns,'cherry-pick: '+c.msg.split('\n')[0]);applyTree(r,nt);
      P('['+brLabel(r)+' '+s7(ns)+'] '+c.msg.split('\n')[0]);P(statText(statOf(head,nt)));modeLines(head,nt);
    }
  };


  /* ===== parte C: stash, tag, remotos, shell, despacho, visão ===== */
  GIT.stash=a=>{
    const r=R();if(!r)return;const wd=W();
    const sub=(a[0]&&!a[0].startsWith('-'))?a[0]:'push',opts=(a[0]&&!a[0].startsWith('-'))?a.slice(1):a;
    const head=treeOf(r,headSha(r));
    const idxOf=o=>{const m=(o.find(x=>/^stash@\{\d+\}$/.test(x))||'stash@{0}').match(/\d+/);return +m[0];};
    const label=(s)=>s.msg?'On '+s.branch+': '+s.msg:'WIP on '+s.branch+': '+s7(s.base)+' '+r.commits[s.base].msg.split('\n')[0];
    if(sub==='push'||sub==='save'){
      if(!headSha(r)){P('You do not have the initial commit yet','r');return;}
      const um=opts.includes('-u')||opts.includes('--include-untracked');
      const mi=opts.findIndex(x=>x==='-m'||x==='--message');const msg=mi>=0?opts[mi+1]:(sub==='save'?opts.filter(x=>!x.startsWith('-')).join(' '):null);
      const c=changes(r);
      if(!c.staged.length&&!c.unstaged.length&&!(um&&c.untracked.length)){P('No local changes to save');return;}
      const st={msg:msg||null,base:headSha(r),branch:r.head,wd:{},index:{...r.index},untracked:{}};
      uniq(r.index,head).forEach(f=>{st.wd[f]=wd[f]===undefined?null:wd[f];});
      if(um)c.untracked.forEach(f=>{st.untracked[f]=wd[f];delete wd[f];});
      uniq(r.index,head).forEach(f=>{if(head[f]===undefined)delete wd[f];else wd[f]=head[f];});
      r.index={...head};r.stash.unshift(st);
      P('Saved working directory and index state '+label(st));return;
    }
    if(sub==='list'){r.stash.forEach((s,i)=>P('stash@{'+i+'}: '+label(s)));return;}
    if(sub==='clear'){r.stash=[];return;}
    if(sub==='pop'||sub==='apply'||sub==='drop'||sub==='show'){
      if(!r.stash.length){P('No stash entries found.','r');return;}
      const i=idxOf(opts),s=r.stash[i];
      if(!s){P('error: stash@{'+i+'} is not a valid reference','r');return;}
      if(sub==='show'){showStat(treeOf(r,s.base),Object.fromEntries(Object.entries(s.wd).filter(([,v])=>v!==null)));return;}
      if(sub==='drop'){r.stash.splice(i,1);P('Dropped refs/stash@{'+i+'} ('+hash40('stash'+i+s.base)+')');return;}
      Object.entries(s.wd).forEach(([f,v])=>{if(v===null)delete wd[f];else wd[f]=v;});
      Object.keys(s.index).forEach(f=>{if(head[f]===undefined)r.index[f]=s.index[f];});
      Object.entries(s.untracked).forEach(([f,v])=>{wd[f]=v;});
      GIT.status([]);
      if(sub==='pop'){r.stash.splice(i,1);P('Dropped refs/stash@{'+i+'} ('+hash40('stash'+i+s.base)+')');}
      return;
    }
    P("error: unknown subcommand: "+sub,'r');
  };
  GIT.tag=a=>{
    const r=R();if(!r)return;
    if(!a.length||a[0]==='-l'||a[0]==='--list'){
      const pat=a[1]?globRe(a[1]):null;Object.keys(r.tags).sort().filter(t=>!pat||pat.test(t)).forEach(t=>P(t));return;
    }
    if(a[0]==='-d'||a[0]==='--delete'){
      const t=a[1];if(!r.tags[t]){P("error: tag '"+t+"' not found.",'r');return;}
      P("Deleted tag '"+t+"' (was "+s7(r.tags[t].sha)+')');delete r.tags[t];return;
    }
    let ann=false,msg=null;const pos=[];
    for(let i=0;i<a.length;i++){
      if(a[i]==='-a'||a[i]==='--annotate')ann=true;
      else if(a[i]==='-m'){ann=true;msg=a[++i];}
      else if(!a[i].startsWith('-'))pos.push(a[i]);
    }
    const name=pos[0];
    if(!headSha(r)){P('fatal: Failed to resolve HEAD as a valid ref.','r');return;}
    if(r.tags[name]){P("fatal: tag '"+name+"' already exists",'r');return;}
    const sha=pos[1]?resolve(r,pos[1]):headSha(r);
    if(!sha){P("fatal: Failed to resolve '"+pos[1]+"' as a valid ref.",'r');return;}
    if(ann&&!msg){P('fatal: no tag message?','r');P('hint: neste simulador use  git tag -a '+name+' -m "mensagem"','y');return;}
    r.tags[name]={sha,annotated:ann,msg};
  };
  GIT.remote=a=>{
    const r=R();if(!r)return;const sub=a.find(x=>!x.startsWith('-'));
    if(!sub){
      const v=a.includes('-v')||a.includes('--verbose');
      Object.entries(r.remotes).forEach(([k,u])=>{if(v){P(k+'\t'+u+' (fetch)');P(k+'\t'+u+' (push)');}else P(k);});return;
    }
    const rest=a.slice(a.indexOf(sub)+1);
    if(sub==='add'){
      const [n,u]=rest;if(!n||!u){P('usage: git remote add <name> <url>','r');return;}
      if(r.remotes[n]){P('error: remote '+n+' already exists.','r');return;}
      r.remotes[n]=u;return;
    }
    if(sub==='remove'||sub==='rm'){
      const n=rest[0];if(!r.remotes[n]){P("error: No such remote: '"+n+"'",'r');return;}
      delete r.remotes[n];Object.keys(r.remoteRefs).forEach(k=>{if(k.startsWith(n+'/'))delete r.remoteRefs[k];});return;
    }
    if(sub==='rename'){
      const [o,n]=rest;if(!r.remotes[o]){P("error: No such remote: '"+o+"'",'r');return;}
      r.remotes[n]=r.remotes[o];delete r.remotes[o];
      Object.keys(r.remoteRefs).forEach(k=>{if(k.startsWith(o+'/')){r.remoteRefs[n+k.slice(o.length)]=r.remoteRefs[k];delete r.remoteRefs[k];}});
      Object.keys(r.upstream).forEach(b=>{if(r.upstream[b].startsWith(o+'/'))r.upstream[b]=n+r.upstream[b].slice(o.length);});return;
    }
    if(sub==='set-url'){
      const [n,u]=rest;if(!r.remotes[n]){P("error: No such remote '"+n+"'",'r');return;}
      r.remotes[n]=u;return;
    }
    if(sub==='show'){
      const n=rest[0]||'origin';if(!r.remotes[n]){P("fatal: '"+n+"' does not appear to be a git repository",'r');return;}
      P('* remote '+n);P('  Fetch URL: '+r.remotes[n]);P('  Push  URL: '+r.remotes[n]);P('  HEAD branch: main');return;
    }
    P('error: Unknown subcommand: '+sub,'r');
  };
  const splitUp=up=>{const i=up.indexOf('/');return [up.slice(0,i),up.slice(i+1)];};
  GIT.push=a=>{
    const r=R();if(!r)return;
    const setUp=a.includes('-u')||a.includes('--set-upstream'),force=a.includes('-f')||a.includes('--force')||a.includes('--force-with-lease');
    const tags=a.includes('--tags'),del=a.includes('--delete')||a.includes('-d');
    const pos=a.filter(x=>!x.startsWith('-'));let remote=pos[0],ref=pos[1];
    if(!Object.keys(r.remotes).length){
      P('fatal: No configured push destination.','r');P('Either specify the URL from the command-line or configure a remote repository using','y');P('');
      P('    git remote add <name> <url>','y');P('');P('and then push using the remote name','y');P('');P('    git push <name>','y');return;
    }
    if(!remote){
      remote=r.upstream[r.head]?splitUp(r.upstream[r.head])[0]:(r.remotes.origin?'origin':Object.keys(r.remotes)[0]);
      if(!r.upstream[r.head]&&!tags){
        P('fatal: The current branch '+r.head+' has no upstream branch.','r');P('To push the current branch and set the remote as upstream, use','y');P('');
        P('    git push --set-upstream '+remote+' '+r.head,'y');P('');
        P('To have this happen automatically for branches without a tracking','y');P("upstream, see 'push.autoSetupRemote' in 'git help config'.",'y');return;
      }
    }
    if(!r.remotes[remote]){P("fatal: '"+remote+"' does not appear to be a git repository",'r');P('fatal: Could not read from remote repository.','r');return;}
    const url=r.remotes[remote];
    if(tags){
      const nw=Object.entries(r.tags).filter(([n,t])=>r.server.tags[n]!==t.sha);
      if(!nw.length){P('Everything up-to-date');return;}
      P('To '+url);nw.forEach(([n,t])=>{r.server.tags[n]=t.sha;P(' * [new tag]         '+n+' -> '+n);});return;
    }
    if(!ref||ref==='HEAD')ref=r.head;
    if(del){
      if(r.server.branches[ref]===undefined){P("error: unable to delete '"+ref+"': remote ref does not exist",'r');return;}
      if(r.server.tags[ref]!==undefined&&false){}
      delete r.server.branches[ref];delete r.remoteRefs[remote+'/'+ref];P('To '+url);P(' - [deleted]         '+ref);return;
    }
    if(r.tags[ref]&&r.branches[ref]===undefined){
      if(r.server.tags[ref]===r.tags[ref].sha){P('Everything up-to-date');return;}
      r.server.tags[ref]=r.tags[ref].sha;P('To '+url);P(' * [new tag]         '+ref+' -> '+ref);return;
    }
    const sha=r.branches[ref];
    if(!sha){P('error: src refspec '+ref+' does not match any','r');P("error: failed to push some refs to '"+url+"'",'r');return;}
    const old=r.server.branches[ref];
    if(old===sha){P('Everything up-to-date');if(setUp)r.upstream[ref]=remote+'/'+ref;return;}
    if(old&&!isAncestor(r,old,sha)&&!force){
      P('To '+url);P(' ! [rejected]        '+ref+' -> '+ref+' (fetch first)','r');P("error: failed to push some refs to '"+url+"'",'r');
      P('hint: Updates were rejected because the remote contains work that you do not','y');P('hint: have locally. This is usually caused by another repository pushing to','y');
      P('hint: the same ref. If you want to integrate the remote changes, use','y');P("hint: 'git pull' before pushing again.",'y');return;
    }
    const n=Object.keys(ancestors(r,sha)).length||ancestors(r,sha).size;
    P('Enumerating objects: '+(n*3)+', done.');P('Counting objects: 100% ('+(n*3)+'/'+(n*3)+'), done.');
    P('Writing objects: 100% ('+(n*2)+'/'+(n*2)+'), 312 bytes | 312.00 KiB/s, done.');P('Total '+(n*2)+' (delta 0), reused 0 (delta 0), pack-reused 0');
    P('To '+url);
    if(!old)P(' * [new branch]      '+ref+' -> '+ref);
    else P(' '+s7(old)+(force&&!isAncestor(r,old,sha)?'...':'..')+s7(sha)+'  '+ref+' -> '+ref+(force&&!isAncestor(r,old,sha)?' (forced update)':''));
    r.server.branches[ref]=sha;r.remoteRefs[remote+'/'+ref]=sha;
    if(setUp){r.upstream[ref]=remote+'/'+ref;P("branch '"+ref+"' set up to track '"+remote+'/'+ref+"'.");}
  };
  GIT.fetch=a=>{
    const r=R();if(!r)return;const pos=a.filter(x=>!x.startsWith('-'));
    const remote=pos[0]||(r.upstream[r.head]?splitUp(r.upstream[r.head])[0]:'origin');
    if(!Object.keys(r.remotes).length){P('fatal: No remote repository specified.  Please, specify either a URL or a','r');P('remote name from which new revisions should be fetched.','r');return;}
    if(!r.remotes[remote]){P("fatal: '"+remote+"' does not appear to be a git repository",'r');return;}
    let head=false;const hd=()=>{if(!head){P('From '+r.remotes[remote]);head=true;}};
    Object.entries(r.server.branches).forEach(([b,sha])=>{
      const key=remote+'/'+b,old=r.remoteRefs[key];
      if(old!==sha){hd();P(old===undefined?' * [new branch]      '+b+' -> '+key:' '+s7(old)+'..'+s7(sha)+'  '+b+' -> '+key);r.remoteRefs[key]=sha;}
    });
    Object.entries(r.server.tags).forEach(([t,sha])=>{if(!r.tags[t]){hd();P(' * [new tag]         '+t+' -> '+t);r.tags[t]={sha,annotated:false};}});
    if(a.includes('--prune'))Object.keys(r.remoteRefs).forEach(k=>{
      if(k.startsWith(remote+'/')&&r.server.branches[k.slice(remote.length+1)]===undefined){hd();P(' - [deleted]         (none) -> '+k);delete r.remoteRefs[k];}
    });
  };
  GIT.pull=a=>{
    const r=R();if(!r)return;const pos=a.filter(x=>!x.startsWith('-'));let remote,branch;
    if(!Object.keys(r.remotes).length){P('fatal: No remote repository specified.  Please, specify either a URL or a','r');P('remote name from which new revisions should be fetched.','r');return;}
    const up=r.upstream[r.head];
    if(pos[0]){remote=pos[0];branch=pos[1]||r.head;}
    else if(up){[remote,branch]=splitUp(up);}
    else{
      P('There is no tracking information for the current branch.','r');P('Please specify which branch you want to merge with.','y');P('');
      P('    git branch --set-upstream-to=origin/<branch> '+r.head,'y');return;
    }
    GIT.fetch([remote]);
    const key=remote+'/'+branch,sha=r.remoteRefs[key];
    if(!sha){P("fatal: couldn't find remote ref "+branch,'r');return;}
    doMerge(r,sha,key,{ffOnly:a.includes('--ff-only'),why:'pull',mergeMsg:"Merge branch '"+branch+"' of "+r.remotes[remote]});
  };
  GIT.clone=a=>{
    const pos=[];let br=null;
    for(let i=0;i<a.length;i++){
      if(a[i]==='-b'||a[i]==='--branch')br=a[++i];
      else if(a[i]==='--depth'||a[i]==='--filter')i++;
      else if(!a[i].startsWith('-'))pos.push(a[i]);
    }
    const url=pos[0];
    if(!url){P('fatal: You must specify a repository to clone.','r');return;}
    if(!/^(https?:\/\/|git@|ssh:\/\/|\.{0,2}\/)/.test(url)){P("fatal: repository '"+url+"' does not exist",'r');return;}
    const name=pos[1]||url.replace(/\/+$/,'').split(/[\/:]/).pop().replace(/\.git$/,'');
    if(!name){P('fatal: could not determine the destination folder','r');return;}
    if(G.cwd!=='~'){P('fatal: neste simulador o clone só funciona a partir da pasta inicial (use: cd ..)','r');return;}
    const ex=G.folders[name];
    if(ex&&(ex.repo||Object.keys(ex.wd).length)){P("fatal: destination path '"+name+"' already exists and is not an empty directory.",'r');return;}
    const target=br||'main';
    if(target!=='main'&&target!=='develop'){P('fatal: Remote branch '+target+' not found in upstream origin','r');return;}
    const f={wd:{},repo:newRepo('main')},r=f.repo,au='Equipe do Projeto';
    const t1={'README.md':'# '+name},t2={...t1,'index.html':'<h1>'+name+'</h1>'},t3={...t2,'README.md':'# '+name+'\nProjeto da turma.'};
    const c1=mkCommit(r,'Primeiro commit',[],t1,au),c2=mkCommit(r,'Adiciona index.html',[c1],t2,au),c3=mkCommit(r,'Atualiza README',[c2],t3,au);
    const c4=mkCommit(r,'Adiciona pagina de contato',[c3],{...t3,'contato.html':'<h1>Contato</h1>'},au);
    const tops={main:c3,develop:c4};
    r.branches={[target]:tops[target]};r.server.branches={main:c3,develop:c4};r.remoteRefs={'origin/main':c3,'origin/develop':c4};
    r.remotes.origin=url;r.upstream={[target]:'origin/'+target};
    r.head=target;const tip=r.branches[target];
    f.wd={...r.commits[tip].tree};r.index={...f.wd};
    r.reflog.unshift({sha:tip,msg:'clone: from '+url});
    G.folders[name]=f;
    P("Cloning into '"+name+"'...");P('remote: Enumerating objects: 12, done.');P('remote: Counting objects: 100% (12/12), done.');
    P('remote: Compressing objects: 100% (8/8), done.');P('Receiving objects: 100% (12/12), done.');P('Resolving deltas: 100% (3/3), done.');
  };
  GIT.reflog=a=>{
    const r=R();if(!r)return;
    r.reflog.forEach((e,i)=>PS(['y',s7(e.sha)+' '],['c','HEAD@{'+i+'}: '],['',e.msg]));
  };
  GIT.help=()=>{
    P('Comandos que este simulador entende:','b');
    P('  config init status add commit log show diff restore reset revert rm mv clean');
    P('  branch switch checkout merge cherry-pick stash tag remote push fetch pull clone reflog');
    P('Comandos de terminal: ls cat touch echo mkdir cd pwd rm clear','d');
    P('Dica: use as setas ↑ ↓ para repetir comandos e Tab para completar.','d');
  };

  /* ---------- terminal (shell) ---------- */
  const SH={};
  SH.ls=t=>{
    const all=t.some(x=>x.v==='-a'||x.v==='-la'||x.v==='-al');const names=[];
    if(G.cwd==='~')Object.keys(G.folders).filter(k=>k!=='~').forEach(k=>names.push(k+'/'));
    Object.keys(W()).forEach(f=>{if(all||f[0]!=='.')names.push(f);});
    if(all&&F().repo)names.push('.git/');
    names.sort();if(names.length)P(names.join('  '));
  };
  SH.cat=t=>{
    const f=t[1]&&t[1].v;if(!f){P('cat: faltou o nome do arquivo','r');return;}
    const v=W()[f];if(v===undefined){P('cat: '+f+': No such file or directory','r');return;}
    if(v!=='')v.split('\n').forEach(l=>P(l));
  };
  SH.touch=t=>{if(t.length<2){P('touch: faltou o nome do arquivo','r');return;}t.slice(1).forEach(x=>{if(W()[x.v]===undefined)W()[x.v]='';});};
  SH.echo=t=>{
    const i=t.findIndex(x=>x.op);const words=(i<0?t.slice(1):t.slice(1,i)).map(x=>x.v).join(' ');
    if(i<0){P(words);return;}
    const file=t[i+1]&&t[i+1].v;if(!file){P('bash: erro de sintaxe: faltou o nome do arquivo depois de '+t[i].v,'r');return;}
    const wd=W();
    if(t[i].v==='>')wd[file]=words;
    else wd[file]=(wd[file]===undefined||wd[file]==='')?words:wd[file]+'\n'+words;
  };
  SH.mkdir=t=>{
    const n=t[1]&&t[1].v;if(!n){P('mkdir: faltou o nome da pasta','r');return;}
    if(G.cwd!=='~'){P('mkdir: neste simulador, crie pastas apenas na pasta inicial (~).','y');return;}
    if(G.folders[n]){P("mkdir: não foi possível criar '"+n+"': O arquivo já existe",'r');return;}
    G.folders[n]={wd:{},repo:null};
  };
  SH.cd=t=>{
    const n=t[1]&&t[1].v;
    if(!n||n==='~'||n==='..'||n==='../'||n==='~/'){G.cwd='~';return;}
    const k=n.replace(/^\.\//,'').replace(/\/$/,'');
    if(G.cwd==='~'&&G.folders[k]&&k!=='~'){G.cwd=k;return;}
    P('cd: '+n+': No such file or directory','r');
  };
  SH.pwd=()=>P('/home/aluno'+(G.cwd==='~'?'':'/'+G.cwd));
  SH.rm=t=>{
    const fs=t.slice(1).filter(x=>!x.v.startsWith('-'));
    if(!fs.length){P('rm: faltou o nome do arquivo','r');return;}
    fs.forEach(x=>{if(W()[x.v]===undefined)P("rm: não foi possível remover '"+x.v+"': Arquivo ou diretório inexistente",'r');else delete W()[x.v];});
  };
  SH.clear=()=>{};

  /* ---------- despacho ---------- */
  const GIT_NAMES=['config','init','status','add','commit','log','show','diff','restore','reset','revert','rm','mv','clean','branch','switch','checkout','merge','cherry-pick','stash','tag','remote','push','fetch','pull','clone','reflog','ls-files','rev-parse','help'];
  function run(line){
    OUT=[];line=line.trim();
    if(!line)return {out:OUT,err:false};
    const toks=tokenize(line),args=toks.map(t=>t.v),cmd=args[0];
    if(cmd==='clear')return {out:[],clear:true,err:false};
    if(cmd==='git'){
      let sub=args[1];
      if(!sub){P('usage: git [--version] [--help] <command> [<args>]','y');P("digite 'help' para ver os comandos deste simulador",'d');}
      else{
        if(G.cfg['alias.'+sub]){args.splice(1,1,...G.cfg['alias.'+sub].split(/\s+/));sub=args[1];}
        if(sub==='--version'||sub==='version')P('git version 2.45.1');
        else if(sub==='--help'||sub==='-h'||sub==='help')GIT.help();
        else{
          const fn=GIT[sub.replace(/-/g,'_')];
          if(!fn||sub.startsWith('_')){
            P("git: '"+sub+"' is not a git command. See 'git --help'.",'r');
            const best=GIT_NAMES.map(n=>[lev(sub,n),n]).sort((x,y)=>x[0]-y[0])[0];
            if(best&&best[0]<=2){P('');P('The most similar command is','y');P('\t'+best[1],'y');}
          }else fn(args.slice(2));
        }
      }
    }else if(cmd==='help'){GIT.help();}
    else if(SH[cmd])SH[cmd](toks);
    else P(cmd+': comando não encontrado'+(/^(add|commit|status|init|push|pull|clone|branch|merge|log)$/.test(cmd)?'. Faltou escrever "git" antes?':''),'r');
    const err=OUT.some(l=>/^(fatal:|error:|git: '|.*: comando não encontrado|cd: |cat: |rm: |mkdir: |touch: |bash: )/.test(l[0][1])||/^(fatal|error)/.test(l[0][1]));
    return {out:OUT,err};
  }

  /* ---------- visão para a interface ---------- */
  function graphOf(r){
    const reach=new Set();allTips(r).forEach(t=>ancestors(r,t).forEach(s=>reach.add(s)));
    const lanes=[],laneOfTip=[];
    const addLane=n=>{if(!lanes.includes(n))lanes.push(n);};
    const first=Object.keys(r.branches).includes('main')?'main':(Object.keys(r.branches).includes('master')?'master':null);
    if(first)addLane(first);
    Object.keys(r.branches).forEach(addLane);
    Object.keys(r.remoteRefs).forEach(k=>addLane(k.slice(k.indexOf('/')+1)));
    if(!lanes.length)addLane(r.head);
    const lane={};
    const claim=(tip,ln)=>{let s=tip;while(s&&r.commits[s]&&lane[s]===undefined){lane[s]=lanes.indexOf(ln);s=r.commits[s].parents[0];}};
    lanes.forEach(ln=>{if(r.branches[ln])claim(r.branches[ln],ln);});
    lanes.forEach(ln=>{Object.keys(r.remoteRefs).forEach(k=>{if(k.slice(k.indexOf('/')+1)===ln)claim(r.remoteRefs[k],ln);});});
    lanes.forEach(ln=>{
      const tip=r.branches[ln];if(!tip)return;
      const st=[tip];while(st.length){const s=st.pop();if(!r.commits[s])continue;if(lane[s]===undefined)lane[s]=lanes.indexOf(ln);r.commits[s].parents.forEach(p=>{if(lane[p]===undefined)st.push(p);});}
    });
    const nodes=[...reach].map(s=>r.commits[s]).sort((a,b)=>a.n-b.n).map(c=>({sha:c.sha,n:c.n,msg:c.msg.split('\n')[0],parents:c.parents.filter(p=>reach.has(p)),lane:lane[c.sha]===undefined?0:lane[c.sha],merge:c.parents.length>1}));
    const tips={};const add=(sha,o)=>{if(!sha)return;(tips[sha]=tips[sha]||[]).push(o);};
    Object.entries(r.branches).forEach(([b,s])=>add(s,{t:'branch',name:b,cur:b===r.head&&!r.detached}));
    Object.entries(r.remoteRefs).forEach(([k,s])=>add(s,{t:'remote',name:k}));
    Object.entries(r.tags).forEach(([k,v])=>add(v.sha,{t:'tag',name:k}));
    if(r.detached)add(r.detached,{t:'head',name:'HEAD'});
    return {nodes,lanes,tips,head:headSha(r)};
  }
  function view(){
    const f=F(),r=f.repo,wd=f.wd;
    const v={cwd:pathStr(),folderName:G.cwd,inRepo:!!r,cfg:{...G.cfg},wd:[],staged:[],repoFiles:[],remote:null,graph:null,branch:null,stash:0,merging:false,commits:0,folders:Object.keys(G.folders).filter(k=>k!=='~')};
    if(!r){Object.keys(wd).sort().forEach(n=>v.wd.push({n,s:'plain'}));return v;}
    const head=treeOf(r,headSha(r)),c=changes(r);
    Object.keys(wd).sort().forEach(n=>{
      let s='clean';
      if(c.conflicts.includes(n))s='conflict';else if(r.index[n]===undefined)s=isIgnored(n)?'ignored':'untracked';
      else if(wd[n]!==r.index[n])s='modified';
      v.wd.push({n,s});
    });
    c.staged.forEach(([k,n])=>v.staged.push({n,s:k==='new file'?'new':k==='deleted'?'del':'mod'}));
    Object.keys(head).sort().forEach(n=>v.repoFiles.push({n}));
    v.branch=r.detached?'HEAD@'+s7(r.detached):r.head;v.merging=!!r.merging;v.stash=r.stash.length;
    v.commits=Object.keys(ancestors(r,headSha(r))).length||ancestors(r,headSha(r)).size;
    const rn=Object.keys(r.remotes)[0];
    if(rn)v.remote={name:rn,url:r.remotes[rn],branches:Object.entries(r.server.branches).map(([b,s])=>({b,sha:s7(s)}))};
    v.graph=graphOf(r);
    return v;
  }
  function reset(){G.cfg={'init.defaultBranch':'main'};G.folders={'~':{wd:{},repo:null}};G.cwd='~';}
  function silent(cmds){cmds.forEach(c=>run(c));OUT=[];}
  /* ajudantes para as missões */
  function repoNow(){const f=F();return f&&f.repo;}
  const api={run,view,reset,silent,
    state:()=>G,repo:repoNow,
    simulateRemoteCommit(msg,file,content){
      const r=repoNow();const b=r.head;const base=r.server.branches[b]||r.branches[b];
      const t={...treeOf(r,base),[file]:content};
      const s=mkCommit(r,msg,[base],t,'Colega da Turma');r.server.branches[b]=s;return s;
    },
    names:GIT_NAMES,
    hasCommit:(msg)=>{const r=repoNow();return !!r&&Object.values(r.commits).some(c=>c.msg.split('\n')[0]===msg);}
  };
  return api;
}
if(typeof module!=='undefined')module.exports={createGit};
