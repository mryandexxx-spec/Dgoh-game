// ui/views/daily.js — строки 3779–3825 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { accXP } from '../../logic/account.js';
import { MONTHS, loginCan, monthHero } from '../overlays/calendar.js';
import { giveRewards, rewardWin, rewardsHtml } from '../rewards.js';
import { refreshAll } from '../overlays/sim.js';
import { $ } from '../../core/util.js';
import { S } from '../../core/state.js';
import { persist } from '../../core/save.js';
import { todayKey } from '../../logic/economy.js';
import { portrait } from '../../render2d/figures.js';
import { CH } from '../../data/chars.js';

// ===== daily quests =====
const DAILY = [
  { k: 'login', n: 'Зайти в игру', need: 1, rw: [['cry', 20]] },
  { k: 'water', n: 'Потратить 120 Воды', need: 120, rw: [['cry', 30], ['sol', 2000]], go: 'camp' },
  { k: 'camp', n: 'Провести 8 боёв кампании (симуляции считаются)', need: 8, rw: [['folio', 3], ['sol', 3000]], go: 'camp' },
  { k: 'chron', n: 'Провести 3 боя в Хрониках Дюны (симуляции считаются)', need: 3, rw: [['rid', 20], ['cry', 20]], go: 'chron' },
  { k: 'shop', n: 'Совершить 3 покупки в Лавке сиетча', need: 3, rw: [['pl', 5], ['cry', 20]], go: 'shop' },
  { k: 'raid', n: 'Атаковать Шаи-Хулуда', need: 1, rw: [['teeth', 60]], go: 'raid' },
  { k: 'ult', n: 'Применить мощное умение 3 раза', need: 3, rw: [['folio', 2]], go: 'camp' },
  { k: 'skill', n: 'Повысить умение героя', need: 1, rw: [['sol', 1500]], go: 'squad' },
  { k: 'craft', n: 'Собрать предмет снаряжения', need: 1, rw: [['pl', 3]], go: 'squad' },
  { k: 'lvl', n: 'Повысить уровень героев 3 раза', need: 3, rw: [['sol', 1500]], go: 'squad' },
];
const CHEST_NEED = 7, CHEST_RW = [['seal', 1], ['cry', '50–300'], ['sol', 5000]], CHEST_CRY = [50, 300];
function dly() { if (S.daily.d !== todayKey()) S.daily = { d: todayKey(), c: {}, got: {}, chest: false }; return S.daily; }
function quest(k, n = 1) { if (!S) return; const D = dly(); D.c[k] = Math.max(0, (D.c[k] || 0) + n); }
function qState(q) { const D = dly(); return D.got[q.k] ? 'got' : (D.c[q.k] || 0) >= q.need ? 'done' : 'prog'; }
const dailyGot = () => DAILY.filter(q => dly().got[q.k]).length;
const dailyReady = () => DAILY.filter(q => qState(q) === 'done').length + (dailyGot() >= CHEST_NEED && !dly().chest ? 1 : 0);
function claimQuest(k, silent) {
  const q = DAILY.find(x => x.k === k); if (!q || qState(q) !== 'done') return;
  dly().got[k] = true; const lines = giveRewards(q.rw); lines.push(...accXP(10)); persist();
  if (!silent) { refreshAll(); rewardWin(q.n, lines); }
  return lines;
}
function claimChest() {
  const D = dly(); if (D.chest || dailyGot() < CHEST_NEED) return;
  D.chest = true; const cry = CHEST_CRY[0] + Math.round(Math.random() * (CHEST_CRY[1] - CHEST_CRY[0]) / 10) * 10;
  const lines = giveRewards(CHEST_RW.map(r => r[0] === 'cry' ? ['cry', cry] : r)); persist(); refreshAll();
  rewardWin('Сундук дня', lines, { sub: `Выполнено ${CHEST_NEED} заданий · кристаллы: ${cry} из 50–300` });
}
function renderDaily() {
  const D = dly(), got = dailyGot(), ready = DAILY.filter(q => qState(q) === 'done').length;
  const msLeft = new Date(new Date().setHours(24, 0, 0, 0)) - Date.now(), hh = Math.floor(msLeft / 3.6e6), mm = Math.floor(msLeft % 3.6e6 / 6e4);
  $('#view').innerHTML = `<h2>Ежедневные задания</h2><p class="sub">Задания обновляются в полночь — осталось ${hh} ч ${mm} мин. Получите награды за ${CHEST_NEED} заданий, чтобы открыть Сундук дня: Печать Ландсраада и случайно от 50 до 300 кристаллов.</p>
    <div class="chest ${D.chest ? 'opened' : got >= CHEST_NEED ? 'ready' : ''}">
      <div class="chico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10h18v10H3z" fill="#7a4a22"/><path d="M3 10c0-4 4-6 9-6s9 2 9 6z" fill="#a8642a"/><rect x="10" y="9" width="4" height="5" rx="1" fill="#f0c860"/><path d="M3 14h18" stroke="#3a2210" stroke-width="1.4"/></svg></div>
      <div class="chtx"><b>Сундук дня</b><div class="chbar"><i style="width:${Math.min(100, got / CHEST_NEED * 100)}%"></i></div><span class="mono">${Math.min(got, CHEST_NEED)}/${CHEST_NEED} заданий · ${rewardsHtml(CHEST_RW)}</span></div>
      <button class="btn ${got >= CHEST_NEED && !D.chest ? 'go' : ''}" data-qchest="1" ${got >= CHEST_NEED && !D.chest ? '' : 'disabled'}>${D.chest ? 'Получено' : 'Открыть'}</button>
    </div>
    <div class="qhead"><p class="chap" style="margin:18px 0 8px">Задания дня</p>${ready ? `<button class="btn go mini" data-qall="1">Забрать всё (${ready})</button>` : ''}</div>
    <div class="quests">${DAILY.map(q => { const st = qState(q), c = Math.min(q.need, D.c[q.k] || 0);
      return `<div class="quest ${st}"><div class="qtx"><b>${q.n}</b><div class="qbar"><i style="width:${c / q.need * 100}%"></i></div><span class="mono">${c}/${q.need}</span></div>
        <div class="qrw">${rewardsHtml(q.rw)}</div>
        <div class="qbtn">${st === 'got' ? '<span class="qok">✓ Получено</span>' : st === 'done' ? `<button class="btn go mini" data-qclaim="${q.k}">Забрать</button>` : q.go ? `<button class="btn mini" data-goto="${q.go}">Перейти</button>` : ''}</div></div>`; }).join('')}</div>
    <div class="calcard"><div>${portrait(CH[monthHero()], 56, '#e0a83a')}</div><div><b>Календарь входа</b><span>${MONTHS[new Date().getMonth()]} — месяц героя ${CH[monthHero()].n}. ${loginCan() ? 'Сегодняшняя награда ждёт!' : 'Сегодняшняя награда получена.'}</span></div><button class="btn ${loginCan() ? 'go' : ''}" data-cal="1">Открыть</button></div>`;
}

export { DAILY, CHEST_NEED, CHEST_RW, CHEST_CRY, dly, quest, qState, dailyGot, dailyReady, claimQuest, claimChest, renderDaily };
