# ARCH-01C3b0 — Conquest: архитектурная диагностика четырёх обратных импортов

**Дата:** 17 ноября 2026. [Основной трекер #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132) · [дорожная карта](PRODUCT_AUDIT_ROADMAP_2026_11_16.md). Владелец после опубликованной v129: «Продолжаем» — начать следующий отдельный пакет, **не разрешение на merge/publish**.

## Источник истины и зафиксированная база

`main=e940aade2caa4d87d3b5ba83fb4cbb4c8593760e`, опубликована **v129**, SW `c79e8f534f`, [official validated publish #44032478163 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44032478163), [independent Pages #44033770546 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/44033770546). 173 JS/167 SPLIT markers, 2 прежние SCC, 898 экспортов, **7 исторических запрещённых data→runtime импортов (новых 0)**. [PR #149 ARCH-01C3a3 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/149); C2d `data/story.js→assets/models.js` остаётся **NO-GO** (39/39 виртуальных вариантов переставляли порядок).

## Рёбра и фактические контракты

`data/conquest-data.js` сейчас импортирует из runtime:

| Ребро | Тип использования | Ограничение |
| --- | --- | --- |
| `→ logic/conquest.js` | **живой named** `cq` | `cqK()`, `cqScore()`, `cqBump()` вызывают `cq()` в момент действия. Обратная ссылка `logic/conquest.js → data/conquest-data.js` образует циклическую ESM-инициализацию. Нельзя удалять import напрямую или менять порядок `cq`/правил без независимой проверки TDZ и save compatibility |
| `→ ui/overlays/celebrate.js` | **только side-effect import**; пометка «порядок исполнения» | Нет значений из UI в data. Теоретический кандидат на перенос ownership в композиционный/UI-слой, **только если 167/167 старых маркеров сохраняют позиции** |
| `→ core/state.js` | **живые named** `NOTES`, `S` | `cqBump` добавляет уведомления в NOTES; `cqRfN` использует `S.cqRf`. Перенос только через контракт стейта/logic, без дублирования или изменения persist |
| `→ logic/economy.js` | **живые named** `refillPrice`, `todayKey` | `cqRfN/cqRfCost` задают реальные цены пополнения и локальное правило смены дня. Нельзя менять экономику/время, рассинхронизировать сейвы |

В графе нужно сохранить `logic/conquest.js ↔ data/conquest-data.js` либо разорвать его только отдельным функциональным переносом с доказанной прежней инициализацией. Функции `cqK`, `cqBump`, `cqScore`, `cqRfN`, `cqRfCost` экспортируются для игрового Conquest и UI; их API и все фактические награды, уровни, выносливость, диски и маршруты нельзя менять.

## Стадия A: только виртуальный ESM-анализ, без изменения игры

`dev/tests/ci/arch01c3b0-virtual-conquest.mjs` подключён к обычному mandatory AST gate. Он:

1. AST-проверкой подтверждает четыре обратных ребра и три живых named контракта; печатает SCC, связанную с Conquest.
2. Собирает **реальную исходную production esbuild конфигурацию** с исходными `167` маркерами и подтверждает полную идентичность `SPLIT`.
3. Только *в памяти* убирает side-effect `data/conquest-data.js→ui/overlays/celebrate.js` и перебирает **35** сценариев (удалить без замены; 15 заранее существующих UI/entry владельцев × вставка перед первым/после последнего импорта; а также 4 конкретных места Conquest/boot).
4. Для каждого печатает `exact/moved/missing/extra/first/preview`. При полном несоответствии даже одного старого маркера — **NO-GO** и baseline остаётся 7. При `exact:true` — разрешён лишь *следующий этап проектирования* реальной boundary-правки, но не автоматический merge: обязательны отдельные TDZ, API, save и UI/runtime проверки.

В этой стадии **не меняются** `dev/src/`, `dev/tools/arch-import-baseline.json`, `dev/tools/split.config.mjs`, version, SW, root PWA, PWA/artifact golden, экономика, игровая логика, ассеты. Не затрагивать лагерь целиком (UI/3D/зоны/кнопки/стили/навигация), 21 карту/210 миссий Campaign 2.0, баланс, сейвы и офлайн. Все immutable косметические SHA, 210 NODES SHA, 200 battles/meta/saves/41 screens, WebGL MED/LOW/HIGH и lifecycle остаются требованием для следующей *реализации*.

## После CI

- Если **0 точных виртуальных кандидатов**, зафиксировать NO-GO для order-only Conquest→celebrate; не ослаблять `check-bundle`, не переписывать `SPLIT`.
- Если есть **хотя бы один exact**, выбрать минимальную UI-owned комбинацию без новых UI→data циклов; только затем Stage B с отдельным feature Draft, строгим импортным baseline 7→6 и regression proof по реальной собранной игре.
- Остальные **три живых импорта** требуют отдельных минипакетов и виртуальной проверки SCC/TDZ и семантики `cqBump/cqScore/cqRfCost`; это не одно механическое удаление.
- **До решения владельца не сливать и не публиковать.** Физическая приёмка Safari/iPhone v129 остаётся открытой.

## Результат

**Заполнить после выполнения CI.** До этого никакая виртуальная конфигурация не объявляется безопасной.
