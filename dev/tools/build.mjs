// Сборка Dune GoH из src/ (заменяет build_pwa.py). Без зависимостей, кроме esbuild и fflate.
//   node tools/build.mjs [--target artifact|pwa|all] [--static <прошлый dune-pwa-flat.zip>] [--out dist] [--deploy] [--ktx2 <каталог>|off]
// Без --static статика берётся из корня репозитория (dev/ лежит в mryandexxx-spec/Dgoh-game): файлы из списка ASSETS
// текущего sw.js + BABYLON-LICENSE.md. --deploy — записать собранную PWA в корень репозитория (затем git commit/push).
// artifact → dist/: artifact.html (каркас) + app.js + app.css + babylon3d.js + assets/ — multi-file, публикуется через files
//            (фаза 5: типы, которые артефакт не отдаёт — .dgm, .hdr, — лежат base64-текстом в «<имя>.txt»).
// pwa      → dist/pwa/ + dist/dune-pwa-flat.zip: index.html + app.js + app.css + статика прошлого архива
//            + babylon3d.js (чанк @babylonjs/core) + assets/ (фаза 5: файлы dev/assets/ с хешем содержимого в имени)
//            (шрифты, иконки, manifest, sw.js). В sw.js обновляются версия кэша и список файлов.
// JS: src/main.js → esbuild (bundle, ESM без экспорта, без tree-shaking) → классический <script>: верхний уровень бандла
//     остаётся глобальной областью, как в монолите (на это опираются тесты и eval-шаги DOM-набора).
// CSS: src/styles/index.css — список @import; склеивается текстуально, без преобразований.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { unzipSync, zipSync } from 'fflate';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const target = opt('--target', 'all'), OUT = path.resolve(opt('--out', path.join(ROOT, 'dist')));
const STATIC = opt('--static', [path.join(ROOT, 'static', 'dune-pwa-flat.zip')].find(f => fs.existsSync(f)));
const REPO = path.resolve(ROOT, '..'), DEPLOY = args.includes('--deploy');
function repoStatic() {   // статика из корня репозитория — ровно то, что сейчас кэширует SW
  const sw = fs.readFileSync(path.join(REPO, 'sw.js'), 'utf8'), sh = /const SHELL = (\{[^}]*\});/.exec(sw);   // фаза 5, шаг 4: SHELL {путь: хеш}; до v55 — ASSETS [пути]
  const list = sh ? Object.keys(JSON.parse(sh[1])) : JSON.parse(/const ASSETS = (\[[^\]]*\]);/.exec(sw)[1]);
  const out = { 'sw.js': new Uint8Array(fs.readFileSync(path.join(REPO, 'sw.js'))) };
  for (const f of [...list, 'BABYLON-LICENSE.md']) if (f !== './' && !/^(index\.html|app\.js|app\.css|babylon3d\.js|assets\/.*)$/.test(f) && fs.existsSync(path.join(REPO, f))) out[f] = new Uint8Array(fs.readFileSync(path.join(REPO, f)));
  return out;
}
const B3_FILE = 'babylon3d.js';   // грузится лениво (render3d/base.js loadB3), в index.html PWA тега нет
const DROP = new Set(['babylon.min.js', 'duncan.glb']);   // фаза 4: UMD Babylon заменён чанком; duncan.glb кодом не читается
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');
const MINIFY = !args.includes('--no-minify');   // фаза 5: app.js — minifyWhitespace + minifySyntax, имена верхнего уровня сохраняются

