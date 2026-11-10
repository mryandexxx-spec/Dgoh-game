// ui/overlays/sim.js — строки 3668–3760 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { infoKey, openInfo } from './info.js';
import { MOUSE_SVG } from '../mouse.js';
import { statInc } from '../../logic/stats.js';
import { accXP, fragLines, rewardWin } from '../rewards.js';
import { itemCtx, openItem, slotState } from './detail.js';
import { detailCid, openDetail } from '../hero-card.js';
import { render } from '../router.js';
import { starStr, thumb, toast } from '../common.js';
import { enGet, enSpend } from '../../logic/progress.js';
import { S, tickWater } from '../../core/state.js';
import { persist } from '../../core/save.js';
import { ITEMS, grantFrags } from '../../logic/gear.js';
import { CANDLE_REFILL, CRY_WIN, REFILL_AMT, REFILL_MAX, WMAX, campReward, refillCost, refillN, refillPrice, todayKey } from '../../logic/economy.js';
import { NODES, NODE_SCENES, nodeCost, nodeEn, nodeTitle } from '../../data/campaigns.js';
import { sceneThumb } from '../../render2d/scenes.js';
import { CH } from '../../data/chars.js';
import { amt } from '../../core/format.js';
import { $ } from '../../core/dom.js';
import { quest } from '../../logic/daily.js';
import { grantShards } from '../../logic/rewards.js';

function refreshAll() {
  render();
  const it2 = !!$('#overlay2 .isheet');   // v73: окно предмета слоем над карточкой
  if ($('#overlay .csheet') && detailCid) openDetail(detailCid);
  if (($('#overlay .isheet') || it2) && itemCtx) openItem(itemCtx.cid, itemCtx.k); else if (infoKey) openInfo(infoKey, true);
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
function doXSim(spec) {
  const [i, kk] = spec.split(':').map(Number), en = nodeEn(i), cost = kk * nodeCost(i); tickWater();
  if (S.cleared[i] !== 3) return;
  if (enGet(en) < cost) return openInfo(`need:${en}:${cost}`);
  enSpend(en, cost);
  const r = simCore(i, kk); persist();
  let focus = '';
  const [kind, id] = (infoKey || '').split(':');
  if (kind === 'shard' && id) focus = ` · ${CH[id].sn}: +${amt('shard', r.sh[id] || 0)}`;
  else if (kind === 'frag' && id) focus = ` · +${amt('frag', r.fr[id] || 0)} ${ITEMS[id].n}`;
  else if (!infoKey && itemCtx && $('#overlay .isheet, #overlay2 .isheet')) { const it = slotState(itemCtx.cid, itemCtx.k).it; focus = ` · +${amt('frag', r.fr[it.id] || 0)} ${it.n}`; }
  refreshAll();
  const more = enGet(en) >= cost;
  rewardWin(`Симуляция ×${kk}`, r.lines, { sub: `${nodeTitle(i)} · потрачено ${amt(en, cost)}${focus}`, ok: 'Готово',
    btns: `<button class="btn go ${more ? '' : 'lack'}" data-isim="${spec}" ${more ? '' : 'disabled'}>Ещё ×${kk}<small>${amt(en, cost)}</small></button>`,
    focusItem: itemCtx && ($('#overlay .isheet') || $('#overlay2 .isheet')) ? slotState(itemCtx.cid, itemCtx.k).it.id : (kind === 'frag' ? id : null), inv: S.inv });
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
  return { lines, sh, fr };
}

export { refreshAll, crefillN, crefillCost, doRefill, doXSim, simNode, openSim, updSim, runSim, simCore };
