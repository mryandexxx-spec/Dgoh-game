// core/boot.js — строки 4622–4647 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../ui/events.js'; // порядок исполнения
import '../logic/journey-gates.js'; // ARCH-01C1b: register journey logic before start() renders the camp
import '../logic/campaign-gates.js'; // ARCH-01C2b: register campaign unlock rules before start()
import { CQ_DISKS } from '../data/conquest-data.js';
import { noteSnap } from '../ui/notifications.js';
import { metaFill } from '../ui/wiring.js';
import { loginCan, openCalendar } from '../ui/overlays/calendar.js';
import { render } from '../ui/router.js';
import { renderRes, toast } from '../ui/common.js';
import { prog } from '../logic/progress.js';
import { BT, S, set_S, tickWater, view } from './state.js';
import { loadSave, newSave, persist, onPersist } from './save.js';
import { ROSTER_IDS } from '../logic/economy.js';
import { amt } from './format.js';
import { $, LAND_MQ } from './dom.js';
import { dly } from '../logic/daily.js';
import { RING_RATE } from '../logic/rewards.js';

function splashOff() {
  const sp = document.getElementById('splash'); if (!sp || sp.classList.contains('off') || sp._t) return;
  const h = document.getElementById('sphint'); if (h) h.textContent = 'Коснитесь, чтобы продолжить';
  const go = () => { clearTimeout(sp._t); sp.classList.add('off'); setTimeout(() => sp.remove(), 800); };
  sp.addEventListener('pointerdown', go, { once: true });
  sp._t = setTimeout(go, Math.max(900, 2400 - performance.now()));
}
// Keep the historical first action of start() as set_S(...) for the
// ARCH-01C5a initialization contract. Importantly, a failed read supplies
// undefined, NOT a newly created account or a writable fallback.
let startupReadFailure = null;
let startupEntered = false, startupSucceeded = false;
function initialSave(data) {
  startupReadFailure = null;
  if (!writerPreviewReentry && writerLifecycleArmed) return undefined;
  if (!writerPreviewReentry &&
      window.__DGOH_B3_B1C_BOOT_MODE__ === 'writer-preview') {
    // The historic start() must execute set_S(...) FIRST (ARCH-01C5a).
    // Do not read storage here: arm exclusive writer asynchronously, return
    // undefined for the first set_S; a second start() under the held lock
    // will perform the actual load. Never create a writable fallback account.
    writerPreviewPromise = startWithWriter(data);
    return undefined;
  }
  if (data && data.save) return data.save; // hot reload compatibility
  const loaded = loadSave(true);
  if (loaded.status === 'ok') return loaded.save;
  if (loaded.status === 'missing') return newSave();
  startupReadFailure = loaded;
  return undefined;
}
// B3-B1c-A0: the historical src/boot.js composition root is byte-frozen.
// ARCH-01C5a requires set_S(...) to remain start()'s FIRST AST statement.
// The initialSave callback launches the explicitly opted-in writer *without*
// reading persistent bytes; this first call sets S undefined and returns its
// Promise. The writer re-enters after acquiring Web Locks and reads safely.
let writerPreviewReentry = false, writerPreviewPromise = null;
function start(data) {
  set_S(initialSave(data));
  if (!writerPreviewReentry && writerPreviewPromise) {
    const pending = writerPreviewPromise;
    writerPreviewPromise = null;
    return pending;
  }
  // Sticky guard denies replay into legacy start after a failed opt-in boot,
  // even if the preview flag was removed in this same JS heap.
  if (!writerPreviewReentry && writerLifecycleArmed)
    return { ok: false, status: 'session-blocked' };
  startupEntered = true;
  startupSucceeded = false;
  onPersist(null, metaFill.showSaveRecovery);
  if (startupReadFailure) { metaFill.showSaveRecovery(startupReadFailure); return; }
  metaFill(S); if (!S.notes) noteSnap(true);
  if (!S.migB) { S.migB = 1; S.stats = S.stats || {}; let n = 0;
    for (const id of ROSTER_IDS) { const p = prog(id); if (p.stars >= 7 && p.shards > 0) { n += p.shards * RING_RATE; p.shards = 0; } }
    if (n) { S.wring = (S.wring || 0) + n; setTimeout(() => toast(`Лишние осколки героев 7★ обменены: +${amt('wring', n)} водяных колец (Лавки → Водохранилище)`), 1500); }
    if (S.conq && S.conq.tk) { if (S.conq.tk.c6 && !S.stats.cqMax) S.stats.cqMax = 1; if (!S.stats.cqLeg) S.stats.cqLeg = (S.conq.disks || []).filter(x => CQ_DISKS[x.k] && CQ_DISKS[x.k].r === 'l').length; }
    if (!persist().ok) return; }
  dly().c.login = 1;
  const rot = () => { let ok = false; try { ok = sessionStorage.getItem('rotok') === '1'; } catch (e) {} const touch = matchMedia('(pointer: coarse)').matches, portrait = innerHeight > innerWidth; $('#rotok').style.display = touch ? 'none' : ''; $('#rotfs').style.display = document.documentElement.requestFullscreen ? '' : 'none'; $('#rotate').hidden = !portrait || (ok && !touch); };
  if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', () => setTimeout(rot, 60));
  rot(); addEventListener('resize', rot);
  if (LAND_MQ) { const flip = () => { if (view === 'camp' && !document.querySelector('.battle, .sqsel')) render(); }; LAND_MQ.addEventListener ? LAND_MQ.addEventListener('change', flip) : LAND_MQ.addListener(flip); }
  if (!persist().ok) return;
  render();
  splashOff();
  if (loginCan()) setTimeout(() => { if (!BT && !$('#overlay2').innerHTML) openCalendar(); }, Math.max(400, 2600 - performance.now()));
  setInterval(() => { if (!BT) renderRes(); else { tickWater(); } }, 1000);
  startupSucceeded = true;
}

