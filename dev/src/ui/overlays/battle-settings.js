// ui/overlays/battle-settings.js — строки 5118–5163 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { craftAll } from '../craft.js';
import { showCeleb } from './celebrate.js';
import { noteDrop, renderNotes } from '../notifications.js';
import { showLevelUp } from './levelup.js';
import { CINE_OFF } from '../../logic/account.js';
import { bPop, bPopClose, doAct, finish, launch, leaveBattle, renderBattle } from '../battle/battle-ui.js';
import { closeInfo } from './info.js';
import { render } from '../router.js';
import { toast } from '../common.js';
import { $ } from '../../core/util.js';
import { BT, NOTES, S, set_BT, set_view, view } from '../../core/state.js';
import { persist } from '../../core/save.js';
import { GLYPH } from '../../data/glyphs.js';
import { SAVE_LOW } from '../../render3d/scenes/base-scene.js';
import { aiPlan } from '../../logic/battle/ai.js';
import { fmt } from '../../core/format.js';

// ===================== battle settings (gear) =====================
function openBattleSettings() {
  if (!BT || !BT.B || BT.done) return;
  bPop(`<div class="bph"><span class="bigico">${GEAR_SVG}</span><div><h3>Настройки боя</h3><span class="mono">Бой на паузе</span></div></div>
    <div class="bset">
      <button class="btn bsb" data-bsauto="1"><b>Автобой</b><small>${BT.auto ? 'включён' : 'выключен'}</small></button>
      <button class="btn bsb" data-bsspeed="1"><b>Скорость ×${BT.speed}</b><small>нажмите, чтобы сменить</small></button>
      <button class="btn bsb" data-bslog="1"><b>Журнал боя</b><small>${BT.showLog ? 'показан' : 'скрыт'}</small></button>
      <button class="btn bsb" data-bsgfx="1"><b>Графика: ${SAVE_LOW() ? 'экономная' : 'высокая'}</b><small>${SAVE_LOW() ? 'без глубины резкости и SSAO — для слабых телефонов' : 'все эффекты; применится со следующего боя'}</small></button>
      <button class="btn bsb" data-bscine="1"><b>Наезд камеры</b><small>${CINE_OFF() ? 'выключен — камера неподвижна' : 'включён на особых и мощных умениях'}</small></button>
      <button class="btn bsb" data-bsdlg="1"><b>Диалоги перед боем</b><small>${S.skipDlg ? 'выключены' : 'включены'}</small></button>
    </div>
    <div class="acts"><button class="btn" data-bsreplay="1">${GLYPH.march ? '' : ''}Переиграть<small>начать бой заново</small></button><button class="btn danger" data-bsquit="1">Отступить<small>засчитается поражение</small></button><button class="btn go" data-bpopx="1" style="margin-left:auto">Продолжить</button></div>`);
}
const GEAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.4 13a7.6 7.6 0 000-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 00-1.7-1L15 3.5h-4l-.4 2.5a7.4 7.4 0 00-1.7 1l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 000 2l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 001.7 1l.4 2.5h4l.4-2.5a7.4 7.4 0 001.7-1l2.4 1 2-3.4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
const LOG_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h10l3 3v15H6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 9h7M9 13h7M9 17h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
function replayBattle() {
  if (!BT || !BT.B) return; const cfg = { ...BT.cfg, dlg: false };
  clearTimeout(BT.timer); if (BT.arena) BT.arena.dispose(); const pref = { autoPref: BT.autoPref, speedPref: BT.speedPref }; set_BT(pref);
  launch(cfg); toast('Бой начат заново');
}
function meta2Click(d) {
  if (d.lvclose) { const el = $('#lvlup'); if (el) el.remove(); showLevelUp(); renderNotes(); showCeleb(); return true; }
  if (d.ntall) { NOTES.length = 0; renderNotes(); return true; }
  if (d.ntx) { noteDrop(d.ntx); return true; }
  if (d.ntgo) { noteDrop(d.ntid); closeInfo(true); if (!(BT && BT.B)) { set_view(d.ntgo); render(); } return true; }
  if (d.craftall) { craftAll(d.craftall); return true; }
  if (d.bset) { openBattleSettings(); return true; }
  if (d.bsauto) { BT.auto = BT.autoPref = !BT.auto; bPopClose(); if (BT.auto && BT.waiting) { const u = BT.waiting; const p = aiPlan(BT.B, u); doAct(u, p.key, p.target && p.target.uid); } else renderBattle(); return true; }
  if (d.bsspeed) { BT.speed = BT.speedPref = BT.speed >= 4 ? 1 : BT.speed * 2; $('#bpop').remove(); BT.pop = false; renderBattle(); openBattleSettings(); return true; }
  if (d.bslog) { BT.showLog = !BT.showLog; $('#bpop').remove(); BT.pop = false; renderBattle(); openBattleSettings(); return true; }
  if (d.bsgfx) { try { localStorage.setItem('dune-gfx-low', JSON.stringify(!SAVE_LOW())); } catch (e) {} $('#bpop').remove(); BT.pop = false; openBattleSettings(); toast('Применится со следующего боя'); return true; }
  if (d.bscine) { try { localStorage.setItem('dune-cine-off', JSON.stringify(!CINE_OFF())); } catch (e) {} $('#bpop').remove(); BT.pop = false; openBattleSettings(); return true; }
  if (d.bsdlg) { S.skipDlg = !S.skipDlg; persist(); $('#bpop').remove(); BT.pop = false; openBattleSettings(); return true; }
  if (d.bsreplay) { $('#bpop').remove(); BT.pop = false; BT.resume = null; replayBattle(); return true; }
  if (d.bsquit) { $('#bpop').remove(); BT.pop = false; BT.resume = null; clearTimeout(BT.timer); BT.B.over = 'B'; finish(); return true; }
  if (d.gz && BT && BT.B) { const B = BT.B, T = {
      spice: ['Меланж', `Общий запас пряности отряда: <b>${B.spice.A}%</b> (у противника ${B.spice.B}%). Растёт на 10% за каждое действие вашего бойца, ульты легенд дают ещё +20–30%. Тратят его особые умения легенд и Пола — например, «Видение пути» и «Наездник червя» стоят по 50%. Когда запас полон, полоска над героем светится.`],
      rhythm: [B.raid ? 'Бешенство червя' : 'Ритм пустыни', `Сейчас <b>${Math.min(100, B.rhythm)}%</b>. Удары не-фрименов создают ритм: +4% за удар, +10% за лазган, +30% за реакцию Хольцмана. На 100% ${B.raid ? 'червь впадает в бешенство и бьёт весь отряд' : 'приходит Шаи-Хулуд и бьёт по полю боя — фримены неуязвимы для него при лидерстве Муад\'Диба'}.`],
      presc: ['Прозрение', 'В отряде есть провидец (Пол или Муад\'Диб): над врагами видно, кого и каким умением они ударят следующим ходом.'],
      dmg: ['Урон по червю', `В этой атаке нанесено <b>${fmt(B.bossStartHp - Math.max(0, (B.units.find(x => x.def.boss) || {}).hp || 0))}</b>. Урон идёт в общий прогресс рейда и в подвиг «Укротитель червя».`],
    }[d.gz]; if (T) bPop(`<div class="bph"><div><h3>${T[0]}</h3></div></div><p style="margin:0;font-size:14px">${T[1]}</p>`); return true; }
  if (d.toroster) { leaveBattle(); set_view('squad'); render(); return true; }
  return false;
}


export { openBattleSettings, GEAR_SVG, LOG_SVG, replayBattle, meta2Click };
