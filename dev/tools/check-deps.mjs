// Правило зависимостей REFACTOR_PLAN §2: data ← logic ← ui; data ← render3d; logic/* и data/* не импортируют ui/*, render*/*
// и не трогают document/BABYLON; в logic/* и data/* нет HTML-разметки (фрагменты SVG-контуров — данные, разрешены);
// core/* не импортирует ui/* (кроме core/boot — оркестрация старта). После механического разрезания часть нарушений унаследована от монолита — скрипт их перечисляет.
//   node tools/check-deps.mjs [--strict]
import fs from 'node:fs'; import path from 'node:path';
const files = []; const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') && files.push(path.join(d, e.name)));
walk('src/data'); walk('src/logic'); walk('src/core');
const HTML = /<(span|div|svg|b|i|em|strong|p|h[1-6]|ul|ol|li|button|canvas|img|a|table|tr|td|small|br|label|input|section)[\s>\/]/;
let n = 0;
for (const f of files.sort()) {
  const t = fs.readFileSync(f, 'utf8'), bad = [], core = f.startsWith('src/core/');
  if (core) { if (f !== 'src/core/boot.js') for (const m of t.matchAll(/^import \{ ([^}]+) \} from '([^']+)'/gm)) if (/(^|\/)ui\//.test(path.join(path.dirname(f), m[2]))) bad.push(`${m[1]} ← ui`);
    if (bad.length) { n++; console.log(f.replace(/^src\//, '') + ':\n  ' + bad.join('\n  ')); } continue; }
  for (const m of t.matchAll(/^import \{ ([^}]+) \} from '([^']+)'/gm)) if (/(^|\/)(ui|render2d|render3d)\//.test(path.join(path.dirname(f), m[2]))) bad.push(`${m[1]} ← ${path.normalize(path.join(path.dirname(f), m[2])).replace(/^src\//, '')}`);
  if (/\bdocument\.|\bBABYLON\b|\bB3\./.test(t.replace(/^import .*$/gm, ''))) bad.push('DOM/Babylon в коде');
  t.split('\n').forEach((l, i) => { if (!/^\s*\/\//.test(l) && HTML.test(l)) bad.push(`HTML в строке ${i + 1}`); });
  if (bad.length) { n++; console.log(f.replace(/^src\//, '') + ':\n  ' + bad.join('\n  ')); }
}
console.log(n ? `нарушений: ${n} модулей` : 'нарушений нет');
process.exit(n && process.argv.includes('--strict') ? 1 : 0);
