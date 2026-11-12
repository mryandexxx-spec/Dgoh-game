// ui/battle/battle-ui.js — строки 4130–4472 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../views/rules.js'; // порядок исполнения
import { hourglass, spiceUser } from '../../boot.js';
import { ptRound } from '../portrait.js';
import { cqApply, cqFinish } from '../views/conq.js';
import { GEAR_SVG, LOG_SVG } from '../overlays/battle-settings.js';
import { MOUSE_SVG } from '../mouse.js';
import { renderNotes } from '../notifications.js';
import { fxText } from '../fx-text.js';
import { statInc } from '../../logic/stats.js';
import { trialFinish } from '../views/trials.js';
import { WORM_BADGE } from '../hero-window.js';
import { sleepStages } from '../../render3d/scenes/camp.js';
import { raidPct, raidReward } from '../views/raid.js';
import { SQ, openSquadSel, set_SQ } from '../overlays/squad-select.js';
import { closeInfo, openInfo, wormIco } from '../overlays/info.js';
import { closeOverlay } from '../overlays/detail.js';
import { abDescLv } from '../../logic/skill-up.js';
import { render, registerStoryView, registerBaronView } from '../router.js';
import { renderStoryEvents } from '../views/story-events.js';
import { renderBaronJourney } from '../views/baron-journey.js';
import { glyph, skillSvg, starStr, toast } from '../common.js';
import { battleMark, errLog } from '../../core/errlog.js';
import { campSquad, enGet, enRefund, enSpend, prog, sideOk } from '../../logic/progress.js';
import { BT, S, set_BT, tickWater } from '../../core/state.js';
import { persist } from '../../core/save.js';
import { TIER_COL, grantFrags, raidFrags } from '../../logic/gear.js';
import { RELIC_COL, isLegend } from '../../logic/relics.js';
import { CRY_3STAR, CRY_JOURNEY, CRY_WIN, campReward, enemyProg } from '../../logic/economy.js';
import { JK, JP, JR } from '../../data/journeys.js';
import { NODES, NODE_SCENES, nodeCost, nodeEn, nodeOpen, nodeTitle } from '../../data/campaigns.js';
import { gfxLevel } from '../../render3d/quality.js';
import { Arena3D } from '../../render3d/scenes/arena.js';
import { HAS3D, HAS_GL, loadB3 } from '../../render3d/base.js';
import { FXLayer } from '../../render2d/fx-layer.js';
import { SceneBG, reduceMotion } from '../../render2d/scene-bg.js';
import { figureSVG, portrait, wormSVG } from '../../render2d/figures.js';
import { ghash } from '../../data/looks.js';
import { aiPlan, hasPrescience } from '../../logic/battle/ai.js';
import { act, endTurn, glMeter, startTurn } from '../../logic/battle/turns.js';
import { abilityReady, createBattle, advanceWave, foe, living, nextActor, previewOrder, validTargets } from '../../logic/battle/engine.js';
import { MOVES, PHASES } from '../../data/boss.js';
import { skLv } from '../../logic/battle/skills.js';
import { CH, MENTAT } from '../../data/chars.js';
import { FACTIONS, FX, ROLES } from '../../data/fx.js';
import { accXP, fragLines } from '../rewards.js';
import { amt, fmt } from '../../core/format.js';
import { $ } from '../../core/dom.js';
import { quest } from '../../logic/daily.js';
import { grantShards } from '../../logic/rewards.js';
import { finishStoryUnlockBattle } from '../../logic/bh94-story-battle.js';
import { STORY_UNLOCK_EVENTS } from '../../data/bh94-unlock-events.js';
import { prepareBaronBH9Battle, finishBaronBH9Battle } from '../../logic/baron-bh9-battle.js';
import { todayKey } from '../../logic/economy.js';

registerStoryView(renderStoryEvents);
registerBaronView(renderBaronJourney);

