# Duncan Idaho v4 — MakeHuman anatomy + procedural armour, baked PBR maps (albedo, normal from a displaced
# high-poly copy, AO / roughness / metallic packed as ORM). Exports blender/duncan.json for the game + .glb/.blend.
import sys, os, math, json, base64, struct, random
sys.path.insert(0, '/home/claude/dune/tools')
import bpy, bmesh
import numpy as np
from mathutils import Vector, Matrix
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree
from PIL import Image, ImageFilter
import mh_body
from mh_body import G, GV, GAME_BONES

OUT = '/home/claude/dune/blender'; TMP = '/home/claude/dune/blender/_bake'; os.makedirs(TMP, exist_ok=True)
PREVIEW_ONLY = '--preview' in sys.argv
random.seed(11)
bpy.ops.wm.read_factory_settings(use_empty=True)
SCN = bpy.context.scene
def hexc(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
C = dict(skin=hexc('8a5a3c'), suit=hexc('2f2c29'), plate=hexc('4c4944'), leather=hexc('3a3028'), boot=hexc('2e2a26'), metal=hexc('8a8578'),
         hair=hexc('17110d'), cape=hexc('62584e'), eye=hexc('f2ece2'))

body, eyes, lashes, L, SCALE = mh_body.build(1.90)
SCN = bpy.context.scene
Lg = {k: Vector(v) for k, v in L.items()}

# ------------------------------------------------------------------ helpers
def link(me, name):
    o = bpy.data.objects.new(name, me); SCN.collection.objects.link(o); return o
def active(o):
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = o; o.select_set(True)
def apply_mod(o, typ, **kw):
    m = o.modifiers.new('m', typ)
    for k, v in kw.items(): setattr(m, k, v)
    active(o); bpy.ops.object.modifier_apply(modifier=m.name); o.select_set(False)
def smooth(o):
    for p in o.data.polygons: p.use_smooth = True
def bm_obj(bm, name):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); o = link(me, name); smooth(o); return o
def centers(o): return [GV(p.center) for p in o.data.polygons]

BV = [GV(v.co) for v in body.data.vertices]
# per-vertex game-bone weights of the body (for transferring to clothes)
BW = [dict() for _ in BV]
gidx = {g.index: g.name[2:] for g in body.vertex_groups}
for v in body.data.vertices:
    for g in v.groups:
        if g.weight > 1e-4: BW[v.index][gidx[g.group]] = g.weight
KD = KDTree(len(BV))
for i, p in enumerate(BV): KD.insert(p, i)
KD.balance()

def shell(name, keep, off, thick=0.0, src=None):
    src = src or body
    bm = bmesh.new(); bm.from_mesh(src.data); bm.normal_update()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keep(GV(f.calc_center_median()))], context='FACES')
    bm.normal_update()
    for v in bm.verts: v.co += v.normal * off
    o = bm_obj(bm, name)
    if not o.data.polygons: bpy.data.objects.remove(o); return None
    if thick: apply_mod(o, 'SOLIDIFY', thickness=thick, offset=1)
    return o
def relax(o, it, fac=.5): apply_mod(o, 'SMOOTH', iterations=it, factor=fac)
def box(name, c, s, rot=(0, 0, 0), bevel=0):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    R = Matrix.Rotation(rot[1], 3, 'Y') @ Matrix.Rotation(rot[0], 3, 'X') @ Matrix.Rotation(rot[2], 3, 'Z')
    for v in bm.verts:
        q = R @ Vector((v.co.x * s[0], v.co.z * s[1], v.co.y * s[2])); v.co = G(c[0] + q.x, c[1] + q.y, c[2] + q.z)
    o = bm_obj(bm, name)
    for p in o.data.polygons: p.use_smooth = False
    if bevel: apply_mod(o, 'BEVEL', width=bevel, segments=2)
    return o
def cyl(name, a, b, r, seg=10, r2=None):
    a, b = Vector(a), Vector(b); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r2 if r2 is not None else r, depth=(b - a).length)
    q = Vector((0, 0, 1)).rotation_difference(G(*(b - a)).normalized()); M = q.to_matrix(); c = G(*((a + b) / 2))
    for v in bm.verts: v.co = M @ v.co + c
    return bm_obj(bm, name)
