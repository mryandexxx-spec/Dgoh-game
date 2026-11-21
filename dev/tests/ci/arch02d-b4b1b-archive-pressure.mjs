// ARCH-02D-B4b1b: archive growth, backup quota and transfer capacity.
// Executed against REAL compiled PWA + standalone HTML in three time zones.
// No automatic pruning, entitlement changes, RNG changes or network time.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadGame} from '../lib/load.mjs';

const html=process.argv[2]||'dist/pwa/index.html';
const KEY='dune-goh-v1', BACKUP=KEY+'.backup', LIMIT=2000000;
const fixture=JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/saves/01-legacy-v1.json'),'utf8'));
const DAY=86400000, start=new Date(2026,10,10,12).getTime();
const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
let passed=0;
function pass(id,summary){passed++;console.log('  '+id+' '+summary+' ['+zone+']');}
class Locks {
  constructor(){this.held=false;}
  request(name,opts,fn){
    assert.equal(name,KEY+'.writer');
    assert.equal(opts.mode,'exclusive');
    assert.equal(opts.ifAvailable,true);
    if(this.held)return Promise.resolve().then(()=>fn(null));
    this.held=true;
    return Promise.resolve().then(()=>fn({name,mode:'exclusive'}))
      .finally(()=>{this.held=false;});
  }
}
async function boot(now=start,save=fixture,fields=null){
  const g=loadGame(html,{seed:1001,now,
    onQuerySelector: fields ? selector=>fields.get(selector) : null});
  g.ctx.performance.now=()=>1000;
  g.ctx.navigator={locks:new Locks()};
  g.ctx.fetch=()=>{throw new Error('offline-only acceptance');};
  g.store.set(KEY,typeof save==='string'?save:JSON.stringify(save));
  assert.equal((await g.run('start({})')).status,'started');
  assert.equal(g.run('loadSave.writer.state().status'),'owned');
  return g;
}
function close(g){g.run('loadSave.writer.release()');}
function snap(g,expr){return JSON.parse(g.run('JSON.stringify('+expr+')'));}
function saved(g){return g.store.get(KEY);}
function commit(g){const out=g.run('persist()');assert.equal(out.ok,true);return saved(g);}
function markFull(g){
  g.run('(()=>{const C=cq(); C.diff="easy";C.stars=250;C.pts=90;'+
    'C.disks=[{k:"stam",on:1},{k:"guard",on:0}];'+
    'for(let s=0;s<5;s++){C.route[s]={};for(let L=0;L<12;L++){'+
    'const k=s+"-"+L+"-0";C.done[k]=1;C.route[s][L]=k;'+
    'C.dpick[k]=["stam","guard","str"];C.foe[k]=[{h:3,sh:0}];}}'+
    'for(let j=0;j<35;j++)C.tk["s"+j]=1;C.tk.c0=1;'+
    'C.sta.leto={v:45,t:Date.now()};C.fp.difficulty=7;C.fd.feat=1;})()');
}
function failWrite(g,key,after=false){
  const original=g.ctx.localStorage.setItem;
  g.ctx.localStorage.setItem=(k,v)=>{
    if(k===key){
      if(after)original(k,v);
      throw Object.assign(new Error('injected quota'),{name:'QuotaExceededError'});
    }
    return original(k,v);
  };
}
function uiFields(){
  return new Map([['#savecode',{value:'',select(){}}],
    ['#overlay2',{innerHTML:''}],['#overlay2 .acts',{insertAdjacentHTML(){}}]]);
}

// B425: realistic dense-week *synthetic model*, not real gameplay telemetry.
// 104 full runs grow monotonically, retain every prior reward/route/disk.
{
  const g=await boot();
  markFull(g);
  const first=snap(g,'S.conq'), initial=saved(g);
  const points=[];
  for(let i=1;i<=104;i++){
    g.setNow(start+i*7*DAY);
    assert.notEqual(g.run('cq().wk'),first.wk);
    if(i===104)break;
    markFull(g);
    if(i===26||i===52)points.push([i,g.run('JSON.stringify(S)').length]);
  }
  const current=snap(g,'S.conq'), raw=g.run('JSON.stringify(S)');
  assert.equal(current.weekArchive.length,104);
  assert.deepEqual(current.weekArchive[0],first);
  assert.equal(current.weekArchive[0].tk.c0,1);
  assert.equal(current.weekArchive[0].done['0-0-0'],1);
  assert.equal(current.weekArchive[0].route[0][0],'0-0-0');
  assert.equal(current.weekArchive[0].weekArchive,undefined);
  assert.equal(saved(g),initial,'measurements must not write storage');
  assert(points[0][1]<points[1][1]&&points[1][1]<raw.length);
  const archiveChars=JSON.stringify(current.weekArchive).length;
  const codeChars=4*Math.ceil(Buffer.byteLength(raw,'utf8')/3);
  const backupChars=JSON.stringify({format:1,key:KEY,raw,checksum:'00000000'}).length;
  assert(archiveChars>0&&backupChars>raw.length);
  console.log('  growth dense model: 26w='+points[0][1]+
    ' JSON chars, 52w='+points[1][1]+', 104w='+raw.length+
    ', archive104='+archiveChars+', code104='+codeChars+
    ', predicted previous-backup envelope='+backupChars+
    ', estimated UTF16 primary+backup bytes='+2*(raw.length+backupChars));
  close(g);
  pass('B425','104 dense weeks lossless; archive, base64 and backup growth measured');
}

