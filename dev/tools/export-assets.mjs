// Фаза 5: вынос встроенных base64-ассетов из src/assets/*.js в файлы dev/assets/ (разовый перенос; дальше dev/assets — источник).
//   node tools/export-assets.mjs [--from <каталог со старыми models.js, env-hdr.js, mocap-data.js>]
// models/<id>.dgm — формат DGM1: 'DGM1' + u32 LE длина заголовка + JSON-заголовок (UTF-8, дополнен пробелами до кратности 4)
//   + блобы, каждый выровнен на 4 байта. В заголовке исходная структура MODEL_DATA[id], где base64-поля геометрии
//   заменены на {"@b":[смещение от начала блобов, длина]}, а data-URI текстур — на {"@t":"tex/<имя>"} (отдельные файлы).
// tex/*.jpg, img/*.png — байты data-URI как есть; env/desert.hdr — байты ENV_HDR; anim/mocap.json — объект MOCAP как есть.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), FROM = path.resolve(args[args.indexOf('--from') + 1] && args.includes('--from') ? args[args.indexOf('--from') + 1] : path.join(ROOT, 'src', 'assets'));
const OUT = path.join(ROOT, 'assets');
const lit = (file, name) => { const s = fs.readFileSync(path.join(FROM, file), 'utf8'), m = new RegExp(`const ${name} = ([\\s\\S]*?);\\n`).exec(s); if (!m) throw new Error(`${file}: нет ${name}`); return (0, eval)('(' + m[1] + ')'); };
const uri = s => { const m = /^data:([^;]+);base64,(.*)$/.exec(s); if (!m) throw new Error('не data-URI'); return { mime: m[1], bytes: Buffer.from(m[2], 'base64') }; };
const ext = mime => ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[mime] || (() => { throw new Error('mime ' + mime); })();
const put = (rel, b) => { const p = path.join(OUT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, b); return b.length; };
const BLOB = new Set(['p', 'nr', 'c', 'uv', 'j', 'w', 'i']), TEX = new Set(['alb', 'nrm', 'orm']);

function dgm(id, R) {
  const blobs = []; let off = 0;
  const walk = (o, trail) => {
    if (Array.isArray(o)) return o.map((v, i) => walk(v, trail.concat(i)));
    if (!o || typeof o !== 'object') return o;
    const r = {};
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string' && TEX.has(k)) { const { mime, bytes } = uri(v), name = `tex/${[id, ...trail.filter(t => t !== 'parts'), k].join('-')}.${ext(mime)}`; put(name, bytes); r[k] = { '@t': name }; }
      else if (typeof v === 'string' && BLOB.has(k)) { const b = Buffer.from(v, 'base64'); r[k] = { '@b': [off, b.length] }; blobs.push(b); const pad = (4 - b.length % 4) % 4; if (pad) blobs.push(Buffer.alloc(pad)); off += b.length + pad; }
      else r[k] = walk(v, trail.concat(k));
    }
    return r;
  };
  let head = Buffer.from(JSON.stringify(walk(R, [])), 'utf8'); head = Buffer.concat([head, Buffer.alloc((4 - head.length % 4) % 4, 0x20)]);
  const pre = Buffer.alloc(8); pre.write('DGM1', 0, 'latin1'); pre.writeUInt32LE(head.length, 4);
  return put(`models/${id}.dgm`, Buffer.concat([pre, head, ...blobs]));
}

const MODEL_DATA = lit('models.js', 'MODEL_DATA'), WORM_IMG = lit('models.js', 'WORM_IMG');
fs.rmSync(OUT, { recursive: true, force: true });
for (const id of Object.keys(MODEL_DATA)) console.log(`models/${id}.dgm: ${dgm(id, MODEL_DATA[id])} Б`);
for (const [k, v] of Object.entries(WORM_IMG)) { const { mime, bytes } = uri(v); console.log(`img/worm-${k}.${ext(mime)}: ${put(`img/worm-${k}.${ext(mime)}`, bytes)} Б`); }
console.log(`env/desert.hdr: ${put('env/desert.hdr', uri(lit('env-hdr.js', 'ENV_HDR')).bytes)} Б`);
console.log(`anim/mocap.json: ${put('anim/mocap.json', Buffer.from(JSON.stringify(lit('mocap-data.js', 'MOCAP')), 'utf8'))} Б`);
console.log(`текстур: ${fs.readdirSync(path.join(OUT, 'tex')).length}`);
