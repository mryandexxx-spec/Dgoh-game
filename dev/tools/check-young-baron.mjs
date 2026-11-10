// BH4 model validation — run: node tools/check-young-baron.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const f = path.join(root, 'assets/models/young-baron.dgm');
const fail = s => { throw Error('BH4 DGM: ' + s); };
const check = (v, s) => { if (!v) fail(s); };
const b = fs.readFileSync(f);
check(b.toString('ascii', 0, 4) === 'DGM1', 'bad magic');
const base = b.readUInt32LE(4) + 8;
check(base <= b.length, 'header exceeds file');
const d = JSON.parse(b.toString('utf8', 8, base));
const names = ['hips','spine','head','shR','elR','handR','shL','elL','handL','hipR','kneeR','ankR','hipL','kneeL','ankL','capeA','capeB','capeC'];
check(d.joints.length === names.length && d.joints.every((j,i) => j[0] === names[i] && (j[2] === null || names.indexOf(j[2]) < i)), 'incompatible rig');
for (const name of ['Idle', 'Attack', 'Hit', 'Death']) {
  const clip = d.clips?.[name];
  check(clip?.duration > 0 && clip.tracks.length === names.length, name + ' missing animation');
  for (const tr of clip.tracks) {
    check(names.includes(tr.joint) && tr.times.length === tr.rotations.length && tr.times.length > 1, name + ' track');
    check(tr.times[0] === 0 && tr.times.at(-1) <= clip.duration && tr.times.every((t,i) => !i || t > tr.times[i-1]), name + ' key times');
    check(tr.rotations.every(q => q.length === 4 && Math.abs(Math.hypot(...q)-1) < .001), name + ' quaternion');
  }
}
const bytes = (p,k) => {
  const v = p[k]?.['@b'];
  check(Array.isArray(v) && v.length === 2 && v[0] >= 0 && v[1] >= 0 && base+v[0]+v[1] <= b.length, 'invalid ' + k);
  return b.subarray(base+v[0], base+v[0]+v[1]);
};
let vertices=0, triangles=0, tex=0;
for (const [group,p] of Object.entries(d.parts)) {
  const pos=bytes(p,'p'), nrm=bytes(p,'nr'), j=bytes(p,'j'), w=bytes(p,'w'), ix=bytes(p,'i');
  check(p.n > 0 && pos.length === p.n*6 && nrm.length === p.n*3 && j.length === p.n*4 && w.length === p.n*4, group + ' attribute sizes');
  check(ix.length % (p.i32 ? 12 : 6) === 0, group + ' triangles');
  check(p.material && p.material.roughness >= 0 && p.material.roughness <= 1 && p.material.metalness >= 0 && p.material.metalness <= 1, group + ' PBR material');
  for(let i=0;i<ix.length;i+=p.i32?4:2) check((p.i32?ix.readUInt32LE(i):ix.readUInt16LE(i)) < p.n, group + ' index');
  for(let i=0;i<j.length;i+=4) {
    check(j[i] < names.length && j[i+1] < names.length && j[i+2] < names.length && j[i+3] < names.length, group + ' joint');
    check(w[i]+w[i+1]+w[i+2]+w[i+3] === 255, group + ' weights');
  }
  if(p.uv) check(bytes(p,'uv').length===p.n*4, group + ' uv');
  if (group === 'part_10') {
    const uv=bytes(p,'uv'); let z=0, top=0, bottom=0, nt=0, nb=0;
    for(let i=0;i<p.n;i++) {
      z+=nrm.readInt8(i*3+2);
      const y=pos.readInt16LE(i*6+2), v=uv.readUInt16LE(i*4+2);
      if(y>19000){top+=v;nt++;} if(y<17200){bottom+=v;nb++;}
    }
    check(z>0,'face must point toward +Z camera, not into the head');
    check(nt>0 && nb>0 && top/nt > bottom/nb,'face UV upside down');
  }
  // Babylon DGM winds triangles clockwise. Outward normals must therefore
  // oppose the cross product; the old converter accidentally pointed inward.
  let outward = 0, inward = 0;
  for (let i=0;i<ix.length;i+=p.i32?12:6) {
    const ids = [0,1,2].map(k => p.i32 ? ix.readUInt32LE(i+k*4) : ix.readUInt16LE(i+k*2));
    const v = ids.map(id => [0,1,2].map(k => pos.readInt16LE(id*6+k*2)));
    const a=v[1].map((x,k)=>x-v[0][k]), b=v[2].map((x,k)=>x-v[0][k]);
    const cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const dot=cross.reduce((sum,x,k)=>sum+x*ids.reduce((s,id)=>s+nrm.readInt8(id*3+k),0),0);
    if(dot < -1) outward++; else if(dot > 1) inward++;
  }
  check(outward > inward, group + ' inward normals');
  for(const channel of ['alb','nrm','orm']) if(p[channel]) {
    const t=p[channel]['@t'];
    check(typeof t === 'string' && /^tex[/]young-baron-[0-9]+[.]jpg$/.test(t) && fs.existsSync(path.join(root,'assets',t)), group + ' texture ' + channel);
    tex++;
  }
  vertices += p.n;
  triangles += ix.length/(p.i32?12:6);
}
check(vertices>=1000 && tex>=1, 'empty model');
console.log('BH4 DGM OK:', {vertices, triangles, bones:names.length, textures:tex});
