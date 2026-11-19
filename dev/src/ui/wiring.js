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
import { fillSave, loadSave, persist } from '../core/save.js';
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

// ARCH-02C-B2: save transfer is opt-in and never calls legacy persist().
// Expected raw checks are sequential only; true cross-tab exclusion is B3.
const TRANSFER_LIMIT = 2000000;
let pendingSaveImport = null;
const transferRecord = x => !!x && typeof x === 'object' && !Array.isArray(x);
const transferQuantity = x => typeof x === 'number' && Number.isFinite(x) &&
  x >= 0 && x <= Number.MAX_SAFE_INTEGER;
function validateTransferSave(s) {
  if (!transferRecord(s) || s.v !== 1 || !transferRecord(s.roster) ||
      Object.keys(s.roster).length === 0) throw new Error('unsupported-or-incomplete');
  for (const k of ['water', 'solari', 'plast'])
    if (!transferQuantity(s[k])) throw new Error('invalid-balance');
  for (const k of ['candle', 'cry', 'folio', 'seal', 'rid', 'wol', 'core', 'teeth', 'wring', 'jt', 'ix_plate'])
    if (k in s && !transferQuantity(s[k])) throw new Error('invalid-balance');
  for (const k of ['cleared', 'daily', 'login', 'conq', 'journey', 'journeys', 'migrations', 'inv', 'gearParts', 'gearOwned', 'cryClaim', 'sealClaim', 'refills', 'buys', 'acc'])
    if (k in s && s[k] !== null && !transferRecord(s[k])) throw new Error('invalid-structure');
  for (const k of ['squad', 'squadD', 'squadC', 'raidPick', 'jPick'])
    if (k in s && !Array.isArray(s[k])) throw new Error('invalid-structure');
  if ('squadTr' in s && !transferRecord(s.squadTr) && !Array.isArray(s.squadTr))
    throw new Error('invalid-structure');
  for (const hero of Object.values(s.roster)) {
    if (!transferRecord(hero)) throw new Error('invalid-roster');
    for (const k of ['shards', 'stars', 'lvl', 'gear', 'relic'])
      if (k in hero && !transferQuantity(hero[k])) throw new Error('invalid-roster');
    if ('eq' in hero && (!Array.isArray(hero.eq) || hero.eq.length !== 6))
      throw new Error('invalid-roster');
    if ('sk' in hero && !transferRecord(hero.sk)) throw new Error('invalid-roster');
  }
  // Reject unsafe JSON property names before migration's recursive walkers.
  const stack = [[s, 0]];
  let nodes = 0;
  while (stack.length) {
    const [value, depth] = stack.pop();
    if (++nodes > 120000 || depth > 48) throw new Error('excessive-depth');
    if (typeof value === 'number' && !Number.isFinite(value))
      throw new Error('non-finite');
    if (value && typeof value === 'object') {
      for (const k of Object.keys(value)) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype')
          throw new Error('unsafe-key');
        stack.push([value[k], depth + 1]);
      }
    }
  }
}
function decodeTransferCode(input) {
  const code = input.trim();
  if (!code || code.length > TRANSFER_LIMIT ||
      code.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(code))
    throw new Error('invalid-encoding');
  const raw = decodeURIComponent(escape(atob(code))); // historical UTF-8 base64
  if (raw.length > TRANSFER_LIMIT) throw new Error('oversize');
  const parsed = JSON.parse(raw);
  validateTransferSave(parsed);
  return parsed;
}
function transferCode(raw) { return btoa(unescape(encodeURIComponent(raw))); }
function showTransferCode(title, detail, raw) {
  const code = transferCode(raw);
  $('#overlay2').innerHTML = '<div class="detail info-layer" data-iclose="1"><div class="sheet infosheet" role="dialog" aria-modal="true"><h3>' +
    title + '</h3><p class="sub">' + detail +
    '</p><textarea id="savecode" class="savebox" readonly></textarea><div class="acts"><button class="btn go" data-savecopy="1">Скопировать</button><button class="btn" data-iclose="1" style="margin-left:auto">Закрыть</button></div></div></div>';
  $('#savecode').value = code; // never embed save-derived data in innerHTML
}
function transferFingerprint(raw) {
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) h = Math.imul(h ^ raw.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16).padStart(8, '0');
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
  if (d.saveexp) {
    pendingSaveImport = null;
    const state = loadSave.checkpoint.inspect();
    if (state.primary.status !== 'ok') {
      // Never silently substitute RAM for a trusted storage export.
      $('#overlay2').innerHTML = '<div class="detail info-layer" data-iclose="1"><div class="sheet infosheet" role="dialog" aria-modal="true"><h3>Проверенный экспорт недоступен</h3><p class="sub">Основное сохранение не удалось проверить. Не очищайте данные сайта. Можно отдельно выгрузить текущую память, но она НЕ подтверждена записью.</p><div class="acts"><button class="btn" data-saveunsaved="1">Аварийный экспорт памяти</button><button class="btn" data-iclose="1">Закрыть</button></div></div></div>';
      return true;
    }
    try {
      let unsaved = true;
      try { unsaved = JSON.stringify(S) !== state.primary.raw; } catch (e) {}
      showTransferCode('Экспорт сохранённого прогресса',
        'Проверенный снимок из хранилища (v1); не защищён от очистки данных сайта.' +
        (unsaved ? ' Текущая память отличается и НЕ включена в этот экспорт.' : '') +
        ' Сохраните код вне браузера.', state.primary.raw);
      if (unsaved) {
        const actions = $('#overlay2 .acts');
        if (actions && actions.insertAdjacentHTML)
          actions.insertAdjacentHTML('afterbegin', '<button class="btn" data-saveunsaved="1">Аварийный экспорт памяти</button>');
      }
    } catch (e) { toast('Не удалось подготовить экспорт'); }
    return true;
  }
  if (d.saveunsaved) {
    try {
      showTransferCode('НЕ ПОДТВЕРЖДЕНО СОХРАНЕНИЕМ',
        'Аварийная копия текущей памяти. Изменения могут отсутствовать в хранилище. Не считайте этот код подтверждённым прогрессом.',
        JSON.stringify(S));
    } catch (e) { toast('Не удалось экспортировать память'); }
    return true;
  }
  if (d.savecopy) { const t = $('#savecode'); t.select(); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(() => toast('Код скопирован'), () => { try { document.execCommand('copy'); toast('Код скопирован'); } catch (e) { toast('Выделите и скопируйте вручную'); } }); return true; }
  if (d.saveimp) {
    pendingSaveImport = null;
    $('#overlay2').innerHTML = '<div class="detail info-layer" data-iclose="1"><div class="sheet infosheet" role="dialog" aria-modal="true"><h3>Импорт сохранения</h3><p class="sub">Вставьте код. Сначала проверим данные, затем запросим отдельное подтверждение замены текущего прогресса.</p><textarea id="savecode" class="savebox" placeholder="Вставьте код сюда"></textarea><div class="acts"><button class="btn go" data-saveload="1">Проверить код</button><button class="btn" data-iclose="1" style="margin-left:auto">Отмена</button></div></div></div>';
    return true;
  }
  if (d.saveload) {
    pendingSaveImport = null;
    try {
      if (BT && !BT.done) throw new Error('battle-in-progress');
      const candidate = fillSave(decodeTransferCode($('#savecode').value || ''));
      metaFill(candidate); // isolated migration; never touch S before commit
      validateTransferSave(candidate);
      const candidateRaw = JSON.stringify(candidate);
      if (candidateRaw.length > TRANSFER_LIMIT) throw new Error('oversize');
      const state = loadSave.checkpoint.inspect();
      if (state.primary.status !== 'ok' ||
          (state.backup.status !== 'ok' && state.backup.status !== 'missing'))
        throw new Error('storage-not-ready');
      pendingSaveImport = { candidate, expectedRaw: state.primary.raw, memoryRaw: JSON.stringify(S) };
      const heroes = Object.keys(candidate.roster).length;
      $('#overlay2').innerHTML = '<div class="detail info-layer" data-iclose="1"><div class="sheet infosheet" role="dialog" aria-modal="true"><h3>Подтвердить замену прогресса?</h3><p class="sub">Импорт v1 проверен. Героев: ' +
        heroes + '. Солярии: ' + candidate.solari + '. Пласталь: ' + candidate.plast +
        '. Контрольный код: ' + transferFingerprint(candidateRaw) +
        '. Текущий проверенный прогресс будет зарезервирован перед записью нового.</p><p class="sub">Другие вкладки могут менять сохранение: защита одновременных записей относится к этапу B3.</p><div class="acts"><button class="btn go" data-saveconfirm="1">Подтверждаю замену</button><button class="btn" data-iclose="1" style="margin-left:auto">Отмена</button></div></div></div>';
    } catch (e) { toast('Импорт отклонён: некорректный, неподдерживаемый код или недоступное хранилище'); }
    return true;
  }
  if (d.saveconfirm) {
    const pending = pendingSaveImport;
    pendingSaveImport = null; // never reapply same candidate on a second click
    if (!pending) { toast('Сначала проверьте код импорта'); return true; }
    let matching = false;
    try { matching = !(BT && !BT.done) && JSON.stringify(S) === pending.memoryRaw; } catch (e) {}
    if (!matching) {
      toast('Состояние игры изменилось после проверки. Начните импорт заново.');
      return true;
    }
    const outcome = loadSave.checkpoint.commit({
      expectedRaw: pending.expectedRaw, candidate: pending.candidate
    });
    if (!outcome.ok) {
      if (outcome.status === 'uncertain') {
        // The candidate may have reached primary before an exception: block.
        const now = loadSave.checkpoint.inspect();
        metaFill.showSaveRecovery({ status: 'uncertain',
          raw: typeof now.primary.raw === 'string' ? now.primary.raw : undefined });
      } else {
        toast(outcome.status === 'conflict'
          ? 'Сохранение изменилось с момента проверки. Обновите страницу; импорт отменён.'
          : 'Запись не подтверждена (' + outcome.status + '). Текущий прогресс не заменён.');
      }
      return true;
    }
    set_S(outcome.save);
    closeInfo(true);
    set_view('lobby');
    render();
    toast(outcome.status === 'unchanged' ? 'Сохранение уже было записано' : 'Импорт подтверждён проверкой записи');
    return true;
  }
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
    'write-failed': 'Сохранение прогресса не удалось.',
    uncertain: 'Результат записи неизвестен: данные могли быть записаны до ошибки. Не повторяйте импорт вслепую.'
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

