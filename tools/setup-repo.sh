#!/usr/bin/env bash
# Configura a descrição, o site e os tópicos do repositório e abre as issues de revisão nativa.
# Precisa do GitHub CLI autenticado como dono do repositório:  gh auth login
# Uso: bash tools/setup-repo.sh [dono/repositorio]
set -euo pipefail
REPO="${1:-bruno-a-dias/git-quest}"
DESC="Aprenda Git jogando: terminal simulado, 40 missões, troféus, diploma e 8 idiomas. Funciona offline."
SITE="https://bruno-a-dias.github.io/git-quest/"

gh repo edit "$REPO" --description "$DESC" --homepage "$SITE" \
  --add-topic git --add-topic github --add-topic education --add-topic learning \
  --add-topic gamification --add-topic game --add-topic terminal-simulator \
  --add-topic javascript --add-topic html-css-javascript --add-topic pwa \
  --add-topic i18n --add-topic teaching --add-topic tutorial \
  --add-topic portuguese --add-topic brazil --add-topic open-source --add-topic hacktoberfest

gh label create "revisão-nativa" --repo "$REPO" --color 1d76db --description "Revisão por falante nativo" 2>/dev/null || true
gh label create "i18n" --repo "$REPO" --color 0e8a16 --description "Traduções" 2>/dev/null || true
gh label create "good first issue" --repo "$REPO" --color 7057ff 2>/dev/null || true

gh issue create --repo "$REPO" --label "i18n,revisão-nativa,good first issue" \
  --title "हिन्दी: revisão por falante nativo / नेटिव स्पीकर समीक्षा" \
  --body "Procuramos uma pessoa nativa de hindi para revisar \`js/lang/hi.js\`. Veja docs/REVISAO-NATIVA.md. / हमें \`js/lang/hi.js\` की समीक्षा के लिए हिन्दी की मूल वक्ता चाहिए।"
gh issue create --repo "$REPO" --label "i18n,revisão-nativa,good first issue" \
  --title "Русский: revisão por falante nativo / проверка носителем языка" \
  --body "Procuramos uma pessoa nativa de russo para revisar \`js/lang/ru.js\`. Veja docs/REVISAO-NATIVA.md. / Нужен носитель русского языка для проверки \`js/lang/ru.js\`."
echo "Pronto."
