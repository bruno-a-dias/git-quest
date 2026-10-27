"""Testa o gerador de selos sem rede (a foto é simulada)."""
import base64, os, sys, tempfile, unittest
import xml.etree.ElementTree as ET
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '.github', 'scripts'))
import heroes

PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')

class T(unittest.TestCase):
    def test_owner_is_gold_others_cyan(self):
        self.assertIn('#FFD700', heroes.build_svg('bruno-a-dias'))
        self.assertIn('#00FFFF', heroes.build_svg('fulano'))
        self.assertNotIn('#00FFFF', heroes.build_svg('bruno-a-dias'))

    def test_valid_xml_with_embedded_photo_and_animation(self):
        svg = heroes.build_svg('fulano', (PNG, 'image/png'))
        ET.fromstring(svg)                       # XML válido
        self.assertIn('data:image/png;base64,', svg)
        self.assertEqual(svg.count('<animateTransform'), 2)   # um por anel
        self.assertNotIn('placeholder', svg)
        self.assertNotIn('http://', svg.replace('http://www.w3.org/2000/svg', ''))  # nada externo

    def test_placeholder_then_photo_replaces_it(self):
        with tempfile.TemporaryDirectory() as d:
            _, st = heroes.write('fulano', fetch=lambda u: None, out=d)
            self.assertIn('provisório', st)
            _, st = heroes.write('fulano', fetch=lambda u: (PNG, 'image/png'), out=d)   # troca o provisório
            self.assertEqual(st, 'com foto')
            _, st = heroes.write('fulano', fetch=lambda u: None, out=d)                 # foto real é mantida
            self.assertEqual(st, 'mantido')
            with open(os.path.join(d, 'fulano.svg'), encoding='utf-8') as f:
                self.assertIn('base64', f.read())

    def test_rejects_path_traversal(self):
        for bad in ['../x', 'a/b', '', '-x', 'a b']:
            with self.assertRaises(ValueError):
                heroes.write(bad, fetch=lambda u: None, out=tempfile.gettempdir())

    def test_readmes_point_to_existing_svg(self):
        root = os.path.join(os.path.dirname(__file__), '..')
        for p in ['README.md'] + ['i18n/README.%s.md' % c for c in 'en es fr de it ru hi'.split()]:
            with open(os.path.join(root, p), encoding='utf-8') as f:
                txt = f.read()
            self.assertIn('assets/heroes/bruno-a-dias.svg', txt, p)
            self.assertIn('NOVO_CONTRIBUIDOR_AQUI', txt, p)
        self.assertTrue(os.path.exists(os.path.join(root, 'assets/heroes/bruno-a-dias.svg')))

if __name__ == '__main__':
    unittest.main(verbosity=1)
