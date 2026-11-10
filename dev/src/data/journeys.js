// data/journeys.js — строки 3023–3056 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { prog } from '../logic/progress.js';
import { S } from '../core/state.js';
import { MAX_GEAR } from '../logic/economy.js';
import './glyphs.js'; // порядок исполнения

const JOURNEYS = {
 muaddib: {
  t: "Путь Муад'Диба", scenes: ['canyon', 'cave', 'sietch', 'harvester', 'dawn'],
  req: ['paul', 'jessica', 'gurney', 'stilgar', 'chani', 'kynes'],
  tiers: [
    { n: 'Бегство в глубокую пустыню', stars: 2, lvl: 8, el: 8, desert: true, enemy: ['rabban', 'trooper', 'trooper', 'trooper'], sh: 20 },
    { n: 'Сиетч Табр: вызов Джамиса', stars: 3, lvl: 12, el: 12, desert: true, enemy: ['stilgar', 'fedaykin', 'chani', 'fedaykin'], sh: 40 },
    { n: 'Вода жизни', stars: 4, lvl: 16, el: 12, enemy: ['mohiam', 'piter', 'feyd', 'legion', 'bashar'], sh: 60 },
    { n: 'Наездник червя', stars: 5, lvl: 20, el: 15, desert: true, enemy: ['baron', 'feyd', 'rabban', 'piter', 'trooper'], sh: 90 },
    { n: 'Буря над Арракином', stars: 6, lvl: 26, el: 24, desert: true, enemy: ['shaddam', 'fenring', 'bashar', 'legion', 'mohiam'], sh: 120 },
  ],
 },
};
// Legend requirements: all six heroes of the path at 7★ and gear V; relic levels grow tier by tier up to the targets below
const JREQ = { muaddib: { paul: 5, jessica: 5, stilgar: 4, chani: 4, gurney: 3, kynes: 3 } };
for (const J of Object.values(JOURNEYS)) J.tiers.forEach((t, i) => { t.el = [70, 75, 80, 85, 85][i]; t.lvl = t.el; t.erl = [2, 3, 4, 6, 7][i]; t.epow = [1.05, 1.1, 1.15, 1.2, 1.3][i]; });
const jRelic = (k, id, t) => Math.ceil(((JREQ[k] || {})[id] || 0) * t / 4);
const jHeroOk = (k, id, t) => { const p = prog(id); return p.stars >= 7 && p.gear >= MAX_GEAR && (p.relic || 0) >= jRelic(k, id, t); };
const jReady = (k, t) => k === 'muaddib' && t >= 3
  ? JOURNEYS[k].req.filter(id => jHeroOk(k, id, t)).length >= 4
  : JOURNEYS[k].req.every(id => jHeroOk(k, id, t));
const jSelectedReady = (k, t, ids) => k === 'muaddib' && t >= 3
  ? ids.length === 4 && new Set(ids).size === 4 && ids.every(id => JOURNEYS[k].req.includes(id) && jHeroOk(k, id, t))
  : jReady(k, t);
const jFoes = (k, i) => { const t = JOURNEYS[k].tiers[i]; return t.enemy.map(id => ({ id, lvl: t.el, stars: 7, gear: 13, relic: t.erl, pow: t.epow })); };
const JK = () => JOURNEYS[S.jKey] ? S.jKey : 'muaddib';
const JR = () => JOURNEYS[JK()];
const JP = () => (S.journeys[JK()] ??= {});

export { JOURNEYS, JREQ, jRelic, jHeroOk, jReady, jSelectedReady, jFoes, JK, JR, JP };
