#!/usr/bin/env python3
"""Apply source integration against the Dune GoH main branch.
Run from repository root after copying package's dev/ paths:
python dev/tools/install-duncan-meshy.py
Stops on code drift; does not deploy and does not touch game mechanics.
"""
from pathlib import Path
r=Path('dev/src')
def change(path,old,new):
 p=r/path
 s=p.read_text()
 if new in s:
  print('Already patched:',p);return
 if s.count(old)!=1:raise RuntimeError(f'Patch target missing or ambiguous ({s.count(old)}): {p}')
 p.write_text(s.replace(old,new))
 print('Patched:',p)
# Load new asset in the same readiness barrier, keep the existing model as fallback if it is not installed.
change(Path('assets/models.js'),
 "...['duncan', 'worm', ...(assetUrl('models/young-baron.dgm') ? ['young-baron'] : []), ...(assetUrl('models/baron-legend-mobile.dgm') ? ['baron-legend-mobile'] : [])].map(id => assetBytes(`models/${id}.dgm`).then(b => { MODEL_DATA[id === 'young-baron' ? 'baron' : id === 'baron-legend-mobile' ? 'baron_legend' : id] = parseDgm(b); })),",
 "...['duncan', 'worm', ...(assetUrl('models/young-baron.dgm') ? ['young-baron'] : []), ...(assetUrl('models/baron-legend-mobile.dgm') ? ['baron-legend-mobile'] : [])].map(id => assetBytes(id === 'duncan' && assetUrl('models/duncan-meshy.dgm') ? 'models/duncan-meshy.dgm' : `models/${id}.dgm`).then(b => { MODEL_DATA[id === 'young-baron' ? 'baron' : id === 'baron-legend-mobile' ? 'baron_legend' : id] = parseDgm(b); })),")
# Duncan has a 66-bone Meshy rest pose, incompatible with the older procedural Duncan animator.
# Existing procedural animation continues to work for old DGM and as load failure fallback.
change(Path('render3d/characters/pose-generic.js'),
 "  if (o.anim && o.anim.pose) return o.anim.pose(A, o, now, t, sp);",
 """  if (o.root._clips && o.def?.id === 'duncan') {
    // The v5 Meshy rig has its own rest pose: never run the legacy Duncan
    // procedural pose over its local TRS quaternions.
    const a = o.act;
    o.root.position.copyFrom(o.base);
    o.root.rotation.y = o.face;
    if (a && !o.dead && (a.kind === 'melee' || a.kind === 'aoe')) {
      const k = Math.min(1, Math.max(0, (now - a.t0) / a.dur));
      const face = Math.atan2(a.dir.x, a.dir.z);
      const travel = k < .26 ? ease(k / .26) : k > .7 ? 1 - ease((k - .7) / .3) : 1;
      B3.Vector3.LerpToRef(o.base, a.to, travel, o.root.position);
      o.root.rotation.y = face;
      if (!a.fx && k > .5) { a.fx = 1; A.slashFX(a.to.add(a.dir.scale(.8)), face, a.kind === 'aoe'); }
    }
    if (a && !o.dead && a.kind === 'cast' && !a.fx && now - a.t0 > a.dur * .3) {
      a.fx = 1; A.castFX(o);
    }
    poseModelClip(o, now, t, sp, A);
    return;
  }
  if (o.anim && o.anim.pose) return o.anim.pose(A, o, now, t, sp);""")
# Override default local-trs clip names only for Duncan; do not change other heroes.
change(Path('render3d/characters/authored.js'),
 "    root._clipRest = Object.fromEntries(D.joints.map(([nm, p, , q, scale]) =>",
 """    if (def.id === 'duncan') root._clipNames = {
      Idle: 'Combat_Stance', Attack: 'Double_Combo_Attack',
      special: 'Sword_Parry_Backward', ult: 'Triple_Combo_Attack',
      Hit: 'Hit_Reaction', Death: 'Dead', Revive: 'Stand_Up10',
      Showcase: 'Lower_Weapon_Look_Raise'
    };
    root._clipRest = Object.fromEntries(D.joints.map(([nm, p, , q, scale]) =>""")
# Without this branch, a revived model instantly goes from death to idle.
change(Path('render3d/characters/authored.js'),
 "  if (o.dead && now >= o.deathT) { name = 'Death'; u = Math.min(1, (now - o.deathT) / 950); }",
 """  if (o.dead && now >= o.deathT) { name = 'Death'; u = Math.min(1, (now - o.deathT) / 950); }
  else if (names.Revive && o.rise && now >= o.rise && now - o.rise < 1300) {
    name = 'Revive'; u = Math.min(1, (now - o.rise) / 1300);
  }""")
# Source Duncan remains a special case: stage uses showcase clip instead of combat stance.
change(Path('render3d/characters/authored.js'),
 "  const clipName = names[name] || name, clip = clips[clipName]; if (!clip) return;",
 """  if (name === 'Idle' && names.Showcase && stage?.showcase) name = 'Showcase';
  const clipName = names[name] || name, clip = clips[clipName]; if (!clip) return;""")
print('Ready for local build+golden+3d smoke. No changes to abilities or battle logic.')
