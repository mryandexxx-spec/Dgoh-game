# Dune GoH — ARCH-01C3b3 / v132, release handoff

**17 ноября 2026. Статус:** релизный кандидат после приёмки владельцем «принимаю, сливай, выпускай». Не считать опубликованным до официального validated publish **и** независимого GitHub Pages SUCCESS с корневым commit/SW receipt.

## Основания и проверенная реализация

Репозиторий `mryandexxx-spec/Dgoh-game`, `main`. [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132) — основной аудит и точка возобновления. [Stage A, Draft PR #161](https://github.com/mryandexxx-spec/Dgoh-game/pull/161), [CI #44092098260 SUCCESS 19/19](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44092098260): **8/8** точных production-esbuild виртуальных ESM прогона, только 3/8 narrow relocation виртуальный GO. [Stage B1 implementation PR #162 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/162), main code SHA **`42a88fd355d6816c58494fa1342a3a8d78a4cbfa`**, [full real CI #44098480717 SUCCESS 19/19](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44098480717), final gate SUCCESS, Pages publishing intentionally SKIPPED. Первоначальный CI #44098244693 failed из-за устаревшего C3b1 export-adjacency assertion; строго обновлённое утверждение прошло, исходные игровые файлы после первоначального переноса не изменялись.

- Ровно три оригинальных byte-identical селектора `cqK`, `cqModD`, `cqScore` перенесены из `data/conquest-data.js` в `logic/conquest.js`. Никакого другого изменения механики нет. Внутренний UI именованный импорт этих имён перенаправлен на **уже существующий** импорт logic; один `logic→data` чистый `cqMod` добавлен в уже существующий import statement.
- Удалено ровно **одно** историческое обратное ребро `data/conquest-data.js → logic/conquest.js`: архитектурный legacy baseline **5→4, новые 0, stale 0**. В исходниках **173 JS**, **999 статических imports**, **167/167 исходных ESM-маркеров**, **898 глобальных именованных экспортов**, прежние SCC [106,9] с точным прежним membership.
- Перенесённые имена по-прежнему доступны в общем глобальном JS и сохранены в `SPLIT`; **module-specific export-owner изменён** для трёх имён с data на logic. В репозитории все четыре прежних path-specific import sites учтены; никаких незавершённых импортов.
- Не менялись `cqBump` и очередь `NOTES`, `cqRfN/cqRfCost`, исходные таблицы модификаторов/подвигов/награды/сундуки, 21 карта Campaign 2.0/210 миссий, цены и баланс, формат сейва/прогресс, интерфейс, лагерь, 3D/рендер, ассеты, `SPLIT`, golden.
- C3b0 `data/conquest-data.js → ui/overlays/celebrate.js` **NO-GO 0/35** — исходный side-effect predecessor сохранён. C2d `data/story.js → assets/models.js` **NO-GO 0/39** — отдельный bootstrap, не трогать. Также остались `data/boss→logic/battle/skills` и `data/looks→logic/battle/ai`.

## Доказательства real runtime

На **PWA и автономном HTML artifact** прошли тесты 5 вариантов сложности, всех 10 боссов × 5 мультипликаторов, 8 статических модификаторов × 5, точных русских строк и IEEE-754 округления (например, hard b0a +22% урона), 7 сундуков/35 наград, `cqScore=stars+points`, `cqBump`/NOTES и однократные подвиги, импорт/замена сохранений, недельный сброс по понедельникам, 21 проверка цен пополнений, смена даты, реальный bootstrap. Golden 200 боёв/meta/saves/41 screens PWA+artifact, all 210 Campaign mission SHA, offline/SW, телефонные DOM и WebGL MED/LOW и desktop HIGH, 3D lifecycle/resource safety, бюджет лагеря и арены: **19/19 SUCCESS**.

Опубликованная исходная версия **v131** (до этого релиза): [validated publish #44073950763 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44073950763), 188 SHA-256, root **`522f0035126b1d757091e671e18849132b3199ea`**, SW `25cfd6ff90`, [independent Pages #44075082409 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44075082409). Публичная проверка на физическом Safari/iPhone не подтверждена; владелец сообщил, что проблем пока не видит.

## Fail-closed процесс v132

1. **Отдельный release PR** должен содержать только: `dev/version.json` v131→v132, `dev/CHANGES_STATUS.md`, настоящий handoff и одноразовый guard `.github/workflows/release-v132-once.yml`. Никакого `dev/src`, `SPLIT`, baseline, golden, root `app.js/sw.js`, assets/3D/camp, save schema. **Полный CI релизного PR 19/19 SUCCESS** до слияния.
2. Squash merge с **точным названием** `release(arch): publish v132`; guard запускается только от push этого handoff на main с exact commit title, проверяет версию, старый SW `25cfd6ff90`, ровно четыре legacy edge, перенесённые формулы, все владельцы UI импортов, прежние refill/NOTES и оба блокирующих predecessor, затем однократно делает `workflow_dispatch validate-pwa.yml publish=true` на `main`.
3. Официальный workflow обязан собрать и проверить **точно этот** SHA, полный gate SUCCESS, сверить SHA-256 manifest, опубликовать **проверенный** artifact на Pages, получить SUCCESS задачи Publish verified PWA. Записать run ID, hash, count и версию SW.
4. Вне официального publish — **независимый** root GitHub Pages deployment SUCCESS на **новый** опубликованный root SHA. Только тогда заявлять, что v132 опубликована.
5. Итоговый receipt в Issue #132, после чего отдельный docs-only PR обновляет статус в handoff/CHANGES_STATUS и удаляет уже сработавший одноразовый guard **без повторного publish**.

**Открыто:** приёмка на физическом Safari/iPhone v132 — обновление v131→v132, cold/warm start, offline, Джихад на easy/normal/hard, boss-модификаторы/описания, очки и сундуки, сохранения/недельный сброс, Campaign 2.0, WebGL MED/LOW, защищённый лагерь. CI не заменяет физический телефон.
