// ui/hero-card.js — карточка героя (пакет 5, E1): каркас строится один раз; листание ‹ › и действия обновляют зоны точечно
// (зона перерисовывается, только если её разметка изменилась), холст 3D остаётся на месте — меняется модель.
import './overlays/detail.js'; // порядок исполнения
import { SK_NAME, lvlAffordMax, lvlCost, skIcon, slotState } from './overlays/detail.js';
import { hasCost, skCost } from '../logic/skill-up.js';
import { nextShards, rosterList } from './views/squad.js';
import { craftAllPlan } from './craft.js';
import { ROSTER_DEF, rosterView } from '../logic/roster.js';
import { GEAR_CAP_AT, gearCap, heroCap } from '../logic/account.js';
import { getRes, prog } from '../logic/progress.js';
import { S } from '../core/state.js';
import { GEAR_UP_SOL, TIER_COL } from '../logic/gear.js';
import { RELIC_MAX, relicReady, sideName, unlockNeed } from '../logic/relics.js';
import { MAX_GEAR, MAX_LVL, ROMAN, STAR_COST } from '../logic/economy.js';
import { mountHeroStage } from '../render3d/scenes/hero.js';
import { figureSVG } from '../render2d/figures.js';
import { unitPower, unitStats } from '../logic/battle/stats.js';
import { SK_KEYS, skMax } from '../logic/battle/skills.js';
import { CH } from '../data/chars.js';
import { BARON_LEGEND_KIT } from '../data/baron-legend-kit.js';
import { defaultStagedHero } from '../logic/baron-roster-integration.js';
import { FACTIONS, ROLES } from '../data/fx.js';
import { amt, fmt, ic } from '../core/format.js';
import { $ } from '../core/dom.js';
import { itemIcon } from './common.js';
import { ptShards } from './portrait.js';

let detailCid = null;
let detailSk = 'basic';
let HC_STAT = false;
const HC_REFRESH = [];   // пакет 6: окна поверх карточки обновляются после действий и листания   // открыта ли панель характеристик (состояние окна, не сохранения)
const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10.5" rx="2" fill="currentColor"/><path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
const IC = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4l-8 8 8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  stat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V12M10 20V6M15 20v-9M20 20V9" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 10.5v6M12 7v.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
};

// порядок листания: ростер с текущим фильтром; если героя в нём нет (открыт из наград, подсказки) — весь ростер
function heroNavList(id) {
  const L = rosterList().map(x => x.id); if (L.includes(id)) return L;
  const v = rosterView(ROSTER_DEF); return [...v.open, ...v.locked];
}

function hcTop(d) {
  const tags = [`<span class="hctag side ${d.side}">${sideName(d)}</span>`, ...d.f.map(f => `<span class="hctag">${FACTIONS[f].n}</span>`), `<span class="hctag">${ROLES[d.role]}</span>`, ...(d.prof ? [`<span class="hctag">${d.prof}</span>`] : [])];
  return `<button class="hcib" data-dback="1" aria-label="Назад">${IC.back}</button>
    <div class="hcnm"><h3 id="dt-name">${d.n}</h3><span class="hctags">${tags.join('')}</span></div>
    <span class="hcres">${amt('sol', getRes('sol'))}${amt('pl', getRes('pl'))}</span>
    <button class="hcib${HC_STAT ? ' on' : ''}" data-hcstat="1" aria-label="Характеристики" aria-pressed="${HC_STAT}">${IC.stat}</button>
    <button class="hcib" data-bio="${d.id}" aria-label="Биография">${IC.info}</button>
    <button class="hcib" data-close="1" aria-label="Закрыть">${IC.x}</button>`;
}

