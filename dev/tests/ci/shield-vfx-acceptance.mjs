// A tiny headless contract for the visual-only shield VFX. No Babylon renderer required.
import assert from 'node:assert/strict';
import { shieldQuality, shieldOpacity, syncShieldBubble, acceptShieldRipple } from '../../src/render3d/vfx/shield-rules.js';

assert.deepEqual(shieldQuality({ ssao: true, shadowQ: 'medium' }), { fresnel: true, rings: 2 });
assert.deepEqual(shieldQuality({ ssao: false, shadowQ: 'medium' }), { fresnel: false, rings: 2 });
assert.deepEqual(shieldQuality({ ssao: false, shadowQ: 'low' }), { fresnel: false, rings: 1 });
for (const x of [0, -1, NaN, Infinity]) assert.equal(shieldOpacity(x, 5, 1, 1), 0);
for (const time of [0, 2.6, 10, Infinity]) {
  const a = shieldOpacity(.7, time, 1, 0), b = shieldOpacity(.7, time, 1, 1);
  assert.ok(a > 0 && a < .2 && b > a && b < .5);
}
assert.equal(shieldOpacity(.7, 2, 1, 0), shieldOpacity(.7, 2, 1, 0), 'visual pulse is deterministic');
const unit = { root: { isDisposed: () => false }, dead: false, boss: false, shield: 100, shieldK: 1, cooldown: 0 };
const transitions = [];
const bubble = unit.bubble = {
  material: { alpha: 0, opacityFresnelParameters: { power: 2.2 } },
  setEnabled: on => transitions.push(on),
  isDisposed: () => false
};
// Fresnel must never leave a visible mesh for a zero-alpha shield.
// It is not sufficient to set material.alpha=0.
unit.shieldK = 0;
assert.equal(syncShieldBubble(unit, 1.2), false);
assert.deepEqual(transitions, [false], 'initial zero shield disables Fresnel mesh');
assert.equal(bubble.material.alpha, 0);
unit.shieldK = .7;
assert.equal(syncShieldBubble(unit, 1.2), true);
assert.ok(bubble.material.alpha > 0);
assert.deepEqual(transitions, [false, true], 'shield reapplied makes bubble visible again');
syncShieldBubble(unit, 1.3);
assert.equal(transitions.length, 2, 'frame updates do not re-toggle mesh');
unit.dead = true;
assert.equal(syncShieldBubble(unit, 1.4, 1), false);
assert.equal(bubble.material.alpha, 0);
assert.deepEqual(transitions, [false, true, false], 'death disables Fresnel even during hit flash');
unit.dead = false;
unit.shieldK = 0;
assert.equal(syncShieldBubble(unit, 1.5, 1), false, 'no ghost shield after death');
unit.shieldK = 1;
assert.equal(syncShieldBubble(unit, 1.6), true, 'revive with shield re-enables');
unit.root.isDisposed = () => true;
assert.equal(syncShieldBubble(unit, 1.7), false, 'wave switch/disposal hides shield');
assert.equal(bubble.material.alpha, 0);
assert.deepEqual(transitions, [false, true, false, true, false]);
unit.root.isDisposed = () => false;
unit.shieldK = 1;
assert.equal(syncShieldBubble(unit, 1.8), true);
assert.equal(acceptShieldRipple(unit, 1000), true);
assert.equal(acceptShieldRipple(unit, 1100), false, 'rapid hits are visually rate-limited');
assert.equal(acceptShieldRipple(unit, 1200), true);
assert.equal(unit.shield, 100, 'visual code must not mutate shield values');
assert.equal(unit.cooldown, 0, 'visual code must not change cooldowns');
unit.shieldK = 0;
assert.equal(acceptShieldRipple(unit, 1300), false, 'no ripple after shield break');
unit.shieldK = 1;
unit.dead = true;
assert.equal(acceptShieldRipple(unit, 1500), false);
unit.dead = false;
unit.root.isDisposed = () => true;
assert.equal(acceptShieldRipple(unit, 1600), false);
console.log('PASS shield VFX: Fresnel mesh lifecycle, death, depletion, revive, ripple dedupe and gameplay isolation');
