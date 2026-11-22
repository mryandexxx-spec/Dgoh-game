import assert from 'node:assert/strict';import crypto from 'node:crypto';
import { acceptReceipt,findProof,acceptMainPushReceipt,findMainPushProof } from '../../tools/ci-proof.mjs';
import { classify,JOBS } from '../../tools/ci-policy.mjs';
import { SCHEMA } from '../../tools/ci-inputs.mjs';
import { verifyArchive } from '../../tools/ci-archive.mjs';
const repo='owner/game',fp='a'.repeat(64),behavior='b'.repeat(64),head='c'.repeat(40),source='d'.repeat(40);
const self={id:50,workflow_id:7,path:'.github/workflows/validate-pwa.yml'};
const run={id:42,conclusion:'success',event:'pull_request',workflow_id:7,path:self.path,head_sha:head,head_repository:{full_name:repo},head_branch:'feature',run_attempt:1};
const pr={number:9,merged:false,head:{sha:head,ref:'feature',repo:{full_name:repo}},base:{ref:'main',repo:{full_name:repo}}};
const artifacts=[{id:17,name:'dune-validated-build',digest:'sha256:'+'e'.repeat(64),expired:false},{id:18,name:'dune-validation-receipt',digest:'sha256:'+'f'.repeat(64),expired:false,size_in_bytes:100}];
const plan={...classify(['unknown']),fingerprint:fp,behavior};
const receipt={schema:SCHEMA,repository:repo,run_id:42,attempt:1,head_sha:head,source_sha:source,pr_number:9,event:'pull_request',fingerprint:fp,behavior,coverage:JOBS,plan,build_artifact_id:17,build_digest:artifacts[0].digest};
assert.equal(acceptReceipt(receipt,run,self,repo,pr,artifacts).run_id,42);
for(const patch of [{schema:0},{repository:'foreign/game'},{run_id:43},{attempt:2},{head_sha:'0'.repeat(40)},{pr_number:10},{event:'push'},{fingerprint:'invalid'},{build_digest:'sha256:'+'0'.repeat(64)},{build_artifact_id:19},{coverage:['build']}])assert.throws(()=>acceptReceipt({...receipt,...patch},run,self,repo,pr,artifacts));
for(const patch of [{conclusion:'failure'},{event:'workflow_dispatch'},{workflow_id:8},{path:'other.yml'},{head_repository:{full_name:'fork/game'}},{head_branch:'other'}])assert.throws(()=>acceptReceipt(receipt,{...run,...patch},self,repo,pr,artifacts));
assert.throws(()=>acceptReceipt(receipt,run,self,repo,{...pr,head:{...pr.head,repo:{full_name:'fork/game'}}},artifacts));
assert.throws(()=>acceptReceipt(receipt,run,self,repo,{...pr,merged:true,head:{...pr.head,sha:'1'.repeat(40)}},artifacts));
assert.throws(()=>acceptReceipt(receipt,run,self,repo,pr,artifacts.map(a=>({...a,expired:true}))));
const api=async endpoint=>{
 if(endpoint==='/actions/runs/50')return self;
 if(endpoint.startsWith('/actions/workflows/7/runs?'))return {workflow_runs:[run]};
 if(endpoint==='/actions/runs/42/artifacts?per_page=100')return {artifacts};
 if(endpoint==='/commits/'+source+'/pulls')return [{...pr,merged_at:'today',merge_commit_sha:source}];
 throw Error('Unexpected API '+endpoint);
};
const args={eventName:'pull_request',event:{pull_request:pr},head:source,repo,runId:'50',token:'test-only',fingerprint:fp,behavior,required:JOBS,api,download:async()=>receipt};
assert.equal((await findProof(args)).exact,true);
assert.equal((await findProof({...args,fingerprint:'0'.repeat(64)})).exact,false,'version-only input change may inherit behavior');
assert.equal(await findProof({...args,behavior:'0'.repeat(64)}),null);
assert.equal(await findProof({...args,token:''}),null);
assert.equal(await findProof({...args,download:async()=>({...receipt,coverage:['build']})}),null);
assert.equal(await findProof({...args,event:{pull_request:{...pr,head:{...pr.head,repo:{full_name:'fork/game'}}}}}),null);
assert.equal((await findProof({...args,eventName:'push'})).exact,true,'merged same-repo PR with exact merge commit');
assert.equal(await findProof({...args,eventName:'push',api:async e=>e.startsWith('/commits/')?[{...pr,merged_at:'today',merge_commit_sha:'0'.repeat(40)}]:api(e)}),null,'wrong merge commit');
assert.equal(await findProof({...args,eventName:'push',api:async e=>e.startsWith('/commits/')?[]:api(e)}),null,'direct push has no PR proof');
const bytes=Buffer.from('archive');assert.equal(verifyArchive(bytes,'sha256:'+crypto.createHash('sha256').update(bytes).digest('hex')),bytes);assert.throws(()=>verifyArchive(bytes,'sha256:'+'0'.repeat(64)));
// CI-OPT-01: a manual release can reuse only a *successful same-SHA main
// push*, not a green PR, a stale main run, or a forged scope/coverage.
const mainRun = {
  ...run, id: 77, event: 'push', status: 'completed',
  head_branch: 'main', head_sha: head,
};
const mainPlan = { ...classify(['dev/src/logic/daily.js']), fingerprint: fp, behavior };
const mainReceipt = {
  ...receipt, run_id: 77, event: 'push', pr_number: null,
  source_sha: head, head_sha: head,
  coverage: [...mainPlan.coverage], plan: mainPlan,
};
assert.equal(acceptMainPushReceipt(mainReceipt, mainRun, self, repo, head, artifacts).scope, 'economy');
for (const patch of [
  { event: 'pull_request' }, { pr_number: 9 }, { run_id: 42 },
  { source_sha: source }, { head_sha: source },
  { fingerprint: '0'.repeat(64) }, { coverage: ['build'] },
  { build_artifact_id: 222 }, { build_digest: 'sha256:' + '0'.repeat(64) },
]) assert.throws(() => acceptMainPushReceipt(
  { ...mainReceipt, ...patch }, mainRun, self, repo, head, artifacts));
