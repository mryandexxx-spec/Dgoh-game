// BH9.4 pure event state machine: first clears, daily repeats, normal hero shards.
// No UI, DOM, localStorage, or public roster insertion. The caller must persist
// the entire save after a successful transaction.
import { STORY_UNLOCK_EVENTS, validateStoryEvents } from '../data/bh94-unlock-events.js';

const NORMAL_UNLOCK_SHARDS = 10;
const NORMAL_TOTAL_TO_7_STARS = 330;
function eventProgress(save, id) {
  const p=save?.storyEvents?.[id];
  return p && typeof p==='object' && !Array.isArray(p) ? p : {};
}
function eventStatus(save,id,day) {
  const event=STORY_UNLOCK_EVENTS[id];
  if (!event || validateStoryEvents().length) return {ok:false,reason:'config'};
  const p=eventProgress(save,id), done=p.done||{};
  const today=p.day===day ? p.dailyWins||0 : 0;
  const accountReady=(save?.acc?.lvl||0)>=event.minAccountLevel;
  const stages=event.stages.map((stage,i)=>({
    index:i,title:stage.title,completed:done[i]===true,
    available:accountReady && (i===0||done[i-1]===true),
    rewardShards:event.firstClearShards[i],
    allies:[...stage.allies],enemies:[...stage.enemies],
  }));
  return {ok:true,id,hero:event.hero,accountReady,levelRequired:event.minAccountLevel,
    stages,progress:stages.filter(x=>x.completed).length,
    dailyWins:today,dailyRemaining:Math.max(0,event.repeat.winsPerDay-today),
    repeatAvailable:accountReady && done[2]===true && today<event.repeat.winsPerDay};
}
function rewardStoryEventWin(save,id,stageIndex,day,battleWon) {
  if(battleWon!==true)return {ok:false,reason:'battle'};
  if(typeof day!=='string'||!day||day.length>100)return {ok:false,reason:'day'};
  const status=eventStatus(save,id,day);
  if(!status.ok)return status;
  if(!Number.isInteger(stageIndex)||!status.stages[stageIndex])return {ok:false,reason:'stage'};
  if(!status.stages[stageIndex].available)return {ok:false,reason:'locked'};
  const event=STORY_UNLOCK_EVENTS[id], current=eventProgress(save,id);
  const first=!status.stages[stageIndex].completed;
  if(!first && stageIndex!==event.repeat.stage)return {ok:true,shardsGranted:0,firstClear:false,repeat:false};
  if(!first && !status.repeatAvailable)return {ok:false,reason:'daily-limit'};
  const hero=save?.roster?.[event.hero];
  // Hero records must be added by the future approved release migration,
  // never by a hidden event action.
  if(!hero||!Number.isInteger(hero.stars)||hero.stars<0||hero.stars>7||
    !Number.isInteger(hero.shards)||hero.shards<0)return {ok:false,reason:'hero-unavailable'};
  if(hero.stars>=7)return {ok:true,shardsGranted:0,firstClear:false,repeat:false,maxStars:true};
  const reward=first?event.firstClearShards[stageIndex]:event.repeat.shardsPerWin;
  const progressed={...current,done:{...(current.done||{})}};
  if(first)progressed.done[stageIndex]=true;
  else{
    if(progressed.day!==day){progressed.day=day;progressed.dailyWins=0;}
    progressed.dailyWins=(progressed.dailyWins||0)+1;
  }
  // Uses the ordinary nonlegendary 10-shard first unlock. Future upgrades
  // consume SHARDS_NEXT by the normal hero UI; do not auto-grant 7 stars.
  let shards=hero.shards+reward,stars=hero.stars;
  if(stars===0 && shards>=NORMAL_UNLOCK_SHARDS){stars=1;shards-=NORMAL_UNLOCK_SHARDS;}
  save.storyEvents ??={};
  save.storyEvents[id]=progressed;
  hero.stars=stars;hero.shards=shards;
  return {ok:true,shardsGranted:reward,firstClear:first,repeat:!first,
    unlocked:stars>0,stars};
}
export { NORMAL_TOTAL_TO_7_STARS, NORMAL_UNLOCK_SHARDS, eventProgress, eventStatus, rewardStoryEventWin };
