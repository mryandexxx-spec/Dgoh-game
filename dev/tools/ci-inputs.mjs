// Git blob IDs + file modes bind ALL non-documentation inputs, including the
// published baseline used by SW/perf/A-B. Only version.json is ignored for the
// separate behaviour key; its new bytes still require build + golden + PWA.
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { isDoc } from './ci-policy.mjs';
export const SCHEMA = 3;
export const SHA = /^[a-f0-9]{40}$/;
export function git(args, cwd = process.cwd()) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 30000, maxBuffer: 8*1024*1024, stdio: ['ignore','pipe','pipe'] });
}
function digestInputs(records) {
  if(records.some(r=>!['100644','100755'].includes(r.mode)))throw Error('Unsupported tracked input mode');
  records = records.filter(r=>!isDoc(r.name)).sort((a,b)=>Buffer.compare(Buffer.from(a.name),Buffer.from(b.name)));
  const digest = rows => crypto.createHash('sha256').update(JSON.stringify({ schema:SCHEMA, records:rows })).digest('hex');
  return { fingerprint:digest(records), behavior:digest(records.filter(r=>r.name!=='dev/version.json')) };
}
export function inputsAt(ref,cwd=process.cwd()) {
  return digestInputs(git(['ls-tree','-r','-z','--full-tree',ref],cwd).split('\0').filter(Boolean).map(line=>{const [meta,name]=line.split('\t');const [mode,,blob]=meta.split(' ');return {mode,blob,name};}));
}
export function inputs(cwd = process.cwd()) {
  const dirty = git(['diff','--name-only','-z','HEAD','--'],cwd).split('\0').filter(p=>p&&!isDoc(p));
  if(dirty.length)throw Error('Tracked CI inputs modified after checkout: '+dirty.join(', '));
  const records = git(['ls-files','--stage','-z'],cwd).split('\0').filter(Boolean).map(line => {
    const [meta,name] = line.split('\t');
    const [mode,blob,stage] = meta.split(' ');
    if (stage !== '0') throw Error('Unmerged input: ' + name);
    return { mode,blob,name };
  }).filter(r => !isDoc(r.name));
  return digestInputs(records);
}
export function ensureCommit(sha,cwd) {
  if (!SHA.test(sha || '') || /^0+$/.test(sha)) throw Error('Invalid/missing commit SHA');
  try { git(['cat-file','-e',sha+'^{commit}'],cwd); }
  catch { git(['fetch','--no-tags','--depth=1','origin',sha],cwd); }
}
export function changedPaths(base,head,cwd) {
  ensureCommit(base,cwd); ensureCommit(head,cwd);
  return git(['diff','--name-only','--no-renames','-z',base,head,'--'],cwd).split('\0').filter(Boolean);
}
export function campaignRegistryOnly(base,head,cwd) {
  // Accept ONLY added campaign scene entries; no JS evaluation, no deletion,
  // reordering, changed existing row, comment or other executable change.
  const read = sha => git(['show',sha+':dev/tools/split.config.mjs'],cwd);
  const a=read(base), b=read(head);
  const pattern=/^  \[\d+, 'render3d\/scenes\/campaign-[\w-]+\.js'\],\r?\n/gm;
  const added=[...b.matchAll(pattern)].map(m=>m[0]).filter(row=>!a.includes(row));
  return added.length>0 && added.reduce((s,row)=>s.replace(row,''),b)===a;
}
