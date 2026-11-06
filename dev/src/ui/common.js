// ui/common.js — строки 3252–3271 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../core/errlog.js'; // порядок исполнения
import { S, tickWater } from '../core/state.js';
import { fmt, ic } from '../core/save.js';
import { CMAX, WATER_SEC, WMAX } from '../logic/economy.js';

function toast(t) {
  document.querySelectorAll('.toast').forEach(x => x.remove());
  const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = t; el.setAttribute('role', 'status');
  document.body.appendChild(el); setTimeout(() => el.remove(), 2200);
}

function renderRes() {
  tickWater();
  const next = S.water < WMAX() ? Math.ceil(WATER_SEC - (Date.now() - S.waterTs) / 1000) : null;
  const html = `
    <div class="pill" data-info="water"><span>Вода${next ? ` · +1 через ${next}с` : ''}</span><b>${ic('water')}${S.water}/${WMAX()}</b></div>
    <div class="pill" data-info="candle"><span>Свечи</span><b>${ic('candle')}${S.candle}/${CMAX()}</b></div>
    <div class="pill" data-info="sol"><span>Солярии</span><b>${ic('sol')}${fmt(S.solari)}</b></div>
    <div class="pill" data-info="pl"><span>Пласталь</span><b>${ic('pl')}${S.plast}</b></div>
    <div class="pill" data-info="teeth"><span>Зубы червя</span><b>${ic('teeth')}${fmt(S.teeth)}</b></div>
    <div class="pill" data-info="cry"><span>Кристаллы</span><b>${ic('cry')}${fmt(S.cry)}</b></div>
    <div class="pill" data-info="rid"><span>Ридулиан</span><b>${ic('rid')}${fmt(S.rid)}</b></div>`;
  document.querySelectorAll('.resbox').forEach(el => el.innerHTML = html);
}


export { toast, renderRes };
