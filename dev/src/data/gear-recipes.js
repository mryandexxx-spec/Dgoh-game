import './boss.js'; // порядок исполнения
// Пакет 7 (E3): декларативные рецепты. Без DOM и зависимостей от логики.
// Два уровня: готовый предмет -> узлы сборки -> фрагменты.
// До VI уровня применяется прямой рецепт; VI–XIII — по две детали.
// Ключи узлов отделены от ключей фрагментов существующего инвентаря.
const PARTS = Object.freeze({
  frame: 'Каркас',
  core: 'Сердечник',
  fitting: 'Крепление',
  lining: 'Подкладка',
  lens: 'Линза',
  seal: 'Печать',
});
const PARTS_BY_KIND = Object.freeze({
  mask: ['lining', 'core'],
  boots: ['frame', 'lining'],
  belt: ['frame', 'fitting'],
  knife: ['core', 'fitting'],
  cloak: ['lining', 'seal'],
  ring: ['core', 'seal'],
  vial: ['core', 'seal'],
  scope: ['lens', 'fitting'],
  plate: ['frame', 'lining'],
  pad: ['core', 'lens'],
  emitter: ['core', 'frame'],
  compass: ['lens', 'frame'],
});
const partId = (item, part) => 'part:' + item.id + ':' + part;
// GE1: every assembled part farms its own fragment key. Old itemId fragments remain legacy-only.
const partFragId = (item, part) => 'frag:' + item.id + ':' + part;
function gearRecipe(item, fragmentsNeeded, craftCost) {
  if (!item || !Number.isInteger(item.t) || item.t < 1 || item.t > 13) throw new Error('Invalid equipment item');
  const total = fragmentsNeeded[item.t];
  const cost = craftCost(item.t);
  if (item.t <= 5) return {
    id: item.id, kind: 'item', name: item.n, depth: 0,
    materials: [{ id: item.id, kind: 'fragment', count: total }],
    cost,
  };
  const names = PARTS_BY_KIND[item.kind];
  if (!names) throw new Error('Unknown equipment kind: ' + item.kind);
  const low = Math.ceil(total / 2), high = total - low;
  const parts = names.map((name, index) => ({
    id: partId(item, name), kind: 'part', name: PARTS[name],
    materials: [{ id: partFragId(item, name), kind: 'fragment', count: index ? high : low }],
    cost: { sol: Math.floor(cost.sol * .2), pl: index ? 0 : Math.floor(cost.pl / 2) },
  }));
  return {
    id: item.id, kind: 'item', name: item.n, depth: 1,
    materials: parts.map(part => ({ id: part.id, kind: 'part', count: 1 })),
    parts,
    cost: { sol: cost.sol - parts.reduce((n, p) => n + p.cost.sol, 0),
      pl: cost.pl - parts.reduce((n, p) => n + p.cost.pl, 0) },
  };
}
export { PARTS, PARTS_BY_KIND, partId, partFragId, gearRecipe };
