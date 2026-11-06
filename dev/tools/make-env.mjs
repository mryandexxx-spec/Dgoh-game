// Фаза 5, шаг 6: .env (Babylon prefiltered: мипы GGX + сферические гармоники) из dev/assets-src/env/desert.hdr (исходник, в сборку не входит).
//   node tools/make-env.mjs [--size 64] [--hdr assets-src/env/desert.hdr] [--out assets/env/desert.env] [--chrome path]
// Префильтрация — тот же путь, что и в игре до шага 6 (HDRCubeTexture, prefilterOnLoad, на GPU через SwiftShader),
// затем EnvironmentTextureTools.CreateEnvDataAsync (RGBD PNG). Разовый инструмент: .env кладётся в dev/assets и коммитится.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { serve } from '../tests/lib/serve.mjs';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const SIZE = +opt('--size', 64), HDR = path.resolve(ROOT, opt('--hdr', 'assets-src/env/desert.hdr')), OUT = path.resolve(ROOT, opt('--out', 'assets/env/desert.env'));
const chrome = opt('--chrome') || process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(f => fs.existsSync(f));

const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'make-env-'));
const entry = `import { Engine } from '@babylonjs/core/Engines/engine.js'; import { Scene } from '@babylonjs/core/scene.js';
import { HDRCubeTexture } from '@babylonjs/core/Materials/Textures/hdrCubeTexture.js';
import { CreateEnvTextureAsync } from '@babylonjs/core/Misc/environmentTextureTools.js';
window.makeEnv = async (url, size) => {
  const cv = document.createElement('canvas'); document.body.appendChild(cv);
  const engine = new Engine(cv, false, { preserveDrawingBuffer: true }), scene = new Scene(engine);
  const tex = await new Promise((res, rej) => { const t = new HDRCubeTexture(url, scene, size, false, true, false, true, () => res(t), (m, e) => rej(new Error(m || e))); });
  const buf = await CreateEnvTextureAsync(tex, { imageType: 'image/png' });
  const sp = tex.sphericalPolynomial; let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return { b64: btoa(s), sh: sp && ['x', 'y', 'z', 'xx', 'yy', 'zz', 'yz', 'zx', 'xy'].map(k => [sp[k].x, sp[k].y, sp[k].z].map(v => +v.toFixed(4))) };
};`;
fs.writeFileSync(path.join(tmp, 'entry.js'), entry);
await esbuild.build({ entryPoints: [path.join(tmp, 'entry.js')], bundle: true, format: 'iife', outfile: path.join(tmp, 'env.js'), nodePaths: [path.join(ROOT, 'node_modules')], logLevel: 'error' });
fs.copyFileSync(HDR, path.join(tmp, 'in.hdr'));
fs.writeFileSync(path.join(tmp, 'index.html'), '<!doctype html><body><script src="env.js"></script>');

const srv = await serve(tmp);
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage(); page.on('pageerror', e => console.error('page:', e.message));
  await page.goto(srv.url('index.html'), { waitUntil: 'load' });
  const r = await page.evaluate((u, s) => window.makeEnv(u, s), srv.url('in.hdr'), SIZE);
  const bytes = Buffer.from(r.b64, 'base64'); fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, bytes);
  console.log(`${path.relative(ROOT, OUT)}: ${bytes.length} Б (куб ${SIZE}, из ${path.relative(ROOT, HDR)} ${fs.statSync(HDR).size} Б); SH L0 ${JSON.stringify(r.sh && r.sh[3])}`);
} finally { await browser.close(); await srv.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
