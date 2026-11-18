// ui/wiring.js — строки 4934–4965 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import { openProfile } from './overlays/profile.js';
import { accFill } from '../logic/account-rules.js';
import { featClaim } from './views/feats.js';
import { unlocked } from '../data/cosmetics.js';
import '../logic/cosmetics-unlocks.js'; // ARCH-01C3a1: bind cosmetic rule before profile interactions
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


// ARCH-02B1 — UI-owned fail-closed recovery surface. NEVER offers "reset"
// or clears the existing primary key. Uses textContent/value, not innerHTML,
// for untrusted save bytes; keep protected Camp and normal screens unchanged.
function showSaveRecovery(issue) {
  const prior = document.getElementById('save-recovery');
  if (prior) prior.remove();
  const blocked = document.createElement('div');
  blocked.id = 'save-recovery';
  blocked.setAttribute('role', 'alertdialog');
  blocked.setAttribute('aria-modal', 'true');
  blocked.setAttribute('aria-labelledby', 'save-recovery-title');
  blocked.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#070d16f7;color:#f4e8d6;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;overflow:auto;font-family:system-ui,sans-serif;';
  const panel = document.createElement('section');
  panel.style.cssText = 'width:min(100%,590px);max-height:94vh;overflow:auto;background:#18232f;border:1px solid #9f8151;border-radius:14px;padding:20px;box-sizing:border-box;box-shadow:0 20px 65px #000b;';
  const heading = document.createElement('h2');
  heading.id = 'save-recovery-title';
  heading.textContent = 'Сохранение требует восстановления';
  heading.style.cssText = 'margin:0 0 12px;font-size:20px;color:#f4c987;';
  const explanation = document.createElement('p');
  const reason = {
    unavailable: 'Браузер не разрешил прочитать сохранение.',
    corrupt: 'Сохранение содержит повреждённый JSON.',
    invalid: 'Данные сохранения не прошли проверку формата.',
    unsupported: 'Сохранение создано несовместимой версией игры.',
    quota: 'Не хватает места для записи прогресса.',
    security: 'Браузер запретил записать прогресс.',
    serialization: 'Не удалось подготовить прогресс для сохранения.',
    'write-failed': 'Сохранение прогресса не удалось.'
  };
  explanation.textContent = (reason[issue.status] || 'Безопасный доступ к прогрессу недоступен.') +
    ' Игра остановлена, чтобы не затереть данные. Не очищайте данные сайта и не переустанавливайте PWA.';
  explanation.style.cssText = 'margin:0 0 14px;line-height:1.5;font-size:14px;';
  panel.appendChild(heading);
  panel.appendChild(explanation);

  // A readable corrupt/unsupported original is exported EXACTLY as received.
  // On failed write, the in-memory state can instead be exported in the
  // existing UTF-8 base64 format. This is a rescue copy, not a durable commit.
  let rescue = null, caption = '';
  if (typeof issue.raw === 'string') {
    rescue = issue.raw;
    caption = 'Исходный JSON (не исправлен)';
  } else if (!issue.ok && S) {
    try {
      rescue = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
      caption = 'Аварийный код экспорта (текущая память)';
    } catch (e) {}
  }
  if (rescue !== null) {
    const title = document.createElement('p');
    title.textContent = 'Сохраните эту копию вне браузера, прежде чем повторять попытку.';
    title.style.cssText = 'font-size:13px;line-height:1.4;';
    panel.appendChild(title);
    const show = document.createElement('button');
    show.type = 'button';
    show.textContent = 'Показать данные для копирования';
    show.style.cssText = 'background:#b08a56;color:#10141b;border:0;border-radius:7px;padding:9px 12px;font-weight:700;';
    const field = document.createElement('textarea');
    field.readOnly = true;
    field.value = rescue;
    field.setAttribute('aria-label', caption);
    field.hidden = true;
    field.style.cssText = 'width:100%;min-height:70px;max-height:120px;margin-top:10px;box-sizing:border-box;background:#09111b;color:#eee;border:1px solid #8d7b65;border-radius:6px;resize:vertical;';
    show.addEventListener('click', () => {
      field.hidden = false; field.focus(); field.select();
    });
    panel.appendChild(show); panel.appendChild(field);
  }

  const footer = document.createElement('p');
  footer.textContent = 'Проверьте доступ к хранилищу или освободите место, затем повторите загрузку. При несовместимой версии сначала сохраните исходные данные.';
  footer.style.cssText = 'margin:14px 0;font-size:13px;opacity:.85;line-height:1.4;';
  panel.appendChild(footer);
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Повторить загрузку';
  retry.style.cssText = 'background:transparent;color:#f4d4a1;border:1px solid #a18b69;border-radius:7px;padding:9px 14px;';
  retry.addEventListener('click', () => window.location.reload());
  panel.appendChild(retry);
  blocked.appendChild(panel);
  document.body.appendChild(blocked);
}

export { metaFill, metaClick, showSaveRecovery };
