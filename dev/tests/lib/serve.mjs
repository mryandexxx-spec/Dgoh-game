// Локальный HTTP-сервер каталога сборки для смоук- и A/B-тестов (фаза 5: ассеты грузятся через fetch, а file:// его не поддерживает).
//   const srv = await serve(dir, { gzip: true }); srv.url('index.html'); srv.close();
// gzip — как отдают GitHub Pages и артефакт (замеры tti); без него — быстрее для циклов.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';

const TYPES = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.wasm': 'application/wasm' };

// Фаза 5, шаг 4 (tests/smoke/sw.mjs): srv.dir(новый) — подменить каталог (выкатка), srv.dir(null) — «нет сети» (соединение рвётся);
// onReq(путь, код) — журнал запросов на стороне сервера (видит и запросы SW).
// cc — Cache-Control (по умолчанию no-store; sw.mjs, первая установка — max-age=600, как GitHub Pages)
export function serve(dir, { gzip = false, onReq = null, cc = 'no-store' } = {}) {
  const cache = new Map();
  const srv = http.createServer((q, r) => {
    if (!dir) return q.socket.destroy();
    let f = decodeURIComponent(q.url.split('?')[0]).slice(1); if (f === '' || f.endsWith('/')) f += 'index.html';   // как GitHub Pages: каталог → index.html (SW v54 кэширует './')
    const fp = path.join(dir, f);
    if (!fp.startsWith(dir) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { onReq && onReq(f, 404); r.writeHead(404); return r.end(); }
    onReq && onReq(f, 200);
    if (!cache.has(f)) { const b = fs.readFileSync(fp); cache.set(f, gzip ? zlib.gzipSync(b, { level: 6 }) : b); }
    r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': cc, ...(gzip ? { 'content-encoding': 'gzip' } : {}) });
    r.end(cache.get(f));
  });
  return new Promise(res => srv.listen(0, '127.0.0.1', () => res({
    url: p => `http://127.0.0.1:${srv.address().port}/${p.split(path.sep).map(encodeURIComponent).join('/')}`,
    dir: d => { dir = d && path.resolve(d); cache.clear(); },
    close: () => new Promise(c => { srv.closeAllConnections && srv.closeAllConnections(); srv.close(c); }),
  })));
}