function skKeys(d) { return [...(d.gl ? ['gl'] : []), ...SK_KEYS.filter(k => k !== 'leader' || d.leader)]; }
function hcSkills(id, d, p) {
  const locked = !p.stars;
  const rows = skKeys(d).map(k => {
    let sub, up = false;
    if (k === 'gl') sub = `${p.gl ? 'Открыта' : 'Закрыта'} (ультимативная)`;
    else { const lv = p.sk[k] || 1, max = skMax(d, k); sub = locked ? SK_NAME[k] : `Ур. ${lv} (${SK_NAME[k]})`; up = !locked && lv < max && hasCost(skCost(lv + 1)); }
    if (k === 'gl' && !locked && !p.gl && S.wol >= 1) up = true;
    const ab = k === 'gl' ? d.gl : d[k];
    return `<button class="hcsk${k === 'gl' ? ' gl' : k === 'leader' ? ' ldr' : ''}${locked ? ' dim' : ''}" data-hcsk="${id}:${k}"><span class="hcski">${skIcon(d, k)}</span><span class="hcskt"><b>${ab.n}</b><small>${sub}</small></span>${up ? '<span class="hcup" aria-label="Можно улучшить">▲</span>' : ''}</button>`;
  }).join('');
  const rl = p.relic || 0, open = rl > 0 || (!locked && relicReady(p));
  const mem = `<button class="hcmem" data-hcmem="${id}"${locked ? ' disabled' : ''}><span class="hex${open ? '' : ' lk'}">${open ? (rl || '0') : LOCK}</span><span><b>Другая память</b><small>${locked ? 'после открытия' : rl >= RELIC_MAX ? 'максимум' : rl ? `уровень ${rl} из ${RELIC_MAX}` : open ? 'можно пробудить' : 'с 7★ и сн. XIII'}</small></span></button>`;
  return `<span class="hccap">Умения</span><div class="hcsks">${rows}</div>${mem}`;
}

function hcSlot(id, k) {
  const s = slotState(id, k);
  const cap = s.st === 'eq' ? '' : s.st === 'ready' ? '<em class="go">Надеть</em>' : s.st === 'frags' ? '<em class="cr">Создать</em>' : '<em>Найти</em>';
  const badge = s.st === 'eq' ? '<span class="ok">✓</span>' : s.st === 'ready' ? '<span class="plus">+</span>' : '';
  return `<button class="hcgs ${s.st}" data-slot="${id}:${k}" aria-label="${s.it.n}: ${s.st === 'eq' ? 'надет' : `фрагменты ${s.have} из ${s.need}`}"><span class="box" style="--tc:${TIER_COL[s.it.t]}">${itemIcon(s.it, 0)}${badge}${s.st === 'part' || s.st === 'none' ? `<span class="bar"><i style="width:${Math.min(100, s.have / s.need * 100)}%"></i></span>` : ''}</span>${cap}</button>`;
}
function hcSlots(id, p, ks) { return p.stars ? ks.map(k => hcSlot(id, k)).join('') : ''; }

function hcBot(id, d, p, nav) {
  const arr = (dir, l) => nav ? `<button class="hcarr" data-dnav="${dir}" aria-label="${l}">${dir < 0 ? '‹' : '›'}</button>` : '<span class="hcarr off"></span>';
  let mid;
  if (!p.stars) mid = '<span class="hccap">снаряжение — после открытия</span>';
  else {
    const filled = p.eq.filter(Boolean).length, full = filled === 6, gcap = gearCap();
    let btn;
    if (!full) { const n = craftAllPlan(id).length; btn = `<button class="btn hcbtn ${n ? 'buy' : ''}" data-craftall="${id}" ${n ? '' : 'disabled'}>Надеть всё${n ? ' · ' + n : ''}<small>${n ? `готово предметов: ${n}` : 'нечего собрать'}</small></button>`; }
    else if (p.gear >= MAX_GEAR) btn = '<span class="hccap hcmaxg">снаряжение — максимум</span>';
    else if (p.gear >= gcap) btn = `<button class="btn hcbtn" disabled>Повысить до ${ROMAN[p.gear + 1]}<small>нужен ур. аккаунта ${GEAR_CAP_AT[p.gear + 1]}</small></button>`;
    else btn = `<button class="btn hcbtn ${S.solari >= GEAR_UP_SOL(p.gear) ? 'go' : 'lack'}" data-gup="${id}" ${S.solari >= GEAR_UP_SOL(p.gear) ? '' : 'disabled'}>Повысить до ${ROMAN[p.gear + 1]}<small>${amt('sol', GEAR_UP_SOL(p.gear))}</small></button>`;
    mid = `<div class="hcpwl"><span class="hcgt" style="--tc:${TIER_COL[p.gear]}">Сн. ${ROMAN[p.gear]}</span><span>${filled}/6</span><span class="hcpw">мощь <b>${fmt(unitPower(d, p))}</b></span></div>${btn}`;
  }
  return `${arr(-1, 'Предыдущий персонаж')}<div class="hcmid">${mid}</div>${arr(1, 'Следующий персонаж')}`;
}

