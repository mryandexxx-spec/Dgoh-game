# Campaign 2.0 C4.20 «Последняя ставка» / «Сломанная печать» · v123 validated release handoff

Дата: 16.11.2026. Владелец художественно принял концепцию и 22 настоящих WebGL MED/LOW кадра и отдельно дал команду **«Сливай и публикуй»**.

**v123 ОПУБЛИКОВАНА И ПОДТВЕРЖДЕНА:** официальный `workflow_dispatch publish=true` прошёл SUCCESS, verified root содержит `v123 / 4d27cefa0a · 188 SHA-256 files`, отдельный Pages deployment SUCCESS на точном коммите. После выпуска одноразовый guard удалён docs-only cleanup PR.

## Принятая реализация
- 21-я из 21 оригинальных самостоятельных карт Campaign 2.0; Dark VII `D:6`, 130–139, уровни 57–70.
- Художественная концепция **«Сломанная печать»**: 3 акта падения имперской власти, десять оригинальных ориентиров, девять физически связанных маршрутов, десять уникальных фокусов камеры; исходная STORY / squads / drops / boss / 210 миссий, экономика, сохранения и баланс не менялись.
- Одна сцена Babylon / EngineHost, static idle, native v101 pan/pinch/twist/recenter, world-space UI 2–4 последовательных markers, интерактивный 2D fallback, полный dispose. Без второго Engine/rAF/RTT/частиц/теней.
- [Issue #115](https://github.com/mryandexxx-spec/Dgoh-game/issues/115), [implementation PR #117 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/117) `2875d73500ae5ff26567d85aa5e00ae54644de4a`.
- [Полный WebGL implementation CI #43770272585 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43770272585), [22 настоящих MED 844×390/LOW 667×375 WebGL PNG](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43770272585/artifacts/14184247500), художественно приняты 16.11.2026. Финальный [PR CI #43771413151 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43771413151).
- Strict lifecycle 3× MED/HIGH **111 meshes/6779 vertices**, LOW **102/6099**, один контекст, без роста ресурсов; 2–4 world-space pins, не перекрываются/не обрезаются, без вертикальной прокрутки. Меньше предшествующего v122 D:5 (119/7745, 107/6664).

## v123 — fail-closed release route
1. Исходный production v122: `dev/version.json={"v":122}`, root `sw.js` cache **`8ad3787e3c`**, root опубликован коммитом `c6dd5a91091cb830a5ea4f30ddfad07d0a43861c`; исходники C4.20 после merge #117 уже на `main`, но без повышения версии. Отдельный release branch `release/c4-20-v123-validated`.
2. Release PR меняет только `dev/version.json` **122→123**, журнал, campaign index, этот handoff и одноразовый workflow `.github/workflows/release-v123-once.yml`. Исходники геймплея и рендера не менять.
3. Дождаться release PR required CI SUCCESS, включая golden, PWA/offline, WebGL и при необходимости новое полное покрытие. Squash merge **только** с точным заголовком **`release(campaign): publish v123`**.
4. One-time guard на push `main` с exact release title проверяет checkout SHA, `version.json=123`, **предыдущий** cache SW v122, файл карты D:6, интеграцию, smoke/lifecycle, после чего один раз отправляет *официальный* `workflow_dispatch` `validate-pwa.yml`, `publish=true`. Никаких самостоятельных копий PWA вне проверенного workflow.
5. Официальный validated publish требует SUCCESS всех required jobs и gate, реального `Publish verified PWA to GitHub Pages`, проверенной сборки и SHA-256 receipt, синхронизации PWA root. Затем отдельно проверить GitHub Pages deployment SUCCESS на точном опубликованном root SHA, `dev/version.json=123`, `app.js` v123, новый `sw.js` cache (не `8ad3787e3c`). **Не утверждать выпуск до этого.**
6. После доказанного выпуска — docs-only cleanup PR удаляет одноразовый guard, фиксирует подлинные PR/run/artifact/SHA, при необходимости закрывает issue. Не dispatch второй `publish=true`.

## Подтверждённый выпуск v123 — 16.11.2026
- [Release PR #118 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/118), точный squash `159df1eedc2edbff6080cebbc411e6d51487c5c8`, заголовок `release(campaign): publish v123`, [релизный CI #43775010726 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43775010726).
- [Main CI #43775707698 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43775707698); [one-time guard #43775707738 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43775707738) отправил один официальный `publish=true`.
- [Официальный validated publish #43775717747 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43775717747), все required checks + gate и `Publish verified PWA to GitHub Pages` SUCCESS; `v123 / 4d27cefa0a · 188 SHA-256 files`. [Validated production artifact](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43775717747/artifacts/14186630821), [receipt artifact](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43775717747/artifacts/14185919607), [Pages artifact](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43775717747/artifacts/14186313601), [22 новых WEBGL PNG](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43775717747/artifacts/14185783406).
- PWA root sync `98c81d89c7c3ef811921ce7eeec7672af99a6372` («Publish verified PWA from CI artifact»), `dev/version.json={"v":123}`, root `sw.js` `VER='4d27cefa0a'` (предыдущий v122: `8ad3787e3c`).
- [Отдельный GitHub Pages deployment #43776592185 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43776592185) на **exact PWA root SHA `98c81d89c7c3...`**; production: https://mryandexxx-spec.github.io/Dgoh-game/.
- После доказанного выпуска одноразовый guard `release-v123-once.yml` удаляется через docs-only cleanup PR; повторного `publish=true` не требуется.

## Проверка на реальном iPhone остаётся открытой
Safari/PWA landscape на физическом iPhone: 130–139, жесты pan/pinch/twist/recenter, выбор/бой/симуляция, 2D fallback, update/offline, FPS/нагрев/батарея 10–15 минут. Chromium/SwiftShader не равен iPhone.
