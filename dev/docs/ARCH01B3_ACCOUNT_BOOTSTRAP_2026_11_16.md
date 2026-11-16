# ARCH-01B3 · безопасная развязка `logic/account → ui/wiring`

Дата: 16.11.2026. Проект Dune GoH, исходная опубликованная версия **v124**. Трекинг: [Issue #125](https://github.com/mryandexxx-spec/Dgoh-game/issues/125), [Draft PR #129](https://github.com/mryandexxx-spec/Dgoh-game/pull/129), архитектурная база [ARCH-01B2 v124](ARCH01B2_V124_RELEASE_HANDOFF_2026_11_16.md).

## Цель и ограничения

Убрать **последнюю** зависимость `logic → ui` без изменения баланса, сохранений, пользовательских экранов или лагеря, а также без перестановки **159** исторических модулей сборки. Номер версии не меняем: выпуск осуществляется только по отдельной команде владельца.

После v124 список исторических архитектурных исключений равен **18**: 17 `data → logic/core/ui/assets` и 1 `logic/account.js → ui/wiring.js`. Цель ARCH-01B3 — **17** исторических нарушений, 0 новых/0 stale.

## Результаты настоящих виртуальных экспериментов (esbuild в памяти)

В `dev/tools/arch-account-order-probe.mjs` на feature-ветке были проверены различные варианты управления порядком инициализации **без записи в исходники/дистрибутив**; однократный диагностический скрипт удалён из итогового PR, чтобы не замедлять CI.

- Простое удаление импорта `logic/account → ui/wiring`: **145 из 159** модулей переставляются, неприемлемо.
- Попытки добавить зависимость `ui/battle/battle-ui → ui/wiring`, переставить импорты `render3d/scenes/arena`, перенести wiring в `core/boot`: существенные перестановки остаются.
- Изоляция только `CINE_OFF` и связь `ui/fx-text → ui/wiring`: переставляются 75 исторических модулей — старый `logic/account` выполняется на позиции 71 вместо 145.
- Перенос раннего потребителя `logic/rewards` на отдельные правила: 42 перестановки. Устранение только отдельных ранних ссылок недостаточно.
- **Принятый кандидат** — *все именованные потребители* импортируют чистые `logic/account-rules.js` (или `logic/cinematic-preference.js` для `CINE_OFF`), `ui/fx-text.js` сначала импортирует `ui/wiring.js` и затем `logic/account.js` как совместимый адаптер: **0 переставленных исторических модулей / swap cost 0**. Новый ранний `logic/cinematic-preference.js` вставляется перед прежним `data/fx.js`; чистый `logic/account-rules.js` — непосредственно перед первым потребителем `logic/rewards.js`.

## Реализация в отдельных слоях

- `logic/account-rules.js`: **дословно прежние** `ACC_MAX, accNeed, GEAR_CAP_AT, heroCap, gearCap, accReward, ACC_UPS, CINE_OFF, accFill`, включая миграцию старого save. Импортирует только `core/state.js` и `logic/economy.js`. Ни UI, ни DOM, ни вызовов при инициализации.
- `logic/cinematic-preference.js`: самостоятельный `CINE_OFF` без импортов, чтобы рендерер 3D и боевое меню не загружали весь account-слой преждевременно. Его формула **строго идентична** экземпляру в `account-rules.js` — проверяется CI и после стабилизации может консолидироваться отдельным контролируемым изменением.
- `logic/account.js`: экспортный совместимый адаптер (`export * from './account-rules.js'`) с безвредным marker-константой, сохраняющей старую позицию в esbuild. **Нет** импорта `ui/wiring.js`.
- `ui/wiring.js`: импорт `accFill` теперь из чистого `logic/account-rules.js`.
- `ui/fx-text.js`: задаёт последовательность UI-композиции: `./wiring.js` перед `../logic/account.js` как совместимым адаптером. Сами эффекты текста не меняются.
- `logic/rewards.js`, `ui/events.js`, `ui/hero-card.js`, `ui/overlays/profile.js`, `ui/overlays/levelup.js`: именованные импорты через чистые правила.
- `render3d/scenes/arena.js`, `ui/overlays/battle-settings.js`: импорт `CINE_OFF` из самостоятельного модуля.
- `tools/split.config.mjs`: ровно **две** новые записи; прочие **159** записей должны оставаться в прежнем порядке, сверяется отдельным FNV-1a контрактом из v124.
- `tools/arch-import-baseline.json`: удаляется только `logic/account.js -> ui/wiring.js` (**18→17**).
- `tests/ci/arch-account-bootstrap.mjs`: проверяет чистые зависимости и прежние формулы, **все** импорты аккаунта по исходному дереву, порядок UI, отсутствие **новых** SCC (две прежние компоненты остаются из-за 17 существующих обратных импортов `data → logic/core/ui/assets`), неизменность последовательности 159 модулей v124, две новые записи и отсутствие незарегистрированных импортов. Строгий `check-bundle` по итоговому production bundle остаётся обязательным.

## Критерии приёмки

1. `node tools/check-arch-imports.mjs`: **17 baseline / 0 new / 0 stale**; `--strict` пока отмечает ровно 17 старых `data` нарушений.
2. `node tests/ci/arch-account-bootstrap.mjs` PASS и `node tools/check-bundle.mjs dist/pwa/app.js` **OK (161)** без новых скрытых перестановок.
3. Golden `battles/meta/saves/screens` и UI DOM, PWA cold/warm/update/offline, 3D lifecycle и WebGL и требуемые CI проверки PASS. В отличие от виртуальной пробы, **только реальный CI** доказывает совместимость. **Примечание:** большой legacy SCC пока включает account-адаптер через транзитивные пути; цель B3 — отсутствие *прямого* `logic → ui` ребра и неизменность старого порядка, а не ликвидация всех циклов. Дальнейшее сокращение SCC относится к ARCH-01C.
4. Ручная проверка на физическом Safari/iPhone landscape (профиль/уровень аккаунта, начисление XP и rewards, испытания, сохранение/импорт, бой/рейд, UI, offline). Автотесты не заменяют iPhone.
5. **Без merge и без публикации** до отдельного разрешения владельца. Лагерь и его навигация, графика, уровни, сюжетная кампания и баланс не затронуты.

## Следующий этап после этого PR

ARCH-01C: 17 исторических `data → logic/core/ui/assets` нарушений, сначала классификация и план обратной совместимости, отдельно от ARCH-01B3. ECON-01 (проверка экономических сценариев) — другая ветка продуктового аудита.

## Продолжение в новом чате

Прочитать [Issue #120](https://github.com/mryandexxx-spec/Dgoh-game/issues/120), [#121](https://github.com/mryandexxx-spec/Dgoh-game/issues/121), [#125](https://github.com/mryandexxx-spec/Dgoh-game/issues/125), Draft PR #129, этот документ и `dev/ARCHITECTURE.md`. Проверить точный head PR, CI и `main`; если CI красный, исправить в feature-ветке, сохраняя закрытый список 159 старых модулей. **Лагерь не менять; merge/release — только отдельное разрешение**.
