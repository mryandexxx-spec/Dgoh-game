// ARCH-01C2c: bit-identical seeded PRNG and exact single-edge data boundary.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sRng } from '../../src/data/seeded-rng.js';
import { importEdges, analyzeTree } from '../../tools/arch-init-graph.mjs';
import { SPLIT } from '../../tools/split.config.mjs';

const read = name => fs.readFileSync('src/' + name, 'utf8');
const edges = name => importEdges(read(name), name).map(x => x.to);
const baseline = JSON.parse(fs.readFileSync('tools/arch-import-baseline.json', 'utf8')).legacy;
assert.deepEqual(baseline,[],
 'B1 approved removal preserves only historical Story→models dependency');
const functionV127 = 'function sRng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }';

assert.ok(read('data/seeded-rng.js').includes(functionV127),
  'the algorithm must be byte-for-byte identical to published v127 core RNG');
assert.deepEqual(edges('data/seeded-rng.js'), [],
  'pure seeded RNG cannot acquire DOM, state, UI or other imports');
assert.ok(edges('data/campaigns.js').includes('data/seeded-rng.js') &&
  !edges('data/campaigns.js').includes('core/rng.js'),
  'campaign data must no longer reverse-import core RNG');
assert.ok(read('data/campaigns.js').includes("sRng(ghash(ck + c + ':' + m))"),
  'the fixed seed and 210 invocation order must stay byte-identical');
assert.ok(read('data/campaigns.js').includes("if (n && !n.enemy.includes('rabban'))"),
  'special Chronicles Rabban correction must be left untouched');

const core = read('core/rng.js');
assert.ok(core.indexOf("import './dom.js'; // порядок исполнения") >= 0 &&
  core.indexOf("import './dom.js'; // порядок исполнения") <
    core.indexOf("import { sRng as pureSRng } from '../data/seeded-rng.js';"),
  'original core/dom predecessor must be evaluated first');
assert.ok(core.includes('function sRng(seed) { return pureSRng(seed); }') &&
  core.includes('export { sRng };'),
  'hoisted legacy core RNG function and named export are mandatory');
assert.ok(read('render2d/scenes.js').includes('const NZ = makeNoise(1337);') &&
  read('render2d/scenes.js').includes("import { sRng } from '../core/rng.js';"),
  'early top-level 2D scene RNG dependency cannot tolerate a const alias');
assert.ok(read('logic/progress.js').includes("import '../core/rng.js'; // порядок исполнения"),
  'existing logic bootstrap predecessor must keep core RNG at the legacy slot');

assert.equal(baseline.length,0, 'C4a and C4c B1 remove verified order-only predecessors; campaign, journey and RNG invariants retained');
assert.ok(!baseline.includes('data/campaigns.js -> core/rng.js'));
assert.ok(!baseline.includes('data/story.js -> assets/models.js'),
  'story/order-only C2d is not part of this change');
assert.equal(SPLIT.filter(([,name])=>name==='data/seeded-rng.js').length, 1);
assert.equal(SPLIT.length, 167, '165 existing modules plus one new pure seeded data module');
const graph = analyzeTree(process.cwd());
assert.equal(graph.modules, 173, 'only one source module added after merged C2b');
assert.equal(graph.unresolved.length, 0, 'all imports must resolve');
assert.ok(graph.cycles.length === 4, 'no new cyclic ESM component allowed');

// Independent frozen reference from v127. Compare across 4096 sequential
// output samples; this catches different overflow, Math.imul, step and >>>0.
function reference(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const seeds = [0,1,-1,-2147483648,0xFFFFFFFF,0x80000000,
  0x7fffffff,0x100000000,0x100000001,Number.MAX_SAFE_INTEGER,
  0x6D2B79F5,2166136261,0xDEADBEEF,7,127,2026];
for(const seed of seeds){
  const referenceNext=reference(seed), actualNext=sRng(seed);
  for(let i=0;i<256;i++) {
    assert.equal(actualNext(), referenceNext(),
      'PRNG output diverged at seed '+seed+' draw '+i);
  }
}
const a=sRng(5), b=sRng(5);
assert.equal(a(),b(), 'each invocation must own independent mutable seed state');
assert.equal(a(),b(), 'multiple streams with same seed must not share state');
console.log('ARCH-01C2c deterministic RNG: PASS; 4096 exact sample comparisons, core API, 11 legacy edges');
