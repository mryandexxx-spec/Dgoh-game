// ui/router.js — строки 3272–3281 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { renderConq } from './views/conq.js';
import { notePoll } from './notifications.js';
import { renderFeats } from './views/feats.js';
import { renderTrials } from './views/trials.js';
import { renderRules } from './views/rules.js';
import { renderLobby } from './views/lobby.js';
import { renderShop } from './views/shop.js';
import { renderLegend } from './views/legend.js';
import { renderRaid } from './views/raid.js';
import { renderDaily } from './views/daily.js';
import { renderSquad } from './views/squad.js';
import { renderCamp } from './views/camp.js';
import { renderRes } from './common.js';
import { S, view } from '../core/state.js';
import { sceneThumb } from '../render2d/scenes.js';

const VIEW_NAMES = { camp: 'Кампания', raid: 'Рейд', legend: 'Легенды', squad: 'Персонажи', shop: 'Лавки', trials: 'Испытания', conq: 'Джихад', feats: 'Подвиги', daily: 'Задания', rules: 'Правила боя' };
function render() {
  renderRes();
  { const vn = document.getElementById('vname'); if (vn) vn.textContent = VIEW_NAMES[view] || ''; }
  document.body.classList.toggle('lobby-on', view === 'lobby');
  ({ daily: renderDaily, lobby: renderLobby, camp: renderCamp, squad: renderSquad, raid: renderRaid, legend: renderLegend, shop: renderShop, rules: renderRules, trials: renderTrials, feats: renderFeats, conq: renderConq })[view]();
  document.querySelectorAll('#view canvas[data-scene]').forEach(sceneThumb);
  if (typeof notePoll === 'function' && S) setTimeout(() => notePoll(), 0);
}


export { VIEW_NAMES, render };
