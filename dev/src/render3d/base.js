// render3d/base.js — строки 1183–1204 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../render2d/fx-layer.js'; // порядок исполнения

// ===== 3D battle arena (Babylon.js engine) =====
// Фаза 4: Babylon — отдельный чанк render3d/babylon.js (babylon3d.js), грузится лениво после первого экрана.
// B3 и HAS3D — живые привязки: до загрузки null/false, loadB3() заполняет их и вызывает подписчиков onB3.
// BABYLON — только заглушка Node-тестов (tests/lib/load.mjs). HAS_GL — WebGL есть (3D будет после загрузки чанка).
const B3_URL = 'babylon3d.js';
let B3 = globalThis.__B3 || (typeof BABYLON !== 'undefined' ? BABYLON : null);
const HAS_GL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
let HAS3D = !!B3 && HAS_GL;
const B3_SUBS = [];
function onB3(fn) { if (HAS3D) fn(); else B3_SUBS.push(fn); }
let B3_P = null;
const b3LoadStatus = () => !HAS_GL ? 'unavailable' : HAS3D ? 'ready' : B3_P ? 'loading' : 'idle';
const B3_PRE = [];   // Опциональные 3D-ассеты: не должны удерживать сам движок.
function b3Pre(fn) { B3_PRE.push(fn); }
// Safari/PWA can leave an asset fetch or cached script pending indefinitely.
// Cap *readiness*, not the background asset requests: authored models load when
// available; until then the existing procedural mesh fallback works.
const B3_ASSET_WAIT_MS = 7000;
const B3_SCRIPT_WAIT_MS = 12000;
function b3Deadline(p, ms, label) {
  let timer;
  return Promise.race([
    Promise.resolve(p),
    new Promise(resolve => { timer = setTimeout(() => { console.warn('3D readiness timeout:', label); resolve(false); }, ms); }),
  ]).finally(() => clearTimeout(timer));
}
function loadB3() {  // Promise<boolean>; a stuck asset/script must never poison future attempts
  if (HAS3D) return Promise.resolve(true);
  if (!HAS_GL) { console.warn('3D unavailable: WebGL context not supported'); return Promise.resolve(false); }
  if (B3_P) return B3_P;
  B3_P = new Promise(resolve => {
    // Start asset fetches once, in parallel. Do not block readiness indefinitely.
    const pre = b3Deadline(Promise.allSettled(B3_PRE.map(f => Promise.resolve().then(f))), B3_ASSET_WAIT_MS, 'assets');
    const script = document.createElement('script');
    script.src = B3_URL;
    script.async = true;
    let done = false, timer;
    const finish = loaded => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (loaded && globalThis.__B3) {
        // The engine is ready even if some optional meshes/textures are late.
        // Their in-flight loads are still allowed to complete.
        pre.then(() => {
          B3 = globalThis.__B3; HAS3D = true;
          for (const f of B3_SUBS.splice(0)) try { f(); } catch (e) { console.warn('onB3', e); }
          resolve(true);
        });
      } else {
        console.warn('Babylon chunk unavailable; 2D fallback active');
        script.remove();
        B3_P = null;  // future navigation can retry after an intermittent offline error
        resolve(false);
      }
    };
    script.onload = () => finish(true);
    script.onerror = () => finish(false);
    timer = setTimeout(() => finish(!!globalThis.__B3), B3_SCRIPT_WAIT_MS);
    document.head.appendChild(script);
  });
  return B3_P;
}

const ENV3 = {
  desert:     { ground: 'dunes', sand: '#e2ae6c', sand2: '#b07440', props: ['farrocks'], parts: 'sand' },
  spicefield: { ground: 'dunes', sand: '#e4a466', sand2: '#a85430', spice: '#c4562a', props: ['plumes'], parts: 'sand' },
  dawn:       { ground: 'dunes', sand: '#e8a682', sand2: '#86485a', props: ['farrocks'], parts: 'sand' },
  harvester:  { ground: 'dunes', sand: '#dca46a', sand2: '#9a6038', props: ['harvester'], parts: 'sand' },
  storm:      { ground: 'dunes', sand: '#c4945e', sand2: '#8a5a34', parts: 'storm', fogNear: 6, fogFar: 55 },
  ruins:      { ground: 'dunes', sand: '#c88a5e', sand2: '#7a4434', props: ['ruins'], parts: 'sand' },
  saltflat:   { ground: 'flat', sand: '#efe6d6', sand2: '#c2b29a', tex: 'salt', props: ['farrocks'], parts: 'sand' },
  canyon:     { ground: 'dunes', sand: '#dc9c62', sand2: '#a05a32', props: ['canyon'], parts: 'dust' },
  cave:       { ground: 'dunes', sand: '#8a6440', sand2: '#3a2416', props: ['cave'], parts: 'dust', dark: 1, fogNear: 20, fogFar: 70 },
  sietch:     { ground: 'dunes', sand: '#7a6066', sand2: '#2a1c22', props: ['mesas'], parts: 'dust', night: 1 },
  arrakeen:   { ground: 'dunes', sand: '#c07a42', sand2: '#6a3420', props: ['mesas', 'city'], parts: 'sand' },
  caladan:    { ground: 'rocky', sand: '#66745e', sand2: '#2e3832', tex: 'rock', props: ['sea', 'castle'], parts: 'rain' },
  giedi:      { ground: 'flat', sand: '#3e302a', sand2: '#140c0a', tex: 'rock', props: ['towers'], parts: 'ember', fogNear: 25, fogFar: 110 },
  court:      { ground: 'floor', sand: '#c49a5e', sand2: '#6a4c26', tex: 'tile', props: ['palace'], parts: 'dust' },
};
const SLOT3 = [[-3.6, .4], [-6.6, -3.4], [-2.6, -4.4], [-7.4, 3.6], [-2.2, 4.6]];


// фаза 7, шаг 2: размер канваса без принудительного layout. clientWidth в каждом кадре синхронно пересчитывал layout,
// если DOM грязный (экран результатов: 58 раз/с). Кэш обновляет ResizeObserver (колбэк — после layout кадра);
// первый вызов и fresh (после wake) читают clientWidth напрямую. Отсоединённый канвас RO сообщает как 0×0, как и clientWidth.
const CV_SZ = new WeakMap();
let CV_RO = null;
function cvSize(cv, fresh) {
  let s = CV_SZ.get(cv);
  if (!s || fresh) {
    if (!s) s = { w: 0, h: 0 };
    s.w = cv.clientWidth; s.h = cv.clientHeight;
    if (typeof ResizeObserver === 'undefined' || CV_SZ.has(cv)) return s;
    CV_SZ.set(cv, s);
    CV_RO = CV_RO || new ResizeObserver(es => { for (const e of es) { const z = CV_SZ.get(e.target); if (z) { z.w = e.target.clientWidth; z.h = e.target.clientHeight; } } });
    CV_RO.observe(cv);
  }
  return s;
}

export { B3, HAS3D, HAS_GL, loadB3, onB3, b3Pre, b3LoadStatus, ENV3, SLOT3, cvSize };
