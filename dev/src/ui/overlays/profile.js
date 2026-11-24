// ui/overlays/profile.js — строки 4906–4933 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { FEATS, featMax, featRank } from '../views/feats.js';
import { EMBLEMS, FRAMES, TITLES, unlocked } from '../../data/cosmetics.js';
import { WORM_IMG } from '../../assets/models.js'; // ARCH-01C3a2: UI-owned worm SVG asset
import { squadPower, unlockedIds } from '../../logic/progress.js';
import { S } from '../../core/state.js';
import { CMAX, ROMAN, ROSTER_IDS, WMAX } from '../../logic/economy.js';
import { CH } from '../../data/chars.js';
import { figureSVG } from '../../render2d/figures.js';
import { ACC_MAX, GEAR_CAP_AT, accNeed, accReward, gearCap, heroCap } from '../../logic/account-rules.js';
import { MEM, RELIC_AT, RELIC_MAX, relicCap } from '../../logic/relics.js';
import { rewardsHtml } from '../rewards.js';
import { fmt, ic } from '../../core/format.js';
import { $ } from '../../core/dom.js';

// ARCH-01C3a2: apply the exact historical worm SVG before any profile/avatar renders.
if (typeof WORM_IMG !== 'undefined') { EMBLEMS.worm.svg = `<image href="${WORM_IMG.ava}" x="1" y="1" width="38" height="38"/>`; EMBLEMS.worm.bg = ['#a8784a', '#2a1608']; }

