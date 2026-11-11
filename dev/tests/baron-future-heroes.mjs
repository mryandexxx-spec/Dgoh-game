import assert from 'node:assert/strict';
import { BARON_FUTURE_HEROES, validateFutureHeroRegistry } from '../src/data/baron-future-heroes.js';
assert.deepEqual(validateFutureHeroRegistry(), []);
assert.deepEqual(BARON_FUTURE_HEROES.map(h => h.id), ['margot', 'yue']);
assert.ok(BARON_FUTURE_HEROES.every(h => h.playable && !h.npc && h.initiallyLocked && !h.initialStars && !h.initialShards && h.unlockEvent === null && h.shardSources.length === 0));
assert.ok(validateFutureHeroRegistry([...BARON_FUTURE_HEROES, BARON_FUTURE_HEROES[0]]).length);
assert.ok(validateFutureHeroRegistry(BARON_FUTURE_HEROES.map(h => h.id === 'margot' ? { ...h, shardSources: ['shop'] } : h)).length);
console.log('BH1 pending playable heroes: PASS');
