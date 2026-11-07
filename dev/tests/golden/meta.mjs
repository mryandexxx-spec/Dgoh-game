// Табличные тесты наград и экономики (REFACTOR_PLAN §6.2): функции меты на фиксированных входах.
//   node tests/golden/meta.mjs <game.html> [--update]
// Перед каждым вызовом Math.random пересидируется (seed = номер случая), часы фиксированы (lib/load.mjs FIXED_NOW).
// Состояние S — newSave() + metaFill; для функций, зависящих от уровня аккаунта/Джихада, S дополнительно настраивается.
import { loadGame } from '../lib/load.mjs';
import { writeGolden, compareGolden, argv } from '../lib/golden.mjs';

const [html, ...rest] = argv();
const g = loadGame(html), R = g.run;
const cases = [];
let seed = 1000;
const range = (a, b, st = 1) => { const o = []; for (let x = a; x <= b; x += st) o.push(x); return o; };
const clone = v => JSON.parse(JSON.stringify(v ?? null));
// expr — выражение в контексте игры, args — массив аргументов; результат клонируется (без функций)
function T(group, expr, argsList) {
  const fn = R(expr);
  for (const args of argsList) { g.reseed(++seed); let out; try { out = clone(fn(...args)); } catch (e) { out = { throws: String(e.message) }; } cases.push({ g: group, f: expr, a: args, out }); }
}
function V(group, expr) { g.reseed(++seed); let out; try { out = clone(R(expr)); } catch (e) { out = { throws: String(e.message) }; } cases.push({ g: group, f: expr, out }); }

// ---- состояние: новый аккаунт, затем — поздний (уровень 60) ----
R('S = newSave(); metaFill(S);');
const CHARS = g.get('CHARS'), ids = CHARS.filter(c => !c.boss).map(c => c.id), NODES = g.get('NODES');

// константы-таблицы
V('const', '({ MAX_LVL, MAX_GEAR, WATER_BASE, WATER_SEC, BATTLE_WATER, CANDLE_BASE, CANDLE_COST, FRAG_NEED, SHOP_FRAG, RAID_FRAGS, SHARDS_NEXT, STAR_MULT, GEAR_CAP_AT, RELIC_AT, ACC_MAX, RAID_TIERS, CQ_CHESTS, CQ_LAYERS, CQ_DIFF, CQ_EN, CQ_STA, CQ_TROPHY, CQ_PRICE, CQ_DROP, FEAT_RW })');
V('const', 'Object.fromEntries(Object.entries(ITEMS).map(([k, v]) => [k, [v.kind, v.t, v.n]]))');
V('const', 'NODES.map((n, i) => [n.camp, n.c, n.m, n.lvl, !!n.desert, n.enemy, nodeEn(i), nodeCost(i), nodePower(n)])');
V('const', 'NODE_ITEMS');

// формулы стоимости
T('cost', 'LVL_COST', range(1, 85).map(l => [l]));
T('cost', 'lvlCost', [[1, 2], [1, 10], [1, 50], [1, 85], [29, 31], [30, 60], [60, 85], [84, 85]]);
T('cost', 'STAR_COST', range(0, 7).map(s => [s]));
T('cost', 'GEAR_COST', range(1, 13).map(x => [x]));
T('cost', 'CRAFT', range(1, 13).map(x => [x]));
T('cost', 'GEAR_UP_SOL', range(1, 13).map(x => [x]));
T('cost', 'skCost', range(1, 8).map(x => [x]));
T('cost', 'skBonus', ['basic', 'special', 'ult', 'passive', 'leader'].flatMap(k => range(1, 7).map(l => [k, l])));
T('cost', 'refillPrice', range(0, 12).map(n => [n]));
T('cost', 'accNeed', range(1, 85).map(l => [l]));
T('cost', 'accReward', range(1, 85).map(l => [l]));
T('cost', 'id => unlockNeed(CH[id])', ids.map(id => [id]));

// характеристики и мощь героев (сетка)
const grid = [{ lvl: 1, stars: 1, gear: 1 }, { lvl: 20, stars: 3, gear: 4 }, { lvl: 50, stars: 5, gear: 9, eq: [1, 1, 0, 1, 0, 0] }, { lvl: 85, stars: 7, gear: 13, relic: 7, eq: [1, 1, 1, 1, 1, 1], sk: { basic: 7, special: 6, ult: 7, passive: 6, leader: 7 } }];
T('stats', '(id, p) => unitStats(CH[id], p)', ids.flatMap(id => grid.map(p => [id, p])));
T('stats', '(id, p) => unitPower(CH[id], p)', ids.flatMap(id => grid.map(p => [id, p])));
T('stats', 'enemyProg', [1, 5, 10, 25, 40, 55, 56, 70, 85].flatMap(l => [['rabban', l, false], ['baron', l, true]]));
T('stats', 'gearPlan', ids.flatMap(id => [1, 5, 13].map(t => [id, t])));