// ARCH-02C-B3-B1b lifecycle UX for explicitly opted-in single-writer mode.
// The verified export comes from storage, NEVER mutable S; no reset/import.
// The old production bootstrap does NOT call this mode yet.
function showWriterBlocked(outcome = {}) {
  const previous = document.getElementById('save-writer-blocked');
  if (previous) previous.remove();
  const root = document.createElement('div');
  root.id = 'save-writer-blocked';
  root.setAttribute('role', 'alertdialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'save-writer-title');
  root.style.cssText = 'position:fixed;inset:0;z-index:1000000;background:#070d16fa;color:#f4e8d6;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:14px;overflow:auto;font-family:system-ui,sans-serif;';
  const panel = document.createElement('section');
  panel.style.cssText = 'max-width:550px;width:100%;max-height:94vh;overflow:auto;box-sizing:border-box;background:#18232f;border:1px solid #b08a56;border-radius:12px;padding:18px;box-shadow:0 20px 60px #000b;';
  const title = document.createElement('h2');
  title.id = 'save-writer-title';
  title.textContent = outcome.status === 'busy' ?
    'Игра открыта в другой вкладке' : 'Игровой сеанс остановлен';
  title.style.cssText = 'font-size:20px;line-height:1.25;margin:0 0 12px;color:#f4c987;';
  const body = document.createElement('p');
  body.textContent = 'Запись прогресса в этом окне заблокирована (' +
    String(outcome.status || 'unknown') +
    '). Не продолжайте игру в старом окне: оно может хранить устаревшее состояние. ' +
    'Проверьте остальные вкладки, затем перезагрузите эту страницу. Не очищайте данные сайта и PWA.';
  body.style.cssText = 'font-size:14px;line-height:1.5;margin:0 0 14px;';
  panel.appendChild(title); panel.appendChild(body);
  // Only the valid confirmed primary may be presented as a verified export.
  // The B2 UTF-8 base64 format is intentionally retained for interoperability.
  const inspected = loadSave.checkpoint.inspect();
  if (inspected.primary.status === 'ok') {
    try {
      const safeCode = btoa(unescape(encodeURIComponent(inspected.primary.raw)));
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Показать проверенный код сохранения';
      button.style.cssText = 'border:1px solid #a18b69;background:#b08a56;color:#10141b;border-radius:7px;padding:10px;font-weight:700;';
      const field = document.createElement('textarea');
      field.readOnly = true;
      field.hidden = true;
      field.value = safeCode;
      field.setAttribute('aria-label', 'Проверенное сохранение из хранилища');
      field.style.cssText = 'width:100%;min-height:65px;max-height:120px;box-sizing:border-box;margin:12px 0;background:#09111b;color:#eee;border:1px solid #8d7b65;border-radius:6px;';
      button.addEventListener('click', () => {
        field.hidden = false;
        field.focus();
        field.select();
      });
      panel.appendChild(button); panel.appendChild(field);
    } catch (e) { /* export unavailable, never substitute unverified RAM */ }
  }
  const note = document.createElement('p');
  note.textContent = 'Если сохранение не удалось проверить, не выполняйте сброс или повторный импорт вслепую.';
  note.style.cssText = 'font-size:13px;line-height:1.45;opacity:.85;';
  panel.appendChild(note);
  const reopen = document.createElement('button');
  reopen.type = 'button';
  reopen.textContent = 'Перезагрузить после закрытия других вкладок';
  reopen.style.cssText = 'border:1px solid #a18b69;background:transparent;color:#f4d4a1;border-radius:7px;padding:10px;margin-top:8px;';
  reopen.addEventListener('click', () => window.location.reload());
  panel.appendChild(reopen);
  root.appendChild(panel);
  document.body.appendChild(root);
}
metaFill.showWriterBlocked = showWriterBlocked;

// Keep the historical 898 public names and ESM export order unchanged.
// Boot already imports metaFill; this UI-owned diagnostic callback is attached
// without introducing an additional cross-module named export.
metaFill.showSaveRecovery = showSaveRecovery;

export { metaFill, metaClick };
