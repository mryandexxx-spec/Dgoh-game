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
  if (data && data.save) return data.save; // hot reload compatibility
  const loaded = loadSave(true);
  if (loaded.status === 'ok') return loaded.save;
  if (loaded.status === 'missing') return newSave();
  startupReadFailure = loaded;
  return undefined;
}
function start(data) {
  set_S(initialSave(data));
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

// ARCH-02C-B3-B1b: explicitly opted-in preboot writer path. NOT wired to
// the production boot.js entrypoint yet (old cached PWA still ignores it).
// Refuse late enabling after legacy start, and never mutate S or render a
// secondary game until exclusive Web Locks ownership is confirmed.
async function startWithWriter(data = {}) {
  if (startupEntered) return { ok: false, status: 'already-started' };
  if (data && data.save) return { ok: false, status: 'hot-reload-unsupported' };
  // Sticky deny-by-default: a failed/unsupported/competing lock cannot
  // accidentally route a later persist() through unchecked localStorage.
  loadSave.writer.enableGate();
  const acquired = await loadSave.writer.acquire();
  if (!acquired.ok) return acquired;
  try {
    start(data);
  } catch (e) {
    // Remain gated, retain owner lease for explicit diagnostic/export. No
    // automatic retry or newSave fallback on an incomplete startup.
    return { ok: false, status: 'boot-exception',
      error: (e && e.name) || 'Error' };
  }
  if (!startupSucceeded) return { ok: false, status: 'boot-incomplete' };
  return { ok: true, status: 'started' };
}
// Preserve the existing named-export/ESM initialization ABI.
start.writer = startWithWriter;

export { splashOff, start };
