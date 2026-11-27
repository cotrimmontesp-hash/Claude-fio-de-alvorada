import bpy, bmesh, math, os
from mathutils import Vector
OUT = r"C:\Users\paulo\Documents\claude-fio-de-alvorada\modelos"
os.makedirs(OUT, exist_ok=True)
# cena nova (nao mexe no que ja estiver aberto)
scn = bpy.data.scenes.new("Nera_tmp")
bpy.context.window.scene = scn
old = bpy.data.scenes.get("Nera_FioDeAlvorada")
if old:
    for o in list(old.collection.objects): bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.scenes.remove(old)
scn.name = "Nera_FioDeAlvorada"
col = scn.collection
def link(o):
    col.objects.link(o); return o
def mat(name, rgb, rough=.6, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    if b:
        b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    m.diffuse_color = (*rgb, 1); return m
def srgb(h):
    return tuple(pow(((h >> s) & 255) / 255, 2.2) for s in (16, 8, 0))
M = {k: mat('Nera_' + k, srgb(v), r) for k, v, r in [
    ('pele', 0xc99a7a, .55), ('cabelo', 0x1c1512, .45), ('casaco', 0x2a4446, .8), ('calca', 0x3b2f26, .85),
    ('bota', 0x2a1e16, .5), ('luva', 0x4a3426, .6), ('couro', 0x5a3b24, .5), ('ombro', 0x8b6b3c, .35), ('olho', 0x15100c, .2)]}
# ---------- corpo com Skin modifier ----------
J = {  # nome: (pos, raio_x, raio_y)
 'hips': ((0, 0, .95), .155, .105), 'waist': ((0, 0, 1.07), .125, .09), 'chest': ((0, 0, 1.27), .16, .1), 'neck': ((0, 0, 1.47), .052, .052), 'headb': ((0, 0, 1.53), .055, .055),
}
for s, n in ((1, 'L'), (-1, 'R')):
    J['sh' + n] = ((s * .17, 0, 1.4), .062, .06); J['el' + n] = ((s * .45, 0, 1.4), .042, .042); J['wr' + n] = ((s * .7, 0, 1.4), .032, .028); J['ha' + n] = ((s * .8, 0, 1.4), .042, .016)
    J['hp' + n] = ((s * .095, 0, .9), .085, .085); J['kn' + n] = ((s * .105, 0, .5), .052, .055); J['an' + n] = ((s * .11, .01, .09), .038, .04); J['to' + n] = ((s * .11, -.13, .035), .04, .03)
E = [('hips', 'waist'), ('waist', 'chest'), ('chest', 'neck'), ('neck', 'headb')]
for n in 'LR':
    E += [('chest', 'sh' + n), ('sh' + n, 'el' + n), ('el' + n, 'wr' + n), ('wr' + n, 'ha' + n), ('hips', 'hp' + n), ('hp' + n, 'kn' + n), ('kn' + n, 'an' + n), ('an' + n, 'to' + n)]
names = list(J.keys()); idx = {n: i for i, n in enumerate(names)}
me = bpy.data.meshes.new('NeraCorpo'); me.from_pydata([J[n][0] for n in names], [(idx[a], idx[b]) for a, b in E], [])
body = link(bpy.data.objects.new('NeraCorpo', me))
sk = body.modifiers.new('Skin', 'SKIN'); sk.use_smooth_shade = True
for i, n in enumerate(names):
    v = me.skin_vertices[0].data[i]; v.radius = (J[n][1], J[n][2]); v.use_root = (n == 'hips')
sub = body.modifiers.new('Sub', 'SUBSURF'); sub.levels = 2; sub.render_levels = 2
bpy.context.view_layer.objects.active = body; body.select_set(True)
bpy.ops.object.modifier_apply(modifier='Skin'); bpy.ops.object.modifier_apply(modifier='Sub')
for k in ['pele', 'casaco', 'calca', 'bota', 'luva']: body.data.materials.append(M[k])
mi = {k: i for i, k in enumerate(['pele', 'casaco', 'calca', 'bota', 'luva'])}
for p in body.data.polygons:
    c = p.center; ax = abs(c.x)
    if c.z < .2: k = 'bota'
    elif c.z < .93 and ax < .25: k = 'calca'
    elif ax > .62: k = 'luva' if ax < .74 else 'pele'
    elif c.z > 1.46: k = 'pele'
    else: k = 'casaco'
    p.material_index = mi[k]
# ---------- cabeça ----------
def sph(name, loc, sc, m, seg=24, ring=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=ring, location=loc)
    o = bpy.context.active_object; o.name = name; o.scale = sc; o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o
head = sph('Cabeca', (0, -.005, 1.635), (.092, .105, .118), M['pele'])
sph('Queixo', (0, -.04, 1.575), (.06, .06, .05), M['pele'])
sph('Nariz', (0, -.105, 1.635), (.014, .022, .025), M['pele'], 12, 8)
for s in (1, -1):
    sph('Olho', (s * .035, -.093, 1.66), (.014, .008, .009), M['olho'], 12, 8)
    sph('Orelha', (s * .092, 0, 1.64), (.012, .022, .03), M['pele'], 12, 8)
sph('Cabelo', (0, .012, 1.67), (.1, .11, .112), M['cabelo'])
sph('Franja', (0, -.06, 1.73), (.085, .05, .04), M['cabelo'])
bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=.03, depth=.3, location=(0, .135, 1.55), rotation=(math.radians(14), 0, 0))
o = bpy.context.active_object; o.name = 'RaboDeCavalo'; o.data.materials.append(M['cabelo']); bpy.ops.object.shade_smooth()
sph('Prendedor', (0, .1, 1.7), (.035, .035, .035), M['couro'], 12, 8)
# ---------- roupa ----------
for s in (1, -1):
    sph('Ombreira', (s * .19, 0, 1.43), (.085, .075, .05), M['ombro'])
