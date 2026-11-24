// ui/common.js — строки 3252–3271 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../core/errlog.js'; // порядок исполнения
import { S, tickWater } from '../core/state.js';
import { CMAX, CANDLE_SEC, WATER_SEC, WMAX, todayKey } from '../logic/economy.js';
import { fc, fmt, ic } from '../core/format.js';
import { SPOT_ICONS } from './views/lobby.js';
import { figureSVG } from '../render2d/figures.js';
import { skillGlyph } from '../data/glyphs.js';
import { assetUrl } from '../assets/models.js';
import { IG, TIER_COL } from '../logic/gear.js';

function toast(t) {
  document.querySelectorAll('.toast').forEach(x => x.remove());
  const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = t; el.setAttribute('role', 'status');
  document.body.appendChild(el); setTimeout(() => el.remove(), 2200);
}

// HUD-01: presentation-only. Existing save IDs, regen policy and event keys stay intact.
const hudCountdown = seconds => {
  const n = Math.max(0, seconds);
  return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
};
function renderRes() {
  tickWater();
  const now = todayKey.clock.regenNow();
  const energy = (key, name, value, cap, ts, period) => {
    const waiting = value < cap;
    const remaining = waiting ? Math.max(1, Math.ceil(period - (now - ts) / 1000)) : null;
    const label = waiting ? '+1 через ' + hudCountdown(remaining) : 'Полный запас';
    const progress = cap > 0 ? Math.min(100, Math.max(0, Math.round(value * 100 / cap))) : 0;
    return `<button type="button" class="hud-cell hud-energy hud-${key}" data-info="${key}" aria-label="${name}: ${fmt(value)} из ${fmt(cap)}. ${label}">
      <span class="hud-icon">${ic(key)}</span>
      <span class="hud-content">
        <span class="hud-title-row"><span class="hud-title">${name}</span><span class="hud-timer">${label}</span></span>
        <span class="hud-value">${fmt(value)}<small> / ${fmt(cap)}</small></span>
        <span class="hud-meter" aria-hidden="true"><i style="width:${progress}%"></i></span>
      </span>
    </button>`;
  };
  const money = (key, name, value, extra = '') => `<button type="button" class="hud-cell hud-currency hud-${key} ${extra}" data-info="${key}" aria-label="${name}: ${fmt(value)}">
    <span class="hud-icon">${ic(key)}</span>
    <span class="hud-content"><span class="hud-title">${name}</span><span class="hud-value">${fmt(value)}</span></span>
  </button>`;
  const chunks = [
    energy('water', 'Вода', S.water, WMAX(), S.waterTs, WATER_SEC),
    energy('candle', 'Огни', S.candle, CMAX(), S.candleTs, CANDLE_SEC),
    money('sol', 'Солярии', S.solari),
    money('cry', 'Камни су', S.cry),
  ];
  document.querySelectorAll('.resbox').forEach(el => {
    const old = el._rp;
    if (!old || el.children.length !== chunks.length) {
      el.innerHTML = chunks.join('');
      el._rp = chunks;
      el.setAttribute('aria-label', 'Игровые ресурсы');
      return;
    }
    for (let i = 0; i < chunks.length; i++) if (old[i] !== chunks[i]) {
      const t = document.createElement('template');
      t.innerHTML = chunks[i];
      el.children[i].replaceWith(t.content);
    }
    el._rp = chunks;
  });
}
const starStr = (n, max = 7) => '★'.repeat(n) + `<i>${'★'.repeat(max - n)}</i>`;
const glyph = (def, extra = '') => def.boss ? `<span class="gl ${extra}" style="--fc:var(--worm);color:var(--worm)" aria-hidden="true"><svg viewBox="0 0 24 24">${SPOT_ICONS.worm}</svg></span>` : `<span class="gl face ${extra}" style="--fc:${fc(def)}" aria-hidden="true">${figureSVG(def)}</span>`;
const thumb = (scene, n) => `<div class="thumb"><canvas data-scene="${scene}" width="200" height="100"></canvas><span>${n}</span></div>`;
// UI-07: one registry for all hero/skill/battle surfaces. The existing glyph
// stays underneath the opaque center of the artwork as a no-network fallback.
const SKILL_ART = Object.freeze({ duncan: Object.freeze({
  basic: 'img/skill-duncan-basic.webp',
  special: 'img/skill-duncan-special.webp',
  ult: 'img/skill-duncan-ult.webp',
  passive: 'img/skill-duncan-passive.webp'
}) });
const skillSvg = (def, key) => {
  const art = SKILL_ART[def?.id]?.[key], url = art && assetUrl(art);
  return `<svg${url ? ' class="skill-art"' : ''} viewBox="0 0 24 24" aria-hidden="true">${skillGlyph(def, key)}${url ? `<image href="${url}" x="0" y="0" width="24" height="24" preserveAspectRatio="xMidYMid meet"/>` : ''}</svg>`;
};
function itemIcon(it, size = 40, extra = '') {
  return `<span class="itm ${extra}" data-info="frag:${it.id}" style="--tc:${TIER_COL[it.t]};width:${size}px;height:${size}px"><svg viewBox="0 0 24 24" aria-hidden="true">${IG[it.kind]('#efe6d6', '#1a1420')}</svg></span>`;
}


export { toast, renderRes, starStr, glyph, thumb, skillSvg, itemIcon };
