// ARCH-01C3a3: the stats predecessor belongs to UI feats, not the cosmetic data layer.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { importEdges, analyzeTree } from '../../tools/arch-init-graph.mjs';
import { SPLIT } from '../../tools/split.config.mjs';

const source = p => fs.readFileSync('src/' + p, 'utf8');
const imports = p => importEdges(source(p),p).filter(x => x.kind==='static').map(x => x.to);
const legacy = JSON.parse(fs.readFileSync('tools/arch-import-baseline.json','utf8')).legacy;
assert.equal(legacy.length,5,'C3b2 additionally removes one Conquest live state edge');
assert.ok(!legacy.includes('data/cosmetics.js -> logic/stats.js'),'do not re-add stats to legacy');
assert.ok(legacy.includes('data/story.js -> assets/models.js'),'blocked C2d remains untouched');
assert.deepEqual(imports('data/cosmetics.js'),['data/chars.js'],
  'cosmetic catalog must depend on data alone; never introduce an eager stats dependency');
const cosmetics = source('data/cosmetics.js');
assert.ok(!cosmetics.includes("import '../logic/stats.js'"),
  'stats side effect predecessor must be absent from the data layer');
assert.ok(cosmetics.includes('const EMBLEMS = {') &&
  cosmetics.includes('const FRAMES = {') &&
  cosmetics.includes('const TITLES = {') &&
  cosmetics.includes('const FREE = {') &&
  cosmetics.includes('function unlocked(kind, id)'),
  'catalog and unlocked compatibility API must remain intact');

const feats = source('ui/views/feats.js');
const metricImport = "import { METRIC } from '../../logic/stats.js';";
const catalogImport = "import { EMBLEMS, FRAMES, TITLES } from '../../data/cosmetics.js';";
assert.ok(feats.indexOf(metricImport) > feats.indexOf("import './trials.js';") &&
  feats.indexOf(metricImport) < feats.indexOf(catalogImport),
  'existing METRIC import must precede cosmetics, but follow trials');
assert.deepEqual(imports('ui/views/feats.js').slice(0,3),
  ['ui/views/trials.js','logic/stats.js','data/cosmetics.js'],
  'all 3 legacy ESM predecessors must have their former relative order');
assert.equal((feats.match(/import \{ METRIC \} from '\.\.\/\.\.\/logic\/stats\.js';/g)||[]).length,1,
  'only one existing named METRIC import, no new surrogate import');
assert.ok(source('logic/stats.js').includes('const METRIC = {') &&
  source('logic/stats.js').includes('export { statInc, campStarsOf, METRIC };'),
  'stats module and public named exports cannot change');
assert.ok(source('ui/overlays/profile.js').includes('EMBLEMS.worm.svg = '),
  'C3a2 original worm avatar composition must stay unchanged');
assert.ok(source('data/story.js').includes("import '../assets/models.js'; // порядок исполнения"),
  'C2d 3D bootstrap edge remains blocked');
assert.ok(source('assets/models.js').includes('b3Pre(loadAssets3);'),
  '3D preloader registration must remain eager');
assert.equal(SPLIT.length,167,'167 historic bundle markers must not move or change');
assert.ok(SPLIT.findIndex(([,m])=>m==='logic/stats.js') <
  SPLIT.findIndex(([,m])=>m==='data/cosmetics.js'),
  'stats module must still evaluate before cosmetics');
const graph=analyzeTree(process.cwd());
assert.equal(graph.modules,173,'production source module count unchanged');
assert.equal(graph.unresolved.length,0,'all module paths must resolve');
assert.ok(graph.cycles.length<=2,'C3a3 cannot introduce new ESM cycles');
console.log('ARCH-01C3a3 stats boundary: PASS; 5 legacy / no new, UI owns ordering, 167 markers');
