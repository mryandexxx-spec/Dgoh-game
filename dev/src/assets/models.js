// assets/models.js — строки 2668–2670 монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.
import '../render3d/scenes/baker.js'; // порядок исполнения
import { setMocap } from './mocap-data.js';
import { setEnvHdr } from './env-hdr.js';
import { b3Pre } from '../render3d/base.js';

// ===== Фаза 5: ассеты — файлы (источник — dev/assets/, разовый перенос tools/export-assets.mjs) =====
// Сборка подставляет карту «логическое имя → путь» (имена с хешем содержимого). В артефакте типы, которые он не отдаёт
// (.dgm, .env), лежат base64-текстом в «<имя>.txt». Модели и клипы грузятся вместе с чанком Babylon (loadB3 ждёт их через b3Pre).
const ASSET = JSON.parse('__ASSET_MAP__');   // сборка заменяет плейсхолдер на JSON (в путях нет кавычек и «\»)
function assetUrl(n) { return ASSET[n] || null; }
const MODEL_DATA = {};   // заполняется loadAssets3: та же структура, что раньше, base64-поля — Uint8Array, текстуры — пути
const WORM_IMG = { ava: assetUrl('img/worm-ava.png'), badge: assetUrl('img/worm-badge.png') };

async function assetBytes(n) {
  const u = assetUrl(n); if (!u) throw new Error('нет ассета ' + n);
  const r = await fetch(u); if (!r.ok) throw new Error(u + ': HTTP ' + r.status);
  if (!u.endsWith('.txt')) return new Uint8Array(await r.arrayBuffer());
  const s = atob((await r.text()).trim()), a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
}
// DGM1: 'DGM1' + u32 LE длина заголовка + JSON (кратно 4) + блобы; {"@b":[смещение, длина]} — байты, {"@t":имя} — путь текстуры
function parseDgm(b) {
  if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== 'DGM1') throw new Error('не DGM1');
  const base = 8 + new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(4, true);
  const fix = o => Array.isArray(o) ? o.map(fix)
    : !o || typeof o !== 'object' ? o
    : o['@b'] ? b.subarray(base + o['@b'][0], base + o['@b'][0] + o['@b'][1])
    : o['@t'] ? assetUrl(o['@t'])
    : Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fix(v)]));
  return fix(JSON.parse(new TextDecoder().decode(b.subarray(8, base))));
}
// Фаза 5, шаг 5: KTX2 к текстурам tex/<n>.jpg — ktx2/<n>.ktx2 (байты грузятся вместе с моделями). Ключ — путь JPEG (он же в MODEL_DATA);
// JPEG остаётся фолбэком (render3d/characters/authored.js tex3), если KTX2 не загрузился или транскодер не сработал.
const KTX2 = {};
function ktx2For(url) { return KTX2[url] || null; }
// Сначала транскодер (декодер 24 КБ + msc 0,5 МБ; воркер потом берёт их из кэша): не загрузился или wasm не проходит проверку —
// KTX2 не качаем вовсе, текстуры будут JPEG. Транскод тогда не ждёт сети, и сторож в authored.js ловит только сбои воркера.
function loadKtx2() {
  const tr = ['decoder.js', 'msc_basis_transcoder.js', 'msc_basis_transcoder.wasm'].map(n => assetUrl('ktx2/' + n));
  if (tr.some(u => !u) || typeof WebAssembly !== 'object' || typeof Worker !== 'function') return Promise.resolve();
  return Promise.all(tr.map(u => fetch(u).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(u + ': HTTP ' + r.status)))))
    .then(([, , w]) => { if (!WebAssembly.validate(new Uint8Array(w))) throw new Error('msc_basis_transcoder.wasm не прошёл проверку'); }).then(() => Promise.allSettled(Object.keys(ASSET).filter(n => /^ktx2\/.*\.ktx2$/.test(n)).map(n => {
    const jpg = assetUrl(n.replace(/^ktx2\/(.*)\.ktx2$/, 'tex/$1.jpg'));
    return jpg ? assetBytes(n).then(b => { KTX2[jpg] = b; }) : null;
  }))).then(rs => { const bad = rs.filter(r => r.status === 'rejected'); if (bad.length) console.warn('KTX2: не загружено ' + bad.length + ', будут JPEG', bad[0].reason); },
    e => console.warn('KTX2 выключен, текстуры — JPEG:', e));
}
let ASSETS_P = null;
let MUAD_P = null;
function warmMuadDib() {
  if (!assetUrl('models/muad-dib-legend.dgm')) return Promise.resolve();
  if (!MUAD_P) MUAD_P = assetBytes('models/muad-dib-legend.dgm')
    .then(b => { MODEL_DATA.muaddib = parseDgm(b); })
    .catch(e => { console.warn('optional Muad-Dib model unavailable, procedural fallback', e); MUAD_P = null; });
  return MUAD_P;
}

function loadAssets3() {   // Promise: каждый ассет независим — что не загрузилось, то 3D заменяет как раньше (процедурная модель, без mocap/окружения)
  void warmMuadDib(); // optional; intentionally NOT in the readiness barrier
  return ASSETS_P || (ASSETS_P = Promise.allSettled([
    // Muad'Dib v5 is a noncritical, optional hero asset: fetching it in the
    // shared bootstrap barrier can block *every* 3D scene on a slow iPhone/PWA.
    // It is fetched in parallel but never prevents Babylon/camp/other heroes.
    ...['duncan', 'worm', ...(assetUrl('models/young-baron.dgm') ? ['young-baron'] : []), ...(assetUrl('models/baron-legend-mobile.dgm') ? ['baron-legend-mobile'] : [])].map(id => assetBytes(id === 'duncan' && assetUrl('models/duncan-meshy.dgm') ? 'models/duncan-meshy.dgm' : `models/${id}.dgm`).then(b => { MODEL_DATA[id === 'young-baron' ? 'baron' : id === 'baron-legend-mobile' ? 'baron_legend' : id] = parseDgm(b); })),
    fetch(assetUrl('anim/mocap.json')).then(r => r.ok ? r.json() : Promise.reject(new Error('mocap.json: HTTP ' + r.status))).then(setMocap),
    (async () => { const u = assetUrl('env/desert.env'); if (!u) throw new Error('нет env/desert.env');
      setEnvHdr(u.endsWith('.txt') ? 'data:application/octet-stream;base64,' + (await (await fetch(u)).text()).trim() : u); })(),
    loadKtx2(),
  ]).then(rs => { const bad = rs.filter(r => r.status === 'rejected'); for (const r of bad) console.warn('ассет 3D', r.reason); if (bad.length) ASSETS_P = null; }));
}
b3Pre(loadAssets3);


export { MODEL_DATA, WORM_IMG, assetUrl, ktx2For, loadAssets3 };
