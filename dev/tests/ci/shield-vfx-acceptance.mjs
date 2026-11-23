// A tiny headless contract for the visual-only shield VFX. No Babylon renderer required.
import assert from 'node:assert/strict';
import { shieldQuality, shieldOpacity, acceptShieldRipple } from '../../src/render3d/vfx/shield-rules.js';

assert.deepEqual(shieldQuality({ ssao: true, shadowQ: 'medium' }), { fresnel: true, rings: 2 });
assert.deepEqual(shieldQuality({ ssao: false, shadowQ: 'medium' }), { fresnel: false, rings: 2 });
assert.deepEqual(shieldQuality({ ssao: false, shadowQ: 'low' }), { fresnel: false, rings: 1 });
for (const x of [0, -1, NaN, Infinity]) assert.equal(shieldOpacity(x, 5, 1, 1), 0);
for (const time of [0, 2.6, 10, Infinity]) {
  const a = shieldOpacity(.7, time, 1, 0), b = shieldOpacity(.7, time, 1, 1);
  assert.ok(a > 0 && a < .2 && b > a && b < .5);
}
assert.equal(shieldOpacity(.7, 2, 1, 0), shieldOpacity(.7, 2, 1, 0), 'visual pulse is deterministic');
const unit = { root: { isDisposed: () => false }, dead: false, boss: false, shield: 100, cooldown: 0 };
assert.equal(acceptShieldRipple(unit, 1000), true);
assert.equal(acceptShieldRipple(unit, 1100), false, 'rapid hits are visually rate-limited');
assert.equal(acceptShieldRipple(unit, 1200), true);
assert.equal(unit.shield, 100, 'visual code must not mutate shield values');
assert.equal(unit.cooldown, 0, 'visual code must not change cooldowns');
unit.dead = true;
assert.equal(acceptShieldRipple(unit, 1500), false);
unit.dead = false;
unit.root.isDisposed = () => true;
assert.equal(acceptShieldRipple(unit, 1600), false);
console.log('PASS shield VFX: quality tiers, deterministic alpha, overlap guard, gameplay isolation');
