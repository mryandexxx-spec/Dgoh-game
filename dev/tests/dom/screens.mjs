// DOM-снимки экранов (REFACTOR_PLAN §6.4): Playwright проходит по всем view и основным оверлеям,
// снимает innerHTML (#view, #overlay, #overlay2, header) без канвасов.
//   node tests/dom/screens.mjs <game.html> [--update] [--babylon path/babylon.min.js] [--shots dir]
// Режим: WebGL отключён (--disable-webgl) → HAS3D = false, 2D-фоллбек; Babylon подгружается локально (без сети),
// т.к. скрипт №1 обращается к BABYLON на верхнем уровне. Часы Playwright зафиксированы, Math.random сидирован,
// сохранение — tests/fixtures/saves/03-late.json (всё открыто) и «без сохранения» для стартовых экранов.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FIXED_NOW } from '../lib/load.mjs';
import { writeGolden, compareGolden, argv } from '../lib/golden.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const [html, ...rest] = argv();
const opt = k => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : null; };
const babylon = opt('--babylon') || [path.join(path.dirname(path.resolve(html)), 'babylon.min.js'), path.join(HERE, '..', 'vendor', 'babylon.min.js')].find(f => fs.existsSync(f));
// фаза 4: babylon.min.js нужен только старым сборкам (до чанка babylon3d.js); новые без WebGL Babylon не грузят
const shots = opt('--shots');
const LATE = fs.readFileSync(path.join(HERE, '..', 'fixtures', 'saves', '03-late.json'), 'utf8');

// [имя, сохранение, код шага]; код выполняется в странице после start(), затем часы продвигаются на 1,5 с
const V = v => `closeInfo(true); closeOverlay(); view = '${v}'; render();`;
const SCREENS = [
  ['fresh:lobby', null, V('lobby')],
  ['fresh:camp', null, V('camp')],
  ['fresh:squad', null, V('squad')],
  ...['lobby', 'daily', 'squad', 'raid', 'legend', 'rules', 'trials', 'feats', 'conq'].map(v => ['view:' + v, LATE, V(v)]),
  ...['L', 'D', 'C'].map(t => ['camp:' + t, LATE, `S.campTab = '${t}'; campSel = null; ${V('camp')}`]),
  ['camp:L:node5', LATE, `S.campTab = 'L'; ${V('camp')} campSel = campNodes('L')[5]; render();`],
  ...['post', 'sietch', 'chron', 'ring', 'jihad'].map(t => ['shop:' + t, LATE, `S.shopTab = '${t}'; ${V('shop')}`]),
  ...['paul', 'duncan', 'baron', 'erasmus'].map(id => ['detail:' + id, LATE, `${V('squad')} openDetail('${id}');`]),
  ['item:paul:0', LATE, `${V('squad')} openDetail('paul'); openItem('paul', 0);`],
  ...['bio:paul', 'shard:chani', 'frag:belt5', 'need:water:6', 'sol', 'cry'].map(k => ['info:' + k, LATE, `${V('camp')} openInfo('${k}');`]),
  ['squadsel:camp0', LATE, `${V('camp')} openSquadSel('camp', 0);`],
  ['sim:node3', LATE, `${V('camp')} openSim(3);`],
  ['conq:normal:map', LATE, `cq().diff = 'normal'; CQ_MEMO_CLR(); ${V('conq')}`],
  ['conq:normal:node', LATE, `cq().diff = 'normal'; CQ_MEMO_CLR(); ${V('conq')} cqDetail(cqNode('0-0-0'));`],
  ['calendar', LATE, `${V('lobby')} openCalendar();`],
  ['profile', LATE, `${V('lobby')} openProfile();`],
  ['battle-settings', LATE, `${V('lobby')} openBattleSettings();`],
  ['battle:start', LATE, `${V('camp')} startBattle(0);`, 0],
  ['battle:turns', LATE, `S.skipDlg = true; ${V('camp')} startBattle(1); BT.auto = true;`, 6000],
];

const browser = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis', '--font-render-hinting=none'] });
const screens = [];
if (shots) fs.mkdirSync(shots, { recursive: true });
for (const [name, save, code, wait = 1500] of SCREENS) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'ru-RU', timezoneId: 'Europe/Moscow', reducedMotion: 'reduce' });
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (babylon && /babylon(\.min)?\.js$/.test(u)) return r.fulfill({ path: babylon, contentType: 'text/javascript' });
    if (u.startsWith('file:') || u.startsWith('data:') || u.startsWith('blob:')) return r.continue();
    return r.abort();
  });
  const page = await ctx.newPage();
  await page.clock.install({ time: FIXED_NOW - 60000 });
  await page.clock.pauseAt(FIXED_NOW);                // время идёт только через runFor → бой с одинаковым seed
  await page.addInitScript(([save]) => {
    let a = 12345; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    try { localStorage.clear(); if (save) localStorage.setItem('dune-goh-v1', save); localStorage.setItem('dune-cine-off', 'true'); } catch (e) {}
    try { navigator.serviceWorker && Object.defineProperty(navigator, 'serviceWorker', { value: undefined }); } catch (e) {}
  }, [save]);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message).slice(0, 200)));
  await page.goto(pathToFileURL(path.resolve(html)).href, { waitUntil: 'load' });
  await page.clock.runFor(3000);                       // сплэш, календарь входа и прочие отложенные старты
  try { await page.evaluate(c => { (0, eval)(c); }, code); } catch (e) { errors.push('step: ' + String(e.message).slice(0, 200)); }
  if (wait) await page.clock.runFor(wait);
  const snap = await page.evaluate(() => {
    const clean = el => {
      if (!el) return null;
      const c = el.cloneNode(true);
      c.querySelectorAll('canvas').forEach(x => x.replaceWith(document.createComment('canvas')));
      return c.innerHTML.replace(/blob:[^"')\s]+/g, 'blob:*');
    };
    return { header: clean(document.querySelector('header')), view: clean(document.getElementById('view')), overlay: clean(document.getElementById('overlay')), overlay2: clean(document.getElementById('overlay2')), bodyClass: document.body.className };
  });
  if (shots) await page.screenshot({ path: path.join(shots, name.replace(/[:]/g, '_') + '.png') });
  // тела <svg> → короткий хэш (портреты/иконки дают ~90% объёма; любое изменение внутри всё равно ловится)
  for (const k of ['header', 'view', 'overlay', 'overlay2']) if (snap[k]) snap[k] = snap[k].replace(/(<svg\b[^>]*>)([\s\S]*?)(<\/svg>)/g, (m, a, b, c) => a + '#' + crypto.createHash('sha1').update(b).digest('hex').slice(0, 10) + c);
  screens.push({ name, errors, ...snap });
  await ctx.close();
  process.stdout.write('.');
}
await browser.close();
console.log('\nэкранов:', screens.length, 'с ошибками:', screens.filter(s => s.errors.length).map(s => s.name + ' → ' + s.errors[0]).join(' | ') || 'нет');
const out = { n: screens.length, screens };
if (rest.includes('--update')) writeGolden('screens', out); else process.exit(compareGolden('screens', out) ? 0 : 1);
