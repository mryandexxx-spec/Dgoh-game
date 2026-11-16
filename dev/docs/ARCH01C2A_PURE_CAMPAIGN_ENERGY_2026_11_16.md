# ARCH-01C2a — единый чистый источник стоимости энергии кампаний

Дата: 16.11.2026. Старт из main release commit `e0781440c8dd6c5666011507c857f817fdb9ee2f` (версия источников v126, [release PR #137](https://github.com/mryandexxx-spec/Dgoh-game/pull/137) merged; Pages publication independently underway). [Architecture Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132), [C2 diagnostic Draft #138](https://github.com/mryandexxx-spec/Dgoh-game/pull/138).

## Один запретный импорт: 14 → 13

- `data/campaigns.js` перестаёт импортировать `BATTLE_WATER, CANDLE_COST` из `logic/economy.js`, вместо этого читает неизменные значения **6 и 8** из нового чистого `data/campaign-energy.js`.
- `logic/economy.js` импортирует из тех же чистых данных и **сохраняет прежний публичный именованный export**, не дублируя объявления. Все остальные цены, формулы и экономические значения остаются прежними.
- `data/campaigns.js`: `NODES` seed и враги, `ghash/sRng`, `nodeOpen`, `nodeEn`, `nodeCost` и все массивы/миссии остаются идентичны, включая Rabban correction. Связи с `core/rng.js`, `core/state.js` и `story → assets/models` намеренно остаются для будущих C2b/c/d.
- Новая `data/campaign-energy.js` импортов не имеет; может инициализироваться раньше остальных без ESM/TDZ. Только один новый marker в SPLIT, **163 существующих до C2a сохраняют прежний относительный порядок**. Нельзя менять позиции старых модулей или ослаблять check-bundle.
- AST baseline удаляет ровно `data/campaigns.js -> logic/economy.js`: **14→13**; 0 new/stale.

## Предварительные результаты

[C2 diagnostic #138, CI #43922904964](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43922904964), production-equivalent *virtual* esbuild test: **169 ESM, 996 static, SCC=105/9, 0 unresolved; preserve legacy order = true, relocated 0, missing [], extra [], first none**. Никакие исходники в C2 diagnostic не менялись. Реальный C2a implementation CI должен ещё подтвердить placement 164-го нового маркера и полное равенство golden.

## Отдельные обязательные проверки для implementation PR

1. AST gate **13 existing, 0 new, 0 stale**; `check-bundle OK (164)`, все 163 старых маркера в прежнем порядке; старый публичный export `BATTLE_WATER/CANDLE_COST` не исчезает.
2. `tests/arch01c2a-energy.mjs` вызывается в обязательном build CI на **PWA и artifact**, проверяя конкретные цены и валюты **всех 210 миссий (70 L, 70 D, 70 C)**. `tests/ci/arch01c2a-campaign-energy.mjs` проверяет import graph, скрипты генерации NODES, Rabban override и чистоту модуля.
3. Полные golden 200 battles, meta (в том числе serialized NODES), saves, 41 screens; WebGL phone/desktop, PWA SW/offline, DOM/E3. Не обновлять golden, не отключать CI.
4. Строгий запрет менять **лагерь** (UI, 3D, зоны, кнопки, навигацию, стиль), Campaign 2.0 (21 карта и 210 миссий), RNG, баланс, награды, экономику, прогрессию, сохранения и арт. Версия v126, root PWA и SW в этом PR не меняются.
5. Этот PR — **Draft**, merge/publish только после нового явного согласования владельца. C2b/c/d готовить отдельно по результатам.

## Handoff

При сбое check-bundle: выяснить фактическую позицию **только нового** чистого модуля, корректировать только его marker; нельзя переписывать SPLIT под перестановку прежних 163. При runtime divergence / изменении NODES — блокировать PR, восстановить побитовую совместимость до приёмки.
