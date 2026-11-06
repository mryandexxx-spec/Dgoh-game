// core/state.js — строки 3202–3209 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './save.js'; // порядок исполнения
import { CANDLE_SEC, CMAX, WATER_SEC, WMAX } from '../logic/economy.js';

let S, view = 'lobby', filter = 'all', BT = null;
function tickWater() {
  const now = Date.now();
  if (S.candle >= CMAX()) S.candleTs = now; else { const g = Math.floor((now - S.candleTs) / (CANDLE_SEC * 1000)); if (g > 0) { S.candle = Math.min(CMAX(), S.candle + g); S.candleTs += g * CANDLE_SEC * 1000; if (S.candle >= CMAX()) S.candleTs = now; } }
  if (S.water >= WMAX()) { S.waterTs = now; return; }
  const gained = Math.floor((now - S.waterTs) / (WATER_SEC * 1000));
  if (gained > 0) { S.water = Math.min(WMAX(), S.water + gained); S.waterTs += gained * WATER_SEC * 1000; if (S.water >= WMAX()) S.waterTs = now; }
}

function set_BT(v) { return BT = v; }
function set_view(v) { return view = v; }
function set_filter(v) { return filter = v; }
function set_S(v) { return S = v; }
export { S, view, filter, BT, tickWater, set_BT, set_view, set_filter, set_S };
