// ARCH-02C-B2: real built PWA + HTML save transfer acceptance.
// No actual browser profiles; isolated VM storage injection for each test.
// B2 does NOT promise multi-tab atomic CAS, full origin persistence or fsync.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from '../lib/load.mjs';

const html=process.argv[2]||'dist/pwa/index.html';
const KEY='dune-goh-v1', BACKUP=KEY+'.backup';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../fixtures/saves');
const fixtures=['01-legacy-v1.json','02-mid.json','03-late.json'].map(n=>
 JSON.parse(fs.readFileSync(path.join(dir,n),'utf8')));
const raw=o=>JSON.stringify(o), code=r=>Buffer.from(r,'utf8').toString('base64');
const results=[];
function pass(id,what){results.push(id);console.log('  '+id+' [B2 SAFE] '+what);}
function init(fixture=fixtures[0]) {
 const fields=new Map([['#savecode',{value:''}],['#overlay2',{innerHTML:''}],
   ['#overlay2 .acts',{insertAdjacentHTML(){}}]]);
 const g=loadGame(html,{seed:42,onQuerySelector:selector=>fields.get(selector)});
 g.store.set(KEY,raw(fixture));
 // Isolate historical B2 transfer API; mandatory default B3 transfer is
 // tested separately under a native writer lease in B313 / X and Chromium.
 g.run('set_S(loadSave())');
 assert.equal(g.run('loadSave(true).status'),'ok');
 return {g,fields};
}
function S(h){return JSON.parse(h.g.run('JSON.stringify(S)'));}
function current(h){return h.g.store.get(KEY);}
function preview(h, candidate){
 h.fields.get('#savecode').value=code(typeof candidate==='string'?candidate:raw(candidate));
 assert.equal(h.g.run('metaClick({saveload:"1"})'),true);
}
function confirm(h){assert.equal(h.g.run('metaClick({saveconfirm:"1"})'),true);}
function changed(h,delta=123){return {...S(h),solari:S(h).solari+delta};}
function unchanged(h,bytes,snapshot){
 assert.equal(current(h),bytes,'no primary change');
 assert.deepEqual(S(h),snapshot,'no import-side state change');
}
function deny(h,key,kind='QuotaExceededError',after=false){
 const orig=h.g.ctx.localStorage.setItem;
 h.g.ctx.localStorage.setItem=(k,v)=>{
   if(k===key){if(after)orig(k,v);throw Object.assign(new Error('injected'),{name:kind});}
   return orig(k,v);
 };
}

