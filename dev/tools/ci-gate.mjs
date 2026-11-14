// Accept only intentional documentation skips; a missing/failed plan fails closed.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
export const REQUIRED = ['build', 'golden', 'ui', 'ui-campaign', 'ui-heroes', 'ui-arena', 'three-d', 'three-d-desktop', 'perf', 'bh8-preview', 'bh98-procedural', 'md-ult1', 'arena-animation', 'arena-ab'];
export function checkGate(needs) {
  const mode = needs.plan?.outputs?.mode;
  if (needs.plan?.result !== 'success' || !['full', 'docs'].includes(mode)) throw Error('CI plan failed or is missing/invalid');
  const ab = needs.plan.outputs.arena_ab;
  if (ab !== String(mode === 'full')) throw Error('Inconsistent A/B selection');
  const expected = ['plan', ...REQUIRED].sort();
  if (JSON.stringify(Object.keys(needs).sort()) !== JSON.stringify(expected)) throw Error('Gate dependency set is incomplete/unexpected');
  const bad = REQUIRED.filter(key => needs[key]?.result !== (mode === 'docs' ? 'skipped' : 'success'));
  if (bad.length) throw Error('Unexpected CI results: ' + bad.map(k => k + '=' + needs[k]?.result).join(', '));
  return mode;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const needs = JSON.parse(process.env.RESULTS);
  const mode = checkGate(needs);
  console.log('PASS required CI checks:', mode);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '\n### Required checks\n\n| Job | Result |\n|---|---|\n' + Object.entries(needs).map(([k,v]) => `| ${k} | ${v.result} |`).join('\n') + '\n');
}
