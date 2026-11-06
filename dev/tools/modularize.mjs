// Проход 2 (REFACTOR_PLAN §7 «Фаза 2»): механическое разрезание src/app.js на ES-модули по tools/split.config.mjs.
//   node tools/modularize.mjs [--src src/app.js] [--out src]
// Код модулей — дословные строки монолита. Генерируются только:
//   • import { … } — по свободным ссылкам на верхнеуровневые имена других модулей (анализ областей: tools/scope.mjs);
//   • export { … } — все верхнеуровневые имена модуля;
//   • запись в чужую верхнеуровневую переменную (S, view, BT, SC, …) — через сеттер владельца: `X = v` → `set_X(v)`
//     (ES-импорт только для чтения; живая привязка сохраняет поведение для читателей);
//   • цепочка порядка исполнения: каждый модуль импортирует предыдущий, импорты — по убыванию номера модуля,
//     точка входа импортирует последний. Тогда обход ESM (и бандл esbuild) исполняет модули строго в порядке монолита.
import fs from 'node:fs';
import path from 'node:path';
import * as acorn from 'acorn';
import { analyze, patNames } from './scope.mjs';
import { SPLIT } from './split.config.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const SRC = opt('--src', 'src/app.js'), OUT = opt('--out', 'src');
const src = fs.readFileSync(SRC, 'utf8');
const lines = src.split('\n'); if (lines[lines.length - 1] === '') lines.pop();
const lineStart = [0]; for (const l of lines) lineStart.push(lineStart[lineStart.length - 1] + l.length + 1);
const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true });

const modOf = l => { let k = 0; for (let i = 0; i < SPLIT.length; i++) if (SPLIT[i][0] <= l) k = i; return k; };
const M = SPLIT.map(([from, file], i) => ({ i, file, from, to: (SPLIT[i + 1] ? SPLIT[i + 1][0] : lines.length + 1) - 1, stmts: [], decl: [] }));
for (const n of ast.body) {
  const a = modOf(n.loc.start.line), b = modOf(n.loc.end.line);
  if (a !== b) throw new Error(`оператор строк ${n.loc.start.line}–${n.loc.end.line} пересекает границу ${M[a].file} / ${M[b].file}`);
  M[a].stmts.push(n);
  M[a].decl.push(...(n.type === 'VariableDeclaration' ? n.declarations.flatMap(d => patNames(d.id)) : n.id ? [n.id.name] : []));
}
const owner = new Map();
for (const m of M) for (const x of m.decl) { if (owner.has(x)) throw new Error('дубль имени ' + x); owner.set(x, m.i); }

// анализ ссылок и записей
const setters = new Map();  // имя → модуль-владелец
const edits = [];           // {start, end, text} в координатах src
for (const m of M) {
  const { refs, writes } = analyze(m.stmts);
  m.uses = new Map();       // модуль → Set имён
  const use = (o, x) => { if (!m.uses.has(o)) m.uses.set(o, new Set()); m.uses.get(o).add(x); };
  for (const x of refs.keys()) { const o = owner.get(x); if (o !== undefined && o !== m.i) use(o, x); }
  for (const w of writes) {
    const o = owner.get(w.name); if (o === undefined || o === m.i) continue;
    const set = 'set_' + w.name; if (owner.has(set)) throw new Error('имя сеттера занято: ' + set);
    setters.set(w.name, o); use(o, set);
    const p = w.parent;
    if (p.type === 'AssignmentExpression' && p.left === w.id) {
      if (p.operator === '=') edits.push({ start: p.start, end: p.right.start, text: set + '(' }, { start: p.end, end: p.end, text: ')' });
      else if (/^(\|\||&&|\?\?)=$/.test(p.operator)) edits.push({ start: p.start, end: p.right.start, text: `${w.name} ${p.operator.slice(0, -1)} ${set}(` }, { start: p.end, end: p.end, text: ')' });
      else edits.push({ start: p.start, end: p.right.start, text: `${set}(${w.name} ${p.operator.slice(0, -1)} (` }, { start: p.end, end: p.end, text: '))' });
    } else if (p.type === 'UpdateExpression') {
      if (!p.prefix) console.warn(`внимание: постфиксный ${w.name}${p.operator} в ${m.file} заменён на префиксный (значение выражения)`);
      edits.push({ start: p.start, end: p.end, text: `${set}(${w.name} ${p.operator[0]} 1)` });
    } else throw new Error(`запись ${w.name} в ${m.file}: неподдерживаемая форма ${p.type}`);
  }
}
edits.sort((a, b) => b.start - a.start || b.end - a.end);
let code = src;
for (const e of edits) code = code.slice(0, e.start) + e.text + code.slice(e.end);
// пересчёт строк после правок (правки однострочные по вставке, но тексты разной длины — режем заново по номерам строк)
const outLines = code.split('\n');

const rel = (from, to) => { let r = path.relative(path.dirname(from), to).split(path.sep).join('/'); return r.startsWith('.') ? r : './' + r; };
const written = [];
for (const m of M) {
  const imps = [...m.uses.entries()].sort((a, b) => b[0] - a[0]);
  if (m.i > 0 && !m.uses.has(m.i - 1)) {      // цепочка порядка: предыдущий модуль — первым среди младших
    const k = imps.findIndex(([o]) => o < m.i); imps.splice(k < 0 ? imps.length : k, 0, [m.i - 1, null]);
  }
  const head = [`// ${m.file} — строки ${m.from}–${m.to} монолита (src/app.js прохода 1). Сгенерировано tools/modularize.mjs; дальше правится вручную.`];
  for (const [o, names] of imps) head.push(names ? `import { ${[...names].sort().join(', ')} } from '${rel(m.file, M[o].file)}';` : `import '${rel(m.file, M[o].file)}'; // порядок исполнения`);
  const own = [...m.decl];
  const sets = [...setters.entries()].filter(([, o]) => o === m.i).map(([x]) => x);
  const tail = [];
  for (const x of sets) tail.push(`function set_${x}(v) { return ${x} = v; }`);
  const exp = [...own, ...sets.map(x => 'set_' + x)];
  if (exp.length) tail.push(`export { ${exp.join(', ')} };`);
  const body = outLines.slice(m.from - 1, m.to).join('\n');
  const text = head.join('\n') + '\n\n' + body + '\n' + (tail.length ? '\n' + tail.join('\n') + '\n' : '');
  const f = path.join(OUT, m.file); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text);
  written.push([m.file, m.to - m.from + 1, imps.length]);
}
fs.writeFileSync(path.join(OUT, 'main.js'), `// Точка входа: импорт последнего модуля цепочки запускает все модули в порядке монолита (см. tools/modularize.mjs).\nimport './${M[M.length - 1].file}';\n`);
console.log(`модулей: ${M.length}, сеттеров: ${setters.size} (${[...setters.keys()].join(', ')}), правок записи: ${edits.length / 1}`);
