"""Conversor FBX (binario, Mixamo) -> GLB enxuto para o jogo. Sem Blender.
Uso:
  personagem: python3 fbx2glb.py char ENTRADA.fbx SAIDA.glb [tamanho_textura]
  animacoes:  python3 fbx2glb.py anims SAIDA.glb nome1=arq1.fbx nome2=arq2.fbx ...
"""
import struct, zlib, sys, io, json, math
import numpy as np
from PIL import Image

# ---------------- leitor de FBX binario ----------------
def read_fbx(path):
    b = open(path, 'rb').read()
    assert b[:20] == b'Kaydara FBX Binary  ', 'nao e FBX binario'
    ver = struct.unpack('<I', b[23:27])[0]; big = ver >= 7500
    def prop(o):
        t = chr(b[o]); o += 1
        if t == 'Y': return struct.unpack('<h', b[o:o + 2])[0], o + 2
        if t == 'C': return b[o] != 0, o + 1
        if t == 'I': return struct.unpack('<i', b[o:o + 4])[0], o + 4
        if t == 'F': return struct.unpack('<f', b[o:o + 4])[0], o + 4
        if t == 'D': return struct.unpack('<d', b[o:o + 8])[0], o + 8
        if t == 'L': return struct.unpack('<q', b[o:o + 8])[0], o + 8
        if t in 'fdlib':
            n, enc, cl = struct.unpack('<III', b[o:o + 12]); o += 12; raw = b[o:o + cl]; o += cl
            if enc: raw = zlib.decompress(raw)
            dt = {'f': '<f4', 'd': '<f8', 'l': '<i8', 'i': '<i4', 'b': 'u1'}[t]
            return np.frombuffer(raw, dtype=dt, count=n), o
        if t in 'SR':
            n = struct.unpack('<I', b[o:o + 4])[0]; o += 4; v = b[o:o + n]; o += n
            return (v.decode('utf-8', 'replace') if t == 'S' else v), o
        raise ValueError('tipo ' + t)
    def node(o):
        if big: end, np_, pl = struct.unpack('<QQQ', b[o:o + 24]); o += 24
        else: end, np_, pl = struct.unpack('<III', b[o:o + 12]); o += 12
        if end == 0: return None, o
        nl = b[o]; o += 1; name = b[o:o + nl].decode(); o += nl
        props = []
        for _ in range(np_):
            v, o = prop(o); props.append(v)
        ch = []
        null = 25 if big else 13
        while o < end - null or (o < end and o + null <= end and any(b[o:o + null])):
            c, o2 = node(o)
            if c is None: o = o2; break
            ch.append(c); o = o2
        return {'n': name, 'p': props, 'c': ch}, end
    o = 27; top = []
    while o < len(b) - 200:
        nd, o2 = node(o)
        if nd is None: break
        top.append(nd); o = o2
    return top
def child(nd, name):
    for c in nd['c']:
        if c['n'] == name: return c
    return None
def props70(nd):
    p = child(nd, 'Properties70'); out = {}
    if p:
        for c in p['c']: out[c['p'][0]] = c['p'][4:]
    return out

# ---------------- matematica ----------------
def euler_xyz(deg):  # FBX eEulerXYZ: R = Rz * Ry * Rx
    x, y, z = [math.radians(v) for v in deg]
    cx, sx, cy, sy, cz, sz = math.cos(x), math.sin(x), math.cos(y), math.sin(y), math.cos(z), math.sin(z)
    Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]]); Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]]); Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return Rz @ Ry @ Rx