bpy.ops.mesh.primitive_torus_add(major_radius=.15, minor_radius=.018, location=(0, 0, .99))
o = bpy.context.active_object; o.name = 'Cinto'; o.scale = (1, .74, 1); o.data.materials.append(M['couro'])
# aba do casaco (saia aberta atrás e dos lados)
bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=.23, radius2=.162, depth=.38, location=(0, .0, .79), end_fill_type='NOTHING')
o = bpy.context.active_object; o.name = 'AbaCasaco'; o.scale = (1, .78, 1); o.data.materials.append(M['casaco'])
bm = bmesh.new(); bm.from_mesh(o.data)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().y < -.06 and abs(f.calc_center_median().x) < .1], context='FACES')
bm.to_mesh(o.data); bm.free()
so = o.modifiers.new('Esp', 'SOLIDIFY'); so.thickness = .012; bpy.ops.object.modifier_apply(modifier='Esp'); bpy.ops.object.shade_smooth()
# punhos e canos de bota
for s in (1, -1):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=.05, depth=.08, location=(s * .62, 0, 1.4), rotation=(0, math.radians(90), 0))
    o = bpy.context.active_object; o.data.materials.append(M['couro']); bpy.ops.object.shade_smooth()
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=.058, depth=.07, location=(s * .107, 0, .3))
    o = bpy.context.active_object; o.data.materials.append(M['couro']); bpy.ops.object.shade_smooth()
# ---------- juntar e exportar ----------
bpy.ops.object.select_all(action='DESELECT')
for o in col.objects:
    if o.type == 'MESH': o.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join(); body.name = 'Nera'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.export_scene.fbx(filepath=os.path.join(OUT, 'nera.fbx'), use_selection=True, object_types={'MESH'}, apply_unit_scale=True, bake_space_transform=True, path_mode='COPY', embed_textures=False)
bpy.ops.wm.obj_export(filepath=os.path.join(OUT, 'nera.obj'), export_selected_objects=True, export_materials=True)
# enquadrar a camera da viewport
for a in bpy.context.window.screen.areas:
    if a.type == 'VIEW_3D':
        for r in a.regions:
            if r.type == 'WINDOW':
                with bpy.context.temp_override(area=a, region=r):
                    bpy.ops.view3d.view_axis(type='FRONT'); bpy.ops.view3d.view_selected()
                a.spaces[0].shading.type = 'MATERIAL'
print('NERA OK', len(body.data.vertices))
