// Механический перенос верхнеуровневых объявлений между модулями src/ с починкой import/export (фаза 2 → 3).
//   node tools/move-decl.mjs <from> <to> <name,...> [--top]   пути от src/; stmt:<подстрока> — перенести оператор верхнего уровня
//   node tools/move-decl.mjs --fix                            добавить недостающие импорты во всех модулях
//   node tools/move-decl.mjs --chain <file...>                поставить импорт предшественника по цепочке первым
// Удаляет только импорты, ставшие ненужными в исходном модуле; если пропал последний импорт предшественника — ставит
// `import './пред.js'; // порядок исполнения`. После запуска: check-bundle, check-deps, golden --no-dom. Запуск из dev/.
import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
const req = createRequire(path.resolve('package.json'));
const acorn = req('acorn');
const { analyze, patNames } = await import(path.resolve('tools/scope.mjs'));
const SRC = 'src';
const files = []; const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') && files.push(path.relative(SRC, path.join(d, e.name))));
walk(SRC);
const rd = f => fs.readFileSync(path.join(SRC, f), 'utf8'), wr = (f, t) => fs.writeFileSync(path.join(SRC, f), t);
const parse = t => acorn.parse(t, { ecmaVersion: 'latest', sourceType: 'module' });
const expRe = /^export \{ (.*) \};$/m;
const exportsOf = t => { const m = expRe.exec(t); return m ? m[1].split(', ') : []; };
const setExports = (t, names) => expRe.test(t) ? t.replace(expRe, names.length ? `export { ${names.join(', ')} };` : '') : (names.length ? t.replace(/\n*$/, `\n\n\nexport { ${names.join(', ')} };\n`) : t);
const declNames = n => n.type === 'VariableDeclaration' ? n.declarations.flatMap(d => patNames(d.id)) : (n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') ? [n.id.name] : [];

const args = process.argv.slice(2);
const refsOf = t => { const a = parse(t); return new Set(analyze(a.body.filter(n => n.type !== 'ImportDeclaration' && n.type !== 'ExportNamedDeclaration')).refs.keys()); };
const DROP = new Map(); // файл → имена, переставшие использоваться
if (args[0] !== '--fix' && args[0] !== '--chain') {
  const [from, to, list] = args, top = args.includes('--top'); const want = list.split(',');
  let tf = rd(from); const ast = parse(tf);
  const picked = [];
  for (const n of ast.body) {
    const ds = declNames(n);
    const stmtHit = n.type === 'ExpressionStatement' && want.some(w => w.startsWith('stmt:') && tf.slice(n.start, n.end).includes(w.slice(5)));
    if (stmtHit || (ds.length && ds.some(d => want.includes(d)))) {
      if (!stmtHit && !ds.every(d => want.includes(d))) throw new Error(`${from}: объявление ${ds} надо переносить целиком`);
      picked.push(n);
    }
  }
  const names = picked.flatMap(declNames);
  const miss = want.filter(w => !w.startsWith('stmt:') && !names.includes(w)); if (miss.length) throw new Error('не найдено: ' + miss);
  // вырезаем полными строками (с хвостовым комментарием на той же строке)
  const chunks = []; let out = tf;
  for (const n of [...picked].reverse()) {
    const s = tf.lastIndexOf('\n', n.start - 1) + 1; let e = tf.indexOf('\n', n.end); e = e < 0 ? tf.length : e + 1;
    if (tf.slice(s, n.start).trim()) throw new Error('перед объявлением на строке есть код: ' + tf.slice(s, n.start));
    chunks.unshift(tf.slice(s, e)); out = out.slice(0, s) + out.slice(e);
  }
  const fromExp = exportsOf(tf);
  out = setExports(out, fromExp.filter(x => !names.includes(x)));
  { const b = refsOf(tf), a = refsOf(out); DROP.set(from, new Set([...b].filter(x => !a.has(x)))); }
  wr(from, out);
  let tt = rd(to); const code = chunks.join('');
  if (top) { const a = parse(tt), last = [...a.body].reverse().find(n => n.type === 'ImportDeclaration'); const p = last ? tt.indexOf('\n', last.end) + 1 : 0; tt = tt.slice(0, p) + (last ? '\n' : '') + code + tt.slice(p).replace(/^\n/, ''); }
  else { const m = /\n*((?:^\/\/[^\n]*\n+)*)(export \{ .* \};\n?)?(?![\s\S])/m.exec(tt); tt = tt.slice(0, m.index) + '\n' + code + (m[1] ? '\n' + m[1].replace(/\n+$/, '\n') : '') + (m[2] ? '\n\n' + m[2] : '\n'); }
  tt = setExports(tt, [...exportsOf(tt), ...names.filter(x => fromExp.includes(x) || true)]);
  tt = tt.replace(/^import \{ ([^}]+) \} from '([^']+)';\n/gm, (m, sp, src) => { const k = sp.split(', ').filter(x => !names.includes(x)); return k.length === sp.split(', ').length ? m : k.length ? `import { ${k.join(', ')} } from '${src}';\n` : ''; });
  wr(to, tt);
  console.log(`${from} → ${to}: ${names.join(', ')}${picked.some(n => n.type === 'ExpressionStatement') ? ' (+операторы)' : ''}`);
}
// ---- починка импортов: имя → модуль по export-спискам; трогаем только файлы, где набор импортов меняется
const owner = new Map();
for (const f of files) for (const x of exportsOf(rd(f))) { if (owner.has(x)) throw new Error(`имя ${x} экспортируют ${owner.get(x)} и ${f}`); owner.set(x, f); }
const SPLIT = (await import(path.resolve('tools/split.config.mjs'))).SPLIT.map(s => s[1]);
// импорт предшественника по цепочке — первым: тогда порядок исполнения не зависит от остальных импортов
function chainFirst(f, o) {
  const i = SPLIT.indexOf(f); if (i <= 0) return o;
  const pred = SPLIT[i - 1], lines = o.split('\n'); let k = -1;
  lines.forEach((l, j) => { const m = /^import (?:\{[^}]*\} from )?'([^']+)'/.exec(l); if (m && k < 0 && path.normalize(path.join(path.dirname(f), m[1])) === pred) k = j; });
  const f0 = lines.findIndex(l => l.startsWith('import ')); if (k < 0) throw new Error(`${f}: нет импорта предшественника ${pred}`);
  if (k === f0) return o;
  const [l] = lines.splice(k, 1); lines.splice(f0, 0, l); return lines.join('\n');
}
const relTo = (f, g) => { let r = path.relative(path.dirname(f), g); return r.startsWith('.') ? r : './' + r; };
for (const f of files) {
  const t = rd(f); const ast = parse(t);
  const own = new Set(ast.body.flatMap(declNames));
  const { refs, writes } = analyze(ast.body.filter(n => n.type !== 'ImportDeclaration' && n.type !== 'ExportNamedDeclaration'));
  const need = new Map(); // module → Set(names)
  for (const name of refs.keys()) { if (own.has(name)) continue; const m = owner.get(name); if (!m || m === f) continue; if (!need.has(m)) need.set(m, new Set()); need.get(m).add(name); }
  for (const w of writes) if (!own.has(w.name) && owner.has(w.name)) console.log(`!! ${f}: запись в импортируемое ${w.name}`);
  const have = new Map(); const imps = ast.body.filter(n => n.type === 'ImportDeclaration');
  for (const n of imps) if (n.specifiers.length) { const m = path.normalize(path.join(path.dirname(f), n.source.value)); have.set(m, n); }
  // сравнение: убираем только имена, которых модуль больше не экспортирует; добавляем недостающие
  let changed = false; const edits = [];
  for (const [m, n] of have) {
    const ex = new Set(exportsOf(rd(m))), cur = n.specifiers.map(s => s.imported.name);
    const dr = DROP.get(f) || new Set(), keep = cur.filter(x => ex.has(x) && !dr.has(x)), plus = [...(need.get(m) || [])].filter(x => !cur.includes(x));
    if (keep.length === cur.length && !plus.length) continue;
    const want = [...keep, ...plus].sort();
    changed = true; edits.push([n, want.length ? `import { ${want.join(', ')} } from '${n.source.value}';` : SPLIT[SPLIT.indexOf(f) - 1] === m ? `import '${n.source.value}'; // порядок исполнения` : null]);
  }
  const add = [...need].filter(([m]) => !have.has(m));
  if (!changed && !add.length) continue;
  let o = t;
  for (const [n, rep] of edits.sort((a, b) => b[0].start - a[0].start)) {
    const s = n.start; let e = n.end; if (rep === null && o[e] === '\n') e++;
    o = o.slice(0, s) + (rep ?? '') + o.slice(e);
  }
  if (add.length) {
    const a2 = parse(o), last = [...a2.body].reverse().find(n => n.type === 'ImportDeclaration'); const p = last ? o.indexOf('\n', last.end) + 1 : 0;
    o = o.slice(0, p) + add.map(([m, s]) => `import { ${[...s].sort().join(', ')} } from '${relTo(f, m)}';\n`).join('') + o.slice(p);
  }
  o = chainFirst(f, o);
  wr(f, o);
  console.log(`  импорты: ${f}`);
}
if (args[0] === '--chain') for (const f of args.slice(1)) { const o = rd(f), n = chainFirst(f, o); if (n !== o) { wr(f, n); console.log('  цепочка первой: ' + f); } }