def section(y, sel=None, tol=.012, bones=None):
    return [p for i, p in enumerate(BV) if abs(p.y - y) < tol and (sel is None or sel(p)) and (bones is None or sum(BW[i].get(b, 0) for b in bones) > .5)]
def band(name, y, h, pad, sel=None, segs=40, thick=.01, tilt=0.0, bones=None):
    vs = section(y, sel, bones=bones)
    if not vs: return None
    cx = sum(p.x for p in vs) / len(vs); cz = sum(p.z for p in vs) / len(vs)
    bm = bmesh.new(); rings = []
    for k in range(2):
        ring = []
        for i in range(segs):
            a = i / segs * math.tau; d = Vector((math.cos(a), 0, math.sin(a)))
            cand = [(p.x - cx) * d.x + (p.z - cz) * d.z for p in vs if abs((p.x - cx) * d.z - (p.z - cz) * d.x) < .015]
            r = max([c for c in cand if c > 0] or [.05]) + pad; yy = y + (k - .5) * h + tilt * d.z
            ring.append(bm.verts.new(G(cx + d.x * r, yy, cz + d.z * r)))
        rings.append(ring)
    for i in range(segs): j = (i + 1) % segs; bm.faces.new((rings[0][i], rings[0][j], rings[1][j], rings[1][i]))
    o = bm_obj(bm, name); apply_mod(o, 'SOLIDIFY', thickness=thick, offset=1); return o
def meta(name, res):
    mb = bpy.data.metaballs.new(name); mb.resolution = res; mb.render_resolution = res; mb.threshold = .6
    o = link(mb, name); return mb
K = 1 / .574
def ball(mb, p, r, st=2.0):
    e = mb.elements.new(type='BALL'); e.co = G(*p); e.radius = r * K; e.stiffness = st
def tomesh(name):
    bpy.context.view_layer.update(); ob = bpy.data.objects[name]; dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg)); new = link(me, name + '_m'); bpy.data.objects.remove(ob); smooth(new); return new
def decimate(o, ratio):
    if o and ratio < 1: apply_mod(o, 'DECIMATE', ratio=ratio)

# ------------------------------------------------------------------ landmarks
shR, shL, elR, handR, hipR, kneeR, ankR = Lg['shR'], Lg['shL'], Lg['elR'], Lg['handR'], Lg['hipR'], Lg['kneeR'], Lg['ankR']
yN, ySh, yHip, yKnee, yAnk = Lg['neck'].y, shR.y, Lg['hips'].y, kneeR.y, ankR.y
yBelt = Lg['hipR'].y + .085
HC = (Lg['headB'] + Lg['headT']) / 2 + Vector((0, .01, -.004))      # head centre
print('landmarks: neck', round(yN, 3), 'sh', round(ySh, 3), 'belt', round(yBelt, 3), 'knee', round(yKnee, 3), 'head', [round(x, 3) for x in HC])

# ------------------------------------------------------------------ split the body: skin (head/neck), suit (cloth), gloves
def hand_w(i): d = BW[i]; return d.get('handR', 0) + d.get('handL', 0)
active(body); bpy.ops.object.mode_set(mode='EDIT'); bm = bmesh.from_edit_mesh(body.data)
for f in bm.faces: f.select = all(GV(v.co).y > yN - .025 for v in f.verts) and not (GV(f.calc_center_median()).y < yN + .03 and abs(GV(f.calc_center_median()).x) > .09)
bmesh.update_edit_mesh(body.data); bpy.ops.mesh.separate(type='SELECTED'); bpy.ops.object.mode_set(mode='OBJECT')
skin = [o for o in bpy.context.selected_objects if o is not body][-1]; skin.name = 'Skin'
active(body); bpy.ops.object.mode_set(mode='EDIT'); bm = bmesh.from_edit_mesh(body.data); dl = bm.verts.layers.deform.active
for f in bm.faces:
    f.select = all(sum(v[dl].get(body.vertex_groups['g_hand' + s].index, 0) for s in 'RL') > .45 for v in f.verts)
