# Fio de Alvorada — mapa de Orlavento (Capítulo 1), montado aos poucos para ver ao vivo
import bpy, bmesh, math, random, os
from mathutils import Vector, noise
OUT = r"C:\Users\paulo\Documents\claude-fio-de-alvorada\modelos"
os.makedirs(OUT, exist_ok=True)
random.seed(7)
try: os.remove(os.path.join(OUT, 'orlavento_log.txt'))
except OSError: pass
NOME = 'Orlavento'
open(os.path.join(OUT, 'orlavento_log.txt'), 'a').write('inicio\n')
scn = bpy.context.scene
for o in list(scn.objects): bpy.data.objects.remove(o, do_unlink=True)
for c in list(scn.collection.children): bpy.data.collections.remove(c)
for m in list(bpy.data.meshes):
    if m.users == 0: bpy.data.meshes.remove(m)
scn.name = NOME
col = scn.collection
def GP(x, z, h=0.0): return Vector((x, -z, h))   # coordenadas do jogo -> Blender
def srgb(hx): return tuple(pow(((hx >> s) & 255) / 255, 2.2) for s in (16, 8, 0)) + (1,)
MATS = {}
def mat(nome, hx, rough=.8, metal=0.0, vc=False):
    if nome in MATS: return MATS[nome]
    m = bpy.data.materials.new('OV_' + nome); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = srgb(hx); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if vc:
        a = m.node_tree.nodes.new('ShaderNodeVertexColor'); a.layer_name = 'Col'
        mix = m.node_tree.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 1
        m.node_tree.links.new(a.outputs['Color'], b.inputs['Base Color'])
    m.diffuse_color = srgb(hx); MATS[nome] = m; return m
def link(o, m=None):
    col.objects.link(o)
    if m: o.data.materials.append(m)
    return o
def bevel(o, w=.03, seg=2):
    md = o.modifiers.new('bev', 'BEVEL'); md.width = w; md.segments = seg; md.limit_method = 'ANGLE'
def caixa(nome, x, z, h, w, d, alt, m, ry=0.0, bev=.03, rx=0.0, rz=0.0):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1); me = bpy.data.meshes.new(nome); bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(nome, me), m); o.location = GP(x, z, h); o.scale = (w, d, alt); o.rotation_euler = (rx, rz, -ry)
    if bev and min(w, d, alt) > .5: bevel(o, bev)
    return o
def cil(nome, x, z, h, r, alt, m, v=16, r2=None):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=v, radius1=r, radius2=r if r2 is None else r2, depth=alt)
    me = bpy.data.meshes.new(nome); bm.to_mesh(me); bm.free(); o = link(bpy.data.objects.new(nome, me), m); o.location = GP(x, z, h); return o
RCACHE = {}
def rocha(nome, x, z, h, s, m, seed=0):
    k = int(abs(seed)) % 6
    if k not in RCACHE:
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1)
        for v in bm.verts:
            n = noise.noise(v.co * 1.7 + Vector((k * 3.1, k * .9, 0)))
            v.co *= 1 + .35 * n; v.co.z *= .7
        me = bpy.data.meshes.new('Rocha%d' % k); bm.to_mesh(me); bm.free()
        for p in me.polygons: p.use_smooth = True
        RCACHE[k] = me
    o = bpy.data.objects.new(nome, RCACHE[k]); col.objects.link(o)
    if not RCACHE[k].materials: RCACHE[k].materials.append(m)
    o.material_slots[0].link = 'OBJECT'; o.material_slots[0].material = m
    o.location = GP(x, z, h); o.scale = s; o.rotation_euler.z = seed * 1.3
    return o
TCACHE = {}
def tronco_obj(x, z, h, s, m):
    if 't' not in TCACHE:
        bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=7, radius1=.22, radius2=.14, depth=3.2)
        me = bpy.data.meshes.new('TroncoBase'); bm.to_mesh(me); bm.free(); me.materials.append(m); TCACHE['t'] = me
    o = bpy.data.objects.new('Tronco', TCACHE['t']); col.objects.link(o); o.location = GP(x, z, h); o.scale = (s, s, s); return o
