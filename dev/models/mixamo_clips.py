# Retarget Mixamo FBX clips onto the game rig (15 joints, canonical rest: limbs straight down, spine/head up,
# feet forward). The animation is mirrored so Mixamo's sword hand drives the game's weapon hand ('R', +x).
# Output: blender/clips.json — per clip: fps, frames, local quaternions per joint, hip offset, strike times.
import sys, os, json, math, base64, struct
import bpy
import numpy as np
from mathutils import Vector, Matrix, Quaternion

SRC = '/home/claude/dune/assets/mixamo'; OUT = '/home/claude/dune/blender/clips.json'
BONES = ['hips', 'spine', 'head', 'shR', 'elR', 'handR', 'shL', 'elL', 'handL', 'hipR', 'kneeR', 'ankR', 'hipL', 'kneeL', 'ankL']
PARENT = {'hips': None, 'spine': 'hips', 'head': 'spine', 'shR': 'spine', 'elR': 'shR', 'handR': 'elR', 'shL': 'spine', 'elL': 'shL', 'handL': 'elL',
          'hipR': 'hips', 'kneeR': 'hipR', 'ankR': 'kneeR', 'hipL': 'hips', 'kneeL': 'hipL', 'ankL': 'kneeL'}
# after mirroring, Mixamo 'Right*' sits on +x = game 'R'
MAP = {'hips': 'Hips', 'spine': 'Spine2', 'head': 'Head', 'shR': 'RightArm', 'elR': 'RightForeArm', 'handR': 'RightHand', 'shL': 'LeftArm', 'elL': 'LeftForeArm', 'handL': 'LeftHand',
       'hipR': 'RightUpLeg', 'kneeR': 'RightLeg', 'ankR': 'RightFoot', 'hipL': 'LeftUpLeg', 'kneeL': 'LeftLeg', 'ankL': 'LeftFoot'}
CHILD = {'Hips': 'Spine', 'Spine2': 'Neck', 'Head': 'HeadTop_End', 'RightArm': 'RightForeArm', 'RightForeArm': 'RightHand', 'RightHand': 'RightHandMiddle1',
         'LeftArm': 'LeftForeArm', 'LeftForeArm': 'LeftHand', 'LeftHand': 'LeftHandMiddle1', 'RightUpLeg': 'RightLeg', 'RightLeg': 'RightFoot', 'RightFoot': 'RightToeBase',
         'LeftUpLeg': 'LeftLeg', 'LeftLeg': 'LeftFoot', 'LeftFoot': 'LeftToeBase'}
FOOT = Vector((0, -.42, .91)).normalized()
CANON = {b: Vector((0, 1, 0)) for b in ('hips', 'spine', 'head')}
CANON.update({b: Vector((0, -1, 0)) for b in ('shR', 'elR', 'handR', 'shL', 'elL', 'handL', 'hipR', 'kneeR', 'hipL', 'kneeL')})
CANON.update({'ankR': FOOT, 'ankL': FOOT})
# blender world -> game coords, mirrored in x:  (x, y, z) -> (-x, z, -y)
TM = Matrix(((-1, 0, 0), (0, 0, 1), (0, -1, 0)))
def to_game_rot(R3): return TM @ R3 @ TM.inverted()
def to_game_vec(v): return TM @ v

CLIPS = {   # name: (file, frame range or None, playback speed, root-motion share)
    'idle': ('Unarmed_Idle_01.fbx', None, 1.0, 0.0),
    'slash': ('Sword_And_Shield_Slash.fbx', None, 1.0, 0.3),
    'combo': ('Sword_Fight_One.fbx', None, 1.0, 0.25),
}

