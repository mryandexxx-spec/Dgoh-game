// ARCH-02D-B4b1c — bounded offline JSON transfer, with mandatory writer.
// Real compiled PWA+standalone HTML in UTC / Amsterdam / Los Angeles.
// No network; historical code transport and old Golden stay unchanged.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from '../lib/load.mjs';

const html=process.argv[2]||'dist/pwa/index.html',KEY='dune-goh-v1';
const BACKUP=KEY+'.backup',MAX=8000000;
const fixture=JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/saves/01-legacy-v1.json'),'utf8'));
const raw=o=>JSON.stringify(o),bytes=s=>Buffer.from(s,'utf8');
const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
const start=new Date(2026,10,10,12).getTime(), DAY=86400000;
let count=0;
function pass(id,detail){count++;console.log('  '+id+' '+detail+' ['+zone+']');}
class NativeLocks{
  constructor(){this.held=false;}
  request(name,options,cb){
    assert.equal(name,KEY+'.writer');assert.equal(options.mode,'exclusive');
    assert.equal(options.ifAvailable,true);
    if(this.held)return Promise.resolve().then(()=>cb(null));
    this.held=true;
    return Promise.resolve().then(()=>cb({name,mode:'exclusive'}))
      .finally(()=>{this.held=false;});
  }
}
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
const fields=()=>new Map([['#savecode',{value:'',select(){}}],
  ['#overlay2',{innerHTML:''}],['#overlay2 .acts',{insertAdjacentHTML(){}}],
  ['#savefile',{isConnected:true,files:[]}]]);
async function boot(save=fixture,{onFields=fields(),now=start}={}){
  const g=loadGame(html,{seed:601,now,onQuerySelector:sel=>onFields.get(sel)});
  g.ctx.performance.now=()=>1000;
  g.ctx.navigator={locks:new NativeLocks()};
  g.ctx.fetch=()=>{throw Error('network forbidden in file transfer tests');};
  g.store.set(KEY,typeof save==='string'?save:raw(save));
  assert.equal((await g.run('start({})')).status,'started');
  assert.equal(g.run('loadSave.writer.state().status'),'owned');
  return {g,f:onFields};
}
function close(h){h.g.run('loadSave.writer.release()');}
function setFile(h,content){
  const b=typeof content==='string'?bytes(content):content;
  h.f.get('#savefile').files=[{size:b.length,
    arrayBuffer:async()=>Uint8Array.from(b).buffer}];
}
function upload(h){assert.equal(h.g.run('metaClick({savefileload:1})'),true);return flush();}
function expectNoPreview(h){assert.doesNotMatch(h.f.get('#overlay2').innerHTML,/data-saveconfirm/);}
const snap=(h,exp)=>JSON.parse(h.g.run('JSON.stringify('+exp+')'));
const old=h=>h.g.store.get(KEY);
const largeRun={v:2,wk:'Mon Nov 02 2026',diff:'easy',done:{'0-0-0':1},
  tk:{s0:1,c0:1},route:{0:{0:'0-0-0'}},disks:[{k:'stam',on:1}],
  note:'Ж'.repeat(2100000)};
const huge={...fixture,conq:{v:2,wk:'Mon Nov 09 2026',diff:null,
  done:{},tk:{},route:{},weekArchive:[largeRun]}};
