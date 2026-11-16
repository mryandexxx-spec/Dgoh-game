# ARCH-01C2d · order-only story → 3D asset models — предреализационная диагностика

Дата: 17.11.2026. Владелец принял и разрешил слияние C2c, [PR #143 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/143), `main=02a4f0143acedbac859d57be0719c6b4f58352f7`; [полный CI #43957569960 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43957569960). **Опубликована v127** (в версии нет C2b/c), физическая Safari/iPhone v127 остаётся непроверенной. [ARCH-01C Issue #132](https://github.com/mryandexxx-spec/Dgoh-game/issues/132).

## Проблема

Сохранилось 11 исторических запрещённых `data→*` импортов, один из них **`data/story.js → assets/models.js`**, ровно одна строка:

`import '../assets/models.js'; // порядок исполнения`

`data/story.js` экспортирует исключительно `STORY` и `BIOS`; никаких значений из `assets/models.js` не использует. Однако это **не мёртвый импорт**: `assets/models.js` выполняет `b3Pre(loadAssets3)` на верхнем уровне, подготавливает `ASSET` / `MODEL_DATA` / `WORM_IMG`, участвует в циклах ESM `models↔render3d/scenes/baker.js` и `models↔render3d/scenes/camp.js`. `baker.js` и `camp.js` уже имеют named imports из `assets/models.js`; перенос или удаление в одном месте способен изменить TDZ и момент регистрации 3D-ассетов. Порядок 3D сцены (в том числе лагерь!) **строго неприкосновенен**.

**Известный NO-GO:** в C0 прямое виртуальное удаление `story→models` сдвигало около 60 модулей. Изменять `SPLIT` под новый случайный порядок, удалять `b3Pre` или отключать CI запрещено.

## Стадия A — диагноз, никаких изменений игры

[Ветка диагностики](https://github.com/mryandexxx-spec/Dgoh-game/tree/audit/arch01c2d-story-models-order-probe) запускает только `dev/tests/ci/arch01c2d-virtual-story-models.mjs` через существующий AST gate и этот документ. Test вызывает реальный production-config esbuild с `format:'esm'`, `treeShaking:false`, `entry:src/main.js` и симулирует **в памяти**:
- контрольную сборку из текущего `main` с точным совпадением всех **166** `SPLIT` marker;
- удаление только запрещённого import (`remove-only`) — проверить точные `missing/moved`;
- безопасные на первый взгляд варианты импорта `assets/models.js` из *уже существующих* не-data владельцев исполнения (`render3d/scenes/hero.js`, `base-scene.js`, `camp.js`, `baker.js`, `render3d/engine-host.js`, `render3d/base.js`, `render3d/characters/*`, `ui/router.js`, `ui/overlays/squad-select.js`, `core/boot.js`) перед первым или после последнего импорта.

Каждый сценарий выводит `exact`, `moved`, `missing`, `extra`, `relativeInversions`, первую перестановку и список первых 9 затронутых модулей. Скрипт печатает входящие рёбра `story/models/baker/camp` и существующие SCC. **Ни один кандидат ещё не утверждён**. Нельзя продвигать вариант `exact:false`; даже при `exact:true` надо затем сравнить *реальные побочные эффекты* ESM/3D, а не только имена.

На этом шаге не меняются `dev/src/**`, `SPLIT`, `arch-import-baseline.json`, версия, golden, артефакты или root PWA. Baseline остаётся **11**. Полный CI может запускаться стандартным workflow, публикация на Draft отсутствует.

## Контракт будущей реализации — только при доказанной безопасности

1. Сохранить **все старые 166 ESM-маркеров в исходном порядке**, прежние 2 SCC без новых TDZ, все 3D `b3Pre` hooks и раннюю загрузку `MODEL_DATA`/KTX2/мокапа.
2. Переносить зависимость только в собственника исполнения вне `data`; убрать ровно `data/story.js → assets/models.js`, baseline **11→10**, без добавления новых запрещённых `data→*`. `STORY/BIOS` и их 210 сюжетных ссылок бит-в-бит неизменны.
3. Сохранить текст/истории и полный SHA-256 210 `NODES`: `b33150786a9b8c17abc60a9c1df1b40019ab9f6b6335a0c6d3287837d9beaa48`, прежний RNG, `nodeOpen`, стоимость энергии, rewards, save schema. Проверить PWA и artifact.
4. В полном CI проверить AST gate, строгий check-bundle, golden battles/meta/saves/41 screens, offline/SW, E3 DOM, WebGL/MED/LOW phone+desktop, строгий 3D lifecycle и **лагерь неизменённым**. Не обновлять golden и скриншоты.
5. Один отдельный feature Draft PR после GO/NO-GO. **Без merge и публикации** до нового согласия владельца. Лагерь (UI/сцена, зоны/кнопки/стили/навигация) запрещено менять.

## Фактический результат и решение

Ожидается CI с реальными числами для 27 виртуальных вариантов. **По умолчанию NO-GO для внедрения, пока не найден точный ESM-preserving вариант.**
