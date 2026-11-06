// Снимки сохранений (REFACTOR_PLAN §6.3): каждое сохранение из tests/fixtures/saves/ кладётся в localStorage,
// затем снимаются два состояния: (1) loadSave() — чистый fillSave, (2) S после start() (metaFill, миграции, dly).
// Плюс случай «нет сохранения» (newSave). Каждое сохранение — в свежем контексте игры.
//   node tests/golden/saves.mjs <game.html> [--update]
// Реальные сохранения: положите в tests/fixtures/saves/ файл .json (сам объект) или .txt (код «Экспорт сохранения»).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../lib/load.mjs';
import { writeGolden, compareGolden, argv } from '../lib/golden.mjs';

const [html, ...rest] = argv();
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'saves');
const files = fs.readdirSync(DIR).filter(f => /\.(json|txt)$/.test(f)).sort();
const readSave = f => {
  const raw = fs.readFileSync(path.join(DIR, f), 'utf8').trim();
  return f.endsWith('.txt') ? decodeURIComponent(escape(Buffer.from(raw, 'base64').toString('binary'))) : JSON.stringify(JSON.parse(raw));
};

const saves = [];
for (const f of [null, ...files]) {
  const g = loadGame(html, { seed: 7 }), key = g.get('SAVE_KEY');
  if (f) g.store.set(key, readSave(f));
  const loaded = g.run('JSON.parse(JSON.stringify(loadSave()))');
  let err = null;
  try { g.run('start({})'); } catch (e) { err = String(e.message); }
  const after = g.run('JSON.parse(JSON.stringify(S))'), stored = g.store.get(key);
  saves.push({ file: f || '(нет сохранения → newSave)', fillSave: loaded, start: after, startError: err, persisted: stored === JSON.stringify(after) });
}
console.log('сохранений:', saves.length, saves.map(s => `${s.file}${s.startError ? ' [start: ' + s.startError + ']' : ''}`).join('; '));
const out = { n: saves.length, saves };
if (rest.includes('--update')) writeGolden('saves', out); else process.exit(compareGolden('saves', out) ? 0 : 1);
