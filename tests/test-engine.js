const fs=require('fs');const path=require('path');
const d=__dirname;
const {createGit}=require('../js/git-engine.js');
let fails=0;
const txt=r=>r.out.map(l=>l.map(s=>s[1]).join('')).join('\n');
function t(g,cmd,expectRe,expectErr){
  const r=g.run(cmd);const o=txt(r);
  const okRe=expectRe===undefined||(expectRe instanceof RegExp?expectRe.test(o):o.includes(expectRe));
  const okErr=expectErr===undefined||r.err===expectErr;
  if(!okRe||!okErr){fails++;console.log('FALHOU: '+cmd+'\n  esperado: '+expectRe+' err='+expectErr+'\n  obtido  : err='+r.err+'\n'+o.split('\n').map(x=>'    '+x).join('\n'));}
  return o;
}
let g=createGit();
// shell + init
t(g,'git status',/not a git repository/,true);
t(g,'mkdir pizzaria');t(g,'cd pizzaria');t(g,'git init',/Initialized empty Git repository in ~\/pizzaria\/.git\//,false);
t(g,'git commit -m "x"',/Author identity unknown/,true);
t(g,'git config --global user.name "Maria da Silva"');t(g,'git config --global user.email maria@email.com');
t(g,'git config user.name','Maria da Silva');
t(g,'touch index.html');t(g,'echo "<h1>Cardapio</h1>" > index.html');t(g,'cat index.html','<h1>Cardapio</h1>');
t(g,'git status',/Untracked files:[\s\S]*index.html/,false);
t(g,'git status -s','?? index.html');
t(g,'git commit -m "x"',/No commits yet|nothing added to commit/,false);
t(g,'git add index.html',undefined,false);
t(g,'git status',/Changes to be committed:[\s\S]*new file:\s+index.html/);
t(g,'git commit -m "Cria pagina inicial"',/root-commit.*Cria pagina inicial[\s\S]*1 file changed, 1 insertion\(\+\)[\s\S]*create mode 100644 index.html/);
t(g,'git status','nothing to commit, working tree clean');
t(g,'echo "<li>Calabresa</li>" >> index.html');
t(g,'git diff',/\+<li>Calabresa<\/li>/);
t(g,'git status',/Changes not staged for commit:[\s\S]*modified:\s+index.html/);
t(g,'git commit -am "Adiciona sabor"',/1 file changed, 1 insertion/);
t(g,'git log --oneline',/Adiciona sabor[\s\S]*Cria pagina inicial/);
t(g,'git log --oneline -n 1',/^(?:(?!Cria).)*$/s);
// desfazer
t(g,'echo "lixo" >> index.html');t(g,'git restore index.html');t(g,'cat index.html',/^(?:(?!lixo)[\s\S])*$/);
t(g,'echo "extra" > extra.txt');t(g,'git add extra.txt');t(g,'git restore --staged extra.txt');t(g,'git status',/Untracked files:[\s\S]*extra.txt/);
t(g,'git add extra.txt');t(g,'git commit -m "extra"');
t(g,'git reset --soft HEAD~1');t(g,'git status',/new file:\s+extra.txt/);
t(g,'git commit -m "extra 2"');
t(g,'git reset --hard HEAD~1',/HEAD is now at .* Adiciona sabor/);t(g,'ls','index.html');
t(g,'git reflog',/HEAD@\{1\}: commit: extra 2/);
t(g,'git reset --hard HEAD@{1}',/HEAD is now at .* extra 2/);t(g,'ls',/extra.txt/);
t(g,'git revert HEAD',/Revert "extra 2"/);t(g,'ls',/^(?:(?!extra)[\s\S])*$/);
// branches e merge sem conflito
t(g,'git switch -c feature/contato',"Switched to a new branch 'feature/contato'");
t(g,'echo "<p>Contato</p>" > contato.html');t(g,'git add .');t(g,'git commit -m "Adiciona contato"');
t(g,'git switch main',"Switched to branch 'main'");t(g,'ls',/^(?:(?!contato)[\s\S])*$/);
t(g,'git merge feature/contato',/Fast-forward/);t(g,'ls','contato.html');
t(g,'git branch -d feature/contato',/Deleted branch feature\/contato/);
// conflito
t(g,'git switch -c b1');t(g,'echo "versao b1" > index.html');t(g,'git commit -am "b1"');
t(g,'git switch main');t(g,'echo "versao main" > index.html');t(g,'git commit -am "main muda"');
t(g,'git merge b1',/CONFLICT \(content\): Merge conflict in index.html[\s\S]*Automatic merge failed/);
t(g,'git status',/Unmerged paths:[\s\S]*both modified:\s+index.html/);
t(g,'cat index.html',/<<<<<<< HEAD[\s\S]*versao main[\s\S]*=======[\s\S]*versao b1[\s\S]*>>>>>>> b1/);
t(g,'git commit -m "tentativa"',/unmerged files/,true);
t(g,'echo "versao final" > index.html');t(g,'git add index.html');
t(g,'git commit -m "Resolve conflito"',/Resolve conflito/);
t(g,'git log --oneline',/Resolve conflito/);t(g,'git status','nothing to commit');
// merge --abort
t(g,'git switch -c b2');t(g,'echo "b2" > index.html');t(g,'git commit -am "b2"');
t(g,'git switch main');t(g,'echo "m2" > index.html');t(g,'git commit -am "m2"');
t(g,'git merge b2',/CONFLICT/);t(g,'git merge --abort');t(g,'cat index.html','m2');t(g,'git status','nothing to commit, working tree clean');
// stash
t(g,'echo "wip" >> index.html');t(g,'git stash',/Saved working directory and index state WIP on main/);
t(g,'cat index.html',/^m2$/);t(g,'git stash list',/stash@\{0\}: WIP on main/);t(g,'git stash pop',/Dropped/);t(g,'cat index.html',/wip/);
t(g,'git restore index.html');
// tags
t(g,'git tag -a v1.0.0 -m "Primeira versao"');t(g,'git tag','v1.0.0');t(g,'git log --oneline -n 1',/tag: v1.0.0/);
t(g,'git tag v1.0.0',/already exists/,true);
// remoto
t(g,'git push',/No configured push destination/,true);
t(g,'git remote add origin https://github.com/maria/pizzaria.git');t(g,'git remote -v',/origin\s+https:\/\/github.com\/maria\/pizzaria.git \(push\)/);
t(g,'git push',/no upstream branch[\s\S]*git push --set-upstream origin main/,true);
t(g,'git push -u origin main',/\* \[new branch\]\s+main -> main[\s\S]*set up to track 'origin\/main'/,false);
t(g,'git status',/up to date with 'origin\/main'/);
t(g,'echo "n" > n.txt');t(g,'git add .');t(g,'git commit -m "novo"');
t(g,'git status',/ahead of 'origin\/main' by 1 commit/);
t(g,'git push',/main -> main/);
t(g,'git push --tags',/new tag/);
// colega empurra
g.simulateRemoteCommit('Colega muda','colega.txt','oi');
t(g,'git fetch',/origin\/main/);t(g,'git status',/behind 'origin\/main' by 1 commit/);
t(g,'git pull',/Fast-forward/);t(g,'ls','colega.txt');
// push rejeitado
g.simulateRemoteCommit('Colega 2','c2.txt','x');
t(g,'echo "l" > l.txt');t(g,'git add .');t(g,'git commit -m "local"');
t(g,'git push',/rejected[\s\S]*fetch first/,true);
t(g,'git pull',/Merge made by the 'ort' strategy/);t(g,'git push',/main -> main/,false);
// clone
t(g,'cd ..');t(g,'git clone https://github.com/turma/projeto.git',/Cloning into 'projeto'/,false);
t(g,'cd projeto');t(g,'git log --oneline',/Atualiza README/);t(g,'git remote -v','origin');t(g,'git branch -a',/remotes\/origin\/develop/);
t(g,'git switch develop',/set up to track 'origin\/develop'/);t(g,'ls','contato.html');
t(g,'cd ..');t(g,'git clone -b develop https://github.com/turma/projeto2.git',/Cloning into 'projeto2'/);t(g,'cd projeto2');t(g,'git branch',/\* develop/);
t(g,'cd ..');t(g,'git clone https://github.com/turma/projeto.git',/already exists/,true);
// erros comuns
t(g,'git comit -m x',/most similar command is[\s\S]*commit/,true);
t(g,'status',/Faltou escrever "git"/,true);
// gitignore e clean
t(g,'cd pizzaria');t(g,'echo "*.log" > .gitignore');t(g,'echo "x" > erro.log');t(g,'git status',/^(?:(?!erro\.log)[\s\S])*$/);
t(g,'echo "tmp" > lixo.txt');t(g,'git clean -n','Would remove lixo.txt');t(g,'git clean',/refusing to clean/,true);t(g,'git clean -f','Removing lixo.txt');
// aliases
t(g,'git config --global alias.st status');t(g,'git st',/On branch main/);
// cherry-pick
t(g,'git add .gitignore');t(g,'git commit -m "ignore"');
t(g,'git switch -c hot');t(g,'echo "fix" > fix.txt');t(g,'git add .');t(g,'git commit -m "hotfix"');
t(g,'git switch main');const hot=g.repo().branches.hot;t(g,'git cherry-pick '+hot.slice(0,7),/hotfix/);t(g,'ls','fix.txt');
// view
const v=g.view();if(!v.inRepo||!v.graph.nodes.length||!v.graph.lanes.length){fails++;console.log('FALHOU view');}
console.log(fails?('\n'+fails+' falhas'):'TODOS OS TESTES DO MOTOR PASSARAM');
process.exit(fails?1:0);
