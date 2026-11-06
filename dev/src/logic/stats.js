// logic/stats.js — строки 4810–4825 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../ui/views/trials.js'; // порядок исполнения
import { prog } from './progress.js';
import { S } from '../core/state.js';
import { ROSTER_IDS } from './economy.js';
import { campNodes } from '../data/campaigns.js';
import { CH } from '../data/chars.js';
import { TRIALS, TRIAL_LVL, trialStars } from './trials.js';

// ===================== stats =====================
function statInc(k, n = 1) { S.stats[k] = (S.stats[k] || 0) + n; }
const campStarsOf = ck => campNodes(ck).reduce((a, i) => a + (S.cleared[i] || 0), 0);
const METRIC = {
  starsL: () => campStarsOf('L'), starsD: () => campStarsOf('D'), starsC: () => campStarsOf('C'),
  raidDmg: () => S.stats.raidDmg || 0, raidKills: () => S.stats.raidKills || 0, wins: () => S.stats.wins || 0,
  legend: () => ROSTER_IDS.filter(id => CH[id].legendary).reduce((a, id) => a + (prog(id).stars ? 1 : 0) + (prog(id).stars >= 7 ? 1 : 0), 0),
  stars7: () => ROSTER_IDS.filter(id => prog(id).stars >= 7).length,
  trials3: () => TRIALS.reduce((a, T) => a + TRIAL_LVL.filter((x, t) => trialStars(T, t) === 3).length, 0),
  gl: () => S.stats.gl || 0, devour: () => S.stats.devour || 0,
  skill7: () => ROSTER_IDS.reduce((a, id) => a + Object.values(prog(id).sk || {}).filter(v => v >= 7).length, 0),
  days: () => S.stats.days || 0,
  cqMax: () => S.stats.cqMax || 0, cqLeg: () => S.stats.cqLeg || 0,
  cqHero: () => ROSTER_IDS.filter(id => (CH[id].conquest || ['robot', 'cymek'].includes(id)) && prog(id).stars).length,
};


export { statInc, campStarsOf, METRIC };
