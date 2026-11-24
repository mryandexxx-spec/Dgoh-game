// UI-04: the approved Solari stack must render identically in every UI system.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadGame } from '../lib/load.mjs';
const html=path.resolve(process.argv[2]||'dist/pwa/index.html');
const dir=path.join(path.dirname(html),'assets','img');
const matches=fs.readdirSync(dir).filter(n=>/^solari-stack\.[0-9a-f]{8}\.webp$/.test(n));
assert.equal(matches.length,1,'one hashed Solari artwork per build');
const bytes=fs.readFileSync(path.join(dir,matches[0]));
assert.equal(bytes.toString('ascii',0,4),'RIFF');
assert.equal(bytes.toString('ascii',8,12),'WEBP');
assert.equal(bytes.toString('ascii',12,16),'VP8X');
assert.ok((bytes[20]&0x10)!==0,'transparent WebP');
assert.ok(bytes.length>=3000&&bytes.length<16000,'mobile icon budget');
const url='assets/img/'+matches[0],g=loadGame(html);
const surfaces=[
  ['HUD',g.get('ic')('sol')],
  ['calendar',g.get('calendarRewardIcon')('sol',7)],
  ['daily',g.get('dailyRewardIcon')('sol','test')],
  ['reward',g.get('rwTile')('sol',3000)],
  ['daily reward',g.get('rwTile')('sol',3000,null,{art:true,artSeed:'test'})],
  ['amount',g.get('amt')('sol',3000)]
];
for(const [where,markup] of surfaces){
  assert.ok(markup.includes('<image href="'+url+'"'),where+' displays exact approved artwork');
  assert.doesNotMatch(markup,/__SOL_ICON_URL__|<circle |<path /,where+' must not use old coin');
}
assert.match(surfaces[0][1],/^<svg class="ico" viewBox="0 0 16 16"/);
assert.match(surfaces[1][1],/data-solari-art="u03-sol-7"/);
assert.match(surfaces[2][1],/ui03-daily-loot-svg/);
assert.equal(g.get('dailyRewardIcon')('sol','row-a')===g.get('dailyRewardIcon')('sol','row-b'),false,'distinct slots');
assert.ok(g.get('calendarRewardIcon')('cry',7).includes('<path '),'other calendar art preserved');
assert.ok(g.get('ic')('water').includes('water-literjon'),'other currency icon preserved');
console.log('PASS UI-04:',html,matches[0],bytes.length,'bytes; all Solari surfaces consistent');