bmesh.update_edit_mesh(body.data); bpy.ops.mesh.separate(type='SELECTED'); bpy.ops.object.mode_set(mode='OBJECT')
gloves = [o for o in bpy.context.selected_objects if o is not body][-1]; gloves.name = 'Gloves'; body.name = 'Suit'

# ------------------------------------------------------------------ armour plates (shells over the suit)
plates = []
def P(name, keep, off=.016, th=.011, it=4):
    o = shell(name, keep, off, th)
    if o: relax(o, it, .5); plates.append(o)
    return o
wch = abs(shR.x)
for s in (-1, 1):
    P('Chest', lambda c, s=s: c.z > .03 and .018 < c.x * s < wch * .78 and ySh - .2 < c.y < ySh - .03)
    P('AbsA', lambda c, s=s: c.z > .04 and .012 < c.x * s < .1 and yBelt + .15 < c.y < ySh - .225)
    P('AbsB', lambda c, s=s: c.z > .04 and .012 < c.x * s < .095 and yBelt + .045 < c.y < yBelt + .14)
    P('Rib', lambda c, s=s: wch * .55 < c.x * s < wch * .95 and -.07 < c.z and yBelt + .08 < c.y < ySh - .13, .019)
    P('Back', lambda c, s=s: c.z < -.05 and .012 < c.x * s < wch * .72 and ySh - .26 < c.y < ySh - .02)
    P('BackL', lambda c, s=s: c.z < -.05 and .012 < c.x * s < wch * .6 and yBelt + .06 < c.y < ySh - .28)
# limbs
for s, S in ((1, 'R'), (-1, 'L')):
    sh, el, hd = Lg['sh' + S], Lg['el' + S], Lg['hand' + S]
    P('UArm' + S, lambda c, s=s, sh=sh, el=el: c.x * s > abs(sh.x) - .01 and el.y + .07 < c.y < sh.y - .11, .014, .009, 3)
    P('FArm' + S, lambda c, s=s, el=el, hd=hd: c.x * s > .1 and hd.y + .035 < c.y < el.y - .045, .012, .008, 3)
    kn, an = Lg['knee' + S], Lg['ank' + S]
    P('Knee' + S, lambda c, s=s, kn=kn: c.x * s > .02 and c.z > kn.z + .015 and abs(c.y - kn.y) < .075 and abs(c.x * s - abs(kn.x)) < .075, .02, .012, 3)
    P('Shin' + S, lambda c, s=s, kn=kn, an=an: c.x * s > .02 and c.z > kn.z + .02 and an.y + .2 < c.y < kn.y - .085 and abs(c.x * s - abs(an.x)) < .06, .03, .01, 3)
P('Thigh', lambda c: c.x > .06 and yKnee + .2 < c.y < yHip - .12 and c.z > -.03 and c.x > hipR.x + .02, .02, .01, 3)
# pauldrons: three layered plates per shoulder
for s, S in ((1, 'R'), (-1, 'L')):
    sh = Lg['sh' + S]
    for i, (dy, r) in enumerate(((.035, .11), (-.008, .104), (-.048, .098))):
        bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=22, v_segments=12, radius=1)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < .05 or v.co.x * s < -.4], context='VERTS')
        for v in bm.verts:
            x, y, z = v.co.x, v.co.z, -v.co.y
            v.co = G(sh.x + s * (.012 + .012 * i) + x * r, sh.y + dy + y * r * .78, sh.z + z * r * 1.08)
        o = bm_obj(bm, 'Pauldron'); apply_mod(o, 'SOLIDIFY', thickness=.012); plates.append(o)

# ------------------------------------------------------------------ belts, straps, pouches, buckles
straps, metals = [], []
def add_strap(o):
    if o: straps.append(o)
add_strap(band('Belt', yBelt, .06, .022, thick=.012))
add_strap(band('Belt2', yBelt - .045, .024, .03, thick=.008))
bsec = section(yBelt); bR = max(math.hypot(p.x, p.z) for p in bsec) + .03
for a in (-1.2, -.78, .72, 1.12, 2.65):
    c = (math.sin(a) * bR, yBelt - .01, math.cos(a) * bR * .8)
    straps.append(box('Pouch', c, (.06, .075, .034), (0, a, 0), .006)); metals.append(box('Snap', (c[0] + math.sin(a) * .019, c[1] + .016, c[2] + math.cos(a) * .019), (.013, .011, .004), (0, a, 0)))