for (const patch of [
  { status: 'in_progress' }, { conclusion: 'failure' }, { event: 'pull_request' },
  { head_branch: 'feature' }, { head_sha: source },
  { workflow_id: 99 }, { path: 'other.yml' },
  { head_repository: { full_name: 'fork/game' } },
]) assert.throws(() => acceptMainPushReceipt(
  mainReceipt, { ...mainRun, ...patch }, self, repo, head, artifacts));
// Regression: neither a different workflow attempt nor expired receipt
// is eligible as a release proof, even when source SHA and checksum match.
assert.throws(() => acceptMainPushReceipt(
  { ...mainReceipt, attempt: mainRun.run_attempt + 1 },
  mainRun, self, repo, head, artifacts), 'wrong workflow attempt');
assert.throws(() => acceptMainPushReceipt(
  mainReceipt, mainRun, self, repo, head,
  artifacts.map(a => a.name === 'dune-validation-receipt' ? { ...a, expired: true } : a)),
  'expired receipt');
assert.throws(() => acceptMainPushReceipt(
  mainReceipt, mainRun, self, repo, head,
  artifacts.map(a => a.name === 'dune-validated-build' ? { ...a, expired: true } : a)),
  'expired immutable build');
assert.throws(() => acceptMainPushReceipt(
  { ...mainReceipt, plan: { ...mainPlan, scope: 'full' } },
  mainRun, self, repo, head, artifacts), 'forged full scope');
const manualSelf = {
  ...self, event: 'workflow_dispatch', head_sha: head,
  head_branch: 'main', head_repository: { full_name: repo },
};
const mainApi = async endpoint => {
  if (endpoint === '/actions/runs/50') return manualSelf;
  if (endpoint === '/branches/main') return { commit: { sha: head } };
  if (endpoint.startsWith('/actions/workflows/7/runs?')) return { workflow_runs: [mainRun] };
  if (endpoint === '/actions/runs/77/artifacts?per_page=100') return { artifacts };
  throw Error('Unexpected main API ' + endpoint);
};
const mainArgs = {
  eventName: 'workflow_dispatch', head, repo, runId: '50',
  token: 'test', fingerprint: fp, behavior, ref: 'refs/heads/main',
  api: mainApi, download: async () => mainReceipt,
};
const validMainProof = await findMainPushProof(mainArgs);
assert.equal(validMainProof.exact, true);
assert.deepEqual(validMainProof.coverage, ['build', 'golden', 'pwa']);
assert.equal(validMainProof.source_sha, head);
assert.equal(await findMainPushProof({ ...mainArgs, head: source }), null);
assert.equal(await findMainPushProof({ ...mainArgs, fingerprint: '0'.repeat(64) }), null);
assert.equal(await findMainPushProof({ ...mainArgs, eventName: 'pull_request' }), null);
assert.equal(await findMainPushProof({ ...mainArgs, ref: 'refs/heads/feature' }), null);
assert.equal(await findMainPushProof({ ...mainArgs, token: '' }), null);
assert.equal(await findMainPushProof({
  ...mainArgs, api: async endpoint =>
    endpoint === '/branches/main' ? { commit: { sha: source } } : mainApi(endpoint),
}), null, 'main advanced while manual release was being planned');
assert.equal(await findMainPushProof({
  ...mainArgs, download: async () => ({ ...mainReceipt, coverage: ['build'] }),
}), null, 'tampered receipt must fail closed');
assert.equal(await findMainPushProof({
  ...mainArgs, api: async endpoint =>
    endpoint.startsWith('/actions/workflows/7/runs?')
      ? { workflow_runs: [{ ...mainRun, head_sha: source }] } : mainApi(endpoint),
}), null, 'successful but stale push is not a release proof');
console.log('PASS exact-main manual proof: same SHA+workflow+run+scope+digest only; foreign/stale/forged fail closed.');
console.log('PASS proof binding: repo/workflow/PR/run/attempt/coverage/immutable digest; fork/stale/missing/changed inputs rejected; exact merge promotion and version inheritance.');
