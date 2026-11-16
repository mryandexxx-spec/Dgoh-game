# ARCH-01C1 — v126: согласованный выпуск через validated CI

Дата: 16.11.2026. Команда владельца: **«Принимаю, наверное. Выпускай и идем дальше»** после CI C1b. Это согласие на merge + выпуск, без запроса дополнительных игровых изменений.

## Состав и статусы

- ARCH-01C1a: [PR #135 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/135), исходный коммит 9336e67e6f344fdcd17bd608815bec6caa9a7706, [полный CI #43875356018 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43875356018). Чистый `data/gear-cap.js`, `MAX_GEAR = 13`, совместимый публичный экспорт экономики. Baseline 17→16.
- ARCH-01C1b: [PR #136 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/136), squash 7531857e69da7e9464465eaefe392bf8ca04ec01, [полный CI #43880440127 SUCCESS (18/18)](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43880440127). Правила путешествий теперь в `logic/journey-gates.js`; `data/journeys.js` — совместимый callable port без core/logic импортов. Имеющийся `core/boot.js` регистрирует правила перед `start()`, не затрагивая лагерь. Baseline 16→14.
- Реальное ESM: **169 модулей, 996 статических импортов, две SCC**; `check-bundle OK (163)`, сохранён точный порядок всех 162 старых модулей. AST gate 14 historical, 0 new, 0 stale. Полные golden: 200 battles, meta, saves, 41 screens обеих сборок, PWA SW/offline, E3 DOM, MED/LOW WebGL и mobile/desktop lifecycle — SUCCESS.
- Никаких изменений в лагере, 3D, Campaign 2.0, экономических параметрах, балансе, сохранениях, наградах и требованиях легенд. Старые импортирующие consumer-файлы лагеря сохранены. Версия исходника до релизного PR — v125, опубликованный SW `98ada878d4`.

## Fail-closed release v126

1. Релизная ветка `release/arch01c1-v126-validated-20261116`: изменения **только** `dev/version.json` 125→126, `dev/CHANGES_STATUS.md`, данный handoff и `.github/workflows/release-v126-once.yml`; production src, baseline и golden не меняются.
2. Выполнить **все обязательные CI на release PR**. Только после полноценного SUCCESS разрешён merge этой ветки с **точным squash subject** `release(arch): publish v126`. Субъект включает guard одноразовой публикации.
3. Guard на `main` проверяет точный commit subject, v126, старый root SW 98ada878d4, 14 исключительно data→* рёбер в baseline, наличие новой логики и legacy camp-port, после чего через GitHub Actions API вызывает официальный workflow_dispatch `validate-pwa.yml` с `publish=true`.
4. Официальный validated run обязан пройти mandatory checks, генерировать точный проверенный PWA artifact и SHA-256 receipt, проверить текущий `main`, скопировать только проверенные production bytes, git push в root и `actions/deploy-pages` SUCCESS. Отдельно проверить независимый `pages build and deployment` SUCCESS. До этого **не** говорить «v126 опубликована».
5. После релиза зафиксировать actual run IDs, root SHA, SW/cache hash и Pages status в Issue #132 и journal. Удалить одноразовый workflow отдельным docs-only PR (без изменения игры и повторного publish).

## Открыто

- Физическая проверка на Safari/iPhone: холодная и тёплая загрузка v125→126, легенда Муад'Диб (недостаточные 11 требований, готовность XIII, выбор ровно 4, переигрывание уже открытой легенды), сохранённые уровни путешествий, офлайн/SW, рейды, WebGL MED/LOW, перезапуск и экспорт/импорт сейва.
- ARCH-01C2, следующий отдельный этап: кампании и сюжет — 4 импорта `data/campaigns.js → core/rng, core/state, logic/economy`, `data/story.js → assets/models`. Виртуальный esbuild C0 показал, что механическое удаление story→models переставляет 60 модулей. Нельзя трогать Campaign 2.0/210 миссий, награды, ставки энергии, фиксацию seeded RNG. См. [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132). Отдельный Draft PR и CI; без самостоятельного merge/publish.

## Фактические подтверждения (заполнить после выпуска)

- Implementation: PR #135 и #136 MERGED, CI SUCCESS.
- Release PR, full release CI / main CI / one-shot dispatch: **ожидается**.
- Official verified publish / SW hash / root SHA / independent Pages: **ожидается**. До подтверждения опубликована **v125**.
