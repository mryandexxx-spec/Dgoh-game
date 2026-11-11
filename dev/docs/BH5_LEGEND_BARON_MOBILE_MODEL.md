# BH5 — легендарный Барон: облегчённая мобильная модель v1

**Владелец 11.11.2026 утвердил использование нового архива `baron_mobile_v1(1).zip` именно для легенды `baron_legend`, не для обычного Молодого Барона `baron`.**

## Граница идентичностей — НЕ НАРУШАТЬ
- `baron` → существующий файл `dev/assets/models/young-baron.dgm`, существующие анимации, портрет, прогресс. Ничего не изменять.
- `baron_legend` → **отдельный** `dev/assets/models/baron-legend-mobile.dgm` и отдельная будущая 3D/GL-анимация с левитирующим креслом.
- В `src/assets/models.js` подключён **опциональный** загрузчик: при наличии `models/baron-legend-mobile.dgm` устанавливает `MODEL_DATA.baron_legend`; маршрут `MODEL_DATA.baron` остаётся связанным только с `young-baron`.
- `render3d/characters/procedural.js` уже использует `modelData(def.id)`. Данные `baron_legend` поэтому автоматически выберутся только для отдельного персонажа после его регистрации в `CHARS`.
- Не включать `baron_legend` в публичный ростер без отдельного утверждения портрета/боевого внешнего вида и готового события.

## Проверенный владельческий архив
`baron_mobile_v1(1).zip`:
- `baron_mobile/baron_mobile.glb`: 1 403 628 байт; 11 примитивов, 22 584 экспортные вершины, 38 333 треугольника, 18 костей.
- `baron_mobile/baron_mobile.blend`: редактируемый Blender-исходник, 11 skinned meshes / 18 костей.
- `baron_mobile/baron-legend-mobile.dgm`: **638 026 байт**, DGM1, 11 материалов/частей, 20 171 вершина, 38 333 треугольника, 18 костей; SHA256 `02ebaf921a2562960593b633a11c334d5893d61cd5b559fceb686a33bfe31fdb`.
- Проверены реальные байты DGM, диапазоны вершин/индексов, нормированность всех четырёх весов каждой вершины (сумма 255), наличие 18 именованных костей. Нет внешних текстур и новых клипов.
- Указанная автором сравнения потеря силуэта в 240 px: около 0,12–0,13%, но это **не эквивалентно визуальной приёмке на реальном iPhone**.
- Бюджет 38 333 треугольника выше ориентиров для долгих мобильных битв; обязательны замеры MED/LOW, 3D smoke 2 цикла, отсутствие утечек, сравнение кадров и оценка необходимости следующего LOD.
- **Важное:** модель НЕ содержит Idle/Attack/Hit/Death клипов. Имена костей совместимы с `authored.js`, но полный художественный retarget и анимация кресла GL **не проверены**.

## Пути загрузки в рабочую ветку
У владельца подготовлен архив `BH5_legendary_baron_repo_assets.zip` со структурой, которую следует извлечь **в корень checkout ветки `feat/bh1-baron-legend-foundation`**:

```text
dev/assets/models/baron-legend-mobile.dgm
dev/assets-src/characters/baron-legend/baron_mobile.glb
dev/assets-src/characters/baron-legend/baron_mobile.blend
dev/assets-src/characters/baron-legend/before_after.jpg
dev/assets-src/characters/baron-legend/README_RU.md
dev/assets-src/characters/baron-legend/*.json
dev/models/baron-legend-export-dgm.py
```

**Статус:** код загрузки и тест `tests/baron-legend-model-asset.mjs` закоммичены, **бинарный DGM не загружен в GitHub через текстовый коннектор**. Тест до загрузки проверяет маршруты, а после добавления бинарника проверяет реальный DGM. Не утверждать, что модель присутствует в играемой сборке, пока бинарник не закоммичен.

## Приёмка после загрузки
1. `cd dev && node tests/baron-legend-model-asset.mjs`; затем обычный CI и manifest.
2. Запустить preview-сцену со staged-героем и DGM; проверить Skinning на Idle/Attack/Hit/Death, карту 844×390 и 667×375, HIGH/MED/LOW и 3D memory smoke, профиль перформанса.
3. На художественное согласование скриншоты легенды (не Молодого Барона) в ростере, 3/4, фронт, боевой масштаб. Для GL кресло/армейский удар — отдельная анимационная сцена.
4. После проверки и согласования — живая регистрация `baron_legend`, но сам сюжетный event остаётся закрытым до утверждения врагов/волн/наград и событий Марго/Юэ.
