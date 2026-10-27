"""Gera o selo animado de cada herói: foto do GitHub dentro de anéis de energia.

O README não pode usar CSS nem carregar imagens externas dentro de um SVG, então a foto
é embutida (base64) no próprio arquivo assets/heroes/<usuario>.svg. Dourado para o dono
do projeto, ciano para os demais. Se a foto não puder ser baixada, grava uma versão
provisória (silhueta) que o workflow "Fotos dos heróis" troca pela foto real depois.

Uso:
  python .github/scripts/heroes.py usuario1 usuario2     # gera/atualiza esses selos
  python .github/scripts/heroes.py --scan                # acha os usuários citados nos READMEs
  python .github/scripts/heroes.py --scan --force        # refaz todos (ex.: trocaram a foto)
"""
import base64
import glob
import os
import re
import sys
import urllib.request

OWNER = os.environ.get('HERO_OWNER', 'bruno-a-dias').lower()
OUT = 'assets/heroes'
GOLD = ('#FFD700', '#FFF7B0')
CYAN = ('#00FFFF', '#A0FFFF')
PLACEHOLDER_MARK = '<!-- placeholder -->'


def fetch_avatar(user, timeout=15):
    """Devolve (bytes, mime) ou None se não conseguir."""
    try:
        req = urllib.request.Request(
            f'https://github.com/{user}.png?size=240',
            headers={'User-Agent': 'git-quest-heroes'})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = r.read()
        if data[:8] == b'\x89PNG\r\n\x1a\n':
            return data, 'image/png'
        if data[:3] == b'\xff\xd8\xff':
            return data, 'image/jpeg'
    except Exception as e:  # sem rede, 403, usuário inexistente...
        print(f'  aviso: não consegui baixar a foto de {user}: {e}')
    return None


def build_svg(user, photo=None):
    main, soft = GOLD if user.lower() == OWNER else CYAN
    if photo:
        data, mime = photo
        b64 = base64.b64encode(data).decode('ascii')
        face = (f'<circle cx="75" cy="75" r="55" fill="#0a0f1e"/>\n'
                f'  <image href="data:{mime};base64,{b64}" x="20" y="20" width="110" height="110" '
                f'preserveAspectRatio="xMidYMid slice" clip-path="url(#circleClip)"/>')
        mark = ''
    else:
        face = ('<circle cx="75" cy="75" r="55" fill="#16213f"/>\n'
                '  <g clip-path="url(#circleClip)" fill="#3a4a7a"><circle cx="75" cy="62" r="20"/>'
                '<ellipse cx="75" cy="128" rx="40" ry="34"/></g>')
        mark = PLACEHOLDER_MARK + '\n'
    return f'''<svg width="150" height="150" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="{user}">
{mark}  <title>{user}</title>
  <defs>
    <clipPath id="circleClip"><circle cx="75" cy="75" r="55"/></clipPath>
  </defs>
  {face}
  <!-- Anel exterior: gira para a direita -->
  <circle cx="75" cy="75" r="62" fill="none" stroke="{main}" stroke-width="4" stroke-dasharray="70 40 20 40" opacity="0.9">
    <animateTransform attributeName="transform" type="rotate" from="0 75 75" to="360 75 75" dur="4s" repeatCount="indefinite"/>
  </circle>
  <!-- Anel interior: gira para a esquerda, mais rápido -->
  <circle cx="75" cy="75" r="58" fill="none" stroke="{soft}" stroke-width="2" stroke-dasharray="30 20" opacity="0.6">
    <animateTransform attributeName="transform" type="rotate" from="360 75 75" to="0 75 75" dur="2s" repeatCount="indefinite"/>
  </circle>
</svg>
'''


def write(user, force=False, fetch=fetch_avatar, out=OUT):
    """Cria o selo de `user`. Só baixa a foto se o arquivo não existe, é provisório ou force=True."""
    if not re.fullmatch(r'[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})', user):
        raise ValueError(f'nome de usuário inválido: {user!r}')
    os.makedirs(out, exist_ok=True)
    path = os.path.join(out, f'{user}.svg')
    if os.path.exists(path) and not force:
        with open(path, encoding='utf-8') as f:
            if PLACEHOLDER_MARK not in f.read():
                return path, 'mantido'
    photo = fetch(user)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(build_svg(user, photo))
    return path, 'com foto' if photo else 'provisório (sem foto)'


def scan():
    users = set()
    for p in ['README.md'] + glob.glob('i18n/README.*.md'):
        if os.path.exists(p):
            with open(p, encoding='utf-8') as f:
                users.update(re.findall(r'assets/heroes/([A-Za-z0-9-]+)\.svg', f.read()))
    return sorted(users)


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    force = '--force' in sys.argv
    users = scan() if '--scan' in sys.argv else args
    if not users:
        print(__doc__)
        sys.exit(1)
    for u in users:
        print(u, '->', *write(u, force=force))
