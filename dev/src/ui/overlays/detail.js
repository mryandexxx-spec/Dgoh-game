// ui/overlays/detail.js — строки 3365–3549 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { nextShards, rosterList } from '../views/squad.js';
import { craftAllPlan } from '../craft.js';
import { renderNotes } from '../notifications.js';
import { fxText } from '../fx-text.js';
import { GEAR_CAP_AT, gearCap, heroCap } from '../../logic/account.js';
import { itemSourceRows } from './info.js';
import { getRes, prog } from '../../logic/progress.js';
import { S } from '../../core/state.js';
import { CRAFT, FRAG_NEED, GEAR_UP_SOL, ITEMS, TIER_COL, TIER_NAME, gearPlan, itemIcon } from '../../logic/gear.js';
import { MEM, RELIC_AT, RELIC_CORES, RELIC_MAX, RELIC_SOL, isLegend, relicCap, relicReady, sideName, unlockNeed } from '../../logic/relics.js';
import { LVL_COST, MAX_GEAR, MAX_LVL, ROMAN, STAR_COST } from '../../logic/economy.js';
import { skillSvg } from '../../data/glyphs.js';
import { mountHeroStage } from '../../render3d/scenes/hero.js';
import { sceneThumb } from '../../render2d/scenes.js';
import { figureSVG } from '../../render2d/figures.js';
import { unitPower, unitStats } from '../../logic/battle/stats.js';
import { SK_KEYS, SK_MLV, SK_UPS, leadBonus, pasMult, skMax, skMult } from '../../logic/battle/skills.js';
import { CH } from '../../data/chars.js';
import { DT, FACTIONS, ROLES } from '../../data/fx.js';
import { amt, fmt, ic } from '../../core/format.js';
import { $ } from '../../core/dom.js';
import { starStr } from '../common.js';

const SK_NAME = { basic: 'базовая', special: 'особая', ult: 'мощная', passive: 'пассивная', leader: 'лидерка' };
function skCost(next) {
  if (next <= 5) return { sol: [0, 0, 800, 2000, 4000, 7000][next], folio: [0, 0, 1, 2, 4, 6][next] };
  if (next === 6) return { sol: 12000, seal: 1 };
  return { sol: 25000, wol: 1 };
}
function skBonus(k, l) {
  if (k === 'passive') return `+${Math.round((pasMult(l) - 1) * 100)}% здоровья и урона героя`;
  if (k === 'leader') return `+${(leadBonus(l) * 100).toFixed(1).replace('.0', '').replace('.', ',')}% здоровья и урона союзникам фракции`;
  return `+${Math.round((skMult(l) - 1) * 100)}% силы${l >= 7 && k !== 'basic' ? ', −1 к перезарядке' : ''}`;
}
function skLvLines(def, k, max) {
  const ups = SK_UPS[def.id + ':' + k] || {}, ml = SK_MLV[def.id + ':' + k], out = [];
  for (let l = 2; l <= max; l++) {
    let g;
    if (ml) g = ml[l - 1] !== ml[l - 2] ? `урон клинком ${Math.round(ml[l - 1] * 100)}%` : '';
    else if (k === 'passive') g = `+${Math.round((pasMult(l) - pasMult(l - 1)) * 100)}% здоровья и урона`;
    else if (k === 'leader') g = `+${((leadBonus(l) - leadBonus(l - 1)) * 100).toFixed(1).replace('.0', '').replace('.', ',')}% здоровья и урона фракции`;
    else g = `+${Math.round((skMult(l) - skMult(l - 1)) * 100)}% силы`;
    if (l === 7 && k !== 'basic' && k !== 'passive' && k !== 'leader') g += ', −1 к перезарядке';
    out.push({ l, t: [g, ups[l]].filter(Boolean).join('; ') });
  }
  return out;
}
function abDescLv(def, k, lv) {
  const ab = def[k]; if (!ab) return ''; let d = ab.d; const ml = SK_MLV[def.id + ':' + k], ups = SK_UPS[def.id + ':' + k];
  if (ml) d = d.replace(/\d+%/, Math.round(ml[Math.min(ml.length, lv) - 1] * 100) + '%');
  if (ups) for (const l of Object.keys(ups).map(Number).sort((a, b) => a - b)) if (lv >= l) d += ' ' + ups[l];
  return d;
}
const costHtml = (c, hv) => { const f = (k, need, have) => hv ? `<span class="${have < need ? 'lackc' : 'okc'}">${amt(k, fmt(have) + '/' + fmt(need))}</span>` : amt(k, need);
  return [c.folio && f('folio', c.folio, S.folio), c.seal && f('seal', c.seal, S.seal), c.wol && f('wol', c.wol, S.wol), f('sol', c.sol, S.solari)].filter(Boolean).join(' '); };