def process(name, fn, rng, speed, rootk):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=os.path.join(SRC, fn))
    arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]; act = arm.animation_data.action; sc = bpy.context.scene
    pref = 'mixamorig:'
    MW = arm.matrix_world
    def rest_world(bn):
        b = arm.data.bones[pref + bn]; m = MW @ b.matrix_local; return m.to_3x3().normalized(), (MW @ b.head_local)
    def pose_world(bn):
        pb = arm.pose.bones[pref + bn]; m = MW @ pb.matrix; return m.to_3x3().normalized(), m.translation.copy()
    # rest frames + canonical alignment C_b (minimal arc canonical -> mixamo rest bone direction)
    A, Cb = {}, {}
    for b, mb in MAP.items():
        R, h = rest_world(mb); A[b] = to_game_rot(R)
        tail = MW @ arm.data.bones[pref + CHILD[mb]].head_local
        a_dir = to_game_vec(tail - h).normalized()
        Cb[b] = CANON[b].rotation_difference(a_dir).to_matrix()
    side = to_game_vec(rest_world('RightArm')[1]); print(name, 'mirrored RightArm rest x =', round(side.x, 3))
    hip0 = to_game_vec(rest_world('Hips')[1]); foot0 = to_game_vec(rest_world('RightFoot')[1])
    hipH = hip0.y - min(foot0.y, to_game_vec(rest_world('LeftFoot')[1]).y) + .07
    f0, f1 = (int(act.frame_range[0]), int(act.frame_range[1])) if not rng else rng
    frames = list(range(f0, f1 + 1))
    Q, H, HAND = [], [], []
    for f in frames:
        sc.frame_set(f)
        W = {}
        for b, mb in MAP.items():
            Rw, _ = pose_world(mb); Bk = to_game_rot(Rw); D = Bk @ A[b].transposed(); W[b] = D @ Cb[b]
        row = []
        for b in BONES:
            pw = W[PARENT[b]] if PARENT[b] else Matrix.Identity(3)
            q = (pw.transposed() @ W[b]).to_quaternion(); row.append(q)
        Q.append(row)
        hp = to_game_vec(pose_world('Hips')[1]) - hip0; H.append(hp / hipH)
        HAND.append(to_game_vec(pose_world('RightHand')[1]))
    # quaternion sign continuity per joint
    for j in range(len(BONES)):
        for i in range(1, len(Q)):
            if Q[i][j].dot(Q[i - 1][j]) < 0: Q[i][j] = -Q[i][j]
    # root motion: keep only a share of the horizontal travel, relative to the first frame (loops: centred)
    H = np.array([list(h) for h in H])
    if rootk == 0: H[:, 0] -= H[:, 0].mean(); H[:, 2] -= H[:, 2].mean()
    else: H[:, 0] = (H[:, 0] - H[0, 0]) * rootk; H[:, 2] = (H[:, 2] - H[0, 2]) * rootk
    # strikes: peaks of the weapon-hand speed
    P = np.array([list(p) for p in HAND]); sp = np.r_[0, np.linalg.norm(np.diff(P, axis=0), axis=1)] * 30
    peaks = [i for i in range(2, len(sp) - 2) if sp[i] > 2.2 and sp[i] == sp[i - 2:i + 3].max()]
    strikes = [round(i / (len(frames) - 1), 4) for i in peaks]
    qa = np.array([[[q.x, q.y, q.z, q.w] for q in row] for row in Q], np.float32)
    def b64(fmt, arr): return base64.b64encode(struct.pack('<%d%s' % (len(arr), fmt), *arr)).decode()
    print(name, 'frames', len(frames), 'hipH', round(hipH, 3), 'strikes', strikes, 'max hand speed', round(float(sp.max()), 2))
    return {'fps': 30 * speed, 'n': len(frames), 'q': b64('h', [int(round(x * 32767)) for x in qa.reshape(-1)]), 'h': b64('h', [int(round(x * 10000)) for x in H.reshape(-1)]), 'strikes': strikes}

out = {'bones': BONES}
for name, (fn, rng, speed, rootk) in CLIPS.items(): out[name] = process(name, fn, rng, speed, rootk)
json.dump(out, open(OUT, 'w'), separators=(',', ':'))
print('saved', OUT, os.path.getsize(OUT) // 1024, 'KB')
