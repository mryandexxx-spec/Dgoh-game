// logic/battle/ai.js — строки 623–653 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { bossPlan } from './raid.js';
import { act, endTurn, startTurn } from './turns.js';
import { abilityReady, createBattle, living, nextActor, previewOrder, validTargets } from './engine.js';
import { unitPower, unitStats } from './stats.js';
import { MOVES, PHASES, RAID_TIERS, WORM } from '../../data/boss.js';
import { SK_KEYS, autoSk, leadBonus, pasMult, skMax, skMult } from './skills.js';
import { CH, CHARS } from '../../data/chars.js';
import { DT, FACTIONS, FX, ROLES } from '../../data/fx.js';

// ---- AI ----
function aiPlan(B, u) {
  if (u.def.boss) { const p = bossPlan(B, u); return { key: 'basic', target: p.target, move: p.move }; }
  const allies = living(B, u.side);
  let key = 'basic';
  const want = sp => {
    if (sp.heal) return allies.some(a => a.hp / a.maxHp < .7) || allies.some(a => a.fx.poison || a.fx.fear);
    if (sp.tgt === 'self') return !(sp.fx || []).some(([k]) => u.fx[k]) || (sp.shieldSelf && u.shield < u.maxShield * .5);
    if (sp.dt === 'laser') return validTargets(B, u, sp).some(t => t.shield <= 0);
    return true;
  };
  if (abilityReady(B, u, 'gl')) return { key: 'gl', target: null };
  for (const k of ['ult', 'special']) if (u.def[k] && abilityReady(B, u, k) && want(u.def[k])) { key = k; break; }
  const ab = u.def[key];
  let target = null;
  if (ab.tgt === 'enemy') {
    let vt = validTargets(B, u, ab);
    if (ab.dt === 'laser') { const ns = vt.filter(t => t.shield <= 0); if (ns.length) vt = ns; }
    if (ab.execute) { const ex = vt.filter(t => t.hp / t.maxHp < ab.execute); if (ex.length) vt = ex; }
    const score = t => (t.hp + (ab.dt === 'voice' || ab.dt === 'poison' ? 0 : t.shield)) / (t.maxHp + t.maxShield);
    target = vt.slice().sort((a, b) => score(a) - score(b) || a.idx - b.idx)[0] || null;
  }
  return { key, target };
}
function computeIntents(B) {
  for (const u of living(B)) { const p = aiPlan(B, u); u.intent = { key: p.key, target: p.target ? p.target.uid : null, move: p.move }; }
}
const hasPrescience = (B, side) => living(B, side).some(u => u.def.prescience);

if (typeof module !== 'undefined') module.exports = { SK_KEYS, skMax, autoSk, skMult, pasMult, leadBonus, CHARS, CH, FACTIONS, ROLES, FX, DT, createBattle, nextActor, startTurn, act, endTurn, aiPlan, living, validTargets, abilityReady, unitPower, unitStats, previewOrder, hasPrescience, RAID_TIERS, MOVES, PHASES, WORM };


export { aiPlan, computeIntents, hasPrescience };