// ===== battle UI =====
function startBattle(i) {
  tickWater();
  const en = nodeEn(i), c = nodeCost(i), sq = campSquad(i).filter(id => sideOk(NODES[i].camp, id) && prog(id).stars);
  if (enGet(en) < c) return openInfo(`need:${en}:${c}`);
  if (!sq.length) return openSquadSel('camp', i);
  enSpend(en, c); persist();
  const n = NODES[i];
  launch({ mode: 'camp', dlg: !!n.dlg && !S.skipDlg && !S.seenDlg[i], scene: NODE_SCENES[i], i, title: nodeTitle(i), desert: n.desert, squad: sq, enemy: n.enemy.map(id => enemyProg(id, n.lvl, n.m === 9)) });
}
let LAUNCH_WAIT = false, B3_TRIED = false;
function launch(cfg) {
  if (cfg.mode === 'baron_legend' && (!cfg.prepared?.ok || !cfg.prepared.battle || !Number.isInteger(cfg.prepared.stageIndex))) return;
  if (cfg.mode === 'story_unlock' && (!cfg.prepared?.ok || !cfg.prepared.battle ||
      !STORY_UNLOCK_EVENTS[cfg.prepared.eventId] ||
      !Number.isInteger(cfg.prepared.stageIndex))) return;
  if (!HAS3D && HAS_GL && !B3_TRIED) {   // фаза 4: чанк Babylon ещё грузится — бой ждёт его (2D-бой не подставляем)
    if (LAUNCH_WAIT) return; LAUNCH_WAIT = true;
    $('#overlay').innerHTML = `<div class="battle b3load"><div class="b3spin">Загрузка 3D…</div></div>`;
    loadB3().then(() => { LAUNCH_WAIT = false; B3_TRIED = true; launch(cfg); });   // не загрузился — 2D-бой
    return;
  }
  set_SQ(null);
  closeInfo(true);
  if (cfg.mode !== 'story_unlock' && cfg.mode !== 'baron_legend') { let lg = 0; cfg.squad = cfg.squad.filter(id => !isLegend(id) || !lg++); }
  sleepStages();
  const squadData = (cfg.mode === 'story_unlock' || cfg.mode === 'baron_legend') ? [] : cfg.squad.map(id => ({ id, ...prog(id) }));
  if (cfg.scriptedMuaddib && cfg.mode === 'journey' && cfg.i >= 3) squadData.push({ id: 'muaddib', lvl: 85, stars: 7, gear: 13, relic: cfg.i === 3 ? 5 : 6, gl: false });
  const waves = Array.isArray(cfg.waves) && cfg.waves.length ? cfg.waves : null;
  const B = (cfg.mode === 'story_unlock' || cfg.mode === 'baron_legend') ? cfg.prepared.battle : createBattle(squadData, waves ? waves[0] : cfg.enemy || [], { desert: cfg.desert, seed: Date.now() & 0xffffff, boss: cfg.boss, waves: waves ? waves.slice(1) : null });
  if (cfg.mode === 'conq' && typeof cqApply === 'function') cqApply(B, cfg);
  set_BT({ B, cfg, i: cfg.i, auto: BT?.autoPref ?? false, autoPref: BT?.autoPref ?? false, speed: Math.min(4, BT?.speedPref ?? 1), speedPref: Math.min(4, BT?.speedPref ?? 1), timer: null, waiting: null, sel: 'basic', autoTargetUid: null, autoTaunts: [], done: false });
  $('#overlay').innerHTML = `<div class="battle ${B.desert ? 'desert' : ''}" id="battle"><canvas class="bgc" id="bgc"></canvas><div class="bwrap" id="bwrap"></div><canvas class="fxc" id="fxc"></canvas><div class="flash" id="flash"></div></div>`;
  BT.arena = null;
  if (HAS3D) { try { BT.arena = new Arena3D($('#bgc'), cfg.scene || 'desert', B); } catch (e) { console.warn('3D недоступно', e); BT.arena = null; const nc = document.createElement('canvas'); nc.className = 'bgc'; nc.id = 'bgc'; $('#bgc').replaceWith(nc); } }
  if (!BT.arena) new SceneBG($('#bgc'), cfg.scene || 'desert', .36);
  else { const A = BT.arena; A.onLost = () => { if (!BT || BT.arena !== A) return; BT.arena = null; try { A.dispose(); } catch (e) {} const nc = document.createElement('canvas'); nc.className = 'bgc'; nc.id = 'bgc'; const oc = $('#bgc'); if (oc) oc.replaceWith(nc); new SceneBG(nc, cfg.scene || 'desert', .36); const bt = $('#battle'); if (bt) bt.classList.remove('raid3d', 'squad3d', 'compact-world-hud', 'pkg9'); BT.pkg9 = false; BT.drawerOpen = false; try { renderBattle(); } catch (e) { errLog('2d', e); } toast('3D-графика сброшена системой — бой продолжается в упрощённом виде'); }; }
  battleMark(cfg);
  if (BT.arena && B.raid) $('#battle').classList.add('raid3d');
  // A2: только обычные 3D-бои. Рейд/босс и 2D fallback оставляют исходный HUD.
  if (BT.arena && !B.raid) {
    $('#battle').classList.add('squad3d');
    if (gfxLevel() === 'low') $('#battle').classList.add('compact-world-hud');
  }
  BT.pkg9 = !!(BT.arena && !B.raid && !B.units.some(u => u.def.boss));
  BT.drawerOpen = false;
  BT.hudCompact = gfxLevel() === 'low';
  BT.hudVisible = true;
  if (BT.pkg9) $('#battle').classList.add('pkg9');
  BT.fx = new FXLayer($('#fxc'));
  if (typeof renderNotes === 'function') renderNotes();
  renderBattle();
  if (cfg.dlg) playDialog(cfg.i, () => { S.seenDlg[cfg.i] = 1; persist(); if (BT && !BT.done) later(step, 300); });
  else later(step, 500);
}
let DLG = null;
function playDialog(i, done) {
  const st = NODES[i]; DLG = { i, lines: [[null, st.story]].concat(st.dlg || []), k: 0, done, inBattle: !!done };
  renderDialog();
}
function renderDialog() {
  const host = DLG.inBattle ? $('#battle') : $('#overlay2'); if (!host) return;
  const [sp, text, side] = DLG.lines[DLG.k], def = sp && CH[sp], last = DLG.k === DLG.lines.length - 1;
  let el = host.querySelector('.dlgwrap'); if (!el) { el = document.createElement('div'); el.className = 'dlgwrap'; host.appendChild(el); }
  el.innerHTML = `<div class="dlgdim"></div><div class="dlg ${side === 'e' ? 'enemy' : ''} ${def ? '' : 'narr'}" data-dlgnext="1" role="dialog" aria-live="polite">
    ${def ? `<div class="dlgfig">${figureSVG(def, true)}</div>` : ''}
    <div class="dlgbox"><div class="dlgname">${def ? def.n : sp || `${NODES[DLG.i].ch} · ${NODES[DLG.i].n}`}</div><p>${text}</p>
      <div class="dlgact"><span class="mono">${DLG.k + 1}/${DLG.lines.length}</span><button class="btn mini" data-dlgskip="1">Пропустить</button><button class="btn go mini" data-dlgnext="1">${last ? (DLG.inBattle ? 'В бой' : 'Закрыть') : 'Далее'}</button></div></div></div>`;
}
function dlgNext() { if (!DLG) return; if (DLG.k >= DLG.lines.length - 1) return dlgEnd(); DLG.k++; renderDialog(); }
function dlgEnd() { if (!DLG) return; const d = DLG; DLG = null; document.querySelectorAll('.dlgwrap').forEach(e => e.remove()); if (d.done) d.done(); }
function later(fn, ms) { clearTimeout(BT.timer); BT.timer = setTimeout(() => { if (BT && BT.pop) BT.resume = fn; else safeRun(fn); }, (ms ?? 750) / BT.speed); }
function safeRun(fn) { try { fn(); } catch (e) { errLog('battle', e); if (!BT || !BT.B || BT.done) return; BT.errN = (BT.errN || 0) + 1; BT.hold = false; if (BT.B.over || BT.errN > 6) { try { finish(); } catch (e2) { errLog('finish', e2); } return; } BT.waiting = null; clearTimeout(BT.timer); BT.timer = setTimeout(() => safeRun(step), 500); } }
const FX_ICONS = {
  bleed: '<path d="M8 1.5c2 3 4 5.2 4 7.6a4 4 0 01-8 0C4 6.7 6 4.5 8 1.5z"/><path d="M6.2 9.4a1.9 1.9 0 001.8 1.8" fill="none" stroke="#1a0f0a" stroke-width=".9" stroke-linecap="round"/>',
  critDown: '<path d="M8 1.5l1.6 3.6 3.9.4-2.9 2.6.8 3.8L8 10l-3.4 1.9.8-3.8L2.5 5.5l3.9-.4z" opacity=".45"/><path d="M8 4.5v8M5.4 9.9L8 12.5l2.6-2.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  poison: '<path d="M8 1.5c2.2 3.3 4.4 5.5 4.4 8a4.4 4.4 0 01-8.8 0c0-2.5 2.2-4.7 4.4-8z"/><circle cx="6.6" cy="9.6" r="1" fill="#1a0f0a"/><circle cx="9.4" cy="11.2" r=".8" fill="#1a0f0a"/>',
  fear: '<path d="M8 2a5 5 0 00-5 5c0 1.7.8 2.9 1.8 3.6V13h6.4v-2.4C12.2 9.9 13 8.7 13 7a5 5 0 00-5-5z"/><circle cx="6.1" cy="7.4" r="1.25" fill="#1a0f0a"/><circle cx="9.9" cy="7.4" r="1.25" fill="#1a0f0a"/><path d="M6.4 13v1.5M8 13v1.5M9.6 13v1.5" stroke="#1a0f0a" stroke-width=".8"/>',
  stun: '<ellipse cx="8" cy="11.5" rx="5.5" ry="1.8" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 2l1.1 2.4 2.6.3-1.9 1.8.5 2.6L8 7.8 5.7 9.1l.5-2.6-1.9-1.8 2.6-.3z"/><circle cx="3.2" cy="11.2" r="1"/><circle cx="12.8" cy="11.8" r="1"/>',
  armDown: '<path d="M8 1.5l5.5 2v4.2c0 3.4-2.6 5.6-5.5 6.8-2.9-1.2-5.5-3.4-5.5-6.8V3.5z" opacity=".45"/><path d="M8 4v7M5.2 8.4L8 11.2l2.8-2.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  voiced: '<path d="M2.5 6v4h2.6L9 13V3L5.1 6z"/><path d="M11 5.5a3.4 3.4 0 010 5M12.8 3.6a6 6 0 010 8.8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
  taunt: '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="3.4" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="8" r="1.2"/>',
  stealth: '<path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8z" opacity=".55"/><circle cx="8" cy="8" r="1.9" fill="#1a0f0a"/><path d="M2.5 13.5l11-11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  defUp: '<path d="M8 1.5l5.5 2v4.2c0 3.4-2.6 5.6-5.5 6.8-2.9-1.2-5.5-3.4-5.5-6.8V3.5z" opacity=".45"/><path d="M8 11.5v-7M5.2 7.2L8 4.4l2.8 2.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  counter: '<path d="M3 13L11 5M11 5V2.5L13.5 2.5 13.5 5 11 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M13 13L5 5M5 5V2.5H2.5V5H5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M2 14l2-2M14 14l-2-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  evaUp: '<path d="M2 5h7M4 8h8M2 11h7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M11 3.5L14.5 8 11 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
};
const fxTurns = (k, n) => FX[k].once ? 'до своего хода' : `${n} ${n === 1 ? 'ход' : n < 5 ? 'хода' : 'ходов'}`;
const fxIcon = (k, n, big) => `<span class="fxi ${FX[k].bad ? 'bad' : 'good'} ${big ? 'big' : ''}" title="${FX[k].n}: ${fxTurns(k, n)}"><svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">${FX_ICONS[k] || ''}</svg>${!FX[k].once && n > 1 ? `<b>${n}</b>` : ''}</span>`;
const LEAD_F = { muaddib: ['atr', 'frem'] };
function leaderFor(B, u) {
  const L = B.leader[u.side]; if (!L || !CH[L].leader) return null;
  const fs = LEAD_F[L] || CH[L].f, src = B.units.find(x => x.side === u.side && x.idx === 0);
  return { def: CH[L], on: u.def.f.some(f => fs.includes(f)) || (L === 'erasmus' && MENTAT(u)), lvl: src ? skLv(src, 'leader') : 1 };
}
function bPop(html) {
  BT.pop = true; const el = document.createElement('div'); el.className = 'bpop'; el.id = 'bpop';
  el.innerHTML = `<div class="bpopbox" role="dialog" aria-modal="true">${html}<button class="btn bpopx" data-bpopx="1" aria-label="Закрыть">×</button></div>`;
  $('#battle').appendChild(el);
}
function bPopClose() { const el = $('#bpop'); if (el) el.remove(); if (!BT) return; BT.pop = false; if (BT.resume) { const f = BT.resume; BT.resume = null; f(); } }
const fxListHtml = u => Object.keys(u.fx).length ? `<div class="bfxl">${Object.keys(u.fx).map(k => `<div class="bfx ${FX[k].bad ? 'bad' : 'good'}">${fxIcon(k, u.fx[k], true)}<div><b>${FX[k].n}</b> <span class="mono">${fxTurns(k, u.fx[k])}</span><p>${FX[k].d || ''}</p></div></div>`).join('')}</div>` : '<p class="sub" style="margin:0">Действующих эффектов нет.</p>';
function openFxPop(uid) {
  const u = BT.B.units.find(x => x.uid === uid); if (!u) return;
  bPop(`<div class="bph">${u.def.boss ? '' : portrait(u.def, 40)}<div><h3>${u.def.n}</h3><span class="mono">Действующие эффекты</span></div></div>${fxListHtml(u)}`);
}
function openUnitPop(uid) {
  const B = BT.B, u = B.units.find(x => x.uid === uid); if (!u) return;
  const d = u.def, pc = (a, b) => b ? Math.round(Math.max(0, a) / b * 100) : 0;
  const bar = (lab, v, max, cls) => `<div class="bst"><span>${lab}</span><div class="hb ${cls}"><i style="width:${pc(v, max)}%"></i></div><b class="mono">${max ? pc(v, max) + '%' : '—'}</b><small class="mono">${max ? fmt(Math.max(0, Math.round(v))) + ' / ' + fmt(max) : 'нет щита'}</small></div>`;
  const tags = d.boss ? ['Босс рейда', 'Червь'] : [...d.f.map(f => FACTIONS[f] ? FACTIONS[f].n : f), ROLES[d.role], d.side === 'light' ? 'Светлый' : d.side === 'dark' ? 'Тёмный' : '', d.legendary ? 'Легенда' : '', d.prof || '', d.leader ? 'Лидер' : ''].filter(Boolean);
  let html = `<div class="bph">${d.boss ? `<span class="bigico">${wormIco()}</span>` : portrait(d, 52)}<div><h3>${d.n}</h3><div class="btags">${tags.map(t => `<span class="tag">${t}</span>`).join('')}<span class="tag ${u.side === 'A' ? 'ally' : 'foe'}">${u.side === 'A' ? 'Ваш отряд' : 'Противник'}</span></div></div></div>`;
  html += `<div class="bstats">${bar('Здоровье', u.hp, u.maxHp, 'hp')}${bar('Щит', u.shield, u.maxShield, 'sh')}
    <div class="bkv"><span>Броня</span><b class="mono">${Math.round(u.arm * (u.fx.armDown ? .5 : 1) * 100)}%${u.fx.armDown ? ' <i class="badt">↓</i>' : ''}</b><span>Уклонение</span><b class="mono">${Math.round((u.eva + (u.fx.evaUp ? .3 : 0)) * 100)}%</b><span>Скорость</span><b class="mono">${u.spd}</b><span>Шкала хода</span><b class="mono">${Math.min(100, Math.round(u.tm / 10))}%</b></div></div>`;
  html += `<p class="chap">Эффекты</p>${fxListHtml(u)}`;
  if (d.boss) html += `<p class="chap">Фаза</p><p class="sub" style="margin:0">${u.phase}: ${PHASES[u.phase]}. Каждая следующая фаза сильнее; на последней червь впадает в ярость.</p>`;
  else {
    const skRow = k => { const a = d[k]; if (!a) return ''; const cd = u.cd[k] || 0, sp = a.spice && B.spice[u.side] < a.spice;
      const st = k === 'basic' ? 'всегда готова' : cd > 0 ? `откат: ${cd} ${cd === 1 ? 'ход' : cd < 5 ? 'хода' : 'ходов'}` : sp ? `нужно ${a.spice} Пряности` : 'готова';
      return `<div class="bsk ${k !== 'basic' && (cd > 0 || sp) ? 'cd' : 'ready'}"><span class="bski">${skillSvg(d, k)}</span><div><b>${a.n}</b> <span class="mono">ур. ${skLv(u, k)}${a.cd ? ` · перезарядка ${a.cd}` : ''}</span><p>${fxText(abDescLv(d, k, skLv(u, k)))}</p></div><span class="bskst mono">${st}</span></div>`; };
    html += `<p class="chap">Способности</p>${['basic', 'special', 'ult'].map(skRow).join('')}`;
    if (u.glOn) html += `<div class="bsk gl ${u.glUsed ? 'cd' : glMeter(B, u) >= 100 ? 'ready' : 'cd'}"><span class="bski">${skillSvg(d, 'gl')}</span><div><b>${d.gl.n}</b> <span class="mono">ультимативная</span></div><span class="bskst mono">${u.glUsed ? 'использована' : `заряд ${u.ultM}%`}</span></div>`;
    const pas = [];
    if (d.passive) pas.push(`<div class="bps"><b>${d.passive.n}</b> <span class="mono">своя пассивка · ур. ${skLv(u, 'passive')}</span><p>${fxText(abDescLv(d, 'passive', skLv(u, 'passive')))}</p></div>`);
    const L = leaderFor(B, u);
    if (L) pas.push(`<div class="bps ${L.on ? '' : 'off'}"><b>${L.def.leader.n}</b> <span class="mono">лидерка ${L.def.sn}${L.on ? '' : ' · не действует на этого бойца'}</span><p>${fxText(L.def.leader.d)}</p></div>`);
    for (const a of B.units) if (a.side === u.side && a !== u && (a.def.teamShield || a.def.teamTen || a.def.teamStartTM) && a.def.passive) pas.push(`<div class="bps"><b>${a.def.passive.n}</b> <span class="mono">пассивка ${a.def.sn} на отряд</span><p>${a.def.passive.d}</p></div>`);
    html += `<p class="chap">Пассивки и лидерки</p>${pas.join('') || '<p class="sub" style="margin:0">Нет.</p>'}`;
  }
  bPop(html);
}
function step() {
  const B = BT.B;
  if (B.over) return finish();
  if (B.wavePending) {
    const change = advanceWave(B);
    if (change) {
      BT.autoTargetUid = null; BT.autoTaunts = [];
      if (BT.arena) BT.arena.switchWave(change.old, change.enemies);
      BT._hc = null; // rebuild HUD once for the changed number of enemies
      renderBattle();
      return later(step, 650);
    }
  }
  const u = nextActor(B);
  const r = startTurn(B, u);
  renderBattle();
  if (B.over) return later(finish, 900);
  if (r.skip) { endTurn(B, u); return later(step); }
  if (u.side === 'A' && !BT.auto && !u.charmed) { BT.waiting = u; BT.sel = 'basic'; ensureCur(B, u); renderBattle(); return; }
  later(() => {
    const p = aiPlan(B, u);
    if (BT.auto && u.side === 'A' && BT.autoTargetUid && u.def[p.key] && u.def[p.key].tgt === 'enemy') {
      const chosen = validTargets(B, u, u.def[p.key]).find(t => t.uid === BT.autoTargetUid);
      if (chosen) p.target = chosen;
    }
    doAct(u, p.key, p.target && p.target.uid);
  });
}
// target cursor: one enemy under the cursor; under taunt only the taunting enemies can hold it
function curTargets(B, u) { const b = u.def.basic && u.def.basic.tgt === 'enemy' ? u.def.basic : { tgt: 'enemy' }; return validTargets(B, u, b); }
function ensureCur(B, u) { const vt = curTargets(B, u); if (!vt.length) { BT.cur = null; return vt; } if (!vt.some(t => t.uid === BT.cur)) BT.cur = vt[0].uid; return vt; }
function useAbil(u, k) {
  const B = BT.B, ab = u.def[k];
  if (ab.tgt === 'enemy') { const vt = validTargets(B, u, ab); if (!vt.length) return; const t = vt.find(x => x.uid === BT.cur) || vt[0]; return doAct(u, k, t.uid); }
  const grp = ab.tgt === 'allies' ? living(B, u.side) : ab.tgt === 'self' ? [u] : ab.tgt === 'enemies' ? living(B, foe(u.side)) : [];
  if (grp.length) BT.curFlash = { uids: grp.map(x => x.uid), until: performance.now() + 1100 };
  return doAct(u, k, null);
}
function abilPop(u, k) {
  const a = u.def[k]; if (!a) return; const lv = (prog(u.def.id).sk || {})[k] || 1, cd = u.cd[k] > 0 ? u.cd[k] : 0;
  const kind = k === 'gl' ? 'ультимативная' : ({ basic: 'базовая', special: 'особая', ult: 'мощная' }[k] || '') + ' · ур. ' + lv;
  const tt = { enemy: 'Цель: враг под курсором', enemies: 'Цель: все враги', allies: 'Цель: все союзники', self: 'Цель: на себя' }[a.tgt] || '';
  bPop(`<div class="abpop"><div class="abpi">${skillSvg(u.def, k)}</div><div><b>${a.n}</b><span class="mono">${kind}${a.spice ? ` · меланж ${a.spice}` : ''}${cd ? ` · перезарядка ${cd}` : ''}</span></div></div>
    <p style="margin:0 0 8px">${k === 'gl' ? a.d : abDescLv(u.def, k, lv)}</p>${tt ? `<p class="sub" style="margin:0">${tt}</p>` : ''}`);
}
function doAct(u, key, tuid) {
  if (u.side === 'A' && key === 'ult') quest('ult');
  if (u.side === 'A' && BT.auto) BT.usedAuto = true;
  const B = BT.B; BT.waiting = null; B.events = [];
  act(B, u, key, tuid); endTurn(B, u);
  if (key === 'gl' && u.side === 'A') { statInc('gl'); const tg = B.glTarget && B.units.find(x => x.uid === B.glTarget); if ((B.glKind === 'devour' || B.glKind === 'prophecy') && tg && !tg.alive) statInc('devour'); }
  if (B.flash === 'gl') {                       // 1) the hero's cinematic, 2) after it ends — the strike on the field
    BT.hold = true; const ab = $('#bwrap .abils'); if (ab) { ab.style.visibility = 'hidden'; if (BT._hc) BT._hc.bot = null; }
    const ms = ultCinematic(u, B);
    setTimeout(() => { if (!BT || BT.B !== B || BT.done) return; BT.hold = false; safeRun(() => actShow(u, key, B)); }, ms);
    return;
  }
  actShow(u, key, B);
}
function actShow(u, key, B) {
  if (BT.arena) BT.arena.actMs = 0;
  renderBattle();
  if (B.flash === 'gl' && B.glKind === 'devour' && !BT.arena) { const tg = B.glTarget && B.units.find(x => x.uid === B.glTarget), el = tg && document.querySelector(`.unit[data-uid="${tg.uid}"]`); if (el) { el.classList.add('devoured'); if (BT._hc) BT._hc.u[tg.uid] = null; } }
  if (B.flash) { const f = $('#flash'); f.className = 'flash ' + B.flash; if (B.flash === 'worm' || B.flash === 'wormSmall') { replayAnim($('#battle'), 'quake'); } }
  const cw = BT.arena && BT.arena.actMs ? BT.arena.actMs + 180 : 0;
  later(step, Math.max(cw, B.flash === 'gl' ? 4200 : B.flash ? 1300 : 800));
}
function ultCinematic(u, B) {
  const d = u.def, gl = d.gl, th = gl.theme || '#ffd27a', foeSide = u.side !== 'A';
  const tgt = B.glTarget && B.units.find(x => x.uid === B.glTarget);
  const ud = BT.speed >= 4 ? 1.9 : BT.speed >= 2 ? 2.4 : 2.9;
  const g = document.createElement('div'); g.className = 'ultcine' + (foeSide ? ' foe' : ''); g.style.setProperty('--uc', th); g.style.setProperty('--ud', ud + 's');
  g.innerHTML = `<div class="ucbar t"></div><div class="ucbar b"></div><div class="ucrays"></div><div class="ucband"></div>
    <div class="ucfig">${figureSVG(d, true)}</div>
    <div class="uctext"><small>Ультимативная способность${foeSide ? ' врага' : ''}</small><b>${gl.n}</b><span>${d.n}</span>${tgt ? `<em>${tgt.def.boss ? 'Цель' : 'Поглощён'}: ${tgt.def.sn}</em>` : ''}</div>
    <div class="ucsand">${Array.from({ length: 26 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--dl:${(i % 9) * .07}s;--sz:${4 + (i * 7) % 9}px"></i>`).join('')}</div>`;
  $('#battle').appendChild(g);
  setTimeout(() => g.remove(), ud * 1000);
  return Math.round(ud * 1000 * .9);
}
const FORM = [[27, 80, 1.05], [13, 64, .88], [40, 62, .88], [11, 96, 1.08], [41, 97, 1.08]];
const AB_ICONS = {
  blade: '<path d="M19.5 2.5l2 2L10 16l-3-3z" fill="currentColor"/><path d="M5 14.5l4.5 4.5-1.8 1.8-4.5-4.5z" fill="currentColor"/><path d="M3 21l2.5-2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  fast: '<path d="M3 8h8M5 12h11M3 16h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="19" cy="12" r="2.8" fill="currentColor"/>',
  laser: '<path d="M3 21L20 4" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="20.5" cy="3.5" r="2.2" fill="currentColor"/>',
  voice: '<path d="M4 9v6h3.5l4.5 4V5L7.5 9z" fill="currentColor"/><path d="M15 9a4 4 0 010 6M17.5 6.5a7.5 7.5 0 010 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  poison: '<path d="M12 3c3 5 6 8 6 11a6 6 0 01-12 0c0-3 3-6 6-11z" fill="currentColor"/>',
  heal: '<path d="M12 3c3 5 6 8 6 11a6 6 0 01-12 0c0-3 3-6 6-11z" fill="currentColor"/><path d="M12 11v6M9 14h6" stroke="#15110f" stroke-width="2"/>',
  shield: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" fill="currentColor"/>',
  chev: '<path d="M6 13l6-6 6 6M6 19l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  down: '<path d="M6 5l6 6 6-6M6 11l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  worm: '<path d="M3 18c3 0 3-5 6-5s3 5 6 5 3-9 6-9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="20" cy="7" r="2.6" fill="currentColor"/>',
  stealth: '<path d="M3 12s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 20L20 4" stroke="currentColor" stroke-width="2"/>',
  execute: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2"/>',
};
function iconFor(ab) {
  if (ab.wormCall) return 'worm'; if (ab.heal) return 'heal'; if (ab.execute) return 'execute'; if (ab.dt) return ab.dt;
  const fx = (ab.fx || []).map(f => f[0]);
  if (fx.includes('stealth')) return 'stealth'; if (fx.includes('taunt') || fx.includes('defUp')) return 'shield';
  if (fx.includes('poison')) return 'poison'; if (fx.includes('armDown')) return 'down'; return 'chev';
}
// тело .fig отдельно: фигура 2D детерминирована по def — кэш на бой (BT._fig)
function figSvg(u) {
  if (BT.arena) return '';
  const m = BT._fig || (BT._fig = new Map()), k = u.def.boss ? '#boss' : u.def.id;
  let f = m.get(k); if (f === undefined) m.set(k, f = u.def.boss ? wormSVG() : figureSVG(u.def, true));
  return f;
}
const figBubble = u => !BT.arena && u.alive && u.shield > 0 ? `<span class="bubble" style="opacity:${(.3 + .7 * u.shield / u.maxShield).toFixed(2)}"></span>` : '';
function unitHtml(u, B, ctx, fig = figSvg(u) + figBubble(u)) {
  let pos;
  if (u.def.boss) pos = [73, 94, 1];
  else { const f = FORM[u.idx] || FORM[0]; pos = [(u.charmed ? u.side !== 'A' : u.side === 'A') ? f[0] : 100 - f[0], f[1], f[2] * (u.def.legendary ? 1.5 : 1)]; }
  const pct = (a, b) => b ? Math.max(0, Math.min(100, a / b * 100)) : 0;
  let intent = '';
  if (u.side === 'B' && u.alive && ctx.presc && u.intent) {
    const t = B.units.find(x => x.uid === u.intent.target), ab = u.def[u.intent.key];
    if (u.intent.move) intent = `${MOVES[u.intent.move]}${t ? ' → ' + t.def.sn : ' · по всем'}`;
    else intent = t ? `→ ${t.def.sn}${u.intent.key === 'special' ? ' · ' + ab.n : ''}` : ab.n;
  }
  const isT = ctx.targets.has(u.uid), isC = ctx.cur === u.uid, isCA = !!(ctx.curAll && ctx.curAll.has(u.uid)) && u.alive;
  const hit = B.events.some(e => e.uid === u.uid && /dmg|crit|raw|shield/.test(e.kind)), dying = B.events.some(e => e.uid === u.uid && e.kind === 'death');
  const cls = ['unit', 'side-' + u.side, u.def.legendary ? 'legend' : '', u.relic ? 'relic' : '', u.charmed ? 'charmed' : '', u.def.boss ? 'boss ph' + u.phase : '', u.alive ? '' : 'dead', dying ? 'dying' : '', B.active === u ? 'active' : '', B.actor === u.uid ? 'lunge' : '', isT ? 'tgt' : '', isC ? 'cur' : '', hit ? 'hit' : ''].join(' ');
  return `<div class="${cls}" data-uid="${u.uid}" style="--tc:${u.relic ? RELIC_COL : TIER_COL[u.gear || 1]};left:${pos[0]}%;top:${pos[1]}%;--s:${pos[2]};--d:-${(ghash(u.uid + u.def.id) % 30) / 10}s;z-index:${Math.round(pos[1])}" ${isT ? `tabindex="0" role="button" aria-label="Цель: ${u.def.sn}"` : ''}>
    ${BT.pkg9 ? '<div class="world-label">' : ''}
    ${isC || isCA ? `<div class="tcur ${isCA && !isC && u.side === 'A' ? 'ally' : ''}"><i></i></div>` : ''}
    <div class="hud">
      ${u.alive && Object.keys(u.fx).length ? `<div class="fxs" data-fxu="${u.uid}" role="button" tabindex="0" aria-label="Эффекты: ${Object.keys(u.fx).map(k => FX[k].n).join(', ')}">${Object.keys(u.fx).map(k => fxIcon(k, u.fx[k])).join('')}</div>` : ''}
      ${u.idx === 0 && B.leader[u.side] ? '<span class="lead" title="Лидер">Л</span>' : ''}
      <div class="hb hp"><i style="--p:${(pct(u.hp, u.maxHp) / 100).toFixed(4)}"></i></div>
      ${u.maxShield ? `<div class="hb sh"><i style="--p:${(pct(u.shield, u.maxShield) / 100).toFixed(4)}"></i></div>` : ''}
      <div class="hb tm"><i style="width:${Math.min(100, u.tm / 10)}%"></i></div>
      ${u.glOn && !u.glUsed ? `<div class="hb glm ${glMeter(BT.B, u) >= 100 ? 'full' : ''}"><i style="width:${glMeter(BT.B, u)}%"></i></div>` : ''}
      ${!u.def.boss && spiceUser(u.def) && u.glOn ? `<div class="hb spm ${B.spice[u.side] >= 100 ? 'full' : ''}" title="Меланж ${B.spice[u.side]}%"><i style="width:${Math.min(100, B.spice[u.side])}%"></i></div>` : ''}
    </div>
    ${intent ? `<div class="intent">${intent}</div>` : ''}
    ${BT.pkg9 ? '</div>' : ''}
    <div class="fig ${u.side === 'B' ? 'flip' : ''}">${fig}</div>
    <div class="shadow"></div>
    <div class="uname">${u.def.sn}${u.def.boss ? ` · фаза ${u.phase}: ${PHASES[u.phase]}` : ''}</div>
  </div>`;
}
// фаза 7, шаг 5: HUD боя точечно. Каркас #bwrap — полной сборкой при launch / смене 2D↔3D; дальше секции (верх, тикер,
// юниты, хвост поля с журналом, низ) сравниваются со строками прошлого вызова, изменившиеся парсятся и морфятся в живой DOM.
// Итоговый innerHTML совпадает с полной сборкой (порядок атрибутов тоже). Юнит с hit/lunge/dying или сменой style
// заменяется целиком: CSS-анимации .fig стартуют заново, как при полной сборке, placeHud инициализирует новый узел.
const HUD_T = document.createElement('template');
function hudParse(html) { HUD_T.innerHTML = html; return HUD_T.content.firstElementChild; }
function hudFull(P) { return `
    ${P.top}
    ${P.ticker}
    <div class="field ${P.three}" id="field">
      ${P.units.map(x => x[1]).join('')}${P.tail}</div>
    ${P.bot}`; }
function morphAttrs(a, b) {
  const A = a.attributes, Bt = b.attributes; let same = A.length === Bt.length;
  if (same) for (let i = 0; i < A.length; i++) if (A[i].name !== Bt[i].name) { same = false; break; }
  if (same) { for (let i = 0; i < A.length; i++) if (A[i].value !== Bt[i].value) A[i].value = Bt[i].value; return; }
  while (A.length) a.removeAttributeNode(A[0]);
  for (const t of Array.from(Bt)) a.setAttributeNode(t.cloneNode());
}
function morph(a, b) {
  if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) { a.replaceWith(b); return; }
  if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  morphAttrs(a, b);
  // y._src — живой узел, чьё содержимое не менялось (.fig с SVG): переносится на место y целиком, по позиции не сопоставляется
  let x = a.firstChild, y = b.firstChild;
  while (y) {
    const ny = y.nextSibling;
    if (y._src) { const k = y._src; while (x && x !== k) { const nx = x.nextSibling; x.remove(); x = nx; } if (x === k) x = k.nextSibling; else a.appendChild(k); morphAttrs(k, y); k._kept = false; }
    else if (!x) a.appendChild(y);
    else if (x._kept) a.insertBefore(y, x);
    else { const nx = x.nextSibling; morph(x, y); x = nx; }
    y = ny;
  }
  while (x) { const nx = x.nextSibling; x.remove(); x = nx; }
}
const HUD_EV = /\b(hit|lunge|dying)\b/g, HUD_ANIM = new Set(['shake', 'hitflash', 'lungeR', 'lungeL', 'fall', 'fallR']);
function hudUnitEl(html) { const el = hudParse(html); el._ss = el.getAttribute('style'); return el; }
// верхняя панель по частям; глифы порядка ходов сдвигаются каждый ход — переиспользуются по строке, а не по позиции
function hudTop(el, o, n, gp) {
  const ti = el.children[0], ord = ti.children[1];
  if (o.h3 !== n.h3) morph(ti.children[0], hudParse(n.h3));
  if (o.order.join('') !== n.order.join('')) {
    const pool = new Map(), old = Array.from(ord.children).slice(0, -1);
    o.order.forEach((h, i) => { const l = pool.get(h); if (l) l.push(old[i]); else pool.set(h, [old[i]]); });
    const blog = ord.lastElementChild;
    const E = n.order.map(h => { const l = pool.get(h), e = l && l.length ? l.shift() : gp.has(h) ? gp.get(h) : hudParse(h); gp.delete(h); return e; }), used = new Set(E);
    // перемещаем только то, что не на месте: перенос SVG с <defs id> инвалидирует url(#…) во всех фигурах
    let cur = ord.firstElementChild;
    for (const e of E) { while (cur !== blog && !used.has(cur)) cur = cur.nextElementSibling; if (e === cur) cur = cur.nextElementSibling; else ord.insertBefore(e, cur); }
    for (const [h, l] of pool) for (const e of l) { e.remove(); gp.set(h, e); }   // ушедший глиф вернётся в конец очереди — держим узел
    if (gp.size > 24) gp.delete(gp.keys().next().value);
  }
  if (o.blog !== n.blog) morph(ord.lastElementChild, hudParse(n.blog));
  if (o.gauges !== n.gauges) morph(el.children[1], hudParse(n.gauges));
  if (o.ctl !== n.ctl) morph(el.children[2], hudParse(n.ctl));
}
function hudSync(bw, P, B, ctx) {
  if (!bw) return;
  const hc = BT._hc;
  const field = hc && hc.bw === bw && hc.three === P.three && bw.children[2];
  let ok = !!field;
  if (ok) {
    for (const f of field.querySelectorAll('.float')) f.remove();
    const els = field.children;
    if (els.length < P.units.length) ok = false;
    else for (let i = 0; i < P.units.length; i++) if (els[i].dataset.uid !== P.units[i][0]) { ok = false; break; }
  }
  if (!ok) {
    bw.innerHTML = hudFull(P);
    const u = {}; for (const [uid, h] of P.units) u[uid] = h;
    const f = {}; for (const x of P.units) f[x[0]] = x[2];
    for (const el of bw.querySelectorAll('#field > .unit')) el._ss = el.getAttribute('style');
    BT._hc = { bw, three: P.three, top: P.top, T: P.T, ticker: P.ticker, tail: P.tail, bot: P.bot, u, f };
    return;
  }
  const [eTop, eTick, , eBot] = bw.children;
  if (hc.top !== P.top) { hudTop(eTop, hc.T, P.T, hc.gp || (hc.gp = new Map())); hc.top = P.top; hc.T = P.T; }
  if (hc.ticker !== P.ticker) { morph(eTick, hudParse(P.ticker)); hc.ticker = P.ticker; }
  const els = Array.from(field.children);
  for (let i = 0; i < P.units.length; i++) {
    const [uid, h, fi, u, bb] = P.units[i]; if (hc.u[uid] === h) continue;
    const a = els[i], keep = hc.f[uid] === fi, b = hudUnitEl(keep && fi ? h.replace(fi + bb, '') : h);
    hc.u[uid] = h; hc.f[uid] = fi;
    if (a._ss !== b._ss) { a.replaceWith(keep ? hudUnitEl(h) : b); continue; }   // сменился style (позиция, ярус) — новый узел, placeHud его инициализирует
    // v73: style тот же — живой style (transform/--fh/--w от placeHud) не трогаем, иначе полосы «убегают» к исходным left/top%, а кэш _hx/_fh не даёт их вернуть
    if (a.hasAttribute('style')) b.setAttribute('style', a.getAttribute('style'));
    let kf = null;
    if (keep) { kf = a.querySelector(':scope > .fig'); if (kf) { kf._kept = true; b.querySelector(':scope > .fig')._src = kf; } }
    // событие (удар, выпад, гибель) повторилось на живом узле — перезапуск его анимаций, как при пересоздании
    const ev = b.className.match(HUD_EV), again = ev && ev.some(c => a.classList.contains(c));
    morph(a, b);
    if (kf) { const ob = kf.querySelector(':scope > .bubble'), nb = bb && hudParse(bb); if (ob && nb) morph(ob, nb); else if (ob) ob.remove(); else if (nb) kf.appendChild(nb); }   // пузырь щита — вне кэша SVG
    if (again && !BT.arena) { const fg = a.querySelector('.fig'); if (fg) for (const an of fg.getAnimations({ subtree: true })) if (HUD_ANIM.has(an.animationName)) { an.currentTime = 0; an.play(); } }
  }
  if (hc.tail !== P.tail) {
    const last = field.children[P.units.length - 1];
    while (last.nextSibling) last.nextSibling.remove();
    HUD_T.innerHTML = P.tail; field.appendChild(HUD_T.content);
    hc.tail = P.tail;
  }
  if (hc.bot !== P.bot) { morph(eBot, hudParse(P.bot)); hc.bot = P.bot; }
}
function renderBattle() {
  if (!BT || BT.hold) return;
  const B = BT.B, w = BT.waiting;
  const targets = new Set(), valid = new Set();
  if (BT.autoTargetUid) {
    const target = B.units.find(u => u.uid === BT.autoTargetUid);
    const taunts = B.units.filter(u => u.alive && u.side === 'B' && u.fx.taunt).map(u => u.uid);
    if (!target || !target.alive || target.side !== 'B' || taunts.some(uid => !(BT.autoTaunts || []).includes(uid))) BT.autoTargetUid = null;
    BT.autoTaunts = taunts;
  }
  if (BT.auto && !B.over) for (const u of living(B, 'B')) valid.add(u.uid);
  if (w) { ensureCur(B, w).forEach(t => valid.add(t.uid)); if (BT.cur) targets.add(BT.cur); }
  const curAll = BT.curFlash && performance.now() < BT.curFlash.until ? new Set(BT.curFlash.uids) : null;
  const ctx = { presc: hasPrescience(B, 'A'), targets: valid, cur: BT.auto ? BT.autoTargetUid : w ? BT.cur : null, curAll };
  const order = previewOrder(B, 8);
  const p9 = !!BT.pkg9;
  let bot;
  if (w) {
    const cu = BT.cur && B.units.find(x => x.uid === BT.cur);
    bot = `<div class="who"><span class="ptw">${portrait(w.def, 54, TIER_COL[prog(w.def.id).gear])}</span><div class="whotext"><b>${w.def.n}</b><div class="hint">${cu ? `Цель: <b>${cu.def.sn}</b>${valid.size > 1 ? ' · тап по врагу — сменить' : ''}` : ''}<br>Тап по умению — применить · удержание — описание</div></div></div>
      <div class="abils">${spiceUser(w.def) && w.glOn ? hourglass(B.spice[w.side]) : ''}${['basic', 'special', 'ult', 'gl'].filter(k => w.def[k] && (k !== 'gl' || (w.glOn && !w.glUsed))).map(k => { const a = w.def[k], ready = abilityReady(B, w, k), cd = w.cd[k] > 0 ? w.cd[k] : '';
        if (k === 'gl') return `<button class="abil gl ${ready ? 'full' : 'off'}" data-ab="gl" ${ready ? '' : 'aria-disabled="true"'} aria-label="${a.n}" title="${a.n}" style="--m:${glMeter(B, w)}">${skillSvg(w.def, 'gl')}<span class="glpct">${ready ? 'УЛЬТА' : Math.floor(glMeter(B, w)) + '%'}</span></button>`;
        return `<button class="abil ${k} ${ready ? '' : 'off'}" data-ab="${k}" ${ready ? '' : 'aria-disabled="true"'} aria-label="${a.n}" title="${a.n}">${skillSvg(w.def, k)}${cd ? `<span class="cd">${cd}</span>` : ''}${a.spice ? `<span class="cost">${a.spice}</span>` : ''}</button>`; }).join('')}</div>`;
  } else {
    const a = B.active;
    bot = `<div class="who dim">${a && a.side === 'B' ? `<span class="ptw">${a.def.boss ? '' : portrait(a.def, 40)}</span><span>Ходит противник: <b>${a.def.sn}</b></span>` : BT.auto && !B.over ? '<span>Отряд под управлением ИИ</span>' : ''}</div>`;
  }

  // A3: existing ability keys and click semantics; 2D, bosses and raids use the old layout.
  if (p9) {
    if (w) {
      const cu = BT.cur && B.units.find(x => x.uid === BT.cur);
      const hero = '<span class="pkg9-pt" style="--s:54px">' + ptRound(w.def, prog(w.def.id)) + '</span>';
      const abilities = ['basic', 'special', 'ult', 'gl']
        .filter(k => w.def[k] && (k !== 'gl' || (w.glOn && !w.glUsed)))
        .map(k => {
          const a = w.def[k], ready = abilityReady(B, w, k), cd = w.cd[k] > 0 ? w.cd[k] : '';
          const meter = k === 'gl' ? ' style="--m:' + glMeter(B, w) + '"' : '';
          const badge = k === 'gl' ? '<span class="glpct">' + (ready ? 'УЛЬТА' : Math.floor(glMeter(B, w)) + '%') + '</span>' : (cd ? '<span class="cd">' + cd + '</span>' : '') + (a.spice ? '<span class="cost">' + a.spice + '</span>' : '');
          return '<button class="abil ' + k + (ready ? '' : ' off') + '" data-ab="' + k + '" aria-disabled="' + !ready + '" title="' + a.n + '" aria-label="' + a.n + '"' + meter + '>' + skillSvg(w.def, k) + badge + '</button>';
        }).join('');
      const lead = leaderFor(B, w);
      const passives = (lead ? '<span title="Лидер: ' + lead.def.sn + '"' + (lead.on ? '' : ' class="off"') + '>Л</span>' : '') + (w.def.passive ? '<span title="' + w.def.passive.n + '">✦</span>' : '');
      bot = '<div class="pkg9-target">Цель: ' + (cu ? cu.def.sn : 'выберите противника') + '</div>' +
        '<div class="pkg9-action"><div class="pkg9-actor">' + hero + '<span class="pkg9-name">' + w.def.sn + '</span></div>' +
        '<div class="pkg9-skills"><div class="pkg9-passives">' + passives + '</div><div class="abils">' +
        (spiceUser(w.def) && w.glOn ? hourglass(B.spice[w.side]) : '') + abilities + '</div></div></div>';
    } else {
      const a = B.active;
      bot = '<div class="pkg9-turn">' + (BT.auto && !B.over ? 'АВТОБОЙ' + (BT.autoTargetUid ? ' · ЦЕЛЬ ЗАКРЕПЛЕНА' : ' · тап по врагу для цели') : a && a.side === 'B' ? 'Ход: ' + a.def.sn : '') + '</div>';
    }
  }
  // A4: do not construct battle-log DOM while the drawer is closed.
  const drawer = p9 && BT.drawerOpen ?
    '<div class="pkg9-drawer" role="region" aria-label="Сведения о бое"><div class="pkg9-dhead"><b>СВЕДЕНИЯ О БОЕ</b><button data-bdrawer="1" aria-label="Закрыть панель">×</button></div>' +
    '<div class="pkg9-meters"><span>Пряность отряда <b>' + B.spice.A + '%</b></span><span>Пряность врагов <b>' + B.spice.B + '%</b></span>' +
    (B.desert ? '<span>Ритм пустыни <b>' + Math.min(100, B.rhythm) + '%</b></span>' : '') + '</div>' +
    '<div class="pkg9-dlabel">ПОРЯДОК ХОДОВ</div><div class="pkg9-order">' + order.map(u => glyph(u.def, u.side === 'B' ? 'e' : '')).join('') + '</div>' +
    '<div class="pkg9-dlabel">ЖУРНАЛ</div><div class="pkg9-log">' + B.log.slice(-12).map(l => '<div class="' + l.kind + '">' + l.text + '</div>').join('') + '</div></div>' : '';
  const g = (lab, v, cls, gz) => `<button class="bgz ${cls} ${v >= 100 ? 'full' : ''}" data-gz="${gz}"><span>${lab}</span><div class="hb"><i style="width:${Math.min(100, v)}%"></i></div><b>${v}</b></button>`;
  const T = {
    h3: `<h3>${BT.cfg.title}${B.wave ? ` · Волна ${B.wave.current + 1}/${B.wave.total}` : ''}${B.raid ? (bb => bb ? ` · фаза ${bb.phase}: ${PHASES[bb.phase]}` : '')(B.units.find(x => x.def.boss)) : ''}</h3>`,
    order: order.map(u => glyph(u.def, u.side === 'B' ? 'e' : '')),
    blog: `<button class="blog ${BT.showLog ? 'on' : ''}" data-log="1" aria-pressed="${!!BT.showLog}" aria-label="Журнал боя" title="Журнал">${LOG_SVG}</button>`,
    gauges: `<div class="bgauges">${B.desert ? g(B.raid ? 'БЕШЕНСТВО' : 'РИТМ', Math.min(100, B.rhythm), 'worm', 'rhythm') : ''}${B.raid ? `<button class="bgz" data-gz="dmg"><span>УРОН</span><b>${fmt(B.bossStartHp - Math.max(0, B.units.find(x => x.def.boss).hp))}</b></button>` : ''}${ctx.presc ? '<button class="bgz presc" data-gz="presc">ПРОЗРЕНИЕ</button>' : ''}</div>`,
    ctl: `<div class="bctl"><button class="btn bcb ${BT.auto ? 'on' : ''}" data-auto="1" aria-pressed="${BT.auto}">Авто</button><button class="btn bcb" data-speed="1" aria-label="Скорость">×${BT.speed}</button><button class="btn bci" data-bset="1" aria-label="Настройки боя" title="Настройки">${GEAR_SVG}</button></div>` };
  if (p9) {
    const enemy = B.units.find(u => u.side === 'B' && u.alive && u.idx === 0) || B.units.find(u => u.side === 'B' && u.alive);
    T.gauges = '<div class="bgauges pkg9-enemy">' + (enemy ? '<span class="pkg9-enemy-pt">' + portrait(enemy.def, 35) + '</span><span class="pkg9-enemy-info"><b>' + enemy.def.sn + '</b><span class="hb hp"><i style="width:' + Math.round(Math.max(0, enemy.hp) / enemy.maxHp * 100) + '%"></i></span></span>' : '') + '</div>';
    T.ctl = '<div class="bctl pkg9-controls"><button class="pkg9-control" data-bset="1" aria-label="Настройки боя">' + GEAR_SVG + '</button><button class="pkg9-control" data-hud="1" aria-pressed="' + BT.hudVisible + '" title="Показать/скрыть мировой HUD">▣</button><button class="pkg9-control ' + (BT.auto ? 'on' : '') + '" data-auto="1" aria-pressed="' + BT.auto + '">АВТО</button><button class="pkg9-control" data-speed="1" aria-label="Скорость боя">×' + BT.speed + '</button><button class="pkg9-dtoggle" data-bdrawer="1" aria-expanded="' + !!BT.drawerOpen + '" aria-label="Сведения о бое">❯</button></div>';
  }
  const top = `<div class="btop">
      <div class="btitle">${T.h3}<div class="order" aria-label="Порядок ходов">${T.order.join('')}${T.blog}</div></div>
      ${T.gauges}
      ${T.ctl}
    </div>`;
  const P = { three: BT.arena ? 'three' : '', top, T, ticker: `<div class="ticker">${B.log.slice(-2).map(l => `<div class="${l.kind}">${l.text}</div>`).join('')}</div>`,
    units: B.units.map(u => { const f = figSvg(u), bb = figBubble(u); return [u.uid, unitHtml(u, B, ctx, f + bb), f, u, bb]; }),
    tail: `
      ${drawer}${!p9 && BT.showLog ? `<div class="logpop" aria-live="polite">${B.log.slice(-14).map(l => `<div class="${l.kind}">${l.text}</div>`).join('')}</div>` : ''}
    `, bot: `<div class="bbot">${bot}</div>` };
  const bte = $('#battle'), bs = BT.speed === 1 ? '' : String(BT.speed);
  if (p9 && bte) { bte.classList.toggle('compact-world-hud', !!BT.hudCompact); bte.classList.toggle('hud-hidden', !BT.hudVisible); } if (bte && bte.style.getPropertyValue('--bs') !== bs) { if (bs) bte.style.setProperty('--bs', bs); else bte.style.removeProperty('--bs'); }   // фаза 7, шаг 5б: длительность перехода полос HP/защиты
  hudSync($('#bwrap'), P, B, ctx);
  for (const e of B.events) {
    const c = document.querySelector(`.unit[data-uid="${e.uid}"]`); if (!c) continue;
    if (!e.text) continue;
    const f = document.createElement('span'); f.className = 'float ' + e.kind; f.textContent = e.text;
    f.style.marginTop = (c.querySelectorAll('.float').length * 15) + 'px';
    c.appendChild(f);
  }
  if (BT.arena) { BT.arena.speed = BT.speed; BT.arena.sync(B, targets); BT.arena.placeHud(); }
  if (BT.arena && BT.arena.hitDelay) for (const [uid, d] of Object.entries(BT.arena.hitDelay)) if (d > 0) document.querySelectorAll(`.unit[data-uid="${uid}"] .float`).forEach(f => { f.style.animationDelay = Math.round(d) + 'ms'; f.style.animationFillMode = 'both'; });
  playFX(B);
  B.events = [];
}
// перезапуск CSS-анимации без принудительного layout: класс уже стоит → currentTime = 0 (только пересчёт стилей)
function replayAnim(el, cls) {
  if (!el) return;
  if (!el.classList.contains(cls)) { el.classList.add(cls); return; }
  for (const a of el.getAnimations({ subtree: true })) if (a.animationName === cls) { a.currentTime = 0; a.play(); }
}
function playFX(B) {
  if (!BT || !BT.fx || reduceMotion()) { B.shots = []; return; }
  if (B.events.some(e => e.kind === 'crit')) replayAnim($('#bwrap'), 'jolt');
  const shots = BT.arena ? [] : B.shots || [], heals = B.events.filter(e => e.kind === 'heal').map(e => e.uid), bt = BT;
  B.shots = [];
  if (!shots.length && !heals.length) return;
  // фаза 7, шаг 5: геометрия читается в ближайшем кадре (layout там идёт всё равно), а не сразу после правки DOM — без принудительного layout
  requestAnimationFrame(() => {
    if (BT !== bt || !BT.fx) return;
    const ctr = uid => { const el = document.querySelector(`.unit[data-uid="${uid}"] .fig`); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * .45 }; };
    const sp = Math.min(BT.speed, 4);
    shots.forEach((s, i) => {
      const a = ctr(s.a), b = ctr(s.t); if (!a || !b) return;
      const att = B.units.find(u => u.uid === s.a), type = att && att.def.boss ? 'maw' : s.dt;
      const dur = (type === 'laser' ? 420 : type === 'blade' ? 320 : 380) / sp, delay = i * 70 / sp;
      BT.fx.add({ type, x1: a.x, y1: a.y, x2: b.x, y2: b.y, dur, delay });
      BT.fx.add({ type: 'impact', x1: b.x, y1: b.y, x2: b.x, y2: b.y, dur: 360 / sp, delay: delay + dur * (type === 'blade' ? .2 : .8), seed: i, col: { fast: '#ffd28a', blade: '#ffffff', laser: '#ff6d86', voice: '#cbb6f0', poison: '#8be07a', maw: '#e8dcc0' }[type] || '#fff' });
    });
    for (const uid of heals) { const b = ctr(uid); if (b) BT.fx.add({ type: 'heal', x1: b.x, y1: b.y, x2: b.x, y2: b.y, dur: 600 / sp }); }
  });
}
function finish() {
  if (!BT || BT.done) return; BT.done = true; clearTimeout(BT.timer);
  const B = BT.B, won = B.over === 'A', cfg = BT.cfg;
  let html, btns = `<button class="btn go" data-leave="1">Дальше</button>`;
  if (won && cfg.mode !== 'trial') statInc('wins');
  if (cfg.mode === 'trial') { if (won) statInc('wins'); ({ html, btns } = trialFinish(B, cfg, won)); }
  else if (cfg.mode === 'conq') ({ html, btns } = cqFinish(B, cfg, won));
  else if (cfg.mode === 'raid') {
    quest('raid');
    const boss = B.units.find(x => x.def.boss), dmg = B.bossStartHp - Math.max(0, boss.hp);
    statInc('raidDmg', dmg); const R = S.raid; R.hp = Math.max(0, R.hp - dmg); R.used.push(...cfg.squad); R.log.unshift({ squad: cfg.squad, dmg });
    S.raidPick = [];
    if (R.hp <= 0) {
      const rw = raidReward(R.tier, 1, true); S.teeth += rw.teeth; S.plast += rw.pl; S.solari += rw.sol; S.cry += rw.cry; S.folio += rw.folio; S.seal += rw.seal; S.wol += rw.wol; S.raidKills[R.tier] = true; statInc('raidKills'); if (R.tier === 2) S.unlocks.title.raid3 = 1; S.raid = null;
      const rf = raidFrags(R.tier, 1); grantFrags(rf);
      const artifacts = ['ix_plate', 'holtz_conductor', 'tleilax_matrix'][R.tier]; const cr = [5, 4, 3][R.tier]; S[artifacts] = (S[artifacts] || 0) + cr;
      html = `${WORM_BADGE}<h3>Червь повержен</h3><ul><li>+${amt(artifacts, cr)} артефактов</li><li>Урон этой попытки: ${fmt(dmg)}</li><li>+${amt('teeth', rw.teeth)} зубов червя</li><li>+${amt('pl', rw.pl)} +${amt('sol', rw.sol)} +${amt('cry', rw.cry)}</li><li>+${amt('folio', rw.folio)} +${amt('seal', rw.seal)}${rw.wol ? ` +${amt('wol', rw.wol)} Вода жизни!` : ''}</li>${fragLines(rf).map(l => `<li>${l}</li>`).join('')}${R.tier < 2 ? `<li>Открыт ярус Т${R.tier + 2}</li>` : ''}</ul>`;
    } else html = `<h3>${dmg ? 'Червь ушёл в песок' : 'Отряд поглощён'}</h3><ul><li>Урон: ${fmt(dmg)} (${(dmg / R.maxHp * 100).toFixed(1)}% рейда)</li><li>Осталось: ${fmt(R.hp)} здоровья, пройдено ${(raidPct() * 100).toFixed(1)}%</li><li>Эти бойцы больше не атакуют в этом рейде.</li></ul>`;
    btns = `<button class="btn go" data-leave="1">К рейду</button>`;
  } else if (cfg.mode === 'story_unlock') {
    // Reuse the *same* combat instance prepared by the closed event adapter:
    // never rebuild the battle from the player's normal roster.
    const event = STORY_UNLOCK_EVENTS[cfg.prepared.eventId];
    const award = finishStoryUnlockBattle(S, cfg.prepared, todayKey());
    const heroName = event.hero === 'margot' ? 'Марго Фенринг' : 'доктора Юэ';
    if (!won) html = '<h3>Поражение</h3><ul><li>Награда не начислена. Попробуйте ещё раз.</li></ul>';
    else if (award.ok && award.shardsGranted > 0)
      html = `<h3>Победа</h3><ul><li>+${amt('shard', award.shardsGranted, 'shard:' + event.hero)} — осколки ${heroName}</li></ul>`;
    else if (award.ok)
      html = '<h3>Победа</h3><ul><li>Повторное получение разовой награды недоступно.</li></ul>';
    else html = '<h3>Победа</h3><ul><li>Награда не начислена: проверка события не пройдена (' + award.reason + ').</li></ul>';
    btns = '<button class="btn go" data-leave="1">Завершить</button>';
  } else if (cfg.mode === 'baron_legend') {
    const result = won ? finishBaronBH9Battle(S, cfg.prepared) : { ok:false, reason:'battle' };
    if (!won) html = '<h3>Поражение</h3><ul><li>Прогресс восхождения сохранён, награды нет.</li></ul>';
    else if (result.ok) {
      if (result.firstClear) quest('journey');
      html = `<h3>Победа · Восхождение Барона</h3><ul><li>${result.firstClear ? '+'+amt('shard',result.shardsGranted,'shard:baron_legend')+' осколков Барона' : 'Повторная победа · без награды'}</li>${result.unlocked?'<li>Легенда разблокирована · 7★!</li>':''}</ul>`;
    } else html = `<h3>Победа</h3><ul><li>Награда не начислена: ${result.reason}</li></ul>`;
    btns = '<button class="btn go" data-leave="1">К восхождению</button>';
  } else if (cfg.mode === 'journey') {
    quest('journey');
    const t = JR().tiers[cfg.i];
    if (won) {
      const first = !JP()[cfg.i]; JP()[cfg.i] = true;
      const lines = [];
      if (first) { S.cry += CRY_JOURNEY; S.seal += 1; lines.push(`+${amt('cry', CRY_JOURNEY)} кристаллов`, `+${amt('seal', 1)} Печать Ландсраада`); if (cfg.i === 2 || cfg.i === 4) { S.wol += 1; lines.push(`+${amt('wol', 1)} Вода жизни!`); } const lk = JK(), un = grantShards(lk, t.sh); lines.push(`+${amt('shard', t.sh, 'shard:' + lk)} ${CH[lk].sn}${un ? ` — ${CH[lk].n} присоединяется к вам!` : ''}`); }
      else { S.solari += 2000; lines.push(`+${amt('sol', 2000)} (повтор)`); }
      html = `<h3>Победа</h3><ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul>`;
    } else html = `<h3>Поражение</h3><ul><li>Путь не пройден. Поднимите уровни героев пути или смените лидера.</li></ul>`;
    btns = `<button class="btn go" data-leave="1">К путешествию</button>`;
  } else {
    const i = BT.i, n = NODES[i];
    if (won) {
      quest('camp'); if (n.camp === 'C') quest('chron');
      const surv = living(B, 'A').length, tot = B.units.filter(u => u.side === 'A').length;
      const st = surv === tot ? 3 : surv >= Math.ceil(tot / 2) ? 2 : 1;
      const { sol, pl, drops, items, folio, seal, rid, signals } = campReward(i, st); S.rid += rid; if (signals) S[signals] = (S[signals] || 0) + 1;
      S.solari += sol; S.plast += pl; S.cleared[i] = Math.max(S.cleared[i] || 0, st); grantFrags(items);
      let cry = CRY_WIN, sealT = seal; if (st === 3 && !S.cryClaim[i]) { S.cryClaim[i] = 1; cry += CRY_3STAR; } if (st === 3 && !S.sealClaim[i]) { S.sealClaim[i] = 1; sealT += 1; } S.cry += cry; S.folio += folio; S.seal += sealT;
      const lines = [`+${amt('sol', sol)} соляриев`, `+${amt('pl', pl)} пластали`, `+${amt('cry', cry)} кристаллов${cry > CRY_WIN ? ' (первые 3★)' : ''}`];
      lines.push(`+${amt('folio', folio)} фолиантов`); if (rid) lines.push(`+${amt('rid', rid)} ридулианских кристаллов`); if (signals) lines.push(`+${amt(signals, 1)} сигнал памяти`); if (sealT) lines.push(`+${amt('seal', sealT)} Печать Ландсраада`);
      for (const [id, k] of drops) lines.push(`+${amt('shard', k, 'shard:' + id)} ${CH[id].sn}${grantShards(id, k) ? ' — персонаж открыт!' : ''}`);
      lines.push(...fragLines(items));
      html = `<h3>Победа</h3><div class="stars">${starStr(st, 3)}</div><ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul>`;
    } else {
      enRefund(nodeEn(i), nodeCost(i) - 1);
      html = `<h3>Поражение</h3><ul><li>Возвращено ${amt(nodeEn(i), nodeCost(i) - 1)}.</li><li>Прокачайте отряд или смените состав: щиты, типы урона и лидерка решают.</li></ul>`;
    }
    const nx = NODES[i + 1] && NODES[i + 1].camp === n.camp && nodeOpen(i + 1) ? i + 1 : null;
    btns = `${won && nx !== null ? `<button class="btn go" data-cnext="${nx}">Следующая миссия<small>${NODES[nx].m + 1}. ${NODES[nx].n}</small></button>` : ''}<button class="btn ${won && nx !== null ? '' : 'go'}" data-again="${i}">Ещё раз<small>${amt(nodeEn(i), nodeCost(i))}</small></button><button class="btn" data-tocamp="${i}">В кампанию</button><button class="btn" data-toroster="1">Персонажи</button>`;
  }
  const xpG = !won ? (cfg.mode === 'raid' ? 30 : 0) : cfg.mode === 'camp' ? nodeCost(BT.i) * 3 : cfg.mode === 'trial' ? 15 : cfg.mode === 'journey' ? 40 : cfg.mode === 'raid' ? 30 : cfg.mode === 'conq' ? 25 : 0;
  if (xpG) { const al = accXP(xpG); html = html.replace(/<\/ul>(?![\s\S]*<\/ul>)/, `<li class="xpl">+${xpG} опыта аккаунта · ур. ${S.acc.lvl}</li>${al.map(l => `<li>${l}</li>`).join('')}</ul>`); }
  persist();
  const el = document.createElement('div'); el.className = 'result';
  if (!won && !btns.includes('data-toroster')) btns += `<button class="btn" data-toroster="1">К персонажам<small>усилить отряд</small></button>`;
  el.className = 'result ' + (won ? 'won' : 'lost');
  el.innerHTML = `<div class="box" role="dialog" aria-modal="true"><div class="mousewrap">${MOUSE_SVG(!won)}</div>${html}<div class="acts" style="justify-content:center">${btns}</div></div>`;
  const bt = $('#battle'); bt.classList.add('fin');   // фаза 7, шаг 7: пауза бесконечных анимаций под результатом (#battle пересоздаётся в launch)
  bt.appendChild(el);
}
function leaveBattle() { battleMark(null); if (BT) clearTimeout(BT.timer); if (BT && BT.arena) BT.arena.dispose(); const pref = BT && { autoPref: BT.autoPref, speedPref: BT.speedPref }; set_BT(pref); closeOverlay(); render(); }


// BH9.9: a single validated battle, fixed player progression and actual wave engine.
function launchBaronLegend(stageIndex) {
  const prepared = prepareBaronBH9Battle(S, stageIndex, { seed: Date.now() & 0xffffff });
  if (!prepared.ok) return prepared;
  const cfg = { mode:'baron_legend', i:stageIndex, prepared,
    squad:prepared.allyIds.slice(),
    title:'Восхождение Барона · '+prepared.title,
    scene: ['giedi','court','court','arrakeen','court'][stageIndex],
    desert:stageIndex===3 };
  launch(cfg);
  return { ok:true };
}

function launchStoryUnlock(prepared) {
  if (!prepared?.ok || !prepared.battle || !STORY_UNLOCK_EVENTS[prepared.eventId] || prepared.settled) return false;
  launch({ mode: 'story_unlock', prepared, i: prepared.stageIndex,
    squad: prepared.squad.slice(), scene: prepared.scene,
    title: STORY_UNLOCK_EVENTS[prepared.eventId].title + ' · ' +
      STORY_UNLOCK_EVENTS[prepared.eventId].stages[prepared.stageIndex].title });
  return true;
}

export { startBattle, launch, launchBaronLegend, launchStoryUnlock, DLG, playDialog, renderDialog, dlgNext, dlgEnd, later, safeRun, FX_ICONS, fxTurns, fxIcon, LEAD_F, leaderFor, bPop, bPopClose, fxListHtml, openFxPop, openUnitPop, step, curTargets, ensureCur, useAbil, abilPop, doAct, actShow, ultCinematic, FORM, AB_ICONS, iconFor, unitHtml, renderBattle, playFX, finish, leaveBattle };
