// Campaign 2.0 · C2.1 — география независима от сохранений и графического движка.
// Позиции по x/z в локальном пространстве диорамы. Никакие индексы NODES не меняются.
// C2 Каладан; C4.1 Гиеди Прайм; C4.2 Арракин; C4.3 Заговор; остальные главы в legacy.
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
    camera: { target: [27, 0, 0], alpha: 1.13, beta: .96, radius: 27,
      minRadius: 23, maxRadius: 66, turnLimit: .3 },
    // Original Light-II m=0..9, sequential eastern desert approach -> city ->
    // palace. Mission IDs and campaign rewards are intentionally unchanged.
    nodes: Object.freeze([
      [38,12], [28,16], [27,-1], [14,-6], [8,-5],
      [0,-5], [-8,-5], [-16,-5], [-24,-5], [-32,-5],
    ]),
    landmarks: Object.freeze([
      {kind:'approach',x:34,z:14,size:11},
      {kind:'harvester',x:27,z:-1,size:10},
      {kind:'city-gate',x:10,z:-5,size:7},
      {kind:'banquet',x:5,z:-5,size:8},
      {kind:'palace',x:-24,z:-14,size:17},
      {kind:'duncan-gallery',x:-32,z:-5,size:9},
    ]),
  }),
  'D:1': Object.freeze({
    id: 'giedi-conspiracy', title: 'Заговор · Тихий трон',
    theme: 'conspiracy', bounds: [-48, 46, -24, 27],
    // Camera follows original D:1 mission 0..9. A local viewport shows only
    // consecutive nearby pins. Further sections are explored with v101 swipes.
    camera: { target: [-36, 0, 0], alpha: -1.42, beta: .96, radius: 27,
      minRadius: 23, maxRadius: 66, turnLimit: .3 },
    nodes: Object.freeze([
      [-39,-2],[-30,0],[-21,-2],[-12,1],[-3,0],
      [6,-1],[15,2],[24,0],[33,-1],[42,1],
    ]),
    landmarks: Object.freeze([
      {kind:'freight-yard',x:-37,z:12,size:20},
      {kind:'sardaukar-lifts',x:-3,z:15,size:23},
      {kind:'piter-desk',x:4,z:8,size:8},
      {kind:'guild-fleet',x:27,z:19,size:17},
      {kind:'imperial-gate',x:35,z:15,size:14},
    ]),
  }),
  'C:4': Object.freeze({
    id: 'chronicles-machine-crusade', title: 'Хроники · Конвой непокорённых',
    theme: 'machine-crusade', bounds: [-72, 72, -25, 32],
    // Three-act interplanetary chronicle, not literal planetary geography.
    camera: { target: [-62, 0, -2], alpha: -1.42, beta: .96,
      radius: 29, minRadius: 24, maxRadius: 60, turnLimit: .27 },
    nodes: Object.freeze([
      [-62,-2],[-49,1],[-36,-1],[-22,2],[-8,0],
      [6,2],[19,-2],[32,1],[45,-2],[59,1],
    ]),
    landmarks: Object.freeze([
      {kind:'vorian-ship-choice',x:-62,z:17,size:15},
      {kind:'arrakis-spice-basin',x:-49,z:16,size:18},
      {kind:'ginaz-duelling-ring',x:-36,z:16,size:15},
      {kind:'holtzman-shields',x:-22,z:17,size:17},
      {kind:'human-navigation-dock',x:-8,z:21,size:15},
      {kind:'omnius-quarantine',x:6,z:18,size:16},
      {kind:'arrakis-refuge',x:19,z:16,size:16},
      {kind:'broken-houses-pact',x:32,z:16,size:14},
      {kind:'void-frontier-fleet',x:45,z:19,size:18},
      {kind:'agamemnon-cymek-command',x:59,z:22,size:19},
    ]),
  }),
  'C:3': Object.freeze({
    id: 'chronicles-butlerian-jihad', title: 'Хроники · Шрам освобождения',
    theme: 'butlerian-jihad', bounds: [-63, 65, -25, 33],
    // The connected route is a material war atlas, not a literal single planet.
    camera: { target: [-55, 0, -4], alpha: -1.42, beta: .99,
      radius: 27, minRadius: 24, maxRadius: 66, turnLimit: .3 },
    nodes: Object.freeze([
      [-55,-4],[-44,-1],[-33,2],[-22,1],[-11,-2],
      [2,-3],[15,-1],[28,2],[41,0],[54,-3],
    ]),
    landmarks: Object.freeze([
      {kind:'omnius-city',x:-55,z:22,size:20},
      {kind:'league-outpost',x:-44,z:16,size:10},
      {kind:'earth-crater',x:-33,z:17,size:18},
      {kind:'cymek-arsenal',x:-22,z:18,size:18},
      {kind:'evacuation-port',x:-11,z:19,size:18},
      {kind:'jihad-revolt',x:2,z:15,size:18},
      {kind:'proto-mentats',x:15,z:19,size:16},
      {kind:'rossak-sisters',x:28,z:21,size:17},
      {kind:'serena-memorial',x:41,z:17,size:14},
      {kind:'omnius-legions',x:55,z:25,size:20},
    ]),
  }),
  'C:2': Object.freeze({
    id: 'chronicles-house-corrino', title: 'Хроники · Дом Коррино',
    theme: 'corrino-chronicles', bounds: [-57, 57, -27, 32],
    // Local camera frames neighboring numbered chapters only, not all ten.
    // World coordinates are stable; mission ID/progression is unchanged.
    camera: { target: [-48, 0, -2], alpha: -1.42, beta: .88,
      radius: 24, minRadius: 22, maxRadius: 66, turnLimit: .3 },
    nodes: Object.freeze([
      [-49,-2],[-39,-2],[-29,-2],[-19,-2],[-9,-2],
      [3,-2],[15,-2],[27,-2],[39,-2],[49,-2],
    ]),
    landmarks: Object.freeze([
      {kind:'elrood-memorial',x:-49,z:17,size:11},
      {kind:'coronation-palace',x:-32,z:18,size:22},
      {kind:'salusa',x:-8,z:15,size:23},
      {kind:'amal',x:12,z:11,size:16},
      {kind:'ix-occupation',x:23,z:23,size:20},
      {kind:'fenring-arcade',x:31,z:9,size:9},
      {kind:'lion-throne',x:45,z:27,size:22},
    ]),
  }),
  'C:1': Object.freeze({
    id: 'chronicles-house-harkonnen', title: 'Хроники · Дом Харконненов',
    theme: 'harkonnen-chronicles', bounds: [-50, 51, -24, 25],
    // Gurney's underworld journey: pit -> drain -> smugglers -> Harkonnen return
    // -> burnt settlement -> Atreides refuge -> Rabban's final blockade.
    // All labels are projected from these world coordinates, never a screen grid.
    camera: { target: [-41, 0, -1], alpha: -1.42, beta: .96,
      radius: 27, minRadius: 23, maxRadius: 66, turnLimit: .3 },
    nodes: Object.freeze([
      [-42,-2],[-33,-1],[-23,0],[-13,-1],[-3,0],
      [8,0],[18,-1],[29,0],[39,-1],[47,1],
    ]),
    landmarks: Object.freeze([
      {kind:'slave-pit',x:-39,z:11,size:19},
      {kind:'drain',x:-22,z:11,size:9},
      {kind:'smuggler-market',x:-10,z:11,size:16},
      {kind:'piter-watch',x:1,z:13,size:8},
      {kind:'slave-arena',x:12,z:11,size:13},
      {kind:'revenge-yard',x:20,z:12,size:9},
      {kind:'burnt-village',x:31,z:11,size:11},
      {kind:'atreides-refuge',x:40,z:13,size:10},
      {kind:'rabban-blockade',x:47,z:11,size:9},
    ]),
  }),
  'C:0': Object.freeze({
    id: 'chronicles-house-atreides', title: 'Хроники · Дом Атрейдесов',
    theme: 'atreides-chronicles', bounds: [-49, 51, -22, 25],
    // Five historical places, not a literal single-planet landscape.
    // Local camera shows successive world-space pins; continue with v101 swipe.
    camera: { target: [-40, 0, 0], alpha: -1.42, beta: .96,
      radius: 27, minRadius: 23, maxRadius: 66, turnLimit: .3 },
    nodes: Object.freeze([
      [-40,-1],[-30,-1],[-21,0],[-11,-1],[-2,0],
      [11,0],[23,-1],[33,0],[40,-1],[47,1],
    ]),
    landmarks: Object.freeze([
      {kind:'old-duke-ring',x:-40,z:10,size:13},
      {kind:'harkonnen-hunt',x:-24,z:12,size:19},
      {kind:'ix-towers',x:-3,z:11,size:17},
      {kind:'landsraad',x:12,z:13,size:15},
      {kind:'atreides-refuge',x:24,z:11,size:7},
      {kind:'ginaz-school',x:36,z:9,size:15},
      {kind:'reprisal',x:45,z:12,size:8},
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
