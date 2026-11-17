# Dune GoH — ARCH-01C4c / v134 release handoff

**17 ноября 2026 · Релиз v134 по команде владельца «Принимаю, сливай, выпускай».**
Статус до завершающих квитанций: **кандидат, ещё НЕ подтверждён опубликованным**. Источник контроля — [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132).

## Подтверждённая реализация

- Published v133 official [#44129152399 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44129152399), independently verified root Pages [#44131280637 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44131280637), root `41d95d529e1922990842016066b198068eb1d119`, SW `e1a6859133`, 188 SHA-256.
- [ARCH-01C4c Stage A/A2 Draft PR #170](https://github.com/mryandexxx-spec/Dgoh-game/pull/170), [final full CI #44147416534 SUCCESS 19/19](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44147416534), root composition preferred from 28 in-memory trials. [C4b Draft #169](https://github.com/mryandexxx-spec/Dgoh-game/pull/169) proved four `render2d→logic` alternatives forbidden.
- Real [B1 PR #171 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/171), squash main `69d28c29f288f4edf7d33e9862b305b1c0ed7cff`. Real [implementation CI #44152849483 SUCCESS 19/19](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44152849483) on feature `16f7583a53fb9e0656d836a36a8b148512e456eb`, final docs-only [CI #44154327833 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44154327833) with fail-closed proof-bound reuse on `0603c62df775eadca2d2c4cbabe8a0725e23a3d4`.
- Only real source edit: `dev/src/boot.js` adds explicit allowed `./data/gear-cap.js` → `./logic/cinematic-preference.js` → `./logic/battle/ai.js` before existing Conquest UI; `dev/src/data/looks.js` removes old `import '../logic/battle/ai.js'`. Historical regression tests and AST debt ledger updated to two remaining edges.
- **Invariant**: 173 JS, 1000 imports, exact historical 167 ESM, 898 public named globals, exact SCC membership [106,6], 2 old forbidden imports, 0 new/stale. Real PWA + standalone HTML: cold/warm seeds 77/101, immutable 200 battles, 1560 meta, 4 saves, 44 actual DOM screens, all 210 Campaign, offline/SW, WebGL HIGH/MED/LOW, Camp/perf and phone DOM PASS. `SPLIT`, golden, battle formulas, economy, save schema, Campaign 210 missions/21 maps, protected Camp, root PWA and SW untouched in implementation.

## Строго защищённый выпуск v134

1. Этот release PR содержит **ровно четыре** файла: `dev/version.json` 133→134; `dev/CHANGES_STATUS.md` candidate v134; `dev/docs/ARCH01C4C_V134_RELEASE_HANDOFF_2026_11_17.md`; one-shot `.github/workflows/release-v134-once.yml`. Никаких правок игры, PWA root, `SPLIT`, immutable golden, AI/LOOK, WebGL, Camp или сохранений.
2. Перед merge проверить **фактический полный release PR CI 19/19 SUCCESS** на окончательном HEAD (никаких утверждений заранее). Затем squash merge **строго с commit title `release(arch): publish v134`**.
3. One-shot `release-v134-once.yml` срабатывает только на push в `main` с точным релизным subject, единственным допустимым parent `69d28c29...`, ровно четырьмя ожидаемыми изменёнными файлами, version=134, старым SW `e1a6859133`, замороженными git blob-hashes `boot.js`, `looks.js`, AI, SPLIT, baseline и B1-тестами. Проверяет строго 2 оставшихся запрещённых ребра, исходные side effect и composition root, затем только один раз отправляет официальный `validate-pwa.yml` с `publish=true` на `main`. При любом отклонении — STOP без публикации.
4. Официальная проверка должна подтвердить фактический **19/19 required jobs и final gate SUCCESS**, `Publish verified PWA to GitHub Pages SUCCESS`, version 134, реальный новый SW hash и SHA-256 manifest (ожидаемые 188, но число подтверждать только логом). Никакого второго production build после проверенного artifact.
5. **Независимый** root GitHub Pages build/deployment должен завершиться SUCCESS на **новом опубликованном root commit**. Убедиться, что parent == exact release source SHA, изменены только root `app.js` и `sw.js`, версия 134, новый SW != `e1a6859133`, в отсутствие перезаписи dev source.
6. Сохранить фактические run IDs, SHA, digest, root/SW hashes, CI 19/19 и независимые Pages receipts в [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132), handoff и `CHANGES_STATUS.md`. Затем **отдельный docs-only cleanup PR** удаляет использованный one-shot guard; полный CI с проверяемым повторным использованием доказательств, **без второй публикации**.

**Открыто:** физический Safari/iPhone v134 (cold/warm start, offline PWA, режимы, AI, WORM raid, Conquest, Camp, сохранения, WebGL MED/LOW) не заменять браузерным CI. Следующие архитектурные пакеты: `data/conquest-data.js→ui/overlays/celebrate.js` (NO-GO 0/35) и `data/story.js→assets/models.js` (NO-GO 0/39), отдельно и без изменений при этом выпуске.

## Фактические результаты релиза

**PENDING: только после действительных GitHub CI и независимого Pages.** Обновлять запись документально в отдельном послерелизном PR.
