import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CH, CHARS } from '../src/data/chars.js';
import { BARON_APPROVED_REQUIREMENTS, BARON_APPROVED_STAGES } from '../src/data/baron-legend-approved.js';
import { BARON_BH9_ENCOUNTERS } from '../src/data/baron-legend-encounters.js';
import { prepareBaronBH9Battle, finishBaronBH9Battle } from '../src/logic/baron-bh9-battle.js';
import { baronBH9EventModel } from '../src/logic/baron-bh9-event.js';

import { checkOver, advanceWave } from '../src/logic/battle/engine.js';

assert.equal(CH.baron_legend.legendary,true);
assert.equal(CH.baron.legendary,undefined,'regular Baron remains ordinary');
assert.equal(CHARS.filter(h=>h.id==='baron_legend').length,1);
assert.notEqual(CH.baron_legend,CH.baron,'separate skills and identity');
assert.deepEqual(BARON_BH9_ENCOUNTERS.stages.map(s=>s.allies),BARON_APPROVED_STAGES.map(s=>s.allies));

// This pure engine regression intentionally avoids loading the browser UI and
// save modules directly under Node: those belong to the app's ordered bundle.
const migrated={
  roster:Object.fromEntries(BARON_APPROVED_REQUIREMENTS.map(r=>[r.id,{
    stars:0,shards:0,gear:1,lvl:1,relic:0
  }])),
  journeys:{muaddib:{0:true},baron_legend:{}}
};
migrated.roster.baron_legend={stars:0,shards:0,gear:1,lvl:1};
const savedBaron=structuredClone(migrated.roster.baron);
assert.equal(migrated.roster.baron_legend.stars,0);
assert.equal(migrated.roster.baron_legend.shards,0);
assert.deepEqual(migrated.journeys.baron_legend,{});
const source=readFileSync(new URL('../src/ui/views/baron-journey.js',import.meta.url),'utf8');
assert.match(source,/data-bh9-start/);
assert.match(source,/data-bh9-stage/);
assert.match(source,/data-open/);
assert.match(source,/baronBH9EventModel/);
assert.equal(prepareBaronBH9Battle(migrated,0).reason,'locked','all ten requirements compulsory');

for(const req of BARON_APPROVED_REQUIREMENTS)
  Object.assign(migrated.roster[req.id],{stars:req.stars,gear:req.gear,relic:req.relic,lvl:85});
assert.equal(baronBH9EventModel(migrated).requirements.completed,10);
assert.equal(baronBH9EventModel(migrated).stages[0].available,true);
assert.equal(prepareBaronBH9Battle(migrated,1).reason,'locked','no stage skip');
let html=baronJourneyHtml(migrated);
assert.match(html,/Восхождение Барона/);
assert.match(html,/10\/10/);
assert.match(html,/data-bh9-start="0"/);
assert.equal((html.match(/data-bh9-stage="/g)||[]).length,5);
assert.equal((html.match(/class="reqh /g)||[]).length,10);

const firstBaron=structuredClone(migrated.roster.baron);
const firstMuaddib=structuredClone(migrated.journeys.muaddib);
let earned=0;
for(let i=0;i<5;i++){
  const p=prepareBaronBH9Battle(migrated,i,{seed:101+i});
  assert.equal(p.ok,true,'stage '+i+' ready');
  assert.deepEqual(p.allyIds,BARON_APPROVED_STAGES[i].allies);
  assert.equal(p.waves,[1,1,1,2,2][i]);
  assert.equal(finishBaronBH9Battle(migrated,p).reason,'battle','no pre-victory reward');
  for(let w=0;w<p.waves;w++){
    const opponents=p.battle.units.filter(u=>u.side==='B');
    assert.equal(opponents.length,5);
    for(const enemy of opponents)enemy.alive=false;
    checkOver(p.battle);
    if(w<p.waves-1){
      assert.equal(p.battle.over,null,'must finish all waves');
      assert.equal(finishBaronBH9Battle(migrated,p).reason,'battle');
      assert.ok(advanceWave(p.battle));
    }
  }
  assert.equal(p.battle.over,'A');
  const a=finishBaronBH9Battle(migrated,p);
  assert.equal(a.ok,true);
  assert.equal(a.shardsGranted,[20,40,60,90,120][i]);
  earned+=a.shardsGranted;
  assert.equal(finishBaronBH9Battle(migrated,p).shardsGranted,0,'duplicate result never double-grants');
  const rep=prepareBaronBH9Battle(migrated,i,{seed:404+i});
  assert.equal(rep.ok,true,'replay allowed');
  for(let w=0;w<rep.waves;w++){
    for(const enemy of rep.battle.units.filter(u=>u.side==='B'))enemy.alive=false;
    checkOver(rep.battle);
    if(w<rep.waves-1)advanceWave(rep.battle);
  }
  assert.equal(finishBaronBH9Battle(migrated,rep).shardsGranted,0,'repeated battle no additional fragments');
}
assert.equal(earned,330);
assert.equal(migrated.roster.baron_legend.stars,7);
assert.equal(migrated.roster.baron_legend.shards,0);
assert.deepEqual(migrated.roster.baron,firstBaron);
assert.deepEqual(migrated.journeys.muaddib,firstMuaddib);
assert.deepEqual(Object.keys(migrated.journeys.baron_legend).sort(),['0','1','2','3','4']);
html=baronJourneyHtml(migrated,4);
assert.match(html,/Карточка легенды/);
assert.match(html,/5\/5/);
assert.equal(fillSave(structuredClone(migrated)).roster.baron_legend.stars,7,'reload preserves 7-star legend');
console.log('BH9.9 public hero, approved UI, ten gates, 5 fixed squads/7 waves, first wins=330, replays=0, saves, young Baron: PASS');
