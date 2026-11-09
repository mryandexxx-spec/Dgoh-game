// ui/views/lobby.js — строки 4072–4108 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './shop.js'; // порядок исполнения
import { cqHot } from '../../logic/conquest.js';
import { profileChip } from '../overlays/profile.js';
import { featMax, featRank, featsReady } from './feats.js';
import { raidPct } from './raid.js';
import { loginCan } from '../overlays/calendar.js';
import { nextShards } from './squad.js';
import { renderRes } from '../common.js';
const APP_VER = '__APP_VER__';   // подставляет tools/build.mjs: «v<номер> · <хеш сборки>» (dev/version.json + кэш SW)
// v54: номер — в футере на всех экранах (#appver в index.html, левый нижний угол), а не только в лобби
try { const e = document.getElementById('appver'); if (e && 'textContent' in e) e.textContent = APP_VER; } catch (e) {}
import { prog, squadPower, unlockedIds } from '../../logic/progress.js';
import { S } from '../../core/state.js';
import { JOURNEYS, JP, JR, jReady } from '../../data/journeys.js';
import { NODES, campNodes } from '../../data/campaigns.js';
import { mountCampStage } from '../../render3d/scenes/camp.js';
import { SceneBG } from '../../render2d/scene-bg.js';
import { figureSVG } from '../../render2d/figures.js';
import { CH } from '../../data/chars.js';
import { TRIALS, trialBest3, trialLeft, trialOpen } from '../../logic/trials.js';
import { amt, fmt } from '../../core/format.js';
import { $ } from '../../core/dom.js';
import { dailyReady } from '../../logic/daily.js';
import { cqBadge } from './conq.js';