// ARCH-02C-B3-B1b lifecycle slice. Only the OPT-IN start.writer path
// installs these guards; production src/boot.js still calls legacy start.
// Reuse of suspended/stale in-memory S is strictly forbidden.
let writerLifecycleArmed = false, writerLifecycleBlocked = false;
let writerLifecycleReason = 'idle';
let writerLifecycleHasOwned = false;
function writerLifecycleBlock(reason) {
  if (!writerLifecycleArmed) return;
  // During the asynchronous acquire we are blocked already, but pagehide
  // must STILL cancel its pending callback and forbid a later boot.
  // B3-B2-A2: a recovery-only native lease can be owned while the normal
  // gameplay lifecycle is ALREADY blocked (corrupt/missing primary). A page
  // suspension must therefore revoke that lease too; otherwise a frozen tab
  // could retain authority and later confirm an obsolete backup preview.
  const suspended = reason === 'pagehide' ||
    reason === 'background-suspended' || reason === 'frozen' ||
    reason === 'bfcache-resume';
  if (writerLifecycleReason === 'acquiring' || !writerLifecycleBlocked ||
      suspended) {
    writerLifecycleBlocked = true;
    writerLifecycleReason = reason || 'session-stale';
    // Also cancels a pending acquisition; Web Lock never remains held while
    // hidden or in BFCache. Gated persist stays permanently denied after
    // release, even if the browser later resumes this exact JS heap.
    loadSave.writer.release();
  }
  try { metaFill.showWriterBlocked({
    status: writerLifecycleReason, allowVerifiedExport: writerLifecycleHasOwned
  }); }
  catch (e) { /* lost DOM must never revive a writable session */ }
}
function writerLifecycleArm() {
  if (writerLifecycleArmed) return;
  writerLifecycleArmed = true;
  // UI-owned transfer may retire an imported/ambiguous session without a
  // new import edge from wiring.js back into core/boot.js. This synchronously
  // blocks all game input AND releases the native lock before UI can resume.
  metaFill.stopWriterSession = writerLifecycleBlock;
  writerLifecycleBlocked = true; // no gameplay interaction while acquiring
  writerLifecycleReason = 'acquiring';
  const deny = e => {
    if (!writerLifecycleBlocked) return;
    // Only actions inside our diagnostic overlay are permitted (reload,
    // copy verified primary). Existing document-level game handlers are denied.
    if (e.target && typeof e.target.closest === 'function' &&
        e.target.closest('#save-writer-blocked')) return;
    if (e.cancelable && e.preventDefault) e.preventDefault();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    else if (e.stopPropagation) e.stopPropagation();
  };
  for (const type of ['click', 'pointerdown', 'touchstart', 'keydown',
      'input', 'change', 'submit', 'contextmenu'])
    window.addEventListener(type, deny, true);
  window.addEventListener('pagehide', () => writerLifecycleBlock('pagehide'));
  window.addEventListener('pageshow', e => {
    if (e.persisted) writerLifecycleBlock('bfcache-resume');
    else if (writerLifecycleBlocked && writerLifecycleReason !== 'acquiring')
      writerLifecycleBlock(writerLifecycleReason);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden')
      writerLifecycleBlock('background-suspended');
    else if (writerLifecycleBlocked && writerLifecycleReason !== 'acquiring')
      writerLifecycleBlock(writerLifecycleReason);
  });
  document.addEventListener('freeze', () => writerLifecycleBlock('frozen'));
  document.addEventListener('resume', () => {
    if (writerLifecycleBlocked) writerLifecycleBlock(writerLifecycleReason);
  });
  // Storage events only report OTHER same-origin tabs. They are not locks:
  // a cached old PWA may already have written. Do not resurrect RAM.
  window.addEventListener('storage', e => {
    if (writerLifecycleBlocked ||
        (e.key !== loadSave.writer.primaryKey &&
         e.key !== loadSave.checkpoint.key && e.key !== null)) return;
    if (e.key === null || e.key === loadSave.checkpoint.key ||
        !loadSave.writer.check().ok) writerLifecycleBlock('external-save-change');
  });
}
function writerLifecycleState() {
  return { armed: writerLifecycleArmed, blocked: writerLifecycleBlocked,
    reason: writerLifecycleReason, writer: loadSave.writer.state() };
}
// Explicit opt-in preboot coordination; production entry remains legacy
// until old cached clients, import/recover and real Safari are gated.
async function startWithWriter(data = {}) {
  if (startupEntered) return { ok: false, status: 'already-started' };
  if (writerLifecycleArmed) return { ok: false, status: 'session-blocked' };
  // Arm the one-way gate BEFORE rejecting an injected hot snapshot or a
  // failed late-gate attempt. Otherwise removing the preview flag could
  // restart the same heap through the unsafe legacy entrypoint.
  const gate = loadSave.writer.enableGate();
  writerLifecycleArm();
  if (!gate.ok) {
    writerLifecycleBlock(gate.status);
    return gate;
  }
  if (data && data.save) {
    writerLifecycleBlock('hot-reload-unsupported');
    return { ok: false, status: 'hot-reload-unsupported' };
  }
  const acquired = await loadSave.writer.acquire();
  if (!acquired.ok) {
    writerLifecycleBlock(acquired.status);
    return acquired;
  }
  // Mark verified ownership only AFTER native Web Locks acknowledges it.
  // A denied competing tab must never even inspect the private save for an
  // export through its blocked-screen rendering.
  writerLifecycleHasOwned = true;
  // A pagehide/freeze can race the asynchronous acquisition acknowledgement.
  if (writerLifecycleReason !== 'acquiring' ||
      loadSave.writer.state().status !== 'owned') {
    writerLifecycleBlock('session-stale');
    return { ok: false, status: 'session-blocked' };
  }
  try {
    // Call the exact old initialSave/start path AFTER acquiring writer lock,
    // without entering the opt-in dispatcher recursively.
    writerPreviewReentry = true;
    start(data);
  } catch (e) {
    writerLifecycleBlock('boot-exception');
    return { ok: false, status: 'boot-exception',
      error: (e && e.name) || 'Error' };
  } finally {
    writerPreviewReentry = false;
  }
  if (!startupSucceeded) {
    writerLifecycleBlock('boot-incomplete');
    return { ok: false, status: 'boot-incomplete' };
  }
  if (writerLifecycleReason !== 'acquiring') {
    writerLifecycleBlock('session-stale');
    return { ok: false, status: 'session-blocked' };
  }
  writerLifecycleBlocked = false;
  writerLifecycleReason = 'active';
  return { ok: true, status: 'started' };
}
// Preserve the historical named-export/ESM initialization ABI.
start.writer = startWithWriter;
start.writerLifecycle = writerLifecycleState;

export { splashOff, start };
