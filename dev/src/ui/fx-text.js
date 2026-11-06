// ui/fx-text.js — строки 5015–5019 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../logic/account.js'; // порядок исполнения

// ===================== effect names highlighted in descriptions =====================
const FX_RX = /(Яд|Страх|Оглушени|Брон[яюи]↓|Голос(?![а-яё])|Провокаци|Скрытност|Защит[аыу]↑|Контратак|Уклонени[еяю]↑|Кровотечени|Крит\. урон↓)[а-яё]*/g;
const FX_BAD_RX = /^(Яд|Страх|Оглуш|Брон|Голос|Кровот|Крит)/;
const fxText = s => String(s).replace(FX_RX, m => `<span class="fxw ${FX_BAD_RX.test(m) ? 'bad' : 'good'}">${m}</span>`);


export { FX_RX, FX_BAD_RX, fxText };
