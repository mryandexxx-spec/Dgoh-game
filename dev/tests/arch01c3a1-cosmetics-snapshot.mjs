// ARCH-01C3a1: compare exact entitlement and SVG table output BEFORE/AFTER refactor.
// Baseline digest is first measured on untouched main sources in both PWA and artifact.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadGame } from './lib/load.mjs';

const file=process.argv[2] || 'dist/pwa/index.html';
const g=loadGame(file), run=s=>g.run(s);
const hash=s=>createHash('sha256').update(s,'utf8').digest('hex');
// SHA-256 captured on untouched post-C2c main, BOTH PWA and artifact: CI #43966361442.
const expected='d451f070fde45c721f379161fe3bc8fbd1d29b9649964957ec31591c8e912a55';
const visualExpected='64a85568c392122adf50284fde0d2f83e1cf82ec667571808b93710d69b48dd8';

// The old FREE path short-circuits before S initialization.
assert.equal(run("unlocked('title','novice')"),true,'starter title is free without S');
assert.equal(run("unlocked('frame','basic')"),true,'basic frame is free without S');
assert.equal(run("unlocked('frame','bronze')"),true,'bronze frame is free without S');
assert.throws(()=>run("unlocked('title','atr')"),/(?:undefined|unlocks)/,
  'locked title should still require a loaded save');

const visual=run('JSON.stringify({EMBLEMS,FRAMES,TITLES,FREE})');
const visualSha=hash(visual);
if(visualExpected)assert.equal(visualSha,visualExpected,'emblem SVG, colors, asset paths and catalog changed');
const parsedVisual=JSON.parse(visual);
assert.ok(parsedVisual.EMBLEMS.worm.svg.includes('<image href='),
 'worm badge must keep the original authored asset image');
assert.deepEqual(parsedVisual.EMBLEMS.worm.bg,['#a8784a','#2a1608']);
assert.deepEqual(parsedVisual.FREE,{title:['novice'],frame:['basic','bronze'],ava:[]});

const setups=[
  ['fresh',"set_S(newSave()); S.unlocks={ava:{},frame:{},title:{}}"],
  ['selected',"set_S(newSave()); S.unlocks={ava:{'emb:worm':1,'hero:shaddam':1},frame:{gold:1},title:{mentat:1}}; S.roster.paul.stars=0; S.roster.shaddam.stars=0"],
  ['allStarred',"set_S(newSave()); S.unlocks={ava:{},frame:{},title:{}}; for(const id of Object.keys(S.roster)) S.roster[id].stars=7"],
  ['replaced',"set_S(newSave()); S.unlocks={ava:{},frame:{},title:{}}; S.roster.paul.stars=0"],
];
const rows=[];
for(const [label,setup] of setups){
  run(setup);
  const result=JSON.parse(run(`JSON.stringify({
    titles:Object.keys(TITLES).map(k=>[k,unlocked('title',k)]),
    frames:Object.keys(FRAMES).map(k=>[k,unlocked('frame',k)]),
    emblems:Object.keys(EMBLEMS).map(k=>['emb:'+k,unlocked('ava','emb:'+k)]),
    heroes:CHARS.map(c=>['hero:'+c.id,unlocked('ava','hero:'+c.id)]),
    unknown:[unlocked('ava','hero:no-such'),unlocked('ava','emb:no-such')],
  })`));
  rows.push({label,...result});
  assert.equal(result.titles.find(x=>x[0]==='novice')[1],true);
  assert.equal(result.frames.find(x=>x[0]==='basic')[1],true);
  assert.equal(result.frames.find(x=>x[0]==='bronze')[1],true);
}
assert.equal(rows[0].heroes.find(x=>x[0]==='hero:paul')[1],true);
assert.equal(rows[0].heroes.find(x=>x[0]==='hero:shaddam')[1],false);
assert.equal(rows[1].heroes.find(x=>x[0]==='hero:paul')[1],false,
  'star zero must immediately revoke a natural hero avatar');
assert.equal(rows[1].heroes.find(x=>x[0]==='hero:shaddam')[1],true,
  'saved unlock must prevail even if hero has zero stars');
assert.equal(rows[1].emblems.find(x=>x[0]==='emb:worm')[1],true);
assert.equal(rows[1].frames.find(x=>x[0]==='gold')[1],true);
assert.equal(rows[1].titles.find(x=>x[0]==='mentat')[1],true);
assert.equal(rows[3].emblems.find(x=>x[0]==='emb:worm')[1],false,
  'replacing a save must revoke previous cosmetic rights');
assert.throws(()=>run("unlocked('missing-kind','x')"),/TypeError/,
  'invalid kind must retain historical exception, not default false/true');
const digest=hash(JSON.stringify(rows));
if(expected)assert.equal(digest,expected,'cosmetic rights changed from pre-refactor baseline');
console.log('ARCH-01C3a1 cosmetic snapshot: rights='+digest+'; SVG/catalog='+visualSha+
  '; '+file+'; '+(expected?'strict pinned PASS':'read-only baseline measurement'));
