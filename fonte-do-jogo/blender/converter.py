# Converte personagem + animacoes do Mixamo (FBX) em um unico .glb para o jogo
import bpy, os, glob, zipfile, json, traceback
BASE = r"C:\Users\paulo\Documents\claude-fio-de-alvorada\modelos\mixamo"
OUT = r"C:\Users\paulo\Documents\claude-fio-de-alvorada\modelos"
CHAR = "Kachujin G Rosales"      # arquivo do personagem (com skin)
NOME = "nera"
KEEP = ['idle', 'walk', 'run', 'slash', 'attack', 'impact', 'death', 'roll', 'kneel', 'cast', 'power', 'jump']
log = {'erros': [], 'acoes': [], 'arquivos': []}
def L(*a):
    log['erros'].append(' '.join(str(x) for x in a))
try:
    DL = r"C:\Users\paulo\Downloads"
    os.makedirs(BASE, exist_ok=True)
    pack = os.path.join(BASE, 'pack_espada')
    if not os.path.isdir(pack):
        zipfile.ZipFile(os.path.join(DL, 'Pro Sword and Shield Pack (1).zip')).extractall(pack)
    fbxs = [os.path.join(DL, n + '.fbx') for n in ['Kachujin G Rosales', 'Stand To Roll', 'Kneeling', 'Great Sword Jump Attack', 'Standing 1H Cast Spell 01']]
    fbxs += glob.glob(os.path.join(pack, '**', '*.fbx'), recursive=True)
    log['arquivos'] = [os.path.relpath(f, BASE) for f in fbxs]
    charf = [f for f in fbxs if os.path.splitext(os.path.basename(f))[0].lower() == CHAR.lower()]
    if not charf:
        raise Exception('personagem nao encontrado: ' + CHAR)
    charf = charf[0]
    scn = bpy.data.scenes.new('Conv_' + NOME); bpy.context.window.scene = scn
    def importar(path):
        antes = set(bpy.data.objects)
        bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=False, ignore_leaf_bones=True)
        return [o for o in bpy.data.objects if o not in antes]
    objs = importar(charf)
    arm = [o for o in objs if o.type == 'ARMATURE'][0]
    if arm.animation_data and arm.animation_data.action:
        arm.animation_data.action = None
    if not arm.animation_data: arm.animation_data_create()
    acoes = []
    for f in fbxs:
        if f == charf: continue
        stem = os.path.splitext(os.path.basename(f))[0].lower()
        if not any(k in stem for k in KEEP): continue
        try:
            novos = importar(f)
            a = [o for o in novos if o.type == 'ARMATURE']
            if a and a[0].animation_data and a[0].animation_data.action:
                act = a[0].animation_data.action
                nome = stem.replace('sword and shield ', 'ss_').replace(' ', '_').replace('(', '').replace(')', '')
                act.name = nome; act.use_fake_user = True
                acoes.append(act)
                log['acoes'].append({'nome': nome, 'frames': list(act.frame_range)})
            for o in novos: bpy.data.objects.remove(o, do_unlink=True)
        except Exception as e:
            L('falha em', stem, e)
    for act in acoes:
        tr = arm.animation_data.nla_tracks.new(); tr.name = act.name
        st = tr.strips.new(act.name, int(act.frame_range[0]), act)
        try:
            if hasattr(st, 'action_slot') and act.slots: st.action_slot = act.slots[0]
        except Exception as e: L('slot', e)
        tr.mute = True
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    path = os.path.join(OUT, NOME + '.glb')
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='NLA_TRACKS',
              export_force_sampling=True, export_yup=True, export_skins=True, export_materials='EXPORT', export_image_format='JPEG')
    try:
        bpy.ops.export_scene.gltf(**kw)
    except TypeError as e:
        L('gltf args', e); kw.pop('export_image_format', None); bpy.ops.export_scene.gltf(**kw)
    log['glb'] = path; log['tamanho'] = os.path.getsize(path)
except Exception:
    log['erros'].append(traceback.format_exc())
open(os.path.join(OUT, NOME + '_log.json'), 'w', encoding='utf-8').write(json.dumps(log, indent=1, ensure_ascii=False))
print('CONVERSAO', json.dumps(log)[:500])
