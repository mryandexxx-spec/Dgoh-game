# ARCH-01C3a3 — устранение order-only cosmetics→logic/stats

**Дата:** 17.11.2026. **Источник:** [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132). Владелец одобрил merge, выпуск v128 и переход к следующему пакету: «Давай сольем, опубликуем и перейдем к следующему пакету». [PR #145 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/145) и [PR #146 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/146). `main` после релизного PR #147 `184ef4ac68845abe550cf601984b885b98c94e1d`, версия исходника **v128**, validated Pages **опубликована и независимо подтверждена**: [официальный CI #44024295063 SUCCESS (attempt 2)](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44024295063), [Pages #44025945489 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44025945489), root `73b60eef`, SW `0437419c76`. Физическая Safari/iPhone приёмка по-прежнему открыта.

## Цель — одно ребро, без gameplay/UI переработки

В `src/data/cosmetics.js` первая строка импортов:

`import '../logic/stats.js'; // порядок исполнения`

`EMBLEMS/FRAMES/TITLES/FREE` и совместимый `unlocked(kind,id)` не используют значения stats. Само `logic/stats.js` экспортирует `METRIC`, `statInc`, `campStarsOf`. `ui/views/feats.js` уже **прямо** импортирует `METRIC` из `logic/stats.js` и пользуется им для подвигов. Это не гарантия безопасного удаления predecessor: статический ESM-порядок может менять инициализацию trial/3D/DOM и реестр достижений.

**На старте 8 legacy forbidden data→runtime edges**. Единственная цель C3a3 — `data/cosmetics.js → logic/stats.js`, ожидаемый baseline **8→7**, если будет независимое доказательство нулевых перестановок и прежних side effects.

**Нельзя** механически удалять или переписывать `SPLIT`: ранее в C2d виртуальные 39/39 способов удалить story→models меняли 77–165 ESM позиций. Отдельный C2d blocker и будущий C3b Conquest остаются.

## Стадия A — только read-only виртуальная диагностика

В `dev/tests/ci/arch01c3a3-virtual-stats.mjs` симулируем удаление одного order-only import и 26 дополнительных вариантов (24 вставки + перестановка существующих named imports `METRIC`/`EMBLEMS` в `feats.js` + явный UI-only predecessor) у 12 уже существующих владельцев исполнения вне `data` — `ui/views/feats.js`, `ui/overlays/profile.js`, `ui/wiring.js`, `ui/hero-window.js`, `ui/portrait.js`, `ui/rewards.js`, `ui/views/trials.js`, `ui/overlays/info.js`, `ui/overlays/calendar.js`, `ui/overlays/celebrate.js`, `core/boot.js`, `ui/router.js`. Для каждого проверяются вставки перед первым и после последнего импорта. Все варианты выполняются **только в памяти esbuild**, реальный `dev/src` и файлы UI не меняются. Тест подключён к обязательному AST gate CI в этом диагностическом PR; никакой production source не изменён.

Критерии:
- Original production esbuild exact соответствует всем **167 SPLIT** маркерам, 173 исходных JS и 2 SCC; до изменений baseline **8**.
- Вывод `exact/moved/missing/extra/first/preview` для **27** вариантов; допустимый кандидат строго `moved=0`, `missing=[]`, `extra=[]`. Даже exact порядок не означает отсутствия runtime TDZ — затем отдельно проверить.
- Текущая графическая точность подтверждена PWA+artifact SHA-256: права `d451f070fde45c721f379161fe3bc8fbd1d29b9649964957ec31591c8e912a55`, каталог SVG `64a85568c392122adf50284fde0d2f83e1cf82ec667571808b93710d69b48dd8`, HTML профиля/червя `737995ab60dc152a2b39a4fa6002114aef1b45c9cc123396edb0bd491f52cde2`. Должны быть неизменны.
- Camp/lobby/3D/styles/зоны/кнопки/навигация не изменять. 21 карты/210 миссий, RNG, цены энергии, боевой баланс, награды, save schema, визуал и golden не меняются.

## Следующий выбор

**GO только при exact-order, затем отдельная feature реализация**: убрать исходное ребро из data, если нужен дополнительный импорт — только разрешённый композиционный слой, без изменения UI-поведения; baseline 8→7, 0 new/stale, строгий check-bundle 167 без перестановки, PWA+artifact все 3 cosmetic hash, 210 NODES hash, golden 200 battles/meta/saves/41 screens, PWA SW/offline, iPhone DOM и phone/desktop WebGL MED/LOW/HIGH + ресурсы. После — отдельная приёмка владельца для merge/release.

**NO-GO при любом ESM reorder/TDZ** — документировать с конкретными числами, остановиться на диагностике, не ослаблять CI/не править golden/не затрагивать лагерь.

## Фактические результаты

До CI нет результата виртуальной матрицы. Дальнейший статус и run IDs добавить после проверок; отдельно сохранить в Issue #132. **Нет права на самостоятельный merge/publish C3a3.**
