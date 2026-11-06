// Проверка бандла после разрезания: (1) модули идут в порядке tools/split.config.mjs; (2) все верхнеуровневые имена
// монолита остались верхнеуровневыми в бандле без переименований (на них опираются тесты и eval-шаги).
//   node tools/check-bundle.mjs dist/pwa/app.js [dist/app.unmin.js]
import fs from 'node:fs'; import * as acorn from 'acorn'; import { patNames } from './scope.mjs'; import { SPLIT } from './split.config.mjs';
const code = fs.readFileSync(process.argv[2] || 'dist/pwa/app.js', 'utf8');
// фаза 5: app.js минифицирован (комментарии-маркеры удалены) — порядок модулей берётся из несжатой копии dist/app.unmin.js,
// имена верхнего уровня проверяются в самом файле (минификация не должна их переименовать или убрать).
const marked = /^\/\/ src\//m.test(code) ? code : fs.readFileSync(process.argv[3] || 'dist/app.unmin.js', 'utf8');
const order = [...marked.matchAll(/^\/\/ src\/(.+\.js)$/gm)].map(m => m[1]).filter(f => f !== 'main.js');
const want = SPLIT.map(s => s[1]);
const badOrder = want.findIndex((f, i) => order[i] !== f);
const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'script' });
const top = new Set(ast.body.flatMap(n => n.type === 'VariableDeclaration' ? n.declarations.flatMap(d => patNames(d.id)) : n.id ? [n.id.name] : []));
const names = []; for (const f of want) { const t = fs.readFileSync('src/' + f, 'utf8'); const m = /^export \{ (.+) \};$/m.exec(t); if (m) names.push(...m[1].split(', ')); }
const missing = names.filter(x => !top.has(x));
console.log(`порядок модулей: ${badOrder < 0 && order.length === want.length ? 'OK' : 'НАРУШЕН с ' + (want[badOrder] + ' ≠ ' + order[badOrder])} (${order.length}); имён: ${names.length}, потеряно/переименовано: ${missing.length ? missing.join(', ') : 'нет'}`);
process.exit(badOrder < 0 && !missing.length ? 0 : 1);
