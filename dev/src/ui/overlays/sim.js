// ui/overlays/sim.js — строки 3668–3760 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { infoKey, openInfo } from './info.js';
import { MOUSE_SVG } from '../mouse.js';
import { statInc } from '../../logic/stats.js';
import { accXP, fragLines, rewardWin } from '../rewards.js';
import { itemCtx, openItem, slotState } from './detail.js';
import { detailCid, openDetail } from '../hero-card.js';
import { render } from '../router.js';
import { itemIcon, starStr, thumb, toast } from '../common.js';
import { recipeFor } from '../../logic/gear-crafting.js';
import { enGet, enSpend } from '../../logic/progress.js';
import { S, tickWater } from '../../core/state.js';
import { persist } from '../../core/save.js';
import { ITEMS, grantFrags } from '../../logic/gear.js';
import { CANDLE_REFILL, CRY_WIN, REFILL_AMT, REFILL_MAX, WMAX, campReward, refillCost, refillN, refillPrice, todayKey } from '../../logic/economy.js';
import { NODES, NODE_SCENES, nodeCost, nodeEn, nodeTitle } from '../../data/campaigns.js';
import { sceneThumb } from '../../render2d/scenes.js';
import { CH } from '../../data/chars.js';
import { amt, ic } from '../../core/format.js';
import { $ } from '../../core/dom.js';
import { quest } from '../../logic/daily.js';
import { grantShards } from '../../logic/rewards.js';

