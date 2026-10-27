"""Adiciona o card do autor de um PR aceito em todos os READMEs (pt + i18n/)."""
import glob
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import heroes  # gera assets/heroes/<usuario>.svg (foto dentro dos anéis animados)

author = os.environ.get('PR_AUTHOR')
pr_number = os.environ.get('PR_NUMBER')
if not author or not pr_number:
    print("Faltam dados do PR.")
    sys.exit(1)

ROLE = {
    'README.md': '⚔️ Contribuidor(a)',
    'README.en.md': '⚔️ Contributor',
    'README.es.md': '⚔️ Colaborador(a)',
    'README.fr.md': '⚔️ Contributeur·rice',
    'README.de.md': '⚔️ Mitwirkende(r)',
    'README.it.md': '⚔️ Contributore',
    'README.ru.md': '⚔️ Контрибьютор',
    'README.hi.md': '⚔️ योगदानकर्ता',
}
MARKER = "<!-- NOVO_CONTRIBUIDOR_AQUI -->"

def card(role, prefix):
    return f"""
    <!-- Card de {author} -->
    <td align="center" width="220" style="padding: 15px; border: 1px solid #00FFFF; border-radius: 8px;">
      <a href="https://github.com/{author}">
        <img src="{prefix}assets/heroes/{author}.svg" width="150" height="150" alt="{author}"/><br />
        <br />
        <sub><b style="font-size: 16px; color: #FFFFFF;">{author}</b></sub>
      </a><br />
      <span style="color: #00FFFF; font-weight: bold;">{role}</span><br />
      <sub style="color: #A0A0A0;">PR #{pr_number}</sub>
    </td>"""

try:
    print('Selo animado:', *heroes.write(author, force=True))
except ValueError as e:
    print('Usuário ignorado:', e)
    sys.exit(1)

changed = 0
for path in ['README.md'] + sorted(glob.glob('i18n/README.*.md')):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    if f'https://github.com/{author}"' in text:
        print(f"{path}: {author} já possui card.")
        continue
    if MARKER not in text:
        print(f"{path}: marcador não encontrado, ignorado.")
        continue
    role = ROLE.get(os.path.basename(path), ROLE['README.md'])
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text.replace(MARKER, card(role, '' if path == 'README.md' else '../') + "\n    " + MARKER))
    changed += 1
    print(f"{path}: card de {author} adicionado.")

if changed == 0:
    print("Nada a alterar.")
