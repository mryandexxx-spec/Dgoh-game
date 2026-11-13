// Campaign 2.0 · C2.1 — география независима от сохранений и графического движка.
// Позиции по x/z в локальном пространстве диорамы. Никакие индексы NODES не меняются.
// C2 Каладан; C4.1 Гиеди Прайм; C4.2 Арракин; остальные главы в legacy.
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
  'L:1': Object.freeze({
    id: 'arrakeen-atreides', title: 'Арракин · Дворец и пустыня',
    theme: 'arrakeen', bounds: [-36, 42, -25, 24],
    // SWGOH-style local sequence: start on the current mission, keep 2-4
    // consecutive neighboring pins legible, explore the rest by accepted swipe.
    camera: { target: [27, 0, 0], alpha: 1.13, beta: .96, radius: 31,
      minRadius: 23, maxRadius: 66, turnLimit: .3 },
    // Original Light-II m=0..9, sequential eastern desert approach -> city ->
    // palace. Mission IDs and campaign rewards are intentionally unchanged.
    nodes: Object.freeze([
      [38,12], [33,5], [27,-1], [19,-5], [8,-5],
      [-2,3], [-8,-4], [-13,-10], [-17,-1], [-19,7],
    ]),
    landmarks: Object.freeze([
      {kind:'approach',x:36,z:10,size:9},
      {kind:'harvester',x:27,z:-1,size:10},
      {kind:'city-gate',x:10,z:-5,size:7},
      {kind:'banquet',x:5,z:-5,size:8},
      {kind:'palace',x:-24,z:-14,size:17},
      {kind:'duncan-gallery',x:-19,z:7,size:9},
    ]),
  }),
  'D:0': Object.freeze({
    id: 'giedi-prime-harkonnen', title: 'Гиеди Прайм · Чёрный город',
    theme: 'giedi', bounds: [-30, 30, -22, 23],
    camera: { target: [-3, 0, 0], alpha: -1.13, beta: .94, radius: 32,
      minRadius: 22, maxRadius: 65, turnLimit: .3 },
    // D:0 is exactly the ten original Dark-I NODES, not new campaign data.
    // From industrial outskirts via mines and Feyd arena to the shipyard escape.
    nodes: Object.freeze([
      [-20,-10],[-13,-7],[-18,-2],[-12,5],[-5,2],
      [4,2],[11,10],[16,3],[22,9],[25,15],
    ]),
    landmarks: Object.freeze([
      {kind:'citadel',x:-4,z:-22,size:17},
      {kind:'pits',x:-20,z:-9,size:17},
      {kind:'arena',x:4,z:2,size:15},
      {kind:'shipyard',x:20,z:12,size:22},
    ]),
  }),
});
export const campaignMapKey = (side, chapter) => side + ':' + chapter;
export const campaignMapPreset = (side, chapter) => CAMPAIGN_MAPS[campaignMapKey(side, chapter)] || null;
