// logic/progress.js — бывший core/util (строки 3210–3233 монолита); в фазе 3a из него вынесены dom, rng, daily, glyph. Правится вручную.
import '../core/rng.js'; // порядок исполнения
import { S, tickWater } from '../core/state.js';
import { CMAX, ROSTER_IDS, WMAX, enemyProg } from './economy.js';
import { CAMP_DEF, NODES } from '../data/campaigns.js';
import { unitPower } from './battle/stats.js';
import { CH } from '../data/chars.js';
import { quest } from './daily.js';

const EN_MAX = { get water() { return WMAX(); }, get candle() { return CMAX(); } };
const enGet = k => k === 'candle' ? S.candle : S.water;
function enSpend(k, n) { tickWater(); const key = k === 'candle' ? 'candle' : 'water', ts = key + 'Ts'; if (S[key] >= EN_MAX[key]) S[ts] = Date.now(); S[key] -= n; if (key === 'water') quest('water', n); }
function enRefund(k, n) { const key = k === 'candle' ? 'candle' : 'water'; S[key] = Math.min(EN_MAX[key], S[key] + n); if (key === 'water') quest('water', -n); }
const campSquad = i => { const c = NODES[i].camp; return c === 'D' ? S.squadD : c === 'C' ? S.squadC : S.squad; };
const sideOk = (ck, id) => { const s = CAMP_DEF[ck].side; return s === 'all' || CH[id].side === s; };
const NODE_REQ = n => { if (!n || n.camp !== 'C') return null; const m = n.m + 1;
  if (n.c === 1) { if ([1, 2, 3, 4, 7].includes(m)) return { need: ['gurney'] }; if (m === 5) return { need: ['piter'], f: 'hark' }; if (m === 9) return { need: ['gurney'], f: 'atr' }; }
  if (n.c === 2) return { f: 'cor' }; return null; };
const REQ_FN = { atr: 'Атрейдесы', hark: 'Харконнены', cor: 'Коррино' };
const reqFacOk = (i, id) => { const r = NODE_REQ(NODES[i]); return !r || !r.f || CH[id].f.includes(r.f); };
const reqMissing = (i, a) => { const r = NODE_REQ(NODES[i]); return r && r.need ? r.need.filter(id => !a.includes(id)) : []; };
const reqText = i => { const r = NODE_REQ(NODES[i]); if (!r) return ''; const p = []; if (r.need) p.push('Обязательно: ' + r.need.map(id => CH[id].sn).join(', ')); if (r.f) p.push('Только ' + REQ_FN[r.f]); return p.join(' · '); };
const getRes = k => k === 'sol' ? S.solari : k === 'pl' ? S.plast : k === 'water' ? S.water : (S[k] || 0);
const prog = id => S.roster[id];
const squadPower = () => S.squad.reduce((a, id) => a + unitPower(CH[id], prog(id)), 0);
const nodePower = n => n.enemy.reduce((a, id) => a + unitPower(CH[id], enemyProg(id, n.lvl, n.m === 9)), 0);

const unlockedIds = () => ROSTER_IDS.filter(id => prog(id).stars > 0);

// perf step 13: repeats of the same error are counted in memory; localStorage is written at most once per 5 s per error, console.warn only for the first 3


export { EN_MAX, enGet, enSpend, enRefund, campSquad, sideOk, NODE_REQ, REQ_FN, reqFacOk, reqMissing, reqText, getRes, prog, squadPower, nodePower, unlockedIds };
