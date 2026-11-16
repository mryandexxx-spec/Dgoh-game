// ARCH-01C2b: all 210 mission unlocks in the REAL bundled game, PWA + artifact.
// No changes to saves, scenarios, campaigns, golden fixtures or DOM.
import assert from 'node:assert/strict';
import { loadGame } from './lib/load.mjs';

const html = process.argv[2] || 'dist/pwa/index.html';
const game = loadGame(html);
const run = expression => game.run(expression);
const camp = JSON.parse(run('JSON.stringify(NODES.map(n => n.camp))'));
assert.equal(camp.length, 210, 'all 210 existing missions must be present');
assert.deepEqual([camp[0], camp[69], camp[70], camp[139], camp[140], camp[209]],
  ['L', 'L', 'D', 'D', 'C', 'C'], '70/70/70 mission and side ordering unchanged');

// The adapter is registered before start(); first-of-side must still short circuit.
for(const first of [0,70,140]) assert.equal(run('nodeOpen(' + first + ')'), true,
  'first node of a side must not read unavailable save state');

// All other nodes must retain live access to S and may not be evaluated at module init.
assert.throws(() => run('nodeOpen(1)'), /(?:undefined|cleared)/,
  'without an initialized save the old rule must not silently grant access');
run('set_S(newSave())');

function assertAllOpenStates(label, cleared) {
  game.ctx.__campaignCleared = cleared;
  run('S.cleared = __campaignCleared');
  const actual = JSON.parse(run('JSON.stringify(NODES.map((_, i) => nodeOpen(i)))'));
  assert.equal(actual.length, 210);
  for(let i=0;i<210;i++){
    const expected = i===0 || camp[i-1]!==camp[i] || !!cleared[i-1];
    assert.equal(actual[i], expected,
      label + ' mission ' + i + ': unlocked state changed');
  }
  assert.equal(actual[0],true,label+' Light first');
  assert.equal(actual[70],true,label+' Dark first');
  assert.equal(actual[140],true,label+' Chronicles first');
  // Within a side even the first mission of the next chapter requires the previous clear.
  for(const boundary of [10,20,30,40,50,60,80,90,100,110,120,130,150,160,170,180,190,200]){
    assert.equal(actual[boundary],!!cleared[boundary-1],
      label+' chapter boundary '+boundary);
  }
  return actual;
}
const empty=assertAllOpenStates('fresh save', {});
assert.equal(empty.filter(Boolean).length,3,
  'no chapter may be unlocked by default except the three side introductions');
const clearedAll=Object.fromEntries(Array.from({length:210},(_,i)=>[i,3]));
const full=assertAllOpenStates('fully cleared save',clearedAll);
assert.equal(full.filter(Boolean).length,210,'fully cleared account must unlock all missions');
const partial={0:1,9:3,69:2,70:3,79:1,139:2,140:1,149:3,199:1};
const midway=assertAllOpenStates('mixed stars and partial clears',partial);
assert.equal(midway[1],true,'cleared mission opens immediate successor');
assert.equal(midway[2],false,'uncleared successor blocks further progression');
assert.equal(midway[10],true,'cleared chapter boss opens the following chapter');
assert.equal(midway[11],false,'next node must remain locked');
assert.equal(midway[80],true,'dark side chapter boss unlocks its next chapter');
assert.equal(midway[150],true,'chronicles chapter boss unlocks its next chapter');
assert.equal(midway[200],true,'chronicles previous boss unlocks its final chapter');

// Live binding: the next lookup reads the CURRENT save, never a cached snapshot.
run('set_S(newSave())');
assert.equal(run('nodeOpen(1)'),false,'fresh replacement save must revoke previously opened node');
run('S.cleared[0]=1');
assert.equal(run('nodeOpen(1)'),true,'newly earned star must immediately unlock next mission');
run('S.cleared[0]=0');
assert.equal(run('nodeOpen(1)'),false,'cleared value 0 must immediately revoke next-node access');

// Keep old direct-call semantics, including no new index validation.
assert.equal(run('nodeOpen(-1)'),true,'historical negative-index short circuit preserved');
assert.throws(()=>run('nodeOpen(210)'), /(?:undefined|camp)/,
  'out-of-range behavior must not be silently changed by the adapter');
console.log('ARCH-01C2b runtime: PASS; 210/210 opens for fresh, full and partial saves, side/chapter boundaries, live S and old API ('+html+')');
