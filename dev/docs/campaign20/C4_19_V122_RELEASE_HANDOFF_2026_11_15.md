# Campaign 2.0 — C4.19 «Легионы Салусы» / «Марш, стёртый ветром» — v122 validated release handoff

Дата: 15.11.2026. Владелец принял 22 настоящих WebGL PNG и отдельно дал команду «Сливай и выпускай».

**v122 ОПУБЛИКОВАНА И ПОДТВЕРЖДЕНА:** официальный validated `workflow_dispatch publish=true` и отдельный GitHub Pages deployment SUCCESS; опубликованная PWA root точно сверена с CI-артефактом.

## Художественная реализация — DONE
- Тёмная сторона VI `D:5`, оригинальные миссии 120–129, уровни 43–56, 20-я из 21 оригинальных 3D-карт Campaign 2.0. Следующая после неё — `D:6` C4.20.
- Оригинальная концепция «Марш, стёртый ветром»: связная 3D-диорама Арракиса; сначала строгий имперский десант и войсковые ранги, затем бой с федайкинами, пленник, буря Кориолиса, ущелье, тайная вода, песчаные черви, отступление и человеческий силуэт Муад'Диба. 10 уникальных ориентиров + 9 соединений.
- Канонические 210 ID, главы, STORY, диалоги, противники, boss, drops, баланс, экономика, прогресс, сохранения без изменений.
- `CampaignMapScene`/один EngineHost, native v101 gestures, живой world-space HUD, 2D fallback, static idle, dispose. Нет независимого Engine/rAF/timer/particles/shadow maps.
- [Issue #110](https://github.com/mryandexxx-spec/Dgoh-game/issues/110), художественно принятая [реализация PR #112 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/112), commit `3d0da968f2d6b0586285851d07d3d268322cbbf2`.
- [Полный implementation CI #43753939000 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43753939000); [artifact #14177742425](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43753939000/artifacts/14177742425), ровно 22 настоящих Chromium/SwiftShader WebGL PNG: entry + 10 focuses MED 844×390 и LOW 667×375.
- Strict lifecycle ×3 MED 844×390 **119 meshes / 7745 vertices**, LOW 667×375 **107 / 6664**, HIGH 960×600 **119 / 7745**; никакого роста scene/textures/contexts. Проверены world-space pins 2–4 последовательных, boss 129, 2D fallback, no overlap/clipping/scroll. Geometry budget в пределах +10%; цифры не являются реальными iPhone FPS/нагревом.

## v122 — fail-closed publication
- Source: `main` содержит MERGED C4.19 (v121 в `dev/version.json`); предыдущая подтверждённая продукция — **v121**, root `sw.js` cache **`9f55a9a721`**, root commit `c17770f89b762ca642fdb6b05578d31157df3774`.
- Отдельный `release/c4-19-v122-validated` PR обновляет `dev/version.json` **121→122**, журнал, этот handoff, campaign index и одноразовый workflow `.github/workflows/release-v122-once.yml`. Игровой код не изменяется.
- Требуется release PR required CI SUCCESS; squash merge **с точным заголовком `release(campaign): publish v122`**.
- Одноразовый guard на exact release commit в `main` проверяет версию, предыдущий SW cache v121, наличие `D:5`, scene integration, smoke real WebGL и lifecycle, затем **один раз** отправляет официальный `workflow_dispatch` `validate-pwa.yml` с `publish=true`. Это не самодеятельная публикация кода, а уже действующий валидированный CI маршрут.
- В release main `Validate Dune GoH PWA` и официальном `workflow_dispatch` должны быть SUCCESS gate, Golden, Campaign WebGL, 3× lifecycle, PWA/offline, arch/perf и validated artifact SHA-256 receipt.
- `Publish verified PWA to GitHub Pages` должен быть SUCCESS, `dev/version.json` v122, app.js v122, root `sw.js` cache отличен от v121. Проверить отдельный Pages build/deployment по точному синхронизированному root SHA, сравнить SHA-256 файлов. **Не считать релиз завершённым раньше.**
- После успешной публикации отдельным docs-only cleanup PR удалить одноразовый guard, зафиксировать все реальные IDs/SHA, закрыть issue при необходимости; не запускать второй publish.

## Открытая реальная мобильная проверка
Физический Safari/PWA iPhone landscape не проверен: миссии 120–129, pan/pinch/twist/recenter, выбор/бой/симуляция, 2D fallback, SW offline и 10–15 минут FPS/нагрев/батарея. Chromium SwiftShader — автоматизированные WebGL доказательства, не физический телефон.

## Подтверждённый выпуск v122 — 15.11.2026
- [Release PR #113 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/113), squash `6ba3da1810e7035ac159872889a693aae94738f2`, с точным заголовком `release(campaign): publish v122`; [полный release PR CI #43761318100 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43761318100).
- [Main CI #43761986252 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43761986252), [одноразовый guard #43761986250 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43761986250) отправил ровно один официальный `publish=true`.
- [Официальный validated publish #43761996195 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43761996195): все required checks и gate успешны, `Publish verified PWA to GitHub Pages` SUCCESS. Exact validated `v122 / 8ad3787e3c · 188 SHA-256 files`, без пересборки на стадии публикации; [production build artifact](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43761996195/artifacts/14181200940), [receipt artifact](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43761996195/artifacts/14181250807), [Pages artifact](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43761996195/artifacts/14180338424).
- PWA-root sync commit `c6dd5a91091cb830a5ea4f30ddfad07d0a43861c` («Publish verified PWA from CI artifact»). `dev/version.json={"v":122}`, `app.js` содержит **`v122 · 8ad3787e3c`**, `sw.js` **`VER='8ad3787e3c'`**. Предыдущий production v121 имел `9f55a9a721`.
- [Отдельный GitHub Pages deployment #43762773320 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43762773320) на **exact root SHA `c6dd5a91091c...`**, production: https://mryandexxx-spec.github.io/Dgoh-game/.
- После доказанного выпуска удаляется одноразовый `release-v122-once.yml` через отдельный docs-only cleanup PR; повторного `publish=true` не требуется. На физическом Safari/iPhone 120–129 и FPS/нагрев/батарея остаются открытыми.

## Следующая глава
C4.20 Тёмная VII `D:6` — последние 10 авторских миссий карты (130–139). Следующий художественный этап A начинать отдельным чатом после чтения этого handoff, главного `campaign20/README.md`, `ARCHITECTURE.md`, `CHANGES_STATUS.md` и исходного `CAMP_DEF.D.chapters[6]`; не менять канон без прямого запроса.
