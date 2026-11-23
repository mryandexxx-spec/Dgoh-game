import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { classify,groupsFor,JOBS,validatePlan } from '../../tools/ci-policy.mjs';
import { inputs,inputsAt,changedPaths,campaignRegistryOnly } from '../../tools/ci-inputs.mjs';
import { planForEvent } from '../../tools/ci-plan.mjs';
import { checkGate } from '../../tools/ci-gate.mjs';

assert.equal(classify(['dev/docs/a.md','README.md']).mode,'docs');
assert.equal(classify(['dev/version.json']).mode,'release');
assert.equal(classify(['dev/src/pwa/sw.js']).mode,'pwa');
const uiCopyOnly=classify(['dev/src/ui/common.js'],{verifiedUiCopy:true});
assert.equal(uiCopyOnly.mode,'ui-copy');
assert.deepEqual(uiCopyOnly.groups,['build','golden','pwa']);
assert.equal(checkGate(needsForScope(uiCopyOnly)).mode,'ui-copy');
assert.equal(classify(['dev/src/ui/common.js']).mode,'full',
  'filenames alone can NEVER skip compiled safety suites');
assert.equal(classify(['dev/src/ui/common.js','dev/src/render3d/quality.js'],
  {verifiedUiCopy:true}).mode,'full','mixed code is not UI-copy');
assert.equal(classify(['dev/src/render3d/scenes/campaign-map.js','dev/src/styles/campaign20.css','dev/version.json']).mode,'campaign');

// CI-OPT-01: narrow, explicit economy/daily changes keep save, golden,
// PWA, writer and transaction coverage without unrelated 3D/WebGL jobs.
const economyPaths = [
  'dev/src/logic/economy.js', 'dev/src/logic/daily.js',
  'dev/src/ui/views/daily.js',
  'dev/tests/ci/econ01-energy-acceptance.mjs',
  'dev/tests/ci/econ01-daily-acceptance.mjs',
  'dev/tests/ci/arch02c-b5a-daily-claims-acceptance.mjs',
];
for (const entry of economyPaths) {
  const plan = classify([entry]);
  assert.equal(plan.mode, 'economy', entry);
  assert.deepEqual(plan.groups, ['build', 'golden', 'pwa'], entry);
  assert.equal(checkGate(needsForScope(plan)).mode, 'economy', entry);
}
assert.equal(classify(economyPaths).mode, 'economy');
assert.equal(classify([...economyPaths, 'dev/version.json']).mode, 'economy',
  'economy with a release-version bump must not trigger unrelated graphics');
assert.equal(classify(['dev/version.json']).mode, 'release',
  'a version-only publish keeps its own PWA/release tests');
assert.equal(classify(['dev/src/logic/daily.js', 'dev/src/pwa/sw.js']).mode, 'full',
  'service worker + economy is mixed infrastructure and must fail closed');
for (const unrelated of [
  'dev/src/logic/battle/engine.js',
  'dev/src/render3d/quality.js',
  'dev/src/storage/save.js',
  'dev/tests/dom/screens.mjs',
  'dev/tools/ci-policy.mjs',
  '.github/workflows/validate-pwa.yml',
  'dev/package-lock.json',
]) assert.equal(classify(['dev/src/logic/daily.js', unrelated]).mode, 'full',
  'mixed or unknown files must fail closed: ' + unrelated);
const scoped = classify(['dev/src/logic/daily.js']);
assert.throws(() => validatePlan({ ...scoped, groups: ['build'] }), /Invalid selected jobs/);
assert.throws(() => validatePlan({ ...scoped, coverage: ['build', 'pwa'] }), /Incomplete validation coverage/);
// A scoped gate must reject missing/failing required checks and a "green"
// unrequested 3D job that would invalidate the exact planned coverage.
function needsForScope(plan) {
  return {
    plan: { result: 'success', outputs: { decision: JSON.stringify(plan) } },
    'arch-strict': { result: 'success' },
    ...Object.fromEntries(JOBS.map(k => [k, { result: plan.groups.includes(k) ? 'success' : 'skipped' }])),
  };
}
for (const key of ['build', 'golden', 'pwa', 'arch-strict']) {
  const broken = needsForScope(scoped);
  broken[key].result = 'skipped';
  assert.throws(() => checkGate(broken), key);
}
const rogue = needsForScope(scoped);
rogue['three-d'].result = 'success';
assert.throws(() => checkGate(rogue), /Unexpected checks/);

