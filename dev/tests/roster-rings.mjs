// Регрессии колец ростера: проверка настоящей разметки из обеих сборок, без DOM и WebGL.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadGame } from './lib/load.mjs';

const htmlPath = process.argv[2];
if (!htmlPath) { console.error('node tests/roster-rings.mjs <game.html>'); process.exit(2); }
const game = loadGame(htmlPath);
const ptRound = game.get('ptRound');
const chars = game.get('CH');
const tiers = game.get('TIER_COL');
const progress = (overrides = {}) => ({ stars: 7, lvl: 73, gear: 4, relic: 0, shards: 0, ...overrides });
const classes = html => new Set((html.match(/<span class="(hpt[^"]*)"/) || [,''])[1].split(' '));
const has = (html, name) => classes(html).has(name);

const base = ptRound(chars.duncan, progress());
assert.ok(![...classes(base)].some(c => c.startsWith('dp-')), 'Без ДП свечение не включается');
assert.match(base, new RegExp('--rim:' + tiers[4] + '(?=[;" ])'), 'Обод снаряжения остаётся независимым');

const light = ptRound(chars.duncan, progress({ relic: 1 }));
assert.ok(has(light, 'dp-light'), 'Светлый герой с ДП1 получает синюю рамку');
assert.match(light, /class="mem">1</, 'Бейдж ДП сохранён');
assert.match(light, new RegExp('--rim:' + tiers[4] + '(?=[;" ])'), 'Цвет снаряжения не заменён рамкой ДП');

const dark = ptRound(chars.piter, progress({ relic: 3 }));
assert.ok(has(dark, 'dp-dark'), 'Тёмный герой с ДП получает красную рамку');
assert.ok(!has(dark, 'legend'), 'Обычный тёмный герой не получает золото');

const machine = ptRound(chars.erasmus, progress({ relic: 7 }));
assert.ok(has(machine, 'dp-mach'), 'Машина с ДП получает отдельное нейтральное свечение');
assert.ok(has(machine, 'legend'), 'Легенда-машина сохраняет золотой контур');

const legend = ptRound(chars.muaddib, progress({ relic: 2 }));
assert.ok(has(legend, 'dp-light') && has(legend, 'legend'),
  'Легенда с ДП одновременно получает цвет стороны и золотой контур');
assert.ok(has(ptRound(chars.muaddib, progress()), 'legend'),
  'Золото легенды не зависит от наличия ДП');

const locked = ptRound(chars.muaddib, progress({ stars: 0, relic: 0 }));
assert.ok(has(locked, 'locked') && has(locked, 'legend'), 'Легендарность закрытого героя видна');
assert.ok(![...classes(locked)].some(c => c.startsWith('dp-')), 'Закрытый герой без ДП не светится');

const css = readFileSync(new URL('../src/styles/roster.css', import.meta.url), 'utf8');
for (const selector of ['.hpt.dp-light', '.hpt.dp-dark', '.hpt.dp-mach',
  '.hpt[class*="dp-"]::before', '.hpt.legend::after', '.hpt.legend.locked::after']) {
  assert.ok(css.includes(selector), 'Нет CSS-слоя: ' + selector);
}
assert.ok(!css.includes('.hpt.legend .ring {'), 'Легенда не должна перекрашивать кольцо стороны');
assert.ok(!css.includes('@keyframes'), 'Кольца не должны выполнять постоянные анимации');
console.log('Roster DP side halos, gear rims and separate legendary gold crowns: PASS');
