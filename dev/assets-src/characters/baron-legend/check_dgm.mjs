import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const src=fs.readFileSync(new URL('../dune/dev/src/assets/models.js',import.meta.url),'utf8');
const code=src.slice(src.indexOf('function parseDgm(b) {'),src.indexOf('// Фаза 5, шаг 5: KTX2'));
const parse=vm.runInNewContext(code+';parseDgm',{TextDecoder,DataView,Uint8Array,assetUrl:()=>{throw Error('unexpected external texture')}});
const bytes=new Uint8Array(fs.readFileSync(new URL('./baron-legend-mobile.dgm',import.meta.url)));const D=parse(bytes);assert.equal(D.joints.length,18);assert.equal(Object.keys(D.parts).length,11);
let vertices=0,triangles=0;
for(const P of Object.values(D.parts)){
 assert.equal(P.p.length,P.n*6);assert.equal(P.nr.length,P.n*3);assert.equal(P.c.length,P.n*3);assert.equal(P.j.length,P.n*4);assert.equal(P.w.length,P.n*4);
 for(let i=0;i<P.n;i++){let sum=0;for(let k=0;k<4;k++){assert(P.j[i*4+k]<18);sum+=P.w[i*4+k]}assert.equal(sum,255)}
 const view=new DataView(P.i.buffer,P.i.byteOffset,P.i.byteLength);for(let i=0;i<P.i.length;i+=2)assert(view.getUint16(i,true)<P.n);
 vertices+=P.n;triangles+=P.i.length/6;
}
const report={actual_project_parseDgm:true,byte_ranges_and_indices:true,normalized_skin_weights:true,joints:18,parts:11,vertices,triangles,bytes:bytes.length,webgl_and_iphone_tested:false};
fs.writeFileSync(new URL('./dgm_validation.json',import.meta.url),JSON.stringify(report,null,2));console.log(report);