# ---------- áreas andáveis (iguais às do jogo) ----------
WALK = [(-20, 20, 16, -42), (-4, 4, -49, -54.6), (-14, 14, -67.9, -96), (-3.5, 3.5, -95, -101)]
BOSS = (0, -128, 17); CH = (-54.5, -68)
def sst(a, b, x): t = max(0, min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t)
def catmull(P, n=8):
    out = []
    for i in range(len(P) - 1):
        p0, p1, p2, p3 = P[max(i - 1, 0)], P[i], P[i + 1], P[min(i + 2, len(P) - 1)]
        for k in range(n):
            t = k / n; t2, t3 = t * t, t * t * t
            out.append(tuple(.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in range(3)))
    out.append(P[-1]); return out
SX, HS, LARG = 170, 45, 6.0
T_VILA = catmull([(-8, -42, 0), (-22, -46, 0), (-40, -38, 0), (-52, -22, 0), (-62, -36, 0), (-50, -50, 0), (-25, -51, 0), (-4, -51, 0)])
T_RAVINA = catmull([(0, -100, 0), (-15, -104, 0), (-35, -98, 0), (-55, -108, 0), (-50, -128, 0), (-30, -140, 0), (-14, -134, 0)])
PONTOS = [(16, -126, 0), (45, -120, 2), (100, -110, 7), (112, -95, 10), (60, -80, 15), (48, -65, 18), (100, -50, 24), (112, -35, 27),
          (60, -20, 32), (50, -5, 35), (105, 8, 40), (150, 18, 44), (170, 9, 45)]
CAMINHO = catmull(PONTOS)
T_SERRA = [catmull([(170, -9, 45), (188, -22, 46), (206, -13, 48), (223, -30, 49.5), (206, -50, 48), (186, -58, 47), (172, -72, 46), (170, -85, 45)]),
           catmull([(170, -117, 45), (192, -126, 46), (211, -145, 48), (196, -161, 47), (176, -168, 46), (170, -179, 45)]),
           catmull([(171, -216, 45), (195, -228, 47), (215, -245, 49), (201, -262, 47.5), (180, -267, 46), (172, -278, 45)])]
def seg_perto(T, x, z):
    best = (1e9, 0, 0)
    for i in range(len(T) - 1):
        ax, az, ah = T[i]; bx, bz, bh = T[i + 1]; dx, dz = bx - ax, bz - az; L = dx * dx + dz * dz or 1
        t = max(0, min(1, ((x - ax) * dx + (z - az) * dz) / L)); px, pz = ax + dx * t, az + dz * t; d = math.hypot(x - px, z - pz)
        if d < best[0]: best = (d, ah + (bh - ah) * t, i + t)
    return best
def perto_caminho(x, z): return seg_perto(CAMINHO, x, z)
def dist_walk(x, z):  # vila, ravina, arena e as trilhas baixas
    d = 1e9
    for x0, x1, z0, z1 in WALK:
        dx = max(x0 - x, 0, x - x1); dz = max(z1 - z, 0, z - z0); d = min(d, math.hypot(dx, dz))
    d = min(d, max(0, math.hypot(x - BOSS[0], z - BOSS[1]) - BOSS[2]))
    for T in (T_VILA, T_RAVINA): d = min(d, max(0, seg_perto(T, x, z)[0] - LARG / 2))
    return d
def alt_monte(x, z):  # encosta aberta: média das alturas da trilha (sem paredes)
    sw = sh = 0
    for i in range(0, len(CAMINHO) - 1):
        ax, az, ah = CAMINHO[i]; bx, bz, bh = CAMINHO[i + 1]; dx, dz = bx - ax, bz - az; L = dx * dx + dz * dz or 1
        t = max(0, min(1, ((x - ax) * dx + (z - az) * dz) / L)); d = math.hypot(x - ax - dx * t, z - az - dz * t); w = 1 / (d * d + 6)
        sw += w; sh += w * (ah + (bh - ah) * t)
    return sh / sw
