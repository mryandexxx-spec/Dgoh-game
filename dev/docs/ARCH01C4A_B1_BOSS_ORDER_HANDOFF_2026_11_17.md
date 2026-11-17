# ARCH-01C4a — Stage B1: устранение boss→skills без перестановки ESM

**17 ноября 2026. Реализация в отдельной feature-ветке, без merge и publish.** Владелец подтвердил «Поехали» после [Stage A Draft PR #165](https://github.com/mryandexxx-spec/Dgoh-game/pull/165), [full Stage A CI #44114851442 SUCCESS 19/19](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44114851442) на diagnostic head `618151f13f4b398a168a641353cba7726ce4b384`. [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132) — единый журнал.

## Отправная точка

`main` после v132 docs-only cleanup = **`69ee0196757d84deaa637c7403f297a310aeb7af`**. [v132 validated publish #44105972965 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44105972965), root `9ee953a4180151f9e6008adddfce730ccc7b06ed`, SW `2c8aab985b`, 188 SHA-256, [independent Pages #44107612434 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44107612434). Реальный Safari/iPhone не сертифицирован. Выпуск v132 не изменять в B1.

**Stage A: 16 in-memory production esbuild сценариев.** Прямое удаление `data/boss→logic/battle/skills` переставляет 3 ESM и меняет SCC 9→6; прямое удаление `data/looks→logic/battle/ai` переставляет 60 ESM. Восстановить полный 167/167 order **удалось только одному** узкому варианту из 16: удалить boss side-effect predecessor и поднять существующий `skills` named import перед `boss` в `logic/battle/stats.js`. Получается **173 JS, 998 imports, 167/167 module markers, 898 global named exports, 0 new import edges**, но меняется SCC [106,9]→[106,6], поэтому Stage A требовал отдельного реального review. Виртуальная VM сверка **baseline+cаndidate cold boot PASS**; 200 golden battles (111 побед A/89 B, исходный hash `7d8169abdc688fb7`), 1560 meta, 4 saves (hash `df7dfea2f6a4a1ee`), все Conquest descriptions/NOTES/week PASS. Обновлений golden не было.

## Реальный пакет — только минимальная перестановка зависимостей

1. `dev/src/data/boss.js`: удалена **ровно** строка `import '../logic/battle/skills.js'; // порядок исполнения`. Импорт `CH`, `const WORM`, **`CH.worm = WORM`**, все `PHASES/MOVES/RAID_TIERS/STAR_MULT`, их значения и экспорты — без единого изменения.
2. `dev/src/logic/battle/stats.js`: переставлены **две существующие строки импорта**, `import { SK_KEYS, autoSk } from './skills.js';` теперь ПЕРЕД `import { STAR_MULT } from '../../data/boss.js';`. **Без новых зависимостей, новых модулей или изменений формул, кэшей, снаряжения, API.**
3. `dev/tools/arch-import-baseline.json`: удалено только фактически исчезнувшее `data/boss.js -> logic/battle/skills.js`, **4→3**, 0 новых/0 stale. Остались исключительно order-only NO-GO:
    - `data/conquest-data.js → ui/overlays/celebrate.js` (C3b0, 0/35 virtual GO);
    - `data/looks.js → logic/battle/ai.js` (C4a, direct delete меняет 60 markers);
    - `data/story.js → assets/models.js` (C2d, 0/39).
4. `dev/tests/ci/arch01c4a-b1-boundary.mjs`: **новый обязательный read-only AST gate**. Требует точные два импорта/их порядок, 173 модулей, 998 imports, 167 уникальных original SPLIT markers, 898 глобальных экспортных имён, точные 3 запрещённые ребра; frozen `CH.worm = WORM`, игровые формулы/экспорты. **Восстанавливает прежний ESM-граф добавлением удалённого boss→skills ребра ТОЛЬКО в памяти** и требует SCC [106,9], а в реальном графе [106,6]; **состав 106-модульного цикла полностью идентичен**, новый цикл из 6 — точное подмножество старого из 9, ровно три прежних члена покинули SCC. Это намеренное архитектурное улучшение, а не побочный эффект замены `SPLIT` или ослабления теста.
5. `dev/tests/ci/arch-init-graph.mjs` подключает новый gate; накопительные C1a/C3a1/C3a3/C3b1/C3b2/C3b3 проверки обновлены лишь на baseline=3, imports=998 и отдельно подтверждённый SCC 106/6 — **все прежние проверки реальных формул и истории по-прежнему обязательны**.
6. `dev/tests/arch01c4a-boss-bootstrap.mjs`, официальный workflow `.github/workflows/validate-pwa.yml`: выполнить по **реальным production-built PWA и standalone HTML artifact** cold boot (Node VM) + `CH.worm===WORM`, boss metadata, бой/AI/skills, Duncan guard, девять границ HP-фаз рейда, три уровня raid boss, `unitStats/unitPower`, `newSave`. Поверх этого неизменённые golden **200 battles/meta/saves/41 screens**, 210 Campaign missions, сохранения/экономика/NOTE, офлайн/SW, iPhone DOM, WebGL MED/LOW/HIGH и 3D lifecycle/camp budgets в полном CI.

## Жёсткие запреты

- `SPLIT` **без изменений**; проверка `check-bundle` должна подтвердить прежние **167/167** markers в полном порядке. Не подменять эталоны и не уменьшать тесты.
- `data/looks→logic/battle/ai`, `data/conquest-data→ui/overlays/celebrate`, `data/story→assets/models` **не изменять**.
- Никаких изменений боевых формул/баланса/экономики/наград/ростера/Campaign 2.0 (21 карта/210 миссий)/всего лагеря (UI, сцена, кнопки, навигация)/WebGL и ассетов/формата сохранений/корневого `app.js/sw.js` или `dev/version.json`. Рабочий публичный v132 остаётся неизменным.
- **Этот PR — Draft без merge и publication.** Только после полного CI успешного PR и отдельной команды приёмки владельца можно обсуждать merge и релиз v133. Физическая проверка реального Safari/iPhone всё ещё OPEN.

## Заполнить после CI

Точные PR/head SHA и номер полного CI, новый SCC separated set, 19/19 required checks, сравнение PWA и artifact, compile/transparency status; ссылки добавить в [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132).
