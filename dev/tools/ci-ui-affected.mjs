// CI-OPT-04: fail-closed UI browser checks from the CI-OPT-03 signed diff plan.
// Browser safety suites for storage/conquest/PWA remain separate gated steps.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { uiBrowserCasesForPaths, validatePlan, UI_BROWSER_CASES } from './ci-policy.mjs';

export function uiAffected(plan, full = false) {
  if (full) {
    if (!plan || plan.scope !== 'full') throw Error('Cannot claim full UI scope');
    validatePlan(plan);
    return [...UI_BROWSER_CASES];
  }
  if (!plan) throw Error('Missing signed UI diff plan');
  validatePlan(plan);
  if (!['focused','ui-copy','pwa','economy','release','tests','campaign'].includes(plan.scope))
    throw Error('Unsupported UI scope: '+plan.scope);
  if (plan.mode === 'reuse') throw Error('UI verification must use a fresh validated plan');
  if (plan.scope === 'focused') {
    if (!plan.groups.includes('ui')) throw Error('UI job was not selected');
    return uiBrowserCasesForPaths(plan.paths);
  }
  // Legacy/manual modes preserve the conservative historical checks.
  return [...UI_BROWSER_CASES];
}
export function uiAffectedOutputs(plan, full = false) {
  const chosen = new Set(uiAffected(plan, full));
  return Object.fromEntries(UI_BROWSER_CASES.map(k => [k, String(chosen.has(k))]));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.CI_PLAN) throw Error('Missing verified CI_PLAN');
  const outputs = uiAffectedOutputs(JSON.parse(process.env.CI_PLAN), process.env.CI_UI_FULL === 'true');
  const data = Object.entries(outputs).map(([k,v]) => k + '=' + v).join('\\n') + '\\n';
  if (!process.env.GITHUB_OUTPUT) throw Error('GITHUB_OUTPUT required');
  fs.appendFileSync(process.env.GITHUB_OUTPUT, data);
  console.log('CI-OPT-04 affected UI browser checks:', JSON.stringify(outputs));
}
