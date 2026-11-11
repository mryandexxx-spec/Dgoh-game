// logic/battle/engine.js — строки 246–433 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { computeIntents } from './ai.js';
import { glMeter } from './turns.js';
import { unitStats } from './stats.js';
import { RAID_TIERS, WORM, phaseOf } from '../../data/boss.js';
import { autoSk, dunGuard, dunShielded, leadBonus, pasMult, skLv } from './skills.js';
import { CH, MENTAT } from '../../data/chars.js';
import { LEAD_MODS } from '../../data/skill-ups.js';
import { FX } from '../../data/fx.js';
import { horrorDamageFactor, horrorSpeedFactor } from './horror.js';
import { passiveTeamPotency, supportEmergencyHeal, supportOnIsolation } from './support-kits.js';
import { canApplyStatus, consumeForesight, markedDamageFactor, markHouseVictim, mayRevive, baronPreventRevival, baronDeathTriggers } from './baron-mechanics.js';

function mkRng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// squads: [{id, lvl, stars, gear}], side A = player, B = enemy
function createBattle(squadA, squadB, opts = {}) {
  const B = { units: [], desert: !!opts.desert, spice: { A: 0, B: 0 }, rhythm: 0, log: [], events: [], over: null, active: null, rng: mkRng(opts.seed || Date.now()), leader: {}, round: 0 };
  // Explicit preview-only definitions let future playable heroes enter isolated
  // scenario tests without inserting unapproved art into the public CHARS roster.
  // Existing CH definitions always take priority, preventing character overrides.
  const resolveDef = id => CH[id] || opts.extraHeroDefs?.[id];
  let uid = 0;
  for (const [side, sq] of [['A', squadA], ['B', squadB]]) {
    if (!sq.length) { B.leader[side] = null; continue; }
    const leadDef = resolveDef(sq[0].id);
    if (!leadDef) throw new Error('Unknown battle leader: ' + sq[0].id);
    B.leader[side] = leadDef.leader ? leadDef.id : null;
    sq.forEach((p, i) => {
      const def = resolveDef(p.id);
      if (!def) throw new Error('Unknown battle hero: ' + p.id);
      const s = unitStats(def, p), sk = p.sk || autoSk(p.lvl), pm = pasMult(sk.passive || 1);
      s.maxHp = Math.round(s.maxHp * pm); s.dmg = Math.round(s.dmg * pm);
      const u = { sk, uid: 'u' + (uid++), side, idx: i, def, ...s, hp: s.maxHp, shield: s.maxShield, glOn: !!(def.gl && p.gl), ultM: 0, glUsed: false, tm: 0, cd: { special: def.special?.cd0 ?? 0, ult: def.ult ? (def.ult.cd0 ?? 3) : 0 }, fx: {}, alive: true, intent: null, dmgBonus: 0, fearImmune: !!def.fearImm, counterChance: def.counter || 0, gear: p.gear || 1, relic: p.relic || 0 };
      if (def.armUp) u.arm += def.armUp; if (def.critUp) u.crit += def.critUp; if (def.potUp) u.pot += def.potUp;
      const L = B.leader[side];
      if (L === 'leto' && has(u, 'atr')) { u.arm += .1; u.dmgBonus += .1; u.counterChance = Math.max(u.counterChance, .25); }
      if (L === 'stilgar' && has(u, 'frem')) { u.regen = .05; if (B.desert) u.spd = Math.round(u.spd * 1.2); }
      if (L === 'muaddib' && (has(u, 'atr') || has(u, 'frem'))) { u.spd = Math.round(u.spd * 1.15); u.dmgBonus += .1; u.regen = .05; u.wormImmune = true; u.noRhythm = true; }
      if (L === 'liet' && has(u, 'frem')) { u.dmgBonus += .1; u.ten += .15; u.regen = Math.max(u.regen || 0, .04); if (B.desert) u.spd = Math.round(u.spd * 1.1); }
      if (L === 'shaddam' && has(u, 'cor')) { u.dmgBonus += .15; u.fearImmune = true; }
      if (L === 'erasmus' && (has(u, 'mach') || MENTAT(u))) { u.dmgBonus += .25; u.maxHp = Math.round(u.maxHp * 1.25); u.hp = u.maxHp; u.spd = Math.round(u.spd * 1.15); u.pot += .15; u.regen = Math.max(u.regen || 0, .05); }
      u.tm = Math.floor(B.rng() * 150);
      B.units.push(u);
    });
  }
  for (const side of ['A', 'B']) {
    const team = B.units.filter(x => x.side === side), ld = team.find(x => x.idx === 0 && x.def.id === B.leader[side]);
    if (ld) { const lb = leadBonus(skLv(ld, 'leader')); if (lb) for (const a of team) if (a.def.f.some(f => ld.def.f.includes(f))) { a.dmgBonus += lb; a.maxHp = Math.round(a.maxHp * (1 + lb)); a.hp = a.maxHp; }
      const lm = LEAD_MODS[ld.def.id];   // уровни-апгрейды лидерки (data/skill-ups.js)
      if (lm) { const l = skLv(ld, 'leader'); for (const a of team) if (lm.f.some(f => has(a, f))) for (const lv in lm.lv) if (l >= +lv) { const m = lm.lv[lv]; if (m.vsFac) a.vsFac = { ...(a.vsFac || {}), ...m.vsFac }; if (m.immune) a.immune = [...(a.immune || []), ...m.immune]; } } }
    for (const src of team) {
      if (src.def.teamShield) for (const a of team) if (a.maxShield) { a.maxShield = Math.round(a.maxShield * (1 + src.def.teamShield)); a.shield = a.maxShield; }
      if (src.def.teamTen) for (const a of team) a.ten += src.def.teamTen;
      if (src.def.teamStartTM) for (const a of team) a.tm = Math.min(999, a.tm + src.def.teamStartTM);
    }
  }
  // Recovered Greed passive: calculate team bonuses exactly once from the
  // opening formation (not re-applied on resurrection or new waves).
  for (const side of ['A', 'B']) {
    const team = B.units.filter(a => a.side === side);
    const greeds = team.filter(a => a.def.passive?.harkonnenGreed);
    if (!greeds.length) continue;
    const hark = team.filter(a => has(a, 'hark'));
    const hasFeyd = team.some(a => a.def.id === 'feyd');
    for (const a of hark) {
      a.maxHp = Math.round(a.maxHp * (1 + .1 * hark.length));
      a.hp = a.maxHp;
      if (hasFeyd) a.critDamageBonus = (a.critDamageBonus || 0) + .2;
    }
  }
  passiveTeamPotency(B);
  for (const u of B.units) if (u.def.id === 'duncan' && skLv(u, 'passive') >= 4) u.fx.taunt = 2;
  // Data-driven leader mark, only for a hero whose leader kit explicitly enables it.
  for (const side of ['A', 'B']) {
    const leader = B.units.find(u => u.side === side && u.idx === 0);
    if (leader?.def?.leader?.houseMark) markHouseVictim(B.units, side);
  }
  if (opts.boss) {
    const R = opts.boss, T = RAID_TIERS[R.tier];
    B.raid = true; B.desert = true;
    B.units.push({ uid: 'boss', side: 'B', idx: 0, def: WORM, maxHp: R.maxHp, hp: R.hp, maxShield: 0, shield: 0, spd: T.spd, dmg: T.dmg, arm: .25, pot: .6, ten: .5, crit: .1, eva: 0,
      tm: 0, cd: { special: 0 }, fx: {}, alive: true, intent: null, dmgBonus: 0, fearImmune: true, counterChance: 0, bossTurns: 0, phase: phaseOf(R.hp / R.maxHp), frenzy: 0 });
    B.bossStartHp = R.hp;
  }
  if (Array.isArray(opts.waves) && opts.waves.length) {
    if (opts.waves.length > 2 || opts.waves.some(w => !Array.isArray(w) || w.length < 1 || w.length > 5)) throw new Error('Недопустимая конфигурация волн');
    B.wave = { current: 0, total: opts.waves.length + 1, remaining: opts.waves, seq: 0 };
    B.wavePending = false;
  }
  computeIntents(B);
  return B;
}

