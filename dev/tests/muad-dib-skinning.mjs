// Numeric verification that the v5 GLB local skeleton reconstructs the supplied inverse bind matrices.
// No Babylon dependency; catches invisible / exploding skinning that ordinary build tests miss.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const b = fs.readFileSync(new URL('../assets/models/muad-dib-legend.dgm', import.meta.url));
assert.equal(b.toString('ascii',0,4),'DGM1');
const base = 8 + b.readUInt32LE(4), d = JSON.parse(b.toString('utf8',8,base));
assert.equal(d.v,5);
assert.equal(d.jointFormat,'local-trs');
const view = ([offset,length]) => b.subarray(base+offset,base+offset+length);
const ib = view(d.inverseBindMatrices['@b']);
assert.equal(ib.length,d.joints.length*64);
const mul=(a,b)=>{const c=new Float64Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)c[col*4+row]+=a[k*4+row]*b[col*4+k];return c;};
const matrix=(p,q,scale)=>{const [x,y,z,w]=q,[sx,sy,sz]=scale;const m=new Float64Array(16);
m[0]=(1-2*(y*y+z*z))*sx;m[1]=2*(x*y+z*w)*sx;m[2]=2*(x*z-y*w)*sx;
m[4]=2*(x*y-z*w)*sy;m[5]=(1-2*(x*x+z*z))*sy;m[6]=2*(y*z+x*w)*sy;
m[8]=2*(x*z+y*w)*sz;m[9]=2*(y*z-x*w)*sz;m[10]=(1-2*(x*x+y*y))*sz;
m[12]=p[0];m[13]=p[1];m[14]=p[2];m[15]=1;return m;};
const names=new Map,world=[];
for(const [i,[name,p,parent,q,s]] of d.joints.entries()){
  assert(!names.has(name));names.set(name,i);
  assert.equal(p.length,3);assert.equal(q.length,4);assert.equal(s.length,3);
  const local=matrix(p,q,s),m=parent?mul(world[names.get(parent)],local):local;
  world.push(m);
}
let maxErr=0;
for(let i=0;i<world.length;i++){
  const inverse=Float64Array.from({length:16},(_,j)=>ib.readFloatLE((i*16+j)*4));
  const product=mul(world[i],inverse);
  for(let j=0;j<16;j++)maxErr=Math.max(maxErr,Math.abs(product[j]-(j%5===0?1:0)));
}
assert.ok(maxErr<0.001,'bind/inverse-bind mismatch: '+maxErr);
let keys=0;
for(const clip of Object.values(d.clips)){
  for(const tr of clip.tracks){
    assert.ok(names.has(tr.joint));const ts=view(tr.times['@b']),vs=view(tr.values['@b']);
    const n=ts.length/4;keys+=n;assert.equal(vs.length,n*4*tr.componentCount);
    let previous=-Infinity;
    for(let i=0;i<n;i++){const t=ts.readFloatLE(i*4);assert.ok(Number.isFinite(t)&&t>=previous);previous=t;}
    for(let i=0;i<vs.length;i+=4)assert.ok(Number.isFinite(vs.readFloatLE(i)));
  }
}
console.log('PASS Muad Dib v5 inverse bind + animation channels', {bones:world.length, clips:Object.keys(d.clips).length, keys,maxErr});
