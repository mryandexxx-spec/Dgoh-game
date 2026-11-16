# ARCH-01B3 · v125: релиз через проверенную сборку

Дата: 16.11.2026. Команда владельца: **«Да, сливаем и выпускаем»**. Источник: [Issue #125](https://github.com/mryandexxx-spec/Dgoh-game/issues/125), [Implementation PR #129](https://github.com/mryandexxx-spec/Dgoh-game/pull/129), [концепция ARCH-01B3](ARCH01B3_ACCOUNT_BOOTSTRAP_2026_11_16.md).

## Состав

**v125** завершает ARCH-01B: `logic/account.js` больше не импортирует `ui/wiring.js`, сохраняя публичные экспорты через чистый `logic/account-rules.js`. Независимая `logic/cinematic-preference.js` снимает раннюю загрузку аккаунта из 3D; `ui/fx-text.js` управляет последовательностью `wiring → account`. Ровно 2 чистых модуля добавлено, прежние **159** модулей остались в историческом порядке, `check-bundle OK (161)`.

[PR #129 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/129), SHA `393c661b27edb28f7f18482c2358dd8f39369189`, [CI #43844594742 — SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43844594742): 19 success, один ожидаемый skip. `check-arch-imports`: **17 старых data→* рёбер**, новых 0, stale 0. Проверки golden battles/meta/saves/41 screens, offline/update PWA, UI, 2D/3D WebGL/lifecycle завершены успешно.

Нет изменений лагеря, 3D лагеря и навигации, баланса, экономики, сохранений, контента Campaign 2.0, наград. Старый общий ESM SCC остаётся — его остаточные циклы в `data→*` относятся к ARCH-01C.

## Протокол публикации fail-closed

1. На `main` после PR #129: `dev/version.json={"v":124}`, опубликованный root `sw.js` использует `const VER = 'a8637003e4'`. Реализованное исправление уже прошло CI, но опубликованная v124 ещё не заменена.
2. Релизная ветка `release/arch01b3-v125-validated-20261116`: изменения только `dev/version.json` 124→125, `dev/CHANGES_STATUS.md`, этот handoff и `.github/workflows/release-v125-once.yml`. Не допускать новых изменений игровой логики в release PR.
3. Только после **полного SUCCESS** требуемых проверок релизного PR перевести его из Draft в Ready и выполнить **squash merge с точной темой `release(arch): publish v125`**.
4. Одноразовый guard на конкретный push в `main` проверяет точный git subject, версию 125, прошлый root SW `a8637003e4`, AST baseline ровно 17 `data→*`, отсутствие `logic/account→ui`, наличие адаптера, чистых правил, нового UI-order теста и лока документа. Только затем через `gh api` вызывается официальный `workflow_dispatch` `validate-pwa.yml` с `publish=true`.
5. Официальный validated workflow обязан завершить все обязательные проверки, SHA-256 manifest/receipt, `ci-current-main`, точное staging проверенного `dist/pwa` без повторной сборки и `actions/deploy-pages` **SUCCESS**. Затем отдельно подтвердить независимый Pages workflow на конкретном root SHA с `sw.js` версии v125.
6. После проверенной публикации сохранить реальные IDs, корневой SHA, SW hash, артефакты и состояние Pages в этом документе и журнале; удалить одноразовый guard отдельным docs-only PR. Повторный `publish=true` не запускать.

**Ни merge release PR, ни отдельную публикацию нельзя объявлять завершёнными до точного Pages deployment SUCCESS.**

## Проверка на физическом iPhone — остаётся открытой

Safari/PWA landscape MED/LOW: обновление v124→v125, холодная и тёплая загрузка, профиль и XP уровня аккаунта, награды, развитие героев и верхние ограничения, кинематографическая настройка боёв, испытания и симуляция, автобой, экспорт/импорт сохранений, офлайн-PWA/SW, 3D lifecycle. Автоматический Chromium CI не заменяет физическую проверку iPhone.

## Фактическая публикация v125 — подтверждена 16.11.2026

**v125 ОПУБЛИКОВАНА**, владелец явно разрешил «Да, сливаем и выпускаем». GitHub Actions выполнил полноценные CI-проверки, защиту от неправильного выпуска, проверенную выкладку и отдельный Pages deployment.

- [Implementation PR #129 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/129), merge `393c661b27edb28f7f18482c2358dd8f39369189`; [implementation full CI #43844594742 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43844594742).
- [Release PR #130 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/130), squash `6426753eb6fabfb8ffec3dfeaff654aeb39aed89`, точная тема `release(arch): publish v125`; [release full CI #43860599963 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43860599963), 19 success/1 skipped.
- [Main post-merge CI #43861703696 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43861703696); [one-shot guard #43861703782 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43861703782): ровно один разрешённый `workflow_dispatch publish=true`.
- [Official validated publish #43861743411 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43861743411): **20 success**, включая full gate, SHA-256 receipt, публикацию артефакта и `Publish verified PWA to GitHub Pages`.
- [Validation receipt](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43861743411/artifacts/14224885793), [verified build](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43861743411/artifacts/14224026114), [Pages artifact](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43861743411/artifacts/14224556565).
- Опубликованный root SHA: `c40d4de2c37a185391abaf559c96a53fd7b74dc7`; `dev/version.json={"v":125}`, root `sw.js: const VER = '98ada878d4'` (ранее v124: `a8637003e4`).
- [Независимый GitHub Pages deployment #43862770350 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43862770350) **точно на root SHA `c40d4de2`**. Production: https://mryandexxx-spec.github.io/Dgoh-game/.
- `logic → ui` запрещённых импортов **0**; остаётся **17 legacy `data → logic/core/ui/assets`** (ARCH-01C) и два старых циклических компонента, не устранённых этим выпуском.
- Никаких изменений лагеря, кампании, экономики, баланса, наград, формата сохранений и игрового UI в этой релизной ветке. Физический Safari/iPhone v125 **не проверен**, ручная приёмка остаётся открытой.

После публикации одноразовый `.github/workflows/release-v125-once.yml` удаляется отдельным [docs-only cleanup PR #131](https://github.com/mryandexxx-spec/Dgoh-game/pull/131); не запускать `publish=true` повторно.
