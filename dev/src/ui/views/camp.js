// ui/views/camp.js — строки 3282–3329 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../router.js'; // порядок исполнения
import { renderCampaign20 } from './campaign20.js';
import { campSquad, enGet, nodePower, prog, reqText, sideOk } from '../../logic/progress.js';
import { S } from '../../core/state.js';
import { ITEMS, NODE_ITEMS, TIER_COL } from '../../logic/gear.js';
import { ROMAN, campReward, enemyProg } from '../../logic/economy.js';
import { CAMP_DEF, CAMP_KEYS, NODES, ROM7, campNodes, chapNodes, nodeCost, nodeEn, nodeOpen } from '../../data/campaigns.js';
import { portrait } from '../../render2d/figures.js';
import { unitPower } from '../../logic/battle/stats.js';
import { CH } from '../../data/chars.js';
import { amt, fmt, ic } from '../../core/format.js';
import { $, isLandPhone } from '../../core/dom.js';
import { itemIcon, starStr } from '../common.js';

let campSel = null;
function chapStars(ck, c) { return chapNodes(ck, c).reduce((a, i) => a + (S.cleared[i] || 0), 0); }
function renderCamp() {
  if (renderCampaign20(set_campSel)) return;
  const ck = CAMP_DEF[S.campTab] ? S.campTab : 'L', CD = CAMP_DEF[ck], sp = campSquad(campNodes(ck)[0]).filter(id => prog(id).stars && sideOk(ck, id)).reduce((a, id) => a + unitPower(CH[id], prog(id)), 0);
  const all = campNodes(ck), firstOpen = all.find(i => !S.cleared[i]) ?? all[all.length - 1];
  let c = S.campCh[ck]; if (c === undefined || !nodeOpen(chapNodes(ck, c)[0])) c = NODES[firstOpen].c;
  const nodes = chapNodes(ck, c);
  if (campSel === null || !nodes.includes(campSel)) campSel = nodes.find(i => !S.cleared[i]) ?? nodes[nodes.length - 1];
  const prevScroll = $('#cmap') ? $('#cmap').scrollLeft : null;
  const LS = isLandPhone(), CW = LS ? 140 : 156, GAP = LS ? 22 : 30, pos = nodes.map((i, k) => [LS ? 12 + k * (CW + GAP) : 24 + k * (CW + GAP), k % 2 ? (LS ? 62 : 96) : (LS ? 6 : 24)]);
  const trackW = pos[pos.length - 1][0] + CW + 40, pts = pos.map(([x, y]) => `${x + CW / 2},${y + (LS ? 96 : 112)}`).join(' ');
  const tabs = CAMP_KEYS.map(k => { const tot = campNodes(k).reduce((a, i) => a + (S.cleared[i] || 0), 0), en = CAMP_DEF[k].en;
    return `<button class="ctab ${k === ck ? 'on' : ''} ct-${k}" data-ctab="${k}">${CAMP_DEF[k].n}<small>${ic(en)} · ★ ${tot}/210</small></button>`; }).join('');
  const chsel = CD.chapters.map((ch, k) => { const op = nodeOpen(chapNodes(ck, k)[0]), st = chapStars(ck, k);
    return `<button class="chb ${k === c ? 'on' : ''} ${op ? '' : 'locked'}" data-cch="${k}" ${op ? '' : 'disabled'}><b>${ROM7[k]}</b><span>${ch.t}</span><small>★ ${st}/30</small></button>`; }).join('');
  const cards = nodes.map((i, k) => {
    const n = NODES[i], open = nodeOpen(i), best = S.cleared[i] || 0, lead = CH[n.enemy[0]];
    return `<button class="ncard ${open ? '' : 'locked'} ${i === campSel ? 'sel' : ''} ${best === 3 ? 'done' : ''} ${n.m === 9 ? 'boss' : ''}" data-csel="${i}" style="left:${pos[k][0]}px;top:${pos[k][1]}px" aria-label="Миссия ${n.m + 1}: ${n.n}">
      <span class="ncimg"><canvas data-scene="${n.scene}" width="312" height="176"></canvas><span class="nnum">${n.m + 1}</span>${n.desert ? '<span class="ndes">червь</span>' : ''}${n.m === 9 ? '<span class="nboss">финал</span>' : ''}</span>
      <span class="ncboss">${portrait(lead, 50, TIER_COL[enemyProg(lead.id, n.lvl).gear])}</span>
      <span class="ncname">${n.n}</span>
      <span class="ncstars stars">${starStr(best, 3)}</span>
      ${open ? '' : '<span class="nlock"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 018 0v3" fill="none" stroke="currentColor" stroke-width="2.2"/></svg></span>'}
    </button>`; }).join('');
  const i = campSel, n = NODES[i], open = nodeOpen(i), best = S.cleared[i] || 0, np = nodePower(n), en = nodeEn(i), cost = nodeCost(i), rw = campReward(i, 3);
  const detail = `<div class="cdetail">
    <div class="cdimg"><canvas data-scene="${n.scene}" width="640" height="300"></canvas><div class="cdtitle"><span>${CD.n} · ${n.ch}</span><h3>${n.m + 1}. ${n.n}</h3><span class="stars">${starStr(best, 3)}</span></div></div>
    <div class="cdinfo">
      <div class="cdrow"><span class="lbl">Хроника</span><p class="story">${n.story}</p><div class="cdtags">${n.dlg ? `<button class="btn mini" data-dlgview="${i}">Диалог миссии</button>` : ''}<label class="chk"><input type="checkbox" id="dlgchk" data-dlgtoggle="1" ${S.skipDlg ? '' : 'checked'}> Диалоги перед первым боем</label></div></div>
      <div class="cdrow"><span class="lbl">Противник</span><div class="cdenemy">${n.enemy.map((id, k) => { const ep = enemyProg(id, n.lvl, n.m === 9); return `<div class="cden">${portrait(CH[id], 46, TIER_COL[ep.gear])}<span>${CH[id].sn}${k === 0 && CH[id].leader ? ' · лидер' : ''}</span><span class="mono">${'★'.repeat(ep.stars)}</span><span class="mono cdst">ур. ${ep.lvl} · сн. ${ROMAN[ep.gear]}</span><span class="mono cdpw">мощь ${fmt(unitPower(CH[id], ep))}</span></div>`; }).join('')}</div></div>
      <div class="cdrow"><span class="lbl">Условия</span><div class="cdtags"><span class="tag">ур. ${n.lvl}</span>${CD.side !== 'all' ? `<span class="tag sidetag ${CD.side}">${CD.side === 'light' ? 'Только светлые герои' : 'Только тёмные герои'}</span>` : '<span class="tag">Любые герои</span>'}${reqText(i) ? `<span class="tag sidetag reqtag">${reqText(i)}</span>` : ''}${n.desert ? '<span class="tag desert">Пустыня · червь</span>' : ''}<span class="power ${np > sp * 1.1 ? 'bad' : 'ok'}">мощь врага ${fmt(np)}</span><span class="power">ваш отряд ${fmt(sp)}</span></div></div>
      <div class="cdrow"><span class="lbl">Награда</span><div class="cdrew">
        ${n.drops.map((id, k) => `<span class="rewch">${portrait(CH[id], 34)}<span>${amt('shard', k === 0 ? '0–2' : '0–1', 'shard:' + id)}<br><small>${CH[id].sn} · ${k === 0 ? (ck === 'C' ? '60' : '50') : '30'}%</small></span></span>`).join('')}
        <span class="rewit">${NODE_ITEMS[i].map(id => { const key = id.startsWith('frag:') ? id.split(':')[1] : id; return ITEMS[key] ? itemIcon(ITEMS[key], 24) : ''; }).join('')}</span>
        <span class="mono" style="color:var(--dust)">${amt('sol', rw.sol)} ${amt('pl', '1–3')} ${amt('folio', rw.folio)}${ck === 'C' ? ' ' + amt('rid', '8–15') : ''}${n.lvl >= 30 ? ' ' + amt('core', n.m === 9 ? '1' : '0–1') : ''}</span></div></div>
      <div class="acts" style="margin-top:4px">${open ? `<button class="btn go ${enGet(en) >= cost ? '' : 'lack'}" data-node="${i}">В бой<small>${amt(en, cost)}</small></button>${best === 3 ? `<button class="btn sim ${enGet(en) >= cost ? '' : 'lack'}" data-sim="${i}">Симуляция<small>${amt(en, cost)} за бой</small></button>` : '<span class="lockd">Симуляция откроется после победы на 3★</span>'}` : `<span class="lockd">Сначала пройдите предыдущую миссию</span>`}</div>
    </div></div>`;
  $('#view').innerHTML = `<h2 class="lshide">Кампании</h2>
    <div class="ctabs">${tabs}</div>
    <p class="sub">${CD.desc}</p>
    <div class="chsel">${chsel}</div>
    <div class="chintro"><b>Глава ${ROM7[c]}. ${CD.chapters[c].t}</b> ${CD.chapters[c].intro}</div>
    <div class="cmap ck-${ck}" id="cmap"><div class="ctrack" style="width:${trackW}px"><svg class="cpath" width="${trackW}" height="${LS ? 240 : 330}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="rgb(232 145 63 / .55)" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/></svg>${cards}</div></div>
    ${detail}`;
  const m = $('#cmap'), k0 = nodes.indexOf(campSel);
  if (prevScroll !== null && m.dataset) m.scrollLeft = prevScroll; else m.scrollLeft = Math.max(0, pos[k0][0] - m.clientWidth / 2 + CW / 2);
}


function set_campSel(v) { return campSel = v; }
export { campSel, chapStars, renderCamp, set_campSel };
