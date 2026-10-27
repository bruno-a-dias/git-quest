# Contribuindo com o Git Quest 🚇

Obrigado por querer ajudar! O projeto é HTML + CSS + JavaScript puro, sem build.

## Começando

```bash
git clone https://github.com/bruno-a-dias/git-quest.git
cd git-quest
npm start      # servidor local (ou abra index.html)
npm test       # motor de Git, 32 missões, idiomas e código de progresso
npm install && npx playwright install chromium
npm run test:e2e   # joga o jogo todo no navegador (pt e hi); test:e2e:all = 8 idiomas
```

## Onde mexer

| Quero… | Arquivo |
|---|---|
| Corrigir/criar uma missão | `js/missions.js` (e os textos em **todos** os `js/lang/*.js`) |
| Corrigir uma tradução | `js/lang/<idioma>.js` |
| Adicionar um idioma | novo `js/lang/xx.js`, bandeira em `js/i18n.js`, `<script>` em `index.html`, README em `i18n/` |
| Ajustar o simulador de Git | `js/git-engine.js` (+ teste em `tests/test-engine.js`) |
| Visual | `css/style.css` |
| Progresso, diploma ou painel da turma | `js/progress.js`, `js/ui-share.js`, `professor.html`, `js/professor.js` |

## Regras rápidas

1. Comandos Git **nunca** são traduzidos; a saída do Git simulado segue o padrão do motor.
2. Toda missão precisa ser completável: `npm test` valida a solução de cada uma.
3. `tests/test-i18n.js` exige que todos os idiomas tenham todas as chaves.
4. Abra o *pull request* para a branch `main`. Quando for aceito, um bot adiciona seu card em "Heróis do Git Quest" nos READMEs.

Dúvidas? Abra uma *issue*.
