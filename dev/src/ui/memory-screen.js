// ui/memory-screen.js — экран «Другой памяти» (пакет 6, E4): полный экран поверх карточки в #overlay2 — круговая шкала,
// «Сейчас → После», шаги ДП1–ДП7 с воспоминаниями, материалы с поиском, «Усилить». Пока открыт — 3D-фигура не рисуется.
import './skill-window.js'; // порядок исполнения
import { RES_N, matCell, set_WIN } from './skill-window.js';
import { HC_REFRESH } from './hero-card.js';
import { closeInfo, set_INFO_ON_CLOSE } from './overlays/info.js';
import { MEM, RELIC_AT, memView } from '../logic/relics.js';
import { prog } from '../logic/progress.js';
import { ROMAN } from '../logic/economy.js';
import { S } from '../core/state.js';
import { CH } from '../data/chars.js';
import { heroHold } from '../render3d/scenes/hero.js';
import { fmt, ic } from '../core/format.js';
import { $ } from '../core/dom.js';

let MEMID = null;   // герой открытого экрана (не сохранение)
const BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4l-8 8 8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10.5" rx="2" fill="currentColor"/><path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
const CHECK_N = { stars: 'Звёзды', gear: 'Снаряжение XIII', eq: 'Все 6 предметов надеты', acc: 'Уровень аккаунта' };

