// BH5 — protect the two independent Baron model IDs. The optimized DGM is
// required in BH5 and ONLY the new legendary identity may ever receive it.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const loader = readFileSync(new URL('../src/assets/models.js', import.meta.url), 'utf8');
assert.match(loader, /'models\/young-baron\.dgm'/, 'Original young-Baron asset stays in place');
assert.match(loader, /'models\/baron-legend-mobile\.dgm'/, 'Legendary Baron DGM must have its own path');
assert.match(loader, /id === 'young-baron' \? 'baron' : id === 'baron-legend-mobile' \? 'baron_legend'/,
  'Never route the legendary model into the young Baron ID');
const name = resolve(new URL('../assets/models/baron-legend-mobile.dgm', import.meta.url).pathname);
assert.ok(existsSync(name), 'Owner uploaded BH5 DGM must exist in this branch');
{
  const b = readFileSync(name);
  assert.equal(b.toString('ascii', 0, 4), 'DGM1');
  const len = b.readUInt32LE(4), doc = JSON.parse(b.toString('utf8',8,8+len));
  assert.equal(doc.joints.length,18);
  assert.deepEqual(doc.joints.map(x=>x[0]),
    ['hips','spine','head','shR','elR','handR','shL','elL','handL','hipR','kneeR','ankR','hipL','kneeL','ankL','capeA','capeB','capeC']);
  assert.equal(Object.keys(doc.parts).length,11);
  assert.equal(doc.clips === undefined || Object.keys(doc.clips).length===0,true,
    'Uploaded v1 must not claim production-ready animation clips');
  for(const [k,p] of Object.entries(doc.parts)){
    const n=p.n, a=p.i['@b'],j=p.j['@b'],w=p.w['@b'];
    assert.equal(j[1],n*4,k+' joint array');
    assert.equal(w[1],n*4,k+' weight array');
    assert.ok(a[1]>0);
    for(const q of [p.p,p.nr,p.c,p.j,p.w,p.i]){
      const [offset,size]=q['@b'];
      assert.ok(offset>=0 && size>0 && offset+size<=b.length-(8+len), k+' range');
    }
    const weights=b.subarray(8+len+w[0],8+len+w[0]+w[1]);
    for(let i=0;i<weights.length;i+=4)assert.equal(weights[i]+weights[i+1]+weights[i+2]+weights[i+3],255,k+' normalized weights');
  }
  console.log('BH5 legendary Baron optimized DGM parsed from repository: PASS');
}
