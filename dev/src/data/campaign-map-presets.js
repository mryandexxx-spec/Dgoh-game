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
  'L:2': Object.freeze({
    id: 'escape-storm-rift', title: 'Бегство · Разлом Бури',
    theme: 'escape-rift', bounds: [-66,66,-27,33],
    // The original Light-III IDs 20–29 follow one broken canyon-to-dunes route.
    // Initial focus uses the first open node; later nodes emerge by v101 pan.
    camera: { target: [-56,0,-10], alpha: -1.33, beta: .94, radius: 29,
      minRadius: 24, maxRadius: 64, turnLimit: .24 },
    nodes: Object.freeze([
      [-56,-10],[-44,-1],[-33,-8],[-21,3],[-9,8],
      [3,2],[15,6],[27,-5],[40,0],[53,8],
    ]),
    landmarks: Object.freeze([
      {kind:'night-ornithopter',x:-55,z:1,size:12},
      {kind:'storm-over-wall',x:-44,z:16,size:15},
      {kind:'ecologist-station',x:-33,z:-16,size:10},
      {kind:'canyon-ambush',x:-21,z:14,size:15},
      {kind:'singing-sand',x:-9,z:16,size:12},
      {kind:'spice-vision',x:3,z:13.5,size:9},
      {kind:'kynes-diversion',x:16,z:17,size:9},
      {kind:'stillsuit-tent',x:27,z:-13,size:9},
      {kind:'exposed-tracks',x:40,z:-7,size:12},
      {kind:'fremen-rescue',x:53,z:29,size:18},
    ]),
  }),
  'L:3': Object.freeze({
    id: 'sietch-tabr-heart-of-water', title: 'Сиетч Табр · Сердце воды',
    theme: 'sietch-water', bounds: [-65,80,-38,32],
    // Original Light-IV NODES 30–39; one continuous physical cave-to-desert.
    camera: { target: [-48,0,-19], alpha: -1.27, beta: .95, radius: 30,
      minRadius: 25, maxRadius: 60, turnLimit: .24 },
    nodes: Object.freeze([
      [-48,-19],[-41,-4],[-29,10],[-14,9],[-1,4],
      [12,-2],[25,-20],[39,-12],[52,2],[66,11],
    ]),
    landmarks: Object.freeze([
      {kind:'jamis-circle',x:-48,z:-19,size:9},
      {kind:'sacred-water-reservoir',x:-47,z:14,size:25},
      {kind:'chani-knife-gallery',x:-28,z:17,size:10},
      {kind:'dew-traps',x:-14,z:25,size:14},
      {kind:'raided-warehouse',x:0,z:16,size:12},
      {kind:'maker-thumper',x:12,z:2,size:11},
      {kind:'rabban-raids',x:25,z:-31,size:13},
      {kind:'false-trail',x:44,z:-25,size:12},
      {kind:'prophecy-gallery',x:52,z:18,size:14},
      {kind:'muaddib-terrace',x:70,z:24,size:21},
    ]),
  }),
  'L:5': Object.freeze({
    id: 'mirror-of-padishah', title: 'Прибытие императора · Зеркало Падишаха',
    theme: 'imperial-salt', bounds: [-74,78,-32,41],
    // Original Light VI global IDs 50–59: landing court, intrigue and the
    // intact Shield Wall's last military parade. The invasion is L:6 only.
    // The connected salt pan is traversed with approved v101 pan/pinch/twist.
    camera: { target: [-60,0,-15], alpha: -1.36, beta: .96,
      radius: 33, minRadius: 25, maxRadius: 66, turnLimit: .24 },
    nodes: Object.freeze([
      [-60,-15],[-47,-8],[-34,-1],[-20,-8],[-7,2],
      [7,-4],[20,7],[33,-1],[47,-10],[63,4],
    ]),
    landmarks: Object.freeze([
      {kind:'imperial-reception',x:-61,z:3,size:20},
      {kind:'grounded-padishah-frigate',x:-51,z:31,size:34},
      {kind:'shield-wall-field-tents',x:-34,z:24,size:24},
      {kind:'fenring-secret-watch',x:-19,z:26,size:14},
      {kind:'gom-jabbar-chamber',x:-7,z:25,size:12},
      {kind:'salusa-guard-watch',x:8,z:22,size:18},
      {kind:'mohiam-pavilion',x:20,z:23,size:12},
      {kind:'landsraad-assembly',x:34,z:20,size:20},
      {kind:'fremen-storm-outlook',x:47,z:19,size:15},
      {kind:'imperial-final-legion-parade',x:62,z:20,size:28},
    ]),
  }),
  'L:6': Object.freeze({
    id: 'shield-wall-scar', title: 'Битва за Арракин · Шрам Защитной стены',
    theme: 'shield-wall-scar', bounds: [-80,80,-41,47],
    // Light VII, original global IDs 60–69. One connected crossing of the
    // physically breached Shield Wall into Arrakeen and Shaddam's final camp.
    camera: { target: [-68,0,-13], alpha: -1.34, beta: .99,
      radius: 34, minRadius: 25, maxRadius: 66, turnLimit: .24 },
    nodes: Object.freeze([
      [-70,-15],[-54,-8],[-38,0],[-22,3],[-8,-2],
      [7,8],[21,-3],[35,6],[49,-3],[64,9],
    ]),
    landmarks: Object.freeze([
      {kind:'coriolis-desert-front',x:-70,z:13,size:24},
      {kind:'shield-wall-atomic-breach',x:-49,z:4,size:27},
      {kind:'colossal-maker-invasion',x:-32,z:22,size:52},
      {kind:'sardaukar-broken-legion',x:-22,z:24,size:20},
      {kind:'shaddam-battle-tent',x:-7,z:30,size:27},
      {kind:'harkonnen-reckoning',x:8,z:28,size:14},
      {kind:'fenring-shadow-gallery',x:21,z:25,size:10},
      {kind:'knife-duel-circle',x:35,z:27,size:17},
      {kind:'last-imperial-guard',x:51,z:27,size:15},
      {kind:'empty-desert-throne',x:64,z:28,size:16},
    ]),
  }),
  'L:4': Object.freeze({
    id: 'empty-harvest-ring', title: 'Годы в пустыне · Кольцо пустой жатвы',
    theme: 'empty-harvest', bounds: [-70,78,-38,36],
    // Original Light-V missions 40–49. Connected arc around a spent spice basin.
    // All mission markers stay on the playable ground; background machines
    // and the Coriolis front sit away from tap targets.
    camera: { target: [-58,0,-10], alpha: -1.28, beta: .97,
      radius: 32, minRadius: 25, maxRadius: 60, turnLimit: .24 },
    nodes: Object.freeze([
      [-58,-10],[-46,-21],[-31,-27],[-16,-25],[-2,-16],
      [10,-4],[21,10],[35,19],[51,13],[64,2],
    ]),
    landmarks: Object.freeze([
      {kind:'gurney-smuggler-convoy',x:-58,z:0,size:14},
      {kind:'sardaukar-footprints',x:-46,z:-8,size:12},
      {kind:'burning-harvesters',x:-31,z:-12,size:20},
      {kind:'coriolis-wind-front',x:-16,z:30,size:23},
      {kind:'baron-ruins-trap',x:-2,z:2,size:13},
      {kind:'buried-spice-vault',x:10,z:10,size:16},
      {kind:'maker-rider-crest',x:21,z:28,size:16},
      {kind:'gurney-reunion-yard',x:35,z:29,size:15},
      {kind:'water-of-life-outer-guard',x:51,z:25,size:16},
      {kind:'rabban-last-extraction',x:64,z:17,size:26},
    ]),
  }),
  'D:2': Object.freeze({
    id: 'night-long-knives', title: 'Ночь длинных ножей · Гаснущая корона',
    theme: 'fading-crown', bounds: [-75,75,-32,46],
    // Original Dark-III global IDs 90–99; chronological invasion, not L:6.
    // Camera pans between 2–4 nearby consecutive world-projected mission pins.
    camera: { target: [-60,0,-13], alpha: -1.30, beta: .98,
      radius: 32, minRadius: 24, maxRadius: 65, turnLimit: .24 },
    nodes: Object.freeze([
      [-60,-13],[-47,-5],[-34,5],[-20,15],[-5,22],
      [9,12],[23,1],[36,-8],[49,-17],[62,-5],
    ]),
    landmarks: Object.freeze([
      {kind:'shield-generators-dark',x:-60,z:-1,size:15},
      {kind:'opened-city-gate',x:-47,z:5,size:14},
      {kind:'atreides-barracks',x:-34,z:17,size:19},
      {kind:'duncan-gallery',x:-20,z:28,size:26},
      {kind:'ornithopter-hangar',x:-5,z:34,size:27},
      {kind:'mentat-archive',x:9,z:22,size:17},
      {kind:'burning-star-hall',x:23,z:12,size:19},
      {kind:'duke-detention-stair',x:36,z:13,size:15},
      {kind:'sand-postern',x:49,z:-8,size:15},
      {kind:'duke-last-order-bastion',x:62,z:12,size:18},
    ]),
  }),
  'D:3': Object.freeze({
    id: 'beast-iron-quota', title: 'Правление Зверя · Железная квота',
    theme: 'iron-quota', bounds: [-75,75,-36,48],
    // Original dark IV global missions 100–109; one physical extraction valley.
    // Ten connected world nodes, NEVER ten separate mission screens.
    camera: { target: [-61,0,-22], alpha: -1.31, beta: .98,
      radius: 32, minRadius: 25, maxRadius: 58, turnLimit: .22 },
    nodes: Object.freeze([
      [-61,-22],[-48,-12],[-34,2],[-19,17],[-4,26],
      [9,13],[22,-4],[36,-20],[49,-9],[63,8],
    ]),
    // Individual look targets are translated with native v101 pan; none are pages.
    focuses: Object.freeze([
      {target:[-61,3,-17],alpha:-1.30,beta:.97,radius:32},
      {target:[-48,3,-7],alpha:-1.28,beta:.97,radius:32},
      {target:[-35,4,6],alpha:-1.27,beta:.97,radius:34},
      {target:[-18,3,21],alpha:-1.40,beta:.99,radius:31},
      {target:[-5,3,29],alpha:-1.35,beta:.98,radius:32},
      {target:[9,3.5,17],alpha:-1.38,beta:1.01,radius:33,lowRadius:27},
      {target:[22,3,-1],alpha:-1.34,beta:.99,radius:32,lowRadius:27},
      {target:[36,3,-15],alpha:-1.26,beta:.97,radius:33},
      {target:[49,3.5,-4],alpha:-1.30,beta:1.01,radius:33},
      {target:[57,3.5,0],alpha:-1.40,beta:1.04,radius:46},
    ]),
    landmarks: Object.freeze([
      {kind:'governor-punishment-podium',x:-61,z:-10,size:16},
      {kind:'water-tax-cistern',x:-48,z:0,size:13},
      {kind:'colossal-spice-harvester',x:-34,z:14,size:23},
      {kind:'patrol-dune-ambush',x:-19,z:28,size:15},
      {kind:'kynes-ecology-sensors',x:-4,z:37,size:14},
      {kind:'burned-sietch-mouth',x:9,z:25,size:17},
      {kind:'vanished-spice-caravan',x:22,z:8,size:13},
      {kind:'fremen-resistance-stones',x:36,z:-8,size:16},
      {kind:'sealed-water-wells',x:49,z:4,size:17},
      {kind:'rabban-stilgar-confrontation',x:63,z:20,size:23},
    ]),
  }),
  'D:4': Object.freeze({
    id: 'harkonnen-heir-empty-crown', title: 'Наследник · Венец без трона',
    theme: 'heir-crown', bounds: [-69,52,-36,46],
    // Original canonical Dark-V IDs 110–119. A physical crescent-shaped
    // story atlas, not a literal interplanetary road or ten screen-based pages.
    camera: { target: [-55,0,-16], alpha: -1.34, beta: .99,
      radius: 33, minRadius: 25, maxRadius: 60, turnLimit: .25 },
    nodes: Object.freeze([
      [-55,-16],[-59,0],[-49,15],[-34,26],[-16,31],
      [1,28],[18,19],[31,6],[37,-11],[25,-25],
    ]),
    // Individual world-space art framing: alpha, beta and radius remain
    // within native v101 camera limits; lowRadius is optional per profile.
    focuses: Object.freeze([
      {target:[-57,3,-7], alpha:-1.10,beta:.86,radius:30},
      {target:[-59,3,6], alpha:-1.39,beta:.99,radius:32},
      {target:[-49,4,21],alpha:-1.43,beta:.97,radius:32},
      {target:[-34,3,31],alpha:-1.36,beta:1.02,radius:33},
      {target:[-16,4,36],alpha:-1.30,beta:.99,radius:32},
      {target:[1,3.5,33],alpha:-1.24,beta:.97,radius:32},
      {target:[18,3,23],alpha:-1.28,beta:1.04,radius:33},
      {target:[31,4,11],alpha:-1.35,beta:1.00,radius:33,lowRadius:26},
      {target:[31,3,-14],alpha:-1.40,beta:.92,radius:44},
      {target:[29,3,-22],alpha:-1.44,beta:1.05,radius:40,lowRadius:32},
    ]),
    landmarks: Object.freeze([
      {kind:'heir-open-arena',x:-55,z:-7,size:16},
      {kind:'heir-poisoned-blade',x:-59,z:7,size:11},
      {kind:'heir-baron-alcove',x:-49,z:22,size:13},
      {kind:'heir-spice-sleds',x:-34,z:33,size:14},
      {kind:'heir-mohiam-screens',x:-16,z:39,size:13},
      {kind:'heir-triangle-duel',x:1,z:35,size:13},
      {kind:'heir-desert-witch-fissure',x:18,z:25,size:12},
      {kind:'heir-wedding-thrones',x:31,z:12,size:13},
      {kind:'heir-caravan-trap',x:37,z:-4,size:14},
      {kind:'heir-gurney-broken-lyre',x:25,z:-19,size:16},
    ]),
  }),
  'D:5': Object.freeze({
    id: 'salusa-wind-erased-march', title: 'Легионы Салусы · Марш, стёртый ветром',
    theme: 'salusa-wind-march', bounds: [-74,72,-36,39],
    // Dark VI canonical global mission IDs 120–129. One continuous Arrakis
    // story atlas: imperial geometry breaks under wind, rock and Muad'Dib.
    camera: { target: [-60,0,-20], alpha: -1.32, beta: .98,
      radius: 32, minRadius: 25, maxRadius: 60, turnLimit: .28 },
    nodes: Object.freeze([
      [-60,-20],[-47,-17],[-34,-14],[-21,-11],[-8,-6],
      [5,0],[18,6],[31,10],[44,14],[58,18],
    ]),
    // Independent artistic framing per mission, translated by the native
    // v101 world camera during pan, pinch, twist and recenter.
    focuses: Object.freeze([
      {target:[-60,3.4,-12],alpha:-1.26,beta:.94,radius:31},
      {target:[-47,3.3,-9],alpha:-1.28,beta:.96,radius:31},
      {target:[-34,3.4,-7],alpha:-1.29,beta:.98,radius:32},
      {target:[-21,3.8,-4],alpha:-1.30,beta:1.00,radius:32},
      {target:[-8,4.0,3],alpha:-1.34,beta:1.03,radius:33},
      {target:[5,4.7,7],alpha:-1.41,beta:1.05,radius:34},
      {target:[18,3.8,13],alpha:-1.36,beta:.99,radius:33},
      {target:[31,4.3,19],alpha:-1.33,beta:1.01,radius:34},
      {target:[42,3.8,20],alpha:-1.38,beta:1.04,radius:35},
      {target:[53,4.8,26],alpha:-1.46,beta:1.06,radius:40},
    ]),
    landmarks: Object.freeze([
      {kind:'salusa-landing-wedges',x:-60,z:-11,size:15},
      {kind:'salusa-ordered-ranks',x:-47,z:-2,size:11},
      {kind:'salusa-broken-victory-line',x:-34,z:3,size:12},
      {kind:'salusa-silent-captive',x:-21,z:0,size:10},
      {kind:'salusa-coriolis-shears',x:-8,z:9,size:18},
      {kind:'salusa-death-gorge',x:5,z:13,size:18},
      {kind:'salusa-hidden-water',x:18,z:18,size:14},
      {kind:'salusa-worm-furrows',x:31,z:26,size:22},
      {kind:'salusa-retreat',x:44,z:23,size:16},
      {kind:'salusa-muad-dib',x:58,z:33,size:19},
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
  'C:6': Object.freeze({
    id: 'chronicles-sandworms-rebirth', title: 'Хроники · Пульс глубин',
    theme: 'sandworms-rebirth', bounds: [-62,58,-40,42],
    // Original global IDs 200–209, one S-shaped live desert basin.
    camera: { target: [-48,0,22], alpha: -1.22, beta: .91,
      radius: 28, minRadius: 24, maxRadius: 56, turnLimit: .24 },
    nodes: Object.freeze([
      [-48,22],[-35,30],[-19,26],[-7,13],[-9,-4],
      [3,-18],[20,-27],[36,-20],[43,-3],[38,15],
    ]),
    landmarks: Object.freeze([
      {kind:'machine-needles',x:-50,z:38,size:17},
      {kind:'ghost-ship-wake',x:-35,z:36,size:14},
      {kind:'tleilaxu-ghola-memory',x:-19,z:36,size:15},
      {kind:'glass-burn',x:-7,z:24,size:16},
      {kind:'sandtrout-nursery',x:-9,z:7,size:12},
      {kind:'sisterhood-sails',x:3,z:-9,size:14},
      {kind:'face-dancer-masks',x:20,z:-17,size:12},
      {kind:'human-last-circle',x:36,z:-8,size:16},
      {kind:'new-worm-ridges',x:43,z:6,size:17},
      {kind:'omnius-crest-and-worm',x:38,z:35,size:25},
    ]),
  }),
  'C:5': Object.freeze({
    id: 'chronicles-corrin-siege', title: 'Хроники · Разорванный венец',
    theme: 'corrin-siege', bounds: [-68,72,-30,42],
    // Single planetary siege, not interplanetary stages.
    camera: { target: [-56,0,-14], alpha: -1.31, beta: .89,
      radius: 29, minRadius: 25, maxRadius: 62, turnLimit: .24 },
    nodes: Object.freeze([
      [-56,-14],[-43,-7],[-30,-2],[-19,9],[-6,3],
      [7,-3],[21,3],[34,9],[45,11],[58,15],
    ]),
    landmarks: Object.freeze([
      {kind:'league-fleet',x:-56,z:9,size:16},
      {kind:'hostage-pylon',x:-43,z:11,size:13},
      {kind:'abulurd-fork',x:-30,z:11,size:16},
      {kind:'corrin-dropzone',x:-19,z:24,size:19},
      {kind:'erasmus-eye',x:-6,z:19,size:14},
      {kind:'last-cymeks',x:7,z:19,size:17},
      {kind:'omnius-grid-collapse',x:21,z:20,size:20},
      {kind:'hrethgir-anchor',x:34,z:25,size:18},
      {kind:'human-memorial',x:45,z:18,size:15},
      {kind:'omnius-heart',x:58,z:30,size:23},
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
