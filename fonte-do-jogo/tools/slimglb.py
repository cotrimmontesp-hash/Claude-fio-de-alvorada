"""Enxuga o .glb exportado: so o personagem com esqueleto, texturas de cor reduzidas e as animacoes usadas."""
import json, struct, sys, io
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
KEEP = sys.argv[3].split(',')
b = open(src, 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; g = json.loads(b[20:20 + n]); off = 20 + n
bl = struct.unpack('<I', b[off:off + 4])[0]; bin_ = b[off + 8:off + 8 + bl]
# nos: subárvore da cena que tem pele (skin)
skn = [i for i, nd in enumerate(g['nodes']) if 'skin' in nd][0]
par = {}
for i, nd in enumerate(g['nodes']):
    for c in nd.get('children', []): par[c] = i
root = skn
while root in par: root = par[root]
keep = []
def walk(i):
    keep.append(i)
    for c in g['nodes'][i].get('children', []): walk(c)
walk(root)
nm = {o: k for k, o in enumerate(keep)}
out = {'asset': g['asset'], 'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [], 'meshes': [], 'materials': [], 'textures': [], 'images': [], 'samplers': [{}], 'skins': [], 'animations': [], 'accessors': [], 'bufferViews': [], 'buffers': []}
blob = bytearray()
def addbv(data, target=None):
    while len(blob) % 4: blob.append(0)
    bv = {'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(data)}
    if target: bv['target'] = target
    blob.extend(data); out['bufferViews'].append(bv); return len(out['bufferViews']) - 1
amap = {}
def acc(i):
    if i in amap: return amap[i]
    a = dict(g['accessors'][i]); bv = g['bufferViews'][a['bufferView']]
    cs = {5126: 4, 5125: 4, 5123: 2, 5121: 1, 5122: 2, 5120: 1}[a['componentType']]; nc = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
    st = bv.get('byteStride', cs * nc); s0 = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    data = b''.join(bin_[s0 + k * st: s0 + k * st + cs * nc] for k in range(a['count'])) if st != cs * nc else bin_[s0: s0 + a['count'] * cs * nc]
    a['bufferView'] = addbv(data); a.pop('byteOffset', None); out['accessors'].append(a); amap[i] = len(out['accessors']) - 1; return amap[i]
# imagens de cor
imap = {}
def img(texi, maxs=1024):
    s = g['textures'][texi]['source']
    if s in imap: return imap[s]
    im = g['images'][s]; bv = g['bufferViews'][im['bufferView']]; raw = bin_[bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']]
    p = Image.open(io.BytesIO(raw)); p.thumbnail((maxs, maxs))
    o = io.BytesIO()
    if p.mode in ('RGBA', 'LA', 'P') and 'A' in p.getbands(): p.save(o, 'PNG', optimize=True); mt = 'image/png'
    else: p.convert('RGB').save(o, 'JPEG', quality=86); mt = 'image/jpeg'
    out['images'].append({'bufferView': addbv(o.getvalue()), 'mimeType': mt}); out['textures'].append({'sampler': 0, 'source': len(out['images']) - 1})
    imap[s] = len(out['textures']) - 1; return imap[s]
mmap = {}
def mat(i):
    if i in mmap: return mmap[i]
    m = g['materials'][i]; pb = m.get('pbrMetallicRoughness', {}); nmt = {'name': m.get('name', ''), 'pbrMetallicRoughness': {'roughnessFactor': pb.get('roughnessFactor', .6)}}
    if 'baseColorFactor' in pb: nmt['pbrMetallicRoughness']['baseColorFactor'] = pb['baseColorFactor']
    if 'baseColorTexture' in pb: nmt['pbrMetallicRoughness']['baseColorTexture'] = {'index': img(pb['baseColorTexture']['index'])}
    if m.get('alphaMode'): nmt['alphaMode'] = 'MASK'
    out['materials'].append(nmt); mmap[i] = len(out['materials']) - 1; return mmap[i]
for o in keep:
    nd = dict(g['nodes'][o]); nd.pop('camera', None)
    if 'children' in nd: nd['children'] = [nm[c] for c in nd['children'] if c in nm]
    if 'mesh' in nd:
        me = g['meshes'][nd['mesh']]; prims = []
        for p in me['primitives']:
            q = {'attributes': {k: acc(v) for k, v in p['attributes'].items() if k in ('POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0')}, 'indices': acc(p['indices'])}
            if 'material' in p: q['material'] = mat(p['material'])
            prims.append(q)
        out['meshes'].append({'primitives': prims}); nd['mesh'] = len(out['meshes']) - 1
    if 'skin' in nd:
        s = g['skins'][nd['skin']]; out['skins'].append({'joints': [nm[j] for j in s['joints']], 'inverseBindMatrices': acc(s['inverseBindMatrices'])}); nd['skin'] = len(out['skins']) - 1
    out['nodes'].append(nd)
for an in g['animations']:
    if an['name'] not in KEEP: continue
    chs, sms = [], []
    for c in an['channels']:
        if c['target']['node'] not in nm: continue
        s = an['samplers'][c['sampler']]
        sms.append({'input': acc(s['input']), 'output': acc(s['output']), 'interpolation': s.get('interpolation', 'LINEAR')})
        chs.append({'sampler': len(sms) - 1, 'target': {'node': nm[c['target']['node']], 'path': c['target']['path']}})
    out['animations'].append({'name': an['name'], 'channels': chs, 'samplers': sms})
while len(blob) % 4: blob.append(0)
out['buffers'] = [{'byteLength': len(blob)}]
js = json.dumps(out, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + bytes(blob)
open(dst, 'wb').write(glb)
print('ok', len(glb), 'anims', [a['name'] for a in out['animations']], 'imgs', [(i['mimeType'], out['bufferViews'][i['bufferView']]['byteLength']) for i in out['images']])
