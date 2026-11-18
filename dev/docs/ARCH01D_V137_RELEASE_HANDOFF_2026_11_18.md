# Dune GoH — ARCH-01D / v137 release handoff

**18 ноября 2026 · ВЛАДЕЛЕЦ РАЗРЕШИЛ MERGE И RELEASE: «Сливай, выпускай».** Публикация ожидает точного CI/deploy подтверждения. Нельзя считать опубликованной только по слитому релизному PR.

## Успешно слитый ARCH-01D

- [ARCH-01D PR #189 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/189), implementation parent `1202349501cd17cffdd5f62dfee72ca461399f80`, v136 baseline `main 26d3ff3ed638808b3b4bc33a685cb0005dca5c71`.
- Независимая обязательная задача `arch-strict`, real `node tools/check-deps.mjs --strict` + `node tools/check-arch-imports.mjs --strict` на каждом PR/push/dispatch, даже при docs-only или reuse. Финальный gate теперь требует `arch-strict=success`, недопустим skip/fail/cancel и неполные зависимости.
- Нулевой исключительный baseline `legacy: []` защищён в тестах, реальные отрицательные fixtures нарушений AST, DOM/HTML, re-export и dynamic imports выполняются с ожиданием FAIL. Положительное доказательство — чистая v136 с **0** forbidden.
- [Полный CI #44295529577 SUCCESS 20 jobs+gate](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44295529577). [Реальный proof-bound reuse #44298231029 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44298231029), [финальный exact HEAD #44298574291 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44298574291): отдельный strict job выполнился даже при пропуске тяжёлых регрессионных задач.
- Весь `dev/src`, protected Camp, Campaign 21/210, graphics profiles, EngineHost, экономика, сохранения, golden, `SPLIT`, прежний approved ESM порядок 167, экспортируемые 898 и SCC `[60,11,6,3]` не менялись.

## v137 — fail-closed релизный протокол

1. От implementation SHA `1202349501cd17cffdd5f62dfee72ca461399f80` создаётся release PR, меняющий **ровно четыре** файла: `dev/version.json` `136→137`, `dev/CHANGES_STATUS.md`, этот handoff, `.github/workflows/release-v137-once.yml`. Никаких `dev/src`, `SPLIT`, baseline, golden, `index.html`, root PWA или protected Camp правок.
2. До merge release PR — полная обязательная матрица CI **20 SUCCESS включая independent `arch-strict` и final gate**. Даже при релизном proof-bound режиме strict проверяется заново; все пропущенные игровые задачи должны иметь корректную proof-базу. Не принимать неуспешный gate.
3. Релизный PR сливать squash с точным заголовком `release(arch): publish v137` и единственным родителем `1202349501cd17cffdd5f62dfee72ca461399f80`. При изменившейся ветке остановиться, не выполнять публикацию.
4. Одноразовый workflow проверяет exact родителя, subject, версии `137`, четыре файла, все immutable B1+ARCH-01D hashes, пустой AST ledger, frozen 167/62 ESM migration, прежний root SW `ff7924dd9d` и то, что `main==GITHUB_SHA`. Только после этого выполняет **один** dispatch официального `validate-pwa.yml` с `publish=true`.
5. Официальный workflow должен повторно выполнить/доказать все обязательные проверки, независимый `arch-strict` и final gate, скачать тот же проверенный SHA-256 артефакт для публикации без пересборки. Нужен SUCCESS `Publish verified PWA to GitHub Pages`, сверка diff root с разрешёнными файлами и **независимый GitHub Pages SUCCESS** на точном опубликованном root SHA.
6. Сохранить реальные version/SW hashes, номер Actions, артефакты и root commit в журнале/Issue и удалить guard отдельным post-release docs-only PR. Не повторять dispatch или публикацию после успеха.

## Ограничения и открытые проверки

Физический iPhone Safari/WebKit (844×390, 667×375), PWA standalone/offline, cold/warm, 3D, CELEB/NOTES и нагрев — **OPEN**, не выдавать Chromium CI за физическую проверку. Граф SCC не чистился и не признан безусловно безопасным; ARCH-01D — только постоянный gate против новых запрещённых импортов. Нет разрешения менять Camp.

## Протокол отказа первого guard и безопасного исправления

- [One-shot guard #44302475858](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44302475858) **FAIL CLOSED** на release source `d0e2458dc4b8c5933b13af1e18588b8c5121b208`: ошибочно проверял `dev/version.json = {"v":136}` при настоящей версии `{"v":137}`. Завершение до POST `actions/workflows/validate-pwa.yml/dispatches`; **официального publish=true не было**. Игровой код и root PWA не менялись.
- Исправление — отдельный PR только из 2 файлов: этот handoff и `.github/workflows/release-v137-once.yml`. Новый guard разрешён **исключительно** для squash subject `fix(release): activate v137 guarded publish`, единственного родителя `d0e2458dc4b8c5933b13af1e18588b8c5121b208`, exact двух путей, и обеих реальных версий `v137` в `HEAD` и `HEAD^`. Остальные git-blob/ESM/SW/нулевой ledger/strict CI защиты сохраняются. Перед merge требуется новый полный зелёный CI **20 checks + final gate**. Дальнейший официальный deploy и независимые Pages — как в первоначальном протоколе, без обхода проверок.
- Это исправление не изменяет `dev/version.json` повторно, `dev/src`, protected Camp, `SPLIT`, baseline, golden или root PWA.

## Реальные результаты публикации

**PENDING** — не заполнять SUCCESS до официального publish, root SHA и независимого Pages deployment.
