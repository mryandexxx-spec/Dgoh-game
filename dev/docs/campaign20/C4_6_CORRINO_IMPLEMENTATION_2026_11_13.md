# Campaign 2.0 · C4.6 «Дом Коррино» — implementation handoff (Draft)

**Date:** 2026-11-13. **Status:** artistic concept AND real WebGL MED/LOW implementation ACCEPTED by owner on 2026-11-13 («Согласовано»); Draft PR #60 awaits separate merge/publish authorization.

## Artistic decision
**«Цена императорской короны» — «Имперский путь».** A contiguous stylized imperial processional route joins different historical worlds without pretending they form one literal city:
1. Kaitain mourning memorial and coronation (missions 1–2).
2. Salusa Secundus military parade (mission 3).
3. Project Amal and industrial Ix, Fenring's secret passage, imperial marriage and war (missions 4–8).
4. Pact with Harkonnens and colossal Lion Throne back on Kaitain (missions 9–10).

Monumental silhouette (Kaitain palace, Salusa fortress, Ix arcologies, Golden Lion Throne), slate / basalt and cold metal with restrained ceremonial gold; zero heavy particles or dynamic shadows. No C4.4 pedestals, no Giedi industrial duplication. MED and LOW must preserve route readability over one-screen completeness.

## Technical contract
- New immutable preset `C:2` in `dev/src/data/campaign-map-presets.js`, 10 world-space coordinates in original mission order, existing 50/60 px markers.
- Babylon builder `dev/src/render3d/scenes/campaign-corrino-chronicles.js`, mounted by the unchanged EngineHost/GameScene map scene.
- CSS 2D fallback and bounds-normalized pins for C:2 only.
- No modified 210 campaign missions/IDs, progression, enemies, rewards, currency, save schema, gesture math, other chapter compositions, or renderer lifecycle.
- Camera opens on current mission; selecting mission 1 frames Kaitain's entrance. Future mission coordinates follow the same x/z axis and can be explored by accepted v101 swipe/pinch/recenter.
- Desktop chrome, mobile 844x390 MED and 667x375 LOW must be assessed from real CI screenshots rather than mockups.

## Verification / release gate
- `dev/tests/smoke/campaign20.mjs`: ten original nodes/unique IDs, exactly one boss, no overlap or out-of-frame projected labels, sequential local mission numbers, no pager, real canvas, two screenshots per size.
- CI and real WebGL screenshot review PASSED; owner approved final artistic implementation on 2026-11-13. Physical iPhone tests still outstanding: pan, pinch/twist/recenter, all 10 missions, card, battles/sims, fallback and FPS/heat.
- **Do not merge this Draft PR or publish Pages without explicit owner permission.** Once accepted, update `CHANGES_STATUS.md`, `campaign20/README.md`, release handoff with CI/artifact links and physical acceptance limits.

## Final artistic acceptance · 2026-11-13

Owner explicitly replied **«Согласовано»** after review of the second-iteration true WebGL renders (844×390 MED, 667×375 LOW). Accepted artwork is the open Kaitain colonnade and stepped gilded crown, ceremonial stairs, Salusa and Ix panorama, and roofless throne nave with a forward Golden Lion Throne and guardians. This closes the *artistic* gate only, not the release gate.

- **Draft PR:** https://github.com/mryandexxx-spec/Dgoh-game/pull/60
- **Branch/head for accepted artwork:** `feat/campaign20-c46-corrino-20261113` / `64dcfc251aa0828281fd6f72659efbad09f95859`
- **Full green CI (all required checks after E3 rerun):** https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43489008045
- **Verified WebGL shots:** https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43489008045/artifacts/14068971483 (`corrino-first-844-med.png`, `corrino-first-667-low.png`, `corrino-844-med.png`, `corrino-667-low.png`)
- Initial E3 failure was intermittent `memory-ix-dom.mjs` selection-modal assertion on LOW; identical code passed on rerun. All required checks SUCCESS. GitHub Pages publishing skipped.
- Preserve 210 missions and original ID range 160–169 for `C:2`; preserve v101 gestures, 50/60px pins, previous C4.1–C4.5, economic rules and 2D fallback.
- **Release gate remains CLOSED:** do not merge PR or publish Pages until the owner expressly authorizes release. Current `main` v108 unaffected.