function hcRight(id, d, p) {
  const need = nextShards(p);
  if (!p.stars) {
    const uNeed = unlockNeed(d), ok = p.shards >= uNeed;
    return `<div class="hcblk"><span class="hccap">Не открыт</span>${ptShards(d, p)}<span class="hcnote">${uNeed > 10 ? 'откроется сразу на 7★' : 'соберите осколки'}</span>
      ${need ? `<button class="btn ${ok ? 'go' : ''}" data-star="${id}" ${ok ? '' : 'disabled'}>Призвать<small>${amt('shard', p.shards + '/' + uNeed)}</small></button>` : ''}
      <button class="hclnk" data-shfind="${id}">${ic('shard')} Найти осколки</button></div>`;
  }
  const hcap = heroCap();
  let lvl;
  if (p.lvl >= MAX_LVL) lvl = `<div class="hcrow"><span class="hcbig">${p.lvl}</span><span class="hccap">максимум</span></div>`;
  else if (p.lvl >= hcap) lvl = `<div class="hcrow"><span class="hcbig">${p.lvl}${p.lvl === hcap ? `<small> / ${hcap}</small>` : ''}</span></div><span class="hcnote">Потолок — уровень аккаунта ${S.acc.lvl}</span>`;
  else {
    const to = Math.max(p.lvl + 1, lvlAffordMax(p, hcap));
    lvl = `<div class="hcrow"><span class="hcbig">${p.lvl}<small> / ${hcap}</small></span><span class="hcto">до <b id="lvlv">${to}</b></span></div>
      <input type="range" id="lvlr" min="${p.lvl + 1}" max="${hcap}" value="${to}" aria-label="Целевой уровень">
      <button class="btn" id="lvlgo" data-lvlto="${id}">Поднять<small id="lvlc">${amt('sol', lvlCost(p.lvl, to))}</small></button>`;
  }
  let st = `<span class="hcstars">${Array.from({ length: 7 }, (_, i) => `<i class="${i < p.stars ? 'on' : ''}">★</i>`).join('')}</span>${ptShards(d, p)}`;
  if (need) { const ok = p.shards >= need && S.solari >= STAR_COST(p.stars); st += `<button class="btn ${ok ? 'go' : 'lack'}" data-star="${id}">Повысить до ${p.stars + 1}★<small>${amt('sol', STAR_COST(p.stars))}</small></button><button class="hclnk" data-shfind="${id}">${ic('shard')} Найти осколки</button>`; }
  return `<div class="hcblk"><span class="hccap">Уровень героя</span>${lvl}</div><div class="hcblk"><span class="hccap">Звёзды</span>${st}</div>`;
}

function hcStats(d, p) {
  const s = unitStats(d, p.stars ? p : { ...p, stars: 1 }), pc = x => Math.round(x * 100) + '%';
  const kv = [['Здоровье', fmt(s.maxHp)], ['Урон', fmt(s.dmg)], ['Щит', s.maxShield ? fmt(s.maxShield) : 'нет'], ['Скорость', s.spd], ['Броня', pc(s.arm)], ['Крит', pc(s.crit)], ['Уклонение', pc(s.eva)], ['Эффективн.', pc(s.pot)]];
  return `<h4>Характеристики</h4><div class="hckv">${kv.map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('')}</div>`;
}

// точечное обновление: зона перерисовывается, только если её разметка изменилась
function setZone(sel, html) { const el = $('#overlay .hc ' + sel); if (el && el._h !== html) { el.innerHTML = html; el._h = html; } }

