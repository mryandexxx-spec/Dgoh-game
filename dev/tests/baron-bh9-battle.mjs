import assert from 'node:assert/strict';
import { CH } from '../src/data/chars.js';
import { BARON_APPROVED_REQUIREMENTS } from '../src/data/baron-legend-approved.js';
import { BARON_BH9_ENCOUNTERS } from '../src/data/baron-legend-encounters.js';
import { prepareBaronBH9Battle, finishBaronBH9Battle } from '../src/logic/baron-bh9-battle.js';
import { checkOver, advanceWave } from '../src/logic/battle/engine.js';

// The fake kits exist exclusively in this test. Production must never publish
// Margot/Yue or fabricate skill sets just to make the event playable.
const extra = {
  margot: { ...CH.jessica, id:'margot', n:'Test Margot', sn:'Margot', f:['bg'] },
  yue: { ...CH.thufir, id:'yue', n:'Test Yue', sn:'Yue', f:['atr'] },
};
const save = {
  roster: Object.fromEntries(BARON_APPROVED_REQUIREMENTS.map(r => [r.id, {
    lvl:85, stars:7, gear:13, relic:r.relic, sk:{ basic:1, special:1, ult:1, passive:1, leader:1 },
  }])),
  journeys:{ muaddib:{0:true}, baron_legend:{0:true,1:true,2:true} },
};
save.roster.baron_legend = { stars:0, shards:210, lvl:1, gear:1 };
const tuning = index => BARON_BH9_ENCOUNTERS.stages[index].waves.map(w => w.map(id => ({
  id, lvl:85, stars:7, gear:13, relic:4, pow:1,
})));
assert.equal(prepareBaronBH9Battle(save, 4, {heroDefs:extra}).reason, 'locked');
assert.equal(prepareBaronBH9Battle(save, 3).ok, true, 'default provisional tuning must prepare stage IV');
const missing = prepareBaronBH9Battle(save, 2, {enemyProgress:tuning(2)});
assert.equal(missing.reason, 'hero-kit');
assert.deepEqual(missing.missing, ['yue']);
const bad = tuning(3);bad[0][0].id='rabban';
assert.equal(prepareBaronBH9Battle(save,3,{heroDefs:extra,enemyProgress:bad}).reason,'balance');
const p = prepareBaronBH9Battle(save,3,{heroDefs:extra,enemyProgress:tuning(3),seed:77});
assert.equal(p.ok,true);
assert.equal(p.waves,2);
assert.deepEqual(p.allyIds, BARON_BH9_ENCOUNTERS.stages[3].allies);
assert.deepEqual(p.battle.units.filter(u=>u.side==='A').map(u=>u.def.id),p.allyIds);
assert.deepEqual(p.battle.units.filter(u=>u.side==='B').map(u=>u.def.id),BARON_BH9_ENCOUNTERS.stages[3].waves[0]);
assert.equal(finishBaronBH9Battle(save,p).reason,'battle');
const beforeAllies = p.battle.units.filter(u=>u.side==='A');
beforeAllies[0].hp -= 123;
for(const enemy of p.battle.units.filter(u=>u.side==='B'))enemy.alive=false;
checkOver(p.battle);
assert.equal(p.battle.wavePending,true);
assert.equal(p.battle.over,null);
assert.equal(finishBaronBH9Battle(save,p).reason,'battle');
const change=advanceWave(p.battle);
assert.equal(change.enemies.length,5);
assert.deepEqual(change.enemies.map(u=>u.def.id),BARON_BH9_ENCOUNTERS.stages[3].waves[1]);
assert.equal(p.battle.units.find(u=>u===beforeAllies[0]).hp,beforeAllies[0].hp,'same ally survives the wave');
for(const enemy of p.battle.units.filter(u=>u.side==='B'))enemy.alive=false;
checkOver(p.battle);
assert.equal(p.battle.over,'A');
assert.equal(finishBaronBH9Battle(save,p).shardsGranted,90);
assert.equal(save.roster.baron_legend.shards,300);
assert.equal(finishBaronBH9Battle(save,p).shardsGranted,0);
assert.deepEqual(save.journeys.muaddib,{0:true});
const q=prepareBaronBH9Battle(save,4,{heroDefs:extra,enemyProgress:tuning(4),seed:79});
assert.equal(q.ok,true);
for(let n=0;n<2;n++){
  for(const u of q.battle.units.filter(u=>u.side==='B'))u.alive=false;
  checkOver(q.battle);
  if(n===0) assert.ok(advanceWave(q.battle));
}
assert.equal(q.battle.over,'A');
const last=finishBaronBH9Battle(save,q);
assert.equal(last.shardsGranted,120);
assert.equal(last.unlocked,true);
assert.equal(save.roster.baron_legend.stars,7);
assert.equal(save.roster.baron_legend.shards,90,'surplus preserved');
console.log('BH9 real engine fixed squads, multi-wave carryover, victory-only rewards, no public kits: PASS');
