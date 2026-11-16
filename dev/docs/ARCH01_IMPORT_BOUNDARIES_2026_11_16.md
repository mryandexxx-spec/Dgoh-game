# ARCH-01 — барьер архитектурных импортов, этап 1

**Дата:** 2026-11-16. **База:** `main` / v123 (`c2dffcb` на старте). **Общий аудит:** [Issue #120](https://github.com/mryandexxx-spec/Dgoh-game/issues/120). **Рабочая задача:** [Issue #121](https://github.com/mryandexxx-spec/Dgoh-game/issues/121).

**Статус:** первый изолированный технический шаг, без обновления игрового кода, лагера, версии, экономики, сохранений или опубликованной PWA. Не считать ARCH-01 закрытым до удаления всех запрещённых импортов.

## Почему необходим

Действующий `tools/check-deps.mjs` ищет только форму `import { X } from '...'` и по умолчанию завершается кодом 0, даже если нарушения обнаружены. Он пропускает side-effect `import '...'`, re-export и другие формы. В `.github/workflows/validate-pwa.yml` применяется именно мягкий режим. Это не гарантирует соблюдение `dev/ARCHITECTURE.md §1` при новых доработках.

В коде v123 подтверждено **20 рёбер обратных импортов в 10 модулях**, включая side-effect импорты, влияющие на порядок исполнения. Нельзя просто удалить их без проверки связей инициализации или заменять фиктивными заглушками.

## Что включено в первый PR

- `tools/check-arch-imports.mjs`: Acorn AST для `ImportDeclaration`, `ExportNamedDeclaration`, `ExportAllDeclaration` и `ImportExpression`. Вход: `dev/src/{data,logic,core}/**/*.js`; путь вычисляется по модулю, а не строковым совпадениям.
- `tools/arch-import-baseline.json`: **точные 20** временно разрешённых существующих рёбер. Это реестр старого долга, **не растущий whitelist**. Любое новое запрещённое ребро завершает CI с ошибкой. Если старое ребро удалено, соответствующую запись необходимо удалить одновременно; stale baseline тоже ошибка. `--strict` падает при любом остаточном нарушении и будет обязательным только на заключительном шаге.
- `tests/ci/arch-imports.mjs`: тесты форм импорта, динамических зависимостей, false-positive из комментариев/строк, направлений слоёв, baseline/new/stale, ошибок парсера.
- `.github/workflows/validate-pwa.yml`: тесты и новая проверка после `npm ci` в задании build, до запуска build. Старый диагностический `check-deps.mjs` сохранён до расширения проверки на DOM/HTML.
- Лагерь — **абсолютно вне изменений**. Не менять его UI/3D/навигацию ни этим, ни последующими ARCH-01 пакетами.

## Исходный реестр запрещённых рёбер

Точные записи живут в `dev/tools/arch-import-baseline.json`, сгруппировано здесь для ревью:

| Исходный модуль | Запрещённый импорт | Штук |
|---|---|---:|
| `data/boss.js` | `logic/battle/skills.js` (side effect) | 1 |
| `data/campaigns.js` | `core/state.js`, `logic/economy.js`, `core/rng.js` | 3 |
| `data/conquest-data.js` | `logic/conquest.js`, `ui/overlays/celebrate.js` (side effect), `core/state.js`, `logic/economy.js` | 4 |
| `data/cosmetics.js` | `logic/stats.js` (side effect), `logic/progress.js`, `core/state.js`, `assets/models.js` | 4 |
| `data/journeys.js` | `logic/progress.js`, `core/state.js`, `logic/economy.js` | 3 |
| `data/looks.js` | `logic/battle/ai.js` (side effect) | 1 |
| `data/story.js` | `assets/models.js` | 1 |
| `logic/account.js` | `ui/wiring.js` (side effect) | 1 |
| `logic/stats.js` | `ui/views/trials.js` (side effect) | 1 |
| `logic/trials.js` | `ui/hero-window.js` (side effect) | 1 |
| **Всего** | | **20** |

`core/boot.js → ui/*` — явное **разрешённое исключение** из архитектуры (оркестрация старта). `core/dom.js` использует DOM по назначению и не входит в import-bans. Нельзя ошибочно смешать их с обратными импортами `data/logic → ui`.

**Ограничение этапа 1:** AST-gate проверяет **импорты** `data/logic/core`, не осуществляет автоматическое выявление HTML/DOM, глобальных циклов всех ESM-слоёв или динамических путей по значениям времени исполнения. Не-literal `import(expr)` в проверяемых слоях запрещён по умолчанию. Старый диагностический `check-deps` оставлен, отдельное усиление DOM/HTML и полный граф — часть следующего шага. Вся текущая импортная база должна пройти, иначе PR не считается готовым.

## Условия принятия

1. `cd dev && npm ci && node tests/ci/arch-imports.mjs && node tools/check-arch-imports.mjs` — тесты и gate возвращают 0 на существующей базе, отчёт показывает `20 existing, 0 new, 0 stale`.
2. Добавленный тестовый forbidden import (`logic → ui`, `data → logic`), side-effect или re-export вызывает FAIL без расширения baseline. Удаление старого импорта без правки baseline — FAIL.
3. `node tools/check-arch-imports.mjs --strict` до полной очистки ожидаемо FAIL — это не релизный gate первого PR.
4. Стандартный PR CI с реальной сборкой/контрактами выполняется без регрессий. Версия `dev/version.json` остаётся v123; `src/`, `dist/` и root published PWA не изменяются.
5. PR открывается как Draft. Merge и публикация только после отдельного разрешения владельца.

## Следующие отдельные ARCH-01 шаги

1. **ARCH-01B — `logic → ui`**: устранить циклические side-effect импорты `logic/account.js`, `logic/stats.js`, `logic/trials.js`; вынести порядок загрузки в composition root/boot (предварительно проверить `split.config.mjs` и bundle). При фиксировании каждого ребра уменьшать baseline.
2. **ARCH-01C — `data → logic/core/ui/assets`**: сначала относительно простые `boss`, `looks`, `story`, затем `cosmetics`, `journeys`, `campaigns`, `conquest-data`. Проверять, что перенесённые зависимости не меняют генерацию кампаний, состояние Джихада и награды.
3. **ARCH-01D — расширение gate**: проверять запрещённые зависимости `render2d/render3d`, используемые DOM/HTML/Babylon API в `data/logic`, циклы и side-effect bootstrap ordering. Удалить все записи baseline; перейти на `--strict` в CI.
4. Только после этих шагов отмечать ARCH-01 выполненным в [дорожной карте](PRODUCT_AUDIT_ROADMAP_2026_11_16.md) и [Issue #121](https://github.com/mryandexxx-spec/Dgoh-game/issues/121).

## Для продолжения в новом чате

Прочитать сначала Issue #120 → Issue #121 → этот файл → `dev/ARCHITECTURE.md` и `dev/CHANGES_STATUS.md`. Проверить статус Draft PR ARCH-01 и его CI. **Лагерь не менять**. Работать на отдельной ветке, не сливать и не выпускать без новой явной команды пользователя.
