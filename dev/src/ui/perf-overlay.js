// ui/perf-overlay.js — фаза 6, шаг 6: оверлей замера для iPhone (fps, время кадра, пропуски, уровень, dpr, Мпикс, draws, режим).
// Включение: ?perf в адресе или 5 касаний по номеру версии в футере за 2 с (для PWA с домашнего экрана, где адрес не изменить);
// состояние — localStorage 'dune-perf'. Касание оверлея сворачивает его в одну строку. Обновление 2 раза в секунду.
import './overlays/battle-settings.js'; // порядок исполнения
import { curHost } from '../render3d/engine-host.js';
import { readGfx } from '../render3d/quality.js';
import { toast } from './common.js';

const PKEY = 'dune-perf';
let ON = false, MINI = false, EL = null, TIMER = 0, HOST = null;
const f1 = x => x.toFixed(1).replace('.', ','), STEP = { high: 'HIGH', med: 'MED', low: 'LOW', low30: 'LOW·30' };
function draw() {
  const H = curHost();
  if (H !== HOST) { if (HOST) HOST.countDraws(false); HOST = H; if (H) H.countDraws(true); }
  if (!EL) return;
  if (!H) { EL.innerHTML = '<div>3D не запущено</div>'; return; }
  const P = H.perfNow(), g = readGfx(), lv = `${STEP[P.step] || P.step}${g.p === 'auto' ? ` <i>авто−${g.auto}</i>` : ' <i>ручн.</i>'}`;
  const col = P.late > .15 ? 'bad' : P.late > .03 ? 'warn' : 'ok';
  if (MINI) { EL.innerHTML = `<div><b class="${col}">${P.fps} fps</b> · ${lv}</div>`; return; }
  const h = P.hist.filter(Boolean), tgt = 1000 / (P.target || 60), W = 150, top = Math.max(tgt * 2.2, ...h);
  const pts = h.map((v, i) => `${(i * W / Math.max(1, h.length - 1)).toFixed(0)},${(22 - v / top * 20).toFixed(1)}`).join(' ');
  const row = (k, v) => `<div><span>${k}</span><span>${v}</span></div>`;
  EL.innerHTML = row('fps', `<b class="${col}">${P.fps}</b> <i>/${P.target}</i>`) + row('кадр', `${f1(P.iv)} · p95 ${Math.round(P.p95)}`)
    + row('пропуски', `<b class="${col}">${Math.round(P.late * 100)}%</b>`) + row('CPU', `${f1(P.cpu)} мс`) + row('уровень', lv)
    + row('dpr', `${f1(P.dpr)} · ${f1(P.mpx)} Мп`) + row('draws', P.draws) + row('режим', P.mode) + (P.disp > 25 ? row('экран', `<b class="warn">${Math.round(1000 / P.disp)} Гц</b>`) : '')
    + `<svg width="${W}" height="24" aria-hidden="true"><line x1="0" x2="${W}" y1="${(22 - tgt * 1.5 / top * 20).toFixed(1)}" y2="${(22 - tgt * 1.5 / top * 20).toFixed(1)}" class="lim"/><polyline points="${pts}"/></svg>`;
}
function setPerf(on) {
  ON = on; try { on ? localStorage.setItem(PKEY, '1') : localStorage.removeItem(PKEY); } catch (e) {}
  clearInterval(TIMER); TIMER = 0;
  if (!on) { if (EL) EL.remove(); EL = null; if (HOST) HOST.countDraws(false); HOST = null; return; }
  if (!EL) { EL = document.createElement('div'); EL.id = 'perfov'; EL.setAttribute('aria-hidden', 'true'); EL.addEventListener('click', () => { MINI = !MINI; draw(); }); document.body.appendChild(EL); }
  draw(); TIMER = setInterval(draw, 500);
}
// 5 касаний по номеру версии: футер не перехватывает касания (pointer-events: none), поэтому проверяем попадание в его рамку
let taps = [];
addEventListener('pointerdown', e => {
  const v = document.getElementById('appver'); if (!v) return; const r = v.getBoundingClientRect();
  if (e.clientX < r.left - 8 || e.clientX > r.right + 8 || e.clientY < r.top - 8 || e.clientY > r.bottom + 8) { taps = []; return; }
  const now = Date.now(); taps = taps.filter(t => now - t < 2000); taps.push(now);
  if (taps.length >= 5) { taps = []; setPerf(!ON); toast(ON ? 'Замер производительности включён' : 'Замер производительности выключен'); }
}, true);
try { if (/[?&]perf\b/.test(location.search) || localStorage.getItem(PKEY) === '1') setTimeout(() => setPerf(true), 0); } catch (e) {}

export { setPerf };
