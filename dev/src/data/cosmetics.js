// data/cosmetics.js — строки 4826–4855 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../logic/stats.js'; // порядок исполнения
import { prog } from '../core/util.js';
import { S } from '../core/state.js';
import { WORM_IMG } from '../assets/models.js';
import { CH } from './chars.js';

// ===================== cosmetics =====================
const EMBLEMS = {
  hawk: { n: 'Ястреб Атрейдесов', bg: ['#2f6a48', '#0f2a1c'], svg: '<path d="M20 9c3 4 9 5 13 3-2 5-7 7-10 7l3 9-6-4-6 4 3-9c-3 0-8-2-10-7 4 2 10 1 13-3z" fill="#e8f2d8"/>' },
  baron: { n: 'Грифон Харконненов', bg: ['#3a4a7a', '#12182c'], svg: '<path d="M20 7l9 6-3 4 5 6-8-2-3 11-3-11-8 2 5-6-3-4z" fill="#d8dcf0"/>' },
  eye: { n: 'Око хроник', bg: ['#1f7a6e', '#0a2a26'], svg: '<path d="M6 20s5-8 14-8 14 8 14 8-5 8-14 8S6 20 6 20z" fill="#cff6ec"/><circle cx="20" cy="20" r="5" fill="#0a2a26"/><circle cx="20" cy="20" r="2" fill="#7ae8d4"/>' },
  worm: { n: 'Пасть Шаи-Хулуда', bg: ['#c08a50', '#4a2a14'], svg: '<circle cx="20" cy="20" r="11" fill="#1a0a06"/>' + Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2; return `<path d="M${(20 + Math.cos(a) * 11).toFixed(1)} ${(20 + Math.sin(a) * 11).toFixed(1)}L${(20 + Math.cos(a + .2) * 6.5).toFixed(1)} ${(20 + Math.sin(a + .2) * 6.5).toFixed(1)}L${(20 + Math.cos(a + .4) * 11).toFixed(1)} ${(20 + Math.sin(a + .4) * 11).toFixed(1)}z" fill="#efe3c8"/>`; }).join('') + '<circle cx="20" cy="20" r="3" fill="#ff8a40"/>' },
  spice: { n: 'Глаза Ибада', bg: ['#1a3a8a', '#060c22'], svg: '<path d="M7 20s5-6 13-6 13 6 13 6-5 6-13 6S7 20 7 20z" fill="#2a5ad8"/><circle cx="20" cy="20" r="5" fill="#8fc8ff"/><circle cx="20" cy="20" r="2.2" fill="#061030"/>' },
  lion: { n: 'Золотой лев Коррино', bg: ['#b08a2a', '#3a2a08'], svg: Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return `<path d="M20 20L${(20 + Math.cos(a) * 15).toFixed(1)} ${(20 + Math.sin(a) * 15).toFixed(1)}" stroke="#ffe8a0" stroke-width="3" stroke-linecap="round"/>`; }).join('') + '<circle cx="20" cy="20" r="8" fill="#ffe08a"/><circle cx="17" cy="19" r="1.2" fill="#3a2a08"/><circle cx="23" cy="19" r="1.2" fill="#3a2a08"/><path d="M17 24q3 2 6 0" stroke="#3a2a08" stroke-width="1.2" fill="none"/>' },
  knife: { n: 'Крис-нож', bg: ['#6a5a48', '#1a140e'], svg: '<path d="M27 6c-2 8-6 14-12 20l-3-3c6-6 11-11 15-17z" fill="#f4ecd8"/><path d="M10 25l5 5-3 3-5-5z" fill="#8a6a3a"/>' },
  sietch: { n: 'Сиетч', bg: ['#8a5a2e', '#2a180a'], svg: '<path d="M4 30l9-14 6 7 5-9 12 16z" fill="#f0c890"/><path d="M17 30a3 4 0 016 0z" fill="#1a0f06"/>' },
};
if (typeof WORM_IMG !== 'undefined') { EMBLEMS.worm.svg = `<image href="${WORM_IMG.ava}" x="1" y="1" width="38" height="38"/>`; EMBLEMS.worm.bg = ['#a8784a', '#2a1608']; }
const FRAMES = {
  basic: { n: 'Песчаная' }, bronze: { n: 'Бронзовая' }, light: { n: 'Лазурная Атрейдесов' }, dark: { n: 'Багровая Харконненов' },
  chron: { n: 'Бирюзовая хроник' }, worm: { n: 'Зубы червя' }, gold: { n: 'Золото Падишаха' }, prophet: { n: 'Пророческое сияние' }, house: { n: 'Великий Дом' },
};
const TITLES = {
  novice: 'Странник пустыни', atr: 'Друг Дома Атрейдес', hark: 'Наследник Барона', chron: 'Хранитель хроник', worm: 'Укротитель Шаи-Хулуда', rider: 'Наездник червя',
  blade: 'Мастер клинка', kh: 'Квисац Хадерах', house: 'Великий Дом', trial: 'Испытанный пустыней', prophet: 'Голос пророчества', judge: 'Судья Перехода', mentat: 'Великий ментат', loyal: 'Верный Дому',
  raid3: 'Победитель Старика пустыни', legend: 'Свидетель легенды', jihad: 'Покоритель Джихада', thinker: 'Повелитель машин', ix: 'Хранитель архива Икса',
};
const FREE = { title: ['novice'], frame: ['basic', 'bronze'], ava: [] };
const unlocked = (kind, id) => FREE[kind].includes(id) || !!S.unlocks[kind][id] || (kind === 'ava' && id.startsWith('hero:') && CH[id.slice(5)] && prog(id.slice(5)).stars > 0);


export { EMBLEMS, FRAMES, TITLES, FREE, unlocked };
