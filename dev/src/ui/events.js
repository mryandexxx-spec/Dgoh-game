// ui/events.js — строки 4473–4621 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { DLG, bPopClose, dlgEnd, dlgNext, doAct, finish, launch, launchBaronLegend, launchStoryUnlock, leaveBattle, openFxPop, playDialog, renderBattle, startBattle, useAbil } from './battle/battle-ui.js';
import { cqClick, cqPop } from './views/conq.js';
import { celebClick, celebQueue, showCeleb } from './overlays/celebrate.js';
import { meta2Click } from './overlays/battle-settings.js';
import { renderNotes } from './notifications.js';
import { gearCap, heroCap } from '../logic/account-rules.js';
import { metaClick } from './wiring.js';
import { WORM_BADGE, detailNav, heroSnap } from './hero-window.js';
import { buysToday, findShopItem, shopLeft } from './views/shop.js';
import { raidPct, raidReward } from './views/raid.js';
import { SQ, openSquadSel, renderSquadSel, set_SQ, sqArr, sqGo } from './overlays/squad-select.js';
import { claimLogin, openCalendar } from './overlays/calendar.js';
import { claimChest, claimQuest } from './views/daily.js';
import { fragLines, giveRewards, rewardWin } from './rewards.js';
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
import { campaign20Action, campaign20Start, campaign20Legacy, campaign20FocusCurrent, campaign20JumpToMission } from './views/campaign20.js';
import { render } from './router.js';
import { selectStoryEvent, selectStoryStage } from './views/story-events.js';
import { selectBaronStage } from './views/baron-journey.js';
import { prepareStoryUnlockBattle } from '../logic/bh94-story-battle.js';
import { renderRes, toast } from './common.js';
import { getRes, prog } from '../logic/progress.js';
import { BT, S, set_view, tickWater, view } from '../core/state.js';
import { loadSave, persist } from '../core/save.js';
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

// ARCH-02C-B4-B4a: Conquest track claims live at the existing UI event seam.
// The SHA-frozen ui/views/conq.js remains byte-identical. Do not fall through
// to its unchecked legacy handler after a denied/uncertain gated transaction.
// No extra ESM module or changed bootstrap order is necessary.
function cqVerifiedClaimClick(d) {
  if (d.cqst === undefined && d.cqopen === undefined) return false;
  if (!loadSave.writer.state().gated) return false; // historical B0 harness
  const { cq, cqCanClaim, cqChest, cqStCan, cqStatic, CQ_CHESTS } = openSquadSel.conquestClaimRules();
  if (d.cqst !== undefined) {
    const j = Number(d.cqst);
    if (!Number.isInteger(j) || j < 0) return true;
    const tx = loadSave.writer.transact(() => {
      if (!cqStCan(j)) return { commit: false, value: 'not-claimable' };
      const rr = cqStatic(j);
      cq().tk['s' + j] = 1;
      giveRewards(rr); // queued shard presentation; no UI until verified
      return rr;
    }, giveRewards.presentationHooks);
    if (!tx.ok) return true;
    const rr = tx.value;
    const el = document.querySelector(`[data-cqst="${j}"]`);
    if (el) {
      cqPop(el, rr.map(r => '+' + amt(r[0], r[1], r[2] ? 'shard:' + r[2] : undefined)).join(' '));
      el.outerHTML = `<div class="cqst1 got">${el.innerHTML.replace(/<em>.*?<\/em>/, '<i>✓</i>')}</div>`;
    }
    renderRes();
    return true;
  }
  const i = Number(d.cqopen);
  if (!Number.isInteger(i) || i < 0 || i >= CQ_CHESTS.length) return true;
  const tx = loadSave.writer.transact(() => {
    // Re-evaluate current-week score and the one-time token on the detached
    // candidate. RNG, token, max-chest statistic and resources share one write.
    if (!cqCanClaim(i)) return { commit: false, value: 'not-claimable' };
    const rw = cqChest(i);
    const pick = rw.any[Math.floor(Math.random() * rw.any.length)];
    cq().tk['c' + i] = 1;
    if (i === CQ_CHESTS.length - 1) S.stats.cqMax = (S.stats.cqMax || 0) + 1;
    return giveRewards([...rw.fix, pick]);
  }, giveRewards.presentationHooks);
  if (!tx.ok) return true;
  render();
  const lines = tx.value;
  $('#overlay').innerHTML = `<div class="result won"><div class="box" role="dialog" aria-modal="true"><div class="mousewrap">${rewardWin.mouseSVG()}</div><h3>Сундук Джихада · ◆${CQ_CHESTS[i]}</h3><ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul><div class="acts" style="justify-content:center"><button class="btn go" data-close="1">Забрать</button></div></div></div>`;
  return true;
}