assert.deepEqual(classify(['dev/tests/smoke/3d.mjs']).groups,['build','golden','pwa','three-d','three-d-desktop']);
assert.deepEqual(classify(['dev/tests/smoke/dom.mjs']).groups,['build','golden','pwa','ui','ui-arena']);
for(const paths of [[],['dev/src/render3d/engine-host.js'],['dev/src/render3d/quality.js'],['dev/src/logic/battle/engine.js'],['dev/src/assets/models.js'],['dev/assets/new.glb'],['dev/tests/lib/load.mjs'],['dev/tests/fixtures/a.json'],['.github/workflows/validate-pwa.yml'],['dev/tools/build.mjs'],['dev/package-lock.json'],['sw.js'],['unknown.md'],['dev/docs/script.js'],['dev/src/render3d/scenes/campaign-map.js','dev/src/render3d/quality.js']])assert.equal(classify(paths).mode,'full',paths.join(','));
assert.equal(classify(['README.md'],{forceFull:true}).mode,'full');
assert.equal(classify(['dev/tools/split.config.mjs']).mode,'full');
assert.equal(classify(['dev/tools/split.config.mjs','dev/src/render3d/scenes/campaign-new.js'],{campaignRegistry:true}).mode,'campaign');

function needs(plan){return {plan:{result:'success',outputs:{decision:JSON.stringify(plan)}},'arch-strict':{result:'success'},...Object.fromEntries(JOBS.map(k=>[k,{result:plan.groups.includes(k)?'success':'skipped'}]))};}
for(const p of [['README.md'],['dev/version.json'],['dev/src/pwa/sw.js'],['dev/src/styles/campaign20.css'],['dev/tests/smoke/dom.mjs'],['unknown']]){
 const plan=classify(p);assert.equal(checkGate(needs(plan)).mode,plan.mode);
 for(const key of JOBS){
  let n=needs(plan);delete n[key];assert.throws(()=>checkGate(n));
  for(const result of ['failure','cancelled',plan.groups.includes(key)?'skipped':'success']){n=needs(plan);n[key].result=result;assert.throws(()=>checkGate(n));}
 }
 const n=needs(plan);n.plan.result='failure';assert.throws(()=>checkGate(n));
}
// ARCH-01D must never be inherited or skipped: docs, reused artifacts and real source builds
// all require a fresh strict source-boundary result before passing the final gate.
for (const plan of [classify(['dev/docs/README.md']), classify(['dev/version.json']), classify(['dev/src/data/story.js'])]) {
  const missing=needs(plan);delete missing['arch-strict'];
  assert.throws(()=>checkGate(missing),/ARCH-01D/);
  for(const result of ['failure','cancelled','skipped']){
    const broken=needs(plan);broken['arch-strict'].result=result;
    assert.throws(()=>checkGate(broken),/ARCH-01D/);
  }
}
assert.throws(()=>validatePlan({...classify(['unknown']),groups:['build']}));
assert.throws(()=>validatePlan({...classify(['dev/version.json']),coverage:JOBS}),'fresh release cannot certify tests it did not run');

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dune-ci-selection-'));
const git=args=>execFileSync('git',args,{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const write=(p,text)=>{fs.mkdirSync(path.dirname(path.join(dir,p)),{recursive:true});fs.writeFileSync(path.join(dir,p),text);};
const commit=()=>{git(['add','.']);git(['commit','-qm','fixture']);return git(['rev-parse','HEAD']);};
try {
 git(['init','-q']);git(['config','user.name','CI test']);git(['config','user.email','ci@example.invalid']);
 write('dev/docs/file with spaces.md','doc');write('dev/src/game.js','const game=1;');write('dev/version.json','{"v":1}');write('sw.js','baseline');
 const registry="export const SPLIT = [\n  [1, 'data/game.js'],\n];\n";write('dev/tools/split.config.mjs',registry);
 const base=commit(),key=inputs(dir);assert.deepEqual(key,inputsAt(base,dir));

// CI-OPT-01 release: only an immutable *current-main* successful push
// may inherit its risk-scoped checks. A manual regression (publish=false)
// or a missing/stale/forged proof keeps the original full run.
const manualEnv = {
  GITHUB_REF: 'refs/heads/main', GITHUB_REPOSITORY: 'owner/game',
  GITHUB_RUN_ID: '50', GITHUB_TOKEN: 'test',
};
const scopePaths = ['dev/src/logic/daily.js'];
const manualProof = {
  run_id: 77, exact: true, source_sha: base,
  scope: 'economy', paths: scopePaths,
  fingerprint: key.fingerprint, behavior: key.behavior,
  coverage: groupsFor('economy'),
  artifact_id: 17, artifact_digest: 'sha256:' + 'a'.repeat(64),
};
const manualEvent = { inputs: { publish: 'true' } };
const manualArgs = {
  lookupMain: async () => manualProof, env: manualEnv,
};
const manualPlan = await planForEvent(
  'workflow_dispatch', manualEvent, base, dir, manualArgs);
assert.equal(manualPlan.mode, 'reuse');
assert.equal(manualPlan.scope, 'economy');
assert.deepEqual(manualPlan.groups, ['build']);
assert.deepEqual(manualPlan.coverage, ['build', 'golden', 'pwa']);
assert.equal(checkGate(needs(manualPlan)).mode, 'reuse');
const focusedProof = {
  ...manualProof, scope: 'focused',
  paths: ['.github/workflows/validate-pwa.yml','dev/tools/ci-policy.mjs'],
  coverage: groupsFor('focused',['.github/workflows/validate-pwa.yml','dev/tools/ci-policy.mjs']),
};
const focusedManual = await planForEvent('workflow_dispatch',manualEvent,base,dir,{
  ...manualArgs,lookupMain:async()=>focusedProof,
});
assert.equal(focusedManual.scope,'focused');
assert.equal(focusedManual.mode,'reuse');
assert.deepEqual(focusedManual.systems,['ci']);
assert.deepEqual(focusedManual.groups,['build']);
assert.equal(checkGate(needs(focusedManual)).mode,'reuse');
await assert.rejects(()=>planForEvent('workflow_dispatch',manualEvent,base,dir,{
  ...manualArgs,lookupMain:async()=>({...focusedProof,paths:['dev/src/unknown-unsafe.js']}),
}),/No exact-main release proof/,'unknown proof paths must be rejected');
for (const patch of [
  { source_sha: '0'.repeat(40) },
  { fingerprint: '0'.repeat(64) },
  { coverage: ['build'] },
  { artifact_digest: 'invalid' },
  { scope: 'full' },
]) {
  await assert.rejects(
    () => planForEvent('workflow_dispatch', manualEvent, base, dir, {
      ...manualArgs, lookupMain: async () => ({ ...manualProof, ...patch }),
    }),
    /No exact-main release proof/,
    'invalid proof must BLOCK release instead of silently running full regression');
}
await assert.rejects(() => planForEvent('workflow_dispatch',
  {inputs:{publish:'false'}},base,dir,manualArgs),/full_regression=true/);
await assert.rejects(() => planForEvent('workflow_dispatch',manualEvent,base,dir,
  {...manualArgs,lookupMain:async()=>null}),/No exact-main release proof/);
await assert.rejects(() => planForEvent('workflow_dispatch',manualEvent,base,dir,
  {...manualArgs,env:{...manualEnv,GITHUB_REF:'refs/heads/feature'}}),/full_regression=true/);
const approvedFull=await planForEvent('workflow_dispatch',
  {inputs:{full_regression:'true',publish:'false'}},base,dir,manualArgs);
assert.equal(approvedFull.mode,'full');
assert.deepEqual(approvedFull.groups,JOBS);
 write('dev/docs/file with spaces.md','changed');const docs=commit();assert.deepEqual(inputs(dir),key);
 assert.deepEqual(changedPaths(base,docs,dir),['dev/docs/file with spaces.md']);
 assert.equal((await planForEvent('push',{before:base},docs,dir,{lookup:async()=>null})).mode,'docs');
 await assert.rejects(()=>planForEvent('workflow_dispatch',{},docs,dir),/full_regression=true/);
 await assert.rejects(()=>planForEvent('push',{before:'0'.repeat(40)},docs,dir,{lookup:async()=>null}),/Cannot safely classify CI diff/);
 const proof={run_id:42,...key,coverage:JOBS,artifact_id:17,artifact_digest:'sha256:'+'a'.repeat(64),exact:true};
 const event={pull_request:{base:{sha:base},head:{sha:docs}}};
 // An existing code PR followed by docs must reuse an exact proven input set.
 await assert.rejects(()=>planForEvent('pull_request',{pull_request:{base:{sha:'f'.repeat(40)}}},docs,dir,{lookup:async()=>proof}),/Cannot safely classify CI diff/,'missing diff blocks unsafe reuse');
 const reused={...classify(['dev/version.json']),mode:'reuse',groups:['build'],coverage:JOBS,...key,proof};
 assert.equal(checkGate(needs(reused)).mode,'reuse');
 assert.throws(()=>checkGate(needs({...reused,proof:{...proof,fingerprint:'b'.repeat(64)}})));
 write('dev/version.json','{"v":2}');const version=commit(),versionKey=inputs(dir);
 assert.notEqual(versionKey.fingerprint,key.fingerprint);assert.equal(versionKey.behavior,key.behavior);
 const metadata=await planForEvent('pull_request',event,version,dir,{lookup:async()=>({...proof,exact:false})});
 // Its cumulative diff contains only docs/version, so release remains minimal.
 assert.equal(metadata.mode,'release');assert.deepEqual(metadata.groups,groupsFor('release'));
 write('dev/src/game.js','const game=2;');const code=commit();assert.notEqual(inputs(dir).behavior,key.behavior);
 await assert.rejects(()=>planForEvent('push',{before:version},code,dir,{lookup:async()=>{throw Error('unavailable');}}),/No safe CI subsystem mapping/);
 // Dirty code cannot be certified using stale git blob IDs.
 write('dev/src/game.js','dirty');assert.throws(()=>inputs(dir));git(['checkout','--','dev/src/game.js']);
 write('sw.js','new baseline');commit();assert.notEqual(inputs(dir).behavior,versionKey.behavior);
 write('dev/tools/split.config.mjs',registry.replace('];',"  [2, 'render3d/scenes/campaign-new.js'],\n];"));const added=commit();assert.equal(campaignRegistryOnly(base,added,dir),true);
 write('dev/tools/split.config.mjs',registry.replace("[1, 'data/game.js']","[9, 'data/game.js']"));const changed=commit();assert.equal(campaignRegistryOnly(base,changed,dir),false);
 fs.mkdirSync(path.join(dir,'dev/src'),{recursive:true});git(['mv','dev/docs/file with spaces.md','dev/src/moved.js']);const moved=commit();assert.equal(classify(changedPaths(changed,moved,dir)).mode,'full');
 git(['mv','dev/src/moved.js','dev/docs/moved.md']);const back=commit();assert.equal(classify(changedPaths(moved,back,dir)).mode,'full');
} finally {fs.rmSync(dir,{recursive:true,force:true});}
console.log('PASS CI scope/gate/input keys: docs-after-code, version-only behavior inheritance, mixed/unknown, registry changes, renames, dirty inputs and baseline changes.');

// GitHub inserts implicit success() unless a status-check function is present.
// A reuse run has intentionally skipped ancestors; publication must depend on
// the explicit plan/gate results, while still refusing canceled workflows.
const workflow=fs.readFileSync(new URL('../../../.github/workflows/validate-pwa.yml',import.meta.url),'utf8');
// CI-OPT-01 phase 2: the scoped economy build must retain safety and
// transactional coverage while skipping unrelated historical content/3D.
const buildSection = workflow.match(/^  build:\n([\s\S]*?)^  golden:/m)?.[1];
assert.ok(buildSection, 'compiled build job exists');
const buildSteps = buildSection.split(/\n      - /).slice(1);
const stepNamed = name => buildSteps.find(x => x.includes('name: ' + name + '\n'));
const requireScoped = name => {
  const step = stepNamed(name);
  assert.ok(step, name + ': build smoke/safety step must exist');
  assert.match(step, /^if: \$\{\{ needs\.plan\.outputs\.mode != 'reuse' && needs\.plan\.outputs\.scope != 'ui-copy' && needs\.plan\.outputs\.scope != 'focused' \}\}/,
    name + ': must execute for economy, skip UI-copy');
};
for (const name of [
  'ECON-01 deterministic economy simulation contract (approved energy)',
  'ECON-01 energy regen save-v1 regression (PWA + HTML)',
  'ECON-01 daily quest alternatives and reward-once semantics',
  'ARCH-02B1 fail-closed storage acceptance (PWA + artifact)',
  'ARCH-02C-B1 verified checkpoint + explicit restore (PWA + artifact)',
  'ARCH-02C-B2 safe import/export and fault acceptance (PWA + artifact)',
  'ARCH-02C-B3-B1c-B3 MANDATORY ordinary startup writer gate (PWA + artifact)',
  'ARCH-02C-B4-B1 battle checkpoint settlement (PWA + artifact; NO RELEASE)',
  'ARCH-02C-B4-B2 campaign + Conquest entry debit checkpoint (PWA + artifact; NO RELEASE)',
  'ARCH-02C-B4-B4b2 Conquest shops/refills/consumables (PWA + artifact; NO RELEASE)',
  'ARCH-02C-B5a verified daily quest and chest claims (PWA + artifact; NO RELEASE)',
  'ARCH-02C-B5b verified login calendar + month rollover (PWA + artifact; NO RELEASE)',
  'ARCH-02C-B6a verified markets, energy refills and recycling (PWA + artifact; NO RELEASE)',
  'ARCH-02C-B6b verified hero upgrades and crafting (PWA + artifact; NO RELEASE)',
  'ARCH-02D-B2 GameClock daily/calendar snapshots and DST (PWA + artifact; NO RELEASE)',
  'ARCH-02D-B3 monotonic resource regeneration + wall spoof (PWA + artifact; NO RELEASE)',
  'ARCH-02D-B4a offline relaunch clock limits + v1 safety (PWA + artifact; NO RELEASE)',
  'ARCH-02D-B4b2 paid-day ledger history and rollback protection (PWA + HTML, 3 TZ; NO RELEASE)',
]) requireScoped(name);
for (const name of [
  'ARCH-02C-B3-A0 multi-tab race characterization (PWA + artifact; UNSAFE baseline)',
  'ARCH-02D-B4b1b archive quota, growth and transfer limits (PWA + HTML, 3 TZ; NO RELEASE)',
  'ARCH-01C2a all 210 mission costs (PWA + artifact)',
]) {
  const step = stepNamed(name);
  assert.ok(step, name + ': full-suite step must remain available');
  assert.match(step, /^if: \$\{\{ needs\.plan\.outputs\.mode != 'reuse' && needs\.plan\.outputs\.scope != 'economy' && needs\.plan\.outputs\.scope != 'ui-copy' && needs\.plan\.outputs\.scope != 'focused' \}\}/,
    name + ': run for full scope, not economy or UI-copy');
}
const economySkipped = buildSteps.filter(x => x.startsWith("if: ${{ needs.plan.outputs.mode != 'reuse' && needs.plan.outputs.scope != 'economy' && needs.plan.outputs.scope != 'ui-copy' && needs.plan.outputs.scope != 'focused' }}"));
assert.ok(economySkipped.length >= 50,
  'economy-only changes should avoid unrelated heavy build regression steps');
// CI-OPT-01: no duplicate 36-minute Fast job for economy-only PRs.
// The normal Full/Scoped PWA job must supply actual native-browser writer
// and protected-import coverage on the *same* compiled artifact.
const fastWorkflow = fs.readFileSync(
  new URL('../../../.github/workflows/arch02c-b3-fast-acceptance.yml', import.meta.url), 'utf8');
// No automatic 36-minute duplicate job: available only on explicit dispatch.
const fastTrigger=fastWorkflow.split('\npermissions:')[0];
assert.match(fastTrigger,/on:\n  workflow_dispatch:/);
assert.doesNotMatch(fastTrigger,/pull_request:/);
const economyPwa = workflow.match(/^  pwa:\n([\s\S]*?)^  ui:/m)?.[1];
assert.ok(economyPwa, 'required compiled PWA job must remain');
for (const command of [
  'arch02c-b3-b1c-b3-native-auto-chromium.mjs',
  'arch02c-b3-b1b-real-multitab-chromium.mjs',
  'arch02c-b3-b2-a2-real-chromium.mjs',
]) {
  const step = economyPwa.split(/\n      - /).find(x => x.includes(command) && x.includes('name: CI-OPT-01 economy'));
  assert.ok(step, command + ': missing native Chromium safety');
  assert.match(step, /if: \$\{\{ needs\.plan\.outputs\.scope == 'economy' \}\}/,
    command + ': native Chromium acceptance must not run as a full-suite duplicate');
}
// CI-OPT-01: only explicit manual publishing may take the exact-main
// receipt reuse route, and it must still smoke both compiled artifacts.
const releaseParserStep = workflow.split(/\n      - /).find(x =>
  x.includes('name: CI-OPT-01 install isolated parser for reused release smoke'));
assert.ok(releaseParserStep, 'reused release smoke must install Acorn dependencies');
assert.match(releaseParserStep,
  /if: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.publish == true && needs\.plan\.outputs\.mode == 'reuse' \}\}/);
