// ECON-01: daily-quest OR requirements, same quest IDs, rewards and save v1.
import assert from 'node:assert/strict';
import { loadGame } from '../lib/load.mjs';
const html = process.argv[2] || 'dist/pwa/index.html';
const g = loadGame(html);
const quests = JSON.parse(g.run("JSON.stringify(DAILY.map(q=>({k:q.k,need:q.need,alt:q.alt||null,rw:q.rw})))"));
assert.equal(quests.length,10);
const q = key => quests.find(x=>x.k===key);
assert.deepEqual(q('shop').alt,{k:'camp',need:5});
assert.deepEqual(q('craft').alt,{k:'camp',need:10});
assert.deepEqual(q('lvl').alt,{k:'chron',need:3});
assert.deepEqual(q('shop').rw,[['pl',5],['cry',20]]);
assert.deepEqual(q('craft').rw,[['pl',3]]);
assert.deepEqual(q('lvl').rw,[['sol',1500]]);
assert.equal(g.get('CHEST_NEED'),7);
function check(c,got={}) {
  g.set('S',{acc:{lvl:35},daily:{d:g.run('todayKey()'),c,got,chest:false}});
  return JSON.parse(g.run("JSON.stringify(Object.fromEntries(['shop','craft','lvl'].map(k=>{const q=DAILY.find(x=>x.k===k);return [k,qState(q)]})))"));
}
assert.deepEqual(check({shop:0,craft:0,lvl:0,camp:0,chron:0}),{shop:'prog',craft:'prog',lvl:'prog'});
assert.deepEqual(check({camp:4,chron:2}),{shop:'prog',craft:'prog',lvl:'prog'});
assert.deepEqual(check({camp:5}),{shop:'done',craft:'prog',lvl:'prog'});
assert.deepEqual(check({camp:10,chron:3}),{shop:'done',craft:'done',lvl:'done'});
assert.deepEqual(check({shop:3,craft:1,lvl:3}),{shop:'done',craft:'done',lvl:'done'});
assert.deepEqual(check({camp:10,chron:3},{shop:true}),{shop:'got',craft:'done',lvl:'done'});
assert.deepEqual(check({camp:10,chron:3},{shop:true,craft:true,lvl:true}),{shop:'got',craft:'got',lvl:'got'});
assert.equal(g.get('S').daily.chest,false);
assert.equal(g.get('S').daily.got.shop,true);
console.log('ECON-01 daily PASS',html,'OR counters, original rewards, claim precedence');
