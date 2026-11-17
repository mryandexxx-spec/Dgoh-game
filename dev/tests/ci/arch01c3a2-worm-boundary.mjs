// ARCH-01C3a2: strict one-edge ownership contract for WORM_IMG and model bootstrap.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { importEdges, analyzeTree } from '../../tools/arch-init-graph.mjs';
import { SPLIT } from '../../tools/split.config.mjs';

const read=p=>fs.readFileSync('src/'+p,'utf8');
const imports=p=>importEdges(read(p),p).map(x=>x.to);
const baseline=JSON.parse(fs.readFileSync('tools/arch-import-baseline.json','utf8')).legacy;
const data=read('data/cosmetics.js');
const profile=read('ui/overlays/profile.js');
const models=read('assets/models.js');
const story=read('data/story.js');
const tick=String.fromCharCode(96);
const expectedPatch="if (typeof WORM_IMG !== 'undefined') { EMBLEMS.worm.svg = "+
  tick+'<image href="'+'$'+'{WORM_IMG.ava}" x="1" y="1" width="38" height="38"/>'+tick+
  "; EMBLEMS.worm.bg = ['#a8784a', '#2a1608']; }";

assert.equal(baseline.length,5,'C3b2 shrinks one further state edge; stats predecessor remains removed');
assert.ok(!baseline.includes('data/cosmetics.js -> assets/models.js'));
assert.ok(!baseline.includes('data/cosmetics.js -> logic/stats.js') &&
  baseline.includes('data/story.js -> assets/models.js'),
  'C3a3 removed stats edge while blocked C2d model chain remains');
assert.deepEqual(imports('data/cosmetics.js'),['data/chars.js'],
  'cosmetic data may not directly import assets or other runtime layers');
assert.ok(!data.includes("import '../logic/stats.js'"),
  'stats order-only predecessor is now explicitly owned by feats UI');
assert.ok(!data.includes('WORM_IMG') && !data.includes('EMBLEMS.worm.svg = '),
  'data/catalog must be pure declarations, WORM image patch owned by UI');
assert.ok(data.includes("worm: { n: 'Пасть Шаи-Хулуда'"),
  'original deterministic procedural SVG fallback must remain in data');

assert.ok(imports('ui/overlays/profile.js').includes('assets/models.js'),
  'UI must directly own the original model-provided WORM_IMG reference');
assert.ok(profile.includes("import { WORM_IMG } from '../../assets/models.js'"),
  'profile must import the real asset URL map, not copy/hardcode a path');
assert.ok(profile.includes(expectedPatch),
  'original SVG image element, URL, dimensions and colors must be byte-for-byte retained');
assert.equal(profile.split(expectedPatch).length-1,1,'exactly one SVG image patch');
assert.ok(profile.indexOf(expectedPatch)>profile.indexOf("import { $ } from '../../core/dom.js';") &&
  profile.indexOf(expectedPatch)<profile.indexOf('function openProfile()'),
  'SVG replacement must occur after imports and before first visible avatar render');

assert.ok(models.includes("const WORM_IMG = { ava: assetUrl('img/worm-ava.png'), badge: assetUrl('img/worm-badge.png') };") &&
  models.includes('b3Pre(loadAssets3);'),
  '3D assets must keep original map and eager preloader registration');
assert.ok(story.includes("import '../assets/models.js'; // порядок исполнения"),
  'do not change C2d blocked bootstrap chain while repairing cosmetics');
assert.ok(read('ui/wiring.js').includes("import '../logic/cosmetics-unlocks.js';"),
  'C3a1 entitlement registration must remain bound before bootstrap');

assert.equal(SPLIT.length,167,'all 167 original pre-C3a2 markers stay in place');
const g=analyzeTree(process.cwd());
assert.equal(g.modules,173,'no new production JS modules should be added');
assert.equal(g.unresolved.length,0);
assert.equal(g.cycles.length,2,'do not change SCC structure');
console.log('ARCH-01C3a2 worm UI boundary: PASS; 6 known imports, 167 markers, same SVG and model preloader');
