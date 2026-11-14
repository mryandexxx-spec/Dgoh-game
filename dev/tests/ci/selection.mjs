import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { classify, changedPaths, planForEvent } from '../../tools/ci-plan.mjs';
import { checkGate, REQUIRED } from '../../tools/ci-gate.mjs';

assert.equal(classify(['dev/docs/guide.md', 'README.md']).mode, 'docs');
assert.equal(classify(['dev/docs/concept.html']).mode, 'docs');
for (const paths of [[], ['unknown.md'], ['dev/docs/script.mjs'], ['dev/src/render3d/quality.js'], ['dev/src/logic/battle.js'], ['dev/version.json'], ['.github/workflows/validate-pwa.yml'], ['dev/tools/build.mjs'], ['dev/package-lock.json'], ['dev/assets/new.glb'], ['sw.js'], ['dev/docs/guide.md', 'dev/src/core/boot.js']]) assert.equal(classify(paths).mode, 'full', paths.join(','));
assert.equal(classify(['README.md'], { forceFull: true }).mode, 'full');
assert.equal(planForEvent('workflow_dispatch', {}, '').mode, 'full');
assert.equal(planForEvent('push', { before: '0'.repeat(40) }, '1'.repeat(40)).mode, 'full');
assert.equal(planForEvent('pull_request', {}, '').mode, 'full');

function needs(mode) {
  return { plan: { result: 'success', outputs: { mode, arena_ab: String(mode === 'full') } }, ...Object.fromEntries(REQUIRED.map(k => [k, { result: mode === 'docs' ? 'skipped' : 'success' }])) };
}
assert.equal(checkGate(needs('docs')), 'docs');assert.equal(checkGate(needs('full')), 'full');
for (const mode of ['docs','full']) {
  for (const key of REQUIRED) {
    const n = needs(mode); delete n[key]; assert.throws(() => checkGate(n));
    for (const result of ['failure','cancelled', mode === 'docs' ? 'success' : 'skipped']) { const n=needs(mode); n[key].result=result; assert.throws(() => checkGate(n)); }
  }
  for (const result of ['failure','cancelled','skipped']) { const n=needs(mode); n.plan.result=result; assert.throws(() => checkGate(n)); }
}
const invalid=needs('docs');invalid.plan.outputs.mode='';assert.throws(() => checkGate(invalid));
const inconsistent=needs('full');inconsistent.plan.outputs.arena_ab='false';assert.throws(() => checkGate(inconsistent));

// Exercise real git history, including moves FROM docs INTO runtime and vice versa.
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dune-ci-selection-'));
const git=args=>execFileSync('git',args,{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
try {
  git(['init','-q']);git(['config','user.name','CI test']);git(['config','user.email','ci@example.invalid']);
  fs.mkdirSync(path.join(dir,'dev/docs'),{recursive:true});fs.writeFileSync(path.join(dir,'dev/docs/file with spaces.md'),'fixture');git(['add','.']);git(['commit','-qm','base']);const base=git(['rev-parse','HEAD']);
  fs.writeFileSync(path.join(dir,'dev/docs/file with spaces.md'),'documentation');git(['add','.']);git(['commit','-qm','docs']);const docs=git(['rev-parse','HEAD']);
  assert.deepEqual(changedPaths(base,docs,dir),['dev/docs/file with spaces.md']);
  assert.equal(planForEvent('pull_request',{pull_request:{base:{sha:base}}},docs,dir).mode,'docs');
  assert.equal(planForEvent('push',{before:base},docs,dir).mode,'docs');
  fs.mkdirSync(path.join(dir,'dev/src'),{recursive:true});git(['mv','dev/docs/file with spaces.md','dev/src/feature.js']);git(['commit','-qm','move into runtime']);const runtime=git(['rev-parse','HEAD']);
  assert.equal(classify(changedPaths(docs,runtime,dir)).mode,'full');
  git(['mv','dev/src/feature.js','dev/docs/moved.md']);git(['commit','-qm','move out of runtime']);
  assert.equal(classify(changedPaths(runtime,git(['rev-parse','HEAD']),dir)).mode,'full');
  assert.equal(planForEvent('push',{before:'f'.repeat(40)},docs,dir).mode,'full');
} finally { fs.rmSync(dir,{recursive:true,force:true}); }
console.log('PASS CI selection: docs/code/mixed/unknown, real git moves, missing refs, dispatch, and fail-closed gate.');