// ARCH-02C-B4-B4b1: weekly disk grants and their feat notifications
// settle in ONE verified checkpoint. Frozen ui/views/conq.js is untouched.
// Rule access is lazy via the existing B4a UI bridge: zero new ESM edges.
// NOTES is a transient presentation queue outside S; a rejected candidate
// must not leave an uncommitted feat notification in the live realm.
function cqVerifiedDiskClick(d) {
  if (d.cqdiff === undefined && d.cqdisk === undefined && d.cqnd === undefined) return false;
  if (!loadSave.writer.state().gated) return false; // historical ungated harness
  const r = openSquadSel.conquestClaimRules();
  const previousNotes = r.notes.length;
  let tx;
  if (d.cqdiff !== undefined) {
    const diff = String(d.cqdiff);
    tx = loadSave.writer.transact(() => {
      const C = r.cq();
      if (C.diff || !r.cqDifficultyAccess(diff))
        return { commit: false, value: 'difficulty-unavailable' };
      C.diff = diff;
      C.pick = r.cqDiskPick('start');
      return { notice: null };
    });
  } else if (d.cqdisk !== undefined) {
    const disk = String(d.cqdisk);
    tx = loadSave.writer.transact(() => {
      const C = r.cq();
      if (!C.pick || !C.pick.includes(disk) || C.disks.some(x => x.k === disk))
        return { commit: false, value: 'disk-unavailable' };
      r.cqAddDisk(disk);
      C.pick = null;
      return { notice: r.cqRar(disk).n + ' диск «' + r.CQ_DISKS[disk].n + '» установлен' };
    });
  } else {
    const raw = String(d.cqnd), sep = raw.indexOf(':');
    if (sep < 0 || raw.indexOf(':', sep + 1) >= 0) return true;
    const key = raw.slice(0, sep), disk = raw.slice(sep + 1);
    if (!/^[0-4]-[0-9]+-[0-9]+$/.test(key)) return true; // 5 deterministic sectors
    tx = loadSave.writer.transact(() => {
      const C = r.cq(), a = r.cqNode(key);
      if (!a || a.type !== 'disk' || C.done[key] || !r.cqOpen(a))
        return { commit: false, value: 'node-unavailable' };
      const offered = r.cqNodeDisks(a);
      if (disk ? !offered.includes(disk) || C.disks.some(x => x.k === disk) : offered.length !== 0)
        return { commit: false, value: 'disk-not-offered' };
      let notice = null;
      if (disk) {
        r.cqAddDisk(disk);
        notice = r.cqRar(disk).n + ' диск «' + r.CQ_DISKS[disk].n + '» ' +
          (C.disks.find(x => x.k === disk).on ? 'надет' : 'отправлен в запас');
      }
      C.done[key] = 1;
      r.cqCommitRoute(a);
      return { notice };
    });
  }
  if (!tx.ok) {
    // writer.transact restores detached S, but NOTES lives outside S.
    // All action stages are synchronous, so no unrelated note can interleave.
    r.notes.length = previousNotes;
    return true; // never fall through to the unverified Conquest handler
  }
  if (tx.value.notice) toast(tx.value.notice);
  render(); // only committed choices are acknowledged
  return true;
}

