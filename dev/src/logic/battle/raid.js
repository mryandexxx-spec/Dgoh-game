// logic/battle/raid.js — строки 584–622 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './turns.js'; // порядок исполнения
import { ev, hit, kill, living, log } from './engine.js';
import { MOVES, PHASES, phaseOf } from '../../data/boss.js';
import { dunShielded } from './skills.js';

// ---- raid boss ----
function wormFrenzy(B) {
  B.rhythm = 0;
  const w = B.units.find(x => x.def.boss && x.alive); if (!w) return;
  w.frenzy = 1; w.tm = 999;
  log(B, 'Ритм шагов привёл червя в бешенство: он бросается вне очереди.', 'worm'); B.flash = 'worm';
}
function bossPlan(B, u) {
  const ph = phaseOf(u.hp / u.maxHp), n = u.bossTurns;
  const move = ph === 1 ? (n % 3 === 2 ? 'wave' : 'bite') : ph === 2 ? (n % 2 === 1 ? 'bite' : 'storm') : ph === 3 ? 'devour' : 'rage';
  let target = null;
  if (move === 'bite' || move === 'devour') {
    let ts = living(B, 'A'); const vis = ts.filter(t => !t.fx.stealth); if (vis.length) ts = vis;
    { const np = ts.filter(x => !dunShielded(B, x)); if (np.length) ts = np; }
    const low = move === 'devour' ? ts.filter(t => t.hp / t.maxHp < .4) : [];
    if (low.length) ts = low;
    else { const tt = ts.filter(t => t.fx.taunt); if (tt.length) ts = tt; else { const sh = ts.filter(t => t.shield > 0); if (sh.length) ts = sh; } }
    target = ts.slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.idx - b.idx)[0] || null;
  }
  return { move, target, ph };
}
function bossTurn(B, u) {
  const p = bossPlan(B, u);
  if (p.ph !== u.phase) { u.phase = p.ph; log(B, `Фаза ${p.ph}: ${PHASES[p.ph]}.`, 'worm'); B.flash = 'worm'; }
  u.bossTurns++;
  let m = 1 + .2 * u.bossTurns + (p.ph === 4 ? .1 * u.bossTurns : 0);
  if (u.frenzy) { m *= 1.5; u.frenzy = 0; }
  log(B, `${u.def.sn}: «${MOVES[p.move]}»`, 'actB');
  const team = () => living(B, 'A');
  if (p.move === 'bite' && p.target) hit(B, u, p.target, 'blade', 1.3 * m);
  else if (p.move === 'wave') { for (const t of team()) { if (hit(B, u, t, 'blade', .55 * m)) t.tm = Math.max(0, t.tm - 150); } }
  else if (p.move === 'storm') { for (const t of team()) { delete t.fx.stealth; hit(B, u, t, 'blade', .5 * m); } }
  else if (p.move === 'devour' && p.target) {
    const t = p.target;
    if (t.hp / t.maxHp < .4) { log(B, `Шаи-Хулуд поглощает ${t.def.sn}!`, 'death'); ev(B, t, 'ПОГЛОЩЁН', 'crit'); B.flash = 'worm'; kill(B, t, u); }
    else hit(B, u, t, 'blade', 1.7 * m);
  } else if (p.move === 'rage') { for (const t of team()) hit(B, u, t, 'blade', .8 * m); }
}


export { wormFrenzy, bossPlan, bossTurn };
