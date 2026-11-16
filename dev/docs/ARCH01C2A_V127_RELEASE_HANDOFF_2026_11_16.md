# ARCH-01C2a · v127: проверенный выпуск цены энергии кампании

Дата 16.11.2026. Владелец согласовал: **«Сливай выпускай»**. [ARCH-01C Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132), [implementation PR #139 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/139), commit `aa178ddea77d5f56b546a5f78f129b526ed9879c`.

## Неизменность игры
- Единственная устранённая обратная зависимость `data/campaigns.js → logic/economy.js`, baseline **14→13**, новых/устаревших 0; новый чистый `data/campaign-energy.js` хранит `BATTLE_WATER=6`, `CANDLE_COST=8`. `logic/economy.js` сохраняет прежние именованные экспорты.
- Никаких изменений RNG, `NODES`, `nodeOpen`, `nodeCost`, требований миссий, наград, числа 210, 21 WebGL карты, прогрессии, сохранений, UI и **лагеря** (3D, зоны, навигация, кнопки и стиль).
- [CI #43924649113](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43924649113) **SUCCESS 20/20**; AST 13 known/0 new/0 stale, **170 source ESM/997 static/2 SCC**, `check-bundle OK (164)`, **895 named exports/0 lost**; прежние 163 модуля сохранили порядок. **210/210 цен и валют миссий** PWA+artifact, golden 200 battles/meta/saves/41 screens, offline/SW, DOM/iPhone и 3D WebGL MED/LOW/HIGH lifecycle PASS.

## Предыдущая публикация v126 — подтверждена

- [Release PR #137 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/137), `e0781440c8dd6c5666011507c857f817fdb9ee2f`.
- [Official validated publish #43923353130 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43923353130) с успешным `Publish verified PWA to GitHub Pages`; [independent Pages #43936669378 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43936669378).
- Проверенный root после публикации v126 `84204f6ddaa895b51d674067f5d43f16cfd0d30b`, Service Worker `a621fd8b3a`; `dev/version.json` до этого релиза **126**.

## Контракт публикации v127 — fail closed

1. Ветку `release/arch01c2a-v127-validated-20261116` создавать от уже объединённого C2a. Релизные изменения: **только** версия `dev/version.json` **126→127**, запись в `CHANGES_STATUS.md`, данный handoff и `.github/workflows/release-v127-once.yml`. Не менять `dev/src`, golden, текущий baseline, SPLIT, графику или root PWA.
2. Релизный PR должен пройти **полный CI SUCCESS**. После успешного CI объединить squash **ровно с темой** `release(arch): publish v127`.
3. One-shot guard на `main` проверяет точный заголовок/версию, SW предыдущего root `a621fd8b3a`, baseline **13 data-only** без новых нарушений, чистые константы и тесты **210/210**, и вызывает `validate-pwa.yml` / `workflow_dispatch` `publish=true`.
4. Официальный validated workflow обязан успешно пройти обязательные checks/gate, receipt/SHA-256, `ci-current-main`, точный staging проверенных PWA bytes и `actions/deploy-pages`. Отдельно проверить independent Pages deploy нового root SHA. **Нельзя объявлять v127 опубликованной до этих доказательств**.
5. После публикации обновить issue #132, handoff и журнал точными ID, хешем SW, root SHA и разрешённым docs-only cleanup удаляющим одноразовый guard, без повторного dispatch.

## Физическая проверка Safari/iPhone (открыта)

Обновление v126→127, холодная/тёплая загрузка, выбор обычной миссии и Хроник (цены 6/8), 210 миссий и условия доступа, 3D MED/LOW, offline/SW, корректная загрузка/сохранение/перезапуск. Chromium/SwiftShader CI не заменяет физическое тестирование. **Лагерь не изменён.**

## Фактическая публикация и доказательства

**v127 ОПУБЛИКОВАНА 16.11.2026.** Владелец разрешил merge и release. Ни одна игровая таблица или сцена не изменилась после implementation PR.

- [Implementation PR #139 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/139), `aa178ddea77d5f56b546a5f78f129b526ed9879c`; [implementation CI #43924649113 SUCCESS (20/20)](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43924649113).
- [Release PR #140 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/140), exact subject `release(arch): publish v127`, `13560a406294ddd46ddb418b1d6cf5f685699116`. [Full release candidate CI #43938677491 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43938677491); [merged-main CI #43939965114 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43939965114).
- [One-shot guard #43939965471 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43939965471), проверил v127, SW v126 `a621fd8b3a`, baseline 13 и импорт констант, вызвал официальный `publish=true` **ровно один раз**.
- [Официальная проверка/публикация #43940045974 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43940045974): обязательный gate SUCCESS, SHA-256 manifest/receipt, exact artifact verification, `ci-current-main`, `Publish verified PWA to GitHub Pages` SUCCESS, точная синхронизация root. SHA нового корня **`587a6841948da4ebde50acde5220e20c685a17dc`**, опубликован `dev/version.json={"v":127}`, новый SW VER **`2e36ce669d`**.
- [Независимый Pages #43941666436 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43941666436) именно на production root `587a684`. Публичная страница: https://mryandexxx-spec.github.io/Dgoh-game/.
- Сохранение контекста: [ARCH-01C Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132), эта запись и `dev/CHANGES_STATUS.md`. One-shot `release-v127-once.yml` и прежний `release-v126-once.yml` удаляются после подтверждённого выпуска в docs-only PR; **новый publish не требуется**.

**Открыто:** физический Safari/iPhone v127 не подтверждён; требуется проверить лагерь без изменений, запуск/обновление SW, 210 миссий, 6/8 валют, MED/LOW, offline, сейвы и перезапуск. Остаток архитектурного baseline — **13**; продолжение ARCH-01C2b/c/d только отдельными этапами.
