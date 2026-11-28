# junta modelos glTF escolhidos num único cenario.glb (texturas reduzidas) + info de tamanho
import json, struct, sys, os, io, math
import numpy as np
from PIL import Image
BASE = '/home/claude/pacotes'
NAT = BASE + '/Stylized_Nature/glTF'; FAN = BASE + '/Fantasy_Props/Exports/glTF'; MED = BASE + '/Medieval_Village/Medieval Village MegaKit[Standard]/glTF'
ESC = {NAT: ['CommonTree_1', 'CommonTree_2', 'CommonTree_3', 'CommonTree_4', 'CommonTree_5', 'Pine_1', 'Pine_2', 'Pine_3', 'Pine_4', 'Pine_5', 'TwistedTree_1', 'TwistedTree_2', 'TwistedTree_3', 'TwistedTree_4', 'TwistedTree_5',
             'DeadTree_1', 'DeadTree_2', 'DeadTree_3', 'DeadTree_4', 'Bush_Common', 'Bush_Common_Flowers', 'Fern_1', 'Plant_1_Big', 'Plant_7_Big', 'Mushroom_Common', 'Mushroom_Laetiporus',
             'Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3', 'Pebble_Round_1', 'Pebble_Round_3', 'Pebble_Square_2', 'Grass_Common_Tall', 'Grass_Wispy_Tall', 'Flower_3_Group', 'Flower_4_Group', 'Clover_1',
             'RockPath_Round_Wide', 'RockPath_Square_Wide'],
       FAN: ['Barrel', 'Barrel_Apples', 'Crate_Wooden', 'FarmCrate_Apple', 'FarmCrate_Carrot', 'Stall_Cart_Empty', 'Stall_Empty', 'Banner_1', 'Banner_2', 'Bench', 'Anvil', 'Workbench', 'Torch_Metal', 'Bucket_Wooden_1', 'Cauldron', 'Lantern_Wall', 'WeaponStand', 'Table_Large', 'Pot_1', 'Vase_Rubble_Medium'],
       MED: ['Wall_Plaster_Straight', 'Wall_UnevenBrick_Straight', 'Wall_Plaster_WoodGrid', 'Wall_UnevenBrick_Door_Round', 'Wall_Plaster_Door_Round', 'Wall_Plaster_Window_Wide_Round', 'Wall_UnevenBrick_Window_Wide_Round', 'Window_Wide_Round1', 'WindowShutters_Wide_Round_Open', 'Door_1_Round', 'Corner_Exterior_Wood', 'Corner_Exterior_Brick', 'Roof_RoundTiles_4x6', 'Roof_Front_Brick4', 'Prop_Wagon', 'Prop_WoodenFence_Single', 'Prop_WoodenFence_Extension1', 'Prop_MetalFence_Simple', 'Prop_Crate', 'Prop_Vine2', 'Prop_Support', 'Prop_Chimney']}
CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
def acc(g, bins, i):
    a = g['accessors'][i]; bv = g['bufferViews'][a['bufferView']]; b = bins[bv['buffer']]
    n = NC[a['type']]; dt = np.dtype(CT[a['componentType']]); st = bv.get('byteStride', 0) or n * dt.itemsize
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0); cnt = a['count']
    raw = np.frombuffer(b, dtype=np.uint8, count=st * (cnt - 1) + n * dt.itemsize, offset=off)
    out = np.lib.stride_tricks.as_strided(raw, shape=(cnt, n * dt.itemsize), strides=(st, 1)).copy().view(dt).reshape(cnt, n)
    if a.get('normalized') and dt != np.float32: out = out.astype(np.float32) / np.iinfo(dt).max
    return out
def qmat(t, r, s):
    x, y, z, w = r; R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4); M[:3, :3] = R * np.array(s); M[:3, 3] = t; return M
OUT = {'nodes': [], 'meshes': [], 'materials': [], 'textures': [], 'images': [], 'accessors': [], 'bufferViews': [], 'samplers': [{'magFilter': 9729, 'minFilter': 9987}]}
blob = bytearray(); TEXC = {}; INFO = {}
def addbuf(arr, target=None):
    global blob
    while len(blob) % 4: blob += b'\0'
    off = len(blob); data = arr.tobytes(); blob += data
    bv = {'buffer': 0, 'byteOffset': off, 'byteLength': len(data)}
    if target: bv['target'] = target
    OUT['bufferViews'].append(bv); return len(OUT['bufferViews']) - 1
def addacc(arr, typ, ct, target=None, mm=False):
    bv = addbuf(arr, target); a = {'bufferView': bv, 'componentType': ct, 'count': int(arr.shape[0]), 'type': typ}
    if mm: a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
    OUT['accessors'].append(a); return len(OUT['accessors']) - 1
