// ARCH-01C3a2: exact pre/post SVG and HTML avatar proof from real PWA and artifact.
// Measure a SHA on untouched C3a1 source first; hard-pin it BEFORE editing production.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadGame } from './lib/load.mjs';

const file=process.argv[2]||'dist/pwa/index.html';
const game=loadGame(file);
const run=x=>game.run(x);
const digest=x=>createHash('sha256').update(x,'utf8').digest('hex');

const before=JSON.parse(run('JSON.stringify({asset:WORM_IMG.ava,image:EMBLEMS.worm.svg,bg:EMBLEMS.worm.bg})'));
assert.ok(before.asset && typeof before.asset==='string','worm asset URL must be available before UI start');
assert.equal(before.image,
  '<image href="'+before.asset+'" x="1" y="1" width="38" height="38"/>',
  'SVG must point to original asset-map URL, with exact coordinates');
assert.deepEqual(before.bg,['#a8784a','#2a1608'],
  'worm emblem must not fall back to procedural colors');

const htmls=JSON.parse(run("JSON.stringify([avatarHtml('emb:worm','basic',22),avatarHtml('emb:worm','basic',44),avatarHtml('emb:worm','worm',44),avatarHtml('emb:worm','gold',84),avatarHtml('emb:hawk','basic',44)])"));
assert.equal(htmls.length,5);
assert.ok(htmls.every(x=>typeof x==='string' && x.length>40));
assert.ok(htmls[1].includes(before.image),'real avatar HTML must contain the image element');
assert.ok(htmls[2].includes('fr-worm'),'worm frame CSS class must be untouched');

run('set_S(newSave()); metaFill(S)');
const profile=run('profileChip()');
const feat=run("cosHtml({title:'novice',ava:'worm',frame:'worm'})");
assert.ok(profile && typeof profile==='string');
assert.ok(feat && typeof feat==='string' && feat.includes(before.image));
const payload=JSON.stringify({before,htmls,profile,feat});
const current=digest(payload);
// Immutable baseline from unchanged stacked C3a1 PWA+artifact, CI #43974108838.
const expected='737995ab60dc152a2b39a4fa6002114aef1b45c9cc123396edb0bd491f52cde2';
if(expected) assert.equal(current,expected,'worm avatar HTML/profiles differ from unchanged C3a1 baseline');
console.log('ARCH-01C3a2 worm avatar HTML snapshot: '+current+
 '; '+file+'; '+(expected?'strict pinned PASS':'read-only baseline measurement'));
