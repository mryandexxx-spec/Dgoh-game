// Запись/сравнение эталонов: tests/golden/data/<name>.json.gz.b64 — канонический JSON (1 запись на строку верхнего массива),
// сжатый gzip и закодированный base64 (документы проекта — только текст). Распаковать для просмотра:
//   node tests/lib/golden.mjs unpack battles   → tests/golden/data/battles.json
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

export const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'golden', 'data');

export function argv() {
  const a = process.argv.slice(2);
  if (!a[0] || a[0].startsWith('--')) { console.error('укажите путь к HTML игры (артефакт или index.html PWA)'); process.exit(2); }
  return a;
}
// стабильная сериализация: ключи объектов по алфавиту
export function canon(v) {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

// большие эталоны — построчно, чтобы diff был читаемым
function serialize(obj) {
  const list = obj.battles || obj.cases || obj.saves || obj.screens;
  if (!list) return canon(obj) + '\n';
  const key = Object.keys(obj).find(k => obj[k] === list), head = { ...obj }; delete head[key];
  return '{"meta":' + canon(head) + ',"' + key + '":[\n' + list.map(canon).join(',\n') + '\n]}\n';
}

export function writeGolden(name, obj) {
  fs.mkdirSync(DATA, { recursive: true });
  const s = serialize(obj), f = path.join(DATA, name + '.json.gz.b64');
  const b64 = zlib.gzipSync(Buffer.from(s), { level: 9, mtime: 0 }).toString('base64').replace(/.{1,100}/g, '$&\n');
  fs.writeFileSync(f, b64);
  console.log(`эталон записан: ${path.relative(process.cwd(), f)} (JSON ${(Buffer.byteLength(s) / 1024).toFixed(0)} КБ → ${(b64.length / 1024).toFixed(0)} КБ, sha ${sha(s)})`);
}

export function compareGolden(name, obj) {
  const f = path.join(DATA, name + '.json');
  const want = readGolden(name), got = serialize(obj);
  if (want == null) { console.error('нет эталона ' + name + ' — запустите с --update на базовой сборке'); return false; }
  if (want === got) { console.log(`OK ${name}: совпадает (sha ${sha(got)})`); return true; }
  const a = want.split('\n'), b = got.split('\n');
  let shown = 0;
  for (let i = 0; i < Math.max(a.length, b.length) && shown < 5; i++) if (a[i] !== b[i]) {
    shown++;
    console.error(`РАЗЛИЧИЕ ${name}, строка ${i + 1}:`);
    const x = a[i] || '', y = b[i] || ''; let k = 0; while (k < x.length && x[k] === y[k]) k++;
    console.error('  эталон: …' + x.slice(Math.max(0, k - 80), k + 120));
    console.error('  сейчас: …' + y.slice(Math.max(0, k - 80), k + 120));
  }
  fs.writeFileSync(f.replace(/\.json$/, '.actual.json'), got);
  console.error(`FAIL ${name}: фактический результат сохранён в ${name}.actual.json`);
  return false;
}

export function readGolden(name) {
  const f = path.join(DATA, name + '.json.gz.b64');
  if (!fs.existsSync(f)) return null;
  return zlib.gunzipSync(Buffer.from(fs.readFileSync(f, 'utf8').replace(/\s+/g, ''), 'base64')).toString('utf8');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) && process.argv[2] === 'unpack') {
  for (const n of process.argv.slice(3)) { const s = readGolden(n); if (s == null) { console.error('нет ' + n); continue; } fs.writeFileSync(path.join(DATA, n + '.json'), s); console.log('распакован', n + '.json'); }
}
