// ARCH-02C-B0: legacy v138 forensic characterization, NOT ordinary B3 startup.
// Deliberately seed the historical uncooperative low-level RAM/write APIs
// without invoking mandatory start() or presenting the old writer as live.
// C05-C15 remain explicitly UNSAFE historical behaviors until B4-B6.
// Executes the actual compiled PWA or HTML artifact in an isolated Node VM.
// No browser user profiles, real localStorage, shipped source or golden updates.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from '../lib/load.mjs';

const html=process.argv[2]||'dist/pwa/index.html', KEY='dune-goh-v1';
const fixtureDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../fixtures/saves');
const old=JSON.stringify(JSON.parse(fs.readFileSync(path.join(fixtureDir,'01-legacy-v1.json'),'utf8')));
const observed=[];
function mark(id,description){observed.push(id);console.log('  '+id+(['C01','C02','C03','C04'].includes(id)?' [B2 SAFE] ':' [UNSAFE v138 BASELINE] ')+description);}
function init(raw=null){
  const listeners=[],fields=new Map([['#savecode',{value:''}],['#overlay2',{innerHTML:''}]]);
  const g=loadGame(html,{seed:31,
    onDocumentListener(type,listener){listeners.push({type,listener});},
    onQuerySelector(selector){return fields.get(selector);}
  });
  assert.equal(g.get('SAVE_KEY'),KEY);
  if(raw!==null)g.store.set(KEY,raw);
  // Explicit old-client harness: the new production composition root is
  // mandatory-gated and must NEVER use this direct legacy seeding path.
  g.run('set_S(loadSave()); metaFill(S); persist0()');
  assert.equal(g.run('loadSave(true).status'),'ok');
  return {g,fields,listeners};
}
const S=g=>JSON.parse(g.run('JSON.stringify(S)'));
const saved=g=>JSON.parse(g.store.get(KEY));
function deny(g,kind='QuotaExceededError'){
  const setter=g.ctx.localStorage.setItem,calls=[];
  g.ctx.localStorage.setItem=(k,v)=>{
    calls.push(k);
    if(k===KEY)throw Object.assign(new Error('B0 injected failure'),{name:kind});
    return setter(k,v);
  };
  return calls;
}
const wrote=calls=>assert.ok(calls.includes(KEY),'actual handler attempted primary write');
const same=(g,bytes)=>assert.equal(g.store.get(KEY),bytes,'last durable primary unchanged');
function click(h,data){
  const cb=h.listeners.find(x=>x.type==='click'&&String(x.listener).includes('[data-sqlead]'))?.listener;
  assert.ok(cb,'captured real ui/events.js click delegate');
  const button={tagName:'BUTTON',dataset:data};
  return cb({target:{closest:s=>s==='button, [data-fxu], .unit.tgt, .detail'?button:null},
    preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}});
}
const encode=s=>Buffer.from(JSON.stringify(s),'utf8').toString('base64');

