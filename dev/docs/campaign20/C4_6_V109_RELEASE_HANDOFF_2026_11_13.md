# C4.6 «Дом Коррино» — v109 release handoff (13.11.2026)

**Владелец:** художественная приёмка «Согласовано», отдельное разрешение «Да» на merge и Pages. **PR #60 MERGED:** https://github.com/mryandexxx-spec/Dgoh-game/pull/60, squash `2a4e39ff1bee496f3379900209b82fffa8e20826`.

## Что выпущено в коде
- `C:2` «Хроники Дюны / Дом Коррино» — 10 прежних миссий с IDs 160–169 без изменений экономики, сохранений и 210 миссий кампании.
- Имперский путь: церемониальный Кайтэйн и открытая колоннада, суровая Салуза Секундус, Икс и проект Амаль, Фенринг, Львиный Золотой трон в открытом зале. World-space маркеры 50/60px, последовательные группы на iPhone landscape, карта исследуется свайпами v101; браузерный 2D fallback.
- Источники: `dev/src/render3d/scenes/campaign-corrino-chronicles.js`, `campaign-map-presets.js`, `campaign-map.js`, `campaign20.css`, `campaign20.js`, `split.config.mjs`, `tests/smoke/campaign20.mjs`.

## Проверки, публикация и границы приёмки
- Полный PR CI: https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43489008045 — SUCCESS после E3 rerun. MED/LOW WebGL: https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43489008045/artifacts/14068971483, `corrino-first-844-med.png`, `corrino-first-667-low.png`, `corrino-844-med.png`, `corrino-667-low.png`.
- Релиз v109 инициирован настоящим `release:` коммитом; **полный финальный статус публикации подтверждается отдельно** успешным Validate Dune GoH PWA → Publish Dune GoH PWA → pages build and deployment на соответствующем SHA. Не считать релиз опубликованным по факту merge или одному только release commit.
- После Pages проверить на физическом iPhone 844×390 MED / 667×375 LOW: свайпы, pinch/twist/recenter, 10 миссий, бой/симуляции/возврат, 2D fallback, FPS и нагрев. Такие физические измерения пока отсутствуют.
- Следующий художественный этап: C4.7 `C:3` — собственная концепция и отдельная ветка/PR; не переделывать уже принятую C4.6 без запроса.

Детальный handoff разработки: [C4_6_CORRINO_IMPLEMENTATION_2026_11_13.md](C4_6_CORRINO_IMPLEMENTATION_2026_11_13.md).
