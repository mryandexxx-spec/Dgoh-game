// ui/overlays/profile.js — строки 4906–4933 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { accBadge, accPanel } from '../../logic/account.js';
import { FEATS, featMax, featRank } from '../views/feats.js';
import { EMBLEMS, FRAMES, TITLES, avatarHtml, unlocked } from '../../data/cosmetics.js';
import { unlockedIds } from './squad-select.js';
import { $, squadPower } from '../../core/util.js';
import { S } from '../../core/state.js';
import { fmt } from '../../core/save.js';
import { ROMAN, ROSTER_IDS } from '../../logic/economy.js';

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


export { openProfile, esc, profileChip };