// ===================== profile =====================
// UI-04: transient UI state, never serialized. Existing metaClick owns mutations.
let profileTab = 'overview', profileKind = 'ava', profileOwned = false;
function openProfile(keep = false) {
  const old = $('#overlay2 .ui04-scroll');
  const scroll = keep && old ? old.scrollTop : 0;
  if (!keep) { profileTab = 'overview'; profileKind = 'ava'; profileOwned = false; }
  const P = S.profile, L = S.acc.lvl, max = L >= ACC_MAX, need = accNeed(L);
  const pct = max ? 100 : Math.min(100, Math.max(0, Math.round(S.acc.xp / need * 100)));
  const items = { ava: [...Object.keys(EMBLEMS).map(k => 'emb:' + k), ...ROSTER_IDS.map(k => 'hero:' + k)], frame: Object.keys(FRAMES), title: Object.keys(TITLES) };
  const label = (kind, id) => kind === 'title' ? TITLES[id] : kind === 'frame' ? FRAMES[id].n : id.startsWith('emb:') ? EMBLEMS[id.slice(4)].n : CH[id.slice(5)].n;
  const source = (kind, id) => {
    for (const F of FEATS) for (const [s, c] of Object.entries(F.cos)) {
      if (kind === 'ava' ? 'emb:' + c.ava === id : c[kind] === id) return F.n + ', ступень ' + ROMAN[+s + 1];
    }
    return kind === 'ava' && id.startsWith('hero:') ? 'Откройте героя' : 'Особый режим';
  };
  const btn = (k, label, current, attr) => '<button type="button" '+attr+'="'+k+'" aria-pressed="'+(k === current)+'" class="'+(k === current ? 'active' : '')+'">'+label+'</button>';
  const tile = (name, value, attr = '') => '<div class="ui04-stat" '+attr+'><span>'+name+'</span><strong>'+value+'</strong></div>';
  const nextG = Object.entries(GEAR_CAP_AT).find(([,l]) => l > L);
  const overview = () => `<div class="ui04-xp"><div><strong>Уровень аккаунта ${L} / ${ACC_MAX}</strong><span>${max ? 'Максимум' : 'Следующий: ' + (L+1)}</span></div><div class="ui04-meter" role="progressbar" aria-label="Опыт" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div><div><span>${max ? 'Максимальный уровень' : fmt(S.acc.xp)+' / '+fmt(need)+' опыта'}</span><b>${pct}%</b></div></div>
    <div class="ui04-stats">${tile('Героев открыто', unlockedIds().length)}<button class="ui04-stat" data-v="feats" data-iclose2="1"><span>Ступени подвигов ›</span><strong>${featRank()} / ${featMax}</strong></button>${tile('Побед',fmt(S.stats.wins || 0))}</div>
    <h4>Возможности аккаунта</h4><div class="ui04-limits">${tile('Уровень героев',heroCap())}${tile('Снаряжение',ROMAN[gearCap()] + (nextG ? ' · ' + ROMAN[nextG[0]]+' с '+nextG[1] : ''))}${tile('Вода · Огни (лимит)',WMAX()+' · '+CMAX())}${tile('Другая память',MEM(relicCap()) + (relicCap()<RELIC_MAX?' → '+RELIC_AT[relicCap()+1]+' ур.':''))}</div>
    ${max ? '' : '<div class="ui04-next ui04-next-reward"><div><strong>Награда за '+(L+1)+' уровень</strong><small>После повышения · автоматически</small></div><div class="ui04-reward">'+rewardsHtml(accReward(L+1))+'</div></div>'}
    <details class="ui04-next"><summary>Как получить опыт и увеличить лимиты</summary><p>Опыт: 3 за каждую единицу Воды или Огней Хроник в победе и симуляции, 15 за победу в испытании, 40 в путешествии легенды, 30 за атаку в рейде, 10 за дневное задание. Лимиты энергии: +15/+10 каждые 10 уровней.</p></details>`;
  const custom = () => {
    if (profileKind === 'nick') return '<div class="ui04-scroll"><h4>Имя игрока</h4><div class="nickrow"><input id="pnick" maxlength="20" value="'+esc(P.nick)+'" aria-label="Никнейм" autocomplete="off"><button class="btn go" data-pnick="1">Сохранить</button></div><p>До 20 символов.</p></div>';
    const kind = profileKind, ids = items[kind], owned = ids.filter(id => unlocked(kind,id));
    return '<div class="ui04-filter"><span>Получено '+owned.length+' из '+ids.length+'</span><button type="button" data-ui04-filter="1" aria-pressed="'+profileOwned+'">'+(profileOwned?'✓':'□')+' Только полученные</button></div><div class="ui04-scroll ui04-collection '+(kind==='title'?'titles':'')+'">'+(profileOwned?owned:ids).map(id=>{
      const ok = unlocked(kind,id), selected = P[kind] === id, name = label(kind,id) || id;
      const action = ok ? 'data-p'+kind+'="'+esc(id)+'"' : 'data-ui04-locked="'+esc(id)+'"';
      return '<button type="button" class="ui04-item '+(selected?'selected ':'')+(!ok?'locked':'')+'" '+action+' aria-pressed="'+selected+'" aria-label="'+esc(name+(ok?'':', закрыто: '+source(kind,id)))+'">'+(kind==='title'?'':avatarHtml(kind==='ava'?id:P.ava,kind==='frame'?id:'basic',46))+'<strong>'+esc(name)+'</strong>'+(kind==='title'?'<small>'+esc(ok?(selected?'Выбран':'Получен'):source(kind,id))+'</small>':'')+'<span class="ui04-mark" aria-hidden="true">'+(selected?'✓':!ok?'🔒':'')+'</span></button>';
    }).join('')+'</div><div class="ui04-hint" role="status" hidden></div>';
  };
  const save = () => `<div class="ui04-scroll ui04-save"><h4>Резервная копия прогресса</h4><p>Прогресс хранится на этом устройстве. Сделайте внешнюю резервную копию перед переносом игры или очисткой данных браузера.</p><div class="ui04-save-actions"><button class="btn go" data-saveexp="1">Экспорт сохранения</button><button class="btn" data-saveimp="1">Импорт сохранения</button></div><p>Импорт использует существующую проверку и подтверждение сохранения.</p>    <details class="asset-credits" style="margin:8px 0 14px;font-size:11px;color:var(--dust)">
      <summary style="cursor:pointer">Авторы 3D-ассетов лагеря · CC BY 4.0</summary>
      <p style="line-height:1.65;margin:7px 0">Модели адаптированы для мобильной игры: уменьшены текстуры, изменены материалы и масштаб.</p>
      <p style="line-height:1.65;margin:4px 0">Орнитоптер «Flycatcher» — <a href="https://sketchfab.com/3d-models/ornithopter-flycatcher-fantasy-plane-828eb683e95d412aa5da8e5b13699a67" target="_blank" rel="noopener noreferrer">borsh_and</a> ·
      Пустынный шатёр — <a href="https://sketchfab.com/3d-models/military-tent-desert-2a0fd34c43394a509e347302cea15df2" target="_blank" rel="noopener noreferrer">adventurer</a> ·
      Голографический стол — <a href="https://sketchfab.com/3d-models/hologram-table-game-ready-asset-ea2c5ed437284a44a8878a2cc49b2270" target="_blank" rel="noopener noreferrer">ROHIT3DMODELS</a>.</p>
      <p style="margin:4px 0">Лицензия: <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">Creative Commons Attribution 4.0</a>.</p>
    </details>
<div class="ui04-save-actions"><button class="btn" data-v="rules" data-iclose2="1">Правила боя</button><button class="btn" data-v="feats" data-iclose2="1">Подвиги</button></div></div>`;
  $('#overlay2').innerHTML = `<div class="detail info-layer ui04-layer"><div class="sheet profsheet ui04-profile" role="dialog" aria-modal="true" aria-labelledby="prof-h"><header class="ui04-header"><button type="button" data-iclose="1" aria-label="Назад">‹</button><div><small>DUNE · ЛИЧНЫЙ АРХИВ</small><h3 id="prof-h">Профиль игрока</h3></div><button type="button" data-iclose="1" aria-label="Закрыть">×</button></header><div class="ui04-body"><aside class="ui04-card"><div class="ui04-land" aria-hidden="true"></div><small>ЛИЧНОЕ ДОСЬЕ</small><div class="ui04-portrait">${avatarHtml(P.ava,P.frame,76)}<span>Ур. ${L}</span></div><h3>${esc(P.nick)}</h3><p>${esc(TITLES[P.title] || '')}</p><div class="ui04-power"><span>Мощь отряда</span><strong>${fmt(squadPower())}</strong></div><button type="button" class="ui04-edit" data-ui04-tab="custom">Изменить профиль</button></aside><section class="ui04-main"><nav class="ui04-tabs" aria-label="Разделы профиля">${btn('overview','Обзор',profileTab,'data-ui04-tab')}${btn('custom','Персонализация',profileTab,'data-ui04-tab')}${btn('save','Сохранение',profileTab,'data-ui04-tab')}</nav>${profileTab==='overview'?'<div class="ui04-scroll ui04-overview">'+overview()+'</div>':profileTab==='custom'?'<nav class="ui04-subtabs" aria-label="Персонализация">'+btn('ava','Аватары',profileKind,'data-ui04-kind')+btn('frame','Рамки',profileKind,'data-ui04-kind')+btn('title','Титулы',profileKind,'data-ui04-kind')+btn('nick','Имя',profileKind,'data-ui04-kind')+'</nav>'+custom():save()}</section></div></div></div>`;
  const root = $('#overlay2 .ui04-profile');
  // No global listener, no mutation of S; existing delegated handlers remain intact.
  if (root) {
    const area = root.querySelector('.ui04-scroll');
    if (area) area.scrollTop = scroll;
    root.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      const d = b.dataset;
      if (d.ui04Tab || d.ui04Kind || d.ui04Filter || d.ui04Locked) {
        e.stopPropagation();
        if (d.ui04Locked) {
          const hint = root.querySelector('.ui04-hint');
          hint.hidden = false; hint.textContent = label(profileKind,d.ui04Locked)+' · '+source(profileKind,d.ui04Locked);
          return;
        }
        if (d.ui04Tab) profileTab = d.ui04Tab;
        if (d.ui04Kind) profileKind = d.ui04Kind;
        if (d.ui04Filter) profileOwned = !profileOwned;
        if (area) area.scrollTop = 0;
        openProfile(true);
      }
    });
  }
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// UI-02: the approved unified top-bar profile uses the EXISTING user-selected
// avatar/frame, real account XP and squad power. It does not touch saved data.
const profileChip = () => {
  const lvl = S.acc.lvl;
  const xpPct = lvl >= ACC_MAX ? 100 : Math.min(100, Math.max(0, Math.round(S.acc.xp / Math.max(1, accNeed(lvl)) * 100)));
  return `<button class="pchip ui02-profile" type="button" data-profile="1" aria-label="Профиль игрока ${esc(S.profile.nick)}, уровень ${lvl}, мощь отряда ${fmt(squadPower())}">
    <span class="ui02-ribbon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M4 4q5-3 9 3 3 3 7 2-2 5-8 5l-4 6-1-7z" fill="currentColor"/><path d="M6 7q6 1 6 7" stroke="#173d39" stroke-width="1.4"/></svg></span>
    <span class="ui02-avatar">${avatarHtml(S.profile.ava, S.profile.frame, 76)}<span class="ui02-level">Ур. ${lvl}</span></span>
    <span class="ui02-player-copy">
      <strong class="ui02-player-name">${esc(S.profile.nick)}</strong>
      <span class="ui02-power"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 2 9 4-2 10-7 6L5 16 3 6Z" stroke="currentColor" stroke-width="2"/><path d="m12 6 2 5 5 1-5 2-2 5-2-5-5-2 5-1Z" fill="currentColor"/></svg>Мощь ${fmt(squadPower())}</span>
      <span class="ui02-xp" aria-label="Опыт аккаунта: ${xpPct}%"><i style="width:${xpPct}%"></i></span>
      <span class="ui02-title">${esc(TITLES[S.profile.title] || 'Ваш Малый Дом')}</span>
    </span>
  </button>`;
};
// UI-04 original vector heraldry, hand-authored for this project (no external artwork).
// Layered engraved metal and enamel silhouettes; catalog and entitlements are untouched.
const PROFILE_HERALDRY = {
  hawk: '<path fill="#142b23" stroke="#769982" stroke-width=".5" d="M4 8 20 4 36 8 34 25 20 36 6 25Z"/><path fill="#a47a40" stroke="#f3d89b" stroke-width=".55" d="M3 11 12 15 17 13 20 7 23 13 28 15 37 11 34 19 29 23 24 24 25 31 20 28 15 31 16 24 11 23 6 19Z"/><path fill="#efdbab" d="M3 11 15 17 19 13 20 8 20 22 16 24 11 22 6 18ZM37 11 25 17 21 13 20 8 23 21 29 22 34 18Z"/><path fill="#71512c" d="m20 13 4 5-4 3-4-3Zm-2 10 2 4 2-4-2 9Z"/><path stroke="#f1d29a" stroke-width=".65" fill="none" d="m7 16 7 3m-5 1 5 2m19-6-7 3m5 1-5 2"/>',
  baron: '<path fill="#171d30" stroke="#8793ad" stroke-width=".6" d="M5 6 20 3 35 6 33 27 20 37 7 27Z"/><path fill="#8998b2" stroke="#eef2fa" stroke-width=".5" d="m20 6 4 7 9-5-3 10 5 7-10-3 3 9-8-5-8 5 3-9-10 3 5-7-3-10 9 5Z"/><path fill="#dbe2ee" d="m20 6 4 7 9-5-6 10-7 5-7-5-6-10 9 5Z"/><path fill="#4d5777" d="m20 14 5 4-5 8-5-8Z"/><path fill="#171d30" d="m16 16 3 1-2 2Zm8 0-3 1 2 2Z"/><path fill="#cdd7e7" d="m20 20 3 2-3 4-3-4Z"/>',
  eye: '<circle cx="20" cy="20" r="16" fill="#123d38" stroke="#adbd9d" stroke-width=".8"/><path fill="none" stroke="#6ba99e" stroke-width=".55" d="M20 4v7m0 18v7M4 20h5m22 0h5M9 9l5 5m12 12 5 5m0-22-5 5M14 26l-5 5"/><path fill="#d9d4a6" stroke="#f7e2b5" stroke-width=".5" d="M4 20q16-20 32 0Q20 40 4 20Z"/><circle cx="20" cy="20" r="7" fill="#4c998c" stroke="#246459" stroke-width="1"/><circle cx="20" cy="20" r="4" fill="#102b2b"/><path fill="#c4f3d9" d="M17 17q4-3 6 1l-4 1Z"/><path fill="none" stroke="#8b754c" stroke-width=".8" d="M8 20q12-13 24 0"/>',
  spice: '<path fill="#101e42" stroke="#637cb3" stroke-width=".7" d="M4 8 20 3 36 8 34 27 20 36 6 27Z"/><path fill="#668ecb" stroke="#d0dfff" stroke-width=".6" d="M4 20Q12 8 20 12q8-4 16 8-8 12-16 8-8 4-16-8Z"/><path fill="#b8d6ff" d="M5 20q15-13 30 0-15 10-30 0Z"/><circle cx="20" cy="20" r="7.2" fill="#3169cc" stroke="#7eb9ff" stroke-width="1.3"/><circle cx="20" cy="20" r="3.4" fill="#07172d"/><path fill="#e0f5ff" d="m17 15 4 1-2 3-3-1Z"/><path stroke="#7397d7" fill="none" stroke-width=".65" d="m20 4 2 4-2 3-2-3Zm0 26 2 3-2 3-2-3Z"/>',
  lion: '<path fill="#473318" stroke="#bd9953" stroke-width=".6" d="M4 8 20 3 36 8 34 26 20 37 6 26Z"/><path fill="#b38635" stroke="#f5d589" stroke-width=".55" d="m20 4 4 5 6-2 1 6 5 3-3 5 2 6-6 1-4 6-5-2-5 2-4-6-6-1 2-6-3-5 5-3 1-6 6 2Z"/><path fill="#e6bc66" d="m12 13 5-3 3 2 3-2 5 3 2 7-4 8-6 3-6-3-4-8Z"/><path fill="#f5d994" d="m12 13 5-3 3 3-3 6-5 2Zm16 0-5-3-3 3 3 6 5 2Z"/><path fill="#65471f" d="m12 17 5 1-2 3Zm16 0-5 1 2 3Zm-12 6 4-2 4 2-4 4Zm4 4 4 1-4 2-4-2Z"/><path stroke="#f4dca0" fill="none" stroke-width=".65" d="m8 13 2 7-2 6m24-13-2 7 2 6"/>',
  knife: '<path fill="#33291e" stroke="#a68c67" stroke-width=".6" d="M5 7 20 3 35 7 34 26 20 37 6 26Z"/><path fill="#cbb184" stroke="#fff1cd" stroke-width=".6" d="M29 5q0 9-5 17l-8 8-5-5 9-10Z"/><path fill="#fff0c8" d="M29 5 24 19 14 28l-3-3 9-10Z"/><path fill="#775136" stroke="#d3aa66" stroke-width=".65" d="m10 24 7 6-3 4-3-2-2 3-4-4 3-3Z"/><path stroke="#f2c783" stroke-width=".7" d="m8 29 4 4m-2-6 4 4"/><path fill="none" stroke="#ad956d" stroke-width=".6" d="M8 14 12 8m20 18-5 5"/>',
  sietch: '<path fill="#4a3021" stroke="#c39b64" stroke-width=".6" d="M4 8 20 3 36 8 34 26 20 37 6 26Z"/><circle cx="27" cy="12" r="5" fill="#d9ad6b"/><path fill="#98683f" stroke="#d6ae77" stroke-width=".5" d="m3 28 9-15 6 6 5-10 14 19-17 8Z"/><path fill="#e3be83" d="m12 13-9 15 11-7Zm11-4-5 10 9 5Z"/><path fill="#6e4b30" d="m9 29 11-11 11 11-11 5Z"/><path fill="#251b15" stroke="#efc88a" stroke-width=".55" d="M16 31v-5q4-7 8 0v5Z"/><path stroke="#c39b64" fill="none" stroke-width=".6" d="m7 29 5 2m16 0 5-2M18 34h4"/>'
};