def altura(x, z):
    dL = dist_walk(x, z); dM, hp, _ = perto_caminho(x, z)
    if dM <= LARG / 2: return hp - .03
    if dL <= 0: return 0
    n = noise.noise(Vector((x * .045, z * .045, 1.3))) * .5 + .5
    colina = sst(4, 42, dL) * (1.5 + n * 8) + noise.noise(Vector((x * .25, z * .25, 4))) * .3 * sst(1, 6, dL)
    if x > 152 and dM > LARG / 2 + 1: return -70
    if dM > 60: return colina
    monte = alt_monte(x, z) + min(2.2, (dM - LARG / 2) * .22) + noise.noise(Vector((x * .08, z * .08, 2.2))) * 1.2 * sst(3, 10, dM)
    wL, wM = 1 / (dL * dL + 30), 1 / (dM * dM + 30)
    return (wL * colina + wM * monte) / (wL + wM)
ETAPAS = []
def etapa(f): ETAPAS.append(f); return f
HGRID = {}
@etapa
def terreno():
    S = 1.4; X0, X1, Z0, Z1 = -70, 158, 40, -172
    nx, nz = int((X1 - X0) / S), int((Z0 - Z1) / S)
    bm = bmesh.new(); vs = {}; hs = []
    cl = bm.loops.layers.color.new('Col')
    for j in range(nz + 1):
        for i in range(nx + 1):
            x, z = X0 + i * S, Z0 - j * S; y = altura(x, z)
            if CH[1] < z < CH[0] and x < 40: y = -26
            vs[i, j] = bm.verts.new(GP(x, z, y)); hs.append(round(y, 2))
    HGRID.update({'x0': X0, 'z0': Z0, 's': S, 'nx': nx + 1, 'nz': nz + 1, 'h': hs})
    def cor(x, z):
        n1 = noise.noise(Vector((x * .12, z * .12, 7))) * .5 + .5; n2 = noise.noise(Vector((x * .7, z * .7, 9))) * .5 + .5
        grass = (.18 + .1 * n1, .22 + .08 * n1, .06 + .02 * n2); dirt = (.36 + .05 * n2, .27 + .04 * n2, .17)
        trilha = perto_caminho(x, z)[0] <= LARG / 2 or seg_perto(T_VILA, x, z)[0] <= LARG / 2 or seg_perto(T_RAVINA, x, z)[0] <= LARG / 2
        rua = (abs(x + math.sin(z * .12) * .6) < 3.1 and -101 < z < 15 and abs(x) < 4) or math.hypot(x, z + 12) < 7.5
        if trilha or rua: return dirt
        if (-97 < z < -66 and abs(x) < 15) or math.hypot(x - BOSS[0], z - BOSS[1]) < BOSS[2] + 2: return (.3, .26, .2)
        if x > 40 and perto_caminho(x, z)[0] < 9: return (.34 + .06 * n2, .31 + .05 * n2, .26)  # beira de pedra da trilha
        return tuple(a * (.85 + .3 * n2) for a in grass)
    for j in range(nz):
        for i in range(nx):
            za, zb = Z0 - j * S, Z0 - (j + 1) * S; xa = X0 + i * S
            if ((CH[1] < za < CH[0]) or (CH[1] < zb < CH[0])) and xa < 40: continue
            f = bm.faces.new((vs[i, j], vs[i + 1, j], vs[i + 1, j + 1], vs[i, j + 1])); f.smooth = True
            c = cor(X0 + (i + .5) * S, Z0 - (j + .5) * S)
            for l in f.loops: l[cl] = (c[0], c[1], c[2], 1)
    me = bpy.data.meshes.new('Terreno'); bm.to_mesh(me); bm.free()
    link(bpy.data.objects.new('Terreno', me), mat('terra', 0xffffff, .95, vc=True))
