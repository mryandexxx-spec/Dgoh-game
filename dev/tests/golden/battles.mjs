// Golden-тесты боёв (REFACTOR_PLAN §6.1): 200 seed, ИИ против ИИ за обе стороны, в Node.
//   node tests/golden/battles.mjs <game.html>            — сравнить с эталоном
//   node tests/golden/battles.mjs <game.html> --update   — переснять эталон
// Цикл хода повторяет UI step()/doAct() без DOM: nextActor → startTurn → (skip ? endTurn) : aiPlan → act → endTurn.
// Состав отрядов выводится из seed отдельным генератором (не влияет на RNG боя).
// Категории: 0–139 обычные (часть в пустыне), 140–169 рейд-босс (червь), 170–199 Джихад (диски игрока + модификаторы врагов).
import { loadGame, mulberry32 } from '../lib/load.mjs';
import { writeGolden, compareGolden, argv } from '../lib/golden.mjs';

const N = 200, MAX_TURNS = 3000;

function setup(g, seed) {
  const CHARS = g.get('CHARS'), MAX_LVL = g.get('MAX_LVL'), skMax = g.get('skMax');
  const r = mulberry32(seed * 2654435761 >>> 0), ri = (a, b) => a + Math.floor(r() * (b - a + 1)), pick = a => a[Math.floor(r() * a.length)];
  // Keep the legacy 200-seed regression cohort stable when new playable heroes join CHARS.
  // BH9.7 characters have dedicated kit/event tests and must not silently reseed every historical battle.
  const pool = CHARS.filter(c => !c.boss && !['margot', 'yue'].includes(c.id)).map(c => c.id), CH = g.get('CH');
  const squad = n => {
    const ids = [], left = pool.slice(); let leg = 0;
    while (ids.length < n && left.length) { const id = left.splice(Math.floor(r() * left.length), 1)[0]; if (CH[id].legendary && leg++) continue; ids.push(id); }
    const lead = ids.findIndex(id => CH[id].leader); if (lead > 0 && r() < .7) ids.unshift(ids.splice(lead, 1)[0]);
    return ids.map(id => {
      const def = CH[id], lvl = ri(1, MAX_LVL), gear = ri(1, 13);
      const p = { id, lvl, stars: ri(1, 7), gear, relic: gear === 13 ? ri(0, 5) : 0, eq: Array.from({ length: 6 }, () => r() < .5) };
      if (r() < .8) p.sk = Object.fromEntries(['basic', 'special', 'ult', 'passive', 'leader'].map(k => [k, ri(1, skMax(def, k))]));
      if (def.gl && r() < .6) p.gl = true;
      return p;
    });
  };
  const cat = seed < 140 ? 'pvp' : seed < 170 ? 'raid' : 'cq';
  const c = { seed, cat, desert: cat === 'raid' || r() < .35, A: squad(ri(cat === 'pvp' ? 1 : 3, 5)), B: [] };
  if (cat === 'raid') { const tier = ri(0, 2), maxHp = g.get('RAID_TIERS')[tier].hp; c.boss = { tier, maxHp, hp: Math.round(maxHp * (.15 + r() * .85)) }; }
  else c.B = squad(ri(1, 5));
  if (cat === 'cq') {
    const disks = Object.keys(g.get('CQ_DISKS')), mods = [...Object.keys(g.get('CQ_MODS')), ...Object.keys(g.get('CQ_BMOD'))];
    c.disks = []; for (let k = ri(1, 5); k > 0; k--) { const d = pick(disks); if (!c.disks.includes(d)) c.disks.push(d); }
    c.mods = []; for (let k = ri(0, 2); k > 0; k--) { const m = pick(mods); if (!c.mods.includes(m)) c.mods.push(m); }
    c.k = pick([1, 1.25, 1.5]);
  }
  return c;
}

function runBattle(g, c) {
  const createBattle = g.get('createBattle'), nextActor = g.get('nextActor'), startTurn = g.get('startTurn'), aiPlan = g.get('aiPlan'),
    act = g.get('act'), endTurn = g.get('endTurn'), computeIntents = g.get('computeIntents');
  const B = createBattle(c.A, c.B, { desert: c.desert, seed: c.seed + 1, boss: c.boss });
  if (c.cat === 'cq') {     // как cqApply: диски → свои, модификаторы → враги, пересчёт намерений
    const A = B.units.filter(u => u.side === 'A'), E = B.units.filter(u => u.side === 'B'), CQ_DISKS = g.get('CQ_DISKS'), cqMod = g.get('cqMod');
    for (const k of c.disks) CQ_DISKS[k].f(A, B);
    for (const m of c.mods) cqMod(m).f(E, c.k);
    computeIntents(B);
  }
  const journal = [], turns = [];
  const drain = () => { for (const e of B.log) journal.push((e.kind ? e.kind + '|' : '') + e.text); B.log.length = 0; };
  drain();
  let n = 0;
  while (!B.over && n++ < MAX_TURNS) {
    const u = nextActor(B), rr = startTurn(B, u);
    if (B.over) { turns.push([u.uid, 'dead']); drain(); break; }
    if (rr.skip) { endTurn(B, u); turns.push([u.uid, 'skip']); drain(); continue; }
    const p = aiPlan(B, u);
    act(B, u, p.key, p.target && p.target.uid); endTurn(B, u);
    turns.push(p.target ? [u.uid, p.key, p.target.uid] : [u.uid, p.key]);
    drain();
  }
  return {
    seed: c.seed, cat: c.cat, winner: B.over || (n > MAX_TURNS ? 'timeout' : null), rounds: B.round, turns: turns.length,
    spice: B.spice, rhythm: B.rhythm,
    units: B.units.map(u => [u.uid, u.def.id, u.side, Math.round(u.hp * 1000) / 1000, u.maxHp, Math.round(u.shield * 1000) / 1000, u.alive ? 1 : 0]),
    order: turns.map(t => t.join(':')).join(' '),
    journal,
  };
}

const [html, ...rest] = argv();
const g = loadGame(html);
const out = { n: N, battles: [] };
for (let s = 0; s < N; s++) { const c = setup(g, s); out.battles.push({ setup: c, result: runBattle(g, c) }); }
const stat = out.battles.reduce((a, b) => { a[b.result.winner] = (a[b.result.winner] || 0) + 1; return a; }, {});
console.log('бои:', N, 'итоги:', JSON.stringify(stat));
if (rest.includes('--update')) writeGolden('battles', out); else process.exit(compareGolden('battles', out) ? 0 : 1);
