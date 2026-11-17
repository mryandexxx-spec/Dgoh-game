# ARCH-01C3b2 — точка продолжения после опубликованной v130

**Дата:** 17.11.2026 · **Ведущий трекер:** [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132) · **Репозиторий:** https://github.com/mryandexxx-spec/Dgoh-game · **ветка:** `main`.

## С чего начинать новый чат

Прочитать сперва: [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132), этот файл, [v130 release receipt](ARCH01C3B1_V130_RELEASE_HANDOFF_2026_11_17.md), `dev/ARCHITECTURE.md`, `dev/docs/PROJECT_INSTRUCTIONS.md`, `dev/CHANGES_STATUS.md`, [roadmap](PRODUCT_AUDIT_ROADMAP_2026_11_16.md), затем действующие файлы `dev/src/data/conquest-data.js`, `dev/src/logic/conquest.js`, `dev/src/core/state.js`, `dev/src/ui/views/conq.js`, `dev/src/ui/overlays/celebrate.js`, `dev/tools/arch-import-baseline.json`, `dev/tools/arch-init-graph.mjs`, `dev/tools/split.config.mjs`, `dev/tests/ci/arch-init-graph.mjs` и старые тесты C3b0/C3b1 (диагностические тесты C3b0 находятся в отдельном Draft PR #152). Сверить **фактический `main`**, не исходить из устаревшего SHA в промте.

## Точно подтверждено на 17.11.2026

**v130 опубликована:** [implementation PR #153 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/153) `defb01e5189323f43b59195cee3eb8683532040e`, [v129 docs #154 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/154) `68b8d138e7f609fb410f8bc9b76bc884a666fb34`, [release PR #155 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/155) `d60b6c0cfe7ae83b9effee802e3cb18c521a8d3c`. [Release PR CI #44049267112 SUCCESS, первая попытка](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44049267112), [однократный guard #44050416577 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44050416577), [официальный validated publish #44050433689 SUCCESS, первая попытка](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44050433689), [независимый Pages #44051694332 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44051694332). Корневой опубликованный SHA `4297132fe9fc9deee00445f2580a6d265959c9ba`, `dev/version.json={"v":130}`, `sw.js VER='f97ab7c7da'`. 188 SHA-256 файлов, побайтно тот же verified artifact. Ссылка: https://mryandexxx-spec.github.io/Dgoh-game/.

**Выполнено ARCH-01C3b1:** удалено **одно** ребро `data/conquest-data.js → logic/economy.js`: два исходных расчёта `cqRfN/cqRfCost` перенесены с неизменёнными телами в `logic/conquest.js` и переадресованы именованные импорты UI. [Implementation CI #44036957180 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44036957180). Сохранены 21 цена пополнения, локальный дневной reset, `S.cqRf`, уведомления `NOTES`, достижения/баллы, сохранения и все старые golden. Архитектура теперь **6 прежних запретных рёбер, новых 0, устаревших 0**; 173 JS / **167/167 старых ESM-маркеров в точном порядке** / 898 именованных экспортов / две прежние SCC, Conquest в SCC из 106 модулей. Исходно было 17 архитектурных нарушений.

**Шесть оставшихся рёбер (сверить AST по `main`, не брать на веру):**

```
data/boss.js -> logic/battle/skills.js
data/conquest-data.js -> core/state.js
data/conquest-data.js -> logic/conquest.js
data/conquest-data.js -> ui/overlays/celebrate.js
data/looks.js -> logic/battle/ai.js
data/story.js -> assets/models.js
```

## Цель этапа ARCH-01C3b2

**Этап A — read-only диагностика и безопасное архитектурное проектирование**, а не рефакторинг с ходу. Исследовать оставшиеся **живые** связи Conquest data→runtime: `core/state.js` (`NOTES,S`) и `logic/conquest.js` (`cq`, цикл с обратным `logic/conquest.js → data/conquest-data.js`). Выяснить все места использования `cqK`, `cqScore`, `cqBump`, `cqFeats`, `cqRfN`, `cqRfCost` и циклическую раннюю инициализацию/TDZ. Разделить неизменяемые таблицы дисков/фитов/боссов и динамические действия/уведомления/состояние. Определить наименьший функциональный перенос (в существующий `logic/` или явную композицию), при котором **ни один** прежний ESM-маркер не смещается, не меняются игры/награды/уведомления и не появляется новый цикл. **Не предполагать, что 6→5 возможно**, пока не получено виртуальное доказательство.

1. Сделать независимую AST-карту цепочек `Conquest data ↔ logic ↔ core/state ↔ UI`, top-level функций, 106-модульной SCC и точного порядка lazy/eager инициализации.
2. В отдельной diagnostic feature-ветке/Draft PR добавить **только in-memory esbuild virtual matrix** с *настоящими* production options, моделью потенциального размещения живых вычислений в существующих модулях и проверкой всех **167 прежних `SPLIT` markers**. Ни один вывод `GO` без `moved=0, missing=[], extra=[]`, прежних SCC/TDZ, 898 публичных имён и сохранения import API.
3. Обязательно отдельно рассмотреть, как `NOTES.push` внутри `cqBump` влияет на слой `data`, как `S.conq` использует `cqScore`, и насколько перенос совместим с `logic/conquest` и `ui/views/conq`. Подготовить тесты исходного поведения fresh/loaded save, смены недели, очков/наград/фитов, мутаций `S`, нотификаций, покупок/пополнения и открытий маршрутов. Ранее доказанные цены/формулы из C3b1 не менять.
4. После диагностического CI представить владельцу результаты **GO/NO-GO**, минимальное изменение ownership, потенциальную стоимость тестирования/риски, отдельно проект реализации Stage B. Только при доказанном GO — implementation в новой ветке/отдельном Draft PR и полный реальный CI на PWA и artifact; архитектурный baseline **6→5** строго вместе с удалением реального импорта. **Не сливать и не публиковать без отдельного разрешения владельца.**
5. Если C3b2 NO-GO, зафиксировать блокер и предложить следующий независимый безопасный кандидат из `boss`/ `looks`; не переписывать `SPLIT` и не отключать gate ради искусственной очистки.

## Известные заблокированные пути

[Draft PR #152](https://github.com/mryandexxx-spec/Dgoh-game/pull/152) + [CI #44036071756 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44036071756): **Conquest `data→ui/overlays/celebrate` = NO-GO 0 из 35** виртуальных попыток убрать/перенести side-effect импорт (лучший вариант **47**, прямое удаление **162** сдвинутых модуля). Этот импорт с комментарием `// порядок исполнения` сохранять. [Draft PR #144](https://github.com/mryandexxx-spec/Dgoh-game/pull/144), C2d `data/story→assets/models`: **NO-GO 39/39**, меняется порядок 3D-загрузчика `b3Pre(loadAssets3)`; не удалять напрямую. Старые диагностические Draft PR #148/#144/#138/#134 не предназначены для слияния.

## Неизменяемые регрессии и scope lock

**ЛАГЕРЬ ЦЕЛИКОМ НЕ ТРОГАТЬ** без отдельного указания владельца: `ui/views/lobby.js`, `styles/lobby.css`, `render3d/scenes/camp.js`, его 3D-вид, навигацию, кнопки, размещение зон, бюджет кадра. **Campaign 2.0 — 21 отдельная 3D-карта и 210 миссий** — неизменны. Не менять 3D загрузчик, экономику, награды, шансы дисков, XP/снаряжение, локальные save, схему/миграции, UI/стили, goldens, `SPLIT`, PWA/offline/SW/версию без согласования.

Строгое подтверждение: 210 миссий NODES SHA `b33150786a9b8c17abc60a9c1df1b40019ab9f6b6335a0c6d3287837d9beaa48`; права косметики SHA `d451f070fde45c721f379161fe3bc8fbd1d29b9649964957ec31591c8e912a55`; каталог/SVG SHA `64a85568c392122adf50284fde0d2f83e1cf82ec667571808b93710d69b48dd8`; профиль/червь HTML SHA `737995ab60dc152a2b39a4fa6002114aef1b45c9cc123396edb0bd491f52cde2`. Golden 200 боёв/meta/saves/41 screens PWA+artifact, 4096 RNG, PWA SW update/offline, E3 iPhone DOM, мобильный/desktop WebGL MED/LOW/HIGH, idle/resource lifecycle без регрессий.

**Открыта физическая iPhone Safari-приёмка v130** (после обновления v129→v130, холодный/тёплый PWA/offline, сохранения, ежедневное пополнение Джихада, недельный переход/фиты, кампании и лагерь, WebGL MED/LOW). Не выдавать CI-эмуляцию за реальное устройство.

**Послерелизная техническая уборка:** одноразовый `.github/workflows/release-v130-once.yml` используется только для уже завершённого v130 выпуска; по запросу сохранения контекста 17.11.2026 подготовлена docs-only очистка. Её PR/merge/CI уточнить по Issue #132 перед стартом нового этапа. Эта уборка **не новая v131** и не новая публикация.

## Требование к продолжению

В новом чате не просить восстановить сведения вручную. Сначала выполнить чтение GitHub, проверить `main`, восстановить успешные CI и незакрытые NO-GO, затем начать C3b2 Stage A. Отчёт и план возвращать в Issue #132 и отдельный диагностический Draft PR; до решения владельца **не сливать и не выпускать**.
