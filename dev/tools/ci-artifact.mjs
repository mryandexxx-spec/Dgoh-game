// CI pipeline contract: checksum a single build, verify it before tests and deployment.
// Usage: node tools/ci-artifact.mjs make|verify|stage [dist-directory]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { inputs, SCHEMA, git } from './ci-inputs.mjs';
import { fileURLToPath } from 'node:url';
const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(DEV, '..');
const action = process.argv[2], DIR = path.resolve(process.argv[3] || path.join(DEV, 'dist'));
const MANIFEST = path.join(DIR, 'ci-manifest.json');
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const allFiles = p => fs.readdirSync(p, { withFileTypes: true }).flatMap(e => {
  const f = path.join(p, e.name);
  return e.isDirectory() ? allFiles(f) : e.isFile() ? [f] : [];
});
const rel = f => path.relative(DIR, f).split(path.sep).join('/');
const read = () => JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const stageFiles = ['index.html', 'app.js', 'app.css', 'sw.js', 'babylon3d.js'];
function verify() {
  const manifest = read();
  const current = inputs(REPO);
  if (manifest.provenance?.schema !== SCHEMA || manifest.provenance.fingerprint !== current.fingerprint || manifest.provenance.behavior !== current.behavior) throw new Error('Build provenance / current inputs mismatch');
  const expectedVersion = JSON.parse(fs.readFileSync(path.join(DEV, 'version.json'), 'utf8')).v;
  if (manifest.version !== expectedVersion) throw new Error('Unexpected version ' + manifest.version);
  const actual = allFiles(DIR).filter(f => f !== MANIFEST).map(rel).sort();
  const expected = Object.keys(manifest.hashes).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Unexpected/missing build files');
  for (const name of expected) if (hash(path.join(DIR, name)) !== manifest.hashes[name])
    throw new Error('SHA-256 mismatch: ' + name);
  const sw = fs.readFileSync(path.join(DIR, 'pwa', 'sw.js'), 'utf8');
  if (!sw.includes("const VER = '" + manifest.cache + "'"))
    throw new Error('Service-worker cache hash mismatch');
  const app = fs.readFileSync(path.join(DIR, 'pwa', 'app.js'), 'utf8');
  if (!app.includes('v' + manifest.version + ' · ' + manifest.cache)) throw new Error('Footer version mismatch');
  console.log('Verified build v' + manifest.version + ' / ' + manifest.cache + ' · ' + expected.length + ' SHA-256 files');
  return manifest;
}
if (action === 'make') {
  if (fs.existsSync(MANIFEST)) throw new Error('Manifest already exists');
  const version = JSON.parse(fs.readFileSync(path.join(DEV, 'version.json'), 'utf8')).v;
  const sw = fs.readFileSync(path.join(DIR, 'pwa', 'sw.js'), 'utf8');
  const cache = /const VER = '([a-f0-9]{10})'/.exec(sw)?.[1];
  if (!cache) throw new Error('Missing cache version');
  const hashes = Object.fromEntries(allFiles(DIR).filter(f => f !== MANIFEST).map(f => [rel(f), hash(f)]).sort(([a],[b])=>a.localeCompare(b)));
  const provenance = { schema: SCHEMA, ...inputs(REPO), source_sha: process.env.GITHUB_SHA || git(['rev-parse','HEAD'],REPO).trim(), run_id: Number(process.env.GITHUB_RUN_ID || 0) };
  fs.writeFileSync(MANIFEST, JSON.stringify({ version, cache, hashes, provenance }, null, 2) + '\n');
  verify();
} else if (action === 'verify') {
  verify();
} else if (action === 'stage' || action === 'rehearse') {
  verify();
  const targetRoot = action === 'rehearse' ? fs.mkdtempSync(path.join(os.tmpdir(), 'dune-stage-')) : REPO;
  try {
  const pwa = path.join(DIR, 'pwa');
  const assets = path.join(pwa, 'assets');
  if (!stageFiles.every(f => fs.existsSync(path.join(pwa, f))) || !fs.existsSync(assets))
    throw new Error('Incomplete PWA');
  for (const f of stageFiles) fs.copyFileSync(path.join(pwa, f), path.join(targetRoot, f));
  fs.rmSync(path.join(targetRoot, 'assets'), { recursive: true, force: true });
  fs.cpSync(assets, path.join(targetRoot, 'assets'), { recursive: true });
  for (const f of stageFiles) if (hash(path.join(targetRoot, f)) !== hash(path.join(pwa, f)))
    throw new Error('Staging mismatch: ' + f);
  for (const f of allFiles(assets)) {
    const target = path.join(targetRoot, 'assets', path.relative(assets, f));
    if (hash(target) !== hash(f)) throw new Error('Staging mismatch: ' + rel(f));
  }
  console.log('Published files staged byte-for-byte from tested build');
  } finally { if (action === 'rehearse') fs.rmSync(targetRoot, { recursive: true, force: true }); }
} else throw new Error('Usage: node tools/ci-artifact.mjs make|verify|stage [dist-directory]');
