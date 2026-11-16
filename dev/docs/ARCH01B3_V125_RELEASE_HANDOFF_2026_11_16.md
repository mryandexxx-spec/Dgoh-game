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

## Фактические подтверждения (заполнить по мере завершения)

- Implementation [PR #129 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/129), SHA `393c661b27edb28f7f18482c2358dd8f39369189`; [full CI #43844594742 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43844594742).
- Release PR: **pending**.
- Release CI / main CI / one-shot dispatch: **pending**.
- Official verified publish, SW hash, SHA-256 receipt, root sync: **pending**.
- Independent GitHub Pages deployment: **pending**. До подтверждения — опубликована **v124**.
