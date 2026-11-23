// UI-01: approved Fremen literjon artwork, and only the artwork.
// Inspect the actual compiled PWA / artifact, not a build-source mock.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadGame } from '../lib/load.mjs';

const html = path.resolve(process.argv[2] || 'dist/pwa/index.html');
const root = path.dirname(html);
const dir = path.join(root,'assets','img');
const matches = fs.readdirSync(dir).filter(n => /^water-literjon\.[0-9a-f]{8}\.webp$/.test(n));
assert.equal(matches.length,1,'a single immutable water image must ship');
const image = fs.readFileSync(path.join(dir,matches[0]));
assert.equal(image.toString('ascii',0,4),'RIFF','WebP RIFF header');
assert.equal(image.toString('ascii',8,12),'WEBP','real WebP binary (not base64 text)');
assert.equal(image.toString('ascii',12,16),'VP8X','extended alpha-capable WebP');
assert.ok(image.length > 1000 && image.length < 20000,'optimized mobile asset budget');
assert.ok(image[20] & 0x10,'alpha transparency retained');

const g=loadGame(html);
const water=g.get('ic')('water');
const full='assets/img/'+matches[0];
assert.ok(water.startsWith('<svg class="ico" viewBox="0 0 16 16" aria-hidden="true">'));
assert.ok(water.includes('<image href="'+full+'"'));
assert.match(water,/preserveAspectRatio="xMidYMid meet"/);
assert.ok(!water.includes('onerror=') && !water.includes('onclick='),'no event attributes');
assert.ok(!g.get('ic')('candle').includes('water-literjon'),'only Water icon changed');
assert.equal(g.get('amt')('water',120).includes('data-info="water"'),true,
  'resource click target and save key remain water');
assert.equal(g.get('RES_INFO').water.n,'Вода','resource label unchanged');
assert.equal(g.get('BATTLE_WATER'),6,'battle economy untouched');
assert.equal(g.get('WATER_BASE'),360,'energy model untouched');
console.log('PASS UI-01 literjon:',html,matches[0],image.length+' bytes, transparent WebP, hashed PWA asset, old water ID');
