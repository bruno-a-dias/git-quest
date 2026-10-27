import os
import sys

# Pega os dados que o GitHub Actions vai enviar
author = os.environ.get('PR_AUTHOR')
pr_number = os.environ.get('PR_NUMBER')

if not author or not pr_number:
    print("Faltam dados do PR.")
    sys.exit(1)

# Evita duplicar o card se o contribuidor já estiver lá ou se for você mesmo
with open('README.md', 'r', encoding='utf-8') as f:
    readme = f.read()

if f'https://github.com/{author}' in readme:
    print(f"O contribuidor {author} já possui um card no README.")
    sys.exit(0)

# Monta o card em HTML
card_html = f"""
    <!-- Card de {author} -->
    <td align="center" width="220" style="padding: 15px; border: 1px solid #00FFFF; border-radius: 8px;">
      <a href="https://github.com/{author}">
        <img src="https://github.com/{author}.png" width="120px;" style="border-radius: 50%; border: 3px solid #00FFFF;" alt="Foto de {author}"/><br />
        <br />
        <sub><b style="font-size: 16px; color: #FFFFFF;">{author}</b></sub>
      </a><br />
      <span style="color: #00FFFF; font-weight: bold;">⚔️ Contribuidor(a)</span><br />
      <sub style="color: #A0A0A0;">PR #{pr_number}</sub>
    </td>"""

# Injeta o novo card no lugar do marcador
marker = "<!-- NOVO_CONTRIBUIDOR_AQUI -->"
if marker in readme:
    new_readme = readme.replace(marker, card_html + "\n    " + marker)
    with open('README.md', 'w', encoding='utf-8') as f:
        f.write(new_readme)
    print(f"Card de {author} adicionado com sucesso!")
else:
    print("Marcador <!-- NOVO_CONTRIBUIDOR_AQUI --> não encontrado no README.md!")
    sys.exit(1)