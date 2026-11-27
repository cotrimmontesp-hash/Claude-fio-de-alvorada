# Converte os personagens do Mixamo (FBX com skin) em .glb sem animacoes
import bpy, os, json, traceback
DL = r"C:\Users\paulo\Downloads"
OUT = r"C:\Users\paulo\Documents\claude-fio-de-alvorada\modelos"
LISTA = {'lira': 'Erika Archer', 'iaro': 'Paladin J Nordstrom', 'ruan': 'castle_guard_01', 'mireia': 'Medea By M. Arrebola',
         'oren': 'Heraklios By A. Dizon', 'orven': 'Dreyar By M.Aure', 'brena': 'Peasant Girl', 'aldeao': 'Peasant Man',
         'tecelao': 'Ganfaul M Aure', 'fieira': 'Vampire A Lusth'}
log = {}
for k, nome in LISTA.items():
    try:
        scn = bpy.data.scenes.new('Conv_' + k); bpy.context.window.scene = scn
        antes = set(bpy.data.objects)
        bpy.ops.import_scene.fbx(filepath=os.path.join(DL, nome + '.fbx'), automatic_bone_orientation=False, ignore_leaf_bones=True)
        novos = [o for o in bpy.data.objects if o not in antes]
        for o in novos:
            if o.type == 'ARMATURE' and o.animation_data: o.animation_data.action = None
        bpy.ops.object.select_all(action='DESELECT')
        for o in novos: o.select_set(True)
        bpy.context.view_layer.objects.active = [o for o in novos if o.type == 'ARMATURE'][0]
        p = os.path.join(OUT, k + '.glb')
        bpy.ops.export_scene.gltf(filepath=p, export_format='GLB', use_selection=True, export_animations=False, export_skins=True, export_yup=True, export_materials='EXPORT', export_image_format='AUTO')
        log[k] = os.path.getsize(p)
        for o in novos: bpy.data.objects.remove(o, do_unlink=True)
    except Exception:
        log[k] = traceback.format_exc()
open(os.path.join(OUT, 'personagens_log.json'), 'w', encoding='utf-8').write(json.dumps(log, indent=1))
print('PERSONAGENS', log)