const has = (u, f) => u.def.f.includes(f);
const living = (B, side) => B.units.filter(u => u.alive && (!side || u.side === side));
const foe = s => (s === 'A' ? 'B' : 'A');
const isDebuffed = u => Object.keys(u.fx).some(k => FX[k].bad);
function log(B, text, kind = '') { B.log.push({ text, kind }); if (B.log.length > 80) B.log.shift(); }
function ev(B, u, text, kind) { B.events.push({ uid: u.uid, text, kind }); }

function nextActor(B) {
  const alive = living(B);
  let best = null, bestT = Infinity;
  for (const u of alive) { const t = Math.max(0, 1000 - u.tm) / (u.spd * horrorSpeedFactor(u)); if (t < bestT - 1e-9 || (Math.abs(t - bestT) < 1e-9 && u.spd > best.spd)) { bestT = t; best = u; } }
  for (const u of alive) u.tm += u.spd * horrorSpeedFactor(u) * bestT;
  best.tm = 1000;
  return best;
}
function previewOrder(B, n = 8) {
  const alive = living(B).map(u => ({ u, tm: u === B.active ? 0 : u.tm }));
  const out = [];
  while (out.length < n && alive.length) {
    let best = null, bestT = Infinity;
    for (const a of alive) { const t = Math.max(0, 1000 - a.tm) / (a.u.spd * horrorSpeedFactor(a.u)); if (t < bestT) { bestT = t; best = a; } }
    for (const a of alive) a.tm += a.u.spd * horrorSpeedFactor(a.u) * bestT;
    best.tm = 0; out.push(best.u);
  }
  return out;
}