def paredao(nome, pts, topo, fundo, normal, m, rug=.9, seed=0):
    """parede de rocha irregular: pts = lista de (x,z) ao longo da borda; desce de topo(x,z) até fundo"""
    bm = bmesh.new(); L = 9; rows = []
    for k, (x, z) in enumerate(pts):
        col_ = []
        for j in range(L + 1):
            t = j / L; y0 = topo(x, z); y = y0 + (fundo - y0) * t
            n = noise.noise(Vector((x * .35 + seed, y * .35, seed * .7)))
            n2 = noise.noise(Vector((x * 1.3, y * 1.3, seed + 3))) * .3
            off = (n + n2) * rug * min(1, t * 4)
            col_.append(bm.verts.new(GP(x + normal[0] * off, z + normal[1] * off, y)))
        rows.append(col_)
    for k in range(len(rows) - 1):
        for j in range(L):
            f = bm.faces.new((rows[k][j], rows[k + 1][j], rows[k + 1][j + 1], rows[k][j + 1])); f.smooth = True
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(nome); bm.to_mesh(me); bm.free(); return link(bpy.data.objects.new(nome, me), m)
@etapa
def fenda():
    m = mat('rocha_escura', 0x4a4038, .9)
    xs = [-70 + k * 1.4 for k in range(79)]
    paredao('ParedeN', [(x, CH[0]) for x in xs], lambda x, z: altura(x, z), -30, (0, -1), m, 1.0, 1)
    paredao('ParedeS', [(x, CH[1]) for x in xs], lambda x, z: altura(x, z), -30, (0, 1), m, 1.0, 5)
    f = mat('fundo', 0x07050a, 1)
    caixa('Fundo', -15, -61.25, -29, 112, 16, 1, f, bev=0)
    nev = mat('nevoa', 0x2a2236, 1); nev.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value = srgb(0x6a4a9a); nev.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = .6
    caixa('Nevoa', -15, -61.25, -18, 112, 14, .05, nev, bev=0)
@etapa
def casas():
    pedra, reboco, madeira, telha, porta, janela = mat('pedra', 0x837a6c, .9), mat('reboco', 0xd2c4a6, .85), mat('madeira', 0x5a3e28, .7), mat('telha', 0x5e3528, .75), mat('porta', 0x3a2618, .6), mat('janela', 0xffb060, .4)
    janela.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value = srgb(0xffa040); janela.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 3
    for k, (x, z) in enumerate([(-10.5, 9), (10.5, 8), (-10.5, -3), (10.5, -4.5), (-11, -24), (10.5, -23), (-10, -35), (11, -34.5), (-16.5, 3), (17, -14)]):
        w, d, h = 5.6 + random.random() * 1.5, 4.6 + random.random() * 1.2, 2.6 + random.random() * .8
        caixa('Base', x, z, h / 2, d, w, h, pedra, bev=.06)
        caixa('Andar', x, z, h + .9, d - .15, w - .15, 1.6, reboco, bev=.02)
        for s in (-1, 1):  # vigas
            for t in (-.48, -.16, .16, .48): caixa('Viga', x + s * (d / 2 - .03), z + t * (w - .5), h + .9, .14, .16, 1.62, madeira, bev=.01)
            caixa('Viga', x + s * (d / 2 - .03), z, h + .15, .16, w, .16, madeira, bev=.01); caixa('Viga', x + s * (d / 2 - .03), z, h + 1.65, .16, w, .16, madeira, bev=.01)
        for s in (-1, 1): caixa('Telhado', x, z + s * (w * .26), h + 2.25, d + 1.0, w * .6, .16, telha, rx=-s * .6, bev=.02)
        caixa('Cumeeira', x, z, h + 2.62, d + 1.0, .26, .22, madeira, bev=.02)
        fx = x - math.copysign(d / 2 + .04, x)
        caixa('Porta', fx, z, 1.05, .1, 1.1, 2.1, porta, bev=.02)
        for t in (-1, 1): caixa('Janela', fx, z + t * w * .3, 1.6, .08, .7, .7, janela, bev=0); caixa('Moldura', fx, z + t * w * .3, 1.6, .1, .82, .82, madeira, bev=.01)
        if random.random() > .4: caixa('Chamine', x + d * .2, z - w * .25, h + 2.6, .6, .6, 1.6, pedra, bev=.04)
