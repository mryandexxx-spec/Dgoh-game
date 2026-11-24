// UI-03d: focused presentation-only checks, independent of gameplay runtime.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { choamSupplyArt, choamMarkArt, dailyRewardIcon } from '../../src/ui/calendar-icons.js';

const source = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const daily = source('../../src/ui/views/daily.js');
const calendar = source('../../src/ui/overlays/calendar.js');

for (const opened of [false, true]) {
  const art = choamSupplyArt(opened);
  assert.match(art, /viewBox="0 0 300 166"/);
  assert.match(art, opened ? /Открытый контейнер/ : /Закрытый контейнер/);
  assert.match(art, /coam-lamp/);
  assert.match(art, /<\/svg>$/);
}
assert.match(choamMarkArt(), /ui03-choam-mark/);
assert.match(daily, /Имперская поставка/);
assert.match(daily, /Открыть поставку/);
assert.match(daily, /rewardsHtml\(q\.rw, \{ art: true/);
assert.match(calendar, /choamMarkArt\(\)/);
for (const key of ['sol', 'cry', 'seal', 'folio', 'water', 'pl', 'rid', 'teeth']) {
  const svg = dailyRewardIcon(key, 'test-1');
  assert.match(svg, new RegExp('u03-chip-' + key + '-test-1'));
  assert.match(svg, /ui03-daily-loot-svg/);
}
assert.notEqual(dailyRewardIcon('sol', 'row-a'), dailyRewardIcon('sol', 'row-b'));
assert.equal(dailyRewardIcon('unknown', 'row'), '');
console.log('UI-03d: OK, two supply states, header icon, illustrated reward keys');

// UI-03e: photo assets are real compressed WebPs, not vector stand-ins.
for (const state of ['closed','opened']) {
  const payload = fs.readFileSync(new URL('../../assets/img/choam-supply-' + state + '.webp', import.meta.url));
  assert.equal(payload.toString('ascii', 0, 4), 'RIFF');
  assert.equal(payload.toString('ascii', 8, 12), 'WEBP');
  assert.ok(payload.length > 5000 && payload.length < 55000, state + ' should be detailed but phone-sized');
}
assert.match(daily, /assetUrl\('img\/choam-supply-/);
assert.match(daily, /photo\.addEventListener\('load'/);
assert.match(daily, /ui03-choam-picture/);
console.log('UI-03e: photoreal WebP art present with SVG failure fallback');
