# Campaign 2.0 · C4.13 «Годы в пустыне» — общий v116 release handoff (14.11.2026)

## Подтверждённые решения
- Художественный стиль «Кольцо пустой жатвы» и реальные WebGL MED 844×390 / LOW 667×375 принят владельцем («Ок»). Отдельно разрешён merge («Да») и выпуск («Выпускай»).
- [Issue #80](https://github.com/mryandexxx-spec/Dgoh-game/issues/80), [PR #81 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/81), source merge `d771041443fe0dd0453220c05689f70075b16275`, [PR CI #43640059135 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43640059135), [main CI #43640582918 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43640582918).
- Во время подготовки C4.13 параллельно принят и слит [roster PR #82](https://github.com/mryandexxx-spec/Dgoh-game/pull/82) с рамками ДП и легенд, затем [release PR #84 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/84) поднял версию `115→116` на `main=4731fdc5`. Его [main CI #43642311076 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43642311076). Повторно менять номер нельзя: v116 объединяет оба утверждённых изменения.
- Последняя **опубликованная** версия до специальной процедуры — v115 (root `sw.js` `VER='59b91969b0'`). Version bump и успешный обычный CI ещё не являются публикацией.

## Состав v116
- Светлая глава V `L:4`, **оригинальные 40–49**, уровни 31–42, отдельная статичная Babylon low-poly диорама фрименской войны, комбайнов, Кориолиса, Гурни, Воды жизни и финала Раббана; 14-е окружение Campaign20. Shared EngineHost/GameScene, MED/LOW, 2D fallback, камера v101, видимые 2–4 маркера 50/60px без обрезаний.
- Одобренные UI-рамки роста ДП (синие/красные/серебристые) и отдельное золотое кольцо легенд из PR #82; без новых бесконечных анимаций или ассетов.
- 210 NODES/ID, враги, сюжет, награды, экономика и сохранения не менялись.

## Строго контролируемая публикация
1. Не делать второй bump версии. [Publication PR #83](https://github.com/mryandexxx-spec/Dgoh-game/pull/83) изменяет только документы и добавляет один fail-closed `.github/workflows/release-v116-once.yml`.
2. На push squash merge с явным заголовком `release(campaign): publish v116` в `main`, одноразовый job проверяет `dev/version.json=116`, что корневой SW ещё от v115, и вызывает `workflow_dispatch` `validate-pwa.yml` с явным `publish=true` через GitHub Actions token с `actions: write`. Никакой иной push, даже release v117, его не активирует.
3. `Validate` в manual `publish=true` должен пройти полный plan/gate, checksum/verified build, затем `Publish verified PWA to GitHub Pages` — SUCCESS. После этого проверить Pages deployment SUCCESS на новом root publication SHA, `dev/version.json=116`, `app.js` содержит v116, новый SW VER и production URL https://mryandexxx-spec.github.io/Dgoh-game/.
4. Сохранить фактические SHA, CI run IDs и hash в Issue #80, обновить журнал/handoff и удалить `release-v116-once.yml`. Manual-only guard в основном Validate остаётся.

## Физическая Safari-приёмка
MED 844×390 и LOW 667×375 landscape, 40–49 свайп, pinch/twist/recenter, карточки миссий/бой/симуляция, 2D fallback, SW/offline и сохранения, отдельно мониторить FPS, нагрев и батарею 10–15 минут. Chromium/SwiftShader не заменяет физический замер.

## Статус

**v116 ОПУБЛИКОВАНА, Pages подтверждён.** Включает C4.13 (40–49) и утверждённые рамки ростера; исходные ID/награды/сохранения не менялись.

## Фактические доказательства выпуска v116

- [PR #83 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/83), [исправление одноразового YAML #85 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/85) `875867cd16c24aa7df2fb49422020257596d4e7f`.
- [Одноразовый dispatcher #43643541981 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43643541981) с явным `workflow_dispatch publish=true`.
- [Release CI #43643649804 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43643649804): `All required checks passed` и `Publish verified PWA to GitHub Pages` — SUCCESS; Golden, WebGL MED/LOW, PWA/offline, lifecycles и бюджеты пройдены.
- Корневой publication commit **`70a97c83dcc0d4ff689f58d253756d40f847284c`**, `dev/version.json=116`; реальный root `app.js` **`v116 · a2fe3534af`**, `sw.js` **`const VER = 'a2fe3534af'`**.
- [Отдельный Pages build and deployment #43644584536 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43644584536) на точном root SHA. Production: https://mryandexxx-spec.github.io/Dgoh-game/.
- Одноразовый `.github/workflows/release-v116-once.yml` после публикации удалён в cleanup PR; постоянный gate `workflow_dispatch publish=true` в Validate сохранён. На физическом iPhone Safari FPS, нагрев и батарея пока не измерены.
- Далее [C4.14 «Прибытие императора»](C4_14_AFTER_V116_HANDOFF_2026_11_15.md), художественный этап A.