const hugeRaw=raw(huge);
assert(hugeRaw.length>2000000&&hugeRaw.length<MAX);
assert(bytes(hugeRaw).length>2000000&&bytes(hugeRaw).length<MAX);
// F01: ordinary export still emits legacy code plus new verified file option.
{
 const h=await boot();const before=old(h);
 assert.equal(h.g.run('metaClick({saveexp:1})'),true);
 assert.match(h.f.get('#overlay2').innerHTML,/data-savefileexp/);
 assert.equal(bytes(before).toString('base64'),h.f.get('#savecode').value);
 assert.equal(old(h),before);close(h);pass('F01','legacy code remains exact, file option shown');
}
// F02: valid >2 MB UTF-8 JSON archive file exceeds Base64 import code limit,
// yet is accepted as a file under native writer and isolated confirmation.
{
 const h=await boot(),prior=old(h);
 h.g.run('metaClick({saveimp:1})');
 assert.match(h.f.get('#overlay2').innerHTML,/data-savefileload/);
 setFile(h,hugeRaw);await upload(h);
 assert.match(h.f.get('#overlay2').innerHTML,/JSON-файл; архив Conquest: 1 недель/);
 assert.equal(old(h),prior);
 assert.equal(h.g.run('metaClick({saveconfirm:1})'),true);
 const imported=JSON.parse(old(h));
 assert.equal(imported.v,1);
 assert.equal(imported.conq.weekArchive[0].note,largeRun.note);
 assert.equal(imported.conq.weekArchive[0].tk.c0,1);
 assert.equal(imported.conq.weekArchive[0].route[0][0],'0-0-0');
 assert.equal(JSON.parse(h.g.store.get(BACKUP)).raw,prior);
 assert.equal(h.g.run('loadSave.writer.state().status'),'session-stale');
 close(h);
 const cold=await boot(imported,{now:start});
 assert.equal(snap(cold,'S.conq.weekArchive[0]').tk.c0,1);
 assert.equal(cold.g.run('cq().tk.c0'),undefined);
 close(cold);
 pass('F02','large offline JSON verified import preserves inactive history and backup');
}
// F03: bad UTF-8 is rejected without parsing or touching storage/RAM.
{
 const h=await boot(),prior=old(h),ram=h.g.run('JSON.stringify(S)');
 h.g.run('metaClick({saveimp:1})');
 setFile(h,Buffer.from([0x7b,0xff,0x7d]));
 await upload(h);expectNoPreview(h);
 assert.equal(old(h),prior);assert.equal(h.g.run('JSON.stringify(S)'),ram);
 close(h);pass('F03','fatal UTF-8 decoding and no side effects');
}
// F04: size guard refuses a declared oversize file before calling arrayBuffer.
{
 const h=await boot(),prior=old(h);let reads=0;
 h.g.run('metaClick({saveimp:1})');
 h.f.get('#savefile').files=[{size:MAX+1,arrayBuffer:async()=>{reads++;return new ArrayBuffer(0);}}];
 await upload(h);expectNoPreview(h);
 assert.equal(reads,0);assert.equal(old(h),prior);
 close(h);pass('F04','8MB cap checked before file allocation');
}
// F05: reject v2/future schema, nested history and JSON corruption without commit.
{
 const h=await boot(),prior=old(h);
 for(const content of [raw({...fixture,v:2}),
   raw({...fixture,conq:{v:2,wk:'Mon Nov 09 2026',
     weekArchive:[{wk:'Mon Nov 02 2026',weekArchive:[]}]}}),'{oops']) {
   h.g.run('metaClick({saveimp:1})');
   setFile(h,content);await upload(h);expectNoPreview(h);
   assert.equal(old(h),prior);
 }
 close(h);pass('F05','future v2, nested archive and malformed JSON blocked');
}
// F06: native lock release while File.arrayBuffer is pending cannot create
// a preview, accept data or perform a second writer commit.
{
 const h=await boot(),prior=old(h);h.g.run('metaClick({saveimp:1})');
 let finish;const b=bytes(hugeRaw);
 h.f.get('#savefile').files=[{size:b.length,arrayBuffer:()=>new Promise(resolve=>finish=resolve)}];
 h.g.run('metaClick({savefileload:1})');
 h.g.run('loadSave.writer.release()');
 finish(Uint8Array.from(b).buffer);await flush();
 expectNoPreview(h);assert.equal(old(h),prior);
 assert.equal(h.g.run('loadSave.writer.state().status'),'session-stale');
 pass('F06','late async read rejected after Web Locks release');
}
// F07: cancelled/closed chooser cannot resurrect a replacement prompt.
{
 const h=await boot(),prior=old(h);
 h.g.run('metaClick({saveimp:1})');
 let finish;const b=bytes(hugeRaw),input=h.f.get('#savefile');
 input.files=[{size:b.length,arrayBuffer:()=>new Promise(resolve=>finish=resolve)}];
 h.g.run('metaClick({savefileload:1})');
 input.isConnected=false;finish(Uint8Array.from(b).buffer);await flush();
 expectNoPreview(h);assert.equal(old(h),prior);
 close(h);pass('F07','stale closed file input ignored');
}
// F08: backup quota failure rejects even approved file, no RAM adoption.
{
 const h=await boot(),prior=old(h),ram=h.g.run('JSON.stringify(S)');
 h.g.run('metaClick({saveimp:1})');
 setFile(h,raw({...fixture,solari:fixture.solari+991}));
 await upload(h);assert.match(h.f.get('#overlay2').innerHTML,/data-saveconfirm/);
 const write=h.g.ctx.localStorage.setItem;
 h.g.ctx.localStorage.setItem=(k,v)=>{
   if(k===BACKUP)throw Object.assign(Error('quota'),{name:'QuotaExceededError'});
   return write(k,v);
 };
 h.g.run('metaClick({saveconfirm:1})');
 assert.equal(old(h),prior);assert.equal(h.g.run('JSON.stringify(S)'),ram);
 close(h);pass('F08','backup quota fail-closed with no imported RAM');
}
// F09: verified file export must exactly match stored PRIMARY even if
// unpersisted RAM differs, and never use the unverified emergency export.
{
 const h=await boot(),original=old(h),downloads=[];
 h.g.ctx.Blob=class{constructor(parts,opts){this.parts=parts;this.type=opts.type;}};
 h.g.ctx.URL={createObjectURL:b=>{downloads.push(b);return 'blob:mock';},
   revokeObjectURL(){}};
 const fakeAnchor={click(){},remove(){},set href(v){this.url=v;},
   set download(v){this.name=v;}};
 h.g.ctx.document={createElement:tag=>tag==='a'?fakeAnchor:
     {className:'',innerHTML:'',setAttribute(){},remove(){}},
   body:{appendChild(){}},querySelectorAll:()=>[],querySelector:sel=>h.f.get(sel)};
 h.g.run('S.solari+=12345');
 h.g.run('metaClick({saveexp:1})');
 assert.match(h.f.get('#overlay2').innerHTML,/НЕ включена/);
 h.g.run('metaClick({savefileexp:1})');
 assert.equal(downloads.length,1);
 assert.equal(downloads[0].parts[0],original);
 assert.equal(old(h),original);
 h.g.run('metaClick({saveunsaved:1})');
 assert.doesNotMatch(h.f.get('#overlay2').innerHTML,/data-savefileexp/);
 close(h);pass('F09','offline Blob exactly matches stored snapshot, never RAM');
}
// F10: verified preview prevents stale primary from being overwritten,
// even if another writer modifies storage before confirmation.
{
 const h=await boot(),oldRaw=old(h);
 h.g.run('metaClick({saveimp:1})');
 setFile(h,raw({...fixture,solari:987654}));
 await upload(h);assert.match(h.f.get('#overlay2').innerHTML,/data-saveconfirm/);
 const other=raw({...fixture,solari:123456});
 h.g.store.set(KEY,other);
 h.g.run('metaClick({saveconfirm:1})');
 assert.equal(old(h),other);
 assert.notEqual(oldRaw,other);
 assert.equal(h.g.run('loadSave.writer.state().status'),'session-stale');
 close(h);pass('F10','stale native-lease commit denied after file preview');
}
assert.equal(count,10);
console.log('ARCH-02D-B4b1c '+count+' native-writer JSON file scenarios PASS: '+html+' TZ='+zone);
