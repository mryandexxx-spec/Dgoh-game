// BH9.4 closed battle adapter: fixed scripted loaner squads, no unlocked
// roster prerequisites besides account level 40. Reuses createBattle.
import { STORY_UNLOCK_EVENTS, validateStoryEvents } from '../data/bh94-unlock-events.js';
import { CH } from '../data/chars.js';
import { createBattle } from './battle/engine.js';
import { eventStatus, rewardStoryEventWin } from './bh94-story-events.js';

function prepareStoryUnlockBattle(save,eventId,stageIndex,day,seed=1){
  if(validateStoryEvents().length)return {ok:false,reason:'config'};
  const e=STORY_UNLOCK_EVENTS[eventId], status=eventStatus(save,eventId,day);
  if(!e||!status.ok)return {ok:false,reason:'event'};
  if(!Number.isInteger(stageIndex)||!status.stages[stageIndex])return {ok:false,reason:'stage'};
  if(!status.stages[stageIndex].available)return {ok:false,reason:'locked'};
  if(status.stages[stageIndex].completed && stageIndex!==e.repeat.stage)
    return {ok:false,reason:'completed'};
  if(status.stages[stageIndex].completed && !status.repeatAvailable)
    return {ok:false,reason:'daily-limit'};
  const stage=e.stages[stageIndex], missing=[...stage.allies,...stage.enemies].filter(id=>!CH[id]);
  if(missing.length)return {ok:false,reason:'missing-characters',missing};
  // Scripted loaners have no progression impact and cannot be kept.
  const lvl=Math.min(85,stage.lvl+5);
  const allies=stage.allies.map(id=>({id,lvl,stars:7,gear:stage.gear,relic:0}));
  const enemies=stage.enemies.map(id=>({id,lvl:stage.lvl,stars:7,gear:stage.gear,relic:0,pow:1}));
  const battle=createBattle(allies,enemies,{seed});
  return {ok:true,eventId,stageIndex,day,battle,
    squad:stage.allies.slice(),foes:stage.enemies.slice(),scene:stage.scene,scripted:true};
}
function finishStoryUnlockBattle(save,prepared,day){
  if(!prepared?.ok||!prepared.battle||prepared.battle.over!=='A'||prepared.battle.wavePending ||
    day!==prepared.day)return {ok:false,reason:'battle'};
  // A finished battle result is a one-use receipt. Re-rendering the result,
  // double-tapping or re-entering finish must never grant extra daily shards.
  if(prepared.settled)return {ok:false,reason:'already-settled'};
  const outcome=rewardStoryEventWin(save,prepared.eventId,prepared.stageIndex,day,true);
  if(outcome.ok)prepared.settled=true;
  return outcome;
}
export { prepareStoryUnlockBattle, finishStoryUnlockBattle };
