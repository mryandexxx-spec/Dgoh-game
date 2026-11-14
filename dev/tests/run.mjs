// Прогон всех golden-тестов: node tests/run.mjs <game.html> [--update] [--no-dom]
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
if (!args[0] || args[0].startsWith('--')) { console.error('node tests/run.mjs <game.html> [--update] [--no-dom]'); process.exit(2); }
const pass = args.filter(a => a !== '--no-dom');
const suites = ['roster-rings.mjs', 'golden/battles.mjs', 'golden/meta.mjs', 'golden/saves.mjs', ...(args.includes('--no-dom') ? [] : ['dom/screens.mjs'])];
let fail = 0;
for (const s of suites) {
  console.log(`\n== ${s}`);
  const r = spawnSync(process.execPath, [path.join(HERE, s), ...pass], { stdio: 'inherit' });
  if (r.status) fail++;
}
console.log(fail ? `\nПРОВАЛЕНО наборов: ${fail}` : '\nвсе наборы совпадают с эталоном');
process.exit(fail ? 1 : 0);
