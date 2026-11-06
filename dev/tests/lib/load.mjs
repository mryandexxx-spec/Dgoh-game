// Загрузка игры из HTML (артефакт или index.html PWA) в Node vm — без DOM и Babylon.
// Все скрипты страницы (inline и локальные <script src>, кроме Babylon) выполняются по порядку в одном контексте
// (как в браузере: общая глобальная область). Фаза 2: сборка из src/ — один бандл (инлайн в артефакте, app.js в PWA).
// start() не вызывается: window.claude.hot.ready подменён на no-op.
// Детерминизм: фиксированные часы (Date) и сидированный Math.random — переустанавливаются через reseed().
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

export const FIXED_NOW = Date.UTC(2026, 10, 2, 9, 0, 0); // понедельник 2026-11-02 12:00 МСК

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// Универсальная заглушка: любое свойство/вызов/new возвращает её же
function stub(name = 'stub') {
  const f = function () {};
  const p = new Proxy(f, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return h => (h === 'number' ? 0 : '');
      if (k === Symbol.iterator) return function* () {};
      if (k === Symbol.hasInstance) return () => false;
      if (k === 'then') return undefined;
      if (k === 'length') return 0;
      if (k === 'toString' || k === 'valueOf') return () => '';
      return p;
    },
    set() { return true; },
    apply() { return p; },
    construct() { return p; },
    has() { return true; },
  });
  return p;
}

export function extractScripts(html, dir = '.') {
  const out = [];
  const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const src = m[1] && /\bsrc\s*=\s*["']?([^"'\s>]+)/.exec(m[1]);
    if (!src) { out.push(m[2]); continue; }
    if (/babylon/i.test(src[1]) || /^[a-z]+:/i.test(src[1])) continue;      // Babylon и внешние — заглушки
    out.push(fs.readFileSync(path.join(dir, src[1]), 'utf8'));                // бандл PWA (app.js)
  }
  return out;
}

export function loadGame(htmlPath, { seed = 1, now = FIXED_NOW } = {}) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const scripts = extractScripts(html, path.dirname(path.resolve(htmlPath)));
  if (!scripts.length) throw new Error('в HTML не найдено скриптов игры');

  let clock = now, rnd = mulberry32(seed);
  const RealDate = Date;
  class FDate extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(clock); }
    static now() { return clock; }
  }
  const M = Object.create(Math);
  M.random = () => rnd();

  const store = new Map();
  const localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k), clear: () => store.clear(), key: i => [...store.keys()][i] ?? null, get length() { return store.size; },
  };
  // document: заглушка, но canvas.getContext → null (HAS3D = false, как без WebGL)
  const ds = stub('document');
  const d = new Proxy(ds, { get: (t, k) => k === 'createElement' ? () => new Proxy(stub(), { get: (t2, k2) => (k2 === 'getContext' ? t3 => (/webgl/.test(t3) ? null : ds) : ds) }) : ds[k] });
  const ctx = {
    console: { log() {}, warn() {}, error() {}, info() {} },
    Math: M, Date: FDate, JSON, Intl, Promise, Map, Set, WeakMap, WeakSet, Symbol, Proxy, Reflect, Array, Object, String, Number, Boolean, Error, TypeError, RegExp,
    Float32Array, Int16Array, Int8Array, Uint8Array, Uint16Array, Uint32Array, Int32Array, Uint8ClampedArray, Float64Array, ArrayBuffer, DataView, TextDecoder, TextEncoder,
    atob: s => Buffer.from(s, 'base64').toString('binary'), btoa: s => Buffer.from(s, 'binary').toString('base64'),
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, structuredClone,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0, cancelAnimationFrame() {}, queueMicrotask() {},
    document: d, navigator: stub('navigator'), location: { search: '', hash: '', href: 'about:blank' }, localStorage, sessionStorage: localStorage,
    indexedDB: undefined, matchMedia: () => ({ matches: false, addEventListener() {} }), performance: { now: () => clock - now },
    addEventListener() {}, removeEventListener() {}, getComputedStyle: () => stub(), innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    Image: function () { return stub(); }, URL: { createObjectURL: () => '', revokeObjectURL() {} }, Blob: function () {},
    BABYLON: stub('BABYLON'), screen: stub('screen'), MutationObserver: stub(), ResizeObserver: stub(), IntersectionObserver: stub(), Event: stub(), CustomEvent: stub(), HTMLElement: stub(), Element: stub(), fetch: stub(), caches: undefined,
    claude: { hot: { ready() {}, snapshot() {} } },
  };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  scripts.forEach((src, i) => new vm.Script(src, { filename: `script${i + 1}.js` }).runInContext(ctx));

  const api = {
    ctx,
    // значение глобала (включая const/let) по имени
    get: name => vm.runInContext(name, ctx),
    run: code => vm.runInContext(code, ctx),
    set: (name, value) => { ctx.__tmp = value; vm.runInContext(`${name} = __tmp; delete globalThis.__tmp;`, ctx); },
    reseed(s) { rnd = mulberry32(s); },
    setNow(t) { clock = t; },
    store,
  };
  return api;
}
