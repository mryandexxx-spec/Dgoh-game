// Локальный HTTP-сервер каталога сборки для смоук- и A/B-тестов (фаза 5: ассеты грузятся через fetch, а file:// его не поддерживает).
//   const srv = await serve(dir, { gzip: true }); srv.url('index.html'); srv.close();
// gzip — как отдают GitHub Pages и артефакт (замеры tti); без него — быстрее для циклов.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';

const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.wasm': 'application/wasm' };

export function serve(dir, { gzip = false } = {}) {
  const cache = new Map();
  const srv = http.createServer((q, r) => {
    const f = decodeURIComponent(q.url.split('?')[0]).slice(1), fp = path.join(dir, f);
    if (!fp.startsWith(dir) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { r.writeHead(404); return r.end(); }
    if (!cache.has(f)) { const b = fs.readFileSync(fp); cache.set(f, gzip ? zlib.gzipSync(b, { level: 6 }) : b); }
    r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store', ...(gzip ? { 'content-encoding': 'gzip' } : {}) });
    r.end(cache.get(f));
  });
  return new Promise(res => srv.listen(0, '127.0.0.1', () => res({
    url: p => `http://127.0.0.1:${srv.address().port}/${p.split(path.sep).map(encodeURIComponent).join('/')}`,
    close: () => new Promise(c => srv.close(c)),
  })));
}
