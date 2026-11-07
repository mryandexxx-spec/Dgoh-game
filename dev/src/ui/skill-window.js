// ui/skill-window.js — окно умения (пакет 6, E2) поверх карточки героя, в #overlay2: вкладки уровней 1…макс., таблица уровней,
// описание на выбранном уровне, материал «есть/нужно» (тап → окно поиска с возвратом сюда), «Улучшить» / «ОК».
// Окно строится при открытии и после действий; вкладка меняет только описание, подсветку и низ (точечно).
import './hero-card.js'; // порядок исполнения
import { HC_REFRESH, set_detailSk, skKeys } from './hero-card.js';
import { SK_NAME, skIcon } from './overlays/detail.js';
import { openInfo, set_INFO_BACK } from './overlays/info.js';
import { fxText } from './fx-text.js';
import { skBonus, skLevelView, skMat } from '../logic/skill-up.js';
import { prog } from '../logic/progress.js';
import { S } from '../core/state.js';
import { SK_MLV } from '../data/skill-ups.js';
import { CH } from '../data/chars.js';
import { DT } from '../data/fx.js';
import { fmt, ic } from '../core/format.js';
import { $ } from '../core/dom.js';

let SKW = null;   // { id, k, sel, lv } — состояние открытого окна (не сохранение)
let WIN = null;   // { label, open } — окно, к которому вернётся окно поиска
const XI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
const RES_N = { folio: 'Фолианты ментата', seal: 'Печать Ландсраада', wol: 'Вода жизни', core: 'Голоса предков', sol: 'Солярии' };
const have = k => k === 'sol' ? S.solari : (S[k] || 0);

function set_WIN(v) { return WIN = v; }
// тап по материалу / нехватка: окно поиска; если открыто окно умения или «Другая память» — с возвратом к нему
function hcFind(kind) {
  if (WIN && $('#overlay2 [data-win]')) set_INFO_BACK(WIN);
  return openInfo(kind);
}
// ячейка материала по UI-киту: иконка, «есть/нужно» (красным при нехватке)
function matCell(k, need) {
  const h = have(k), ok = h >= need;
  return `<button class="swmat${ok ? '' : ' lack'}" data-hcfind="${k}" aria-label="${RES_N[k]}: ${fmt(h)} из ${fmt(need)}${ok ? '' : ', найти'}"><span class="swmi">${ic(k)}</span><span class="q ${ok ? 'ok' : 'no'}">${fmt(h)}/${fmt(need)}</span></button>`;
}