function avatarHtml(ava, frame, size = 56) {
  let inner;
  if (ava && ava.startsWith('emb:') && EMBLEMS[ava.slice(4)]) { const E = EMBLEMS[ava.slice(4)]; inner = `<svg viewBox="0 0 40 40" aria-hidden="true"><defs><radialGradient id="eg-${ava.slice(4)}" cx=".5" cy=".35" r=".75"><stop offset="0" stop-color="${E.bg[0]}"/><stop offset="1" stop-color="${E.bg[1]}"/></radialGradient></defs><rect width="40" height="40" fill="url(#eg-${ava.slice(4)})"/>${PROFILE_HERALDRY[ava.slice(4)] || E.svg}</svg>`; }
  else { const d = CH[(ava || 'hero:leto').slice(5)] || CH.leto; inner = `<span class="pt" style="--fc:var(--${d.f[0]});width:100%;height:100%">${figureSVG(d)}</span>`; }
  return `<span class="pfr fr-${FRAMES[frame] ? frame : 'basic'}" style="--sz:${size}px"><span class="pin">${inner}</span></span>`;
}
const accBadge = () => `<span class="accb" title="Уровень аккаунта ${S.acc.lvl}" style="--p:${S.acc.lvl >= ACC_MAX ? 100 : Math.round(S.acc.xp / accNeed(S.acc.lvl) * 100)}%"><b>${S.acc.lvl}</b></span>`;
function accPanel() {
  const L = S.acc.lvl, max = L >= ACC_MAX, need = accNeed(L), pct = max ? 100 : S.acc.xp / need * 100;
  const nextG = Object.entries(GEAR_CAP_AT).find(([t, l]) => l > L);
  return `<div class="accp"><div class="accrow"><span class="acclvl">${L}</span><div style="flex:1;min-width:0"><b>Уровень аккаунта</b><div class="fbar"><i style="width:${pct}%"></i><b class="mono">${max ? 'максимум' : `${fmt(S.acc.xp)} / ${fmt(need)} опыта`}</b></div></div></div>
    <div class="acckv"><span>Потолок уровня героев</span><b>${heroCap()}</b><span>Потолок снаряжения</span><b>${ROMAN[gearCap()]}</b><span>Запас энергии</span><b>${ic('water')} ${WMAX()} · ${ic('candle')} ${CMAX()} <small style="color:var(--dust)">+15/+10 каждые 10 ур.</small></b>${nextG ? `<span>Снаряжение ${ROMAN[nextG[0]]}</span><b>с ур. ${nextG[1]}</b>` : ''}<span>Потолок Другой памяти</span><b>${MEM(relicCap())}${relicCap() < RELIC_MAX ? ` · ${MEM(relicCap() + 1)} с ур. ${RELIC_AT[relicCap() + 1]}` : ''}</b><span>Награда за ур. ${Math.min(ACC_MAX, L + 1)}</span><b>${rewardsHtml(accReward(Math.min(ACC_MAX, L + 1)))}</b></div>
    <p class="sub" style="margin:4px 0 0;font-size:11px">Опыт: 3 за каждую единицу Воды или Огней Хроник в победе и симуляции, 15 за победу в испытании, 40 в путешествии легенды, 30 за атаку в рейде, 10 за дневное задание.</p></div>`;
}


export { openProfile, esc, profileChip, avatarHtml, accBadge, accPanel };