function refreshAll() {
  render();
  const it2 = !!$('#overlay2 .isheet');   // v73: окно предмета слоем над карточкой
  if ($('#overlay .csheet') && detailCid) openDetail(detailCid);
  if (($('#overlay .isheet') || it2) && itemCtx) openItem(itemCtx.cid, itemCtx.k, itemCtx.partId); else if (infoKey) openInfo(infoKey, true);
}
function crefillN() { return S.crefills.d === todayKey() ? S.crefills.n : 0; }
function crefillCost() { return refillPrice(crefillN()); }
function doRefill(kind) {
  if ((kind === 'candle' ? crefillN() : refillN()) >= REFILL_MAX) return toast(`Лимит пополнений на сегодня исчерпан: ${REFILL_MAX} из ${REFILL_MAX}`);
  if (kind === 'candle') { const c = crefillCost(); if (S.cry < c) return openInfo('cry'); S.cry -= c; S.candle += CANDLE_REFILL; S.crefills = { d: todayKey(), n: crefillN() + 1 }; persist(); toast(`+${amt('candle', CANDLE_REFILL)} Свечей за ${amt('cry', c)}`); return refreshAll(); }
  const c = refillCost(); if (S.cry < c) return openInfo('cry');
  S.cry -= c; const wasFull = S.water >= WMAX(); S.water += REFILL_AMT; if (!wasFull && S.water >= WMAX()) S.waterTs = Date.now();
  S.refills = { d: todayKey(), n: refillN() + 1 };
  persist(); toast(`+${amt('water', REFILL_AMT)} Воды за ${amt('cry', c)}`); refreshAll();
}
const PART_LABELS = {core:'Сердечник',lens:'Линза',frame:'Каркас',fitting:'Крепление',lining:'Подкладка',seal:'Печать'};
function simFocus(key, context, r) {
  if (context && context.cid && ITEMS[context.itemId]) {
    const item = ITEMS[context.itemId], recipe = recipeFor(item.id);
    const part = context.partId && recipe?.parts?.find(p => p.id === context.partId);
    if (part) {
      const frag = part.materials[0].id, owned = S.inv[frag] || 0;
      const need = S.gearParts?.[part.id] ? 0 : part.materials[0].count;
      const legacy = need ? Math.min(need, S.inv[item.id] || 0) : 0;
      return {kind:'part',key:frag,name:part.name + ' · ' + item.n,
        breadcrumb:CH[context.cid]?.sn + ' → Снаряжение → ' + part.name,
        icon:itemIcon(item,36),gained:r.fr[frag]||0,owned,need,legacy,
        remaining:Math.max(0,need-owned-legacy)};
    }
    const owned = S.gearOwned?.[item.id] || 0;
    return {kind:'gear',key:'gear:' + item.id,name:item.n,icon:itemIcon(item,36),
      breadcrumb:CH[context.cid]?.sn + ' → Готовое снаряжение',
      gained:r.fr['gear:' + item.id]||0,owned,need:1,legacy:0,remaining:Math.max(0,1-owned)};
  }
  if (key?.startsWith('gefrag:')) {
    const frag=key.slice(7), [,id,partName]=frag.split(':'), item=ITEMS[id];
    if (!item) return null;
    const part=recipeFor(id)?.parts?.find(p=>p.materials[0].id===frag);
    const need=part?.materials[0].count||0,owned=S.inv[frag]||0,legacy=S.inv[id]||0;
    return {kind:'part',key:frag,name:(PART_LABELS[partName]||partName)+' · '+item.n,
      icon:itemIcon(item,36),breadcrumb:'Фрагмент рецепта',gained:r.fr[frag]||0,owned,
      need,legacy:Math.min(need,legacy),remaining:Math.max(0,need-owned-legacy)};
  }
  if (key?.startsWith('gegear:')) {
    const id=key.slice(7),item=ITEMS[id];if(!item)return null;
    const owned=S.gearOwned?.[id]||0;
    return {kind:'gear',key:'gear:'+id,name:item.n,icon:itemIcon(item,36),breadcrumb:'Готовое снаряжение',
      gained:r.fr['gear:'+id]||0,owned,need:1,legacy:0,remaining:Math.max(0,1-owned)};
  }
  if (key?.startsWith('frag:')) {
    const id=key.slice(5),item=ITEMS[id];if(!item)return null;
    const owned=S.inv[id]||0,need=recipeFor(id)?.materials?.[0]?.count||0;
    return {kind:'fragment',key:id,name:item.n,icon:itemIcon(item,36),breadcrumb:'Фрагменты предмета',
      gained:r.fr[id]||0,owned,need,legacy:0,remaining:Math.max(0,need-owned)};
  }
  if (key?.startsWith('shard:')) {
    const id=key.slice(6);if(!CH[id])return null;
    return {kind:'shard',key:'shard:'+id,name:CH[id].sn,icon:ic('shard'),
      breadcrumb:'Осколки персонажа',gained:r.sh[id]||0,owned:0,need:0,legacy:0,remaining:0};
  }
  return null;
}
function simulationTiles(r, focusedKey) {
  const tiles=[], push=(icon,label,amount,key)=>{
    if (Number(amount)>0 && key!==focusedKey) tiles.push({icon,label,amount});
  };
  push(ic('sol'),'Солярии',r.sol,'sol');
  push(ic('pl'),'Пласталь',r.pl,'pl');
  push(ic('cry'),'Кристаллы',r.cry,'cry');
  push(ic('folio'),'Фолианты',r.folio,'folio');
  push(ic('rid'),'Ридулианские',r.rid,'rid');
  push(ic('seal'),'Печати',r.seal,'seal');
  for (const [key,qty] of Object.entries(r.signals)) push(ic(key),key,qty,key);
  for (const [id,qty] of Object.entries(r.sh)) push(ic('shard'),CH[id]?.sn||id,qty,'shard:'+id);
  for (const [key,qty] of Object.entries(r.fr)) {
    const full=key.startsWith('gear:'), p=key.startsWith('frag:')?key.split(':'):null;
    const id=full?key.slice(5):p?p[1]:key, item=ITEMS[id];
    if (!item) continue;
    const label=full?'Готовое: '+item.n:p?(PART_LABELS[p[2]]||p[2])+' · '+item.n:'Фрагменты · '+item.n;
    push(itemIcon(item,32),label,qty,key);
  }
  push(ic('xp'),'Опыт аккаунта',r.xp,'xp');
  return tiles;
}
function doXSim(spec) {
  const [i,kk] = spec.split(':').map(Number);
  if (!Number.isInteger(i) || !NODES[i] || !Number.isInteger(kk) || kk<1 || kk>50 || S.cleared[i]!==3) return;
  const en=nodeEn(i),cost=kk*nodeCost(i);tickWater();
  if (enGet(en)<cost) return openInfo(`need:${en}:${cost}`);
  // Capture focus and recipe from the source lookup, prior to any render.
  const originKey=infoKey, context=itemCtx && ($('#overlay .isheet') || $('#overlay2 .isheet') || originKey?.startsWith('gefrag:') || originKey?.startsWith('gegear:'))
    ? {...itemCtx,itemId:slotState(itemCtx.cid,itemCtx.k).it.id} : null;
  enSpend(en,cost);
  const r=simCore(i,kk);persist();
  const focus=simFocus(originKey,context,r);
  refreshAll();
  if (context?.partId) openItem(context.cid,context.k,context.partId);
  const more=enGet(en)>=cost;
  rewardWin(`Симуляция ×${kk}`,r.lines,{
    sim:{mission:nodeTitle(i),spent:amt(en,cost),focus,tiles:simulationTiles(r,focus?.key)},
    ok:'Готово',btns:`<button class="btn go ${more?'':'lack'}" data-isim="${spec}" ${more?'':'disabled'}>Ещё ×${kk}<small>${amt(en,cost)}</small></button>`
  });
}

