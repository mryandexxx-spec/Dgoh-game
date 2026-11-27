// UI-05: identical, immutable Soostone art in every UI rendering path.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadGame } from '../lib/load.mjs';
const html=path.resolve(process.argv[2]||'dist/pwa/index.html');
const dir=path.join(path.dirname(html),'assets','img');
const matches=fs.readdirSync(dir).filter(n=>/^soostone\.[0-9a-f]{8}\.webp$/.test(n));
assert.equal(matches.length,1,'exactly one hashed Soostone asset');
const bytes=fs.readFileSync(path.join(dir,matches[0]));
assert.equal(bytes.toString('ascii',0,4),'RIFF');
assert.equal(bytes.toString('ascii',8,12),'WEBP');
assert.equal(bytes.toString('ascii',12,16),'VP8X');
assert.ok((bytes[20]&0x10)!==0,'transparent WebP');
assert.equal(1+bytes.readUIntLE(24,3),160);
assert.equal(1+bytes.readUIntLE(27,3),160);
assert.ok(bytes.length<16000,'mobile icon budget');
assert.equal(crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'95edbe868593e592207516a0f102d6640acd8b08','exact approved art');
const url='assets/img/'+matches[0],g=loadGame(html);
const surfaces=[
 ['HUD',g.get('ic')('cry')],
 ['calendar',g.get('calendarRewardIcon')('cry',7)],
 ['daily',g.get('dailyRewardIcon')('cry','test')],
 ['reward',g.get('rwTile')('cry',50)],
 ['daily reward',g.get('rwTile')('cry',50,null,{art:true,artSeed:'test'})],
 ['amount',g.get('amt')('cry',50)]
];
for(const [where,markup] of surfaces){
 assert.ok(markup.includes('<image href="'+url+'"'),where+' displays exact approved artwork');
 assert.doesNotMatch(markup,/__SOOSTONE_ICON_URL__|<path |<circle /,where+' no old glyph');
}
assert.match(surfaces[1][1],/data-soostone-art="u03-cry-7"/);
assert.match(surfaces[2][1],/ui03-daily-loot-svg/);
assert.ok(g.get('dailyRewardIcon')('cry','row-a')!==g.get('dailyRewardIcon')('cry','row-b'));
assert.equal(g.get('RW_TITLE').cry,'Камни су');
assert.equal(g.get('RW_NAME').cry,'камней су');
assert.equal(g.get('RES_INFO').cry.n,'Камни су');
assert.equal(g.get('RES_INFO').rid.n,'Ридулианские кристаллы');
assert.equal(g.get('RW_NAME').rid,'ридулианских кристаллов');
assert.match(surfaces[3][1],/Камни су/);
assert.match(surfaces[4][1],/Камни су/);
assert.ok(g.get('ic')('sol').includes('solari-stack'));
assert.match(g.get('ic')('rid'),/<image href="assets\/ui\/shop\/postrelease\/rid\.[0-9a-f]{8}\.webp"/);
assert.match(g.get('calendarRewardIcon')('folio',7),/<image href="assets\/ui\/shop\/folio\.[0-9a-f]{8}\.png"/);
console.log('PASS UI-05:',html,matches[0],bytes.length,'bytes; stable cry key, identical artwork and new name');
