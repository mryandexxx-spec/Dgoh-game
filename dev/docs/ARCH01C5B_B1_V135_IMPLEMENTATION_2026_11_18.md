# ARCH-01C5b-B1 — реальная миграция Story → Models на composition root (v135)

**18 ноября 2026 · Реализация в Draft PR #186, без merge и без публикации.**

## Контекст и точное право
- Согласована выбранная в A2 архитектура: явный 3D asset bootstrap во внешнем `boot.js` и *контролируемая* миграция ESM-порядка, но не автоматическое слияние или выпуск.
- База: опубликованный `main 372d915fdd7f7b06fa5c3b23ce97b3a74dcf6753` / v135. Ветка `feature/arch01c5b-b1-explicit-asset-bootstrap-v135-20261118`, [Draft PR #186](https://github.com/mryandexxx-spec/Dgoh-game/pull/186). Отдельные A1 [#184](https://github.com/mryandexxx-spec/Dgoh-game/pull/184) и A2 [#185](https://github.com/mryandexxx-spec/Dgoh-game/pull/185) не слиты.
- Источники: Issue #132, [A2 исследование](https://github.com/mryandexxx-spec/Dgoh-game/blob/audit/arch01c5b-a2-asset-bootstrap-v135-20261118/dev/docs/ARCH01C5B_A2_ASSET_BOOTSTRAP_DESIGN_2026_11_18.md), [A2 контролируемая ESM миграция](https://github.com/mryandexxx-spec/Dgoh-game/blob/audit/arch01c5b-a2-asset-bootstrap-v135-20261118/dev/docs/ARCH01C5B_A2_CONTROLLED_ESM_MIGRATION_2026_11_18.md), `dev/ARCHITECTURE.md` и инструкция проекта.

## Истинно изменённый игровой код
1. `dev/src/data/story.js`: удалён **один** order-only `import '../assets/models.js';` — без изменения `STORY` и `BIOS`.
2. `dev/src/assets/models.js`: удалён **один** top-level вызов регистрации `b3Pre(loadAssets3)`. `MODEL_DATA`, URL map, DGM-парсер, KTX2, retry, Muad-Dib optional warmup и все exports сохранены. Исторический `import { b3Pre } from '../render3d/base.js'` пока намеренно сохранён как ESM-предшественник ради совпадения независимо утверждённого порядка; отдельное удаление не входит в этот B1.
3. `dev/src/boot.js`: именованные импорты `loadAssets3` и `b3Pre`, **ровно один** top-level `b3Pre(loadAssets3)` непосредственно перед `window.claude?.hot?.snapshot` и до обоих путей `start()` (синхронный и hot-ready).

Никаких других `dev/src/**` файлов, в частности `render3d/scenes/camp.js`, `render3d/base.js`, EngineHost, Campaign 2.0, графика, UI лагеря, экономика, схемы сейвов или golden не затронуты. Версия и публичный Pages root не изменены.

## Доказанное изменение графа

| Инвариант | v135 до B1 | Реальный кандидат B1 |
| --- | ---: | ---: |
| JS в src | 173 | **173** |
| Статических ESM imports | 1000 | **1001** |
| Dynamic imports | 0 | **0** |
| SCC | [105,6] | **[60,11,6,3]** |
| ESM-маркеры | 167 | **167; те же имена** |
| Перестановки в 167 позициях | 0 | **62** |
| Экспортируемые имена | 898 | **898** |
| Запрещённые data→* | 1 | **0** |
| Новые/устаревшие AST нарушения | 0/0 | **0/0** |

Оба полных ESM-порядка заморожены **до изменения игровых исходников**, виртуальный production esbuild preflight build в [CI #44280281688](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44280281688). Внесённый `SPLIT` строго равен этому snapshot, а не отрегулирован по зелёному CI. Отдельный [протокол предварительной аттестации с 62 точными перемещениями](ARCH01C5B_B1_ORDER_PREATTESTATION_2026_11_18.md): SHA-256 прежнего порядка `385d726d8a51d0b4b270dea36d1949e74ddeef360895d3ca536a285cdc621df3`, нового `8dfc01f4eec407a2b09bfc116fe299ad6a346c834156fcf805a71ca3d1652695`.

AST baseline `dev/tools/arch-import-baseline.json` изменён **1→0 только после реального удаления последнего ребра**. `check-deps --strict` и постоянный блокирующий ARCH-01D gate остаются отдельным последующим PR.

## Обязательный fail-closed regression contract
- Новый `tests/ci/arch01c5b-b1-real-bootstrap-contract.mjs` реконструирует исходные v135 `data/story.js`, `assets/models.js`, `boot.js` побайтно из текущих исходников и проверяет оригинальные Git SHA-1. С помощью настоящего esbuild проверяет **старый 167/1000/[105,6]** и **новый 167/1001/[60,11,6,3]** против двух независимых JSON snapshots (62 перемещения), 898 exports и 0 reverse data imports.
- Проверяет top-level AST: единственная регистрация теперь в `boot.js` и до `start`, ноль в `assets/models.js`; `MODEL_DATA` и асинхронный `loadB3()` с snapshot `B3_PRE` остаются на месте, hooks `onPersist` / `rewardHooks.unlock` сохранены.
- Исторические C1–C5a архитектурные тесты не выключены: актуализированы под новую SCC и baseline, отдельно восстановлены pre-B1 Conquest, boss, AI и v134/v135 ESM fingerprints. Защищённый `camp.js` привязан к неизменному оригинальному Git blob `83d05b1a76509c511286bbc2d3f4f020f61d84bb`.
- Дополнительно текущий PWA browser lifecycle test для cold/warm 844×390 и 667×375 проверяет **ровно одну** live ссылку `loadAssets3` в `B3_PRE`, 5 реально декодированных DGM, Babylon, отсутствие pageerror/TDZ, CELEB/NOTES, weekly unlock и сохранения. Эта дополнительная проверка включена после первого полного зелёного B1 CI; новый head CI ещё должен подтвердить её.

## Результаты реального CI и границы доказательств
- [**#44282485544**](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44282485544) на gameplay-source candidate `beb521a2233db540ee4417bbae0c8f16d60316a0`: **COMPLETED SUCCESS, attempt 1, 19 обязательных jobs + final gate SUCCESS; Pages SKIPPED.** Строгий check-bundle OK(167), AST 0 forbidden/0 new/0 stale, old/new ESM/SCC/API контракт PASS. Golden 200 battles/meta/4 saves/41 screens PWA+artifact, Conquest CELEB/NOTES, real 5 DGM, Campaign 210, PWA update/standalone/offline/fallback, Arena MED/LOW, Camp budgets и 3 EngineHost cycles desktop+phone — по обязательному CI SUCCESS.
- [**#44284145826**](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44284145826) на HEAD `c7305f623537563d16d4044f31392571c33df4de` с новым test-only реальным холодным/тёплым `B3_PRE.filter(fn=>fn===loadAssets3).length===1`: **COMPLETED SUCCESS с первой попытки, все 19 обязательных jobs + финальный gate SUCCESS**. Browser E3 cold/warm CELEB/NOTES + реально декодированные 5 DGM + новая single-preloader-проверка PASS. Полные Campaign/WebGL, Golden, PWA, EngineHost MED/LOW и Camp budgets повторно PASS без изменения игры. Pages SKIPPED. Тесты не ослаблялись, golden/SPLIT не подгонялись.
- Никакой Chromium/SwiftShader CI не означает прохождения физической проверки iPhone Safari/WebKit: она **ОТКРЫТА** (844×390, 667×375, cold/warm, PWA standalone/offline и реальный аппаратный 3D).

## Статус B1
**Реальная B1 и усиленный runtime-тест прошли полный CI и готовы к отдельной приёмке владельцем. Без отдельной команды на слияние/релиз — PR остаётся OPEN DRAFT, published v135 без изменений.** Следующим этапом после отдельно принятого B1 можно обсуждать `ARCH-01D` (постоянный strict gate), не смешивать его с B1 и не изменять protected Camp.