assert.ok(releaseParserStep.includes('npm ci --ignore-scripts --no-audit --no-fund'));
const releaseSmokeStep = workflow.split(/\n      - /).find(x =>
  x.includes('name: CI-OPT-01 release smoke on exact PWA and HTML artifact'));
assert.ok(releaseSmokeStep, 'manual scoped publish must have fresh legacy-save smoke');
assert.match(releaseSmokeStep, /github\.event_name == 'workflow_dispatch' && inputs\.publish == true && needs\.plan\.outputs\.mode == 'reuse'/);
for (const command of [
  'tools/check-bundle.mjs dist/pwa/app.js',
  'arch02c-b3-b1c-b3-mandatory-boot-acceptance.mjs dist/pwa/index.html',
  'arch02c-b3-b1c-b3-mandatory-boot-acceptance.mjs dist/artifact.html',
  'golden/saves.mjs dist/pwa/index.html',
  'golden/saves.mjs dist/artifact.html',
]) assert.ok(releaseSmokeStep.includes(command), command + ': must stay required for reused release');
// CI-OPT-01 final focused economy contract: keep exact save-v1 golden,
// real daily/chest browser DOM and offline PWA (including native writer) while
// skipping all unrelated 200-battle/41-screen/optional 3D asset checks.
const scopeGolden = workflow.match(/^  golden:\n([\s\S]*?)^  pwa:/m)?.[1];
assert.ok(scopeGolden,'required golden job exists for economy and full');
const goldenSteps = scopeGolden.split(/\n      - /).slice(1);
const goldenStep = label => goldenSteps.find(x=>x.includes('name: '+label+'\n'));
const savesFocused=goldenStep('CI-OPT-02 focused save-v1 Golden (PWA + HTML)');
assert.ok(savesFocused,'scoped economy save golden must exist');
assert.match(savesFocused,/if: \$\{\{ needs\.plan\.outputs\.scope == 'economy' \|\| needs\.plan\.outputs\.scope == 'ui-copy' \|\| needs\.plan\.outputs\.scope == 'focused' \}\}/);
for(const f of ['dist/pwa/index.html','dist/artifact.html'])
  assert.ok(savesFocused.includes('node tests/golden/saves.mjs '+f),'save v1 '+f+' required');
