// ui/views/legend.js — строки 3992–4019 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './raid.js'; // порядок исполнения
import { prog } from '../../logic/progress.js';
import { S } from '../../core/state.js';
import { MEM, ringCol } from '../../logic/relics.js';
import { MAX_GEAR, ROMAN } from '../../logic/economy.js';
import { JK, JOURNEYS, JP, JR, JREQ, jReady, jRelic } from '../../data/journeys.js';
import { portrait } from '../../render2d/figures.js';
import { CH } from '../../data/chars.js';
import { FACTIONS } from '../../data/fx.js';
import { amt } from '../../core/format.js';
import { $ } from '../../core/dom.js';
import { glyph, thumb } from '../common.js';

function journeyReady(t) { return jReady(JK(), t); }
function renderLegend() {
  const lk = JK(), m = CH[lk], mp = prog(lk), J = JR();
  const elig = JR().req.filter(id => prog(id).stars > 0);
  S.jPicks[JK()] = S.jPicks[JK()].filter(id => elig.includes(id));
  if (!S.jPicks[JK()].length) S.jPicks[JK()] = elig.slice(0, 5);
  const maxStars = Math.max(...JR().tiers.map((x, i) => JP()[i] ? x.stars : 0), 0);
  let html = `<h2 class="lshide">Легенды</h2>
  <div class="ctabs">${Object.keys(JOURNEYS).map(k => { const done = JOURNEYS[k].tiers.filter((t, i) => (S.journeys[k] || {})[i]).length; return `<button class="ctab ${k === lk ? 'on' : ''}" data-jkey="${k}">${CH[k].n}<small>ярусов ${done}/5 · ${prog(k).stars ? prog(k).stars + '★' : 'не открыт'}</small></button>`; }).join('')}</div>
  <p class="sub">${J.t}. Легенда — эксклюзив для самого сильного Дома: её нельзя купить, а открывает её цепочка из пяти боёв против врагов 70–85 уровня с Другой памятью. Сражаться можно только шестью героями пути: каждый должен быть 7★ со снаряжением XIII, а с каждым ярусом растёт требуемый уровень Другой памяти. Первое прохождение яруса даёт осколки легенды; на 330 легенда открывается сразу на 7★.</p>
  <div class="grid2"><div class="panel"><div class="hd" style="display:flex;gap:14px;align-items:center">${portrait(m, 84)}<div><h3>${m.n}</h3>
    <div style="color:var(--dust);font-size:12px">${m.f.map(f => FACTIONS[f].n).join(' · ')} · Легенда</div>
    <div class="mono" style="font-size:12px;margin-top:4px">${mp.stars ? `${'★'.repeat(mp.stars)} · ${amt('shard', mp.shards)}` : amt('shard', mp.shards + '/330') + ' · откроется на 7★'}</div></div></div>
    <div class="kv"><span>Лидерка</span><div>${m.leader.d}</div><span>Ульта</span><div><b>${m.gl.n}.</b> ${m.gl.d.replace(/^Ультимативная способность\.\s*/, '')}</div></div>
    ${mp.stars ? `<button class="btn" data-open="${lk}">Открыть карточку</button>` : ''}
  </div>
  <div class="panel"><h3>Герои пути</h3><div class="req">${JR().req.map(id => { const p = prog(id), R = (JREQ[lk] || {})[id] || 0, s7 = p.stars >= 7, g5 = p.gear >= MAX_GEAR, rOk = (p.relic || 0) >= R;
    return `<div class="reqh ${s7 && g5 && rOk ? 'full' : ''}" data-info="shard:${id}" role="button" tabindex="0" title="Где найти осколки">${portrait(CH[id], 48, p.stars ? ringCol(p) : null)}<span>${CH[id].sn}<br><span class="rqc"><i class="${s7 ? 'ok' : 'no'}">${p.stars || 0}/7★</i><i class="${g5 ? 'ok' : 'no'}">сн. ${ROMAN[p.gear] || 'I'}/XIII</i><i class="${rOk ? 'ok' : 'no'}">ДП ${p.relic || 0}/${R}</i></span></span></div>`; }).join('')}</div>
    <p class="sub" style="margin:0">Цель пути: все шестеро — 7★, снаряжение XIII и указанный уровень Другой памяти (на финальном ярусе). Ярусы 1–4 требуют его пропорционально: ¼, ½, ¾ от цели. В бой идут 5 из 6 героев.</p>
  </div></div>
  <p class="chap">Ярусы</p><div class="tiers">`;
  JR().tiers.forEach((t, i) => { const ok = journeyReady(i), open = i === 0 || JP()[i - 1];
    html += `<div class="tier ${JP()[i] ? 'done' : ''}">${thumb(JR().scenes[i], i + 1)}<div style="min-width:0"><h4>${t.n}</h4>
      <div class="meta" style="color:var(--dust);font-size:12px;margin-top:4px;display:flex;gap:6px 12px;flex-wrap:wrap;align-items:center"><span class="chips">${t.enemy.map(id => glyph(CH[id])).join('')}</span><span>враги ур. ${t.el} · ${MEM(t.erl)}</span>${t.desert ? '<span class="tag desert">Пустыня</span>' : ''}<span class="${ok ? '' : 'power bad'}">7★ · снаряж. XIII · Другая память ${i ? JR().req.map(id => jRelic(lk, id, i)).join('/') : 'не нужна'}</span><span>${JP()[i] ? 'пройдено' : `+${amt('shard', t.sh)}`}</span></div></div>
      <div class="go-cell"><button class="btn go" data-jgo="${i}" ${ok && open ? '' : 'disabled'}>${JP()[i] ? 'Повторить' : 'Сразиться'}</button></div></div>`; });
  html += `</div>`;
  $('#view').innerHTML = html;
}

export { journeyReady, renderLegend };
