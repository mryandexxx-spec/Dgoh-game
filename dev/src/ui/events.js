// ui/events.js — строки 4473–4621 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { DLG, bPopClose, dlgEnd, dlgNext, doAct, finish, launch, launchBaronLegend, launchStoryUnlock, leaveBattle, openFxPop, playDialog, renderBattle, startBattle, useAbil } from './battle/battle-ui.js';
import { cqClick } from './views/conq.js';
import { celebClick, celebQueue, showCeleb } from './overlays/celebrate.js';
import { meta2Click } from './overlays/battle-settings.js';
import { renderNotes } from './notifications.js';
import { gearCap, heroCap } from '../logic/account.js';
import { metaClick } from './wiring.js';
import { WORM_BADGE, detailNav, heroSnap } from './hero-window.js';
import { buysToday, findShopItem, shopLeft } from './views/shop.js';
import { raidPct, raidReward } from './views/raid.js';
import { SQ, openSquadSel, renderSquadSel, set_SQ, sqArr, sqGo } from './overlays/squad-select.js';
import { claimLogin, openCalendar } from './overlays/calendar.js';
import { claimChest, claimQuest } from './views/daily.js';
import { fragLines, rewardWin } from './rewards.js';
import { doRefill, doXSim, openSim, refreshAll, runSim, simCore, updSim } from './overlays/sim.js';
import { RES_INFO, closeInfo, infoBack, infoKey, openInfo, set_INFO_BACK } from './overlays/info.js';
import { DETAIL_BACK, closeOverlay, itemCtx, lvlCost, openItem, set_DETAIL_BACK, slotState } from './overlays/detail.js';
import { lackKey, skCost } from '../logic/skill-up.js';
import { craftAndEquip, buildPart } from '../logic/gear-crafting.js';
import { detailSk, hcStat, openDetail, set_detailSk, updLvl } from './hero-card.js';
import { hcFind, hcSkill, skTab } from './skill-window.js';
import { hcMem } from './memory-screen.js';
import { recyclerClick } from './recycler-screen.js';
import { nextShards, rosterClick } from './views/squad.js';
import { campSel, set_campSel } from './views/camp.js';
import { campaign20Action, campaign20Start, campaign20Legacy } from './views/campaign20.js';
import { render } from './router.js';
import { selectStoryEvent, selectStoryStage } from './views/story-events.js';
import { selectBaronStage } from './views/baron-journey.js';
import { prepareStoryUnlockBattle } from '../logic/bh94-story-battle.js';
import { toast } from './common.js';
import { getRes, prog } from '../logic/progress.js';
import { BT, S, set_view, tickWater, view } from '../core/state.js';
import { persist } from '../core/save.js';
import { CRAFT, GEAR_UP_SOL, ITEMS, SHOP_FRAG, grantFrags, raidFrags } from '../logic/gear.js';
import { MEM, RELIC_MAX, isLegend, relicBuy } from '../logic/relics.js';
import { BATTLE_WATER, GEAR_COST, LVL_COST, MAX_GEAR, MAX_LVL, RAID_SCENES, ROMAN, RW_NAME, STAR_COST, WMAX, todayKey } from '../logic/economy.js';
import { JK, JR } from '../data/journeys.js';
import { NODES, campNodes, nodeOpen } from '../data/campaigns.js';
import { aiPlan } from '../logic/battle/ai.js';
import { abilityReady } from '../logic/battle/engine.js';
import { unitPower } from '../logic/battle/stats.js';
import { RAID_TIERS } from '../data/boss.js';
import { skMax } from '../logic/battle/skills.js';
import { CH } from '../data/chars.js';
import { amt } from '../core/format.js';
import { $ } from '../core/dom.js';
import { DAILY, qState, quest } from '../logic/daily.js';
import { addRes, grantShards } from '../logic/rewards.js';

