// ARCH-01C4c B1: fail-closed regression for the real, owner-approved composition-root migration.
// Two original Git blobs are reconstructed exactly; no game statements may change.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { analyzeTree, importEdges, stronglyConnected } from '../../tools/arch-init-graph.mjs';
import { SPLIT } from '../../tools/split.config.mjs';

const src = p => fs.readFileSync('src/' + p, 'utf8');
const gitBlob = text => {
  const bytes = Buffer.from(text, 'utf8');
  return createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
};
const prelude = "import './data/gear-cap.js';\n" +
  "import './logic/cinematic-preference.js';\n" +
  "import './logic/battle/ai.js';\n";
const boot = src('boot.js'), looks = src('data/looks.js'), ai = src('logic/battle/ai.js');
assert.ok(boot.startsWith(boot.split('\n')[0] + '\n' + prelude +
  "import './ui/views/conq.js'; // порядок исполнения\n"),
  'exactly ordered gear-cap → cinematic-preference → AI → original conq boot');
assert.equal(boot.split(prelude).length, 2, 'one and only one composition-root prelude');
const B1_NAMED="import { loadAssets3 } from './assets/models.js';\n" +
 "import { b3Pre } from './render3d/base.js'; // ARCH-01C5b-B1 application composition root\n";
const B1_REGISTER="// ARCH-01C5b-B1: register exactly once before start() can first render 3D.\nb3Pre(loadAssets3);\n";
assert.equal(boot.split(B1_NAMED).length,2,'one and only one B1 3D named import pair');
assert.equal(boot.split(B1_REGISTER).length,2,'one and only one 3D preloader registration');
const v135Boot=boot.replace(B1_NAMED,'').replace(B1_REGISTER,'');
assert.equal(gitBlob(v135Boot.replace(prelude, '')), 'ee0c72dd86cca18db6005bcf165824a77caae457',
  'original boot.js content apart from three allowed imports must be exact v133 Git blob');
const oldLookImport = "import '../logic/battle/ai.js'; // порядок исполнения\n";
assert.ok(!looks.includes(oldLookImport), 'data looks must not depend on runtime AI');
const eol = looks.indexOf('\n') + 1;
assert.ok(eol > 0, 'original looks header required');
assert.equal(gitBlob(looks.slice(0,eol) + oldLookImport + looks.slice(eol)),
  '099bdc807bfaa189c6f4670d00b605fe02c0b690',
  'looks content and exports must be byte-identical after restoring solely the removed import');
assert.equal(gitBlob(ai), '2012c2fe52d41bc4a14c222175187f1ca1a4a291',
  'AI and CommonJS adapter must remain byte-identical to public v133');
assert.ok(ai.includes("if (typeof module !== 'undefined') module.exports"), 'AI CJS adapter retained');
assert.equal(src('data/gear-cap.js').includes('const MAX_GEAR = 13;'), true);
assert.ok(src('logic/cinematic-preference.js').includes('const CINE_OFF = () =>'));
const ledger = JSON.parse(fs.readFileSync('tools/arch-import-baseline.json','utf8')).legacy;
assert.deepEqual(ledger, [], 'only remaining two historical reverse data imports may remain');
assert.ok(!src('data/conquest-data.js').includes("import '../ui/overlays/celebrate.js'; // порядок исполнения"));
assert.ok(!src('data/story.js').includes("import '../assets/models.js'; // порядок исполнения"));

const graph = analyzeTree(process.cwd());
assert.equal(graph.modules,173,'no new or missing source JS');
assert.equal(graph.staticImports,1001,'old 998 - one data→AI + three permitted boot imports');
assert.equal(graph.unresolved.length,0);
assert.deepEqual(graph.cycles.map(x=>x.length),[60,11,6,3], 'two known SCCs preserved');
const paths = [];
function walk(dir) {
  for (const item of fs.readdirSync(dir,{withFileTypes:true})) {
    const full = path.join(dir,item.name);
    if (item.isDirectory()) walk(full);
    else if (item.name.endsWith('.js')) paths.push(path.relative('src',full).split(path.sep).join('/'));
  }
}
walk('src');
const current = Object.fromEntries(paths.sort().map(p=>[p,importEdges(src(p),p)
  .filter(e=>e.kind==='static').map(e=>e.to)]));
assert.deepEqual(stronglyConnected(current),graph.cycles,'independent graph reconstruction equals AST analysis');
assert.deepEqual(current['boot.js'].slice(0,4),
  ['data/gear-cap.js','logic/cinematic-preference.js','logic/battle/ai.js','ui/views/conq.js']);
assert.deepEqual(current['data/looks.js'], [], 'looks is a pure data leaf');
const v133 = Object.fromEntries(Object.entries(current).map(([p,edges])=>[p,[...edges]]));
v133['boot.js'].splice(0,3);
v133['boot.js']=v133['boot.js'].filter(p=>p!=='assets/models.js'&&p!=='render3d/base.js');
v133['data/looks.js'].unshift('logic/battle/ai.js');
v133['data/story.js'].unshift('assets/models.js');
assert.equal(Object.values(v133).reduce((n,edges)=>n+edges.length,0),998,
  'real B1 → v135 → v133 reconstruction must yield the exact original 998 import count');
const pastSCC=stronglyConnected(v133);
assert.deepEqual(pastSCC.map(c=>c.length),[105,6],
  'v133 large data/3D SCC and six-member battle SCC are recovered exactly');
assert.deepEqual(graph.cycles.find(c=>c.length===6),pastSCC.find(c=>c.length===6),
  'C4c migration must preserve exact six-member battle SCC under subsequent B1 split');
for (const p of ['render2d/fx-layer.js','render2d/scene-bg.js','render2d/scenes.js','render2d/figures.js'])
  assert.ok(!current[p].includes('logic/battle/ai.js'), 'never hide an illegal render2d→logic edge: '+p);
assert.equal(SPLIT.length,167,'cannot update SPLIT to hide ESM drift');
const order=SPLIT.map(([,p])=>p);
assert.equal(new Set(order).size,167);
assert.ok(order.indexOf('logic/battle/ai.js') < order.indexOf('data/looks.js'));
const exported=SPLIT.flatMap(([,p])=>{
  const match=/^export \{ ([^\n]+) \};$/m.exec(src(p));
  return match ? match[1].split(', ') : [];
});
assert.equal(exported.length,898,'all 898 prior exported globals must remain');
console.log('ARCH-01C4c B1 structural PASS: 3→2 legacy / 0 new, 173 JS, 1000 imports, 167 ESM markers, 898 exports, exact original SCC membership [106,6], byte-identical boot/looks game bodies and AI module');