bz = max(p.z for p in bsec) + .035
metals.append(box('Buckle', (0, yBelt, bz), (.075, .052, .016), bevel=.004))
for s, S in ((1, 'R'), (-1, 'L')):
    for y in (yKnee + .2, yKnee + .3): add_strap(band('ThighStrap', y, .02, .012, lambda p, s=s: p.x * s > .03, bones=['hip' + S, 'knee' + S]))
    for y in (yAnk + .1, yAnk + .18, yAnk + .26): add_strap(band('BootStrap', y, .022, .034, lambda p, s=s: p.x * s > .02, bones=['knee' + S, 'ank' + S]))
    el, hd = Lg['el' + S], Lg['hand' + S]
    for t in (.25, .5, .75): add_strap(band('ArmStrap', hd.y + (el.y - hd.y) * t, .014, .024, lambda p, s=s: p.x * s > .1, bones=['el' + S, 'hand' + S]))
# chest harness straps lying on the plates/suit
plate_bvh = None
def surf_pts(a, b, n=18, out=.03):
    res = []
    for i in range(n + 1):
        t = i / n; x = a[0] + (b[0] - a[0]) * t; y = a[1] + (b[1] - a[1]) * t
        hit = [p for p in BV if abs(p.x - x) < .02 and abs(p.y - y) < .02 and p.z > 0]
        z = max([h.z for h in hit] or [.12]) + out; res.append((x, y, z))
    return res
def strap_path(name, pts3, w=.03):
    bm = bmesh.new(); rows = []
    for side in (-1, 1): rows.append([bm.verts.new(G(p[0] + side * w / 2, p[1], p[2])) for p in pts3])
    for i in range(len(pts3) - 1): bm.faces.new((rows[0][i], rows[0][i + 1], rows[1][i + 1], rows[1][i]))
    o = bm_obj(bm, name); apply_mod(o, 'SOLIDIFY', thickness=.006); return o
ringY = ySh - .27
straps.append(strap_path('Harness', surf_pts((-wch * .62, ySh - .02), (0, ringY)) + surf_pts((0, ringY - .02), (0, yBelt + .03))[1:]))
straps.append(strap_path('Harness2', surf_pts((wch * .62, ySh - .02), (.005, ringY + .01))))
rz = max(p.z for p in section(ringY, lambda p: abs(p.x) < .04)) + .05
metals.append(box('Ring', (0, ringY, rz), (.04, .04, .012), (0, 0, .78), .004))

# ------------------------------------------------------------------ boots (+ soles)
boots = shell('Boots', lambda c: yAnk + .02 < c.y < yAnk + .3, .02, 0)
relax(boots, 8, .6)
for S in 'RL':
    fv = [p for p in BV if p.y < yAnk + .07 and (p.x > 0) == (S == 'R')]
    cen = sum(fv, Vector()) / len(fv)
    bm = bmesh.new(); vs = [bm.verts.new(G(*(cen + (p - cen) * Vector((1.1, 1.06, 1.06)) + Vector((0, .006, 0))))) for p in fv]
    bmesh.ops.convex_hull(bm, input=vs); bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    foot = bm_obj(bm, 'BootFoot'); apply_mod(foot, 'REMESH', mode='SMOOTH', octree_depth=5, use_smooth_shade=True); relax(foot, 6, .6); decimate(foot, .35); smooth(foot)
    active(boots); foot.select_set(True); bpy.ops.object.join(); boots.select_set(False)
apply_mod(boots, 'SOLIDIFY', thickness=.006, offset=1)
soles = []
for S in 'RL':
    an, to = Lg['ank' + S], Lg['toe' + S]
    fv = [p for p in BV if p.y < yAnk + .02 and (p.x > 0) == (S == 'R')]
    zmin, zmax = min(p.z for p in fv), max(p.z for p in fv); xc = sum(p.x for p in fv) / len(fv)
    soles.append(box('Sole', (xc, .012, (zmin + zmax) / 2), (.12, .026, zmax - zmin + .05), bevel=.01))

