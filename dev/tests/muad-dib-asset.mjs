// Checks the staged Muad'Dib model independently of the Babylon renderer.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve(import.meta.dirname, '..');
const model = path.join(root, 'assets/models/muad-dib-legend.dgm');
const texture = path.join(root, 'assets/tex/muad-dib-0.jpg');
assert.ok(fs.existsSync(model), 'missing Muad Dib DGM');
assert.ok(fs.existsSync(texture), 'missing Muad Dib texture');
const bytes = fs.readFileSync(model);
assert.equal(bytes.toString('ascii', 0, 4), 'DGM1');
const jsonLength = bytes.readUInt32LE(4), offset = jsonLength + 8;
assert.ok(offset < bytes.length);
const d = JSON.parse(bytes.toString('utf8', 8, offset));
assert.equal(d.v, 5);
assert.equal(d.jointFormat, 'local-trs');
assert.equal(d.joints.length, 66);
assert.equal(Object.keys(d.clips).length, 8);
assert.ok(d.clips.Idle_11 && d.clips.Right_Hand_Sword_Slash);
const refs = [];
function walk(x) { if (!x || typeof x !== 'object') return; if (x['@b']) refs.push(x['@b']); else for (const y of Object.values(x)) walk(y); }
walk(d);
for(const [begin,length] of refs){assert.ok(Number.isInteger(begin)&&Number.isInteger(length)&&begin>=0&&length>=0&&offset+begin+length<=bytes.length);}
for (const clip of Object.values(d.clips)) {
  assert.ok(clip.duration>0);
  for(const t of clip.tracks){ assert.ok(['rotation','translation','scale'].includes(t.path)); assert.ok(t.componentCount===(t.path==='rotation'?4:3));
    assert.equal(t.times['@b'][1]%4,0); assert.equal(t.values['@b'][1],(t.times['@b'][1]/4)*t.componentCount*4);
  }
}
for(const p of Object.values(d.parts)) {assert.ok(p.n>0);assert.equal(p.p['@b'][1],p.n*6);assert.equal(p.j['@b'][1],p.n*4);assert.equal(p.w['@b'][1],p.n*4);}
console.log('Muad Dib DGM v5: valid structural checks', {bytes:bytes.length, bones:d.joints.length, clips:Object.keys(d.clips).length});
