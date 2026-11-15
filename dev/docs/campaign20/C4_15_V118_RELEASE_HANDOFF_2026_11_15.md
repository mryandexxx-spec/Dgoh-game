# Campaign 2.0 — C4.15 «Битва за Арракин» / «Шрам Защитной стены»: выпуск v118

Дата: 15.11.2026. СТАТУС: релизный кандидат. Не считать опубликованным до проверенных Pages и root PWA.

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
6. Реальные IDs релизного PR, CI, Pages, root SHA/hash вносятся отдельным cleanup PR, одноразовый workflow удаляется.

## После публикации на iPhone
Safari/PWA landscape: миссии 60–69, видимость пролома, червя и трона, 2–4 маркера, свайп/pinch/twist/recenter, бой, симуляция, WebGL-off fallback, обновление SW/offline, сохранения, FPS/нагрев/батарея 10–15 минут. Реальные замеры iPhone ещё не проведены.

Production: https://mryandexxx-spec.github.io/Dgoh-game/