function damageRaw(B, u, pct, why) {
  if (!u.alive) return;
  const d = Math.round(u.maxHp * pct);
  const previousFraction=u.hp/u.maxHp;
  u.hp -= d; ev(B, u, '−' + d, 'raw');
  supportEmergencyHeal(B,u,previousFraction,ev);
  if (u.hp <= 0) kill(B, u, null, why); else dunGuard(B, u);
}
// страж (def.guards): пока жив, подзащитные союзники не погибают — остаются с 1 здоровья
const guardOf = (B, u) => B.units.find(d => d.alive && d !== u && d.side === u.side && d.def.guards && d.def.guards.includes(u.def.id));
function kill(B, u, by) {
  const g = !B.over && u.alive && guardOf(B, u);
  if (g) { u.hp = 1; ev(B, u, '1 ОЗ', 'buff'); log(B, `${g.def.sn} не даёт ${u.def.sn} пасть: 1 здоровья.`, 'ctrl'); return; }
  u.hp = 0; u.alive = false; u.fx = {}; u.shield = 0; ev(B, u, '', 'death');
  baronPreventRevival(B, u); // must run before scheduling any resurrection
  if (u.def.id === 'duncan' && !u.revived && mayRevive(u) && skLv(u, 'passive') >= 7) { u.revived = true; u.pendingRevive = true; log(B, `${u.def.sn} падает… но гхола не умирает дважды.`, 'death'); return; }
  if (u.side === 'A' && B.cqGhola && !u.revived && !u.charmed && mayRevive(u)) { B.cqGhola = 0; u.revived = true; u.pendingRevive = true; u.revHp = .5; log(B, `${u.def.sn} падает… но аксолотлевый чан вернёт его в бой.`, 'death'); return; }
  baronDeathTriggers(B, u, ev); // only an irreversible death earns Greed and mark bonuses
  log(B, `${u.def.sn} выбывает из боя.`, 'death');
  if (u.side === 'A' && B.cqAvenge) { const al = B.units.filter(a => a.alive && a.side === u.side); for (const a of al) { a.fx.defUp = Math.max(a.fx.defUp || 0, 2); a.fx.counter = Math.max(a.fx.counter || 0, 2); } if (al.length) log(B, `Клятва сиетча: отряд мстит за ${u.def.sn} (Защита↑, Контратака).`); }
  if (by && by.alive && by.cqChain && by.side !== u.side && !B.over) { if (by === B.active) by.tmBonus = 999; else by.tm = 999; ev(B, by, 'Ещё ход', 'buff'); log(B, `Танец смерти: ${by.def.sn} сразу готов к новому удару.`); }
  if (has(u, 'frem')) for (const a of B.units) if (a.alive && a.side === u.side && a.def.avenge) { a.fx.defUp = 2; a.fx.counter = 2; log(B, `${a.def.sn} клянётся отомстить за ${u.def.sn}.`); }
  if (by && by.alive && by.def.killStealth) { by.fx.stealth = 2; log(B, `${by.def.sn} растворяется в песке (Скрытность).`); }
  checkOver(B);
}
function checkOver(B) {
  if (B.over) return;
  const up = side => B.units.some(u => u.side === side && (u.alive || u.pendingRevive));
  if (!up('B')) {
    if (B.wave && B.wave.remaining.length) B.wavePending = true;
    else B.over = 'A';
  }
  else if (!up('A')) B.over = 'B';
}

