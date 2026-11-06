// ui/views/feats.js — строки 4856–4905 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { EMBLEMS, FRAMES, TITLES } from '../../data/cosmetics.js';
import { METRIC } from '../../logic/stats.js';
import { giveRewards, rewardWin, rewardsHtml } from '../rewards.js';
import { render } from '../router.js';
import { S } from '../../core/state.js';
import { persist } from '../../core/save.js';
import { ROMAN } from '../../logic/economy.js';
import { avatarHtml } from '../overlays/profile.js';
import { fmt } from '../../core/format.js';
import { $ } from '../../core/dom.js';

// ===================== feats =====================
const FEATS = [
  { id: 'light', n: 'Путь Атрейдесов', d: 'Звёзды светлой кампании', m: 'starsL', at: [15, 45, 90, 150, 210], cos: { 2: { ava: 'hawk' }, 4: { title: 'atr', frame: 'light' } } },
  { id: 'dark', n: 'Воля Барона', d: 'Звёзды тёмной кампании', m: 'starsD', at: [15, 45, 90, 150, 210], cos: { 2: { ava: 'baron' }, 4: { title: 'hark', frame: 'dark' } } },
  { id: 'chron', n: 'Летописец', d: 'Звёзды Хроник Дюны', m: 'starsC', at: [15, 45, 90, 150, 210], cos: { 2: { ava: 'eye' }, 4: { title: 'chron', frame: 'chron' } } },
  { id: 'raid', n: 'Укротитель червя', d: 'Суммарный урон по Шаи-Хулуду', m: 'raidDmg', at: [100000, 400000, 1500000, 4000000, 10000000], cos: { 2: { ava: 'worm' }, 4: { title: 'worm', frame: 'worm' } } },
  { id: 'kills', n: 'Смерть в песках', d: 'Убийства червя в рейде', m: 'raidKills', at: [1, 3, 6, 10], cos: { 3: { title: 'rider' } } },
  { id: 'wins', n: 'Песок и кровь', d: 'Победы в любых боях, включая симуляции', m: 'wins', at: [25, 100, 300, 800, 2000], cos: { 2: { ava: 'knife' }, 4: { title: 'blade' } } },
  { id: 'legend', n: 'Легенды Арракиса', d: 'Очки легенд: +1 за открытую легенду, +1 за легенду на 7★', m: 'legend', at: [1, 2, 3, 4], cos: { 0: { title: 'legend' }, 1: { ava: 'spice' }, 3: { title: 'kh', frame: 'prophet' } } },
  { id: 'house', n: 'Великий Дом', d: 'Герои на 7★', m: 'stars7', at: [1, 3, 6, 10, 15], cos: { 2: { ava: 'lion' }, 4: { title: 'house', frame: 'house' } } },
  { id: 'trials', n: 'Испытанный пустыней', d: 'Уровни испытаний, пройденные на 3★', m: 'trials3', at: [3, 10, 20, 35, 48], cos: { 2: { ava: 'sietch' }, 4: { title: 'trial', frame: 'gold' } } },
  { id: 'gl', n: 'Сила пророчества', d: 'Применения ультимативных способностей легенд', m: 'gl', at: [1, 10, 30, 75], cos: { 3: { title: 'prophet' } } },
  { id: 'devour', n: 'Зов Шаи-Хулуда', d: 'Враги, поглощённые червём Лиет-Кайнс', m: 'devour', at: [1, 10, 40], cos: { 2: { title: 'judge' } } },
  { id: 'skill', n: 'Великий ментат', d: 'Способности на 7-м уровне', m: 'skill7', at: [1, 5, 12, 25], cos: { 3: { title: 'mentat' } } },
  { id: 'days', n: 'Верность Дому', d: 'Дни в игре', m: 'days', at: [7, 30, 100, 365], cos: { 3: { title: 'loyal' } } },
  { id: 'cqmax', n: 'Покоритель Джихада', d: 'Недели Джихада, в которых открыт последний сундук шкалы (◆350)', m: 'cqMax', at: [1, 3, 6, 10, 20], cos: { 4: { title: 'jihad' } } },
  { id: 'cqhero', n: 'Наследие машин', d: 'Открытые герои Джихада: Эразм, робот-воин, кимек', m: 'cqHero', at: [1, 2, 3], cos: { 2: { title: 'thinker' } } },
  { id: 'cqleg', n: 'Архив Икса', d: 'Полученные легендарные диски Джихада', m: 'cqLeg', at: [1, 5, 15, 30], cos: { 3: { title: 'ix' } } },
];
const FEAT_RW = [[['cry', 50]], [['cry', 100], ['folio', 10]], [['seal', 1], ['cry', 150]], [['seal', 2], ['rid', 100]], [['wol', 1], ['seal', 2], ['cry', 300]]];
const featRw = (F, s) => FEAT_RW[Math.min(4, s + (5 - F.at.length))];
const featStep = F => S.feats[F.id] || 0;
const featReady = F => featStep(F) < F.at.length && METRIC[F.m]() >= F.at[featStep(F)];
const featsReady = () => FEATS.filter(featReady).length;
const featRank = () => FEATS.reduce((a, F) => a + featStep(F), 0), featMax = FEATS.reduce((a, F) => a + F.at.length, 0);
const cosHtml = c => !c ? '' : [c.title ? `<span class="cosi t">Титул «${TITLES[c.title]}»</span>` : '', c.ava ? `<span class="cosi a">${avatarHtml('emb:' + c.ava, 'basic', 22)} Аватар «${EMBLEMS[c.ava].n}»</span>` : '', c.frame ? `<span class="cosi f">${avatarHtml(S.profile.ava, c.frame, 22)} Рамка «${FRAMES[c.frame].n}»</span>` : ''].join('');
function featClaim(id) {
  const F = FEATS.find(x => x.id === id); if (!F || !featReady(F)) return;
  const s = featStep(F), lines = giveRewards(featRw(F, s)), c = F.cos[s];
  if (c) { if (c.title) { S.unlocks.title[c.title] = 1; lines.push(`Титул «${TITLES[c.title]}»`); } if (c.ava) { S.unlocks.ava['emb:' + c.ava] = 1; lines.push(`Аватар «${EMBLEMS[c.ava].n}»`); } if (c.frame) { S.unlocks.frame[c.frame] = 1; lines.push(`Рамка «${FRAMES[c.frame].n}»`); } }
  S.feats[F.id] = s + 1; persist(); render();
  rewardWin(`Подвиг: ${F.n} ${ROMAN[s + 1]}`, lines);
}
function renderFeats() {
  const fv = v => v >= 1e6 ? (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace('.0', '') + ' млн' : v >= 1e4 ? Math.round(v / 1e3) + ' тыс.' : fmt(v);
  const cards = FEATS.map(F => {
    const s = featStep(F), v = METRIC[F.m](), max = F.at.length, done = s >= max, goal = done ? F.at[max - 1] : F.at[s], prev = s ? F.at[s - 1] : 0;
    const pct = done ? 100 : Math.max(0, Math.min(100, (v - prev) / (goal - prev) * 100)), ready = featReady(F);
    return `<div class="feat ${done ? 'done' : ''} ${ready ? 'ready' : ''}">
      <div class="fth"><div><h4>${F.n}</h4><span>${F.d}</span></div><span class="frank">${done ? 'Завершён' : `Ступень ${ROMAN[s + 1]} из ${max}`}</span></div>
      <div class="fpips">${F.at.map((a, k) => `<span class="fpip ${k < s ? 'got' : k === s && ready ? 'rdy' : ''}" title="${ROMAN[k + 1]}: ${fv(a)}${F.cos[k] ? ' · особая награда' : ''}">${ROMAN[k + 1]}${F.cos[k] ? '<i></i>' : ''}</span>`).join('')}</div>
      <div class="fbar"><i style="width:${pct}%"></i><b class="mono">${fv(Math.min(v, goal))} / ${fv(goal)}</b></div>
      ${done ? '<p class="sub" style="margin:0">Все ступени получены.</p>' : `<div class="frw"><span class="lbl">Награда ${ROMAN[s + 1]}</span>${rewardsHtml(featRw(F, s))}${cosHtml(F.cos[s])}</div>
      <div class="acts"><button class="btn ${ready ? 'go' : ''}" data-featclaim="${F.id}" ${ready ? '' : 'disabled'}>${ready ? 'Забрать' : 'В процессе'}</button></div>`}
    </div>`; }).join('');
  $('#view').innerHTML = `<h2 class="lshide">Подвиги</h2>
    <div class="fhead"><div><b class="mono">${featRank()} / ${featMax}</b><span>ступеней подвигов</span></div><div class="fbar big"><i style="width:${featRank() / featMax * 100}%"></i></div><p class="sub" style="margin:0">Каждый подвиг — лестница из ступеней. Чем выше, тем ценнее награда: Печати Ландсраада, Вода жизни, ридулиан, а на вершинах — титулы, аватары и рамки профиля (◆ на ступени).</p></div>
    <div class="feats">${cards}</div>`;
}


export { FEATS, FEAT_RW, featRw, featStep, featReady, featsReady, featRank, featMax, cosHtml, featClaim, renderFeats };
