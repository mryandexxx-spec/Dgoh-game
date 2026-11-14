import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { SCHEMA } from './ci-inputs.mjs';
import { validatePlan } from './ci-policy.mjs';
import { fetchArtifact } from './ci-archive.mjs';
export function acceptReceipt(receipt, run, self, repo, pr, artifacts) {
  if (run.conclusion!=='success' || run.event!=='pull_request' || run.workflow_id!==self.workflow_id || run.path!==self.path || run.head_repository?.full_name!==repo || run.head_branch!==pr.head.ref) throw Error('Untrusted validation run');
  if (receipt.schema!==SCHEMA || receipt.repository!==repo || receipt.run_id!==run.id || receipt.attempt!==run.run_attempt || receipt.head_sha!==run.head_sha || receipt.pr_number!==pr.number || receipt.event!=='pull_request') throw Error('Receipt/run identity mismatch');
  if (pr.head.repo?.full_name!==repo || (pr.merged && receipt.head_sha!==pr.head.sha)) throw Error('Foreign/stale PR proof');
  if (!/^[a-f0-9]{64}$/.test(receipt.fingerprint||'') || !/^[a-f0-9]{64}$/.test(receipt.behavior||'') || !/^[a-f0-9]{40}$/.test(receipt.source_sha||'')) throw Error('Malformed receipt inputs');
  validatePlan(receipt.plan);
  if (receipt.plan.fingerprint!==receipt.fingerprint || receipt.plan.behavior!==receipt.behavior || JSON.stringify(receipt.coverage)!==JSON.stringify(receipt.plan.coverage)) throw Error('Inconsistent receipt coverage');
  const build=artifacts.find(a=>a.name==='dune-validated-build'&&!a.expired);
  const proof=artifacts.find(a=>a.name==='dune-validation-receipt'&&!a.expired);
  if (!build || !proof || receipt.build_artifact_id!==build.id || receipt.build_digest!==build.digest || !/^sha256:[a-f0-9]{64}$/.test(build.digest||'')) throw Error('Expired/mismatched artifact');
  return { run_id:run.id, fingerprint:receipt.fingerprint, behavior:receipt.behavior, coverage:receipt.coverage, artifact_id:build.id, artifact_digest:build.digest, source_sha:receipt.source_sha };
}
export async function findProof({ eventName,event,head,repo,runId,token,fingerprint,behavior,required,api,download }) {
  if (!token || !repo || !runId || !['pull_request','push'].includes(eventName)) return null;
  const request=api || (async endpoint=>{
    const r=await fetch('https://api.github.com/repos/'+repo+endpoint,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});
    if (!r.ok) throw Error('GitHub proof lookup failed: '+r.status);
    return r.json();
  });
  const self=await request('/actions/runs/'+runId);
  let pr;
  if(eventName==='pull_request') pr=event.pull_request;
  else {
    const prs=await request('/commits/'+head+'/pulls');
    pr=prs.find(p=>p.merged_at && p.merge_commit_sha===head && p.base?.ref==='main' && p.base?.repo?.full_name===repo && p.head?.repo?.full_name===repo);
    if(!pr)return null;
    pr={...pr,merged:true};
  }
  if(pr?.head?.repo?.full_name!==repo || pr.base?.repo?.full_name!==repo)return null;
  const list=await request('/actions/workflows/'+self.workflow_id+'/runs?event=pull_request&status=success&branch='+encodeURIComponent(pr.head.ref)+'&per_page=12');
  for(const run of list.workflow_runs){
    if(run.id===Number(runId)||run.workflow_id!==self.workflow_id||run.path!==self.path||run.head_repository?.full_name!==repo||run.head_branch!==pr.head.ref||run.conclusion!=='success'||(eventName==='push'&&run.head_sha!==pr.head.sha))continue;
    const {artifacts}=await request('/actions/runs/'+run.id+'/artifacts?per_page=100');
    const a=artifacts.find(a=>a.name==='dune-validation-receipt'&&!a.expired&&a.size_in_bytes<1024*1024);
    if(!a)continue;
    let receipt;
    try {
      if(download)receipt=await download(a);
      else {
        const bytes=await fetchArtifact(repo,a.id,a.digest,token,1024*1024);
        const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dune-ci-proof-'));
        try { const file=path.join(dir,'proof.zip');fs.writeFileSync(file,bytes);if(execFileSync('unzip',['-Z1',file],{encoding:'utf8',maxBuffer:1024*1024,timeout:5000}).trim()!=='receipt.json')throw Error('Unexpected receipt archive');receipt=JSON.parse(execFileSync('unzip',['-p',file,'receipt.json'],{encoding:'utf8',maxBuffer:1024*1024,timeout:5000})); }
        finally {fs.rmSync(dir,{recursive:true,force:true});}
      }
      const proof=acceptReceipt(receipt,run,self,repo,pr,artifacts);
      if(proof.behavior!==behavior || required.some(k=>!proof.coverage.includes(k)))continue;
      // Exact input match => reuse bytes; version-only match => rebuild and
      // validate packaging, while inheriting unchanged behaviour checks.
      return {...proof,exact:proof.fingerprint===fingerprint};
    } catch { continue; }
  }
  return null;
}
