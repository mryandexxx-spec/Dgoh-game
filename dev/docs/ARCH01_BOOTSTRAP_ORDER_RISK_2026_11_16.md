# ARCH-01B — риск связанного порядка инициализации ESM

**Дата:** 16.11.2026. **Проект:** [аудит #120](https://github.com/mryandexxx-spec/Dgoh-game/issues/120), [ARCH-01 #121](https://github.com/mryandexxx-spec/Dgoh-game/issues/121), [первичный AST gate #122](https://github.com/mryandexxx-spec/Dgoh-game/pull/122), [первое удаление #123](https://github.com/mryandexxx-spec/Dgoh-game/pull/123).

## Критический вывод

Существующая сборка `dev/src/main.js` через `src/boot.js` использует импорт предшественника как **неявный порядок исполнения** бывшего монолита. Часть старых нарушений направления `logic → ui` является не только обратной зависимостью, но и звеном этой последовательности. Исключение отдельных звеньев изменяет порядок исполнения большого числа других модулей, даже если сами изменяемые модули содержат только константы и функции.

**Запрещено «исправлять» такой FAIL, механически переписывая `tools/split.config.mjs` под новую произвольную перестановку.** Нужно прежде определить все top-level side effects, циклические зависимости и фазу UI-инициализации, затем доказывать эквивалентность наблюдаемого поведения.

Обязательное решение владельца: **лагерь и навигацию лагеря не менять**. Работать отдельно от Campaign 2.0 и баланса; без самовольного merge/release.

## Проверенные эксперименты и их итог

| Сценарий | CI | Наблюдение | Решение |
|---|---|---|---|
| ARCH-01A: AST gate и baseline из 20 | [#43810249915](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43810249915) | **SUCCESS** | Сохранён как Draft #122 |
| ARCH-01B1: `logic/trials.js → ui/hero-window.js` | [#43811543605](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43811543605) | **SUCCESS** после явного переноса pure `trials.js` в `SPLIT`, золотые и браузерные сценарии в CI | Сохранён как Draft #123 |
| Совместное удаление `logic/stats` и `logic/account` → UI | [#43812334084](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43812334084) | **FAIL `check-bundle`**; `logic/trials.js`, `logic/stats.js`, `data/cosmetics.js` уходят к началу, `ui/wiring.js` тоже значительно раньше | Не принимать |
| Только `logic/stats.js → ui/views/trials.js` | [#43812711946](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43812711946) | **FAIL `check-bundle`**: существенно меняется глобальная последовательность, в т. ч. ранняя инициализация частей battle/* | Не принимать |
| Только `logic/account.js → ui/wiring.js` | [#43812955788](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43812955788) | **FAIL `check-bundle`**: перед `data/fx.js` оказываются `logic/daily.js`, `core/dom.js`, `core/rng.js` | Не принимать |

Вывод касается **конкретного удаления импортов в этих экспериментальных ветках**, а не доказывает, что исправление невозможно. Неуспешные кандидаты **откачены** в рабочем Draft PR #124; `logic/stats.js`, `logic/account.js`, `arch-import-baseline.json` снова идентичны PR #123. Текущее число старых reverse-imports = **19**.

Весь функциональный код игры и лагеря, опубликованная PWA и `dev/version.json` остаются неизменными относительно v123.

## Инструментальная опора для следующих этапов

- `dev/tools/check-arch-imports.mjs` — блокирует появление новых рёбер, без скрытых исключений. До очистки baseline временно содержит 19 нарушений.
- `dev/tools/check-bundle.mjs` — сохраняет требование полного порядка всех модулей; при любых изменениях bootstrap не ослаблять gate.
- `dev/tools/arch-init-graph.mjs` — новая **read-only** диагностика графа статических ESM import/export, Tarjan SCC, количества циклов и входящих в них рёбер; динамические literal imports учитываются отдельно, не образуют синхронный init-cycle. Доступен `--json` для анализа.
- `dev/tests/ci/arch-init-graph.mjs` — тесты детерминированной проверки SCC и корректного разбора AST.
- CI запускает диагностику после `npm ci` в build, **пока без gate на число уже существующих SCC**. Никаких изменений в схеме save, boot, UI, графических настройках.

## План безопасной развязки двух оставшихся `logic → ui`

### ARCH-01B2 — доказуемая архитектура bootstrap (следующий дизайн-этап)

1. Зафиксировать фактический ESM-граф, все SCC с `logic/stats.js`, `logic/account.js`, `ui/wiring.js`, `ui/views/trials.js`; отдельно выявить top-level side effects: регистрацию обработчиков, обновление `SPOT_ICONS`, ресурсы, состояние.
2. Описать явную **composition root** оркестрацию внутри `core/boot`/UI bootstrap, не вводя новых направлений `data/logic → ui`. Порядок выполнения перенести из обратных импортов в разрешённый слой без изменения контрактов UI-хуков.
3. Написать регрессионные тесты «старый → новый» на инициализацию, события, корректное определение feat/trial/account/rewards, отсутствие `ReferenceError`/TDZ; `check-bundle` либо сохранить прежний порядок, либо оформить контролируемое ограниченное изменение с доказанными инвариантами и отдельным ревью. Не менять весь `SPLIT` по факту одного red CI.
4. Подготовить **отдельный** implementation PR, поэтапно снять две старые записи baseline с 19 до 17, прогнать mandatory full CI, проверить cold/warm PWA и физический Safari iPhone.
5. Только после приёмки считать ARCH-01B закрытым. Остальные 17 рёбер `data → logic/core/ui/assets` — ARCH-01C, независимый сложный этап.

### ARCH-01B3 — критерии выхода

- `tools/check-arch-imports.mjs`: 17 legacy / 0 new / 0 stale; `--strict` по-прежнему честно отмечает 17 старых нарушений до ARCH-01C.
- Детерминированный порядок и топология после bootstrap явно документированы; новые циклы не возникают.
- `tools/check-bundle.mjs`, golden battles/meta/saves, HTML/DOM, PWA update/offline и 3D lifecycle/A/B при затрагивании order проходят CI.
- Протокол отличий и замеров, реальное ручное iPhone acceptance; отдельное разрешение на merge/publish.

## Для нового чата

Прочитать #120 → #121 → #122/#123/#124 и этот документ, затем `dev/ARCHITECTURE.md`, `dev/docs/PROJECT_INSTRUCTIONS.md`, раздел «Открыто» `dev/CHANGES_STATUS.md`. Проверить статусы Draft/CI и актуальный `main`. **Не повторять слепое удаление импортов** `stats/account`: эксперименты документированы, прямое удаление вызывает масштабную перестановку ESM. Начать с анализа SCC и проекта явной оркестрации. **Лагерь не менять.** Никаких merge/release без отдельной команды владельца.
