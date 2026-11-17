# ARCH-01C3b1 — выпуск v130: безопасная очистка Conquest→economy

**17 ноября 2026**. [Трекер #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132). Владелец: «принимаю, сливай, публикуй» для PR #153 и #154. **Фактическая публикация v130 полностью подтверждена official validated CI и отдельным independent Pages SUCCESS**; хронология release-кандидата ниже сохранена для аудита.

## База и завершённая разработка

- Опубликована v129: исходный production root [`e940aade2caa4d87d3b5ba83fb4cbb4c8593760e`](https://github.com/mryandexxx-spec/Dgoh-game/commit/e940aade2caa4d87d3b5ba83fb4cbb4c8593760e), `dev/version.json={"v":129}`, `sw.js const VER = 'c79e8f534f'`, [validated publish #44032478163 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44032478163), [independent Pages #44033770546 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44033770546).
- [#154 docs v129 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/154) `68b8d138e7f609fb410f8bc9b76bc884a666fb34`, [full CI #44037390162 SUCCESS attempt 1](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44037390162): verified v129 receipt, old one-use guard removed, no game edits.
- [#153 implementation MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/153) `defb01e5189323f43b59195cee3eb8683532040e`, [full CI #44036957180 SUCCESS attempt 1](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44036957180): `data/conquest-data.js → logic/economy.js` removed; original `cqRfN` and `cqRfCost` function bodies relocated **unchanged** to `logic/conquest.js`; existing `ui/views/conq.js` named import points to logic owner. `logic/conquest.js` already imported economy and state — **no new import module**, no save/price/reset/feat changes. AST **7→6**, no new/stale; old exact `SPLIT` 167 ESM markers, 898 unchanged public exports, 173 JS, 2 original SCC, Conquest SCC 106.
- [Diagnostic #152](https://github.com/mryandexxx-spec/Dgoh-game/pull/152), [full CI #44036071756 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44036071756): Conquest UI celebration edge is **NO-GO in 35/35 order variants** (0 exact; best moved 47 and raw deletion moved 162 modules). For the chosen refills transfer, **4/4 exact zero-shift** ESM virtual variants. Diagnostics remain Draft (not for merge).
- Runtime on PWA and artifact: 21 exact daily refill prices n0..20, previous/next day reset, fresh and replaced save with live S, `cqBump` progress points and NOTES, no new cycles/TDZ; 3 pinned cosmetics SHA entitlement `d451f070fde45c721f379161fe3bc8fbd1d29b9649964957ec31591c8e912a55`, SVG `64a85568c392122adf50284fde0d2f83e1cf82ec667571808b93710d69b48dd8`, worm/profile HTML `737995ab60dc152a2b39a4fa6002114aef1b45c9cc123396edb0bd491f52cde2`, 210 NODES digest `b33150786a9b8c17abc60a9c1df1b40019ab9f6b6335a0c6d3287837d9beaa48`, 4096 PRNG values. Golden 200 battles/meta/saves/41 screens; mobile WebGL MED/LOW, desktop HIGH, offline/SW, iPhone DOM, 3D lifecycle, camp budget all passed.

## Только релизный PR

1. `dev/version.json` — **129→130**.
2. `dev/CHANGES_STATUS.md` — entry v130 и текущие незакрытые вопросы.
3. Этот handoff.
4. Новый одноразовый workflow `.github/workflows/release-v130-once.yml`, *строго* на squash commit subject `release(arch): publish v130`, фиксирует предыдущий root SW `c79e8f534f`, новую версию, **шесть точных legacy ребер**, перенесённые именно в logic два расчёта, прежний blocked C2d и C3b0. Он запускает штатный `validate-pwa.yml` из `main` с `publish=true` **только один раз**.

**Никакого `dev/src`, baseline, `SPLIT`, golden, PWA root, SW, ассета, UI, лагеря и save изменения в release PR.** Новая production PWA появится только при verified publication. Старый root SW — `c79e8f534f`; новая сборка получит hash автоматически, не угадывать.

## Публикация fail-closed

1. Full required release PR CI на отдельной ветке + финальный `All required checks passed SUCCESS`. До этого **NO MERGE**.
2. Squash release PR *только* exact title `release(arch): publish v130`, из main с preflight guard. One-time guard запускает official `validate-pwa.yml` `publish=true` на релизном main SHA.
3. Official CI: full 18 tasks, tests on both PWA/artifact, exact old 167 order and 898 exports, 6/0/0 AST, immutable SHA, golden, DOM, offline and 3D, final gate SUCCESS. `ci-artifact.mjs stage` публикует **byte-for-byte tested build**; `actions/deploy-pages` SUCCESS.
4. Независимый GitHub workflow `pages build and deployment` должен быть **SUCCESS на новом root commit**. Подтвердить `dev/version.json v130`, новый `sw.js VER`, 188 SHA-256 files (либо проверенный фактический count), Pages URL. Только после этого публично считать v130 выпущенной.
5. Записать full receipt с run IDs, root/SW и всеми gate в Issue #132. Послерелизный guard удалить в отдельном docs-only PR после публикации, без нового publish.

## Открыто после выпуска

- Физическая iPhone Safari проверка (v129→v130, холодный/тёплый PWA, offline cache, Джихад: ежедневная цена/пополнение/лимиты/недельный сброс/подвиги/NOTES и импорт старого сейва; camp / Campaign / heroes / 3D MED/LOW) **не проводилась и остаётся открытой**.
- Из шести оставшихся запрещённых data→runtime рёбер три принадлежат Conquest: `data/conquest-data→core/state`, `→logic/conquest`, `→ui/overlays/celebrate`. Последнее **C3b0 NO-GO**. `data/story→assets/models` **C2d NO-GO**, не пытаться удалить с ценой изменения загрузки 3D. Другие: boss→skills и looks→battle/ai.
- Следующая реализация только после нового independent virtual esbuild proof (7→6 уже включено в v130, дальше 6→5).

## Подтверждение релиза

**v130 ОПУБЛИКОВАНА и независимо проверена 17.11.2026.**

- [Release PR #155 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/155), точный squash `release(arch): publish v130`, main commit `d60b6c0cfe7ae83b9effee802e3cb18c521a8d3c`; [full release PR CI #44049267112 SUCCESS (попытка 1)](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44049267112), 19 обязательных jobs включая итоговый gate.
- [One-shot guard #44050416577 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44050416577) проверил версию 130, старый root SW, ровно 6 запретных рёбер и перенесённые без изменения тела функций, затем запустил штатный `validate-pwa.yml` с `publish=true`.
- [Официальный validated publish #44050433689 SUCCESS с первой попытки](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44050433689): 18 mandatory checks + final `All required checks passed` SUCCESS, 188 файлов с SHA-256, verified build **v130 / SW `f97ab7c7da`**, тестированный PWA-артефакт опубликован побайтно, job `Publish verified PWA to GitHub Pages` SUCCESS.
- Production root [`4297132fe9fc9deee00445f2580a6d265959c9ba`](https://github.com/mryandexxx-spec/Dgoh-game/commit/4297132fe9fc9deee00445f2580a6d265959c9ba), `dev/version.json={"v":130}`, `sw.js const VER='f97ab7c7da'`, https://mryandexxx-spec.github.io/Dgoh-game/.
- [Независимый GitHub Pages #44051694332 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44051694332) на **точном** опубликованном root SHA: `build`, `deploy`, `report-build-status` все SUCCESS. Полный receipt зафиксирован в [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132#issuecomment-6943532911).
- По завершении release guard `.github/workflows/release-v130-once.yml` удаляется отдельной docs-only очисткой вместе с этой записью (без нового `publish=true`, без `v131`). Основной `validate-pwa.yml` и обязательные проверки остаются на месте.
- **Контекст следующего этапа:** [ARCH-01C3b2 handoff](ARCH01C3B2_RESUMPTION_2026_11_17.md): оставшиеся 6 рёбер, два живых Conquest `data→core/state` и `data→logic/conquest`, диагностический virtual ESM/TDZ этап A. Физическая Safari/iPhone приёмка v130 остаётся открытой.