// ARCH-02C-B4-B4b2: settlement for all remaining Conquest store, energy,
// consumable and cache-path actions. Every payable mutation revalidates inside
// detached writer state. No new ESM imports and no edits to frozen conq.js.
// Some Conquest feat notifications live in NOTES outside the v1 save; roll them
// back on any denied/uncertain checkpoint, alongside writer's rollback of S.
function cqVerifiedEconomyClick(d) {
  if (d.cqnode === undefined && d.cqsec === undefined && d.cqbuy === undefined &&
      d.cqjbuy === undefined && d.cqmed === undefined && d.cqrf === undefined &&
      d.cqdon === undefined && d.cqdoff === undefined) return false;
  if (!loadSave.writer.state().gated) return false; // historical B0 characterization
  const r = openSquadSel.conquestClaimRules();
  const run = stage => {
    const before = r.notes.length;
    const tx = loadSave.writer.transact(stage, giveRewards.presentationHooks);
    if (!tx.ok) r.notes.length = before;
    return tx;
  };
  const nodeKeyValid = k => /^[0-4]-(?:[0-9]|1[01])-[0-9]+$/.test(k);
  if (d.cqnode !== undefined) {
    const key = String(d.cqnode);
    if (!nodeKeyValid(key)) return true;
    const tx = run(() => {
      const C = r.cq(), a = r.cqNode(key);
      if (!a) return { commit: false, value: { kind: 'invalid' } };
      if (a.type !== 'cache' || C.done[key] || !r.cqOpen(a))
        return { commit: false, value: { kind: 'select', key } };
      C.sel = key;
      C.done[key] = 1;
      r.cqCommitRoute(a);
      return { kind: 'unlocked' };
    });
    if (!tx.ok) {
      // Original cqClick persists only a newly opened cache. Other node taps
      // set a local map selection without a storage write; retain that contract.
      if (tx.status === 'cancelled' && tx.value?.kind === 'select' &&
          loadSave.writer.state().status === 'owned') {
        r.cq().sel = key;
        render();
      }
      return true;
    }
    render();
    return true;
  }
  if (d.cqsec !== undefined) {
    const sec = Number(d.cqsec);
    if (!Number.isInteger(sec) || sec < 0 || sec > 4) return true;
    const tx = run(() => {
      const C = r.cq();
      if (!C.diff || sec > C.open) return { commit: false, value: 'sector-locked' };
      if (C.sec === sec && C.sel === null)
        return { commit: false, value: 'no-change' };
      C.sec = sec;
      C.sel = null;
      return sec;
    });
    if (tx.ok) render();
    return true;
  }
  if (d.cqbuy !== undefined) {
    const spec = String(d.cqbuy), sep = spec.indexOf(':');
    if (sep < 0 || spec.indexOf(':', sep + 1) >= 0) return true;
    const key = spec.slice(0, sep), idx = Number(spec.slice(sep + 1));
    if (!nodeKeyValid(key) || !/^(0|[1-9][0-9]*)$/.test(spec.slice(sep + 1)) ||
        !Number.isSafeInteger(idx)) return true;
    const tx = run(() => {
      const C = r.cq(), a = r.cqNode(key);
      if (!a || a.type !== 'cache' || !C.done[key])
        return { commit: false, value: 'cache-locked' };
      const got = C.buy[key] || [];
      if (got.includes(idx)) return { commit: false, value: 'sold' };
      const item = r.cqGoods(key)[idx];
      if (!item || !Array.isArray(item.cost)) return { commit: false, value: 'unknown-item' };
      const [resource, price] = item.cost;
      if (!Number.isFinite(price) || price < 0 ||
          getRes(resource) < price)
        return { commit: false, value: { kind: 'short', resource } };
      addRes(resource, -price);
      (C.buy[key] ??= []).push(idx);
      const lines = item.rw ? giveRewards(item.rw) : [item.use()];
      return { kind: 'purchased', lines };
    });
    if (!tx.ok) {
      if (tx.status === 'cancelled' && tx.value?.kind === 'short') openInfo(tx.value.resource);
      return true;
    }
    toast(tx.value.lines.join(' · '));
    render();
    return true;
  }
  if (d.cqjbuy !== undefined) {
    const key = String(d.cqjbuy);
    const tx = run(() => {
      const item = r.cqShopOffer().find(x => x.key === key);
      if (!item || item.sold) return { commit: false, value: 'sold' };
      if ((S.jt || 0) < item.price)
        return { commit: false, value: 'short-trophies' };
      S.jt -= item.price;
      let notice;
      if (key === 'med') {
        S.cqMed = (S.cqMed || 0) + 1;
        notice = 'Аптечка в запасе';
      } else if (key === 'med3') {
        S.cqMed = (S.cqMed || 0) + 3;
        notice = '+3 аптечки';
      } else {
        const disk = key.slice(2), C = r.cq();
        if (!key.startsWith('d:') || !r.CQ_DISKS[disk] ||
            C.disks.some(x => x.k === disk))
          return { commit: false, value: 'disk-owned' };
        if (!S.cqShop || S.cqShop.wk !== C.wk)
          S.cqShop = { wk: C.wk, b: {} };
        S.cqShop.b[key] = 1;
        r.cqAddDisk(disk);
        notice = 'Диск «' + r.CQ_DISKS[disk].n + '» — ' +
          (C.disks.find(x => x.k === disk).on ? 'надет' : 'в запасе');
      }
      return notice;
    });
    if (!tx.ok) {
      if (tx.status === 'cancelled' && tx.value === 'short-trophies')
        toast('Не хватает трофеев Джихада');
      return true;
    }
    toast(tx.value);
    render();
    return true;
  }
  if (d.cqmed !== undefined) {
    const id = String(d.cqmed);
    if (!CH[id] || !prog(id)?.stars) return true;
    const tx = run(() => {
      if (!S.cqMed || r.cqSta(id) >= 100)
        return { commit: false, value: 'no-medkit-or-full' };
      S.cqMed--;
      r.cqStaSet(id, r.cqSta(id) + r.CQ_MED);
      return r.cqSta(id);
    });
    if (!tx.ok) return true;
    toast(CH[id].sn + ': выносливость ' + tx.value + '%');
    render();
    return true;
  }
  if (d.cqrf !== undefined) {
    const needed = Number(d.cqrf), want = Number.isFinite(needed) && needed > 0 ? needed : 0;
    const tx = run(() => {
      const n = r.cqRfN(), price = r.cqRfCost();
      if (n >= r.CQ_REFILL_MAX)
        return { commit: false, value: 'daily-limit' };
      if (S.cry < price)
        return { commit: false, value: 'short-crystals' };
      S.cry -= price;
      r.cqEn();
      r.cq().en += r.CQ_RF_AMT;
      S.cqRf = { d: todayKey(), n: n + 1 };
      return r.cq().en;
    });
    if (!tx.ok) {
      if (tx.status === 'cancelled' && tx.value === 'short-crystals')
        openInfo('cry');
      return true;
    }
    toast('+' + r.CQ_RF_AMT + ' Решимости');
    if (view === 'conq') render();
    // Presentation-only delegate reopens the frozen view's refill window.
    // No legacy payment branch is ever invoked after this transaction.
    cqClick({ cqres: '1' });
    return true;
  }
  const equip = d.cqdon !== undefined, key = String(equip ? d.cqdon : d.cqdoff);
  const tx = run(() => {
    const C = r.cq(), disk = C.disks.find(x => x.k === key);
    if (!disk) return { commit: false, value: 'not-owned' };
    if (equip) {
      if (disk.on || !r.cqCanOn(key))
        return { commit: false, value: 'cannot-equip' };
      disk.on = 1;
    } else {
      if (!disk.on) return { commit: false, value: 'not-equipped' };
      if (!r.cqEnSpend(r.CQ_EN.unequip))
        return { commit: false, value: 'short-energy' };
      disk.on = 0;
    }
    return true;
  });
  if (!tx.ok) {
    if (tx.status === 'cancelled' && tx.value === 'short-energy')
      toast('Нужно ' + r.CQ_EN.unequip + ' Решимости');
    return true;
  }
  render();
  cqClick({ cqdisks: '1' }); // presentation-only read of saved state
  return true;
}

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
  if (metaClick(d) || meta2Click(d) || celebClick(d) || cqVerifiedClaimClick(d) || cqVerifiedDiskClick(d) || cqVerifiedEconomyClick(d) || cqClick(d)) return;
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
  if (d.c20focus) { campaign20FocusCurrent(); return; }
  if (d.c20item) { openInfo(d.c20item); return; }
  if (d.c20farm!==undefined) {
    const id=Number(d.c20farm);
    if (!campaign20JumpToMission(id)) return;
    closeInfo(true); closeOverlay();
    set_view('camp'); render(); return;
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
  if (d.qclaim) return claimQuest(d.qclaim, false, claimQuest.renderedDay);
  if (d.qall) return claimQuest.all(claimQuest.renderedDay);
  if (d.qchest) return claimChest(claimChest.renderedDay);
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
  if (d.node !== undefined) { closeInfo(true); if (BT && BT.B) leaveBattle(); return openSquadSel('camp', +d.node); }
  if (d.sim !== undefined) return openSim(+d.sim);
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
    // B4-B3: source raid state, partial fraction, loot and raid deletion
    // belong to ONE checked snapshot. No victory dialog before commit.
    const settleRaid = () => {
      if (!S.raid) return { commit: false, value: 'already-ended' };
      const pct = raidPct(), tier = S.raid.tier, rw = raidReward(tier, pct, false), rf = raidFrags(tier, pct), cr = Math.floor([5, 12, 25][tier] * pct * .6);
      S.teeth += rw.teeth; S.plast += rw.pl; S.solari += rw.sol; S.cry += rw.cry; S.folio += rw.folio; S.seal += rw.seal;
      S.ix_plate = (S.ix_plate || 0) + Math.floor(cr / 2);
      grantFrags(rf);
      S.raid = null;
      return { pct, tier, rw, rf, cr };
    };
    let settled;
    if (loadSave.writer.state().gated) {
      const tx = loadSave.writer.transact(settleRaid);
      if (!tx.ok) return; // denied/uncertain storage: retire without showing loot
      settled = tx.value;
    } else {
      settled = settleRaid();
      persist(); // frozen legacy unsafe VM mode, never production
    }
    const { pct, tier, rw, rf, cr } = settled;
    render();
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