const goldenFull=goldenStep('Golden full regression (200 battles, 41 screens, PWA + HTML)');
assert.ok(goldenFull);
assert.match(goldenFull,/if: \$\{\{ needs\.plan\.outputs\.scope != 'economy' && needs\.plan\.outputs\.scope != 'ui-copy' && needs\.plan\.outputs\.scope != 'focused' \}\}/);
assert.ok(goldenFull.includes('npm test'),'full regression cannot be silently removed');
assert.ok(goldenSteps.some(x=>x.includes('npm install --no-save --package-lock=false playwright@1.56.1') &&
  x.includes("scope != 'economy'")), 'Playwright setup only for full golden');
const economyDailyDom=economyPwa.split(/\n      - /).find(x=>
  x.includes('name: CI-OPT-01 economy daily and chest DOM (PWA + HTML)'));
assert.ok(economyDailyDom,'real daily UI smoke must remain in required PWA job');
assert.match(economyDailyDom,/scope == 'economy' \|\| needs\.plan\.outputs\.scope == 'full'/);
for(const f of ['dist/pwa/index.html','dist/artifact.html'])
  assert.ok(economyDailyDom.includes('node tests/ci/econ01-daily-dom-smoke.mjs '+f));
for(const name of ['Service worker installs even if optional 3D asset stalls','PWA update and offline assets']){
  const required=economyPwa.split(/\n      - /).find(x=>x.includes('name: '+name+'\n'));
  assert.ok(required && !required.includes("scope != 'economy'"),name+': critical offline PWA check must remain');
}
for(const name of ['Core model stalled on iPhone must not block 3D lobby',
  'Optional Muad-Dib download must not block 3D lobby']){
  const optional=economyPwa.split(/\n      - /).find(x=>x.includes('name: '+name+'\n'));
  assert.ok(optional && optional.includes("scope != 'economy'"),name+': unrelated optional 3D check gated for economy only');
}
assert.equal(classify(['dev/src/logic/daily.js','dev/src/render3d/quality.js']).scope,'full',
  'mixed visuals never enter shortened economy golden');
