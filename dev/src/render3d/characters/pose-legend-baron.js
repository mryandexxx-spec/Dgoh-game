// BH6: original clipless motion for the NEW legendary Baron only.
// The supplied 18-bone mobile DGM has no clips. Babylon's generic rig pose
// establishes the baseline; this profile adds distinct command gestures.
// No new render loop or GPU resources. Young Baron remains ANIM3.baron.
import { ANIM3, seg } from './pose-duncan.js';

const clamp = x => Math.max(0, Math.min(1, x));
const bell = (u, a, b, c, d) => seg(u, a, b) * (1 - seg(u, c, d));
const MOTION = Object.freeze({ basic: 'Приказ Барона', special: 'Власть через страх', ult: 'Глаза императора', gl: 'Падение Атрейдесов' });
const DUR = Object.freeze({ basic: 1000, special: 1350, ult: 1550, gl: 2350 });

// Invoked AFTER generic poseHuman on clipless authored rigs.
// Deliberately additive: neither overwrites nor mimics young Baron's clipPose.
function poseLegendBaron(o, now, t, sp, stage) {
  if (o.def?.id !== 'baron_legend') return;
  const phase = o.phase || 0;
  const add = (n, x = 0, y = 0, z = 0) => {
    if (!n) return;
    n.rotation.x += x; n.rotation.y += y; n.rotation.z += z;
  };
  const alive = !o.dead;
  const pulse = Math.sin(t * 1.12 + phase);
  o.root._motion = 'Idle';
  if (alive) {
    add(o.spine, .018 * pulse, .035 * Math.sin(t * .41 + phase));
    add(o.head, -.035 + .012 * pulse, .1 * Math.sin(t * .32 + phase));
    add(o.R.sh, -.12, 0, .11);
    add(o.Lf.sh, -.14, 0, -.1);
    add(o.R.el, -.21); add(o.Lf.el, -.18);
  }
  if (alive && stage?.showcase && !o.act) {
    const u = ((t + phase) % 10) / 3;
    const w = bell(u, .05, .19, .7, .93);
    if (w > 0) {
      o.root._motion = 'Showcase';
      add(o.Lf.sh, -.44 * w, -.12 * w, -.2 * w);
      add(o.Lf.el, -.4 * w);
      add(o.head, .08 * w, -.28 * w);
    }
  }
  if (alive && o.act) {
    const a = o.act;
    const key = ['basic', 'special', 'ult', 'gl'].includes(a.key) ? a.key : 'basic';
    const u = clamp((now - a.t0) / Math.max(1, a.dur));
    const w = bell(u, .07, .25, .68, .95);
    const strike = bell(u, .3, .44, .65, .82);
    o.root._motion = key;
    if (key === 'basic') {
      // A short, sharp order; allied Harkonnen performs the actual strike.
      add(o.R.sh, -.5 * w, -.2 * w, -.14 * w);
      add(o.R.el, .36 * w); add(o.R.hand, -.17 * w, .2 * w);
      add(o.head, .12 * strike); add(o.spine, -.07 * strike);
    } else if (key === 'special') {
      // Open arms and spread Horror over the enemy formation.
      add(o.R.sh, -.87 * w, .19 * w, -.28 * w);
      add(o.Lf.sh, -.93 * w, -.21 * w, .28 * w);
      add(o.R.el, -.44 * w); add(o.Lf.el, -.42 * w);
      add(o.spine, -.15 * w, -.09 * strike);
      add(o.head, .12 * w);
    } else if (key === 'ult') {
      // Eyes of the Emperor: indicate a target, then give a decisive signal.
      add(o.R.sh, -.96 * w, -.24 * w, -.18 * w);
      add(o.R.el, .53 * w);
      add(o.R.hand, -.34 * strike, .2 * w);
      add(o.Lf.sh, -.38 * w); add(o.Lf.el, -.25 * w);
      add(o.head, -.1 * w, -.22 * strike);
      add(o.spine, .1 * strike);
    } else {
      // GL concept: rising stance/arms only. Levitation chair, Sardaukar
      // strike and scene/camera effects require separate visual approval.
      const rise = bell(u, .08, .29, .78, .98);
      add(o.R.sh, -1.07 * rise, 0, -.27 * rise);
      add(o.Lf.sh, -1.07 * rise, 0, .27 * rise);
      add(o.R.el, -.31 * rise); add(o.Lf.el, -.31 * rise);
      add(o.spine, -.19 * rise);
      add(o.head, .17 * strike);
    }
    if (o.capeB) for (let i=0;i<o.capeB.length;i++)
      add(o.capeB[i], Math.sin(u * Math.PI * 2 - i * .48) * .1 * w);
  } else if (alive && o.hitT && now >= o.hitT) {
    const u = (now - o.hitT) / (340 / Math.min(sp || 1, 2));
    if (u < 1) {
      const w = Math.sin(Math.max(0,u) * Math.PI);
      o.root._motion = 'Hit';
      add(o.head, -.2 * w);
      add(o.R.sh, .15 * w); add(o.Lf.sh, .15 * w);
      add(o.spine, -.1 * w);
    }
  }
  if (o.dead && now >= o.deathT) o.root._motion = 'Death';
}

ANIM3.baron_legend = {
  dur: key => DUR[key] || null,
  hit: key => ({ basic:.44, special:.54, ult:.62, gl:.74 })[key] ?? null,
  wait: key => DUR[key] ? DUR[key] + 120 : 0,
  cliplessPose: poseLegendBaron,
};

export { poseLegendBaron, MOTION, DUR };