// Ассеты (фаза 5): dev/assets/** → «assets/<имя>.<хеш8>.<расш>»; в артефакте не отдаваемые им типы — base64 в «….txt».
const ASSET_SRC = path.join(ROOT, 'assets');
const KTX2_DIR = (k => k === 'off' || k === 'default' ? k : path.resolve(k))(opt('--ktx2', 'default'));
const ART_TYPES = /\.(json|jpe?g|png|webp|avif|wasm|js|txt)$/;
function assets() {
  const list = []; const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else list.push(p); } };
  if (fs.existsSync(ASSET_SRC)) walk(ASSET_SRC);
  // фаза 5, шаг 5: KTX2 — dev/assets/ktx2/*.ktx2 (tools/encode-ktx2.mjs); --ktx2 <каталог> — другой набор (A/B), --ktx2 off — без KTX2
  let src = list.map(p => [path.relative(ASSET_SRC, p).split(path.sep).join('/'), fs.readFileSync(p)]).filter(([n]) => n !== 'ktx2/manifest.json');
  if (KTX2_DIR !== 'default') { src = src.filter(([n]) => !n.startsWith('ktx2/'));
    if (KTX2_DIR !== 'off') for (const f of fs.readdirSync(KTX2_DIR).filter(f => f.endsWith('.ktx2')).sort()) src.push(['ktx2/' + f, fs.readFileSync(path.join(KTX2_DIR, f))]); }
  const kx = src.filter(([n]) => n.endsWith('.ktx2'));
  if (kx.length) src.push(...ktx2Transcoder(kx.some(([, b]) => b.readUInt32LE(44) !== 1)));   // supercompressionScheme 1 (BasisLZ) — ETC1S; иначе UASTC
  return src.map(([name, bytes]) => {
    const file = 'assets/' + name.replace(/(\.[^./]+)$/, `.${sha(bytes).slice(0, 8)}$1`);
    return { name, bytes, pwa: file, art: ART_TYPES.test(file) ? file : file + '.txt' }; });
}
// Транскодер KTX2 (@babylonjs/ktx2decoder той же версии, что core): декодер — IIFE с глобальным KTX2DECODER (воркер грузит его importScripts),
// wasm — как есть. ETC1S — msc_basis_transcoder; UASTC-цели (→ ASTC/BC7/RGBA8, zstd) — только если есть UASTC-файлы.
function ktx2Transcoder(uastc) {
  const K = path.join(ROOT, 'node_modules', '@babylonjs', 'ktx2decoder');
  const dec = esbuild.buildSync({ entryPoints: [path.join(K, 'legacy', 'legacy.js')], bundle: true, write: false, format: 'iife', globalName: 'KTX2DECODER',
    minify: true, legalComments: 'none', target: 'es2020', logLevel: 'warning' }).outputFiles[0].contents;
  const w = ['msc_basis_transcoder.js', 'msc_basis_transcoder.wasm', ...(uastc ? ['uastc_astc.wasm', 'uastc_bc7.wasm', 'uastc_rgba8_unorm_v2.wasm', 'uastc_rgba8_srgb_v2.wasm', 'zstddec.wasm'] : [])];
  return [['ktx2/decoder.js', Buffer.from(dec)], ...w.map(f => ['ktx2/' + f, fs.readFileSync(path.join(K, 'wasm', f))])];
}
const withAssets = (code, key) => { const parts = code.split('__ASSET_MAP__'); if (parts.length !== 2) throw new Error('в коде должен быть ровно один __ASSET_MAP__');
  const map = JSON.stringify(Object.fromEntries(ASSETS.map(a => [a.name, a[key]]))); if (/['\\]/.test(map)) throw new Error('кавычка или «\\» в пути ассета');
  return parts[0] + JSON.stringify(map).slice(1, -1) + parts[1]; };   // плейсхолдер стоит внутри строкового литерала — вставляем экранированный текст
const sha = b => crypto.createHash('sha256').update(b).digest('hex');

function css() {
  const seen = new Set();
  const inc = f => {
    const p = path.join(SRC, 'styles', f); if (seen.has(p)) return ''; seen.add(p);
    return fs.readFileSync(p, 'utf8').replace(/^@import\s+["']([^"']+)["'];[^\n]*\n/gm, (m, x) => inc(x));
  };
  return inc(fs.existsSync(path.join(SRC, 'styles', 'index.css')) ? 'index.css' : 'app.css');
}

async function minify(code) {   // без переименований: верхний уровень бандла — глобальная область (тесты, eval-шаги DOM-набора)
  if (!MINIFY) return code;
  const r = await esbuild.transform(code, { minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: false, legalComments: 'none', charset: 'utf8', target: 'esnext' });
  return r.code;
}

async function js() {
  const r = await esbuild.build({
    entryPoints: [path.join(SRC, 'main.js')], bundle: true, write: false, format: 'esm', treeShaking: false,
    charset: 'utf8', legalComments: 'none', target: 'esnext', logLevel: 'warning', metafile: true,
    logOverride: { 'commonjs-variable-in-esm': 'silent' },   // `if (typeof module !== 'undefined') module.exports = …` — экспорт для Node, в браузере не срабатывает
  });
  let code = r.outputFiles[0].text;
  if (/^\s*(import|export)\b/m.test(code)) throw new Error('в бандле остались import/export — точка входа не должна ничего экспортировать');
  if (/<\/script/i.test(code)) throw new Error('в бандле есть «</script» — сломает инлайн-скрипт');
  return { code, meta: r.metafile };
}

// Чанк Babylon: src/render3d/babylon.js → @babylonjs/core с tree-shaking; WGSL-шейдеры (только WebGPU) — пустые модули.
async function babylonChunk() {
  const noWgsl = { name: 'no-wgsl', setup(b) {
    b.onResolve({ filter: /ShadersWGSL\// }, a => ({ path: a.path, namespace: 'no-wgsl' }));
    b.onLoad({ filter: /.*/, namespace: 'no-wgsl' }, () => ({ contents: 'export {}', loader: 'js' }));
  } };
  const r = await esbuild.build({
    entryPoints: [path.join(SRC, 'render3d', 'babylon.js')], bundle: true, write: false, format: 'iife', minify: true,
    charset: 'utf8', legalComments: 'eof', target: 'es2020', logLevel: 'warning', plugins: [noWgsl],
  });
  const code = r.outputFiles[0].text;
  if (/<\/script/i.test(code)) throw new Error('в чанке Babylon есть «</script»');
  return code;
}

function page({ head, cssTag, babylon, jsTag, tail }) {
  // функции-замены: в коде бывают $' / $& — строка-замена их бы раскрыла
  return read('index.html').replace('<!--@head-->\n', () => head).replace('<!--@css-->', () => cssTag).replace('<!--@babylon-->', () => babylon)
    .replace('<!--@js-->', () => jsTag).replace('<!--@tail-->\n', () => tail);
}

const ASSETS = assets();
const { code: code0, meta } = await js(), styles = css(), b3 = await babylonChunk();
// номер версии: dev/version.json (правится вручную при выкатке) + хеш сборки (он же версия кэша SW); выводится в лобби (ui/views/lobby.js APP_VER)
const VNUM = JSON.parse(fs.readFileSync(path.join(ROOT, 'version.json'), 'utf8')).v;
const ver = sha(Buffer.from(`v${VNUM}\n${read('index.html')}\n${['pwa/sw.js', 'pwa/tail.html', 'pwa/pwa-head.html', 'pwa/doc-head.html'].map(read).join('\n')}\n${code0}\n${styles}\n${b3}\n${ASSETS.map(a => a.pwa).join('\n')}\n${MINIFY}`, 'utf8')).slice(0, 10);
if (code0.split('__APP_VER__').length !== 2) throw new Error('в коде должен быть ровно один __APP_VER__');
const APP_VER = `v${VNUM} · ${ver}`, code1 = code0.replace('__APP_VER__', () => APP_VER);
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'app.unmin.js'), withAssets(code1, 'pwa'));   // для tools/check-bundle.mjs (порядок модулей по комментариям-маркерам)
console.log(`версия: ${APP_VER}`);
console.log(`ассеты: ${ASSETS.length} файлов, ${(ASSETS.reduce((s, a) => s + a.bytes.length, 0) / 1048576).toFixed(2)} МБ`);
fs.mkdirSync(OUT, { recursive: true });
console.log(`${B3_FILE}: ${(b3.length / 1048576).toFixed(2)} МБ`);
const mods = Object.keys(meta.inputs).length;

if (target === 'artifact' || target === 'all') {   // фаза 4, шаг 4: артефакт multi-file — artifact.html + babylon3d.js рядом (публикуется через files); loadB3 грузит его по относительному пути
  // фаза 5: каркас + app.js + app.css рядом (как babylon3d.js); список файлов для publish — dist/artifact-files.json
  const html = page({ head: read('pwa/artifact-head.html'), cssTag: '<link rel="stylesheet" href="app.css">', babylon: '', jsTag: '<script src="app.js"></script>', tail: '' });
  const acode = await minify(withAssets(code1, 'art'));
  fs.rmSync(path.join(OUT, 'assets'), { recursive: true, force: true });
  fs.writeFileSync(path.join(OUT, 'artifact.html'), html); fs.writeFileSync(path.join(OUT, B3_FILE), b3);
  fs.writeFileSync(path.join(OUT, 'app.js'), acode); fs.writeFileSync(path.join(OUT, 'app.css'), styles);
  for (const a of ASSETS) { const p = path.join(OUT, a.art); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, a.art === a.pwa ? a.bytes : a.bytes.toString('base64')); }
  fs.writeFileSync(path.join(OUT, 'artifact-files.json'), JSON.stringify(['app.js', 'app.css', B3_FILE, ...ASSETS.map(a => a.art)], null, 1));
  console.log(`artifact.html: ${html.length} Б + app.js ${(acode.length / 1e6).toFixed(2)} МБ + app.css + ${B3_FILE} + ${ASSETS.length} ассетов, модулей ${mods}`);
}

if (target === 'pwa' || target === 'all') {
  if (!STATIC && !fs.existsSync(path.join(REPO, 'sw.js'))) throw new Error('нет статики: --static <dune-pwa-flat.zip> или запуск из dev/ репозитория');
  const files = STATIC ? unzipSync(fs.readFileSync(STATIC)) : repoStatic();
  for (const k of Object.keys(files)) if (k.endsWith('/')) delete files[k];
  for (const k of DROP) delete files[k];
  if (!files['sw.js']) throw new Error('в архиве нет sw.js');
  const enc = s => Buffer.from(s, 'utf8');
  const html = read('pwa/doc-head.html') + page({ head: read('pwa/pwa-head.html'), cssTag: '<link rel="stylesheet" href="app.css">', babylon: '',
    jsTag: '<script src="app.js"></script>', tail: read('pwa/tail.html') }).replace(/\n+<\/body><\/html>\n$/, '\n');
  files['index.html'] = enc(html); files['app.js'] = enc(await minify(withAssets(code1, 'pwa'))); files['app.css'] = enc(styles); files[B3_FILE] = enc(b3);
  for (const a of ASSETS) files[a.pwa] = new Uint8Array(a.bytes);
  // фаза 5, шаг 4: sw.js — из шаблона src/pwa/sw.js; оболочка — {путь: sha256-16} (перенос неизменённых файлов при обновлении), ассеты — пути с хешем
  const shell = Object.fromEntries(Object.keys(files).filter(f => f !== 'sw.js' && !/LICENSE/.test(f) && !f.startsWith('assets/')).sort().map(f => [f, sha(files[f]).slice(0, 16)]));
  const tpl = read('pwa/sw.js'), subst = { __VER__: ver, __SHELL__: JSON.stringify(shell).replace(/","/g, '", "'), __ASSETS__: JSON.stringify(ASSETS.map(a => a.pwa).sort()).replace(/","/g, '", "'),
    // фаза 5, шаг 5: JPEG, у которых есть KTX2, — только фолбэк: не докачиваются заранее, кэшируются по факту запроса
    __LAZY__: JSON.stringify(ASSETS.filter(a => /^tex\/.*\.jpg$/.test(a.name) && ASSETS.some(k => k.name === a.name.replace(/^tex\/(.*)\.jpg$/, 'ktx2/$1.ktx2'))).map(a => a.pwa).sort()).replace(/","/g, '", "') };
  for (const k of Object.keys(subst)) if (tpl.split(k).length !== 2) throw new Error(`в шаблоне sw.js должен быть ровно один ${k}`);
  files['sw.js'] = enc(tpl.replace(/__VER__|__SHELL__|__ASSETS__|__LAZY__/g, m => subst[m]));
  const dir = path.join(OUT, 'pwa'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  for (const [n, b] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(dir, n)), { recursive: true }); fs.writeFileSync(path.join(dir, n), b); }
  const sorted = Object.fromEntries(Object.keys(files).sort().map(n => [n, [files[n], { level: 9, mtime: new Date(Date.UTC(2026, 0, 1)) }]]));
  fs.writeFileSync(path.join(OUT, 'dune-pwa-flat.zip'), zipSync(sorted));
  if (DEPLOY) { fs.rmSync(path.join(REPO, 'assets'), { recursive: true, force: true });
    for (const n of ['index.html', 'app.js', 'app.css', 'sw.js', B3_FILE, ...ASSETS.map(a => a.pwa)]) { fs.mkdirSync(path.dirname(path.join(REPO, n)), { recursive: true }); fs.writeFileSync(path.join(REPO, n), files[n]); } for (const n of DROP) fs.rmSync(path.join(REPO, n), { force: true }); console.log(`записано в корень репозитория: index.html, app.js, app.css, sw.js, ${B3_FILE}, assets/ (${ASSETS.length}); удалено: ${[...DROP].join(', ')}`); }
  console.log(`dune-pwa-flat.zip: ${Object.keys(files).length} файлов, app.js ${(files['app.js'].length / 1e6).toFixed(2)} МБ, index.html ${files['index.html'].length} Б, кэш SW dune-goh-${ver}`);
}
