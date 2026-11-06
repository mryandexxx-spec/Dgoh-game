// data/boss.js — строки 214–227 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../logic/battle/skills.js'; // порядок исполнения
import { CH } from './chars.js';

const WORM = { id: 'worm', n: 'Шаи-Хулуд', sn: 'Шаи-Хулуд', g: 'ШХ', f: ['worm'], role: 'tank', boss: true, immune: ['poison', 'fear', 'voiced'],
  basic: { n: 'Удар пасти', tgt: 'enemy', dt: 'blade', m: 1.3, d: '' }, special: { n: '—', tgt: 'self', d: '' } };
CH.worm = WORM;
const PHASES = { 1: 'На песке', 2: 'Песчаная буря', 3: 'Пасть', 4: 'Ярость Шаи-Хулуда' };
const MOVES = { bite: 'Удар пасти', wave: 'Песчаный вал', storm: 'Песчаная буря', devour: 'Поглощение', rage: 'Ярость' };
const RAID_TIERS = [
  { n: 'Т1 · Пустыня Фунеральной равнины', hp: 150000, dmg: 380, spd: 95 },
  { n: 'Т2 · Великая плоская', hp: 450000, dmg: 650, spd: 105 },
  { n: 'Т3 · Старик пустыни', hp: 1400000, dmg: 1000, spd: 115 },
];
const phaseOf = f => f > .75 ? 1 : f > .5 ? 2 : f > .25 ? 3 : 4;

const STAR_MULT = [0, 1, 1.12, 1.25, 1.4, 1.6, 1.8, 2.05];


export { WORM, PHASES, MOVES, RAID_TIERS, phaseOf, STAR_MULT };