function openDetail(id, stagedPreview = false) {
  // The approved universal hero card is reused, never copied. This staged
  // entry is private: no public roster, no unlock, and no save migration.
  if (stagedPreview && id !== 'baron_legend') throw new Error('Only the staged legendary Baron can be previewed');
  if (!stagedPreview && !CH[id]) return;
  if (detailCid !== id) detailSk = 'basic';
  detailCid = id;
  const d = stagedPreview ? { ...BARON_LEGEND_KIT, side: 'dark' } : CH[id];
  const p = stagedPreview ? defaultStagedHero() : prog(id); // preview is always locked, never a live progression entry
  const L = stagedPreview ? [] : heroNavList(id), i = L.indexOf(id), nav = L.length > 1;
  const near = nav ? [L[(i + 1) % L.length], L[(i - 1 + L.length) % L.length]] : [];
  const Z = { '.hctop': hcTop(d), '.hcleft': hcSkills(id, d, p), '.hcgl': hcSlots(id, p, [0, 1, 2]), '.hcgr': hcSlots(id, p, [3, 4, 5]), '.hcbot': hcBot(id, d, p, nav), '.hcright': hcRight(id, d, p), '.hcst': hcStats(d, p) };
  const root = $('#overlay .hc');
  if (!root) {
    $('#overlay').innerHTML = `<div class="detail hcwrap" data-close="1"><div class="sheet csheet hc${HC_STAT ? ' stat' : ''}" role="dialog" aria-modal="true" aria-labelledby="dt-name">
      <div class="hctop"></div><div class="hcleft"></div>
      <div class="hcstage"><div class="cfig hcfig">${figureSVG(d, true)}</div><div class="hcgl"></div><div class="hcgr"></div><div class="hcst"></div></div>
      <div class="hcbot"></div><div class="hcright"></div></div></div>`;
  } else if (root.dataset.cid !== id) {
    const f = $('#overlay .hcfig'); if (!f.classList.contains('has3d')) f.innerHTML = figureSVG(d, true);   // 2D-фолбэк — смена фигуры
  }
  for (const k in Z) setZone(k, Z[k]);
  const hc = $('#overlay .hc'); hc.dataset.cid = id; hc.classList.toggle('locked', !p.stars);
  if (stagedPreview) {
    // Prevent preview-only controls from writing into a real player's roster.
    // Close/back and the stats toggle retain the same shared card behavior.
    hc.querySelectorAll('button').forEach(button => {
      if (!button.matches('[data-close],[data-dback],[data-hcstat]')) button.disabled = true;
    });
  } else updLvl();
  mountHeroStage(id, near, stagedPreview ? { def: d, progress: p } : null);
  if (!stagedPreview) for (const f of HC_REFRESH) f(id);   // открытые окно умения / «Другая память» (пакет 6)
}

function updLvl() { const r = $('#lvlr'); if (!r) return; const p = prog(detailCid), to = +r.value, c = lvlCost(p.lvl, to); $('#lvlv').textContent = to; $('#lvlc').innerHTML = amt('sol', c); const b = $('#lvlgo'); b.disabled = S.solari < c; b.classList.toggle('go', S.solari >= c); }

function hcStat() { HC_STAT = !HC_STAT; const hc = $('#overlay .hc'); if (!hc) return; hc.classList.toggle('stat', HC_STAT); const b = hc.querySelector('[data-hcstat]'); if (b) { b.classList.toggle('on', HC_STAT); b.setAttribute('aria-pressed', HC_STAT); } const z = hc.querySelector('.hctop'); if (z) z._h = null; }


// Internal opt-in staging entry point. It is deliberately not wired into the
// roster, Legends navigation, route handling or public save schema.
function previewLegendBaronCard() { return openDetail('baron_legend', true); }
function set_detailSk(v) { return detailSk = v; }
export { detailCid, detailSk, heroNavList, openDetail, previewLegendBaronCard, updLvl, hcStat, set_detailSk, HC_REFRESH, skKeys };
