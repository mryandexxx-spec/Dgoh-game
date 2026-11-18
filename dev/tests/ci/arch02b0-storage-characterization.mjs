// ARCH-02B0 — v137 behavior characterization, not B1 safety acceptance.
// Runs the actual PWA/artifact JS in Node VM with an IN-MEMORY localStorage double.
// NEVER loads a browser profile or touches a real user's dune-goh-v1 key.
// These assertions deliberately prove today's unsafe behavior and MUST be
// converted into separate fail-closed acceptance assertions at ARCH-02B1.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../lib/load.mjs';

const html = process.argv[2] || 'dist/pwa/index.html';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(HERE, '../fixtures/saves');
const KEY = 'dune-goh-v1';
const findings = [];
const game = () => {
  const g = loadGame(html, { seed: 7 });
  assert.equal(g.get('SAVE_KEY'), KEY, 'characterization must use real save key');
  return g;
};
const fixture = name => JSON.stringify(JSON.parse(fs.readFileSync(path.join(FIXTURES, name), 'utf8')));
const old = fixture('01-legacy-v1.json');
const load = g => JSON.parse(g.run('JSON.stringify(loadSave())'));
const state = g => JSON.parse(g.run('JSON.stringify(S)'));
const track = (g, setup = {}) => {
  const originalGet = g.ctx.localStorage.getItem;
  const originalSet = g.ctx.localStorage.setItem;
  const trace = [];
  g.ctx.localStorage.getItem = key => {
    trace.push(['get', key]);
    if (key === KEY && setup.getError) throw setup.getError;
    return originalGet(key);
  };
  g.ctx.localStorage.setItem = (key, value) => {
    trace.push(['set', key]);
    if (key === KEY && setup.setError) throw setup.setError;
    return originalSet(key, value);
  };
  return trace;
};
const error = name => Object.assign(new Error('injected ' + name), { name });
const finding = (id, message) => {
  findings.push(id);
  console.log('  ' + id + ' [BASELINE V137] ' + message);
};

// S01 — a truly missing key is a legitimate fresh account.
{
  const g = game();
  assert.equal(g.store.has(KEY), false);
  assert.equal(load(g), null);
  g.run('start({})');
  assert.equal(JSON.parse(g.store.get(KEY)).v, 1);
  assert.equal(g.store.get(KEY), JSON.stringify(state(g)));
  finding('S01', 'absent primary creates valid v1 starter save');
}

// S02-S04 — old fixtures still load and persist with the real fillSave/migrations.
for (const [id, file] of [
  ['S02', '01-legacy-v1.json'], ['S03', '02-mid.json'],
  ['S04', '03-late.json'],
]) {
  const g = game(), raw = fixture(file), source = JSON.parse(raw);
  g.store.set(KEY, raw);
  const saved = load(g);
  assert.equal(saved.v, 1, id + ': historical version preserved');
  assert.equal(saved.solari, source.solari, id + ': legacy currency preserved');
  assert.equal(saved.water, source.water, id + ': legacy water preserved');
  g.run('start({})');
  assert.equal(g.store.get(KEY), JSON.stringify(state(g)), id + ': saved post-start state');
  assert.equal(state(g).solari, source.solari, id + ': no unsolicited solari reset');
  finding(id, file + ' loads and persists without changing existing currency');
}

// S05/S06 — read exceptions are collapsed into missing; boot overwrites old bytes.
// Deliberately allow writes while reads fail to distinguish the code's fallback.
for (const [id, kind] of [['S05', 'SecurityError'], ['S06', 'InjectedReadError']]) {
  const g = game();
  g.store.set(KEY, old);
  const trace = track(g, { getError: error(kind) });
  assert.equal(load(g), null, id + ': loadSave silently catches read failure');
  g.run('start({})');
  const saved = JSON.parse(g.store.get(KEY));
  assert.notEqual(g.store.get(KEY), old, id + ': source bytes overwritten');
  assert.equal(saved.v, 1);
  assert.equal(saved.solari, 3000, id + ': startup picked fresh account');
  assert.ok(trace.some(([op, key]) => op === 'set' && key === KEY), id + ': writes were attempted after failed read');
  finding(id, kind + ' on getItem causes new-save overwrite in permissive-write fault model');
}