// круговая шкала: сегмент на уровень (got / next / пусто); статичная — без анимаций
function ringSvg(v) {
  const R = 78, C = 2 * Math.PI * R, n = v.max, seg = C / n, gap = 5;
  let s = `<svg viewBox="0 0 190 190" aria-hidden="true"><circle class="mrbg" cx="95" cy="95" r="${R}"/>`;
  for (let i = 0; i < n; i++) {
    const cls = v.block === 'ready' ? 'lk' : i < v.rl ? 'got' : i === v.rl ? 'nx' : '';
    s += `<circle class="mrs ${cls}" cx="95" cy="95" r="${R}" stroke-dasharray="${(seg - gap).toFixed(2)} ${(C - seg + gap).toFixed(2)}" transform="rotate(${(-90 + i * 360 / n + gap / C * 180).toFixed(2)} 95 95)"/>`;
  }
  return s + '<circle class="mrin" cx="95" cy="95" r="60"/></svg>';
}
const valCheck = c => c.k === 'gear' ? ROMAN[c.have] : c.k === 'stars' ? `${c.have}/7` : c.k === 'eq' ? `${c.have}/6` : c.have;
function midHtml(id, v) {
  if (v.block === 'ready') {
    const rows = v.checks.map(c => `<div class="${c.ok ? 'ok' : 'no'}"><i>${c.ok ? '✓' : '✕'}</i><span>${CHECK_N[c.k]}${c.k === 'acc' ? ' ' + c.need : ''}</span><b>${valCheck(c)}</b></div>`).join('');
    return `<span class="swcap">Условия пробуждения</span><div class="memreq">${rows}</div>
      <div class="membuy"><span class="memnote">ДП1 «${v.steps[0].lore[0]}»: +8% ко всем характеристикам и +3 скорости.</span><button class="btn go" data-iclose="1">К карточке</button></div>`;
  }
  const A = v.after, row = (n, k) => `<span>${n}</span><b>${fmt(v.now[k])}</b>${A ? `<i>›</i><b class="up">${fmt(A[k])}</b>` : ''}`;
  const tbl = `<div class="memna${A ? '' : ' one'}"><span class="hd2">характеристика</span><span class="hd2 r">сейчас</span>${A ? '<span></span><span class="hd2 r">после</span>' : ''}
    ${row('Здоровье', 'hp')}${v.now.sh ? row('Щит', 'sh') : ''}${row('Урон', 'dmg')}${row('Скорость', 'spd')}<span class="tot">Мощь</span><b class="tot">${fmt(v.now.pow)}</b>${A ? `<i class="tot">›</i><b class="up tot">${fmt(A.pow)}</b>` : ''}</div>`;
  if (v.block === 'max') return `<span class="swcap">${MEM(v.rl)} · все уровни пробуждены</span>${tbl}<div class="membuy"><span class="memnote">«${v.steps[v.max - 1].lore[0]}»: ${v.steps[v.max - 1].lore[1]}</span><button class="btn go" data-iclose="1">ОК</button></div>`;
  const L = v.steps[v.rn - 1].lore, c = v.cost, mats = Object.entries(c).filter(([k]) => k !== 'sol'), cok = mats.every(([k,n]) => (S[k]||0) >= n), sok = S.solari >= c.sol;
  const act = v.block === 'acc' ? `<span class="memnote lk">${MEM(v.rn)} — с уровня аккаунта ${RELIC_AT[v.rn]} (сейчас ${S.acc.lvl})</span>`
    : `<button class="btn swup ${cok && sok ? 'buy' : 'lack'}" data-relic="${id}">Усилить до ${MEM(v.rn)}<small class="${sok ? '' : 'lackc'}">${ic('sol')}${fmt(c.sol)}</small></button>`;
  return `<span class="swcap">${v.rl ? MEM(v.rl) : 'ДП0'} → ${MEM(v.rn)} · «${L[0]}»</span>${tbl}<p class="memlore">${L[1]}</p>
    <div class="membuy"><div class="swmats"><span class="swcap">Нужно</span>${mats.map(([k,n]) => matCell(k,n)).join('')}</div>${act}</div>`;
}
function stepsHtml(v) {
  return v.steps.map(s => `<li class="${s.st}"><span class="hx">${s.l}</span><span class="nm">${s.lore[0]}</span><span class="r">${s.st === 'got' ? '✓' : s.l > v.cap ? 'акк. ' + s.acc : s.st === 'next' ? 'далее' : ''}</span></li>`).join('');
}
function render() {
  const id = MEMID, d = CH[id], p = prog(id), v = memView(d, p);
  const centre = v.block === 'ready' ? `<span class="mrlock">${LOCK}</span><span>закрыто</span>` : `<small>уровень</small><b>${v.rl}</b><span>из ${v.max}</span>`;
  $('#overlay2').innerHTML = `<div class="detail info-layer memwrap"><div class="sheet memscr" role="dialog" aria-modal="true" aria-labelledby="mem-t" data-win="mem">
    <div class="memtop"><button class="hcib" data-iclose="1" aria-label="К карточке">${BACK}</button><div class="memt"><h3 id="mem-t">Другая память</h3><span>${d.n} · ${p.stars}★ · сн. ${ROMAN[p.gear]} ${p.eq.filter(Boolean).length}/6</span></div>
      <span class="memres"><button class="memchip" data-hcfind="ix_plate" aria-label="${RES_N.ix_plate}">${ic('ix_plate')}${fmt(S.ix_plate || 0)}</button><button class="memchip" data-hcfind="sol" aria-label="${RES_N.sol}">${ic('sol')}${fmt(S.solari)}</button></span></div>
    <div class="membody">
      <div class="memring"><div class="mring">${ringSvg(v)}<div class="mrc">${centre}</div></div><span class="memcap">За уровень: +8% ко всем характеристикам и +3 скорости. Потолок по уровню аккаунта: ${v.cap ? MEM(v.cap) : 'нет'}.</span></div>
      <div class="memmid">${midHtml(id, v)}</div>
      <div class="memsteps"><span class="swcap">Шаги</span><ol>${stepsHtml(v)}</ol></div>
    </div></div></div>`;
}
// вход — шестигранник «Другой памяти» в карточке (data-hcmem); фигура под экраном не рисуется до закрытия слоя
function hcMem(id) {
  if (!prog(id).stars) return;
  MEMID = id; heroHold(true); set_INFO_ON_CLOSE(() => heroHold(false));
  set_WIN({ label: 'К «Другой памяти»', open: () => { if (MEMID) hcMem(MEMID); } });
  render();
}
HC_REFRESH.push(id => { if (MEMID && $('#overlay2 .memscr')) { if (!prog(id).stars) return closeInfo(true); MEMID = id; render(); } });

export { hcMem };
