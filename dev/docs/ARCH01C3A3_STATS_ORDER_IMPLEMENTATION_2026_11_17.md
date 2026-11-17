# ARCH-01C3a3 — feats/stats order boundary · implementation Draft

**Дата:** 17.11.2026. **Выпущенная база:** v128, root `73b60eef17b01ee371d58a549f4ab6beb9447682`, SW `0437419c76`, verified publish [CI #44024295063](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44024295063) и independent [Pages #44025945489](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44025945489). [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132).

## Результат предреализационного virtual esbuild

В диагностической ветке [Draft PR #148](https://github.com/mryandexxx-spec/Dgoh-game/pull/148) обязательный CI [run #44027572147](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44027572147) проверил 27 кандидатов на неизменённой игре, 167 исходных маркеров и 173 JS, две прежние SCC, baseline 8.

- Прямое удаление `data/cosmetics.js → logic/stats.js` переставляет **2** маркера (stats и cosmetics). NO-GO.
- Два безопасных варианта `moved=0,missing=[],extra=[]`: поменять порядок двух *существующих* named импортов в `ui/views/feats.js` либо добавить отдельный side-effect import перед cosmetics.
- Выбран **swap двух уже существующих named импортов** без добавления ни одного import: `METRIC` из `logic/stats.js` перед `EMBLEMS, FRAMES, TITLES` из `data/cosmetics.js`, но после существующего первого `import './trials.js'`. Это сохраняет **167/167** предыдущих ESM-маркеров и контролируемый порядок `trials → stats → cosmetics → feats`. Реальный runtime / TDZ требует отдельного CI подтверждения.

## Применённый минимальный diff

1. `src/data/cosmetics.js`: удалён *только* `import '../logic/stats.js'; // порядок исполнения`. Таблицы, API `unlocked()`, SVG и фон не менялись.
2. `src/ui/views/feats.js`: переставлены только два существующих static import объявления; исходный код `FEATS`, `METRIC` и все reward/claim handlers прежние.
3. `tools/arch-import-baseline.json`: удалено ровно одно теперь реально отсутствующее запрещённое ребро, baseline **8→7**. Другая семёрка и C2d `story→assets/models` остаются.
4. Обновлены обязательные регрессии C3a1/C3a2 для нового строгого baseline и добавлен AST/ordering C3a3 gate; подключён из существующего `tests/ci/arch-init-graph.mjs`. `SPLIT` и `check-bundle` без изменений.

## Строгие критерии для приёмки

- На **реальном PWA и artifact** три прежних SHA-256 must match: cosmetics entitlement `d451f070fde45c721f379161fe3bc8fbd1d29b9649964957ec31591c8e912a55`; SVG каталог `64a85568c392122adf50284fde0d2f83e1cf82ec667571808b93710d69b48dd8`; HTML червя/профиля `737995ab60dc152a2b39a4fa6002114aef1b45c9cc123396edb0bd491f52cde2`.
- Полный 210 NODES digest `b33150786a9b8c17abc60a9c1df1b40019ab9f6b6335a0c6d3287837d9beaa48`, 4096 RNG, 200 battles/meta/saves/41 screens: unchanged.
- AST baseline **7 / 0 new / 0 stale**, 173 JS, две исторические SCC, strict `check-bundle OK (167)` со всеми прежними marker позициями и без потерь named exports. E3 DOM iPhone, offline/SW, WebGL/3D phone MED/LOW, desktop HIGH, цикл ресурсов — PASS.
- **Лагерь** (UI/3D/стили/зоны/кнопки/навигация), Campaign 2.0 (21 карта/210 миссий), баланс, экономика, saves, профиль SVG и все ассеты не меняются. Никаких golden update и релизного version bump.

**СТАТУС:** implementation Draft, без merge и release до отдельного решения владельца. Safari/iPhone физически не проверен. C2d остаётся NO-GO.
