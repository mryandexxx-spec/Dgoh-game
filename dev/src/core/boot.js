// core/boot.js — строки 4622–4647 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../ui/events.js'; // порядок исполнения
import { CQ_DISKS } from '../data/conquest-data.js';
import { noteSnap } from '../ui/notifications.js';
import { metaFill } from '../ui/wiring.js';
import { RING_RATE } from '../ui/overlays/squad-select.js';
import { loginCan, openCalendar } from '../ui/overlays/calendar.js';
import { render } from '../ui/router.js';
import { renderRes, toast } from '../ui/common.js';
import { prog } from '../logic/progress.js';
import { BT, S, set_S, tickWater, view } from './state.js';
import { loadSave, newSave, persist } from './save.js';
import { ROSTER_IDS } from '../logic/economy.js';
import { amt } from './format.js';
import { $, LAND_MQ } from './dom.js';
import { dly } from '../logic/daily.js';

function splashOff() {
  const sp = document.getElementById('splash'); if (!sp || sp.classList.contains('off') || sp._t) return;
  const h = document.getElementById('sphint'); if (h) h.textContent = 'Коснитесь, чтобы продолжить';
  const go = () => { clearTimeout(sp._t); sp.classList.add('off'); setTimeout(() => sp.remove(), 800); };
  sp.addEventListener('pointerdown', go, { once: true });
  sp._t = setTimeout(go, Math.max(900, 2400 - performance.now()));
}
function start(data) {
  set_S((data && data.save) || loadSave() || newSave());
  metaFill(S); if (!S.notes) noteSnap(true);
  if (!S.migB) { S.migB = 1; S.stats = S.stats || {}; let n = 0;
    for (const id of ROSTER_IDS) { const p = prog(id); if (p.stars >= 7 && p.shards > 0) { n += p.shards * RING_RATE; p.shards = 0; } }
    if (n) { S.wring = (S.wring || 0) + n; setTimeout(() => toast(`Лишние осколки героев 7★ обменены: +${amt('wring', n)} водяных колец (Лавки → Водохранилище)`), 1500); }
    if (S.conq && S.conq.tk) { if (S.conq.tk.c6 && !S.stats.cqMax) S.stats.cqMax = 1; if (!S.stats.cqLeg) S.stats.cqLeg = (S.conq.disks || []).filter(x => CQ_DISKS[x.k] && CQ_DISKS[x.k].r === 'l').length; }
    persist(); }
  dly().c.login = 1;
  const rot = () => { let ok = false; try { ok = sessionStorage.getItem('rotok') === '1'; } catch (e) {} const touch = matchMedia('(pointer: coarse)').matches, portrait = innerHeight > innerWidth; $('#rotok').style.display = touch ? 'none' : ''; $('#rotfs').style.display = document.documentElement.requestFullscreen ? '' : 'none'; $('#rotate').hidden = !portrait || (ok && !touch); };
  if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', () => setTimeout(rot, 60));
  rot(); addEventListener('resize', rot);
  if (LAND_MQ) { const flip = () => { if (view === 'camp' && !document.querySelector('.battle, .sqsel')) render(); }; LAND_MQ.addEventListener ? LAND_MQ.addEventListener('change', flip) : LAND_MQ.addListener(flip); }
  persist();
  render();
  splashOff();
  if (loginCan()) setTimeout(() => { if (!BT && !$('#overlay2').innerHTML) openCalendar(); }, Math.max(400, 2600 - performance.now()));
  setInterval(() => { if (!BT) renderRes(); else { tickWater(); } }, 1000);
}

export { splashOff, start };
