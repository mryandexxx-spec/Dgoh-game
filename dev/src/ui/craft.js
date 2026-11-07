// ui/craft.js — строки 5105–5117 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './mouse.js'; // порядок исполнения
import { slotState } from './overlays/detail.js';
import { openDetail } from './hero-card.js';
import { render } from './router.js';
import { toast } from './common.js';
import { prog } from '../logic/progress.js';
import { S } from '../core/state.js';
import { persist } from '../core/save.js';
import { CRAFT, FRAG_NEED } from '../logic/gear.js';
import { CH } from '../data/chars.js';
import { quest } from '../logic/daily.js';

// ===================== craft & equip everything =====================
function craftAllPlan(cid) {
  const p = prog(cid); if (!p.stars) return [];
  let sol = S.solari, pl = S.plast; const inv = { ...S.inv }, out = [];
  for (let k = 0; k < 6; k++) { if (p.eq[k]) continue; const s = slotState(cid, k), c = CRAFT(s.it.t); if ((inv[s.it.id] || 0) >= s.need && sol >= c.sol && pl >= c.pl) { inv[s.it.id] -= s.need; sol -= c.sol; pl -= c.pl; out.push({ k, it: s.it, c }); } }
  return out;
}
function craftAll(cid) {
  const plan = craftAllPlan(cid), p = prog(cid); if (!plan.length) return;
  for (const { k, it, c } of plan) { S.inv[it.id] -= FRAG_NEED[it.t]; S.solari -= c.sol; S.plast -= c.pl; p.eq[k] = true; quest('craft'); }
  persist(); toast(`${CH[cid].sn}: надето ${plan.length} — ${plan.map(x => x.it.n).join(', ')}`); render(); openDetail(cid);
}


export { craftAllPlan, craftAll };
