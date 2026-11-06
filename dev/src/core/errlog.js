// core/errlog.js — строки 3234–3251 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import './util.js'; // порядок исполнения
import { BT } from './state.js';

const ERR_T = new Map();
function errLog(where, e) {
  let msg = ''; try { msg = String(e && (e.stack || e.message) || e).slice(0, 400); } catch (x) {}
  const key = where + '|' + msg, now = Date.now(); let r = ERR_T.get(key);
  if (!r) { r = { c: 0, p: 0, wt: 0, tm: 0 }; ERR_T.set(key, r); if (ERR_T.size > 40) ERR_T.delete(ERR_T.keys().next().value); }
  r.c++; r.p++;
  if (r.c <= 3) try { console.warn('[dune]', where, e); } catch (x) {}
  const flush = () => { r.tm = 0; if (!r.p) return; const k = r.p; r.p = 0; r.wt = Date.now(); errWrite(where, msg, k); };
  if (now - r.wt >= 5000) { if (r.tm) { clearTimeout(r.tm); r.tm = 0; } flush(); } else if (!r.tm) r.tm = setTimeout(flush, 5000 - (now - r.wt));
}
function errWrite(where, msg, k) {
  try { const L = JSON.parse(localStorage.getItem('dune-errlog') || '[]');
    if (L.length && L[L.length - 1].w === where && L[L.length - 1].m === msg) { L[L.length - 1].n = (L[L.length - 1].n || 1) + k; } else { const it = { t: new Date().toISOString(), w: where, m: msg, b: !!(BT && BT.B) }; if (k > 1) it.n = k; L.push(it); }
    localStorage.setItem('dune-errlog', JSON.stringify(L.slice(-15))); } catch (x) {}
}
function battleMark(cfg) { try { if (cfg) localStorage.setItem('dune-inbattle', JSON.stringify({ t: Date.now(), mode: cfg.mode || '' })); else { localStorage.removeItem('dune-inbattle'); localStorage.setItem('dune-crashN', '0'); } } catch (e) {} }
addEventListener('error', ev => errLog('window', ev.error || ev.message));
addEventListener('unhandledrejection', ev => errLog('promise', ev.reason));

export { ERR_T, errLog, errWrite, battleMark };