@etapa
def praca():
    pedra, madeira, pano = mat('pedra', 0x837a6c), mat('madeira', 0x5a3e28), mat('pano', 0x8a3a2a, .9)
    cil('Poco', 5, -18, .45, .9, .9, pedra, 24); cil('Agua', 5, -18, .92, .72, .04, mat('agua', 0x1a2a30, .1))
    for s in (-1, 1): caixa('Poste', 5 + s * .8, -18, 1.6, .14, .14, 1.5, madeira)
    caixa('Trave', 5, -18, 2.4, 2.2, .3, .14, madeira)
    for x, z, ry in [(-6, -10, .3), (-6.5, -15, -.2), (6.5, -7, .1)]:
        caixa('Banca', x, z, .45, 1.8, 1.0, .9, madeira, ry); caixa('Toldo', x, z, 2.4, 2.2, 1.5, .06, pano, ry, rx=.15)
        for s in (-1, 1): caixa('Poste', x + s * .8, z, 1.2, .1, .1, 2.4, madeira, ry)
    for k in range(16):
        x = math.copysign(6 + random.random() * 2, random.random() - .5); z = 12 - random.random() * 52
        if random.random() < .5: caixa('Caixote', x, z, .3, .6, .6, .6, madeira, random.random() * 3)
        else: cil('Barril', x, z, .45, .32, .9, madeira, 14, .28)
    for z in [12 - k * 9 for k in range(7)]:
        for s in (-1, 1):
            x = s * 4.2; caixa('PosteLume', x, z, 1.4, .18, .18, 2.8, madeira); caixa('Lanterna', x, z, 2.6, .24, .24, .34, mat('janela', 0xffb060))
    for z in [15 - k * 2.2 for k in range(26)]:
        for s in (-1, 1): caixa('Cerca', s * 19.8, z, .5, .12, .12, 1, madeira); caixa('Cerca', s * 19.8, z - 1.1, .75, .06, 2.2, .08, madeira)
    for x, z in [(-6.2, 2.2), (-6.2, -.2)]:
        cil('Boneco', x, z, .8, .07, 1.6, madeira, 8); cil('Palha', x, z, 1.25, .25, .8, mat('palha', 0xb8a060, .95), 12)
@etapa
def arvores():
    tronco, folha, folha2 = mat('tronco', 0x3e2e22, .9), mat('folha', 0x3d4c22, .85), mat('folha2', 0x56592a, .85)
    pos = [(-15, 12), (15, 12), (-14, -16), (15, -30), (-16, -38)]
    while len(pos) < 90:
        x, z = random.uniform(-64, 26), random.uniform(-166, 30)
        if (CH[1] - 2 < z < CH[0] + 2 and x < 42) or dist_walk(x, z) < 1.5 or perto_caminho(x, z)[0] < 5: continue
        if dist_walk(x, z) < 6 and abs(x) < 15 and -97 < z < -66: continue
        pos.append((x, z))
    for k, (x, z) in enumerate(pos):
        s = random.uniform(.8, 1.4); y = altura(x, z)
        tronco_obj(x, z, y + 1.6 * s, s, tronco)
        for q in range(3):
            r = rocha('Copa', x + random.uniform(-.9, .9) * s, z + random.uniform(-.9, .9) * s, y + (3.3 + q * .55) * s, (1.4 * s, 1.4 * s, 1.15 * s), folha if q % 2 else folha2, k * 4 + q)
@etapa
def pedras():
    m = mat('pedra_campo', 0x6e665a, .9)
    for k in range(70):
        x, z = random.uniform(-60, 26), random.uniform(-164, 30)
        if (CH[1] - 1 < z < CH[0] + 1 and x < 42) or dist_walk(x, z) < 2 or perto_caminho(x, z)[0] < 5: continue
        s = random.uniform(.5, 2); rocha('Pedra', x, z, altura(x, z), (s * 1.2, s, s * .7), m, k)
@etapa
def ponte():
    madeira, corda = mat('madeira', 0x5a3e28), mat('corda', 0x8a6a42, .9)
    z = -54.5
    while z > -68:
        if not (-64.1 < z < -58.4): caixa('Tabua', random.uniform(-.05, .05), z - .25, -.06, 3 + random.random() * .3, .44, .12, madeira, random.uniform(-.04, .04), bev=.01)
        z -= .5
    for sx in (-1.6, 1.6):
        for zz in (-54.8, -58.3, -64.2, -67.7): caixa('Poste', sx, zz, .5, .18, .18, 1.4, madeira)
    caixa('PosteCostura', -2.6, -53.6, 1.1, .32, .32, 2.2, mat('pedra', 0x837a6c)); caixa('Lume', -2.6, -53.6, 2.25, .5, .5, .15, mat('ouro', 0xb08a3e, .3, .8))
