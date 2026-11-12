// GE1 source-table contract: node tests/smoke/gear-ge1.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../../src/' + path, import.meta.url), 'utf8');
const recipeSource = read('data/gear-recipes.js').replace(/^import .*$/gm,'').replace(/^export \{.*$/gm,'');
const {PARTS_BY_KIND, partFragId} = new Function(recipeSource + ';return {PARTS_BY_KIND,partFragId};')();
const ITEMS = {};
for(const t of Array.from({length:13},(_,i)=>i+1))
  for(const kind of Object.keys(PARTS_BY_KIND)) ITEMS[kind+t]={id:kind+t,t,kind,n:kind+t};
const NODES = Array.from({length:210},(_,i)=>({lvl:1+(i%70),camp:i%3===0?'C':'L'}));
const ghash = value => [...value].reduce((n,c)=>((n*33)^c.charCodeAt(0))>>>0,5381);
const S={inv:{},gearOwned:{}};
const raw=read('logic/gear.js');
const start=raw.indexOf('const COMPLETE_RATE = '),end=raw.indexOf('function raidFrags(',start);
assert.ok(start>=0 && end>start);
const farm = new Function('NODES','ITEMS','PARTS_BY_KIND','partFragId','ghash','S',raw.slice(start,end)+
  ';return {COMPLETE_RATE,COMPLETE_SOURCES,FRAGMENT_SOURCES,COMPLETE_INDEX,COMPLETE_NODE_ITEMS,NODE_ITEMS,rollItems,grantFrags,nodeChance};')
  (NODES,ITEMS,PARTS_BY_KIND,partFragId,ghash,S);
const chances=[0,.02,.02,.02,.01,.01,.005,.005,.002,.002,.001,0,0,0];
for(const item of Object.values(ITEMS)){
  const names=item.t<=5?['direct']:PARTS_BY_KIND[item.kind];
  const groups=names.map(name=>farm.FRAGMENT_SOURCES.get(name==='direct'?item.id:partFragId(item,name)));
  groups.forEach(g=>{assert.ok(g.length>=1 && g.length<=3,item.id);assert.equal(new Set(g).size,g.length);});
  if(groups.length===2) for(const i of groups[0]) assert.ok(!groups[1].includes(i),item.id+': parts overlap');
  for(let j=0;j<groups.length;j++) for(const i of groups[j]){
    const id=names[j]==='direct'?item.id:partFragId(item,names[j]);
    assert.ok(farm.NODE_ITEMS[i].includes(id),item.id+': missing mission drop');
  }
  const complete=farm.COMPLETE_INDEX.get(item.id)||[];
  assert.equal(complete.length,farm.COMPLETE_SOURCES[item.t],item.id+': complete source count');
  assert.equal(farm.COMPLETE_RATE[item.t],chances[item.t]);
  for(const i of complete) {
    assert.ok(farm.COMPLETE_NODE_ITEMS[i].includes(item.id));
    assert.ok(!groups.some(group=>group.includes(i)),item.id+': complete and component sources overlap');
  }
}
farm.grantFrags([['gear:pad9',1],['frag:pad9:core',2],['pad9',4]]);
assert.equal(S.gearOwned.pad9,1);assert.equal(S.inv['frag:pad9:core'],2);assert.equal(S.inv.pad9,4);
const s=read('logic/gear-sources.js').replace(/^import .*$/gm,'').replace(/^export \{.*$/gm,'');
const {gearSources}=new Function('NODES','ITEMS','FRAGMENT_SOURCES','COMPLETE_INDEX','COMPLETE_RATE','NODE_ITEMS','nodeChance','SHOP_FRAG','RAID_FRAGS',s+
  ';return {gearSources};')(NODES,ITEMS,farm.FRAGMENT_SOURCES,farm.COMPLETE_INDEX,farm.COMPLETE_RATE,farm.NODE_ITEMS,farm.nodeChance,Array(14).fill(0),[]);
const pad=ITEMS.pad9;
const core=gearSources(partFragId(pad,'core')),lens=gearSources(partFragId(pad,'lens'));
assert.ok(core.some(x=>x.type==='mission')&&lens.some(x=>x.type==='mission'));
for(const x of core.filter(x=>x.type==='mission')) assert.ok(!lens.some(y=>y.type==='mission'&&y.id===x.id));
assert.equal(gearSources(pad.id,'complete').length,1);
assert.equal(gearSources(pad.id,'complete')[0].chance,.002);
assert.equal(gearSources('pad13','complete').length,0);

const raidStart=raw.indexOf('function raidFrags('),raidEnd=raw.indexOf('const IG =',raidStart);
assert.ok(raidStart>0 && raidEnd>raidStart);
const {raidFrags}=new Function('ITEMS','RAID_FRAGS','PARTS_BY_KIND','partFragId',
  raw.slice(raidStart,raidEnd)+'return {raidFrags};')
  (ITEMS,[{n:12,tiers:[6,7,8]},{n:22,tiers:[9,10,11]},{n:36,tiers:[11,12,13]}],
    PARTS_BY_KIND,partFragId);
for(const tier of [0,1,2]) {
  const rewards=raidFrags(tier,1);
  assert.ok(rewards.length>0);
  for(const [id,q] of rewards) {
    assert.match(id,/^frag:[a-z]+\d+:[a-z]+$/);
    assert.equal(q,1);
  }
}
assert.ok(!gearSources('pad9').some(s=>s.type==='sietch'||s.type==='raid'),
  'Legacy universal fragments have no new acquisition sources');

console.log('GE1 complete / component sources, probability bands, inventory and disjointness: PASS (156 items)');
