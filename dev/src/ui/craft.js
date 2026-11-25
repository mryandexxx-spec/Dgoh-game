// E3: пакетная сборка использует тот же рецепт, что окно предмета.
// Доступность проверяется на копиях инвентаря и валют.
import './mouse.js'; // порядок исполнения
import { slotState } from './overlays/detail.js';
import { openDetail, heroUpgradeFeedback } from './hero-card.js';
import { render } from './router.js';
import { toast } from './common.js';
import { prog } from '../logic/progress.js';
import { S } from '../core/state.js';
import { loadSave, persist } from '../core/save.js';
import { craftAndEquip } from '../logic/gear-crafting.js';
import { CH } from '../data/chars.js';
import { quest } from '../logic/daily.js';

function craftAllPlan(cid) {
  const p = prog(cid); if (!p.stars) return [];
  const inv = { ...S.inv }, parts = { ...(S.gearParts || {}) }, owned = { ...(S.gearOwned || {}) };
  const wallet = { sol: S.solari, pl: S.plast }, out = [];
  for (let k = 0; k < 6; k++) {
    if (p.eq[k]) continue;
    const it = slotState(cid, k).it;
    const result = craftAndEquip(it.id, inv, parts, wallet, owned);
    if (result.ok) out.push({ k, it, steps: result.steps });
  }
  return out;
}
function craftAll(cid) {
  if (loadSave.writer.state().gated) {
    if (!CH[cid]) return;
    const tx = loadSave.writer.transact(() => {
      // Preview is advisory. Rebuild the plan on the committed writer's
      // detached state, then pay and equip ALL eligible slots together.
      const plan = craftAllPlan(cid), p = prog(cid);
      if (!plan.length || !p.stars) return { commit: false, value: 'nothing-ready' };
      const wallet = { sol: S.solari, pl: S.plast }, applied = [];
      for (const { k, it } of plan) {
        if (p.eq[k]) continue;
        const result = craftAndEquip(it.id, S.inv, S.gearParts, wallet, S.gearOwned);
        if (!result.ok) return { commit: false, value: 'materials-changed' };
        p.eq[k] = true; quest('craft');
        applied.push(it.n);
      }
      if (!applied.length) return { commit: false, value: 'nothing-ready' };
      S.solari = wallet.sol; S.plast = wallet.pl;
      return applied;
    });
    if (!tx.ok) return; // no toast, equip state, quest or preview before commit
    toast(`${CH[cid].sn}: надето ${tx.value.length} — ${tx.value.join(', ')}`);
    render(); openDetail(cid); heroUpgradeFeedback(cid);
    return;
  }
  const plan = craftAllPlan(cid), p = prog(cid);
  if (!plan.length) return;
  const wallet = { sol: S.solari, pl: S.plast };
  for (const { k, it } of plan) {
    if (p.eq[k]) continue;
    const result = craftAndEquip(it.id, S.inv, S.gearParts, wallet, S.gearOwned);
    if (!result.ok) continue;
    p.eq[k] = true;
    quest('craft');
  }
  S.solari = wallet.sol; S.plast = wallet.pl;
  persist(); toast(`${CH[cid].sn}: надето ${plan.length} — ${plan.map(x => x.it.n).join(', ')}`); render(); openDetail(cid);
}
export { craftAllPlan, craftAll };