def m2q(m):
    t = m[0, 0] + m[1, 1] + m[2, 2]
    if t > 0: s = math.sqrt(t + 1) * 2; return [(m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s, .25 * s]
    if m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]: s = math.sqrt(1 + m[0, 0] - m[1, 1] - m[2, 2]) * 2; return [.25 * s, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s, (m[2, 1] - m[1, 2]) / s]
    if m[1, 1] > m[2, 2]: s = math.sqrt(1 + m[1, 1] - m[0, 0] - m[2, 2]) * 2; return [(m[0, 1] + m[1, 0]) / s, .25 * s, (m[1, 2] + m[2, 1]) / s, (m[0, 2] - m[2, 0]) / s]
    s = math.sqrt(1 + m[2, 2] - m[0, 0] - m[1, 1]) * 2; return [(m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, .25 * s, (m[1, 0] - m[0, 1]) / s]
def local_rot(pp, rot):
    R = euler_xyz(rot)
    if 'PreRotation' in pp: R = euler_xyz(pp['PreRotation']) @ R
    if 'PostRotation' in pp: R = R @ euler_xyz(pp['PostRotation']).T
    return R

# ---------------- cena ----------------
class Scene:
    def __init__(self, path):
        top = read_fbx(path); self.top = top
        objs = [n for n in top if n['n'] == 'Objects'][0]
        self.obj = {}
        for o in objs['c']: self.obj[o['p'][0]] = o
        con = [n for n in top if n['n'] == 'Connections'][0]
        self.ch = {}; self.par = {}; self.op = {}
        for c in con['c']:
            k, a, bb = c['p'][0], c['p'][1], c['p'][2]
            self.ch.setdefault(bb, []).append(a); self.par.setdefault(a, []).append(bb)
            if k == 'OP': self.op[(a, bb)] = c['p'][3]
        self.models = {i: o for i, o in self.obj.items() if o['n'] == 'Model'}
        self.bones = {i: o for i, o in self.models.items() if o['p'][2] in ('LimbNode', 'Root', 'Null') and 'mixamorig' in o['p'][1]}
    def name(self, i): return self.obj[i]['p'][1].split('\x00')[0]
    def model_parent(self, i):
        for p in self.par.get(i, []):
            if p in self.models: return p
        return None

def bone_tree(sc):
    ids = list(sc.bones.keys()); par = {i: sc.model_parent(i) for i in ids}
    par = {i: (p if p in sc.bones else None) for i, p in par.items()}
    order = []
    def visit(i):
        order.append(i)
        for c in sc.ch.get(i, []):
            if c in sc.bones and par.get(c) == i: visit(c)
    for i in ids:
        if par[i] is None: visit(i)
    return order, par

# ---------------- escrita GLB ----------------
class GLB:
    def __init__(self): self.g = {'asset': {'version': '2.0', 'generator': 'fio-fbx2glb'}, 'buffers': [], 'bufferViews': [], 'accessors': []}; self.bin = bytearray()
    def view(self, data):
        while len(self.bin) % 4: self.bin.append(0)
        self.g['bufferViews'].append({'buffer': 0, 'byteOffset': len(self.bin), 'byteLength': len(data)}); self.bin.extend(data); return len(self.g['bufferViews']) - 1
    def acc(self, arr, typ, comp=5126, mm=False):
        arr = np.ascontiguousarray(arr); a = {'bufferView': self.view(arr.tobytes()), 'componentType': comp, 'count': int(arr.shape[0]), 'type': typ}
        if mm: a['min'] = arr.min(0).tolist() if arr.ndim > 1 else [float(arr.min())]; a['max'] = arr.max(0).tolist() if arr.ndim > 1 else [float(arr.max())]
        self.g['accessors'].append(a); return len(self.g['accessors']) - 1
    def save(self, path):
        while len(self.bin) % 4: self.bin.append(0)
        self.g['buffers'] = [{'byteLength': len(self.bin)}]
        js = json.dumps(self.g, separators=(',', ':')).encode()
        while len(js) % 4: js += b' '
        out = struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(self.bin)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(self.bin), 0x004E4942) + bytes(self.bin)
        open(path, 'wb').write(out); return len(out)

def add_skeleton(glb, sc):
    order, par = bone_tree(sc); idx = {b: k + 1 for k, b in enumerate(order)}  # no 0 = raiz
    nodes = [{'name': 'Raiz', 'children': []}]
    for b in order:
        pp = props70(sc.bones[b]); t = pp.get('Lcl Translation', [0, 0, 0]); r = pp.get('Lcl Rotation', [0, 0, 0]); s = pp.get('Lcl Scaling', [1, 1, 1])
        q = m2q(local_rot(pp, r))
        nodes.append({'name': sc.name(b).replace('Model::', ''), 'translation': [float(v) for v in t], 'rotation': [float(v) for v in q], 'scale': [float(v) for v in s], 'children': []})
    for b in order:
        if par[b] is None: nodes[0]['children'].append(idx[b])
        else: nodes[idx[par[b]]]['children'].append(idx[b])
    for n in nodes:
        if not n['children']: del n['children']
    glb.g['nodes'] = nodes; glb.g['scenes'] = [{'nodes': [0]}]; glb.g['scene'] = 0
    return order, idx

