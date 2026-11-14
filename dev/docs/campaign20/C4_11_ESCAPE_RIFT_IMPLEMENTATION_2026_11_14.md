# Campaign 2.0 · C4.11 «Бегство» — «Разлом Бури», этап B

Дата: 14.11.2026. Issue #72, Draft PR #74.

## Approval

14.11.2026: the owner approved the artistic concept «Разлом Бури» and authorized a separate feature branch, Draft PR and implementation.

**14.11.2026 — artistic acceptance of finished stage B is confirmed by the owner: «Все ок».** The acceptance refers to the actual final MED 844×390 and LOW 667×375 WebGL frames, not the concept mockups. This does **not** authorize merge, changing v113 or publication.

## Source of truth

The chapter is CAMP_DEF.L.chapters[2], Light III, global IDs 20–29, recommended levels 13–20. All ten original titles, mission story strings, STORY dialogue, 210 NODES, enemies, boss, rewards, game economy, saves and battle logic remain intact.

Three acts:
1. 20–22: night pursuit, storm, ecologist station.
2. 23–26: canyon ambush, singing sand, spice vision, Kynes' diversion.
3. 27–29: storm shelter, exposed tracks, encirclement and Fremen rescue.

| ID | Original title | Landmark | X/Z |
|---:|---|---|---|
|20|Орнитоптер в ночи|Silhouette of escaping ornithopter|-56 / -10|
|21|Буря над стеной|Storm spilling over the cliff|-44 / -1|
|22|Станция эколога|Kynes' concealed environmental station|-33 / -8|
|23|Ущелье|Tight asymmetric canyon ambush|-21 / 3|
|24|Песок поёт|Subsurface worm waves; no giant visible worm|-9 / 8|
|25|Видение|Subtle spice-vision ring|3 / 2|
|26|Последний приют Кайнса|Remote shelter and decoy trail|15 / 6|
|27|Палатка в песке|Small stilltent behind a wind crest|27 / -5|
|28|Следы на дюнах|Exposed footprints and distant patrol|40 / 0|
|29|Люди песка|Sardaukar encirclement, Stilgar above on cliff|53 / 8|

The final battle keeps bashar, legion, legion, trooper. Fremen are openly visible only at the last marker, and the next chapter retains the depiction of Sietch Tabr proper.

## Technical implementation

- campaign-map-presets.js: new L:2 world-space map and dedicated camera bounds.
- campaign-escape.js: static procedural terrain, cliffs, 10 landmarks and final silhouettes. Detail flag reduces MED-to-LOW geometry.
- scenes/campaign-map.js: theme integration in shared EngineHost/GameScene, existing touch controls unchanged, focused 2–4 consecutive projected 50/60px markers.
- ui/views/campaign20.js, styles/campaign20.css: existing clickable 2D fallback with correct per-chapter coordinates, theme and safe-area presentation.
- tests/smoke/campaign20.mjs: all 20–29 node focuses, real Chromium/SwiftShader screenshots for MED 844×390 and LOW 667×375, overlap, numbering, canvas and navigation checks.

## Validation and release gate

**Stage B final code HEAD:** `b401668293ff63c1802deb9922c1201169cd2cfd`. [Required PR CI #43599896818](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43599896818) **SUCCESS**, including real Campaign WebGL MED/LOW, Golden, desktop/phone lifecycle, E3 UI and camp/battle budgets; Pages publish **SKIPPED**. [Final genuine WebGL artifact](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43599896818/artifacts/14116076586) captured six milestones on both profiles and was accepted by the owner («Все ок»).

Artistic acceptance and CI gates are complete for the tested code commit. Physical iPhone Safari FPS/temperature/battery have not been measured. The existing MED/LOW budget gates passed; a separate numerical baseline comparison or real Safari thermal measurement is not claimed. Any measured regression exceeding 10% requires explicit owner approval. Chromium is not a measurement of physical Safari FPS, thermals or battery. No additional Engine, render loop, 3D animation, controls or new navigation buttons.

**Next gate:** obtain separate authorization for merge and, independently, for version bump / publication. Keep PR #74 a draft meanwhile. DO NOT merge, bump v113 or publish GitHub Pages on the basis of artistic acceptance alone.
