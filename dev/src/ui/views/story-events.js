// BH9.6 approved story-event UI presenter. The module has no public route
// until Margot/Yue have finished art, roster migration and shard source setup.
// All markup is shared by both events; no separate hero-card layout.
import { STORY_EVENT_IDS, STORY_UNLOCK_EVENTS } from '../../data/bh94-unlock-events.js';
import { eventStatus } from '../../logic/bh94-story-events.js';
import { CH } from '../../data/chars.js';

const esc = x => String(x ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const validEvent = id => STORY_EVENT_IDS.includes(id) ? id : STORY_EVENT_IDS[0];
// Same local-calendar format as economy.todayKey, without importing browser-bound state.
const dateKey = () => new Date().toDateString();
// Total consumed shards at each ordinary star rank (normal 10-shard unlock).
const SPENT_TO_STARS = [0,10,25,50,80,145,230,330];
function storyEventsHtml(save, day=dateKey(), selected='margot_story', selectedStage=0) {
  const id=validEvent(selected), ev=STORY_UNLOCK_EVENTS[id], status=eventStatus(save,id,day);
  const hero=save?.roster?.[ev.hero], available=hero && hero.stars>=0 && Number.isInteger(hero.shards);
  const account=save?.acc?.lvl||0;
  const stageIdx=Math.max(0,Math.min(2,Number.isInteger(selectedStage)?selectedStage:0));
  const stage=ev.stages[stageIdx], progress=status.stages[stageIdx], first=!progress.completed;
  const cap=status.dailyRemaining>0, canFight=available && progress.available &&
    (first || (stageIdx===2 && cap && status.repeatAvailable)) && (hero.stars||0)<7;
  const stageStatus=st=>!status.accountReady?'Уровень 40+':
    !available?'Ожидает выхода героя':
    !st.available?'Сначала предыдущий этап':
    st.completed ? (st.index===2 ? (cap?'Повтор доступен':'Лимит на сегодня'):'Пройдено'):'Доступен';
  const token=id2=>CH[id2]?.sn||id2;
  const stageBtns=status.stages.map(st=>`<button type="button" data-story-stage="${st.index}"
    class="tier ${st.index===stageIdx?'on':''} ${st.completed?'done':''}" aria-pressed="${st.index===stageIdx}"
    style="display:flex;align-items:center;text-align:left;width:100%;padding:7px;margin-bottom:5px">
    <span class="mono" style="color:var(--spice);margin-right:9px">${st.index+1}.</span>
    <span style="flex:1;min-width:0"><b>${esc(st.title)}</b><small style="display:block;color:var(--dust)">${esc(stageStatus(st))}</small></span>
    <span class="mono">${st.completed?'✓':`+${st.rewardShards}`}</span></button>`).join('');
  const shardsEarned=(hero?.shards||0)+SPENT_TO_STARS[Math.min(7,hero?.stars||0)];
  const focus=ev.hero==='margot'?'МФ':'ВЮ';
  return `<section class="storyev" style="padding:5px;max-width:100%;min-width:0">
    <button type="button" class="btn" data-v="legend" style="margin-bottom:6px">‹ К легендам</button>
    <div class="ctabs">${STORY_EVENT_IDS.map(eid=>`<button class="ctab ${eid===id?'on':''}"
      data-story-event="${eid}">${esc(STORY_UNLOCK_EVENTS[eid].title)}</button>`).join('')}</div>
    <p class="sub" style="margin:4px 0 8px">Сюжетное событие · три этапа · фиксированные отряды · аккаунт 40+</p>
    <div class="grid2" style="grid-template-columns:minmax(0,1fr) minmax(0,1.7fr);gap:8px">
      <div class="panel" style="padding:9px;min-width:0">
        <div class="hd" style="display:flex;gap:8px;align-items:center">
          <div aria-hidden="true" class="mono" style="border:1px solid var(--spice);border-radius:6px;padding:10px;color:var(--sand)">${focus}</div>
          <div style="min-width:0"><h3 style="margin:0">${esc(ev.hero==='margot'?'Леди Марго Фенринг':'Доктор Веллингтон Юэ')}</h3><small class="sub">Обычный герой · без лидерской способности</small></div>
        </div>
        <p class="sub" style="margin:9px 0 4px">Этапы ${status.progress}/3 · ${hero?.stars||0}★ · ${esc(shardsEarned)}/330 осколков</p>
        <div style="height:6px;border-radius:4px;background:var(--night);overflow:hidden">
          <div style="width:${Math.min(100,Math.floor(shardsEarned/330*100))}%;height:100%;background:var(--spice)"></div>
        </div>
        <p class="sub" style="margin:9px 0">Повторы III этапа: ${status.dailyWins}/5 сегодня · за победу +2 осколка</p>
        ${account<40?`<p class="sub">Для входа нужен 40-й уровень аккаунта. Сейчас: ${account}.</p>`:
          !available?'<p class="sub">До подключения персонажа к ростеру событие закрыто; прогресс не списывается.</p>':''}
      </div>
      <div class="panel" style="min-width:0;padding:9px">
        <h3 style="margin:0 0 6px">Сюжетные бои</h3>
        <div style="display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:8px">
          <div style="min-width:0">${stageBtns}</div>
          <div style="min-width:0">
            <h4 style="margin:0 0 5px;color:var(--sand)">${esc(stage.title)}</h4>
            <p class="sub" style="margin:3px 0">Союзники: ${esc(stage.allies.map(token).join(' · '))}</p>
            <p class="sub" style="margin:3px 0">Противники: ${esc(stage.enemies.map(token).join(' · '))}</p>
            <p class="sub" style="margin:4px 0">Уровень врагов: ${stage.lvl} · награда ${first?ev.firstClearShards[stageIdx]:stageIdx===2?2:0} осколков</p>
            <button type="button" class="btn go" data-story-start="${id}:${stageIdx}"
              ${canFight?'':'disabled'}>${(hero?.stars||0)>=7?'Герой 7★':canFight?'В бой':esc(stageStatus(progress))}</button>
          </div>
        </div>
      </div>
    </div>
  </section>`;
}
let chosenEvent='margot_story', chosenStage=0;
function selectStoryEvent(id) {
  if(!STORY_EVENT_IDS.includes(id))return false;
  chosenEvent=id;chosenStage=0;return true;
}
function selectStoryStage(n) {
  if(!Number.isInteger(n)||n<0||n>2)return false;
  chosenStage=n;return true;
}
function selectedStory() {return {eventId:chosenEvent,stageIndex:chosenStage};}
function renderStoryEvents(save, day=dateKey()) {
  const root=document.getElementById('view');
  if(root)root.innerHTML=storyEventsHtml(save,day,chosenEvent,chosenStage);
}
export { storyEventsHtml, renderStoryEvents, selectStoryEvent, selectStoryStage, selectedStory };
