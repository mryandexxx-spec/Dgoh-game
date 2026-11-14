import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { fetchArtifact } from './ci-archive.mjs';
import { validatePlan } from './ci-policy.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const plan=validatePlan(JSON.parse(process.env.PLAN));
if(plan.mode!=='reuse')throw Error('Only an exact-input proof may reuse build bytes');
const bytes=await fetchArtifact(process.env.GITHUB_REPOSITORY,plan.proof.artifact_id,plan.proof.artifact_digest,process.env.GITHUB_TOKEN);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dune-build-download-'));
try {
  const file=path.join(dir,'build.zip');fs.writeFileSync(file,bytes);
  execFileSync('python3',['-c',`
import zipfile,sys,pathlib,stat
out=pathlib.Path(sys.argv[2]).resolve()
if out.exists() and any(out.iterdir()): raise ValueError('Build directory must be empty')
with zipfile.ZipFile(sys.argv[1]) as z:
 items=z.infolist()
 if len(items)>10000 or sum(i.file_size for i in items)>256*1024*1024: raise ValueError('Oversized ZIP')
 names=set()
 for i in items:
  p=pathlib.PurePosixPath(i.filename)
  if p.is_absolute() or '..' in p.parts or '.git' in p.parts or '\\\\' in i.filename or stat.S_ISLNK(i.external_attr>>16): raise ValueError('Unsafe ZIP entry')
  if str(p) in names: raise ValueError('Duplicate ZIP entry')
  names.add(str(p))
 z.extractall(out)
`,file,path.join(root,'dev/dist')],{stdio:'inherit',timeout:30000});
} finally {fs.rmSync(dir,{recursive:true,force:true});}
console.log('Reused SHA-256-verified build from run',plan.proof.run_id,'artifact',plan.proof.artifact_id);
