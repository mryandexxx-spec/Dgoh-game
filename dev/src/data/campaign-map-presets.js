// Campaign 2.0 · C2.1 — география независима от сохранений и графического движка.
// Позиции по x/z в локальном пространстве диорамы. Никакие индексы NODES не меняются.
// Прототип: светлая глава I (Каладан), позже — отдельные пресеты для остальных глав.
export const CAMPAIGN_MAPS = Object.freeze({
  'L:0': Object.freeze({
    id: 'caladan-atreides', title: 'Каладан · Замок Атрейдесов',
    theme: 'caladan', bounds: [-28, 28, -18, 18],
    camera: { target: [-2, 0, 0], alpha: -1.13, beta: 0.94, radius: 30,
      minRadius: 22, maxRadius: 65, turnLimit: 0.3 },
    // Последовательность строго соответствует полю m=0..9.
    nodes: Object.freeze([
      [-22, -11], [-16, -7], [-11, -4], [-6, -8], [-1, -4],
      [4, 0], [10, 4], [15, 1], [19, 7], [24, 12],
    ]),
    landmarks: Object.freeze([
      { kind: 'castle', x: -12, z: -10, size: 7 },
      { kind: 'harbor', x: 12, z: 3, size: 5 },
      { kind: 'spaceport', x: 23, z: 11, size: 4 },
    ]),
  }),
});
export const campaignMapKey = (side, chapter) => side + ':' + chapter;
export const campaignMapPreset = (side, chapter) => CAMPAIGN_MAPS[campaignMapKey(side, chapter)] || null;
