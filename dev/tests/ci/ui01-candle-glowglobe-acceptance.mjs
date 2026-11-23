// UI-01: the owner-approved Imperial glowglobe replaces only candle artwork.
// Verify actual compiled PWA and standalone HTML; save/economy keys remain stable.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadGame } from '../lib/load.mjs';
const html = path.resolve(process.argv[2] || 'dist/pwa/index.html');
const dir = path.join(path.dirname(html),'assets','img');
const matches = fs.readdirSync(dir).filter(n=>/^candle-glowglobe\.[0-9a-f]{8}\.webp$/.test(n));
assert.equal(matches.length,1,'single immutable glowglobe');
const bytes = fs.readFileSync(path.join(dir,matches[0]));
assert.equal(bytes.toString('ascii',0,4),'RIFF');
assert.equal(bytes.toString('ascii',8,12),'WEBP');
assert.equal(bytes.toString('ascii',12,16),'VP8X');
assert.ok(bytes.length>1500 && bytes.length<7000,'approved tiny artwork');
assert.ok(bytes[20]&0x10,'transparent alpha');
const game=loadGame(html);
const icon=game.get('ic')('candle');
assert.ok(icon.startsWith('<svg class="ico" viewBox="0 0 16 16" aria-hidden="true">'));
assert.ok(icon.includes('<image href="assets/img/'+matches[0]+'"'));
assert.match(icon,/preserveAspectRatio="xMidYMid meet"/);
assert.doesNotMatch(icon,/onerror|onclick|javascript:/i);
assert.ok(!game.get('ic')('water').includes('candle-glowglobe'));
assert.ok(game.get('amt')('candle',120).includes('data-info="candle"'),'unchanged save/resource ID');
assert.equal(game.get('RW_NAME').candle,'Огней Хроник','approved existing name');
assert.equal(game.get('CANDLE_BASE'),288,'candle economy unchanged');
assert.equal(game.get('CANDLE_SEC'),300,'candle regeneration unchanged');
console.log('PASS Chronicle Fires glowglobe:',html,matches[0],bytes.length+' bytes; old candle key');
