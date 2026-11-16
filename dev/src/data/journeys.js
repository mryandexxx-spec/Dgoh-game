// data/journeys.js — строки 3023–3056 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { MAX_GEAR } from './gear-cap.js';
import './glyphs.js'; // порядок исполнения

const JOURNEYS = {
 muaddib: {
  t: "Путь Муад'Диба", scenes: ['canyon', 'cave', 'sietch', 'harvester', 'dawn'],
  req: ['paul', 'duncan', 'leto', 'jessica', 'gurney', 'stilgar', 'chani', 'kynes', 'mohiam', 'baron', 'shaddam'],
  tiers: [
    { n: 'Бегство в глубокую пустыню', stars: 2, lvl: 8, el: 8, desert: true, enemy: ['rabban', 'trooper', 'trooper', 'trooper'], sh: 20 },
    { n: 'Сиетч Табр: вызов Джамиса', stars: 3, lvl: 12, el: 12, desert: true, enemy: ['stilgar', 'fedaykin', 'chani', 'fedaykin'], sh: 40 },
    { n: 'Вода жизни', stars: 4, lvl: 16, el: 12, enemy: ['mohiam', 'piter', 'feyd', 'legion', 'bashar'], sh: 60 },
    { n: 'Наездник червя', stars: 5, lvl: 20, el: 15, desert: true, enemy: ['baron', 'feyd', 'rabban', 'piter', 'trooper'], sh: 90 },
    { n: 'Буря над Арракином', stars: 6, lvl: 26, el: 24, desert: true, enemy: ['shaddam', 'fenring', 'bashar', 'legion', 'mohiam'], sh: 120 },
  ],
 },
};
// All eleven heroes must reach the target before any Muad'Dib unlock fight. The already unlocked legend is grandfathered.
const JREQ = { muaddib: { paul: 5, duncan: 5, leto: 4, jessica: 5, gurney: 3, stilgar: 4, chani: 4, kynes: 3, mohiam: 4, baron: 3, shaddam: 3 } };
for (const J of Object.values(JOURNEYS)) J.tiers.forEach((t, i) => { t.el = [70, 75, 80, 85, 85][i]; t.lvl = t.el; t.erl = [2, 3, 4, 6, 7][i]; t.epow = [1.05, 1.1, 1.15, 1.2, 1.3][i]; });
const jRelic = (k, id, t) => Math.ceil(((JREQ[k] || {})[id] || 0) * t / 4);
// Compatibility port for unchanged journey consumers, including the locked camp UI.
// State/progress rules live in logic/journey-gates.js and are registered by core/boot.js.
// A missing bootstrap binding is an error; never substitute default progression values.
let journeyRuntime = null;
function bindJourneyRuntime(handlers) {
  if (journeyRuntime) throw new Error('Journey runtime already initialized');
  journeyRuntime = handlers;
}
const journeyCall = (name, ...args) => {
  if (!journeyRuntime) throw new Error('Journey runtime not initialized: ' + name);
  return journeyRuntime[name](...args);
};
const jHeroOk = (k, id, t) => journeyCall('jHeroOk', k, id, t);
const jGateReady = k => journeyCall('jGateReady', k);
const jReady = (k, t) => journeyCall('jReady', k, t);
const jSelectedReady = (k, t, ids) => journeyCall('jSelectedReady', k, t, ids);
const jFoes = (k, i) => { const t = JOURNEYS[k].tiers[i]; return t.enemy.map(id => ({ id, lvl: t.el, stars: 7, gear: 13, relic: t.erl, pow: t.epow })); };
const JK = () => journeyCall('JK');
const JR = () => journeyCall('JR');
const JP = () => journeyCall('JP');

export { bindJourneyRuntime, JOURNEYS, JREQ, jRelic, jHeroOk, jGateReady, jReady, jSelectedReady, jFoes, JK, JR, JP };
