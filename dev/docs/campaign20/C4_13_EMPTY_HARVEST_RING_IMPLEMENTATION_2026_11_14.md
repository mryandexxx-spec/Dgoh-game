# C4.13 «Годы в пустыне» — «Кольцо пустой жатвы»
Дата: 14.11.2026 · Stage B · owner approved concept, awaiting real WebGL artistic acceptance.

## Decisions and status
- Canonical source: Issue #80, `C4_13_AFTER_V115_HANDOFF_2026_11_14.md`, `CAMP_DEF.L.chapters[4]` and `STORY[5..8]`.
- Owner approved concept **«Кольцо пустой жатвы»** (stage A) in chat, 14.11.2026.
- Implementation: `feat/c4-13-empty-harvest-ring`, Draft PR #81.
- **Do not merge or publish. No version bump.** Require separate WebGL art review and explicit permission for merge and later release.
- Preserve original IDs 40–49, 210 total IDs, enemy/boss tables, dialogue, rewards, economy and saves.

## Narrative and world-space geography
One connected industrial spice basin; not a repeated cave, canyon or worm resurrection scene.
The path bends around a central depleted extraction depression. Ground, old haul roads,
supply routes and low escarpments connect all ten physical locations without jumps.

| # | Global ID | Canonical title | Characteristic 3D landmark | X | Z |
|--:|--:|---|---|--:|--:|
| 1 | 40 | Возвращение Гурни | Smuggler shelter, Feyd's incoming cargo convoy | -58 | -10 |
| 2 | 41 | Сардаукары в песках | Regiment footprints and broken imperial lookout | -46 | -21 |
| 3 | 42 | Горящие комбайны | Three burned harvester hulls and ruined conveyors | -31 | -27 |
| 4 | 43 | Ветер Кориолиса | Leaning wind gauge against a distant storm wall | -16 | -25 |
| 5 | 44 | Ловушка Барона | Old ruin pillars and decoy rest-stop cargo | -2 | -16 |
| 6 | 45 | Тайник пряности | Buried guarded vault with sealed spice containers | 10 | -4 |
| 7 | 46 | Всадники червей | Static curved maker crest and Fremen rider silhouettes | 21 | 10 |
| 8 | 47 | Старый друг | Damaged Atreides cargo sign and smuggler reunion yard | 35 | 19 |
| 9 | 48 | Вода жизни | Sealed refuge light slit and Fremen defensive perimeter | 51 | 13 |
| 10 | 49 | Жатва Раббана | Final giant extractor, red Rabban banners and barricades | 64 | 2 |

Act I (40–42) «Разорвать поток»: Gur­ney's separate smuggler story, Sardaukar and burned extractors.
Act II (43–46) «Неделя вне неба»: static Coriolis front, ruin ambush, buried spice, maker riders.
Act III (47–49) «Человек, пророк и Зверь»: Gurney recognises Paul in **47** (not 40);
Life-water rite is inside the closed refuge while defenders hold the exterior in 48;
Rabban's industrial last stand in 49. Emperor/Arrakeen battles belong to later chapters.

World bounds: X [-70,78], Z [-38,36], node ground near Y=0.
Route positions are source-controlled in `campaign-map-presets.js`; the static geometry
uses the same coordinates. High background silhouettes are placed behind buttons.

## Palette and scene production
- Sand #d7b781; spice #b98548; rust #8c4d35; coal #31363b;
  storm #53636b; life-water #6b9b94.
- Single shared hemi + directional lighting. Baked ember and life-water material emissive
  colors, no dynamic shadow/RTT, moving fire, sand or full-screen storm particles.
- HIGH/MED keeps modest metal detail, LOW simplifies to strong static silhouettes.
- Static idle maintained by the existing GameScene mode contract; dispose/restore uses host.

## Camera / mobile UX
Initial target (-58,-10), alpha -1.28, beta .97, radius 30,
minRadius 25, maxRadius 60, turnLimit .24.
Boss focus uses beta 1.06 and radius 36, pending genuine phone WebGL proof.
Final target anchored to current boss (64,2), not a jump to Arrakeen.

MED 844x390 and LOW 667x375: 2–4 **local consecutive** mission numbers,
50px regular / 60px final boss, no marker overlap/clipping/no new navigation UI,
accepted v101 swipe/pinch/twist/recenter. UI fallback maps X/Z to the
whole rectangular 2D terrain and keeps interactive mission actions.

## Validation gates (stage B)
- `tests/smoke/campaign20.mjs` new checks for **all** 40–49, two phone viewports,
  screenshots at entry and selected story landmarks, no overlaps, bounds, culling,
  no DOM scrolling, one boss, same original IDs, and fallback coordinates.
- Required branch PR CI, Golden, PWA, shared EngineHost/GameScene lifecycle and
  applicable MED/LOW performance gates must complete successfully.
- Chromium/SwiftShader screenshots establish actual test WebGL output only.
  **Physical iPhone Safari FPS, heat and battery remain unmeasured.**
- Any >10% render cost growth needs owner approval or reduction.
- Owner must examine actual MED/LOW captures before any merge. PR stays Draft.
