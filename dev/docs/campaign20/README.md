# Campaign 2.0 — главный указатель (15.11.2026)

## C4.20 «Последняя ставка» / «Сломанная печать» — feature Draft (v122 без изменения)

**Этап A утверждён владельцем; этап B реализован в [Draft PR #117](https://github.com/mryandexxx-spec/Dgoh-game/pull/117).** [Утверждённый art/tech handoff](C4_20_BROKEN_SEAL_APPROVED_2026_11_16.md) · [full implementation CI #43770272585 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43770272585) · [22 настоящих WebGL PNG](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43770272585/artifacts/14184247500). MED/HIGH 111 meshes/6779 vertices; LOW 102/6099; lifecycle ×3 PASS. **Художественная приёмка 22 WebGL-кадров подтверждена владельцем («Ок», 16.11.2026); без merge/release/version bump до отдельных разрешений.**

## Последний опубликованный релиз — C4.19 «Легионы Салусы» / «Марш, стёртый ветром» · v122

**v122 ОПУБЛИКОВАНА 15.11.2026:** Тёмная VI `D:5`, миссии 120–129, уровни 43–56, 20-я из 21 самостоятельных Babylon 3D карт. [Issue #110](https://github.com/mryandexxx-spec/Dgoh-game/issues/110), [Implementation PR #112 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/112) `3d0da968f2d6`, [Implementation CI #43753939000 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43753939000), [22 настоящих WebGL PNG MED/LOW](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43753939000/artifacts/14177742425). Канон 210 миссий, награды, экономика, сохранения без изменений; lifecycle MED/HIGH 119 meshes/7745 vertices, LOW 107/6664, 3× PASS.

По отдельной команде владельца «Сливай и выпускай» — [release PR #113 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/113) `6ba3da1810e7`, [release CI #43761318100 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43761318100), [main CI #43761986252 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43761986252), [one-shot guard #43761986250 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43761986250), [official validated publish #43761996195 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43761996195) и [Pages #43762773320 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43762773320). Root `c6dd5a91091cb830a5ea4f30ddfad07d0a43861c`, `dev/version.json=122`, app.js `v122 · 8ad3787e3c`, SW cache `8ad3787e3c`, 188 verified SHA-256 files. [Полная передача v122](C4_19_V122_RELEASE_HANDOFF_2026_11_15.md); [игра на GitHub Pages](https://mryandexxx-spec.github.io/Dgoh-game/). Физический iPhone Safari, жесты/бой/fallback/offline и FPS/нагрев/батарея ещё не измерены.

**Следующий художественный этап:** [Issue #115 — C4.20 «Последняя ставка», Тёмная VII `D:6` (130–139)](https://github.com/mryandexxx-spec/Dgoh-game/issues/115) и [handoff после подтверждённой v122](C4_20_AFTER_V122_HANDOFF_2026_11_16.md). Финальные уровни 57–70, последняя из 21 самостоятельных карт. **Первым делом прочитать Issue и handoff**, сверить канон `CAMP_DEF.D.chapters[6]`, затем предложить 3 разные художественные концепции и рекомендованную детальную спецификацию на согласование. **Только этап A:** не повторять существующие карты, не менять игровой код, не открывать feature PR, не повышать версию, не выполнять merge или публикацию до отдельного согласия владельца.

## Предыдущий опубликованный релиз — C4.18 «Наследник» / «Венец без трона» · v121

**v121 ОПУБЛИКОВАНА 15.11.2026:** Тёмная V `D:4`, оригинальные миссии 110–119, уровни 31–42, 19-я из 21 авторских Babylon-карт. Художественно принята и [Implementation PR #107 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/107) `178502971cd`; [финальный art CI #43724511596 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43724511596), [22 настоящих MED/LOW WebGL кадра](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43724511596/artifacts/14165793936). Оригинальный канон, 210 миссий, баланс, экономика и сохранения не изменены. Lifecycle MED/HIGH **134 meshes / 7610 vertices**, LOW **117 / 6751**, 3× без утечек.

По команде владельца «Сливай и выпускай»: [релизный PR #108 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/108) `0ace9e878`, [release PR CI #43742998526 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43742998526), [main CI #43743577876 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43743577876), [one-time guard #43743577871 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43743577871), [official validated publish #43743591453 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43743591453) и [Pages #43744361527 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43744361527). Root `c17770f89b762ca642fdb6b05578d31157df3774`, `dev/version.json=121`, SW cache `9f55a9a721`, 188 validated SHA-256 файлов. [Полная передача v121](C4_18_V121_RELEASE_HANDOFF_2026_11_15.md). Safari/iPhone физически ещё не проверены.

## Предыдущий опубликованный релиз — C4.17 «Правление Зверя» / «Железная квота» · v120

**Художественно принята и слита в main:** [Issue #100](https://github.com/mryandexxx-spec/Dgoh-game/issues/100), [PR #102 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/102) `2679f819d1427c25083c22430ba405f5b655ca9a`; [полный art CI #43709919830 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43709919830), [main CI #43713070854 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43713070854). 18-я из 21 самостоятельных Babylon-карт: Dark IV `D:3`, канонические ID 100–109, уровни 21–30. Одна солнечная промышленная долина: приказ Раббана, цистерны, комбайн, засада, пост Кайнса, выжженный сиетч, караван, фримены, закупоренные колодцы и Стилгар. [22 настоящих WebGL MED/LOW PNG](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43709919830/artifacts/14160197145); lifecycle MED 154/7527, LOW 127/6655, HIGH 154/7527, 3× и без роста ресурсов.

**v120 ОПУБЛИКОВАНА 15.11.2026** по отдельной команде владельца «Сливай и публикуй». [Release PR #103 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/103) `9b1a8b2`, [full release PR CI #43713420203 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43713420203), [main CI #43713999317 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43713999317), [одноразовый guard #43713999321 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43713999321), [official validated publish #43714007861 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43714007861), [отдельный Pages #43714744797 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43714744797). Root PWA commit `8b25fff32095700e21d8b0960f5a3694c481a9db`, `dev/version.json=120`, SW cache **`5c7310b18b`**, 188 validated SHA-256 files. [Полная передача v120](C4_17_V120_RELEASE_HANDOFF_2026_11_15.md). Исходные 210 миссий, диалоги, награды, баланс, экономика и сохранения не менялись. Физические iPhone/Safari тесты остаются открытыми.

## Выпуск C4.18 · v121 — подтверждённая публикация

Подробные реализации, тесты и публикационные SHA: [полный v121 release handoff](C4_18_V121_RELEASE_HANDOFF_2026_11_15.md). [Issue #105](https://github.com/mryandexxx-spec/Dgoh-game/issues/105) и [Implementation PR #107 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/107).

## Исторический handoff: C4.19 после v121

[Issue #110](https://github.com/mryandexxx-spec/Dgoh-game/issues/110) и [C4.19 после v121](C4_19_AFTER_V121_HANDOFF_2026_11_15.md) описывают художественный старт (историческая постановка); реальный результат — опубликованный v122 выше.

## Последний опубликованный релиз — C4.16 «Ночь длинных ножей» / «Гаснущая корона» · v119

**Художественно принята и слита в main**, [Issue #95](https://github.com/mryandexxx-spec/Dgoh-game/issues/95), [PR #97 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/97), squash `49cec8a7f3605b2325666a65159d756b1aad84bf`; [финальный CI #43699423185 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43699423185). 17-я из 21 отдельной карт Campaign 2.0: Dark III `D:2`, исходные ID 90–99, уровни 13–20. Утверждённая композиция «Гаснущая корона»: отключённые генераторы, ночной штурм стены и казарм, галерея Дункана, ангар, Хават, пылающий Звёздный зал, Лето, выход к песку и последний приказ. [Настоящие WebGL MED/LOW кадры](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43699423185/artifacts/14155673174), целевой lifecycle MED 190/8479, LOW 150/7191, HIGH 190/8479, Golden/PWA/perf SUCCESS.

**v119 опубликована 15.11.2026** после отдельной команды владельца «Сливай и выпускай»: [release PR #98 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/98), [release PR CI #43701560974 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43701560974), [main CI #43702047971 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43702047971), [одноразовый publish guard #43702047965 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43702047965), [official validated publish #43702058210 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43702058210), [Pages #43702687728 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43702687728). Root PWA `d948026965b837f7b9923f9ee608d18e3ca9a46d`, `dev/version.json=119`, cache **`5433bc45aa`**, 188 SHA-256 validated files. [Полный handoff v119](C4_16_V119_RELEASE_HANDOFF_2026_11_15.md). Исходные 210 миссий, сюжет, враги/боссы, награды, экономика и сохранения не менялись. Safari/iPhone остаётся отдельной проверкой.

## Исторический handoff: старт C4.17 после v119 — Тёмная IV `D:3` (100–109)

**Начало следующего чата:** [Issue #100 — C4.17 «Правление Зверя»](https://github.com/mryandexxx-spec/Dgoh-game/issues/100) и [C4.17 handoff после v119](C4_17_AFTER_V119_HANDOFF_2026_11_15.md). 17/21 авторских карт опубликованы, 4 тёмные главы D:3..D:6 остаются. Следующая — оригинальные миссии 100–109, уровни 21–30, главы `CAMP_DEF.D.chapters[3]` и мотивы дневной добычи пряности, давления Раббана и фрименского сопротивления. Начать только художественный этап A: 2–3 различные концепции, выбор одной владельцем, затем отдельное разрешение на реализацию. Не создавать игровые feature-ветки/PR, не менять канон, версию, не выполнять merge/release без разрешения.

## Предыдущий опубликованный релиз — C4.15 «Битва за Арракин» / «Шрам Защитной стены», v118

**v118 подтверждённо опубликована 15.11.2026.** [Issue #90](https://github.com/mryandexxx-spec/Dgoh-game/issues/90), [PR #92 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/92), [release #93 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/93), [cleanup #94 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/94). Light VII `L:6`, ID 60–69, 16-я авторская карта «Шрам Защитной стены». [Официальный publish #43692643421 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43692643421); [Pages #43693224667 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43693224667); `app.js`/SW `v118 · 25bfb36516`. [Handoff v118](C4_15_V118_RELEASE_HANDOFF_2026_11_15.md). Физическая iPhone Safari проверка остаётся открытой.

## Предыдущая опубликованная версия — v117, C4.14 «Прибытие императора»

**«Зеркало Падишаха» опубликовано 15.11.2026:** Light VI L:5, исходные 50–59, неповреждённая Защитная стена и парад сардаукаров. [PR #87 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/87), [релиз #88 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/88). [CI/Pages #43685018421 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43685018421), [Pages #43685592345 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43685592345). Исторический root cache v117: 687dd0b25e. [Подробный v117 handoff](C4_14_V117_RELEASE_HANDOFF_2026_11_15.md).
## Предыдущий релиз — v116 (C4.13 + рамки ростера)

**v116 опубликована 15.11.2026:** C4.13 «Годы в пустыне» (Светлая V `L:4`, 40–49) и утверждённые рамки ДП и золото легенд. [Validated PWA/Pages #43643649804 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43643649804), [Pages deployment #43644584536 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43644584536), root SW `a2fe3534af`. [Handoff v116](C4_13_V116_RELEASE_HANDOFF_2026_11_14.md). Это исторический релиз.

## Предыдущий релиз — C4.12 «Сиетч Табр» (`L:3`, 30–39), v115 ОПУБЛИКОВАНА 14.11.2026

**14.11.2026 владелец разрешил выпуск v115.** Художественная концепция [«Сердце воды»](C4_12_HEART_OF_WATER_CONCEPT_2026_11_14.md) и настоящие WebGL MED/LOW приняты. [Реализация PR #78 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/78), code SHA `a25240b4`; [полный PR CI #43628714583 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43628714583). [Issue #76](https://github.com/mryandexxx-spec/Dgoh-game/issues/76) содержит решения владельца. **Релиз v115 завершён:** [release PR #79 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/79) (merge `ba3cd350`), [release PR CI #43630988857 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43630988857), [main CI + verified PWA publish #43631382200 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43631382200), [Pages deployment #43631500937 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43631500937). Root publication SHA `82b4ecad`, `app.js`/`sw.js`: **`v115 · 59b91969b0`**. [Полный v115 release handoff](C4_12_V115_RELEASE_HANDOFF_2026_11_14.md).

В главе Светлой стороны IV `L:3` (исходные миссии 30–39, уровни 21–30) реализована уникальная единая Babylon-диорама сиетча: испытание Джамиса, священное водохранилище, уроки Чани, ловушки росы, склад, вызов червя, каратели, ложная тропа, знамение и принятие имени Муад’Диб. География ведёт от пещер к вылазкам в пустыню. Shared EngineHost/GameScene, MED/LOW, 2D fallback, исходные жесты v101, 2–4 последовательных world-space маркера 50/60px без overlap. **Не изменены 210 ID, сюжет, боевой состав, награды, баланс, экономика и сохранения.** **13/21 самостоятельных окружений опубликованы** в v115.

**Предыдущая C4.11 «Бегство» / «Разлом Бури» — v114 опубликована 14.11.2026.** [PR #74 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/74), [release PR #75 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/75), [main CI + verified Pages publish #43606151061 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43606151061), [Pages deployment #43606690817 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43606690817); root PWA SHA `175551a2`, cache `v114 · 41ae5b6ad1`. [v114 release handoff](C4_11_V114_RELEASE_HANDOFF_2026_11_14.md).

**Следующий отдельный художественный этап после v115: C4.13 — Светлая V `L:4` «Годы в пустыне» (40–49, уровни 31–42).** Начинать после релиза v115 с канона и сравнения 2–3 самостоятельных концепций, без правок игрового кода до утверждения. Физические iPhone Safari FPS, нагрев и батарея для новой C4.12 ещё не измерены; Chromium WebGL и художественная приёмка не заменяют эти измерения.

### Ниже — исторические передачи этапов


**C4.10 · «Песчаные черви Дюны», `C:6`, 200–209 — v113 ОПУБЛИКОВАНА 14.11.2026.** [PR #71 MERGED](https://github.com/mryandexxx-spec/Dgoh-game/pull/71), [PR CI SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43592759733), [main Validate/Publish SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43593325880), [Pages SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43593921987), опубликованный PWA SHA `2682c3f9`; футер `v113 · db25b7661b`. [Реальные WebGL MED/LOW кадры](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43590545775/artifacts/14112485804), [концепция](C4_10_PULSE_OF_DEPTHS_CONCEPT_2026_11_14.md), [v113 release handoff](C4_10_V113_RELEASE_HANDOFF_2026_11_14.md). Исходные миссии, баланс, сохранения неизменны; физическая iPhone Safari-проверка FPS/нагрева пока открыта.



**Статус на начало выпуска C4.9:** опубликована **v111** до главы C4.8 включительно; последняя художественно принятая C4.9 `C:5` (190–199) разрешена владельцем к релизу **v112** («Выпускаем» 14.11.2026), но до PR CI, main CI и Pages **v112 остаётся релиз-кандидатом**. [PR #68](https://github.com/mryandexxx-spec/Dgoh-game/pull/68), [release handoff v112](C4_9_V112_RELEASE_HANDOFF_2026_11_14.md); v111 [handoff](C4_8_V111_RELEASE_HANDOFF_2026_11_14.md).

**Основная ветка:** `main`; для новых доработок создавать отдельную ветку и Draft PR, релиз — только после согласования.

## C4.9 · Битва за Коррин — релиз-кандидат v112, выпуск разрешён (14.11.2026)

Концепция **«Разорванный венец»** и финальные WebGL MED/LOW **приняты владельцем («Все ок»)**, затем отдельно дана команда **«Выпускаем»** 14.11.2026. [PR #68](https://github.com/mryandexxx-spec/Dgoh-game/pull/68), глава `C:5`, 190–199, единая осада Коррина и орбитальный Хретгир, падение сети Омниуса в 196 и его финального ядра в 199. Принятый [CI #43579708606](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43579708606) **SUCCESS**, [8 WebGL MED/LOW кадров](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43579708606/artifacts/14108245684). [Полная концепция](C4_9_CORRIN_BATTLE_CONCEPT_2026_11_14.md), [релизный handoff v112](C4_9_V112_RELEASE_HANDOFF_2026_11_14.md), [Issue #67](https://github.com/mryandexxx-spec/Dgoh-game/issues/67). **Повторный PR CI после bump v112, затем merge/main CI/Pages обязательны.**

## C4.8 · Крестовый поход машин — v111 опубликована (14.11.2026)

Владелец художественно принял «Конвой непокорённых» (C:4 180–189, уровни 52–64), затем отдельно разрешил выпуск («Выпускай»). [PR #66](https://github.com/mryandexxx-spec/Dgoh-game/pull/66), [концепция](C4_8_MACHINE_CRUSADE_CONCEPT_2026_11_14.md), [CI #43566991080 SUCCESS](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43566991080), [MED/LOW WebGL](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43566991080/artifacts/14103037144), [release handoff v111](C4_8_V111_RELEASE_HANDOFF_2026_11_14.md). Перед публикацией необходим CI на версии v111, а после merge — SUCCESS main CI и Pages.

## C4.7 · Батлерианский джихад — v110 опубликована (14.11.2026)

Художественно принято по реальным WebGL MED/LOW, разрешено выпустить владельцем («CI прошел, выпускай»). Включены оригинальные 170–179 и исправление 3D world HUD. [Release handoff](C4_7_V110_RELEASE_HANDOFF_2026_11_14.md) и [PR #62](https://github.com/mryandexxx-spec/Dgoh-game/pull/62). [Main CI #43524991698](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43524991698) и [Pages #43526439762](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43526439762) завершились SUCCESS.

## C4.6 · Дом Коррино — v109 опубликована и принята (13.11.2026)

**Владелец после просмотра реальных WebGL MED 844×390 / LOW 667×375 ответил «Согласовано».** Художественная и техническая реализация главы `C:2` (оригинальные миссии 160–169) объединена через [PR #60](https://github.com/mryandexxx-spec/Dgoh-game/pull/60). [Полный успешный CI #845](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43489008045) после повторной проверки нестабильного `memory-ix-dom`; [архив настоящих WebGL-кадров](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43489008045/artifacts/14068971483). [Детальный handoff](C4_6_CORRINO_IMPLEMENTATION_2026_11_13.md).

**Релиз v109 завершён:** PR #60 MERGED (`2a4e39ff`); [main релизный CI #43502576987](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43502576987) SUCCESS, PWA SHA `7f039b31`, [Pages #43504272925](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43504272925) SUCCESS. [Финальный handoff C4.6](C4_6_V109_RELEASE_HANDOFF_2026_11_13.md). Физические измерения FPS/нагрева на iPhone не заявлены. Следующий этап — C4.7 `C:3` «Батлерианский джихад» (40–52; миссии 170–179); сначала новая концепция, отдельная ветка после её согласования.

## Актуальный статус после v107 (13.11.2026)

**C4.4 — `C:0` «Хроники: Дом Атрейдесов» реализована, опубликована и принята владельцем («все ок»).** PR [#57](https://github.com/mryandexxx-spec/Dgoh-game/pull/57) MERGED (`698e21c`), версия 105; публикационный коммит `31995c6`. Реальный WebGL 844×390 MED / 667×375 LOW, Golden, 3D lifecycle, UI и обязательные CI-гейты пройдены, окончательный повторный [CI #801](https://github.com/mryandexxx-spec/Dgoh-game/actions/runs/43436276764) SUCCESS. Исторический статус C4.4; следующая глава C4.5 уже опубликована в v107.

**C4.5 v107:** [релизный handoff](C4_5_V107_RELEASE_HANDOFF_2026_11_13.md); [PR #59](https://github.com/mryandexxx-spec/Dgoh-game/pull/59) MERGED, реальные MED/LOW кадры и полный успешный main-CI. После релиза владелец подтвердил «Все ок». **Историческая запись:** после C4.5 планировалась C4.6; её реализация уже художественно согласована и ждёт отдельного релизного разрешения (см. раздел выше). Текущий `main` уже содержит независимую v108.

**Главный источник передачи контекста после C4.5: [C4_5_V107_RELEASE_HANDOFF_2026_11_13.md](C4_5_V107_RELEASE_HANDOFF_2026_11_13.md).** Ниже — исторические записи, они не описывают текущую стадию.

## Текущее состояние после v104 (13.11.2026)

**Campaign 2.0 C1–C3 и три художественных окружения приняты и опубликованы.** C4.1 `D:0` «Гиеди Прайм» — v102; C4.2 `L:1` «Арракин» — v103; C4.3 `D:1` «Заговор» — **v104**. Реальные MED/LOW WebGL-кадры C4.3 художественно утверждены, опубликованный v104 владелец подтвердил «Все ок»; PR #55 MERGED, полный main-CI #43423234817 и Pages #43423234013 SUCCESS.

Следующее направление по утверждённому C4-плану: **C4.4 — `C:0` «Хроники: Дом Атрейдесов»**. Не переиспользовать Гиеди/Каладан как «новую» сцену без самостоятельной географии; сначала проверить сюжетную последовательность десяти миссий, разработать художественный концепт/макеты MED/LOW, согласовать владельцем, затем отдельная реализация. Общие EngineHost/GameScene, принятые свайпы v101, 10 существующих IDs на главу, отсутствие лишних навигационных кнопок, локально последовательные world-space маркеры и fallback обязательны.

**Главный handoff:** [C4_3_V104_RELEASE_HANDOFF_2026_11_13.md](C4_3_V104_RELEASE_HANDOFF_2026_11_13.md). Исторические описания ниже оставлены для справки, не использовать их статусы как текущие.

## Актуализация C4 — 2026-11-13

C1–C3 реализованы и опубликованы; статус C2/C3 ниже в этом файле — **исторический**. По отзыву владельца управление свайпами v101 принято на iPhone и не должно меняться.

**Статус после v102:** C4.1 D:0 «Гиеди Прайм» реализована, художественно принята и опубликована. Следующий этап — C4.2 L:1 «Арракин», начинать с художественного макета. Исторический концепт C4.1 и его макет сохранены здесь:
- [**Актуальный handoff после публикации v102, результаты CI и следующий C4.2**](C4_1_RELEASE_HANDOFF_2026_11_13.md)
- [Концепция, план, правила и handoff](C4_ENVIRONMENTS_CONCEPT_2026_11_13.md)
- [HTML/SVG-макет Гиеди Прайм, переключение 844/667](mockups/c4/giedi-prime.html)

Макет — художественная схема, не настоящий WebGL. Только после художественного согласования делать 3D-реализацию и её CI в отдельной ветке. Не меняем базовый Каладан, свайпы, 210 миссий, GE2, сохранения и экономику.

## Начать здесь
1. Прочесть `dev/ARCHITECTURE.md`, `dev/docs/PROJECT_INSTRUCTIONS.md`, «Открыто» в `dev/CHANGES_STATUS.md`.
2. `CAMPAIGN20_SPEC.md` — согласованная постановка и UX-контракт.
3. `IMPLEMENTATION_PLAN.md` — архитектура, поэтапная реализация C2–C5, тесты и performance gates.
4. `HANDOFF_2026_11_12.md` — текущее состояние и команда для следующего чата.
5. `mockups/v2/mockup.html` — утверждённый интерактивный прототип. Открывать `mockups/v2/844x390.html` или `mockups/v2/667x375.html` (iframe ищет `mockup.html` в той же папке).
6. `mockups/v1/` — исторический первоначальный вариант (до увеличения узлов).

**Важно:** v1/v2 — HTML+SVG-имитация диорамы, **не готовая сцена Babylon.js**. Никаких выводов о фактической WebGL-производительности из этого макета делать нельзя. Утверждённый v2 увеличивает обычные маркеры примерно с 34 до 50 px, босс-маркеры с 40 до 60 px; сверять с v2 и реальными мобильными viewport.

## Репозиторий, существующая логика
- `dev/src/ui/views/camp.js` — текущий экран, который заменяем после пилота.
- `dev/src/data/campaigns.js` — `CAMP_DEF`, `NODES`, `campNodes`, `chapNodes`, `nodeOpen`, `nodeTitle`, `nodeEn`, `nodeCost`.
- `dev/src/ui/events.js` — маршруты `data-ctab`, `data-cch`, `data-csel`, `data-node`, `data-sim`, `data-dlgview`.
- `dev/src/ui/overlays/sim.js`, `dev/src/ui/overlays/info.js`, `dev/src/ui/overlays/squad-select.js` — существующие действия миссий и навигация из фарма.
- `dev/src/render3d/engine-host.js`, `dev/src/render3d/game-scene.js`, `dev/src/render3d/quality.js` — обязательный контракт рендера.
- `dev/docs/ui_kit.html` — токены, Forum / IBM Plex Sans / IBM Plex Mono.

Сохранить 210 миссий (3 режима × 7 глав × 10 миссий), индексы `NODES`, награды, правила доступа и старые сохранения. В ходе C2 сначала сделать макет/прототип, без незапрошенного релиза.

## История согласований
- Согласовано: две большие обложки «Сюжет»/«Хроники», у Сюжета — Светлые/Тёмные + главы, у Хроник — только главы; все оболочки без scroll.
- Согласовано: 3D-диорама с перемещением/зумом/ограниченным поворотом.
- Согласовано: компактная карточка выбранной миссии поверх карты + детальная модалка.
- Согласовано: сначала Каладан, затем остальные 20 глав.
- Согласовано после просмотра v1: увеличить узлы миссий; эталон — v2.
- 2026-11-12: владелец разрешил перейти к следующему этапу C2 и потребовал сохранить в GitHub всю проработку и макеты для восстановления контекста.
