// ARCH-01C2c: immutable SHA-256 of ALL 210 full JSON mission objects.
// Baseline run prints the hash; after approval of the fingerprint, pin and require it
// on both PWA and artifact. No randomness may be advanced by this test.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadGame } from './lib/load.mjs';

const html = process.argv[2] || 'dist/pwa/index.html';
const game = loadGame(html);
const nodesJson = game.run('JSON.stringify(NODES)');
const nodes = JSON.parse(nodesJson);
assert.equal(nodes.length, 210, 'all 210 full mission objects must exist');
const categories = { L: 0, D: 0, C: 0 };
for (let i=0;i<nodes.length;i++) {
  const n=nodes[i];
  assert.ok(Object.hasOwn(categories,n.camp));
  assert.equal(n.c,Math.floor((i%70)/10),'chapter numbering changed');
  assert.equal(n.m,i%10,'mission numbering changed');
  assert.ok(Array.isArray(n.enemy) && n.enemy.length>0, 'enemy generation changed at '+i);
  categories[n.camp]++;
}
assert.deepEqual(categories,{L:70,D:70,C:70});
const hash = createHash('sha256').update(nodesJson,'utf8').digest('hex');
// Immutable checksum captured on unchanged v127 + merged C2b in CI #43955019544.
const expected = 'b33150786a9b8c17abc60a9c1df1b40019ab9f6b6335a0c6d3287837d9beaa48';
if(expected) assert.equal(hash,expected,'210 full mission objects differ from pre-extraction v127+C2b baseline');
console.log('ARCH-01C2c complete 210 NODES SHA-256 '+hash+'; source='+html+
  '; '+(expected?'fixed-baseline PASS':'read-only baseline measurement'));