const SPOT_ICONS = {
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 4v14M15 6v14" stroke="currentColor" stroke-width="1.8"/>',
  worm: '<path d="M3 18c3 0 3-5 6-5s3 5 6 5 3-9 6-9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="20" cy="7" r="2.6" fill="currentColor"/>',
  star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" fill="currentColor"/>',
  tent: '<path d="M3 20L12 4l9 16z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 20l3-6 3 6" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  helm: '<path d="M5 13a7 7 0 0114 0v5H5z" fill="currentColor"/><rect x="7" y="12" width="10" height="2.6" rx="1.2" fill="#140f12"/>',
  book: '<path d="M4 5h7v15H4zM13 5h7v15h-7z" fill="none" stroke="currentColor" stroke-width="1.8"/>',
};
function renderLobby() {
  const sp = squadPower();
  const lN = campNodes('L'), campNext = lN.findIndex(i => !S.cleared[i]);
  const jNext = JR().tiers.findIndex((t, i) => !JP()[i]);
  const jOpen = Object.keys(JOURNEYS).some(k => { const J = JOURNEYS[k], P = S.journeys[k] || {}, n = J.tiers.findIndex((t, i) => !P[i]); return n >= 0 && jReady(k, n) && (n === 0 || P[n - 1]); });
  const promo = unlockedIds().filter(id => { const p = prog(id), n = nextShards(p); return n && p.shards >= n; }).length;
  const spots = [
    { v: 'camp', n: 'Кампания', i: 'map', x: 11, y: 34, mx: 20, my: 36, lx: 8, ly: 34, b: campNext < 0 ? 'пройдена' : `светлые ${NODES[lN[campNext]].c + 1}-${NODES[lN[campNext]].m + 1}` },
    { v: 'raid', n: 'Рейд «Шаи-Хулуд»', i: 'worm', x: 89, y: 34, mx: 80, my: 36, lx: 89, ly: 34, b: S.raid ? `${(raidPct() * 100).toFixed(0)}% снято` : 'готов', hot: !!S.raid },
    { v: 'legend', n: 'Легенды', i: 'star', x: 50, y: 30, mx: 50, my: 23, lx: 71, ly: 25, b: jOpen ? 'есть бой' : `${Object.keys(JOURNEYS).filter(k => prog(k).stars).length}/${Object.keys(JOURNEYS).length} открыто`, hot: jOpen },
    { v: 'shop', n: 'Лавки', i: 'tent', x: 89, y: 76, mx: 80, my: 58, lx: 90, ly: 73, b: S.teeth >= 50 ? amt('teeth', S.teeth) : '' },
    { v: 'squad', n: 'Персонажи', i: 'helm', x: 11, y: 76, mx: 20, my: 58, lx: 8, ly: 73, b: promo ? `${promo} к повышению` : '', hot: promo > 0 },
    { v: 'rules', n: 'Правила боя', i: 'book', x: 29, y: 30, mx: 50, my: 47, lx: 29, ly: 25, b: '' },
    { v: 'trials', n: 'Испытания', i: 'trial', x: 89, y: 55, mx: 80, my: 47, lx: 78, ly: 47, b: (n => n ? `открыто ${n}` : '')(TRIALS.filter(T => trialOpen(T) && trialLeft(T) > 0).length), hot: TRIALS.some(T => trialOpen(T) && trialLeft(T) > 0 && trialBest3(T) >= 0) },
    { v: 'conq', n: 'Джихад', i: 'conq', x: 71, y: 30, mx: 50, my: 35, lx: 50, ly: 22, b: typeof cqBadge === 'function' ? cqBadge() : '', hot: typeof cqHot === 'function' && cqHot() },
    { v: 'feats', n: 'Подвиги', i: 'feat', x: 11, y: 55, mx: 20, my: 47, lx: 22, ly: 47, b: featsReady() ? `${featsReady()} к получению` : `${featRank()}/${featMax}`, hot: featsReady() > 0 },
  ];
  // Fixed world anchors for the B1 navigation; coordinate pairs are echoed in CampStage.
  const ANCHORS = { camp: [-9.3, -1.5], legend: [-5.5, -1.5], squad: [0, -2.7],
    raid: [5.0, -1.5], conq: [7.7, -2.7], trials: [9.8, -1.5], shop: [11.7, -2.7] };
  const LF = [[50, 90, 1.2], [39, 82, .95], [61, 82, .95], [29, 92, 1], [71, 92, 1]];
  $('#view').innerHTML = `<div class="lobby" data-lzone="1">
    <div class="lobby-scroll2d" aria-hidden="true"><div class="lobby-scrollworld"><canvas class="bgc" id="lobbybg"></canvas><div class="lobby-snap-points"><span></span><span></span><span></span></div></div></div>
    <div class="ltop">${profileChip()}<div class="res resbox"></div><div class="topbtns"><button class="topb" data-v="feats" aria-label="Подвиги" title="Подвиги">★${featsReady() ? `<b class="badge">${featsReady()}</b>` : ""}</button><button class="topb" data-v="daily"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 9l1.5 1.5 3-3M8.5 15l1.5 1.5 3-3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><span>Задания</span>${dailyReady() ? `<b class="badge">${dailyReady()}</b>` : ''}</button><button class="topb" data-cal="1"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="2"/></svg><span>Вход</span>${loginCan() ? '<b class="badge">!</b>' : ''}</button></div></div>
    <div class="lhouse"><span>Ваш Малый Дом</span><b class="mono">Мощь отряда ${fmt(sp)}</b></div>
    ${spots.filter(s => s.v !== "rules" && s.v !== "feats").map(s => `<button class="spot ${s.hot ? 'hot' : ''}" data-zone="${s.v === "squad" ? 1 : ["camp", "legend"].includes(s.v) ? 0 : 2}" data-wx="${ANCHORS[s.v][0]}" data-wz="${ANCHORS[s.v][1]}" data-v="${s.v}" style="--x:${s.x}%;--y:${s.y}%;--mx:${s.mx}%;--my:${s.my}%;--lx:${s.lx}%;--ly:${s.ly}%"><span class="sicon"><svg viewBox="0 0 24 24" aria-hidden="true">${SPOT_ICONS[s.i]}</svg></span><span class="slabel">${s.n}</span>${s.b ? `<span class="sbadge">${s.b}</span>` : ''}</button>`).join('')}
    <div class="lzones" aria-label="Зоны лагеря"><button data-lnav="0" aria-label="Кампания и легенды">●</button><button data-lnav="1" aria-label="Персонажи">●</button><button data-lnav="2" aria-label="Рейд и режимы">●</button></div>
    ${S.squad.map((id, k) => { const f = LF[k]; return `<button class="lfig" data-v="squad" data-hid="${id}" style="left:${f[0]}%;top:${f[1]}%;--s:${f[2]};z-index:${f[1]}" aria-label="${CH[id].n}">${figureSVG(CH[id], true)}<span>${CH[id].sn}</span></button>`; }).join('')}
  </div>`;
  const lobby = document.querySelector('.lobby');
  // Package B1: gesture only on the backdrop; buttons keep their native tap behaviour.
  let start = null;
  const scroll2d = lobby.querySelector('.lobby-scroll2d');
  const zone = n => {
    const next = Math.max(0, Math.min(2, n));
    lobby.dataset.lzone = String(next);
    if (scroll2d && !lobby.classList.contains('has3d')) {
      scroll2d.scrollTo({ left: next * scroll2d.clientWidth, behavior: 'smooth' });
    }
  };
  // Native scroll-snap fallback when WebGL is unavailable.
  if (scroll2d) {
    scroll2d.scrollLeft = scroll2d.clientWidth; // initial central squad
    scroll2d.addEventListener('scroll', () => {
      if (lobby.classList.contains('has3d')) return;
      lobby.dataset.lzone = String(Math.max(0, Math.min(2,
        Math.round(scroll2d.scrollLeft / Math.max(1, scroll2d.clientWidth)))));
    }, { passive: true });
  }
  lobby.querySelectorAll('[data-lnav]').forEach(b => b.addEventListener('click', () => zone(+b.dataset.lnav)));
  lobby.addEventListener('pointerdown', e => {
    if (!lobby.classList.contains('has3d') || e.target.closest('button, .ltop, .lhouse')) return;
    start = { x: e.clientX, y: e.clientY, t: performance.now(), zone: +lobby.dataset.lzone };
  }, { passive: true });
  lobby.addEventListener('pointermove', e => {
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      // The camera follows the finger; no extra RAF or engine.
      lobby.dataset.lrail = String(Math.max(0, Math.min(2, start.zone - dx / Math.max(1, lobby.clientWidth))));
    }
  }, { passive: true });
  lobby.addEventListener('pointerup', e => {
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    const elapsed = Math.max(1, performance.now() - start.t), from = start.zone;
    start = null; delete lobby.dataset.lrail;
    if (Math.abs(dx) < 35 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    const delta = Math.abs(dx) > lobby.clientWidth * .33 || Math.abs(dx) / elapsed > .45 ? 1 : 0;
    zone(from + (dx < 0 ? delta : -delta));
  }, { passive: true });
  lobby.addEventListener('pointercancel', () => { start = null; delete lobby.dataset.lrail; });
  { const bg = () => new SceneBG($('#lobbybg'), 'lobby', 0); if (!mountCampStage(bg)) bg(); }
  renderRes();
}


export { SPOT_ICONS, renderLobby };