// S07-S10 — invalid but nonempty primary strings take the same destructive fallback.
const corruptCases = [
  ['S07', '{"v":1,"roster":', 'truncated JSON'],
  ['S08-null', 'null', 'JSON null'],
  ['S08-array', '[]', 'JSON array'],
  ['S08-noversion', '{"roster":{}}', 'missing version'],
  ['S09', JSON.stringify({ ...JSON.parse(old), v: 2 }), 'unsupported version 2'],
  ['S10', '{"v":1,"roster":null}', 'invalid nested roster'],
];
for (const [id, input, label] of corruptCases) {
  const g = game();
  g.store.set(KEY, input);
  const trace = track(g);
  assert.equal(load(g), null, id + ': loader currently returns null');
  g.run('start({})');
  const saved = JSON.parse(g.store.get(KEY));
  assert.equal(saved.v, 1);
  assert.equal(saved.solari, 3000, id + ': newSave selected');
  assert.notEqual(g.store.get(KEY), input, id + ': original invalid bytes lost');
  assert.ok(trace.some(([op, key]) => op === 'set' && key === KEY), id + ': boot persisted replacement');
  finding(id, label + ' is replaced by a new starter save');
}

// S14 — failure to write is swallowed, in-memory game proceeds, storage lags.
// QuotaExceededError / SecurityError are injected independently of browser quotas.
for (const kind of ['QuotaExceededError', 'SecurityError']) {
  const g = game();
  g.store.set(KEY, old);
  const trace = track(g, { setError: error(kind) });
  g.run('start({})');
  const before = state(g).solari;
  assert.equal(g.run('S.solari += 17; persist()'), undefined);
  assert.equal(state(g).solari, before + 17, kind + ': live state modified');
  assert.equal(g.store.get(KEY), old, kind + ': durable bytes unchanged');
  assert.ok(trace.filter(([op, key]) => op === 'set' && key === KEY).length >= 2);
  finding('S14-' + kind, kind + ' swallowed; live balance diverges from persistent state');
}

// S13 — serialization failure is also swallowed after a live mutation.
{
  const g = game();
  g.store.set(KEY, old);
  g.run('start({})');
  const committed = g.store.get(KEY);
  g.run('S.__b0Cycle = S;');
  assert.equal(g.run('persist0()'), undefined);
  assert.equal(g.store.get(KEY), committed, 'cyclic S must not replace durable snapshot');
  g.run('delete S.__b0Cycle');
  finding('S13', 'JSON.stringify cyclic state fails silently, old checkpoint remains');
}

// S15 — startup succeeds in-memory even if every primary setItem fails.
{
  const g = game();
  g.store.set(KEY, old);
  track(g, { setError: error('QuotaExceededError') });
  assert.doesNotThrow(() => g.run('start({})'));
  assert.equal(g.store.get(KEY), old);
  assert.equal(state(g).v, 1);
  assert.equal(state(g).solari, JSON.parse(old).solari);
  assert.notEqual(g.store.get(KEY), JSON.stringify(state(g)), 'boot migration not persisted');
  finding('S15', 'boot continues after a failed migration/startup write');
}

// SAVE-08 characterization — two independently initialized tab snapshots can
// overwrite each other. This is a simulated stale-write, NOT a browser race test.
{
  const a = game(), b = game();
  a.store.set(KEY, old);
  b.store.set(KEY, old);
  a.run('start({})');
  b.run('start({})');
  a.run('S.solari += 100; persist()');
  const first = JSON.parse(a.store.get(KEY));
  b.store.set(KEY, a.store.get(KEY)); // shared-origin storage changed externally
  b.run('S.solari += 3; persist()'); // B still holds its stale in-memory S
  const second = JSON.parse(b.store.get(KEY));
  assert.equal(first.solari, JSON.parse(old).solari + 100);
  assert.equal(second.solari, JSON.parse(old).solari + 3);
  assert.equal(first.solari - second.solari, 97);
  finding('SAVE-08', 'stale second tab write overwrites an earlier independently committed increment');
}

assert.equal(new Set(findings).size, findings.length, 'unique scenario identifiers');
assert.equal(findings.length, 17, 'all characterized cases must have executed');
console.log('ARCH-02B0: PASS ' + findings.length + ' isolated v137 observations on ' + html +
  '; EXPECTED UNSAFE BEHAVIOR IS NOT A SAFETY PASS; no real browser storage was accessed.');
