// Упаковка исходников в один текстовый документ проекта (документы claude.ai — только текст) и обратно.
//   node tools/pack.mjs pack   [out.txt]                     — src/ целиком; литералы ассетов (src/assets/*.js, строки > 20 КБ)
//                                                              заменяются заглушкой /*@asset NAME*/ (их источник — артефакт/PWA)
//   node tools/pack.mjs unpack <pack.txt> <артефакт.html | app.js> [--out .]  — восстановить src/, литералы — из бандла
// Проверка round-trip: бандл из восстановленного src/ совпадает с исходным (esbuild печатает литералы одинаково).
import fs from 'node:fs'; import path from 'node:path'; import * as acorn from 'acorn';
const [cmd, a1, a2] = process.argv.slice(2), opt = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const MARK = '=====@file ';
if (cmd === 'pack') {
  const files = []; const walk = d => fs.readdirSync(d, { withFileTypes: true }).sort((x, y) => x.name.localeCompare(y.name)).forEach(e => e.isDirectory() ? walk(path.join(d, e.name)) : files.push(path.join(d, e.name)));
  walk('src');
  let out = `# Dune GoH — исходники src/ (фаза 2). Распаковка: node tools/pack.mjs unpack <этот файл> <артефакт.html>\n`;
  for (const f of files) {
    let t = fs.readFileSync(f, 'utf8');
    if (f.startsWith('src/assets/')) t = t.replace(/^const (\w+) = .{20000,}$/gm, (m, n) => `const ${n} = /*@asset ${n}*/;`);
    out += `${MARK}${f.split(path.sep).join('/')}\n${t}${t.endsWith('\n') ? '' : '\n'}`;
  }
  fs.writeFileSync(a1 || 'dist/src.pack.txt', out); console.log(`упаковано файлов: ${files.length}, ${(out.length / 1024).toFixed(0)} КБ`);
} else if (cmd === 'unpack') {
  const pack = fs.readFileSync(a1, 'utf8'), OUT = opt('--out', '.');
  let bundle = fs.readFileSync(a2, 'utf8');
  if (/<script>/.test(bundle)) bundle = [...bundle.matchAll(/<script>\n([\s\S]*?)<\/script>/g)].map(m => m[1]).sort((x, y) => y.length - x.length)[0];
  const lit = {}; for (const n of acorn.parse(bundle, { ecmaVersion: 'latest', sourceType: 'script' }).body)
    if (n.type === 'VariableDeclaration') for (const d of n.declarations) if (d.init && d.init.end - d.init.start > 20000) lit[d.id.name] = bundle.slice(d.init.start, d.init.end);
  const parts = pack.split('\n' + MARK).slice(1).length ? pack.split(new RegExp('^' + MARK, 'm')).slice(1) : [];
  for (const p of parts) {
    const nl = p.indexOf('\n'), f = p.slice(0, nl); let t = p.slice(nl + 1);
    t = t.replace(/\/\*@asset (\w+)\*\//g, (m, n) => { if (!lit[n]) throw new Error('в бандле нет литерала ' + n); return lit[n]; });
    const dst = path.join(OUT, f); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, t);
  }
  console.log(`распаковано файлов: ${parts.length} в ${OUT}/src`);
} else { console.error('node tools/pack.mjs pack [out] | unpack <pack.txt> <artifact.html|app.js> [--out dir]'); process.exit(2); }