@etapa
def ravina():
    m = mat('rocha_ravina', 0x7a6a58, .9)
    zs = [-66 - k * 1.0 for k in range(33)]
    for sx in (-1, 1):
        paredao('Penhasco', [(sx * 15.2, z) for z in zs], lambda x, z: altura(x, z) + 7, -1, (-sx, 0), m, 1.1, 9 + sx)
    for x, z in [(-9, -76), (8, -85), (-6, -90), (10, -72), (-12, -94), (12, -80)]: rocha('Pedregulho', x, z, .3, (1.6, 1.4, 1.0), m, int(x * 7))
    for z in range(-97, -111, -3):
        for s_ in (-1, 1): rocha('Trilha', s_ * random.uniform(4.6, 6), z, .5, (1.8, 1.8, 1.3), m, z + s_)
@etapa
def arena():
    m = mat('menir', 0x625c58, .85)
    for k in range(14):
        a = k / 14 * math.tau
        if min(abs(math.atan2(math.sin(a - t), math.cos(a - t))) for t in (-1.95, 1.45)) < .32: continue
        x, z = BOSS[0] + math.sin(a) * (BOSS[2] + 1.2), BOSS[1] + math.cos(a) * (BOSS[2] + 1.2); h = random.uniform(3, 5.5)
        caixa('Menir', x, z, h / 2, 1.2, .8, h, m, a + random.uniform(-.2, .2), bev=.12, rx=random.uniform(-.08, .08))
@etapa
def montanhas():
    m = mat('montanha', 0x5a5a68, .95); n = mat('neve', 0xd8d4d0, .6)
    for k in range(26):
        a = k / 26 * math.tau; r = 150 + random.random() * 60; x, z = math.sin(a) * r, -60 + math.cos(a) * r; h = random.uniform(40, 90)
        if x > -10 and -200 < z < 90: continue  # o lado da trilha da montanha fica livre
        o = cil('Montanha', x, z, h / 2 - 4, random.uniform(30, 55), h, m, 9, 0); o.rotation_euler.z = random.random() * 6
        cil('Neve', x, z, h * .85 - 4, random.uniform(8, 12), h * .3, n, 9, 0)

@etapa
def trilha_detalhes():
    m = mat('pedra_campo', 0x6e665a, .9); madeira = mat('madeira', 0x5a3e28); fogo = mat('janela', 0xffb060)
    tronco, folha = mat('tronco', 0x3e2e22, .9), mat('folha', 0x3d4c22, .85)
    for T, kk in [(T, kk) for T in (CAMINHO, T_VILA, T_RAVINA) for kk in range(0, len(T) - 1, 2)]:
        x, z, h = T[kk]; x2, z2, _ = T[kk + 1]; a = math.atan2(x2 - x, z2 - z); px, pz = math.cos(a), -math.sin(a)
        for sgn in (-1, 1):
            if random.random() < .7: rocha('PedraTrilha', x + px * sgn * (LARG / 2 + .9), z + pz * sgn * (LARG / 2 + .9), altura(x + px * sgn * (LARG / 2 + .9), z + pz * sgn * (LARG / 2 + .9)) + .1, (.8, .7, .5), m, kk * 3 + sgn)
        if kk % 10 == 0:  # tochas pelo caminho
            sx = x + px * (LARG / 2 - .4); sz = z + pz * (LARG / 2 - .4)
            caixa('PosteLume', sx, sz, h + 1, .16, .16, 2, madeira); caixa('Lanterna', sx, sz, h + 2.1, .28, .28, .3, fogo, bev=0)
    for k in range(110):  # árvores pela encosta
        x, z = random.uniform(30, 150), random.uniform(-160, 36); y = altura(x, z)
        if y < -5 or perto_caminho(x, z)[0] < LARG / 2 + 3 or dist_walk(x, z) < 3: continue
        s = random.uniform(.8, 1.3); tronco_obj(x, z, y + 1.6 * s, s, tronco)
        for q in range(3): rocha('Copa', x + random.uniform(-.8, .8) * s, z + random.uniform(-.8, .8) * s, y + (3.3 + q * .55) * s, (1.4 * s, 1.4 * s, 1.15 * s), folha, k * 3 + q)
    pico = mat('montanha', 0x5a5a68, .95); neve = mat('neve', 0xd8d4d0, .6)
    for x, z, r, hh in [(40, -190, 30, 70), (120, -195, 35, 85), (70, 80, 38, 100), (-10, 75, 26, 60)]:  # picos em volta
        cil('Pico', x, z, hh / 2 - 4, r, hh, pico, 9, 0); cil('Neve', x, z, hh * .85 - 4, r * .22, hh * .3, neve, 9, 0)
