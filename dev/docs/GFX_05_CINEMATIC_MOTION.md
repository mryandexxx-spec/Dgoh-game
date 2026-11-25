# GFX-05 — Cinematic Motion / предпроизводство, 25.11.2026

Статус: исследование и постановочный макет, НЕ runtime и НЕ художественная приёмка. Владелец ограничил пилот Дунканом (duncan) и Муад’Дибом (muaddib), GFX-04 отложен до возобновления Meshy. Использовать существующие авторские модели; не менять боевые клипы, бой, окружения, UI layout, экономику и сохранения. Легендарная боевая ульта MD-ULT-1 не входит в этап.

## Исследование и выбор
- [Riot Character Animation](https://www.riotgames.com/ru/artedu/character-animation), [Riot Technical Art](https://www.riotgames.com/en/artedu/technical-art), [GDC Animation Summit: uniqueness / impactful combat](https://www.gdcvault.com/play/1027125/Animation-Summit-Animating-a-Complex): выразительная ключевая поза, силуэт, намерение, пауза, перенос веса, вторичное движение. Сначала blocking, затем polishing; не заменять актёрскую игру вспышками. Это принципы, а не утверждение об инструментах конкретной игры.
- Референсы из Art Bible: [Wuthering Waves character menu](https://wutheringwaves.fandom.com/wiki/Category%3ACharacter_Details), [ZZZ agent menu GIFs](https://zenless-zone-zero.fandom.com/wiki/Category%3AAgent_Menu_GIFs), SWGOH — короткая реакция без потери доступности управления. Не извлекать чужие игровые клипы.
- [Babylon advanced animations](https://doc.babylonjs.com/features/featuresDeepDive/animation/advanced_animations) поддерживает смешивание и additive. У нас свой сэмплер DGM; использовать тот же принцип, не внедрять AnimationGroup/новый loader.
- [Blender glTF](https://docs.blender.org/manual/en/4.0/addons/import_export/scene_gltf2.html): Actions/NLA, bake, экспорт. Blender headless CPU — основной инструмент, если текущих клипов мало. Сохранять bind pose, имена костей, веса, модели и материалы. Ретаргет с коррекцией rest-space, foot locks, grip, проверкой в нескольких ракурсах. Источник GLB -> действующий DGM pipeline, не новый runtime.
- [Quaternius Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) / [2](https://quaternius.com/packs/universalanimationlibrary2.html) — CC0, резервные исходные клипы, проверить конкретный файл/лицензию. Generic mocap — черновик, не готовая индивидуальность.
- [Adobe Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html): Adobe ID, бесплатное royalty-free использование в проектах; публичная раздача raw motion в открытом репо/PWA требует отдельной проверки условий, поэтому не использовать по умолчанию.
- [Rokoko Vision](https://www.rokoko.com/products/vision) — резерв video-to-motion с исходной собственной записью и проверкой лимитов/прав экспорта. Не требовать от владельца съёмки, оплаты или регистрации. AI text/video-to-motion не основной путь: дрейф стоп, кисти, пересечения одежды, сомнительный экспорт. Meshy не требуется.
- [MDN reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion) — учитывать OS preference.

## Реальный код и риски
HeroStage в render3d/scenes/hero.js: общий intro 1100 ms, автоматический yaw, drag, celebrate burst 420/220 и flash; quiet() / idleMode() / paused() и пул соседей. mountHeroStage сравнивает HERO_SNAP stars/gear/eq/lvl/sk; relic сейчас отсутствует. Snapshot не доказывает commit: до celebration проверить реальные UI hooks и успешность изменения, исключить импорт, повторное открытие и незавершённую транзакцию. Не связывать motion с commit timing.
authored.js: DGM local-trs, _clipRest, _clipNames, poseModelClip, slerp, сброс rest при смене clip. Duncan: Combat_Stance/Idle_11/Double_Combo_Attack/Sword_Parry_Backward/Triple_Combo_Attack и др.; встроенный меч, showcase head-lift. Muaddib: отдельный warmMuadDib optional load, авторский DGM, hand grip crysknife, привязанные к headfront глаза. Проверить фактическую таблицу клипов Муад’Диба, не предполагать наличие по дефолтной карте; его fallback не должен маскировать приёмку. У двух ригов нельзя слепо переиспользовать локальные оси. pose-generic.js вызывает poseModelClip из общего боевого пути, поэтому новые pose layers исключительно в showcase и после базовой позы, без накопления. Не переиспользовать боевое действие как fake o.act.

## Постановочный макет / стартовые значения
| Состояние | Дункан | Муад’Диб |
|---|---|---|
| Вход 180–300ms | сразу устойчивый 3/4, лёгкая смена взгляда | спокойный фронтальный 3/4, чуть выше взгляд; без отдельной смены FOV |
| Idle 5–8s | дыхание, собранная стойка, едва заметный перенос веса | устойчивый корпус, медленное дыхание, внимательный взгляд |
| Редкий fidget 12–20s | краткое изменение положения плеч/взгляда, меч остаётся в руке | поворот головы, короткая пауза, возврат; ткань только при существующем риге |
| Уровень/экипировка/умение 150–220ms | короткий акцент UI, небольшое выпрямление при необходимости | короткий UI-акцент, без постоянной вспышки |
| Звезда/ДП 350–650ms | собранная торжественная поза, минимальный световой акцент | медленный подъём головы и короткая пауза в уже существующем свете; без нового прохода |
| Drag/next/close/overlay | немедленно отменить событие, штатное вращение, восстановить нейтральную позу | аналогично |
| Reduced motion | статичная читаемая поза, без авто-вращения, камеры, частиц или fidget | аналогично |

Не блокировать кнопки и не дублировать подтверждённые апгрейды. Новое открытие, поздняя загрузка, смена героя, закрытие, sleep/wake, context loss и HERO_HOLD не воспроизводят старую награду. HIGH/MED сохраняют характер; LOW — статическая/упрощённая поза, без добавочных FX; настройки через quality.js. Реальное движение стоп не добавлять без проверки веса и контакта. Не использовать глобальный RNG или персистентный таймер для fidget.

## План исполнения
1. GFX-05/A: реальная лаборатория на актуальном PWA, baseline и inventory фактических DGM tracks, rest/axes, клипов, timestamps. Сравнить 2–3 варианта поз на каждом герое в 844×390/667×375 MED/LOW; выдать последовательности кадров, не AI-картинки. Постановочный макет на согласование до runtime.
2. GFX-05/B: авторские idle и редкие жесты. Сначала использовать существующие clips и минимальные локальные non-accumulating corrections; при плохом результате — Blender keyframe/CC0 retarget, bake и только новые showcase clip IDs. Не менять исходную модель и combat mappings.
3. GFX-05/C: короткие отменяемые переходы, отличимые upgrade/star/relic accents, легендарная режиссура. Отдельный визуальный state/clock, приоритет drag/close/next над событиями. Без нового Engine, RAF, shader, светильника и postprocess; новая статика только при необходимости с SW проверкой.
4. GFX-05/D: адресный CI + visual QA. Baseline и кандидат на одинаковых save fixture, камере, профиле, warmup. Проверить обе модели действительно authored, кадры входа, цикла idle (начало/четверти/стык), fidget, звезда/ДП, быстрые действия, drag, overlay, reduced motion, fallback, повторные mount. Снять короткие ролики или контактные листы с последовательными кадрами, посмотреть лично. Foot sliding, snap, дрейф позы, проникновение меча/ножа/кисти в одежду, парение, искусственное покачивание, шум и обрезка лица — fail. Не менять golden без согласования. p95/draws/RT/память vs baseline, >10% MED/LOW — согласование; 1 context, отсутствие роста ресурсов, 0 компиляций после wake. SwiftShader не доказывает iPhone FPS. Физический iPhone отдельно.
5. После принятия арта + green обязательного CI — PR merge, версия/журнал, Pages по действующим правилам. Не распространять на весь ростер.

Ресурсы: действующие GLB/DGM, Blender headless (CPU), Node/Babylon 9.30, Puppeteer/существующий smoke, GitHub Actions; сначала без платных сервисов и без новых runtime-зависимостей. Возможность запуска Blender/получения доступных рендеров проверить отдельно; не заявлять выполненным. Skills: babylonjs, game-feel, create-game-assets, game-ui-ux, performance-optimization, новый cinematic-motion. Сохранения, бой, общий layout, Meshy, остальные герои вне объёма.

## A — решение по лаборатории
PR #310; 144 кадра первый проход отклонён, 168 второй проход, MP4 run 45658515635 (2 × 375 кадров). Владелец после видео: «Прикольно». Дункан — Long_Breathe_and_Look_Around, Муад’Диб — Watchful (yaw .22, lift -.17, speed .68, взгляд с паузой). Weapon-rest отклонён. LOW/reduced — settled pose. B — только runtime idle, C — события и переходы. Физическая проверка отдельно.
