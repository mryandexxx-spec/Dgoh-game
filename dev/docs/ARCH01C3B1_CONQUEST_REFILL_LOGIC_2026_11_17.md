# ARCH-01C3b1 — безопасное удаление Conquest→economy через перенос refill API

**Дата:** 17 ноября 2026. **Основной трекер:** [Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132).
**Опубликованная версия:** v129, root `e940aade2caa4d87d3b5ba83fb4cbb4c8593760e`, SW `c79e8f534f`, подтверждены [official publish #44032478163 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44032478163) и [independent Pages #44033770546 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44033770546). Строгий baseline на опубликованной v129 — 7.

## Виртуальное доказательство Stage A, не production

В независимой диагностике [Draft PR #152](https://github.com/mryandexxx-spec/Dgoh-game/pull/152), [CI #44036071756](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44036071756), настоящий esbuild подтвердил:
- Conquest включает **106 модулей в существующей циклической ESM-компоненте**; всего в игре 2 SCC, 173 JS/167 SPLIT.
- Попытка переноса order-only `data/conquest-data→ui/overlays/celebrate`: **NO-GO 0/35** (лучший вариант сдвигал 47, простое удаление 162 модулей). Сохраняем без изменений.
- Перенос **двух живых** `cqRfN`/`cqRfCost` из data в `logic/conquest.js` с переключением существующего UI-потребителя на logic и без добавления нового пути импорта: **GO 4/4** `moved=0, missing=[], extra=[]`. Точный порядок **167/167**, две старые SCC, размер Conquest SCC по-прежнему 106. Это необходимое условие; реальный runtime/TDZ и поведение требуют независимой приёмки CI.

## Точный diff Stage B

1. `src/data/conquest-data.js`: удалены **только** `import { refillPrice, todayKey } from '../logic/economy.js'`, два прежних тела функций пополнения и два named exports. Все правила, диски, награды, подвиги и `cqBump/cqScore` остаются прежними. Импорт `→ui/overlays/celebrate` **НЕ удалён**, `→core/state` и `→logic/conquest` тоже остаются.
2. `src/logic/conquest.js`: существующий `import { enemyProg } from './economy.js'` расширен именами `refillPrice,todayKey` (нового пути нет), а `cqRfN,cqRfCost` определены **байт-в-байт прежними телами** и экспортированы как раньше.
3. `src/ui/views/conq.js`: UI уже импортировал оба модуля; те же два named imports теперь получаются из `logic/conquest.js` вместо data. Код кнопки, списание 50 единиц Решимости, проверка предела 15 пополнений, `todayKey()`, `persist()` и рендер не меняются.
4. `tools/arch-import-baseline.json`: удалено **ровно одно** теперь отсутствующее запрещённое ребро, **7→6**, новые/stale **0**. Существующие архитектурные регрессии C1/C2/C3a обновлены для новой точной длины baseline, их поведенческие требования сохранены. Добавлен обязательный `tests/ci/arch01c3b1-refill-boundary.mjs`.
5. Новый runtime-тест `tests/arch01c3b1-conquest-refill.mjs` в обязательном CI на **реальном PWA и portable artifact** проверяет 21 точную цену пополнений (с 0 по 20), восстановление цены при смене дня в обе стороны, live состояние после смены сейва, изменение числа пополнений без кеширования, старую сумму наград/подвиг `cqBump('win',null,30)` и уведомление `NOTES`.

## Незыблемые инварианты (fail-closed)

- Архитектура: **6 historical / 0 new / 0 stale**, **167/167** прежних ESM slots, **898** публичных имен без потери, 173 JS, прежние **2 SCC** (Conquest 106). Не ослаблять `check-bundle` или `SPLIT`.
- Не изменять реальные лимиты энергии `CQ_EN.max=100`, восстановление `CQ_EN.sec=180`, `CQ_RF.amt=50`, цену `refillPrice(n)=50·2^floor(n/3)`, `REFILL_MAX=15`, `todayKey()`, недельный rollover `cqWeek()`, сложность и пути `cqLayout/cqOpen/cqRoute`, награды/диски, сохранения `S.cqRf/S.conq`.
- Все 3 pinned SHA-256 косметики в PWA и artifact: права `d451f070fde45c721f379161fe3bc8fbd1d29b9649964957ec31591c8e912a55`, каталог SVG `64a85568c392122adf50284fde0d2f83e1cf82ec667571808b93710d69b48dd8`, червь/профиль HTML `737995ab60dc152a2b39a4fa6002114aef1b45c9cc123396edb0bd491f52cde2`. Все 210 NODES SHA `b33150786a9b8c17abc60a9c1df1b40019ab9f6b6335a0c6d3287837d9beaa48`, 4096 RNG, 200 golden battles/meta/saves/41 screens; PWA offline/SW, iPhone DOM, 3D MED/LOW phone+HIGH desktop, strict lifecycle, лагерь и бюджет кадра — без изменений.
- Лагерь, его сцена/UI/кнопки/зоны/стили/навигация не затрагиваются. Все 21 карта/210 миссий Campaign 2.0, игровой баланс, экономика, награды, сейвы и визуальные файлы не меняются. C2d `data/story.js→assets/models.js` остаётся NO-GO.

**Статус:** implementation Draft на проверку. Никакого merge/публикации без нового разрешения владельца. Физический Safari/iPhone v129 ещё не принят. Виртуальная диагностика #152 отдельная и не требует слияния в main.

## Результат CI

**Добавить после финального полного CI**: актуальный run ID, strict 6/0/0, 167, 898, runtime PWA/artifact и golden/WebGL PASS. Не объявлять до фактического успеха.
