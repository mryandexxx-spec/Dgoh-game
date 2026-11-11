// logic/battle/turns.js — строки 434–583 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { computeIntents } from './ai.js';
import { bossTurn, wormFrenzy } from './raid.js';
import { applyFx, checkOver, damageRaw, ev, foe, has, hit, kill, living, log, stunFx, validTargets } from './engine.js';
import { abFor, dunBuff, dunGuard, skLv, skMult } from './skills.js';
import { FX } from '../../data/fx.js';
import { strongestAlly, orderedAssist } from './baron-mechanics.js';

// ---- turn lifecycle ----
// returns {skip} ; handles ticks & forced actions
function startTurn(B, u) {
  B.active = u; B.events = []; B.flash = null; B.shots = []; B.actor = null;
  if (u.fx.poison) { const d = Math.round(u.maxHp * .08); u.hp -= d; ev(B, u, '−' + d, 'poison'); log(B, `Яд терзает ${u.def.sn}: −${d}.`); if (u.hp <= 0) { kill(B, u, null); if (!u.alive) return { skip: true }; } dunGuard(B, u); }
  if (u.fx.bleed) { const n = u.bleedN || 1, d = Math.round(u.maxHp * .04 * n); u.hp -= d; ev(B, u, '−' + d, 'poison'); log(B, `Кровотечение${n > 1 ? ' ×' + n : ''}: ${u.def.sn} −${d}.`); if (u.hp <= 0) { kill(B, u, null); if (!u.alive) return { skip: true }; } dunGuard(B, u); }
  if (u.regen && u.hp < u.maxHp) { const h = Math.min(u.maxHp - u.hp, Math.round(u.maxHp * u.regen)); u.hp += h; if (h) ev(B, u, '+' + h, 'heal'); }
  if (u.def.shRegen && u.maxShield) { u.shield = Math.min(u.maxShield, u.shield + Math.round(u.maxShield * u.def.shRegen)); }
  for (const k in u.cd) if (u.cd[k] > 0) u.cd[k]--;
  if (u.def.id === 'liet') { const w = living(B, u.side).filter(a => a.hp < a.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; if (w) { const h = Math.min(w.maxHp - w.hp, Math.round(w.maxHp * .08 * (1 + (u.def.healUp || 0)))); w.hp += h; ev(B, w, '+' + h, 'heal'); } }
  if (u.def.id === 'erasmus') { const es = living(B, foe(u.side)).filter(e => !e.def.boss); if (es.length) { const e = es[Math.floor(B.rng() * es.length)]; e.fx.armDown = Math.max(e.fx.armDown || 0, 2); ev(B, e, 'Броня↓', 'debuff'); } const w = living(B, u.side).filter(a => a.hp < a.maxHp).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; if (w) { const h = Math.min(w.maxHp - w.hp, Math.round(w.maxHp * .1)); w.hp += h; ev(B, w, '+' + h, 'heal'); } }
  if (u.fx.stun) { delete u.fx.stun; decFx(u); log(B, `${u.def.sn} оглушён и пропускает ход.`, 'ctrl'); ev(B, u, 'Оглушение', 'debuff'); return { skip: true }; }
  if (u.fx.fear) { delete u.fx.fear; decFx(u); log(B, `${u.def.sn} скован Страхом и пропускает ход.`, 'ctrl'); ev(B, u, 'Страх', 'debuff'); return { skip: true }; }
  if (u.fx.voiced) {
    delete u.fx.voiced; decFx(u);
    const allies = living(B, u.side).filter(x => x !== u);
    if (allies.length) {
      const t = allies[Math.floor(B.rng() * allies.length)];
      log(B, `Голос подчиняет ${u.def.sn}: удар по своему — ${t.def.sn}!`, 'ctrl');
      hit(B, u, t, u.def.basic.dt === 'laser' ? 'fast' : u.def.basic.dt, u.def.basic.m);
    } else log(B, `${u.def.sn} борется с Голосом и теряет ход.`, 'ctrl');
    return { skip: true };
  }
  decFx(u);
  return { skip: false };
}
function decFx(u) { for (const k in u.fx) { if (k === 'voiced' || k === 'fear' || k === 'stun') continue; if (--u.fx[k] <= 0) delete u.fx[k]; } if (!u.fx.bleed) u.bleedN = 0; if (!u.fx.horror) u.horrorStrength = 1; }

const glMeter = (B, u) => Math.max(u.ultM || 0, u.def && !u.def.boss && u.def.legendary && B.spice ? (B.spice[u.side] || 0) : 0);
function glCharge(B, src, n) { for (const x of B.units) if (x.alive && x.glOn && !x.glUsed && x.side === src.side) x.ultM = Math.min(100, x.ultM + (x === src ? n : 4)); }
function glAct(B, u, tuid) {
  u.glUsed = true; u.ultM = 0; B.flash = 'gl'; B.glCast = u.uid; B.glKind = u.def.gl.kind || 'prophecy'; B.glTarget = null;
  if (B.glKind === 'devour') {
    if (!glExec(B, u, tuid, GL_EXEC.devour)) return;
    for (const a of living(B, u.side)) if (a !== u) a.tm = Math.min(999, a.tm + 500);
    B.spice[u.side] = Math.min(100, B.spice[u.side] + 20);
    return;
  }
  // Recovered Baron GL: army strike across the enemy formation.
  // Numeric values are configurable rather than hardcoded as approved balance.
  if (B.glKind === 'fall-of-atreides') {
    const gl = u.def.gl, mult = Number.isFinite(gl.damageMultiplier) ? gl.damageMultiplier : 3;
    const armorTurns = Number.isInteger(gl.armorDownTurns) ? gl.armorDownTurns : 3;
    const atrBonus = Number.isFinite(gl.atreidesBonus) ? gl.atreidesBonus : .5;
    const healPerKill = Number.isFinite(gl.healPerKill) ? gl.healPerKill : .2;
    log(B, `${u.def.sn}: «${gl.n}»`, u.side === 'A' ? 'actA' : 'actB');
    const targets = living(B, foe(u.side)).slice();
    for (const t of targets) {
      if (B.over) break;
      const m = mult * (has(t, 'atr') ? 1 + atrBonus : 1);
      hit(B, u, t, 'fast', m);
      if (!t.alive) {
        const heal = Math.min(u.maxHp - u.hp, Math.round(u.maxHp * healPerKill));
        if (heal > 0) { u.hp += heal; ev(B, u, '+' + heal, 'heal'); }
      } else applyFx(B, u, t, 'armDown', armorTurns);
    }
    checkOver(B);
    return;
  }
  if (B.glKind === 'mirror') {
    const sm = 1 + .04 * ((u.sk && u.sk.ult) || 1);
    log(B, `${u.def.sn}: «${u.def.gl.n}»`, u.side === 'A' ? 'actA' : 'actB');
    log(B, 'Зеркальное лицо Эразма отражает каждого врага — их воля переписана.', 'ctrl');
    for (const e of living(B, foe(u.side))) { if (e.def.boss) { hit(B, u, e, 'voice', 10 * sm); if (B.over) break; continue; } damageRaw(B, e, .5); if (e.alive) { for (const k in e.fx) if (!FX[k].bad) delete e.fx[k]; e.shield = 0; stunFx(B, e); } if (B.over) break; }
    const rest = living(B, foe(u.side)).filter(e => !e.def.boss);
    if (!B.over && rest.length > 1) { const t = rest.sort((a, b) => b.dmg * (b.hp / b.maxHp) - a.dmg * (a.hp / a.maxHp))[0]; t.side = u.side; t.charmed = true; delete t.fx.stun; for (const k in t.fx) if (FX[k].bad) delete t.fx[k]; t.tm = 999; B.glTarget = t.uid; ev(B, t, 'ПЕРЕПРОГРАММИРОВАН', 'crit'); log(B, `${t.def.sn} перепрограммирован и сражается за ${u.def.sn}!`, 'death'); }
    for (const a of living(B, u.side)) if (a !== u) a.tm = Math.min(999, a.tm + 300);
    checkOver(B); return;
  }
  // prophecy (Муад'Диб, пакет 3): казнь выбранного врага без воскрешения + оглушение остальных; союзникам — исцеление и защита
  glExec(B, u, tuid, GL_EXEC.prophecy);
  for (const a of living(B, u.side)) { const h = Math.min(a.maxHp - a.hp, Math.round(a.maxHp * .4)); a.hp += h; if (h) ev(B, a, '+' + h, 'heal'); delete a.fx.poison; delete a.fx.fear; delete a.fx.voiced; a.fx.defUp = 3; a.fx.evaUp = 3; }
  B.spice[u.side] = Math.min(100, B.spice[u.side] + 30);
}
// общий путь ульт «казнь + оглушение»: цель — выбранный враг (по умолчанию босс, иначе сильнейший); босса бьёт Голосом
const GL_EXEC = {
  devour: { boss: 8, noRev: false, pre: t => `Песок расступается под ${t.def.sn} — Шаи-Хулуд пришёл на зов!`, end: t => `Червь поглощает ${t.def.sn}!` },
  prophecy: { boss: 6, noRev: true, pre: t => `Великий червь поднимается из песка под ${t.def.sn} по воле пророка!`, end: t => `${t.def.sn} исчезает в пасти червя — возврата нет.` },
};
function glExec(B, u, tuid, P) {
  const foes = living(B, foe(u.side)), sm = 1 + .04 * ((u.sk && u.sk.ult) || 1);
  const t = foes.find(x => x.uid === tuid) || foes.find(x => x.def.boss) || foes.slice().sort((a, b) => (b.dmg * (b.def.leader ? 1.3 : 1)) - (a.dmg * (a.def.leader ? 1.3 : 1)))[0];
  log(B, `${u.def.sn}: «${u.def.gl.n}»`, u.side === 'A' ? 'actA' : 'actB');
  if (!t) return null;
  B.glTarget = t.uid;
  log(B, P.pre(t), 'worm');
  if (t.def.boss) hit(B, u, t, 'voice', P.boss * sm);
  else { t.shield = 0; if (P.noRev) t.noRev = true; ev(B, t, 'ПОГЛОЩЁН', 'crit'); log(B, P.end(t), 'death'); kill(B, t, u); }
  for (const e of living(B, foe(u.side))) if (!e.def.boss) stunFx(B, e);
  if (living(B, foe(u.side)).some(e => !e.def.boss)) log(B, 'Сотрясение песка оглушает остальных врагов.', 'ctrl');
  return t;
}
function act(B, u, key, targetUid) {
  B.actor = u.uid; B.glCast = null; B.lastKey = key;
  if (u.def.boss) return bossTurn(B, u);
  if (key === 'gl') return glAct(B, u, targetUid);
  glCharge(B, u, 12);
  const ab = abFor(u, key);
  if (ab.spice) B.spice[u.side] -= ab.spice;
  const sm = ab.flatM ? 1 : skMult(skLv(u, key));
  if (key !== 'basic') u.cd[key] = ab.cd - (skLv(u, key) >= 7 ? 1 : 0);
  const damaging = !!ab.dt;
  let fromStealth = false;
  if (damaging && u.fx.stealth) { fromStealth = true; delete u.fx.stealth; }
  log(B, `${u.def.sn}: «${ab.n}»`, u.side === 'A' ? 'actA' : 'actB');
  const allies = living(B, u.side), enemies = living(B, foe(u.side));
  let targets = [];
  if (ab.tgt === 'enemy') { const vt = validTargets(B, u, ab); targets = [vt.find(x => x.uid === targetUid) || vt[0]].filter(Boolean); }
  else if (ab.tgt === 'enemies') targets = enemies;
  let lastTarget = null;
  for (const t of targets) {
    lastTarget = t;
    let alive = true;
    if (ab.execute && !t.def.boss && t.hp / t.maxHp < ab.execute) {
      log(B, `Гом джаббар: ${t.def.sn} не выдерживает испытания.`, 'death'); ev(B, t, 'КАЗНЬ', 'crit'); kill(B, t, u); alive = t.alive;
    } else if (damaging) { const o = { bonusDebuffed: ab.bonusDebuffed, fromStealth, noRev: ab.noRev };
      alive = hit(B, u, t, ab.dt, ab.m * sm, o);
      for (let h = 1; h < (ab.hits || 1) && alive && t.alive && !B.over; h++) { log(B, `${u.def.sn} бьёт снова!`); alive = hit(B, u, t, ab.dt, ab.m * sm, o); } }
    if (alive) for (const [k, n, to, ch] of ab.fx || []) if (to === 't') applyFx(B, u, t, k, n, ch ?? 1);
    if (alive && key === 'basic' && u.def.doubleBasic && t.alive && !B.over && B.rng() < u.def.doubleBasic) { log(B, `${u.def.sn} бьёт повторно!`); hit(B, u, t, ab.dt, ab.m * .6); }
    if (alive && key === 'basic' && u.cqOnHit && t.alive && !B.over) for (const [k, n, ch] of u.cqOnHit) applyFx(B, u, t, k, n, ch);
    if (alive && key === 'basic' && B.leader[u.side] === 'baron' && has(u, 'hark') && !(ab.fx || []).some(f => f[0] === 'poison')) applyFx(B, u, t, 'poison', 2, .75);
    if (B.over) break;
  }
  // A declarative ordered assist does not call act() and cannot recurse through
  // ally attacks. The helper uses its ordinary base damage, but no extra turn.
  if (ab.assistFaction && key === 'basic' && lastTarget && lastTarget.alive && !B.over) {
    const best = strongestAlly(B.units, u, ab.assistFaction);
    if (best) {
      const bonus = lastTarget.fx.horror ? (1 + (ab.assistHorrorBonus || 0)) : 1;
      orderedAssist(B, u, lastTarget, best, (ab.assistMultiplier || 1) * bonus, hit);
    }
    const extra = allies.find(a => a !== u && a.def.id === ab.extraAssistId);
    if (extra && lastTarget.alive && !B.over) {
      const bonus = lastTarget.fx.horror ? (1 + (ab.assistHorrorBonus || 0)) : 1;
      orderedAssist(B, u, lastTarget, extra, (ab.extraAssistMultiplier || 1) * bonus, hit);
    }
  }
  if (ab.selfHealStaggered) {
    // Three visible healing pulses, total 30% in the recovered base skill.
    const each = ab.selfHealStaggered / 3;
    for (let i = 0; i < 3 && u.alive; i++) {
      const h = Math.min(u.maxHp - u.hp, Math.round(u.maxHp * each));
      if (h > 0) { u.hp += h; ev(B, u, '+' + h, 'heal'); }
    }
  }
  if (ab.harkFx) {
    for (const [k, n] of ab.harkFx) for (const a of living(B, u.side))
      if (has(a, 'hark')) applyFx(B, u, a, k, n);
  }
  if (ab.enemyLeaderFx && !B.over) {
    const t = living(B, foe(u.side)).find(a => a.idx === 0);
    if (t) for (const [k, n] of ab.enemyLeaderFx) applyFx(B, u, t, k, n);
  }
  if (ab.wormCall && !B.over) {
    B.flash = ab.wormSmall ? 'wormSmall' : 'worm'; B.rhythm = 0;
    log(B, `${u.def.sn} встаёт на крючья: червь идёт по его воле!`, 'worm');
    for (const e of living(B, foe(u.side))) { if (e.def.boss) hit(B, u, e, 'voice', 3 * sm); else damageRaw(B, e, ab.wormCall * sm); }
  }
  for (const [k, n, to] of ab.fx || []) {
    if (to === 'self') applyFx(B, u, u, k, n);
    if (to === 'allies') for (const a of living(B, u.side)) applyFx(B, u, a, k, n);
    if (to === 'enemies' && !B.over) for (const e of living(B, foe(u.side))) applyFx(B, u, e, k, n);
  }
  if (ab.tm) {
    if (ab.tm.self) u.tmBonus = (u.tmBonus || 0) + ab.tm.self;
    if (ab.tm.allies) for (const a of living(B, u.side)) if (a !== u) a.tm = Math.min(999, a.tm + ab.tm.allies); else u.tmBonus = (u.tmBonus || 0) + ab.tm.allies;
    if (ab.tm.enemies) for (const e of living(B, foe(u.side))) e.tm = Math.max(0, e.tm + ab.tm.enemies);
  }
  if (ab.shieldSelf && u.maxShield) { u.shield = u.maxShield; ev(B, u, 'Щит', 'buff'); }
  if (ab.heal) for (const a of living(B, u.side)) { const h = Math.min(a.maxHp - a.hp, Math.round(a.maxHp * ab.heal * sm * (1 + (u.def.healUp || 0)))); a.hp += h; if (h) ev(B, a, '+' + h, 'heal'); }
  if (ab.cleanse) for (const a of living(B, u.side)) { delete a.fx.poison; delete a.fx.fear; delete a.fx.voiced; }
  if (ab.unstealth) for (const e of living(B, foe(u.side))) delete e.fx.stealth;
  // counterattack
  if (ab.tgt === 'enemy' && damaging && lastTarget && lastTarget.alive && u.alive && !B.over) {
    const t = lastTarget;
    const ch = t.fx.counter ? 1 : t.counterChance;
    if (ch && B.rng() < ch) {
      log(B, `${t.def.sn} контратакует!`);
      const bd = t.def.basic.dt === 'laser' ? 'fast' : t.def.basic.dt;
      const ok = hit(B, t, u, bd, t.def.basic.m * .8);
      if (ok && t.def.counterFear) applyFx(B, t, u, 'fear', 1);
    }
  }
  // spice & worm
  B.spice[u.side] = Math.min(100, B.spice[u.side] + 10);
  if (B.desert && damaging && !has(u, 'frem') && !u.noRhythm) B.rhythm += ab.dt === 'laser' ? 10 : 4;
  if (B.desert && B.rhythm >= 100 && !B.over) { if (B.raid) wormFrenzy(B); else wormStrike(B); }
}
function wormStrike(B) {
  B.rhythm = 0; B.flash = 'worm';
  const cands = living(B).filter(x => !has(x, 'frem') && !x.wormImmune);
  log(B, 'ШАИ-ХУЛУД! Ритм шагов привлёк червя.', 'worm');
  for (let i = 0; i < 2 && cands.length; i++) {
    const t = cands.splice(Math.floor(B.rng() * cands.length), 1)[0];
    log(B, `Червь обрушивается на ${t.def.sn}.`, 'worm');
    damageRaw(B, t, .6, 'worm');
  }
}
function endTurn(B, u) {
  u.tm = Math.min(999, u.tmBonus || 0); u.tmBonus = 0;
  for (const x of B.units) if (x.pendingRevive) { x.pendingRevive = false; x.alive = true; x.hp = Math.max(1, Math.round(x.maxHp * (x.revHp || 1))); x.shield = x.maxShield; x.tm = 999; x.fx = {}; x.revivedNow = true; ev(B, x, 'ВОЗРОЖДЕНИЕ', 'heal'); log(B, `${x.def.sn} поднимается снова: ${Math.round((x.revHp || 1) * 100)}% здоровья, щит и полная шкала хода!`, 'worm'); x.revHp = 0;
    if (x.def.id === 'duncan' && skLv(x, 'passive') >= 7) { dunBuff(B, x, 'гхола встаёт на защиту'); if (living(B, x.side).some(p => p.def.id === 'paul' || p.def.id === 'muaddib')) { x.dunProtect = true; log(B, `Пока ${x.def.sn} жив, враги не могут выбрать целью Пола.`, 'ctrl'); } } }
  B.active = null; B.round++;
  checkOver(B);
  computeIntents(B);
}


export { startTurn, decFx, glMeter, glCharge, glAct, act, wormStrike, endTurn };