// Change wave after the current action has completed. Keep all allied unit objects
// (HP, TM, cooldowns, effects, resurrection flags) and replace only enemies.
function advanceWave(B) {
  if (!B.wavePending || !B.wave || !B.wave.remaining.length || B.over) return false;
  const roster = B.wave.remaining.shift();
  const next = createBattle([], roster, { desert: B.desert, seed: Math.floor(B.rng() * 0x7fffffff) });
  const enemies = next.units.filter(u => u.side === 'B');
  const old = B.units.filter(u => u.side === 'B');
  const seq = ++B.wave.seq;
  for (const e of enemies) e.uid = 'w' + seq + '_' + e.uid;
  B.units = B.units.filter(u => u.side === 'A').concat(enemies);
  B.leader.B = next.leader.B;
  B.active = null; B.actor = null; B.shots = []; B.flash = null;
  B.wave.current++; B.wavePending = false;
  log(B, 'Волна ' + (B.wave.current + 1) + '/' + B.wave.total, 'ctrl');
  computeIntents(B);
  return { old, enemies };
}

// returns true if target still alive & hit landed
function hit(B, att, tgt, dt, m, opts = {}) {
  if (!tgt.alive || B.over) return false;
  (B.shots ||= []).push({ a: att.uid, t: tgt.uid, dt });
  if (tgt.glOn && !tgt.glUsed) tgt.ultM = Math.min(100, tgt.ultM + 6);
  const eva = tgt.eva + (tgt.fx.evaUp ? .3 : 0) + (dt === 'blade' && tgt.def.evaBlade ? tgt.def.evaBlade : 0);
  if (consumeForesight(tgt, dt)) { ev(B, tgt, 'Предвидение', 'miss'); log(B, `${tgt.def.sn} предвидит удар ${att.def.sn}.`, 'ctrl'); return false; }
  if (dt !== 'voice' && dt !== 'poison' && B.rng() < eva) { ev(B, tgt, 'Уклон', 'miss'); log(B, `${tgt.def.sn} уклоняется от атаки ${att.def.sn}.`); return false; }
  let d = att.dmg * m * (0.9 + 0.2 * B.rng()) * (1 + att.dmgBonus) * horrorDamageFactor(att) * markedDamageFactor(tgt,att);
  if (att.fx.attackUp) d *= 1.2;
  if (att.fx.damageDown) d *= .8;
  if (B.leader[att.side] === 'baron' && has(att, 'hark') && tgt.fx.poison) d *= 1.4;
  if (att.def.fallenBonus) d *= 1 + att.def.fallenBonus * B.units.filter(x => x.side === att.side && !x.alive).length;
  if (opts.bonusDebuffed && isDebuffed(tgt)) d *= 1.5;
  if (att.def.debuffBonus && isDebuffed(tgt)) d *= 1 + att.def.debuffBonus;
  if (att.def.execBonus && tgt.hp / tgt.maxHp < .5) d *= 1 + att.def.execBonus;
  if (att.def.squadBonus) d *= 1 + att.def.squadBonus * living(B, att.side).filter(x => x !== att && has(x, 'hark')).length;
  if (opts.fromStealth && att.def.stealthMult) d *= att.def.stealthMult;
  if (tgt.def.boss && has(att, 'frem')) d *= 1.5;
  if (att.def.boss && tgt.shield > 0) d *= 1.3;
  if (att.cqExec && tgt.hp / tgt.maxHp < .5) d *= 1 + att.cqExec;
  if (att.cqFury) d *= 1 + att.cqFury * B.units.filter(x => x.side === att.side && !x.alive).length;
  if (att.vsFac) for (const f of tgt.def.f) if (att.vsFac[f]) d *= 1 + att.vsFac[f];
  const crit = B.rng() < att.crit; if (crit) d *= att.fx.critDown ? 1.25 : 1.5 + (att.critDamageBonus || 0);

  if (dt === 'laser' && tgt.shield > 0) {
    log(B, `РЕАКЦИЯ ХОЛЬЦМАНА! Луч ${att.def.sn} коснулся щита ${tgt.def.sn}.`, 'holtz');
    B.flash = 'holtz';
    att.shield = 0; tgt.shield = 0;
    for (const u of living(B)) damageRaw(B, u, (u === att || u === tgt) ? .5 : .2, 'holtz');
    if (B.desert) B.rhythm += 30;
    return tgt.alive;
  }
  const armor = Math.max(0, tgt.arm * (tgt.fx.armDown ? .5 : 1));
  if (dt === 'laser') d *= 1.4; else if (dt !== 'voice' && dt !== 'poison') d *= (1 - armor);
  if (tgt.fx.defUp) d *= .7;
  d = Math.max(1, Math.round(d));
  let toShield = 0, toHp = 0;
  if (dt === 'fast' && tgt.shield > 0) { toShield = Math.min(tgt.shield, Math.round(d * .25)); }
  else if (dt === 'voice' || dt === 'poison') { toHp = d; }
  else { toShield = Math.min(tgt.shield, d); toHp = d - toShield; }
  if (tgt.cqLast && toHp >= tgt.hp) { toHp = Math.max(0, tgt.hp - 1); tgt.cqLast = 0; tgt.fx.evaUp = Math.max(tgt.fx.evaUp || 0, 2); ev(B, tgt, 'Предзнание', 'buff'); log(B, `${tgt.def.sn} предвидит смертельный удар и уходит от него (1 ОЗ, Уклонение↑).`, 'ctrl'); }
  const previousFraction=tgt.hp/tgt.maxHp;
  tgt.shield -= toShield; tgt.hp -= toHp;
  if(toHp)supportEmergencyHeal(B,tgt,previousFraction,ev);
  const what = toHp ? `${toHp}${toShield ? ` (+${toShield} по щиту)` : ''}` : `${toShield} по щиту`;
  ev(B, tgt, (toHp ? '−' + toHp : '◇−' + toShield) + (crit ? '!' : ''), toHp ? (crit ? 'crit' : 'dmg') : 'shield');
  log(B, `${att.def.sn} → ${tgt.def.sn}: ${what}${crit ? ', крит' : ''}${dt === 'fast' && toShield && !toHp ? ' — щит остановил пулю' : ''}.`);
  if (toHp && B.leader[tgt.side] === 'leto' && has(tgt, 'atr')) for (const a of living(B, tgt.side)) if (a !== tgt && has(a, 'atr')) a.tm = Math.min(999, a.tm + 50);
  if (toHp && att.cqLeech && att.alive) { const h = Math.min(att.maxHp - att.hp, Math.round(toHp * att.cqLeech)); if (h > 0) { att.hp += h; ev(B, att, '+' + h, 'heal'); } }
  if (tgt.hp <= 0) { const nr = tgt.noRev; if (opts.noRev) tgt.noRev = true; kill(B, tgt, att); if (!tgt.alive) return false; tgt.noRev = nr; }
  dunGuard(B, tgt);
  return true;
}

