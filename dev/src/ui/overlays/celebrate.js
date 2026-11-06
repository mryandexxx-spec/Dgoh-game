// ui/overlays/celebrate.js — строки 5200–5254 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../reward-tiles.js'; // порядок исполнения
import { MOUSE_SVG } from '../mouse.js';
import { renderNotes } from '../notifications.js';
import { heroSnap } from '../hero-window.js';
import { openDetail } from './detail.js';
import { render } from '../router.js';
import { $, prog } from '../../core/util.js';
import { BT, set_view, view } from '../../core/state.js';
import { fmt } from '../../core/save.js';
import { ringCol, sideName } from '../../logic/relics.js';
import { BIOS } from '../../data/story.js';
import { figureSVG, portrait } from '../../render2d/figures.js';
import { unitPower } from '../../logic/battle/stats.js';
import { CH } from '../../data/chars.js';
import { FACTIONS, ROLES } from '../../data/fx.js';

// ===================== celebrations: star-up & hero unlock =====================
const CELEB = [];
function celebQueue(c) { CELEB.push(c); setTimeout(showCeleb, 30); }
function fireworks(host, n = 5) {
  const cols = ['#ffd27a', '#ff8a5a', '#8fe0e8', '#c8a0ff', '#9ee28a'];
  for (let b = 0; b < n; b++) {
    const x = 15 + Math.random() * 70, y = 12 + Math.random() * 40, c = cols[b % cols.length], d = .5 + b * .35;
    const fw = document.createElement('div'); fw.className = 'fw'; fw.style.cssText = `left:${x}%;top:${y}%;--c:${c};--dl:${d}s`;
    fw.innerHTML = Array.from({ length: 16 }, (_, i) => `<i style="--a:${i * 22.5}deg;--r:${60 + Math.random() * 40}px"></i>`).join('');
    host.appendChild(fw);
  }
}
function showCeleb() {
  if (!CELEB.length || $('#celeb') || $('#lvlup') || (BT && BT.B)) return;
  const c = CELEB.shift(), d = CH[c.id], p = prog(c.id);
  const el = document.createElement('div'); el.id = 'celeb';
  if (c.type === 'hup') {
    const s1 = heroSnap(c.id), s0 = c.s0 || s1, T = { lvl: ['Уровень повышен!', `Уровень ${c.from} → ${c.to}`], gear: ['Снаряжение улучшено!', `Снаряжение ${c.from} → ${c.to}`], relic: ['Другая память пробуждена!', `Другая память ${c.from} → ${c.to}`] }[c.kind];
    const row = (n, a, b, f = fmt) => `<div class="hurow"><span>${n}</span><b class="mono">${f(a)}</b><i>→</i><b class="mono up">${f(b)}</b><em class="mono">${b > a ? '+' + f(b - a) : ''}</em></div>`;
    el.className = 'celeb hup';
    el.innerHTML = `<div class="cbox" role="dialog" aria-modal="true"><div class="crays"></div>
      <div class="hutop"><div class="humouse">${typeof MOUSE_SVG === 'function' ? MOUSE_SVG(false) : ''}</div><div class="cport">${portrait(d, 104, ringCol(p))}<span class="hubadge ${c.kind}">${c.to}</span></div></div>
      <h3>${T[0]}</h3><p class="sub" style="margin:0"><b>${d.n}</b> · ${T[1]}</p>
      <div class="hustats">${row('Здоровье', s0.hp, s1.hp)}${s1.sh || s0.sh ? row('Щит', s0.sh, s1.sh) : ''}${row('Урон', s0.dmg, s1.dmg)}${row('Скорость', s0.spd, s1.spd)}${row('Мощь', s0.pw, s1.pw)}</div>
      <div class="acts" style="justify-content:center"><button class="btn go" data-celebok="1">Ура!</button></div></div>`;
    document.body.appendChild(el); fireworks(el.querySelector('.cbox'), 4);
    return;
  }
  if (c.type === 'star') {
    el.className = 'celeb star';
    el.innerHTML = `<div class="cbox" role="dialog" aria-modal="true"><div class="crays"></div>
      <div class="cport">${portrait(d, 120, ringCol(p))}</div>
      <div class="cstars">${Array.from({ length: 7 }, (_, i) => `<span class="cs ${i < c.from ? 'on' : i === c.from ? 'new' : ''}">★</span>`).join('')}</div>
      <h3>${d.n}</h3><p class="sub" style="margin:0">Звёздность повышена: <b>${c.from}★ → ${c.to}★</b></p>
      <div class="cgain mono">Мощь ${fmt(c.pw0)} → <b>${fmt(unitPower(d, p))}</b></div>
      <div class="acts" style="justify-content:center"><button class="btn go" data-celebok="1">Отлично!</button></div></div>`;
    document.body.appendChild(el); fireworks(el.querySelector('.cbox'), 6);
  } else {
    el.className = 'celeb unlock';
    el.innerHTML = `<div class="ubar t"></div><div class="ubar b"></div><div class="ubeam"></div><div class="usand">${Array.from({ length: 30 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--dl:${(i % 10) * .12}s;--sz:${3 + (i * 7) % 6}px"></i>`).join('')}</div>
      <div class="ustage"><div class="ufig">${figureSVG(d, true)}</div>
      <div class="utext"><small>Новый герой присоединяется к Дому</small><b>${d.n}</b>
        <div class="utags"><span class="sidetag ${d.side}">${sideName(d)}</span>${d.f.map(f => `<span class="tag">${FACTIONS[f].n}</span>`).join('')}<span class="tag">${ROLES[d.role]}</span>${d.legendary ? '<span class="tag gold">Легенда</span>' : ''}</div>
        <div class="ustars">${'<span>★</span>'.repeat(Math.max(1, p.stars))}</div>${d.legendary ? `<div class="ulegend">${d.conquest ? 'Герой Джихада' : 'Легенда'} · открыт сразу на 7★</div>` : ''}
        <p>${(BIOS[d.id] || '').split('. ').slice(0, 1).join('. ')}.</p>
        <div class="acts"><button class="btn go" data-celebopen="${d.id}">Карточка героя</button><button class="btn" data-celebok="1">Продолжить</button></div></div></div>`;
    document.body.appendChild(el);
  }
}
function celebClick(d) {
  if (d.celebok) { const el = $('#celeb'); if (el) el.remove(); setTimeout(() => { showCeleb(); renderNotes(); }, 50); return true; }
  if (d.celebopen) { const el = $('#celeb'); if (el) el.remove(); if (!(BT && BT.B)) { set_view('squad'); render(); openDetail(d.celebopen); } return true; }
  return false;
}


export { CELEB, celebQueue, fireworks, showCeleb, celebClick };
