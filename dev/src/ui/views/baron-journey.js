// BH9.9 approved standalone legendary Baron event, using the existing UI kit.
// The hero card and combat HUD remain the common, unchanged components.
import { baronBH9EventModel } from '../../logic/baron-bh9-event.js';
import { BARON_BH9_ENCOUNTERS } from '../../data/baron-legend-encounters.js';
import { CH } from '../../data/chars.js';
import { S } from '../../core/state.js';
import { portrait } from '../../render2d/figures.js';

let selectedStage = 0;
const esc = x => String(x ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function selectBaronStage(i) {
  if (!Number.isInteger(i) || i < 0 || i >= 5) return false;
  selectedStage = i;
  return true;
}
function baronJourneyHtml(save, active = selectedStage) {
  const model = baronBH9EventModel(save);
  const index = Math.min(4, Math.max(0, active));
  const chosen = model.stages[index];
  const req = BARON_BH9_ENCOUNTERS.requirements;
  const completed = new Set(req.filter(r => {
    const p = save?.roster?.[r.id] || {};
    return (p.stars || 0) >= r.stars && (p.gear || 0) >= r.gear && (p.relic || 0) >= r.relic;
  }).map(r => r.id));
  const requirements = req.map(r => {
    const d = CH[r.id], p = save?.roster?.[r.id] || {};
    const ok = completed.has(r.id);
    return `<button type="button" data-open="${r.id}" class="reqh ${ok?'full':''}" style="min-width:0;display:flex;align-items:center;gap:4px;padding:3px;text-align:left">
       ${portrait(d,36)}<span style="min-width:0;font-size:10px"><b>${esc(d?.sn||r.id)}</b><small style="display:block;color:var(--dust)">${p.stars||0}/7★ · ${Math.min(13,p.gear||1)}/XIII · ДП ${p.relic||0}/${r.relic}</small></span></button>`;
  }).join('');
  const stages = model.stages.map(st => `<button type="button" data-bh9-stage="${st.index}"
    class="tier ${st.index===index?'on':''} ${st.completed?'done':''}" aria-pressed="${st.index===index}"
    style="width:100%;display:flex;align-items:center;text-align:left;gap:6px;padding:5px;margin-bottom:4px">
    <span style="color:var(--spice)">${['I','II','III','IV','V'][st.index]}</span>
    <span style="flex:1;min-width:0"><b>${esc(st.title)}</b><small style="display:block;color:var(--dust)">${st.waves} волн · ${st.completed?'Пройдено':st.available?'Доступен':'Закрыт'}</small></span>
    <span class="mono">${st.completed?'✓':'+'+st.rewardShards}</span></button>`).join('');
  const names = ids => esc(ids.map(id => CH[id]?.sn || id).join(' · '));
  const canStart = chosen.available && model.configurationReady;
  const hero = save?.roster?.baron_legend || {};
  return `<section class="bh9journey" style="padding:5px;max-width:100%;min-width:0">
  <button class="btn mini" data-v="legend">‹ К легендам</button>
  <h2 style="margin:4px 0;color:var(--sand)">Восхождение Барона</h2>
  <p class="sub" style="margin:3px 0 7px">Барон Владимир Харконнен · отдельный легендарный герой · ${model.completedStages}/5 этапов · ${hero.stars||0}★</p>
  <div class="grid2" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.7fr);gap:8px">
    <div class="panel" style="padding:7px;min-width:0">
      <h3>Герои пути · ${model.requirements.completed}/10</h3>
      <p class="sub" style="font-size:10px;margin:2px 0 5px">Все десять: 7★ · снаряжение XIII · требуемая Другая память. Нажмите героя, чтобы открыть его карточку.</p>
      <div class="req" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px">${requirements}</div>
      <p class="sub" style="font-size:10px;margin:5px 0 0">${model.unlocked?'Легенда получена · доступ сохранён':model.requirements.ready?'Все требования выполнены':'Первый бой заблокирован, пока все требования не выполнены'}</p>
    </div>
    <div class="panel" style="padding:7px;min-width:0">
      <h3>Пять этапов · ${model.completedStages}/5</h3>
      <div style="display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);gap:7px">
        <div style="min-width:0">${stages}</div>
        <div style="min-width:0">
          <h4 style="margin:0 0 3px;color:var(--sand)">${esc(chosen.title)}</h4>
          <p class="sub" style="font-size:10px;margin:3px 0"><b>Союзники:</b> ${names(chosen.allies)}</p>
          ${chosen.enemies.map((wave,i)=>`<p class="sub" style="font-size:10px;margin:3px 0"><b>Волна ${i+1}:</b> ${names(wave)}</p>`).join('')}
          <p class="sub" style="font-size:10px;margin:4px 0">Первая победа: +${chosen.rewardShards} осколков; повтор: 0. Всего 330 за пять этапов.</p>
          <button type="button" class="btn go" data-bh9-start="${index}" ${canStart?'':'disabled'}>${canStart?'В бой':chosen.lockReason==='requirements'?'Подготовьте 10 героев':chosen.lockReason==='sequence'?'Пройдите предыдущий':'Недоступно'}</button>
          ${model.unlocked?'<button class="btn" data-open="baron_legend" style="margin-top:4px">Карточка легенды</button>':''}
        </div>
      </div>
    </div>
  </div></section>`;
}
function renderBaronJourney() {
  const root = document.getElementById('view');
  if (root) root.innerHTML = baronJourneyHtml(S);
}
export { baronJourneyHtml, selectBaronStage, renderBaronJourney };
