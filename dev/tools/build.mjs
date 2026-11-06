// Сборка Dune GoH из src/ (заменяет build_pwa.py). Без зависимостей, кроме esbuild и fflate.
//   node tools/build.mjs [--target artifact|pwa|all] [--static <прошлый dune-pwa-flat.zip>] [--out dist] [--deploy]
// Без --static статика берётся из корня репозитория (dev/ лежит в mryandexxx-spec/Dgoh-game): файлы из списка ASSETS
// текущего sw.js + BABYLON-LICENSE.md. --deploy — записать собранную PWA в корень репозитория (затем git commit/push).
// artifact → dist/artifact.html: один HTML (CSS, JS и чанк Babylon инлайном) — публикуется в артефакт как есть.
// pwa      → dist/pwa/ + dist/dune-pwa-flat.zip: index.html + app.js + app.css + статика прошлого архива
//            + babylon3d.js (чанк @babylonjs/core) (шрифты, иконки, manifest, sw.js). В sw.js обновляются версия кэша и список файлов.
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
  const sw = fs.readFileSync(path.join(REPO, 'sw.js'), 'utf8'), list = JSON.parse(/const ASSETS = (\[[^\]]*\]);/.exec(sw)[1]);
  const out = { 'sw.js': new Uint8Array(fs.readFileSync(path.join(REPO, 'sw.js'))) };
  for (const f of [...list, 'BABYLON-LICENSE.md']) if (f !== './' && !/^(index\.html|app\.js|app\.css|babylon3d\.js)$/.test(f) && fs.existsSync(path.join(REPO, f))) out[f] = new Uint8Array(fs.readFileSync(path.join(REPO, f)));
  return out;
}
const B3_FILE = 'babylon3d.js';   // грузится лениво (render3d/base.js loadB3), в index.html PWA тега нет
const DROP = new Set(['babylon.min.js', 'duncan.glb']);   // фаза 4: UMD Babylon заменён чанком; duncan.glb кодом не читается
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');

function css() {
  const seen = new Set();
  const inc = f => {
    const p = path.join(SRC, 'styles', f); if (seen.has(p)) return ''; seen.add(p);
    return fs.readFileSync(p, 'utf8').replace(/^@import\s+["']([^"']+)["'];[^\n]*\n/gm, (m, x) => inc(x));
  };
  return inc(fs.existsSync(path.join(SRC, 'styles', 'index.css')) ? 'index.css' : 'app.css');
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

const { code: code0, meta } = await js(), styles = css(), b3 = await babylonChunk();
// номер версии: dev/version.json (правится вручную при выкатке) + хеш сборки (он же версия кэша SW); выводится в лобби (ui/views/lobby.js APP_VER)
const VNUM = JSON.parse(fs.readFileSync(path.join(ROOT, 'version.json'), 'utf8')).v;
const ver = sha(Buffer.from(`v${VNUM}\n${read('index.html')}\n${code0}\n${styles}\n${b3}`, 'utf8')).slice(0, 10);
if (code0.split('__APP_VER__').length !== 2) throw new Error('в коде должен быть ровно один __APP_VER__');
const APP_VER = `v${VNUM} · ${ver}`, code = code0.replace('__APP_VER__', () => APP_VER);
console.log(`версия: ${APP_VER}`);
fs.mkdirSync(OUT, { recursive: true });
console.log(`${B3_FILE}: ${(b3.length / 1048576).toFixed(2)} МБ`);
const mods = Object.keys(meta.inputs).length;

if (target === 'artifact' || target === 'all') {   // фаза 4, шаг 4: артефакт multi-file — artifact.html + babylon3d.js рядом (публикуется через files); loadB3 грузит его по относительному пути
  const html = page({ head: read('pwa/artifact-head.html'), cssTag: `<style>\n${styles}</style>`, babylon: '', jsTag: `<script>\n${code}</script>`, tail: '' });
  fs.writeFileSync(path.join(OUT, 'artifact.html'), html); fs.writeFileSync(path.join(OUT, B3_FILE), b3);
  console.log(`artifact.html: ${(html.length / 1e6).toFixed(2)} МБ, модулей ${mods}`);
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
  files['index.html'] = enc(html); files['app.js'] = enc(code); files['app.css'] = enc(styles); files[B3_FILE] = enc(b3);
  let sw = Buffer.from(files['sw.js']).toString('utf8'), k = 0;
  sw = sw.replace(/const CACHE = 'dune-goh-[0-9a-f]*';/, () => (k++, `const CACHE = 'dune-goh-${ver}';`));
  sw = sw.replace(/const ASSETS = \[[^\]]*\];/, () => (k++, 'const ASSETS = ' + JSON.stringify(['./', ...Object.keys(files).filter(f => f !== 'sw.js' && !/LICENSE/.test(f)).sort()]).replace(/","/g, '", "') + ';'));
  if (k !== 2) throw new Error('в sw.js не найдены строки CACHE/ASSETS');
  files['sw.js'] = enc(sw);
  const dir = path.join(OUT, 'pwa'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  for (const [n, b] of Object.entries(files)) fs.writeFileSync(path.join(dir, n), b);
  const sorted = Object.fromEntries(Object.keys(files).sort().map(n => [n, [files[n], { level: 9, mtime: new Date(Date.UTC(2026, 0, 1)) }]]));
  fs.writeFileSync(path.join(OUT, 'dune-pwa-flat.zip'), zipSync(sorted));
  if (DEPLOY) { for (const n of ['index.html', 'app.js', 'app.css', 'sw.js', B3_FILE]) fs.writeFileSync(path.join(REPO, n), files[n]); for (const n of DROP) fs.rmSync(path.join(REPO, n), { force: true }); console.log(`записано в корень репозитория: index.html, app.js, app.css, sw.js, ${B3_FILE}; удалено: ${[...DROP].join(', ')}`); }
  console.log(`dune-pwa-flat.zip: ${Object.keys(files).length} файлов, app.js ${(files['app.js'].length / 1e6).toFixed(2)} МБ, index.html ${files['index.html'].length} Б, кэш SW dune-goh-${ver}`);
}
