# Dune GoH — ARCH-01C5b-B1 / v136 official release handoff

**18 ноября 2026 · ВЫПУСК УТВЕРЖДЁН, ПУБЛИКАЦИЯ ОЖИДАЕТ ПОДТВЕРЖДЕНИЯ**. Владелец: «сливай и выпускай». Документ сначала является планом fail-closed релиза; нельзя считать опубликованным до успешного официального CI и независимого Pages.

## Implementation — уже слито
- [PR #186 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/186), точный source main `48565de6ee59499f7f54c40e2248f47cef5cd557` (с 173 JS, 1001 статическим импортом, 167 ESM, 898 exports и SCC [60,11,6,3]).
- Удалена последняя обратная зависимость `data/story.js → assets/models.js`, одно top-level `b3Pre(loadAssets3)` переехало в корневой `boot.js` до `start()`. `MODEL_DATA`/DGM/KTX2/fallback/движок/награды/сейвы, защищённый лагерь и Campaign 2.0 не изменены.
- До исходной реализации сохранены оба точных списка 167 ESM модулей и 62 перемещения, SHA256 old `385d726d8a51d0b4b270dea36d1949e74ddeef360895d3ca536a285cdc621df3`, new `8dfc01f4eec407a2b09bfc116fe299ad6a346c834156fcf805a71ca3d1652695`; `SPLIT` приведён к заранее зафиксированному порядку, не подогнан под CI. Baseline 1→0 только после физического удаления ребра.
- [B1 19/19 full CI #44284145826 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44284145826), [final HEAD #44285387193 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44285387193). Реальный cold/warm Chromium 844×390/667×375: `B3_PRE` регистрирует `loadAssets3` один раз, Babylon, пять DGM, CELEB/NOTES и сохранения работают; PWA/offline, Golden 200 battles/meta/saves/41 screens, Campaign 210, WebGL MED/LOW, EngineHost cycles и лимиты лагеря PASS. Физический iPhone Safari остаётся OPEN.

## Запланированный одноразовый безопасный выпуск v136
1. Из главного `main` implementation SHA `48565de6ee59499f7f54c40e2248f47cef5cd557` создать **отдельный release PR**, меняющий **РОВНО четыре файла**: `dev/version.json` 135→136, `dev/CHANGES_STATUS.md` (эта запись и «Открыто»), `dev/docs/ARCH01C5B_B1_V136_RELEASE_HANDOFF_2026_11_18.md`, `.github/workflows/release-v136-once.yml`. Нельзя менять `dev/src`, `SPLIT`, baseline, golden, Camp, Campaign, root PWA или другие исходники.
2. Перед merge release PR **строгий полный CI 19/19 SUCCESS и final gate**, не принимать успешный build без всех браузерных jobs или непроверенное переиспользование.
3. Слить release PR только **squash** с заголовком ровно `release(arch): publish v136` и единственным parent `48565de6ee59499f7f54c40e2248f47cef5cd557`; никакие изменения после implementation SHA не допускаются.
4. Одноразовый `.github/workflows/release-v136-once.yml` разрешён на одном таком push, но с fail-closed проверкой точно этого родителя/subject/version=136, четырёх release paths, неизменного старого root SW `efc55b7635` и git blob source/CI/snapshot/SPLIT. Обязан проверить, что `main == GITHUB_SHA`. Только затем вызвать **официальный** `validate-pwa.yml` c `publish=true`.
5. Официальный deploy обязан выполнить все обязательные CI jobs, final gate и `Publish verified PWA to GitHub Pages`. Только проверенный SHA-256 artifact можно перенести в root (не создавать другую сборку). Проверить новый root SHA, diff только разрешённых PWA путей, SW cache version/хэши, immutable `dev/src`, отдельно успешный GitHub Pages workflow именно на root SHA.
6. После независимой проверки выпущенной v136 создать отдельный post-release docs-only cleanup PR: реальный фактический handoff/Issue #132/журнал, **удалить** одноразовый guard, исключить повторный dispatch. Не выполнять повторную публикацию.

## Ограничения и дальнейшая работа
Ни графический профиль, ни UI/3D/навигация лагеря, ни Campaign 21/210, ни save schema, ни golden изменяться в release PR не должны. ARCH-01D permanent strict gate — отдельный следующий этап после публикации, не включать сейчас. Физическая проверка **iPhone Safari/WebKit** по двум разрешениям и сценариям cold/warm/standalone/offline/3D/CELEB/NOTES/нагрев остаётся не проведённой — Chromium её не заменяет.

## Фактические подтверждения публикации
*PENDING* — дополнить только после проверки CI, официального deploy и независимого Pages; не объявлять опубликованной заранее.
