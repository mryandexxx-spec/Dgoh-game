// data/conquest-data.js — строки 5255–5393 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { cq } from '../logic/conquest.js';
import '../ui/overlays/celebrate.js'; // порядок исполнения
import { NOTES, S } from '../core/state.js';
import { refillPrice, todayKey } from '../logic/economy.js';
import { MENTAT } from './chars.js';
import { FACTIONS } from './fx.js';

// ===================== Джихад (внутр. id 'conq'): weekly event, 5 sectors with branching maps =====================
const CQ_DIFF = {
  easy:   { n: 'Лёгкий',     acc: 15, lvl: [20, 45], relic: [0, 0], pow: [1, 1.1],    mult: 1, er: [4, 5, 6, 7, 8] },
  normal: { n: 'Нормальный', acc: 35, lvl: [40, 70], relic: [0, 3], pow: [1.05, 1.2], mult: 2, er: [10, 12, 14, 16, 18] },
  hard:   { n: 'Сложный',    acc: 55, lvl: [65, 85], relic: [2, 7], pow: [1.15, 1.4], mult: 3, er: [20, 24, 28, 32, 36] },
};
const CQ_SECT = [
  { n: 'Гиеди Прайм', syn: 'Харконнены: Барон, Фейд-Раута, Раббан, Питер де Фриз', scene: 'giedi', pool: ['trooper', 'trooper', 'rabban', 'piter', 'feyd'], boss: ['baron', 'feyd', 'rabban', 'piter', 'trooper'], d: 'Крепость Харконненов: яды, численность и жестокость.' },
  { n: 'Салуса Секундус', syn: 'Коррино: Шаддам IV, граф Фенринг, Мохиам, башар', scene: 'saltflat', pool: ['legion', 'legion', 'bashar', 'fenring', 'mohiam'], boss: ['shaddam', 'fenring', 'mohiam', 'bashar', 'legion'], d: 'Мир-тюрьма сардаукаров: броня и дисциплина.' },
  { n: 'Глубокая пустыня', syn: 'Фримены: Лиет-Кайнс, Стилгар, Чани, федайкины', scene: 'desert', desert: true, pool: ['fedaykin', 'fedaykin', 'chani', 'stilgar', 'kynes'], boss: ['kynes', 'stilgar', 'chani', 'fedaykin', 'fedaykin'], d: 'Песок, червь и фримены, которые не признают чужаков.' },
  { n: 'Каладан', syn: 'Атрейдесы: герцог Лето, Дункан, Гурни, Суфир, Джессика', scene: 'caladan', pool: ['atrguard', 'atrguard', 'duncan', 'gurney', 'thufir'], boss: ['leto', 'duncan', 'gurney', 'thufir', 'jessica'], d: 'Родовой мир Атрейдесов защищают лучшие мечи Империума.' },
  { n: 'Коррин', syn: 'Мыслящие машины: Эразм, кимеки, роботы', scene: 'ruins', pool: ['robot', 'robot', 'cymek', 'robot', 'cymek'], boss: ['erasmus', 'cymek', 'cymek', 'robot', 'robot'], d: 'Мир машин. В его сердце ждёт Эразм — и проверяет, достойны ли вы.' },
];
// path: 4 fights → disk → fight → cache → 3 fights → disk → boss (9 battles per sector)
const CQ_LAYERS = [1, 2, 3, 2, 1, 2, 1, 3, 2, 2, 1, 1], CQ_LAST = CQ_LAYERS.length - 1;
const CQ_LTYPE = { 4: 'disk', 6: 'cache', 10: 'disk', [CQ_LAST]: 'boss' };
const CQ_CHESTS = [25, 60, 100, 150, 210, 280, 320];      // 7 сундуков; между соседними — 4 промежуточные награды
const CQ_ERI = [1, 3, 4, 5, 6];                          // сундуки с осколками Эразма (по CQ_DIFF.er)
const cqK = () => ({ easy: 1, normal: 1.25, hard: 1.5 })[cq().diff] || 1;
const pcs = x => Math.round(x * 100) + '%';
const cqHpUp = (u, x) => { u.maxHp = Math.round(u.maxHp * (1 + x)); u.hp = u.maxHp; };
// модификаторы боссов: синергия сектора + бонусные механики, сила растёт со сложностью (k = 1 / 1.25 / 1.5)
const CQ_BMOD = {
  b0a: { n: 'Мощь Барона', d: k => `Все враги +${pcs(.2 * k)} здоровья и +${pcs(.15 * k)} урона; лидер — ещё +${pcs(.3 * k)} здоровья.`, f: (us, k) => us.forEach((u, i) => { cqHpUp(u, .2 * k + (i === 0 ? .3 * k : 0)); u.dmgBonus += .15 * k; }) },
  b0b: { n: 'Жестокость Харконненов', d: k => `Враги контратакуют с шансом ${pcs(.25 * k)} и получают +${pcs(.15 * k)} шанса крита.`, f: (us, k) => us.forEach(u => { u.counterChance = Math.max(u.counterChance || 0, .25 * k); u.crit += .15 * k; }) },
  b1a: { n: 'Терсиус', d: k => `Враги +${pcs(.25 * k)} брони и начинают бой с Защитой↑ на 3 хода.`, f: (us, k) => us.forEach(u => { u.arm += .25 * k; u.fx.defUp = 3; }) },
  b1b: { n: 'Фанатизм сардаукаров', d: k => `Враги +${pcs(.4 * k)} стойкости и восстанавливают ${pcs(.04 * k)} здоровья в начале хода.`, f: (us, k) => us.forEach(u => { u.ten += .4 * k; u.regen = Math.max(u.regen || 0, .04 * k); }) },
  b2a: { n: 'Песчаный танец', d: k => `Враги +${pcs(.12 * k)} уклонения и +${pcs(.15 * k)} скорости.`, f: (us, k) => us.forEach(u => { u.eva += .12 * k; u.spd = Math.round(u.spd * (1 + .15 * k)); }) },
  b2b: { n: 'Засада фрименов', d: k => `Враги начинают бой с шкалой хода ${Math.min(95, Math.round(60 * k))}% и +${pcs(.15 * k)} здоровья.`, f: (us, k) => us.forEach(u => { u.tm = Math.min(950, Math.round(600 * k)); cqHpUp(u, .15 * k); }) },
  b3a: { n: 'Мастера клинка', d: k => `Враги +${pcs(.25 * k)} урона и контратакуют с шансом ${pcs(.3 * k)}.`, f: (us, k) => us.forEach(u => { u.dmgBonus += .25 * k; u.counterChance = Math.max(u.counterChance || 0, .3 * k); }) },
  b3b: { n: 'Щиты Хольцмана', d: k => `Щиты врагов +${pcs(.8 * k)}; враги без щита — +${pcs(.2 * k)} здоровья.`, f: (us, k) => us.forEach(u => { if (u.maxShield) { u.maxShield = Math.round(u.maxShield * (1 + .8 * k)); u.shield = u.maxShield; } else cqHpUp(u, .2 * k); }) },
  b4a: { n: 'Синхронизация машин', d: k => `Враги +${pcs(.2 * k)} скорости и +${pcs(.2 * k)} урона.`, f: (us, k) => us.forEach(u => { u.spd = Math.round(u.spd * (1 + .2 * k)); u.dmgBonus += .2 * k; }) },
  b4b: { n: 'Самовосстановление', d: k => `Враги +${pcs(.3 * k)} здоровья и восстанавливают ${pcs(.05 * k)} здоровья в начале хода.`, f: (us, k) => us.forEach(u => { cqHpUp(u, .3 * k); u.regen = Math.max(u.regen || 0, .05 * k); }) },
};
const cqMod = m => CQ_MODS[m] || CQ_BMOD[m];
const cqModD = m => { const x = cqMod(m); return typeof x.d === 'function' ? x.d(cqK()) : x.d; };
// ---- подвиги ----
const CQ_GF = [
  { id: 'win', n: 'Священная война', d: 'Одержите 30 побед в Джихаде.', need: 30, ev: 'win' },
  { id: 'flaw', n: 'Без потерь', d: 'Одержите 10 побед, не потеряв ни одного героя.', need: 10, ev: 'flaw' },
  { id: 'atr', n: 'Честь Атрейдесов', d: 'Одержите 5 побед отрядом только из Атрейдесов.', need: 5, ev: 'only:atr' },
  { id: 'hark', n: 'Кровь Харконненов', d: 'Одержите 5 побед отрядом только из Харконненов.', need: 5, ev: 'only:hark' },
  { id: 'frem', n: 'Федайкины', d: 'Одержите 5 побед отрядом только из фрименов.', need: 5, ev: 'only:frem' },
  { id: 'few', n: 'Малый Дом', d: 'Одержите 5 побед отрядом из 3 героев или меньше.', need: 5, ev: 'few' },
  { id: 'kill', n: 'Жатва', d: 'Повергните 150 врагов в боях Джихада.', need: 150, ev: 'kill' },
  { id: 'disk', n: 'Архив Икса', d: 'Соберите 8 дисков.', need: 8, ev: 'disk' },
  { id: 'boss', n: 'Падишах пустыни', d: 'Победите боссов всех пяти секторов.', need: 5, ev: 'boss' },
];
const CQ_LFAC = [['atr', 3], ['frem', 3], ['cor', 3], ['hark', 3], ['mach', 2]];   // союзники сектора: фракция, сколько героев
function cqFeats(s) {      // s = null → глобальные; иначе локальные + подвиги босса сектора s
  if (s === null) return CQ_GF.map(F => ({ ...F, key: 'g:' + F.id, sc: 'g', pts: 15 }));
  const lp = s < 3 ? 3 : 5, bp = s < 2 ? 1 : s < 4 ? 2 : 3, [fa, fn] = CQ_LFAC[s], FN = FACTIONS[fa].n;
  return [
    { id: 'win', n: 'Зачистка', d: 'Одержите 6 побед в этом секторе.', need: 6, ev: 'win', pts: lp },
    { id: 'flaw', n: 'Безупречно', d: 'Одержите 3 победы в секторе, не потеряв ни одного героя.', need: 3, ev: 'flaw', pts: lp },
    { id: 'fac', n: `Союзники: ${FN}`, d: `Одержите 3 победы в секторе, имея в отряде не меньше ${fn} героев фракции «${FN}».`, need: 3, ev: 'fac', pts: lp },
    { id: 'elite', n: 'Охота на элиту', d: 'Победите элиту сектора, не потеряв ни одного героя.', need: 1, ev: 'eliteflaw', pts: lp },
    { id: 'b1', n: 'Одним натиском', d: 'Победите босса сектора с первого захода — пока его отряд не изранен прошлыми боями.', need: 1, ev: 'boss1', pts: bp, boss: 1 },
    { id: 'b2', n: 'Ни шагу назад', d: 'Победите босса сектора, не потеряв ни одного героя.', need: 1, ev: 'bossflaw', pts: bp, boss: 1 },
  ].map(F => ({ ...F, key: s + ':' + F.id, sc: F.boss ? 'b' : 'l', s }));
}
const cqScore = () => { const C = cq(); return C.stars + (C.pts || 0); };
function cqBump(ev, s, n = 1, abs = false) {      // засчитывает событие подвигам: глобальным и локальным сектора s
  const C = cq(), out = [];
  for (const F of [...cqFeats(null), ...(s === null || s === undefined ? [] : cqFeats(s))]) {
    if (F.ev !== ev || C.fd[F.key]) continue;
    const was = C.fp[F.key] || 0, v = Math.min(F.need, abs ? Math.max(was, n) : was + n); if (v === was) continue;
    C.fp[F.key] = v;
    if (v >= F.need) { C.fd[F.key] = 1; C.pts = (C.pts || 0) + F.pts; }
    out.push({ F, v });
  }
  for (const x of out) NOTES.push({ id: Math.random().toString(36).slice(2), kind: 'cqf', F: x.F, v: x.v });
  return out;
}
const CQ_EN = { max: 100, sec: 180, fight: 10, unequip: 25 };          // Решимость: запас, +1 за N секунд, цена боя, снятие диска
const CQ_STA = { loss: 10, min: 1, regenMin: 6, dmg: .4, spd: .25 };   // выносливость: −10% за бой, нужно ≥10%, +1% за 6 мин; штраф при 0%: −40% урона, −25% скорости
const CQ_DMAX = 5;
const CQ_RF = { amt: 50 };       // пополнение Решимости: +50 за кристаллы, цена и лимит — как у Воды (refillPrice, REFILL_MAX)
const CQ_MED = 50;               // аптечка: +50% выносливости одному герою
const cqRfN = () => (S.cqRf && S.cqRf.d === todayKey()) ? S.cqRf.n : 0;
const cqRfCost = () => refillPrice(cqRfN());
const CQ_TROPHY = { fight: 10, elite: 20, boss: 40 };   // трофеи за первую победу на точке (× множитель сложности)
const CQ_MODS = {
  rage:   { n: 'Ярость', d: 'Враги наносят +30% урона.', f: us => us.forEach(u => u.dmgBonus += .3) },
  armor:  { n: 'Бронированные', d: 'Враги: +20% брони и Защита↑ на 2 хода в начале боя.', f: us => us.forEach(u => { u.arm += .2; u.fx.defUp = 2; }) },
  haste:  { n: 'Спешка', d: 'Враги: +20% скорости.', f: us => us.forEach(u => { u.spd = Math.round(u.spd * 1.2); }) },
  regen:  { n: 'Регенерация', d: 'Враги восстанавливают 6% здоровья в начале хода.', f: us => us.forEach(u => { u.regen = Math.max(u.regen || 0, .06); }) },
  ambush: { n: 'Засада', d: 'Враги начинают бой с почти полной шкалой хода.', f: us => us.forEach(u => { u.tm = 900; }) },
  will:   { n: 'Несгибаемость', d: 'Враги: +40% стойкости к отрицательным эффектам.', f: us => us.forEach(u => { u.ten += .4; }) },
  shield: { n: 'Щиты Хольцмана', d: 'Враги: щит +60%.', f: us => us.forEach(u => { if (u.maxShield) { u.maxShield = Math.round(u.maxShield * 1.6); u.shield = u.maxShield; } }) },
  crit:   { n: 'Точность', d: 'Враги: +25% шанса крита.', f: us => us.forEach(u => { u.crit += .25; }) },
};
// диски: r — редкость (c обычный: характеристики; r редкий: механика отряда; l легендарный: уникальное умение, меняющее бой)
// f(us, B) — применяется в cqApply к героям игрока; механики читает боевой движок через флаги u.cq* / B.cq*
const CQ_RAR = { c: { n: 'Обычный', col: '#c9bea8' }, r: { n: 'Редкий', col: '#62c972' }, l: { n: 'Легендарный', col: '#f39a32' } };
const CQ_LMAX = 2;               // легендарных дисков надето одновременно не больше
const CQ_DISKS = {
  dmg:    { r: 'c', n: 'Перегрузка', d: 'Ваши герои наносят +20% урона.', f: us => us.forEach(u => u.dmgBonus += .2) },
  hp:     { r: 'c', n: 'Наноброня', d: '+25% максимального здоровья.', f: us => us.forEach(u => { u.maxHp = Math.round(u.maxHp * 1.25); }) },
  spd:    { r: 'c', n: 'Ускоритель', d: '+12% скорости.', f: us => us.forEach(u => { u.spd = Math.round(u.spd * 1.12); }) },
  crit:   { r: 'c', n: 'Прицельный модуль', d: '+20% шанса крита.', f: us => us.forEach(u => { u.crit += .2; }) },
  shield: { r: 'c', n: 'Щит Mk II', d: '+40% щита; герои без щита получают +10% уклонения.', f: us => us.forEach(u => { if (u.maxShield) { u.maxShield = Math.round(u.maxShield * 1.4); u.shield = u.maxShield; } else u.eva += .1; }) },
  mind:   { r: 'c', n: 'Дисциплина ментата', d: '+25% стойкости и +15% эффективности.', f: us => us.forEach(u => { u.ten += .25; u.pot += .15; }) },
  arm:    { r: 'c', n: 'Закалённая пласталь', d: '+15% брони.', f: us => us.forEach(u => { u.arm += .15; }) },
  eva:    { r: 'c', n: 'Маскировочный плащ', d: '+10% уклонения.', f: us => us.forEach(u => { u.eva += .1; }) },
  tm:     { r: 'r', n: 'Стартовый импульс', d: 'Бой начинается с +40% шкалы хода у всех героев.', f: us => us.forEach(u => { u.tm = Math.min(999, u.tm + 400); }) },
  regen:  { r: 'r', n: 'Ремонтные нанороботы', d: 'Герои восстанавливают 5% здоровья в начале каждого хода.', f: us => us.forEach(u => { u.regen = Math.max(u.regen || 0, .05); }) },
  mach:   { r: 'r', n: 'Протокол Эразма', d: 'Мыслящие машины и Ментаты: +30% урона и здоровья.', f: us => us.forEach(u => { if (u.def.f.includes('mach') || MENTAT(u)) { u.dmgBonus += .3; u.maxHp = Math.round(u.maxHp * 1.3); } }) },
  stam:   { r: 'r', n: 'Кровь пряности', d: 'Участники боя теряют вдвое меньше выносливости (−5% вместо −10%).', f: () => {} },
  leech:  { r: 'r', n: 'Клинки тлейлаксу', d: 'Вампиризм: герои восстанавливают 15% нанесённого урона по здоровью.', f: us => us.forEach(u => { u.cqLeech = (u.cqLeech || 0) + .15; }) },
  poison: { r: 'r', n: 'Яд семуты', d: 'Базовые атаки с шансом 30% отравляют цель на 2 хода (−8% здоровья за ход).', f: us => us.forEach(u => { (u.cqOnHit ||= []).push(['poison', 2, .3]); }) },
  avenge: { r: 'r', n: 'Клятва сиетча', d: 'Когда герой падает, остальные получают Защиту↑ и Контратаку на 2 хода.', f: (us, B) => { B.cqAvenge = 1; } },
  spice:  { r: 'r', n: 'Пряный транс', d: 'Бой начинается с 50 пряности — особые умения доступны сразу.', f: (us, B) => { B.spice.A = Math.min(100, B.spice.A + 50); } },
  exec:   { r: 'r', n: 'Инстинкт охотника', d: '+35% урона по врагам, у которых меньше 50% здоровья.', f: us => us.forEach(u => { u.cqExec = (u.cqExec || 0) + .35; }) },
  counter:{ r: 'r', n: 'Школа Гинац', d: 'Герои контратакуют с шансом 30%.', f: us => us.forEach(u => { u.counterChance = Math.max(u.counterChance || 0, .3); }) },
  ghola:  { r: 'l', n: 'Аксолотлевый чан', d: 'Первый павший герой отряда возрождается с 50% здоровья и полной шкалой хода (раз за бой).', f: (us, B) => { B.cqGhola = 1; } },
  presc:  { r: 'l', n: 'Предзнание', d: 'Каждый герой раз за бой переживает смертельный удар с 1 ОЗ и получает Уклонение↑ на 2 хода.', f: us => us.forEach(u => { u.cqLast = 1; }) },
  chain:  { r: 'l', n: 'Танец смерти', d: 'Добив врага, герой сразу получает полную шкалу хода — и может ходить снова.', f: us => us.forEach(u => { u.cqChain = 1; }) },
  voice:  { r: 'l', n: 'Голос Бене Гессерит', d: 'Базовые атаки с шансом 25% накладывают Голос: враг тратит ход на удар по своему союзнику.', f: us => us.forEach(u => { (u.cqOnHit ||= []).push(['voiced', 1, .25]); }) },
  fury:   { r: 'l', n: 'Ярость джихада', d: 'Герои невосприимчивы к Страху; за каждого павшего союзника остальные наносят +35% урона.', f: us => us.forEach(u => { u.fearImmune = true; u.cqFury = (u.cqFury || 0) + .35; }) },
};
const cqRar = k => CQ_RAR[(CQ_DISKS[k] || {}).r || 'c'];
// карточка диска для выбора/магазина: иконка, редкость, название, описание + произвольная кнопка
const CQ_ICON = {
  fight: '<path d="M5 19L17 7M17 7V4h3v3zM19 19L7 7M7 7V4H4v3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  elite: '<path d="M12 3c-4.4 0-7 2.8-7 6.6 0 2.4 1.2 4 2.6 4.9V18h8.8v-3.5c1.4-.9 2.6-2.5 2.6-4.9C19 5.8 16.4 3 12 3z" fill="currentColor"/><circle cx="9.2" cy="10" r="1.7" fill="#140c08"/><circle cx="14.8" cy="10" r="1.7" fill="#140c08"/><path d="M10 18v2.5M12 18v2.5M14 18v2.5" stroke="currentColor" stroke-width="1.6"/>',
  boss: '<path d="M3 18h18l-2-10-4.5 4L12 5l-2.5 7L5 8z" fill="currentColor"/><rect x="3" y="19" width="18" height="2.4" rx="1" fill="currentColor"/>',
  cache: '<rect x="4" y="9" width="16" height="11" rx="1.5" fill="currentColor"/><path d="M4 9l2-4h12l2 4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 14.5h4M12 12.5v4" stroke="#140c08" stroke-width="2"/>',
  disk: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4" stroke="currentColor" stroke-width="1.6"/>',
  res: '<path d="M12 2c2.6 4.4 2.6 9.6 0 14.5C9.4 11.6 9.4 6.4 12 2z" fill="currentColor"/><path d="M8 16.5h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="10.6" y="17" width="2.8" height="5" rx="1" fill="currentColor"/>',
  sta: '<path d="M12 3s6 6.4 6 11a6 6 0 01-12 0c0-4.6 6-11 6-11z" fill="currentColor"/>',
  med: '<rect x="4" y="6" width="16" height="13" rx="2" fill="#c84a3a"/><path d="M12 9v7M8.5 12.5h7" stroke="#fff" stroke-width="2.4"/><rect x="9" y="3.5" width="6" height="3" rx="1" fill="none" stroke="#c84a3a" stroke-width="1.6"/>',
  rest: '<path d="M3 20h18M5 20l7-14 7 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 20l2-5 2 5" fill="currentColor"/>',
};


export { CQ_DIFF, CQ_SECT, CQ_LAYERS, CQ_LAST, CQ_LTYPE, CQ_CHESTS, CQ_ERI, cqK, pcs, cqHpUp, CQ_BMOD, cqMod, cqModD, CQ_GF, CQ_LFAC, cqFeats, cqScore, cqBump, CQ_EN, CQ_STA, CQ_DMAX, CQ_RF, CQ_MED, cqRfN, cqRfCost, CQ_TROPHY, CQ_MODS, CQ_RAR, CQ_LMAX, CQ_DISKS, cqRar, CQ_ICON };
