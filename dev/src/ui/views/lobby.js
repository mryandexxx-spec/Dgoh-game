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

let lobbyZone = 1; // remember the rail when the lobby DOM is refreshed
const SPOT_ICONS = {
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 4v14M15 6v14" stroke="currentColor" stroke-width="1.8"/>',
  worm: '<path d="M3 18c3 0 3-5 6-5s3 5 6 5 3-9 6-9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="20" cy="7" r="2.6" fill="currentColor"/>',
  star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" fill="currentColor"/>',
  tent: '<path d="M3 20L12 4l9 16z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 20l3-6 3 6" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  helm: '<path d="M5 13a7 7 0 0114 0v5H5z" fill="currentColor"/><rect x="7" y="12" width="10" height="2.6" rx="1.2" fill="#140f12"/>',
  book: '<path d="M4 5h7v15H4zM13 5h7v15h-7z" fill="none" stroke="currentColor" stroke-width="1.8"/>',
};
// UI-02 actions are presentation only: existing data-v / data-cal route to
// the game's verified achievement, daily and calendar flows (no demo claims).
const ui02Action = (key, label, svg, data, ready, count = 0) =>
  `<button class="topb ui02-action ui02-${key}" type="button" ${data}
    aria-label="${label}${ready ? ', доступна награда' : ''}" title="${label}">
    ${svg}<span class="ui02-action-label">${label}</span>
    ${ready ? `<b class="ui02-notif" aria-hidden="true">${count > 0 ? Math.min(9, count) + (count > 9 ? '+' : '') : ''}</b>` : ''}
  </button>`;
