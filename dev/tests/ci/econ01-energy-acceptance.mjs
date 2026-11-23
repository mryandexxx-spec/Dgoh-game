// ECON-01 approved 24-hour energy: generated PWA + single-file artifact.
// Existing v1 balances/timestamps are retained; no localStorage writes here.
import assert from 'node:assert/strict';
import { loadGame, FIXED_NOW } from '../lib/load.mjs';
const html = process.argv[2] || 'dist/pwa/index.html';
const g = loadGame(html);
assert.equal(g.get('WATER_BASE'), 360);
assert.equal(g.get('WATER_SEC'), 240);
assert.equal(g.get('CANDLE_BASE'), 288);
assert.equal(g.get('CANDLE_SEC'), 300);
assert.equal(g.get('BATTLE_WATER'), 6);
assert.equal(g.get('CANDLE_COST'), 8);
assert.equal(g.get('RW_NAME').candle, 'Огней Хроник', 'chronicle energy reward label');
assert.equal(g.get('RES_INFO').candle.n, 'Огни Хроник', 'chronicle energy info title');
assert.match(g.get('RES_INFO').candle.d, /5 минут.*288/, 'chronicle energy regen help matches ECON-01');
g.run('set_S({acc:{lvl:35},water:195,candle:150,waterTs:Date.now(),candleTs:Date.now()})');
g.run('tickWater()');
assert.equal(g.get('S').water, 195, 'legacy water balance retained');
assert.equal(g.get('S').candle, 150, 'legacy candle balance retained');
assert.equal(g.get('WMAX')(), 405, 'rank water bonus retained');
assert.equal(g.get('CMAX')(), 318, 'rank candle bonus retained');
g.setNow(FIXED_NOW + 2400000); // +40 min = 10 water, 8 candles
g.run('tickWater()');
assert.equal(g.get('S').water, 205);
assert.equal(g.get('S').candle, 158);
g.setNow(FIXED_NOW + 86400000); // +24 h, bounded by new caps
g.run('tickWater()');
assert.equal(g.get('S').water, 405);
assert.equal(g.get('S').candle, 318);
g.setNow(FIXED_NOW + 172800000);
g.run('tickWater()');
assert.equal(g.get('S').water, 405, 'no water cap overflow');
assert.equal(g.get('S').candle, 318, 'no candle cap overflow');
console.log('ECON-01 energy PASS:',html,'legacy balances, regen, rank caps');
