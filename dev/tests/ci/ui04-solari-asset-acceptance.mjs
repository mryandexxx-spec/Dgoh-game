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
assert.match(g.get('calendarRewardIcon')('folio',7),/<image href="assets\/ui\/shop\/folio\.[0-9a-f]{8}\.png"/,'folio now uses accepted shop art');
assert.ok(g.get('ic')('water').includes('water-literjon'),'other currency icon preserved');
console.log('PASS UI-04:',html,matches[0],bytes.length,'bytes; all Solari surfaces consistent');

// GLOBAL-01: check exact canonical immutable URL and original bytes in both builds.
const sharedArt={
  "pl": "ui/shop/pl.png",
  "folio": "ui/shop/folio.png",
  "seal": "ui/shop/seal.png",
  "blood_echo": "ui/shop/blood_echo.png",
  "ix_plate": "ui/shop/postrelease/ix_plate.webp",
  "holtz_conductor": "ui/shop/postrelease/holtz_conductor.webp",
  "wol": "ui/shop/postrelease/wol.webp",
  "legacy_thread": "ui/shop/postrelease/legacy_thread.webp",
  "age_resonance": "ui/shop/postrelease/age_resonance.webp",
  "teeth": "ui/shop/postrelease/teeth.webp",
  "rid": "ui/shop/postrelease/rid.webp",
  "wring": "ui/shop/postrelease/wring.webp",
  "jt": "ui/shop/postrelease/jt.webp",
  "frag": "ui/shop/postrelease/frag.webp",
  "water": "img/water-literjon.webp",
  "candle": "img/candle-glowglobe.webp"
};
for(const [key,original] of Object.entries(sharedArt)){
  const folder=path.join(path.dirname(html),'assets',path.dirname(original));
  const ext=path.extname(original),stem=path.basename(original,ext);
  const names=fs.readdirSync(folder).filter(n=>n.startsWith(stem+'.')&&n.endsWith(ext)&&n.length===stem.length+9+ext.length);
  assert.equal(names.length,1,key+' unique shipped asset');
  const expected='assets/'+path.dirname(original)+'/'+names[0];
  const actual=fs.readFileSync(path.join(folder,names[0]));
  const sourceBytes=fs.readFileSync(new URL('../../assets/'+original,import.meta.url));
  assert.deepEqual(actual,sourceBytes,key+' exact accepted bytes');
  for(const [surface,markup] of [
    ['icon',g.get('ic')(key)],['amount',g.get('amt')(key,13)],
    ['calendar',g.get('calendarRewardIcon')(key,7)],['daily',g.get('dailyRewardIcon')(key,'test')],
    ['reward',g.get('rwTile')(key,13)],['daily tile',g.get('rwTile')(key,13,null,{art:true})]
  ]){
    assert.ok(markup.includes('<image href="'+expected+'"'),key+' '+surface+' uses approved asset');
    assert.doesNotMatch(markup,/__GFX_RES_|<path |<circle /,key+' '+surface+' no old glyph');
  }
  assert.match(g.get('amt')(key,13),new RegExp('data-info="'+key+'"'));
}
assert.match(g.get('ic')('core'),/<path /,'unapproved resource fallback retained');
console.log('PASS GLOBAL-01: 16 shared resources × 6 rendering surfaces, original asset bytes');