const hasCost = c => S.solari >= c.sol && S.folio >= (c.folio || 0) && S.seal >= (c.seal || 0) && S.wol >= (c.wol || 0);
const lackKey = c => S.wol < (c.wol || 0) ? 'wol' : S.seal < (c.seal || 0) ? 'seal' : S.folio < (c.folio || 0) ? 'folio' : S.solari < c.sol ? 'sol' : null;
function glCardHtml(id) {
  const d = CH[id], p = prog(id); if (!d.gl) return '';
  return `<div class="ab sk glcard"><div class="skrow"><h4>${d.gl.n}<span class="tag">ультимативная</span></h4><span class="glbadge">${p.gl ? 'Открыта' : 'Закрыта'}</span></div><p>${d.gl.d}</p>
    <div class="skrow2"><span class="skb">${p.gl ? 'Шкала ультимативной способности появится в бою над ${d.sn}.' : 'Открывается Водой жизни — как ультимативные способности легенд.'}</span>${p.gl ? '' : `<button class="btn mini skup ${p.stars && S.wol >= 1 ? 'go' : 'dim'}" data-glopen="${id}">Открыть<small>${amt('wol', 1)}</small></button>`}</div></div>`;
}
function skillsHtml(id) {
  const d = CH[id], p = prog(id), locked = !p.stars;
  const keys = SK_KEYS.filter(k => k !== 'leader' || d.leader);
  const src = { basic: d.basic, special: d.special, ult: d.ult, passive: d.passive, leader: d.leader };
  return `<div class="skhead"><p class="chap" style="margin:16px 0 6px">Умения</p><span class="skmats">${amt('folio', S.folio)} ${amt('seal', S.seal)} ${amt('wol', S.wol)}</span></div>` + glCardHtml(id) + keys.map(k => {
    const ab = src[k], max = skMax(d, k), lv = p.sk[k] || 1, meta = [SK_NAME[k]];
    if (ab.cd) meta.push(`перезарядка ${ab.cd - (lv >= 7 ? 1 : 0)}`); if (ab.spice) meta.push(`${ab.spice} Пряности`); if (ab.dt) meta.push(DT[ab.dt]);
    const pips = Array.from({ length: max }, (_, j) => `<i class="${j < lv ? 'on' : ''} ${j === 5 ? 'p6' : j === 6 ? 'p7' : ''}"></i>`).join('');
    let btn = '';
    if (!locked && lv < max) { const c = skCost(lv + 1), ok = hasCost(c); btn = `<button class="btn mini skup ${ok ? 'go' : 'dim lack'}" data-skup="${id}:${k}">Ур. ${lv + 1}${lv + 1 === 7 ? ' ★' : ''}<small>${costHtml(c)}</small></button>`; }
    else if (lv >= max) btn = `<span class="skmax">${max === 7 ? 'Высший уровень' : 'Максимум'}</span>`;
    return `<div class="ab sk"><div class="skrow"><h4>${ab.n}<span class="tag">${meta.join(' · ')}</span></h4><span class="skpips" title="Уровень ${lv} из ${max}">${pips}</span></div>
      <p>${fxText(abDescLv(d, k, lv))}</p>
      <ul class="skups">${skLvLines(d, k, max).map(x => `<li class="${x.l <= lv ? 'on' : ''} ${x.l === 7 ? 'p7' : ''}"><b>${x.l}</b><span>${fxText(x.t)}</span></li>`).join('')}</ul>
      <div class="skrow2"><span class="skb">Ур. ${lv}/${max}${lv > 1 && !SK_MLV[id + ':' + k] ? ' · ' + skBonus(k, lv) : ''}${max === 7 && lv < 7 ? `<br><small class="z7">Есть 7-й уровень за Воду жизни</small>` : ''}</span>${btn}</div></div>`;
  }).join('');
}
function abilityHtml(ab, kind) {
  const meta = [kind];
  if (ab.cd) meta.push(`перезарядка ${ab.cd}`);
  if (ab.spice) meta.push(`${ab.spice} Пряности`);
  if (ab.dt) meta.push(DT[ab.dt]);
  return `<div class="ab"><h4>${ab.n}<span class="tag">${meta.join(' · ')}</span></h4><p>${fxText(ab.d)}</p></div>`;
}
function slotState(cid, k) {
  const p = prog(cid), it = ITEMS[gearPlan(cid, p.gear)[k]], have = S.inv[it.id] || 0, need = FRAG_NEED[it.t], c = CRAFT(it.t);
  if (p.eq[k]) return { it, st: 'eq', have, need };
  if (have >= need) return { it, st: S.solari >= c.sol && S.plast >= c.pl ? 'ready' : 'frags', have, need };
  return { it, st: have ? 'part' : 'none', have, need };
}
function slotBtn(cid, k) {
  const s = slotState(cid, k);
  const badge = s.st === 'eq' ? '<span class="sb ok">✓</span>' : s.st === 'ready' ? '<span class="sb go">+</span>' : '';
  return `<button class="gslot ${s.st}" data-slot="${cid}:${k}" aria-label="${s.it.n}: ${s.st === 'eq' ? 'надет' : `фрагменты ${s.have} из ${s.need}`}">
    ${itemIcon(s.it, 0)}${badge}
    ${s.st !== 'eq' ? `<span class="gprog"><i style="width:${Math.min(100, s.have / s.need * 100)}%"></i></span>` : ''}
  </button>`;
}
let detailCid = null;
let DETAIL_BACK = null, SQ_LP = 0;
let detailSk = 'basic';
const SKI = { passive: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>', leader: '<path d="M4 18h16l-1.5-9-4 3.5L12 6l-2.5 6.5-4-3.5z" fill="currentColor"/><rect x="4" y="19" width="16" height="2" rx="1" fill="currentColor"/>' };
function skIcon(d, k) { return skillSvg(d, k); }
function skDetailHtml(id, k) {
  const d = CH[id], p = prog(id), locked = !p.stars;
  if (k === 'gl') return glCardHtml(id).replace(/<p>([\s\S]*?)<\/p>/, (m, t) => `<p>${fxText(t)}</p>`);
  const ab = d[k], max = skMax(d, k), lv = p.sk[k] || 1, meta = [SK_NAME[k]];
  if (ab.cd) meta.push(`перезарядка ${ab.cd - (lv >= 7 ? 1 : 0)}`); if (ab.spice) meta.push(`${ab.spice} Пряности`); if (ab.dt) meta.push(DT[ab.dt]);
  const steps = Array.from({ length: max }, (_, j) => { const L = j + 1, c = L > 1 ? skCost(L) : null;
    return `<div class="skst ${L <= lv ? 'on' : ''} ${L === lv + 1 ? 'next' : ''} ${L === 6 ? 'p6' : L === 7 ? 'p7' : ''}"><span class="skn">${L}</span><span class="skbn">${L === 1 ? 'база' : skBonus(k, L).replace(/^\+/, '+')}</span>${c && L > lv ? `<span class="skc">${costHtml(c, L === lv + 1)}</span>` : ''}</div>`; }).join('');
  let btn = '';
  if (!locked && lv < max) { const c = skCost(lv + 1), ok = hasCost(c); btn = `<button class="btn skup ${ok ? 'go' : 'dim lack'}" data-skup="${id}:${k}">Повысить до ${lv + 1}${lv + 1 === 7 ? ' ★' : ''}<small>${costHtml(c, true)}</small></button>`; }
  else if (lv >= max) btn = `<span class="skmax">${max === 7 ? 'Высший уровень' : 'Максимум'}</span>`;
  return `<div class="skd"><div class="skdh"><span class="skico big">${skIcon(d, k)}</span><div><h4>${ab.n}</h4><span class="tag">${meta.join(' · ')}</span></div><b class="skdl mono">${lv}/${max}</b></div>
    <p class="skdesc">${fxText(ab.d)}</p>
    <div class="sktrack" style="--n:${max}">${steps}</div>
    <div class="skrow2"><span class="skb">${lv < max ? `Следующий уровень: ${skBonus(k, lv + 1)}` : 'Умение развито полностью'}${max === 7 && lv < 7 ? `<br><small class="z7">7-й уровень — за Воду жизни</small>` : ''}</span>${btn}</div></div>`;
}
function lvlCost(from, to) { let c = 0; for (let l = from; l < to; l++) c += LVL_COST(l); return c; }
function lvlAffordMax(p, cap) { let l = p.lvl, sol = S.solari; while (l < cap && sol >= LVL_COST(l)) { sol -= LVL_COST(l); l++; } return l; }
function updLvl() { const r = $('#lvlr'); if (!r) return; const p = prog(detailCid), to = +r.value, c = lvlCost(p.lvl, to); $('#lvlv').innerHTML = `до <b>${to}</b> · ${amt('sol', c)}`; const b = $('#lvlgo'); b.disabled = S.solari < c; b.classList.toggle('go', S.solari >= c); }
function openDetail(id) {
  if (detailCid !== id) detailSk = 'basic';
  detailCid = id;
  const d = CH[id], p = prog(id), locked = p.stars === 0;
  const st = unitStats(d, locked ? { ...p, stars: 1 } : p);
  const inSq = S.squad.includes(id), need = nextShards(p), uNeed = unlockNeed(d), rl = p.relic || 0, rcap = relicCap(), rn = rl + 1;
  const RL = rosterList().map(x => x.id), navOk = RL.includes(id) && RL.length > 1;
  const relicBar = locked ? '' : `<div class="relbar"><span class="rtier">Другая память ${rl ? rl : '—'}</span><span class="mono">потолок ${MEM(rcap)}</span>${rl >= RELIC_MAX ? '<span class="mono">максимум</span>' : !relicReady(p) ? '<span class="lockd">нужны 7★ и снаряжение XIII 6/6</span>' : rn > rcap ? `<span class="lockd">${MEM(rn)} с ур. аккаунта ${RELIC_AT[rn]}</span>` : `<button class="btn ${(S.core || 0) >= RELIC_CORES[rn] && S.solari >= RELIC_SOL(rn) ? 'go' : 'lack'}" data-relic="${id}">Пробудить ${MEM(rn)}<small>${amt('core', RELIC_CORES[rn])} ${amt('sol', RELIC_SOL(rn))}</small></button>`}</div>`;
  const filled = p.eq.filter(Boolean).length, full = filled === 6, gcap = gearCap(), hcap = heroCap();
  const keys = [...(d.gl ? ['gl'] : []), ...SK_KEYS.filter(k => k !== 'leader' || d.leader)];
  if (!keys.includes(detailSk)) detailSk = keys[0];
  const lvMax = k => k === 'gl' ? '' : `${p.sk[k] || 1}`;
  const gearNeedL = GEAR_CAP_AT[p.gear + 1];
  const gearBtn = locked ? '' : p.gear >= MAX_GEAR ? (full ? '<span class="mono">максимум</span>' : '') : p.gear >= gcap ? `<button class="btn" disabled>Снаряжение ${ROMAN[p.gear + 1]}<small>нужен ур. аккаунта ${gearNeedL}</small></button>` :
    `<button class="btn ${full ? 'go' : ''}" data-gup="${id}" ${full && S.solari >= GEAR_UP_SOL(p.gear) ? '' : 'disabled'}>Повысить до ${ROMAN[p.gear + 1]}<small>${full ? amt('sol', GEAR_UP_SOL(p.gear)) : 'заполните 6 ячеек'}</small></button>`;
  const am = lvlAffordMax(p, hcap);
  const lvlRow = locked ? '' : p.lvl >= MAX_LVL ? `<div class="lvlrow"><span>Уровень героя <b>${p.lvl}</b> — максимум</span></div>` : p.lvl >= hcap ? `<div class="lvlrow"><span>Уровень героя <b>${p.lvl}</b> / ${hcap}</span><span class="lockd">Потолок — уровень аккаунта ${S.acc.lvl}. Поднимайте аккаунт в боях.</span></div>` :
    `<div class="lvlrow"><span>Уровень героя <b>${p.lvl}</b> / ${hcap}</span><input type="range" id="lvlr" min="${p.lvl + 1}" max="${hcap}" value="${Math.max(p.lvl + 1, am)}" aria-label="Целевой уровень"><span id="lvlv" class="mono"></span><button class="btn" id="lvlgo" data-lvlto="${id}">Поднять</button></div>`;
  $('#overlay').innerHTML = `<div class="detail" data-close="1"><div class="sheet csheet cs2" role="dialog" aria-modal="true" aria-labelledby="dt-name">
    <button class="btn mini dback" data-dback="1" aria-label="Назад">← Назад</button>
    <div class="cgrid">
    <div class="cleft">
    <div class="chead">
      <div class="gcol">${[0, 1, 2].map(k => slotBtn(id, k)).join('')}</div>
      <div class="ccenter" style="--tc:${TIER_COL[p.gear]}">
        ${navOk ? '<button class="dnav prev" data-dnav="-1" aria-label="Предыдущий персонаж">‹</button><button class="dnav next" data-dnav="1" aria-label="Следующий персонаж">›</button>' : ''}
        <div class="cfig">${figureSVG(d, true)}</div>
        <h3 id="dt-name">${d.n}</h3>
        <button class="btn mini biob" data-bio="${id}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 10.5v6M12 7v.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>Биография</button>
        <div class="crole"><span class="sidetag ${d.side}">${sideName(d)}</span> ${d.f.map(f => FACTIONS[f].n).join(' · ')} · ${ROLES[d.role]}${d.prof ? ' · ' + d.prof : ''}</div>
        ${locked ? `<div class="mono" style="font-size:12px">${amt('shard', p.shards + '/' + uNeed, 'shard:' + id)} — ${uNeed > 10 ? 'откроется сразу на 7★' : 'персонаж не открыт'}</div>`
          : `<div class="stars">${starStr(p.stars)}</div><div class="mono cmeta">ур. ${p.lvl}${rl ? ` · <b class="relt">${MEM(rl)}</b>` : ''} · мощь ${fmt(unitPower(d, p))}${need ? ` · ${amt('shard', p.shards + '/' + need, 'shard:' + id)}` : ''}</div>`}
        ${need || locked ? `<button class="btn mini shfind" data-shfind="${id}">${ic('shard')} Найти осколки</button>` : ''}
        ${lvlRow}
      </div>
      <div class="gcol">${[3, 4, 5].map(k => slotBtn(id, k)).join('')}</div>
    </div>
    <div class="gearbar" style="--tc:${TIER_COL[p.gear]}"><span class="gtier">Снаряжение ${ROMAN[p.gear]}</span><span class="mono">${filled}/6 · потолок ${ROMAN[gcap]}</span>${(n => locked || full ? '' : `<button class="btn ${n ? 'go' : ''}" data-craftall="${id}" ${n ? '' : 'disabled'}>Собрать и надеть всё<small>${n ? `готово предметов: ${n}` : 'нечего собрать'}</small></button>`)(craftAllPlan(id).length)}${gearBtn}</div>
    ${relicBar}
    </div>
    <div class="cright">
    <div class="dres">${['sol', 'pl', 'folio', 'seal', 'wol', 'core'].map(k => amt(k, getRes(k))).join('')}</div>
    <div class="statgrid">
      <div><span>Здоровье</span><b>${fmt(st.maxHp)}</b></div><div><span>Щит</span><b>${st.maxShield ? fmt(st.maxShield) : 'нет'}</b></div>
      <div><span>Скорость</span><b>${st.spd}</b></div><div><span>Урон</span><b>${fmt(st.dmg)}</b></div>
      <div><span>Броня</span><b>${Math.round(st.arm * 100)}%</b></div><div><span>Крит</span><b>${Math.round(st.crit * 100)}%</b></div>
      <div><span>Уклонение</span><b>${Math.round(st.eva * 100)}%</b></div><div><span>Эффективн.</span><b>${Math.round(st.pot * 100)}%</b></div>
    </div>
    <div class="skhead"><p class="chap" style="margin:4px 0 6px">Умения</p><span class="skmats">${amt('folio', S.folio)} ${amt('seal', S.seal)} ${amt('wol', S.wol)}</span></div>
    <div class="skbar">${keys.map(k => { const ab = k === 'gl' ? d.gl : d[k]; return `<button class="skb2 ${k === detailSk ? 'on' : ''} ${k === 'gl' ? 'gl' : ''}" data-sksel="${id}:${k}" aria-pressed="${k === detailSk}" title="${ab.n}"><span class="skico">${skIcon(d, k)}${k === 'gl' ? '' : `<b>${lvMax(k)}</b>`}</span><span class="sknm">${ab.n}</span></button>`; }).join('')}</div>
    ${skDetailHtml(id, detailSk)}
    </div></div>
    <div class="acts">
      ${locked ? '' : `
      <button class="btn ${inSq ? '' : 'go'}" data-sq="${id}" ${!inSq && S.squad.length >= 5 ? 'disabled' : ''}>${inSq ? 'Убрать из отряда' : S.squad.length >= 5 ? 'Отряд полон' : d.legendary && S.squad.some(isLegend) ? 'В отряде уже есть легенда' : 'В отряд'}</button>
      ${inSq && S.squad[0] !== id ? `<button class="btn" data-lead="${id}">Сделать лидером</button>` : ''}
      ${need ? `<button class="btn ${p.shards >= need && S.solari >= STAR_COST(p.stars) ? 'go' : 'lack'}" data-star="${id}">Повысить до ${p.stars + 1}★<small>${amt('shard', p.shards + '/' + need)} ${amt('sol', STAR_COST(p.stars))}</small></button>` : '<button class="btn" disabled>7★<small>максимум</small></button>'}`}
      <button class="btn" data-close="1" style="margin-left:auto">Закрыть</button>
    </div>
  </div></div>`;
  updLvl();
  mountHeroStage(id);
}
let itemCtx = null;
function openItem(cid, k) {
  itemCtx = { cid, k };
  const p = prog(cid), s = slotState(cid, k), it = s.it, c = CRAFT(it.t);
  let craft;
  if (s.st === 'eq') craft = `<button class="btn" disabled>Надето</button>`;
  else if (s.have >= s.need) craft = `<button class="btn go" data-craft="1" ${S.solari >= c.sol && S.plast >= c.pl && p.stars ? '' : 'disabled'}>${p.stars ? 'Собрать и надеть' : 'Персонаж не открыт'}<small>${amt('frag', s.need)} ${amt('sol', c.sol)} ${amt('pl', c.pl)}</small></button>`;
  else craft = `<button class="btn" disabled>Не хватает ${s.need - s.have}<small>${amt('frag', s.have + '/' + s.need)}</small></button>`;
  const rows = itemSourceRows(it);
  $('#overlay').innerHTML = `<div class="detail" data-close="1"><div class="sheet isheet" role="dialog" aria-modal="true" aria-labelledby="it-name">
    <button class="btn mini back" data-iback="${cid}">← ${CH[cid].sn}</button>
    <div class="ihead">${itemIcon(it, 72)}<div><h3 id="it-name">${it.n}</h3>
      <div style="color:${TIER_COL[it.t]};font-size:12px;text-transform:uppercase;letter-spacing:.12em">${TIER_NAME[it.t]} · уровень ${ROMAN[it.t]}</div>
      <div style="color:var(--dust);font-size:12px">Ячейка ${k + 1} · даёт 1/6 прибавки снаряжения ${ROMAN[p.gear]} (≈+1,2% ко всем характеристикам)</div></div></div>
    <div class="fbar"><span>Фрагменты</span><div class="gprog big"><i style="width:${Math.min(100, s.have / s.need * 100)}%"></i></div><b class="mono">${amt('frag', s.have + '/' + s.need)}</b></div>
    <div class="acts" style="margin-top:8px">${craft}</div>
    <p class="chap" style="margin-top:18px">Где найти</p>
    <div class="srcs">${rows.join('') || '<p class="sub">Источников пока нет.</p>'}</div>
  </div></div>`;
  document.querySelectorAll('#overlay canvas[data-scene]').forEach(sceneThumb);
}
function closeOverlay() { DETAIL_BACK = null; $('#overlay').innerHTML = ''; if (typeof renderNotes === 'function') setTimeout(renderNotes, 0); }

function set_DETAIL_BACK(v) { return DETAIL_BACK = v; }
function set_detailSk(v) { return detailSk = v; }
function set_SQ_LP(v) { return SQ_LP = v; }
export { SK_NAME, skCost, skBonus, skLvLines, abDescLv, costHtml, hasCost, lackKey, glCardHtml, skillsHtml, abilityHtml, slotState, slotBtn, detailCid, DETAIL_BACK, SQ_LP, detailSk, SKI, skIcon, skDetailHtml, lvlCost, lvlAffordMax, updLvl, openDetail, itemCtx, openItem, closeOverlay, set_DETAIL_BACK, set_detailSk, set_SQ_LP };
