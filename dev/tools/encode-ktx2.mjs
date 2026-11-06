// Кодирование текстур assets/tex/*.jpg → assets/ktx2/*.ktx2 (фаза 5, шаг 5).
// Роль карты — по суффиксу имени: -alb (sRGB), -orm (линейная), -nrm (нормали).
// Результат коммитится; сборка только копирует. Кэш — assets/ktx2/manifest.json
// (sha256 источника + параметры): неизменённые текстуры не перекодируются.
//   node tools/encode-ktx2.mjs [--out dir] [--nrm etc1s|uastc] [--rdo 3] [--force]
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import jpeg from 'jpeg-js';
import { encodeToKTX2 } from 'ktx2-encoder';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const SRC = join(ROOT, 'assets/tex');
const OUT = arg('--out', join(ROOT, 'assets/ktx2'));
const NRM = arg('--nrm', 'etc1s');   // A/B шага 5: в окне героя ETC1S не отличим от UASTC (0,13 % против 0,08 % пикселей), файлы вдвое меньше
const RDO = +arg('--rdo', 3);
const FORCE = process.argv.includes('--force');

// Параметры по ролям. ETC1S: qualityLevel 1–255 (выше — крупнее и точнее).
const ETC1S = { isUASTC: false, qualityLevel: 200, compressionLevel: 2 };
const UASTC = { isUASTC: true, uastcLDRQualityLevel: 2, enableRDO: true, rdoQualityLevel: RDO, needSupercompression: true };
const ROLE = {
  alb: { ...ETC1S, isPerceptual: true, isSetKTX2SRGBTransferFunc: true },
  orm: { ...ETC1S, isPerceptual: false, isSetKTX2SRGBTransferFunc: false },
  nrm: { ...(NRM === 'etc1s' ? ETC1S : UASTC), isNormalMap: true, isPerceptual: false, isSetKTX2SRGBTransferFunc: false },
};
// JPEG грузятся с invertY=true; сжатую текстуру движок перевернуть не может — переворачиваем при кодировании.
const COMMON = { isKTX2File: true, generateMipmap: true, isYFlip: true };

const decode = async buf => { const im = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true }); return { width: im.width, height: im.height, data: im.data }; };
const sha = b => createHash('sha256').update(b).digest('hex').slice(0, 16);

mkdirSync(OUT, { recursive: true });
const mfPath = join(OUT, 'manifest.json');
const mf = existsSync(mfPath) ? JSON.parse(readFileSync(mfPath, 'utf8')) : {};
let enc = 0, kept = 0, inB = 0, outB = 0;
const t0 = Date.now();
for (const f of readdirSync(SRC).filter(f => f.endsWith('.jpg')).sort()) {
  const role = (f.match(/-(alb|orm|nrm)\.jpg$/) || [])[1];
  if (!role) { console.warn('пропуск (роль не распознана):', f); continue; }
  const src = readFileSync(join(SRC, f)), opts = { ...COMMON, ...ROLE[role] };
  const key = sha(src) + ':' + sha(JSON.stringify(opts));
  const name = basename(f, '.jpg') + '.ktx2', dst = join(OUT, name);
  inB += src.length;
  if (!FORCE && mf[name] === key && existsSync(dst)) { kept++; outB += readFileSync(dst).length; continue; }
  const t = Date.now();
  const out = await encodeToKTX2(src, { ...opts, imageDecoder: decode });
  writeFileSync(dst, out); mf[name] = key; enc++; outB += out.length;
  console.log(`${name.padEnd(26)} ${role} ${opts.isUASTC ? 'UASTC' : 'ETC1S'} ${(src.length / 1024).toFixed(0).padStart(4)} → ${(out.length / 1024).toFixed(0).padStart(5)} КБ  ${Date.now() - t} мс`);
}
writeFileSync(mfPath, JSON.stringify(mf, null, 1) + '\n');
console.log(`закодировано ${enc}, из кэша ${kept}; JPEG ${(inB / 1048576).toFixed(2)} МБ → KTX2 ${(outB / 1048576).toFixed(2)} МБ; ${((Date.now() - t0) / 1000).toFixed(1)} с`);
