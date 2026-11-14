import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { JOBS, validatePlan } from './ci-policy.mjs';
export const REQUIRED=JOBS;
export function checkGate(needs) {
  if(needs.plan?.result!=='success')throw Error('CI plan failed');
  const plan=validatePlan(JSON.parse(needs.plan.outputs?.decision||'null'));
  if(JSON.stringify(Object.keys(needs).sort())!==JSON.stringify(['plan',...JOBS].sort()))throw Error('Incomplete/unexpected gate dependencies');
  const bad=JOBS.filter(k=>needs[k]?.result!==(plan.groups.includes(k)?'success':'skipped'));
  if(bad.length)throw Error('Unexpected checks: '+bad.map(k=>k+'='+needs[k]?.result).join(', '));
  return plan;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const needs=JSON.parse(process.env.RESULTS),plan=checkGate(needs);
  console.log('PASS required CI checks:',plan.mode,plan.scope);
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'\n### Required checks\n\n| Job | Result |\n|---|---|\n'+Object.entries(needs).map(([k,v])=>`| ${k} | ${v.result} |`).join('\n')+'\n');
}
