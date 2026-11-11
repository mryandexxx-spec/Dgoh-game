// Young Baron's authored rig: additive motion over the four source GLB clips.
import { ANIM3, seg } from './pose-duncan.js';
import { B3 } from '../base.js';
import './pose-legend-baron.js'; // BH6: separate legend profile; ANIM3.baron unchanged

ANIM3.baron = {
  dur: key => ({ basic: 900, special: 1100, ult: 1250 })[key] || null,
  hit: key => key === 'basic' ? .4 : null,
  clipPose: poseBaron,
};

function poseBaron(o, now, t, sp, clip, u, stage) {
  o.root._motion = clip;
  if (clip === 'Death') return; // Preserve the grounded source death adaptation.
  const scratch = o._baronQ || (o._baronQ = new B3.Quaternion());
  const add = o._baronAdd || (o._baronAdd = (node, x = 0, y = 0, z = 0) => {
    if (!node || !node.rotationQuaternion) return;
    B3.Quaternion.RotationYawPitchRollToRef(y, x, z, scratch);
    node.rotationQuaternion.multiplyInPlace(scratch).normalize();
  });
  const phase = o.phase || 0, breath = Math.sin(t * 1.7 + phase);
  // A relaxed stance, visible breathing and a slow glance rather than bind pose.
  add(o.spine, .025 * breath, .035 * Math.sin(t * .6 + phase));
  add(o.head, -.025 + .02 * breath, .13 * Math.sin(t * .45 + phase));
  add(o.R.sh, -.06 + .025 * breath, 0, .12);
  add(o.Lf.sh, -.04 - .025 * breath, 0, -.12);
  add(o.R.el, -.22); add(o.Lf.el, -.18);
  if (clip === 'Idle' && stage?.showcase) {
    // A short, periodic glove/cuff adjustment, followed by a return to rest.
    const k = ((t + phase) % 9) / 2.6;
    const w = seg(k, 0, .25) * (1 - seg(k, .7, 1));
    if (w > 0) {
      o.root._motion = 'Showcase';
      add(o.Lf.sh, -.65 * w, -.2 * w, .35 * w);
      add(o.Lf.el, -1.05 * w); add(o.Lf.hand, .1 * w, 0, -.3 * w);
      add(o.head, .12 * w, .35 * w);
    }
  } else if (clip === 'Attack') {
    const a = o.act;
    const key = a?.key || (a?.ab && a.ab === o.def?.special ? 'special' : a?.ab && a.ab === o.def?.ult ? 'ult' : 'basic');
    o.root._motion = key;
    const w = seg(u, 0, .24) * (1 - seg(u, .65, 1));
    if (key === 'basic') {
      // Poison needle: aim the right wrist, snap forward at the existing hit.
      add(o.R.sh, -.2 * w); add(o.R.el, .5 * w);
      add(o.R.hand, .12 * w, 0, -.12 * w);
      add(o.Lf.el, -.25 * w); add(o.spine, .06 * w);
    } else if (key === 'special') {
      // Web of intrigues: open the left hand to sweep the enemy formation.
      add(o.R.sh, .3 * w, 0, -.3 * w);
      add(o.Lf.sh, -1.05 * w, .25 * w, -.35 * w);
      add(o.Lf.el, -.65 * w); add(o.Lf.hand, 0, .35 * w, -.25 * w);
      add(o.spine, 0, -.16 * w);
    } else {
      // Baron's trap: raise both arms, then close the command with a downbeat.
      const command = seg(u, .25, .4) * (1 - seg(u, .55, .8));
      add(o.R.sh, -.65 * w, 0, -.25 * w);
      add(o.Lf.sh, -1.45 * w + .3 * command, 0, .2 * w);
      add(o.Lf.el, -.6 * w); add(o.R.el, -.2 * w);
      add(o.head, .1 * command); add(o.spine, .09 * command);
    }
    if (o.capeB) for (let i = 0; i < o.capeB.length; i++) add(o.capeB[i], Math.sin(u * Math.PI * 2 - i * .35) * .035 * w);
  } else if (clip === 'Hit') {
    const w = Math.sin(u * Math.PI);
    add(o.head, -.1 * w); add(o.R.el, -.2 * w); add(o.Lf.el, -.2 * w);
  }
}

export { poseBaron };