const ui02Actions = () => {
  const feat = featsReady(), daily = dailyReady(), calendar = loginCan();
  return `<nav class="topbtns ui02-top-actions" aria-label="Быстрые действия">
    ${ui02Action('feats','Подвиги',`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M17 37C8 34 3 26 4 16m9 19-6-6m6 1-9-2m12-4-10-1m10-8-8 2M31 37c9-3 14-11 13-21m-9 19 6-6m-6 1 9-2m-12-4 10-1m-10-8 8 2"/><path d="m24 10 3.7 8 8.3 1-6 6 1.5 8-7.5-4-7.5 4L18 25l-6-6 8.3-1Z" fill="currentColor" stroke="#282016" stroke-width="1.2"/></svg>`,'data-v="feats"',feat > 0,feat)}
    ${ui02Action('daily','Задания',`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="10" y="8" width="29" height="35" rx="4"/><path d="M19 8V5h9v3M17 17l2 2 3-4m3 2h9M17 27l2 2 3-4m3 2h9M17 36l2 2 3-4m3 2h9"/></svg>`,'data-v="daily"',daily > 0,daily)}
    ${ui02Action('calendar','Календарь',`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="10" width="34" height="32" rx="4"/><path d="M15 5v9m18-9v9M8 20h32M16 27h4m7 0h4m-15 7h4m7 0h4"/></svg>`,'data-cal="1"',calendar)}
  </nav>`;
};

function renderLobby() {
  const sp = squadPower();
  const lN = campNodes('L'), campNext = lN.findIndex(i => !S.cleared[i]);
  const jNext = JR().tiers.findIndex((t, i) => !JP()[i]);
  const jOpen = Object.keys(JOURNEYS).some(k => { const J = JOURNEYS[k], P = S.journeys[k] || {}, n = J.tiers.findIndex((t, i) => !P[i]); return n >= 0 && jReady(k, n) && (n === 0 || P[n - 1]); });
  const promo = unlockedIds().filter(id => { const p = prog(id), n = nextShards(p); return n && p.shards >= n; }).length;
  // B2: approved left / centre / right composition, shared with the world-space totems.
  const spots = [
    { v: 'legend', n: 'Легенды', i: 'star', x: 18, y: 36, mx: 22, my: 38, b: jOpen ? 'есть бой' : `${Object.keys(JOURNEYS).filter(k => prog(k).stars).length}/${Object.keys(JOURNEYS).length} открыто`, hot: jOpen },
    { v: 'trials', n: 'Испытания', i: 'trial', x: 49, y: 38, mx: 51, my: 40, b: (n => n ? `открыто ${n}` : '')(TRIALS.filter(T => trialOpen(T) && trialLeft(T) > 0).length), hot: TRIALS.some(T => trialOpen(T) && trialLeft(T) > 0 && trialBest3(T) >= 0) },
    { v: 'raid', n: 'Рейд «Шаи-Хулуд»', i: 'worm', x: 80, y: 39, mx: 79, my: 43, b: S.raid ? `${(raidPct() * 100).toFixed(0)}% снято` : 'готов', hot: !!S.raid },
    { v: 'squad', n: 'Персонажи', i: 'helm', x: 36, y: 70, mx: 34, my: 70, b: promo ? `${promo} к повышению` : '', hot: promo > 0 },
    { v: 'camp', n: 'Кампания', i: 'map', x: 70, y: 66, mx: 72, my: 67, b: campNext < 0 ? 'пройдена' : `светлые ${NODES[lN[campNext]].c + 1}-${NODES[lN[campNext]].m + 1}` },
    { v: 'conq', n: 'Джихад', i: 'conq', x: 30, y: 46, mx: 30, my: 47, b: typeof cqBadge === 'function' ? cqBadge() : '', hot: typeof cqHot === 'function' && cqHot() },
    { v: 'shop', n: 'Лавки', i: 'tent', x: 74, y: 49, mx: 73, my: 50, b: S.teeth >= 50 ? amt('teeth', S.teeth) : '' },
  ];
  const ANCHORS = { legend: [-10.4, -1.7], trials: [-7.5, -1.9], raid: [-4.8, -1.7],
    squad: [-2.4, -2.7], camp: [2.8, -2.7], conq: [7.3, -1.9], shop: [10.5, -2.2] };
  const LF = [[50, 90, 1.2], [39, 82, .95], [61, 82, .95], [29, 92, 1], [71, 92, 1]];
  $('#view').innerHTML = `<div class="lobby" data-lzone="${lobbyZone}">
    <div class="lobby-scroll2d" aria-hidden="true"><div class="lobby-scrollworld"><canvas class="bgc" id="lobbybg"></canvas><div class="lobby-snap-points"><span></span><span></span><span></span></div></div></div>
    <div class="ltop">${profileChip()}<div class="res resbox"></div>${ui02Actions()}</div>
    <div class="lhouse"><span>Ваш Малый Дом</span><b class="mono">Мощь отряда ${fmt(sp)}</b></div>
    ${spots.filter(s => s.v !== "rules" && s.v !== "feats").map(s => `<button class="spot ${s.hot ? 'hot' : ''}" data-zone="${["legend", "trials", "raid"].includes(s.v) ? 0 : ["squad", "camp"].includes(s.v) ? 1 : 2}" data-wx="${ANCHORS[s.v][0]}" data-wz="${ANCHORS[s.v][1]}" data-v="${s.v}" style="--x:${s.x}%;--y:${s.y}%;--mx:${s.mx}%;--my:${s.my}%;--lx:${s.lx ?? s.mx}%;--ly:${s.ly ?? s.my}%"><span class="slabel">${s.n}</span>${s.b ? `<span class="sbadge">${s.b}</span>` : ''}</button>`).join('')}
    <div class="lzones" aria-label="Зоны лагеря"><button data-lnav="0" aria-label="Легенды, Испытания и Рейд">●</button><button data-lnav="1" aria-label="Персонажи и Кампания">●</button><button data-lnav="2" aria-label="Джихад и Лавки">●</button></div>
    ${S.squad.map((id, k) => { const f = LF[k]; return `<button class="lfig" data-v="squad" data-hid="${id}" style="left:${f[0]}%;top:${f[1]}%;--s:${f[2]};z-index:${f[1]}" aria-label="${CH[id].n}">${figureSVG(CH[id], true)}<span>${CH[id].sn}</span></button>`; }).join('')}
  </div>`;
  const lobby = document.querySelector('.lobby');
  // Package B1: gesture only on the backdrop; buttons keep their native tap behaviour.
  let start = null;
  const scroll2d = lobby.querySelector('.lobby-scroll2d');
  const zone = n => {
    const next = Math.max(0, Math.min(2, n));
    lobbyZone = next; lobby.dataset.lzone = String(next);
    if (scroll2d && !lobby.classList.contains('has3d')) {
      scroll2d.scrollTo({ left: next * scroll2d.clientWidth, behavior: 'smooth' });
    }
  };
  // Native scroll-snap fallback when WebGL is unavailable.
  if (scroll2d) {
    scroll2d.scrollLeft = lobbyZone * scroll2d.clientWidth; // restore last zone
    scroll2d.addEventListener('scroll', () => {
      if (lobby.classList.contains('has3d')) return;
      lobbyZone = Math.max(0, Math.min(2,
        Math.round(scroll2d.scrollLeft / Math.max(1, scroll2d.clientWidth))));
      lobby.dataset.lzone = String(lobbyZone);
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