// C01: legacy base64/v1 compatibility now requires explicit confirmation.
{
 const {g,fields}=init(old),original=S(g),candidate={...original,solari:original.solari+111};
 const prior=g.store.get(KEY);
 fields.get('#savecode').value=encode(candidate);
 assert.equal(g.run('metaClick({saveload:"1"})'),true);
 same(g,prior);assert.equal(S(g).solari,original.solari);
 assert.match(fields.get('#overlay2').innerHTML,/data-saveconfirm/);
 assert.equal(g.run('metaClick({saveconfirm:"1"})'),true);
 assert.equal(S(g).solari,candidate.solari);
 assert.equal(saved(g).solari,candidate.solari);
 assert.equal(g.run('loadSave(true).status'),'ok');
 assert.equal(JSON.parse(g.store.get(KEY+'.backup')).raw,prior);
 mark('C01','legacy UTF-8/base64 v1 import requires verified checkpoint confirmation');
}
// C02: unsupported future schema MUST NOT overwrite valid v1.
{
 const {g,fields}=init(old),before=g.store.get(KEY),original=S(g),candidate={...original,v:2};
 fields.get('#savecode').value=encode(candidate);
 assert.equal(g.run('metaClick({saveload:"1"})'),true);
 same(g,before);assert.equal(g.store.has(KEY+'.backup'),false);
 assert.equal(S(g).v,1);
 assert.equal(g.run('metaClick({saveconfirm:"1"})'),true);
 same(g,before);
 mark('C02','future v2 import rejected without changing existing primary or S');
}
// C03: quota during import cannot replace live S or acknowledge success.
{
 const {g,fields}=init(old),before=g.store.get(KEY),original=S(g),candidate={...original,solari:original.solari+777};
 fields.get('#savecode').value=encode(candidate);
 const writes=deny(g);
 assert.equal(g.run('metaClick({saveload:"1"})'),true);
 same(g,before);assert.equal(S(g).solari,original.solari);
 assert.equal(g.run('metaClick({saveconfirm:"1"})'),true);
 wrote(writes);same(g,before);
 assert.equal(S(g).solari,original.solari);
 assert.equal(g.run('loadSave(true).status'),'ok');
 mark('C03','quota on verified import leaves live S and old primary unchanged');
}
// C04: malformed encoding remains rejected before any storage write.
{
 const {g,fields}=init(old),before=g.store.get(KEY);
 fields.get('#savecode').value='%%%not-base64%%%';
 assert.equal(g.run('metaClick({saveload:"1"})'),true);
 same(g,before);assert.equal(S(g).v,1);
 assert.equal(g.run('metaClick({saveconfirm:"1"})'),true);
 same(g,before);
 mark('C04','malformed import rejected before write or confirmation');
}
// C05: a real daily claim reaches reward processing even with denied write.
{
 const {g}=init();
 assert.equal(g.run('S.daily={d:todayKey(),c:{login:1},got:{},chest:false};persist0().ok'),true);
 const before=g.store.get(KEY),initial=S(g),writes=deny(g);
 const lines=g.run('claimQuest("login",false)');
 wrote(writes);same(g,before);
 assert.ok(lines&&lines.length);
 assert.equal(S(g).daily.got.login,true);
 assert.ok(S(g).cry>initial.cry);
 mark('C05','daily flag/currency and reward display occur with failed commit');
}
// C06: daily random chest claim, marker and reward are uncommitted.
{
 const {g}=init();
 assert.equal(g.run('S.daily={d:todayKey(),c:{},got:Object.fromEntries(DAILY.slice(0,7).map(q=>[q.k,true])),chest:false};persist0().ok'),true);
 const before=g.store.get(KEY),initial=S(g),writes=deny(g);
 g.run('claimChest()');
 wrote(writes);same(g,before);
 assert.equal(S(g).daily.chest,true);
 assert.ok(S(g).cry>=initial.cry+50);
 mark('C06','random daily chest announced without a stored claim');
}
// C07: normal refill debits crystals, credits energy and increments limit.
{
 const {g}=init();
 assert.equal(g.run('S.cry=1000;S.water=0;S.waterTs=Date.now();S.refills={d:"",n:0};persist0().ok'),true);
 const before=g.store.get(KEY),initial=S(g),writes=deny(g);
 g.run('doRefill("water")');
 wrote(writes);same(g,before);
 assert.ok(S(g).cry<initial.cry&&S(g).water>initial.water);
 assert.equal(S(g).refills.n,1);
 mark('C07','refill debit/grant/limit mutate live state on quota');
}
// C08: actual general-store delegated click, not a manually replicated spend.
{
 const h=init(),{g}=h;
 assert.equal(g.run('S.solari=100000;S.buys={d:"",n:{}};persist0().ok'),true);
 const before=g.store.get(KEY),initial=S(g),writes=deny(g);
 click(h,{buy:'post:pl'});
 wrote(writes);same(g,before);
 assert.equal(S(g).solari,initial.solari-6000);
 assert.equal(S(g).plast,initial.plast+5);
 assert.equal(S(g).buys.n['post:pl'],1);
 mark('C08','real shop purchase click succeeds in RAM without durable write');
}
// C09: actual skill-up click.
{
 const h=init(),{g}=h;
 assert.equal(g.run('S.solari=1000000;S.folio=1000;S.seal=1000;S.wol=1000;persist0().ok'),true);
 const before=g.store.get(KEY),initial=S(g),writes=deny(g);
 click(h,{skup:'leto:basic'});
 wrote(writes);same(g,before);
 assert.equal(S(g).roster.leto.sk.basic,initial.roster.leto.sk.basic+1);
 assert.ok(S(g).solari<initial.solari);
 mark('C09','skill progression and price uncommitted after quota');
}
// C10: actual gear-up click.
{
 const h=init(),{g}=h;
 assert.equal(g.run('S.solari=1000000;S.plast=1000;persist0().ok'),true);
 const before=g.store.get(KEY),initial=S(g),writes=deny(g);
 click(h,{gear:'leto'});
 wrote(writes);same(g,before);
 assert.equal(S(g).roster.leto.gear,initial.roster.leto.gear+1);
 assert.ok(S(g).solari<initial.solari);
 mark('C10','gear progression and cost uncommitted after quota');
}
// C11: one-time Conquest chest reward/claim marker after denied write.
{
 const {g}=init();
 assert.equal(g.run('(()=>{const c=cq();c.diff="easy";c.stars=100000;return persist0().ok})()'),true);
 assert.equal(g.run('cqCanClaim(0)'),true);
 const before=g.store.get(KEY),initial=S(g),writes=deny(g);
 g.run('cqClick({cqopen:"0"})');
 wrote(writes);same(g,before);
 assert.equal(S(g).conq.tk.c0,1);
 assert.notDeepEqual(S(g).conq,initial.conq);
 mark('C11','Conquest chest flag and rewards only in live memory');
}
// C12: actual campaign battle entry charges energy, then launches despite
// unavailable save. The Node VM stubs DOM/WebGL, not physical GPU combat.
{
 const {g}=init();
 assert.equal(g.run('S.water=300;S.candle=300;S.waterTs=Date.now();S.candleTs=Date.now();persist0().ok'),true);
 const before=g.store.get(KEY),initial=S(g),writes=deny(g);
 g.run('startBattle(0)');
 wrote(writes);same(g,before);
 const energy=g.run('nodeEn(0)');
 assert.ok(S(g)[energy]<initial[energy]);
 mark('C12','campaign attempt debited without an acknowledged save');
}
// C13: execute actual finish() on a real seeded battle object with a test
// victory. Tests settlement code, not the whole battle / Arena animation.
{
 const {g}=init(),before=g.store.get(KEY),initial=S(g),writes=deny(g);
 const script=[
  '(()=>{',
  ' const n=NODES[0];',
  ' const allies=S.squad.map(id=>({id,...S.roster[id]}));',
  ' const foes=n.enemy.map(id=>enemyProg(id,n.lvl,n.m===9));',
  ' const b=createBattle(allies,foes,{seed:142,desert:n.desert});',
  ' b.over="A";',
  ' set_BT({B:b,cfg:{mode:"camp",i:0},i:0,timer:null,done:false});',
  ' finish();',
  '})()'
 ].join('\n');
 g.run(script);
 wrote(writes);same(g,before);
 assert.ok(S(g).cleared['0']>0);
 assert.ok(S(g).cry>initial.cry);
 mark('C13','campaign first-clear settlement remains uncommitted');
}
// C14: sequential shared-storage two-tab model, NOT real browser race proof.
{
 const a=init(old).g,b=init(old).g;
 const original=saved(a).solari,baseline=a.store.get(KEY);
 b.store.set(KEY,baseline);
 assert.equal(a.run('S.solari+=100;persist().ok'),true);
 const committedA=a.store.get(KEY);
 assert.equal(JSON.parse(committedA).solari,original+100);
 b.store.set(KEY,committedA); // underlying primary changes, B's S stays stale
 assert.equal(b.run('S.solari+=3;persist().ok'),true);
 assert.equal(saved(b).solari,original+3);
 assert.equal(saved(b).solari-JSON.parse(committedA).solari,-97);
 mark('C14','stale tab loses 97 units by last-writer-wins');
}
// C15: backup/generation absent; distinguish diagnostics from progress keys.
{
 const {g}=init(old),keys=[...g.store.keys()];
 assert.ok(keys.includes(KEY));
 assert.equal(keys.filter(k=>k.startsWith(KEY+'.')).length,0);
 assert.equal('generation' in saved(g),false);
 mark('C15','no backup/checkpoint revision key in shipped v138');
}
assert.equal(new Set(observed).size,observed.length);
assert.equal(observed.length,15);
console.log('ARCH-02C-B0: '+observed.length+' CHARACTERIZED baseline observations on '+html+
  ' (VM-only; C01-C04 repaired by B2, C05-C15 remain unsafe until later stages).');
