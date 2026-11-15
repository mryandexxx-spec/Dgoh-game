# Campaign 2.0 — C4.16 «Ночь длинных ножей» / «Гаснущая корона» · v119 release handoff

Дата: 15.11.2026. **Статус: релиз-кандидат v119; публикация подтверждается только отдельным validated PWA + Pages.** Этот документ готовится в release-ветке, до SUCCESS нельзя называть v119 опубликованной.

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
- Release PR CI должен завершиться SUCCESS; merge только с точным заголовком `release(campaign): publish v119`.
- Одноразовый workflow проверяет `main`, точный заголовок, version 119, прежний root SW, утверждённый D:2 код. Только после этого вызывает официальный `.github/workflows/validate-pwa.yml` через `workflow_dispatch publish=true`.
- Проверить официальный publish CI (full required gate, immutable SHA-256 validated artifact, production root sync), отдельный Pages deployment SUCCESS, точный новый `app.js` footer v119, root SW VER и их согласованность. До этого статус **НЕ ОПУБЛИКОВАНА**.
- После SUCCESS удалить одноразовый workflow документационным cleanup PR без повторного version bump/release; обновить фактические run IDs, хеш и статус в этом файле, `dev/docs/campaign20/README.md` и `dev/CHANGES_STATUS.md`.

## Открыто на физическом iPhone
iPhone Safari/PWA landscape: все 90–99 на MED/LOW, архитектура и номер 99, swipe/pinch/twist/recenter, 2D fallback, бой и симуляция, offline/SW update, FPS/нагрев/батарея 10–15 минут. Chromium/SwiftShader не подменяет физическую приёмку. Аналогичная Safari/PWA-проверка C4.15 60–69 остаётся открытой.

## Следующая глава
После публикации v119 — C4.17, Тёмная IV `D:3` **«Правление Зверя»**, исходные ID 100–109, уровни 21–30. Только новый художественный этап A, не менять автоматически существующие главы.
