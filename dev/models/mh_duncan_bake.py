# (exec'd from mh_duncan.py) — weights, material groups, UVs, baked PBR maps, export.
import time
T0 = time.time()
def log(*a): print(f'[{time.time() - T0:6.1f}s]', *a, flush=True)

# ------------------------------------------------------------------ rig joints (game coords)
backZ0 = min(p.z for p in section(ySh - .1))
J = {'hips': (Lg['hips'], None), 'spine': (Lg['spine'], 'hips'), 'head': (Lg['neck'], 'spine'),
     'shR': (Lg['shR'], 'spine'), 'elR': (Lg['elR'], 'shR'), 'handR': (Lg['handR'], 'elR'),
     'shL': (Lg['shL'], 'spine'), 'elL': (Lg['elL'], 'shL'), 'handL': (Lg['handL'], 'elL'),
     'hipR': (Lg['hipR'], 'hips'), 'kneeR': (Lg['kneeR'], 'hipR'), 'ankR': (Lg['ankR'], 'kneeR'),
     'hipL': (Lg['hipL'], 'hips'), 'kneeL': (Lg['kneeL'], 'hipL'), 'ankL': (Lg['ankL'], 'kneeL'),
     'capeA': (Vector((0, CAPE_TOP - .03, backZ0 - .06)), 'spine'), 'capeB': (Vector((0, CAPE_TOP - CAPE_LEN * .36, backZ0 - .12)), 'capeA'),
     'capeC': (Vector((0, CAPE_TOP - CAPE_LEN * .7, backZ0 - .16)), 'capeB')}
BONES = GAME_BONES

def set_weights(o, fn):
    for vg in list(o.vertex_groups): o.vertex_groups.remove(vg)
    vgs = {b: o.vertex_groups.new(name='g_' + b) for b in BONES}
    for v in o.data.vertices:
        d = fn(GV(v.co))
        tot = sum(d.values()) or 1
        for b, w in d.items():
            if w / tot > .01: vgs[b].add([v.index], w / tot, 'REPLACE')
def near_body(p, k=4):
    acc = {}; hits = KD.find_n(p, k); tw = 0
    for _, i, dist in hits:
        w = 1 / (dist + .004); tw += w
        for b, x in BW[i].items(): acc[b] = acc.get(b, 0) + x * w
    return {b: x / tw for b, x in acc.items()}
def cape_w(p):
    t = (CAPE_TOP - p.y) / CAPE_LEN
    if t < .08: return {'spine': 1 - t / .08, 'capeA': t / .08}
    k = [('capeA', 0, .36), ('capeB', .36, .7), ('capeC', .7, 1.2)]
    out = {}
    for b, a0, a1 in k:
        c = (a0 + a1) / 2; out[b] = max(0, 1 - abs(t - c) / ((a1 - a0) * .75))
    return out or {'capeC': 1}

for o in plates + straps + metals + soles + [boots, scarf]:
    if o is None: continue
    if o.name.startswith(('Scabbard', 'Throat', 'Chape')): set_weights(o, lambda p: {'spine': 1})
    else: set_weights(o, near_body)
set_weights(hair, lambda p: {'head': 1} if p.y > Lg['neck'].y + .02 else {'head': .7, 'spine': .3})
set_weights(cape, cape_w)
log('weights done')

# ------------------------------------------------------------------ material groups
GROUPS = {'skin': [skin], 'cloth': [body], 'leather': [gloves, boots] + [o for o in straps if o] + soles, 'plate': plates, 'metal': metals,
          'hair': [hair, lashes], 'eye': [eyes], 'cape': [cape, scarf]}