function descHtml(d, k, v, sel) {
  const ab = d[k], ml = SK_MLV[d.id + ':' + k], ups = v.ups;
  const base = ml ? ab.d.replace(/\d+%/, Math.round(ml[Math.min(ml.length, sel) - 1] * 100) + '%') : ab.d;   // как abDescLv, без текстов уровней
  const L = Object.keys(ups).map(Number).sort((a, b) => a - b);
  const now = L.filter(l => l <= sel).map(l => `<p>${l === sel ? '<ins>' : ''}${fxText(ups[l])}${l === sel ? '</ins>' : ''}</p>`).join('');
  const fut = L.filter(l => l > sel).map(l => `<p class="fut">Ур. ${l}: ${fxText(ups[l])}</p>`).join('');
  const gain = sel > 1 && !ml ? `<p class="swgain">На ур. ${sel}: ${skBonus(k, sel)}</p>` : '';
  return `<span class="swcap">Описание на ур. ${sel}</span><p>${fxText(base)}</p>${now}${gain}${fut}`;
}
function footHtml(id, k, v, sel) {
  if (v.locked) return `<span class="swnote">Откройте героя, чтобы изучать умения.</span><button class="btn go swok" data-iclose="1">ОК</button>`;
  if (sel <= v.lv) return `<span class="swnote">Уровень ${sel} изучен.</span><button class="btn go swok" data-iclose="1">ОК</button>`;
  if (sel > v.lv + 1) return `<span class="swnote">Сначала изучите уровень ${v.lv + 1}.</span><button class="btn swok" data-iclose="1">Закрыть</button>`;
  const c = v.rows[sel - 1].cost, m = skMat(c), sok = S.solari >= c.sol, ok = sok && (!m || have(m[0]) >= m[1]);
  return `<div class="swmats"><span class="swcap">Нужно для ур. ${sel}</span>${m ? matCell(m[0], m[1]) : ''}</div>
    <button class="btn ghost" data-iclose="1">Закрыть</button>
    <button class="btn swup ${ok ? 'buy' : 'lack'}" data-skup="${id}:${k}">Улучшить до ${sel}<small class="${sok ? '' : 'lackc'}">${ic('sol')}${fmt(c.sol)}</small></button>`;
}
function glHtml(id, d, p) {
  const g = d.gl, ok = S.wol >= 1;
  const foot = p.gl ? `<span class="swnote">Шкала ультимативной способности появится в бою над ${d.sn}.</span><button class="btn go swok" data-iclose="1">ОК</button>`
    : !p.stars ? `<span class="swnote">Откройте героя, чтобы открыть способность.</span><button class="btn go swok" data-iclose="1">ОК</button>`
    : `<div class="swmats"><span class="swcap">Нужно</span>${matCell('wol', 1)}</div><button class="btn ghost" data-iclose="1">Закрыть</button><button class="btn swup ${ok ? 'buy' : 'lack'}" data-glopen="${id}">Открыть</button>`;
  return `<div class="swhd"><span class="skico gl">${skIcon(d, 'gl')}</span><div class="swt"><h3 id="sw-name">${g.n}</h3><span>ультимативная · ${d.n}</span></div><b class="swlv">${p.gl ? 'открыта' : 'закрыта'}</b><button class="hcib" data-iclose="1" aria-label="Закрыть">${XI}</button></div>
    <div class="swbd one"><div class="swdesc"><p>${fxText(g.d)}</p><p class="fut">Открывается Водой жизни — как ультимативные способности легенд. Заряжается в бою, раз за бой.</p></div></div>
    <div class="swft">${foot}</div>`;
}
function winHtml(id, k, sel) {
  const d = CH[id], p = prog(id);
  if (k === 'gl') return glHtml(id, d, p);
  const ab = d[k], v = skLevelView(d, k, p), meta = [SK_NAME[k]];
  if (ab.cd) meta.push(`перезарядка ${ab.cd - (v.lv >= 7 ? 1 : 0)}`); if (ab.spice) meta.push(`${ab.spice} пряности`); if (ab.dt) meta.push(DT[ab.dt]);
  const tabs = v.rows.map(r => `<button role="tab" class="${r.st}${r.l === 7 ? ' p7' : ''}" data-skt="${r.l}" aria-selected="${r.l === sel}" aria-label="Уровень ${r.l}${r.st === 'got' ? ', изучен' : r.st === 'lock' ? ', закрыт' : ', следующий'}">${r.l}</button>`).join('');
  const rows = v.rows.map(r => `<div class="${r.st}${r.l === sel ? ' sel' : ''}" data-l="${r.l}"><b>${r.l}</b><span>${fxText(r.t)}</span></div>`).join('');
  return `<div class="swhd"><span class="skico">${skIcon(d, k)}</span><div class="swt"><h3 id="sw-name">${ab.n}</h3><span>${meta.join(' · ')} · ${d.sn}</span></div><b class="swlv">${v.lv}/${v.max}<small>уровень</small></b><button class="hcib" data-iclose="1" aria-label="Закрыть">${XI}</button></div>
    <div class="swbd"><div class="swdesc">${descHtml(d, k, v, sel)}</div>
      <div class="swside"><div class="swtabs" role="tablist" aria-label="Уровни умения" style="--n:${v.max}">${tabs}</div><div class="swtbl">${rows}</div></div></div>
    <div class="swft">${footHtml(id, k, v, sel)}</div>`;
}
function render() {
  const { id, k, sel } = SKW;
  $('#overlay2').innerHTML = `<div class="detail info-layer swwrap" data-iclose="1"><div class="sheet swin" role="dialog" aria-modal="true" aria-labelledby="sw-name" data-win="sk">${winHtml(id, k, sel)}</div></div>`;
}
function defSel(id, k) { const p = prog(id), v = k === 'gl' ? null : skLevelView(CH[id], k, p); return !v ? 0 : !v.locked && v.lv < v.max ? v.lv + 1 : v.lv; }
// вход из строки умения карточки (data-hcsk="id:k")
function hcSkill(val) {
  const [id, k] = val.split(':'); set_detailSk(k);
  SKW = { id, k, sel: defSel(id, k), lv: k === 'gl' ? 0 : (prog(id).sk[k] || 1) };
  WIN = { label: 'К умению', open: () => { if (SKW) render(); } };
  render();
}
// вкладка уровня: меняются описание, подсветка вкладки и строки, низ окна
function skTab(l) {
  const w = $('#overlay2 .swin'); if (!w || !SKW || SKW.k === 'gl' || l === SKW.sel) return;
  SKW.sel = l; const d = CH[SKW.id], v = skLevelView(d, SKW.k, prog(SKW.id));
  w.querySelectorAll('.swtabs button').forEach(b => b.setAttribute('aria-selected', +b.dataset.skt === l));
  w.querySelectorAll('.swtbl > div').forEach(r => r.classList.toggle('sel', +r.dataset.l === l));
  w.querySelector('.swdesc').innerHTML = descHtml(d, SKW.k, v, l);
  w.querySelector('.swft').innerHTML = footHtml(SKW.id, SKW.k, v, l);
}
// после повышения / листания карточки: следующий уровень остаётся выбранным
HC_REFRESH.push(id => {
  if (!SKW || !$('#overlay2 .swin')) return;
  if (id !== SKW.id) { if (!skKeys(CH[id]).includes(SKW.k)) { SKW = null; $('#overlay2').innerHTML = ''; return; } SKW = { id, k: SKW.k, sel: defSel(id, SKW.k), lv: 0 }; }
  else if (SKW.k !== 'gl') { const lv = prog(id).sk[SKW.k] || 1; if (lv !== SKW.lv && SKW.sel === SKW.lv + 1) SKW.sel = defSel(id, SKW.k); }
  if (SKW.k !== 'gl') SKW.lv = prog(id).sk[SKW.k] || 1;
  render();
});

export { hcSkill, skTab, hcFind, matCell, set_WIN, RES_N };
