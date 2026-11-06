// ui/notifications.js — строки 5037–5083 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { showLevelUp } from './overlays/levelup.js';
import { CQ_SECT } from '../data/conquest-data.js';
import { showCeleb } from './overlays/celebrate.js';
import { FEATS, featRw, featStep } from './views/feats.js';
import { METRIC } from '../logic/stats.js';
import { DAILY, qState } from './views/daily.js';
import { rewardsHtml } from './rewards.js';
import { $ } from '../core/util.js';
import { BT, NOTES, S } from '../core/state.js';
import { persist0 } from '../core/save.js';
import { ROMAN, todayKey } from '../logic/economy.js';
import { fmt } from '../core/format.js';

// ===================== corner notifications (daily quests / feats) =====================
function noteSnap(init) {
  S.notes ??= { d: '', q: {}, f: {} };
  if (S.notes.d !== todayKey()) { S.notes.d = todayKey(); S.notes.q = {}; init = init || false; }
  const out = [];
  for (const q of DAILY) { const st = qState(q); if (st !== 'prog' && !S.notes.q[q.k]) { S.notes.q[q.k] = 1; if (!init) out.push({ kind: 'quest', q }); } }
  for (const F of FEATS) {
    const s = featStep(F); if (s >= F.at.length) continue;
    const v = METRIC[F.m](), goal = F.at[s], prev = s ? F.at[s - 1] : 0, pct = Math.min(1, Math.max(0, (v - prev) / (goal - prev)));
    const band = v >= goal ? 4 : Math.floor(pct * 4), key = s + ':' + band, was = S.notes.f[F.id];
    if (was !== key) { S.notes.f[F.id] = key; const [ws, wb] = (was || '-1:-1').split(':').map(Number); if (!init && (s > ws || band > wb) && band > 0) out.push({ kind: band >= 4 ? 'feat' : 'featp', F, v, goal, s, pct }); }
  }
  return out;
}
function notePoll(init) {
  if (!S) return;
  const fresh = noteSnap(init);
  for (const n of fresh) NOTES.push({ id: Math.random().toString(36).slice(2), ...n });
  if (fresh.length) persist0();
  showLevelUp(); renderNotes(); if (typeof showCeleb === 'function') showCeleb();
}
function noteHtml(n) {
  const fv = v => v >= 1e6 ? (v / 1e6).toFixed(1).replace('.0', '') + ' млн' : v >= 1e4 ? Math.round(v / 1e3) + ' тыс.' : fmt(v);
  if (n.kind === 'quest') return `<div class="nt-ic q">✓</div><div class="nt-tx"><b>Задание выполнено</b><span>${n.q.n}</span><div class="nt-rw">${rewardsHtml(n.q.rw)}</div></div><button class="btn mini go" data-ntgo="daily" data-ntid="${n.id}">Забрать</button>`;
  if (n.kind === 'cqf') { const ok = n.v >= n.F.need, sc = n.F.sc === 'g' ? 'общий' : n.F.sc === 'b' ? `босс · ${CQ_SECT[n.F.s].n}` : CQ_SECT[n.F.s].n;
    return `<div class="nt-ic ${ok ? 'f' : 'p'}">${ok ? '◆' : Math.round(n.v / n.F.need * 100) + '%'}</div><div class="nt-tx"><b>Подвиг Джихада: ${n.F.n}</b><span>${ok ? `Выполнен (${sc}) — +${n.F.pts} очков шкалы` : `${sc}: ${n.v} / ${n.F.need}`}</span>${ok ? '' : `<div class="fbar"><i style="width:${n.v / n.F.need * 100}%"></i></div>`}</div><button class="btn mini ${ok ? 'go' : ''}" data-ntgo="conq" data-ntid="${n.id}">Открыть</button>`; }
  if (n.kind === 'feat') return `<div class="nt-ic f">★</div><div class="nt-tx"><b>Подвиг: ${n.F.n} ${ROMAN[n.s + 1]}</b><span>Ступень выполнена — награда ждёт</span><div class="nt-rw">${rewardsHtml(featRw(n.F, n.s))}</div></div><button class="btn mini go" data-ntgo="feats" data-ntid="${n.id}">Забрать</button>`;
  return `<div class="nt-ic p">${Math.round(n.pct * 100)}%</div><div class="nt-tx"><b>Подвиг: ${n.F.n} ${ROMAN[n.s + 1]}</b><span>Прогресс ${fv(n.v)} / ${fv(n.goal)}</span><div class="fbar"><i style="width:${n.pct * 100}%"></i></div></div><button class="btn mini" data-ntgo="feats" data-ntid="${n.id}">Открыть</button>`;
}
function renderNotes() {
  let box = $('#notes'); if (!box) { box = document.createElement('div'); box.id = 'notes'; box.className = 'notes'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  const hide = !!(BT && BT.B) || !!$('#lvlup') || !!$('#celeb') || !!$('#rwwin') || !!$('#overlay').innerHTML.trim() || !!$('#overlay2').innerHTML.trim(); box.hidden = hide || !NOTES.length; if (box.hidden) return;
  const vis = NOTES.slice(-3).reverse(), more = NOTES.length - vis.length;
  box.innerHTML = `${NOTES.length > 1 ? `<div class="nt-head"><span>${NOTES.length} уведомл.</span><button class="nt-all" data-ntall="1">Закрыть все</button></div>` : ''}
    ${vis.map(n => `<div class="nt ${n.kind}" data-nt="${n.id}">${noteHtml(n)}<button class="nt-x" data-ntx="${n.id}" aria-label="Закрыть">×</button></div>`).join('')}${more > 0 ? `<div class="nt-more">ещё ${more}</div>` : ''}`;
}
const noteDrop = id => { const i = NOTES.findIndex(n => n.id === id); if (i >= 0) NOTES.splice(i, 1); renderNotes(); };
// swipe to dismiss
(() => {
  let el = null, x0 = 0, dx = 0;
  document.addEventListener('pointerdown', e => { const n = e.target.closest('.nt'); if (!n || e.target.closest('button')) return; el = n; x0 = e.clientX; dx = 0; el.style.transition = 'none'; el.setPointerCapture && el.setPointerCapture(e.pointerId); });
  document.addEventListener('pointermove', e => { if (!el) return; dx = e.clientX - x0; el.style.transform = `translateX(${dx}px)`; el.style.opacity = String(1 - Math.min(1, Math.abs(dx) / 220)); });
  const up = () => { if (!el) return; const n = el; el = null; n.style.transition = ''; if (Math.abs(dx) > 80) { n.style.transform = `translateX(${dx > 0 ? 400 : -400}px)`; n.style.opacity = '0'; setTimeout(() => noteDrop(n.dataset.nt), 180); } else { n.style.transform = ''; n.style.opacity = ''; } };
  document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
})();


export { noteSnap, notePoll, noteHtml, renderNotes, noteDrop };
