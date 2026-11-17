# ARCH-01C4b Stage A — безопасная развязка `data/looks.js → logic/battle/ai.js`

**Дата: 17.11.2026. Статус: ТОЛЬКО АУДИТ / виртуальный GO–NO-GO; реализация, merge и релиз не разрешены.**

## Подтверждённая исходная точка

**v133 ОПУБЛИКОВАНА и независимый Pages SUCCESS.** Последний `main` после docs-only cleanup `4d36590cf9a9014c25d56a6272c0ca7130890f13`; предшествующий реально опубликованный root `41d95d529e1922990842016066b198068eb1d119`, SW/cache `e1a6859133`, версия `{"v":133}`. [Релизный source #167](https://github.com/mryandexxx-spec/Dgoh-game/pull/167) `9aa23ab719f4430c881f7845df049a3f2512e229`; [официальный validated publish #44129152399 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44129152399) — 19/19 mandatory, 188 SHA-256 файлов, артефакт ZIP digest `sha256:a0d20a9f56bd2bfbbe5b06f58afde79d50206d4213d121d60f7bf619b3bfa6fb`; [независимый root Pages #44131280637 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44131280637). [Docs cleanup #168 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/168) после [full CI #44132294963 SUCCESS 19/19](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44132294963). [Issue #132 — итоговый receipt v133](https://github.com/mryandexxx-spec/Dgoh-game/issues/132#issuecomment-6954918675). Физическая Safari/iPhone-приёмка остаётся ОТКРЫТОЙ.

После ARCH-01C4a B1 остаётся **ровно 3 исторических forbidden data→* ребра**, 0 new, 0 stale:
```text
data/conquest-data.js -> ui/overlays/celebrate.js
data/looks.js -> logic/battle/ai.js
data/story.js -> assets/models.js
```
Текущий AST-слепок: **173 JS, 998 статических импортов, 167 оригинальных ESM-маркеров в прежнем порядке, 898 прежних публичных named global exports, две SCC [106,6]**. `SPLIT`/golden/baseline нельзя изменять ради теста.

## Почему выбран этот predecessor

- `dev/src/data/looks.js` содержит на старте **`import '../logic/battle/ai.js'; // порядок исполнения`** и затем неизменяемые цветовые и графические справочники и функции: `LOOK`, `ghash`, `sigil`, `SKINS`, `OL`, `FEM`. Именованные значения из AI он НЕ использует. Но этот reverse-import — ESM-bootstrap predecessor.
- `dev/src/logic/battle/ai.js` содержит `aiPlan`, `computeIntents`, `hasPrescience`, 8 уже существующих named imports (raid, turns, engine, stats, boss, skills, chars, fx) и условный top-level **`if (typeof module !== 'undefined') module.exports = { ... }`** для совместимости с Node/CI. Нельзя менять семантику CJS adapter или инициализацию боевых зависимостей.
- Первичный независимый Stage A C4a (ветка `audit/arch01c4a-boss-looks-order-virtual-20261117`, [PR #165](https://github.com/mryandexxx-spec/Dgoh-game/pull/165)) показал, что **наивное удаление `looks→ai` переставляет 60/167 ESM-маркеров**, даже если SCC остаётся того же размера. Попытки заменить predecessor на `data/boss`, `data/chars`, `data/skill-ups` тоже переставляли маркеры. Это уже **NO-GO для прямого удаления**, но не доказательство невозможности UI-owned composition root.
- В `ui/views/conq.js` УЖЕ есть `import { portrait } from '../../render2d/figures.js'`, `import { ghash } from '../../data/looks.js'`, `import { computeIntents } from '../../logic/battle/ai.js'` — в этом порядке. В `ui/battle/battle-ui.js` также УЖЕ есть `render2d/figures`, `data/looks`, `logic/battle/ai` и `logic/battle/turns/engine`; `ui/hero-card.js` имеет `render2d/figures` раньше `battle/stats` и `skills`. Это **существующие разрешённые UI→logic/render2d/data импорты**, и их порядок можно исследовать, не изменяя формулы/функции и не создавая новых графовых рёбер.

## Виртуальная матрица и жёсткое условие безопасности

Новый `dev/tests/ci/arch01c4b-virtual-looks-ai.mjs` запускается из обязательного `dev/tests/ci/arch-init-graph.mjs`. В памяти, через production-config esbuild `src/main.js`, подменяется только первая `import`-строка `data/looks.js`; в кандидате может быть переставлена **только уже существующая** статическая import-строка разрешённого UI-owner. Диагностика включает:

1. Отрицательный контроль: прямое удаление старого `looks→ai` без альтернативы (ранее 60 перестановок).
2. Перемещение существующего `computeIntents` в `ui/views/conq.js` перед `ghash`, `portrait`, или перед первым импортом всего модуля.
3. Перемещение существующих `aiPlan`, `turns`, `engine` в `ui/battle/battle-ui.js` перед прямым `looks`, `figures`, `scene-bg`, `fx-layer` или перед всем UI bootstrap.
4. Перемещение существующих `battle/stats` или `skills` перед `figures` в `ui/hero-card.js`.
5. Комбинации независимых UI-owner перестановок на двух/трёх точках.
6. Контрольные **conditional** UI composition-root варианты с явным allowed `ui→logic/battle/ai` импортом (в том числе `ui/portrait.js` и `ui/hero-card.js`), которые **не должны** ошибочно считаться безусловным GO, если возник новый import edge.

Для каждого кандидата CI выводит JSON-строку `ARCH-01C4b TRIAL` с реальными: сдвинутыми/утерянными/новыми ESM-маркерами, точной членностью SCC, числом импортов и новыми/удалёнными рёбрами, всеми 898 именами, отсутствием изменений тел функций, `strictGo` и `conditionalCandidate`. Эталон 167/167 извлекается не только из `SPLIT`, но и **из настоящей собранной production v133** в начале теста.

**STRICT VIRTUAL GO** только если целевой reverse import фактически удалён; 167/167 ESM-маркеров на исходных позициях; полная точная членность SCC; 898 глобальных имён; ровно **997** статических импортов (один удалён, ни одного добавлено), 2 других NO-GO прежних edges сохранены; в UI только переставлены import declarations, вне них текст байтово неизменён. Если SCC меняется, но 167 ESM и runtime сохранны — отдельный **условный GO**, как было в C4a B1, а НЕ автоматическое разрешение на merge. Новый `ui→logic` edge требует отдельного review, даже если он разрешён.

**Второй этап Stage A**, только если будет хотя бы один order-exact кандидат: временный in-memory production-build + cold/warm Node VM и сравнение с исходником. Проверить `LOOK`, `SKINS`, `OL`, `FEM`, `ghash`, `sigil`, CJS `module.exports`, `aiPlan/computeIntents`, все 200 golden battles, meta, saves, 41 screens, Campaign 2.0, PWA/artifact load. Даже после этого нужен **отдельный Stage B1 Draft PR с настоящими исходниками и полным 19/19 CI**, явная приёмка, merge и отдельный релиз. Без доказанного order-equivalent варианта — NO-GO и проектирование иного UI-owned/bootstrap approach; `SPLIT` и golden не изменять.

**SCOPE LOCK:** в текущем Draft PR не изменять `dev/src`, `dev/tools/split.config.mjs`, `dev/tools/arch-import-baseline.json`, игровые формулы, сохранения, `dev/version.json`, 21 карту/210 миссий Campaign 2.0, UI/рендер/ассеты, весь лагерь, золотые эталоны, корневые `app.js/sw.js`. Не менять C3b0 `conquest→celebrate` (0/35 NO-GO) и C2d `story→models` (0/39 NO-GO). **No merge, no publish** на Stage A.

## Итоговый receipt

Результаты матрицы, точный head SHA, полный CI run и решение по B1 должны быть зафиксированы после фактического CI в [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132) и в описании Draft PR. Не объявлять GO без настоящих логов.