@etapa
def serra_cristas():
    S = 2.0; X0, X1, Z0, Z1 = 159, 250, 25, -305
    nx, nz = int((X1 - X0) / S), int((Z0 - Z1) / S)
    bm = bmesh.new(); vs = {}; cl = bm.loops.layers.color.new('Col'); info = {}
    for j in range(nz + 1):
        for i in range(nx + 1):
            x, z = X0 + i * S, Z0 - j * S; best, bd = -85, 1e9
            for T in T_SERRA:
                d, h, _ = seg_perto(T, x, z)
                if d < 50: best = max(best, h - .03 - max(0, d - LARG / 2) * 1.35 + (noise.noise(Vector((x * .15, z * .15, 3))) * 1.5 if d > LARG / 2 + 1 else 0)); bd = min(bd, d)
            vs[i, j] = bm.verts.new(GP(x, z, best)); info[i, j] = bd
    for j in range(nz):
        for i in range(nx):
            f = bm.faces.new((vs[i, j], vs[i + 1, j], vs[i + 1, j + 1], vs[i, j + 1])); f.smooth = True
            n2 = noise.noise(Vector(((X0 + i * S) * .5, (Z0 - j * S) * .5, 5))) * .5 + .5; d = info[i, j]
            c = (.37 + .05 * n2, .3 + .04 * n2, .2) if d <= LARG / 2 else (.36 + .07 * n2, .35 + .07 * n2, .37 + .06 * n2) if d < 14 else (.22 + .05 * n2, .23 + .05 * n2, .27)
            for l in f.loops: l[cl] = (c[0], c[1], c[2], 1)
    me = bpy.data.meshes.new('Cristas'); bm.to_mesh(me); bm.free()
    link(bpy.data.objects.new('Cristas', me), mat('terra', 0xffffff, .95, vc=True))
    # rochas enormes nas curvas: escondem a próxima parte até você chegar perto
    m = mat('rocha_escura', 0x4a4038, .9); madeira = mat('madeira', 0x5a3e28); fogo = mat('janela', 0xffb060)
    for n, T in enumerate(T_SERRA):
        L = len(T)
        for q, fr in enumerate((.3, .55, .8)):
            k = int(L * fr); x, z, h = T[k]; x2, z2, _ = T[min(k + 1, L - 1)]; a = math.atan2(x2 - x, z2 - z); px, pz = math.cos(a), -math.sin(a); sg = 1 if q % 2 else -1
            rocha('Agulha', x + px * sg * 7.5, z + pz * sg * 7.5, h - 4, (5, 4.5, 13), m, n * 7 + q)
        for k in range(0, L - 1, 6):
            x, z, h = T[k]; x2, z2, _ = T[k + 1]; a = math.atan2(x2 - x, z2 - z); px, pz = math.cos(a), -math.sin(a)
            sx = x + px * (LARG / 2 - .4); sz = z + pz * (LARG / 2 - .4)
            caixa('PosteLume', sx, sz, h + 1, .16, .16, 2, madeira); caixa('Lanterna', sx, sz, h + 2.1, .28, .28, .3, fogo, bev=0)
