# CI-OPT-03 — короткая проверка и регрессия по изменённым системам

Решение владельца, 2026-11-23. Полная регрессия — только по отдельному согласованию для расследования сложного сбоя. Любой обычный PR и push используют **короткий smoke + проверку затронутой подсистемы**.

## Автоматический путь

Селектор `dev/tools/ci-plan.mjs` вычисляет полный diff между SHA, верифицирует `ui-copy` по содержимому AST/HTML (никогда только по пути), применяет `systemsForPaths()` и публикует точный проверяемый план. Подменённый план или пропущенный обязательный job отвергает `ci-gate.mjs`.

- Любые исходники, ресурсы, тесты, CI, PWA и обновления версии: `focused` — за исключением **доказанного** `ui-copy`. Только документы — `docs`.
- База `focused`: npm build обеих сборок, строгая архитектура, целостность bundle и SHA-256, запуск compiled PWA/HTML, совместимость legacy save-v1, Service Worker install/update/offline, контроль итогового артефакта и независимый `gate`.
- Дополнительная матрица: `storage` → save/import/checkpoint, нативные Chromium Web Locks; `clock` → часы; `economy/daily` → ресурсы и награды; `battle` → checkpoint/reward; `conquest` → требования Conquest и архив; `progression` → покупки, снаряжение, улучшения; `content` → контракты миссий/данных; `ui` → DOM/mobile; `render3d` → 3D mobile/desktop; `pwa` → SW/offline; `ci` → tests of routing/proof.
- Смешанный PR получает объединение затронутых систем, но **не** 200 боёв, 41 полный DOM-экран и несвязанные графические матрицы. `dev/assets/img/**` — UI, а не 3D.
- Если diff, парсер, карта подсистем, контракты или receipts сомнительны — **красный CI**, а не молчаливый пропуск теста или автоматический полный регресс. Исправить маршрутизацию в отдельном ревью.
- Отдельный `ARCH-01D`, точная привязка SHA/артефакта/покрытия и защита публикации остаются обязательными.

## Ручной путь

В GitHub Actions → **Validate Dune GoH PWA** → Run workflow включить `full_regression=true` для **явно согласованной** комплексной диагностики. Без этого флага ручной запуск не стартует полный регресс. Публикация `publish=true` без успешного точного main-SHA receipt блокируется; допустим только отдельный явно согласованный `full_regression=true`.

Workflow **ARCH-02C-B3 mandatory writer fast acceptance** теперь `workflow_dispatch` (ручная углублённая проверка storage/Web Locks); он больше не дублирует каждый PR.

## Приёмка CI

```sh
node dev/tests/ci/ui-copy-proof.mjs
node dev/tests/ci/selection.mjs
node dev/tests/ci/focused.mjs
node dev/tests/ci/proof.mjs
node dev/tests/ci/resource-growth.mjs
```

При расширении игры: сначала определить безопасную подсистему и её реальные compiled acceptance, добавить положительные/отрицательные тесты маршрутизации. **Не обходить `gate` и не использовать только список путей для распознавания правок пользовательского текста.**
