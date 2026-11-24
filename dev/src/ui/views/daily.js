// ui/views/daily.js — строки 3779–3825 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { accXP, giveRewards, rewardWin, rewardsHtml } from '../rewards.js';
import { MONTHS, loginCan, monthHero } from '../overlays/calendar.js';
import { refreshAll } from '../overlays/sim.js';
import { loadSave, persist } from '../../core/save.js';
import { portrait } from '../../render2d/figures.js';
import { CH } from '../../data/chars.js';
import { dailyQuestIcon } from '../calendar-icons.js';
import { choamSupplyArt, choamMarkArt } from '../choam-art.js';
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
    rewardWin('Имперская поставка', lines, { sub: `Выполнено ${CHEST_NEED} заданий · кристаллы: ${cry} из 50–300` });
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
  rewardWin('Имперская поставка', tx.value.lines, {
    sub: `Выполнено ${CHEST_NEED} заданий · кристаллы: ${tx.value.cry} из 50–300`
  });
}

let dailyUiFilter = 'all';
function setDailyUiFilter(next) {
  if (!['all','done','prog','got'].includes(next)) return;
  dailyUiFilter = next;
  renderDaily();
}
function renderDaily() {
  const stamp = dly.clock.snapshot(), D = dly(stamp), got = dailyGot(stamp),
    all = activeDaily(), ready = all.filter(q => qState(q,stamp)==='done').length;
  claimQuest.renderedDay = D.d; claimChest.renderedDay = D.d;
  const msLeft = Math.max(0,stamp.nextMidnight-stamp.now),
    hh = Math.floor(msLeft/3.6e6), mm = Math.floor(msLeft%3.6e6/6e4);
  const order = {done:0,prog:1,got:2};
  const tasks = all.map((q,i)=>({q,i,st:qState(q,stamp)}))
    .sort((a,b)=>order[a.st]-order[b.st]||a.i-b.i)
    .filter(x=>dailyUiFilter==='all'||x.st===dailyUiFilter);
  const chestReady = got>=CHEST_NEED && !D.chest;
  const chestArt = choamSupplyArt(Boolean(D.chest));
  $('#view').innerHTML = `<div class="ui03-root ui03-daily">
    <div class="ui03-head">
      <div class="ui03-brand"><span class="ui03-mark" aria-hidden="true">${choamMarkArt()}</span><div class="ui03-brand-copy"><small>ИМПЕРСКИЙ АРХИВ</small><strong>Задания дня</strong></div></div>
      <nav class="ui03-tabs" aria-label="Задания и календарь"><button class="ui03-tab" aria-current="page">Задания</button><button class="ui03-tab" data-cal="1">Календарь</button></nav>
      <div class="ui03-right"><div class="ui03-timer"><small>ОБНОВЛЕНИЕ ЧЕРЕЗ</small><b>${hh} ч ${mm} мин</b></div><button class="ui03-close" data-v="lobby" aria-label="Вернуться в лагерь">×</button></div>
    </div>
    <div class="ui03-main daily">
      <section class="ui03-panel ui03-hero ui03-daily-supply ${D.chest?'opened':chestReady?'ready':''}" aria-labelledby="ui03-chest-title">
        <div class="ui03-eyebrow">НАГРАДА ЗА ПОСТОЯНСТВО</div><div class="ui03-title" id="ui03-chest-title">Имперская поставка</div>
        <div class="ui03-sub">Завершите ${CHEST_NEED} заданий и получите имперские припасы.</div>
        <div class="ui03-art">${chestArt}</div>
        <div class="ui03-progressline"><span>Получено наград</span><b>${Math.min(got,CHEST_NEED)} / ${CHEST_NEED}</b></div>
        <div class="ui03-pips" aria-label="Получено ${Math.min(got,CHEST_NEED)} из ${CHEST_NEED}">${Array.from({length:CHEST_NEED},(_,i)=>`<i class="ui03-pip ${i<got?'on':''}"></i>`).join('')}</div>
        <div class="ui03-rewards">${rewardsHtml(CHEST_RW, { art: true, artSeed: "supply" })}</div>
        <button class="ui03-button ${chestReady?'go':''}" data-qchest="1" ${chestReady?'':'disabled'}>${D.chest?'Получено':chestReady?'Открыть поставку':`Нужно ещё ${Math.max(0,CHEST_NEED-got)} заданий`}</button>
      </section>
      <section class="ui03-panel ui03-panel-list" aria-labelledby="ui03-tasks-title">
        <div class="ui03-listhead"><strong id="ui03-tasks-title">Оперативные задания <span class="ui03-count">${all.length}</span></strong>
          <div class="ui03-filters" role="group" aria-label="Фильтр заданий">${[['all','Все'],['done',`Готово ${ready}`],['prog','В процессе'],['got','Получено']].map(([key,label])=>`<button class="ui03-filter" data-ui03filter="${key}" aria-pressed="${dailyUiFilter===key}">${label}</button>`).join('')}</div>
        </div>
        <div class="ui03-scroll" aria-label="Список ежедневных заданий">${tasks.map(({q,st})=>{
          const c = Math.min(q.need,D.c[q.k]||0), alt=q.alt?Math.min(q.alt.need,D.c[q.alt.k]||0):0,
            ratio=q.alt?Math.max(c/q.need,alt/q.alt.need):c/q.need,
            progress=q.alt?`${c}/${q.need} или ${alt}/${q.alt.need}`:`${c}/${q.need}`;
          return `<div class="ui03-quest ${st}"><div class="ui03-qicon" data-ui03quest="${q.k}" aria-hidden="true">${dailyQuestIcon(q.k)}</div>
            <div class="ui03-qcopy"><b title="${q.n}">${q.n}</b><div class="ui03-qstat"><span>${progress}</span><span class="ui03-mini-meter"><i style="width:${Math.min(100,ratio*100)}%"></i></span></div></div>
            <div class="ui03-rewards">${rewardsHtml(q.rw, { art: true, artSeed: q.k })}</div>
            ${st==='got'?'<span class="ui03-qaction">✓ Получено</span>':st==='done'?`<button class="ui03-qaction go" data-qclaim="${q.k}">Забрать</button>`:q.go?`<button class="ui03-qaction" data-goto="${q.go}">Перейти</button>`:'<span class="ui03-qaction">В процессе</span>'}
          </div>`;}).join('')||'<p class="ui03-sub">Заданий в этой категории пока нет.</p>'}</div>
      </section>
    </div>
    <div class="ui03-foot"><div class="ui03-footinfo">День в Дюне: <strong>${got} / ${all.length}</strong> наград получено</div>
      <div class="ui03-foot-actions"><button class="ui03-button" data-cal="1">Календарь входа</button><button class="ui03-button ${ready?'go':''}" data-qall="1" ${ready?'':'disabled'}>Забрать всё (${ready})</button></div>
    </div>
  </div>`;
}


export { claimQuest, claimChest, renderDaily, setDailyUiFilter };
