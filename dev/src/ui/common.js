// ui/common.js — строки 3252–3271 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../core/errlog.js'; // порядок исполнения
import { S, tickWater } from '../core/state.js';
import { CMAX, WATER_SEC, WMAX } from '../logic/economy.js';
import { fc, fmt, ic } from '../core/format.js';
import { SPOT_ICONS } from './views/lobby.js';
import { figureSVG } from '../render2d/figures.js';
import { skillGlyph } from '../data/glyphs.js';
import { IG, TIER_COL } from '../logic/gear.js';

function toast(t) {
  document.querySelectorAll('.toast').forEach(x => x.remove());
  const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = t; el.setAttribute('role', 'status');
  document.body.appendChild(el); setTimeout(() => el.remove(), 2200);
}

function renderRes() {
  tickWater();
  const next = S.water < WMAX() ? Math.ceil(WATER_SEC - (Date.now() - S.waterTs) / 1000) : null;
  // фаза 7, шаг 2: раз в секунду (core/boot.js) — точечно: пересоздаются только изменившиеся плашки, без innerHTML всей полосы
  const NL = '\n    ';   // пробелы между плашками — как в прежней разметке (DOM-golden)
  const pills = [
    NL + `<div class="pill" data-info="water"><span>Вода${next ? ` · +1 через ${next}с` : ''}</span><b>${ic('water')}${S.water}/${WMAX()}</b></div>`,
    NL + `<div class="pill" data-info="candle"><span>Свечи</span><b>${ic('candle')}${S.candle}/${CMAX()}</b></div>`,
    NL + `<div class="pill" data-info="sol"><span>Солярии</span><b>${ic('sol')}${fmt(S.solari)}</b></div>`,
    NL + `<div class="pill" data-info="pl"><span>Пласталь</span><b>${ic('pl')}${S.plast}</b></div>`,
    NL + `<div class="pill" data-info="teeth"><span>Зубы червя</span><b>${ic('teeth')}${fmt(S.teeth)}</b></div>`,
    NL + `<div class="pill" data-info="cry"><span>Кристаллы</span><b>${ic('cry')}${fmt(S.cry)}</b></div>`,
    NL + `<div class="pill" data-info="rid"><span>Ридулиан</span><b>${ic('rid')}${fmt(S.rid)}</b></div>`,
  ];
  document.querySelectorAll('.resbox').forEach(el => {
    const old = el._rp;
    if (!old || el.children.length !== pills.length) { el.innerHTML = pills.join(''); el._rp = pills; return; }
    for (let i = 0; i < pills.length; i++) if (old[i] !== pills[i]) { const t = document.createElement('template'); t.innerHTML = pills[i].trim(); el.children[i].replaceWith(t.content); }
    el._rp = pills;
  });
}
const starStr = (n, max = 7) => '★'.repeat(n) + `<i>${'★'.repeat(max - n)}</i>`;
const glyph = (def, extra = '') => def.boss ? `<span class="gl ${extra}" style="--fc:var(--worm);color:var(--worm)" aria-hidden="true"><svg viewBox="0 0 24 24">${SPOT_ICONS.worm}</svg></span>` : `<span class="gl face ${extra}" style="--fc:${fc(def)}" aria-hidden="true">${figureSVG(def)}</span>`;
const thumb = (scene, n) => `<div class="thumb"><canvas data-scene="${scene}" width="200" height="100"></canvas><span>${n}</span></div>`;
const skillSvg = (def, key) => `<svg viewBox="0 0 24 24" aria-hidden="true">${skillGlyph(def, key)}</svg>`;
function itemIcon(it, size = 40, extra = '') {
  return `<span class="itm ${extra}" data-info="frag:${it.id}" style="--tc:${TIER_COL[it.t]};width:${size}px;height:${size}px"><svg viewBox="0 0 24 24" aria-hidden="true">${IG[it.kind]('#efe6d6', '#1a1420')}</svg></span>`;
}


export { toast, renderRes, starStr, glyph, thumb, skillSvg, itemIcon };