assert.equal(checkGate(needsForScope(scoped)).mode,'economy',
  'focused golden+pwa results must still satisfy the exact unchanged gate');
const uiCopyPwaSmoke=economyPwa.split(/\n      - /).find(x =>
  x.includes('name: CI-OPT-02 UI-copy real Chromium display smoke (PWA + HTML)'));
assert.ok(uiCopyPwaSmoke,'UI-copy real browser acceptance must exist');
assert.match(uiCopyPwaSmoke,/scope == 'ui-copy'/);
for(const f of ['dist/pwa/index.html','dist/artifact.html'])
  assert.ok(uiCopyPwaSmoke.includes('node tests/ci/ui-copy-dom-smoke.mjs '+f),
    'UI-copy smoke runs against both compiled artifacts');
assert.equal(checkGate(needsForScope(uiCopyOnly)).mode,'ui-copy',
  'UI-copy retains strict gate and required compiled build, save and PWA jobs');
const strict=workflow.match(/^  arch-strict:\n([\s\S]*?)^  build:/m)?.[1];
assert.ok(strict,'dedicated strict job must exist outside scope/reuse selection');
assert.match(strict,/node tools\/check-deps\.mjs --strict/);
assert.match(strict,/node tools\/check-arch-imports\.mjs --strict/);
assert.match(strict,/node tests\/ci\/arch01d-strict-gate\.mjs/);
const finalNeeds=workflow.match(/^  gate:\n[\s\S]*?^    needs: \[([^\]]+)\]/m)?.[1];
assert.ok(finalNeeds?.split(', ').includes('arch-strict'),'final gate must depend on ARCH-01D independently');
assert.match(workflow,/^          node tools\/check-arch-imports\.mjs --strict$/m);
const deploy=workflow.match(/^  deploy-pages:\n[\s\S]*?^    if: \$\{\{ (.*?) \}\}$/m)?.[1];
assert.ok(deploy,'publication condition exists');
assert.match(deploy,/!\s*cancelled\(\)/,'override implicit success() for skipped ancestors');
assert.match(deploy,/needs\.plan\.result == 'success'/);
assert.match(deploy,/needs\.gate\.result == 'success'/);
// A main merge is not a release: only an explicitly approved manual run
// with publish=true may proceed past the certified gate to GitHub Pages.
const publish=Function('github','needs','cancelled','inputs','return ('+deploy+')');
const github={event_name:'workflow_dispatch',ref:'refs/heads/main'};
const approved={publish:true},notApproved={publish:false};
const ready={plan:{result:'success',outputs:{mode:'reuse'}},gate:{result:'success'},golden:{result:'skipped'},renderer:{result:'skipped'}};
assert.equal(publish(github,ready,()=>false,approved),true,'approved manual dispatch may publish validated reuse despite skipped ancestors');
assert.equal(publish(github,ready,()=>false,notApproved),false,'unapproved manual dispatch cannot publish');
assert.equal(publish(github,ready,()=>true,approved),false,'canceled workflow cannot publish');
for(const mode of ['full','campaign','release','pwa','tests'])assert.equal(publish(github,{...ready,plan:{...ready.plan,outputs:{mode}}},()=>false,approved),true);
assert.equal(publish(github,{...ready,plan:{...ready.plan,outputs:{mode:'docs'}}},()=>false,approved),false);
for(const key of ['plan','gate'])for(const result of ['failure','cancelled','skipped'])assert.equal(publish(github,{...ready,[key]:{...ready[key],result}},()=>false,approved),false);
assert.equal(publish({...github,event_name:'push'},ready,()=>false,approved),false,'main push from merge must not publish');
assert.equal(publish({...github,event_name:'pull_request'},ready,()=>false,approved),false);
assert.equal(publish({...github,ref:'refs/heads/feature'},ready,()=>false,approved),false);
console.log('PASS publication condition: explicit manual release opt-in, successful plan/gate, reuse skips, cancellation, docs, push/PR/non-main refusals.');
