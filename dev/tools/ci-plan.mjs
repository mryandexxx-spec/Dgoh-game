// Conservative CI selection: only a positive documentation allowlist avoids full CI.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const SHA = /^[a-f0-9]{40}$/;
export function classify(paths, { forceFull = false } = {}) {
  const docs = p => /^(?:README\.md|dev\/(?:README|ARCHITECTURE|CHANGES_STATUS)\.md)$/.test(p)
    || /^dev\/docs\/.+\.(?:md|html|png|jpg|jpeg|webp|svg)$/.test(p)
    || p === 'dev/docs/ci/AUDIT_EVIDENCE_2026_11_14.json';
  const documentation = !forceFull && paths.length > 0 && paths.every(docs);
  const mode = documentation ? 'docs' : 'full';
  // Full is also the fallback for unknown paths, so it includes real MED/LOW A/B.
  return { mode, arena_ab: !documentation, reason: documentation ? 'Only allowlisted documentation changed' : 'Code, infrastructure, unknown/empty diff, or forced full run', paths };
}
export function changedPaths(base, head, cwd = process.cwd()) {
  if (!SHA.test(base || '') || !SHA.test(head || '') || /^0+$/.test(base)) throw Error('No usable base/head SHA');
  const git = args => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 8 * 1024 * 1024 });
  try { git(['cat-file', '-e', base + '^{commit}']); }
  catch { git(['fetch', '--no-tags', '--depth=1', 'origin', base]); }
  // No rename detection: a move is a deletion + addition, and BOTH paths are checked.
  const raw = git(['diff', '--name-only', '--no-renames', '-z', base, head, '--']);
  return raw.split('\0').filter(Boolean);
}
export function planForEvent(eventName, event, head, cwd) {
  if (!['pull_request', 'push'].includes(eventName)) return classify([], { forceFull: true });
  const base = eventName === 'pull_request' ? event.pull_request?.base?.sha : event.before;
  try { return classify(changedPaths(base, head, cwd)); }
  catch (error) { return { ...classify([], { forceFull: true }), reason: 'Unable to prove documentation-only diff; full CI', diagnostic: error.message.split('\n')[0] }; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const plan = planForEvent(process.env.GITHUB_EVENT_NAME, event, process.env.GITHUB_SHA);
  console.log(JSON.stringify(plan, null, 2));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `mode=${plan.mode}\narena_ab=${plan.arena_ab}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `### CI plan\n\nMode: **${plan.mode}**. ${plan.reason}.\n\nChanged paths: ${plan.paths.length}. MED/LOW A/B: ${plan.arena_ab ? 'required' : 'not selected'}.\n`);
}
