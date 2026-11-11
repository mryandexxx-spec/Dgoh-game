import assert from 'node:assert/strict';
import { CH } from '../src/data/chars.js';
import { createBattle } from '../src/logic/battle/engine.js';
import { HERO_IDS,HERO_LOOKS,standardFutureDefs,releaseAssetCheck,stageFutureRoster } from '../src/logic/bh97-hero-release.js';
const defs=standardFutureDefs();
assert.deepEqual(HERO_IDS,['margot','yue']);
assert.equal(CH.margot.n,defs.margot.n,'approved normal hero in CHARS');
assert.equal(CH.yue.n,defs.yue.n);
assert.equal(defs.margot.role,'sup');
assert.equal(defs.yue.role,'heal');
assert.equal(defs.margot.side,'dark');
assert.equal(defs.yue.side,'light');
assert.equal(defs.margot.leader,undefined);
assert.equal(defs.yue.leader,undefined);
for(const id of HERO_IDS){
 assert.ok(defs[id].basic && defs[id].special && defs[id].ult && defs[id].passive);
 assert.equal(HERO_LOOKS[id].factions.join(','),defs[id].f.join(','));
}
const assets=HERO_IDS.flatMap(id=>['portrait','model','anim'].map(k=>HERO_LOOKS[id][k]));
const legacy={v:1,roster:{leto:{stars:7,shards:42,lvl:85,gear:13}},
  journeys:{muaddib:{0:true}},storyEvents:{margot_story:{done:{0:true}}}};
const snapshot=JSON.stringify(legacy);
assert.equal(stageFutureRoster(legacy).reason,'approval-required');
assert.equal(JSON.stringify(legacy),snapshot);
let denied=stageFutureRoster(legacy,{approved:true,visualMode:'authored',availableAssets:[assets[0]]});
assert.equal(denied.reason,'assets-required');
assert.equal(JSON.stringify(legacy),snapshot);
assert.equal(releaseAssetCheck(assets).length,0);
assert.equal(releaseAssetCheck([]).length,6);
const migrated=stageFutureRoster(legacy,{approved:true,visualMode:'procedural'});
assert.deepEqual(migrated,{ok:true,changed:true,heroes:['margot','yue']});
for(const id of HERO_IDS){
 assert.equal(legacy.roster[id].stars,0);
 assert.equal(legacy.roster[id].shards,0);
 assert.deepEqual(legacy.roster[id].eq,[false,false,false,false,false,false]);
 assert.equal(legacy.roster[id].sk.basic,1);
}
assert.deepEqual(legacy.roster.leto,{stars:7,shards:42,lvl:85,gear:13});
assert.deepEqual(legacy.journeys,{muaddib:{0:true}});
assert.deepEqual(legacy.storyEvents,{margot_story:{done:{0:true}}});
legacy.roster.margot.stars=4;
legacy.roster.margot.shards=17;
assert.equal(stageFutureRoster(legacy,{approved:true,availableAssets:assets}).changed,false);
assert.equal(legacy.roster.margot.stars,4);
assert.equal(legacy.roster.margot.shards,17);
const p=id=>({id,lvl:85,stars:7,gear:13,relic:4,sk:{basic:1,special:1,ult:1,passive:1,leader:1}});
const battle=createBattle([p('margot'),p('yue'),p('jessica')],[p('piter')],{seed:167,extraHeroDefs:defs});
assert.equal(battle.units.filter(u=>u.side==='A').length,3);
for(const id of HERO_IDS)assert.ok(battle.units.find(u=>u.def.id===id)?.maxHp>0);
console.log('BH9.7 sealed standard hero records, asset gate, save idempotency and battle defs: PASS');
