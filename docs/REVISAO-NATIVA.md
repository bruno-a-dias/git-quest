# Revisão por falantes nativos

O Git Quest foi traduzido para 7 idiomas além do português. **Hindi (हिन्दी) e russo (Русский)** ainda não foram revisados por falantes nativos. As traduções passam nos testes automáticos (mesmas chaves, mesmos comandos preservados), mas só uma pessoa nativa percebe se o texto soa natural.

## Quero ajudar
1. Abra uma issue pelo modelo **Revisão por falante nativo** (aba *Issues* → *New issue*).
2. Jogue o jogo no idioma, passando pelo menos pelos Mundos 1, 8 e 9, pela sala de troféus e pelo verso do diploma.
3. Corrija direto no arquivo (`js/lang/hi.js` ou `js/lang/ru.js`) e abra um Pull Request, ou liste as correções na issue.

## O que conferir
- Tom: o jogo fala com o aluno de forma direta e amigável.
- Termos técnicos: `commit`, `branch`, `merge`, `push`, `pull`, `rebase`, `stash` ficam em inglês, como nas ferramentas reais.
- Comandos, opções (`--oneline`) e nomes de arquivos **não** se traduzem.
- Nomes dos troféus devem caber no diploma (até ~28 caracteres).

## Como rodar os testes depois de editar
```bash
npm test
```
