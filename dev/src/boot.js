// boot.js — строки 5729–5772 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './data/gear-cap.js';
import './logic/cinematic-preference.js';
import './logic/battle/ai.js';
import './ui/views/conq.js'; // порядок исполнения
import { start } from './core/boot.js';
import { abilPop, openUnitPop } from './ui/battle/battle-ui.js';
import { SQ, renderSquadSel, sqArr } from './ui/overlays/squad-select.js';
import { DETAIL_BACK, SQ_LP, set_DETAIL_BACK, set_SQ_LP } from './ui/overlays/detail.js';
import { BT, S } from './core/state.js';
import { $ } from './core/dom.js';
import { openDetail } from './ui/hero-card.js';
import { loadAssets3 } from './assets/models.js';
import { b3Pre } from './render3d/base.js'; // ARCH-01C5b-B1 application composition root

const spiceUser = d => !!d && !d.boss && !!d.legendary;
function hourglass(v) { const p = Math.max(0, Math.min(100, v)), top = 1 - p / 100; return `<button class="hglass ${p >= 100 ? 'full' : ''}" data-gz="spice" aria-label="Меланж ${p}%" title="Меланж"><svg viewBox="0 0 24 32" aria-hidden="true"><defs><clipPath id="hgt"><path d="M5 4h14c0 6-5 8-6 12H11C10 12 5 10 5 4z"/></clipPath><clipPath id="hgb"><path d="M11 16h2c1 4 6 6 6 12H5c0-6 5-8 6-12z"/></clipPath></defs><rect x="3" y="1.5" width="18" height="2.5" rx="1" fill="#c08a50"/><rect x="3" y="28" width="18" height="2.5" rx="1" fill="#c08a50"/><path d="M5 4h14c0 6-5 8-6 12 1 4 6 6 6 12H5c0-6 5-8 6-12C10 12 5 10 5 4z" fill="rgb(255 255 255 / .1)" stroke="#e8d0a0" stroke-width="1"/><rect clip-path="url(#hgt)" x="0" y="${4 + 12 * (1 - top)}" width="24" height="12" fill="#e8913f"/><rect clip-path="url(#hgb)" x="0" y="${28 - 12 * p / 100}" width="24" height="12" fill="#ffb05a"/>${p > 0 && p < 100 ? '<path class="hgs" d="M12 16v12" stroke="#ffb05a" stroke-width=".8" stroke-dasharray="1 1.5"/>' : ''}</svg><b>${p}%</b></button>`; }
// ARCH-01C5b-B1: register exactly once before start() can first render 3D.
b3Pre(loadAssets3);
window.claude?.hot?.snapshot?.(() => ({ save: S }));
// ARCH-02C-B3-B1c-A0: single application-owned preboot entrypoint. The
// default remains legacy (published v140 and golden compatibility); the
// explicit 'writer-preview' mode exercises the REAL composition-root path,
// acquiring an exclusive writer BEFORE reading S. It is NOT production-on.
// Never add a fallback from a denied Web Lock to unsafe legacy start().
function startRuntime(data = {}) {
  return window.__DGOH_B3_B1C_BOOT_MODE__ === 'writer-preview'
    ? start.writer(data) : start(data);
}
// Preserve the existing hot-host callback access used in B3 acceptance;
// its explicitly opted-in functions remain available for native probes.
startRuntime.writer = start.writer;
startRuntime.writerLifecycle = start.writerLifecycle;
window.claude?.hot?.ready
  ? window.claude.hot.ready(startRuntime)
  : startRuntime(window.claude?.hot?.data ?? {});

// long press on a hero in squad select → hero card (Back returns to squad select)
(() => {
  let tm = null, sx = 0, sy = 0, id = null;
  const cancel = () => { clearTimeout(tm); tm = null; };
  document.addEventListener('pointerdown', e => { if (!SQ) return; const c = e.target.closest('#overlay .sqcard[data-sqadd], #overlay .sqslot[data-sqrm]'); if (!c || e.target.closest('.sqmk')) return;
    sx = e.clientX; sy = e.clientY; id = c.dataset.sqadd || sqArr()[+c.dataset.sqrm]; cancel(); if (!id) return;
    tm = setTimeout(() => { tm = null; set_SQ_LP(performance.now()); if (navigator.vibrate) try { navigator.vibrate(15); } catch (er) {} set_DETAIL_BACK(() => renderSquadSel()); openDetail(id); }, 480); });
  document.addEventListener('pointermove', e => { if (tm && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel(); });
  document.addEventListener('pointerup', cancel); document.addEventListener('pointercancel', cancel);
  document.addEventListener('click', e => { if (performance.now() - SQ_LP < 650) { e.stopPropagation(); e.preventDefault(); } }, true);
  document.addEventListener('contextmenu', e => { if (e.target.closest('#overlay .sqcard, #overlay .sqslot')) e.preventDefault(); });
})();

// long press on a unit in battle → unit sheet
(() => {
  let tm = null, sx = 0, sy = 0, t0 = 0, uidLP = null;
  const cancel = () => { clearTimeout(tm); tm = null; };
  const fire = () => { cancel(); if (!BT || $('#bpop')) return; BT.lpFired = true; setTimeout(() => { if (BT) BT.lpFired = false; }, 700); if (navigator.vibrate) try { navigator.vibrate(15); } catch (er) {} openUnitPop(uidLP); };
  document.addEventListener('pointerdown', e => {
    if (!BT || $('#bpop')) return; const un = e.target.closest('#battle .unit'); if (!un || e.target.closest('[data-fxu]')) return;
    sx = e.clientX; sy = e.clientY; t0 = performance.now(); uidLP = un.dataset.uid; cancel();
    tm = setTimeout(fire, 480);
  });
  document.addEventListener('pointermove', e => { if (tm && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel(); });
  document.addEventListener('pointerup', () => { if (tm && performance.now() - t0 >= 460) fire(); else cancel(); }); document.addEventListener('pointercancel', cancel);
  document.addEventListener('contextmenu', e => { const un = BT && e.target.closest('#battle .unit'); if (!un) return; e.preventDefault(); cancel(); if (!$('#bpop')) openUnitPop(un.dataset.uid); });
})();
// long press on an ability icon in battle → its description (tap uses the ability)
(() => {
  let tm = null, sx = 0, sy = 0;
  const cancel = () => { clearTimeout(tm); tm = null; };
  const show = k => { if (!BT || !BT.waiting || $('#bpop')) return; BT.abLP = performance.now(); if (navigator.vibrate) try { navigator.vibrate(15); } catch (er) {} abilPop(BT.waiting, k); };
  document.addEventListener('pointerdown', e => { const b = BT && BT.waiting && e.target.closest && e.target.closest('#battle .abil[data-ab]'); if (!b) return; sx = e.clientX; sy = e.clientY; t0 = performance.now(); cancel(); const k = kk = b.dataset.ab; tm = setTimeout(() => { tm = null; show(k); }, 450); });
  document.addEventListener('pointermove', e => { if (tm && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel(); });
  let t0 = 0, kk = null;
  document.addEventListener('pointerup', () => { if (tm && performance.now() - t0 >= 440) { cancel(); show(kk); } else cancel(); }); document.addEventListener('pointercancel', cancel);
  document.addEventListener('click', e => { if (BT && BT.abLP && performance.now() - BT.abLP < 700) { BT.abLP = 0; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  document.addEventListener('contextmenu', e => { const b = BT && BT.waiting && e.target.closest && e.target.closest('#battle .abil[data-ab]'); if (!b) return; e.preventDefault(); cancel(); show(b.dataset.ab); });
})();

export { spiceUser, hourglass };
