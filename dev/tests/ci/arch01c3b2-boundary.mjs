// ARCH-01C3b2 B1: exact named API, ownership, frozen body and ESM/SCC gate.
// The Stage A virtual test remains in git as historical evidence, not executed after migration.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { importEdges, analyzeTree } from '../../tools/arch-init-graph.mjs';
import { SPLIT } from '../../tools/split.config.mjs';

const src=p=>fs.readFileSync('src/'+p,'utf8');
const data=src('data/conquest-data.js'), logic=src('logic/conquest.js'),ui=src('ui/views/conq.js');
const legacy=JSON.parse(fs.readFileSync('tools/arch-import-baseline.json','utf8')).legacy;
assert.deepEqual(legacy,['data/story.js -> assets/models.js'],'C3b2/C3b3/C4a retire their verified debts; remaining exactly two edges');
const graph=analyzeTree(process.cwd());
assert.equal(graph.modules,173);assert.equal(graph.staticImports,1000);
assert.equal(graph.unresolved.length,0);
assert.equal(graph.cycles.length,2);
assert.deepEqual(graph.cycles.map(c=>c.length),[105,6]);
assert.ok(!graph.cycles[0].includes('data/conquest-data.js'),'only approved data node exits large SCC');
for(const x of ['logic/conquest.js','core/state.js','ui/views/conq.js','ui/overlays/celebrate.js'])
 assert.ok(graph.cycles[0].includes(x));
const edges=p=>importEdges(src(p),p).filter(e=>e.kind==='static').map(e=>e.to);
assert.deepEqual(edges('data/conquest-data.js'),[
 'data/chars.js','data/fx.js'
]);
assert.ok(!data.includes('NOTES')&&!data.includes("from '../core/state.js'"),'data has no live core/state or notification effect');
assert.ok(!data.includes('function cqBump'),'runtime feat mutation must belong to logic');
assert.ok(!data.includes('const cqK = ')&&!data.includes('const cqScore = ')&&
 data.includes('function cqFeats(s)')&&!data.includes("import '../ui/overlays/celebrate.js'; // порядок исполнения"),
 'data tables and other selectors and blocked UI predecessor must be left untouched');
assert.ok(!/export \{[^}]*\bcqBump\b/.test(data),'data must not export relocated runtime action');
assert.ok(/export \{[^}]*\bcqBump\b/.test(logic),'logic must export old named cqBump action');
assert.ok(logic.includes("import { NOTES, S } from '../core/state.js';")&&
 logic.includes('CQ_SECT, CQ_STA, cqFeats, cqMod, cqRar'),'reuse existing edges, notify from logic');
assert.ok(ui.includes("cqTypeN, cqRfN, cqRfCost, cqBump, cqK, cqModD, cqScore } from '../../logic/conquest.js'")&&
 ui.includes('CQ_TROPHY, cqFeats, cqMod, cqRar } from')&&
 !ui.includes('CQ_TROPHY, cqBump,'),'UI consumes same named API from logic');

const oldBody=String.raw`function cqBump(ev, s, n = 1, abs = false) {      // засчитывает событие подвигам: глобальным и локальным сектора s
  const C = cq(), out = [];
  for (const F of [...cqFeats(null), ...(s === null || s === undefined ? [] : cqFeats(s))]) {
    if (F.ev !== ev || C.fd[F.key]) continue;
    const was = C.fp[F.key] || 0, v = Math.min(F.need, abs ? Math.max(was, n) : was + n); if (v === was) continue;
    C.fp[F.key] = v;
    if (v >= F.need) { C.fd[F.key] = 1; C.pts = (C.pts || 0) + F.pts; }
    out.push({ F, v });
  }
  for (const x of out) NOTES.push({ id: Math.random().toString(36).slice(2), kind: 'cqf', F: x.F, v: x.v });
  return out;
}`;
assert.ok(logic.includes(oldBody),'byte-identical old Conquest feat mutation and queue API must be frozen');
assert.equal(logic.split('function cqBump(').length,2);
assert.equal(SPLIT.length,167);
const exp=path=>{
 const m=/^export { (.+) };$/m.exec(src(path));
 return m?m[1].split(', '):[];
};
assert.equal(SPLIT.reduce((n,[,p])=>n+exp(p).length,0),898,
 'old public named globals count unchanged');
assert.ok(exp('logic/conquest.js').includes('cqBump')&&!exp('data/conquest-data.js').includes('cqBump'));
assert.ok(src('data/story.js').includes("import '../assets/models.js'; // порядок исполнения"),'C2d blocked');
console.log('ARCH-01C3b2 implementation boundary: PASS; 2 legacy/0 new, exact unchanged cqBump, 173 JS, 1000 imports, 2 reviewed SCC (106/6), 898 public names, 167 SPLIT markers');