def tex(path, verde=False):
    key = (path, verde)
    if key in TEXC: return TEXC[key]
    im = Image.open(path)
    if verde:  # folhas vermelhas viram verdes (para os arbustos)
        a = np.asarray(im.convert('RGBA')).astype(np.float32); l = a[..., :3].mean(-1, keepdims=True) / 80.0
        a[..., :3] = np.clip(l * np.array([70, 118, 20]), 0, 255); im = Image.fromarray(a.astype(np.uint8), 'RGBA')
    alpha = im.mode in ('RGBA', 'LA', 'P') and im.convert('RGBA').getextrema()[3][0] < 250
    im = im.convert('RGBA' if alpha else 'RGB'); m = max(im.size)
    if m > 512: im = im.resize((max(1, im.size[0] * 512 // m), max(1, im.size[1] * 512 // m)), Image.LANCZOS)
    bio = io.BytesIO(); (im.save(bio, 'PNG', optimize=True) if alpha else im.save(bio, 'JPEG', quality=82))
    bv = addbuf(np.frombuffer(bio.getvalue(), dtype=np.uint8)); OUT['images'].append({'bufferView': bv, 'mimeType': 'image/png' if alpha else 'image/jpeg'})
    OUT['textures'].append({'source': len(OUT['images']) - 1, 'sampler': 0}); TEXC[key] = (len(OUT['textures']) - 1, alpha); return TEXC[key]
for D, nomes in ESC.items():
    for nm in nomes:
        p = os.path.join(D, nm + '.gltf')
        if not os.path.exists(p): print('falta', nm); continue
        g = json.load(open(p)); bins = [open(os.path.join(D, b['uri']), 'rb').read() for b in g['buffers']]
        nodes = g['nodes']; scene = g['scenes'][g.get('scene', 0)]['nodes']; prims = []
        def walk(i, P):
            n = nodes[i]; L = np.array(n['matrix']).reshape(4, 4).T if 'matrix' in n else qmat(n.get('translation', [0, 0, 0]), n.get('rotation', [0, 0, 0, 1]), n.get('scale', [1, 1, 1]))
            W = P @ L
            if 'mesh' in n:
                for pr in g['meshes'][n['mesh']]['primitives']: prims.append((pr, W))
            for c in n.get('children', []): walk(c, W)
        for r in scene: walk(r, np.eye(4))
        outp = []; allp = []
        for pr, W in prims:
            A = pr['attributes']; P = acc(g, bins, A['POSITION']).astype(np.float32); N = acc(g, bins, A['NORMAL']).astype(np.float32) if 'NORMAL' in A else np.zeros_like(P)
            U = acc(g, bins, A['TEXCOORD_0']).astype(np.float32) if 'TEXCOORD_0' in A else np.zeros((len(P), 2), np.float32)
            I = acc(g, bins, pr['indices']).astype(np.uint32).reshape(-1) if 'indices' in pr else np.arange(len(P), dtype=np.uint32)
            P = (np.c_[P, np.ones(len(P))] @ W.T)[:, :3].astype(np.float32); N3 = W[:3, :3]; N = N @ np.linalg.inv(N3).T if abs(np.linalg.det(N3)) > 1e-9 else N
            N = (N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-6)).astype(np.float32); allp.append(P)
            mt = g['materials'][pr['material']] if 'material' in pr else {}; pbr = mt.get('pbrMetallicRoughness', {})
            m = {'pbrMetallicRoughness': {'baseColorFactor': pbr.get('baseColorFactor', [1, 1, 1, 1]), 'metallicFactor': 0, 'roughnessFactor': pbr.get('roughnessFactor', .8)}, 'name': mt.get('name', '')}
            if 'baseColorTexture' in pbr:
                im = g['images'][g['textures'][pbr['baseColorTexture']['index']]['source']]; ti, al = tex(os.path.join(D, im['uri']), nm.startswith('Bush') and 'TwistedTree' in im['uri'])
                m['pbrMetallicRoughness']['baseColorTexture'] = {'index': ti}
                if al or mt.get('alphaMode') in ('MASK', 'BLEND'): m['alphaMode'] = 'MASK'
            OUT['materials'].append(m)
            outp.append({'attributes': {'POSITION': addacc(P, 'VEC3', 5126, 34962, True), 'NORMAL': addacc(N, 'VEC3', 5126, 34962), 'TEXCOORD_0': addacc(U, 'VEC2', 5126, 34962)},
                         'indices': addacc(I.reshape(-1, 1), 'SCALAR', 5125, 34963), 'material': len(OUT['materials']) - 1})
        OUT['meshes'].append({'name': nm, 'primitives': outp}); OUT['nodes'].append({'name': nm, 'mesh': len(OUT['meshes']) - 1})
        ap = np.concatenate(allp); INFO[nm] = {'h': round(float(ap[:, 1].max()), 2), 'y0': round(float(ap[:, 1].min()), 2), 'r': round(float(np.hypot(ap[:, 0], ap[:, 2]).max()), 2),
                                          'tris': int(sum(len(o['indices']) for o in []) or 0)}
OUT['scenes'] = [{'nodes': list(range(len(OUT['nodes'])))}]; OUT['scene'] = 0; OUT['asset'] = {'version': '2.0'}
while len(blob) % 4: blob += b'\0'
OUT['buffers'] = [{'byteLength': len(blob)}]
js = json.dumps(OUT, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + bytes(blob)
open(sys.argv[1], 'wb').write(glb); json.dump(INFO, open(sys.argv[2], 'w'), indent=0)
print(len(OUT['nodes']), 'modelos', len(glb) // 1024, 'KB', len(OUT['images']), 'texturas')