let simNode = null;
function openSim(i) {
  tickWater();
  const n = NODES[i], en = nodeEn(i), c = nodeCost(i), max = Math.min(50, Math.floor(enGet(en) / c));
  if (max < 1) return openInfo(`need:${en}:${c}`);
  simNode = i;
  $('#overlay').innerHTML = `<div class="detail" data-close="1"><div class="sheet simsheet" role="dialog" aria-modal="true" aria-labelledby="sim-h">
    <div class="hd">${thumb(NODE_SCENES[i], (n.c + 1) + '-' + (n.m + 1))}<div><h3 id="sim-h">Симуляция боя</h3><div style="color:var(--dust);font-size:13px">${nodeTitle(i)} · пройдено на ${starStr(3, 3)}</div></div></div>
    <p class="sub" style="margin:12px 0">Победа засчитывается сразу, без боя, с наградой как за 3★. Каждая симуляция стоит ${amt(en, c)}.</p>
    <label for="simn" class="simlab"><span>Сколько симуляций</span><b class="mono" id="simv"></b></label>
    <input type="range" id="simn" min="1" max="${max}" value="${Math.min(max, 5)}" step="1">
    <div class="simscale mono"><span>1</span><span>${max}</span></div>
    <div class="kv" style="margin-top:12px"><span>Расход</span><div id="simc"></div><span>Награда</span><div id="sime"></div></div>
    <div class="acts"><button class="btn go" data-simgo="1" id="simbtn"></button><button class="btn" data-close="1">Отмена</button></div>
  </div></div>`;
  document.querySelectorAll('#overlay canvas[data-scene]').forEach(sceneThumb);
  updSim();
  $('#simn').focus();
}
function updSim() {
  const el = $('#simn'); if (!el || simNode === null) return;
  const k = +el.value, i = simNode, n = NODES[i], base = campReward(i, 3, true), en = nodeEn(i), ch = n.camp === 'C';
  $('#simv').textContent = '×' + k;
  $('#simc').innerHTML = amt(en, k * nodeCost(i)) + ` <span style="color:var(--dust)">из ${enGet(en)}</span>`;
  $('#sime').innerHTML = `${amt('sol', base.sol * k)} ${amt('pl', base.pl * k)} ${amt('folio', base.folio * k)}${ch ? ' ' + amt('rid', '≈' + Math.round(k * 11.5)) : ''}<br>${amt('shard', '≈' + Math.round(k * (ch ? .84 : .7)))} ${CH[n.drops[0]].sn} · ${amt('shard', '≈' + Math.round(k * .25))} ${CH[n.drops[1]].sn}<br>${amt('frag', '≈' + Math.round(k * 1.6))} фрагментов снаряжения`;
  $('#simbtn').textContent = `Провести ${k}`;
}
function runSim() {
  const i = simNode, k = +$('#simn').value, en = nodeEn(i), cost = k * nodeCost(i);
  tickWater();
  if (enGet(en) < cost) return openInfo(`need:${en}:${cost}`);
  enSpend(en, cost);
  const { lines } = simCore(i, k);
  persist(); render();
  $('#overlay').innerHTML = `<div class="result won"><div class="box" role="dialog" aria-modal="true"><div class="mousewrap">${MOUSE_SVG(false)}</div><h3>Симуляция ×${k}</h3><div style="color:var(--dust)">${nodeTitle(i)} · потрачено ${amt(en, cost)}</div><ul>${lines.map(l => `<li>${l}</li>`).join('')}</ul><div class="acts" style="justify-content:center"><button class="btn go ${enGet(en) >= nodeCost(i) ? '' : 'lack'}" data-sim="${i}">Ещё симуляции</button><button class="btn" data-close="1">Готово</button></div></div></div>`;
}
function simCore(i, k) {
  quest('camp', k); if (NODES[i].camp === 'C') quest('chron', k); statInc('wins', k); const accL = accXP(k * nodeCost(i) * 3);
  let sol = 0, pl = 0, folio = 0, seal = 0, rid = 0; const sh = {}, items = [], signals = {};
  for (let r = 0; r < k; r++) { const rw = campReward(i, 3); sol += rw.sol; pl += rw.pl; folio += rw.folio; seal += rw.seal; rid += rw.rid; if (rw.signals) signals[rw.signals] = (signals[rw.signals] || 0) + 1; items.push(...rw.items); for (const [id, q] of rw.drops) sh[id] = (sh[id] || 0) + q; }
  S.solari += sol; S.plast += pl; grantFrags(items); S.cry += CRY_WIN * k; S.folio += folio; S.seal += seal; S.rid += rid; for (const [key, n] of Object.entries(signals)) S[key] = (S[key] || 0) + n;
  const lines = [`+${amt('sol', sol)} соляриев`, `+${amt('pl', pl)} пластали`, `+${amt('cry', CRY_WIN * k)} кристаллов`, `+${amt('folio', folio)} фолиантов`];
  if (rid) lines.push(`+${amt('rid', rid)} ридулианских кристаллов`);
  for (const [key, n] of Object.entries(signals)) lines.push(`+${amt(key, n)}`);
  if (seal) lines.push(`+${amt('seal', seal)} Печать Ландсраада!`);
  for (const [id, q] of Object.entries(sh)) lines.push(`+${amt('shard', q, 'shard:' + id)} ${CH[id].sn}${grantShards(id, q) ? ' — персонаж открыт!' : ''}`);
  lines.push(...fragLines(items));
  lines.push(`+${k * nodeCost(i) * 3} опыта аккаунта`, ...accL);
  const fr = {}; for (const [id, q] of items) fr[id] = (fr[id] || 0) + q;
  return { lines, sh, fr, sol, pl, folio, seal, rid, cry:CRY_WIN*k, signals, xp:k*nodeCost(i)*3 };
}

export { refreshAll, crefillN, crefillCost, doRefill, doXSim, simNode, openSim, updSim, runSim, simCore };