def tex_bytes(sc, mat_id, maxs):
    cand = [t for t in sc.ch.get(mat_id, []) if sc.obj.get(t, {}).get('n') == 'Texture']
    cand = [t for t in cand if 'diffuse' in sc.op.get((t, mat_id), 'DiffuseColor').lower()] or [t for t in cand if 'transparent' in sc.op.get((t, mat_id), '').lower()]
    for t in cand:
        for v in sc.ch.get(t, []):
            vo = sc.obj.get(v)
            if vo and vo['n'] == 'Video':
                c = child(vo, 'Content')
                if not (c and c['p'] and isinstance(c['p'][0], (bytes, bytearray)) and len(c['p'][0]) > 100):  # imagem guardada uma vez só: procura outro vídeo com o mesmo arquivo
                    fn = child(vo, 'RelativeFilename') or child(vo, 'Filename'); fn = fn['p'][0] if fn and fn['p'] else None
                    for oid2, o2 in sc.obj.items():
                        if o2.get('n') != 'Video' or o2 is vo: continue
                        f2 = child(o2, 'RelativeFilename') or child(o2, 'Filename'); f2 = f2['p'][0] if f2 and f2['p'] else None
                        c2 = child(o2, 'Content')
                        if fn and f2 == fn and c2 and c2['p'] and isinstance(c2['p'][0], (bytes, bytearray)) and len(c2['p'][0]) > 100: c = c2; break
                if c and c['p'] and isinstance(c['p'][0], (bytes, bytearray)) and len(c['p'][0]) > 100:
                    try:
                        im = Image.open(io.BytesIO(c['p'][0])); im.load(); im.thumbnail((maxs, maxs)); o2 = io.BytesIO()
                        if 'A' in im.getbands() and np.asarray(im.getchannel('A')).min() < 250: im.save(o2, 'PNG', optimize=True); return o2.getvalue(), 'image/png', True
                        im.convert('RGB').save(o2, 'JPEG', quality=85); return o2.getvalue(), 'image/jpeg', False
                    except Exception as e: print('textura falhou', e)
    return None

