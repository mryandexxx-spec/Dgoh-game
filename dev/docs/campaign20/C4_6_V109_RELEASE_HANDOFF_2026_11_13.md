# C4.6 «Дом Коррино» — v109 release handoff (13.11.2026)

**Владелец:** художественная приёмка «Согласовано», отдельное разрешение «Да» на merge и Pages. **PR #60 MERGED:** https://github.com/mryandexxx-spec/Dgoh-game/pull/60, squash `2a4e39ff1bee496f3379900209b82fffa8e20826`.

## Что выпущено в коде
- `C:2` «Хроники Дюны / Дом Коррино» — 10 прежних миссий с IDs 160–169 без изменений экономики, сохранений и 210 миссий кампании.
- Имперский путь: церемониальный Кайтэйн и открытая колоннада, суровая Салуза Секундус, Икс и проект Амаль, Фенринг, Львиный Золотой трон в открытом зале. World-space маркеры 50/60px, последовательные группы на iPhone landscape, карта исследуется свайпами v101; браузерный 2D fallback.
- Источники: `dev/src/render3d/scenes/campaign-corrino-chronicles.js`, `campaign-map-presets.js`, `campaign-map.js`, `campaign20.css`, `campaign20.js`, `split.config.mjs`, `tests/smoke/campaign20.mjs`.

## Проверки, публикация и границы приёмки
- Полный PR CI: https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43489008045 — SUCCESS после E3 rerun. MED/LOW WebGL: https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43489008045/artifacts/14068971483, `corrino-first-844-med.png`, `corrino-first-667-low.png`, `corrino-844-med.png`, `corrino-667-low.png`.
- Релиз v109 инициирован настоящим `release:` коммитом; **ПУБЛИКАЦИЯ ПОДТВЕРЖДЕНА**: Validate Dune GoH PWA [#43502576987](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43502576987) SUCCESS (включая встроенный Publish verified PWA to GitHub Pages); опубликованные проверенные байты — `7f039b318a5a5f1eb36c6a81e6b2b718da08fe92`, Pages [#43504272925](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43504272925) SUCCESS. URL: https://mryandexxx-spec.github.io/Dgoh-game/.
- После Pages проверить на физическом iPhone 844×390 MED / 667×375 LOW: свайпы, pinch/twist/recenter, 10 миссий, бой/симуляции/возврат, 2D fallback, FPS и нагрев. Такие физические измерения пока отсутствуют.
- Следующий художественный этап: C4.7 `C:3` — собственная концепция и отдельная ветка/PR; не переделывать уже принятую C4.6 без запроса.

Детальный handoff разработки: [C4_6_CORRINO_IMPLEMENTATION_2026_11_13.md](C4_6_CORRINO_IMPLEMENTATION_2026_11_13.md).

## Финальное состояние GitHub после релиза

- `main` с PWA v109: `7f039b318a5a5f1eb36c6a81e6b2b718da08fe92`; `dev/version.json` = 109.
- Встроенный publish-job релизного CI #43502576987 **SUCCESS**, Pages #43504272925 **SUCCESS** для точного SHA `7f039b31`.
- Дублирующий отдельный [Publish Dune GoH PWA #43504314965](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43504314965) **FAIL** в защите `Fail if main advanced after validation`: основной publish-job успел продвинуть `main` раньше. Это конфликт двух релизных оркестраторов, а не отказ Pages и не сбой v109; устранить отдельной технической задачей с сохранением защит от непроверенной публикации.
- Следующая глава **C4.7, `C:3` «Батлерианский джихад»**, уровни 40–52, исходные миссии **170–179**. Источник: `dev/src/data/campaigns.js`, `CAMP_DEF.C.chapters[3]`. Разработка начинается с отдельной художественной концепции.
