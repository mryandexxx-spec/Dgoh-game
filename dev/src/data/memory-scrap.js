// Пакет 12 — материалы Другой памяти и рецепты Утилизатора Икса.
const MEM_MATS = Object.freeze({
  ix_plate: { n: 'Плата Икса', family: 'artifact', label: 'Платы Икса' },
  holtz_conductor: { n: 'Проводник Холцмана', family: 'artifact', label: 'Проводники Холцмана' },
  tleilax_matrix: { n: 'Геноматрица Тлейлаксу', family: 'artifact', label: 'Геноматрицы Тлейлаксу' },
  null_cell: { n: 'Нуль-ячейка', family: 'artifact', label: 'Нуль-ячейки' },
  blood_echo: { n: 'Отголосок крови', family: 'signal', label: 'Отголоски крови' },
  legacy_thread: { n: 'Нить наследия', family: 'signal', label: 'Нити наследия' },
  age_resonance: { n: 'Резонанс веков', family: 'signal', label: 'Резонанс веков' },
});
const MEM_COSTS = [
  null,
  { ix_plate: 8, blood_echo: 6, sol: 30000 },
  { ix_plate: 12, blood_echo: 10, sol: 60000 },
  { ix_plate: 16, holtz_conductor: 6, blood_echo: 16, sol: 100000 },
  { holtz_conductor: 10, blood_echo: 12, legacy_thread: 8, sol: 160000 },
  { holtz_conductor: 14, tleilax_matrix: 5, legacy_thread: 12, sol: 240000 },
  { tleilax_matrix: 10, null_cell: 3, legacy_thread: 16, age_resonance: 5, sol: 360000 },
  { tleilax_matrix: 16, null_cell: 6, legacy_thread: 20, age_resonance: 10, sol: 500000 },
];
const SCRAP = Object.freeze({
  ix_plate: { threshold: 24, base: { 1: 2, 2: 3, 3: 4, 4: 6, 5: 8 } },
  holtz_conductor: { threshold: 48, base: { 6: 5, 7: 8, 8: 12, 9: 16 } },
  tleilax_matrix: { threshold: 72, base: { 10: 8, 11: 12, 12: 18 } },
  null_cell: { threshold: 120, base: { 12: 6, 13: 24 } },
});
const SCRAP_MULT = Object.freeze({
  mask: 1, boots: .85, belt: .9, knife: 1, cloak: .8, ring: 1.15,
  vial: 1.25, scope: 1.15, plate: .9, pad: 1.25, emitter: 1.3, compass: 1.05,
});
const SIGNAL_NODES = Object.freeze({
  // Узлы доступны по мере прохождения существующей кампании.
  blood_echo: { camps: ['L', 'D'], minLvl: 30, chance: .35 },
  legacy_thread: { camps: ['C'], minChapter: 4, maxChapter: 5, chance: .28 },
  age_resonance: { camps: ['C'], minChapter: 6, chance: .18 },
});
export { MEM_MATS, MEM_COSTS, SCRAP, SCRAP_MULT, SIGNAL_NODES };