def convert_char(inp, out, maxs=1024):
    sc = Scene(inp); glb = GLB(); order, idx = add_skeleton(glb, sc)
    bid = {b: k for k, b in enumerate(order)}
    meshes = []; mats = []; imgs = []; texs = []; matmap = {}
    joints = [idx[b] for b in order]; ibm = np.tile(np.eye(4), (len(order), 1, 1))
    for mid, m in sc.models.items():
        if m['p'][2] != 'Mesh': continue
        geo = [c for c in sc.ch.get(mid, []) if sc.obj.get(c, {}).get('n') == 'Geometry']
        if not geo: continue
        g = sc.obj[geo[0]]; V = child(g, 'Vertices')['p'][0].reshape(-1, 3); PVI = child(g, 'PolygonVertexIndex')['p'][0]
        # skin
        W = np.zeros((len(V), 4)); J = np.zeros((len(V), 4), dtype=np.uint16); cnt = np.zeros(len(V), dtype=int); xf = None
        for d in sc.ch.get(geo[0], []):
            if sc.obj.get(d, {}).get('n') != 'Deformer': continue
            for cl in sc.ch.get(d, []):
                co = sc.obj.get(cl)
                if not co or co['n'] != 'Deformer': continue
                bone = [b for b in sc.ch.get(cl, []) if b in sc.bones]
                ixn, wn = child(co, 'Indexes'), child(co, 'Weights')
                if not bone: continue
                b = bone[0]; TL = child(co, 'TransformLink')['p'][0].reshape(4, 4).T; T = child(co, 'Transform')['p'][0].reshape(4, 4).T
                G = TL @ T; ibm[bid[b]] = np.linalg.inv(TL) @ G; xf = G
                if ixn is None: continue
                for vi, w in zip(ixn['p'][0], wn['p'][0]):
                    k = cnt[vi]
                    if k < 4: J[vi, k] = bid[b]; W[vi, k] = w; cnt[vi] += 1
                    else:
                        mk = W[vi].argmin()
                        if w > W[vi, mk]: J[vi, mk] = bid[b]; W[vi, mk] = w
        s = W.sum(1, keepdims=True); s[s == 0] = 1; W = W / s
        # poligonos -> triangulos por vertice-de-poligono
        polys = []; cur = []
        for k, v in enumerate(PVI):
            if v < 0: cur.append((k, -v - 1)); polys.append(cur); cur = []
            else: cur.append((k, v))
        def layer(name, key, ikey):
            L = child(g, name)
            if not L: return None
            data = child(L, key)['p'][0]; mp = child(L, 'MappingInformationType')['p'][0]; rf = child(L, 'ReferenceInformationType')['p'][0]
            ind = child(L, ikey)['p'][0] if child(L, ikey) else None
            return data, mp, rf, ind
        NL = layer('LayerElementNormal', 'Normals', 'NormalsIndex'); UL = layer('LayerElementUV', 'UV', 'UVIndex'); ML = child(g, 'LayerElementMaterial')
        nd = NL[0].reshape(-1, 3) if NL else None; ud = UL[0].reshape(-1, 2) if UL else None
        def get(L, d, pvk, cp):
            if L is None: return None
            mp, rf, ind = L[1], L[2], L[3]
            k = pvk if mp == 'ByPolygonVertex' else cp
            if rf == 'IndexToDirect': k = ind[k]
            return d[k]
        mati = child(ML, 'Materials')['p'][0] if ML else None; allsame = ML and child(ML, 'MappingInformationType')['p'][0] == 'AllSame'
        mesh_mats = [c for c in sc.ch.get(mid, []) if sc.obj.get(c, {}).get('n') == 'Material']
        groups = {}
        for pi, poly in enumerate(polys):
            mm = 0 if mati is None else int(mati[0] if allsame else mati[pi])
            gl = groups.setdefault(mm, [])
            for t in range(1, len(poly) - 1):
                for (pvk, cp) in (poly[0], poly[t], poly[t + 1]): gl.append((pvk, cp))
        Mmesh = xf if xf is not None else np.eye(4)
        prims = []
        for mm, lst in groups.items():
            cps = np.array([c for _, c in lst]); pvs = np.array([p for p, _ in lst])
            P = V[cps]; P = (np.c_[P, np.ones(len(P))] @ Mmesh.T)[:, :3]
            N = np.array([get(NL, nd, p, c) for p, c in lst]) if NL else np.tile([0, 1, 0], (len(lst), 1))
            N = N @ Mmesh[:3, :3].T; N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-9
            UV = np.array([get(UL, ud, p, c) for p, c in lst]) if UL else np.zeros((len(lst), 2)); UV[:, 1] = 1 - UV[:, 1]
            # junta vertices identicos
            key = np.round(np.c_[cps, N * 1000, UV * 10000]).astype(np.int64)
            uk, inv = np.unique(key, axis=0, return_inverse=True); inv = inv.reshape(-1)
            first = np.zeros(len(uk), dtype=int); first[inv[::-1]] = np.arange(len(inv))[::-1]
            attrs = {'POSITION': glb.acc(P[first].astype('f4'), 'VEC3', mm=True), 'NORMAL': glb.acc(N[first].astype('f4'), 'VEC3'), 'TEXCOORD_0': glb.acc(UV[first].astype('f4'), 'VEC2'),
                     'JOINTS_0': glb.acc(J[cps[first]].astype('u2'), 'VEC4', 5123), 'WEIGHTS_0': glb.acc(W[cps[first]].astype('f4'), 'VEC4')}
            prim = {'attributes': attrs, 'indices': glb.acc(inv.astype('u4'), 'SCALAR', 5125)}
            if mm < len(mesh_mats):
                mat_id = mesh_mats[mm]
                if mat_id not in matmap:
                    pp = props70(sc.obj[mat_id]); dc = pp.get('DiffuseColor', [.8, .8, .8])
                    mt = {'name': sc.name(mat_id), 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'roughnessFactor': .7}}
                    tb = tex_bytes(sc, mat_id, maxs)
                    if tb:
                        imgs.append({'bufferView': glb.view(tb[0]), 'mimeType': tb[1]}); texs.append({'source': len(imgs) - 1, 'sampler': 0})
                        mt['pbrMetallicRoughness']['baseColorTexture'] = {'index': len(texs) - 1}
                        if tb[2]: mt['alphaMode'] = 'MASK'
                    else: mt['pbrMetallicRoughness']['baseColorFactor'] = [float(dc[0]), float(dc[1]), float(dc[2]), 1]
                    mats.append(mt); matmap[mat_id] = len(mats) - 1
                prim['material'] = matmap[mat_id]
            prims.append(prim)
        meshes.append({'name': sc.name(mid), 'primitives': prims})
    glb.g['meshes'] = meshes; glb.g['materials'] = mats; glb.g['images'] = imgs; glb.g['textures'] = texs; glb.g['samplers'] = [{}]
    ia = glb.acc(np.array([m.T.reshape(-1) for m in ibm]).astype('f4'), 'MAT4')
    glb.g['skins'] = [{'joints': joints, 'inverseBindMatrices': ia}]
    for k in range(len(meshes)):
        glb.g['nodes'].append({'name': meshes[k]['name'], 'mesh': k, 'skin': 0}); glb.g['scenes'][0]['nodes'].append(len(glb.g['nodes']) - 1)
    n = glb.save(out); print('personagem', out, n, 'bytes', len(order), 'ossos', sum(len(m['primitives']) for m in meshes), 'partes', len(imgs), 'texturas')

