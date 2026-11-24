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
import { fmt } from '../../core/format.js';
import { calendarRewardIcon, choamMarkArt } from '../calendar-icons.js';
import { $ } from '../../core/dom.js';

// ===== login calendar =====
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTH_HEROES = ['stilgar', 'chani', 'jessica', 'duncan', 'gurney', 'kynes', 'thufir', 'feyd', 'fenring', 'mohiam', 'bashar', 'legion'];
const monthKey = (stamp = todayKey.clock.snapshot()) => stamp.month;
const monthHero = (stamp = todayKey.clock.snapshot()) => MONTH_HEROES[stamp.monthIndex];
const monthDays = (stamp = todayKey.clock.snapshot()) => stamp.daysInMonth;
// With mandatory Web Locks the calendar is a projection until a claim succeeds.
// Reading a new month must never silently reset the durable login counter.
const monthNumber = key => {
  const match = /^(\d{4})-(\d{1,2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]);
  return month >= 1 && month <= 12 ? year * 12 + month - 1 : null;
};
function loginState(stamp = todayKey.clock.snapshot()) {
  const key = stamp.month;
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
const loginCan = (stamp = todayKey.clock.snapshot()) => {
  const L = loginState(stamp), day = stamp.day;
  if (!loadSave.writer.state().gated)
    return L.last !== day && L.n < stamp.daysInMonth; // historical baseline
  const previousDay = Date.parse(L.last), currentDay = Date.parse(day);
  return L.m === stamp.month && Number.isInteger(L.n) && L.n >= 0 &&
    L.n < stamp.daysInMonth && L.last !== day &&
    !(Number.isFinite(previousDay) && previousDay > currentDay);
};
// The original v1 boot initializes a previously absent login month. Preserve
// that golden-compatible initialization IN the existing verified boot persist,
// while leaving every real cross-month rollover read-only until its claim.
loginCan.prepareBoot = () => {
  if (loadSave.writer.state().gated && !S.login.m) S.login.m = monthKey();
};
function loginReward(day, stamp = todayKey.clock.snapshot()) {
  const h = monthHero(stamp), last = stamp.daysInMonth;
  if (day === last) return [['shard', 25, h], ['wol', 1]];
  if (day % 7 === 0) return [['shard', day >= 28 ? 15 : 10, h]];
  if (day === 15) return [['seal', 1], ['shard', 5, h]];
  if (day === 10 || day === 20) return [['cry', 100]];
  return [[['sol', 3000]], [['folio', 3]], [['cry', 30]], [['pl', 5]], [['water', 60]], [['teeth', 50]]][(day - 1) % 6];
}

const ui03RewardNames = { shard:'Осколки героя',sol:'Солярии',folio:'Фолианты',cry:'Камни су',pl:'Пласт',water:'Вода',teeth:'Зубы червя',seal:'Печать Ландсраада',wol:'Вода жизни' };
function ui03RewardText(day, stamp) {
  return loginReward(day,stamp).map(([k,n]) => `${ui03RewardNames[k]||k} ×${n}`).join(' · ');
}
// Day selection is preview only, never a reward authorization.
function selectCalendarDay(day) {
  const root = document.querySelector('#overlay2 .ui03-calendar-screen');
  const displayed = claimLogin.rendered, stamp = todayKey.clock.snapshot();
  if (!root || !displayed || stamp.month !== displayed.month || !Number.isInteger(day) ||
      day < 1 || day > stamp.daysInMonth) return;
  root.querySelectorAll('[data-ui03day]').forEach(el=>{
    const selected = Number(el.dataset.ui03day) === day;
    el.classList.toggle('selected',selected);
    el.setAttribute('aria-pressed',String(selected));
  });
  const title = root.querySelector('#ui03-selected-reward');
  const state = root.querySelector('#ui03-selected-state');
  if (title) title.textContent = `День ${day}: ${ui03RewardText(day,stamp)}`;
  if (state) state.textContent = day <= displayed.n ? 'Уже получено' :
    day === displayed.n+1 && displayed.can ? 'Награда доступна сегодня' : 'Предстоящая награда';
}
function openCalendar() {
  const stamp = todayKey.clock.snapshot();
  const L = loginState(stamp), h = CH[monthHero(stamp)], days = stamp.daysInMonth,
    can = loginCan(stamp), today = L.n + (can ? 1 : 0);
  // Preserve the existing writer-bound day / month / sequence snapshot.
  claimLogin.rendered = {day:stamp.day,month:stamp.month,n:L.n,can};
  const total = Array.from({length:days},(_,i)=>loginReward(i+1,stamp))
    .flat().filter(r=>r[0]==='shard').reduce((a,r)=>a+r[1],0);
  const msLeft = Math.max(0,stamp.nextMidnight-stamp.now),
    hh = Math.floor(msLeft/3.6e6), mm = Math.floor(msLeft%3.6e6/6e4);
  const selected = Math.max(1,Math.min(days,L.n+(can?1:0)));
  const cells = Array.from({length:days},(_,i)=>{
    const day=i+1,rw=loginReward(day,stamp),
      st=day<=L.n?'got':day===today&&can?'now':'fut',
      big=rw.some(r=>['shard','wol','seal'].includes(r[0]));
    // A few milestone days have TWO rewards. Show both rather than hiding
    // the secondary seal/shard/Water-of-Life icon behind the preview text.
    const art = rw.map(([k,n,id],index)=>`<span class="ui03-dayitem ${index?'secondary':'primary'}" data-ui03reward="${k}">
      ${calendarRewardIcon(k,day,k==='shard'?portrait(CH[id],32):'')}</span>`).join('');
    const quantities = rw.map(([,n],index)=>`<span class="${index?'secondary':''}">×${fmt(n)}</span>`).join('');
    return `<button class="ui03-cday ${st} ${big?'big':''} ${rw.length>1?'multi':''} ${day===selected?'selected':''}" type="button"
      data-ui03day="${day}" aria-pressed="${day===selected}" title="${ui03RewardText(day,stamp)}"
      aria-label="Награда дня ${day}, ${ui03RewardText(day,stamp)}${st==='got'?', получена':st==='now'?', доступна':''}">
      <span class="ui03-daynum">${String(day).padStart(2,'0')}</span>
      <span class="ui03-dayitems">${art}</span>
      <span class="ui03-dayqty">${quantities}</span>${st==='got'?'<span class="ui03-daycheck">✓</span>':''}
    </button>`;
  }).join('');
  $('#overlay2').innerHTML = `<div class="detail info-layer ui03-calendar-overlay" data-iclose="1">
    <div class="ui03-root ui03-calendar-screen" role="dialog" aria-modal="true" aria-labelledby="ui03-cal-title">
      <div class="ui03-head">
        <div class="ui03-brand"><span class="ui03-mark" aria-hidden="true">${choamMarkArt()}</span><div class="ui03-brand-copy"><small>ИМПЕРСКИЙ АРХИВ</small><strong id="ui03-cal-title">Календарь входа</strong></div></div>
        <nav class="ui03-tabs" aria-label="Задания и календарь"><button class="ui03-tab" data-ui03daily="1">Задания</button><button class="ui03-tab" aria-current="page">Календарь</button></nav>
        <div class="ui03-right"><div class="ui03-timer"><small>НОВЫЙ ДЕНЬ ЧЕРЕЗ</small><b>${hh} ч ${mm} мин</b></div><button class="ui03-close" data-iclose="1" aria-label="Закрыть календарь">×</button></div>
      </div>
      <div class="ui03-main calendar">
        <section class="ui03-panel ui03-hero" aria-label="Герой месяца">
          <div class="ui03-eyebrow">${MONTHS[stamp.monthIndex]} ${stamp.year}</div>
          <div class="ui03-title">Месяц героя</div>
          <div class="ui03-sub">${h.n}</div>
          <div class="ui03-portrait"><span class="biofig">${figureSVG(h,true)}</span></div>
          <div class="ui03-cal-leftfoot"><div>Награды идут по порядку за входы. За месяц — ${total} осколков, Печать Ландсраада и Вода жизни.</div>
            <div class="ui03-progressline"><span>Получено дней</span><b>${L.n} / ${days}</b></div>
          </div>
          <div class="ui03-hero-actions"><button class="ui03-button" data-bio="${h.id}">Биография</button><button class="ui03-button" data-iswitch="shard:${h.id}">Осколки героя</button></div>
        </section>
        <section class="ui03-panel ui03-calendar-body" aria-label="Награды за вход">
          <div class="ui03-listhead"><strong>Награды за вход</strong><span class="ui03-count">${can?`День ${L.n+1} доступен`:'Сегодня получено'}</span></div>
          <div class="ui03-scroll" aria-label="Календарь с внутренней прокруткой"><div class="ui03-calendar-grid">${cells}</div></div>
          <div class="ui03-calfooter"><div class="ui03-cal-selected"><strong id="ui03-selected-reward">День ${selected}: ${ui03RewardText(selected,stamp)}</strong>
            <small id="ui03-selected-state">${selected<=L.n?'Уже получено':can?'Награда доступна сегодня':'Предстоящая награда'}</small></div>
            <button class="ui03-button ${can?'go':''}" data-calclaim="1" ${can?'':'disabled'}>${can?`Забрать день ${L.n+1}`:'Возвращайтесь завтра'}</button>
          </div>
        </section>
      </div>
      <div class="ui03-foot"><div class="ui03-footinfo">Награды открываются <strong>последовательно</strong></div>
        <div class="ui03-foot-actions"><button class="ui03-button" data-ui03daily="1">К заданиям</button><button class="ui03-button" data-iclose="1">Закрыть</button></div>
      </div>
    </div>
  </div>`;
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
  const displayed = claimLogin.rendered, stamp = todayKey.clock.snapshot();
  if (!displayed || !displayed.can || displayed.day !== stamp.day ||
      displayed.month !== stamp.month) return;
  const tx = loadSave.writer.transact(() => {
    // Re-snapshot at the verified checkpoint: stale day/month never pays.
    const current = todayKey.clock.snapshot();
    if (current.day !== stamp.day || current.month !== stamp.month)
      return { commit: false, value: 'calendar-stale' };
    const L = loginState(current); // a detached candidate or a projected new month
    if (!loginCan(current) || L.m !== displayed.month || L.n !== displayed.n)
      return { commit: false, value: 'calendar-stale' };
    const n = L.n + 1, lines = giveRewards(loginReward(n, current));
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

export { MONTHS, MONTH_HEROES, monthKey, monthHero, monthDays, loginState, loginCan, loginReward, openCalendar, claimLogin, selectCalendarDay };
