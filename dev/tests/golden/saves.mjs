// Снимки сохранений (REFACTOR_PLAN §6.3): каждое сохранение из tests/fixtures/saves/ кладётся в localStorage,
// затем снимаются два состояния: (1) loadSave() — чистый fillSave, (2) S после start() (metaFill, миграции, dly).
// Плюс случай «нет сохранения» (newSave). Каждое сохранение — в свежем контексте игры.
//   node tests/golden/saves.mjs <game.html> [--update]
// Реальные сохранения: положите в tests/fixtures/saves/ файл .json (сам объект) или .txt (код «Экспорт сохранения»).
import fs from 'node:fs';
import assert from 'node:assert/strict';
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
// The legacy golden must remain byte-for-byte strict for all previously saved data.
// BH9.7 adds only two empty roster records to a legacy save. Assert their exact
// default state, then remove only those records for comparison with the old golden.
const historical = structuredClone(out);
for (const entry of historical.saves) {
  for (const stage of ['fillSave', 'start']) {
    const roster = entry[stage]?.roster;
    assert.ok(roster, `${entry.file}: ${stage} roster present`);
    for (const id of ['margot', 'yue']) {
      const hero = roster[id];
      assert.ok(hero, `${entry.file}: ${stage} includes ${id}`);
      assert.equal(hero.stars, 0, `${entry.file}: ${id} starts locked`);
      assert.equal(hero.shards, 0, `${entry.file}: ${id} has no gifted shards`);
      assert.equal(hero.lvl, 1, `${entry.file}: ${id} has default level`);
      assert.equal(hero.gear, 1, `${entry.file}: ${id} has default gear`);
      delete roster[id];
    }
  }
}
if (rest.includes('--update')) writeGolden('saves', out);
else process.exit(compareGolden('saves', historical) ? 0 : 1);
