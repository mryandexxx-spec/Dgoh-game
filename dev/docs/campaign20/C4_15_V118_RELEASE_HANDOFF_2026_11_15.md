# Campaign 2.0 — C4.15 «Битва за Арракин» / «Шрам Защитной стены»: выпуск v118

Дата: 15.11.2026. **СТАТУС: v118 ОПУБЛИКОВАНА; official validated PWA и отдельный GitHub Pages deployment подтверждены.**

## Приёмка владельца
- Художественная концепция C4.15 утверждена. Реальные WebGL MED/LOW 22 кадра приняты («Ок»); отдельные команды «Сливай» и «Выпускай» даны 15.11.2026.
- [PR #92 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/92), squash SHA 0f1203d534e347deee54133ac014a823a6436d3b.
- [PR CI SUCCESS #43689895701](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43689895701), WebGL artifact dune-campaign20-996. [main push CI SUCCESS #43691646475](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43691646475).

## Контракт v118
- 16/21 авторских карт Campaign 2.0. C4.15, Светлая VII L:6, миссии 60–69, уровни 57–70. Единая карта: буря, атомный пролом, огромный червь, разрушенный Арракин, сардаукары, шатёр Шаддама, дуэль с Фейдом и пустой трон. Целая стена предыдущей L:5 не изменена.
- 210 исходных ID, сюжет, враги, боссы, награды, экономика, сохранения и баланс неизменны. Один EngineHost, статичный idle, профили HIGH/MED/LOW, 2D fallback, жесты v101 и 2–4 локальные последовательные метки без overlap.
- Lifecycle L:6: MED 246 meshes / 11940 vertices, LOW 164 / 8285, HIGH 246 / 11940. Три цикла mount/render/dispose во всех профилях без роста Engine/GL-контекстов и retained meshes/textures.
- Версия до выпуска: dev/version.json=117; root sw.js VER=687dd0b25e (v117).

## Порядок строго подтверждённой публикации
1. В релизной ветке — точный version bump 117→118, журнал, этот handoff, указатель README и одноразовый workflow; никаких дополнительных изменений игровой логики.
2. После release PR CI SUCCESS выполнить squash merge с точным заголовком: release(campaign): publish v118.
3. Guard однократного workflow проверяет новое version.json, прежний root SW, утверждённый код C4.15 и точный заголовок. Он вызывает только официальный validate-pwa.yml на main через workflow_dispatch с publish=true.
4. Официальный Validate обязан проверить полный gate, SHA-256 exact artifacts, staging, root PWA sync и Publish verified PWA to GitHub Pages; отдельный Pages deployment должен завершиться SUCCESS.
5. Только после проверки root app.js APP_VER=v118, SW VER с новым hash и совпадения с официальной validated сборкой статус становится ОПУБЛИКОВАНА.
6. Реальные PR / CI / Pages ID и root SHA/hash зафиксированы ниже; одноразовый workflow удалён в документационном cleanup PR.

## После публикации на iPhone
Safari/PWA landscape: миссии 60–69, видимость пролома, червя и трона, 2–4 маркера, свайп/pinch/twist/recenter, бой, симуляция, WebGL-off fallback, обновление SW/offline, сохранения, FPS/нагрев/батарея 10–15 минут. Реальные замеры iPhone ещё не проведены.

Production: https://mryandexxx-spec.github.io/Dgoh-game/

## Фактическая публикация v118 — подтверждённые доказательства
- **Релизный PR:** [#93 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/93), squash `16928e92466df77184a844f21a0f3f6edaf562ab`, точный заголовок `release(campaign): publish v118`.
- **PR CI:** [#43692066708 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43692066708) — 19/19 обязательных заданий, Golden, WebGL MED/LOW, lifecycle, PWA, perf.
- **Проверенный main:** [push CI #43692633544 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43692633544) на `16928e9`; verified source reused with guard.
- **Одноразовая явная публикация:** [dispatch guard #43692633571 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43692633571) проверил v118/старый root SW/исходный C4.15 и отправил `workflow_dispatch publish=true` на `main`.
- **Официальный publish:** [Validate PWA run #43692643421 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43692643421) — полный gate, exact SHA-256, root staging/sync и `Publish verified PWA to GitHub Pages` SUCCESS.
- **Root production:** commit `b4a2f5d34abff744a17c5c92a1e6c44ba513b6fa`; `dev/version.json=118`; `app.js` содержит точную строку **`v118 · 25bfb36516`**; `sw.js` VER **`25bfb36516`** и больше не `687dd0b25e`.
- **Отдельный Pages workflow:** [pages build and deployment #43693224667 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43693224667), привязан к точному root SHA `b4a2f5d...`.
- **Cleanup:** удалить разовый `.github/workflows/release-v118-once.yml` без нового релиза и без обновления версии. В приложении на физическом iPhone Safari остаются непроверенными 60–69, FPS/нагрев/батарея и SW/offline.