// награды кампании (случайные — при фиксированном seed)
T('reward', 'campReward', NODES.flatMap((n, i) => [1, 3].map(st => [i, st])));
T('reward', 'rollItems', NODES.map((n, i) => [i]));
T('reward', 'raidFrags', [0, 1, 2].flatMap(t => [.1, .5, 1].map(p => [t, p])));
T('reward', 'raidReward', [0, 1, 2].flatMap(t => [[t, .3, false], [t, 1, true]]));
T('reward', 'loginReward', range(1, 31).map(d => [d]));
T('reward', '(id, t) => trialRoll(TR(id), t)', g.get('TRIALS').flatMap(Tr => range(0, 6).map(t => [Tr.id, t])));
T('reward', '(id, t) => trialFoes(TR(id), t)', g.get('TRIALS').flatMap(Tr => [0, 3, 6].map(t => [Tr.id, t])));
T('reward', '(i, s) => featRw(FEATS[i], s)', range(0, g.get('FEATS').length - 1).flatMap(i => [0, 2, 4].map(s => [i, s])));
T('shop', 'shopItems', Object.keys(g.get('SHOPS')).map(k => [k]));
T('shop', 'dailyHeroes', [['a', 3], ['b', 6]]);

// аккаунт: опыт и выдача наград по уровням (накопительно, на копии S)
V('acc', `(() => { S = newSave(); metaFill(S); const lines = accXP(5000).length; return { lines, acc: S.acc, res: { sol: S.solari, cry: S.cry, folio: S.folio, seal: S.seal, rid: S.rid, core: S.core, water: S.water, candle: S.candle } }; })()`);
V('acc', `(() => { S = newSave(); metaFill(S); for (const id in S.roster) Object.assign(S.roster[id], { lvl: 60, gear: 11 }); delete S.acc; accFill(S); return [S.acc, heroCap(), gearCap(), relicCap(), WMAX(), CMAX()]; })()`);

// Джихад: раскладка, сундуки, трек, лавка, диски — для каждой сложности
for (const diff of ['easy', 'normal', 'hard']) {
  R(`S = newSave(); metaFill(S); S.acc.lvl = 70; cq().diff = '${diff}'; CQ_MEMO_CLR();`);
  V('cq:' + diff, 'range5 = [0, 1, 2, 3, 4].map(s => cqLayout(s).map(a => [a.key, a.type, a.next, a.lvl, a.relic, Math.round(a.pow * 1e6) / 1e6, a.enemy, a.mods]))'.replace('range5 = ', ''));
  V('cq:' + diff, '[0, 4].map(s => cqLayout(s).filter(a => a.fight).map(a => cqFoes(a)))');
  V('cq:' + diff, 'CQ_CHESTS.map((t, i) => cqChest(i))');
  V('cq:' + diff, 'cqTrack().filter(x => x.kind === "st").map(x => [x.at, cqStatic(x.i)])');
  V('cq:' + diff, '["0-1-0", "2-5-1", "4-11-0"].map(k => cqGoods(k))');
  V('cq:' + diff, 'cqShopItems()');
  V('cq:' + diff, '[["start", 0], ["early", 1], ["late", 3], ["crate", 4]].map(([k, s]) => [cqDropW(k, s), cqDiskPick(k + s, cqDropW(k, s))])');
  V('cq:' + diff, '[0, 25, 50, 99, 100].map(s => cqStaPen(s))');
  V('cq:' + diff, 'Object.keys(CQ_BMOD).map(m => cqModD(m))');
}