// B426: backup quota denial is fail-closed before changing primary.
{
  const g=await boot();
  markFull(g);
  const old=commit(g), oldBackup=g.store.get(BACKUP);
  g.setNow(start+8*DAY);g.run('cq()');
  failWrite(g,BACKUP);
  const outcome=g.run('persist()');
  assert.equal(outcome.ok,false);
  assert.equal(outcome.status,'quota');
  assert.equal(saved(g),old);
  assert.equal(g.store.get(BACKUP),oldBackup);
  close(g);
  const again=await boot(start,old);
  assert.equal(again.run('cq().tk.c0'),1);
  close(again);pass('B426','backup quota preserves previously earned week');
}

// B427: quota on primary after staging leaves original primary and valid
// PREVIOUS backup; no false success or duplicate tracked rewards.
{
  const g=await boot();
  markFull(g);const old=commit(g);
  g.setNow(start+8*DAY);g.run('cq()');
  failWrite(g,KEY);
  const outcome=g.run('persist()');
  assert.equal(outcome.ok,false);assert.equal(outcome.status,'quota');
  assert.equal(saved(g),old);
  assert.equal(JSON.parse(g.store.get(BACKUP)).raw,old);
  close(g);
  const again=await boot(start,old);
  assert.equal(again.run('cq().tk.c0'),1);
  close(again);pass('B427','primary quota retains old progress and verified sidecar');
}

// B428: write-then-throw is UNCERTAIN; new primary might be present.
// Do not retry the transaction or claim that old bytes are authoritative.
{
  const g=await boot();
  markFull(g);const old=commit(g);
  g.setNow(start+8*DAY);g.run('cq()');
  failWrite(g,KEY,true);
  const outcome=g.run('persist()');
  assert.equal(outcome.ok,false);assert.equal(outcome.status,'uncertain');
  assert.notEqual(saved(g),old);
  assert.equal(JSON.parse(g.store.get(BACKUP)).raw,old);
  assert.equal(JSON.parse(saved(g)).conq.weekArchive[0].tk.c0,1);
  close(g);pass('B428','uncertain primary write leaves both recovery candidates intact');
}

// B429: UTF-8 base64 crosses 2M limit even when JSON characters do not.
// Visible warning, full exact stored bytes (no truncation), refused reimport.
{
  const seed=await boot();seed.run('cq()');
  const run=snap(seed,'S.conq');close(seed);
  const bulky={...fixture,conq:{...run,weekArchive:[
    {...run,wk:'Mon Nov 02 2026',note:'Ж'.repeat(850000)}]}};
  const fields=uiFields(),g=await boot(start,bulky,fields);
  const original=saved(g),memory=g.run('JSON.stringify(S)');
  assert(original.length<LIMIT);
  assert.equal(g.run('metaClick({saveexp:1})'),true);
  const code=fields.get('#savecode').value;
  assert(code.length>LIMIT);
  assert.equal(Buffer.from(code,'base64').toString('utf8'),original);
  assert.match(fields.get('#overlay2').innerHTML,/превышает лимит импорта/);
  assert.match(fields.get('#overlay2').innerHTML,/Архив Conquest: 1 недель/);
  g.run('metaClick({saveimp:1})');
  fields.get('#savecode').value=code;
  g.run('metaClick({saveload:1})');
  g.run('metaClick({saveconfirm:1})');
  assert.equal(saved(g),original);
  assert.equal(g.run('JSON.stringify(S)'),memory);
  close(g);pass('B429','over-limit export warns, retains exact bytes; reimport denied');
}

// B430: imported malformed/nested archives are rejected before migration.
// No partial import, no silent pruning, no primary or live-S change.
{
  const fields=uiFields(),g=await boot(start,fixture,fields);
  const original=saved(g),before=g.run('JSON.stringify(S)');
  const broken={...snap(g,'S'),conq:{v:2,wk:'Mon Nov 09 2026',
    weekArchive:[{wk:'Mon Nov 02 2026',weekArchive:[]}]}};
  g.run('metaClick({saveimp:1})');
  fields.get('#savecode').value=Buffer.from(JSON.stringify(broken),'utf8').toString('base64');
  g.run('metaClick({saveload:1})');
  assert.doesNotMatch(fields.get('#overlay2').innerHTML,/data-saveconfirm/);
  g.run('metaClick({saveconfirm:1})');
  assert.equal(saved(g),original);
  assert.equal(g.run('JSON.stringify(S)'),before);
  close(g);pass('B430','nested archive import rejected without touching account');
}

// B431: corrupted archive array must not permit destructive next-week rollover.
for(const history of [[null],[{wk:'Mon Nov 02 2026',weekArchive:[]}]]) {
  const g=await boot();
  markFull(g);
  g.run('S.conq.weekArchive='+JSON.stringify(history));
  const previous=snap(g,'S.conq'),old=saved(g);
  g.setNow(start+8*DAY);
  assert.equal(g.run('cq().wk'),previous.wk);
  assert.deepEqual(snap(g,'S.conq'),previous);
  assert.equal(g.run('cqCanClaim(0)'),false);
  assert.equal(saved(g),old);
  close(g);
}
pass('B431','malformed array entries block rollover and claims without repair');
assert.equal(passed,7);
console.log('ARCH-02D-B4b1b '+passed+' pressure/transfer scenarios PASS: '+html+' TZ='+zone);
