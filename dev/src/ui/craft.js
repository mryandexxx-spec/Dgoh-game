// E3: пакетная сборка использует тот же рецепт, что окно предмета.
// Доступность проверяется на копиях инвентаря и валют.
import './mouse.js'; // порядок исполнения
import { slotState } from './overlays/detail.js';
import { openDetail } from './hero-card.js';
import { render } from './router.js';
import { toast } from './common.js';
import { prog } from '../logic/progress.js';
import { S } from '../core/state.js';
import { persist } from '../core/save.js';
import { craftAndEquip } from '../logic/gear-crafting.js';
import { CH } from '../data/chars.js';
import { quest } from '../logic/daily.js';

function craftAllPlan(cid) {
  const p = prog(cid); if (!p.stars) return [];
  const inv = { ...S.inv }, parts = { ...(S.gearParts || {}) };
  const wallet = { sol: S.solari, pl: S.plast }, out = [];
  for (let k = 0; k < 6; k++) {
    if (p.eq[k]) continue;
    const it = slotState(cid, k).it;
    const result = craftAndEquip(it.id, inv, parts, wallet);
    if (result.ok) out.push({ k, it, steps: result.steps });
  }
  return out;
}
function craftAll(cid) {
  const plan = craftAllPlan(cid), p = prog(cid);
  if (!plan.length) return;
  const wallet = { sol: S.solari, pl: S.plast };
  for (const { k, it } of plan) {
    if (p.eq[k]) continue;
    const result = craftAndEquip(it.id, S.inv, S.gearParts, wallet);
    if (!result.ok) continue;
    p.eq[k] = true;
    quest('craft');
  }
  S.solari = wallet.sol; S.plast = wallet.pl;
  persist(); toast(`${CH[cid].sn}: надето ${plan.length} — ${plan.map(x => x.it.n).join(', ')}`); render(); openDetail(cid);
}
export { craftAllPlan, craftAll };
