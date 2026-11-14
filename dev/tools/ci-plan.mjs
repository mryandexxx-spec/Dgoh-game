import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { classify, validatePlan, RELEASE } from './ci-policy.mjs';
import { inputs, changedPaths, campaignRegistryOnly, git } from './ci-inputs.mjs';
import { findProof } from './ci-proof.mjs';
export { classify, changedPaths };
export async function planForEvent(eventName,event,head,cwd=process.cwd(),{lookup=findProof,env=process.env}={}) {
  const key=inputs(cwd);
  const base=eventName==='pull_request'?event.pull_request?.base?.sha:event.before;
  let plan;
  if(!['pull_request','push'].includes(eventName)) plan=classify([],{forceFull:true});
  else {
    try {
      const paths=changedPaths(base,head,cwd);
      let campaignRegistry=false;
      if(paths.includes('dev/tools/split.config.mjs')) {
        try {campaignRegistry=campaignRegistryOnly(base,head,cwd);} catch {}
      }
      plan=classify(paths,{campaignRegistry});
    } catch {plan={...classify([],{forceFull:true}),reason:'Unavailable diff; full validation'};}
  }
  plan={...plan,...key};
  if(plan.mode==='docs'||!['pull_request','push'].includes(eventName))return validatePlan(plan);
  let proof;
  try { proof=await lookup({eventName,event,head,repo:env.GITHUB_REPOSITORY,runId:env.GITHUB_RUN_ID,token:env.GITHUB_TOKEN,...key,required:plan.groups}); }
  catch {plan.reason+='; proof unavailable, running selected checks';}
  if(proof){
    plan={...plan,proof,mode:proof.exact?'reuse':'release',groups:proof.exact?['build']:[...RELEASE],coverage:[...proof.coverage],reason:proof.exact?'Identical inputs: reuse verified build and coverage from run '+proof.run_id:'Only release version changed: rebuild + golden + PWA; inherit behavior checks from run '+proof.run_id};
  }
  return validatePlan(plan);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(git(['rev-parse','HEAD']).trim()!==process.env.GITHUB_SHA)throw Error('Checkout does not match event SHA');
  const event=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
  const plan=await planForEvent(process.env.GITHUB_EVENT_NAME,event,process.env.GITHUB_SHA);
  console.log(JSON.stringify(plan,null,2));
  const out={mode:plan.mode,scope:plan.scope,reuse_run_id:plan.mode==='reuse'?plan.proof.run_id:'',decision:JSON.stringify(plan),...Object.fromEntries(['build','golden','pwa','ui','ui-campaign','campaign-lifecycle','ui-heroes','ui-arena','three-d','three-d-desktop','perf','bh8-preview','bh98-procedural','md-ult1','arena-animation','arena-ab'].map(k=>[k,String(plan.groups.includes(k))]))};
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,Object.entries(out).map(([k,v])=>k+'='+v).join('\n')+'\n');
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`### CI plan\n\nMode: **${plan.mode}**, scope: **${plan.scope}**. ${plan.reason}.\n\n| Job | Required |\n|---|---|\n`+Object.entries(out).filter(([k])=>plan.groups.includes(k)||['golden','pwa','ui-campaign','campaign-lifecycle','three-d','three-d-desktop','arena-ab'].includes(k)).map(([k,v])=>`| ${k} | ${v} |`).join('\n')+'\n');
}
