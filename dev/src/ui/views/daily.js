// ui/views/daily.js — строки 3779–3825 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { accXP, giveRewards, rewardWin, rewardsHtml } from '../rewards.js';
import { MONTHS, loginCan, monthHero } from '../overlays/calendar.js';
import { refreshAll } from '../overlays/sim.js';
import { persist } from '../../core/save.js';
import { portrait } from '../../render2d/figures.js';
import { CH } from '../../data/chars.js';
import { $ } from '../../core/dom.js';
import { CHEST_CRY, CHEST_NEED, CHEST_RW, DAILY, dailyGot, dly, qState } from '../../logic/daily.js';

// ===== daily quests =====
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

export { claimQuest, claimChest, renderDaily };