// ---- пакет 3: способности Муад'Диба и Дункана (табличные случаи боя) ----
{
  const P3 = '(() => { const q = (id, o = {}) => ({ id, lvl: 60, stars: 7, gear: 10, ...o }), st = b => b.units.map(u => [u.def.id, u.side, u.alive, u.hp, !!u.noRev, !!u.pendingRevive, Object.keys(u.fx).sort().join("|")]);';
  const C = (name, body) => V('pkg3', P3 + ` const name = ${JSON.stringify(name)}; ${body} })()`);
  const HARK = 'CHARS.find(c => !c.boss && c.f.includes("hark")).id';
  C('ГЛ: казнь не-босса и оглушение', 'const b = createBattle([q("muaddib", { gl: true })], [q("gurney"), q("thufir")], { seed: 7 }); const u = b.units[0]; glAct(b, u, b.units[1].uid); return [name, b.glTarget, st(b), b.spice.A];');
  C('ГЛ: по боссу — удар', 'const b = createBattle([q("muaddib", { gl: true })], [], { seed: 7, boss: { tier: 0, maxHp: 1e7, hp: 1e7 } }); const w = b.units.find(x => x.def.boss); glAct(b, b.units[0], w.uid); return [name, w.alive, w.maxHp - w.hp > 0];');
  C('ГЛ врага: чан не воскрешает', 'const b = createBattle([q("gurney"), q("thufir")], [q("muaddib", { gl: true })], { seed: 7 }); b.cqGhola = 1; glAct(b, b.units[2], b.units[0].uid); return [name, st(b), b.cqGhola];');
  C('Дункан: 1 здоровья, пока жив', 'const b = createBattle([q("duncan"), q("paul")], [q("gurney")], { seed: 7 }); const [d, p, e] = b.units; p.hp = 10; hit(b, e, p, "voice", 50); const a1 = [p.alive, p.hp]; d.noRev = true; kill(b, d, e); p.hp = 10; hit(b, e, p, "voice", 50); return [name, a1, [p.alive, p.hp]];');
  C('Лидерка ур.6/7: бонус и иммунитеты', `const h = ${HARK}; const b = createBattle([q("muaddib", { sk: { basic: 6, special: 6, ult: 6, passive: 6, leader: 7 } }), q("gurney")], [q("liet", { gl: true }), q(h)], { seed: 7 }); const [m, g] = b.units; const r = [resist(b, b.units[2], g, "fear"), m.vsFac, g.immune]; glAct(b, b.units[2], m.uid); return [name, r, st(b)];`);
  C('Лидерка ур.5: без апгрейдов', 'const b = createBattle([q("muaddib", { sk: { basic: 5, special: 5, ult: 5, passive: 5, leader: 5 } }), q("gurney")], [q("gurney")], { seed: 7 }); return [name, b.units.map(u => [u.vsFac || null, u.immune || null])];');
  C('Наездник: без пряности, кд 6', 'const b = createBattle([q("muaddib")], [q("gurney"), q("thufir")], { seed: 7 }); const u = b.units[0]; b.spice.A = 0; startTurn(b, u); act(b, u, "ult"); return [name, b.flash, u.cd.ult, b.spice.A, st(b)];');
  C('ИИ: страж — первая цель', 'const b = createBattle([q("duncan"), q("paul")], [q("gurney")], { seed: 7 }); b.units[0].fx = {}; const p = aiPlan(b, b.units[2]); return [name, p.target && p.target.def.id];');
}

// ---- пакет 4: ростер — фильтр и сортировка (logic/roster.js) ----
for (const o of [{}, { s: 'lvl' }, { s: 'st' }, { s: 'nm' }, { s: 'bad' }, { f: 'light' }, { f: 'dark' }, { f: 'mach' }, { f: 'frem' }, { f: 'bg', r: 'sup' }, { r: 'tank' }, { f: 'hark', r: 'heal' }])
  V('pkg4', `rosterView(${JSON.stringify(o)})`);
V('pkg4', '(() => { const pg = id => ({ ...prog(id), stars: ["paul", "baron"].includes(id) ? 3 : 0, shards: { gurney: 9, liet: 300, erasmus: 30, kynes: 9 }[id] || 0, lvl: id === "baron" ? 50 : 10 }); return ["pw", "lvl", "nm"].map(s => rosterView({ s }, pg)); })()');

// ---- пакет 6: окно умения (logic/skill-up.js) и «Другая память» (logic/relics.js memView) ----
for (const [id, k, sk, st] of [['duncan', 'passive', 5, 7], ['duncan', 'basic', 6, 7], ['muaddib', 'leader', 7, 7], ['paul', 'special', 1, 0], ['gurney', 'ult', 3, 5]])
  V('pkg6', `skLevelView(CH.${id}, ${JSON.stringify(k)}, { stars: ${st}, sk: { ${k}: ${sk} } })`);
V('pkg6', `[2, 3, 6, 7].map(l => { const c = skCost(l); return [l, skMat(c)]; })`);
for (const [rl, acc, gear, eq] of [[0, 68, 13, 6], [3, 68, 13, 6], [4, 68, 13, 6], [7, 90, 13, 6], [0, 68, 11, 4], [0, 40, 13, 6]])
  V('pkg6', `(() => { const a0 = S.acc.lvl; S.acc.lvl = ${acc}; try { return memView(CH.duncan, { ...prog('duncan'), lvl: 85, stars: 7, gear: ${gear}, eq: [1, 1, 1, 1, 1, 1].map((x, i) => i < ${eq}), relic: ${rl}, sk: {} }); } finally { S.acc.lvl = a0; } })()`);

const out = { n: cases.length, cases };
console.log('случаев:', cases.length, 'исключений:', cases.filter(c => c.out && c.out.throws).length);
for (const c of cases.filter(c => c.out && c.out.throws).slice(0, 5)) console.log('  throws:', c.f, JSON.stringify(c.a || ''), c.out.throws);
if (rest.includes('--update')) writeGolden('meta', out); else process.exit(compareGolden('meta', out) ? 0 : 1);
