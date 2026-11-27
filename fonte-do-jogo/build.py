import os
d = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(d, 'src')
js = '\n'.join(open(os.path.join(src, f), encoding='utf-8').read() for f in ['engine.js', 'skin.js', 'models.js', 'world.js', 'game.js', 'lobby.js', 'story.js', 'coop.js', 'vozes.js'])
import base64, glob
assets = {os.path.splitext(os.path.basename(f))[0]: base64.b64encode(open(f, 'rb').read()).decode() for f in glob.glob(os.path.join(d, 'assets', '*.glb'))}
import json as _j
def _comp(f):
    d = _j.load(open(f))
    for m in d['malhas'].values():
        m['p'] = [round(v, 2) for v in m['p']]
        if 'c' in m: m['c'] = [round(v, 2) for v in m['c']]
    d['objetos'] = [[o[0], [round(v, 3) for v in o[1]], [round(v, 2) for v in o[2]], o[3]] for o in d['objetos']]
    return _j.dumps(d, separators=(',', ':')).replace('.0,', ',')
maps = {os.path.splitext(os.path.basename(f))[0]: _comp(f) for f in glob.glob(os.path.join(d, 'assets', '*.json'))}
import gzip as _gz
mapz = {k: base64.b64encode(_gz.compress(v.encode(), 9)).decode() for k, v in maps.items()}
astag = '<script>const ASSETS=' + _j.dumps(assets) + ';const MAPZ=' + _j.dumps(mapz) + ';var MAPS={};</script>\n'
html = open(os.path.join(src, 'index.html'), encoding='utf-8').read().replace('/*JS*/', '{\n' + js + '\n}').replace('<script>\n{', astag + '<script>\n{', 1)
os.makedirs(os.path.join(d, 'dist'), exist_ok=True)
open(os.path.join(d, 'dist', 'Fio de Alvorada.html'), 'w', encoding='utf-8').write(html)
print('arquivo unico', len(html))
# versão web em vários arquivos (modelos e mapa separados)
import shutil
wd = os.path.join(d, 'dist', 'web'); shutil.rmtree(wd, ignore_errors=True); os.makedirs(os.path.join(wd, 'modelos')); os.makedirs(os.path.join(wd, 'mapas'))
urls = {}
for f in glob.glob(os.path.join(d, 'assets', '*.glb')):
    k = os.path.splitext(os.path.basename(f))[0]; shutil.copy(f, os.path.join(wd, 'modelos', k + '.glb')); urls[k] = 'modelos/' + k + '.glb'
murls = {}
for k, v in maps.items():
    open(os.path.join(wd, 'mapas', k + '.json.gz'), 'wb').write(_gz.compress(v.encode(), 9)); murls[k] = 'mapas/' + k + '.json.gz'
wtag = '<script>const ASSETS=' + _j.dumps(urls) + ';const MAPZ=' + _j.dumps(murls) + ';var MAPS={};</script>\n'
whtml = open(os.path.join(src, 'index.html'), encoding='utf-8').read().replace('/*JS*/', '{\n' + js + '\n}').replace('<script>\n{', wtag + '<script>\n{', 1)
open(os.path.join(wd, 'index.html'), 'w', encoding='utf-8').write(whtml)
print('web', len(whtml))
