# ARCH-01B2 · v124 validated release handoff

Дата: 16.11.2026. Владелец прямо разрешил **«Сливай, выпускай»** после полного зелёного CI для [implementation PR #126](https://github.com/mryandexxx-spec/Dgoh-game/pull/126).

## Объём релиза

- Первый прикладной шаг в [Issue #125](https://github.com/mryandexxx-spec/Dgoh-game/issues/125): `logic/stats.js` больше не импортирует `ui/views/trials.js` ради порядка исполнения.
- `statInc` вынесен в чистый модуль `logic/stat-counters.js`. UI-потребители и `logic/conquest.js` используют чистые функции, UI сам задаёт порядок импорта экрана испытаний.
- Список исторических нарушений ARCH-01 сократился **с 19 до 18**, без новых исключений. [Implementation CI #43818967913](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43818967913): **SUCCESS** 19 успешных checks, 1 ожидаемый skip; `check-bundle OK (159)`, все прежние 158 модулей сохранили точную последовательность.
- **Не изменялись:** лагерь и навигация, 3D, Campaign 2.0, 210 миссий, балансы, награды, сохранения, economy, визуальный UI. Оставшийся `logic/account.js → ui/wiring.js` требует отдельного безопасного проекта и не входит в v124.

## Release route — fail closed, только подтверждённая сборка

1. Рабочий [PR #126](https://github.com/mryandexxx-spec/Dgoh-game/pull/126) слит обычным merge: `06bc19d160bf247420495add4892adb12392d159`. На исходном main `dev/version.json={"v":123}`, опубликованная PWA root использует `const VER = '4d27cefa0a'` в `sw.js`.
2. Release branch `release/arch01b2-v124-validated-20261116` с ограниченным diff: `dev/version.json` **123→124**, запись в `CHANGES_STATUS.md`, этот handoff и одноразовый `.github/workflows/release-v124-once.yml`. **Исходники игры не менять в release PR.**
3. Проверить release PR required CI **SUCCESS** (golden/meta/saves, PWA/update, bundle, campaign/WebGL как требует planner). **Squash merge** release PR только с subject `release(arch): publish v124` после CI SUCCESS.
4. Одноразовый guard на точный push merge в `main`, проверяет `version.json=124`, прошлый SW cache `4d27cefa0a`, наличие pure statInc и `ARCH-01` baseline **18**, отсутствие `logic/stats → UI`, ожидаемый предмет релиза, после чего через `gh api` отправляет **единственный** официальный `workflow_dispatch` `validate-pwa.yml` с `publish=true` (только `main`).
5. Официальный validated workflow обязан пройти required checks/gate, `ci-artifact.mjs verify` SHA-256, `ci-current-main.mjs` и `ci-artifact.mjs stage`, затем точную синхронизацию проверенной PWA из `dist/pwa` в root и успешное `actions/deploy-pages`. **До проверки итогового Pages deployment SUCCESS нельзя объявлять релиз опубликованным.**
6. После подтверждения: дописать реальные run IDs, версии SW, artifact hashes, Pages root SHA в этот handoff и журнал, удалить одноразовый guard через docs-only cleanup PR. Не отправлять `publish=true` повторно.

## iPhone acceptance (не подтверждено CI)

Safari iPhone PWA landscape MED/LOW: update/offline, холодный/тёплый старт, испытания и мультисимуляция, подвиги, рейд, бой/автобой и статистика побед, Джихад, профиль, экспорт/импорт сохранений, сохранение прогресса при перезапуске. Проверка на физическом устройстве остаётся за владельцем.

## Фактическая публикация v124 — подтверждена

**v124 ОПУБЛИКОВАНА 16.11.2026.** Владелец одобрил слияние и выпуск («Сливай, выпускай»). Проверены официальный validated workflow, точная синхронизация файлов в root, новый SW и независимый Pages deployment на том же опубликованном root SHA.

- [Implementation PR #126 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/126), merge `06bc19d160bf247420495add4892adb12392d159`, [полный implementation CI #43818967913 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43818967913).
- [Release PR #127 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/127), exact squash `6193f7f0001e1fa16ea409baac344788677284a8`, subject `release(arch): publish v124`, [release CI #43834630691 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43834630691).
- [Main CI #43835748130 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43835748130), [owner-approved one-shot guard #43835748139 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43835748139) — отправил единичный `workflow_dispatch publish=true`.
- [Официальный validated publish #43835795893 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43835795893): **20 SUCCESS**, включая `All required checks passed` и `Publish verified PWA to GitHub Pages`. Build+tests+SHA-256 rehearsal, staged exact verified files и синхронизация root.
- [Validation receipt](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43835795893/artifacts/14210568663), [verified production build](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43835795893/artifacts/14210861462), [Pages upload artifact](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43835795893/artifacts/14211166941).
- Опубликованный root SHA `3a311fced03807a9c6ee7c7d1a1e537de56a0dbb`, `dev/version.json={"v":124}`, root `sw.js: const VER = 'a8637003e4'` (предыдущий v123: `4d27cefa0a`).
- [Независимый Pages deployment #43836819965 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43836819965) на **точном root SHA `3a311fce`**. Production: https://mryandexxx-spec.github.io/Dgoh-game/.
- Выпуск не затрагивает лагерь, 3D, Campaign 2.0, экономику, сохранения и баланс. Разрыв `logic/stats → ui` принят, но `logic/account → ui` остаётся открытым в Issue #125.

После подтверждённой публикации одноразовый `.github/workflows/release-v124-once.yml` удалён отдельным docs-only cleanup PR (заполнить ссылку по факту). Второй `publish=true` не запускать.

## Приёмка на физическом iPhone ещё требуется

Safari/PWA landscape MED/LOW: обновление v123→v124, cold/warm start, испытания/мультисимуляция, подвиги, бой/автобой, статистика побед, Джихад, профиль, сохранения, offline/SW. CI Chromium/SwiftShader не является проверкой физического iPhone.