// T01-T03: all legacy fixtures, isolated preview then confirmed readback,
// backup of exact pre-import primary, and cold reload.
for(let i=0;i<fixtures.length;i++){
 const id='T0'+(i+1),h=init(),before=current(h),old=S(h);
 const cand={...fixtures[i],solari:fixtures[i].solari+100};
 preview(h,cand);
 unchanged(h,before,old);
 assert.match(h.fields.get('#overlay2').innerHTML,/data-saveconfirm/);
 confirm(h);
 assert.equal(S(h).solari,cand.solari);
 assert.equal(JSON.parse(current(h)).solari,cand.solari);
 assert.equal(JSON.parse(h.g.store.get(BACKUP)).raw,before);
 const cold=init(JSON.parse(current(h)));
 assert.equal(S(cold).solari,cand.solari);
 pass(id,'historical v1 fixture '+(i+1)+' verified and reloadable');
}
// T04: syntactically malformed code and invalid UTF-8 are rejected.
{
 const h=init(),before=current(h),s=S(h);
 h.fields.get('#savecode').value='%%%INVALID%%%';
 h.g.run('metaClick({saveload:1})');confirm(h);unchanged(h,before,s);
 h.fields.get('#savecode').value='//79';
 h.g.run('metaClick({saveload:1})');confirm(h);unchanged(h,before,s);
 pass('T04','malformed base64 / invalid UTF-8 rejected');
}
// T05: future v2, absent roster, bad account currency and bad hero counts.
{
 const h=init(),before=current(h),s=S(h);
 for(const bad of [{...s,v:2},{...s,roster:null},{...s,solari:-8},
   {...s,roster:{...s.roster,leto:{...s.roster.leto,shards:-1}}},
   {...s,water:1e1000},{...s,squad:'leto'}]){
   preview(h,bad);confirm(h);unchanged(h,before,s);
 }
 assert.equal(h.g.store.has(BACKUP),false);
 pass('T05','unsupported/incomplete/nonfinite/negative v1 blocked');
}
// T06: dangerous nested names and exponential depth, before fillSave.
{
 const h=init(),before=current(h),s=S(h);
 const polluted=JSON.parse(raw(s));
 polluted.conq={ '__proto__': {a:1} }; // own property inserted below
 Object.defineProperty(polluted.conq,'__proto__',{value:{polluted:true},enumerable:true});
 preview(h,polluted);confirm(h);unchanged(h,before,s);
 assert.equal({}.polluted,undefined);
 let deep={x:1};for(let n=0;n<52;n++)deep={nested:deep};
 preview(h,{...s,extra:deep});confirm(h);unchanged(h,before,s);
 pass('T06','prototype-key and deeply nested payloads rejected without pollution');
}
// T07: oversized base64 must never be decoded or committed.
{
 const h=init(),before=current(h),s=S(h);
 h.fields.get('#savecode').value='A'.repeat(2000004);
 h.g.run('metaClick({saveload:1})');confirm(h);unchanged(h,before,s);
 pass('T07','bounded input');
}
// T08: Unicode/Cyrillic survives export, preview, checkpoint and reload.
{
 const h=init(),s=S(h);s.profile={nick:'Странник Дюны 🌘',ava:'hero:leto',frame:'basic',title:'novice'};
 preview(h,s);confirm(h);
 assert.equal(S(h).profile.nick,s.profile.nick);
 h.g.run('metaClick({saveexp:1})');
 const saved=Buffer.from(h.fields.get('#savecode').value,'base64').toString('utf8');
 assert.equal(JSON.parse(saved).profile.nick,s.profile.nick);
 assert.equal(saved,current(h));
 pass('T08','UTF-8 base64 roundtrip and byte-identical committed export');
}
// T09: standard export is stored snapshot, NOT unsaved RAM.
{
 const h=init(),old=current(h),s=S(h);
 h.g.run('S.solari += 9000');
 h.g.run('metaClick({saveexp:1})');
 assert.equal(Buffer.from(h.fields.get('#savecode').value,'base64').toString('utf8'),old);
 assert.match(h.fields.get('#overlay2').innerHTML,/НЕ включена/);
 h.g.run('metaClick({saveunsaved:1})');
 const emergency=JSON.parse(Buffer.from(h.fields.get('#savecode').value,'base64').toString('utf8'));
 assert.equal(emergency.solari,s.solari+9000);
 assert.equal(current(h),old);
 pass('T09','verified storage export separated from visibly uncommitted emergency RAM');
}
// T10: import preview and active state are immutable on backup quota failure.
{
 const h=init(),old=current(h),s=S(h);
 preview(h,changed(h));deny(h,BACKUP);
 confirm(h);unchanged(h,old,s);
 assert.equal(h.g.store.has(BACKUP),false);
 pass('T10','backup quota prevents primary/S replacement');
}
// T11: denied backup reads reject preview, no writes.
{
 const h=init(),old=current(h),s=S(h),get=h.g.ctx.localStorage.getItem;
 h.g.ctx.localStorage.getItem=k=>{if(k===BACKUP)throw Object.assign(new Error('denied'),{name:'SecurityError'});return get(k);};
 preview(h,changed(h));confirm(h);unchanged(h,old,s);
 pass('T11','storage read security failure blocks preview');
}
// T12: primary quota and security fail closed after backup staging.
for(const [id,kind] of [['T12','QuotaExceededError'],['T13','SecurityError']]){
 const h=init(),old=current(h),s=S(h);
 preview(h,changed(h));deny(h,KEY,kind);confirm(h);
 unchanged(h,old,s);
 assert.equal(JSON.parse(h.g.store.get(BACKUP)).raw,old);
 pass(id,kind+' on primary leaves live progress unchanged');
}
// T14: primary write THEN throw: result uncertain, never activate S.
{
 const h=init(),old=current(h),s=S(h);
 preview(h,changed(h));deny(h,KEY,'QuotaExceededError',true);confirm(h);
 assert.equal(S(h).solari,s.solari);
 assert.notEqual(current(h),old);
 assert.equal(JSON.parse(h.g.store.get(BACKUP)).raw,old);
 pass('T14','uncertain post-write result never activates S or blindly retries');
}
// T15: primary changes after preview -> conflict; new bytes preserved.
{
 const h=init(),s=S(h);
 preview(h,changed(h));
 const newer=raw({...s,solari:s.solari+555});
 h.g.store.set(KEY,newer);confirm(h);
 assert.equal(current(h),newer);
 assert.deepEqual(S(h),s);
 assert.equal(h.g.store.has(BACKUP),false);
 pass('T15','stale preview rejected without overwriting newer primary');
}
// T16: background-like RAM change must NOT silently overwrite unsaved
// progress. The first confirmation opens a distinct explicit consent screen;
// only the next confirmation may overwrite, under original primary CAS, and
// the verified predecessor (not uncommitted S) is backed up.
{
 const h=init(),old=current(h),s=S(h),candidate=changed(h);
 preview(h,candidate);
 h.g.run('S.solari+=5');confirm(h);
 assert.equal(current(h),old);
 assert.equal(S(h).solari,s.solari+5);
 assert.equal(h.g.store.has(BACKUP),false);
 assert.match(h.fields.get('#overlay2').innerHTML,/Несохранённые изменения могут быть потеряны/);
 assert.match(h.fields.get('#overlay2').innerHTML,/data-saveconfirm/);
 confirm(h);
 assert.equal(JSON.parse(current(h)).solari,candidate.solari);
 assert.equal(JSON.parse(h.g.store.get(BACKUP)).raw,old);
 pass('T16','background RAM drift requires a third explicit decision and preserves verified predecessor');
}
// T16b: if another tab changes the stored save while the drift warning is
// displayed, even explicit acknowledgement must not defeat CAS.
{
 const h=init(),old=current(h),candidate=changed(h);
 preview(h,candidate);
 h.g.run('S.water+=1');confirm(h);
 const outsider=raw({...JSON.parse(old),solari:987654});
 h.g.store.set(KEY,outsider);
 confirm(h);
 assert.equal(current(h),outsider);
 assert.equal(h.g.store.has(BACKUP),false);
 pass('T16b','extra RAM-drift consent cannot overwrite concurrent stored progress');
}
// T16c: active battle is a hard denial, even for a previously granted
// drift acknowledgement (explicit import consent is not battle consent).
{
 const h=init(),old=current(h);
 preview(h,changed(h));
 h.g.run('S.water+=1');confirm(h);
 h.g.run('set_BT({done:false})');
 confirm(h);
 assert.equal(current(h),old);
 assert.equal(h.g.store.has(BACKUP),false);
 pass('T16c','drift acknowledgement cannot bypass active battle refusal');
}
// T17: double confirmation cannot replay previous import.
{
 const h=init(),old=current(h);
 preview(h,changed(h));confirm(h);
 const saved=current(h),backup=h.g.store.get(BACKUP);
 confirm(h);
 assert.equal(current(h),saved);
 assert.equal(h.g.store.get(BACKUP),backup);
 assert.equal(JSON.parse(backup).raw,old);
 pass('T17','double-confirm cannot rotate backup or apply twice');
}
// T18: corrupt primary appearing after preview stays intact, never repaired implicitly.
{
 const h=init(),s=S(h);preview(h,changed(h));
 h.g.store.set(KEY,'{"v":1,"roster":');
 confirm(h);
 assert.equal(current(h),'{"v":1,"roster":');
 assert.deepEqual(S(h),s);
 pass('T18','corrupt concurrent primary preserved; no destructive fallback');
}
// T19: latest exported bytes denied by storage read => no fake trusted export.
{
 const h=init(),old=current(h),get=h.g.ctx.localStorage.getItem;
 h.g.ctx.localStorage.getItem=k=>{if(k===KEY)throw Object.assign(new Error('denied'),{name:'SecurityError'});return get(k);};
 h.g.run('metaClick({saveexp:1})');
 assert.equal(current(h),old);
 assert.equal(h.fields.get('#savecode').value,'');
 assert.match(h.fields.get('#overlay2').innerHTML,/data-saveunsaved/);
 pass('T19','unreadable primary offers only explicitly unverified RAM rescue');
}
// T20: verified B1 raw primary same candidate must not rotate backup.
{
 const h=init(),old=current(h);
 const first=changed(h,11);preview(h,first);confirm(h);
 const committed=current(h),backup=h.g.store.get(BACKUP);
 preview(h,JSON.parse(committed));confirm(h);
 assert.equal(current(h),committed);
 assert.equal(h.g.store.get(BACKUP),backup);
 assert.equal(JSON.parse(backup).raw,old);
 pass('T20','idempotent re-import retains prior verified backup');
}
assert.equal(new Set(results).size,results.length);
assert.equal(results.length,22);
console.log('ARCH-02C-B2: '+results.length+' SAFE import/export cases on '+html+
 '; confirms byte-readback but NOT fsync, origin retention or cross-tab CAS.');
