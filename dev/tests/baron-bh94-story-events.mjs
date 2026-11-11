import assert from 'node:assert/strict';
import { CH } from '../src/data/chars.js';
import { STORY_UNLOCK_EVENTS,validateStoryEvents } from '../src/data/bh94-unlock-events.js';
import { eventStatus,rewardStoryEventWin,NORMAL_TOTAL_TO_7_STARS } from '../src/logic/bh94-story-events.js';
import { prepareStoryUnlockBattle,finishStoryUnlockBattle } from '../src/logic/bh94-story-battle.js';
import { checkOver } from '../src/logic/battle/engine.js';
import { readFileSync } from 'node:fs';
const economySource=readFileSync(new URL('../src/logic/economy.js',import.meta.url),'utf8');
const saveSource=readFileSync(new URL('../src/core/save.js',import.meta.url),'utf8');
const SHARDS_NEXT=JSON.parse('['+economySource.match(/const SHARDS_NEXT = \[([^\]]+)\]/)[1]+']');
assert.ok(!saveSource.includes('s.storyEvents ??= {}'), 'legacy saves must not change before first story reward');

assert.deepEqual(validateStoryEvents(),[]);
assert.deepEqual(Object.keys(STORY_UNLOCK_EVENTS),['margot_story','yue_story']);
assert.equal(SHARDS_NEXT.slice(1,7).reduce((a,b)=>a+b,10),NORMAL_TOTAL_TO_7_STARS);
assert.equal(NORMAL_TOTAL_TO_7_STARS,330);
assert.ok(CH.margot && CH.yue, 'Both normal heroes are available in roster');
const seed={v:1,roster:Object.fromEntries(Object.keys(CH).map(id=>[id,{shards:0,stars:0,lvl:1,gear:1}])),journeys:{muaddib:{0:true}},acc:{lvl:39}};
assert.equal(seed.roster.margot,undefined);
assert.equal(seed.roster.yue,undefined);
assert.equal(prepareStoryUnlockBattle(seed,'margot_story',0,'D0').reason,'locked');
seed.acc.lvl=40;
assert.equal(prepareStoryUnlockBattle(seed,'margot_story',0,'D0').ok,true);
assert.equal(prepareStoryUnlockBattle(seed,'margot_story',1,'D0').reason,'locked');
assert.equal(rewardStoryEventWin(seed,'margot_story',0,'D0',false).reason,'battle');
assert.equal(rewardStoryEventWin(seed,'margot_story',0,'D0',true).reason,'hero-unavailable');
assert.equal(seed.storyEvents,undefined,'no progress created on denied action');
seed.roster.margot={stars:0,shards:0,lvl:1,gear:1};
seed.roster.yue={stars:0,shards:0,lvl:1,gear:1};
for(const id of ['margot_story','yue_story']){
  for(let index=0;index<3;index++){
    const p=prepareStoryUnlockBattle(seed,id,index,'D0',31+index);
    assert.equal(p.ok,true,id+' step '+index);
    assert.equal(p.squad.length,5);
    assert.equal(new Set(p.squad).size,5);
    assert.deepEqual(p.battle.units.filter(u=>u.side==='A').map(u=>u.def.id),
      STORY_UNLOCK_EVENTS[id].stages[index].allies);
    assert.equal(finishStoryUnlockBattle(seed,p,'D0').reason,'battle');
    for(const enemy of p.battle.units.filter(u=>u.side==='B'))enemy.alive=false;
    checkOver(p.battle);
    assert.equal(p.battle.over,'A');
    assert.equal(finishStoryUnlockBattle(seed,p,'D1').reason,'battle','cannot claim on a different day');
    const result=finishStoryUnlockBattle(seed,p,'D0');
    assert.equal(result.ok,true);
    assert.equal(result.shardsGranted,[20,30,50][index]);
    assert.equal(result.firstClear,true);
    const replay=finishStoryUnlockBattle(seed,p,'D0');
    assert.equal(replay.ok,false,'one battle cannot produce multiple rewards');
    assert.equal(replay.reason,'already-settled');
  }
  assert.equal(eventStatus(seed,id,'D0').progress,3);
  assert.equal(seed.roster[STORY_UNLOCK_EVENTS[id].hero].stars,1);
  assert.equal(seed.roster[STORY_UNLOCK_EVENTS[id].hero].shards,90);
  // Each of the five daily claims must come from a distinct completed fight.
  for(let i=0;i<5;i++){
    const p=prepareStoryUnlockBattle(seed,id,2,'D0',i+57);
    assert.equal(p.ok,true);
    for(const u of p.battle.units.filter(u=>u.side==='B'))u.alive=false;
    checkOver(p.battle);
    assert.equal(finishStoryUnlockBattle(seed,p,'D0').shardsGranted,2);
    assert.equal(finishStoryUnlockBattle(seed,p,'D0').reason,'already-settled');
  }
  assert.equal(eventStatus(seed,id,'D0').dailyRemaining,0);
  assert.equal(prepareStoryUnlockBattle(seed,id,2,'D0').reason,'daily-limit');
  assert.equal(eventStatus(seed,id,'D1').dailyRemaining,5);
  assert.equal(eventStatus(seed,id,'D1').progress,3,'daily reset never clears story');
  for(let d=1;d<=22;d++)for(let n=0;n<5;n++){
    const result=rewardStoryEventWin(seed,id,2,'D'+d,true);
    assert.equal(result.shardsGranted,2);
  }
  // First clear 100 + 5*2 on D0 + 22*10 = 330 total.
  assert.equal(seed.roster[STORY_UNLOCK_EVENTS[id].hero].shards,320);
  assert.equal(seed.roster[STORY_UNLOCK_EVENTS[id].hero].stars,1);
  // Standard star-up purchases preserve ordinary economy.
  const h=seed.roster[STORY_UNLOCK_EVENTS[id].hero];
  for(let star=1;star<7;star++){
    assert.ok(h.shards>=SHARDS_NEXT[star]);
    h.shards-=SHARDS_NEXT[star];h.stars++;
  }
  assert.equal(h.stars,7);
  assert.equal(h.shards,0);
  assert.equal(rewardStoryEventWin(seed,id,2,'D24',true).shardsGranted,0,
    '7-star hero never becomes an unlimited conversion farm');
}
assert.deepEqual(seed.journeys.muaddib,{0:true});
assert.equal(seed.roster.baron_legend,undefined);
assert.ok(seed.storyEvents.margot_story.done[2] && seed.storyEvents.yue_story.done[2]);
console.log('BH9.4 story fixed squads, 40+ gate, two independent 23-day shard tracks, caps, normal 7 stars: PASS');
