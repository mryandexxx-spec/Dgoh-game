# Campaign 2.0 — C4.16 «Ночь длинных ножей» / «Гаснущая корона» · v119 release handoff

Дата: 15.11.2026. **Статус: v119 ОПУБЛИКОВАНА. Официальный validated PWA, отдельный Pages deployment и root cache проверены.**

## Согласование владельца и C4.16
- [Issue #95](https://github.com/mryandexxx-spec/Dgoh-game/issues/95) — художественная концепция «Гаснущая корона» утверждена владельцем; затем приняты 22 настоящих WebGL кадра MED/LOW («Ок»).
- Отдельная команда владельца 15.11.2026: **«Сливай и выпускай»** — разрешены и merge, и следующий релиз с отдельными техническими гейтами.
- [Implementation PR #97 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/97), squash merge `49cec8a7f3605b2325666a65159d756b1aad84bf`.
- [Final implementation CI #43699423185 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43699423185) — реальные WebGL кадры, Golden, PWA, общий 3D + целевой lifecycle, perf; [WebGL artifacts](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43699423185/artifacts/14155673174).

## Игровой контракт
- Самостоятельная 17-я из 21 авторских карт Campaign 2.0: Тёмная сторона III `D:2`, исходные глобальные ID **90–99**, уровни **13–20**, сцена `arrakeen`.
- Каноническая «Ночь длинных ножей»: щиты гаснут, вторжение Харконненов и сардаукаров, внешняя стена, казармы, галерея Дункана, ангар, захват Хавата, Звёздный зал, пленение Лето, песчаный порог и последний приказ герцога.
- `CAMP_DEF`, 210 ID, STORY/диалоги, враги, боссы, drops, баланс, экономика, прогресс и сохранения не менялись.
- Одна статичная Babylon-диорама в общем `EngineHost/GameScene/CampaignMapScene` с 2D fallback и жестами v101; 2–4 локальных последовательных world-space маркера 50/60px без коллизий.
- Real lifecycle D:2 (три mount/render/dispose): MED 844×390 **190 meshes / 8479 vertices**, LOW 667×375 **150 / 7191**, HIGH 960×600 **190 / 8479**. Один WebGL-контекст без роста ресурсов после dispose.

## Версия и публикационный контракт
- Предыдущая подтверждённая версия: `dev/version.json=118`, root `app.js` футер `v118 · 25bfb36516`, `sw.js VER=25bfb36516`.
- В release PR: **только** `dev/version.json` 118→119, журнал и документация Campaign 2.0, одноразовый fail-closed workflow. Не менять C4.16/gameplay/saves/assets.
- [Release PR #98 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/98) с точным squash-заголовком `release(campaign): publish v119` и SHA `b8b454d45093ec96071a2061b8ee344c1e48fb28`; [release PR CI #43701560974 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43701560974).
- [main CI #43702047971 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43702047971). [Одноразовый guard #43702047965 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43702047965) проверил main, заголовок, version 119, прежний root SW и утверждённый D:2 код, отправив только официальный `workflow_dispatch publish=true`.
- [Официальный validated publish #43702058210 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43702058210): полный gate, exact validated build **v119 · 5433bc45aa**, **188 SHA-256 files**, `Publish verified PWA to GitHub Pages` SUCCESS, verified root sync commit **`d948026965b837f7b9923f9ee608d18e3ca9a46d`**.
- [Отдельный Pages build and deployment #43702687728 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43702687728), точный source commit `d948026965b837f7b9923f9ee608d18e3ca9a46d`; в `main` подтверждены `dev/version.json={"v":119}`, root `sw.js VER='5433bc45aa'`, новая validated PWA с футером `v119 · 5433bc45aa`. Production: https://mryandexxx-spec.github.io/Dgoh-game/. **v119 ОПУБЛИКОВАНА.**
- После публикации одноразовый workflow `release-v119-once.yml` удаляется в отдельном документационном cleanup PR **без** version bump или повторной публикации. Release handoff, `dev/docs/campaign20/README.md` и `dev/CHANGES_STATUS.md` обновлены тем же документальным закрытием.

## Открыто на физическом iPhone
iPhone Safari/PWA landscape: все 90–99 на MED/LOW, архитектура и номер 99, swipe/pinch/twist/recenter, 2D fallback, бой и симуляция, offline/SW update, FPS/нагрев/батарея 10–15 минут. Chromium/SwiftShader не подменяет физическую приёмку. Аналогичная Safari/PWA-проверка C4.15 60–69 остаётся открытой.

## Следующая глава
После публикации v119 — C4.17, Тёмная IV `D:3` **«Правление Зверя»**, исходные ID 100–109, уровни 21–30. Только новый художественный этап A, не менять автоматически существующие главы.