# ------------------------------------------------------------------ scarf (bunched around the neck) + hood fold
nsk = [GV(v.co) for v in skin.data.vertices if abs(GV(v.co).y - (yN + .01)) < .015]; ncz = sum(p.z for p in nsk) / len(nsk) if nsk else 0; NR = (max(math.hypot(p.x, p.z - ncz) for p in nsk) if nsk else .07) + .004
def roll(bm, y0, R0, tr, seg=56, tseg=10, ph=0.0, drop=0.0):
    rings = []
    for i in range(seg):
        a = i / seg * math.tau; fold = 1 + .14 * math.sin(a * 7 + ph) + .07 * math.sin(a * 13 + ph * 2)
        c = Vector((math.sin(a) * R0 * 1.06, y0 + .012 * math.sin(a * 5 + ph) - drop * max(0, math.cos(a)), ncz + math.cos(a) * R0))
        outw = Vector((math.sin(a), 0, math.cos(a))); ring = []
        for j in range(tseg):
            b = j / tseg * math.tau; q = c + (outw * math.cos(b) + Vector((0, 1, 0)) * math.sin(b)) * tr * fold
            ring.append(bm.verts.new(G(*q)))
        rings.append(ring)
    for i in range(seg):
        for j in range(tseg): bm.faces.new((rings[i][j], rings[i][(j + 1) % tseg], rings[(i + 1) % seg][(j + 1) % tseg], rings[(i + 1) % seg][j]))
bm = bmesh.new()
roll(bm, yN - .03, NR + .018, .026, ph=.3, drop=.012); roll(bm, yN - .002, NR + .01, .022, ph=1.7); roll(bm, ySh + .012, NR + .055, .03, ph=2.9, drop=.03)
scarf = bm_obj(bm, 'Scarf')
mb = meta('Hood', .007)
for i in range(16):
    a = random.uniform(-1.3, 1.3); ball(mb, (math.sin(a) * (NR + .03), random.uniform(yN - .03, yN + .03), ncz - math.cos(a) * (NR + .035)), .03 + random.uniform(0, .01), 2)
hood = tomesh('Hood'); active(scarf); hood.select_set(True); bpy.ops.object.join(); scarf.select_set(False)

# ------------------------------------------------------------------ hair: wavy, swept back, to the shoulders
skinV = [GV(v.co) for v in skin.data.vertices]
def is_scalp(p):
    d = (p - HC).normalized()
    if d.y < -.25: return False                         # below the ears
    if d.z > .2 and d.y < .33 + .1 * abs(d.x): return False   # face + forehead below a natural hairline
    if abs(d.x) > .55 and d.y < .1 and d.z > -.25: return False   # ears / temples
    return (p - HC).length > .06
scalp = [p for p in skinV if is_scalp(p)]
hr = sum((p - HC).length for p in scalp) / len(scalp) if scalp else .1
mb = meta('Hair', .0058)
def hairline(d):     # 0 at the hairline on the forehead/temples, 1 deeper in the scalp
    if d.z <= .2: return 1.0
    return max(0.0, min(1.0, (d.y - (.33 + .1 * abs(d.x))) / .16))
for p in random.sample(scalp, min(760, len(scalp))):
    d = (p - HC).normalized(); hl = hairline(d); q = p + d * (.004 + (.008 + .006 * max(0, d.y)) * hl); q.z -= .006 * max(0, d.y)
    ball(mb, tuple(q), (.007 + .011 * hl) + random.random() * .006 * (.4 + .6 * hl), 2.0)
front = [p for p in scalp if (p - HC).normalized().z > .1 and hairline((p - HC).normalized()) > .55]
for k in range(34):                     # locks swept back from the hairline over the crown
    if not front: break
    p0 = random.choice(front); d0 = (p0 - HC).normalized()
    for i in range(7):
        t = i / 6; ang = .5 + t * 1.4
        d = Vector((d0.x * (1 - .25 * t), math.sin(ang) * .9 + .1, math.cos(ang))).normalized()
        q = HC + d * (hr * 1.0 + .006 + .008 * min(1, t * 3) + .003 * math.sin(t * 6 + k)); ball(mb, tuple(q), .008 + .007 * min(1, t * 2.5), 2.2)
