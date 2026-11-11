import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CH } from '../src/data/chars.js';
import { prepareStoryUnlockBattle, finishStoryUnlockBattle } from '../src/logic/bh94-story-battle.js';
import { checkOver } from '../src/logic/battle/engine.js';
const ui=readFileSync(new URL('../src/ui/battle/battle-ui.js',import.meta.url),'utf8');
const events=readFileSync(new URL('../src/ui/events.js',import.meta.url),'utf8');
const save=readFileSync(new URL('../src/core/save.js',import.meta.url),'utf8');

assert.match(ui,/function launchStoryUnlock\(prepared\)/);
assert.match(ui,/cfg\.mode === 'story_unlock' \? cfg\.prepared\.battle/);
assert.match(ui,/else if \(cfg\.mode === 'story_unlock'\)/);
assert.match(ui,/finishStoryUnlockBattle\(S, cfg\.prepared, todayKey\(\)\)/);
assert.match(ui,/\n  persist\(\);\n  const el = document\.createElement\('div'\)/);
assert.match(events,/prepareStoryUnlockBattle\(S,id,Number\(index\),todayKey\(\)\)/,'story click must re-check eligibility');
assert.match(events,/if\(!prepared\.ok\)/,'story click must reject unavailable heroes');
assert.doesNotMatch(save,/s\.storyEvents \?\?= \{\}/);
assert.ok(CH.margot && CH.yue,'Two normal heroes are now registered');

const saveData={acc:{lvl:40},roster:{margot:{stars:0,shards:0},yue:{stars:0,shards:0}},storyEvents:{}};
const prepared=prepareStoryUnlockBattle(saveData,'margot_story',0,'D1',93);
assert.equal(prepared.ok,true);
assert.equal(finishStoryUnlockBattle(saveData,prepared,'D1').reason,'battle','no reward before victory');
for(const unit of prepared.battle.units.filter(u=>u.side==='B'))unit.alive=false;
checkOver(prepared.battle);
assert.equal(finishStoryUnlockBattle(saveData,prepared,'D1').shardsGranted,20);
const snapshot=JSON.stringify(saveData);
assert.equal(finishStoryUnlockBattle(saveData,prepared,'D1').reason,'already-settled');
assert.equal(JSON.stringify(saveData),snapshot,'double finish must not mutate save');
assert.equal(saveData.roster.margot.shards,10);
assert.equal(saveData.roster.margot.stars,1);
assert.equal(saveData.roster.yue.shards,0);

const defeated=prepareStoryUnlockBattle(saveData,'margot_story',1,'D1',94);
assert.equal(defeated.ok,true);
defeated.battle.over='B';
assert.equal(finishStoryUnlockBattle(saveData,defeated,'D1').reason,'battle');
assert.equal(JSON.stringify(saveData),snapshot,'defeat must not mutate save');
console.log('BH9.5 gated UI battle mode, same-engine finish, once-only reward and legacy save: PASS');
