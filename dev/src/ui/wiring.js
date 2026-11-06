// ui/wiring.js — строки 4934–4965 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { openProfile } from './overlays/profile.js';
import { accFill } from '../logic/account.js';
import { featClaim } from './views/feats.js';
import { unlocked } from '../data/cosmetics.js';
import { trialGo, trialMulti, trialSimClick } from './views/trials.js';
import { leaveBattle } from './battle/battle-ui.js';
import { SPOT_ICONS } from './views/lobby.js';
import { closeInfo } from './overlays/info.js';
import { render } from './router.js';
import { toast } from './common.js';
import { BT, S, set_S, set_view, view } from '../core/state.js';
import { fillSave, persist } from '../core/save.js';
import { todayKey } from '../logic/economy.js';
import { $ } from '../core/dom.js';

// ===================== wiring =====================
function metaFill(s) {
  s.trials ??= {}; s.trialRuns ??= { d: '', n: {} }; s.squadTr ??= {}; s.trialSel ??= null;
  accFill(s);
  s.stats ??= {}; s.feats ??= {}; s.unlocks ??= { ava: {}, frame: {}, title: {} };
  s.profile ??= { nick: 'Странник', ava: 'hero:leto', frame: 'basic', title: 'novice' };
  if (s.stats.lastDay !== todayKey()) { s.stats.lastDay = todayKey(); s.stats.days = (s.stats.days || 0) + 1; }
  // special-mode titles
  if (s.raidKills && s.raidKills[2]) s.unlocks.title.raid3 = 1;
}
function metaClick(d) {
  if (d.trsel) { S.trialSel = d.trsel; persist(); render(); return true; }
  if (d.trgo) { closeInfo(true); if (BT && BT.done) leaveBattle(); trialGo(d.trgo); return true; }
  if (d.trsim) { trialSimClick(d.trsim); return true; }
  if (d.trmulti) { trialMulti(); return true; }
  if (d.featclaim) { featClaim(d.featclaim); return true; }
  if (d.profile) { openProfile(); return true; }
  if (d.pava) { if (unlocked('ava', d.pava)) { S.profile.ava = d.pava; persist(); render(); openProfile(); } return true; }
  if (d.pframe) { if (unlocked('frame', d.pframe)) { S.profile.frame = d.pframe; persist(); render(); openProfile(); } return true; }
  if (d.ptitle) { if (unlocked('title', d.ptitle)) { S.profile.title = d.ptitle; persist(); render(); openProfile(); } return true; }
  if (d.pnick) { const v = ($('#pnick').value || '').trim().slice(0, 20); if (v) { S.profile.nick = v; persist(); render(); openProfile(); toast('Никнейм сохранён'); } return true; }
  if (d.saveexp) { const code = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
    $('#overlay2').innerHTML = `<div class="detail info-layer" data-iclose="1"><div class="sheet infosheet" role="dialog" aria-modal="true"><h3>Экспорт сохранения</h3><p class="sub">Скопируйте код и сохраните его в Заметках или отправьте себе. Импорт на другом устройстве восстановит весь прогресс.</p><textarea id="savecode" class="savebox" readonly>${code}</textarea><div class="acts"><button class="btn go" data-savecopy="1">Скопировать</button><button class="btn" data-iclose="1" style="margin-left:auto">Закрыть</button></div></div></div>`; return true; }
  if (d.savecopy) { const t = $('#savecode'); t.select(); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(() => toast('Код скопирован'), () => { try { document.execCommand('copy'); toast('Код скопирован'); } catch (e) { toast('Выделите и скопируйте вручную'); } }); return true; }
  if (d.saveimp) { $('#overlay2').innerHTML = `<div class="detail info-layer" data-iclose="1"><div class="sheet infosheet" role="dialog" aria-modal="true"><h3>Импорт сохранения</h3><p class="sub">Вставьте код экспорта. Текущий прогресс на этом устройстве будет заменён.</p><textarea id="savecode" class="savebox" placeholder="Вставьте код сюда"></textarea><div class="acts"><button class="btn go" data-saveload="1">Загрузить</button><button class="btn" data-iclose="1" style="margin-left:auto">Отмена</button></div></div></div>`; return true; }
  if (d.saveload) { try { const s = JSON.parse(decodeURIComponent(escape(atob(($('#savecode').value || '').trim())))); if (!s || !s.roster) throw 0; set_S(fillSave(s)); metaFill(S); persist(); closeInfo(true); set_view('lobby'); render(); toast('Сохранение загружено'); } catch (e) { toast('Код не распознан'); } return true; }
  if (d.iclose2 && d.v) { closeInfo(true); set_view(d.v); render(); return true; }
  return false;
}
SPOT_ICONS.trial = '<path d="M12 2l3 6 6 1-4.5 4.3 1 6.2L12 16.6 6.5 19.5l1-6.2L3 9l6-1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 7v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
SPOT_ICONS.feat = '<path d="M7 3h10v4a5 5 0 01-10 0z" fill="currentColor"/><path d="M7 5H4a3 3 0 003 4M17 5h3a3 3 0 01-3 4M12 12v4M8 20h8M10 16h4v4h-4z" fill="none" stroke="currentColor" stroke-width="1.8"/>';
SPOT_ICONS.conq = '<path d="M5 21V4M5 4h11l-2 3.5 2 3.5H5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M9 21l3-6 3 6M12 15V12" stroke="currentColor" stroke-width="1.7" fill="none"/>';


export { metaFill, metaClick };
