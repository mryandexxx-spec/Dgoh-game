# ARCH-01D — постоянный строгий архитектурный gate (v136)

**Дата:** 18 ноября 2026 · **Stage:** отдельный Draft PR, без merge/release. Ветка основана на \`main 26d3ff3ed638808b3b4bc33a685cb0005dca5c71\` после документального cleanup v136.

## Причина и доказательства

После [успешной v136](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44289040860), [независимых Pages](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44290596831) и [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132) последний debt действительно удалён: \`dev/tools/arch-import-baseline.json\` хранит \`legacy: []\`. Реальная v136: 173 модуля, 1001 статический импорт, 167 frozen ESM-маркеров, 898 exports, SCC \`[60,11,6,3]\`, запрещённые \`data/logic/core → *\` = 0.

Раньше \`check-deps.mjs\` запускался **без** \`--strict\` и использовал узкий regexp для части импортов; AST \`check-arch-imports.mjs\` запускался без \`--strict\` и сохранял временный ledger. На \`main\` по CI [#44291304016](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44291304016) оба уже сообщали ноль нарушений, поэтому нулевой gate можно включить без исключений. Но \`build\`-checks пропускаются при docs-only и proof-bound reuse, значит просто добавить \`--strict\` к build шагу **недостаточно**.

## Решение ARCH-01D

1. Добавлен всегда выполняемый **независимый job \`arch-strict\`** в \`.github/workflows/validate-pwa.yml\`, вне условных \`plan.groups\`. На каждом PR, push в main и явном workflow_dispatch делает clean checkout и \`npm ci --ignore-scripts\`, проверяет нулевой ledger, негативные случаи, затем запускает оба настоящих инструмента **с \`--strict\`**.
2. \`gate\` требует \`arch-strict\` через явный \`needs\`, а \`dev/tools/ci-gate.mjs\` проверяет строго **SUCCESS** (никаких SKIPPED/FAILURE/CANCELLED и пропущенного ключа). Таким образом и docs-only, и reuse не смогут унаследовать старую архитектурную проверку. \`deploy-pages\` по-прежнему зависит от \`gate\` и допускает публикацию только после отдельного \`publish=true\` из main.
3. Build CI дополнительно вызывает \`node tools/check-deps.mjs --strict\` и \`node tools/check-arch-imports.mjs --strict\`, сохраняя все прежние AST, SCC, API, bundle, Golden, PWA, Campaign, WebGL и EngineHost gates без послаблений.
4. \`tests/ci/arch01d-strict-gate.mjs\` проверяет реальный \`legacy: []\` и **реально исполняет обе CLI** на изолированном временном дереве с вредоносными примерами: side-effect/multiline imports, re-export, dynamic import, Babylon package, DOM, HTML, скрытие нарушения под поддельным baseline, stale baseline, core boot exception. Временные файлы удаляются, \`dev/src\` не меняется.
5. \`tests/ci/selection.mjs\` покрывает fail-closed gate на всех режимах docs, release и изменённых исходниках; прямо проверяет отказ при отсутствии/skip/fail/cancel обязательного \`arch-strict\` и наличие связки в YAML. \`dev/ARCHITECTURE.md\` обновлён для будущих разработчиков.

### Сохранённые инварианты

- \`dev/src\`, \`render3d/scenes/camp.js\`, EngineHost, Campaign 2.0/210, экономика, награды, save schema, golden, качество графики и root PWA **без изменений**.
- \`tools/arch-import-baseline.json\` **не меняется**, не добавляем исключений.
- \`tools/split.config.mjs\`, frozen approved ESM порядок 167 и существующая SCC **не меняются**.
- Одноразовый релизный workflow уже удалён в v136; ARCH-01D не выполняет deploy и не повышает \`version.json\`.
- Физический Safari/iPhone 844×390/667×375, PWA cold/warm/offline, 3D, CELEB/NOTES и нагрев остаются **непроверенными физически**, Chromium это не заменяет.

## Критерии приёмки

**GO к отдельному merge-review** только если на полном CI Draft PR: новый \`arch-strict\` работает независимо от плана, собственные negative fixtures проходят (то есть запрещённые исходники дают FAIL в обоих соответствующих CLI), все обязательные jobs и \`All required checks passed\` имеют SUCCESS; не меняются approved ESM, game API и golden. Проверить отдельно docs-only/reuse-пути (включая runtime unit \`selection.mjs\`) и что любая новая обратная зависимость не может стать legacy baseline. **Без merge и выпуска до прямой команды владельца.**

**ARCH-01D не является устранением оставшихся SCC.** Их анализ — самостоятельное направление; нельзя считать текущие циклы автоматически безопасными или менять их ради чистого gate.
