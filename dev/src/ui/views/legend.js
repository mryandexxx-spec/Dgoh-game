// ui/views/legend.js — строки 3992–4019 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './raid.js'; // порядок исполнения
import { prog } from '../../logic/progress.js';
import { S } from '../../core/state.js';
import { MEM, ringCol } from '../../logic/relics.js';
import { MAX_GEAR, ROMAN } from '../../logic/economy.js';
import { JK, JOURNEYS, JP, JR, JREQ, jGateReady, jReady, jRelic } from '../../data/journeys.js';
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
  const readyIds = J.req.filter(id => { const p = prog(id); return p.stars >= 7 && p.gear >= MAX_GEAR && (p.relic || 0) >= (JREQ[lk]?.[id] || 0); });
  const groups = [{ title: 'Дом Атрейдесов', ids: ['paul', 'duncan', 'leto', 'jessica', 'gurney'] }, { title: 'Союзники и противники', ids: ['stilgar', 'chani', 'kynes', 'mohiam', 'baron', 'shaddam'] }];
  let html = `<h2 class="lshide">Легенды</h2>
  <div class="ctabs">${Object.keys(JOURNEYS).map(k => { const done = JOURNEYS[k].tiers.filter((t, i) => (S.journeys[k] || {})[i]).length; return `<button class="ctab ${k === lk ? 'on' : ''}" data-jkey="${k}">${CH[k].n}<small>ярусов ${done}/5 · ${prog(k).stars ? prog(k).stars + '★' : 'не открыт'}</small></button>`; }).join('')}</div>
  <div style="margin:6px 0"><button type="button" class="btn" data-v="story_events">Сюжетные события · Марго и Юэ</button></div>
  <p class="sub">Путь Муад’Диба · пять боёв за 330 осколков. Для открытия любого боя нужны все 11 героев: 7★, снаряжение XIII и указанный ДП. В ярусах IV–V участвуют четыре выбранных героя и сюжетный Муад’Диб. Уже открытая легенда сохраняет доступ.</p>
  <div class="grid2"><div class="panel"><div class="hd" style="display:flex;gap:14px;align-items:center">${portrait(m, 84)}<div><h3>${m.n}</h3>
    <div style="color:var(--dust);font-size:12px">${m.f.map(f => FACTIONS[f].n).join(' · ')} · Легенда</div>
    <div class="mono" style="font-size:12px;margin-top:4px">${mp.stars ? `${'★'.repeat(mp.stars)} · ${amt('shard', mp.shards)}` : amt('shard', mp.shards + '/330') + ' · откроется на 7★'}</div></div></div>
    <div class="kv"><span>Лидерка</span><div>${m.leader.d}</div><span>Ульта</span><div><b>${m.gl.n}.</b> ${m.gl.d.replace(/^Ультимативная способность\.\s*/, '')}</div></div>
    ${mp.stars ? `<button class="btn" data-open="${lk}">Открыть карточку</button>` : ''}
  </div>
  <div class="panel"><h3>Герои пути · ${readyIds.length}/${J.req.length}</h3>
    <div style="height:7px;border:1px solid var(--line);background:var(--night);border-radius:5px;overflow:hidden;margin:8px 0"><div style="height:100%;width:${Math.round(100*readyIds.length/J.req.length)}%;background:var(--spice)"></div></div>
    <p class="sub" style="margin:0">${mp.stars ? "Муад’Диб открыт — доступ сохранён." : jGateReady(lk) ? "Все 11 требований выполнены." : "Бои заблокированы до подготовки всех 11 героев."}</p>
    ${groups.map(g => `<div class="jreq-group"><h4 style="margin:10px 0 5px;color:var(--sand);font-size:13px">${g.title} · ${g.ids.filter(id => readyIds.includes(id)).length}/${g.ids.length}</h4><div class="req">${g.ids.map(id => {
      const p = prog(id), R = (JREQ[lk] || {})[id] || 0;
      const s7 = p.stars >= 7, g13 = p.gear >= MAX_GEAR, rOk = (p.relic || 0) >= R;
      return `<div class="reqh ${s7 && g13 && rOk ? 'full' : ''}" data-info="shard:${id}" role="button" tabindex="0" title="Где найти осколки">${portrait(CH[id], 48, p.stars ? ringCol(p) : null)}<span>${CH[id].sn}<br><span class="rqc"><i class="${s7 ? 'ok' : 'no'}">${p.stars || 0}/7★</i><i class="${g13 ? 'ok' : 'no'}">сн. ${ROMAN[p.gear] || 'I'}/XIII</i><i class="${rOk ? 'ok' : 'no'}">ДП ${p.relic || 0}/${R}</i></span></span></div>`;
    }).join('')}</div></div>`).join('')}
    <p class="sub" style="margin:8px 0 0">Для IV–V выберите четырёх подготовленных героев; пятый — сюжетный Муад’Диб.</p>  </div></div>
  <p class="chap">Ярусы</p><div class="tiers">`;
  JR().tiers.forEach((t, i) => { const ok = journeyReady(i), open = i === 0 || JP()[i - 1];
    html += `<div class="tier ${JP()[i] ? 'done' : ''}">${thumb(JR().scenes[i], i + 1)}<div style="min-width:0"><h4>${t.n}</h4>
      <div class="meta" style="color:var(--dust);font-size:12px;margin-top:4px;display:flex;gap:6px 12px;flex-wrap:wrap;align-items:center"><span class="chips">${t.enemy.map(id => glyph(CH[id])).join('')}</span><span>враги ур. ${t.el} · ${MEM(t.erl)}</span>${t.desert ? '<span class="tag desert">Пустыня</span>' : ''}<span class="${ok ? '' : 'power bad'}">7★ · XIII · ДП всех 11${i >= 3 ? ' · 4 выбранных в бою' : ''}</span><span>${JP()[i] ? 'пройдено' : `+${amt('shard', t.sh)}`}</span></div></div>
      <div class="go-cell"><button class="btn go" data-jgo="${i}" ${ok && open ? '' : 'disabled'}>${JP()[i] ? 'Повторить' : 'Сразиться'}</button></div></div>`; });
  html += `</div>`;
  $('#view').innerHTML = html;
}

export { journeyReady, renderLegend };