for k in range(26):
    a = -1.5 + 3.0 * k / 25 + random.uniform(-.05, .05); Lk = random.uniform(.15, .22)
    for i in range(10):
        t = i / 9; y = HC.y + .02 - t * Lk; rr = hr * .95 + .03 * t
        q = (HC.x + math.sin(a) * rr + .011 * math.sin(t * 9 + k), y, HC.z - math.cos(a) * rr * .95 - .03 * t)
        ball(mb, q, .019 - .006 * t, 2.2)
hair = tomesh('Hair')

# ------------------------------------------------------------------ tattered cape (three bones) from the shoulders down the back
bm = bmesh.new(); cols, rows = 24, 18; grid = []
lens = [random.uniform(.82, 1.0) for _ in range(cols + 1)]
backZ = min(p.z for p in section(ySh - .1)) ; capeTop = ySh + .02
for i in range(cols + 1):
    u = i / cols; th = math.radians(168 + 172 * u)
    Lc = (capeTop - .25) * lens[i] * (1 - .22 * max(0, u - .72) / .28)
    col = []
    for j in range(rows + 1):
        v = j / rows; y = capeTop - v * Lc
        r = wch + .07 + .05 * min(1, v * 3) + .1 * v + .018 * math.sin(th * 9 + v * 3) * min(1, v * 4)
        x = math.cos(th) * r * 1.0; z = math.sin(th) * r * .72 + backZ * .25 - .03 - .05 * v
        col.append(bm.verts.new(G(x, y, z)))
    grid.append(col)
for i in range(cols):
    for j in range(rows): bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
bm.faces.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[f for k, f in enumerate(bm.faces) if (k % rows) >= rows - 4 and random.random() < .33 * ((k % rows) - rows + 5)], context='FACES')
cape = bm_obj(bm, 'Cape'); apply_mod(cape, 'SOLIDIFY', thickness=.004)
CAPE_TOP, CAPE_LEN = capeTop, capeTop - .25

# ------------------------------------------------------------------ scabbard across the back
A = Vector((.15, ySh + .22, backZ - .1)); Bp = Vector((-.2, yHip - .2, backZ - .12)); dv = (A - Bp).normalized()
scab = cyl('Scabbard', A.lerp(Bp, .18), Bp, .022, 10, .017); straps.append(scab)
metals.append(cyl('Throat', A.lerp(Bp, .16), A.lerp(Bp, .2), .027, 10)); metals.append(cyl('Chape', Bp + dv * .05, Bp - dv * .005, .02, 10, .012))

# ------------------------------------------------------------------ preview (geometry only)
def preview(prefix):
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); SCN.collection.objects.link(cam); SCN.camera = cam
    SCN.render.engine = 'BLENDER_WORKBENCH'; SCN.display.shading.light = 'STUDIO'; SCN.display.shading.show_cavity = True; SCN.display.shading.color_type = 'OBJECT'
    for o in SCN.objects:
        if o.type != 'MESH': continue
        n = o.name
        o.color = (*(C['skin'] if n.startswith('Skin') else C['suit'] if n.startswith('Suit') else C['plate'] if n.startswith(('Chest', 'Abs', 'Rib', 'Back', 'UArm', 'FArm', 'Knee', 'Shin', 'Thigh', 'Pauldron'))
                    else C['hair'] if n.startswith(('Hair', 'Lashes')) else C['cape'] if n.startswith(('Cape', 'Scarf')) else C['metal'] if n.startswith(('Buckle', 'Snap', 'Ring', 'Throat', 'Chape')) else C['eye'] if n.startswith('Eyes') else C['leather']), 1)
    SCN.render.resolution_x = 520; SCN.render.resolution_y = 760
    for nm, loc, tgt, lens in (('front', (1.2, 1.15, 4.4), (0, .98, 0), 55), ('back', (-1.5, 1.25, -4.2), (0, .98, 0), 55), ('face', (.28, 1.8, .9), (0, 1.76, 0), 85)):
        cam.location = G(*loc); d = G(*tgt) - G(*loc); cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = lens
        SCN.render.filepath = os.path.join(OUT, prefix + nm + '.png'); bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)

if PREVIEW_ONLY:
    preview('v4geo_'); sys.exit(0)

exec(open('/home/claude/dune/tools/mh_duncan_bake.py').read())
