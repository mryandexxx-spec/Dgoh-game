// ui/overlays/calendar.js — строки 3826–3858 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../views/daily.js'; // порядок исполнения
import { giveRewards } from '../rewards.js';
import { infoKey, set_infoKey } from './info.js';
import { render } from '../router.js';
import { toast } from '../common.js';
import { S } from '../../core/state.js';
import { loadSave, persist } from '../../core/save.js';
import { todayKey } from '../../logic/economy.js';
import { figureSVG, portrait } from '../../render2d/figures.js';
import { CH } from '../../data/chars.js';
import { fmt, ic } from '../../core/format.js';
import { $ } from '../../core/dom.js';

// ===== login calendar =====
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTH_HEROES = ['stilgar', 'chani', 'jessica', 'duncan', 'gurney', 'kynes', 'thufir', 'feyd', 'fenring', 'mohiam', 'bashar', 'legion'];
const monthKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1); };
const monthHero = () => MONTH_HEROES[new Date().getMonth()];
const monthDays = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); };
// With mandatory Web Locks the calendar is a projection until a claim succeeds.
// Reading a new month must never silently reset the durable login counter.
const monthNumber = key => {
  const match = /^(\d{4})-(\d{1,2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]);
  return month >= 1 && month <= 12 ? year * 12 + month - 1 : null;
};
function loginState() {
  const key = monthKey();
  if (!loadSave.writer.state().gated) {
    if (S.login.m !== key) S.login = { m: key, n: 0, last: '' };
    return S.login; // historical B0 ungated mode, never used after writer failure
  }
  if (S.login.m === key) return S.login;
  const previous = monthNumber(S.login.m), current = monthNumber(key);
  // Never recreate old rewards if the device clock moves backwards a month.
  // Old v1 snapshots with an empty month still start from day 1.
  if (previous !== null && previous > current) return S.login;
  return { m: key, n: 0, last: '' };
}
const loginCan = () => {
  const L = loginState(), day = todayKey();
  if (!loadSave.writer.state().gated)
    return L.last !== day && L.n < monthDays(); // historical baseline
  const previousDay = Date.parse(L.last), currentDay = Date.parse(day);
  return L.m === monthKey() && Number.isInteger(L.n) && L.n >= 0 &&
    L.n < monthDays() && L.last !== day &&
    !(Number.isFinite(previousDay) && previousDay > currentDay);
};
// The original v1 boot initializes a previously absent login month. Preserve
// that golden-compatible initialization IN the existing verified boot persist,
// while leaving every real cross-month rollover read-only until its claim.
loginCan.prepareBoot = () => {
  if (loadSave.writer.state().gated && !S.login.m) S.login.m = monthKey();
};
function loginReward(day) {
  const h = monthHero(), last = monthDays();
  if (day === last) return [['shard', 25, h], ['wol', 1]];
  if (day % 7 === 0) return [['shard', day >= 28 ? 15 : 10, h]];
  if (day === 15) return [['seal', 1], ['shard', 5, h]];
  if (day === 10 || day === 20) return [['cry', 100]];
  return [[['sol', 3000]], [['folio', 3]], [['cry', 30]], [['pl', 5]], [['water', 60]], [['teeth', 50]]][(day - 1) % 6];
}
function openCalendar() {
  const L = loginState(), h = CH[monthHero()], days = monthDays(), can = loginCan(), today = L.n + (can ? 1 : 0);
  // The stamp belongs to the drawn modal (not the save and not DOM markup).
  // A click from a previous day/month cannot claim a different calendar page.
  claimLogin.rendered = { day: todayKey(), month: monthKey(), n: L.n, can };
  const total = Array.from({ length: days }, (_, i) => loginReward(i + 1)).flat().filter(r => r[0] === 'shard').reduce((a, r) => a + r[1], 0);
  const cells = Array.from({ length: days }, (_, i) => { const day = i + 1, rw = loginReward(day), [k, q, id] = rw[0], st = day <= L.n ? 'got' : day === today && can ? 'now' : 'fut', big = rw.some(r => r[0] === 'shard' || r[0] === 'wol' || r[0] === 'seal');
    return `<div class="cday ${st} ${big ? 'big' : ''}"><span class="cdn">${day}</span><span class="cdi">${k === 'shard' ? portrait(CH[id], 34) : `<span class="cdico">${ic(k)}</span>`}</span><span class="cdq mono">${k === 'shard' ? '×' + q : fmt(q)}</span>${rw.length > 1 ? `<span class="cdplus">+${rw[1][0] === 'shard' ? '' : ''}${ic(rw[1][0])}</span>` : ''}${st === 'got' ? '<span class="cdok">✓</span>' : ''}</div>`; }).join('');
  $('#overlay2').innerHTML = `<div class="detail info-layer" data-iclose="1"><div class="sheet calsheet" role="dialog" aria-modal="true" aria-labelledby="cal-h">
    <div class="calhero"><span class="biofig">${figureSVG(h, true)}</span><div><span class="chap" style="margin:0">${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}</span><h3 id="cal-h">Месяц героя: ${h.n}</h3><p class="sub" style="margin:4px 0 0">Заходите каждый день: награды идут по порядку. За месяц — ${total} осколков героя месяца, Печать Ландсраада и Вода жизни в последний день.</p>
      <div class="acts" style="margin-top:8px"><button class="btn mini" data-bio="${h.id}">Биография</button><button class="btn mini" data-iswitch="shard:${h.id}">Осколки героя</button></div></div></div>
    <div class="calgrid">${cells}</div>
    <div class="acts"><span class="lockd">Получено дней: ${L.n} из ${days}</span><button class="btn ${can ? 'go' : ''}" data-calclaim="1" ${can ? '' : 'disabled'} style="margin-left:auto">${can ? `Забрать награду дня ${L.n + 1}` : 'Возвращайтесь завтра'}</button><button class="btn" data-iclose="1">Закрыть</button></div>
  </div></div>`;
  set_infoKey(null);
}
function claimLogin() {
  if (!loadSave.writer.state().gated) {
    // Forensic B0 mode: preserve the historical behavior, NOT a production
    // fallback when a verified commit fails or Web Locks are lost.
    if (!loginCan()) return; const L = loginState(); L.n++; L.last = todayKey();
    const lines = giveRewards(loginReward(L.n)); persist(); toast(`День ${L.n}: ` + lines.join(' ')); render(); openCalendar();
    return;
  }
  const displayed = claimLogin.rendered;
  if (!displayed || !displayed.can || displayed.day !== todayKey() ||
      displayed.month !== monthKey()) return;
  const tx = loadSave.writer.transact(() => {
    const L = loginState(); // a detached candidate or a projected new month
    if (!loginCan() || L.m !== displayed.month || L.n !== displayed.n)
      return { commit: false, value: 'calendar-stale' };
    const n = L.n + 1, lines = giveRewards(loginReward(n));
    // The reward, its month/sequence, and the daily one-time marker settle
    // in the very same verified checkpoint (same v1 schema).
    S.login = { m: displayed.month, n, last: displayed.day };
    return { n, lines };
  }, giveRewards.presentationHooks);
  if (!tx.ok) return; // no toast, render, or reroll on denied/uncertain writes
  toast(`День ${tx.value.n}: ` + tx.value.lines.join(' '));
  render();
  openCalendar();
}

export { MONTHS, MONTH_HEROES, monthKey, monthHero, monthDays, loginState, loginCan, loginReward, openCalendar, claimLogin };
