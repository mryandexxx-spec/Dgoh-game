// DOM-снимки экранов (REFACTOR_PLAN §6.4): Playwright проходит по всем view и основным оверлеям,
// снимает innerHTML (#view, #overlay, #overlay2, header) без канвасов.
//   node tests/dom/screens.mjs <game.html> [--update] [--shots dir]
// Режим: WebGL отключён (--disable-webgl) → HAS3D = false, 2D-фоллбек; Babylon подгружается локально (без сети),
// т.к. скрипт №1 обращается к BABYLON на верхнем уровне. Часы Playwright зафиксированы, Math.random сидирован,
// сохранение — tests/fixtures/saves/03-late.json (всё открыто) и «без сохранения» для стартовых экранов.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FIXED_NOW } from '../lib/load.mjs';
import { writeGolden, compareGolden, readGolden, argv } from '../lib/golden.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const [html, ...rest] = argv();
const opt = k => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : null; };
// фаза 4: Babylon в DOM-тестах не нужен — без WebGL чанк babylon3d.js не грузится
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
  ['ix:work', LATE, V('recycler')],
  ['ix:rates', LATE, `${V('recycler')} recyclerClick({ ixtab: 'rates' });`],
  ['ix:stock', LATE, `${V('recycler')} recyclerClick({ ixtab: 'stock' });`],
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
      return c.innerHTML.replace(/blob:[^"')\s]+/g, 'blob:*').replace(/(<div class="appver"[^>]*>)[^<]*/g, '$1v0');   // номер версии меняется с каждой выкаткой
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
// v86: the approved legend requirements panel and its lobby availability badge intentionally differ
// from the pre-v86 golden. Keep the baseline strict for every unrelated view and element.
function normalizeApprovedV86(s) {
  const copy = structuredClone(s);
  for (const screen of copy.screens) {
    if (screen.view && screen.name === 'view:legend') {
      screen.view = screen.view
        .replace(/<p class="sub">[^<]*<\/p>(?=\s*<div class="grid2">)/, '<p class="sub">[approved legend introduction]</p>')
        .replace(/<div class="panel"><h3>Герои пути[\s\S]*?(?=\s*<p class="chap">)/, '<div class="panel">[approved eleven-hero requirements]</div></div>')
        .replace(/<span class="[^"]*">7★ · [^<]*<\/span>/g, '<span class="approved-legend-gate">[approved tier requirement]</span>')
        .replace(/(<button class="btn go" data-jgo="\d+")(?: disabled="")?/g, '$1');
    }
    if (screen.view && (screen.name === 'view:lobby' || screen.name === 'fresh:lobby')) {
      screen.view = screen.view.replace(/<button class="spot (?:hot)?[^>]*data-v="legend"[^>]*>[\s\S]*?<\/button>/g,
        '<button class="spot approved-legend-badge">[approved legend unlock indicator]</button>');
    }
    // The same lobby tile is present on several other UI snapshots.
    if (screen.view && screen.view.includes('data-v="legend"')) {
      screen.view = screen.view.replace(/<button class="spot (?:hot)?[^>]*data-v="legend"[^>]*>[\s\S]*?<\/button>/g,
        '<button class="spot approved-legend-badge">[approved legend unlock indicator]</button>');
    }
  }
  return copy;
}
// BH4: compare every DOM field to the established golden while allowing only
// the approved display-name change and the corresponding position of Baron's
// card among otherwise unchanged roster cards.
function normalizeApprovedBH4(s) {
  const copy = structuredClone(s);
  const card = /<button class="hc[^"]*"[^>]*data-open="[^"]+"[^>]*>[^]*?<\/button>/g;
  for (const screen of copy.screens) for (const key of ['header', 'view', 'overlay', 'overlay2']) {
    if (typeof screen[key] !== 'string') continue;
    screen[key] = screen[key]
      .replaceAll('Барон Владимир Харконнен', '[BH4 approved Baron name]')
      .replaceAll('Молодой Барон Владимир', '[BH4 approved Baron name]');
    // Only move the Baron card, never reorder unrelated heroes. Preserves
    // complete HTML of every card, gear, stars, badges and action controls.
    screen[key] = screen[key].replace(/(?:<button class="hc[^"]*"[^>]*data-open="[^"]+"[^>]*>[^]*?<\/button>)+/g, run => {
      const cards = run.match(card);
      if (!cards || cards.length < 2) return run;
      const baron = cards.filter(v => /data-open="baron"/.test(v));
      return baron.length ? cards.filter(v => !/data-open="baron"/.test(v)).concat(baron).join('') : run;
    });
  }
  return copy;
}
// BH9.7 approved registration of two ordinary heroes and the shared story entry.
// Compare old screens against the same legacy DOM after removing ONLY these
// approved additions. All unrelated text, controls, card bodies and fields
// remain subject to the original exact golden comparison.
function normalizeApprovedBH97(s) {
  const copy = structuredClone(s);
  const rosterScreens = new Set([
    'fresh:squad','view:squad','detail:paul','detail:duncan',
    'detail:baron','detail:erasmus','item:paul:0'
  ]);
  for (const screen of copy.screens) {
    if (screen.name === 'view:legend' && typeof screen.view === 'string') {
      const entry = '<div style="margin:6px 0;display:flex;gap:7px;flex-wrap:wrap"><button type="button" class="btn" data-v="baron_journey">Восхождение Барона · 10 требований</button><button type="button" class="btn" data-v="story_events">Сюжетные события · Марго и Юэ</button></div>';
      assert.ok(screen.view.includes(entry), 'BH9.7 story entry in approved location');
      screen.view = screen.view.replace(entry + '\n  ', '');
    }
    if (rosterScreens.has(screen.name) && typeof screen.view === 'string') {
      let v = screen.view;
      const cards = /<button class="hc[^"]*"[^>]*data-open="(baron_legend|margot|yue)"[^>]*>[\s\S]*?<\/button>/g;
      const found = [...v.matchAll(cards)].map(m => m[1]).sort();
      assert.deepEqual(found, ['baron_legend','margot','yue'], screen.name + ': three approved new hero cards');
      v = v.replace(cards, '');
      v = v.replace(/(мощь · открыто \d+\/)(\d+)/, (_m, a, n) => a + (Number(n) - 3));
      const expectedAdditions = { rf: { all:3, light:1, dark:2, atr:1, bg:1, cor:1, hark:1 }, rr: { all:3, sup:2, heal:1 } };
      v = v.replace(/(<button class="ropt" data-(rf|rr)="([^"]+)" aria-pressed="[^"]+">[\s\S]*?<small>)(\d+)(<\/small><\/button>)/g,
        (match, before, kind, key, number, after) => {
          const delta = expectedAdditions[kind][key] || 0;
          assert.ok(Number(number) >= delta, screen.name + ': nonnegative approved filter count');
          return before + (Number(number) - delta) + after;
        });
      v = v.replace(/(<span id="rdiv-n">)(\d+)(<\/span>)/, (_m, before, count, after) => {
        assert.ok(Number(count) >= 3, screen.name + ': two newly locked heroes');
        return before + (Number(count) - 3) + after;
      });
      // Other roster totals (filter counts and locked divider) are checked
      // separately after the first full diff; never replace arbitrary digits.
      if (screen.name !== 'fresh:squad') {
        // The late fixture had 24/24 heroes unlocked; the two new 0-star
        // heroes alone make the locked divider visible. After excluding them
        // from the legacy comparison it must return to its hidden state.
        assert.ok(v.includes('<div class="rdiv" id="rdiv">Не открыты · <span id="rdiv-n">0</span>'),
          screen.name + ': only BH9.7/BH9.9 heroes were locked in the late fixture');
        v = v.replace('<div class="rdiv" id="rdiv">', '<div class="rdiv" id="rdiv" hidden="">');
      }
      screen.view = v;
    }
    if (screen.name === 'profile' && typeof screen.overlay2 === 'string') {
      const avatar = /<button class="pick[^"]*" data-pava="hero:(margot|yue)"[^>]*>[\s\S]*?<\/button>/g;
      const found = [...screen.overlay2.matchAll(avatar)].map(m => m[1]).sort();
      assert.deepEqual(found, ['margot','yue'], 'BH9.9 locked legend must not enter profile avatar selection');
      screen.overlay2 = screen.overlay2.replace(avatar, '');
      // The newly public legend is still locked on historical saves. Its
      // avatar choice is shown disabled, never granted or automatically usable.
      const lockedLegend=/<button class="pick[^"]*" data-pava="hero:baron_legend"[^>]*>[\s\S]*?<\/button>/g;
      const newLegend=[...screen.overlay2.matchAll(lockedLegend)];
      assert.equal(newLegend.length,1,'one additional locked legendary avatar');
      assert.ok(newLegend[0][0].includes('disabled=""'),'locked legendary avatar must stay disabled');
      screen.overlay2=screen.overlay2.replace(lockedLegend,'');
    }
  }
  return copy;
}
function validateV86Legend(s) {
  const legend = s.screens.find(x => x.name === 'view:legend');
  assert.ok(legend && !legend.errors.length, 'legend screen renders without errors');
  const html = legend.view;
  assert.ok(html.includes('Герои пути ·'), '11-hero readiness heading is visible');
  assert.ok(html.includes('Дом Атрейдесов') && html.includes('Союзники и противники'), 'both groups are rendered');
  const reqHtml = html.slice(html.indexOf('<h3>Герои пути'), html.indexOf('<p class="chap">'));
  const requiredIds = [...new Set([...reqHtml.matchAll(/data-info="shard:([^"]+)"/g)].map(m => m[1]))].sort();
  assert.deepEqual(requiredIds, ['paul','duncan','leto','jessica','gurney','stilgar','chani','kynes','mohiam','baron','shaddam'].sort(),
    'all eleven required hero cards exist in the requirements panel');
  assert.ok(html.includes('Бои заблокированы') || html.includes('Муад’Диб открыт') || html.includes('Все 11 требований выполнены'), 'gate status is explained');
}
function normalizeApprovedGE1(src, isCurrent) {
  const copy = structuredClone(src);
  const campView = new Set([
    'fresh:camp','camp:L','camp:D','camp:C','camp:L:node5',
    'info:bio:paul','info:shard:chani','info:frag:belt5',
    'info:need:water:6','info:sol','info:cry',
    'squadsel:camp0','sim:node3','battle:start','battle:turns'
  ]);
  for (const screen of copy.screens) {
    if (campView.has(screen.name) && typeof screen.view === 'string') {
      // Only the equipment icons within the mission rewards row. Preserve
      // shards, currencies, labels, action buttons and the rest of the view.
      const loot = /<span class="rewit">[\s\S]*?<\/span>(?=\s*<span class="mono" style="color:var\(--dust\)">)/g;
      const matches = [...screen.view.matchAll(loot)];
      if (!(isCurrent && screen.view.includes('class="c20 '))) {
        assert.equal(matches.length, 1, screen.name + ': exactly one mission gear preview');
        if (isCurrent && matches[0][0].includes('data-info="frag:')) {
          // Fragment source validation is still strict for all other panels.
          assert.ok(!/data-info="frag:frag:/.test(matches[0][0]), screen.name + ': no invalid fragment links');
        }
        screen.view = screen.view.replace(loot, '<span class="rewit">[GE1 equipment loot preview]</span>');
      }
    }
    if (screen.name === 'shop:sietch' && typeof screen.view === 'string') {
      const marker = '<p class="chap" style="margin:22px 0 8px">Фрагменты';
      const at = screen.view.indexOf(marker);
      assert.ok(at >= 0, 'GE1 Sietch section must exist');
      const section = screen.view.slice(at);
      if (isCurrent) {
        assert.ok(section.includes('Фрагменты компонентов снаряжения VI–XIII'), 'GE1 shop uses component fragments');
        assert.ok(!/data-fbuy="[a-z]+\d+:\d+"/.test(section), 'GE1 shop cannot create new legacy universal fragments');
        if (section.includes('data-fbuy=')) assert.ok(/data-fbuy="frag:[a-z]+\d+:[a-z]+:\d+"/.test(section),
          'GE1 shop provides real component purchase IDs');
      }
      // This section is the final element of shop:sietch. All previous stock,
      // prices, UI and currencies are compared unchanged.
      screen.view = screen.view.slice(0, at) + '[GE1 component shop panel]';
    }
    if (screen.name === 'info:frag:belt5' && typeof screen.overlay2 === 'string') {
      // GE1 changes the farm locations of direct I–V gear fragments too;
      // preserve header, recipe context, resource counts and close controls.
      const source = /(<div class="srcs">)[\s\S]*?(<\/div>)(?=\s*<div class="acts">)/;
      assert.ok(source.test(screen.overlay2), 'GE1 direct fragment info has one source panel');
      if (isCurrent) {
        const match = screen.overlay2.match(source);
        assert.ok(match[0].includes('шанс 18% за бой'), 'GE1 direct fragment farm shows real 18% chance');
        assert.ok(!match[0].includes('шанс ≈'), 'GE1 direct fragment farm has no approximate chance');
      }
      screen.overlay2 = screen.overlay2.replace(source,
        '$1[GE1 direct I–V fragment sources]$2');
    }
    if (screen.name === 'item:paul:0' && typeof screen.overlay2 === 'string') {
      const marker = '<div class="srcs">';
      const at = screen.overlay2.indexOf(marker);
      assert.ok(at >= 0, 'GE1 equipment source panel must exist');
      const tail = screen.overlay2.slice(at);
      const closing = '</div>\n    </div></div></div></div>';
      const end = tail.lastIndexOf(closing);
      assert.ok(end > 0, 'GE1 source list has expected closing layout');
      if (isCurrent) {
        assert.ok(/шанс [\d,.]+% за бой/.test(tail), 'GE1 complete gear chance shown');
        assert.ok(!tail.includes('шанс ≈'), 'GE1 does not show legacy approximate source chance');
      }
      screen.overlay2 = screen.overlay2.slice(0,at) + '<div class="srcs">[GE1 complete gear sources]' + tail.slice(end);
    }
  }
  return copy;
}
// Gear XIII → Other Memory: approved navigation-only differences.
// Restore precisely the previous DOM for comparison while keeping every hero
// level, skill, slot, currency, equipment state and unrelated UI assertion strict.
function normalizeApprovedGearMemory(src, current) {
  const copy = structuredClone(src);
  if (!current) return copy;
  const names = new Set(['detail:paul', 'detail:duncan', 'detail:baron', 'detail:erasmus', 'item:paul:0']);
  for (const screen of copy.screens) {
    if (!names.has(screen.name) || typeof screen.overlay !== 'string') continue;
    let html = screen.overlay;
    let memoryCount = 0;
    html = html.replace(/<button class="hcmem( next)?" data-hcmem="([^"]+)"( disabled)? aria-label="Другая память — (максимум|продолжить развитие героя|условия открытия)">/g,
      (_full, next, id, disabled) => {
        assert.ok(!next || html.includes('Сн. XIII'), screen.name + ': next-stage badge requires XIII');
        memoryCount++;
        return '<button class="hcmem" data-hcmem="' + id + '"' + (disabled || '') + '>';
      });
    assert.equal(memoryCount, 1, screen.name + ': one Other Memory button');
    html = html.replace('<b>Другая память ›</b>', '<b>Другая память</b>')
      .replace('<b>Другая память </b>', '<b>Другая память</b>')
      .replace('<small>следующий этап усиления</small>', '<small>можно пробудить</small>')
      .replace('<small>нужно 7★ для пробуждения</small>', '<small>с 7★ и сн. XIII</small>');
    html = html.replace(/<button class="btn hcbtn go" data-hcmem="([^"]+)" aria-label="Перейти к Другой памяти"><span>Снаряжение XIII — завершено<\/span><small>(?:Другая память — максимум|Дальнейшее усиление → Другая память)<\/small><\/button>/g,
      '<span class="hccap hcmaxg">снаряжение — максимум</span>');
    assert.ok(!html.includes('Дальнейшее усиление → Другая память'), screen.name + ': expected navigation-only delta');
    screen.overlay = html;
  }
  return copy;
}

