// ARCH-01C2a: real built-bundle regression of ALL 210 campaign energy prices.
// Evaluates the existing NODES and nodeCost implementation in PWA and artifact VM.
import assert from 'node:assert/strict';
import { loadGame } from './lib/load.mjs';

const html = process.argv[2] || 'dist/pwa/index.html';
const g = loadGame(html);
assert.equal(g.get('BATTLE_WATER'), 6, 'normal missions must still cost 6 water');
assert.equal(g.get('CANDLE_COST'), 8, 'chronicles must still cost 8 candles');
const rows = JSON.parse(g.run('JSON.stringify(NODES.map((n,i) => ({id:i,side:n.camp,chapter:n.c,mission:n.m,cost:nodeCost(i),energy:nodeEn(i)})))'));
assert.equal(rows.length, 210, 'all 21 chapters / 210 missions must remain present');
const counts = {L:0,D:0,C:0};
for(const row of rows){
  assert.ok(Object.hasOwn(counts,row.side),'unknown campaign side');
  counts[row.side]++;
  const cost = row.side === 'C' ? 8 : 6;
  const energy = row.side === 'C' ? 'candle' : 'water';
  assert.equal(row.cost,cost,'node '+row.id+' price changed');
  assert.equal(row.energy,energy,'node '+row.id+' currency changed');
  assert.ok(row.chapter>=0&&row.chapter<=6&&row.mission>=0&&row.mission<=9,'node indexing changed');
}
assert.deepEqual(counts,{L:70,D:70,C:70},'exact per-side mission counts');
console.log('ARCH-01C2a runtime: PASS; 210/210 mission energy prices unchanged on '+html);