function resist(B, att, tgt, k) {
  if (tgt.def.immune && tgt.def.immune.includes(k)) return true;
  if (tgt.immune && tgt.immune.includes(k)) return true;
  if (k === 'fear' && tgt.fearImmune) return true;
  if (k === 'voiced' && has(tgt, 'bg')) return true;
  const ch = Math.min(.95, Math.max(.15, .6 + att.pot - tgt.ten));
  return B.rng() >= ch;
}
function applyFx(B, att, tgt, k, n, chance = 1) {
  if (!tgt.alive || !FX[k]) return;
  if (!canApplyStatus(tgt, att, Boolean(FX[k].bad))) return;
  if (FX[k].bad) {
    if (B.rng() >= chance) return;
    if (resist(B, att, tgt, k)) { ev(B, tgt, 'Сопр.', 'miss'); log(B, `${tgt.def.sn} сопротивляется эффекту «${FX[k].n}».`); return; }
  }
  if (k === 'bleed') { tgt.bleedN = Math.min(5, (tgt.fx.bleed ? tgt.bleedN || 0 : 0) + 1); tgt.fx.bleed = n; }
  tgt.fx[k] = Math.max(tgt.fx[k] || 0, n);
  if(k==='isolation' && att && att.side!==tgt.side)supportOnIsolation(B,att,tgt,{living,ev});
  if (k === 'horror' && att && att.side !== tgt.side) {
    const team = living(B, att.side), barons = team.filter(x => x.def.passive?.harkonnenGreed);
    if (barons.length) {
      if (team.some(x => x.def.id === 'rabban')) tgt.horrorStrength = 2;
      for (const baron of barons) baron.fx.defUp = Math.max(baron.fx.defUp || 0, 2);
      for (const ally of team) if (has(ally, 'hark') && canApplyStatus(ally, barons[0], false))
        ally.fx.attackUp = Math.max(ally.fx.attackUp || 0, 2);
    }
  }
  ev(B, tgt, k === 'bleed' && tgt.bleedN > 1 ? `${FX[k].n} ×${tgt.bleedN}` : FX[k].n, FX[k].bad ? 'debuff' : 'buff');
  if (FX[k].bad && att && att.side !== tgt.side && B.leader[att.side] === 'erasmus' && (has(att, 'mach') || MENTAT(att))) for (const a of living(B, att.side)) if (has(a, 'mach') || MENTAT(a)) a.tm = Math.min(999, a.tm + 80);
}

