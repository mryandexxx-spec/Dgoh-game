// ui/views/daily.js — строки 3779–3825 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { accXP, giveRewards, rewardWin, rewardsHtml } from '../rewards.js';
import { MONTHS, loginCan, monthHero } from '../overlays/calendar.js';
import { refreshAll } from '../overlays/sim.js';
import { loadSave, persist } from '../../core/save.js';
import { portrait } from '../../render2d/figures.js';
import { CH } from '../../data/chars.js';
import { $ } from '../../core/dom.js';
import { CHEST_CRY, CHEST_NEED, CHEST_RW, DAILY, activeDaily, dailyGot, dly, qState } from '../../logic/daily.js';

// ===== daily quests =====
// The historical ungated branch is retained only for B0's forensic harness.
// All ordinary booted sessions have a mandatory writer gate: never fall back
// to a direct persist after a refused or ambiguous verified transaction.
const claimDay = (expectedDay, stamp) => expectedDay == null ? stamp.day : String(expectedDay);
const claimDayCurrent = (day, stamp) => day === stamp.day;
function claimQuest(k, silent = false, expectedDay = null) {
  if (!loadSave.writer.state().gated) {
    const q = activeDaily().find(x => x.k === k); if (!q || qState(q) !== 'done') return;
    dly().got[k] = true; const lines = giveRewards(q.rw); lines.push(...accXP(10)); persist();
    if (!silent) { refreshAll(); rewardWin(q.n, lines); }
    return lines;
  }
  const stamp = dly.clock.snapshot(), day = claimDay(expectedDay, stamp);
  if (!claimDayCurrent(day, stamp)) return;
  const pendingBefore = accXP.pendingQueue.length;
  const tx = loadSave.writer.transact(() => {
    const current = dly.clock.snapshot();
    if (!claimDayCurrent(day, current)) return { commit: false, value: 'stale-day' };
    const D = dly(current);
    if (D.d !== day) return { commit: false, value: 'stale-day' };
    const q = activeDaily().find(x => x.k === k);
    if (!q || qState(q, current) !== 'done') return { commit: false, value: 'not-ready' };
    D.got[k] = true;
    const lines = giveRewards(q.rw);
    lines.push(...accXP(10));
    return { title: q.n, lines };
  }, giveRewards.presentationHooks);
  if (!tx.ok) { accXP.pendingQueue.length = pendingBefore; return; }
  if (!silent) { refreshAll(); rewardWin(tx.value.title, tx.value.lines); }
  return tx.value.lines;
}
function claimAllQuests(expectedDay = null) {
  if (!loadSave.writer.state().gated) {
    const lines = [];
    for (const q of DAILY) if (qState(q) === 'done') lines.push(...(claimQuest(q.k, true) || []));
    refreshAll(); if (lines.length) rewardWin('Задания дня', lines);
    return lines;
  }
  const stamp = dly.clock.snapshot(), day = claimDay(expectedDay, stamp);
  if (!claimDayCurrent(day, stamp)) return;
  const pendingBefore = accXP.pendingQueue.length;
  const tx = loadSave.writer.transact(() => {
    const current = dly.clock.snapshot();
    if (!claimDayCurrent(day, current)) return { commit: false, value: 'stale-day' };
    const D = dly(current);
    if (D.d !== day) return { commit: false, value: 'stale-day' };
    const ready = activeDaily().filter(q => qState(q, current) === 'done');
    if (!ready.length) return { commit: false, value: 'not-ready' };
    const lines = [];
    for (const q of ready) {
      D.got[q.k] = true;
      lines.push(...giveRewards(q.rw), ...accXP(10));
    }
    return lines;
  }, giveRewards.presentationHooks);
  if (!tx.ok) { accXP.pendingQueue.length = pendingBefore; return; }
  refreshAll();
  if (tx.value.length) rewardWin('Задания дня', tx.value);
  return tx.value;
}
// Avoid a new named ESM export or import edge: events.js already imports claimQuest.
claimQuest.all = claimAllQuests;
function claimChest(expectedDay = null) {
  if (!loadSave.writer.state().gated) {
    const D = dly(); if (D.chest || dailyGot() < CHEST_NEED) return;
    D.chest = true; const cry = CHEST_CRY[0] + Math.round(Math.random() * (CHEST_CRY[1] - CHEST_CRY[0]) / 10) * 10;
    const lines = giveRewards(CHEST_RW.map(r => r[0] === 'cry' ? ['cry', cry] : r)); persist(); refreshAll();
    rewardWin('Сундук дня', lines, { sub: `Выполнено ${CHEST_NEED} заданий · кристаллы: ${cry} из 50–300` });
    return;
  }
  const stamp = dly.clock.snapshot(), day = claimDay(expectedDay, stamp);
  if (!claimDayCurrent(day, stamp)) return;
  const tx = loadSave.writer.transact(() => {
    const current = dly.clock.snapshot();
    if (!claimDayCurrent(day, current)) return { commit: false, value: 'stale-day' };
    const D = dly(current);
    if (D.d !== day || D.chest || dailyGot(current) < CHEST_NEED)
      return { commit: false, value: 'not-claimable' };
    // Keep the exact original RNG draw and rounding, but only on the detached
    // candidate. An uncertain primary write fences the realm: never reroll.
    const cry = CHEST_CRY[0] + Math.round(Math.random() * (CHEST_CRY[1] - CHEST_CRY[0]) / 10) * 10;
    D.chest = true;
    const lines = giveRewards(CHEST_RW.map(r => r[0] === 'cry' ? ['cry', cry] : r));
    return { cry, lines };
  }, giveRewards.presentationHooks);
  if (!tx.ok) return;
  refreshAll();
  rewardWin('Сундук дня', tx.value.lines, {
    sub: `Выполнено ${CHEST_NEED} заданий · кристаллы: ${tx.value.cry} из 50–300`
  });
}
function renderDaily() {
  const stamp = dly.clock.snapshot(), D = dly(stamp),
    got = dailyGot(stamp), ready = activeDaily().filter(q => qState(q, stamp) === 'done').length;
  // The rendered day belongs to the existing handler, not the save or DOM.
  // An old screen cannot claim a new day until it has been rendered anew.
  claimQuest.renderedDay = D.d;
  claimChest.renderedDay = D.d;
  // Civil midnight from this one local Date snapshot (DST 23/25h safe).
  const msLeft = Math.max(0, stamp.nextMidnight - stamp.now),
    hh = Math.floor(msLeft / 3.6e6), mm = Math.floor(msLeft % 3.6e6 / 6e4);
  $('#view').innerHTML = `<h2>Ежедневные задания</h2><p class="sub">Задания обновляются в полночь — осталось ${hh} ч ${mm} мин. Получите награды за ${CHEST_NEED} заданий, чтобы открыть Сундук дня: Печать Ландсраада и случайно от 50 до 300 кристаллов.</p>
    <div class="chest ${D.chest ? 'opened' : got >= CHEST_NEED ? 'ready' : ''}">
      <div class="chico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10h18v10H3z" fill="#7a4a22"/><path d="M3 10c0-4 4-6 9-6s9 2 9 6z" fill="#a8642a"/><rect x="10" y="9" width="4" height="5" rx="1" fill="#f0c860"/><path d="M3 14h18" stroke="#3a2210" stroke-width="1.4"/></svg></div>
      <div class="chtx"><b>Сундук дня</b><div class="chbar"><i style="width:${Math.min(100, got / CHEST_NEED * 100)}%"></i></div><span class="mono">${Math.min(got, CHEST_NEED)}/${CHEST_NEED} заданий · ${rewardsHtml(CHEST_RW)}</span></div>
      <button class="btn ${got >= CHEST_NEED && !D.chest ? 'go' : ''}" data-qchest="1" ${got >= CHEST_NEED && !D.chest ? '' : 'disabled'}>${D.chest ? 'Получено' : 'Открыть'}</button>
    </div>
    <div class="qhead"><p class="chap" style="margin:18px 0 8px">Задания дня</p>${ready ? `<button class="btn go mini" data-qall="1">Забрать всё (${ready})</button>` : ''}</div>
    <div class="quests">${activeDaily().map(q => { const st = qState(q, stamp), c = Math.min(q.need, D.c[q.k] || 0),
        alternativeCount = q.alt ? Math.min(q.alt.need, D.c[q.alt.k] || 0) : 0,
        progressRatio = q.alt ? Math.max(c / q.need, alternativeCount / q.alt.need) : c / q.need,
        progressText = q.alt ? `${c}/${q.need} или ${alternativeCount}/${q.alt.need}` : `${c}/${q.need}`;
      return `<div class="quest ${st}"><div class="qtx"><b>${q.n}</b><div class="qbar"><i style="width:${progressRatio * 100}%"></i></div><span class="mono">${progressText}</span></div>
        <div class="qrw">${rewardsHtml(q.rw)}</div>
        <div class="qbtn">${st === 'got' ? '<span class="qok">✓ Получено</span>' : st === 'done' ? `<button class="btn go mini" data-qclaim="${q.k}">Забрать</button>` : q.go ? `<button class="btn mini" data-goto="${q.go}">Перейти</button>` : ''}</div></div>`; }).join('')}</div>
    <div class="calcard"><div>${portrait(CH[monthHero(stamp)], 56, '#e0a83a')}</div><div><b>Календарь входа</b><span>${MONTHS[stamp.monthIndex]} — месяц героя ${CH[monthHero(stamp)].n}. ${loginCan(stamp) ? 'Сегодняшняя награда ждёт!' : 'Сегодняшняя награда получена.'}</span></div><button class="btn ${loginCan(stamp) ? 'go' : ''}" data-cal="1">Открыть</button></div>`;
}

export { claimQuest, claimChest, renderDaily };
