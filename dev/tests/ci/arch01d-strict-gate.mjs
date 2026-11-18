// ARCH-01D — permanent zero-debt layer boundary; real strict CLIs + isolated hostile fixtures.
// Runs independently of CI scope/reuse on every PR, push and workflow_dispatch.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyzeSource } from '../../tools/check-arch-imports.mjs';

const DEV=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const real=JSON.parse(fs.readFileSync(path.join(DEV,'tools/arch-import-baseline.json'),'utf8'));
assert.deepEqual(real.legacy,[],
 'ARCH-01D prohibits repopulating the historical exception ledger, even if the edge is absent');
assert.equal(new Set(real.legacy).size,0);

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dunegoh-arch01d-strict-'));
const data=path.join(temp,'src/data/pure.js');
const baseline=path.join(temp,'tools/arch-import-baseline.json');
const mkdir=p=>fs.mkdirSync(path.dirname(p),{recursive:true});
mkdir(data);mkdir(baseline);
for(const dir of ['logic','core'])fs.mkdirSync(path.join(temp,'src',dir),{recursive:true});
const setSource=s=>fs.writeFileSync(data,s);
const setLedger=legacy=>fs.writeFileSync(baseline,JSON.stringify({legacy}));
const cli=(program)=>spawnSync(process.execPath,
 [path.join(DEV,'tools',program),'--strict'],{cwd:temp,encoding:'utf8'});
const bothClean=()=>{
 for(const tool of ['check-deps.mjs','check-arch-imports.mjs']){
  const x=cli(tool);
  assert.equal(x.error,undefined,String(x.error));
  assert.equal(x.status,0,tool+': '+x.stdout+x.stderr);
 }
};
const mustFail=(tool,needle)=>{
 const out=cli(tool);
 assert.equal(out.error,undefined,String(out.error));
 assert.equal(out.status,1,tool+' must fail closed: '+out.stdout+out.stderr);
 assert.match(out.stdout+out.stderr,needle);
};
try{
 setLedger([]);
 setSource("export const safe = 'import ../ui/not-an-import.js';\n");
 bothClean();

 // The old regex checker catches a named illegal import; strict must actually exit nonzero.
 setSource("import { screen } from '../ui/panel.js';\n");
 mustFail('check-deps.mjs',/ui/);
 mustFail('check-arch-imports.mjs',/NEW data\/pure\.js/);

 // AST validator closes the regex checker blind spots (side-effect/multiline/re-export/dynamic).
 const cases=[
  ["import '../assets/models.js';",/data\/pure\.js -> assets\/models\.js/],
  ["import {\n screen,\n} from '../ui/panel.js';",/data\/pure\.js -> ui\/panel\.js/],
  ["export * from '../logic/battle/ai.js';",/data\/pure\.js -> logic\/battle\/ai\.js/],
  ["await import('../core/state.js');",/data\/pure\.js -> core\/state\.js/],
  ["await import(runtimePath);",/data\/pure\.js -> <dynamic>/],
  ["import * as BAB from '@babylonjs/core';",/data\/pure\.js -> @babylonjs\/core/],
 ];
 for(const [source,expected] of cases){
  setSource(source);
  mustFail('check-arch-imports.mjs',expected);
  assert.ok(analyzeSource(source,'data/pure.js').length>0,'AST must detect forbidden code');
 }

 // Even a forged historical baseline can never grandfather an illegal edge under --strict.
 setSource("import '../ui/panel.js';\n");
 setLedger(['data/pure.js -> ui/panel.js']);
 mustFail('check-arch-imports.mjs',/strict: all forbidden imports/);
 setSource("export const safe=1;\n");
 mustFail('check-arch-imports.mjs',/STALE BASELINE/);
 setLedger([]);

 // DOM/Babylon and inline HTML are still checked independently of the import AST.
 for(const source of ["document.body;\n","BABYLON.Engine;\n","const markup='<div>bad</div>';\n"]){
  setSource(source);
  mustFail('check-deps.mjs',/DOM\/Babylon|HTML в строке/);
 }

 // Allowed routes and core startup exception must not be rejected.
 setSource("import '../data/chars.js'; export const safe=1;\n");
 bothClean();
 fs.writeFileSync(path.join(temp,'src/core/boot.js'),"import '../ui/router.js';\n");
 bothClean();
 fs.writeFileSync(path.join(temp,'src/core/extra.js'),"import '../ui/router.js';\n");
 mustFail('check-arch-imports.mjs',/NEW core\/extra\.js/);
}finally{
 fs.rmSync(temp,{recursive:true,force:true});
}
console.log('ARCH-01D strict boundary: PASS — zero exception ledger; both strict CLIs fail closed on hostile AST, legacy checks, and rebaselining; clean routes and core boot exception preserved.');
