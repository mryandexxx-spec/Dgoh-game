# Dune GoH · передача контекста после v125 / старт ARCH-01C

**Дата фиксации:** 16.11.2026. **Источник правды:** [`mryandexxx-spec/Dgoh-game`](https://github.com/mryandexxx-spec/Dgoh-game), `main`. **Контрольный main HEAD перед документационной фиксацией:** `fe9c76b5da63d7b322ac964c7b0b9051103065c0`; перед каждым новым действием запросить HEAD заново.

Это оперативный документ для нового чата. **Не нужно восстанавливать контекст из прошлой переписки** — всё ниже и в указанных Issues/PR. Этот документ и связанная Issue — только фиксация знаний/ТЗ: **никаких изменений игрового кода, merge игрового PR или публикации нет**.

## 1. Текущее подтверждённое состояние

- Продукт: браузерная мобильная RPG **«Дюна: Герои великих домов»**, SWGOH-подобный прогресс, целевая платформа **iPhone PWA Safari/WebKit landscape**, desktop вторичен.
- Публичная PWA: [GitHub Pages](https://mryandexxx-spec.github.io/Dgoh-game/). **Опубликована v125**, `dev/version.json = {"v":125}`, опубликованный root `sw.js` содержит `const VER = '98ada878d4'`. Проверенный production root commit `c40d4de2c37a185391abaf559c96a53fd7b74dc7`. Последующий docs-only cleanup в `main` `fe9c76b5da63d7b322ac964c7b0b9051103065c0` не менял PWA root и версию.
- Подтверждения: [implementation PR #129 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/129), [implementation CI SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43844594742); [release PR #130 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/130), [release CI SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43860599963), [official validated publish SUCCESS (20 jobs)](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43861743411), [независимый Pages deployment SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43862770350), [docs cleanup PR #131 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/131), [post-cleanup CI SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43864518545).
- [Релизный handoff v125](ARCH01B3_V125_RELEASE_HANDOFF_2026_11_16.md), [журнал](../CHANGES_STATUS.md), [дорожная карта](PRODUCT_AUDIT_ROADMAP_2026_11_16.md). Публикация **не** требует повторения. One-shot `.github/workflows/release-v125-once.yml` удалён.
- Campaign 2.0 завершена: **21 отдельная Babylon-карта / 210 миссий**, опубликованы к v123; не начинать её заново.
- **Физический Safari/iPhone v125 пока не проверен**: прогрев/перезапуск, профиль и опыт аккаунта, награды/повышение уровня, `CINE_OFF`, игровые экраны, WebGL MED/LOW, offline и сохранения. CI Chromium/SwiftShader не является этой проверкой.

## 2. Что выполнено в ARCH-01A/B (не переделывать)

| Этап | Результат и подтверждение |
|---|---|
| ARCH-01A | Acorn AST импортный gate, список 20 исторических исключений, [PR #122 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/122), [CI SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43810249915) |
| ARCH-01B1 | Удалён `logic/trials → ui/hero-window`, baseline 19; [PR #123 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/123) |
| ARCH-01B diagnosis | Esbuild/SCC-диагностика, исторически два больших цикла **102 и 9 модулей** при 164 модулях / 989 статических импортах на момент замера, [PR #124 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/124); текущие SCC **переснимать заново**, а не считать размеры неизменными |
| ARCH-01B2 | `logic/stats → ui/views/trials` удалён; чистый `logic/stat-counters.js`, UI-owned bootstrap, baseline 18, [PR #126 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/126), опубликовано в **v124** |
| ARCH-01B3 | `logic/account → ui/wiring` удалён; `logic/account-rules.js`, `logic/cinematic-preference.js`, экспортный адаптер `logic/account.js`, UI-owned bootstrap, baseline **17**, [PR #129 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/129), опубликовано в **v125** |
| Финальный порядок | В v125 строго `check-bundle OK (161)`; **все прежние 159 модулей** остаются в исходной последовательности, два новых чистых модуля добавлены. Нет новых запрещённых рёбер. |

**Важно:** отсутствие прямого `logic → ui` импорта **не означает устранение всех циклов ESM**. Исторические циклы продолжают существовать через зависимости `data → *`; механически менять `SPLIT` ради зелёного CI нельзя.

## 3. Единственный следующий архитектурный этап — ARCH-01C

**Задача:** [GitHub Issue #132 · ARCH-01C](https://github.com/mryandexxx-spec/Dgoh-game/issues/132). Связанные: [аудит #120](https://github.com/mryandexxx-spec/Dgoh-game/issues/120), [ARCH-01 #121](https://github.com/mryandexxx-spec/Dgoh-game/issues/121), [заключительный bootstrap #125](https://github.com/mryandexxx-spec/Dgoh-game/issues/125).

Источник точного списка: `dev/tools/arch-import-baseline.json`. **17 существующих запретных импортов по 7 файлам:**

| `dev/src/data/` | Текущее запрещённое направление | Кол-во |
|---|---|---:|
| `boss.js` | `logic/battle/skills.js` — order-only import, плюс top-level `CH.worm = WORM` | 1 |
| `campaigns.js` | `core/rng.js`, `core/state.js`, `logic/economy.js` — runtime и economy coupling | 3 |
| `conquest-data.js` | `core/state.js`, `logic/conquest.js`, `logic/economy.js`, `ui/overlays/celebrate.js` — в том числе order-only UI import | 4 |
| `cosmetics.js` | `assets/models.js`, `core/state.js`, `logic/progress.js`, `logic/stats.js` — в том числе order-only stats import; top-level подготовка `EMBLEMS.worm` | 4 |
| `journeys.js` | `core/state.js`, `logic/economy.js`, `logic/progress.js` — используется `prog`, `MAX_GEAR` | 3 |
| `looks.js` | `logic/battle/ai.js` — order-only import | 1 |
| `story.js` | `assets/models.js` — order-only import | 1 |
| **Итого** | **Нет `logic → ui`; только `data → logic/core/ui/assets`** | **17** |

**Опасные зоны:** `CH.worm = WORM` меняет реестр на верхнем уровне; `conquest-data` и `cosmetics` зависят от живых объектов `S` и UI; `campaigns` используется в 210 миссиях с энергией/случайностью; `journeys` от `prog`; `story` и `looks` имеют побочные order imports. Подтверждать все гипотезы по **фактическому import graph и top-level side effects**, не переносить семантические вычисления вслепую.

### Предлагаемая последовательность работ

1. **ARCH-01C0 — только диагностика/концепция.** В новом чате первым делом перечитать указанные документы, сделать **новый** AST/SCC граф по HEAD, карту 17 нарушений (тип зависимости, место первого потребления, top-level mutation/registration, ожидаемый порядок ESM), составить план 2–4 отдельных безопасных пакетов. Сначала проверить order-only links `story`, `looks`, `boss`, `conquest-data`, `cosmetics` *в виртуальном esbuild*, не удалять их напрямую. Подготовить понятную таблицу рисков и тестов для утверждения.
2. **ARCH-01C1 — первый минимальный пилот после согласования.** Только одна небольшая связка из 17, отдельная feature-ветка / Draft PR. Для каждого удалённого ребра — фактическая проверка импорта, уменьшение baseline, сохранение порядка `check-bundle` и проверка соответствующих бизнес-эффектов. Предпочесть перенос порядка инициализации на правильный `ui`/boot/logic уровень или выделение чистых данных. Не затрагивать весь слой сразу.
3. **ARCH-01C2/C3 — оставшиеся группы** по результатам пилота, с отдельными CI, обсуждением и разрешением на merge каждого пакета; следить за уменьшением SCC и сохранением геймплея.
4. **ARCH-01D — строгий нулевой режим** только когда baseline 0: включить постоянный `--strict` в CI, проверить golden, save, PWA, WebGL. Не включать `--strict` при ещё 17 исторических исключениях.

Критерии безопасности для любого пакета: `node tools/check-arch-imports.mjs` (0 новых/0 stale, убранные рёбра исчезли), `node tools/arch-init-graph.mjs`, строгий `node tools/check-bundle.mjs dist/pwa/app.js` (никаких необъяснённых перестановок 161 модулей), golden battles/meta/saves/41 screens, PWA update/offline, UI DOM, WebGL lifecycle при необходимости. Тесты нельзя отключать, эталоны golden нельзя переписывать ради прохождения. Доказательств недостаточно — пакет остаётся Draft.

## 4. Неприкосновенные решения владельца / процесс

- **ЛАГЕРЬ НЕ МЕНЯТЬ.** Нельзя менять UI лагеря, 3D-сцену, навигацию по зонам, расстановку элементов, кнопки, цвета и визуальный стиль, пока владелец отдельно не разрешит. Это фиксировано в Product Audit #120.
- Не менять Campaign 2.0 (21 карта / 210 миссий), экономические формулы и числа, награды, баланс, модель сохранений, героев, прогресс без отдельного согласования.
- Истина — `dev/src`, `dev/tools`, `dev/tests` (не собранный root). Корень `index.html`, `app.js`, `sw.js`, `assets` — только validated release. Не запускать заново `modularize.mjs`.
- **Перед любыми изменениями** прочитать `dev/ARCHITECTURE.md`, `dev/docs/PROJECT_INSTRUCTIONS.md`, раздел «Открыто» в `dev/CHANGES_STATUS.md`, [roadmap](PRODUCT_AUDIT_ROADMAP_2026_11_16.md) и [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132).
- Предлагаемый пакет → согласование владельца → feature-ветка + **Draft PR** → CI и приёмка → только по отдельной команде владельца **merge**, а **публикация** отдельно через подтверждённый release workflow. Текущая документационная фиксация **не разрешает** реализацию, merge игровой ветки или выпуск новой версии.
- Прочие будущие P0-направления: `ARCH-02` (сохранения/GameClock/RNG) и `ECON-01` (симуляция экономики) по roadmap. Без изменений баланса до модели.

## 5. Готовый промпт для следующего чата

> Продолжаем «Дюна: Герои великих домов» из GitHub `mryandexxx-spec/Dgoh-game`, ветка `main`. **Первым делом прочитай** [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132), [handoff ARCH-01C после v125](https://github.com/mryandexxx-spec/Dgoh-game/blob/main/dev/docs/ARCH01C_V125_NEXT_CHAT_HANDOFF_2026_11_16.md), [Issue #120](https://github.com/mryandexxx-spec/Dgoh-game/issues/120), [Issue #121](https://github.com/mryandexxx-spec/Dgoh-game/issues/121), `dev/ARCHITECTURE.md`, `dev/docs/PROJECT_INSTRUCTIONS.md`, раздел «Открыто» в `dev/CHANGES_STATUS.md`. Кампания 2.0 завершена, **v125 опубликована** (Pages `#43862770350` SUCCESS), SW `98ada878d4`, все предыдущие архитектурные PR и релизы слиты. `logic → ui` нарушений больше нет; **17 оставшихся `data → *` рёбер** перечислены в `dev/tools/arch-import-baseline.json`; текущий `check-bundle OK (161)`. **Задача: начать ARCH-01C0**, снять свежий граф зависимостей и ESM SCC, исследовать top-level side effects и подготовить конкретный безопасный план из 2–4 подэтапов для устранения 17 импортов с сохранением порядка модулей, совместимости, наград и сохранений. Покажи риски, затрагиваемые файлы, проверки и первый минимальный кандидат. **Не меняй лагерь ни при каких обстоятельствах без нового разрешения. Без merge и публикации. Не проси восстанавливать контекст, он в GitHub.**
