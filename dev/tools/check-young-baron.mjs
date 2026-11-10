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
  for(let i=0;i<ix.length;i+=p.i32?4:2) check((p.i32?ix.readUInt32LE(i):ix.readUInt16LE(i)) < p.n, group + ' index');
  for(let i=0;i<j.length;i+=4) {
    check(j[i] < names.length && j[i+1] < names.length && j[i+2] < names.length && j[i+3] < names.length, group + ' joint');
    check(w[i]+w[i+1]+w[i+2]+w[i+3] === 255, group + ' weights');
  }
  if(p.uv) check(bytes(p,'uv').length===p.n*4, group + ' uv');
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