// ===== events =====
document.addEventListener('click', e => {
  const sl = e.target.closest('[data-sqlead]'); if (sl) { const a = sqArr(), k = +sl.dataset.sqlead, id = a[k]; a.splice(k, 1); a.unshift(id); persist(); return renderSquadSel(); }
  const sr = e.target.closest('[data-sqrm]'); if (sr) { sqArr().splice(+sr.dataset.sqrm, 1); persist(); return renderSquadSel(); }
  const inf = e.target.closest('[data-info]');
  if (inf && !inf.closest('button') && !(BT && BT.B && !BT.done)) { openInfo(inf.dataset.info); return; }
  if (BT && BT.lpFired) { BT.lpFired = false; e.preventDefault(); e.stopPropagation(); return; }
  if (e.target.closest('#bpop') && (!e.target.closest('.bpopbox') || e.target.closest('[data-bpopx]'))) return bPopClose();
  if (e.target.closest('#bpop')) { const b = e.target.closest('button'); if (b) meta2Click(b.dataset); return; }
  const t = e.target.closest('button, [data-fxu], .unit.tgt, .detail');
  if (!t) return;
  const d = t.dataset;
  if (d.rwok) { const w = $('#rwwin'); if (w) w.remove(); setTimeout(() => { showCeleb(); renderNotes(); }, 50); return; }
  if (recyclerClick(d)) { e.stopImmediatePropagation(); if (d.ixback) render(); return; }
  if (d.ixenter) { closeInfo(true); closeOverlay(); set_view('recycler'); render(); return; }
  if (metaClick(d) || meta2Click(d) || celebClick(d) || cqClick(d)) return;
  if (d.bh9Stage !== undefined) { if (selectBaronStage(Number(d.bh9Stage))) render(); return; }
  if (d.bh9Start !== undefined) { const outcome=launchBaronLegend(Number(d.bh9Start)); if (!outcome.ok) toast('Восхождение недоступно: '+outcome.reason); return; }
  if (d.storyEvent) { if(selectStoryEvent(d.storyEvent))render(); return; }
  if (d.storyStage !== undefined) { if(selectStoryStage(Number(d.storyStage)))render(); return; }
  if (d.storyStart) {
    const [id,index]=d.storyStart.split(':');
    const prepared=prepareStoryUnlockBattle(S,id,Number(index),todayKey());
    if(!prepared.ok) { toast('Событие пока недоступно: '+prepared.reason); return; }
    if(!launchStoryUnlock(prepared))toast('Не удалось начать сюжетный бой');
    return;
  }
  if (campaign20Action(d)) { render(); return; }
  if (d.v) { if (d.v === 'camp') campaign20Start(); set_view(d.v); render(); return; }
  if (d.csel !== undefined) { set_campSel(+d.csel); render(); return; }
  if (d.iclose !== undefined && (t.tagName === 'BUTTON' || e.target === t)) return closeInfo();
  if (d.goto) { closeInfo(true); if (BT && BT.B) leaveBattle(); closeOverlay(); set_view(d.goto); render(); return; }
  if (d.refill) return doRefill(d.refill);
  if (d.shfind) return openInfo('shard:' + d.shfind);
  if (d.bio) return openInfo('bio:' + d.bio);
  if (d.glopen) { const p = prog(d.glopen); if (!p.stars) return toast('Сначала откройте персонажа'); if (S.wol < 1) return hcFind('wol'); S.wol -= 1; p.gl = true; persist(); toast('Ультимативная способность открыта!'); render(); return openDetail(d.glopen); }
  if (d.rotok) { try { sessionStorage.setItem('rotok', '1'); } catch (e) {} $('#rotate').hidden = true; return; }
  if (d.fullscr) { const el = document.documentElement; Promise.resolve(el.requestFullscreen && el.requestFullscreen()).then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape')).catch(() => {}).finally(() => { $('#rotate').hidden = true; }); return; }
  if (d.cal) return openCalendar();
  if (d.calclaim) return claimLogin();
  if (d.qclaim) return claimQuest(d.qclaim);
  if (d.qall) { const L = []; for (const q of DAILY) if (qState(q) === 'done') L.push(...(claimQuest(q.k, true) || [])); refreshAll(); if (L.length) rewardWin('Задания дня', L); return; }
  if (d.qchest) return claimChest();
  if (d.sqgo) return sqGo();
  if (d.sqback) { set_SQ(null); closeOverlay(); render(); return; }
  if (d.sqclear) { sqArr().length = 0; persist(); return renderSquadSel(); }
  if (d.sqf) { SQ.f = d.sqf; return renderSquadSel(); }
  if (d.sqadd) { const a = sqArr(), id = d.sqadd; if (a.includes(id)) a.splice(a.indexOf(id), 1); else if (isLegend(id) && a.some(isLegend)) { toast('В отряде может быть только одна легенда'); return; } else if (a.length < (SQ && SQ.mode === 'journey' && SQ.i >= 3 ? 4 : 5)) a.push(id); else { toast(SQ && SQ.mode === 'journey' && SQ.i >= 3 ? 'Можно выбрать только четырёх героев' : 'В отряде уже 5 бойцов: уберите кого-нибудь'); return; } persist(); return renderSquadSel(); }
  if (d.skup) {
    const [cid, k] = d.skup.split(':'), p = prog(cid), lv = p.sk[k] || 1;
    if (!p.stars || lv >= skMax(CH[cid], k)) return;
    const c = skCost(lv + 1), lack = lackKey(c); if (lack) return hcFind(lack);
    S.solari -= c.sol; S.folio -= c.folio || 0; S.seal -= c.seal || 0; S.wol -= c.wol || 0; p.sk[k] = lv + 1; quest('skill');
    persist(); toast(`${CH[cid].sn}: умение повышено до ${lv + 1}`); render(); return openDetail(cid);
  }
  if (d.dlgnext) return dlgNext();
  if (d.dlgskip) return dlgEnd();
  if (d.dlgview !== undefined) return playDialog(+d.dlgview, null);
  if (d.dlgtoggle) { S.skipDlg = !S.skipDlg; persist(); render(); return; }
  if (d.iswitch) return openInfo(d.iswitch);
  if (d.ishow) { closeInfo(true); return openDetail(d.ishow); }
  if (d.xsim) return doXSim(d.xsim);
  if (d.jkey) { S.jKey = d.jkey; persist(); closeInfo(true); closeOverlay(); set_view('legend'); render(); return; }
  if (d.ctab) { campaign20Legacy(); S.campTab = d.ctab; set_campSel(null); closeInfo(true); closeOverlay(); set_view('camp'); render(); return; }
  if (d.cch !== undefined) { S.campCh[S.campTab] = +d.cch; set_campSel(null); render(); return; }
  if (d.shoptab) { S.shopTab = d.shoptab; closeInfo(true); closeOverlay(); set_view('shop'); render(); return; }
  if (d.goto === 'chron') { S.campTab = 'C'; set_campSel(null); closeInfo(true); closeOverlay(); set_view('camp'); render(); return; }
  if (d.node) { closeInfo(true); if (BT && BT.B) leaveBattle(); return openSquadSel('camp', +d.node); }
  if (d.sim) return openSim(+d.sim);
  if (d.simgo) return runSim();
  if (rosterClick(d)) return;
  if (d.open) return openDetail(d.open);
  if (d.slot) { const [cid, k] = d.slot.split(':'); return openItem(cid, +k); }
  if (d.gearpart && itemCtx) return openItem(itemCtx.cid, itemCtx.k, d.gearpart);
  if (d.gearroot && itemCtx) return openItem(itemCtx.cid, itemCtx.k);
  if (d.gearfind && itemCtx) {
    const { cid, k, partId } = itemCtx, it = slotState(cid, k).it;
    set_INFO_BACK({ label: 'К предмету', open: () => openItem(cid, k, partId) });
    return openInfo(partId ? 'gefrag:' + (partId.replace(/^part:/,'frag:')) : 'gegear:' + it.id);
  }
  if (d.buildpart && itemCtx) {
    const { cid, k } = itemCtx, it = slotState(cid, k).it;
    const wallet = { sol: S.solari, pl: S.plast };
    const res = buildPart(it.id, d.buildpart, S.inv, S.gearParts, wallet);
    if (!res.ok) return toast('Недостаточно материалов');
    S.solari = wallet.sol; S.plast = wallet.pl;
    persist(); toast('Компонент создан');
    render(); return openItem(cid, k);
  }
  if (d.iback) { if ($('#overlay2 .isheet')) closeInfo(true); return openDetail(d.iback); }
  if (d.goraid) { closeOverlay(); set_view('raid'); render(); return; }
  if (d.craft && itemCtx) {
    const { cid, k } = itemCtx, s = slotState(cid, k), p = prog(cid);
    if (p.eq[k] || !p.stars) return;
    const wallet = { sol: S.solari, pl: S.plast };
    const result = craftAndEquip(s.it.id, S.inv, S.gearParts, wallet, S.gearOwned);
    if (!result.ok) return toast('Недостаточно материалов для сборки');
    S.solari = wallet.sol; S.plast = wallet.pl;
    p.eq[k] = true; quest('craft'); persist();
    toast(`${s.it.n} надет: ${CH[cid].sn}`);
    if ($('#overlay2 .isheet')) closeInfo(true);
    render(); return openDetail(cid);
  }
  if (d.gup) { const p = prog(d.gup); if (p.gear < MAX_GEAR && p.gear < gearCap() && p.eq.every(Boolean) && S.solari >= GEAR_UP_SOL(p.gear)) { const s0 = heroSnap(d.gup); S.solari -= GEAR_UP_SOL(p.gear); p.gear++; p.eq = [false, false, false, false, false, false]; persist(); celebQueue({ type: 'hup', kind: 'gear', id: d.gup, from: ROMAN[p.gear - 1], to: ROMAN[p.gear], s0 }); } render(); return openDetail(d.gup); }
  if (d.relic) {
    const id = d.relic, p = prog(id), s0 = heroSnap(id);
    const result = relicBuy(S, id, p);
    if (!result.ok) return result.reason === 'locked' ? null : hcFind(result.reason);
    persist(); celebQueue({ type: 'hup', kind: 'relic', id, from: MEM(result.level - 1), to: MEM(result.level), s0 });
    render(); return openDetail(id);
  }
  if (d.dnav) return detailNav(+d.dnav);
  if (d.hcsk) return hcSkill(d.hcsk);
  if (d.hcmem) return hcMem(d.hcmem);
  if (d.hcstat) return hcStat();
  if (d.skt) return skTab(+d.skt);
  if (d.hcfind) return hcFind(d.hcfind);
  if (d.ibk) return infoBack();
  if (d.isim) { return doXSim(d.isim); }
  if (false) {
    const [i, kk] = d.isim.split(':').map(Number), cost = kk * BATTLE_WATER; tickWater();
    if (S.water < cost || S.cleared[i] !== 3) return;
    const wasFull = S.water >= WMAX(); S.water -= cost; quest('water', cost); if (wasFull) S.waterTs = Date.now();
    const before = itemCtx ? (S.inv[slotState(itemCtx.cid, itemCtx.k).it.id] || 0) : 0;
    simCore(i, kk); persist(); render();
    if (itemCtx) { const after = S.inv[slotState(itemCtx.cid, itemCtx.k).it.id] || 0; toast(`Симуляция ×${kk}: +${amt('frag', after - before)} нужного предмета`); openItem(itemCtx.cid, itemCtx.k); }
    return;
  }
  if (d.fbuy) {
    const parts = d.fbuy.split(':'), q = Number(parts.pop()), id = parts.join(':');
    const item = ITEMS[id.startsWith('frag:') ? id.split(':')[1] : id];
    if (!item || !Number.isInteger(q) || q < 1 || !id.startsWith('frag:')) return;
    const cost = q * SHOP_FRAG[item.t];
    if (S.teeth >= cost) {
      S.teeth -= cost; S.inv[id] = (S.inv[id] || 0) + q;
      quest('shop'); persist(); toast(`+${amt('frag', q)} ${item.n} · компонент`);
    }
    refreshAll(); return;
  }
  if (d.dback || (d.close && (t.tagName === 'BUTTON' || e.target === t) && DETAIL_BACK && $('#overlay .csheet'))) { const f = DETAIL_BACK; set_DETAIL_BACK(null); return f ? f() : closeOverlay(); }
  if (d.close && (t.tagName === 'BUTTON' || e.target === t)) return closeOverlay();
  if (d.sq) { const id = d.sq; if (S.squad.includes(id)) S.squad = S.squad.filter(x => x !== id); else if (isLegend(id) && S.squad.some(isLegend)) { toast('В отряде может быть только одна легенда'); return; } else if (S.squad.length < 5) S.squad.push(id); persist(); render(); return openDetail(id); }
  if (d.lead) { S.squad = [d.lead, ...S.squad.filter(x => x !== d.lead)]; persist(); render(); return openDetail(d.lead); }
  if (d.sksel) { const [cid, k] = d.sksel.split(':'); set_detailSk(k); const sc = $('#overlay .csheet') && $('#overlay .csheet').scrollTop; openDetail(cid); if ($('#overlay .csheet')) $('#overlay .csheet').scrollTop = sc; return; }
  if (d.lvlto) { const id = d.lvlto, p = prog(id), to = Math.min(heroCap(), +($('#lvlr') || {}).value || p.lvl), c = lvlCost(p.lvl, to); if (to <= p.lvl) return; if (S.solari < c) { toast('Не хватает соляриев'); return openInfo('sol'); } const s0 = heroSnap(id), l0 = p.lvl; S.solari -= c; quest('lvl', to - p.lvl); p.lvl = to; persist(); celebQueue({ type: 'hup', kind: 'lvl', id, from: l0, to, s0 }); render(); return openDetail(id); }
  if (d.lvl || d.lvl5) { const id = d.lvl || d.lvl5, p = prog(id); if (p.lvl < MAX_LVL && S.solari < LVL_COST(p.lvl)) { toast(`Не хватает соляриев`); return openInfo('sol'); } let n = d.lvl5 ? 5 : 1; while (n-- > 0 && p.lvl < MAX_LVL && S.solari >= LVL_COST(p.lvl)) { S.solari -= LVL_COST(p.lvl); p.lvl++; quest('lvl'); } persist(); render(); return openDetail(id); }
  if (d.star) { const p = prog(d.star), need = nextShards(p), st0 = p.stars, pw0 = unitPower(CH[d.star], p); if (need && p.shards < need) return openInfo('shard:' + d.star); setTimeout(() => { if (prog(d.star).stars > st0) celebQueue({ type: 'star', id: d.star, from: st0, to: prog(d.star).stars, pw0 }); }, 0); if (need && p.shards >= need && S.solari < STAR_COST(p.stars)) { toast(`Не хватает ${amt('sol', STAR_COST(p.stars) - S.solari)} соляриев`); return openInfo('sol'); } if (need && p.shards >= need && S.solari >= STAR_COST(p.stars)) { S.solari -= STAR_COST(p.stars); p.shards -= need; p.stars++; toast(`${CH[d.star].sn}: ${p.stars}★`); } persist(); if (infoKey) return refreshAll(); render(); return openDetail(d.star); }
  if (d.gear) { const p = prog(d.gear), c = GEAR_COST(p.gear); if (p.gear < MAX_GEAR && S.solari >= c.sol && S.plast >= c.pl) { S.solari -= c.sol; S.plast -= c.pl; p.gear++; } persist(); render(); return openDetail(d.gear); }
  if (d.raidstart) { const T = RAID_TIERS[+d.raidstart]; S.raid = { tier: +d.raidstart, hp: T.hp, maxHp: T.hp, used: [], log: [] }; S.raidPick = []; persist(); render(); return; }
  if (d.pick) {
    const [kind, id] = d.pick.split(':'), box = kind === 'raid' ? S : S.jPicks, key = kind === 'raid' ? 'raidPick' : JK();
    const a = box[key]; if (a.includes(id)) box[key] = a.filter(x => x !== id); else if (a.length < 5) a.push(id); else return toast('В отряде уже пять бойцов');
    persist(); render(); return;
  }
  if (d.raidgo && S.raid) return openSquadSel('raid', S.raid.tier);
  if (false) { const R = S.raid; return launch({ mode: 'raid', scene: RAID_SCENES[R.tier], title: 'Шаи-Хулуд · ' + RAID_TIERS[R.tier].n.split(' · ')[0], squad: S.raidPick.slice(), boss: { tier: R.tier, hp: R.hp, maxHp: R.maxHp } }); }
  if (d.raidend && S.raid) {
    if (t.dataset.confirm !== '1') { t.dataset.confirm = '1'; t.textContent = 'Точно закончить? Нажмите ещё раз'; return; }
    const pct = raidPct(), tier = S.raid.tier, rw = raidReward(tier, pct, false), rf = raidFrags(tier, pct), cr = Math.floor([5, 12, 25][tier] * pct * .6); S.teeth += rw.teeth; S.plast += rw.pl; S.solari += rw.sol; S.cry += rw.cry; S.folio += rw.folio; S.seal += rw.seal; S.ix_plate = (S.ix_plate || 0) + Math.floor(cr / 2); grantFrags(rf); S.raid = null; persist(); render();
    const lines = [`+${amt('teeth', rw.teeth)} зубов червя`, `+${amt('sol', rw.sol)} соляриев`, `+${amt('pl', rw.pl)} пластали`, `+${amt('cry', rw.cry)} кристаллов`, `+${amt('folio', rw.folio)} фолиантов`, ...(rw.seal ? [`+${amt('seal', rw.seal)} Печать Ландсраада`] : []), ...(cr ? [`+${amt('ix_plate', Math.floor(cr / 2))} плат Икса`] : []), ...fragLines(rf)];
    $('#overlay').innerHTML = `<div class="result won raidres"><div class="box" role="dialog" aria-modal="true">${WORM_BADGE}<h3>Награда рейда</h3><p class="sub" style="margin:0">${RAID_TIERS[tier].n} · снято ${(pct * 100).toFixed(1)}% здоровья червя</p><ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul><div class="acts" style="justify-content:center"><button class="btn go" data-close="1">Забрать</button><button class="btn" data-toroster="1">Персонажи</button></div></div></div>`;
    return;
  }
  if (d.jgo) return openSquadSel('journey', +d.jgo);
  if (false) { const i = 0, t = JR().tiers[i]; return launch({ mode: 'journey', scene: JR().scenes[i], i, title: `Легенда ${i + 1}. ${t.n}`, desert: t.desert, squad: S.jPicks[JK()].slice(), enemy: t.enemy.map(id => ({ id, lvl: t.el, stars: t.stars, gear: Math.min(5, 1 + Math.floor(t.el / 7)) })) }); }
  if (d.buy) { const it = findShopItem(d.buy); if (!it) return; const left = shopLeft(it); if (left === 0) return; if (getRes(it.cur) < it.price) { toast(`Не хватает: ${RES_INFO[it.cur] ? RES_INFO[it.cur].n : 'соляриев'}`); return openInfo(it.cur); }
    addRes(it.cur, -it.price); if (it.lim) { buysToday(); S.buys.n[it.key] = (S.buys.n[it.key] || 0) + 1; } quest('shop');
    if (it.kind === 'sh') { const un = grantShards(it.id, it.qty); toast(`+${amt('shard', it.qty, 'shard:' + it.id)} ${CH[it.id].sn}${un ? ' — открыт!' : ''}`); } else { addRes(it.kind, it.qty); toast(`+${amt(it.kind, it.qty)} ${RW_NAME[it.kind]}`); }
    persist(); refreshAll(); return; }
  if (!BT) return;
  if (d.auto) { BT.auto = BT.autoPref = !BT.auto; BT.autoTargetUid = null; if (BT.auto && BT.waiting) { const u = BT.waiting; const p = aiPlan(BT.B, u); doAct(u, p.key, p.target && p.target.uid); } else renderBattle(); return; }
  if (d.bdrawer && BT.pkg9) { BT.drawerOpen = !BT.drawerOpen; renderBattle(); return; }
  if (d.hud && BT.pkg9) { BT.hudVisible = !BT.hudVisible; renderBattle(); return; }
  if (d.log) { BT.showLog = !BT.showLog; renderBattle(); return; }
  if (d.speed) { BT.speed = BT.speedPref = BT.speed >= 4 ? 1 : BT.speed * 2; renderBattle(); return; }
  if (d.quit) { clearTimeout(BT.timer); BT.B.over = 'B'; return finish(); }
  if (d.again) { leaveBattle(); return startBattle(+d.again); }
  if (d.leave === 'lobby') { leaveBattle(); set_view('lobby'); return render(); }
  if (d.tocamp !== undefined || d.cnext !== undefined) {
    const i = +(d.cnext ?? d.tocamp), n = NODES[i], nx = d.cnext !== undefined ? i : (NODES[i + 1] && NODES[i + 1].camp === n.camp && nodeOpen(i + 1) ? i + 1 : (campNodes(n.camp).find(j => nodeOpen(j) && !S.cleared[j]) ?? i));
    leaveBattle(); S.campTab = NODES[nx].camp; S.campCh[NODES[nx].camp] = NODES[nx].c; set_campSel(nx); set_view('camp'); render();
    if (d.cnext !== undefined) openSquadSel('camp', nx);
    return;
  }
  if (d.leave) return leaveBattle();
  if (d.ab && BT.waiting) {
    const u = BT.waiting, k = d.ab;
    if (!abilityReady(BT.B, u, k)) { const cd = u.cd[k] > 0 ? u.cd[k] : 0; toast(k === 'gl' ? 'Ульта ещё не заряжена' : cd ? `Перезарядка: ${cd}` : 'Не хватает меланжа'); return; }
    return useAbil(u, k);
  }
  if (d.fxu && BT) return openFxPop(d.fxu);
  if (t.classList.contains('tgt') && BT.auto && BT.B && !BT.B.over) {
    BT.autoTargetUid = BT.autoTargetUid === t.dataset.uid ? null : t.dataset.uid;
    BT.autoTaunts = BT.B.units.filter(u => u.side === 'B' && u.alive && u.fx.taunt).map(u => u.uid);
    renderBattle(); return;
  }
  if (t.classList.contains('tgt') && BT.waiting) { if (BT.cur !== t.dataset.uid) { BT.cur = t.dataset.uid; renderBattle(); } return; }
});
document.addEventListener('input', e => { if (e.target.id === 'simn') updSim(); });
document.addEventListener('input', e => { if (e.target && e.target.id === 'lvlr') updLvl(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target && e.target.id === 'pnick') { e.preventDefault(); metaClick({ pnick: 1 }); return; }
  if (DLG) { if (e.key === 'Escape') { dlgEnd(); return; } if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); dlgNext(); return; } }
  if (e.key === 'Escape' && $('#bpop')) { bPopClose(); return; }
  if ((e.key === 'Enter' || e.key === ' ') && document.activeElement && document.activeElement.dataset && document.activeElement.dataset.fxu) { e.preventDefault(); openFxPop(document.activeElement.dataset.fxu); return; }
  if (e.key === 'Escape' && $('#overlay2').innerHTML) { closeInfo(); return; }
  if (e.key === 'Escape' && SQ) { set_SQ(null); closeOverlay(); render(); return; }
  if (e.key === 'Escape' && !(BT && BT.B) && $('#overlay').innerHTML) closeOverlay();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('tgt')) { e.preventDefault(); e.target.click(); }
});

