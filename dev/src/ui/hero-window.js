// ui/hero-window.js — строки 4648–4680 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../core/boot.js'; // порядок исполнения
import { openBattleSettings } from './overlays/battle-settings.js';
import { doAct, renderBattle } from './battle/battle-ui.js';
import { detailCid, heroNavList, openDetail } from './hero-card.js';
import { prog } from '../logic/progress.js';
import { BT } from '../core/state.js';
import { WORM_IMG } from '../assets/models.js';
import { aiPlan } from '../logic/battle/ai.js';
import { unitPower, unitStats } from '../logic/battle/stats.js';
import { CH } from '../data/chars.js';
import { $ } from '../core/dom.js';

// ===== hero window helpers: snapshot for upgrade popups, prev/next navigation, swipe =====
function heroSnap(id) { const d = CH[id], p = prog(id), s = unitStats(d, p); return { hp: s.maxHp, sh: s.maxShield, dmg: s.dmg, spd: s.spd, pw: unitPower(d, p) }; }
// листание карточки героя ‹ › (пакет 5: без свайпа; порядок — heroNavList). Без перестройки DOM и без чтения layout: openDetail обновляет зоны.
function detailNav(dir) {
  const L = heroNavList(detailCid), i = L.indexOf(detailCid); if (i < 0 || L.length < 2) return;
  openDetail(L[(i + dir + L.length) % L.length]);
}
document.addEventListener('keydown', e => { if (!$('#overlay .csheet') || $('#overlay2').innerHTML || $('#celeb') || (e.target && e.target.tagName === 'INPUT')) return; if (e.key === 'ArrowRight') detailNav(1); else if (e.key === 'ArrowLeft') detailNav(-1); });
// battle controls react on pointerdown: the HUD is re-rendered every step and a plain click could be lost under auto-battle
(() => {
  let last = 0;
  document.addEventListener('pointerdown', e => {
    if (!BT || !BT.B || BT.done) return; const b = e.target.closest && e.target.closest('#battle .bctl [data-auto], #battle .bctl [data-speed], #battle .bctl [data-bset]'); if (!b) return;
    e.preventDefault(); last = performance.now(); BT.ctlT = last; const d = b.dataset;
    if (d.auto) { BT.auto = BT.autoPref = !BT.auto; if (BT.auto && BT.waiting) { const u = BT.waiting; const p = aiPlan(BT.B, u); doAct(u, p.key, p.target && p.target.uid); } else renderBattle(); }
    else if (d.speed) { BT.speed = BT.speedPref = BT.speed >= 4 ? 1 : BT.speed * 2; renderBattle(); }
    else if (d.bset && typeof openBattleSettings === 'function') openBattleSettings();
  }, true);
  document.addEventListener('click', e => { if (BT && BT.ctlT && performance.now() - BT.ctlT < 900 && e.target.closest && e.target.closest('#battle .bctl')) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
})();
const WORM_BADGE = `<div class="wormbadge" aria-hidden="true"><svg viewBox="0 0 120 120"><defs><radialGradient id="wbg" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#ffcf7a"/><stop offset=".6" stop-color="#c0661e"/><stop offset="1" stop-color="#3a1a08"/></radialGradient></defs><circle cx="60" cy="60" r="56" fill="url(#wbg)" stroke="#ffe0a0" stroke-width="3"/>${typeof WORM_IMG !== 'undefined' ? `<g class="wbw"><image href="${WORM_IMG.badge}" x="8" y="6" width="104" height="104"/></g>` : ''}<g class="wbs">${Array.from({ length: 10 }, (_, i) => `<circle cx="${14 + i * 10}" cy="${100 + (i % 3) * 4}" r="${1.5 + (i % 3)}" fill="#ffd9a0"/>`).join('')}</g></svg></div>`;

export { heroSnap, detailNav, WORM_BADGE };
