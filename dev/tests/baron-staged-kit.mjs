import assert from 'node:assert/strict';
import { CH } from '../src/data/chars.js';
import { BARON_LEGEND_KIT } from '../src/data/baron-legend-kit.js';
import { BARON_LEGEND_ABILITIES } from '../src/data/baron-legend-abilities.js';
import { createBattle, abilityReady, living } from '../src/logic/battle/engine.js';
import { act, startTurn } from '../src/logic/battle/turns.js';
import { aiPlan } from '../src/logic/battle/ai.js';

assert.equal(CH.baron_legend, undefined, 'future legend must not be live in CHARS');
assert.equal(BARON_LEGEND_KIT.gl.n, BARON_LEGEND_ABILITIES.gl.name);
assert.equal(BARON_LEGEND_KIT.ult.n, BARON_LEGEND_ABILITIES.powerful.name);
assert.equal(BARON_LEGEND_KIT.basic.n, 'Приказ Барона');
const nativeLayout = ['basic', 'special', 'ult', 'gl'];
assert.deepEqual(nativeLayout.filter(k => CH.muaddib[k]), nativeLayout, 'MuadDib owns all four native slots');
assert.deepEqual(nativeLayout.filter(k => BARON_LEGEND_KIT[k]), nativeLayout, 'Baron reuses those slots');
assert.notEqual(CH.muaddib.gl.kind, BARON_LEGEND_KIT.gl.kind, 'GL abilities are independent');
assert.notEqual(CH.muaddib.ult.n, BARON_LEGEND_KIT.ult.n, 'Regular third abilities are independent');
assert.equal(BARON_LEGEND_KIT.special.cd0, 3);
assert.equal(BARON_LEGEND_KIT.ult.cd0, 4);
assert.equal(BARON_LEGEND_KIT.powerful, undefined, 'must reuse native MuadDib regular ult slot');
CH.baron_legend = BARON_LEGEND_KIT; // isolated test process only
try {
  const build = (id, gl=false) => ({id,lvl:85,stars:7,gear:13,relic:7,gl});
  const B = createBattle([build('baron_legend',true),build('feyd'),build('rabban')],
    [build('leto'),build('gurney')],{seed:12345});
  const baron=B.units.find(x=>x.def.id==='baron_legend');
  const feyd=B.units.find(x=>x.def.id==='feyd');
  assert.ok(baron);
  assert.equal(baron.cd.special,3);
  assert.equal(baron.cd.ult,4);
  assert.equal(abilityReady(B,baron,'ult'),false);
  assert.equal(abilityReady(B,baron,'gl'),false);
  const target=living(B,'B')[0];
  baron.hp=Math.round(baron.maxHp*.5);
  act(B,baron,'basic',target.uid);
  assert.ok(baron.hp>baron.maxHp*.5, 'three healing pulses');
  assert.ok(B.shots.some(s=>s.a===feyd.uid), 'Feyd assisted');
  // Manual action setup mirrors the turn-cooldown decrement path for both keys.
  baron.cd.special=0;
  act(B,baron,'special',target.uid);
  assert.equal(baron.cd.special,3);
  assert.ok(living(B,'B').some(e=>e.fx.horror), 'Horror should land under a high potency deterministic roll');
  baron.cd.ult=0;
  assert.equal(abilityReady(B,baron,'ult'),true);
  act(B,baron,'ult',target.uid);
  assert.equal(baron.cd.ult,4);
  assert.ok(feyd.fx.debuffImmune);
  const enemyLeader=B.units.find(x=>x.side==='B' && x.idx===0);
  assert.ok(enemyLeader.fx.isolation,'Enemy leader isolation');
  assert.equal(aiPlan(B,baron).key,'basic','All stronger powers on cooldown');
} finally { delete CH.baron_legend; }
console.log('BH3 staged legendary Baron: three regular actions, CD, assists and AI: PASS');