// Campaign 2.0: the approved landing screen replaces the legacy campaign DOM.
// Retain strict golden comparison for every non-campaign screen, overlay, save,
// rewards and source navigation. The separate mobile Campaign 2.0 smoke checks
// the new 3D screen in both phone viewports.
function normalizeApprovedCampaign20(src, current) {
  const copy = structuredClone(src);
  const campaignNames = new Set([
    'fresh:camp','camp:L','camp:D','camp:C','camp:L:node5',
    'info:bio:paul','info:shard:chani','info:frag:belt5',
    'info:need:water:6','info:sol','info:cry',
    'squadsel:camp0','sim:node3','battle:start','battle:turns'
  ]);
  for (const screen of copy.screens) {
    if (!campaignNames.has(screen.name)) continue;
    if (current) {
      assert.ok(screen.view?.includes('class="c20 c20-home"'),
        screen.name + ': approved Campaign 2.0 landing available');
      assert.ok(screen.view.includes('data-c20="story"') && screen.view.includes('data-c20="chron"'),
        screen.name + ': both routes available');
      assert.deepEqual(screen.errors, [], screen.name + ': no new page errors');
    }
    screen.view = '[approved Campaign 2.0 hub; validated separately by campaign20 smoke]';
  }
  return copy;
}
// C4.12 «Сиетч Табр» / C4.13 «Годы в пустыне»: existing Chani farm links.
// L:3 sources 31,34,36,39 already have approved map shortcuts; adding L:4
// makes the original mission 41 map-accessible too (no change to drops).
// Normalize these five buttons in ONE screen; keep all other fields byte-strict.
// Do not rebaseline the entire 44-screen archive for this single UI change.
function normalizeApprovedC412(src, current) {
  const copy = structuredClone(src);
  const screen = copy.screens.find(s => s.name === 'info:shard:chani');
  assert.ok(screen && typeof screen.overlay2 === 'string',
    'C4.12: Chani shard source overlay must exist');
  // The late-save Chani overlay lists four L:3 and one L:4 farm sources.
  // Every source gains its normal map shortcut once its chapter is implemented.
  // Mission 41 is now a normal L:4 map entry; existing loot remains untouched.
  const approved = [31,34,36,39,41];
  const discovered = [...screen.overlay2.matchAll(/data-c20farm="(\d+)"/g)]
    .map(m => Number(m[1]));
  if (current) {
    assert.deepEqual(discovered, approved,
      'C4.13: exactly five existing Chani farm sources expose map actions');
    for (const id of approved) {
      const button = '<button class="btn mini" data-c20farm="' + id + '">На карте</button>';
      assert.ok(screen.overlay2.includes('<div class="srca">' + button +
        '<button class="btn go mini " data-node="' + id + '">В бой</button>'),
        'C4.13: shortcut must precede unchanged battle button for mission ' + id);
      screen.overlay2 = screen.overlay2.replace(button, '');
    }
  } else {
    assert.deepEqual(discovered, [],
      'C4.13: legacy Chani shard golden had no L:3/L:4 map shortcuts');
  }
  return copy;
}
function normalizeApprovedRosterDp(src, current) {
  const copy = structuredClone(src);
  if (!current) return copy;
  const allowed = new Set([
    'view:squad', 'detail:paul', 'detail:duncan',
    'detail:baron', 'detail:erasmus', 'item:paul:0'
  ]);
  const ring = /(<span class="hpt(?: legend)?) dp-(light|dark|mach)(" style="--fc:var\(--[^)]+\);--side:var\(--(light|dark|mach)\);--rim:)/g;
  for (const screen of copy.screens) {
    for (const key of ['view', 'overlay', 'overlay2']) {
      const html = screen[key];
      if (typeof html !== 'string') continue;
      const matches = [...html.matchAll(ring)];
      if (!allowed.has(screen.name) || key !== 'view') {
        assert.equal(matches.length, 0, screen.name + ': DP ring appeared outside approved roster');
        continue;
      }
      assert.ok(matches.length > 0, screen.name + ': expected newly awakened portrait rings');
      screen[key] = html.replace(ring, (_m, prefix, dpSide, suffix, heroSide) => {
        assert.equal(dpSide, heroSide, screen.name + ': DP ring must match hero side');
        return prefix + suffix;
      });
      assert.ok(!/<span class="hpt[^"]* dp-/.test(screen[key]),
        screen.name + ': no unapproved DP class remains');
    }
  }
  return copy;
}
// ECON-01: approved energy numbers and UI-01 chronicle energy label in two header pills.
// Keep the historical screen golden byte-strict for every other DOM field;
// assert exact old/new values AND labels before narrow normalization.
function normalizeApprovedEcon01EnergyScreens(current, expected) {
  const copy = structuredClone(current);
  const oldValues = (fresh) => fresh
    ? { water: '150/150', candle: '120/120' }
    : { water: '300/240', candle: '200/180' };
  const newValues = (fresh) => fresh
    ? { water: '360/360', candle: '288/288' }
    : { water: '450/450', candle: '348/348' };
  const pill = /(data-info="(water|candle)"><span>(?:Вода|Свечи|Огни)<\/span><b><svg\b[^>]*>#[0-9a-f]{10}<\/svg>)(\d+\/\d+)(<\/b>)/g;
  function readPills(screen, name) {
    assert.equal(typeof screen.header, 'string', name + ': a visible header is required');
    const matches = [...screen.header.matchAll(pill)];
    assert.equal(matches.length, 2, name + ': exactly two energy pills');
    assert.deepEqual(matches.map(m => m[2]), ['water', 'candle'], name + ': pill order must stay');
    const label = name.endsWith(' historical') ? 'Свечи' : 'Огни';
    assert.ok(screen.header.includes('data-info="candle"><span>' + label + '</span>'),
      name + ': candle resource label must match approved UI-01 name');
    return Object.fromEntries(matches.map(m => [m[2], m[3]]));
  }
  assert.equal(copy.screens.length, expected.screens.length, 'no screen count changes');
  for (let i = 0; i < copy.screens.length; i++) {
    const screen = copy.screens[i], baseline = expected.screens[i];
    assert.equal(screen.name, baseline.name, 'no screen ordering changes');
    const fresh = screen.name.startsWith('fresh:');
    assert.deepEqual(readPills(baseline, screen.name + ' historical'), oldValues(fresh),
      screen.name + ': historical energy golden must be unchanged');
    assert.deepEqual(readPills(screen, screen.name + ' new'), newValues(fresh),
      screen.name + ': ECON-01 exact approved new header energy required');
    const old = oldValues(fresh);
    screen.header = screen.header.replace(pill, (_all, start, kind, _value, end) =>
      (kind === 'candle' ? start.replace('<span>Огни</span>', '<span>Свечи</span>') : start) + old[kind] + end);
    // The lobby header is also embedded in several historical view snapshots.
    // Restrict the exception to the two fully identified energy pills.
    const mirroredView = new Set(['fresh:lobby', 'view:lobby', 'calendar',
      'profile', 'battle-settings']);
    const embedded = mirroredView.has(screen.name) ? 'view' :
      screen.name === 'squadsel:camp0' ? 'overlay' : null;
    if (embedded) {
      assert.equal(typeof screen[embedded], 'string', screen.name + ': embedded header must exist');
      let count = 0;
      screen[embedded] = screen[embedded].replace(pill, (_all, start, kind, value, end) => {
        assert.equal(value, newValues(fresh)[kind], screen.name + ': mirrored energy must match');
        count++;
        return (kind === 'candle' ? start.replace('<span>Огни</span>', '<span>Свечи</span>') : start) + old[kind] + end;
      });
      assert.equal(count, 2, screen.name + ': exactly two mirrored energy pills');
    }
    if (screen.name === 'info:need:water:6') {
      assert.ok(screen.overlay2?.includes('Нужно 6 · у вас 450/450'),
        'water shortage dialog must show approved current stock');
      screen.overlay2 = screen.overlay2.replace('Нужно 6 · у вас 450/450',
        'Нужно 6 · у вас 300/240');
    }
    if (screen.name === 'profile') {
      // The account panel repeats maximum energy values independently of
      // the header. Keep the full surrounding profile/level text byte-strict.
      const currentCaps = /(<span>Запас энергии<\/span><b><svg\b[^>]*>#[0-9a-f]{10}<\/svg> )(450)( · <svg\b[^>]*>#[0-9a-f]{10}<\/svg> )(348)( <small style="color:var\(--dust\)">\+15\/\+10 каждые 10 ур\.<\/small><\/b>)/g;
      const oldCaps = /(<span>Запас энергии<\/span><b><svg\b[^>]*>#[0-9a-f]{10}<\/svg> )(240)( · <svg\b[^>]*>#[0-9a-f]{10}<\/svg> )(180)( <small style="color:var\(--dust\)">\+15\/\+10 каждые 10 ур\.<\/small><\/b>)/g;
      assert.equal([...baseline.overlay2.matchAll(oldCaps)].length, 1,
        'profile historical account-energy caps must be unchanged');
      assert.equal([...screen.overlay2.matchAll(currentCaps)].length, 1,
        'profile new account-energy caps must match approved ECON-01 values');
      screen.overlay2 = screen.overlay2.replace(currentCaps,
        (_full, waterIcon, _water, candleIcon, _candle, bonus) =>
          waterIcon + '240' + candleIcon + '180' + bonus);
    }
    if (screen.name === 'sim:node3') {
      assert.ok(screen.overlay?.includes('из 450'), 'simulator must show approved water stock');
      screen.overlay = screen.overlay.replace('из 450', 'из 300');
    }
  }
  return copy;
}
// UI-01: approved player-facing energy rename only. Reverse explicitly known
// text deltas against the old immutable screen golden; all other DOM remains
// subject to exact comparison. Do NOT rewrite golden images or save snapshots.
function normalizeApprovedChronicleLightsScreens(current, expected) {
  const copy = structuredClone(current);
  const replacements = [
    ['Воды или Огней Хроник', 'Воды или Свечей'],
    ['Воды и Огней Хроник', 'Воды и Свечей'],
    ['Для прохождения Хроник нужны Огни Хроник.', 'Хроники проходятся за Свечи хроник.'],
    ['Все герои · Огни Хроник ·', 'Все герои · свечи ·'],
    ['Огней Хроник', 'Свечей хроник'],
    ['Огни Хроник', 'Свечи хроник'],
    ['<span class="rwc">Огни</span>', '<span class="rwc">Свечи</span>'],
  ];
  for (let i = 0; i < copy.screens.length; i++) {
    const screen = copy.screens[i], baseline = expected.screens[i];
    assert.equal(screen.name, baseline.name, 'chronicle energy golden screen order');
    for (const key of ['view', 'overlay', 'overlay2']) {
      if (typeof screen[key] !== 'string') continue;
      for (const [newText, oldText] of replacements) {
        if (!screen[key].includes(newText)) continue;
        assert.ok(typeof baseline[key] === 'string' && baseline[key].includes(oldText),
          screen.name + ': approved label only in existing ' + key + ' context: ' + newText);
        screen[key] = screen[key].replaceAll(newText, oldText);
      }
    }
  }
  return copy;
}
// ECON-01: the only approved daily view changes are three quest labels and
// their *alternative* progress text. Do not alter reward/claim markup, slots,
// numerical bars, body, other screens or the established golden baseline.
function normalizeApprovedEcon01DailyScreens(current, expected) {
  const copy = structuredClone(current);
  const actual = copy.screens.find(x => x.name === 'view:daily');
  const baseline = expected.screens.find(x => x.name === 'view:daily');
  assert.ok(actual && baseline, 'daily screen must exist in 41-screen suite');
  const changes = [
    ['Совершить 3 покупки в Лавке сиетча', '3 покупки или 5 боёв кампании', '0/3', '0/3 или 0/5'],
    ['Собрать предмет снаряжения', 'Собрать предмет или провести 10 боёв', '0/1', '0/1 или 0/10'],
    ['Повысить уровень героев 3 раза', '3 повышения уровня или 3 боя Хроник', '0/3', '0/3 или 0/3'],
  ];
  for (const [oldLabel, newLabel, oldProgress, newProgress] of changes) {
    const re = new RegExp('(<b>)' + newLabel + '(</b><div class="qbar"><i style="width:[^"]+"><\\/i><\\/div><span class="mono">)([^<]+)(<\\/span>)', 'g');
    const matched = [...actual.view.matchAll(re)];
    assert.equal(matched.length, 1, newLabel + ': exactly one approved quest in rendered daily');
    assert.equal(matched[0][3], newProgress, newLabel + ': approved alternative progress only');
    assert.ok(baseline.view.includes('<b>' + oldLabel + '</b>'), oldLabel + ': old golden quest preserved');
    assert.ok(baseline.view.includes('<span class="mono">' + oldProgress + '</span>'), oldLabel + ': old baseline progress retained');
    actual.view = actual.view.replace(re, (_all, a, b, _value, d) => a + oldLabel + b + oldProgress + d);
  }
  return copy;
}
if (rest.includes('--update')) writeGolden('screens', out);
else {
  validateV86Legend(out);
  const baseline = readGolden('screens');
  if (!baseline) throw new Error('screens golden baseline missing');
  const parsed = JSON.parse(baseline);
  const want = normalizeApprovedCampaign20(normalizeApprovedC412(normalizeApprovedBH4(normalizeApprovedV86(normalizeApprovedGE1({ ...parsed.meta, screens: parsed.screens }, false))), false), false);
  const gotBeforeEnergy = normalizeApprovedCampaign20(normalizeApprovedC412(normalizeApprovedBH4(normalizeApprovedV86(normalizeApprovedGearMemory(normalizeApprovedBH97(normalizeApprovedGE1(normalizeApprovedRosterDp(out, true), true)), true))), true), true);
  const gotEnergyNormalized = normalizeApprovedEcon01EnergyScreens(gotBeforeEnergy, want);
  const got = normalizeApprovedChronicleLightsScreens(normalizeApprovedEcon01DailyScreens(gotEnergyNormalized, want), want);
  if (!isDeepStrictEqual(want, got)) {
    const changed = want.screens.filter((v, i) => !isDeepStrictEqual(v, got.screens[i])).map(x => x.name);
    console.error('Unapproved golden screen differences:', changed.join(', '));
    // Report each changed screen independently so owner can approve only intended UI
    // deltas; do not rewrite or normalize golden snapshots automatically.
    for (const name of changed) {
      const expected = want.screens.find(x => x.name === name), actual = got.screens.find(x => x.name === name);
      for (const key of ['header','view','overlay','overlay2','bodyClass','errors']) {
        if (isDeepStrictEqual(expected[key],actual[key])) continue;
        const a = JSON.stringify(expected[key]), b = JSON.stringify(actual[key]);
        let i = 0; while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
        console.error('First divergent field:', name, key, 'at', i, 'expected', a.slice(Math.max(0,i-120),i+210), 'actual', b.slice(Math.max(0,i-120),i+210));
        break;
      }
    }
    process.exitCode = 1;
  } else console.log('OK screens: unchanged views match golden; approved v86 legend changes validated separately');
}