DECI = {'skin': .55, 'cloth': .32, 'leather': .45, 'plate': .28, 'metal': 1, 'hair': .3, 'eye': 1, 'cape': .5}
JOINED = {}
for mat, objs in GROUPS.items():
    objs = [o for o in objs if o]
    active(objs[0])
    for o in objs[1:]: o.select_set(True)
    if len(objs) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active; o.name = 'G_' + mat; o.select_set(False)
    for m in list(o.modifiers): o.modifiers.remove(m)
    decimate(o, DECI[mat])
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.triangulate(bm, faces=bm.faces[:]); bm.to_mesh(o.data); bm.free()
    for uv in list(o.data.uv_layers): o.data.uv_layers.remove(uv)
    o.data.uv_layers.new(name='UV')
    active(o); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.004); bpy.ops.object.mode_set(mode='OBJECT'); o.select_set(False)
    smooth(o); JOINED[mat] = o
    log('group', mat, 'tris', len(o.data.polygons))

# ------------------------------------------------------------------ procedural surface shaders
TEX = {'skin': 1024, 'cloth': 1024, 'plate': 1024, 'cape': 1024, 'leather': 1024, 'hair': 512, 'metal': 256, 'eye': 256}
def build_mat(kind):
    m = bpy.data.materials.new('B_' + kind); m.use_nodes = True; nt = m.node_tree; N_, L_ = nt.nodes, nt.links
    for n in list(N_): N_.remove(n)
    out = N_.new('ShaderNodeOutputMaterial'); bs = N_.new('ShaderNodeBsdfPrincipled'); em = N_.new('ShaderNodeEmission'); L_.new(bs.outputs[0], out.inputs[0])
    tc = N_.new('ShaderNodeTexCoord')
    def node(t, **kw):
        n = N_.new(t)
        for k, v in kw.items(): setattr(n, k, v)
        return n
    def sock(x, target):
        if isinstance(x, (tuple, list, float, int)): target.default_value = x
        else: L_.new(x, target)
    def mixc(a, b, f):
        n = node('ShaderNodeMix', data_type='RGBA', blend_type='MIX')
        sock(f, n.inputs['Factor']); sock(a, n.inputs[6]); sock(b, n.inputs[7]); return n.outputs[2]
    def mixf(a, b, f):
        n = node('ShaderNodeMix', data_type='FLOAT')
        sock(f, n.inputs['Factor']); sock(a, n.inputs[2]); sock(b, n.inputs[3]); return n.outputs[0]
    def M(op, a, b=None):
        n = node('ShaderNodeMath', operation=op)
        for i, x in enumerate((a, b)):
            if x is not None: sock(x, n.inputs[i])
        return n.outputs[0]
    def wave(scale, axis, prof='SIN', dist=0.):
        n = node('ShaderNodeTexWave', wave_type='BANDS', bands_direction=axis, wave_profile=prof); n.inputs['Scale'].default_value = scale; n.inputs['Distortion'].default_value = dist
        L_.new(tc.outputs['Object'], n.inputs['Vector']); return n.outputs['Fac']
    def noise(scale, detail=6, rough=.55):
        n = node('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = detail; n.inputs['Roughness'].default_value = rough
        L_.new(tc.outputs['Object'], n.inputs['Vector']); return n.outputs['Fac']
    def vor(scale, feat='F1'):
        n = node('ShaderNodeTexVoronoi', feature=feat); n.inputs['Scale'].default_value = scale; L_.new(tc.outputs['Object'], n.inputs['Vector']); return n.outputs['Distance']
    def rmp(x, a, b):
        n = node('ShaderNodeMapRange', clamp=True); sock(x, n.inputs['Value']); n.inputs['From Min'].default_value = a; n.inputs['From Max'].default_value = b; return n.outputs['Result']
    sep = node('ShaderNodeSeparateXYZ'); L_.new(tc.outputs['Object'], sep.inputs[0]); X_, Yb, Zb = sep.outputs[0], sep.outputs[1], sep.outputs[2]
    near = lambda v, w: rmp(M('ABSOLUTE', v), w, 0)
    dust = (*hexc('8a7458'), 1)
    base = (*C.get({'cloth': 'suit'}.get(kind, kind), (.5, .5, .5)), 1); rough = .8; metal = 0.0; height = 0.0
    if kind == 'cloth':
        weave = M('MULTIPLY', M('ADD', wave(300, 'X'), wave(300, 'Z')), .5); rib = wave(60, 'Z', 'SAW', 1.5)
        seamA = M('MAXIMUM', near(X_, .005), near(Yb, .005)); dash = rmp(wave(120, 'Z', 'SAW'), .4, .6); stitch = M('MULTIPLY', seamA, dash)
        groove = M('MULTIPLY', M('MAXIMUM', near(X_, .009), near(Yb, .009)), -1.0)
        wear = rmp(noise(9, 8, .62), .52, .78)
        knees = M('MULTIPLY', rmp(M('ABSOLUTE', M('SUBTRACT', Zb, yKnee)), .1, 0), rmp(M('MULTIPLY', Yb, -1), -.02, .08))
        wearT = M('MINIMUM', M('ADD', wear, M('MULTIPLY', knees, .7)), 1)
        col = mixc(base, dust, M('MULTIPLY', wearT, .3)); col = mixc(col, (.03, .03, .03, 1), M('MULTIPLY', weave, .2)); col = mixc(col, (*hexc('8a7a60'), 1), M('MULTIPLY', stitch, .85))
        height = M('ADD', M('ADD', M('MULTIPLY', weave, .3), M('MULTIPLY', rib, .3)), M('ADD', groove, M('MULTIPLY', stitch, .5)))
        rough = mixf(.86, .97, wearT)
    elif kind == 'plate':
        scr = rmp(noise(22, 2, .4), .62, .665); scr2 = M('MULTIPLY', rmp(wave(70, 'X', 'SIN', 18), .95, 1), rmp(noise(6), .5, .7))
        pores = vor(70); chips = rmp(noise(14, 10, .7), .7, .76); rivet = rmp(vor(18, 'F1'), .09, .06); grime = rmp(noise(5, 4), .5, .75)
        bare = M('MAXIMUM', M('MULTIPLY', chips, .9), M('MULTIPLY', M('MAXIMUM', scr, scr2), .7))
        col = mixc(base, (*hexc('8f897c'), 1), bare); col = mixc(col, dust, M('MULTIPLY', grime, .35)); col = mixc(col, (*hexc('6a665e'), 1), M('MULTIPLY', rivet, .8))
        height = M('ADD', M('ADD', M('MULTIPLY', pores, .15), M('MULTIPLY', M('MAXIMUM', scr, scr2), -.6)), M('ADD', M('MULTIPLY', rivet, .9), M('MULTIPLY', chips, -.4)))
        rough = mixf(mixf(.5, .3, bare), .85, M('MULTIPLY', grime, .6)); metal = mixf(.15, .95, bare)
    elif kind == 'leather':
        grain = vor(160); crease = rmp(noise(40, 3), .45, .5); scuff = rmp(noise(8, 6), .5, .8)
        col = mixc(base, (*hexc('7a5a40'), 1), M('MULTIPLY', scuff, .5))
        stitchL = M('MULTIPLY', rmp(wave(300, 'Z', 'SAW'), .45, .55), rmp(M('ABSOLUTE', M('SUBTRACT', M('FRACT', M('MULTIPLY', X_, 40)), .5)), .47, .5))
        col = mixc(col, (*hexc('b8a888'), 1), M('MULTIPLY', stitchL, .5))
        height = M('ADD', M('MULTIPLY', grain, .4), M('MULTIPLY', crease, -.3)); rough = mixf(.62, .42, scuff)
    elif kind == 'cape':
        weave = M('MULTIPLY', M('ADD', wave(140, 'X', 'SIN', 1), wave(140, 'Z', 'SIN', 1)), .5); stains = rmp(noise(4, 6), .45, .75); frayed = rmp(noise(30, 8, .7), .55, .7)
        col = mixc(base, dust, M('MULTIPLY', stains, .5)); col = mixc(col, (.05, .045, .04, 1), M('MULTIPLY', rmp(Zb, .9, .3), .45)); col = mixc(col, (.02, .02, .02, 1), M('MULTIPLY', weave, .2))
        height = M('ADD', M('MULTIPLY', weave, .5), M('MULTIPLY', frayed, .3)); rough = .95
    elif kind == 'skin':
        pores = vor(420); mott = noise(60, 4); fine = noise(160, 3)
        col = mixc(base, (*hexc('6a3e28'), 1), M('MULTIPLY', rmp(mott, .4, .7), .22))
        height = M('ADD', M('MULTIPLY', pores, .25), M('MULTIPLY', fine, .1)); rough = mixf(.42, .62, rmp(mott, .3, .7))
    elif kind == 'hair':
        strands = wave(300, 'X', 'SIN', 6); cl = rmp(noise(30, 4), .4, .7)
        col = mixc(base, (*hexc('3a2c20'), 1), M('MULTIPLY', M('MULTIPLY', strands, cl), .6)); height = M('MULTIPLY', strands, .6); rough = mixf(.55, .75, cl)
    elif kind == 'metal':
        col = mixc(base, (*hexc('5a564e'), 1), M('MULTIPLY', rmp(noise(40, 6), .5, .7), .6)); height = M('MULTIPLY', noise(200), .3); rough = mixf(.25, .5, noise(30)); metal = 1.0
    else:
        col = base; rough = .12
    return dict(m=m, nt=nt, out=out, em=em, col=col, rough=rough, metal=metal, height=height, sock=sock)

SCN.render.engine = 'CYCLES'; SCN.cycles.device = 'CPU'; SCN.render.bake.margin = 8
def bake_emit(o, R, value, name, colorspace='Non-Color', float_buf=False, samples=1):
    nt, out, em, sock = R['nt'], R['out'], R['em'], R['sock']
    img = bpy.data.images.new(name, TEX_RES, TEX_RES, alpha=False, float_buffer=float_buf); img.colorspace_settings.name = colorspace
    tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = img; nt.nodes.active = tn
    for l in list(out.inputs[0].links): nt.links.remove(l)
    for l in list(em.inputs['Color'].links): nt.links.remove(l)
    if isinstance(value, tuple): em.inputs['Color'].default_value = value
    elif isinstance(value, float): em.inputs['Color'].default_value = (value, value, value, 1)
    else: nt.links.new(value, em.inputs['Color'])
    nt.links.new(em.outputs[0], out.inputs[0]); SCN.cycles.samples = samples
    active(o); bpy.ops.object.bake(type='EMIT'); nt.nodes.remove(tn); o.select_set(False)
    return img
def img_np(img):
    a = np.array(img.pixels[:], dtype=np.float32).reshape(img.size[1], img.size[0], 4); return a[::-1, :, :3]   # top row first
def save_jpg(arr, path, q, size=None):
    im = Image.fromarray((np.clip(arr, 0, 1) * 255 + .5).astype(np.uint8))
    if size and im.width != size: im = im.resize((size, size), Image.LANCZOS)
    im.save(path, 'JPEG', quality=q, optimize=True)
def lin2srgb(x): return np.where(x <= .0031308, x * 12.92, 1.055 * np.power(np.clip(x, 0, None), 1 / 2.4) - .055)

# face landmarks for painting
eyeC = (Lg['eyeR'] + Lg['eyeL']) / 2
def paint_skin(alb, pos, mask):
    x, y, z = pos[..., 0], pos[..., 1], pos[..., 2]
    rng = np.random.default_rng(3)
    nz = np.asarray(Image.fromarray((rng.random((64, 64)) * 255).astype(np.uint8)).resize(alb.shape[1::-1], Image.BICUBIC), np.float32) / 255
    front = (z > HC.z + .02)
    # eyebrows: arched dark strokes above each eye
    for e in (Lg['eyeR'], Lg['eyeL']):
        dx = (x - e.x) * np.sign(e.x or 1); arch = e.y + .0135 + .0035 * np.exp(-((dx - .004) / .014) ** 2) - .0035 * (dx / .026) ** 2
        th = .0036 * (1.15 - .5 * np.clip((dx + .018) / .042, 0, 1))          # thicker at the inner end
        strands = .75 + .25 * np.sin((dx * 900 + (y - arch) * 2600)) ** 2
        brow = np.exp(-((y - arch) / th) ** 2) * np.clip(1 - np.abs(dx - .002) / .024, 0, 1) ** .4 * front * strands
        brow *= (.6 + .4 * nz)
        brow = np.clip(brow * 1.4, 0, 1); alb[:] = alb * (1 - brow[..., None] * .88) + np.array(hexc('120c09')) * brow[..., None] * .88
    # stubble: jaw, chin, upper lip; denser along the jawline
    prof = [p for p in skinV if abs(p.x) < .007 and eyeC.y - .075 < p.y < eyeC.y - .03 and p.z > HC.z]
    lipZ = max(p.z for p in prof) if prof else HC.z + .1
    gap = [p for p in prof if p.z > lipZ - .02]
    mouthY = min(gap, key=lambda p: p.z).y if gap else eyeC.y - .052        # recessed seam between the lips
    print('mouth y', round(mouthY, 4), 'eye y', round(eyeC.y, 4))
    jaw = (y < eyeC.y - .028) & (y > Lg['neck'].y + .02) & (z > HC.z - .03)
    stub = jaw * np.clip((eyeC.y - .03 - y) / .018, 0, 1) * (.6 + .4 * nz)
    lips = np.exp(-((y - mouthY) / .0055) ** 2) * (np.abs(x) < .021) * front
    must = np.exp(-((y - (mouthY + .012)) / .005) ** 2) * np.clip(1 - np.abs(x) / .03, 0, 1) * front     # moustache
    chin = np.exp(-((y - (mouthY - .03)) / .018) ** 2) * np.clip(1 - np.abs(x) / .04, 0, 1) * front     # fuller chin beard
    beard = np.clip(stub * .85 + must * .9 + chin * .6, 0, 1) * (1 - lips * .9) * (.75 + .25 * np.sin(x * 2400 + y * 900) ** 2)
    alb[:] = alb * (1 - beard[..., None] * .8) + np.array(hexc('18110c')) * beard[..., None] * .8
    alb[:] = alb * (1 - lips[..., None] * .35) + np.array(hexc('7a4436')) * lips[..., None] * .35
    # soft painted hairline under the edge of the hair cap
    rel = np.stack([x - HC.x, y - HC.y, z - HC.z], -1); dn = rel / (np.linalg.norm(rel, axis=-1, keepdims=True) + 1e-6)
    thr = .33 + .1 * np.abs(dn[..., 0]); band_ = np.clip(1 - (thr - dn[..., 1]) / .1, 0, 1) * (dn[..., 2] > .05)
    band_ = np.where(dn[..., 1] > thr, 1.0, band_ ** 1.6) * (.7 + .3 * nz)
    band_ *= (dn[..., 1] > -.2)
    alb[:] = alb * (1 - band_[..., None] * .85) + np.array(hexc('1a130e')) * band_[..., None] * .85
    # eye sockets slightly darker, cheeks warmer
    for e in (Lg['eyeR'], Lg['eyeL']):
        soc = np.exp(-(((x - e.x) / .02) ** 2 + ((y - e.y) / .016) ** 2)) * front
        alb[:] = alb * (1 - soc[..., None] * .25)
def paint_eye(alb, pos):
    out = alb.copy()
    for e in (Lg['eyeR'], Lg['eyeL']):
        fw = Vector((.06 * np.sign(e.x), 0, 1)).normalized()
        rel = pos - np.array([e.x, e.y, e.z]); dist = np.linalg.norm(rel, axis=2) + 1e-6; cosang = (rel @ np.array(fw)) / dist
        near = dist < .03
        r = np.sqrt(np.clip(1 - cosang ** 2, 0, 1)) * dist
        iris = near & (cosang > 0) & (r < .0058); pupil = near & (cosang > 0) & (r < .0024)
        irisc = np.array(hexc('5a3a1e')) * (.75 + .5 * np.clip(r / .0058, 0, 1))[..., None]
        out = np.where(iris[..., None], irisc, out); out = np.where(pupil[..., None], np.array([.02, .02, .02]), out)
        ring = near & (cosang > 0) & (np.abs(r - .0058) < .0007); out = np.where(ring[..., None], np.array([.08, .06, .05]), out)
    return out

BAKED = {}
for mat, o in JOINED.items():
    TEX_RES = TEX[mat]
    R = build_mat(mat); o.data.materials.clear(); o.data.materials.append(R['m'])
    # position map (object = world coords here)
    pos_img = bake_emit(o, R, R['nt'].nodes.new('ShaderNodeTexCoord').outputs['Object'], mat + '_pos', 'Non-Color', True)
    pos = img_np(pos_img); posg = np.stack([pos[..., 0], pos[..., 2], -pos[..., 1]], axis=-1)        # blender -> game
    alb = img_np(bake_emit(o, R, R['col'], mat + '_alb', 'Non-Color', True))                       # linear albedo
    rough = img_np(bake_emit(o, R, R['rough'], mat + '_rough'))[..., 0]
    metal = img_np(bake_emit(o, R, R['metal'], mat + '_metal'))[..., 0] if not isinstance(R['metal'], float) else np.full(rough.shape, R['metal'], np.float32)
    hgt = bake_emit(o, R, R['height'], mat + '_hgt', 'Non-Color', True) if not isinstance(R['height'], float) else None
    # AO from the whole character
    img = bpy.data.images.new(mat + '_ao', TEX_RES, TEX_RES, alpha=False); img.colorspace_settings.name = 'Non-Color'
    tn = R['nt'].nodes.new('ShaderNodeTexImage'); tn.image = img; R['nt'].nodes.active = tn
    SCN.cycles.samples = 24; SCN.world = SCN.world or bpy.data.worlds.new('w'); SCN.world.light_settings.distance = .22
    active(o); bpy.ops.object.bake(type='AO'); o.select_set(False); R['nt'].nodes.remove(tn)
    ao = img_np(img)[..., 0]; ao = np.clip(ao * 1.05, 0, 1)
    # normal map from a displaced high-poly copy
    nrm = None
    if hgt is not None and mat in ('cloth', 'plate', 'leather', 'cape', 'skin', 'hair'):
        hi = o.copy(); hi.data = o.data.copy(); SCN.collection.objects.link(hi); hi.name = 'HI_' + mat
        for vg in list(hi.vertex_groups): hi.vertex_groups.remove(vg)
        apply_mod(hi, 'SUBSURF', levels=2, subdivision_type='CATMULL_CLARK')
        ht = bpy.data.textures.new('ht_' + mat, 'IMAGE'); ht.image = hgt; ht.extension = 'EXTEND'
        apply_mod(hi, 'DISPLACE', texture=ht, texture_coords='UV', strength={'skin': .0015, 'hair': .004}.get(mat, .0035), mid_level=.5)
        img = bpy.data.images.new(mat + '_nrm', TEX_RES, TEX_RES, alpha=False); img.colorspace_settings.name = 'Non-Color'
        tn = R['nt'].nodes.new('ShaderNodeTexImage'); tn.image = img; R['nt'].nodes.active = tn
        SCN.cycles.samples = 1; SCN.render.bake.use_selected_to_active = True; SCN.render.bake.cage_extrusion = .012; SCN.render.bake.max_ray_distance = .03
        bpy.ops.object.select_all(action='DESELECT'); hi.select_set(True); o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT'); SCN.render.bake.use_selected_to_active = False
        R['nt'].nodes.remove(tn); bpy.data.objects.remove(hi); nrm = img_np(img)
    # --- post: painting, AO into albedo, pack
    cov = (np.abs(posg).sum(axis=2) > 1e-6)
    if mat == 'skin': paint_skin(alb, posg, cov)
    if mat == 'eye': alb = paint_eye(alb, posg)
    albs = alb * (.55 + .45 * ao)[..., None]          # values are sRGB-coded (colours were authored in sRGB)
    fn = {}
    save_jpg(albs, os.path.join(TMP, f'{mat}_alb.jpg'), 78, min(TEX_RES, 1024)); fn['alb'] = os.path.join(TMP, f'{mat}_alb.jpg')
    if nrm is not None: save_jpg(nrm, os.path.join(TMP, f'{mat}_nrm.jpg'), 84, 1024 if mat in ('skin', 'plate', 'cloth') else 512); fn['nrm'] = os.path.join(TMP, f'{mat}_nrm.jpg')
    orm = np.stack([ao, np.clip(rough, .04, 1), np.clip(metal, 0, 1)], axis=-1)
    save_jpg(orm, os.path.join(TMP, f'{mat}_orm.jpg'), 84, min(512, TEX_RES)); fn['orm'] = os.path.join(TMP, f'{mat}_orm.jpg')
    BAKED[mat] = fn
    log('baked', mat, list(fn))

# ------------------------------------------------------------------ grip of the sword hand (rest pose)
hdR = Lg['handR']; i1, p1 = None, None
fist = [GV(v.co) for v in JOINED['leather'].data.vertices if (GV(v.co) - hdR).length < .13 and GV(v.co).y < hdR.y - .02 and GV(v.co).x > 0]
gc = sum(fist, Vector()) / len(fist) if fist else hdR + Vector((0, -.07, .01))
GRIP = {'p': list(gc - hdR), 'd': [0, -0.03, 1]}

# ------------------------------------------------------------------ export json
def b64(fmt, arr): return base64.b64encode(struct.pack('<%d%s' % (len(arr), fmt), *arr)).decode()
def durl(fp): return 'data:image/jpeg;base64,' + base64.b64encode(open(fp, 'rb').read()).decode()
out = {'v': 4, 'joints': [[b, list(J[b][0]), J[b][1]] for b in BONES], 'grip': GRIP, 'parts': {}}
tot = 0
for mat, o in JOINED.items():
    me = o.data; uvl = me.uv_layers.active.data; gi = {g.index: g.name[2:] for g in o.vertex_groups}
    P_, N_, U_, J_, W_, I_ = [], [], [], [], [], []; key = {}
    for poly in me.polygons:
        tri = []
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index; u, v = uvl[li].uv; k = (vi, round(u, 5), round(v, 5))
            if k not in key:
                key[k] = len(P_) // 3; vv = me.vertices[vi]
                P_ += list(GV(vv.co)); N_ += list(GV(vv.normal)); U_ += [u, v]
                ws = sorted([(g.weight, BONES.index(gi[g.group])) for g in vv.groups if gi.get(g.group) in BONES], reverse=True)[:4]
                tw = sum(w for w, _ in ws) or 1; ws = ws + [(0, 0)] * (4 - len(ws))
                J_ += [b for _, b in ws]; W_ += [int(round(w / tw * 255)) for w, _ in ws]
            tri.append(key[k])
        I_ += [tri[0], tri[2], tri[1]]
    n = len(P_) // 3; tot += n
    d = {'n': n, 'p': b64('h', [int(round(x * 10000)) for x in P_]), 'nr': b64('b', [max(-127, min(127, int(round(x * 127)))) for x in N_]),
         'c': b64('B', [255] * (3 * n)), 'uv': b64('H', [max(0, min(65535, int(round(x * 65535)))) for x in U_]), 'j': b64('B', J_), 'w': b64('B', W_),
         'i': b64('H' if n < 65536 else 'I', I_), 'i32': n >= 65536}
    for kind, fp in BAKED[mat].items(): d[kind] = durl(fp)
    out['parts'][mat] = d
json.dump(out, open(os.path.join(OUT, 'duncan.json'), 'w'), separators=(',', ':'))
log('VERTS', tot, {m: d['n'] for m, d in out['parts'].items()}, 'KB', os.path.getsize(os.path.join(OUT, 'duncan.json')) // 1024)

# ------------------------------------------------------------------ rigged .glb / .blend + preview renders
arm = bpy.data.armatures.new('Rig'); rig = bpy.data.objects.new('DuncanRig', arm); SCN.collection.objects.link(rig)
active(rig); bpy.ops.object.mode_set(mode='EDIT')
kids = {b: [c for c in BONES if J[c][1] == b] for b in BONES}
for b in BONES:
    eb = arm.edit_bones.new(b); h = J[b][0]; t = J[kids[b][0]][0] if kids[b] and b not in ('spine', 'hips') else h + Vector((0, .1 if b in ('spine', 'head', 'hips') else -.08, 0))
    if (t - h).length < .02: t = h + Vector((0, .08, 0))
    eb.head = G(*h); eb.tail = G(*t)
for b in BONES:
    if J[b][1]: arm.edit_bones[b].parent = arm.edit_bones[J[b][1]]
bpy.ops.object.mode_set(mode='OBJECT'); rig.select_set(False)
ROUGH = {'skin': .5, 'cloth': .9, 'plate': .45, 'leather': .6, 'metal': .3, 'hair': .7, 'eye': .15, 'cape': .95}
for mat, o in JOINED.items():
    m = bpy.data.materials.new('M_' + mat); m.use_nodes = True; nt = m.node_tree; bs = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(BAKED[mat]['alb']); nt.links.new(t.outputs[0], bs.inputs['Base Color'])
    t2 = nt.nodes.new('ShaderNodeTexImage'); t2.image = bpy.data.images.load(BAKED[mat]['orm']); t2.image.colorspace_settings.name = 'Non-Color'
    sp = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(t2.outputs[0], sp.inputs[0]); nt.links.new(sp.outputs[1], bs.inputs['Roughness']); nt.links.new(sp.outputs[2], bs.inputs['Metallic'])
    if 'nrm' in BAKED[mat]:
        t3 = nt.nodes.new('ShaderNodeTexImage'); t3.image = bpy.data.images.load(BAKED[mat]['nrm']); t3.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(t3.outputs[0], nm.inputs['Color']); nt.links.new(nm.outputs[0], bs.inputs['Normal'])
    if mat == 'skin': bs.inputs['Subsurface Weight'].default_value = .15; bs.inputs['Subsurface Radius'].default_value = (.01, .004, .002)
    o.data.materials.clear(); o.data.materials.append(m)
    o.parent = rig; md = o.modifiers.new('Armature', 'ARMATURE'); md.object = rig
bpy.ops.object.select_all(action='DESELECT')
for o in JOINED.values(): o.select_set(True)
rig.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'duncan.glb'), use_selection=True, export_format='GLB', export_skins=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'duncan.blend'))
log('glb/blend saved')
if '--render' in sys.argv:
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); SCN.collection.objects.link(cam); SCN.camera = cam
    for nm_, rot, e, c in (('k', (.75, 0, .55), 3.2, 'ffe2c0'), ('r', (-1.1, 0, 2.6), 2.2, 'a8c8ff'), ('f', (1.2, 0, -.9), .8, 'ffffff')):
        Lo = bpy.data.objects.new(nm_, bpy.data.lights.new(nm_, 'SUN')); Lo.data.energy = e; Lo.data.color = hexc(c); Lo.rotation_euler = rot; SCN.collection.objects.link(Lo)
    SCN.world = bpy.data.worlds.new('w'); SCN.world.use_nodes = True; SCN.world.node_tree.nodes['Background'].inputs[0].default_value = (.25, .2, .17, 1); SCN.world.node_tree.nodes['Background'].inputs[1].default_value = .5
    SCN.render.engine = 'CYCLES'; SCN.cycles.samples = 32; SCN.cycles.use_denoising = True; SCN.render.resolution_x = 560; SCN.render.resolution_y = 820; SCN.render.film_transparent = False
    for nm, loc, tgt, lens in (('front', (1.2, 1.2, 4.3), (0, .98, 0), 55), ('back', (-1.6, 1.3, -4.1), (0, .98, 0), 55), ('face', (.26, 1.8, .85), (0, 1.77, 0), 85)):
        cam.location = G(*loc); d = G(*tgt) - G(*loc); cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = lens
        SCN.render.filepath = os.path.join(OUT, 'v4_' + nm + '.png'); bpy.ops.render.render(write_still=True)
    log('renders done')