@etapa
def exportar():
    import json
    meshes, objs = {}, []
    def r3(v): return [round(v[0], 3), round(v[2], 3), round(-v[1], 3)]   # Blender -> jogo (x, y, z)
    for o in col.objects:
        if o.type != 'MESH': continue
        me = o.data
        if me.name not in meshes:
            me.calc_loop_triangles()
            p = []
            for v in me.vertices: p += r3(v.co)
            idx = []
            for t in me.loop_triangles: idx += [t.vertices[0], t.vertices[1], t.vertices[2]]
            d = {'p': p, 'i': idx, 'liso': any(pl.use_smooth for pl in me.polygons[:4])}
            ca = me.color_attributes.get('Col') if hasattr(me, 'color_attributes') else None
            if ca:
                cs = [[0, 0, 0, 0] for _ in me.vertices]
                for l in me.loops:
                    c = ca.data[l.index].color; q = cs[l.vertex_index]; q[0] += c[0]; q[1] += c[1]; q[2] += c[2]; q[3] += 1
                d['c'] = [round(q[k] / max(q[3], 1), 3) for q in cs for k in range(3)]
            meshes[me.name] = d
        m = o.material_slots[0].material if o.material_slots else None
        cor = [round(x, 3) for x in m.diffuse_color[:3]] if m else [.5, .5, .5]
        emis = 1 if (m and m.name.startswith('OV_janela')) else 0
        mw = o.matrix_world
        # matriz 3x4 convertida para o eixo do jogo
        R = [[mw[0][0], mw[0][2], -mw[0][1], mw[0][3]], [mw[2][0], mw[2][2], -mw[2][1], mw[2][3]], [-mw[1][0], -mw[1][2], mw[1][1], -mw[1][3]]]
        objs.append([me.name, [round(x, 4) for row in R for x in row], cor, emis])
    p = os.path.join(OUT, 'orlavento.json')
    with open(p, 'w') as f: json.dump({'malhas': meshes, 'objetos': objs, 'caminho': {'pts': [[round(a, 2), round(b, 2), round(c, 2)] for a, b, c in CAMINHO], 'larg': LARG, 'sx': SX, 'hs': HS}, 'alturas': HGRID}, f, separators=(',', ':'))
    open(os.path.join(OUT, 'orlavento_log.txt'), 'a').write('EXPORTADO %d objetos, %d malhas, %d bytes\n' % (len(objs), len(meshes), os.path.getsize(p)))
# ---------- câmera da vista para acompanhar ----------
import mathutils
WIN = bpy.context.window_manager.windows[0]
def vista(alvo, dist, alt):
    for a in WIN.screen.areas:
        if a.type == 'VIEW_3D':
            sp = a.spaces[0]; sp.shading.type = 'SOLID'; sp.shading.color_type = 'MATERIAL'; r3 = sp.region_3d
            r3.view_location = alvo; r3.view_distance = dist; r3.view_rotation = mathutils.Euler((math.radians(alt), 0, math.radians(20)), 'XYZ').to_quaternion()
VISTAS = {12: (GP(95, -55), 230, 50), 0: (GP(0, -50), 150, 55), 2: (GP(0, -10), 45, 60), 3: (GP(0, -12), 35, 62), 4: (GP(0, -30), 90, 58), 6: (GP(0, -60), 30, 62), 7: (GP(0, -85), 50, 58), 8: (GP(0, -128), 45, 55), 9: (GP(0, -60), 260, 70)}
d = bpy.data.lights.new('Sol', 'SUN'); d.energy = 3.5; d.color = (1, .93, .82); d.angle = .05
o = bpy.data.objects.new('Sol', d); col.objects.link(o); o.rotation_euler = (math.radians(50), math.radians(10), math.radians(35))
w = scn.world or bpy.data.worlds.new('Ceu'); scn.world = w; w.use_nodes = True
bg = w.node_tree.nodes.get('Background')
if bg: bg.inputs['Color'].default_value = (.45, .55, .75, 1); bg.inputs['Strength'].default_value = .8
LOG = os.path.join(OUT, 'orlavento_log.txt')
for i, f in enumerate(ETAPAS):
    try:
        if i in VISTAS: vista(*VISTAS[i])
        f(); scn.view_layers[0].update()
        open(LOG, 'a').write('etapa %s ok (%d objetos)\n' % (f.__name__, len(col.objects)))
    except Exception as e:
        import traceback; open(LOG, 'a').write('ERRO %s: %s\n' % (f.__name__, traceback.format_exc()))
    try: bpy.ops.wm.redraw_timer(type='DRAW_WIN_SWAP', iterations=1)
    except Exception: pass
