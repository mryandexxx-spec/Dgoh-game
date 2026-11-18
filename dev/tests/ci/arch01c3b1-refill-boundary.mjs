// ARCH-01C3b1: only the two Conquest refill selectors move to logic.
// Enforce no change of state/date/economy semantics, ESM order or remaining SCC.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { importEdges, analyzeTree } from '../../tools/arch-init-graph.mjs';
import { SPLIT } from '../../tools/split.config.mjs';

const source=p=>fs.readFileSync('src/'+p,'utf8');
const staticEdges=p=>importEdges(source(p),p).filter(e=>e.kind==='static').map(e=>e.to);
const legacy=JSON.parse(fs.readFileSync('tools/arch-import-baseline.json','utf8')).legacy;
assert.equal(legacy.length,0,'C4a removes boss→skills while keeping original C3b1/C3b3 refill invariants');
assert.ok(!legacy.includes('data/conquest-data.js -> logic/economy.js'));
assert.ok(!legacy.includes('data/conquest-data.js -> logic/conquest.js'),'C3b3 must remove reverse Conquest logic edge');
assert.deepEqual(legacy,[],
 'B1 removes exactly Conquest predecessor; Story remains untouched');
assert.deepEqual(staticEdges('data/conquest-data.js'),[
 'data/chars.js','data/fx.js',
], 'C3b3 also removes live Conquest→logic while preserving blocked UI predecessor');
const data=source('data/conquest-data.js'),logic=source('logic/conquest.js');
assert.ok(!data.includes("import { refillPrice, todayKey } from '../logic/economy.js';") &&
 !data.includes('const cqRfN =') && !data.includes('const cqRfCost ='),
 'refill state/date/pricing belongs to logic, not the data module');
for(const token of ['const CQ_RF = { amt: 50 }','const CQ_EN =','const CQ_DISKS =']) {
 assert.ok(data.includes(token),'all non-refill Conquest data and rules unchanged: '+token);
}
const fnN="const cqRfN = () => (S.cqRf && S.cqRf.d === todayKey()) ? S.cqRf.n : 0;";
const fnCost='const cqRfCost = () => refillPrice(cqRfN());';
assert.ok(logic.includes('const cqScore = () => { const C = cq(); return C.stars + (C.pts || 0); };'),'C3b3 keeps exact score body in logic');
assert.ok(logic.includes(fnN+'\n'+fnCost),'identical original refill calculations must be moved together');
assert.ok(logic.includes("import { enemyProg, refillPrice, todayKey } from './economy.js';"),
 'reuse existing logic→economy import and original date/price functions');
assert.ok(staticEdges('logic/conquest.js').includes('core/state.js'),
 'logic already owns save/state, no new reverse data edge needed');
assert.ok(/export \{[^}]*\bcqRfN\b, cqRfCost\b, cqK\b, cqModD\b, cqScore\b, cqBump\b, cqHot \};/.test(logic),
 'logic exports original recharge API without renaming');
const ui=source('ui/views/conq.js');
assert.ok(ui.includes('cqTrack, cqTypeN, cqRfN, cqRfCost, cqBump, cqK, cqModD, cqScore } from \'../../logic/conquest.js\';') &&
 ui.includes('cqMod, cqRar } from \'../../data/conquest-data.js\';'),
 'existing UI consumers import both functions from the logic owner');
assert.ok(ui.includes("import { REFILL_MAX, ROMAN, RW_NAME, todayKey } from '../../logic/economy.js';"),
 'UI already observes exact old refill limit, time key and price display');
assert.ok(!data.includes("import '../ui/overlays/celebrate.js'; // порядок исполнения"),
 'C3b0 NO-GO: do not remove celebration predecessor');
assert.ok(!source('data/story.js').includes("import '../assets/models.js'; // порядок исполнения"),
 'C2d 3D bootstrap predecessor remains NO-GO');
assert.equal(SPLIT.length,167);
assert.ok(SPLIT.findIndex(([,m])=>m==='data/conquest-data.js') <
 SPLIT.findIndex(([,m])=>m==='logic/conquest.js'),
 'old ESM Conquest data and logic slots retained');
const graph=analyzeTree(process.cwd());
assert.equal(graph.modules,173);
assert.equal(graph.unresolved.length,0);
assert.equal(graph.cycles.length,4,'do not create/destroy SCC without separate review');
assert.deepEqual(graph.cycles.map(c=>c.length),[60,11,6,3],
 'ARCH-01C5b-B1 reviewed replacement SCC sizes must remain exact');
assert.ok(graph.cycles.every(c=>!c.includes('data/conquest-data.js')),
 'pure Conquest data must not re-enter any reviewed runtime SCC');
console.log('ARCH-01C3b1 refill compatibility: PASS; 2 remaining old edges after C4c B1, 167 ESM markers, identical refill API');
