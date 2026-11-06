// Сборка Dune GoH из src/ (заменяет build_pwa.py). Без зависимостей, кроме esbuild и fflate.
//   node tools/build.mjs [--target artifact|pwa|all] [--static <прошлый dune-pwa-flat.zip>] [--out dist] [--deploy]
// Без --static статика берётся из корня репозитория (dev/ лежит в mryandexxx-spec/Dgoh-game): файлы из списка ASSETS
// текущего sw.js + BABYLON-LICENSE.md. --deploy — записать собранную PWA в корень репозитория (затем git commit/push).
// artifact → dist/artifact.html: один HTML (CSS и JS инлайном), Babylon 9.30.0 с jsdelivr — публикуется в артефакт как есть.
// pwa      → dist/pwa/ + dist/dune-pwa-flat.zip: index.html + app.js + app.css + статика прошлого архива
//            (babylon.min.js, шрифты, иконки, manifest, sw.js). В sw.js обновляются версия кэша и список файлов.
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
  for (const f of [...list, 'BABYLON-LICENSE.md']) if (f !== './' && !/^(index\.html|app\.js|app\.css)$/.test(f) && fs.existsSync(path.join(REPO, f))) out[f] = new Uint8Array(fs.readFileSync(path.join(REPO, f)));
  return out;
}
const BABYLON_CDN = '<script src="https://cdn.jsdelivr.net/npm/babylonjs@9.30.0/babylon.js"></script>';
const BABYLON_LOCAL = '<script src="babylon.min.js"></script>';
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

function page({ head, cssTag, babylon, jsTag, tail }) {
  return read('index.html').replace('<!--@head-->\n', head).replace('<!--@css-->', cssTag).replace('<!--@babylon-->', babylon)
    .replace('<!--@js-->', jsTag).replace('<!--@tail-->\n', tail);
}

const { code, meta } = await js(), styles = css();
fs.mkdirSync(OUT, { recursive: true });
const mods = Object.keys(meta.inputs).length;

if (target === 'artifact' || target === 'all') {
  const html = page({ head: read('pwa/artifact-head.html'), cssTag: `<style>\n${styles}</style>`, babylon: BABYLON_CDN, jsTag: `<script>\n${code}</script>`, tail: '' });
  fs.writeFileSync(path.join(OUT, 'artifact.html'), html);
  console.log(`artifact.html: ${(html.length / 1e6).toFixed(2)} МБ, модулей ${mods}`);
}

if (target === 'pwa' || target === 'all') {
  if (!STATIC && !fs.existsSync(path.join(REPO, 'sw.js'))) throw new Error('нет статики: --static <dune-pwa-flat.zip> или запуск из dev/ репозитория');
  const files = STATIC ? unzipSync(fs.readFileSync(STATIC)) : repoStatic();
  for (const k of Object.keys(files)) if (k.endsWith('/')) delete files[k];
  for (const need of ['sw.js', 'babylon.min.js']) if (!files[need]) throw new Error('в архиве нет ' + need);
  const enc = s => Buffer.from(s, 'utf8');
  const html = read('pwa/doc-head.html') + page({ head: read('pwa/pwa-head.html'), cssTag: '<link rel="stylesheet" href="app.css">', babylon: BABYLON_LOCAL,
    jsTag: '<script src="app.js"></script>', tail: read('pwa/tail.html') }).replace(/\n+<\/body><\/html>\n$/, '\n');
  files['index.html'] = enc(html); files['app.js'] = enc(code); files['app.css'] = enc(styles);
  const ver = sha(Buffer.concat([files['index.html'], files['app.js'], files['app.css']])).slice(0, 10);
  let sw = Buffer.from(files['sw.js']).toString('utf8'), k = 0;
  sw = sw.replace(/const CACHE = 'dune-goh-[0-9a-f]*';/, () => (k++, `const CACHE = 'dune-goh-${ver}';`));
  sw = sw.replace(/const ASSETS = \[[^\]]*\];/, () => (k++, 'const ASSETS = ' + JSON.stringify(['./', ...Object.keys(files).filter(f => f !== 'sw.js' && !/LICENSE/.test(f)).sort()]).replace(/","/g, '", "') + ';'));
  if (k !== 2) throw new Error('в sw.js не найдены строки CACHE/ASSETS');
  files['sw.js'] = enc(sw);
  const dir = path.join(OUT, 'pwa'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  for (const [n, b] of Object.entries(files)) fs.writeFileSync(path.join(dir, n), b);
  const sorted = Object.fromEntries(Object.keys(files).sort().map(n => [n, [files[n], { level: 9, mtime: new Date(Date.UTC(2026, 0, 1)) }]]));
  fs.writeFileSync(path.join(OUT, 'dune-pwa-flat.zip'), zipSync(sorted));
  if (DEPLOY) { for (const n of ['index.html', 'app.js', 'app.css', 'sw.js']) fs.writeFileSync(path.join(REPO, n), files[n]); console.log('записано в корень репозитория: index.html, app.js, app.css, sw.js'); }
  console.log(`dune-pwa-flat.zip: ${Object.keys(files).length} файлов, app.js ${(files['app.js'].length / 1e6).toFixed(2)} МБ, index.html ${files['index.html'].length} Б, кэш SW dune-goh-${ver}`);
}
