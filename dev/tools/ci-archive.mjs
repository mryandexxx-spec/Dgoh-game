import crypto from 'node:crypto';
export function verifyArchive(bytes,digest){
  if(!/^sha256:[a-f0-9]{64}$/.test(digest||'')||'sha256:'+crypto.createHash('sha256').update(bytes).digest('hex')!==digest)throw Error('Artifact ZIP SHA-256 mismatch');
  return bytes;
}
export async function fetchArtifact(repo,id,digest,token,max=128*1024*1024){
  if(!Number.isSafeInteger(id)||id<=0)throw Error('Invalid artifact ID');
  const r=await fetch(`https://api.github.com/repos/${repo}/actions/artifacts/${id}/zip`,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw Error('Artifact download failed: '+r.status);
  const chunks=[];let length=0;
  for await(const chunk of r.body){length+=chunk.length;if(length>max)throw Error('Oversized artifact');chunks.push(chunk);}
  const bytes=Buffer.concat(chunks,length);
  return verifyArchive(bytes,digest);
}
