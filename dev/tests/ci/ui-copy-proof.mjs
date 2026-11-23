// CI-OPT-02: a source file's NAME alone can never authorize skipping tests.
// Exercise both lexical/AST proof and actual git base..head changed-path proof.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { compareCopySource, compareCopyVersion, verifyUiCopy, copyCandidate } from '../../tools/ci-ui-copy.mjs';
import { classify } from '../../tools/ci-policy.mjs';

const tick = String.fromCharCode(96);
const html = x => 'const view = () => ' + tick + '<div><span>' + x + '</span></div>' + tick + ';\n';
const ui = 'dev/src/ui/common.js', econ = 'dev/src/logic/economy.js';
const name = x => 'const RW_NAME = { candle: "' + x + '" };\n';
const accept = (file, a, b) => assert.equal(compareCopySource(a,b,file),true,file+' safe');
const reject = (file, a, b) => assert.equal(compareCopySource(a,b,file),false,file+' unsafe');

assert.equal(compareCopyVersion('{"v":142}\n','{"v":143}\n'),true);
assert.equal(compareCopyVersion('{"v":142}\n','{"v":144}\n'),false);
assert.equal(compareCopyVersion('{"v":142}\n','{"v":143,"persist":false}\n'),false);
assert.equal(copyCandidate(ui),true);
assert.equal(copyCandidate('dev/src/ui/views/squad.js'),true);
assert.equal(copyCandidate('dev/src/logic/battle/engine.js'),false);
accept(ui,html('Свечи'),html('Огни'));
accept(econ,name('Свечей хроник'),name('Огней Хроник'));
accept('dev/src/ui/reward-tiles.js',
  "const RW_TITLE={candle:'Свечи'};\n", "const RW_TITLE={candle:'Огни'};\n");
accept('dev/src/ui/overlays/info.js',
  "const RES_INFO={candle:{n:'Свечи хроник',d:'Энергия хроник'}};\n",
  "const RES_INFO={candle:{n:'Огни Хроник',d:'Энергия Хроник'}};\n");
accept('dev/src/data/campaigns.js',
  "const CAMP_DEF={C:{desc:'Свечи хроник'}};\n",
  "const CAMP_DEF={C:{desc:'Огни Хроник'}};\n");
accept('dev/src/logic/rewards.js',
  'const f=()=>{const un=[];un.push(["energy",'+tick+'Запас Свечей '+ '$'+'{CMAX()}' +tick+']);};\n',
  'const f=()=>{const un=[];un.push(["energy",'+tick+'Запас Огней Хроник '+ '$'+'{CMAX()}' +tick+']);};\n');

reject(ui,html('Свечи'),html('Огни')+'\nconst bonus=1;'); // executable code
reject(ui,html('Свечи'),html('Огни')+'\n// another comment'); // extra source bytes
reject(ui,"const f=()=>"+tick+'<span data-info="candle">Свечи</span>'+tick+';\n',
  "const f=()=>"+tick+'<span data-info="water">Огни</span>'+tick+';\n'); // attribute
reject(ui,'const f=()=>'+tick+'<span>Свечи</span>'+tick+';\n',
  'const f=()=>'+tick+'<span onclick="danger()">Огни</span>'+tick+';\n');
reject(ui,"const x = amount === 'Свечи';\n","const x = amount === 'Огни';\n");
reject(econ,"const key='candle';\n","const key='water';\n");
reject('dev/src/logic/economy.js',
  'const RW_NAME={candle:"Свечи"}; const cost=8;\n',
  'const RW_NAME={candle:"Огни"}; const cost=0;\n');
reject(ui,html('Свечи 8'),html('Огни 0')); // numeric semantics never waived
reject(ui,"const f=()=>"+tick+'<span>Свечи</span>'+tick+';\n',
  "const f=()=>"+tick+'<span>'+ '$'+'{S.solari}' +'</span>'+tick+';\n'); // interpolation
reject(ui,html('Свечи'),html('Огни').replace('const view','const game'));
reject('dev/src/pwa/sw.js',html('Свечи'),html('Огни'));
reject('dev/src/ui/common.js',"const x='Свечи';\n","const x='Огни';\n"); // generic literals not approved
assert.equal(classify([ui]).scope,'full','no unproven filename-only scope');
assert.equal(classify([ui],{verifiedUiCopy:true}).scope,'ui-copy');
assert.deepEqual(classify([ui],{verifiedUiCopy:true}).groups,['build','golden','pwa']);
assert.equal(classify([ui,'dev/version.json'],{verifiedUiCopy:true}).scope,'ui-copy');
assert.equal(classify(['dev/version.json'],{verifiedUiCopy:true}).scope,'release');
assert.equal(classify([ui,'dev/src/render3d/quality.js']).scope,'full',
  'mixed visual/3d changes cannot become ui-copy');

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dune-ui-copy-proof-'));
const git=args=>execFileSync('git',args,{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const put=(file,body)=>{
  const abs=path.join(dir,file);
  fs.mkdirSync(path.dirname(abs),{recursive:true});
  fs.writeFileSync(abs,body);
};
const commit=()=>{
  git(['add','.']);
  git(['commit','-qm','fixture']);
  return git(['rev-parse','HEAD']);
};
try {
  git(['init','-q']);
  git(['config','user.name','UI copy CI']);
  git(['config','user.email','ui-copy@example.invalid']);
  put(ui,html('Свечи'));put(econ,name('Свечей хроник'));
  put('dev/version.json','{"v":142}\n');
  const base=commit();
  put(ui,html('Огни'));put(econ,name('Огней Хроник'));
  put('dev/version.json','{"v":143}\n');
  const valid=commit();
  assert.equal(verifyUiCopy(base,valid,dir),true,'actual safe base..head diff + version bump');
  put('dev/version.json','{"v":144}\n');
  const versionOnly=commit();
  assert.equal(verifyUiCopy(valid,versionOnly,dir),false,'version-only is not UI-copy');
  put('dev/version.json','{"v":143}\n');
  commit();
  put(ui,html('Огни').replace('const view','const battle'));
  const logic=commit();
  assert.equal(verifyUiCopy(valid,logic,dir),false,'executable change fails closed');
  put(ui,html('Огни'));
  put('dev/src/render3d/quality.js','const low=0;\n');
  const mixed=commit();
  assert.equal(verifyUiCopy(valid,mixed,dir),false,'mixed added graphics input fails closed');
  put(ui,html('Огни 0'));
  const number=commit();
  assert.equal(verifyUiCopy(mixed,number,dir),false,'numbers and text are not copy');
} finally {
  fs.rmSync(dir,{recursive:true,force:true});
}
console.log('PASS CI-OPT-02 ui-copy proof: approved DOM/map literals; executable, attributes, numbers, interpolations, mixed paths rejected');
