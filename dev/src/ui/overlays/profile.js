// ui/overlays/profile.js — строки 4906–4933 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { FEATS, featMax, featRank } from '../views/feats.js';
import { EMBLEMS, FRAMES, TITLES, unlocked } from '../../data/cosmetics.js';
import { $, squadPower, unlockedIds } from '../../core/util.js';
import { S } from '../../core/state.js';
import { CMAX, ROMAN, ROSTER_IDS, WMAX } from '../../logic/economy.js';
import { CH } from '../../data/chars.js';
import { figureSVG } from '../../render2d/figures.js';
import { ACC_MAX, GEAR_CAP_AT, accNeed, accReward, gearCap, heroCap } from '../../logic/account.js';
import { MEM, RELIC_AT, RELIC_MAX, relicCap } from '../../logic/relics.js';
import { rewardsHtml } from '../rewards.js';
import { fmt, ic } from '../../core/format.js';

// ===================== profile =====================
function openProfile() {
  const P = S.profile;
  const heroAvas = ROSTER_IDS.map(id => 'hero:' + id), embAvas = Object.keys(EMBLEMS).map(k => 'emb:' + k);
  const howAva = a => { for (const F of FEATS) for (const [s, c] of Object.entries(F.cos)) if (c.ava && 'emb:' + c.ava === a) return `${F.n}, ступень ${ROMAN[+s + 1]}`; return 'Откройте героя'; };
  const howOf = (kind, id) => { for (const F of FEATS) for (const [s, c] of Object.entries(F.cos)) if (c[kind] === id) return `${F.n}, ступень ${ROMAN[+s + 1]}`; return ''; };
  const avaBtn = a => { const ok = unlocked('ava', a); return `<button class="pick ${P.ava === a ? 'on' : ''} ${ok ? '' : 'lk'}" data-pava="${a}" ${ok ? '' : 'disabled'} title="${ok ? '' : 'Как получить: ' + howAva(a)}">${avatarHtml(a, 'basic', 44)}</button>`; };
  const frBtn = f => { const ok = unlocked('frame', f); return `<button class="pick fr ${P.frame === f ? 'on' : ''} ${ok ? '' : 'lk'}" data-pframe="${f}" ${ok ? '' : 'disabled'} title="${FRAMES[f].n}${ok ? '' : ' — ' + howOf('frame', f)}">${avatarHtml(P.ava, f, 44)}<small>${FRAMES[f].n}</small></button>`; };
  const tBtn = k => { const ok = unlocked('title', k); return `<button class="ptitle ${P.title === k ? 'on' : ''} ${ok ? '' : 'lk'}" data-ptitle="${k}" ${ok ? '' : 'disabled'}><b>${TITLES[k]}</b><small>${ok ? (P.title === k ? 'выбран' : 'получен') : howOf('title', k) || 'особый режим'}</small></button>`; };
  const ownedT = Object.keys(TITLES).filter(k => unlocked('title', k)).length;
  $('#overlay2').innerHTML = `<div class="detail info-layer" data-iclose="1"><div class="sheet profsheet" role="dialog" aria-modal="true" aria-labelledby="prof-h">
    <div class="profcard">${avatarHtml(P.ava, P.frame, 84)}<div class="profmain"><span class="ptl">${TITLES[P.title] || ''}</span><h3 id="prof-h">${esc(P.nick)}</h3>
      <div class="profstats mono"><span>Мощь отряда ${fmt(squadPower())}</span><span>Героев ${unlockedIds().length}</span><span>Подвиги ${featRank()}/${featMax}</span><span>Побед ${fmt(S.stats.wins || 0)}</span></div></div></div>
    ${accPanel()}
    <p class="chap">Никнейм</p>
    <div class="nickrow"><input id="pnick" maxlength="20" value="${esc(P.nick)}" aria-label="Никнейм" autocomplete="off"><button class="btn go" data-pnick="1">Сохранить</button></div>
    <p class="chap">Аватар</p><div class="pgrid">${heroAvas.map(avaBtn).join('')}${embAvas.map(avaBtn).join('')}</div>
    <p class="chap">Рамка</p><div class="pgrid fr">${Object.keys(FRAMES).map(frBtn).join('')}</div>
    <p class="chap">Титул · получено ${ownedT} из ${Object.keys(TITLES).length}</p><div class="tgrid">${Object.keys(TITLES).map(tBtn).join('')}</div>
    <p class="chap">Сохранение</p>
    <p class="sub" style="margin:0 0 6px;font-size:12px">Прогресс хранится на этом устройстве. Сделайте резервную копию, чтобы перенести игру на другое устройство или не потерять её при очистке данных браузера.</p>
    <div class="acts" style="margin-top:0"><button class="btn" data-saveexp="1">Экспорт сохранения</button><button class="btn" data-saveimp="1">Импорт сохранения</button></div>
    <div class="acts"><button class="btn" data-v="feats" data-iclose2="1">Подвиги</button><button class="btn" data-iclose="1" style="margin-left:auto">Закрыть</button></div>
  </div></div>`;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const profileChip = () => `<button class="pchip" data-profile="1" aria-label="Профиль игрока, уровень ${S.acc.lvl}"><span class="pchav">${avatarHtml(S.profile.ava, S.profile.frame, 40)}${accBadge()}</span><span><b>${esc(S.profile.nick)}</b><small>${TITLES[S.profile.title] || ''}</small></span></button>`;
function avatarHtml(ava, frame, size = 56) {
  let inner;
  if (ava && ava.startsWith('emb:') && EMBLEMS[ava.slice(4)]) { const E = EMBLEMS[ava.slice(4)]; inner = `<svg viewBox="0 0 40 40" aria-hidden="true"><defs><radialGradient id="eg-${ava.slice(4)}" cx=".5" cy=".35" r=".75"><stop offset="0" stop-color="${E.bg[0]}"/><stop offset="1" stop-color="${E.bg[1]}"/></radialGradient></defs><rect width="40" height="40" fill="url(#eg-${ava.slice(4)})"/>${E.svg}</svg>`; }
  else { const d = CH[(ava || 'hero:leto').slice(5)] || CH.leto; inner = `<span class="pt" style="--fc:var(--${d.f[0]});width:100%;height:100%">${figureSVG(d)}</span>`; }
  return `<span class="pfr fr-${FRAMES[frame] ? frame : 'basic'}" style="--sz:${size}px"><span class="pin">${inner}</span></span>`;
}
const accBadge = () => `<span class="accb" title="Уровень аккаунта ${S.acc.lvl}" style="--p:${S.acc.lvl >= ACC_MAX ? 100 : Math.round(S.acc.xp / accNeed(S.acc.lvl) * 100)}%"><b>${S.acc.lvl}</b></span>`;
function accPanel() {
  const L = S.acc.lvl, max = L >= ACC_MAX, need = accNeed(L), pct = max ? 100 : S.acc.xp / need * 100;
  const nextG = Object.entries(GEAR_CAP_AT).find(([t, l]) => l > L);
  return `<div class="accp"><div class="accrow"><span class="acclvl">${L}</span><div style="flex:1;min-width:0"><b>Уровень аккаунта</b><div class="fbar"><i style="width:${pct}%"></i><b class="mono">${max ? 'максимум' : `${fmt(S.acc.xp)} / ${fmt(need)} опыта`}</b></div></div></div>
    <div class="acckv"><span>Потолок уровня героев</span><b>${heroCap()}</b><span>Потолок снаряжения</span><b>${ROMAN[gearCap()]}</b><span>Запас энергии</span><b>${ic('water')} ${WMAX()} · ${ic('candle')} ${CMAX()} <small style="color:var(--dust)">+15/+10 каждые 10 ур.</small></b>${nextG ? `<span>Снаряжение ${ROMAN[nextG[0]]}</span><b>с ур. ${nextG[1]}</b>` : ''}<span>Потолок Другой памяти</span><b>${MEM(relicCap())}${relicCap() < RELIC_MAX ? ` · ${MEM(relicCap() + 1)} с ур. ${RELIC_AT[relicCap() + 1]}` : ''}</b><span>Награда за ур. ${Math.min(ACC_MAX, L + 1)}</span><b>${rewardsHtml(accReward(Math.min(ACC_MAX, L + 1)))}</b></div>
    <p class="sub" style="margin:4px 0 0;font-size:11px">Опыт: 3 за каждую единицу Воды или Свечей в победе и симуляции, 15 за победу в испытании, 40 в путешествии легенды, 30 за атаку в рейде, 10 за дневное задание.</p></div>`;
}


export { openProfile, esc, profileChip, avatarHtml, accBadge, accPanel };