def anim_tracks(path, fps=30):
    sc = Scene(path); order, par = bone_tree(sc)
    KT = 46186158000
    tracks = {}; tmax = 0
    for b in order:
        pp = props70(sc.bones[b]); base = {'T': list(pp.get('Lcl Translation', [0, 0, 0])), 'R': list(pp.get('Lcl Rotation', [0, 0, 0]))}
        curves = {}
        for cn in sc.ch.get(b, []):
            o = sc.obj.get(cn)
            if not o or o['n'] != 'AnimationCurveNode': continue
            prop = sc.op.get((cn, b), '')
            kind = 'T' if 'Translation' in prop else 'R' if 'Rotation' in prop else None
            if not kind: continue
            for cv in sc.ch.get(cn, []):
                co = sc.obj.get(cv)
                if not co or co['n'] != 'AnimationCurve': continue
                ax = {'d|X': 0, 'd|Y': 1, 'd|Z': 2}.get(sc.op.get((cv, cn), ''), None)
                if ax is None: continue
                t = child(co, 'KeyTime')['p'][0].astype(np.float64) / KT; v = child(co, 'KeyValueFloat')['p'][0].astype(np.float64)
                curves[(kind, ax)] = (t, v); tmax = max(tmax, t.max() if len(t) else 0)
        tracks[sc.name(b).replace('Model::', '')] = (pp, base, curves)
    nf = max(2, int(round(tmax * fps)) + 1); ts = np.arange(nf) / fps
    out = {}
    for name, (pp, base, curves) in tracks.items():
        def samp(kind, ax):
            if (kind, ax) in curves: t, v = curves[(kind, ax)]; return np.interp(ts, t, v)
            return np.full(nf, base[kind][ax])
        rx, ry, rz = samp('R', 0), samp('R', 1), samp('R', 2)
        q = np.array([m2q(local_rot(pp, (rx[k], ry[k], rz[k]))) for k in range(nf)])
        for k in range(1, nf):
            if np.dot(q[k], q[k - 1]) < 0: q[k] = -q[k]
        T = np.c_[samp('T', 0), samp('T', 1), samp('T', 2)] if name.endswith('Hips') else None
        out[name] = (q, T)
    return ts, out

def convert_anims(out, pairs, skel_from):
    sc = Scene(skel_from); glb = GLB(); order, idx = add_skeleton(glb, sc)
    names = {glb.g['nodes'][k]['name']: k for k in range(len(glb.g['nodes']))}
    anims = []
    for nm, path in pairs:
        ts, tr = anim_tracks(path); ti = glb.acc(ts.astype('f4'), 'SCALAR', mm=True); ch = []; sm = []
        for bn, (q, T) in tr.items():
            if bn not in names: continue
            sm.append({'input': ti, 'output': glb.acc(q.astype('f4'), 'VEC4')}); ch.append({'sampler': len(sm) - 1, 'target': {'node': names[bn], 'path': 'rotation'}})
            if T is not None: sm.append({'input': ti, 'output': glb.acc(T.astype('f4'), 'VEC3')}); ch.append({'sampler': len(sm) - 1, 'target': {'node': names[bn], 'path': 'translation'}})
        anims.append({'name': nm, 'channels': ch, 'samplers': sm}); print('anim', nm, '%.2fs' % ts[-1])
    glb.g['animations'] = anims
    print('animacoes', out, glb.save(out))

if __name__ == '__main__':
    if sys.argv[1] == 'char': convert_char(sys.argv[2], sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 1024)
    else: convert_anims(sys.argv[2], [a.split('=', 1) for a in sys.argv[4:]], sys.argv[3])
