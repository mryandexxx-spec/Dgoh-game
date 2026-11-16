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

## Релизные подтверждения

- Implementation PR #126 MERGED: `06bc19d1`, full [CI #43818967913 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43818967913).
- Release PR: **pending**.
- Release CI: **pending**.
- Main CI и одноразовый dispatch guard: **pending**.
- Official verified publication / receipt / root sync / Pages: **pending**, пока опубликована **v123**.