// прямое оглушение (ульты): без сопротивления, но с учётом иммунитета
function stunFx(B, e) {
  if (e.immune && e.immune.includes('stun')) { ev(B, e, 'Иммун.', 'miss'); return false; }
  e.fx.stun = 1; ev(B, e, 'Оглушение', 'debuff'); return true;
}
function validTargets(B, u, ab) {
  if (ab.tgt !== 'enemy') return [];
  let ts = living(B, foe(u.side));
  if (ab.anyTgt) return ts;
  { const np = ts.filter(x => !dunShielded(B, x)); if (np.length) ts = np; }
  if (!u.def.ignoreTaunt) { const t = ts.filter(x => x.fx.taunt); if (t.length) return t; }
  const vis = ts.filter(x => !x.fx.stealth);
  return vis.length ? vis : ts;
}
function abilityReady(B, u, key) {
  if (key === 'gl') return !!(u.glOn && !u.glUsed && glMeter(B, u) >= 100);
  const ab = u.def[key];
  if (!ab) return false;
  if (key === 'basic') return true;
  if (u.cd[key] > 0) return false;
  if (ab.spice && B.spice[u.side] < ab.spice) return false;
  return true;
}


export { mkRng, createBattle, advanceWave, has, living, foe, isDebuffed, log, ev, nextActor, previewOrder, damageRaw, guardOf, kill, checkOver, hit, resist, applyFx, stunFx, validTargets, abilityReady };
