import os
d = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(d, 'src')
js = '\n'.join(open(os.path.join(src, f), encoding='utf-8').read() for f in ['engine.js', 'skin.js', 'models.js', 'world.js', 'game.js', 'story.js'])
import base64, glob
assets = {os.path.splitext(os.path.basename(f))[0]: base64.b64encode(open(f, 'rb').read()).decode() for f in glob.glob(os.path.join(d, 'assets', '*.glb'))}
astag = '<script>const ASSETS=' + __import__('json').dumps(assets) + ';</script>\n'
html = open(os.path.join(src, 'index.html'), encoding='utf-8').read().replace('/*JS*/', '{\n' + js + '\n}').replace('<script>\n{', astag + '<script>\n{', 1)
os.makedirs(os.path.join(d, 'dist'), exist_ok=True)
open(os.path.join(d, 'dist', 'Fio de Alvorada.html'), 'w', encoding='utf-8').write(html)
print(len(html))
