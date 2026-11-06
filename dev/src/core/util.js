// core/util.js — строки 3210–3233 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { SPOT_ICONS } from '../ui/views/lobby.js';
import { quest } from '../ui/views/daily.js';
import { S, tickWater } from './state.js';
import { fc } from './save.js';
import { CMAX, WMAX, enemyProg } from '../logic/economy.js';
import { CAMP_DEF, NODES } from '../data/campaigns.js';
import { figureSVG } from '../render2d/figures.js';
import { unitPower } from '../logic/battle/stats.js';
import { CH } from '../data/chars.js';

const $ = s => document.querySelector(s);
const LAND_MQ = typeof matchMedia !== 'undefined' ? matchMedia('(orientation: landscape) and (max-height: 520px)') : null;
const isLandPhone = () => !!(LAND_MQ && LAND_MQ.matches);
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
const starStr = (n, max = 7) => '★'.repeat(n) + `<i>${'★'.repeat(max - n)}</i>`;
const glyph = (def, extra = '') => def.boss ? `<span class="gl ${extra}" style="--fc:var(--worm);color:var(--worm)" aria-hidden="true"><svg viewBox="0 0 24 24">${SPOT_ICONS.worm}</svg></span>` : `<span class="gl face ${extra}" style="--fc:${fc(def)}" aria-hidden="true">${figureSVG(def)}</span>`;

// perf step 13: repeats of the same error are counted in memory; localStorage is written at most once per 5 s per error, console.warn only for the first 3

export { $, LAND_MQ, isLandPhone, EN_MAX, enGet, enSpend, enRefund, campSquad, sideOk, NODE_REQ, REQ_FN, reqFacOk, reqMissing, reqText, getRes, prog, squadPower, nodePower, starStr, glyph };
